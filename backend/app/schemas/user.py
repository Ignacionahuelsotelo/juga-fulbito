from pydantic import BaseModel, Field
from typing import Literal


class ProfileResponse(BaseModel):
    id: str
    user_id: str
    display_name: str
    avatar_url: str | None = None
    age: int | None = None
    zone_name: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    position: str | None = None
    skill_level: str | None = None
    play_style: str | None = None
    dominant_foot: str | None = None
    bio: str | None = None
    rating_avg: float = 0.0
    matches_played: int = 0
    tags: dict | list | None = None

    model_config = {"from_attributes": True}


class ProfileUpdate(BaseModel):
    display_name: str | None = Field(None, min_length=2, max_length=100)
    age: int | None = Field(None, ge=14, le=80)
    zone_name: str | None = Field(None, max_length=200)
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    position: Literal["goalkeeper", "defender", "midfielder", "forward", "mixed"] | None = None
    skill_level: Literal["beginner", "intermediate", "competitive"] | None = None
    play_style: Literal["relaxed", "competitive", "physical"] | None = None
    dominant_foot: Literal["left", "right", "both"] | None = None
    bio: str | None = Field(None, max_length=500)


class UserMeResponse(BaseModel):
    id: str
    email: str
    is_active: bool
    profile: ProfileResponse | None = None

    model_config = {"from_attributes": True}


class AvatarResponse(BaseModel):
    avatar_url: str


class UserPublicResponse(BaseModel):
    user_id: str
    display_name: str
    avatar_url: str | None = None
    age: int | None = None
    zone_name: str | None = None
    position: str | None = None
    skill_level: str | None = None
    play_style: str | None = None
    rating_avg: float = 0.0
    matches_played: int = 0
    tags: dict | list | None = None
    bio: str | None = None
