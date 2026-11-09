from typing import Literal

from pydantic import BaseModel

PlanetId = Literal[
    "sun", "moon", "mercury", "venus", "mars", "jupiter",
    "saturn", "uranus", "neptune", "pluto", "north_node",
]
AspectType = Literal["conjunction", "sextile", "square", "trine", "opposition"]


class BirthProfileRequest(BaseModel):
    date_of_birth: str           # "YYYY-MM-DD"
    time_of_birth: str | None = None  # "HH:MM", None = user doesn't know
    birth_place: str             # "Athens, Greece"
    sex: str | None = None       # stored for quick use in astrology readings
    eye_color: str | None = None
    # IANA name the birth time is read in. None keeps the saved one (mobile never sends it).
    birth_time_zone: str | None = None


class ChartPoint(BaseModel):
    longitude: float  # ecliptic, 0-360
    sign: str
    degree: float  # within the sign, 0-<30, 1 decimal


class ChartPlanet(BaseModel):
    id: PlanetId
    longitude: float
    sign: str
    degree: float
    retrograde: bool
    house: int | None = None  # None when the birth time is unknown


class ChartHouse(BaseModel):
    number: int  # 1-12
    longitude: float  # cusp
    sign: str
    degree: float


class ChartAspect(BaseModel):
    planet_a: PlanetId
    planet_b: PlanetId
    type: AspectType
    orb: float  # distance from the exact angle, 1 decimal


class ChartData(BaseModel):
    """A natal chart. Version 1 (stored before the full chart) has only the first seven keys."""

    version: int = 1
    sun_sign: str
    sun_degree: float
    moon_sign: str
    moon_degree: float
    ascendant_sign: str | None = None
    ascendant_degree: float | None = None
    time_known: bool
    time_zone: str | None = None  # IANA name the birth time was read in
    planets: list[ChartPlanet] | None = None
    # The Ascendant is separate from houses[0]: with whole-sign houses cusp 1 is 0° of its sign
    ascendant: ChartPoint | None = None
    midheaven: ChartPoint | None = None
    houses: list[ChartHouse] | None = None
    house_system: Literal["placidus", "whole_sign"] | None = None
    aspects: list[ChartAspect] | None = None
    # [sign at 00:00, sign at 23:59] when the time is unknown and the Moon changed sign that day
    moon_day_signs: list[str] | None = None


class BirthProfileResponse(BaseModel):
    date_of_birth: str
    time_of_birth: str | None = None
    time_known: bool
    birth_place: str
    birth_lat: float | None = None
    birth_lon: float | None = None
    chart: ChartData | None = None
    sex: str | None = None
    eye_color: str | None = None
    birth_time_zone: str  # IANA name the birth time is read in
