"""
Rating service — create ratings, calculate averages, generate tags.
"""

import uuid

from fastapi import HTTPException
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.match import Match, MatchPlayer
from app.models.rating import Rating
from app.models.user import Profile
from app.schemas.rating import RatingCreate


async def create_rating(user_id: uuid.UUID, data: RatingCreate, db: AsyncSession) -> Rating:
    reviewed_uuid = uuid.UUID(data.reviewed_id)
    match_uuid = uuid.UUID(data.match_id)

    # Can't rate yourself
    if user_id == reviewed_uuid:
        raise HTTPException(status_code=400, detail="No podes calificarte a vos mismo")

    # Verify match exists and is completed
    match_result = await db.execute(select(Match).where(Match.id == match_uuid))
    match = match_result.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    if match.status != "completed":
        raise HTTPException(
            status_code=400, detail="Solo se puede calificar despues de un partido completado"
        )

    # Verify both users were in the match
    reviewer_in_match = await db.execute(
        select(MatchPlayer).where(
            MatchPlayer.match_id == match_uuid,
            MatchPlayer.user_id == user_id,
        )
    )
    if not reviewer_in_match.scalar_one_or_none():
        raise HTTPException(
            status_code=403, detail="No participaste en este partido"
        )

    reviewed_in_match = await db.execute(
        select(MatchPlayer).where(
            MatchPlayer.match_id == match_uuid,
            MatchPlayer.user_id == reviewed_uuid,
        )
    )
    if not reviewed_in_match.scalar_one_or_none():
        raise HTTPException(
            status_code=400, detail="El jugador calificado no participo en este partido"
        )

    # Check not already rated
    existing = await db.execute(
        select(Rating).where(
            Rating.match_id == match_uuid,
            Rating.reviewer_id == user_id,
            Rating.reviewed_id == reviewed_uuid,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Ya calificaste a este jugador en este partido")

    rating = Rating(
        match_id=match_uuid,
        reviewer_id=user_id,
        reviewed_id=reviewed_uuid,
        skill_score=data.skill_score,
        punctuality_score=data.punctuality_score,
        fair_play_score=data.fair_play_score,
        attitude_score=data.attitude_score,
        comment=data.comment,
    )
    db.add(rating)
    await db.flush()

    # Recalculate reviewed user's average rating
    await _recalculate_rating(reviewed_uuid, db)

    await db.commit()
    await db.refresh(rating)
    return rating


async def _recalculate_rating(user_id: uuid.UUID, db: AsyncSession) -> None:
    """Recalculate a user's average rating and update tags."""
    result = await db.execute(
        select(
            func.avg(Rating.skill_score).label("avg_skill"),
            func.avg(Rating.punctuality_score).label("avg_punct"),
            func.avg(Rating.fair_play_score).label("avg_fp"),
            func.avg(Rating.attitude_score).label("avg_att"),
            func.count(Rating.id).label("total"),
        ).where(Rating.reviewed_id == user_id)
    )
    row = result.first()

    if not row or row.total == 0:
        return

    overall = (
        (float(row.avg_skill) + float(row.avg_punct) + float(row.avg_fp) + float(row.avg_att))
        / 4.0
    )

    # Generate tags
    tags = []
    if float(row.avg_punct) >= 4.5:
        tags.append("puntual")
    elif float(row.avg_punct) <= 2.0:
        tags.append("llega tarde")
    if float(row.avg_fp) >= 4.5:
        tags.append("fair play")
    if float(row.avg_att) >= 4.5:
        tags.append("buena onda")
    if float(row.avg_skill) >= 4.5:
        tags.append("crack")
    if overall >= 4.0:
        tags.append("confiable")
    if float(row.avg_skill) >= 4.0 and float(row.avg_fp) <= 2.5:
        tags.append("muy competitivo")

    # Update profile
    profile_result = await db.execute(
        select(Profile).where(Profile.user_id == user_id)
    )
    profile = profile_result.scalar_one_or_none()
    if profile:
        profile.rating_avg = round(overall, 2)
        profile.tags = tags


async def get_ratings_for_match(match_id: str, db: AsyncSession) -> list[dict]:
    result = await db.execute(
        select(Rating, Profile)
        .join(Profile, Profile.user_id == Rating.reviewer_id)
        .where(Rating.match_id == match_id)
        .order_by(Rating.created_at.desc())
    )
    rows = result.all()

    return [
        {
            "id": str(r.id),
            "match_id": str(r.match_id),
            "reviewer_id": str(r.reviewer_id),
            "reviewed_id": str(r.reviewed_id),
            "skill_score": r.skill_score,
            "punctuality_score": r.punctuality_score,
            "fair_play_score": r.fair_play_score,
            "attitude_score": r.attitude_score,
            "comment": r.comment,
            "created_at": r.created_at.isoformat(),
            "reviewer_name": profile.display_name,
        }
        for r, profile in rows
    ]


async def get_user_ratings(user_id: str, db: AsyncSession) -> dict:
    """Get rating summary for a user."""
    result = await db.execute(
        select(
            func.avg(Rating.skill_score).label("avg_skill"),
            func.avg(Rating.punctuality_score).label("avg_punct"),
            func.avg(Rating.fair_play_score).label("avg_fp"),
            func.avg(Rating.attitude_score).label("avg_att"),
            func.count(Rating.id).label("total"),
        ).where(Rating.reviewed_id == user_id)
    )
    row = result.first()

    if not row or row.total == 0:
        return {
            "total_ratings": 0,
            "avg_skill": 0.0,
            "avg_punctuality": 0.0,
            "avg_fair_play": 0.0,
            "avg_attitude": 0.0,
            "overall_avg": 0.0,
        }

    overall = (
        (float(row.avg_skill) + float(row.avg_punct) + float(row.avg_fp) + float(row.avg_att))
        / 4.0
    )

    return {
        "total_ratings": row.total,
        "avg_skill": round(float(row.avg_skill), 2),
        "avg_punctuality": round(float(row.avg_punct), 2),
        "avg_fair_play": round(float(row.avg_fp), 2),
        "avg_attitude": round(float(row.avg_att), 2),
        "overall_avg": round(overall, 2),
    }


async def get_pending_ratings(user_id: uuid.UUID, db: AsyncSession) -> list[dict]:
    """Get players from completed matches that this user hasn't rated yet."""
    # Get completed matches where user participated
    my_matches = (
        select(MatchPlayer.match_id)
        .where(MatchPlayer.user_id == user_id)
        .subquery()
    )

    # Get players in those matches (exclude self)
    all_players = await db.execute(
        select(MatchPlayer, Match, Profile)
        .join(Match, Match.id == MatchPlayer.match_id)
        .join(Profile, Profile.user_id == MatchPlayer.user_id)
        .where(
            MatchPlayer.match_id.in_(select(my_matches.c.match_id)),
            Match.status == "completed",
            MatchPlayer.user_id != user_id,
        )
    )
    players_rows = all_players.all()

    # Get already rated
    already_rated = await db.execute(
        select(Rating.match_id, Rating.reviewed_id).where(
            Rating.reviewer_id == user_id
        )
    )
    rated_set = {(str(r.match_id), str(r.reviewed_id)) for r in already_rated.all()}

    pending = []
    for mp, match, profile in players_rows:
        key = (str(mp.match_id), str(mp.user_id))
        if key not in rated_set:
            pending.append(
                {
                    "user_id": str(mp.user_id),
                    "display_name": profile.display_name,
                    "avatar_url": profile.avatar_url,
                    "match_id": str(match.id),
                    "match_date": match.date.isoformat(),
                }
            )

    return pending
