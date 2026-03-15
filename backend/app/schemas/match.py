import datetime as dt

from pydantic import BaseModel, Field
from typing import Literal

from app.schemas.venue import VenueResponse


class MatchCreate(BaseModel):
    date: dt.date
    start_time: dt.time
    duration_minutes: int = Field(default=60, ge=30, le=180)
    players_needed: int = Field(default=10, ge=4, le=22)
    match_type: Literal["competitive", "relaxed"]
    desired_level: Literal["beginner", "intermediate", "competitive"] | None = None
    venue_id: str | None = None
    venue_name: str | None = Field(None, max_length=200)
    venue_address: str | None = Field(None, max_length=500)
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)


class MatchUpdate(BaseModel):
    date: dt.date | None = None
    start_time: dt.time | None = None
    duration_minutes: int | None = Field(None, ge=30, le=180)
    players_needed: int | None = Field(None, ge=4, le=22)
    match_type: Literal["competitive", "relaxed"] | None = None
    desired_level: Literal["beginner", "intermediate", "competitive"] | None = None
    venue_id: str | None = None
    venue_name: str | None = Field(None, max_length=200)
    venue_address: str | None = Field(None, max_length=500)
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)


class MatchPlayerResponse(BaseModel):
    user_id: str
    display_name: str
    avatar_url: str | None = None
    position: str | None = None
    skill_level: str | None = None
    rating_avg: float = 0.0
    team: str | None = None


class MatchResponse(BaseModel):
    id: str
    organizer_id: str
    venue: VenueResponse | None = None
    venue_name: str | None = None
    venue_address: str | None = None
    date: dt.date
    start_time: dt.time
    duration_minutes: int
    players_needed: int
    match_type: str
    desired_level: str | None = None
    status: str
    team_a: list[str] | None = None
    team_b: list[str] | None = None
    ai_explanation: str | None = None
    confirmed_players_count: int = 0
    created_at: dt.datetime

    model_config = {"from_attributes": True}


class MatchDetailResponse(MatchResponse):
    players: list[MatchPlayerResponse] = []


class MatchStatusUpdate(BaseModel):
    status: Literal["open", "full", "confirmed", "in_progress", "completed", "cancelled"]


class InviteRequest(BaseModel):
    player_id: str


class BulkInviteRequest(BaseModel):
    player_ids: list[str] = Field(min_length=1, max_length=20)


class InvitationResponse(BaseModel):
    id: str
    match_id: str
    player_id: str
    status: str
    created_at: dt.datetime
    responded_at: dt.datetime | None = None

    model_config = {"from_attributes": True}


class BalanceResponse(BaseModel):
    team_a: list[MatchPlayerResponse]
    team_b: list[MatchPlayerResponse]
    explanation: str
    balance_score: float
