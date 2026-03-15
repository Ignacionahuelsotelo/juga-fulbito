from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.rating import RatingCreate, RatingResponse
from app.services import rating_service

router = APIRouter(prefix="/ratings", tags=["Ratings"])


@router.post("", response_model=RatingResponse, status_code=201)
async def create_rating(
    data: RatingCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Rate a player after a completed match.
    Score categories (1-5): skill, punctuality, fair_play, attitude.
    """
    rating = await rating_service.create_rating(user.id, data, db)
    return RatingResponse(
        id=str(rating.id),
        match_id=str(rating.match_id),
        reviewer_id=str(rating.reviewer_id),
        reviewed_id=str(rating.reviewed_id),
        skill_score=rating.skill_score,
        punctuality_score=rating.punctuality_score,
        fair_play_score=rating.fair_play_score,
        attitude_score=rating.attitude_score,
        comment=rating.comment,
        created_at=rating.created_at,
    )


@router.get("/match/{match_id}")
async def get_match_ratings(
    match_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all ratings from a specific match."""
    return await rating_service.get_ratings_for_match(match_id, db)


@router.get("/pending")
async def get_pending_ratings(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get players from completed matches that the current user hasn't rated yet.
    """
    return await rating_service.get_pending_ratings(user.id, db)
