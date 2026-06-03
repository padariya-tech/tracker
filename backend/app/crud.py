from calendar import monthrange
from datetime import date, datetime
from typing import Dict, List, Optional, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import Activity
from app.schemas import ActivityCreate, ActivityResponse, DashboardStats, PlatformStat
from app.time_utils import (
    ist_date_from_utc_naive,
    ist_day_bounds,
    utc_naive_from_ms,
    utc_naive_now,
)


def _logged_at_from_payload(payload: ActivityCreate) -> datetime:
    if payload.time is not None:
        return utc_naive_from_ms(payload.time)
    return utc_naive_now()


def find_duplicate(
    db: Session,
    platform: str,
    description: Optional[str],
    logged_at: datetime,
) -> Optional[Activity]:
    day_start, day_end = ist_day_bounds(ist_date_from_utc_naive(logged_at))
    query = db.query(Activity).filter(
        Activity.platform == platform,
        Activity.logged_at >= day_start,
        Activity.logged_at < day_end,
    )
    if description:
        query = query.filter(Activity.description == description)
    else:
        query = query.filter(Activity.description.is_(None))
    return query.first()


def create_activity(db: Session, payload: ActivityCreate) -> Optional[Activity]:
    logged_at = _logged_at_from_payload(payload)
    if find_duplicate(db, payload.platform, payload.desc, logged_at):
        return None

    activity = Activity(
        platform=payload.platform,
        description=payload.desc,
        duration_minutes=payload.dur,
        logged_at=logged_at,
        auto_detected=payload.auto,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity


def list_activities(
    db: Session,
    *,
    target_date: Optional[date] = None,
    platform: Optional[str] = None,
    limit: int = 200,
    offset: int = 0,
) -> Tuple[List[Activity], int]:
    query = db.query(Activity)

    if target_date:
        day_start, day_end = ist_day_bounds(target_date)
        query = query.filter(
            Activity.logged_at >= day_start,
            Activity.logged_at < day_end,
        )

    if platform:
        query = query.filter(
            func.lower(Activity.platform) == platform.strip().lower()
        )

    total = query.count()
    items = (
        query.order_by(Activity.logged_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return items, total


def get_activity(db: Session, activity_id: int) -> Optional[Activity]:
    return db.query(Activity).filter(Activity.id == activity_id).first()


def delete_activity(db: Session, activity: Activity) -> None:
    db.delete(activity)
    db.commit()


def get_dashboard_stats(db: Session, target_date: date) -> DashboardStats:
    day_start, day_end = ist_day_bounds(target_date)
    rows = (
        db.query(Activity)
        .filter(Activity.logged_at >= day_start, Activity.logged_at < day_end)
        .all()
    )

    auto = sum(1 for r in rows if r.auto_detected)
    total_minutes = sum(r.duration_minutes or 0 for r in rows)

    platform_map: dict[str, dict[str, float]] = {}
    for row in rows:
        bucket = platform_map.setdefault(row.platform, {"count": 0, "minutes": 0.0})
        bucket["count"] += 1
        bucket["minutes"] += row.duration_minutes or 0

    by_platform = [
        PlatformStat(platform=name, count=int(data["count"]), minutes=data["minutes"])
        for name, data in sorted(platform_map.items(), key=lambda x: -x[1]["count"])
    ]

    return DashboardStats(
        date=target_date,
        total_activities=len(rows),
        auto_detected=auto,
        manual_entries=len(rows) - auto,
        total_minutes=round(total_minutes, 1),
        by_platform=by_platform,
    )


def get_active_days_for_month(db: Session, year: int, month: int) -> Dict[date, int]:
    last_day = monthrange(year, month)[1]
    month_start, _ = ist_day_bounds(date(year, month, 1))
    _, month_end = ist_day_bounds(date(year, month, last_day))

    rows = (
        db.query(Activity)
        .filter(
            Activity.logged_at >= month_start,
            Activity.logged_at < month_end,
        )
        .all()
    )

    counts: Dict[date, int] = {}
    for row in rows:
        day = ist_date_from_utc_naive(row.logged_at)
        counts[day] = counts.get(day, 0) + 1
    return counts


def to_response(activity: Activity) -> ActivityResponse:
    return ActivityResponse.from_orm_activity(activity)
