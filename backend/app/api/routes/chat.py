import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.core.security import decode_token
from app.db.session import get_db, async_session
from app.models.user import User
from app.schemas.chat import (
    ChatMessagesResponse,
    ChatMessageResponse,
    ChatRoomResponse,
    DirectChatCreate,
    SendMessageRequest,
)
from app.services import chat_service

router = APIRouter(prefix="/chat", tags=["Chat"])


# In-memory WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        # room_id -> list of (user_id, websocket)
        self.active_connections: dict[str, list[tuple[str, WebSocket]]] = {}

    async def connect(self, room_id: str, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append((user_id, websocket))

    def disconnect(self, room_id: str, user_id: str):
        if room_id in self.active_connections:
            self.active_connections[room_id] = [
                (uid, ws)
                for uid, ws in self.active_connections[room_id]
                if uid != user_id
            ]
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

    async def broadcast(self, room_id: str, message: dict, exclude_user: str | None = None):
        if room_id in self.active_connections:
            for uid, ws in self.active_connections[room_id]:
                if uid != exclude_user:
                    try:
                        await ws.send_json(message)
                    except Exception:
                        pass


manager = ConnectionManager()


@router.get("/rooms", response_model=list[ChatRoomResponse])
async def get_rooms(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all chat rooms the user is a member of."""
    rooms = await chat_service.get_user_rooms(user.id, db)
    return rooms


@router.get("/rooms/{room_id}/messages")
async def get_messages(
    room_id: str,
    before: datetime | None = Query(None),
    limit: int = Query(50, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get messages from a chat room (cursor-based pagination)."""
    return await chat_service.get_room_messages(
        room_id=room_id,
        user_id=user.id,
        db=db,
        before=before,
        limit=limit,
    )


@router.put("/rooms/{room_id}/read")
async def mark_as_read(
    room_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark all messages in a room as read for the current user."""
    return await chat_service.mark_room_as_read(room_id, user.id, db)


@router.post("/rooms/direct")
async def create_direct_chat(
    data: DirectChatCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a direct 1:1 chat with another user, or return existing one."""
    return await chat_service.create_direct_room(user.id, data.user_id, db)


@router.post("/rooms/{room_id}/messages", response_model=ChatMessageResponse)
async def send_message_http(
    room_id: str,
    data: SendMessageRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message via HTTP (alternative to WebSocket)."""
    msg = await chat_service.send_message(room_id, user.id, data.content, db)

    # Broadcast to WebSocket connections
    await manager.broadcast(
        room_id,
        {"type": "new_message", "data": msg},
        exclude_user=str(user.id),
    )

    return msg


@router.websocket("/ws/{room_id}")
async def websocket_chat(websocket: WebSocket, room_id: str):
    """
    WebSocket endpoint for real-time chat.
    Connect with: ws://host/api/v1/chat/ws/{room_id}?token=JWT_TOKEN

    Send messages as JSON: {"type": "message", "content": "Hello!"}
    Receive messages as JSON: {"type": "new_message", "data": {...}}
    """
    # Authenticate via query param
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Token required")
        return

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        await websocket.close(code=4001, reason="Invalid token")
        return

    user_id = payload.get("sub")
    if not user_id:
        await websocket.close(code=4001, reason="Invalid token")
        return

    await manager.connect(room_id, user_id, websocket)

    try:
        while True:
            data = await websocket.receive_json()

            if data.get("type") == "message" and data.get("content"):
                # Save to DB
                async with async_session() as db:
                    msg = await chat_service.send_message(
                        room_id, uuid.UUID(user_id), data["content"], db
                    )

                # Broadcast to all in room (including sender for confirmation)
                await manager.broadcast(
                    room_id,
                    {"type": "new_message", "data": msg},
                )

    except WebSocketDisconnect:
        manager.disconnect(room_id, user_id)
    except Exception:
        manager.disconnect(room_id, user_id)
