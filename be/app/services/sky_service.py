"""
Sky snapshot for horoscope prompts, calculated with Swiss Ephemeris (pyswisseph).

Everything here is deterministic. The AI never invents planetary movements: it only
interprets the Greek text that describe_for_sign() produces from real positions.

Houses are whole-sign houses counted from the reader's sun sign, which is how
newspaper sun-sign columns work ("η Σελήνη περνά από τον τομέα της καριέρας σας").
"""

import logging
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from functools import lru_cache
from zoneinfo import ZoneInfo

from app.services.chart_service import SIGNS_GR, ZODIAC_SIGNS, longitude_to_sign

logger = logging.getLogger(__name__)

try:
    import swisseph as swe
    _SWE_AVAILABLE = True
except ImportError:
    _SWE_AVAILABLE = False
    logger.warning("pyswisseph not installed — sky calculations disabled")

ATHENS = ZoneInfo("Europe/Athens")

# Keys are swisseph attribute names (swe.SUN, swe.MOON, ...)
PLANETS_GR: dict[str, str] = {
    "SUN": "Ήλιος",
    "MOON": "Σελήνη",
    "MERCURY": "Ερμής",
    "VENUS": "Αφροδίτη",
    "MARS": "Άρης",
    "JUPITER": "Δίας",
    "SATURN": "Κρόνος",
    "URANUS": "Ουρανός",
    "NEPTUNE": "Ποσειδώνας",
    "PLUTO": "Πλούτωνας",
}
_OUTER_PLANETS = ["MARS", "JUPITER", "SATURN", "URANUS", "NEPTUNE", "PLUTO"]

ASPECTS_GR: dict[int, str] = {
    0: "σύνοδος",
    60: "εξάγωνο",
    90: "τετράγωνο",
    120: "τρίγωνο",
    180: "αντίθεση",
}

# Whole-sign house (counted from the reader's sign) → the aspect it makes to that sign
_HOUSE_ASPECT: dict[int, int] = {1: 0, 3: 60, 11: 60, 4: 90, 10: 90, 5: 120, 9: 120, 7: 180}

TOMEIS_GR: dict[int, str] = {
    1: "εαυτός, εικόνα, πρωτοβουλίες",
    2: "οικονομικά, έσοδα, αγορές",
    3: "επικοινωνία, μετακινήσεις, αδέλφια, χαρτιά",
    4: "σπίτι, οικογένεια, ακίνητα",
    5: "έρωτας, διασκέδαση, παιδιά, δημιουργία",
    6: "καθημερινή εργασία, υγεία, υποχρεώσεις",
    7: "σύντροφος, συνεργασίες, συμφωνίες",
    8: "κοινά οικονομικά, δάνεια, φόροι, ερωτική ένταση",
    9: "ταξίδια, σπουδές, νομικά, εξωτερικό",
    10: "καριέρα, φήμη, προϊστάμενοι",
    11: "φίλοι, ομάδες, σχέδια για το μέλλον",
    12: "παρασκήνιο, ξεκούραση, μυστικά",
}

DECANS_GR = {1: "πρώτο", 2: "δεύτερο", 3: "τρίτο"}

WEEKDAYS_GR = ["Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή", "Σάββατο", "Κυριακή"]
MONTHS_GENITIVE_GR = [
    "Ιανουαρίου", "Φεβρουαρίου", "Μαρτίου", "Απριλίου", "Μαΐου", "Ιουνίου",
    "Ιουλίου", "Αυγούστου", "Σεπτεμβρίου", "Οκτωβρίου", "Νοεμβρίου", "Δεκεμβρίου",
]
MONTHS_GR = [
    "Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος", "Μάιος", "Ιούνιος",
    "Ιούλιος", "Αύγουστος", "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος",
]

_SAMPLE_STEP = timedelta(hours=1)
# Upper bound on how far an angle can move in one step; larger jumps are wrap-arounds
_MAX_STEP_DEGREES = 30.0
_PHASE_ORB = 12.0  # the Moon gains ~12° on the Sun per day, so this is about ±1 day


@dataclass(frozen=True)
class PlanetPosition:
    planet: str  # key of PLANETS_GR
    sign: str  # key of SIGNS_GR
    degree: float  # 0-30 within the sign
    retrograde: bool


@dataclass(frozen=True)
class SkyEvent:
    kind: str  # "ingress" | "station" | "aspect" | "lunation"
    when: datetime  # Europe/Athens
    planet: str
    sign: str | None = None  # ingress: new sign · lunation: the Moon's sign
    other: str | None = None  # aspect: the second planet
    aspect: int | None = None  # aspect / lunation angle (lunation: 0 new, 180 full)
    retrograde: bool | None = None  # station: True when it turns retrograde


@dataclass(frozen=True)
class SkySnapshot:
    period: str  # "daily" | "weekly" | "monthly"
    start: date
    end: date  # inclusive
    positions: list[PlanetPosition]
    moon_phase: str
    events: list[SkyEvent]


# ── Pure helpers ─────────────────────────────────────────────────────────────

def house_from_sign(reader_sign: str, planet_sign: str) -> int:
    """Whole-sign house (1-12) of a planet, counted from the reader's sign."""
    return (ZODIAC_SIGNS.index(planet_sign) - ZODIAC_SIGNS.index(reader_sign)) % 12 + 1


def decan_of(degree: float) -> int:
    """Decan (1-3) for a degree within a sign (0-30)."""
    return min(int(degree // 10) + 1, 3)


def moon_phase_name(elongation: float) -> str:
    """Greek phase name from the Moon's angular distance ahead of the Sun (0-360)."""
    elongation %= 360
    if elongation < _PHASE_ORB or elongation >= 360 - _PHASE_ORB:
        return "Νέα Σελήνη"
    if abs(elongation - 180) < _PHASE_ORB:
        return "Πανσέληνος"
    if abs(elongation - 90) < _PHASE_ORB:
        return "αύξουσα Σελήνη, πρώτο τέταρτο"
    if abs(elongation - 270) < _PHASE_ORB:
        return "φθίνουσα Σελήνη, τελευταίο τέταρτο"
    return "αύξουσα Σελήνη" if elongation < 180 else "φθίνουσα Σελήνη"


def _signed_offset(angle: float, target: float) -> float:
    """Distance from angle to target, normalised to [-180, 180)."""
    return (angle - target + 180) % 360 - 180


def _crossed(offset_before: float, offset_after: float) -> bool:
    if abs(offset_before) > _MAX_STEP_DEGREES or abs(offset_after) > _MAX_STEP_DEGREES:
        return False
    return offset_before < 0 <= offset_after or offset_before > 0 >= offset_after


def format_day(day: date) -> str:
    return f"{WEEKDAYS_GR[day.weekday()]} {day.day} {MONTHS_GENITIVE_GR[day.month - 1]}"


# ── Ephemeris ────────────────────────────────────────────────────────────────

def _julian_day(moment: datetime) -> float:
    utc = moment.astimezone(timezone.utc)
    hours = utc.hour + utc.minute / 60 + utc.second / 3600
    return swe.julday(utc.year, utc.month, utc.day, hours)


def _longitudes(moment: datetime, planets: list[str]) -> dict[str, tuple[float, float]]:
    """{planet: (ecliptic longitude, speed in °/day)} at the given moment."""
    jd = _julian_day(moment)
    result = {}
    for planet in planets:
        xx, _ = swe.calc_ut(jd, getattr(swe, planet), swe.FLG_SWIEPH | swe.FLG_SPEED)
        result[planet] = (xx[0], xx[3])
    return result


def _detect_events(
    before: dict[str, tuple[float, float]],
    after: dict[str, tuple[float, float]],
    moment: datetime,
    aspect_planets: list[str],
    moon_ingresses: bool,
) -> list[SkyEvent]:
    events: list[SkyEvent] = []

    for planet, (lon_before, speed_before) in before.items():
        lon_after, speed_after = after[planet]

        sign_before = int(lon_before // 30)
        sign_after = int(lon_after // 30)
        if sign_before != sign_after and (planet != "MOON" or moon_ingresses):
            events.append(SkyEvent("ingress", moment, planet, sign=ZODIAC_SIGNS[sign_after]))

        if planet not in ("SUN", "MOON") and speed_before * speed_after < 0:
            events.append(SkyEvent("station", moment, planet, retrograde=speed_after < 0))

    for i, first in enumerate(aspect_planets):
        for second in aspect_planets[i + 1:]:
            if {first, second} == {"SUN", "MOON"}:
                continue  # covered by lunations
            separation_before = (before[first][0] - before[second][0]) % 360
            separation_after = (after[first][0] - after[second][0]) % 360
            for aspect in ASPECTS_GR:
                for target in {aspect, (360 - aspect) % 360}:
                    if _crossed(
                        _signed_offset(separation_before, target),
                        _signed_offset(separation_after, target),
                    ):
                        events.append(SkyEvent("aspect", moment, first, other=second, aspect=aspect))

    elongation_before = (before["MOON"][0] - before["SUN"][0]) % 360
    elongation_after = (after["MOON"][0] - after["SUN"][0]) % 360
    for target in (0, 180):
        if _crossed(
            _signed_offset(elongation_before, target),
            _signed_offset(elongation_after, target),
        ):
            moon_sign, _ = longitude_to_sign(after["MOON"][0])
            events.append(SkyEvent("lunation", moment, "MOON", sign=moon_sign, aspect=target))

    return events


# Prewarm asks for the same period once per sign; a monthly scan is ~1s of CPU
@lru_cache(maxsize=8)
def compute_sky(period: str, start: date, end: date) -> SkySnapshot:
    """
    Planet positions at 12:00 Athens time on `start`, plus every ingress, station,
    exact aspect and new/full moon between `start` 00:00 and `end` 24:00 (Athens).

    Daily snapshots include the Moon's aspects; weekly ones only its sign changes;
    monthly ones only new and full moons, so the prompt stays readable.
    """
    if not _SWE_AVAILABLE:
        raise RuntimeError("pyswisseph is not installed — add it to requirements.txt")

    all_planets = list(PLANETS_GR)
    noon = datetime.combine(start, time(12), ATHENS)
    noon_positions = _longitudes(noon, all_planets)

    shown_planets = all_planets if period == "daily" else [p for p in all_planets if p != "MOON"]
    positions = []
    for planet in shown_planets:
        lon, speed = noon_positions[planet]
        sign, degree = longitude_to_sign(lon)
        positions.append(PlanetPosition(planet, sign, degree, retrograde=speed < 0))

    moon_phase = moon_phase_name(noon_positions["MOON"][0] - noon_positions["SUN"][0])

    aspect_planets = all_planets if period == "daily" else [p for p in all_planets if p != "MOON"]
    moon_ingresses = period in ("daily", "weekly")

    events: list[SkyEvent] = []
    moment = datetime.combine(start, time(0), ATHENS).astimezone(timezone.utc)
    stop = datetime.combine(end + timedelta(days=1), time(0), ATHENS).astimezone(timezone.utc)
    previous = _longitudes(moment, all_planets)
    while moment < stop:
        following_moment = moment + _SAMPLE_STEP
        following = _longitudes(following_moment, all_planets)
        midpoint = (moment + _SAMPLE_STEP / 2).astimezone(ATHENS)
        events.extend(_detect_events(previous, following, midpoint, aspect_planets, moon_ingresses))
        moment, previous = following_moment, following

    swe.close()
    return SkySnapshot(period, start, end, positions, moon_phase, events)


# ── Greek description for the prompt ─────────────────────────────────────────

def part_of_day(hour: int) -> str:
    """Greek part of day; columnists say "το απόγευμα", never "στις 15:30"."""
    if hour < 5:
        return "τα ξημερώματα"
    if hour < 12:
        return "το πρωί"
    if hour < 15:
        return "το μεσημέρι"
    if hour < 20:
        return "το απόγευμα"
    return "το βράδυ"


def part_of_month(moment: datetime) -> str:
    """e.g. "μέσα Νοεμβρίου", for readings that should not quote exact dates."""
    if moment.day <= 10:
        part = "αρχές"
    elif moment.day <= 20:
        part = "μέσα"
    else:
        part = "τέλη"
    return f"{part} {MONTHS_GENITIVE_GR[moment.month - 1]}"


def _format_when(sky: SkySnapshot, moment: datetime, coarse_dates: bool) -> str:
    if sky.period == "daily":
        return part_of_day(moment.hour)
    if coarse_dates:
        return part_of_month(moment)
    return f"{WEEKDAYS_GR[moment.weekday()]} {moment.day}/{moment.month}"


def _format_period(sky: SkySnapshot) -> str:
    if sky.period == "daily":
        return f"{format_day(sky.start)} {sky.start.year}"
    if sky.period == "weekly":
        return f"εβδομάδα από {format_day(sky.start)} έως {format_day(sky.end)} {sky.end.year}"
    if sky.start.day == 1:
        return f"{MONTHS_GR[sky.start.month - 1]} {sky.start.year}"
    return f"από {format_day(sky.start)} έως {format_day(sky.end)} {sky.end.year}"


def _relation_to_sign(house: int) -> str:
    aspect = _HOUSE_ASPECT.get(house)
    if aspect is None:
        return ""
    if aspect == 0:
        return " · στο ζώδιό σας"
    return f" · {ASPECTS_GR[aspect]} με το ζώδιό σας"


def _format_event(sky: SkySnapshot, event: SkyEvent, reader_sign: str, coarse_dates: bool) -> str:
    when = _format_when(sky, event.when, coarse_dates)
    planet = PLANETS_GR[event.planet]
    if event.kind == "ingress":
        house = house_from_sign(reader_sign, event.sign)
        return (
            f"{when}: είσοδος {planet} → {SIGNS_GR[event.sign]} "
            f"(τομέας: {TOMEIS_GR[house]})"
        )
    if event.kind == "station":
        direction = "αρχίζει ανάδρομη πορεία" if event.retrograde else "ξαναβρίσκει ορθή πορεία"
        return f"{when}: {planet}: σταθμός, {direction}"
    if event.kind == "lunation":
        name = "Νέα Σελήνη" if event.aspect == 0 else "Πανσέληνος"
        house = house_from_sign(reader_sign, event.sign)
        return f"{when}: {name} ({SIGNS_GR[event.sign]}, τομέας: {TOMEIS_GR[house]})"
    return f"{when}: {planet} {ASPECTS_GR[event.aspect]} {PLANETS_GR[event.other]}"


def describe_for_sign(sky: SkySnapshot, reader_sign: str, coarse_dates: bool = False) -> str:
    """
    Greek, prompt-ready description of the sky as it affects one sun sign.

    coarse_dates: date events as "αρχές/μέσα/τέλη" of the month, so the model
    cannot pile exact dates into the text (used for personalized readings).
    """
    lines = [
        f"Περίοδος: {_format_period(sky)}",
        f"Ζώδιο: {SIGNS_GR[reader_sign]}",
        f"Φάση Σελήνης ({format_day(sky.start)}): {sky.moon_phase}",
        "",
        "Θέσεις πλανητών και τομείς του ζωδίου:",
    ]
    for position in sky.positions:
        house = house_from_sign(reader_sign, position.sign)
        retrograde = " (σε ανάδρομη πορεία)" if position.retrograde else ""
        lines.append(
            f"- {PLANETS_GR[position.planet]}: {SIGNS_GR[position.sign]} "
            f"{int(position.degree)}°{retrograde} · τομέας: {TOMEIS_GR[house]}"
            f"{_relation_to_sign(house)}"
        )

    lines += ["", "Γεγονότα της περιόδου:"]
    if sky.events:
        lines += [f"- {_format_event(sky, event, reader_sign, coarse_dates)}" for event in sky.events]
    else:
        lines.append("- κανένα σημαντικό")

    decan_lines = []
    for position in sky.positions:
        if position.planet not in _OUTER_PLANETS:
            continue
        aspect = _HOUSE_ASPECT.get(house_from_sign(reader_sign, position.sign))
        if aspect is None:
            continue
        relation = "στο ζώδιο" if aspect == 0 else f"σε {ASPECTS_GR[aspect]} με το ζώδιο"
        decan = DECANS_GR[decan_of(position.degree)]
        decan_lines.append(
            f"- {PLANETS_GR[position.planet]} ({SIGNS_GR[position.sign]} "
            f"{int(position.degree)}°) {relation}: αφορά κυρίως το {decan} δεκαήμερο"
        )
    if decan_lines:
        lines += ["", "Δεκαήμερα:"] + decan_lines

    return "\n".join(lines)
