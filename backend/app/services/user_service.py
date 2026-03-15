import os
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, UploadFile, status
from geoalchemy2.elements import WKTElement
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.match import Match, MatchPlayer
from app.models.user import Profile, User
from app.schemas.user import ProfileResponse, ProfileUpdate, UserMeResponse


def _profile_to_response(profile: Profile) -> ProfileResponse:
    lat = None
    lng = None
    # PostGIS location extraction would need ST_X/ST_Y in a real query.
    # For simplicity, we return None if not explicitly fetched.
    return ProfileResponse(
        id=str(profile.id),
        user_id=str(profile.user_id),
        display_name=profile.display_name,
        avatar_url=profile.avatar_url,
        age=profile.age,
        zone_name=profile.zone_name,
        latitude=lat,
        longitude=lng,
        position=profile.position,
        skill_level=profile.skill_level,
        play_style=profile.play_style,
        dominant_foot=profile.dominant_foot,
        bio=profile.bio,
        rating_avg=float(profile.rating_avg or 0),
        matches_played=profile.matches_played or 0,
        tags=profile.tags or None,
    )


async def get_me(user: User, db: AsyncSession) -> UserMeResponse:
    result = await db.execute(
        select(User).options(selectinload(User.profile)).where(User.id == user.id)
    )
    user_with_profile = result.scalar_one()

    profile_resp = None
    if user_with_profile.profile:
        profile_resp = _profile_to_response(user_with_profile.profile)

    return UserMeResponse(
        id=str(user_with_profile.id),
        email=user_with_profile.email,
        is_active=user_with_profile.is_active,
        profile=profile_resp,
    )


async def update_profile(user: User, data: ProfileUpdate, db: AsyncSession) -> ProfileResponse:
    result = await db.execute(
        select(Profile).where(Profile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Perfil no encontrado",
        )

    update_data = data.model_dump(exclude_unset=True)

    # Handle geolocation
    lat = update_data.pop("latitude", None)
    lng = update_data.pop("longitude", None)
    if lat is not None and lng is not None:
        profile.location = WKTElement(f"POINT({lng} {lat})", srid=4326)

    for field, value in update_data.items():
        setattr(profile, field, value)

    profile.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(profile)

    resp = _profile_to_response(profile)
    # Override lat/lng with the values we just set
    if lat is not None and lng is not None:
        resp.latitude = lat
        resp.longitude = lng
    return resp


async def upload_avatar(user: User, file: UploadFile, db: AsyncSession) -> str:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo debe ser una imagen",
        )

    content = await file.read()
    max_size = settings.MAX_AVATAR_SIZE_MB * 1024 * 1024
    if len(content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La imagen no puede superar {settings.MAX_AVATAR_SIZE_MB}MB",
        )

    ext = file.filename.split(".")[-1] if file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    upload_dir = os.path.join(settings.UPLOAD_DIR, "avatars")
    os.makedirs(upload_dir, exist_ok=True)
    filepath = os.path.join(upload_dir, filename)

    with open(filepath, "wb") as f:
        f.write(content)

    avatar_url = f"/uploads/avatars/{filename}"

    result = await db.execute(select(Profile).where(Profile.user_id == user.id))
    profile = result.scalar_one_or_none()
    if profile:
        profile.avatar_url = avatar_url
        profile.updated_at = datetime.now(timezone.utc)
        await db.commit()

    return avatar_url


async def get_user_public(user_id: str, db: AsyncSession) -> dict:
    result = await db.execute(
        select(Profile).where(Profile.user_id == user_id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )

    return {
        "user_id": str(profile.user_id),
        "display_name": profile.display_name,
        "avatar_url": profile.avatar_url,
        "age": profile.age,
        "zone_name": profile.zone_name,
        "position": profile.position,
        "skill_level": profile.skill_level,
        "play_style": profile.play_style,
        "rating_avg": float(profile.rating_avg or 0),
        "matches_played": profile.matches_played or 0,
        "tags": profile.tags or None,
        "bio": profile.bio,
    }


async def get_user_matches(user_id: str, db: AsyncSession, page: int = 1, per_page: int = 20) -> dict:
    offset = (page - 1) * per_page

    # Matches where user is organizer or player
    from sqlalchemy import or_, func

    query = (
        select(Match)
        .outerjoin(MatchPlayer, MatchPlayer.match_id == Match.id)
        .where(
            or_(
                Match.organizer_id == user_id,
                MatchPlayer.user_id == user_id,
            )
        )
        .distinct()
        .order_by(Match.date.desc(), Match.start_time.desc())
        .offset(offset)
        .limit(per_page)
    )

    result = await db.execute(query)
    matches = result.scalars().all()

    count_query = (
        select(func.count())
        .select_from(Match)
        .outerjoin(MatchPlayer, MatchPlayer.match_id == Match.id)
        .where(
            or_(
                Match.organizer_id == user_id,
                MatchPlayer.user_id == user_id,
            )
        )
        .distinct()
    )
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    return {
        "matches": [
            {
                "id": str(m.id),
                "date": m.date.isoformat(),
                "start_time": m.start_time.isoformat(),
                "match_type": m.match_type,
                "status": m.status,
                "venue_name": m.venue_name,
            }
            for m in matches
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
    }
