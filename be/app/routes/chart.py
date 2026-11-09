import logging
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.security import get_current_user
from app.schemas.profile import ChartData
from app.services import chart_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chart", tags=["chart"])

EARLIEST_BIRTH_DATE = date(1900, 1, 1)
# The time zone whose date is ahead of every other, so a birth "today" anywhere is accepted
_LATEST_TIME_ZONE = ZoneInfo("Pacific/Kiritimati")


class ChartRequest(BaseModel):
    date_of_birth: str  # "YYYY-MM-DD"
    time_of_birth: str | None = None  # "HH:MM" local time of the birth place, None = unknown
    latitude: float
    longitude: float


def _input_error(body: ChartRequest) -> str | None:
    """Greek message for the first invalid field, or None when the request is valid."""
    try:
        birth_date = datetime.strptime(body.date_of_birth, "%Y-%m-%d").date()
    except ValueError:
        return "Η ημερομηνία γέννησης δεν είναι σωστή."
    latest = datetime.now(timezone.utc).astimezone(_LATEST_TIME_ZONE).date()
    if not EARLIEST_BIRTH_DATE <= birth_date <= latest:
        return "Η ημερομηνία γέννησης πρέπει να είναι από το 1900 έως σήμερα."
    if body.time_of_birth is not None:
        try:
            datetime.strptime(body.time_of_birth, "%H:%M")
        except ValueError:
            return "Η ώρα γέννησης δεν είναι σωστή."
    if not -90 <= body.latitude <= 90 or not -180 <= body.longitude <= 180:
        return "Ο τόπος γέννησης δεν είναι σωστός. Διάλεξε ξανά την πόλη."
    return None


@router.post("/calculate", response_model=ChartData)
async def calculate_chart(
    body: ChartRequest,
    current_user: dict = Depends(get_current_user),
) -> ChartData:
    """Full natal chart for a birth date, time and place. Free, but needs an account."""
    error = _input_error(body)
    if error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=error)

    try:
        chart = chart_service.calculate_chart(
            date_of_birth=body.date_of_birth,
            time_of_birth=body.time_of_birth or "12:00",
            lat=body.latitude,
            lon=body.longitude,
            time_known=body.time_of_birth is not None,
        )
    except chart_service.EphemerisUnavailableError as exc:
        logger.error("Chart calculation unavailable: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Ο υπολογισμός του χάρτη δεν είναι διαθέσιμος αυτή τη στιγμή.",
        )
    except Exception:
        logger.exception("Chart calculation failed")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Δεν ήταν δυνατός ο υπολογισμός του χάρτη με αυτά τα στοιχεία.",
        )
    return ChartData(**chart)
