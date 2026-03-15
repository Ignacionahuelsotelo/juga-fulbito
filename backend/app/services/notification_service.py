"""
Notification service — creates and queries notifications.
"""

import uuid

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification


async def create_notification(
    user_id: uuid.UUID,
    type: str,
    title: str,
    body: str | None,
    data: dict | None,
    db: AsyncSession,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        type=type,
        title=title,
        body=body,
        data=data,
    )
    db.add(notification)
    await db.flush()
    return notification


async def get_notifications(
    user_id: uuid.UUID,
    db: AsyncSession,
    page: int = 1,
    per_page: int = 20,
    unread_only: bool = False,
) -> dict:
    offset = (page - 1) * per_page

    query = select(Notification).where(Notification.user_id == user_id)
    count_query = (
        select(func.count())
        .select_from(Notification)
        .where(Notification.user_id == user_id)
    )

    if unread_only:
        query = query.where(Notification.is_read == False)
        count_query = count_query.where(Notification.is_read == False)

    query = query.order_by(Notification.created_at.desc()).offset(offset).limit(per_page)

    result = await db.execute(query)
    notifications = result.scalars().all()

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    unread_result = await db.execute(
        select(func.count())
        .select_from(Notification)
        .where(Notification.user_id == user_id, Notification.is_read == False)
    )
    unread_count = unread_result.scalar() or 0

    return {
        "notifications": notifications,
        "total": total,
        "unread_count": unread_count,
    }


async def get_unread_count(user_id: uuid.UUID, db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(Notification)
        .where(Notification.user_id == user_id, Notification.is_read == False)
    )
    return result.scalar() or 0


async def mark_as_read(notification_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession) -> None:
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user_id,
        )
    )
    notification = result.scalar_one_or_none()
    if notification:
        notification.is_read = True
        await db.commit()


async def mark_all_as_read(user_id: uuid.UUID, db: AsyncSession) -> int:
    result = await db.execute(
        update(Notification)
        .where(Notification.user_id == user_id, Notification.is_read == False)
        .values(is_read=True)
    )
    await db.commit()
    return result.rowcount
