from pydantic import BaseModel, Field


class BirthProfileRequest(BaseModel):
    date_of_birth: str           # "YYYY-MM-DD"
    time_of_birth: str | None = None  # "HH:MM", None = user doesn't know
    birth_place: str             # "Athens, Greece"
    sex: str | None = None       # stored for quick use in astrology readings
    eye_color: str | None = None


class ChartData(BaseModel):
    sun_sign: str
    sun_degree: float
    moon_sign: str
    moon_degree: float
    ascendant_sign: str | None = None
    ascendant_degree: float | None = None
    time_known: bool


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
