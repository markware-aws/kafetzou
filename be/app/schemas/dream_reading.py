from pydantic import BaseModel, Field


# The descriptions are part of the JSON schema the model sees, so they steer the writing.
class DreamReading(BaseModel):
    interpretation: str = Field(
        description="Η κύρια ερμηνεία: τι σημαίνουν τα βασικά σύμβολα του ονείρου και τι μπορεί να δείχνουν για όσα ζείτε τώρα",
    )
    symbols: list[str] = Field(
        description="Τα βασικά σύμβολα ή θέματα του ονείρου, 3-6 σύντομες λέξεις ή φράσεις",
    )
    emotions: str = Field(
        description="Τα συναισθήματα πίσω από το όνειρο και τι εκφράζουν για τη διάθεσή σας αυτή την περίοδο",
    )
    advice: str = Field(
        description="Πρακτική συμβουλή: τι μπορείτε να κάνετε με αυτό το μήνυμα τις επόμενες μέρες",
    )
    summary: str = Field(description="Σύντομη ατάκα-τίτλος έως 12 λέξεις")
