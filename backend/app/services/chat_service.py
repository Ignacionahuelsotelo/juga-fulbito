"""
Chat service — rooms, messages, and WebSocket management.
"""

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.chat import ChatMessage, ChatRoom, ChatRoomMember
from app.models.user import Profile


async def _get_unread_count(
    room_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession
) -> int:
    """Count messages in a room that are newer than the user's last_read_at."""
    member_result = await db.execute(
        select(ChatRoomMember).where(
            ChatRoomMember.room_id == room_id,
            ChatRoomMember.user_id == user_id,
        )
    )
    member = member_result.scalar_one_or_none()
    if not member:
        return 0

    query = select(func.count()).select_from(ChatMessage).where(
        ChatMessage.room_id == room_id,
        ChatMessage.sender_id != user_id,  # Don't count own messages
    )
    if member.last_read_at:
        query = query.where(ChatMessage.created_at > member.last_read_at)

    result = await db.execute(query)
    return result.scalar() or 0


async def mark_room_as_read(
    room_id: str, user_id: uuid.UUID, db: AsyncSession
) -> dict:
    """Mark all messages in a room as read for the user."""
    result = await db.execute(
        select(ChatRoomMember).where(
            ChatRoomMember.room_id == room_id,
            ChatRoomMember.user_id == user_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=403, detail="No sos miembro de este chat")

    member.last_read_at = datetime.now(timezone.utc)
    await db.commit()
    return {"status": "ok", "last_read_at": member.last_read_at.isoformat()}


async def get_user_rooms(user_id: uuid.UUID, db: AsyncSession) -> list[dict]:
    """Get all chat rooms the user is a member of."""
    result = await db.execute(
        select(ChatRoom)
        .join(ChatRoomMember, ChatRoomMember.room_id == ChatRoom.id)
        .where(ChatRoomMember.user_id == user_id)
        .options(selectinload(ChatRoom.members))
        .order_by(ChatRoom.created_at.desc())
    )
    rooms = result.scalars().unique().all()

    rooms_data = []
    for room in rooms:
        # Get last message
        last_msg_result = await db.execute(
            select(ChatMessage, Profile)
            .join(Profile, Profile.user_id == ChatMessage.sender_id)
            .where(ChatMessage.room_id == room.id)
            .order_by(ChatMessage.created_at.desc())
            .limit(1)
        )
        last_msg_row = last_msg_result.first()

        last_message = None
        if last_msg_row:
            msg, profile = last_msg_row
            last_message = {
                "id": str(msg.id),
                "room_id": str(msg.room_id),
                "sender_id": str(msg.sender_id),
                "sender_name": profile.display_name,
                "sender_avatar": profile.avatar_url,
                "content": msg.content,
                "created_at": msg.created_at.isoformat(),
            }

        # Get members info
        members_result = await db.execute(
            select(ChatRoomMember, Profile)
            .join(Profile, Profile.user_id == ChatRoomMember.user_id)
            .where(ChatRoomMember.room_id == room.id)
        )
        members = [
            {
                "user_id": str(member.user_id),
                "display_name": profile.display_name,
                "avatar_url": profile.avatar_url,
            }
            for member, profile in members_result.all()
        ]

        rooms_data.append(
            {
                "id": str(room.id),
                "match_id": str(room.match_id) if room.match_id else None,
                "type": room.type,
                "created_at": room.created_at.isoformat(),
                "last_message": last_message,
                "unread_count": await _get_unread_count(room.id, user_id, db),
                "members": members,
            }
        )

    return rooms_data


async def get_room_messages(
    room_id: str,
    user_id: uuid.UUID,
    db: AsyncSession,
    before: datetime | None = None,
    limit: int = 50,
) -> dict:
    """Get messages for a room (paginated by cursor)."""
    # Verify user is member
    member_check = await db.execute(
        select(ChatRoomMember).where(
            ChatRoomMember.room_id == room_id,
            ChatRoomMember.user_id == user_id,
        )
    )
    if not member_check.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="No sos miembro de este chat")

    query = (
        select(ChatMessage, Profile)
        .join(Profile, Profile.user_id == ChatMessage.sender_id)
        .where(ChatMessage.room_id == room_id)
    )

    if before:
        query = query.where(ChatMessage.created_at < before)

    query = query.order_by(ChatMessage.created_at.desc()).limit(limit + 1)

    result = await db.execute(query)
    rows = result.all()

    has_more = len(rows) > limit
    messages_rows = rows[:limit]

    messages = [
        {
            "id": str(msg.id),
            "room_id": str(msg.room_id),
            "sender_id": str(msg.sender_id),
            "sender_name": profile.display_name,
            "sender_avatar": profile.avatar_url,
            "content": msg.content,
            "created_at": msg.created_at.isoformat(),
        }
        for msg, profile in messages_rows
    ]

    # Return in chronological order
    messages.reverse()

    return {
        "messages": messages,
        "has_more": has_more,
    }


async def create_direct_room(
    user_id: uuid.UUID, other_user_id: str, db: AsyncSession
) -> dict:
    """Create or get existing direct chat between two users."""
    other_uuid = uuid.UUID(other_user_id)

    # Check if direct room already exists between these two
    existing = await db.execute(
        select(ChatRoom)
        .join(ChatRoomMember, ChatRoomMember.room_id == ChatRoom.id)
        .where(
            ChatRoom.type == "direct",
            ChatRoomMember.user_id.in_([user_id, other_uuid]),
        )
        .group_by(ChatRoom.id)
        .having(func.count(ChatRoomMember.id) == 2)
    )
    existing_room = existing.scalar_one_or_none()

    if existing_room:
        return {"id": str(existing_room.id), "type": "direct", "already_existed": True}

    # Verify other user exists
    from app.models.user import User

    user_check = await db.execute(select(User).where(User.id == other_uuid))
    if not user_check.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Create new room
    room = ChatRoom(type="direct")
    db.add(room)
    await db.flush()

    member1 = ChatRoomMember(room_id=room.id, user_id=user_id)
    member2 = ChatRoomMember(room_id=room.id, user_id=other_uuid)
    db.add(member1)
    db.add(member2)

    await db.commit()

    return {"id": str(room.id), "type": "direct", "already_existed": False}


async def send_message(
    room_id: str, sender_id: uuid.UUID, content: str, db: AsyncSession
) -> dict:
    """Save a message to the database."""
    # Verify membership
    member_check = await db.execute(
        select(ChatRoomMember).where(
            ChatRoomMember.room_id == room_id,
            ChatRoomMember.user_id == sender_id,
        )
    )
    if not member_check.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="No sos miembro de este chat")

    message = ChatMessage(
        room_id=uuid.UUID(room_id),
        sender_id=sender_id,
        content=content,
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)

    # Get sender profile
    profile_result = await db.execute(
        select(Profile).where(Profile.user_id == sender_id)
    )
    profile = profile_result.scalar_one_or_none()

    return {
        "id": str(message.id),
        "room_id": str(message.room_id),
        "sender_id": str(message.sender_id),
        "sender_name": profile.display_name if profile else "Unknown",
        "sender_avatar": profile.avatar_url if profile else None,
        "content": message.content,
        "created_at": message.created_at.isoformat(),
    }
