from fastapi import APIRouter, Depends, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import (
    AvatarResponse,
    ProfileResponse,
    ProfileUpdate,
    UserMeResponse,
    UserPublicResponse,
)
from app.services import user_service, rating_service

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserMeResponse)
async def get_me(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the authenticated user's profile."""
    return await user_service.get_me(user, db)


@router.put("/me", response_model=ProfileResponse)
async def update_me(
    data: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the authenticated user's profile."""
    return await user_service.update_profile(user, data, db)


@router.post("/me/avatar", response_model=AvatarResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a profile avatar image (max 5MB)."""
    url = await user_service.upload_avatar(user, file, db)
    return AvatarResponse(avatar_url=url)


@router.get("/{user_id}", response_model=UserPublicResponse)
async def get_user(
    user_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get another user's public profile."""
    return await user_service.get_user_public(user_id, db)


@router.get("/{user_id}/ratings")
async def get_user_ratings(
    user_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get rating summary for a user."""
    return await rating_service.get_user_ratings(user_id, db)


@router.get("/{user_id}/matches")
async def get_user_matches(
    user_id: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get match history for a user."""
    return await user_service.get_user_matches(user_id, db, page, per_page)
