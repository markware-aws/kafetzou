"""
Step 2 of the two-step pipeline: Fortune Interpretation.

Takes structured vision output and produces a mystical kafetzou reading in Greek.
"""
import logging

from app.schemas.coffee_reading import CoffeeReading
from app.schemas.vision import CoffeeVisionAnalysis
from app.services.openai_service import structured_chat

logger = logging.getLogger(__name__)

_FORTUNE_SYSTEM_PROMPT = """Είσαι μια παραδοσιακή Ελληνίδα καφετζού με δεκαετίες εμπειρίας στο καφεμαντείο.

Σου δίνονται τα σύμβολα, τα γράμματα και τα μοτίβα που εντοπίστηκαν στον κατακάθι ενός ελληνικού καφέ.

Ερμήνευσε τα με βάση την παραδοσιακή τέχνη του καφεμαντείου:
- Σύμβολα κοντά στο χείλος του φλιτζανιού → γεγονότα του άμεσου μέλλοντος
- Σύμβολα στη μέση → γεγονότα μεσοπρόθεσμου μέλλοντος
- Σύμβολα στον πάτο → γεγονότα μακρινού μέλλοντος
- Γράμματα → αρχικά ονομάτων ή λέξεων που παίζουν ρόλο στη ζωή του ατόμου

Για κάθε σύμβολο και γράμμα που αναφέρεις στην ανάγνωση, εξήγησε τι σημαίνει και πώς επηρεάζει τη ζωή του ατόμου.

Η ερμηνεία σου πρέπει να είναι:
- Εξ ολοκλήρου στα ΕΛΛΗΝΙΚΑ
- Μυστηριώδης, αινιγματική και προσωπική — μίλα σαν να κρατάς μυστικά που μόλις αποκαλύπτεις
- Να αναφέρει ονομαστικά τα σύμβολα και τα γράμματα που είδες, με υπαινιγμούς και ερωτηματικά που αφήνουν το άτομο να σκεφτεί ("Ποιος με αυτό το αρχικό παίζει ρόλο στη ζωή σου;", "Τι κρύβεται πίσω από αυτό το σχήμα;")
- Κυρίως θετική και ενθαρρυντική — τόνισε ευκαιρίες, δυνάμεις και όμορφες προοπτικές
- Να περιλαμβάνει ΠΑΝΤΑ μια συγκεκριμένη προειδοποίηση ή σκοτεινή πλευρά — κάτι που το άτομο πρέπει να προσέξει ή φοβάται μήπως συμβεί. Χωρίς αυτό η ανάγνωση δεν είναι αληθινή καφεμαντεία
- Να δημιουργεί αίσθηση μυστηρίου και να αφήνει ανοιχτά ερωτήματα που κεντρίζουν την περιέργεια

Επέστρεψε μόνο JSON."""


def _build_symbols_description(vision: CoffeeVisionAnalysis) -> str:
    """Convert the vision analysis into readable Greek text for the fortune prompt."""
    lines = [
        f"Πυκνότητα κατακαθιού: {vision.density}",
        f"Κατεύθυνση ροής: {vision.flow_direction}",
        f"Αξιοσημείωτα μοτίβα: {', '.join(vision.notable_patterns) if vision.notable_patterns else 'κανένα'}",
        "",
        "Σύμβολα που εντοπίστηκαν:",
    ]
    for sym in vision.symbols:
        lines.append(
            f"- {sym.name} (θέση: {sym.position}, εμπιστοσύνη: {sym.confidence:.0%}): {sym.description}"
        )
    if vision.letters:
        lines.append("")
        lines.append(f"Γράμματα/αριθμοί που εντοπίστηκαν: {', '.join(vision.letters)}")
    return "\n".join(lines)


async def generate_coffee_reading(vision: CoffeeVisionAnalysis) -> tuple[CoffeeReading, dict]:
    """
    Generate a Greek fortune reading from the vision analysis.

    Args:
        vision: Structured output from Step 1 (vision analysis).

    Returns:
        (CoffeeReading, usage_dict)
    """
    logger.info("Generating fortune reading from %d symbols", len(vision.symbols))

    symbols_text = _build_symbols_description(vision)

    user_content = [
        {
            "type": "text",
            "text": (
                f"Αυτά είναι τα σύμβολα και τα μοτίβα που εντοπίστηκαν στο φλιτζάνι:\n\n"
                f"{symbols_text}\n\n"
                f"Κάνε την ανάγνωση του καφέ στα ελληνικά, αναφέροντας τα σύμβολα "
                f"που είδες και εξηγώντας τι σημαίνουν για το μέλλον του ατόμου."
            ),
        }
    ]

    reading, usage = await structured_chat(
        system_prompt=_FORTUNE_SYSTEM_PROMPT,
        user_content=user_content,
        response_model=CoffeeReading,
    )

    logger.info("Fortune reading generated successfully")

    return reading, usage
