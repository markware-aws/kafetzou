"""
Loads a user's birth profile and brings its stored chart up to the current chart version.

Charts saved before the full natal chart (version 1) hold only Sun, Moon and Ascendant. They
are recalculated from the stored birth data the first time the profile is loaded, in the
profile's birth time zone (see profile_time_zone()).
"""

import logging

from app.services import chart_service, dynamodb_service

logger = logging.getLogger(__name__)


def profile_time_zone(profile: dict | None) -> str:
    """The IANA time zone the profile's birth time is read in.

    The zone the user picked; else the zone its version 2 chart was calculated in (found from
    the birth place coordinates back then), so no saved chart moves; else Europe/Athens, the
    zone version 1 charts read every birth time in.
    """
    if not profile:
        return chart_service.DEFAULT_TIME_ZONE
    chart = profile.get("chart") or {}
    for name in (profile.get("birth_time_zone"), chart.get("time_zone")):
        if name and chart_service.is_valid_time_zone(name):
            return name
    return chart_service.DEFAULT_TIME_ZONE


def stored_time_zone(user_id: str) -> str:
    """The birth time zone of the user's saved profile, Europe/Athens when there is none.

    Reads the stored profile without upgrading its chart: callers recalculate the chart anyway.
    """
    return profile_time_zone(dynamodb_service.get_birth_profile(user_id))


def _needs_upgrade(profile: dict) -> bool:
    chart = profile.get("chart")
    has_place = profile.get("birth_lat") is not None and profile.get("birth_lon") is not None
    return has_place and (not chart or chart.get("version") != chart_service.CHART_VERSION)


async def load_birth_profile(user_id: str) -> dict | None:
    """The saved birth profile with a current-version chart, or None when there is none.

    Its `birth_time_zone` is always set, to profile_time_zone(). Never fails because of the
    upgrade: when recalculating goes wrong the stored profile is returned as it is, so the
    profile page and the reading forms keep working.
    """
    stored = dynamodb_service.get_birth_profile(user_id)
    if not stored:
        return None

    time_zone = profile_time_zone(stored)
    profile = {**stored, "birth_time_zone": time_zone}
    if not _needs_upgrade(profile):
        return profile

    time_of_birth = profile.get("time_of_birth")
    try:
        chart = chart_service.calculate_chart(
            date_of_birth=profile["date_of_birth"],
            time_of_birth=time_of_birth or "12:00",
            lat=profile["birth_lat"],
            lon=profile["birth_lon"],
            time_known=bool(profile.get("time_known")) and bool(time_of_birth),
            time_zone=time_zone,
        )
    except Exception:
        logger.exception("Could not upgrade the birth chart of user %s", user_id)
        return profile

    try:
        dynamodb_service.update_birth_chart(user_id, chart)
    except Exception:
        # The new chart is still right for this request; the next load tries to save it again
        logger.exception("Could not save the upgraded birth chart of user %s", user_id)

    return {**profile, "chart": chart}
