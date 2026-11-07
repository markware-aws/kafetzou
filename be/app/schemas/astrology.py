from typing import Literal
from pydantic import BaseModel, Field


ZodiacSign = Literal[
    "aries", "taurus", "gemini", "cancer", "leo", "virgo",
    "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
]

PeriodType = Literal["daily", "weekly", "monthly"]


# The descriptions are part of the JSON schema the model sees, so they steer the writing.
class AstrologyReading(BaseModel):
    general: str = Field(
        ...,
        description=(
            "Το κυρίως κείμενο. Ξεκινά από ό,τι αλλάζει για το ζώδιο, ποτέ με πλανήτη. Η κίνηση "
            "του ουρανού έρχεται μετά ως εξήγηση, και καταλήγει σε πρακτική συμβουλή"
        ),
    )
    love: str = Field(
        ...,
        description="Σχέσεις και έρωτας, με συγκεκριμένες καταστάσεις",
    )
    career: str = Field(
        ...,
        description="Δουλειά και οικονομικά: συνάδελφοι, προϊστάμενοι, συμφωνίες, έξοδα, χαρτιά",
    )
    luck: str = Field(
        ...,
        description=(
            "Ποια ευκαιρία ανοίγει για το ζώδιο, και μια ενθαρρυντική προτροπή. "
            "Δεν ξεκινά με χρόνο, μέρα ή ημερομηνία"
        ),
    )
    summary: str = Field(
        ...,
        description="Μία σύντομη πρόταση έως 15 λέξεις με το κλίμα της περιόδου, χωρίς το όνομα του ζωδίου",
    )
    warning: str = Field(
        ...,
        description=(
            "Κάτι να έχει υπόψη ο αναγνώστης: 1-2 σύντομες, αυτοτελείς προτάσεις, έως 25 λέξεις. "
            "Δεν ξεκινά με «Ωστόσο», «Όμως» ή «Αλλά»"
        ),
    )
    moon_insight: str | None = Field(
        None,
        description="Η γενέθλια Σελήνη: συναισθηματικές ανάγκες και αντιδράσεις (μόνο για εξατομικευμένες με χάρτη)",
    )
    ascendant_insight: str | None = Field(
        None,
        description="Ο Ωροσκόπος: πώς σας βλέπουν οι άλλοι και η πρώτη εντύπωση (μόνο αν η ώρα γέννησης είναι γνωστή)",
    )


class PersonalizedReadingRequest(BaseModel):
    sign: ZodiacSign
    sex: str   # "Άνδρας" | "Γυναίκα" | "Άλλο"
    date_of_birth: str  # "YYYY-MM-DD"
    eye_color: str
