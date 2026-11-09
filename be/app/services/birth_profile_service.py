"""
Loads a user's birth profile and brings its stored chart up to the current chart version.

Charts saved before the full natal chart (version 1) hold only Sun, Moon and Ascendant, and
read every birth time as Greek time. They are recalculated from the stored birth data the
first time the profile is loaded, so users born abroad also get their real time zone.
"""

import logging

from app.services import chart_service, dynamodb_service

logger = logging.getLogger(__name__)


def _needs_upgrade(profile: dict) -> bool:
    chart = profile.get("chart")
    has_place = profile.get("birth_lat") is not None and profile.get("birth_lon") is not None
    return has_place and (not chart or chart.get("version") != chart_service.CHART_VERSION)


async def load_birth_profile(user_id: str) -> dict | None:
    """The saved birth profile with a current-version chart, or None when there is none.

    Never fails because of the upgrade: when recalculating goes wrong the stored profile is
    returned as it is, so the profile page and the reading forms keep working.
    """
    profile = dynamodb_service.get_birth_profile(user_id)
    if not profile or not _needs_upgrade(profile):
        return profile

    time_of_birth = profile.get("time_of_birth")
    try:
        chart = chart_service.calculate_chart(
            date_of_birth=profile["date_of_birth"],
            time_of_birth=time_of_birth or "12:00",
            lat=profile["birth_lat"],
            lon=profile["birth_lon"],
            time_known=bool(profile.get("time_known")) and bool(time_of_birth),
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
