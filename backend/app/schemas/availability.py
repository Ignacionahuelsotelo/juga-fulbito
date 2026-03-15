import datetime as dt

from pydantic import BaseModel, Field
from typing import Literal


class AvailabilityCreate(BaseModel):
    date: dt.date
    start_time: dt.time
    end_time: dt.time
    zone_name: str | None = Field(None, max_length=200)
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    match_type_pref: Literal["competitive", "relaxed", "any"] = "any"


class AvailabilityUpdate(BaseModel):
    date: dt.date | None = None
    start_time: dt.time | None = None
    end_time: dt.time | None = None
    zone_name: str | None = Field(None, max_length=200)
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    match_type_pref: Literal["competitive", "relaxed", "any"] | None = None


class AvailabilityResponse(BaseModel):
    id: str
    user_id: str
    date: dt.date
    start_time: dt.time
    end_time: dt.time
    zone_name: str | None = None
    match_type_pref: str
    is_active: bool
    created_at: dt.datetime

    model_config = {"from_attributes": True}


class PlayerAvailabilityResponse(BaseModel):
    user_id: str
    display_name: str
    avatar_url: str | None = None
    position: str | None = None
    skill_level: str | None = None
    play_style: str | None = None
    rating_avg: float = 0.0
    distance_km: float
    availability_slot_id: str
    date: dt.date
    start_time: dt.time
    end_time: dt.time
    match_type_pref: str


class AvailabilitySearchParams(BaseModel):
    date: dt.date
    start_time: dt.time | None = None
    end_time: dt.time | None = None
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    radius_km: float = Field(default=5.0, ge=0.5, le=50)
    match_type: Literal["competitive", "relaxed"] | None = None
    skill_level: Literal["beginner", "intermediate", "competitive"] | None = None
    page: int = Field(default=1, ge=1)
    per_page: int = Field(default=20, ge=1, le=100)
