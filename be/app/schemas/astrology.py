from typing import Literal
from pydantic import BaseModel, Field

from app.schemas.profile import ChartData


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


# Top-level strings only: the writing guardrail checks nothing nested. The sentence counts keep
# the whole reading close to the personalized one, inside the API time budget.
class NatalReading(BaseModel):
    summary: str = Field(
        ...,
        description="Μία σύντομη πρόταση έως 15 λέξεις με την ουσία του χάρτη",
    )
    personality: str = Field(
        ...,
        description=(
            "Ο χαρακτήρας: Ήλιος, Ωροσκόπος και κυβερνήτης του χάρτη (χωρίς Ωροσκόπο και "
            "κυβερνήτη όταν η ώρα γέννησης δεν είναι γνωστή). 3-4 προτάσεις"
        ),
    )
    emotions: str = Field(
        ...,
        description="Η Σελήνη: συναισθήματα, ανάγκες, τι σας ησυχάζει και τι σας πληγώνει. 3-4 προτάσεις",
    )
    mind: str = Field(
        ...,
        description="Ο Ερμής: πώς σκέφτεστε, μαθαίνετε και μιλάτε. 3 προτάσεις",
    )
    love: str = Field(
        ...,
        description="Αφροδίτη και Άρης: πώς αγαπάτε, τι σας τραβά, πώς διεκδικείτε. 3-4 προτάσεις",
    )
    career: str = Field(
        ...,
        description=(
            "Μεσουράνημα και Κρόνος: δουλειά, φιλοδοξίες, ευθύνες, χρήματα (χωρίς Μεσουράνημα όταν "
            "η ώρα γέννησης δεν είναι γνωστή). 3-4 προτάσεις"
        ),
    )
    strengths: str = Field(
        ...,
        description="Αρμονικές όψεις (τρίγωνα, εξάγωνα) και ο Δίας: ταλέντα και ευκολίες. 3 προτάσεις",
    )
    challenges: str = Field(
        ...,
        description=(
            "Τεταμένες όψεις (τετράγωνα, αντιθέσεις): τα δύσκολα σημεία και πώς τα διαχειρίζεστε. "
            "3 προτάσεις"
        ),
    )
    life_path: str = Field(
        ...,
        description="Ο Βόρειος Δεσμός: προς τα πού σας σπρώχνει η ζωή και τι καλείστε να μάθετε. 3 προτάσεις",
    )
    warning: str = Field(
        ...,
        description=(
            "Κάτι να έχετε υπόψη: 1-2 σύντομες, αυτοτελείς προτάσεις, έως 25 λέξεις. "
            "Δεν ξεκινά με «Ωστόσο», «Όμως» ή «Αλλά»"
        ),
    )


class NatalReadingItem(BaseModel):
    """A stored natal reading as the history and detail endpoints return it."""

    reading_id: str
    created_at: str
    sex: str | None = None
    date_of_birth: str
    chart: ChartData
    reading_result: NatalReading
    tokens_used: int
