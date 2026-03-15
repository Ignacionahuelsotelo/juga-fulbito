"""
Venue service — manage football venues/courts.
"""

import uuid

from fastapi import HTTPException
from geoalchemy2 import Geography
from geoalchemy2.elements import WKTElement
from sqlalchemy import cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.match import Venue
from app.schemas.venue import VenueCreate
from app.services.geo_service import st_distance_meters, st_within_radius


async def create_venue(user_id: uuid.UUID, data: VenueCreate, db: AsyncSession) -> Venue:
    venue = Venue(
        name=data.name,
        address=data.address,
        location=WKTElement(f"POINT({data.longitude} {data.latitude})", srid=4326),
        phone=data.phone,
        created_by=user_id,
    )
    db.add(venue)
    await db.commit()
    await db.refresh(venue)
    return venue


async def get_venue(venue_id: str, db: AsyncSession) -> Venue:
    result = await db.execute(select(Venue).where(Venue.id == venue_id))
    venue = result.scalar_one_or_none()
    if not venue:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")
    return venue


async def search_venues(
    latitude: float,
    longitude: float,
    radius_km: float,
    q: str | None = None,
    db: AsyncSession = None,
) -> list[dict]:
    radius_meters = radius_km * 1000
    distance_expr = st_distance_meters(Venue.location, longitude, latitude)

    query = (
        select(Venue, distance_expr.label("distance_m"))
        .where(
            st_within_radius(Venue.location, longitude, latitude, radius_meters)
        )
    )

    if q:
        query = query.where(Venue.name.ilike(f"%{q}%"))

    query = query.order_by("distance_m").limit(50)

    result = await db.execute(query)
    rows = result.all()

    return [
        {
            "id": str(venue.id),
            "name": venue.name,
            "address": venue.address,
            "phone": venue.phone,
            "distance_km": round(distance_m / 1000, 2) if distance_m else 0,
            "latitude": None,  # Would need ST_Y to extract
            "longitude": None,  # Would need ST_X to extract
        }
        for venue, distance_m in rows
    ]
