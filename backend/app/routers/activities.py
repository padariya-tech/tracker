from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import crud
from app.database import get_db
from app.time_utils import ist_today
from app.schemas import (
    ActivityCreate,
    ActivityListResponse,
    ActivityResponse,
    CalendarDayStat,
    CalendarMonthResponse,
    DashboardStats,
)

router = APIRouter(prefix="/api/activities", tags=["activities"])


@router.post("", response_model=ActivityResponse, status_code=201)
def create_activity(
    payload: ActivityCreate,
    db: Session = Depends(get_db),
):
    activity = crud.create_activity(db, payload)
    if activity is None:
        raise HTTPException(
            status_code=409,
            detail="Activity already logged for this platform and description today",
        )
    return crud.to_response(activity)


@router.get("", response_model=ActivityListResponse)
def list_activities(
    day: Optional[date] = Query(None, description="Filter by calendar date (YYYY-MM-DD)"),
    platform: Optional[str] = Query(None),
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    items, total = crud.list_activities(
        db,
        target_date=day,
        platform=platform,
        limit=limit,
        offset=offset,
    )
    return ActivityListResponse(
        items=[crud.to_response(a) for a in items],
        total=total,
    )


@router.get("/stats", response_model=DashboardStats)
def activity_stats(
    day: Optional[date] = Query(None, description="Stats for this date; defaults to today"),
    db: Session = Depends(get_db),
):
    target = day or ist_today()
    return crud.get_dashboard_stats(db, target)


@router.get("/calendar", response_model=CalendarMonthResponse)
def calendar_month(
    year: int = Query(..., ge=2020, le=2100),
    month: int = Query(..., ge=1, le=12),
    db: Session = Depends(get_db),
):
    counts = crud.get_active_days_for_month(db, year, month)
    days = [
        CalendarDayStat(date=day, count=count)
        for day, count in sorted(counts.items())
    ]
    return CalendarMonthResponse(year=year, month=month, days=days)


@router.get("/{activity_id}", response_model=ActivityResponse)
def get_activity(
    activity_id: int,
    db: Session = Depends(get_db),
):
    activity = crud.get_activity(db, activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    return crud.to_response(activity)


@router.delete("/{activity_id}", status_code=204)
def delete_activity(
    activity_id: int,
    db: Session = Depends(get_db),
):
    activity = crud.get_activity(db, activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    crud.delete_activity(db, activity)
