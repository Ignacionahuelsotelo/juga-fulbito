from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.venue import VenueCreate, VenueResponse
from app.services import venue_service

router = APIRouter(prefix="/venues", tags=["Venues"])


@router.post("", response_model=VenueResponse, status_code=201)
async def create_venue(
    data: VenueCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Register a new football venue/court."""
    venue = await venue_service.create_venue(user.id, data, db)
    return VenueResponse(
        id=str(venue.id),
        name=venue.name,
        address=venue.address,
        phone=venue.phone,
        created_at=venue.created_at,
    )


@router.get("")
async def search_venues(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(3.0, ge=0.5, le=50),
    q: str | None = Query(None, max_length=200),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Search for venues near a location. Optionally filter by name."""
    return await venue_service.search_venues(
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km,
        q=q,
        db=db,
    )


@router.get("/{venue_id}", response_model=VenueResponse)
async def get_venue(
    venue_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get details of a specific venue."""
    venue = await venue_service.get_venue(venue_id, db)
    return VenueResponse(
        id=str(venue.id),
        name=venue.name,
        address=venue.address,
        phone=venue.phone,
        created_at=venue.created_at,
    )
