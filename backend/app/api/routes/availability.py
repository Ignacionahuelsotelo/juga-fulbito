import datetime as dt

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Literal

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import MessageResponse
from app.schemas.availability import (
    AvailabilityCreate,
    AvailabilityResponse,
    AvailabilityUpdate,
)
from app.services import availability_service

router = APIRouter(prefix="/availability", tags=["Availability"])


@router.post("", response_model=AvailabilityResponse, status_code=201)
async def create_availability(
    data: AvailabilityCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new availability slot (publish yourself as available to play)."""
    slot = await availability_service.create_slot(user.id, data, db)
    return AvailabilityResponse(
        id=str(slot.id),
        user_id=str(slot.user_id),
        date=slot.date,
        start_time=slot.start_time,
        end_time=slot.end_time,
        zone_name=slot.zone_name,
        match_type_pref=slot.match_type_pref,
        is_active=slot.is_active,
        created_at=slot.created_at,
    )


@router.get("/me", response_model=list[AvailabilityResponse])
async def get_my_availability(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all active availability slots for the current user."""
    slots = await availability_service.get_my_slots(user.id, db)
    return [
        AvailabilityResponse(
            id=str(s.id),
            user_id=str(s.user_id),
            date=s.date,
            start_time=s.start_time,
            end_time=s.end_time,
            zone_name=s.zone_name,
            match_type_pref=s.match_type_pref,
            is_active=s.is_active,
            created_at=s.created_at,
        )
        for s in slots
    ]


@router.get("/search")
async def search_available_players(
    date: dt.date | None = Query(None),
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(5.0, ge=0.5, le=50),
    start_time: dt.time | None = Query(None),
    end_time: dt.time | None = Query(None),
    match_type: Literal["competitive", "relaxed"] | None = Query(None),
    skill_level: Literal["beginner", "intermediate", "competitive"] | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Search for available players by date, location, and optional filters.
    Returns players sorted by distance.
    """
    return await availability_service.search_available_players(
        date=date,
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km,
        start_time=start_time,
        end_time=end_time,
        match_type=match_type,
        skill_level=skill_level,
        page=page,
        per_page=per_page,
        db=db,
    )


@router.put("/{slot_id}", response_model=AvailabilityResponse)
async def update_availability(
    slot_id: str,
    data: AvailabilityUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing availability slot."""
    slot = await availability_service.update_slot(slot_id, user.id, data, db)
    return AvailabilityResponse(
        id=str(slot.id),
        user_id=str(slot.user_id),
        date=slot.date,
        start_time=slot.start_time,
        end_time=slot.end_time,
        zone_name=slot.zone_name,
        match_type_pref=slot.match_type_pref,
        is_active=slot.is_active,
        created_at=slot.created_at,
    )


@router.delete("/{slot_id}", response_model=MessageResponse)
async def delete_availability(
    slot_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Deactivate an availability slot."""
    await availability_service.delete_slot(slot_id, user.id, db)
    return MessageResponse(message="Disponibilidad eliminada")
