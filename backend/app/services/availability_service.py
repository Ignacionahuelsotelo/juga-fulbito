"""
Availability service — manage availability slots and search available players.
"""

import datetime as dt
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from geoalchemy2 import Geography
from geoalchemy2.elements import WKTElement
from sqlalchemy import and_, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.availability import AvailabilitySlot
from app.models.user import Profile
from app.schemas.availability import AvailabilityCreate, AvailabilityUpdate
from app.services.geo_service import st_distance_meters, st_within_radius


async def create_slot(
    user_id: uuid.UUID, data: AvailabilityCreate, db: AsyncSession
) -> AvailabilitySlot:
    slot = AvailabilitySlot(
        user_id=user_id,
        date=data.date,
        start_time=data.start_time,
        end_time=data.end_time,
        zone_name=data.zone_name,
        match_type_pref=data.match_type_pref,
    )

    if data.latitude is not None and data.longitude is not None:
        slot.location = WKTElement(
            f"POINT({data.longitude} {data.latitude})", srid=4326
        )

    db.add(slot)
    await db.commit()
    await db.refresh(slot)
    return slot


async def get_my_slots(user_id: uuid.UUID, db: AsyncSession) -> list[AvailabilitySlot]:
    result = await db.execute(
        select(AvailabilitySlot)
        .where(
            AvailabilitySlot.user_id == user_id,
            AvailabilitySlot.is_active == True,
        )
        .order_by(AvailabilitySlot.date.asc(), AvailabilitySlot.start_time.asc())
    )
    return list(result.scalars().all())


async def update_slot(
    slot_id: str, user_id: uuid.UUID, data: AvailabilityUpdate, db: AsyncSession
) -> AvailabilitySlot:
    result = await db.execute(
        select(AvailabilitySlot).where(
            AvailabilitySlot.id == slot_id,
            AvailabilitySlot.user_id == user_id,
        )
    )
    slot = result.scalar_one_or_none()

    if not slot:
        raise HTTPException(status_code=404, detail="Disponibilidad no encontrada")

    update_data = data.model_dump(exclude_unset=True)
    lat = update_data.pop("latitude", None)
    lng = update_data.pop("longitude", None)

    if lat is not None and lng is not None:
        slot.location = WKTElement(f"POINT({lng} {lat})", srid=4326)

    for field, value in update_data.items():
        setattr(slot, field, value)

    await db.commit()
    await db.refresh(slot)
    return slot


async def delete_slot(slot_id: str, user_id: uuid.UUID, db: AsyncSession) -> None:
    result = await db.execute(
        select(AvailabilitySlot).where(
            AvailabilitySlot.id == slot_id,
            AvailabilitySlot.user_id == user_id,
        )
    )
    slot = result.scalar_one_or_none()

    if not slot:
        raise HTTPException(status_code=404, detail="Disponibilidad no encontrada")

    slot.is_active = False
    await db.commit()


async def search_available_players(
    date,
    latitude: float,
    longitude: float,
    radius_km: float,
    start_time=None,
    end_time=None,
    match_type: str | None = None,
    skill_level: str | None = None,
    page: int = 1,
    per_page: int = 20,
    db: AsyncSession = None,
) -> dict:
    """
    Search for players who have published availability slots matching criteria.
    """
    radius_meters = radius_km * 1000
    offset = (page - 1) * per_page

    # Distance calculation
    distance_expr = st_distance_meters(AvailabilitySlot.location, longitude, latitude)

    query = (
        select(
            AvailabilitySlot,
            Profile,
            distance_expr.label("distance_m"),
        )
        .join(Profile, Profile.user_id == AvailabilitySlot.user_id)
        .where(
            AvailabilitySlot.is_active == True,
            AvailabilitySlot.location.isnot(None),
            st_within_radius(
                AvailabilitySlot.location, longitude, latitude, radius_meters
            ),
        )
    )

    # Date filter: exact date or from today onward
    if date is not None:
        query = query.where(AvailabilitySlot.date == date)
    else:
        query = query.where(AvailabilitySlot.date >= dt.date.today())

    # Time overlap filter
    if start_time:
        query = query.where(AvailabilitySlot.end_time > start_time)
    if end_time:
        query = query.where(AvailabilitySlot.start_time < end_time)

    # Match type preference filter
    if match_type:
        query = query.where(
            AvailabilitySlot.match_type_pref.in_([match_type, "any"])
        )

    # Skill level filter on profile
    if skill_level:
        query = query.where(Profile.skill_level == skill_level)

    
    # Count total
    count_query = (
        select(func.count())
        .select_from(AvailabilitySlot)
        .join(Profile, Profile.user_id == AvailabilitySlot.user_id)
        .where(
            AvailabilitySlot.is_active == True,
            AvailabilitySlot.location.isnot(None),
            st_within_radius(
                AvailabilitySlot.location, longitude, latitude, radius_meters
            ),
        )
    )
    if date is not None:
        count_query = count_query.where(AvailabilitySlot.date == date)
    else:
        count_query = count_query.where(AvailabilitySlot.date >= dt.date.today())
    if start_time:
        count_query = count_query.where(AvailabilitySlot.end_time > start_time)
    if end_time:
        count_query = count_query.where(AvailabilitySlot.start_time < end_time)
    if match_type:
        count_query = count_query.where(
            AvailabilitySlot.match_type_pref.in_([match_type, "any"])
        )
    if skill_level:
        count_query = count_query.where(Profile.skill_level == skill_level)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Order by distance
    query = query.order_by("distance_m").offset(offset).limit(per_page)
    result = await db.execute(query)
    rows = result.all()

    players = []
    for slot, profile, distance_m in rows:
        players.append(
            {
                "user_id": str(profile.user_id),
                "display_name": profile.display_name,
                "avatar_url": profile.avatar_url,
                "position": profile.position,
                "skill_level": profile.skill_level,
                "play_style": profile.play_style,
                "rating_avg": float(profile.rating_avg or 0),
                "distance_km": round(distance_m / 1000, 2) if distance_m else 0,
                "availability_slot_id": str(slot.id),
                "date": slot.date,
                "start_time": slot.start_time,
                "end_time": slot.end_time,
                "match_type_pref": slot.match_type_pref,
            }
        )

    return {
        "players": players,
        "total": total,
        "page": page,
        "per_page": per_page,
    }
