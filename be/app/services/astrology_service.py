import logging
import re
from datetime import date, datetime, timedelta, timezone

from app.schemas.astrology import AstrologyReading
from app.services import dynamodb_service, sky_service
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


# ── Periods (Greek local time, so a new day starts at Greek midnight) ────────

def athens_today(now: datetime | None = None) -> date:
    return (now or datetime.now(timezone.utc)).astimezone(sky_service.ATHENS).date()


def _period_key_for(period: str, day: date) -> str:
    if period == "daily":
        return f"daily#{day.isoformat()}"
    if period == "weekly":
        year, week, _ = day.isocalendar()
        return f"weekly#{year}-W{week:02d}"
    if period == "monthly":
        return f"monthly#{day.strftime('%Y-%m')}"
    raise ValueError(f"Unknown period: {period}")


def get_period_key(period: str, now: datetime | None = None) -> str:
    return _period_key_for(period, athens_today(now))


def get_period_range(period: str, today: date) -> tuple[date, date]:
    """First and last day (inclusive) of the period that contains `today`."""
    if period == "daily":
        return today, today
    if period == "weekly":
        monday = today - timedelta(days=today.weekday())
        return monday, monday + timedelta(days=6)
    if period == "monthly":
        first = today.replace(day=1)
        next_month = (first + timedelta(days=32)).replace(day=1)
        return first, next_month - timedelta(days=1)
    raise ValueError(f"Unknown period: {period}")


def _previous_period_days(period: str, today: date) -> list[date]:
    if period == "daily":
        return [today - timedelta(days=1), today - timedelta(days=2)]
    if period == "weekly":
        return [today - timedelta(days=7)]
    return [today.replace(day=1) - timedelta(days=1)]


# ── Style ────────────────────────────────────────────────────────────────────

# (label shown to the model, regex). Checked after generation; one retry if any match.
_BANNED_PHRASES: list[tuple[str, str]] = [
    ("ενέργεια", r"εν[εέ]ργε[ιί]"),
    ("σύμπαν", r"σ[υύ]μπαν"),
    ("αγκαλιάστε", r"αγκαλι[αά]σ"),
    ("εσωτερική δύναμη", r"εσωτερικ\w*\s+(σας\s+)?δ[υύ]ναμ"),
    ("μη διστάσετε", r"μην?\s+διστ[αά]σ"),
    ("αφεθείτε", r"αφεθε[ιί]"),
    ("δονήσεις", r"δον[ήη]σ"),
    ("μαγεία", r"μαγε[ιί]α|μαγευτικ|μαγικ"),
    ("μυστήριο", r"μυστ[ηή]ρι"),
    ("αναμφίβολα", r"αναμφ[ιί]βολ"),
    ("τα άστρα σας χαμογελούν", r"χαμογελ.{0,20}[αά]στρ|[αά]στρ.{0,20}χαμογελ"),
    ("νέο κεφάλαιο", r"ν[εέ](ο|α)\s+κεφ[αά]λαι"),
    ("διαίσθηση", r"διαισθ|διαίσθ"),
    ("στρέφει την προσοχή", r"στρ[εέ]φ\w*\s+(την\s+)?προσοχ"),
    ("ακριβής ώρα", r"\b\d{1,2}:\d{2}\b"),
    ("το στοιχείο του ζωδίου", r"στοιχε[ιί]\w*\s+(της\s+|του\s+)?(φωτι|γης|αέρα|νερ)|π[υύ]ριν\w*\s+ζ[ωώ]δι"),
    ("παύλα (—)", r"—|\s–\s"),
    ("ερώτηση", r"[;?;]"),  # Greek uses ";" (or U+037E) as its question mark
    ("emoji", r"[\U0001F300-\U0001FAFF☀-➿]"),
]
_BANNED_PATTERNS = [(label, re.compile(pattern, re.IGNORECASE)) for label, pattern in _BANNED_PHRASES]
_MAX_EXCLAMATIONS = 1

# A personalized reading talks to one person and uses coarse timing ("μέσα Νοεμβρίου")
_PERSONALIZED_BANNED_PATTERNS = [
    ("«Οι γεννημένοι/ες» (μιλήστε μόνο σε αυτόν τον άνθρωπο)", re.compile(r"γεννημ[εέ]ν(οι|ες)\s+στ", re.IGNORECASE)),
    (
        "ακριβείς ημερομηνίες",
        re.compile(rf"\b\d{{1,2}}\s+({'|'.join(sky_service.MONTHS_GENITIVE_GR)})", re.IGNORECASE),
    ),
]

_STYLE_RULES = f"""Είστε έμπειρη Ελληνίδα αστρολόγος. Εδώ και 25 χρόνια γράφετε τη στήλη των ζωδίων σε μεγάλο ελληνικό lifestyle site και οι αναγνώστες σας σας διαβάζουν κάθε πρωί με τον καφέ τους.

ΔΕΔΟΜΕΝΑ
- Στηρίζεστε μόνο στις πλανητικές κινήσεις που σας δίνονται. Μην επινοείτε όψεις, ανάδρομους πλανήτες ή αλλαγές ζωδίου που δεν υπάρχουν στα δεδομένα.
- Ονομάστε 1-2 συγκεκριμένες κινήσεις (π.χ. «η Σελήνη στον Λέοντα», «το τετράγωνο του Άρη με τον Κρόνο») και πείτε τι σημαίνουν για έναν τομέα του ζωδίου. Μην απαριθμείτε όλα τα γεγονότα της περιόδου με τη σειρά: διαλέξτε όσα αφορούν περισσότερο το ζώδιο.
- Οι πλανήτες ανήκουν κυρίως στο general. Στα love, career, luck και warning μιλήστε για την κατάσταση και τους ανθρώπους, όχι για πλανήτες: το πολύ μία αναφορά πλανήτη σε όλα αυτά μαζί. Το luck και το warning δεν αναφέρουν ποτέ πλανήτες ή όψεις.
- Μιλάτε για τομείς («ο τομέας της καριέρας σας», «τα οικονομικά σας»), ποτέ για αριθμημένους οίκους.
- Αν τα δεδομένα έχουν γραμμές για δεκαήμερα, διαλέξτε ΕΝΑ και απευθυνθείτε μία φορά στους γεννημένους του («Οι γεννημένοι στο τρίτο δεκαήμερο έχετε...»). Ποτέ περισσότερα από ένα δεκαήμερο στην ίδια πρόβλεψη.
- Όταν τα δεδομένα δίνουν μέρα ή μέρος της ημέρας, χρησιμοποιήστε το με φυσικό τρόπο («το απόγευμα», «από την Πέμπτη»). Ποτέ ακριβείς ώρες.
- Τετράγωνα και αντιθέσεις φέρνουν τριβές, καθυστερήσεις και νεύρα. Τρίγωνα και εξάγωνα φέρνουν διευκολύνσεις. Μην ωραιοποιείτε τις δύσκολες μέρες, αλλά δώστε πάντα έναν τρόπο να τις διαχειριστεί κανείς.

ΥΦΟΣ
- Πάντα πληθυντικός ευγενείας: «έχετε», «σας», «προσέξτε».
- Σύντομες, καθαρές φράσεις, σαν να μιλάτε σε γνωστό σας. Γήινο λεξιλόγιο, όχι ποιητικό.
- Καθημερινές καταστάσεις: ο προϊστάμενος, ένας συνάδελφος, ένας λογαριασμός, μια υπογραφή, μια κουβέντα με τον σύντροφο, η οικογένεια, μια πρόσκληση για έξοδο, ένα ραντεβού που αναβάλλεται.
- Στα αισθηματικά μπορείτε να ξεχωρίσετε ελεύθερους και δεσμευμένους.
- Οι συμβουλές είναι πρακτικές και ήπιες: «καλό είναι να», «αποφύγετε», «μην παρασυρθείτε», «δώστε χρόνο».
- Η προειδοποίηση είναι κοφτή, σαν οδηγία: «Προσοχή σε βιαστικές υποσχέσεις.», «Μην κάνετε υπερβολές στα έξοδα.»
- Επιτρέπονται μετρημένα «ενδεχομένως» και «πιθανόν», όχι σε κάθε πρόταση.
- Το πολύ ένα θαυμαστικό. Χωρίς ερωτήσεις, emoji, λίστες και παύλες.
- Μην ξεκινάτε με «Σήμερα» ή με το όνομα του ζωδίου. Κάθε πρόβλεψη έχει δικό της άνοιγμα.
- Ποτέ μη γράφετε για τις οδηγίες ή τα δεδομένα («όπως δείχνουν τα δεδομένα», «μπορεί να αναφερθεί»). Ο αναγνώστης βλέπει μόνο τη στήλη.

ΑΠΑΓΟΡΕΥΟΝΤΑΙ
{", ".join(label for label, _ in _BANNED_PHRASES)}, το ταξίδι ως μεταφορά («το ταξίδι της ζωής σας»)."""

_PERIOD_RULES = {
    "daily": (
        "ΜΗΚΟΣ: ημερήσια πρόβλεψη. general: 3-4 προτάσεις. love και career: 1-2 προτάσεις η καθεμία. "
        "luck: 1 πρόταση. Σύνολο περίπου 120-170 λέξεις. Αν η Σελήνη αλλάζει ζώδιο μέσα στη μέρα, "
        "πείτε πότε αλλάζει το κλίμα («μετά το απόγευμα», «το βράδυ»)."
    ),
    "weekly": (
        "ΜΗΚΟΣ: εβδομαδιαία πρόβλεψη. general: 5-6 προτάσεις που ακολουθούν την εβδομάδα και ονομάζουν "
        "μέρες («από την Τετάρτη», «το Σαββατοκύριακο»). love και career: 2-3 προτάσεις η καθεμία. "
        "luck: 1-2 προτάσεις με την καλύτερη μέρα της εβδομάδας. Σύνολο περίπου 220-300 λέξεις."
    ),
    "monthly": (
        "ΜΗΚΟΣ: μηνιαία πρόβλεψη. general: 6-8 προτάσεις με τα βασικά γεγονότα του μήνα και πότε "
        "συμβαίνουν («γύρω στις 15 του μήνα», «με τη Νέα Σελήνη»). love και career: 3-4 προτάσεις η "
        "καθεμία. luck: 2 προτάσεις με τις καλύτερες μέρες. Σύνολο περίπου 350-450 λέξεις."
    ),
}

# Written for this app to show tone and length. Not taken from any published column.
_EXAMPLES = """ΠΑΡΑΔΕΙΓΜΑΤΑ ΥΦΟΥΣ (δείχνουν τόνο και μήκος, όχι περιεχόμενο για αντιγραφή)

Παράδειγμα 1: ημερήσια, Ζυγός
Δεδομένα: Σελήνη στον Αιγόκερω (τομέας: σπίτι, οικογένεια) · το πρωί: Σελήνη τετράγωνο Άρης · Δίας (Ζυγός 24°) στο ζώδιο: τρίτο δεκαήμερο
general: Η Σελήνη στον Αιγόκερω φέρνει στο προσκήνιο τα του σπιτιού σας και κάποιο οικογενειακό ζήτημα που αναβάλλετε εδώ και καιρό. Το τετράγωνό της με τον Άρη ανεβάζει τους τόνους ως το μεσημέρι, οπότε αφήστε τις σοβαρές κουβέντες για το απόγευμα. Οι γεννημένοι στο τρίτο δεκαήμερο έχετε τον Δία στο ζώδιό σας και αυτό φαίνεται: σας ακούνε πιο εύκολα απ' ό,τι νομίζετε.
love: Οι δεσμευμένοι καλό είναι να μη φέρετε τα νεύρα της δουλειάς στο σπίτι. Οι ελεύθεροι ενδεχομένως δεχτείτε πρόσκληση από άτομο του κύκλου σας.
career: Ένας συνάδελφος πιέζει για γρήγορες αποφάσεις. Μην παρασυρθείτε και ζητήστε τα στοιχεία γραπτώς.
luck: Το απόγευμα ευνοεί συζητήσεις για χρήματα και συμφωνίες.
warning: Προσοχή σε απότομες κουβέντες το πρωί.
summary: Υπομονή το πρωί, κέρδος το απόγευμα.

Παράδειγμα 2: εβδομαδιαία, Ταύρος
Δεδομένα: Τετάρτη: είσοδος Αφροδίτη → Ζυγός (τομέας: καθημερινή εργασία, υγεία) · Σάββατο: Πανσέληνος (Σκορπιός, τομέας: σύντροφος, συνεργασίες) · Κρόνος (Ιχθύες 2°) σε εξάγωνο με το ζώδιο: πρώτο δεκαήμερο
general: Η εβδομάδα ξεκινά ήρεμα, όμως από την Τετάρτη η Αφροδίτη περνά στον τομέα της καθημερινής σας εργασίας και η ατμόσφαιρα στη δουλειά γίνεται πιο ευχάριστη. Είναι καλή στιγμή να κλείσετε εκκρεμότητες που σας βαραίνουν και να προσέξετε λίγο περισσότερο τον ύπνο και τη διατροφή σας. Το Σάββατο η Πανσέληνος στον Σκορπιό φωτίζει τον τομέα των σχέσεων και βγάζει στην επιφάνεια ό,τι δεν έχει ειπωθεί. Οι γεννημένοι στο πρώτο δεκαήμερο έχετε τη στήριξη του Κρόνου, άρα ό,τι συμφωνήσετε τώρα έχει διάρκεια. Μην πιέζετε καταστάσεις που χρειάζονται χρόνο.
love: Οι δεσμευμένοι θα χρειαστεί να μιλήσετε ανοιχτά το Σαββατοκύριακο, χωρίς να ανοίξετε παλιές πληγές. Οι ελεύθεροι πιθανόν γνωρίσετε κάποιον μέσα από τη δουλειά προς το τέλος της εβδομάδας.
career: Από την Τετάρτη οι σχέσεις με τους συναδέλφους βελτιώνονται και μια εκκρεμότητα κλείνει. Αποφύγετε μεγάλες αγορές πριν από την Πανσέληνο.
luck: Η Πέμπτη είναι η καλύτερη μέρα για αιτήματα και συναντήσεις.
warning: Μην αφήσετε την περιέργεια να γίνει ζήλια.
summary: Ήρεμο ξεκίνημα, ειλικρινές φινάλε."""

_PERIOD_LABELS = {"daily": "ημερήσια", "weekly": "εβδομαδιαία", "monthly": "μηνιαία"}

_GENDER_RULES = {
    "Άνδρας": "Ο αναγνώστης είναι άνδρας: επίθετα και μετοχές στο αρσενικό («είστε έτοιμος»).",
    "Γυναίκα": "Η αναγνώστρια είναι γυναίκα: επίθετα και μετοχές στο θηλυκό («είστε έτοιμη»).",
}
_NEUTRAL_GENDER_RULE = "Αποφύγετε επίθετα και μετοχές με γένος για τον αναγνώστη."

# The personalized reading covers "the coming weeks"
_PERSONALIZED_SPAN_DAYS = 28


def find_banned_phrases(
    reading: AstrologyReading, extra_patterns: list[tuple[str, re.Pattern]] | None = None
) -> list[str]:
    """Labels of the AI-sounding phrases (or forbidden punctuation) found in a reading."""
    text = " ".join(value for value in reading.model_dump().values() if isinstance(value, str))
    patterns = _BANNED_PATTERNS + (extra_patterns or [])
    found = [label for label, pattern in patterns if pattern.search(text)]
    if text.count("!") > _MAX_EXCLAMATIONS:
        found.append("πολλά θαυμαστικά")
    return found


async def _generate_with_guardrail(
    system_prompt: str,
    user_text: str,
    extra_patterns: list[tuple[str, re.Pattern]] | None = None,
) -> tuple[AstrologyReading, dict]:
    """Generate once; if banned phrases slip through, regenerate once naming them."""
    reading, usage = await structured_chat(
        system_prompt=system_prompt,
        user_content=[{"type": "text", "text": user_text}],
        response_model=AstrologyReading,
    )
    banned = find_banned_phrases(reading, extra_patterns)
    if not banned:
        return reading, usage

    logger.info("Horoscope contained %s, regenerating once", banned)
    retry_text = (
        f"{user_text}\n\nΗ προηγούμενη εκδοχή σας περιείχε: {', '.join(banned)}. "
        "Ξαναγράψτε την πρόβλεψη χωρίς αυτά."
    )
    retry_reading, retry_usage = await structured_chat(
        system_prompt=system_prompt,
        user_content=[{"type": "text", "text": retry_text}],
        response_model=AstrologyReading,
    )
    remaining = find_banned_phrases(retry_reading, extra_patterns)
    if remaining:
        logger.warning("Horoscope still contains %s after retry, keeping it", remaining)
    combined_usage = {key: usage[key] + retry_usage[key] for key in usage}
    return retry_reading, combined_usage


def _load_previous_texts(sign: str, period: str, today: date) -> list[str]:
    """Recent cached texts for the sign, so the model avoids repeating itself."""
    texts = []
    for day in _previous_period_days(period, today):
        try:
            item = dynamodb_service.get_astrology_reading(sign, _period_key_for(period, day))
        except Exception as exc:  # optional context: never block generation on it
            logger.warning("Could not load previous %s horoscope for %s: %s", period, sign, exc)
            continue
        if item:
            result = item.get("reading_result", {})
            texts.append(f"«{result.get('summary', '')}» {result.get('general', '')}")
    return texts


async def generate_horoscope(sign: str, period: str) -> tuple[AstrologyReading, dict]:
    today = athens_today()
    start, end = get_period_range(period, today)
    sky = sky_service.compute_sky(period, start, end)

    sections = [sky_service.describe_for_sign(sky, sign)]
    previous = _load_previous_texts(sign, period, today)
    if previous:
        sections.append(
            "Προηγούμενες προβλέψεις για το ζώδιο (μην επαναλάβετε εικόνες ή φράσεις):\n"
            + "\n".join(f"- {text}" for text in previous)
        )
    sections.append(
        f"Γράψτε την {_PERIOD_LABELS[period]} πρόβλεψη. Ζώδιο: {SIGNS_DATA[sign]['el']}."
    )

    system_prompt = f"{_STYLE_RULES}\n\n{_PERIOD_RULES[period]}\n\n{_EXAMPLES}"
    return await _generate_with_guardrail(system_prompt, "\n\n".join(sections))


def _describe_natal_chart(chart: dict) -> tuple[str, str]:
    """(Greek chart lines, extra writing instructions) for a saved birth chart."""
    from app.services.chart_service import SIGNS_GR

    sun_decan = sky_service.DECANS_GR[sky_service.decan_of(chart["sun_degree"])]
    lines = [
        "Γενέθλιος χάρτης:",
        f"- Ήλιος: {SIGNS_GR[chart['sun_sign']]} {chart['sun_degree']}° ({sun_decan} δεκαήμερο)",
        f"- Σελήνη: {SIGNS_GR[chart['moon_sign']]} {chart['moon_degree']}°",
    ]
    instructions = [
        f"- Από τις γραμμές δεκαημέρων κρατήστε μόνο όσες αφορούν το {sun_decan} δεκαήμερο.",
        "- moon_insight: 4-5 προτάσεις για τη γενέθλια Σελήνη, πώς αντιδράτε συναισθηματικά και τι χρειάζεστε στις σχέσεις.",
    ]
    if chart.get("ascendant_sign"):
        lines.append(f"- Ωροσκόπος: {SIGNS_GR[chart['ascendant_sign']]} {chart['ascendant_degree']}°")
        instructions.append(
            "- ascendant_insight: 3-4 προτάσεις για τον Ωροσκόπο, την πρώτη εντύπωση και την έλξη που ασκείτε."
        )
    return "\n".join(lines), "\n".join(instructions)


async def generate_personalized_reading(
    sign: str,
    sex: str,
    date_of_birth: str,
    eye_color: str,
    chart: dict | None = None,
) -> tuple[AstrologyReading, dict]:
    today = athens_today()
    sky = sky_service.compute_sky(
        "monthly", today, today + timedelta(days=_PERSONALIZED_SPAN_DAYS - 1)
    )

    personal_lines = ["Προσωπικά στοιχεία:", f"- Ζώδιο: {SIGNS_DATA[sign]['el']}", f"- Φύλο: {sex}"]
    if date_of_birth:
        dob = date.fromisoformat(date_of_birth)
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        personal_lines.append(f"- Ηλικία: {age} ετών")
    personal_lines.append(f"- Χρώμα ματιών: {eye_color}")

    chart_text, chart_instructions = _describe_natal_chart(chart) if chart else ("", "")

    system_prompt = f"""{_STYLE_RULES}

ΕΞΑΤΟΜΙΚΕΥΜΕΝΗ ΑΝΑΓΝΩΣΗ για τις επόμενες εβδομάδες, για έναν συγκεκριμένο άνθρωπο.
- general, love, career, luck: 4-6 προτάσεις η καθεμία.
- Μιλάτε σε έναν άνθρωπο, όχι σε όλο το ζώδιο: ποτέ «Οι γεννημένοι...» ή «Οι γεννημένες...». Αν μια γραμμή δεκαημέρου αφορά το δεκαήμερό του, πείτε το απευθείας («ο Ήλιος σας, στο τρίτο δεκαήμερο, ...»).
- Για τον χρόνο χρησιμοποιήστε «αρχές, μέσα, τέλη του μήνα» όπως στα δεδομένα, ποτέ ακριβείς ημερομηνίες.
- Λάβετε υπόψη την ηλικία ως φάση ζωής, χωρίς να την αναφέρετε ως αριθμό.
- Αν ταιριάζει, αναφέρετε μία φορά το χρώμα των ματιών μέσα σε φυσική φράση για το βλέμμα (π.χ. «τα πράσινα μάτια σας τραβούν την προσοχή»).
- {_GENDER_RULES.get(sex, _NEUTRAL_GENDER_RULE)}
{chart_instructions}

{_EXAMPLES}"""

    sections = [
        "\n".join(personal_lines),
        chart_text,
        sky_service.describe_for_sign(sky, sign, coarse_dates=True),
        "Γράψτε την εξατομικευμένη ανάγνωση, απευθυνόμενοι μόνο σε αυτόν τον άνθρωπο.",
    ]
    user_text = "\n\n".join(section for section in sections if section)
    return await _generate_with_guardrail(system_prompt, user_text, _PERSONALIZED_BANNED_PATTERNS)
