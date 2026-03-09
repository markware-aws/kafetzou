"""
Astrological chart calculation via Swiss Ephemeris (pyswisseph).

Calculates Sun sign, Moon sign, and Ascendant (Rising sign) from birth data.
Geocoding is done via Nominatim/OpenStreetMap (no API key required).

Notes:
- Moon sign requires birth TIME — if unknown, 12:00 PM is used (may be off by ±1 sign
  on days when the Moon changes signs).
- Ascendant requires birth TIME and PLACE — only calculated when time_known=True.
- No ephemeris data files needed: falls back to Moshier semi-analytical theory
  (accurate to ~1 arc minute — more than enough for sign-level calculations).
"""

import logging

import httpx

logger = logging.getLogger(__name__)

try:
    import swisseph as swe
    _SWE_AVAILABLE = True
except ImportError:
    _SWE_AVAILABLE = False
    logger.warning("pyswisseph not installed — chart calculations disabled")

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


def _longitude_to_sign(longitude: float) -> tuple[str, float]:
    """Convert ecliptic longitude (0–360°) → (sign_id, degree_within_sign)."""
    sign_index = int(longitude / 30) % 12
    return ZODIAC_SIGNS[sign_index], round(longitude % 30, 1)


async def geocode_place(place: str) -> tuple[float, float] | None:
    """Returns (lat, lon) for a city/place string, or None on failure.

    Uses Nominatim (OpenStreetMap) — free, no API key needed.
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


def calculate_chart(
    date_of_birth: str,   # "YYYY-MM-DD"
    time_of_birth: str,   # "HH:MM" — pass "12:00" when unknown
    lat: float,
    lon: float,
    time_known: bool = True,
) -> dict:
    """Calculate natal chart positions.

    Returns:
        {
            sun_sign, sun_degree,
            moon_sign, moon_degree,
            ascendant_sign, ascendant_degree,   # None when time_known=False
            time_known
        }
    """
    if not _SWE_AVAILABLE:
        raise RuntimeError("pyswisseph is not installed — add it to requirements.txt")

    from datetime import datetime
    dt = datetime.strptime(f"{date_of_birth} {time_of_birth}", "%Y-%m-%d %H:%M")

    # Julian Day (UT)
    jd = swe.julday(dt.year, dt.month, dt.day, dt.hour + dt.minute / 60.0)

    # Sun
    sun_xx, _ = swe.calc_ut(jd, swe.SUN, swe.FLG_SWIEPH)
    sun_sign, sun_deg = _longitude_to_sign(sun_xx[0])

    # Moon
    moon_xx, _ = swe.calc_ut(jd, swe.MOON, swe.FLG_SWIEPH)
    moon_sign, moon_deg = _longitude_to_sign(moon_xx[0])

    # Ascendant — only meaningful with known birth time
    ascendant_sign = None
    ascendant_deg = None
    if time_known:
        _cusps, ascmc = swe.houses(jd, lat, lon, b"P")  # Placidus house system
        ascendant_sign, ascendant_deg = _longitude_to_sign(ascmc[0])

    swe.close()

    return {
        "sun_sign": sun_sign,
        "sun_degree": sun_deg,
        "moon_sign": moon_sign,
        "moon_degree": moon_deg,
        "ascendant_sign": ascendant_sign,
        "ascendant_degree": ascendant_deg,
        "time_known": time_known,
    }
