import logging

from app.schemas.dream_reading import DreamReading
from app.services.openai_service import structured_chat

logger = logging.getLogger(__name__)


async def generate_dream_reading(
    dream_text: str,
    sex: str | None = None,
    sun_sign: str | None = None,
) -> tuple[DreamReading, dict]:
    """Interpret a dream description using the AI pipeline."""

    personal_context = ""
    if sex:
        personal_context += f"\n- Φύλο ονειρευόμενου/ης: {sex}"
    if sun_sign:
        personal_context += f"\n- Ζώδιο Ήλιου: {sun_sign}"

    system_prompt = f"""Είσαι ονειροκρίτης με βαθιά γνώση της ψυχανάλυσης, της αρχαίας ελληνικής ονειρομαντείας και της Ιουγκιανής συμβολολογίας.
Ερμηνεύεις όνειρα στα ελληνικά με μυστηριώδη, ποιητικό τρόπο — σαν να αποκαλύπτεις κρυμμένες αλήθειες της ψυχής.{personal_context}

Κανόνες:
- Η ερμηνεία να είναι 4-6 προτάσεις — βαθιά και εξατομικευμένη
- Εντόπισε 3-6 κύρια σύμβολα/θέματα ως λίστα σύντομων λέξεων/φράσεων
- Τα συναισθήματα: 2-3 προτάσεις για την ψυχική κατάσταση
- Η συμβουλή: 2-3 προτάσεις πρακτικής σοφίας
- Η σύνοψη: μία ποιητική πρόταση, σαν μαντεία
- Αποκλειστικά ελληνικά — τόνος μυστηριώδης, ζεστός, χωρίς κρίση"""

    return await structured_chat(
        system_prompt=system_prompt,
        user_content=[{"type": "text", "text": f"Το όνειρό μου:\n\n{dream_text}"}],
        response_model=DreamReading,
    )
