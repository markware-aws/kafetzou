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
            "Το κυρίως κείμενο. Ξεκινά από συγκεκριμένη πλανητική κίνηση των δεδομένων, "
            "λέει τι σημαίνει για έναν τομέα του ζωδίου και καταλήγει σε πρακτική συμβουλή"
        ),
    )
    love: str = Field(
        ...,
        description="Σχέσεις και έρωτας, με συγκεκριμένες καταστάσεις. Μπορεί να ξεχωρίζει ελεύθερους και δεσμευμένους",
    )
    career: str = Field(
        ...,
        description="Δουλειά και οικονομικά: συνάδελφοι, προϊστάμενοι, συμφωνίες, έξοδα, χαρτιά",
    )
    luck: str = Field(
        ...,
        description="Η πιο ευνοϊκή στιγμή ή ευκαιρία της περιόδου (ώρα, μέρα ή τομέας), βάσει των δεδομένων",
    )
    summary: str = Field(
        ...,
        description="Σύντομη ατάκα-τίτλος έως 10 λέξεις, χωρίς το όνομα του ζωδίου",
    )
    warning: str = Field(
        ...,
        description="Μία κοφτή προειδοποίηση έως 12 λέξεις, π.χ. «Προσοχή σε βιαστικές υπογραφές.»",
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
