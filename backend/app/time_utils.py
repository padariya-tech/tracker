from datetime import date, datetime, time, timedelta, timezone
from typing import Tuple
from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")


def utc_naive_from_ms(ms: int) -> datetime:
    return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).replace(tzinfo=None)


def utc_naive_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def utc_ms_from_naive(dt: datetime) -> int:
    if dt.tzinfo is None:
        aware = dt.replace(tzinfo=timezone.utc)
    else:
        aware = dt.astimezone(timezone.utc)
    return int(aware.timestamp() * 1000)


def ist_today() -> date:
    return datetime.now(IST).date()


def ist_day_bounds(target: date) -> Tuple[datetime, datetime]:
    start = datetime.combine(target, time.min, tzinfo=IST)
    end = start + timedelta(days=1)
    return (
        start.astimezone(timezone.utc).replace(tzinfo=None),
        end.astimezone(timezone.utc).replace(tzinfo=None),
    )


def ist_date_from_utc_naive(dt: datetime) -> date:
    if dt.tzinfo is None:
        aware = dt.replace(tzinfo=timezone.utc)
    else:
        aware = dt.astimezone(timezone.utc)
    return aware.astimezone(IST).date()
