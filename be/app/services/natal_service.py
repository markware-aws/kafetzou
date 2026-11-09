"""
AI reading of a full natal chart (2 credits).

describe_chart() turns the calculated chart into Greek prompt lines, so the model only ever
interprets real positions, houses and aspects. The writing rules are this reading's own: the
horoscope rules (astrology_service._style_rules) forbid numbered houses and are built around
a period of time, while a natal reading describes a person.
"""

import logging
from datetime import date

from app.schemas.astrology import NatalReading
from app.services import astrology_service, sky_service, writing_style
from app.services.chart_service import ASPECT_ANGLES, PLANET_NAMES_GR, SIGNS_GR

logger = logging.getLogger(__name__)

# Modern rulers, as Greek popular astrology uses them
SIGN_RULERS: dict[str, str] = {
    "aries": "mars",
    "taurus": "venus",
    "gemini": "mercury",
    "cancer": "moon",
    "leo": "sun",
    "virgo": "mercury",
    "libra": "venus",
    "scorpio": "pluto",
    "sagittarius": "jupiter",
    "capricorn": "saturn",
    "aquarius": "uranus",
    "pisces": "neptune",
}

_HARMONIOUS = ("trine", "sextile")
_TENSE = ("square", "opposition")
_ELEMENTS = ("Φωτιά", "Γη", "Αέρας", "Νερό")
# The node is a point, not a planet: it does not count towards the element balance
_ELEMENT_BODIES = tuple(planet_id for planet_id in PLANET_NAMES_GR if planet_id != "north_node")

# The horoscope patterns minus «το στοιχείο του ζωδίου»: a natal reading may well talk about
# the element balance of the chart
_HOROSCOPE_PATTERNS_KEPT = ("τα άστρα σας χαμογελούν", "ακριβής ώρα")

# A reading states what the chart shows; it never questions itself
_SELF_DOUBT_PATTERNS = writing_style.compile_patterns([
    (
        "η ανάγνωση αμφισβητεί τον εαυτό της («κατά γράμμα», «κυριολεκτικά»)",
        r"κατ[αά]\s+γρ[αά]μμα|τοις\s+μετρητο[ιί]ς|κυριολεκτικ|ψυχαγωγ"
        r"|(δεν|ούτε)\s+(είναι|αποτελεί)\s+(μια\s+)?(ακριβ\w*\s+)?επιστ[ηή]μ",
    ),
])

_NATAL_BANNED_PATTERNS = (
    writing_style.COMMON_BANNED_PATTERNS
    + [
        (label, pattern) for label, pattern in astrology_service._BANNED_PATTERNS
        if label in _HOROSCOPE_PATTERNS_KEPT
    ]
    + astrology_service._PERSONALIZED_BANNED_PATTERNS
    + _SELF_DOUBT_PATTERNS
)

# The warning stands on its own, as in the horoscopes
_NATAL_FIELD_PATTERNS: list[writing_style.FieldPattern] = [
    pattern for pattern in astrology_service._FIELD_PATTERNS if pattern[0] == "warning"
]

# Wording the rules themselves dictate, so sharing it with the example is not copying
_EXAMPLE_COPY_IGNORED = ("οικο", "τομε")

_NATAL_STYLE = f"""Είστε έμπειρη Ελληνίδα αστρολόγος. Εδώ και 25 χρόνια γράφετε σε μεγάλο ελληνικό lifestyle site και διαβάζετε τους γενέθλιους χάρτες των αναγνωστών σας, έναν έναν.

ΔΕΔΟΜΕΝΑ
- Στηρίζεστε μόνο στις θέσεις, τους οίκους και τις όψεις που σας δίνονται. Μην επινοείτε όψεις, ανάδρομους πλανήτες, οίκους ή θέσεις που δεν υπάρχουν στα δεδομένα.
- Ονομάστε πλανήτες και ζώδια μέσα στο κείμενο («η Αφροδίτη σας στον Σκορπιό»). Για τους οίκους πείτε το θέμα τους, όπως το δίνουν τα δεδομένα («ο οίκος των σχέσεων», «ο τομέας της καριέρας»), όχι σκέτο αριθμό.
- Δεν χρειάζεται να αναφέρετε κάθε θέση και κάθε όψη. Διαλέξτε όσες λένε περισσότερα για το θέμα κάθε πεδίου.
- Τρίγωνα και εξάγωνα δείχνουν ταλέντα και ευκολίες. Τετράγωνα και αντιθέσεις δείχνουν εντάσεις και δύσκολα μαθήματα, όχι καταστροφές. Μια σύνοδος ενώνει δύο πλανήτες, για καλό ή για κόπο, ανάλογα με τους πλανήτες.
- Οι ανάδρομοι πλανήτες του χάρτη δείχνουν κάτι που ωριμάζει πιο αργά και πιο εσωτερικά, όχι κάτι χαλασμένο.
- Η ανάγνωση περιγράφει τον χαρακτήρα και τις τάσεις της ζωής, όχι γεγονότα με ημερομηνίες. Χωρίς χρονολογίες, ημερομηνίες και ώρες.
- Ποτέ μη γράφετε για τις οδηγίες ή τα δεδομένα («όπως δείχνουν τα δεδομένα»). Ο αναγνώστης βλέπει μόνο την ανάγνωση.

ΥΦΟΣ
- Πάντα πληθυντικός ευγενείας: «έχετε», «σας», «προσέξτε». Μιλάτε σε έναν άνθρωπο, ποτέ σε όλους τους γεννημένους ενός ζωδίου.
- Σύντομες, καθαρές φράσεις, σαν να μιλάτε σε γνωστό σας. Γήινο λεξιλόγιο, όχι ποιητικό.
- Καθημερινές εικόνες: η δουλειά, ο σύντροφος, οι φίλοι, η οικογένεια, τα χρήματα, ο τρόπος που τσακώνεστε και που φροντίζετε.
- Γράφετε με σιγουριά αυτό που δείχνει ο χάρτης. Μπορείτε να πείτε «συχνά δείχνει», «συνήθως φέρνει», αλλά ποτέ ότι η ανάγνωση δεν είναι κυριολεκτική, πραγματική ή ακριβής, ούτε ότι η αστρολογία δεν είναι επιστήμη.
- Κάθε ανάγνωση έχει και δυνατά και δύσκολα σημεία. Τα δύσκολα δεν μένουν μόνο στα challenges και warning: σε δύο από τα personality, emotions, love και career, δίπλα στα καλά, βάλτε μια επιφύλαξη που βγαίνει από τον χάρτη. Τα strengths μένουν θετικά. Τα challenges λένε πάντα και πώς διαχειρίζεται κανείς τη δυσκολία.
- Το warning είναι κάτι που καλό είναι να έχει υπόψη ο αναγνώστης: μία ή δύο σύντομες, αυτοτελείς προτάσεις. Δεν ξεκινά με «Ωστόσο», «Όμως» ή «Αλλά» και δεν συνεχίζει τα προηγούμενα.
- Επιτρέπονται μετρημένα «ενδεχομένως» και «πιθανόν», όχι σε κάθε πρόταση.
- Το πολύ ένα θαυμαστικό. Χωρίς ερωτήσεις, emoji, λίστες και παύλες.
- Κάθε πεδίο ανοίγει διαφορετικά. Μην ξεκινάτε δύο πεδία με τις ίδιες λέξεις, και μην ξεκινάτε κάθε πεδίο με πλανήτη.
- Τα παραδείγματα δείχνουν μόνο ύφος, μήκος και ισορροπία. Δεν αντιγράφετε από αυτά λέξεις, ανοίγματα ή τη δομή των προτάσεών τους. Όποια ανάγνωση τα αντιγράφει απορρίπτεται.

ΜΗΚΟΣ
- summary: μία πρόταση έως 15 λέξεις. personality, emotions, love, career: 3-4 προτάσεις το καθένα. mind, strengths, challenges, life_path: 3 προτάσεις το καθένα. warning: 1-2 σύντομες προτάσεις, έως 25 λέξεις. Σύνολο περίπου 400-500 λέξεις.

ΑΠΑΓΟΡΕΥΟΝΤΑΙ
{writing_style.banned_list_for_prompt(_NATAL_BANNED_PATTERNS)}."""

# Written for this app to show tone, length and the mix of good and hard news; the chart is
# invented. find_example_copies rejects readings that reuse its wording.
_NATAL_EXAMPLE = """ΠΑΡΑΔΕΙΓΜΑ (δείχνει μόνο ύφος, μήκος και ισορροπία, ποτέ λέξεις για αντιγραφή)

Γενέθλιος χάρτης, 41 ετών
Δεδομένα: Ήλιος Ταύρος 18°, οίκος 11 (φίλοι, ομάδες, σχέδια για το μέλλον) · Σελήνη Ζυγός 4°, οίκος 4 (σπίτι, οικογένεια, ακίνητα) · Ωροσκόπος Καρκίνος 9° · Μεσουράνημα Ιχθύες 21° · κυβερνήτης του χάρτη: Σελήνη · Ερμής Κριός 29°, οίκος 10, σε ανάδρομη πορεία · Αφροδίτη Δίδυμοι 2°, οίκος 12 · Άρης Παρθένος 15°, οίκος 3 · Δίας Αιγόκερως 11°, οίκος 7 · Κρόνος Υδροχόος 6°, οίκος 8 · Βόρειος Δεσμός Σκορπιός 25°, οίκος 5 · Ήλιος τρίγωνο Άρης (απόκλιση 3.0°) · Αφροδίτη τρίγωνο Κρόνος (απόκλιση 4.0°) · Σελήνη τετράγωνο Δίας (απόκλιση 7.0°) · Στοιχεία: Φωτιά 1, Γη 4, Αέρας 3, Νερό 2
summary: Υπομονή που χτίζει, και μια καρδιά που θέλει ήσυχο λιμάνι.
personality: Χτίζετε αργά και γερά, και όσοι σας ξέρουν μετρούν στον λόγο σας. Σταθερότητα και πείσμα σάς δίνει ο Ήλιος στον Ταύρο, ενώ ο Ωροσκόπος στον Καρκίνο κάνει την πρώτη σας εικόνα ζεστή αλλά επιφυλακτική. Επειδή κυβερνήτης του χάρτη είναι η Σελήνη, η διάθεση της μέρας καθορίζει περισσότερα απ' όσα θα θέλατε. Το ίδιο πείσμα που σας στηρίζει σάς κρατά καμιά φορά σε καταστάσεις που έχουν ήδη τελειώσει.
emotions: Ένα σπίτι χωρίς φωνές είναι για εσάς ανάγκη, όχι πολυτέλεια. Στον οίκο της οικογένειας, η Σελήνη στον Ζυγό θέλει όμορφο χώρο και ανθρώπους που μιλούν ήρεμα. Κάποτε οι αντιδράσεις σας φουσκώνουν, με το τετράγωνό της προς τον Δία, κι ένα μικρό παράπονο γίνεται βουνό μέσα σε μια βραδιά. Αφήστε μια νύχτα να περάσει πριν απαντήσετε σε κάτι που σας πείραξε.
mind: Ξαναζυγίζετε κάθε απόφαση πολλές φορές πριν την ανακοινώσετε. Ψηλά στον τομέα της καριέρας, ο ανάδρομος Ερμής στον Κριό σας κάνει να γυρνάτε πίσω, να διορθώνετε και τελικά να μιλάτε με επιχειρήματα που δύσκολα αντικρούονται. Γράφετε καλύτερα απ' όσο μιλάτε όταν κάτι σας έχει θυμώσει.
love: Σας κερδίζει όποιος σας κάνει να γελάτε και θυμάται τι του είπατε την προηγούμενη φορά. Στον τομέα του παρασκηνίου, η Αφροδίτη στους Διδύμους κρατά πολλά συναισθήματα κρυφά στην αρχή μιας γνωριμίας. Την αγάπη τη δείχνετε με πράξεις, με τον Άρη στην Παρθένο: μια δουλειά που τακτοποιείτε για τον άλλον χωρίς να το πείτε. Όταν όμως δεν σας το αναγνωρίζουν, η κριτική σας γίνεται αιχμηρή.
career: Δουλειές όπου φροντίζετε ανθρώπους ή δίνετε μορφή σε ιδέες σας ταιριάζουν, με το Μεσουράνημα στους Ιχθύες. Στον οίκο των κοινών οικονομικών, ο Κρόνος στον Υδροχόο φέρνει ευθύνες για χρήματα που δεν είναι μόνο δικά σας. Γραπτές συμφωνίες σε κάθε συνεργασία σάς γλιτώνουν από παρεξηγήσεις. Αργείτε να ζητήσετε αύξηση, και αυτό σας κοστίζει.
strengths: Δουλεύετε με μεθοδικότητα που οι άλλοι ζηλεύουν, χάρη στο τρίγωνο του Ήλιου με τον Άρη. Φιλίες που κρατούν δεκαετίες σάς χαρίζει το τρίγωνο της Αφροδίτης με τον Κρόνο. Στον τομέα των συνεργασιών, ο Δίας σάς φέρνει ανθρώπους που σας ανοίγουν πόρτες.
challenges: Δεσμεύεστε συχνά σε περισσότερα απ' όσα αντέχετε, γιατί το τετράγωνο της Σελήνης με τον Δία μεγαλώνει τις υποσχέσεις. Φορτώνεστε τις έγνοιες όλων και μετά νιώθετε ότι κανείς δεν σας ρωτά πώς είστε. Μάθετε να λέτε ένα ήρεμο όχι πριν από το κουρασμένο ναι.
life_path: Προς τη δημιουργία και το ρίσκο σάς σπρώχνει ο Βόρειος Δεσμός στον Σκορπιό, στον τομέα του έρωτα και των παιδιών. Μαθαίνετε σιγά σιγά να αφήνετε τη σιγουριά της συνήθειας και να δένεστε βαθιά, ακόμη κι όταν φοβάστε. Όποτε διαλέγετε το πάθος αντί για την ασφάλεια, κάτι μέσα σας ανοίγει.
warning: Συζητήσεις για χρήματα με τον σύντροφο θέλουν ήρεμη ώρα. Μην τις ανοίγετε στο τέλος μιας δύσκολης μέρας."""


def _degree(value: float) -> str:
    return f"{int(value)}°"


def _house_text(house: int) -> str:
    return f"οίκος {house} ({sky_service.TOMEIS_GR[house]})"


def _planet_line(planet: dict, time_known: bool, moon_day_signs: list[str] | None) -> str:
    name = PLANET_NAMES_GR[planet["id"]]
    if planet["id"] == "moon" and moon_day_signs:
        first, second = (SIGNS_GR[sign] for sign in moon_day_signs)
        return f"{name}: {first} ή {second} (αλλάζει ζώδιο τη μέρα της γέννησης)"
    if planet["id"] == "moon" and not time_known:
        # Without a time the Moon is only known to within ~6°
        return f"{name}: {SIGNS_GR[planet['sign']]}"
    parts = [f"{name}: {SIGNS_GR[planet['sign']]} {_degree(planet['degree'])}"]
    if time_known and planet.get("house"):
        parts.append(_house_text(planet["house"]))
    if planet.get("retrograde"):
        parts.append("σε ανάδρομη πορεία")
    return ", ".join(parts)


def _aspect_line(aspect: dict) -> str:
    kind = sky_service.ASPECTS_GR[ASPECT_ANGLES[aspect["type"]]]
    return (
        f"- {PLANET_NAMES_GR[aspect['planet_a']]} {kind} {PLANET_NAMES_GR[aspect['planet_b']]} "
        f"(απόκλιση {aspect['orb']}°)"
    )


def _element_balance(planets: list[dict], skip_moon: bool) -> str:
    counts = dict.fromkeys(_ELEMENTS, 0)
    for planet in planets:
        if planet["id"] not in _ELEMENT_BODIES or (skip_moon and planet["id"] == "moon"):
            continue
        counts[astrology_service.SIGNS_DATA[planet["sign"]]["element"]] += 1
    note = " (χωρίς τη Σελήνη)" if skip_moon else ""
    return "Στοιχεία, πλανήτες ανά στοιχείο" + note + ": " + ", ".join(
        f"{element} {count}" for element, count in counts.items()
    )


def _is_time_known(chart: dict) -> bool:
    """Houses and angles exist only for charts with a birth time."""
    return bool(chart.get("time_known")) and bool(chart.get("houses"))


def describe_chart(chart: dict) -> str:
    """Greek, prompt-ready lines for a version-2 chart: placements, angles, aspects, elements."""
    time_known = _is_time_known(chart)
    moon_day_signs = chart.get("moon_day_signs")
    planets = chart["planets"]

    lines = ["Γενέθλιος χάρτης", "", "Πλανήτες:"]
    lines += [f"- {_planet_line(planet, time_known, moon_day_signs)}" for planet in planets]

    if time_known:
        ascendant, midheaven = chart["ascendant"], chart["midheaven"]
        ruler = SIGN_RULERS[ascendant["sign"]]
        lines += [
            "",
            f"Ωροσκόπος: {SIGNS_GR[ascendant['sign']]} {_degree(ascendant['degree'])}",
            f"Μεσουράνημα: {SIGNS_GR[midheaven['sign']]} {_degree(midheaven['degree'])} "
            f"({sky_service.TOMEIS_GR[10]})",
            f"Κυβερνήτης του χάρτη (κυβερνά το ζώδιο του Ωροσκόπου): {PLANET_NAMES_GR[ruler]}",
        ]
    else:
        lines += ["", "Η ώρα γέννησης δεν είναι γνωστή: χωρίς Ωροσκόπο, Μεσουράνημα και οίκους."]

    aspects = chart.get("aspects") or []
    groups = [
        ("Αρμονικές όψεις", [aspect for aspect in aspects if aspect["type"] in _HARMONIOUS]),
        ("Τεταμένες όψεις", [aspect for aspect in aspects if aspect["type"] in _TENSE]),
        ("Σύνοδοι", [aspect for aspect in aspects if aspect["type"] == "conjunction"]),
    ]
    for title, group in groups:
        lines += ["", f"{title}:"]
        lines += [_aspect_line(aspect) for aspect in group] or ["- καμία"]

    lines += ["", _element_balance(planets, skip_moon=bool(moon_day_signs))]
    return "\n".join(lines)


def _chart_instructions(chart: dict) -> str:
    instructions = []
    if not _is_time_known(chart):
        instructions.append(
            "- Η ώρα γέννησης δεν είναι γνωστή: μην αναφέρετε Ωροσκόπο, Μεσουράνημα, κυβερνήτη "
            "του χάρτη ή οίκους. Στο personality μιλήστε για τον Ήλιο και τη Σελήνη, στο career "
            "για τον Κρόνο και το ζώδιο του Ήλιου."
        )
    moon_day_signs = chart.get("moon_day_signs")
    if moon_day_signs:
        first, second = (SIGNS_GR[sign] for sign in moon_day_signs)
        instructions.append(
            f"- Η Σελήνη αλλάζει ζώδιο τη μέρα της γέννησης ({first} ή {second}) και η ώρα "
            "γέννησης κρίνει ποιο από τα δύο ισχύει. Στο emotions γράψτε για όσα έχουν κοινά τα "
            "δύο ζώδια και πείτε μία φορά, απλά, ότι η ώρα θα έδειχνε ποιο από τα δύο είναι."
        )
    return "\n".join(instructions)


def _example_copy_check(reading: NatalReading) -> list[str]:
    return writing_style.find_example_copies(reading, _NATAL_EXAMPLE, _EXAMPLE_COPY_IGNORED)


def _age(date_of_birth: str, today: date) -> int:
    born = date.fromisoformat(date_of_birth)
    return today.year - born.year - ((today.month, today.day) < (born.month, born.day))


async def generate_natal_reading(
    chart: dict, sex: str | None, date_of_birth: str
) -> tuple[NatalReading, dict]:
    """Interpret a version-2 chart (one with `planets`) for its owner."""
    personal_lines = ["Προσωπικά στοιχεία:"]
    if sex:
        personal_lines.append(f"- Φύλο: {sex}")
    personal_lines.append(f"- Ηλικία: {_age(date_of_birth, astrology_service.athens_today())} ετών")

    system_prompt = f"""{_NATAL_STYLE}

ΑΝΑΓΝΩΣΗ ΓΕΝΕΘΛΙΟΥ ΧΑΡΤΗ για έναν συγκεκριμένο άνθρωπο.
- Λάβετε υπόψη την ηλικία ως φάση ζωής, χωρίς να την αναφέρετε ως αριθμό.
- {writing_style.gender_rule(sex)}
{_chart_instructions(chart)}

{_NATAL_EXAMPLE}"""

    sections = [
        "\n".join(personal_lines),
        describe_chart(chart),
        "Γράψτε την ανάγνωση του γενέθλιου χάρτη, απευθυνόμενοι μόνο σε αυτόν τον άνθρωπο.",
    ]
    return await writing_style.generate_with_guardrail(
        system_prompt=system_prompt,
        user_text="\n\n".join(sections),
        response_model=NatalReading,
        banned_patterns=_NATAL_BANNED_PATTERNS,
        field_patterns=_NATAL_FIELD_PATTERNS,
        extra_checks=[_example_copy_check],
    )


# ── One reading per set of birth details ──────────────────────────────────────

# Places are geocoded again on every profile save and can move by a few metres. Two decimals
# (about 1 km) still tell two towns apart and change nothing in a chart.
_BIRTH_KEY_COORDINATE_DECIMALS = 2
# Readings saved before birth_key existed are matched on their chart snapshot. The same
# calculation gives the same numbers (stored to 0.01°), so a gap past rounding means the birth
# details changed: the Moon moves 0.05° in about 5 minutes, the Ascendant in seconds.
_LEGACY_LONGITUDE_TOLERANCE = 0.05
_LEGACY_COMPARED_POINTS = ("sun", "moon", "ascendant")


def birth_key(profile: dict) -> str:
    """The birth details a reading was made from: date, time (or unknown), place, time zone.

    The zone is part of it even without a birth time: the chart is then drawn at local noon,
    so another zone moves the Moon.
    """
    time_of_birth = profile.get("time_of_birth")
    time_part = time_of_birth if profile.get("time_known") and time_of_birth else "unknown"
    lat, lon = profile.get("birth_lat"), profile.get("birth_lon")
    if lat is None or lon is None:
        place_part = "unknown"
    else:
        place_part = (
            f"{lat:.{_BIRTH_KEY_COORDINATE_DECIMALS}f},{lon:.{_BIRTH_KEY_COORDINATE_DECIMALS}f}"
        )
    zone_part = profile.get("birth_time_zone") or "unknown"
    return f"{profile['date_of_birth']}|{time_part}|{place_part}|{zone_part}"


def _chart_longitudes(chart: dict) -> dict[str, float]:
    points = {planet["id"]: planet["longitude"] for planet in chart.get("planets") or []}
    if chart.get("ascendant"):
        points["ascendant"] = chart["ascendant"]["longitude"]
    return points


def _angular_distance(first: float, second: float) -> float:
    return abs((first - second + 180) % 360 - 180)


def _same_chart(stored: dict, current: dict) -> bool:
    if bool(stored.get("time_known")) != bool(current.get("time_known")):
        return False
    stored_points, current_points = _chart_longitudes(stored), _chart_longitudes(current)
    for point in _LEGACY_COMPARED_POINTS:
        stored_value, current_value = stored_points.get(point), current_points.get(point)
        if stored_value is None and current_value is None:
            continue
        if stored_value is None or current_value is None:
            return False
        if _angular_distance(stored_value, current_value) > _LEGACY_LONGITUDE_TOLERANCE:
            return False
    return True


def reading_matches_profile(reading: dict, profile: dict) -> bool:
    """True when a stored reading was made from the profile's birth details as they are now."""
    stored_key = reading.get("birth_key")
    if stored_key:
        return stored_key == birth_key(profile)
    return reading.get("date_of_birth") == profile.get("date_of_birth") and _same_chart(
        reading.get("chart") or {}, profile.get("chart") or {}
    )


def find_current_reading(readings: list[dict], profile: dict | None) -> dict | None:
    """The newest of `readings` (newest first) that matches the profile, or None.

    A chart never changes, so a profile is read once; only changed birth details make room
    for a new paid reading.
    """
    if not profile:
        return None
    return next(
        (reading for reading in readings if reading_matches_profile(reading, profile)), None
    )
