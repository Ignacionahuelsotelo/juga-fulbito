from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.services import match_service

router = APIRouter(prefix="/invitations", tags=["Invitations"])


@router.get("/me")
async def get_my_invitations(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all pending invitations for the authenticated user."""
    return await match_service.get_my_invitations(user, db)


@router.put("/{invitation_id}/accept")
async def accept_invitation(
    invitation_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Accept a match invitation.
    Adds the player to the match, the match chat room, and notifies the organizer.
    """
    return await match_service.accept_invitation(invitation_id, user, db)


@router.put("/{invitation_id}/reject")
async def reject_invitation(
    invitation_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Reject a match invitation."""
    return await match_service.reject_invitation(invitation_id, user, db)
