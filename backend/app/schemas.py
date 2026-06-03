from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.time_utils import utc_ms_from_naive


class ActivityCreate(BaseModel):
    platform: str = Field(..., min_length=1, max_length=64)
    desc: Optional[str] = Field(None, max_length=512)
    dur: Optional[float] = Field(None, ge=0)
    time: Optional[int] = Field(None, description="Unix timestamp in milliseconds")
    auto: bool = False

    @field_validator("platform")
    @classmethod
    def strip_platform(cls, v: str) -> str:
        return v.strip()


class ActivityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    platform: str
    desc: Optional[str] = None
    dur: Optional[float] = None
    time: int
    auto: bool
    created_at: datetime

    @classmethod
    def from_orm_activity(cls, activity) -> "ActivityResponse":
        logged_ms = utc_ms_from_naive(activity.logged_at)
        return cls(
            id=activity.id,
            platform=activity.platform,
            desc=activity.description,
            dur=activity.duration_minutes,
            time=logged_ms,
            auto=activity.auto_detected,
            created_at=activity.created_at,
        )


class ActivityListResponse(BaseModel):
    items: List[ActivityResponse]
    total: int


class PlatformStat(BaseModel):
    platform: str
    count: int
    minutes: float


class DashboardStats(BaseModel):
    date: date
    total_activities: int
    auto_detected: int
    manual_entries: int
    total_minutes: float
    by_platform: List[PlatformStat]


class CalendarDayStat(BaseModel):
    date: date
    count: int


class CalendarMonthResponse(BaseModel):
    year: int
    month: int
    days: List[CalendarDayStat]
