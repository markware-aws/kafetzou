import json
import logging
import random
from pathlib import Path

from app.schemas.tarot_reading import TarotReading
from app.services import writing_style

logger = logging.getLogger(__name__)

_DATA_PATH = Path(__file__).parent.parent / "data" / "tarot_cards.json"
_GR_PATH = Path(__file__).parent.parent / "data" / "tarot_gr.json"

_deck: list[str] | None = None
_card_data: dict[str, dict] | None = None


def _load_deck() -> list[str]:
    global _deck
    if _deck is not None:
        return _deck

    with open(_DATA_PATH, encoding="utf-8") as f:
        data = json.load(f)

    cards: list[str] = []

    for card in data["major_arcana"]:
        cards.append(card["name"])

    for suit_cards in data["minor_arcana"].values():
        cards.extend(suit_cards)

    _deck = cards
    logger.info("Tarot deck loaded: %d cards", len(cards))
    return _deck


def _load_card_data() -> dict[str, dict]:
    global _card_data
    if _card_data is not None:
        return _card_data

    with open(_GR_PATH, encoding="utf-8") as f:
        data = json.load(f)

    # Some cards appear twice; the later entry has the fuller meaning
    _card_data = {entry["name_en"]: entry for entry in data if "name_en" in entry}
    return _card_data


def get_card_info(card_en: str) -> dict:
    """Return the full card data dict from tarot_gr.json for a given English name."""
    return _load_card_data().get(card_en, {})


def draw_one_card() -> list[str]:
    deck = _load_deck()
    return random.sample(deck, 1)


def draw_three_cards() -> list[str]:
    deck = _load_deck()
    return random.sample(deck, 3)


# ── Style ────────────────────────────────────────────────────────────────────

_BANNED_PATTERNS = writing_style.COMMON_BANNED_PATTERNS

_ARCANA_GR = {"Major": "Μεγάλη Αρκάνα", "Minor": "Μικρή Αρκάνα"}
_THREE_CARD_POSITIONS = ("Παρελθόν", "Παρόν", "Μέλλον")

_TAROT_RULES = f"""Είστε έμπειρη αναγνώστρια ταρό. Εδώ και είκοσι χρόνια ανοίγετε τα χαρτιά σε ανθρώπους κάθε ηλικίας και σας εμπιστεύονται γιατί μιλάτε καθαρά και ζεστά.

ΤΙ ΔΕΙΧΝΟΥΝ ΟΙ ΚΑΡΤΕΣ
- Στηρίζεστε στη σημασία κάθε κάρτας όπως σας δίνεται. Ονομάστε κάθε κάρτα με το ελληνικό της όνομα και πείτε τη σημασία της με δικά σας λόγια, δεμένη με μια καθημερινή κατάσταση.
- Η σημασία δίνεται με λέξεις-κλειδιά. Αν μια λέξη-κλειδί είναι στις απαγορευμένες, πείτε το ίδιο με άλλη λέξη («ένστικτο» αντί για «διαίσθηση», «όσα δεν λέγονται» αντί για «μυστήριο»).
- Οι κάρτες βγήκαν όρθιες. Ο κεντρικός τόνος έρχεται από τη σημασία τους. Η σκιώδης πλευρά δίνει μόνο την προειδοποίηση.
- Μεγάλη Αρκάνα σημαίνει ένα σημαντικό θέμα της περιόδου. Μικρή Αρκάνα σημαίνει καθημερινά πράγματα.
- Μην επινοείτε κάρτες ή ανεστραμμένες θέσεις που δεν υπάρχουν στη διάταξη.

ΥΦΟΣ
- Πάντα πληθυντικός ευγενείας: «έχετε», «σας», «προσέξτε».
- Σύντομες, καθαρές φράσεις, σαν να μιλάτε σε γνωστό σας. Γήινο λεξιλόγιο, όχι ποιητικό.
- Καθημερινές καταστάσεις: η δουλειά, ο σύντροφος, η οικογένεια, τα χρήματα, μια απόφαση που εκκρεμεί, ένας φίλος που έχει χαθεί.
- Κυρίως ενθαρρυντική, με μία συγκεκριμένη προειδοποίηση από τη σκιώδη πλευρά μιας κάρτας, ειπωμένη πρακτικά.
- Οι συμβουλές είναι πρακτικές και ήπιες: «καλό είναι να», «αποφύγετε», «μην παρασυρθείτε», «δώστε χρόνο».
- Επιτρέπονται μετρημένα «ενδεχομένως» και «πιθανόν», όχι σε κάθε πρόταση.
- Χωρίς ερωτήσεις, ρητορικές ή όχι. Ό,τι δείχνουν οι κάρτες το λέτε ως διαπίστωση.
- Το πολύ ένα θαυμαστικό. Χωρίς emoji, λίστες και παύλες.
- Μην ξεκινάτε με «Η κάρτα σας». Κάθε ανάγνωση έχει δικό της άνοιγμα.
- Ποτέ μη γράφετε για τις οδηγίες ή τα δεδομένα («σύμφωνα με τα δεδομένα», «λέξεις-κλειδιά»). Ο άνθρωπος βλέπει μόνο εσάς και τα χαρτιά του.
- {writing_style.gender_rule(None)}

ΑΠΑΓΟΡΕΥΟΝΤΑΙ
{writing_style.banned_list_for_prompt(_BANNED_PATTERNS)}."""

# Written for this app to show tone and length. Not taken from any published reading.
_SPREAD_RULES = {
    "one_card": """ΔΙΑΤΑΞΗ: μία κάρτα για τις επόμενες μέρες.
ΜΗΚΟΣ: interpretation σε 2 παραγράφους, 5-7 προτάσεις συνολικά. advice: 2-3 προτάσεις. summary: έως 12 λέξεις.

ΠΑΡΑΔΕΙΓΜΑ ΥΦΟΥΣ (δείχνει τόνο και μήκος, όχι περιεχόμενο για αντιγραφή)
Δεδομένα: Ο Ερημίτης (Μεγάλη Αρκάνα) · σημασία: αναζήτηση, σοφία · σκιώδης πλευρά: απομόνωση
interpretation: Ο Ερημίτης βγαίνει όταν χρειάζεστε λίγη απόσταση για να δείτε καθαρά. Τις επόμενες μέρες θα θέλετε να κλειστείτε λίγο στον εαυτό σας και να σκεφτείτε κάτι που σας απασχολεί, ίσως μια απόφαση για τη δουλειά ή μια σχέση που δεν ξέρετε πού πάει.

Δώστε στον εαυτό σας αυτόν τον χρόνο χωρίς ενοχές. Μια κουβέντα με έναν μεγαλύτερο, πιο έμπειρο άνθρωπο θα σας δώσει την απάντηση που ψάχνετε. Προσέξτε μόνο να μην απομακρυνθείτε τόσο που να χάσετε τους δικούς σας ανθρώπους.
advice: Κρατήστε ένα απόγευμα μόνο για εσάς και γράψτε τι θέλετε πραγματικά. Ζητήστε τη γνώμη ενός ανθρώπου που εμπιστεύεστε πριν αποφασίσετε.
summary: Λίγη απόσταση τώρα, καθαρή απόφαση μετά.""",
    "three_card": """ΔΙΑΤΑΞΗ: Παρελθόν, Παρόν, Μέλλον. Πείτε σε ποια θέση είναι κάθε κάρτα και δέστε τες με αιτία και αποτέλεσμα: τι άφησε πίσω του το παρελθόν, τι κρίνεται τώρα και πού οδηγεί.
ΜΗΚΟΣ: interpretation σε 3 παραγράφους, μία για κάθε κάρτα, 8-10 προτάσεις συνολικά. advice: 2-3 προτάσεις. summary: έως 12 λέξεις.

ΠΑΡΑΔΕΙΓΜΑ ΥΦΟΥΣ (δείχνει τόνο και μήκος, όχι περιεχόμενο για αντιγραφή)
Δεδομένα: Παρελθόν: Πέντε Ράβδων (Μικρή Αρκάνα) · σημασία: ανταγωνισμός · σκιώδης πλευρά: ένταση · Παρόν: Η Εγκράτεια (Μεγάλη Αρκάνα) · σημασία: αρμονία, ισορροπία · σκιώδης πλευρά: υπερβολή · Μέλλον: Ο Ήλιος (Μεγάλη Αρκάνα) · σημασία: χαρά, επιτυχία · σκιώδης πλευρά: προσωρινή θλίψη
interpretation: Τα Πέντε Ράβδων στη θέση του παρελθόντος δείχνουν μια περίοδο με ανταγωνισμό και τριβές, μάλλον στη δουλειά, όπου έπρεπε συνέχεια να αποδεικνύετε κάτι. Σας κούρασε περισσότερο απ' όσο το παραδεχτήκατε.

Στο παρόν η Εγκράτεια δείχνει ότι τα πράγματα ηρεμούν. Βρίσκετε ξανά έναν ρυθμό ανάμεσα στη δουλειά, το σπίτι και τους ανθρώπους σας, και αυτή η ισορροπία θα κρατήσει όσα κερδίσατε. Η κάρτα θέλει όμως μέτρο: μην πέσετε στην υπερβολή για να αναπληρώσετε τον χαμένο χρόνο, ούτε στα έξοδα ούτε στις υποχρεώσεις.

Στο μέλλον έρχεται ο Ήλιος, μία από τις πιο χαρούμενες κάρτες της τράπουλας. Μια επιτυχία που κυνηγάτε καιρό ολοκληρώνεται και φέρνει χαρά και στους γύρω σας. Αν στο μεταξύ έρθει μια στιγμή στενοχώριας, θα είναι περαστική.
advice: Κρατήστε τον ρυθμό που βρήκατε και μη φορτωθείτε νέες υποχρεώσεις μόνο για να αποδείξετε κάτι. Μοιραστείτε τα καλά νέα με όσους σας στήριξαν στα δύσκολα.
summary: Από τις τριβές στην ισορροπία, και από εκεί στη χαρά.""",
}


def _describe_card(card_en: str) -> str:
    """One prompt line for a card: Greek name, arcana and its meanings from tarot_gr.json."""
    info = get_card_info(card_en)
    line = info.get("name_el", card_en)
    arcana = _ARCANA_GR.get(info.get("arcana", ""))
    if arcana:
        line += f" ({arcana})"
    if info.get("meaning_upright_el"):
        line += f" · σημασία: {info['meaning_upright_el']}"
    if info.get("meaning_reversed_el"):
        line += f" · σκιώδης πλευρά: {info['meaning_reversed_el']}"
    return line


def _describe_spread(cards: list[str]) -> str:
    if len(cards) == 1:
        return f"Διάταξη: μία κάρτα\n- {_describe_card(cards[0])}"
    lines = ["Διάταξη: Παρελθόν, Παρόν, Μέλλον"]
    lines += [
        f"- {position}: {_describe_card(card)}"
        for position, card in zip(_THREE_CARD_POSITIONS, cards)
    ]
    return "\n".join(lines)


async def generate_tarot_reading(cards: list[str]) -> tuple[TarotReading, dict]:
    spread = "one_card" if len(cards) == 1 else "three_card"
    reading, usage = await writing_style.generate_with_guardrail(
        system_prompt=f"{_TAROT_RULES}\n\n{_SPREAD_RULES[spread]}",
        user_text=f"{_describe_spread(cards)}\n\nΚάντε την ανάγνωση ταρό.",
        response_model=TarotReading,
        banned_patterns=_BANNED_PATTERNS,
    )

    # Ensure cards are always set from our draw (not from OpenAI)
    reading.cards = cards
    return reading, usage
