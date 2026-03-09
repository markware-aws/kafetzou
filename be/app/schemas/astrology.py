from typing import Literal
from pydantic import BaseModel, Field


ZodiacSign = Literal[
    "aries", "taurus", "gemini", "cancer", "leo", "virgo",
    "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
]

PeriodType = Literal["daily", "weekly", "monthly"]


class AstrologyReading(BaseModel):
    general: str = Field(..., description="Γενικό μήνυμα και ενέργεια περιόδου")
    love: str = Field(..., description="Ερωτική και συναισθηματική ζωή")
    career: str = Field(..., description="Καριέρα, εργασία, οικονομικά")
    luck: str = Field(..., description="Τύχη, ευκαιρίες, ευνοϊκές στιγμές")
    summary: str = Field(..., description="Μία πρόταση που συνοψίζει την ουσία")
    warning: str = Field(..., description="Προειδοποίηση ή σκοτεινό στοιχείο")
    moon_insight: str | None = Field(None, description="Σελήνη — συναισθηματική φύση και εσωτερικός κόσμος (μόνο για εξατομικευμένες με χάρτη)")
    ascendant_insight: str | None = Field(None, description="Ωροσκόπος — εξωτερική εικόνα και πρώτη εντύπωση (μόνο αν ώρα γέννησης γνωστή)")


class PersonalizedReadingRequest(BaseModel):
    sign: ZodiacSign
    sex: str   # "Άνδρας" | "Γυναίκα" | "Άλλο"
    date_of_birth: str  # "YYYY-MM-DD"
    eye_color: str
