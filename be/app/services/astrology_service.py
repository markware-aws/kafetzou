import logging
import re
from datetime import date, datetime, timedelta, timezone

from app.schemas.astrology import AstrologyReading
from app.services import dynamodb_service, sky_service, writing_style

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

# Checked after generation, on top of the shared list; one retry if any match.
_BANNED_PATTERNS = writing_style.COMMON_BANNED_PATTERNS + writing_style.compile_patterns([
    ("τα άστρα σας χαμογελούν", r"χαμογελ.{0,20}[αά]στρ|[αά]στρ.{0,20}χαμογελ"),
    ("ακριβής ώρα", r"\b\d{1,2}:\d{2}\b"),
    ("το στοιχείο του ζωδίου", r"στοιχε[ιί]\w*\s+(της\s+|του\s+)?(φωτι|γης|αέρα|νερ)|π[υύ]ριν\w*\s+ζ[ωώ]δι"),
])

# A personalized reading talks to one person and uses coarse timing ("μέσα Νοεμβρίου")
_PERSONALIZED_BANNED_PATTERNS = [
    ("«Οι γεννημένοι/ες» (μιλήστε μόνο σε αυτόν τον άνθρωπο)", re.compile(r"γεννημ[εέ]ν(οι|ες)\s+στ", re.IGNORECASE)),
    (
        "ακριβείς ημερομηνίες",
        re.compile(rf"\b\d{{1,2}}\s+({'|'.join(sky_service.MONTHS_GENITIVE_GR)})", re.IGNORECASE),
    ),
]

_TIME_WORDS = (
    r"σ[ηή]μερα|απ[οό]ψε|πρω[ιί]|μεσημ[εέ]ρι|απ[οό]γευμα|βρ[αά]δυ|σαββατοκ[υύ]ριακο"
    r"|δευτ[εέ]ρα|τρ[ιί]τη|τετ[αά]ρτη|π[εέ]μπτη|παρασκευ[ηή]|σ[αά]ββατο|κυριακ[ηή]"
    r"|μ[εέ]ρα|εβδομ[αά]δα|μ[ηή]νας?|(?:αρχ[εέ]ς|μ[εέ]σα|τ[εέ]λη)\s+τ(?:ου|ης)"
)
_PLANET_WORDS = (
    r"(?:ν[εέ]α\s+)?σελ[ηή]ν(?:η|ης)|πανσ[εέ]λην(?:ος|ο|ου)|[ηή]λι(?:ος|ο|ου)|ερμ[ηή]ς?"
    r"|αφροδ[ιί]τ(?:η|ης)|[αά]ρη(?:ς)?|δ[ιί]α(?:ς)?|κρ[οό]ν(?:ος|ο|ου)|ουραν[οό](?:ς|υ)?"
    r"|ποσειδ[ωώ]ν(?:ας|α)|πλο[υύ]των(?:ας|α)"
)
_ARTICLE = r"(?:(?:ο|η|οι|το|τα|τη|την|τον|του|της|τις|στο|στη|στην|στον|στις|στα)\s+)?"

# Checked on one field each; one retry if any match.
# - warning: it stands on its own; «Ωστόσο» turns it into the one piece of bad news held back
#   for the end of an otherwise all-good text
# - luck: the sky's timing is the same for all twelve signs, so a luck that opens with it
#   («Το απόγευμα ευνοεί...») reads the same for everyone
# - general: so is a planet's position («Η Σελήνη στον Ζυγό...»); open with what changes for the sign
_FIELD_PATTERNS: list[writing_style.FieldPattern] = [
    (
        "warning",
        "«Ωστόσο», «Όμως» ή «Αλλά» στην αρχή του warning",
        re.compile(r"^\W*(ωστ[οό]σο|[οό]μως|αλλ[αά]|παρ[οό]λα|εντο[υύ]τοις)\b", re.IGNORECASE),
    ),
    (
        "luck",
        "χρόνος, μέρα ή ημερομηνία στην αρχή του luck",
        re.compile(
            rf"^\W*(?:(?:απ[οό]|κατ[αά]|γ[υύ]ρω|μ[εέ]χρι|[ωώ]ς)\s+)?(?:αυτ[οόηή]ν?\s+)?{_ARTICLE}"
            rf"(?:(?:{_TIME_WORDS})\b|\d)"
            r"|^\W*η\s+καλ[υύ]τερη\s+(?:μ[εέ]ρα|στιγμ[ηή]|περ[ιί]οδος|[ωώ]ρα)",
            re.IGNORECASE,
        ),
    ),
    (
        "general",
        "πλανήτης στην αρχή του general",
        re.compile(
            rf"^\W*(?:(?:με|μετ[αά]|απ[οό])\s+)?{_ARTICLE}(?:αν[αά]δρομ\w+\s+)?(?:{_PLANET_WORDS})\b",
            re.IGNORECASE,
        ),
    ),
]

# Wording the rules themselves dictate, so sharing it with an example is not copying:
# sector names from the data and the decan line («Οι γεννημένοι στο τρίτο δεκαήμερο...»)
_EXAMPLE_COPY_IGNORED = ("τομε", "δεκαημερ", "γεννημεν")


def _example_copy_check(examples: str):
    return lambda reading: writing_style.find_example_copies(reading, examples, _EXAMPLE_COPY_IGNORED)

# The column speaks to everyone born in a decan; a personalized reading only to its reader.
_COLUMN_DECAN_RULE = (
    "- Αν τα δεδομένα έχουν γραμμές για δεκαήμερα, διαλέξτε ΕΝΑ και απευθυνθείτε μία φορά στους "
    "γεννημένους του («Οι γεννημένοι στο τρίτο δεκαήμερο έχετε...»). Ποτέ περισσότερα από ένα "
    "δεκαήμερο στην ίδια πρόβλεψη."
)
_PERSONAL_DECAN_RULE = (
    "- Αν μια γραμμή δεκαημέρου αφορά το δεκαήμερο του αναγνώστη, πείτε το απευθείας και μία φορά "
    "(«ο Ήλιός σας, στο τρίτο δεκαήμερο, ...»)."
)


def _style_rules(decan_rule: str) -> str:
    return f"""Είστε έμπειρη Ελληνίδα αστρολόγος. Εδώ και 25 χρόνια γράφετε τη στήλη των ζωδίων σε μεγάλο ελληνικό lifestyle site και οι αναγνώστες σας σας διαβάζουν κάθε πρωί με τον καφέ τους.

ΔΕΔΟΜΕΝΑ
- Στηρίζεστε μόνο στις πλανητικές κινήσεις που σας δίνονται. Μην επινοείτε όψεις, ανάδρομους πλανήτες ή αλλαγές ζωδίου που δεν υπάρχουν στα δεδομένα.
- Τα γεγονότα του ουρανού είναι ίδια για όλα τα ζώδια. Αυτό που αλλάζει είναι ο τομέας που αγγίζουν. Διαλέξτε όσα αφορούν περισσότερο αυτό το ζώδιο (τους δικούς του τομείς, πλανήτες σε όψη με το ζώδιο) και πείτε τι σημαίνουν στην πράξη. Ονομάστε τις κινήσεις μέσα στο κείμενο (π.χ. «το τετράγωνο του Άρη με τον Κρόνο»), όσες λέει το ΜΗΚΟΣ, και μην απαριθμείτε όλα τα γεγονότα με τη σειρά.
- Οι πλανήτες ανήκουν κυρίως στο general. Στα love, career, luck και warning μιλήστε για την κατάσταση και τους ανθρώπους, όχι για πλανήτες: το πολύ μία αναφορά πλανήτη σε όλα αυτά μαζί. Το luck και το warning δεν αναφέρουν ποτέ πλανήτες ή όψεις.
- Μιλάτε για τομείς («ο τομέας της καριέρας σας», «τα οικονομικά σας»), ποτέ για αριθμημένους οίκους.
{decan_rule}
- Όταν τα δεδομένα δίνουν μέρα ή μέρος της ημέρας, χρησιμοποιήστε το με φυσικό τρόπο («το απόγευμα», «από την Πέμπτη»). Ποτέ ακριβείς ώρες.
- Τετράγωνα και αντιθέσεις φέρνουν τριβές, καθυστερήσεις και νεύρα. Τρίγωνα και εξάγωνα φέρνουν διευκολύνσεις. Μην ωραιοποιείτε τις δύσκολες μέρες, αλλά δώστε πάντα έναν τρόπο να τις διαχειριστεί κανείς.

ΥΦΟΣ
- Πάντα πληθυντικός ευγενείας: «έχετε», «σας», «προσέξτε».
- Σύντομες, καθαρές φράσεις, σαν να μιλάτε σε γνωστό σας. Γήινο λεξιλόγιο, όχι ποιητικό.
- Καθημερινές καταστάσεις: ο προϊστάμενος, ένας συνάδελφος, ένας λογαριασμός, μια υπογραφή, μια κουβέντα με τον σύντροφο, η οικογένεια, μια πρόσκληση για έξοδο, ένα ραντεβού που αναβάλλεται.
- Οι συμβουλές είναι πρακτικές και ήπιες: «καλό είναι να», «αποφύγετε», «μην παρασυρθείτε», «δώστε χρόνο».
- Κάθε πρόβλεψη έχει και καλά και δύσκολα. Τα δύσκολα μπαίνουν μέσα στο κείμενο, όχι μόνο στο warning: σε ένα ή δύο από τα general, love και career, δίπλα στα καλά, βάλτε μια επιφύλαξη ή πρακτική δυσκολία που βγαίνει από τα δεδομένα. Το luck μένει θετικό.
- Το warning είναι κάτι που καλό είναι να έχει υπόψη ο αναγνώστης: μία ή δύο σύντομες, αυτοτελείς προτάσεις για κάτι συγκεκριμένο της περιόδου. Δεν ξεκινά με «Ωστόσο», «Όμως» ή «Αλλά» και δεν συνεχίζει τα προηγούμενα.
- Επιτρέπονται μετρημένα «ενδεχομένως» και «πιθανόν», όχι σε κάθε πρόταση.
- Το πολύ ένα θαυμαστικό. Χωρίς ερωτήσεις, emoji, λίστες και παύλες.
- Μην ξεκινάτε με «Σήμερα» ή με το όνομα του ζωδίου. Κάθε πρόβλεψη έχει δικό της άνοιγμα.
- Ποτέ μη γράφετε για τις οδηγίες ή τα δεδομένα («όπως δείχνουν τα δεδομένα», «μπορεί να αναφερθεί»). Ο αναγνώστης βλέπει μόνο τη στήλη.

ΠΟΙΚΙΛΙΑ
- Κάθε πρόβλεψη πρέπει να διαβάζεται σαν να γράφτηκε μόνο για αυτόν που τη διαβάζει, όχι για όλα τα ζώδια μαζί.
- Το general ξεκινά από αυτό που αλλάζει για το ζώδιο (μια κατάσταση, έναν άνθρωπο, μια απόφαση), ποτέ με πλανήτη. Η κίνηση του ουρανού έρχεται μετά, ως εξήγηση.
- Κάθε πεδίο ανοίγει διαφορετικά. Μην ξεκινάτε δύο πεδία με τις ίδιες λέξεις.
- Το luck λέει ποια ευκαιρία ανοίγει για το ζώδιο και κλείνει με μια ενθαρρυντική προτροπή. Δεν ξεκινά με χρόνο, μέρα ή ημερομηνία ούτε με «Η καλύτερη μέρα».
- Ελεύθερους και δεσμευμένους τους ξεχωρίζετε μόνο όταν το θέμα το σηκώνει, όχι από συνήθεια.
- Τα παραδείγματα δείχνουν μόνο ύφος, μήκος και ισορροπία. Δεν αντιγράφετε από αυτά λέξεις, ανοίγματα ή τη δομή των προτάσεών τους. Όποια πρόβλεψη τα αντιγράφει απορρίπτεται.

ΑΠΑΓΟΡΕΥΟΝΤΑΙ
{writing_style.banned_list_for_prompt(_BANNED_PATTERNS)}."""

_PERIOD_RULES = {
    "daily": (
        "ΜΗΚΟΣ: ημερήσια πρόβλεψη. general: 2-3 προτάσεις με μία κίνηση από τα δεδομένα. love, career "
        "και luck: 2 προτάσεις η καθεμία. warning: 1-2 σύντομες προτάσεις. Σύνολο περίπου 120-160 "
        "λέξεις. Αν η Σελήνη αλλάζει ζώδιο μέσα στη μέρα, πείτε πότε αλλάζει το κλίμα («μετά το "
        "απόγευμα», «το βράδυ»)."
    ),
    "weekly": (
        "ΜΗΚΟΣ: εβδομαδιαία πρόβλεψη. general: 4-5 προτάσεις που ακολουθούν την εβδομάδα και ονομάζουν "
        "μέρες («από την Τετάρτη», «το Σαββατοκύριακο»), με 1-2 κινήσεις από τα δεδομένα. love και "
        "career: 2-3 προτάσεις η καθεμία. luck: 2 προτάσεις. Η καλύτερη μέρα μπαίνει στη δεύτερη και "
        "βγαίνει από τους τομείς αυτού του ζωδίου, όχι από το πιο ευνοϊκό γεγονός για όλους. warning: 1-2 "
        "σύντομες προτάσεις. Σύνολο περίπου 200-280 λέξεις."
    ),
    "monthly": (
        "ΜΗΚΟΣ: μηνιαία πρόβλεψη. general: 5-7 προτάσεις με τα γεγονότα του μήνα που αφορούν το ζώδιο "
        "και πότε συμβαίνουν («γύρω στις 15 του μήνα», «με τη Νέα Σελήνη»). love και career: 3 "
        "προτάσεις η καθεμία. luck: 2 προτάσεις. Οι καλύτερες μέρες μπαίνουν στη δεύτερη και βγαίνουν από "
        "γεγονότα στους τομείς αυτού του ζωδίου. warning: 1-2 σύντομες προτάσεις. Σύνολο περίπου "
        "320-420 λέξεις."
    ),
}

# Written for this app to show tone, length and the mix of good and hard news. Not taken from any
# published column. find_example_copies rejects readings that reuse their wording.
_EXAMPLES = """ΠΑΡΑΔΕΙΓΜΑΤΑ (δείχνουν μόνο ύφος, μήκος και ισορροπία, ποτέ λέξεις για αντιγραφή)

Παράδειγμα 1: ημερήσια, Ζυγός
Δεδομένα: Σελήνη στον Αιγόκερω (τομέας: σπίτι, οικογένεια) · το πρωί: Σελήνη τετράγωνο Άρης · Δίας (Ζυγός 24°) στο ζώδιο: τρίτο δεκαήμερο
general: Ένα οικογενειακό θέμα που αναβάλλετε εδώ και καιρό ζητά τη σειρά του. Με τη Σελήνη στον τομέα του σπιτιού σας και σε τετράγωνο με τον Άρη, οι τόνοι ανεβαίνουν εύκολα ως το μεσημέρι, οπότε κρατήστε τις σοβαρές κουβέντες για αργότερα. Οι γεννημένοι στο τρίτο δεκαήμερο έχετε τον Δία στο ζώδιό σας και ο λόγος σας μετράει περισσότερο απ' ό,τι νομίζετε.
love: Μια ήσυχη βραδιά στο σπίτι σάς κάνει περισσότερο καλό από μια έξοδο. Ένας δικός σας άνθρωπος περιμένει μια ζεστή κουβέντα και θα την εκτιμήσει.
career: Ένας συνάδελφος πιέζει για γρήγορες αποφάσεις και θα θέλατε να τελειώνετε. Ζητήστε πρώτα τα στοιχεία γραπτώς, γιατί κάτι δεν έχει υπολογιστεί σωστά.
luck: Ένα χρηματικό θέμα που κρέμεται καιρό βρίσκει λύση μέσα από μια απλή συζήτηση. Πάρτε εσείς την πρωτοβουλία να το ανοίξετε, ακόμη κι αν σας φαίνεται μικρό.
warning: Μια απότομη κουβέντα το πρωί ξεφεύγει εύκολα. Κρατήστε τον τόνο σας χαμηλά, ιδίως με τους δικούς σας.
summary: Υπομονή ως το μεσημέρι, και μετά τα πράγματα παίρνουν τον δρόμο τους.

Παράδειγμα 2: εβδομαδιαία, Ταύρος
Δεδομένα: Τετάρτη: είσοδος Αφροδίτη → Ζυγός (τομέας: καθημερινή εργασία, υγεία) · Σάββατο: Πανσέληνος (Σκορπιός, τομέας: σύντροφος, συνεργασίες) · Κρόνος (Ιχθύες 2°) σε εξάγωνο με το ζώδιο: πρώτο δεκαήμερο
general: Στη δουλειά τα πράγματα γίνονται πιο ευχάριστα, κυρίως από την Τετάρτη, όταν η Αφροδίτη περνά στον τομέα της καθημερινής σας εργασίας. Είναι καλή ευκαιρία να κλείσετε εκκρεμότητες που σας βαραίνουν, αρκεί να μη φορτωθείτε και τις δουλειές των άλλων. Προσέξτε λίγο περισσότερο τον ύπνο σας, γιατί η κούραση μαζεύεται. Το Σάββατο η Πανσέληνος στον τομέα των σχέσεων βγάζει στην επιφάνεια ό,τι δεν έχει ειπωθεί, και κάποιος θα περιμένει μια καθαρή απάντηση. Οι γεννημένοι στο πρώτο δεκαήμερο έχετε τη στήριξη του Κρόνου, άρα ό,τι συμφωνήσετε τώρα κρατάει.
love: Το Σαββατοκύριακο φέρνει μια κουβέντα που χρωστάτε στον σύντροφό σας. Πείτε τα ανοιχτά, χωρίς να ξύσετε παλιές πληγές. Αν είστε ελεύθεροι, μια γνωριμία από τη δουλειά έχει ενδιαφέρον, αρκεί να μη βιαστείτε.
career: Από την Τετάρτη οι σχέσεις με τους συναδέλφους μαλακώνουν και μια εκκρεμότητα κλείνει χωρίς φασαρία. Ένας προϊστάμενος προσέχει τη δουλειά σας, και αυτό θα φανεί αργότερα.
luck: Ένα αίτημα που το κρατάτε πίσω έχει καλές πιθανότητες να γίνει δεκτό. Κάντε το από την Τετάρτη και μετά, όσο το κλίμα στη δουλειά είναι καλό.
warning: Η ζήλια δεν σας ταιριάζει. Αν κάτι σας τρώει, ρωτήστε ευθέως.
summary: Ήρεμο ξεκίνημα και μια κουβέντα που δεν σηκώνει άλλη αναβολή."""

# One reader instead of a whole sign, coarse timing, natal chart fields filled in.
# Written for this app like _EXAMPLES; the sky data is invented.
_PERSONALIZED_EXAMPLE = """ΠΑΡΑΔΕΙΓΜΑ (δείχνει μόνο ύφος, μήκος και ισορροπία, ποτέ λέξεις για αντιγραφή)

Εξατομικευμένη, Σκορπιός, 34 ετών, καστανά μάτια
Δεδομένα: Ήλιος Σκορπιός 12° (δεύτερο δεκαήμερο) · Σελήνη Καρκίνος 8° · Ωροσκόπος Παρθένος 20° · αρχές Νοεμβρίου: είσοδος Αφροδίτη → Τοξότης (τομέας: οικονομικά, έσοδα, αγορές) · μέσα Νοεμβρίου: Νέα Σελήνη (Σκορπιός, τομέας: εαυτός, εικόνα, πρωτοβουλίες) · τέλη Νοεμβρίου: Άρης τετράγωνο Κρόνος · Κρόνος (Ιχθύες 12°) σε τρίγωνο με το ζώδιο: αφορά κυρίως το δεύτερο δεκαήμερο
general: Κάτι δικό σας, που το σκέφτεστε καιρό, βρίσκει αυτόν τον μήνα την αφετηρία του, με τη Νέα Σελήνη στο ζώδιό σας γύρω στα μέσα του μήνα. Ο Ήλιός σας, στο δεύτερο δεκαήμερο, έχει τη στήριξη του Κρόνου, άρα ό,τι στήσετε τώρα δεν θα γκρεμιστεί με την πρώτη δυσκολία. Σε αυτή τη φάση της ζωής σας οι γρήγορες λύσεις δεν σας ενδιαφέρουν πια, και αυτό είναι πλεονέκτημα. Προς τα τέλη του μήνα το τετράγωνο του Άρη με τον Κρόνο φέρνει καθυστερήσεις και λίγα νεύρα, οπότε κλείστε τα σημαντικά πριν από τότε. Ό,τι συμφωνήσετε, ζητήστε να γραφτεί.
love: Δεν σας ταιριάζουν τα μισόλογα και αυτόν τον μήνα θα το πείτε καθαρά. Αν είστε σε σχέση, μια κουβέντα για τα κοινά σχέδια που αναβάλλετε βγαίνει καλύτερα απ' ό,τι περιμένετε. Αν όχι, μια γνωριμία μέσα από φίλους έχει συνέχεια. Τα καστανά σας μάτια λένε πολλά πριν μιλήσετε, και κάποιος το έχει ήδη προσέξει. Δώστε χρόνο και αφήστε τον άλλον να κάνει το επόμενο βήμα.
career: Από τις αρχές του μήνα η Αφροδίτη περνά στον τομέα των οικονομικών σας και φέρνει ένα έξτρα έσοδο ή μια μικρή αύξηση. Στη δουλειά σας εμπιστεύονται ένα κομμάτι που ως τώρα το είχε άλλος, και θα φανεί πόσο οργανωμένα δουλεύετε. Μην αναλάβετε όμως περισσότερα απ' όσα χωράει η εβδομάδα σας. Προς τα τέλη του μήνα ένας προϊστάμενος ζητά αλλαγές την τελευταία στιγμή, γι' αυτό κρατήστε περιθώριο. Τα χαρτιά και οι υπογραφές πάνε καλύτερα στο πρώτο μισό του μήνα.
luck: Ένα ποσό που περιμένετε καιρό μπαίνει επιτέλους στον λογαριασμό. Αξίζει να πείτε ναι σε μια πρόσκληση που αρχικά θα θέλατε να αρνηθείτε. Από εκεί έρχεται μια γνωριμία που θα σας φανεί χρήσιμη στη δουλειά. Αιτήματα και νέα ξεκινήματα πάνε καλύτερα στα μέσα του μήνα.
warning: Μην υπογράψετε τίποτα βιαστικά στα τέλη του μήνα.
summary: Γερά θεμέλια, καθαρές κουβέντες.
moon_insight: Η Σελήνη σας στον Καρκίνο σάς κάνει να νιώθετε βαθιά, αλλά να το δείχνετε μόνο σε λίγους. Όταν πληγώνεστε, κλείνεστε πρώτα στο καβούκι σας και μιλάτε αργότερα. Χρειάζεστε ένα σπίτι που να σας ησυχάζει και ανθρώπους που θυμούνται τα μικρά πράγματα. Στις σχέσεις σας μετράει περισσότερο η σταθερή φροντίδα παρά οι μεγάλες κουβέντες.
ascendant_insight: Με Ωροσκόπο στην Παρθένο, η πρώτη εντύπωση που αφήνετε είναι ενός ανθρώπου που ξέρει τι κάνει. Η ηρεμία και η τάξη σας κάνουν τους άλλους να σας εμπιστεύονται από την πρώτη συνάντηση. Πίσω από τη σοβαρή εικόνα υπάρχει χιούμορ, που το δείχνετε μόνο όταν νιώσετε άνετα."""

_PERIOD_LABELS = {"daily": "ημερήσια", "weekly": "εβδομαδιαία", "monthly": "μηνιαία"}

# The personalized reading covers "the coming weeks"
_PERSONALIZED_SPAN_DAYS = 28


def find_banned_phrases(
    reading: AstrologyReading, extra_patterns: list[writing_style.BannedPattern] | None = None
) -> list[str]:
    """Labels of the AI-sounding phrases (or forbidden punctuation) found in a horoscope."""
    return writing_style.find_banned_phrases(
        reading, _BANNED_PATTERNS + (extra_patterns or []), _FIELD_PATTERNS
    )


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

    system_prompt = f"{_style_rules(_COLUMN_DECAN_RULE)}\n\n{_PERIOD_RULES[period]}\n\n{_EXAMPLES}"
    return await writing_style.generate_with_guardrail(
        system_prompt=system_prompt,
        user_text="\n\n".join(sections),
        response_model=AstrologyReading,
        banned_patterns=_BANNED_PATTERNS,
        field_patterns=_FIELD_PATTERNS,
        extra_checks=[_example_copy_check(_EXAMPLES)],
    )


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
    else:
        instructions.append("- Η ώρα γέννησης δεν είναι γνωστή: αφήστε κενό το ascendant_insight.")
    return "\n".join(lines), "\n".join(instructions)


# The example shows both chart fields filled, so say explicitly when they must stay empty
_NO_CHART_INSTRUCTIONS = "- Δεν υπάρχει γενέθλιος χάρτης: αφήστε κενά τα moon_insight και ascendant_insight."


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

    chart_text, chart_instructions = (
        _describe_natal_chart(chart) if chart else ("", _NO_CHART_INSTRUCTIONS)
    )

    system_prompt = f"""{_style_rules(_PERSONAL_DECAN_RULE)}

ΕΞΑΤΟΜΙΚΕΥΜΕΝΗ ΑΝΑΓΝΩΣΗ για τις επόμενες εβδομάδες, για έναν συγκεκριμένο άνθρωπο.
- general, love, career, luck: 4-6 προτάσεις η καθεμία.
- Μιλάτε σε έναν άνθρωπο, όχι σε όλο το ζώδιο: ποτέ «Οι γεννημένοι...» ή «Οι γεννημένες...».
- Για τον χρόνο χρησιμοποιήστε «αρχές, μέσα, τέλη του μήνα» όπως στα δεδομένα, ποτέ ακριβείς ημερομηνίες.
- Λάβετε υπόψη την ηλικία ως φάση ζωής, χωρίς να την αναφέρετε ως αριθμό.
- Αν ταιριάζει, αναφέρετε μία φορά το χρώμα των ματιών μέσα σε φυσική φράση για το βλέμμα (π.χ. «τα πράσινα μάτια σας τραβούν την προσοχή»).
- {writing_style.gender_rule(sex)}
{chart_instructions}

{_PERSONALIZED_EXAMPLE}"""

    sections = [
        "\n".join(personal_lines),
        chart_text,
        sky_service.describe_for_sign(sky, sign, coarse_dates=True),
        "Γράψτε την εξατομικευμένη ανάγνωση, απευθυνόμενοι μόνο σε αυτόν τον άνθρωπο.",
    ]
    return await writing_style.generate_with_guardrail(
        system_prompt=system_prompt,
        user_text="\n\n".join(section for section in sections if section),
        response_model=AstrologyReading,
        banned_patterns=_BANNED_PATTERNS + _PERSONALIZED_BANNED_PATTERNS,
        field_patterns=_FIELD_PATTERNS,
        extra_checks=[_example_copy_check(_PERSONALIZED_EXAMPLE)],
    )
