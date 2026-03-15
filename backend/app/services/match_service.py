"""
Match service — business logic for creating matches, invitations, and team balancing.
"""

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from geoalchemy2.elements import WKTElement
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.chat import ChatRoom, ChatRoomMember
from app.models.match import Match, MatchInvitation, MatchPlayer, Venue
from app.models.notification import Notification
from app.models.user import Profile, User
from app.schemas.match import MatchCreate, MatchUpdate
from app.services import notification_service
from app.services.ai_balancer import SKILL_MAP, STYLE_MAP, PlayerData, balance_teams
from app.services.ai_balancer_llm import balance_teams_llm

import logging

logger = logging.getLogger(__name__)


async def create_match(user: User, data: MatchCreate, db: AsyncSession) -> Match:
    match = Match(
        organizer_id=user.id,
        date=data.date,
        start_time=data.start_time,
        duration_minutes=data.duration_minutes,
        players_needed=data.players_needed,
        match_type=data.match_type,
        desired_level=data.desired_level,
    )

    if data.venue_id:
        result = await db.execute(select(Venue).where(Venue.id == data.venue_id))
        venue = result.scalar_one_or_none()
        if not venue:
            raise HTTPException(status_code=404, detail="Cancha no encontrada")
        match.venue_id = venue.id
        match.venue_name = venue.name
        match.venue_address = venue.address
    else:
        match.venue_name = data.venue_name
        match.venue_address = data.venue_address
        if data.latitude is not None and data.longitude is not None:
            match.venue_location = WKTElement(
                f"POINT({data.longitude} {data.latitude})", srid=4326
            )

    db.add(match)

    # Add organizer as a player automatically
    player = MatchPlayer(match_id=match.id, user_id=user.id)
    db.add(player)

    # Create match chat room
    chat_room = ChatRoom(match_id=match.id, type="match")
    db.add(chat_room)
    await db.flush()

    member = ChatRoomMember(room_id=chat_room.id, user_id=user.id)
    db.add(member)

    await db.commit()
    await db.refresh(match)
    return match


async def get_match(match_id: str, db: AsyncSession) -> Match:
    result = await db.execute(
        select(Match)
        .options(selectinload(Match.players), selectinload(Match.venue))
        .where(Match.id == match_id)
    )
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    return match


async def update_match(match_id: str, user: User, data: MatchUpdate, db: AsyncSession) -> Match:
    match = await get_match(match_id, db)

    if match.organizer_id != user.id:
        raise HTTPException(status_code=403, detail="Solo el organizador puede editar el partido")

    if match.status not in ("open", "full"):
        raise HTTPException(status_code=400, detail="No se puede editar un partido en este estado")

    update_data = data.model_dump(exclude_unset=True)
    lat = update_data.pop("latitude", None)
    lng = update_data.pop("longitude", None)

    if lat is not None and lng is not None:
        match.venue_location = WKTElement(f"POINT({lng} {lat})", srid=4326)

    if "venue_id" in update_data and update_data["venue_id"]:
        result = await db.execute(select(Venue).where(Venue.id == update_data["venue_id"]))
        venue = result.scalar_one_or_none()
        if venue:
            match.venue_id = venue.id
            match.venue_name = venue.name
            match.venue_address = venue.address
        update_data.pop("venue_id")

    for field, value in update_data.items():
        setattr(match, field, value)

    match.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(match)
    return match


async def cancel_match(match_id: str, user: User, db: AsyncSession) -> Match:
    match = await get_match(match_id, db)

    if match.organizer_id != user.id:
        raise HTTPException(status_code=403, detail="Solo el organizador puede cancelar")

    if match.status in ("completed", "cancelled"):
        raise HTTPException(status_code=400, detail="El partido ya esta finalizado o cancelado")

    match.status = "cancelled"
    match.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return match


async def update_match_status(
    match_id: str, user: User, new_status: str, db: AsyncSession
) -> Match:
    match = await get_match(match_id, db)

    if match.organizer_id != user.id:
        raise HTTPException(status_code=403, detail="Solo el organizador puede cambiar el estado")

    valid_transitions = {
        "open": ["full", "confirmed", "cancelled"],
        "full": ["open", "confirmed", "cancelled"],
        "confirmed": ["in_progress", "cancelled"],
        "in_progress": ["completed"],
    }

    allowed = valid_transitions.get(match.status, [])
    if new_status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"No se puede pasar de '{match.status}' a '{new_status}'",
        )

    match.status = new_status
    match.updated_at = datetime.now(timezone.utc)
    await db.commit()

    # Notify players on key status changes
    if new_status in ("confirmed", "cancelled"):
        players_result = await db.execute(
            select(MatchPlayer).where(MatchPlayer.match_id == match.id)
        )
        players = players_result.scalars().all()
        title = (
            "Partido confirmado" if new_status == "confirmed" else "Partido cancelado"
        )
        body = (
            f"El partido del {match.date} fue {new_status}"
        )
        for p in players:
            if p.user_id != user.id:
                await notification_service.create_notification(
                    user_id=p.user_id,
                    type="match_reminder",
                    title=title,
                    body=body,
                    data={"match_id": str(match.id)},
                    db=db,
                )
        await db.commit()

    return match


async def list_matches(
    db: AsyncSession,
    user_id: str | None = None,
    status_filter: str | None = None,
    page: int = 1,
    per_page: int = 20,
) -> dict:
    offset = (page - 1) * per_page

    query = select(Match)

    if status_filter:
        query = query.where(Match.status == status_filter)
    else:
        query = query.where(Match.status.in_(["open", "full", "confirmed"]))

    query = query.order_by(Match.date.asc(), Match.start_time.asc()).offset(offset).limit(per_page)

    result = await db.execute(query)
    matches = result.scalars().all()

    # Get player counts
    matches_data = []
    for m in matches:
        count_result = await db.execute(
            select(func.count()).select_from(MatchPlayer).where(MatchPlayer.match_id == m.id)
        )
        count = count_result.scalar() or 0
        matches_data.append((m, count))

    count_query = select(func.count()).select_from(Match)
    if status_filter:
        count_query = count_query.where(Match.status == status_filter)
    else:
        count_query = count_query.where(Match.status.in_(["open", "full", "confirmed"]))

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    return {
        "matches": matches_data,
        "total": total,
        "page": page,
        "per_page": per_page,
    }


async def get_my_matches(user_id: str, db: AsyncSession, page: int = 1, per_page: int = 20) -> dict:
    from sqlalchemy import or_

    offset = (page - 1) * per_page

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

    matches_data = []
    for m in matches:
        count_result = await db.execute(
            select(func.count()).select_from(MatchPlayer).where(MatchPlayer.match_id == m.id)
        )
        count = count_result.scalar() or 0
        matches_data.append((m, count))

    return {"matches": matches_data}


async def invite_player(
    match_id: str, player_id: str, user: User, db: AsyncSession
) -> MatchInvitation:
    match = await get_match(match_id, db)

    if match.organizer_id != user.id:
        raise HTTPException(status_code=403, detail="Solo el organizador puede invitar")

    if match.status not in ("open", "full"):
        raise HTTPException(status_code=400, detail="No se puede invitar en este estado")

    # Check not already invited
    existing = await db.execute(
        select(MatchInvitation).where(
            MatchInvitation.match_id == match.id,
            MatchInvitation.player_id == player_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="El jugador ya fue invitado")

    # Check not already a player
    existing_player = await db.execute(
        select(MatchPlayer).where(
            MatchPlayer.match_id == match.id,
            MatchPlayer.user_id == player_id,
        )
    )
    if existing_player.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="El jugador ya esta en el partido")

    invitation = MatchInvitation(
        match_id=match.id,
        player_id=uuid.UUID(player_id),
    )
    db.add(invitation)

    # Get organizer name for notification
    org_profile = await db.execute(
        select(Profile).where(Profile.user_id == user.id)
    )
    organizer_profile = org_profile.scalar_one_or_none()
    org_name = organizer_profile.display_name if organizer_profile else "Alguien"

    await notification_service.create_notification(
        user_id=uuid.UUID(player_id),
        type="invitation",
        title="Nueva invitacion a partido",
        body=f"{org_name} te invito a jugar el {match.date} a las {match.start_time}",
        data={"match_id": str(match.id), "invitation_id": str(invitation.id)},
        db=db,
    )

    await db.commit()
    await db.refresh(invitation)
    return invitation


async def bulk_invite(
    match_id: str, player_ids: list[str], user: User, db: AsyncSession
) -> list[MatchInvitation]:
    invitations = []
    for pid in player_ids:
        try:
            inv = await invite_player(match_id, pid, user, db)
            invitations.append(inv)
        except HTTPException:
            continue  # Skip already invited
    return invitations


async def accept_invitation(invitation_id: str, user: User, db: AsyncSession) -> dict:
    result = await db.execute(
        select(MatchInvitation).where(
            MatchInvitation.id == invitation_id,
            MatchInvitation.player_id == user.id,
        )
    )
    invitation = result.scalar_one_or_none()

    if not invitation:
        raise HTTPException(status_code=404, detail="Invitacion no encontrada")

    if invitation.status != "pending":
        raise HTTPException(status_code=400, detail="La invitacion ya fue respondida")

    invitation.status = "accepted"
    invitation.responded_at = datetime.now(timezone.utc)

    # Add to match players
    player = MatchPlayer(match_id=invitation.match_id, user_id=user.id)
    db.add(player)

    # Add to match chat room
    chat_result = await db.execute(
        select(ChatRoom).where(
            ChatRoom.match_id == invitation.match_id,
            ChatRoom.type == "match",
        )
    )
    chat_room = chat_result.scalar_one_or_none()
    chat_room_id = None
    if chat_room:
        # Check not already member
        existing_member = await db.execute(
            select(ChatRoomMember).where(
                ChatRoomMember.room_id == chat_room.id,
                ChatRoomMember.user_id == user.id,
            )
        )
        if not existing_member.scalar_one_or_none():
            member = ChatRoomMember(room_id=chat_room.id, user_id=user.id)
            db.add(member)
        chat_room_id = str(chat_room.id)

    # Check if match is now full
    match = await get_match(str(invitation.match_id), db)
    player_count_result = await db.execute(
        select(func.count()).select_from(MatchPlayer).where(MatchPlayer.match_id == match.id)
    )
    player_count = (player_count_result.scalar() or 0) + 1  # +1 for the new player
    if player_count >= match.players_needed:
        match.status = "full"

    # Notify organizer
    user_profile = await db.execute(select(Profile).where(Profile.user_id == user.id))
    profile = user_profile.scalar_one_or_none()
    player_name = profile.display_name if profile else "Un jugador"

    await notification_service.create_notification(
        user_id=match.organizer_id,
        type="acceptance",
        title="Jugador aceptó invitación",
        body=f"{player_name} se sumó al partido del {match.date}",
        data={"match_id": str(match.id)},
        db=db,
    )

    await db.commit()

    return {
        "invitation_id": str(invitation.id),
        "status": "accepted",
        "match_id": str(invitation.match_id),
        "chat_room_id": chat_room_id,
    }


async def reject_invitation(invitation_id: str, user: User, db: AsyncSession) -> dict:
    result = await db.execute(
        select(MatchInvitation).where(
            MatchInvitation.id == invitation_id,
            MatchInvitation.player_id == user.id,
        )
    )
    invitation = result.scalar_one_or_none()

    if not invitation:
        raise HTTPException(status_code=404, detail="Invitacion no encontrada")

    if invitation.status != "pending":
        raise HTTPException(status_code=400, detail="La invitacion ya fue respondida")

    invitation.status = "rejected"
    invitation.responded_at = datetime.now(timezone.utc)
    await db.commit()

    return {
        "invitation_id": str(invitation.id),
        "status": "rejected",
    }


async def get_my_invitations(user: User, db: AsyncSession) -> list[dict]:
    result = await db.execute(
        select(MatchInvitation)
        .options(selectinload(MatchInvitation.match))
        .where(
            MatchInvitation.player_id == user.id,
            MatchInvitation.status == "pending",
        )
        .order_by(MatchInvitation.created_at.desc())
    )
    invitations = result.scalars().all()

    return [
        {
            "id": str(inv.id),
            "match_id": str(inv.match_id),
            "status": inv.status,
            "created_at": inv.created_at.isoformat(),
            "match": {
                "id": str(inv.match.id),
                "date": inv.match.date.isoformat(),
                "start_time": inv.match.start_time.isoformat(),
                "match_type": inv.match.match_type,
                "venue_name": inv.match.venue_name,
                "players_needed": inv.match.players_needed,
                "status": inv.match.status,
            }
            if inv.match
            else None,
        }
        for inv in invitations
    ]


async def get_match_players(match_id: str, db: AsyncSession) -> list[dict]:
    result = await db.execute(
        select(MatchPlayer, Profile)
        .join(Profile, Profile.user_id == MatchPlayer.user_id)
        .where(MatchPlayer.match_id == match_id)
    )
    rows = result.all()

    return [
        {
            "user_id": str(mp.user_id),
            "display_name": profile.display_name,
            "avatar_url": profile.avatar_url,
            "position": profile.position,
            "skill_level": profile.skill_level,
            "rating_avg": float(profile.rating_avg or 0),
            "team": mp.team,
        }
        for mp, profile in rows
    ]


async def balance_match_teams(match_id: str, user: User, db: AsyncSession) -> dict:
    match = await get_match(match_id, db)

    if match.organizer_id != user.id:
        raise HTTPException(status_code=403, detail="Solo el organizador puede balancear equipos")

    # Get confirmed players with profiles
    result = await db.execute(
        select(MatchPlayer, Profile)
        .join(Profile, Profile.user_id == MatchPlayer.user_id)
        .where(MatchPlayer.match_id == match.id)
    )
    rows = result.all()

    if len(rows) < 4:
        raise HTTPException(
            status_code=400, detail="Se necesitan al menos 4 jugadores para balancear"
        )
    if len(rows) % 2 != 0:
        raise HTTPException(
            status_code=400, detail="Se necesita un numero par de jugadores"
        )

    # Build player data for AI
    players = []
    profile_map = {}
    for mp, profile in rows:
        uid = str(mp.user_id)
        profile_map[uid] = profile
        players.append(
            PlayerData(
                user_id=uid,
                display_name=profile.display_name,
                age=profile.age,
                position=profile.position or "mixed",
                skill_level=profile.skill_level or "intermediate",
                skill_numeric=SKILL_MAP.get(profile.skill_level or "intermediate", 2),
                play_style=profile.play_style or "competitive",
                style_numeric=STYLE_MAP.get(profile.play_style or "competitive", 2),
                rating_avg=float(profile.rating_avg or 0),
                matches_played=profile.matches_played or 0,
            )
        )

    # Run AI balancer — LLM first, heuristic fallback
    try:
        balance_result = await balance_teams_llm(players)
        logger.info("Team balance completed using LLM")
    except Exception as e:
        logger.warning(f"LLM balance failed ({e}), using heuristic fallback")
        balance_result = balance_teams(players)

    # Save results to match
    match.team_a = balance_result.team_a
    match.team_b = balance_result.team_b
    match.ai_explanation = balance_result.explanation

    # Update team assignments on match_players
    for mp, _ in rows:
        uid = str(mp.user_id)
        if uid in balance_result.team_a:
            mp.team = "A"
        elif uid in balance_result.team_b:
            mp.team = "B"

    await db.commit()

    # Build response with player details
    def _player_response(uid: str) -> dict:
        p = profile_map[uid]
        return {
            "user_id": uid,
            "display_name": p.display_name,
            "avatar_url": p.avatar_url,
            "position": p.position,
            "skill_level": p.skill_level,
            "rating_avg": float(p.rating_avg or 0),
            "team": "A" if uid in balance_result.team_a else "B",
        }

    return {
        "team_a": [_player_response(uid) for uid in balance_result.team_a],
        "team_b": [_player_response(uid) for uid in balance_result.team_b],
        "explanation": balance_result.explanation,
        "balance_score": balance_result.balance_score,
    }
