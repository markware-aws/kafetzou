import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_user
from app.schemas.profile import BirthProfileRequest, BirthProfileResponse, ChartData
from app.services import dynamodb_service
from app.services.chart_service import calculate_chart, geocode_place

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("/birth", response_model=BirthProfileResponse | None)
async def get_birth_profile(
    current_user: dict = Depends(get_current_user),
) -> BirthProfileResponse | None:
    """Return the authenticated user's saved birth profile, or null if not set."""
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    profile = dynamodb_service.get_birth_profile(user_id)
    if not profile:
        return None

    chart_data = None
    if profile.get("chart"):
        chart_data = ChartData(**profile["chart"])

    return BirthProfileResponse(
        date_of_birth=profile["date_of_birth"],
        time_of_birth=profile["time_of_birth"],
        time_known=profile["time_known"],
        birth_place=profile["birth_place"],
        birth_lat=profile.get("birth_lat"),
        birth_lon=profile.get("birth_lon"),
        chart=chart_data,
        sex=profile.get("sex"),
        eye_color=profile.get("eye_color"),
    )


@router.put("/birth", response_model=BirthProfileResponse)
async def save_birth_profile(
    body: BirthProfileRequest,
    current_user: dict = Depends(get_current_user),
) -> BirthProfileResponse:
    """Save birth data, geocode the birth place, and calculate the natal chart."""
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    time_known = body.time_of_birth is not None
    birth_time = body.time_of_birth or "12:00"

    # Geocode the birth place
    coords = await geocode_place(body.birth_place)
    if not coords:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Δεν βρέθηκαν συντεταγμένες για '{body.birth_place}'. Δοκίμασε πιο συγκεκριμένη τοποθεσία (π.χ. 'Αθήνα, Ελλάδα').",
        )
    lat, lon = coords

    # Calculate natal chart
    try:
        chart_dict = calculate_chart(
            date_of_birth=body.date_of_birth,
            time_of_birth=birth_time,
            lat=lat,
            lon=lon,
            time_known=time_known,
        )
    except RuntimeError as exc:
        logger.error("Chart calculation failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    except Exception as exc:
        logger.error("Chart calculation error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Σφάλμα υπολογισμού χάρτη: {exc}",
        )

    # Persist to DynamoDB
    dynamodb_service.save_birth_profile(
        user_id=user_id,
        date_of_birth=body.date_of_birth,
        time_of_birth=body.time_of_birth,
        time_known=time_known,
        birth_place=body.birth_place,
        birth_lat=lat,
        birth_lon=lon,
        chart=chart_dict,
        sex=body.sex,
        eye_color=body.eye_color,
    )

    return BirthProfileResponse(
        date_of_birth=body.date_of_birth,
        time_of_birth=body.time_of_birth,
        time_known=time_known,
        birth_place=body.birth_place,
        birth_lat=lat,
        birth_lon=lon,
        chart=ChartData(**chart_dict),
        sex=body.sex,
        eye_color=body.eye_color,
    )
