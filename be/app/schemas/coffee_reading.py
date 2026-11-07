from pydantic import BaseModel, Field


# The descriptions are part of the JSON schema the model sees, so they steer the writing.
class CoffeeReading(BaseModel):
    general_message: str = Field(
        ...,
        description=(
            "Το κυρίως κείμενο. Ξεκινά από το πιο καθαρό σύμβολο, λέει πού είναι στο φλιτζάνι "
            "και πότε θα φανεί, και περιλαμβάνει μία συγκεκριμένη προειδοποίηση"
        ),
    )
    love: str = Field(
        ...,
        description="Σχέσεις και έρωτας από τα σύμβολα του φλιτζανιού, με συγκεκριμένες καταστάσεις",
    )
    career: str = Field(
        ...,
        description="Δουλειά και χρήματα: συνάδελφοι, προτάσεις, χαρτιά, έξοδα, έσοδα",
    )
    luck: str = Field(
        ...,
        description="Η καλύτερη ευκαιρία που δείχνει το φλιτζάνι και πότε έρχεται",
    )
    symbols: list[str] = Field(
        ...,
        description="Τα σύμβολα της λίστας που χρησιμοποιήθηκαν στην ανάγνωση, με τα ελληνικά ονόματα όπως δόθηκαν",
    )
    prediction_summary: str = Field(
        ...,
        description="Σύντομη ατάκα-τίτλος έως 10 λέξεις",
    )
