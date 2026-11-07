"""
Step 1 of the two-step pipeline: Vision Analysis.

Detects shapes and symbols in the coffee cup image WITHOUT performing fortune telling.
"""
import logging

from app.schemas.vision import CoffeeVisionAnalysis
from app.services.openai_service import structured_chat

logger = logging.getLogger(__name__)

_VISION_SYSTEM_PROMPT = """Αναλύεις φωτογραφία που έστειλε χρήστης για καφεμαντεία.

ΠΡΩΤΑ αξιολόγησε αν η εικόνα δείχνει πραγματικά ελληνικό φλιτζάνι καφέ με κατακάθι.
Θέσε is_coffee_cup=true ΜΟΝΟ αν βλέπεις φλιτζάνι καφέ με υπολείμματα/κατακάθι.
Αν η εικόνα δείχνει οτιδήποτε άλλο (άνθρωπο, τοπίο, αντικείμενο, φαγητό κ.λπ.), θέσε is_coffee_cup=false και άφησε τα υπόλοιπα πεδία κενά.

Αν is_coffee_cup=true, τότε:

ΜΗΝ κάνεις μαντεία ή ερμηνεία — αυτό γίνεται σε επόμενο βήμα.

Αναζήτησε σχήματα που μοιάζουν με κοινά σύμβολα καφεμαντείας, όπως:
καρδιά, πουλί, φίδι, δρόμος, δέντρο, βουνό, δαχτυλίδι, σπίτι, αστέρι, άνθρωπος, μάτι, σταυρός, ψάρι, πλοίο, άγκυρα.

Για κάθε σύμβολο επέστρεψε:
- όνομα συμβόλου ΠΑΝΤΑ στα ΕΛΛΗΝΙΚΑ (π.χ. "καρδιά" όχι "heart", "πουλί" όχι "bird")
- θέση στο φλιτζάνι (χείλος, μέση, πάτος)
- βαθμός εμπιστοσύνης (0.0 έως 1.0), ειλικρινής: κάτω από 0.5 για σχήματα που μόλις διακρίνονται
- σύντομη περιγραφή αυτού που βλέπεις ΣΤΑ ΕΛΛΗΝΙΚΑ

ΚΡΙΤΙΚΟ: Τα ονόματα συμβόλων πρέπει να είναι ΜΟΝΟ στα ελληνικά. Απαγορεύεται οποιαδήποτε αγγλική λέξη στο πεδίο "name".

Επίσης αναζήτησε γράμματα ή αριθμούς που σχηματίζονται στον κατακάθι.
Επέστρεψε τα ίδια τα γράμματα/ψηφία ως λίστα στο πεδίο "letters" (π.χ. ["Α", "Μ", "7"]).
Βάλε μόνο όσα διακρίνεις καθαρά. Αν δεν βλέπεις κανένα, άφησε τη λίστα κενή: μην ονομάζεις γράμμα ένα τυχαίο σχήμα.

Επίσης εντόπισε γενικά μοτίβα:
- πυκνότητα κατακαθιού (ελαφρύ, μέτριο, πυκνό)
- κατεύθυνση γραμμών ή ροής
- ομαδοποιήσεις σχημάτων

Επέστρεψε μόνο δομημένο JSON."""


async def analyze_coffee_image(image_url: str) -> tuple[CoffeeVisionAnalysis, dict]:
    """
    Analyze a coffee cup image and detect symbols/patterns.

    Args:
        image_url: Publicly accessible URL of the coffee cup image (S3 presigned or public).

    Returns:
        (CoffeeVisionAnalysis, usage_dict)
    """
    logger.info("Starting vision analysis for image: %s", image_url)

    user_content = [
        {
            "type": "text",
            "text": "Ανάλυσε αυτό το ελληνικό φλιτζάνι καφέ και εντόπισε όλα τα ορατά σχήματα και μοτίβα στον κατακάθι.",
        },
        {
            "type": "image_url",
            "image_url": {"url": image_url, "detail": "high"},
        },
    ]

    vision_result, usage = await structured_chat(
        system_prompt=_VISION_SYSTEM_PROMPT,
        user_content=user_content,
        response_model=CoffeeVisionAnalysis,
    )

    logger.info(
        "Vision analysis complete: %d symbols detected, density=%s",
        len(vision_result.symbols),
        vision_result.density,
    )

    return vision_result, usage
