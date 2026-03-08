import json
import logging
import random
from pathlib import Path

from app.schemas.tarot_reading import TarotReading
from app.services.openai_service import structured_chat

logger = logging.getLogger(__name__)

_DATA_PATH = Path(__file__).parent.parent / "data" / "tarot_cards.json"

_deck: list[str] | None = None


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


def draw_one_card() -> list[str]:
    deck = _load_deck()
    return random.sample(deck, 1)


def draw_three_cards() -> list[str]:
    deck = _load_deck()
    return random.sample(deck, 3)


_ONE_CARD_PROMPT = """Είσαι έμπειρος αναγνώστης ταρό με βαθιά γνώση της συμβολικής και της μυστικιστικής παράδοσης.

Σου τραβήχτηκε η κάρτα: {card}

Δώσε μια ερμηνεία γεμάτη μυστήριο και βάθος. Η ανάγνωση πρέπει να:
- Είναι κυρίως θετική και ενθαρρυντική (80%), αλλά να περιλαμβάνει ΠΑΝΤΑ μια προειδοποίηση ή σκοτεινή πλευρά (20%)
- Αφήνει ανοιχτά ερωτήματα και δημιουργεί αίσθηση μυστηρίου
- Χρησιμοποιεί ρητορικές ερωτήσεις για να προκαλέσει σκέψη
- Να είναι γραμμένη στα ελληνικά

Παρέχε:
- interpretation: Η ερμηνεία της κάρτας (2-3 παράγραφοι)
- advice: Πρακτική καθοδήγηση βασισμένη στην κάρτα
- summary: Μία πρόταση που συνοψίζει την ουσία της ανάγνωσης"""

_THREE_CARD_PROMPT = """Είσαι έμπειρος αναγνώστης ταρό με βαθιά γνώση της συμβολικής και της μυστικιστικής παράδοσης.

Διάταξη Παρελθόν / Παρόν / Μέλλον:
Παρελθόν: {card1}
Παρόν: {card2}
Μέλλον: {card3}

Δώσε μια ολοκληρωμένη ερμηνεία που συνδέει και τις τρεις κάρτες σε ένα ενιαίο αφήγημα. Η ανάγνωση πρέπει να:
- Είναι κυρίως θετική και ενθαρρυντική (80%), αλλά να περιλαμβάνει ΠΑΝΤΑ μια προειδοποίηση ή σκοτεινή πλευρά (20%)
- Αφήνει ανοιχτά ερωτήματα και δημιουργεί αίσθηση μυστηρίου
- Χρησιμοποιεί ρητορικές ερωτήσεις για να προκαλέσει σκέψη
- Να αναφέρει ρητά τη σχέση μεταξύ παρελθόντος, παρόντος και μέλλοντος
- Να είναι γραμμένη στα ελληνικά

Παρέχε:
- interpretation: Η ερμηνεία και των τριών καρτών ως ενιαίο ταξίδι (3-4 παράγραφοι)
- advice: Πρακτική καθοδήγηση βασισμένη στο συνολικό μήνυμα
- summary: Μία πρόταση που συνοψίζει την ουσία της ανάγνωσης"""


async def generate_tarot_reading(cards: list[str]) -> tuple[TarotReading, dict]:
    if len(cards) == 1:
        system_prompt = _ONE_CARD_PROMPT.format(card=cards[0])
    else:
        system_prompt = _THREE_CARD_PROMPT.format(
            card1=cards[0], card2=cards[1], card3=cards[2]
        )

    reading, usage = await structured_chat(
        system_prompt=system_prompt,
        user_content=[{"type": "text", "text": "Κάνε την ανάγνωση ταρό."}],
        response_model=TarotReading,
    )

    # Ensure cards are always set from our draw (not from OpenAI)
    reading.cards = cards
    return reading, usage
