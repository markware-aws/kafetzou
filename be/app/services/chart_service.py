"""
Birth chart calculation via Swiss Ephemeris (pyswisseph).

calculate_chart() returns the whole natal chart: the ten planets and the lunar North Node
(sign, degree, retrograde, house), Ascendant, Midheaven, the twelve house cusps and the major
aspects. The seven legacy keys (sun/moon/ascendant sign and degree, time_known) stay at the
top level for older readers (mobile, personalized horoscopes, dreams).

Notes:
- The birth time is the wall-clock time of the birth place; its IANA time zone comes from the
  coordinates (timezonefinder), with historical summer-time rules from the tz database.
- When the birth time is unknown the chart is computed for 12:00 local time and has no
  Ascendant, Midheaven or houses. The Moon moves ~13° a day, so its aspects are left out and
  `moon_day_signs` says when it changed sign that day.
- Houses are Placidus. Placidus is undefined near the poles, so above 66° of latitude (or when
  swisseph cannot solve it) the chart uses whole-sign houses.
- No ephemeris data files are shipped: swisseph falls back to the Moshier semi-analytical
  theory, accurate to well under 0.01° for every body used here. Chiron would need data files.
- Geocoding is done via Nominatim/OpenStreetMap (no API key required).
"""

import logging
from datetime import datetime, timezone
from functools import lru_cache
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import httpx

logger = logging.getLogger(__name__)

try:
    import swisseph as swe
    _SWE_AVAILABLE = True
except ImportError:
    _SWE_AVAILABLE = False
    logger.warning("pyswisseph not installed: chart calculations disabled")

# Version 1 charts held only the seven legacy keys; older stored charts are upgraded on load
CHART_VERSION = 2

# Used when the birth place has no time zone (at sea) or the lookup fails: most users are Greek
DEFAULT_TIME_ZONE = "Europe/Athens"

ZODIAC_SIGNS = [
    "aries", "taurus", "gemini", "cancer", "leo", "virgo",
    "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
]

SIGNS_GR = {
    "aries":       "Κριός",
    "taurus":      "Ταύρος",
    "gemini":      "Δίδυμοι",
    "cancer":      "Καρκίνος",
    "leo":         "Λέων",
    "virgo":       "Παρθένος",
    "libra":       "Ζυγός",
    "scorpio":     "Σκορπιός",
    "sagittarius": "Τοξότης",
    "capricorn":   "Αιγόκερως",
    "aquarius":    "Υδροχόος",
    "pisces":      "Ιχθύες",
}

SIGNS_SYMBOL = {
    "aries": "♈", "taurus": "♉", "gemini": "♊", "cancer": "♋",
    "leo": "♌", "virgo": "♍", "libra": "♎", "scorpio": "♏",
    "sagittarius": "♐", "capricorn": "♑", "aquarius": "♒", "pisces": "♓",
}

# Chart order; values are swisseph body names
PLANET_BODIES: dict[str, str] = {
    "sun": "SUN",
    "moon": "MOON",
    "mercury": "MERCURY",
    "venus": "VENUS",
    "mars": "MARS",
    "jupiter": "JUPITER",
    "saturn": "SATURN",
    "uranus": "URANUS",
    "neptune": "NEPTUNE",
    "pluto": "PLUTO",
    "north_node": "TRUE_NODE",
}

PLANET_NAMES_GR: dict[str, str] = {
    "sun": "Ήλιος",
    "moon": "Σελήνη",
    "mercury": "Ερμής",
    "venus": "Αφροδίτη",
    "mars": "Άρης",
    "jupiter": "Δίας",
    "saturn": "Κρόνος",
    "uranus": "Ουρανός",
    "neptune": "Ποσειδώνας",
    "pluto": "Πλούτωνας",
    "north_node": "Βόρειος Δεσμός",
}

# (type, exact angle, orb in degrees)
ASPECTS: list[tuple[str, int, float]] = [
    ("conjunction", 0, 8.0),
    ("sextile", 60, 5.0),
    ("square", 90, 7.0),
    ("trine", 120, 7.0),
    ("opposition", 180, 8.0),
]
ASPECT_ANGLES: dict[str, int] = {aspect: angle for aspect, angle, _ in ASPECTS}
# The Sun and Moon are the brightest points of a chart, so their aspects get a wider orb
LUMINARIES = frozenset({"sun", "moon"})
LUMINARY_ORB_BONUS = 1.0
# The node is a point, not a body: it gets no aspects and is never called retrograde
_NODE_ID = "north_node"

# Placidus has no solution where part of the ecliptic never rises (beyond ~66.5° of latitude)
POLAR_LATITUDE = 66.0


class EphemerisUnavailableError(RuntimeError):
    """pyswisseph is not installed, so no chart can be calculated."""


# ── Pure helpers (no swisseph needed) ────────────────────────────────────────

def longitude_to_sign(longitude: float) -> tuple[str, float]:
    """Convert ecliptic longitude (0-360°) → (sign_id, degree_within_sign).

    Rounds first, so 59.97° is Gemini 0.0°, never Taurus 30.0°.
    """
    rounded = round(longitude % 360, 1) % 360
    sign_index = int(rounded // 30)
    return ZODIAC_SIGNS[sign_index], round(rounded - sign_index * 30, 1)


def angular_separation(first: float, second: float) -> float:
    """Shortest distance between two ecliptic longitudes, 0-180°."""
    distance = abs(first - second) % 360
    return 360 - distance if distance > 180 else distance


def house_of(longitude: float, cusps: list[float]) -> int:
    """House (1-12) that holds a longitude; cusps[0] is the start of house 1."""
    for index, start in enumerate(cusps):
        end = cusps[(index + 1) % 12]
        span = (end - start) % 360
        if span and (longitude - start) % 360 < span:
            return index + 1
    # Only reachable with degenerate cusps (all equal)
    return 1


def find_aspects(planets: list[dict], include_moon: bool) -> list[dict]:
    """Major aspects between the planets (`id`, `longitude` dicts), in chart order.

    The North Node gets no aspects. include_moon=False drops the Moon's aspects, for charts
    without a birth time, where the Moon's position is only known to within ~6°.
    """
    bodies = [
        planet for planet in planets
        if planet["id"] != _NODE_ID and (include_moon or planet["id"] != "moon")
    ]
    aspects = []
    for index, first in enumerate(bodies):
        for second in bodies[index + 1:]:
            separation = angular_separation(first["longitude"], second["longitude"])
            bonus = LUMINARY_ORB_BONUS if {first["id"], second["id"]} & LUMINARIES else 0.0
            for aspect, angle, orb in ASPECTS:
                distance = abs(separation - angle)
                if distance <= orb + bonus:
                    aspects.append({
                        "planet_a": first["id"],
                        "planet_b": second["id"],
                        "type": aspect,
                        "orb": round(distance, 1),
                    })
                    break
    return aspects


def _point(longitude: float) -> dict:
    sign, degree = longitude_to_sign(longitude)
    return {"longitude": round(longitude % 360, 2), "sign": sign, "degree": degree}


# ── Time ─────────────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def _timezone_finder():
    # timezonefinder loads numpy and its polygon data: import it on first use, so cold
    # starts of requests that never calculate a chart stay fast
    from timezonefinder import TimezoneFinder
    return TimezoneFinder()


def time_zone_for(lat: float, lon: float) -> str:
    """IANA time zone of a birth place; DEFAULT_TIME_ZONE at sea or when the lookup fails."""
    try:
        name = _timezone_finder().timezone_at_land(lng=lon, lat=lat)
    except Exception as exc:  # a missing time zone must never block a chart
        logger.error("Time zone lookup failed for %s, %s: %s", lat, lon, exc)
        return DEFAULT_TIME_ZONE
    if not name:
        return DEFAULT_TIME_ZONE
    try:
        ZoneInfo(name)
    except ZoneInfoNotFoundError:
        logger.warning("Time zone %s is not in the tz database, using %s", name, DEFAULT_TIME_ZONE)
        return DEFAULT_TIME_ZONE
    return name


def birth_time_to_utc(
    date_of_birth: str, time_of_birth: str, time_zone: str = DEFAULT_TIME_ZONE
) -> datetime:
    """Wall-clock birth time ("YYYY-MM-DD", "HH:MM") in `time_zone` → UTC, for Swiss Ephemeris.

    The UTC date can be the day before: 01:30 in Athens is 22:30 or 23:30 UTC.
    """
    local = datetime.strptime(f"{date_of_birth} {time_of_birth}", "%Y-%m-%d %H:%M")
    return local.replace(tzinfo=ZoneInfo(time_zone)).astimezone(timezone.utc)


# ── Geocoding ────────────────────────────────────────────────────────────────

async def geocode_place(place: str) -> tuple[float, float] | None:
    """Returns (lat, lon) for a city/place string, or None on failure.

    Uses Nominatim (OpenStreetMap): free, no API key needed.
    Rate-limited to 1 req/sec by Nominatim TOS; fine for profile saves (rare calls).
    """
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": place, "format": "json", "limit": 1},
                headers={"User-Agent": "kafetzou-astrology/1.0"},
            )
            data = response.json()
            if data:
                return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception as exc:
        logger.warning("Geocoding failed for '%s': %s", place, exc)
    return None


# ── Ephemeris ────────────────────────────────────────────────────────────────

def _julian_day(utc: datetime) -> float:
    return swe.julday(utc.year, utc.month, utc.day, utc.hour + utc.minute / 60.0)


def _planets(jd: float) -> list[dict]:
    planets = []
    for planet_id, body in PLANET_BODIES.items():
        xx, _ = swe.calc_ut(jd, getattr(swe, body), swe.FLG_SWIEPH | swe.FLG_SPEED)
        planets.append({
            "id": planet_id,
            **_point(xx[0]),
            "retrograde": planet_id != _NODE_ID and xx[3] < 0,
            "house": None,
        })
    return planets


def _houses(jd: float, lat: float, lon: float) -> tuple[list[float], float, float, str]:
    """(12 cusps, Ascendant, Midheaven, house system) for a moment and place."""
    if abs(lat) < POLAR_LATITUDE:
        try:
            cusps, ascmc = swe.houses(jd, lat, lon, b"P")
            return list(cusps), ascmc[0], ascmc[1], "placidus"
        except swe.Error as exc:
            logger.info("Placidus failed at latitude %s (%s), using whole-sign houses", lat, exc)
    _, ascmc = swe.houses(jd, lat, lon, b"W")
    ascendant = ascmc[0] % 360
    first_cusp = (ascendant // 30) * 30
    cusps = [(first_cusp + 30 * index) % 360 for index in range(12)]
    return cusps, ascendant, ascmc[1], "whole_sign"


def _moon_day_signs(date_of_birth: str, time_zone: str) -> list[str] | None:
    """[sign at 00:00, sign at 23:59] local time when the Moon changed sign that day, else None."""
    signs = []
    for clock in ("00:00", "23:59"):
        jd = _julian_day(birth_time_to_utc(date_of_birth, clock, time_zone))
        xx, _ = swe.calc_ut(jd, swe.MOON, swe.FLG_SWIEPH)
        signs.append(longitude_to_sign(xx[0])[0])
    return signs if signs[0] != signs[1] else None


def calculate_chart(
    date_of_birth: str,   # "YYYY-MM-DD"
    time_of_birth: str,   # "HH:MM" local time of the birth place; pass "12:00" when unknown
    lat: float,
    lon: float,
    time_known: bool = True,
) -> dict:
    """Calculate the natal chart (the ChartData shape in schemas/profile.py, version 2).

    Raises EphemerisUnavailableError when pyswisseph is not installed.
    """
    if not _SWE_AVAILABLE:
        raise EphemerisUnavailableError("pyswisseph is not installed: add it to requirements.txt")

    time_zone = time_zone_for(lat, lon)
    jd = _julian_day(birth_time_to_utc(date_of_birth, time_of_birth, time_zone))
    planets = _planets(jd)

    ascendant = midheaven = houses = house_system = None
    if time_known:
        cusps, ascendant_longitude, midheaven_longitude, house_system = _houses(jd, lat, lon)
        ascendant = _point(ascendant_longitude)
        midheaven = _point(midheaven_longitude)
        houses = [{"number": index + 1, **_point(cusp)} for index, cusp in enumerate(cusps)]
        # Compared at the 0.1° shown to the reader, so a planet listed at 0.0° of a sign is
        # never left in the house before that sign's cusp
        shown_cusps = [round(cusp % 360, 1) for cusp in cusps]
        for planet in planets:
            planet["house"] = house_of(round(planet["longitude"], 1), shown_cusps)

    moon_day_signs = None if time_known else _moon_day_signs(date_of_birth, time_zone)
    swe.close()

    sun, moon = planets[0], planets[1]
    return {
        "version": CHART_VERSION,
        "sun_sign": sun["sign"],
        "sun_degree": sun["degree"],
        "moon_sign": moon["sign"],
        "moon_degree": moon["degree"],
        "ascendant_sign": ascendant["sign"] if ascendant else None,
        "ascendant_degree": ascendant["degree"] if ascendant else None,
        "time_known": time_known,
        "time_zone": time_zone,
        "planets": planets,
        "ascendant": ascendant,
        "midheaven": midheaven,
        "houses": houses,
        "house_system": house_system,
        "aspects": find_aspects(planets, include_moon=time_known),
        "moon_day_signs": moon_day_signs,
    }
