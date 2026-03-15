import datetime as dt

from pydantic import BaseModel, Field


class RatingCreate(BaseModel):
    match_id: str
    reviewed_id: str
    skill_score: int = Field(ge=1, le=5)
    punctuality_score: int = Field(ge=1, le=5)
    fair_play_score: int = Field(ge=1, le=5)
    attitude_score: int = Field(ge=1, le=5)
    comment: str | None = Field(None, max_length=500)


class RatingResponse(BaseModel):
    id: str
    match_id: str
    reviewer_id: str
    reviewed_id: str
    skill_score: int
    punctuality_score: int
    fair_play_score: int
    attitude_score: int
    comment: str | None = None
    created_at: dt.datetime
    reviewer_name: str | None = None

    model_config = {"from_attributes": True}


class RatingSummary(BaseModel):
    total_ratings: int
    avg_skill: float
    avg_punctuality: float
    avg_fair_play: float
    avg_attitude: float
    overall_avg: float


class PendingRatingPlayer(BaseModel):
    user_id: str
    display_name: str
    avatar_url: str | None = None
    match_id: str
    match_date: dt.date
