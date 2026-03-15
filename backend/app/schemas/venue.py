import datetime as dt

from pydantic import BaseModel, Field


class VenueCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    address: str = Field(min_length=5, max_length=500)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    phone: str | None = Field(None, max_length=50)


class VenueResponse(BaseModel):
    id: str
    name: str
    address: str
    latitude: float | None = None
    longitude: float | None = None
    phone: str | None = None
    created_at: dt.datetime

    model_config = {"from_attributes": True}


class VenueSearchResponse(BaseModel):
    id: str
    name: str
    address: str
    latitude: float | None = None
    longitude: float | None = None
    phone: str | None = None
    distance_km: float
