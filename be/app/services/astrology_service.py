import logging
from datetime import date, datetime, timezone

from app.schemas.astrology import AstrologyReading
from app.services.openai_service import structured_chat

logger = logging.getLogger(__name__)

SIGNS_DATA: dict[str, dict] = {
    "aries":       {"el": "Κριός",     "symbol": "♈", "element": "Φωτιά", "dates": "21 Μαρ – 19 Απρ"},
    "taurus":      {"el": "Ταύρος",    "symbol": "♉", "element": "Γη",    "dates": "20 Απρ – 20 Μαΐ"},
    "gemini":      {"el": "Δίδυμοι",   "symbol": "♊", "element": "Αέρας", "dates": "21 Μαΐ – 20 Ιουν"},
    "cancer":      {"el": "Καρκίνος",  "symbol": "♋", "element": "Νερό",  "dates": "21 Ιουν – 22 Ιουλ"},
    "leo":         {"el": "Λέων",      "symbol": "♌", "element": "Φωτιά", "dates": "23 Ιουλ – 22 Αυγ"},
    "virgo":       {"el": "Παρθένος",  "symbol": "♍", "element": "Γη",    "dates": "23 Αυγ – 22 Σεπ"},
    "libra":       {"el": "Ζυγός",     "symbol": "♎", "element": "Αέρας", "dates": "23 Σεπ – 22 Οκτ"},
    "scorpio":     {"el": "Σκορπιός",  "symbol": "♏", "element": "Νερό",  "dates": "23 Οκτ – 21 Νοε"},
    "sagittarius": {"el": "Τοξότης",   "symbol": "♐", "element": "Φωτιά", "dates": "22 Νοε – 21 Δεκ"},
    "capricorn":   {"el": "Αιγόκερως", "symbol": "♑", "element": "Γη",    "dates": "22 Δεκ – 19 Ιαν"},
    "aquarius":    {"el": "Υδροχόος",  "symbol": "♒", "element": "Αέρας", "dates": "20 Ιαν – 18 Φεβ"},
    "pisces":      {"el": "Ιχθύες",    "symbol": "♓", "element": "Νερό",  "dates": "19 Φεβ – 20 Μαρ"},
}


def get_sign_from_dob(dob: str) -> str:
    d = date.fromisoformat(dob)
    m, day = d.month, d.day
    if (m == 3 and day >= 21) or (m == 4 and day <= 19):  return "aries"
    if (m == 4 and day >= 20) or (m == 5 and day <= 20):  return "taurus"
    if (m == 5 and day >= 21) or (m == 6 and day <= 20):  return "gemini"
    if (m == 6 and day >= 21) or (m == 7 and day <= 22):  return "cancer"
    if (m == 7 and day >= 23) or (m == 8 and day <= 22):  return "leo"
    if (m == 8 and day >= 23) or (m == 9 and day <= 22):  return "virgo"
    if (m == 9 and day >= 23) or (m == 10 and day <= 22): return "libra"
    if (m == 10 and day >= 23) or (m == 11 and day <= 21): return "scorpio"
    if (m == 11 and day >= 22) or (m == 12 and day <= 21): return "sagittarius"
    if (m == 12 and day >= 22) or (m == 1 and day <= 19):  return "capricorn"
    if (m == 1 and day >= 20) or (m == 2 and day <= 18):   return "aquarius"
    return "pisces"


def get_period_key(period: str) -> str:
    now = datetime.now(timezone.utc).date()
    if period == "daily":
        return f"daily#{now.isoformat()}"
    if period == "weekly":
        year, week, _ = now.isocalendar()
        return f"weekly#{year}-W{week:02d}"
    if period == "monthly":
        return f"monthly#{now.strftime('%Y-%m')}"
    raise ValueError(f"Unknown period: {period}")


_PERIOD_DEPTH = {
    "daily":   "σύντομη ημερήσια πρόβλεψη — κάθε κατηγορία 2-3 προτάσεις",
    "weekly":  "εβδομαδιαία πρόβλεψη — κάθε κατηγορία 4-5 προτάσεις, με έμφαση σε εβδομαδιαίες τάσεις",
    "monthly": "μηνιαία πρόβλεψη — κάθε κατηγορία 5-7 προτάσεις, με στρατηγικές θεματικές και κύριες ενεργειακές ροές",
}

_PERIOD_LABELS = {"daily": "Ημερήσια", "weekly": "Εβδομαδιαία", "monthly": "Μηνιαία"}


async def generate_horoscope(sign: str, period: str) -> tuple[AstrologyReading, dict]:
    sign_data = SIGNS_DATA[sign]
    sign_el = sign_data["el"]
    element = sign_data["element"]

    system_prompt = f"""Είσαι έμπειρος αστρολόγος που γράφει προβλέψεις στα ελληνικά για το ζώδιο {sign_el} (στοιχείο: {element}).

Γράψε μια {_PERIOD_DEPTH[period]} για {sign_el}.

Κανόνες:
- 80% θετική, ενθαρρυντική ενέργεια · 20% σαφής προειδοποίηση
- Δημιούργησε αίσθηση μυστηρίου και άφησε ανοιχτά ερωτήματα
- Αναφέρσου στο στοιχείο {element} όπου ταιριάζει φυσικά
- Αποκλειστικά ελληνικά"""

    return await structured_chat(
        system_prompt=system_prompt,
        user_content=[{"type": "text", "text": f"{_PERIOD_LABELS[period]} πρόβλεψη για {sign_el}."}],
        response_model=AstrologyReading,
    )


async def generate_personalized_reading(
    sign: str,
    sex: str,
    date_of_birth: str,
    eye_color: str,
) -> tuple[AstrologyReading, dict]:
    sign_data = SIGNS_DATA[sign]
    sign_el = sign_data["el"]
    element = sign_data["element"]

    dob = date.fromisoformat(date_of_birth)
    today = datetime.now(timezone.utc).date()
    age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

    system_prompt = f"""Είσαι έμπειρος αστρολόγος που γράφει βαθιές εξατομικευμένες αστρολογικές προβλέψεις στα ελληνικά.

Προσωπικά στοιχεία:
- Ζώδιο: {sign_el} (στοιχείο: {element})
- Φύλο: {sex}
- Ηλικία: {age} ετών (DOB: {date_of_birth})
- Χρώμα ματιών: {eye_color}

Γράψε εξατομικευμένη πρόβλεψη που:
- Αναφέρεται στο χρώμα των ματιών ως στοιχείο της ψυχής
- Λαμβάνει υπόψη την ηλικία ως φάση ζωής
- Προσαρμόζει το μήνυμα στο φύλο
- Κάθε κατηγορία: 5-7 προτάσεις
- 80% θετική · 20% προσωπική προειδοποίηση
- Αποκλειστικά ελληνικά — τόνος μυστηριώδης και βαθύς"""

    return await structured_chat(
        system_prompt=system_prompt,
        user_content=[{"type": "text", "text": "Κάνε την εξατομικευμένη αστρολογική ανάγνωση."}],
        response_model=AstrologyReading,
    )
