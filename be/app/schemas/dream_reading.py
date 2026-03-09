from pydantic import BaseModel, Field


class DreamReading(BaseModel):
    interpretation: str = Field(description="Κύρια ερμηνεία του ονείρου — τι σημαίνει και τι αντανακλά στη ζωή σου")
    symbols: list[str] = Field(description="Τα βασικά σύμβολα/θέματα που εντοπίστηκαν στο όνειρο (3-6 στοιχεία)")
    emotions: str = Field(description="Τα συναισθήματα και η συναισθηματική ενέργεια που κρύβεται πίσω από το όνειρο")
    advice: str = Field(description="Πρακτική συμβουλή — τι μπορεί να κάνει ο ονειρευόμενος με αυτό το μήνυμα")
    summary: str = Field(description="Μια ποιητική, μυστηριώδης σύνοψη σε μία πρόταση")
