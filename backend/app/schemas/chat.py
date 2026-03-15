import datetime as dt

from pydantic import BaseModel, Field


class ChatMemberResponse(BaseModel):
    user_id: str
    display_name: str
    avatar_url: str | None = None


class ChatMessageResponse(BaseModel):
    id: str
    room_id: str
    sender_id: str
    sender_name: str
    sender_avatar: str | None = None
    content: str
    created_at: dt.datetime

    model_config = {"from_attributes": True}


class ChatRoomResponse(BaseModel):
    id: str
    match_id: str | None = None
    type: str
    created_at: dt.datetime
    last_message: ChatMessageResponse | None = None
    unread_count: int = 0
    members: list[ChatMemberResponse] = []

    model_config = {"from_attributes": True}


class DirectChatCreate(BaseModel):
    user_id: str


class SendMessageRequest(BaseModel):
    content: str = Field(min_length=1, max_length=2000)


class ChatMessagesResponse(BaseModel):
    messages: list[ChatMessageResponse]
    has_more: bool
