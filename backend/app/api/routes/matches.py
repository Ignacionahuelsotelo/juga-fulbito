from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Literal

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.match import (
    BalanceResponse,
    BulkInviteRequest,
    InvitationResponse,
    InviteRequest,
    MatchCreate,
    MatchDetailResponse,
    MatchPlayerResponse,
    MatchResponse,
    MatchStatusUpdate,
    MatchUpdate,
)
from app.services import match_service

router = APIRouter(prefix="/matches", tags=["Matches"])


@router.post("", response_model=MatchResponse, status_code=201)
async def create_match(
    data: MatchCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new match. The organizer is automatically added as a player."""
    match = await match_service.create_match(user, data, db)
    return MatchResponse(
        id=str(match.id),
        organizer_id=str(match.organizer_id),
        venue_name=match.venue_name,
        venue_address=match.venue_address,
        date=match.date,
        start_time=match.start_time,
        duration_minutes=match.duration_minutes,
        players_needed=match.players_needed,
        match_type=match.match_type,
        desired_level=match.desired_level,
        status=match.status,
        created_at=match.created_at,
        confirmed_players_count=1,
    )


@router.get("", response_model=list[MatchResponse])
async def list_matches(
    status_filter: Literal["open", "full", "confirmed", "in_progress", "completed", "cancelled"]
    | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List matches (default: open/full/confirmed). Filter by status."""
    result = await match_service.list_matches(
        db=db,
        status_filter=status_filter,
        page=page,
        per_page=per_page,
    )
    return [
        MatchResponse(
            id=str(m.id),
            organizer_id=str(m.organizer_id),
            venue_name=m.venue_name,
            venue_address=m.venue_address,
            date=m.date,
            start_time=m.start_time,
            duration_minutes=m.duration_minutes,
            players_needed=m.players_needed,
            match_type=m.match_type,
            desired_level=m.desired_level,
            status=m.status,
            created_at=m.created_at,
            confirmed_players_count=count,
        )
        for m, count in result["matches"]
    ]


@router.get("/me")
async def get_my_matches(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get matches where the user is organizer or confirmed player."""
    result = await match_service.get_my_matches(str(user.id), db, page, per_page)
    return [
        MatchResponse(
            id=str(m.id),
            organizer_id=str(m.organizer_id),
            venue_name=m.venue_name,
            venue_address=m.venue_address,
            date=m.date,
            start_time=m.start_time,
            duration_minutes=m.duration_minutes,
            players_needed=m.players_needed,
            match_type=m.match_type,
            desired_level=m.desired_level,
            status=m.status,
            created_at=m.created_at,
            confirmed_players_count=count,
        )
        for m, count in result["matches"]
    ]


@router.get("/{match_id}", response_model=MatchDetailResponse)
async def get_match(
    match_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get full details of a match including confirmed players."""
    match = await match_service.get_match(match_id, db)
    players = await match_service.get_match_players(match_id, db)

    return MatchDetailResponse(
        id=str(match.id),
        organizer_id=str(match.organizer_id),
        venue_name=match.venue_name,
        venue_address=match.venue_address,
        date=match.date,
        start_time=match.start_time,
        duration_minutes=match.duration_minutes,
        players_needed=match.players_needed,
        match_type=match.match_type,
        desired_level=match.desired_level,
        status=match.status,
        team_a=match.team_a,
        team_b=match.team_b,
        ai_explanation=match.ai_explanation,
        created_at=match.created_at,
        confirmed_players_count=len(players),
        players=[MatchPlayerResponse(**p) for p in players],
    )


@router.put("/{match_id}", response_model=MatchResponse)
async def update_match(
    match_id: str,
    data: MatchUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update match details. Only the organizer can edit."""
    match = await match_service.update_match(match_id, user, data, db)
    return MatchResponse(
        id=str(match.id),
        organizer_id=str(match.organizer_id),
        venue_name=match.venue_name,
        venue_address=match.venue_address,
        date=match.date,
        start_time=match.start_time,
        duration_minutes=match.duration_minutes,
        players_needed=match.players_needed,
        match_type=match.match_type,
        desired_level=match.desired_level,
        status=match.status,
        created_at=match.created_at,
    )


@router.delete("/{match_id}", response_model=MatchResponse)
async def cancel_match(
    match_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel a match. Only the organizer can cancel."""
    match = await match_service.cancel_match(match_id, user, db)
    return MatchResponse(
        id=str(match.id),
        organizer_id=str(match.organizer_id),
        venue_name=match.venue_name,
        venue_address=match.venue_address,
        date=match.date,
        start_time=match.start_time,
        duration_minutes=match.duration_minutes,
        players_needed=match.players_needed,
        match_type=match.match_type,
        desired_level=match.desired_level,
        status=match.status,
        created_at=match.created_at,
    )


@router.put("/{match_id}/status", response_model=MatchResponse)
async def update_status(
    match_id: str,
    data: MatchStatusUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change match status (organizer only). Follows valid state transitions."""
    match = await match_service.update_match_status(match_id, user, data.status, db)
    return MatchResponse(
        id=str(match.id),
        organizer_id=str(match.organizer_id),
        venue_name=match.venue_name,
        venue_address=match.venue_address,
        date=match.date,
        start_time=match.start_time,
        duration_minutes=match.duration_minutes,
        players_needed=match.players_needed,
        match_type=match.match_type,
        desired_level=match.desired_level,
        status=match.status,
        created_at=match.created_at,
    )


@router.post("/{match_id}/invite", response_model=InvitationResponse, status_code=201)
async def invite_player(
    match_id: str,
    data: InviteRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Invite a player to the match (organizer only)."""
    inv = await match_service.invite_player(match_id, data.player_id, user, db)
    return InvitationResponse(
        id=str(inv.id),
        match_id=str(inv.match_id),
        player_id=str(inv.player_id),
        status=inv.status,
        created_at=inv.created_at,
        responded_at=inv.responded_at,
    )


@router.post("/{match_id}/invite/bulk", status_code=201)
async def bulk_invite(
    match_id: str,
    data: BulkInviteRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Invite multiple players to the match (organizer only)."""
    invitations = await match_service.bulk_invite(match_id, data.player_ids, user, db)
    return {
        "invitations_sent": len(invitations),
        "invitations": [
            InvitationResponse(
                id=str(inv.id),
                match_id=str(inv.match_id),
                player_id=str(inv.player_id),
                status=inv.status,
                created_at=inv.created_at,
                responded_at=inv.responded_at,
            )
            for inv in invitations
        ],
    }


@router.get("/{match_id}/players", response_model=list[MatchPlayerResponse])
async def get_players(
    match_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get list of confirmed players for a match."""
    players = await match_service.get_match_players(match_id, db)
    return [MatchPlayerResponse(**p) for p in players]


@router.post("/{match_id}/balance", response_model=BalanceResponse)
async def balance_teams(
    match_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Run AI team balancing algorithm on confirmed players.
    Requires an even number of players (minimum 4).
    Only the organizer can trigger this.
    """
    result = await match_service.balance_match_teams(match_id, user, db)
    return BalanceResponse(
        team_a=[MatchPlayerResponse(**p) for p in result["team_a"]],
        team_b=[MatchPlayerResponse(**p) for p in result["team_b"]],
        explanation=result["explanation"],
        balance_score=result["balance_score"],
    )
