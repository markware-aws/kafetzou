from pydantic import BaseModel, Field


# The descriptions are part of the JSON schema the model sees, so they steer the writing.
class TarotReading(BaseModel):
    cards: list[str] = Field(..., description="Οι κάρτες της διάταξης (τις συμπληρώνει το σύστημα)")
    interpretation: str = Field(
        ...,
        description=(
            "Η ερμηνεία σε παραγράφους. Ονομάζει κάθε κάρτα, στηρίζεται στη σημασία της, τη δένει "
            "με μια καθημερινή κατάσταση και περιλαμβάνει μία προειδοποίηση"
        ),
    )
    advice: str = Field(
        ...,
        description="Πρακτική συμβουλή 2-3 προτάσεων: τι να κάνετε ή να αποφύγετε τις επόμενες μέρες",
    )
    summary: str = Field(..., description="Σύντομη ατάκα-τίτλος έως 12 λέξεις")
