"""
Offline generator of the instant natal chart texts: fe/src/content/chart-texts.json.

One fixed Greek text per placement (Ascendant in a sign, planet in a sign, planet in a house,
aspect between two planets), shown under a calculated chart with no AI call at runtime. Run by
hand from be/, so the OpenAI key and model come from be/.env like in the app:

    python -m scripts.generate_chart_texts --sample        # the nine review keys
    python -m scripts.generate_chart_texts --all           # every key still missing
    python -m scripts.generate_chart_texts --keys sun-leo,moon-house-4 --force
    python -m scripts.generate_chart_texts --fix --dry-run   # which texts have problems, no calls
    python -m scripts.generate_chart_texts --fix             # regenerate them, best of 3

The texts adapt Max Heindel, "The Message of the Stars" (1918, public domain), extracted into
docs/heindel-message-of-the-stars.json: each key's verified passage (plus background passages
for its planet, sign or house) goes into the prompt as source material, to be rewritten as a
modern Greek character portrait. Pluto and the North Node are not in the book; their keys are
written in-house from a short meaning sheet.

The run is resumable: keys already in the file are skipped unless --force, and the file is
saved after every finished text. Every text goes through writing_style.generate_with_guardrail:
the natal banned phrases plus this script's shape checks, regenerated once naming what was wrong.

Output contract (the frontend reads it): {"texts": {key: "Paragraph.\\n\\nParagraph."}}, keys
sorted, UTF-8, plain text, no title inside the text.
"""

import argparse
import asyncio
import json
import logging
import math
import os
import re
import sys
import zlib
from collections import Counter
from collections.abc import Awaitable, Callable, Iterable, Mapping
from dataclasses import dataclass, field
from functools import lru_cache
from itertools import combinations
from pathlib import Path
from typing import TypeVar

import openai
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services import natal_service, writing_style
from app.services.chart_service import (
    ASPECT_ANGLES,
    ASPECTS,
    LUMINARIES,
    LUMINARY_ORB_BONUS,
    PLANET_BODIES,
    PLANET_NAMES_GR,
    SIGNS_GR,
    ZODIAC_SIGNS,
)
from app.services.sky_service import ASPECTS_GR

logger = logging.getLogger(__name__)

T = TypeVar("T")

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUTPUT = REPO_ROOT / "fe" / "src" / "content" / "chart-texts.json"
DEFAULT_SOURCE = REPO_ROOT / "docs" / "heindel-message-of-the-stars.json"

SAMPLE_KEYS = (
    "ascendant-pisces",
    "sun-scorpio",
    "moon-virgo",
    "moon-house-7",
    "venus-house-8",
    "saturn-house-11",
    "sun-trine-moon",
    "venus-sextile-jupiter",
    "mars-opposition-saturn",
    "uranus-conjunction-neptune",
    "pluto-scorpio",
    "north_node-house-5",
)

MIN_WORDS = 140
MAX_WORDS = 190
MAX_PARAGRAPHS = 2
# Source passages go into the prompt whole up to this length (the longest is 693 words);
# background passages are trimmed harder, since they only back the main passage up
MAX_PASSAGE_WORDS = 700
MAX_BACKGROUND_WORDS = 250
DEFAULT_CONCURRENCY = 8
# --fix: fresh generations per broken text; the one with the fewest problems is kept
FIX_ATTEMPTS = 3
# Transient OpenAI errors (network, rate limit, 5xx): attempts per text, first wait in seconds
MAX_ATTEMPTS = 4
BACKOFF_SECONDS = 2.0
OPENING_WORDS = 3
# The report lists openings shared by this many texts
SHARED_OPENING_MIN_TEXTS = 3
# Openings already used this often are named in the prompt as ones to avoid
AVOIDED_OPENING_MIN_TEXTS = 2
MAX_AVOIDED_OPENINGS_IN_PROMPT = 60
# Recurring words and phrases: in this share of the library (and at least this many texts) a
# phrase is over-used, named in the prompt and checked; the report lists them all
OVERUSED_SHARE = 0.10
OVERUSED_MIN_TEXTS = 3
MAX_AVOIDED_PHRASES_IN_PROMPT = 30
MAX_PHRASES_IN_REPORT = 40
PHRASE_LENGTHS = (2, 3)
# Words are compared by their first letters, so «ξεχωρίστε» and «ξεχωρίζετε» count as one
STEM_LETTERS = 5

ASCENDANT = "ascendant"
MIDHEAVEN = "midheaven"
NODE = "north_node"
BODIES = list(PLANET_BODIES)
# find_aspects gives the node no aspects
ASPECT_BODIES = [body for body in BODIES if body != NODE]
ASPECT_TYPES = [aspect for aspect, _, _ in ASPECTS]
# They stay years in a sign and make their aspects with each other for years
GENERATIONAL_BODIES = frozenset({"uranus", "neptune", "pluto"})
HOUSES = range(1, 13)
# Greatest geocentric elongation from the Sun in degrees, rounded up: Mercury and Venus never
# get further from it. Aspects they cannot reach (Sun square Mercury, Mercury trine Venus...)
# never appear in a chart, so the library has no text for them.
MAX_ELONGATION = {"mercury": 28.0, "venus": 48.0}
FULL_CIRCLE_SEPARATION = 180.0

USAGE_KEYS = ("prompt_tokens", "completion_tokens", "total_tokens")


# ── The library ──────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class Placement:
    key: str
    # "ascendant" or ids of PLANET_BODIES; an aspect has two, in PLANET_BODIES order
    points: tuple[str, ...]
    sign: str | None = None
    house: int | None = None
    aspect: str | None = None


def max_separation(first: str, second: str) -> float:
    """The widest angle two bodies can make as seen from Earth."""
    if "sun" in (first, second):
        other = second if first == "sun" else first
        return MAX_ELONGATION.get(other, FULL_CIRCLE_SEPARATION)
    if first in MAX_ELONGATION and second in MAX_ELONGATION:
        # On opposite sides of the Sun, each at its greatest elongation
        return MAX_ELONGATION[first] + MAX_ELONGATION[second]
    return FULL_CIRCLE_SEPARATION


def aspect_can_occur(first: str, second: str, aspect: str) -> bool:
    """False when the aspect's narrowest angle (orbs as in find_aspects) is out of reach."""
    angle, orb = next((angle, orb) for name, angle, orb in ASPECTS if name == aspect)
    bonus = LUMINARY_ORB_BONUS if {first, second} & LUMINARIES else 0.0
    return angle - orb - bonus <= max_separation(first, second)


def all_placements() -> dict[str, Placement]:
    """Every placement of the library, keyed as the frontend looks them up."""
    placements = [
        Placement(f"{ASCENDANT}-{sign}", (ASCENDANT,), sign=sign) for sign in ZODIAC_SIGNS
    ]
    placements += [
        Placement(f"{body}-{sign}", (body,), sign=sign) for body in BODIES for sign in ZODIAC_SIGNS
    ]
    placements += [
        Placement(f"{body}-house-{house}", (body,), house=house)
        for body in BODIES for house in HOUSES
    ]
    # combinations() keeps list order, which is the order find_aspects gives planet_a, planet_b
    placements += [
        Placement(f"{first}-{aspect}-{second}", (first, second), aspect=aspect)
        for first, second in combinations(ASPECT_BODIES, 2)
        for aspect in ASPECT_TYPES
        if aspect_can_occur(first, second, aspect)
    ]
    return {placement.key: placement for placement in placements}


ALL_PLACEMENTS = all_placements()
ALL_KEYS = list(ALL_PLACEMENTS)
_KEY_ORDER = {key: index for index, key in enumerate(ALL_KEYS)}


# ── Prompt ───────────────────────────────────────────────────────────────────

class ChartText(BaseModel):
    text: str = Field(
        description=(
            "Μόνο το ελληνικό κείμενο, χωρίς εισαγωγικά γύρω του, χωρίς σχόλια ή σημειώσεις: "
            "μία ή δύο παράγραφοι, χωρισμένες με μία κενή γραμμή."
        )
    )


# The texts are prose only: no dash of any kind, no digits, no numbered houses, no markdown
_CHART_TEXT_PATTERNS = writing_style.compile_patterns([
    ("παύλες κάθε είδους", r"[-\u2010-\u2015\u2212]"),
    ("αριθμοί με ψηφία", r"\d"),
    (
        "οίκος με αριθμό («όγδοος οίκος»)",
        r"\b(πρ[ωώ]τ|δε[υύ]τερ|τρ[ιί]τ|τ[εέ]ταρτ|π[εέ]μπτ|[εέ]κτ|[εέ]βδομ|[οό]γδο|[εέ]νατ"
        r"|δ[εέ]κατ|ενδ[εέ]κατ|δωδ[εέ]κατ)\w*\s+(ο[ιί]κ|τομ[εέ])",
    ),
    ("μορφοποίηση markdown", r"[*#_`]"),
    (
        "«Το μάθημα είναι», «Η επιφύλαξη είναι» (πείτε την ίδια την επιφύλαξη)",
        r"(μ[αά]θημ[αά]?|επιφ[υύ]λαξ[ηή])\s+(σας\s+)?(ε[ιί]ναι|εδ[ωώ])",
    ),
    ("«Στην καθημερινότητα» στην αρχή παραγράφου", r"(?m)^\W*στην\s+καθημεριν"),
    ("γένος για τον αναγνώστη («μόνοι σας»)", r"\bμ[οό]ν(οι|ες|ος|η)\s+σας\b"),
    (
        "η λέξη «θέση» μπροστά στο όνομα («η θέση Ήλιος τρίγωνο Σελήνη»)",
        r"θ[εέ]ση\s+(ήλιος|σελήνη|ερμής|αφροδίτη|άρης|δίας|κρόνος|ουρανός|ποσειδώνας|πλούτωνας"
        r"|βόρειος|ωροσκόπος)\b",
    ),
    # What the 1918 source says and the adaptation drops
    (
        "θρησκευτικό ή εσωτερικιστικό πλαίσιο",
        r"θε[οό]ς|\bθε[οό]\b|\bθεο[υύ]\b|θεϊκ|χριστ|κ[αά]ρμα|μετενσ[αά]ρκ|αμαρτ"
        r"|εξ[εέ]λιξη\s+της\s+ψυχ",
    ),
    (
        "αρρώστιες και ιατρικές προβλέψεις",
        r"αρρ[ωώ]στ|ασθ[εέ]ν|ν[οό]σ[ηή]μα|\bν[οό]σ(ος|ου|ο|οι|ων)\b",
    ),
    (
        "θάνατος, ατυχήματα, προβλέψεις γεγονότων",
        r"θ[αά]νατ|θαν[αά]σιμ|πεθα[ιί]ν|π[εέ]θαν|ατ[υύ]χημα|δυστ[υύ]χημα|χηρε[ιί]",
    ),
    ("το βιβλίο ή ο συγγραφέας της πηγής", r"heindel|χ[αά]ιντελ|rosicrucian|ροδ[οό]σταυρ"),
    # The source's moral verdicts («cruel», «dishonest», «imprisonment») become tendencies
    (
        "έγκλημα, φυλακή, βία ή προσβολή για τον αναγνώστη",
        r"[εέ]γκλημ|φυλακ[ηήεέ]|φυλ[αά]κισ|β[ιί]αι|κακοποι|ατ[ιί]μω|αν[εέ]ντιμ|απατε[ωώ]ν"
        r"|αν[ηή]θικ|σαδισ",
    ),
    (
        "υποθέσεις για παιδιά, σύντροφο ή δουλειά του αναγνώστη («είτε υπάρχουν είτε όχι»)",
        r"\b(αν|εάν)\s+(δεν\s+)?(έχετε|υπ[αά]ρχ\w*)\s+(\w+\s+){0,2}(παιδ|σ[υύ]ντροφ|ταίρι|δουλει)"
        r"|ε[ιί]τε\s+(υπ[αά]ρχ|[εέ]χετε)\w*\s+ε[ιί]τε\s+[οό]χι",
    ),
])

# natal_service's self-undermining check, but «ψυχαγωγία» alone is a theme (Leo, the house of
# pleasure: «στη δημιουργία, στην ψυχαγωγία»); only the disclaimer forms fail here
_SELF_DOUBT_LABEL = natal_service._SELF_DOUBT_PATTERNS[0][0]
_CHART_SELF_DOUBT_PATTERNS = writing_style.compile_patterns([
    (
        _SELF_DOUBT_LABEL,
        r"κατ[αά]\s+γρ[αά]μμα|τοις\s+μετρητο[ιί]ς|κυριολεκτικ|ψυχαγωγικ"
        r"|(για|ως)\s+(απλ[ηή]\s+)?ψυχαγωγ[ιί]α|απλ[ωώ]ς\s+ψυχαγωγ"
        r"|(δεν|ούτε)\s+(είναι|αποτελεί)\s+(μια\s+)?(ακριβ\w*\s+)?επιστ[ηή]μ",
    ),
])

BANNED_PATTERNS = (
    [pattern for pattern in natal_service._NATAL_BANNED_PATTERNS if pattern[0] != _SELF_DOUBT_LABEL]
    + _CHART_SELF_DOUBT_PATTERNS
    + _CHART_TEXT_PATTERNS
)

# A reader verb and then a masculine plural can only be the reader's gender; the singular is left
# alone, since «σας κάνει πιο εύκολο να...» is impersonal. Checked in text_problems, not with the
# banned patterns, so the retry quotes what the model actually wrote.
_READER_GENDER = re.compile(
    r"(?<!\w)(είστε|γίνεστε|γίνετε|νιώθετε|νιώσετε|μένετε|μείνετε|φαίνεστε|δείχνετε"
    r"|σ[αά]ς\s+κάν(ει|ουν))\s+((πολύ|πιο|ιδιαίτερα|υπερβολικά|αρκετά|τόσο|λίγο)\s+)?"
    # «νιώθετε δικούς σας ανθρώπους»: the possessive is about the others
    r"(?!άνθρωπ|δικ)\w{3,}(οι|οί|ους|ούς)(?!\w)",
    re.IGNORECASE,
)

SYSTEM_PROMPT = f"""Είστε έμπειρη Ελληνίδα αστρολόγος. Εδώ και 25 χρόνια γράφετε σε μεγάλο ελληνικό site αστρολογίας τα κείμενα για κάθε θέση του γενέθλιου χάρτη: ζωντανά πορτρέτα χαρακτήρα, όπου ο αναγνώστης αναγνωρίζει τον εαυτό του.

ΤΟ ΚΕΙΜΕΝΟ
- Γράφετε για μία μόνο θέση του χάρτη: τον Ωροσκόπο σε ένα ζώδιο, έναν πλανήτη σε ζώδιο, έναν πλανήτη σε οίκο ή μία όψη ανάμεσα σε δύο πλανήτες. Ο αναγνώστης το διαβάζει κάτω από τον χάρτη του, μαζί με τα κείμενα για τις άλλες θέσεις του.
- Μιλάτε μόνο για αυτή τη θέση. Δεν ξέρετε τίποτε άλλο για τον χάρτη: μην αναφέρετε άλλους πλανήτες, άλλα σημεία του χάρτη (Ωροσκόπο, Μεσουράνημα), οίκους, ζώδια του αναγνώστη, όψεις ή ανάδρομη πορεία, εκτός από όσα ανήκουν στη θέση του κειμένου.
- Ονομάστε τη θέση μία φορά μέσα στο κείμενο, με φυσικό τρόπο («η Αφροδίτη σας στον Σκορπιό», «το τρίγωνο του Ήλιου με τη Σελήνη»), εκεί που λέει η οδηγία για την ονομασία και χωρίς τη λέξη «θέση» μπροστά στο όνομα. Για τους οίκους πείτε το θέμα τους, όπως το δίνουν τα δεδομένα («ο οίκος των σχέσεων», «ο τομέας της καριέρας»), ποτέ τον αριθμό τους, ούτε ολογράφως.
- Οι όψεις: το τρίγωνο είναι φυσική ευκολία και ταλέντο. Το εξάγωνο είναι ευκαιρία που θέλει λίγη προσπάθεια για να αποδώσει. Το τετράγωνο είναι εσωτερική τριβή που σας σπρώχνει στη δράση. Η αντίθεση είναι ένα τράβηγμα ανάμεσα σε δύο πλευρές, που συχνά το ζείτε μέσα από άλλους ανθρώπους και ζητά ισορροπία. Η σύνοδος κάνει τους δύο πλανήτες να λειτουργούν ως ένα, για καλό ή για κόπο. Οι δύσκολες όψεις δείχνουν εντάσεις, όχι καταστροφές.
- Το κείμενο περιγράφει τον χαρακτήρα και τις τάσεις της ζωής, όχι γεγονότα. Χωρίς ηλικίες, χρονολογίες, ημερομηνίες και αριθμούς.
- Μην υποθέτετε και μην εικάζετε αν ο αναγνώστης έχει παιδιά, σύντροφο ή δουλειά («αν έχετε παιδιά», «είτε υπάρχουν είτε όχι»). Μιλήστε για το θέμα: τη σχέση σας με τη δημιουργία, με τη δέσμευση, με την εργασία.
- Ποτέ μη γράφετε για τις οδηγίες, τα δεδομένα ή την πηγή. Χωρίς τίτλο: ο τίτλος της θέσης φαίνεται ήδη πάνω από το κείμενο.

ΠΗΓΗ
- Για τις περισσότερες θέσεις σας δίνεται απόσπασμα από ένα κλασικό αγγλικό βιβλίο αστρολογίας του 1918, και συχνά αποσπάσματα υποβάθρου για τον πλανήτη, το ζώδιο ή τον οίκο. Κρατήστε το περιεχόμενό τους: τα χαρακτηριστικά, τα κίνητρα και τις τάσεις που περιγράφουν. Γράψτε τα από την αρχή, ως σύγχρονο ψυχολογικό πορτρέτο στα ελληνικά. Μη μεταφράζετε πρόταση προς πρόταση και μην ακολουθείτε τη σειρά του αποσπάσματος.
- Αφήστε έξω: το θρησκευτικό και εσωτερικιστικό πλαίσιο (εξέλιξη της ψυχής, πνευματικά μαθήματα με θρησκευτικούς όρους), αρρώστιες, υγεία και ιατρικές προβλέψεις, θάνατο, ατυχήματα και κάθε πρόβλεψη γεγονότων, τη μοιρολατρία («είναι γραφτό να υποφέρει»), κανόνες για τον γάμο ανάλογα με το φύλο και ξεπερασμένους κοινωνικούς ρόλους.
- Η πηγή είναι συχνά πολύ σκληρή. Οι ηθικές καταδίκες της (σκληρός, ανέντιμος, διεφθαρμένος, εγκληματικός, βίαιος, εγωιστής) δεν φτάνουν ποτέ ως τέτοιες στον αναγνώστη. Κάθε μία γίνεται η τάση που κρύβεται από κάτω, ειπωμένη ειλικρινά αλλά δίκαια, ως κάτι που ο άνθρωπος αναγνωρίζει και μπορεί να διαχειριστεί: το «σκληρός και αδιάφορος» γίνεται ευθύτητα, ανυπομονησία με την αδυναμία, μια σκληρή όψη όταν πιέζεστε. Ποτέ μην προσβάλλετε τον αναγνώστη και ποτέ μην προβλέπετε έγκλημα, φυλακή, ντροπή ή βίαιο θάνατο.
- Η πηγή γράφει με όρους («αν η θέση έχει καλές όψεις… αν έχει κακές…»). Ένα κείμενο για μία θέση δεν ξέρει τον υπόλοιπο χάρτη: δώστε και τις δύο πλευρές ως δυνατότητες της θέσης, το χάρισμα και τον κίνδυνο, χωρίς τους μηχανισμούς των όψεων. Αγνοήστε τις όψεις «parallel» που αναφέρει η πηγή.
- Λίστες επαγγελμάτων (χειρουργός, χασάπης, καπετάνιος): κρατήστε το πολύ μια ελαφριά νύξη για το είδος της δουλειάς που ταιριάζει, με σημερινούς όρους, ή αφήστε τες.
- Περιγραφές σώματος και εμφάνισης (ύψος, κιλά, πρόσωπο): αφήστε τες έξω. Κρατήστε το πολύ τη γενική εντύπωση που δίνετε.
- Αν το απόσπασμα λέει κυρίως τέτοια, στηριχτείτε στα αποσπάσματα υποβάθρου και στη γνωστή σημασία της θέσης. Όπου δεν υπάρχει απόσπασμα, γράψτε από τη σημασία που σας δίνεται και τη γνωστή σημασία της θέσης.
- Ποτέ μην αναφέρετε το βιβλίο, τον συγγραφέα ή ότι υπάρχει πηγή.

ΥΦΟΣ
- Πορτρέτο χαρακτήρα, όχι συμβουλές. Λέτε με σιγουριά ποιος είναι ο άνθρωπος, πώς σκέφτεται, πώς νιώθει, πώς αγαπά και πώς δρα, και εξηγείτε γιατί («επειδή», «γιατί», «αυτό συμβαίνει γιατί»). Μιλάτε απευθείας: «Είστε άνθρωπος που…», «Έχετε…», «Σας…».
- Ζεστό, ζωντανό ύφος, λίγο δραματικό. Πλούσια επίθετα για όσα περιγράφετε και, πού και πού, μια γνώριμη ελληνική έκφραση, κάθε φορά άλλη. Εναλλάσσετε μικρές και μεγάλες προτάσεις.
- Εικόνες και παρομοιώσεις μόνο εκεί που το επιτρέπει η οδηγία για την εικόνα, και το πολύ μία. Τις περισσότερες φορές αρκεί ο χαρακτήρας ειπωμένος ζωντανά. Όταν υπάρχει εικόνα, δεν παίρνει πάντα τη μορφή «σαν…»: συχνά αρκεί ένα ρήμα ή ένα επίθετο με εικόνα.
- Απλά, σύγχρονα ελληνικά, όπως τα μιλάμε. Χωρίς καθαρεύουσα και λόγιες λέξεις, τίποτα που θέλει λεξικό ή που ακούγεται μεταφρασμένο από τα αγγλικά.
- Τα ελαττώματα λέγονται ειλικρινά, ως μέρος του πορτρέτου («δυσκολεύεστε να…», «μπορεί να…»), μαζί με τα δυνατά σημεία, στο ίδιο κείμενο.
- Συμβουλή μόνο κάπου κάπου: το πολύ μία πρόταση, προς το τέλος («Καλό είναι να…», «Χρειάζεται να προσέχετε…»), και όχι σε κάθε κείμενο. Όχι σειρά από σκηνές (δουλειά, σύντροφος, σπίτι).
- Πάντα πληθυντικός ευγενείας: «έχετε», «σας». Μιλάτε σε έναν άνθρωπο, ποτέ σε όλους όσοι έχουν αυτή τη θέση.
- {writing_style.gender_rule(None)} Αυτό ισχύει και στον πληθυντικό: όχι «είστε συμπονετικοί», «σας κάνει δεκτικούς», «μόνοι σας». Γράψτε με ρήματα και ουσιαστικά («έχετε συμπόνια», «είστε άνθρωπος με υπομονή», «μόνο εσείς»). Μετά το «είστε», «γίνεστε», «νιώθετε» ή «σας κάνει» ακολουθεί ουσιαστικό ή ρήμα, ποτέ επίθετο για εσάς: όχι «νιώθετε έτοιμοι», «γίνεστε αυστηροί», «σας κάνει καχύποπτους».
- Ούτε του συντρόφου το φύλο ξέρετε: «ο σύντροφος», «το ταίρι σας», «ο άλλος», όχι «εκείνος» ή «εκείνη» για αυτόν.
- Γράφετε με σιγουριά αυτό που δείχνει η θέση. Μπορείτε να πείτε «συχνά δείχνει», «συνήθως φέρνει», αλλά ποτέ ότι το κείμενο δεν είναι κυριολεκτικό, πραγματικό ή ακριβές, ούτε ότι η αστρολογία δεν είναι επιστήμη.
- Επιτρέπονται μετρημένα «ενδεχομένως» και «πιθανόν», όχι σε κάθε πρόταση.
- Το πολύ ένα θαυμαστικό. Χωρίς ερωτήσεις, emoji, λίστες, μορφοποίηση και παύλες κάθε είδους.
- Μην ξεκινάτε το κείμενο με το όνομα του πλανήτη ή του σημείου, ούτε με «Με τον» και το όνομά του. Ξεκινήστε από τον άνθρωπο, όπως λέει η οδηγία για το άνοιγμα, με δικά σας λόγια και όχι με τις λέξεις της οδηγίας.

ΜΗΚΟΣ ΚΑΙ ΜΟΡΦΗ
- {MIN_WORDS} έως {MAX_WORDS} λέξεις, σε μία ή δύο παραγράφους χωρισμένες με μία κενή γραμμή.
- Το πεδίο text έχει μόνο το ελληνικό κείμενο: χωρίς εισαγωγικά γύρω του, χωρίς σχόλια, μετρήσεις λέξεων ή σημειώσεις για τους κανόνες, χωρίς λέξεις από άλλη γλώσσα και χωρίς διπλούς τύπους («απότομο/η»). Μετά την τελευταία πρόταση δεν γράφετε τίποτε άλλο.

ΑΠΑΓΟΡΕΥΟΝΤΑΙ
{writing_style.banned_list_for_prompt(BANNED_PATTERNS)}."""

_ASCENDANT_NOTE = (
    "Ο Ωροσκόπος είναι το ζώδιο που ανέτειλε τη στιγμή της γέννησης: η πρώτη εικόνα και η "
    "στάση, ο τρόπος που ξεκινάτε κάτι καινούργιο και που σας βλέπουν οι άλλοι πριν σας "
    "γνωρίσουν."
)
# Meaning sheets for what the 1918 source does not cover (Pluto was found in 1930)
_NODE_NOTE = (
    "Σημασία, χωρίς πηγή: ο Βόρειος Δεσμός είναι σημείο, όχι πλανήτης. Δείχνει την κατεύθυνση "
    "προς την οποία η ζωή σας ζητά να μεγαλώσετε: κάτι άγνωστο, που δεν σας βγαίνει αυθόρμητα "
    "αλλά σας ανταμείβει όσο το τολμάτε. Το αντίθετο σημείο, ο Νότιος Δεσμός, είναι η άνετη "
    "συνήθεια που καλείστε να αφήσετε πίσω. Κατά την παράδοση ο Βόρειος Δεσμός είναι σημείο "
    "τύχης: όσο πηγαίνετε προς τα εκεί, οι πόρτες ανοίγουν."
)
_PLUTO_NOTE = (
    "Σημασία, χωρίς πηγή: ο Πλούτωνας είναι το βάθος και η ένταση, η δύναμη και ο έλεγχος, οι "
    "κρίσεις που φέρνουν ανανέωση και ό,τι μένει κρυφό."
)
_HOUSE_NOTE = "Ο οίκος είναι ο τομέας της ζωής όπου δουλεύει η θέση."
_GENERATIONAL_SIGN_NOTE = (
    "Ο πλανήτης αυτός μένει χρόνια στο ίδιο ζώδιο και τη θέση αυτή τη μοιράζεται όλη η γενιά "
    "σας. Γράψτε πώς φαίνεται στη δική σας ζωή."
)
_GENERATIONAL_ASPECT_NOTE = (
    "Η όψη αυτή κρατά χρόνια και τη μοιράζεται όλη η γενιά σας. Γράψτε πώς φαίνεται στη δική "
    "σας ζωή: στις επιλογές, στις αξίες, στον τρόπο που ζείτε τις αλλαγές."
)
_ASPECT_NOTES = {
    "conjunction": (
        "Σύνοδος: οι δύο πλανήτες λειτουργούν ως ένα, για καλό ή για κόπο, ανάλογα με τη φύση "
        "τους."
    ),
    "sextile": "Εξάγωνο: μια ευκαιρία ανάμεσα στους δύο πλανήτες, που θέλει λίγη προσπάθεια.",
    "square": "Τετράγωνο: εσωτερική τριβή ανάμεσα στους δύο πλανήτες, που σας σπρώχνει στη δράση.",
    "trine": "Τρίγωνο: φυσική ευκολία και ταλέντο, οι δύο πλανήτες συνεργάζονται αβίαστα.",
    "opposition": (
        "Αντίθεση: ένα τράβηγμα ανάμεσα σε δύο πλευρές, που συχνά το ζείτε μέσα από άλλους "
        "ανθρώπους και ζητά ισορροπία."
    ),
}

# Each call is independent, so openings drift to the same template; a rotating hint per key
# (stable across reruns) spreads them out
OPENING_HINTS = (
    "η πρώτη πρόταση δείχνει μια σκηνή από τη ζωή σας.",
    "η πρώτη πρόταση λέει πώς σας βλέπουν οι άλλοι.",
    "η πρώτη πρόταση ξεκινά με ρήμα.",
    "η πρώτη πρόταση λέει τι χρειάζεστε.",
    "η πρώτη πρόταση λέει μια αντίφαση του χαρακτήρα σας.",
    "η πρώτη πρόταση λέει πώς αντιδράτε σε μια δυσκολία.",
    "η πρώτη πρόταση λέει κάτι που κάνετε καλύτερα από τους περισσότερους.",
    "η πρώτη πρόταση είναι σύντομη, έως οκτώ λέξεις.",
    "η πρώτη πρόταση λέει μια συνήθειά σας.",
    "η πρώτη πρόταση λέει πώς φέρεστε σε μια παρέα.",
    "η πρώτη πρόταση λέει πώς δένεστε με τους ανθρώπους.",
    "η πρώτη πρόταση λέει τι σας κινεί.",
    "η πρώτη πρόταση λέει κάτι που σας πληγώνει εύκολα.",
)

_SIMILE_ALLOWED = (
    "Εικόνα: εδώ μπορείτε να βάλετε μία εικόνα, αν βγαίνει φυσικά, καλύτερα με ένα ρήμα ή ένα "
    "επίθετο παρά με «σαν»."
)
_SIMILE_NOT_ALLOWED = (
    "Εικόνα: σε αυτό το κείμενο χωρίς παρομοιώσεις και χωρίς «σαν». Ο χαρακτήρας ειπωμένος "
    "ζωντανά αρκεί."
)

# Where the placement is named: left alone, every text names it in its second sentence
NAMING_HINTS = (
    "ονομάστε τη θέση μέσα στην πρώτη πρόταση, όχι στην αρχή της.",
    "ονομάστε τη θέση στη δεύτερη πρόταση.",
    "ονομάστε τη θέση στην τρίτη ή στην τέταρτη πρόταση.",
)


def _point_name(point: str) -> str:
    return "Ωροσκόπος" if point == ASCENDANT else PLANET_NAMES_GR[point]


def placement_line(placement: Placement) -> str:
    """The placement in Greek, as the prompt names it."""
    if placement.aspect:
        first, second = placement.points
        kind = ASPECTS_GR[ASPECT_ANGLES[placement.aspect]]
        return f"{_point_name(first)} {kind} {_point_name(second)}"
    name = _point_name(placement.points[0])
    if placement.house:
        return f"{name}, {natal_service._house_text(placement.house)}"
    return f"{name} στο ζώδιο {SIGNS_GR[placement.sign]}"


def placement_notes(placement: Placement) -> list[str]:
    points = set(placement.points)
    notes = []
    if ASCENDANT in points:
        notes.append(_ASCENDANT_NOTE)
    if NODE in points:
        notes.append(_NODE_NOTE)
    if "pluto" in points:
        notes.append(_PLUTO_NOTE)
    if placement.house:
        notes.append(_HOUSE_NOTE)
    if placement.aspect:
        notes.append(_ASPECT_NOTES[placement.aspect])
        if points <= GENERATIONAL_BODIES:
            notes.append(_GENERATIONAL_ASPECT_NOTE)
    elif placement.sign and points <= GENERATIONAL_BODIES:
        notes.append(_GENERATIONAL_SIGN_NOTE)
    return notes


# ── Source ───────────────────────────────────────────────────────────────────

# Not in the 1918 book: their keys are written in-house from the meaning sheets above
IN_HOUSE_POINTS = frozenset({"pluto", NODE})
# The book treats aspects by kind, so one passage serves both aspects of a group
ASPECT_GROUPS = {
    "conjunction": "conjunction",
    "sextile": "harmonious",
    "trine": "harmonious",
    "square": "tense",
    "opposition": "tense",
}
_GROUP_NOTES = {
    "harmonious": "Το απόσπασμα μιλά για όλες τις αρμονικές όψεις (τρίγωνο, εξάγωνο) των δύο "
    "πλανητών: γράψτε για τη συγκεκριμένη όψη.",
    "tense": "Το απόσπασμα μιλά για όλες τις τεταμένες όψεις (τετράγωνο, αντίθεση) των δύο "
    "πλανητών: γράψτε για τη συγκεκριμένη όψη.",
}
# Source passages (by source key) that are mostly or partly about illness: the text leans on the
# background passages and the standard meaning instead. Reviewed by hand against the book.
MEDICAL_PASSAGES = frozenset({
    "ascendant-virgo", "sun-aries", "saturn-virgo", "sun-house-6", "sun-house-8",
    "mercury-house-6", "venus-house-6", "jupiter-house-6", "uranus-house-6", "neptune-house-6",
    "mars-house-1", "jupiter-conjunction-saturn", "mars-tense-jupiter",
    "sun-conjunction-uranus", "sun-tense-uranus",
})
PARTLY_MEDICAL_PASSAGES = frozenset({
    "jupiter-tense-saturn", "saturn-pisces", "saturn-house-8", "moon-house-8",
    "moon-conjunction-uranus", "uranus-scorpio", "neptune-scorpio",
})
_MEDICAL_NOTE = (
    "Το απόσπασμα αυτό μιλά κυρίως για υγεία και σώμα: κρατήστε μόνο όσα λέει για τον "
    "χαρακτήρα και στηριχτείτε κυρίως στο υπόβαθρο και στη γνωστή σημασία της θέσης."
)
_PARTLY_MEDICAL_NOTE = "Μέρος του αποσπάσματος μιλά για υγεία και σώμα: αφήστε το έξω."
_SENTENCE_BREAK = re.compile(r"(?<=[.!?;])\s+")


@dataclass(frozen=True)
class Passage:
    key: str
    heading: str
    text: str


@dataclass(frozen=True)
class SourceMaterial:
    """What the source gives one placement: its own passage (or None) and background passages."""
    passage: Passage | None = None
    background: tuple[Passage, ...] = ()


NO_MATERIAL = SourceMaterial()


def load_source(path: Path) -> dict[str, Passage]:
    """The verified passages of the source file. Unverified ones are never used."""
    passages = json.loads(path.read_text(encoding="utf-8"))["passages"]
    return {
        key: Passage(key, passage["heading"], " ".join(passage["text"].split()))
        for key, passage in passages.items()
        if passage.get("verified") is True
    }


def passage_key(placement: Placement) -> str | None:
    """The source key of the placement's own passage, or None for an in-house placement."""
    if IN_HOUSE_POINTS & set(placement.points):
        return None
    if placement.aspect:
        first, second = placement.points
        return f"{first}-{ASPECT_GROUPS[placement.aspect]}-{second}"
    return placement.key


def background_keys(placement: Placement) -> list[str]:
    """Source keys about the placement's sign or house.

    The book's planet chapters (planet-<id>) are left out: they are long essays that open with
    Bible and occult material, so their first lines would feed the prompt what it must drop.
    """
    if placement.sign:
        return [f"sign-{placement.sign}"]
    if placement.house:
        return [f"house-{placement.house}"]
    return []


def medical_flag(material: SourceMaterial) -> str | None:
    """Whether the placement's passage is about illness: "mostly", "partly" or None."""
    if not material.passage:
        return None
    if material.passage.key in MEDICAL_PASSAGES:
        return "mostly"
    if material.passage.key in PARTLY_MEDICAL_PASSAGES:
        return "partly"
    return None


def source_material(placement: Placement, source: Mapping[str, Passage]) -> SourceMaterial:
    key = passage_key(placement)
    return SourceMaterial(
        passage=source.get(key) if key else None,
        background=tuple(source[key] for key in background_keys(placement) if key in source),
    )


def excerpt(text: str, max_words: int) -> str:
    """Whole sentences of `text` up to max_words; a first sentence longer than that is cut."""
    kept: list[str] = []
    count = 0
    for sentence in _SENTENCE_BREAK.split(text):
        words = len(sentence.split())
        if count + words > max_words:
            break
        kept.append(sentence)
        count += words
    if not kept:
        return " ".join(text.split()[:max_words]) + "…"
    return " ".join(kept)


def _source_lines(placement: Placement, material: SourceMaterial) -> list[str]:
    lines = []
    if material.passage:
        lines += [
            f"Απόσπασμα της πηγής για αυτή τη θέση («{material.passage.heading}»):",
            excerpt(material.passage.text, MAX_PASSAGE_WORDS),
        ]
        group = ASPECT_GROUPS.get(placement.aspect or "")
        if group in _GROUP_NOTES:
            lines.append(_GROUP_NOTES[group])
        medical = medical_flag(material)
        if medical:
            lines.append(_MEDICAL_NOTE if medical == "mostly" else _PARTLY_MEDICAL_NOTE)
    else:
        lines.append(
            "Δεν υπάρχει απόσπασμα για αυτή τη θέση: γράψτε από τη σημασία που δίνεται εδώ, "
            "από το υπόβαθρο και από τη γνωστή σημασία της θέσης."
        )
    if material.background:
        lines.append("Υπόβαθρο από την ίδια πηγή:")
        lines += [
            f"- «{passage.heading}»: {excerpt(passage.text, MAX_BACKGROUND_WORDS)}"
            for passage in material.background
        ]
    return lines


PhraseKey = tuple[str, ...]


@dataclass(frozen=True)
class Habits:
    """What the other texts of the library already overuse; a new text is told to avoid it."""
    # Paragraph openings (plain words) and over-used words and phrases (stems), each to the
    # form it was first written in
    openings: Mapping[PhraseKey, str] = field(default_factory=dict)
    phrases: Mapping[PhraseKey, str] = field(default_factory=dict)


NO_HABITS = Habits()


def build_user_text(
    placement: Placement, habits: Habits = NO_HABITS, material: SourceMaterial = NO_MATERIAL
) -> str:
    index = _KEY_ORDER[placement.key]
    lines = [
        f"Θέση: {placement_line(placement)}",
        *placement_notes(placement),
        "",
        *_source_lines(placement, material),
        "",
        f"Άνοιγμα, με δικά σας λόγια: {OPENING_HINTS[index % len(OPENING_HINTS)]}",
        f"Ονομασία: {NAMING_HINTS[index % len(NAMING_HINTS)]}",
        _SIMILE_ALLOWED if simile_allowed(placement) else _SIMILE_NOT_ALLOWED,
    ]
    if habits.openings:
        openings = list(habits.openings.values())[:MAX_AVOIDED_OPENINGS_IN_PROMPT]
        listed = ", ".join(f"«{opening}»" for opening in openings)
        lines.append(
            f"Μην ξεκινήσετε καμία παράγραφο με: {listed}. "
            "Αυτά τα ανοίγματα τα έχουν ήδη άλλα κείμενα."
        )
    if habits.phrases:
        listed = ", ".join(f"«{phrase}»" for phrase in habits.phrases.values())
        lines.append(
            f"Λέξεις και φράσεις που έχουν ήδη πολλά κείμενα: {listed}. "
            "Μην τις χρησιμοποιήσετε, σε κανέναν τύπο."
        )
    lines += ["", "Γράψτε το κείμενο για αυτή τη θέση, απευθυνόμενοι μόνο σε αυτόν τον άνθρωπο."]
    return "\n".join(lines)


# ── Checks ───────────────────────────────────────────────────────────────────

# Capitalized forms only: «ήλιος» and «ουρανός» are everyday words too
_POINT_FORMS: dict[str, str] = {
    "sun": "Ήλι(?:ος|ο|ου)",
    "moon": "Σελήν(?:η|ης)",
    "mercury": "Ερμ(?:ής|ή)",
    "venus": "Αφροδίτ(?:η|ης)",
    "mars": "Άρη(?:ς)?",
    "jupiter": "Δία(?:ς)?",
    "saturn": "Κρόν(?:ος|ο|ου)",
    "uranus": "Ουραν(?:ός|ό|ού)",
    "neptune": "Ποσειδώνα(?:ς)?",
    # «Πλούτωνάς σας»: the enclitic accent (fix_enclitic_accents)
    "pluto": "Πλούτων(?:ας|α|άς|ά)",
    NODE: "Δεσμ(?:ός|ό|ού|οί|ών)",
    ASCENDANT: "Ωροσκόπ(?:ος|ο|ου)",
    MIDHEAVEN: "Μεσουρ[αά]νημ(?:α|ά|ατος)",
}
_POINT_LABELS = {point: _point_name(point) for point in [*BODIES, ASCENDANT]} | {
    MIDHEAVEN: "Μεσουράνημα",
}
_POINT_MENTION = {
    point: re.compile(rf"(?<!\w)(?:{forms})(?!\w)") for point, forms in _POINT_FORMS.items()
}
# The node's name starts with «Βόρειος»
_POINT_AT_START = {
    point: re.compile(forms + ("|Βόρει(?:ος|ο|ου)" if point == NODE else ""))
    for point, forms in _POINT_FORMS.items()
}
# Skipped before the first real word, so «Με τον Ήλιο...» counts as opening with the planet
_LEADING_FUNCTION_WORDS = frozenset({
    "ο", "η", "το", "οι", "τα", "τον", "την", "τη", "του", "της", "με", "σε",
    "στον", "στην", "στη", "στο", "στους", "στις", "στα",
})


def split_paragraphs(text: str) -> list[str]:
    """Paragraphs with inner whitespace collapsed; any line break separates two paragraphs."""
    return [" ".join(part.split()) for part in re.split(r"\n\s*", text.strip()) if part.strip()]


# A proparoxytone word before an enclitic pronoun takes a second accent on its last syllable
# («ο Πλούτωνάς σας», «τον Πλούτωνά σας»). Among the chart's names only these are
# proparoxytone; «Ήλιος» is read with synizesis and keeps its one accent. Only the pronouns
# that are never articles: «του», «της» after a name are usually the article of a genitive.
_ENCLITIC_ACCENTS = {
    "Πλούτωνας": "Πλούτωνάς",
    "Πλούτωνα": "Πλούτωνά",
    "Μεσουράνημα": "Μεσουράνημά",
}
_ENCLITIC = re.compile(r"(?<!\w)(Πλούτωνας|Πλούτωνα|Μεσουράνημα)(\s+)(σας|μας|μου|σου)(?!\w)")


def fix_enclitic_accents(text: str) -> str:
    return _ENCLITIC.sub(
        lambda match: _ENCLITIC_ACCENTS[match.group(1)] + match.group(2) + match.group(3), text
    )


def normalize_text(text: str) -> str:
    return fix_enclitic_accents("\n\n".join(split_paragraphs(text)))


def word_count(text: str) -> int:
    return len(text.split())


def opening_words(text: str) -> list[str]:
    return re.findall(r"\w+", text)[:OPENING_WORDS]


def opening_key(text: str) -> tuple[str, ...]:
    """The first words without accents or case, so «Όταν» and «οταν» open the same way."""
    return tuple(writing_style._plain(word) for word in opening_words(text))


def _first_content_word(text: str) -> str | None:
    for word in re.findall(r"\w+", text):
        if writing_style._plain(word) not in _LEADING_FUNCTION_WORDS:
            return word
    return None


# Single words the model leans on in its advice, counted by stem so every form counts. Counting
# every word would flag the core vocabulary (ανάγκες, σχέσεις, δουλειά) along with the tics,
# so single words are named here; phrases are found automatically.
TRACKED_STEMS = (
    "ξεχωρ", "χωρο", "ουσια", "καθαρ", "επιφαν", "δοκιμ", "βοηθ", "γυρω", "δωματ",
)
# A stem matches every word it starts, except these, whose forms are listed whole:
# χώρος, not χωράω («χωρούν»)
_TRACKED_FORMS = {"χωρο": re.compile(r"χωρ(ο|οσ|ου|οι|ουσ|ων)")}
SENTENCE_START = "^"
OPENER_WORDS = 2
MIN_PHRASE_CONTENT_WORDS = 2


def _tracked_stem(plain_word: str) -> str | None:
    for stem in TRACKED_STEMS:
        forms = _TRACKED_FORMS.get(stem)
        if forms.fullmatch(plain_word) if forms else plain_word.startswith(stem):
            return stem
    return None

# A simile in about a third of the texts: left alone, nearly every text gets exactly one «σαν»
SIMILE_EVERY = 3
SIMILE_WORD = "σαν"


def _phrase_key(text: str) -> PhraseKey:
    return tuple(writing_style._plain(word)[:STEM_LETTERS] for word in re.findall(r"\w+", text))


def _opener_key(text: str) -> PhraseKey:
    return (SENTENCE_START, *_phrase_key(text))


# Tics the earlier samples showed, avoided from the first text of a run: without them the first
# concurrent batch knows nothing yet. Each one also counts in its other forms.
SEEDED_PHRASES: dict[PhraseKey, str] = {
    ("χωρο",): "χώρο",
    _opener_key("Έχετε σπάνια"): "Έχετε σπάνια",
    _opener_key("Στις σχέσεις"): "Στις σχέσεις",
    _phrase_key("μερικές φορές"): "μερικές φορές",
    ("καθαρ",): "καθαρά",
    ("ουσια",): "ουσία",
    ("βοηθ",): "βοηθά",
    ("γυρω",): "γύρω",
}


def simile_allowed(placement: Placement) -> bool:
    """Whether this placement's text may hold a simile: about one in SIMILE_EVERY.

    crc32, not hash(): the same answer on every run, and unrelated to the hint rotations.
    """
    return zlib.crc32(placement.key.encode()) % SIMILE_EVERY == 0


def simile_count(text: str) -> int:
    return sum(1 for word in re.findall(r"\w+", text) if writing_style._plain(word) == SIMILE_WORD)

# Grammar words and the house words the rules dictate: a phrase made only of these is not a tic
_FUNCTION_WORDS = frozenset(writing_style._plain(word) for word in """
    ο η το οι τα τον την τη του της των τους τις στο στη στην στον στα στους στις σε με για από
    προς και κι να θα δεν δε μη μην που πως ως ότι όταν αν ενώ αλλά όμως ή σας εσάς εσείς μου
    σου μας αυτό αυτή αυτός αυτά αυτές αυτοί αυτού αυτής αυτόν αυτήν αυτών ένα ένας μια μιας
    ενός πιο πολύ πολλά λίγο όλα όλο όλη όλους όλες όλοι κάτι κάποιο κάποια κάποιος κάποιον
    όσα όσο όσες όσοι τι ποιος ποια ποιο είναι είστε έχετε έχει έχουν μπορεί μπορείτε μπορούν
    ήδη ακόμη ακόμα πάντα έτσι εδώ εκεί μόνο επίσης συχνά συνήθως ίσως πιθανόν ενδεχομένως όχι
    ούτε είτε τόσο όπως χωρίς αντί πριν μετά τότε κάθε άλλο άλλη άλλοι άλλους άλλες άλλων άλλον
    κάνει κάνετε κάνουν γίνει γίνεται θέλετε θέλει χρειάζεται χρειάζεστε
    οίκος οίκου οίκο οίκοι οίκων οίκους τομέας τομέα τομείς τομέων
""".split())


@lru_cache(maxsize=2048)
def text_phrases(text: str) -> tuple[tuple[PhraseKey, str], ...]:
    """(stemmed key, as first written) for each tracked word and phrase of the text, once each.

    Three kinds, all compared by stem:
    - a word of TRACKED_STEMS, keyed by that stem
    - a sentence opener: its first OPENER_WORDS words, keyed after SENTENCE_START, when one
      of them is not a grammar word (advice templates show at the start of sentences)
    - a phrase: PHRASE_LENGTHS words in a row inside one sentence, with at least
      MIN_PHRASE_CONTENT_WORDS non-grammar words (one alone is a single word in disguise,
      and single words other than TRACKED_STEMS are core vocabulary)
    Names never count: capitalized words inside a sentence are planets, signs and points,
    which come from the placement. Paragraph openings are tracked on their own.
    """
    found: dict[PhraseKey, str] = {}
    for sentence in writing_style._SENTENCE_END.split(text):
        words = re.findall(r"\w+", sentence)
        plain = [writing_style._plain(word) for word in words]
        for word, plain_word in zip(words, plain):
            stem = _tracked_stem(plain_word)
            if stem:
                found.setdefault((stem,), word)
        stems = [plain_word[:STEM_LETTERS] for plain_word in plain]
        content = [plain_word not in _FUNCTION_WORDS for plain_word in plain]
        named = [index > 0 and word[0].isupper() for index, word in enumerate(words)]
        opener = slice(0, OPENER_WORDS)
        if len(words) >= OPENER_WORDS and not any(named[opener]) and any(content[opener]):
            found.setdefault((SENTENCE_START, *stems[opener]), " ".join(words[opener]))
        for length in PHRASE_LENGTHS:
            for start in range(len(words) - length + 1):
                end = start + length
                if any(named[start:end]) or sum(content[start:end]) < MIN_PHRASE_CONTENT_WORDS:
                    continue
                found.setdefault(tuple(stems[start:end]), " ".join(words[start:end]))
    return tuple(found.items())


def _covered(key: PhraseKey, overused: set[PhraseKey]) -> bool:
    """True when a shorter over-used phrase or tracked word inside `key` already covers it."""
    if len(key) == 1:
        return False
    tracked = [stem for (stem,) in (k for k in overused if len(k) == 1)]
    # A short word («ο») is no stem: «ουσια» starting with it means nothing
    if any(
        word.startswith(stem) or (len(word) >= STEM_LETTERS and stem.startswith(word))
        for word in key for stem in tracked
    ):
        return True
    return any(
        key[start:start + length] in overused
        for length in range(2, len(key))
        for start in range(len(key) - length + 1)
    )


def overused_phrases(texts: Iterable[str]) -> list[tuple[PhraseKey, str, int]]:
    """(key, as first written, texts using it) of the over-used words and phrases, most used first.

    Over-used: in OVERUSED_SHARE of the texts and at least OVERUSED_MIN_TEXTS. A phrase holding
    a shorter over-used one is left out, since avoiding the shorter one avoids it too.
    """
    counts: Counter[PhraseKey] = Counter()
    written: dict[PhraseKey, str] = {}
    total = 0
    for text in texts:
        total += 1
        for key, form in text_phrases(text):
            counts[key] += 1
            written.setdefault(key, form)
    threshold = max(OVERUSED_MIN_TEXTS, math.ceil(OVERUSED_SHARE * total))
    overused = {key for key, count in counts.items() if count >= threshold}
    kept = [key for key in overused if not _covered(key, overused)]
    kept.sort(key=lambda key: (-counts[key], written[key]))
    return [(key, written[key], counts[key]) for key in kept]


def library_habits(texts: Iterable[str]) -> Habits:
    """The seeded tics first, then what the library itself overuses, up to the prompt's cap."""
    texts = list(texts)
    seeded = set(SEEDED_PHRASES)
    found = {
        key: form for key, form, _ in overused_phrases(texts)
        if key not in seeded and not _covered(key, seeded)
    }
    phrases = list({**SEEDED_PHRASES, **found}.items())[:MAX_AVOIDED_PHRASES_IN_PROMPT]
    return Habits(openings=avoided_openings(texts), phrases=dict(phrases))


# Greek letters (monotonic, with tonos and dialytika), spaces, line breaks and the punctuation a
# text may use. Anything else is model junk, never stripped, always regenerated: the model
# sometimes ends the JSON string with «»}» instead of «"}» and then writes its own notes inside
# the field («}END:VEVENT (analysis) 140? count Greek»), drops in a Hebrew or Spanish word («עם»,
# «falta») or hedges the gender («απότομο/η»).
_GREEK_LETTERS = frozenset(
    chr(code) for code in (
        0x0386, *range(0x0388, 0x038B), 0x038C, *range(0x038E, 0x03A2), *range(0x03A3, 0x03CF)
    )
)
_ALLOWED_MARKS = frozenset(" \n\r.,;!«»'():" + chr(0x00B7) + chr(0x0387) + chr(0x2019))
_ALLOWED_CHARACTERS = _GREEK_LETTERS | _ALLOWED_MARKS
MAX_FOREIGN_CHARACTERS_SHOWN = 10


def foreign_characters(text: str) -> list[str]:
    """Characters outside the allowed set, each once, in order of appearance."""
    return list(dict.fromkeys(char for char in text if char not in _ALLOWED_CHARACTERS))


def quotes_balanced(text: str) -> bool:
    depth = 0
    for char in text:
        if char == "«":
            depth += 1
        elif char == "»":
            depth -= 1
            if depth < 0:
                return False
    return depth == 0


def _shown(char: str) -> str:
    return f"«{char}»" if char.isprintable() and not char.isspace() else f"U+{ord(char):04X}"


def character_problems(text: str) -> list[str]:
    problems = []
    foreign = foreign_characters(text)
    if foreign:
        listed = ", ".join(_shown(char) for char in foreign[:MAX_FOREIGN_CHARACTERS_SHOWN])
        problems.append(
            f"ξένοι χαρακτήρες ({listed}): γράψτε μόνο το ελληνικό κείμενο, χωρίς σχόλια, "
            "σημειώσεις ή άλλη γλώσσα"
        )
    if not quotes_balanced(text):
        problems.append("εισαγωγικά « » που δεν ανοίγουν και δεν κλείνουν σωστά")
    return problems


def text_problems(text: str, placement: Placement, habits: Habits = NO_HABITS) -> list[str]:
    """Shape problems of a text, worded for the model: characters, paragraphs, length, opening,
    other points, gender, similes, over-used openings and phrases."""
    problems = character_problems(text)
    paragraphs = len(split_paragraphs(text))
    if not 1 <= paragraphs <= MAX_PARAGRAPHS:
        problems.append(f"{paragraphs} παράγραφοι αντί για μία ή δύο")
    words = word_count(text)
    if not MIN_WORDS <= words <= MAX_WORDS:
        problems.append(f"{words} λέξεις αντί για {MIN_WORDS} έως {MAX_WORDS}")
    first = _first_content_word(text)
    if first and any(_POINT_AT_START[point].fullmatch(first) for point in placement.points):
        problems.append(f"ξεκινά με το όνομα της θέσης («{first}»)")
    others = [
        _POINT_LABELS[point] for point, pattern in _POINT_MENTION.items()
        if point not in placement.points and pattern.search(text)
    ]
    if others:
        problems.append(
            f"άλλα σημεία του χάρτη ({', '.join(others)}): γράψτε μόνο για αυτή τη θέση"
        )
    gendered = [match.group(0) for match in _READER_GENDER.finditer(text)]
    if gendered:
        listed = ", ".join(f"«{phrase}»" for phrase in gendered)
        problems.append(
            f"επίθετα με γένος για τον αναγνώστη ({listed}): γράψτε με ουσιαστικό ή ρήμα"
        )
    similes = simile_count(text)
    if not simile_allowed(placement) and similes:
        problems.append("παρομοίωση με «σαν» σε κείμενο χωρίς παρομοιώσεις")
    elif similes > 1:
        problems.append("περισσότερες από μία παρομοιώσεις με «σαν»")
    problems += [
        f"άνοιγμα που έχουν ήδη άλλα κείμενα («{' '.join(opening_words(paragraph))}»)"
        for paragraph in split_paragraphs(text)
        if opening_key(paragraph) in habits.openings
    ]
    used = [form for key, form in text_phrases(text) if key in habits.phrases]
    if used:
        listed = ", ".join(f"«{form}»" for form in used)
        problems.append(f"λέξεις ή φράσεις που έχουν ήδη πολλά κείμενα ({listed})")
    return problems


def all_problems(text: str, placement: Placement, habits: Habits = NO_HABITS) -> list[str]:
    banned = writing_style.find_banned_phrases(ChartText(text=text), BANNED_PATTERNS)
    return banned + text_problems(text, placement, habits)


# ── Generation ───────────────────────────────────────────────────────────────

@dataclass
class GeneratedText:
    text: str
    usage: dict
    # What the first version contained when the guardrail regenerated it, else empty
    regenerated_for: list[str]
    # What the kept version still contains (the guardrail keeps the retry either way)
    remaining: list[str]


async def generate_text(
    placement: Placement, habits: Habits, material: SourceMaterial = NO_MATERIAL
) -> GeneratedText:
    attempts: list[list[str]] = []

    def check(candidate: ChartText) -> list[str]:
        attempts.append(all_problems(candidate.text, placement, habits))
        return text_problems(candidate.text, placement, habits)

    reading, usage = await writing_style.generate_with_guardrail(
        system_prompt=SYSTEM_PROMPT,
        user_text=build_user_text(placement, habits, material),
        response_model=ChartText,
        banned_patterns=BANNED_PATTERNS,
        extra_checks=[check],
    )
    text = normalize_text(reading.text)
    return GeneratedText(
        text=text,
        usage=usage,
        regenerated_for=attempts[0] if len(attempts) > 1 else [],
        remaining=all_problems(text, placement, habits),
    )


TRANSIENT_ERRORS = (openai.APIConnectionError, openai.RateLimitError, openai.InternalServerError)


async def call_with_retries(
    call: Callable[[], Awaitable[T]],
    *,
    attempts: int = MAX_ATTEMPTS,
    base_delay: float = BACKOFF_SECONDS,
    sleep: Callable[[float], Awaitable[None]] = asyncio.sleep,
) -> T:
    """Run call(), retrying transient OpenAI errors with exponential backoff; others raise."""
    for attempt in range(1, attempts):
        try:
            return await call()
        except TRANSIENT_ERRORS as error:
            delay = base_delay * 2 ** (attempt - 1)
            logger.warning("%s, retrying in %.0f s", type(error).__name__, delay)
            await sleep(delay)
    return await call()


# ── Library file ─────────────────────────────────────────────────────────────

def load_texts(path: Path) -> dict[str, str]:
    """The texts already in the library file; a malformed file raises rather than be overwritten."""
    if not path.exists():
        return {}
    return dict(json.loads(path.read_text(encoding="utf-8"))["texts"])


def save_texts(path: Path, texts: Mapping[str, str]) -> None:
    """Write atomically, so a crash mid-write never leaves half a file."""
    content = json.dumps({"texts": dict(sorted(texts.items()))}, ensure_ascii=False, indent=2)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(content + "\n", encoding="utf-8", newline="\n")
    os.replace(temporary, path)


def select_keys(
    keys: Iterable[str], existing: Mapping[str, str], force: bool
) -> tuple[list[str], list[str]]:
    """(keys to generate, keys skipped because they already have a text), duplicates dropped."""
    unique = list(dict.fromkeys(keys))
    if force:
        return unique, []
    return (
        [key for key in unique if key not in existing],
        [key for key in unique if key in existing],
    )


def avoided_openings(texts: Iterable[str]) -> dict[tuple[str, ...], str]:
    """Paragraph openings (plain words: as written) that AVOIDED_OPENING_MIN_TEXTS texts share.

    Both paragraphs count: a page shows a few dozen texts, so a stock opening of the second
    paragraph stands out as much as one of the first.
    """
    written: dict[tuple[str, ...], str] = {}
    counts: dict[tuple[str, ...], int] = {}
    for text in texts:
        paragraphs = {opening_key(paragraph): paragraph for paragraph in split_paragraphs(text)}
        for key, paragraph in paragraphs.items():
            written.setdefault(key, " ".join(opening_words(paragraph)))
            counts[key] = counts.get(key, 0) + 1
    shared = [key for key, count in counts.items() if count >= AVOIDED_OPENING_MIN_TEXTS]
    shared.sort(key=lambda key: -counts[key])
    return {key: written[key] for key in shared}


# ── Run ──────────────────────────────────────────────────────────────────────

@dataclass
class RunResult:
    generated: list[str] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)
    failed: list[str] = field(default_factory=list)
    regenerated: dict[str, list[str]] = field(default_factory=dict)
    remaining: dict[str, list[str]] = field(default_factory=dict)
    usage: dict[str, int] = field(default_factory=lambda: dict.fromkeys(USAGE_KEYS, 0))
    # Generated keys written from a verified source passage, and the ones written in-house
    sourced: list[str] = field(default_factory=list)
    in_house: list[str] = field(default_factory=list)
    # Sourced keys whose passage is mostly or partly about illness
    medical: list[str] = field(default_factory=list)


async def run(
    keys: Iterable[str],
    output: Path,
    *,
    source: Mapping[str, Passage] | None = None,
    force: bool = False,
    concurrency: int = DEFAULT_CONCURRENCY,
) -> RunResult:
    texts = load_texts(output)
    todo, skipped = select_keys(keys, texts, force)
    result = RunResult(skipped=skipped)
    semaphore = asyncio.Semaphore(concurrency)

    async def produce(key: str) -> None:
        async with semaphore:
            placement = ALL_PLACEMENTS[key]
            habits = library_habits(text for other, text in texts.items() if other != key)
            material = source_material(placement, source or {})
            try:
                generated = await call_with_retries(
                    lambda: generate_text(placement, habits, material)
                )
            except Exception:
                # One bad text must not stop the other 489; rerun it with --keys
                logger.exception("%s failed, continuing", key)
                result.failed.append(key)
                return
            texts[key] = generated.text
            save_texts(output, texts)
            result.generated.append(key)
            (result.sourced if material.passage else result.in_house).append(key)
            if medical_flag(material):
                result.medical.append(key)
            for usage_key in USAGE_KEYS:
                result.usage[usage_key] += generated.usage.get(usage_key, 0)
            if generated.regenerated_for:
                result.regenerated[key] = generated.regenerated_for
            if generated.remaining:
                result.remaining[key] = generated.remaining
            logger.info("%s done, %d words", key, word_count(generated.text))

    await asyncio.gather(*(produce(key) for key in todo))
    return result


# ── Fix ──────────────────────────────────────────────────────────────────────

def fix_plan(texts: Mapping[str, str]) -> dict[str, list[str]]:
    """Library keys whose text has a problem, with the problems.

    Tics are left out (NO_HABITS): they matter while a library is being written, not as
    defects of a finished text.
    """
    plan = {}
    for key, text in texts.items():
        placement = ALL_PLACEMENTS.get(key)
        if placement is None:
            continue
        problems = all_problems(text, placement, NO_HABITS)
        if problems:
            plan[key] = problems
    return plan


def problem_category(problem: str) -> str:
    """The problem without its details: «198 λέξεις αντί για...» becomes «N λέξεις αντί για...»."""
    return re.sub(r"^\d+", "N", problem.split(" (")[0])


def format_fix_plan(plan: Mapping[str, list[str]], library_size: int) -> str:
    by_category: dict[str, list[str]] = {}
    for key, problems in plan.items():
        for category in dict.fromkeys(problem_category(problem) for problem in problems):
            by_category.setdefault(category, []).append(key)
    lines = [
        f"--fix would regenerate {len(plan)} of {library_size} keys "
        "(a key can have several problems):"
    ]
    for category, keys in sorted(by_category.items(), key=lambda item: (-len(item[1]), item[0])):
        lines.append(f"  {category}: {len(keys)}")
        lines.append(f"    {', '.join(sorted(keys))}")
    return "\n".join(lines)


@dataclass
class FixResult:
    planned: dict[str, list[str]] = field(default_factory=dict)
    fixed: list[str] = field(default_factory=list)
    # Key: problems of the kept text, when some are left
    still_failing: dict[str, list[str]] = field(default_factory=dict)
    usage: dict[str, int] = field(default_factory=lambda: dict.fromkeys(USAGE_KEYS, 0))


async def fix(
    output: Path,
    *,
    source: Mapping[str, Passage] | None = None,
    concurrency: int = DEFAULT_CONCURRENCY,
    attempts: int = FIX_ATTEMPTS,
) -> FixResult:
    """Regenerate every library text with a problem, up to `attempts` times each.

    The attempt with the fewest problems replaces the text, unless it has more problems than
    the text had; a clean attempt stops early. The file is saved after every key.
    """
    texts = load_texts(output)
    result = FixResult(planned=fix_plan(texts))
    semaphore = asyncio.Semaphore(concurrency)

    async def repair(key: str) -> None:
        async with semaphore:
            placement = ALL_PLACEMENTS[key]
            habits = library_habits(text for other, text in texts.items() if other != key)
            material = source_material(placement, source or {})
            best: tuple[str, list[str]] | None = None
            for attempt in range(1, attempts + 1):
                try:
                    generated = await call_with_retries(
                        lambda: generate_text(placement, habits, material)
                    )
                except Exception:
                    logger.exception("%s attempt %d failed", key, attempt)
                    continue
                for usage_key in USAGE_KEYS:
                    result.usage[usage_key] += generated.usage.get(usage_key, 0)
                problems = all_problems(generated.text, placement, NO_HABITS)
                if best is None or len(problems) < len(best[1]):
                    best = (generated.text, problems)
                if not problems:
                    break
            replaced = best is not None and len(best[1]) <= len(result.planned[key])
            if replaced:
                texts[key] = best[0]
                save_texts(output, texts)
            remaining = best[1] if replaced else result.planned[key]
            if remaining:
                result.still_failing[key] = remaining
            else:
                result.fixed.append(key)
            logger.info("%s: %d problems left", key, len(remaining))

    await asyncio.gather(*(repair(key) for key in result.planned))
    return result


def format_fix_report(result: FixResult, output: Path) -> str:
    usage = result.usage
    lines = [
        f"Library: {output}",
        f"Fix: {len(result.planned)} keys had problems, {len(result.fixed)} fixed, "
        f"{len(result.still_failing)} still failing",
    ]
    lines += [
        f"  {key}: {'; '.join(problems)}" for key, problems in sorted(result.still_failing.items())
    ]
    if result.still_failing:
        lines.append(
            f"Rerun with --fix, or redo by hand: --keys {','.join(sorted(result.still_failing))}"
            " --force"
        )
    lines.append(
        f"Tokens: prompt {usage['prompt_tokens']:,}, completion {usage['completion_tokens']:,}, "
        f"total {usage['total_tokens']:,}"
    )
    return "\n".join(lines)


# ── Report ───────────────────────────────────────────────────────────────────

def word_stats(texts: Iterable[str]) -> tuple[int, float, int] | None:
    """(min, average, max) word count, or None without texts."""
    counts = [word_count(text) for text in texts]
    if not counts:
        return None
    return min(counts), sum(counts) / len(counts), max(counts)


def shared_openings(
    texts: Mapping[str, str], paragraph: int = 0, min_texts: int = SHARED_OPENING_MIN_TEXTS
) -> list[tuple[str, list[str]]]:
    """(opening as first written, sorted keys) of one paragraph that min_texts or more share."""
    groups: dict[tuple[str, ...], list[str]] = {}
    written: dict[tuple[str, ...], str] = {}
    for key in sorted(texts):
        paragraphs = split_paragraphs(texts[key])
        if len(paragraphs) <= paragraph:
            continue
        opening = opening_key(paragraphs[paragraph])
        groups.setdefault(opening, []).append(key)
        written.setdefault(opening, " ".join(opening_words(paragraphs[paragraph])))
    shared = [
        (written[opening], keys) for opening, keys in groups.items() if len(keys) >= min_texts
    ]
    return sorted(shared, key=lambda item: (-len(item[1]), item[0]))


def _phrase_label(key: PhraseKey, form: str) -> str:
    if len(key) == 1:
        return f"{key[0]}- («{form}»)"
    if key[0] == SENTENCE_START:
        return f"«{form}» (sentence start)"
    return f"«{form}»"


def source_coverage(source: Mapping[str, Passage]) -> tuple[int, int, int]:
    """Library keys (with a verified passage, in-house by design, without a verified passage)."""
    keys = [passage_key(placement) for placement in ALL_PLACEMENTS.values()]
    by_design = sum(1 for key in keys if key is None)
    verified = sum(1 for key in keys if key is not None and key in source)
    return verified, by_design, len(keys) - by_design - verified


def format_report(
    result: RunResult,
    texts: Mapping[str, str],
    keys: Iterable[str],
    output: Path,
    source: Mapping[str, Passage] | None = None,
) -> str:
    scope = [key for key in dict.fromkeys(keys) if key in texts]
    lines = [
        f"Library: {output} ({len(texts)} of {len(ALL_KEYS)} texts)",
        f"Generated: {len(result.generated)}   Skipped: {len(result.skipped)}   "
        f"Failed: {len(result.failed)}",
        f"Source: {len(result.sourced)} generated keys used a verified passage "
        f"({len(result.medical)} of them mostly or partly medical), "
        f"{len(result.in_house)} in-house",
    ]
    if result.failed:
        lines.append(f"Failed keys (rerun with --keys): {','.join(sorted(result.failed))}")
    if source is not None:
        verified, by_design, missing = source_coverage(source)
        lines.append(
            f"Source coverage of the library: {verified} keys with a verified passage, "
            f"{by_design} in-house by design (Pluto, North Node), {missing} without one"
        )

    stats = word_stats(texts[key] for key in scope)
    if stats:
        low, average, high = stats
        lines.append(
            f"Words ({len(scope)} texts of the selected keys): "
            f"min {low}, avg {average:.1f}, max {high}"
        )

    for title, problems_by_key in (
        ("Regenerated once by the guardrail", result.regenerated),
        ("Still with problems after the retry", result.remaining),
    ):
        lines.append(f"{title}: {len(problems_by_key)}")
        lines += [
            f"  {key}: {'; '.join(problems)}" for key, problems in sorted(problems_by_key.items())
        ]

    for paragraph, which in ((0, "text"), (1, "second-paragraph")):
        shared = shared_openings(texts, paragraph)
        lines.append(
            f"3-word {which} openings shared by {SHARED_OPENING_MIN_TEXTS}+ texts: "
            f"{len(shared) or 'none'}"
        )
        lines += [
            f"  «{opening}» x{len(opening_keys)}: {', '.join(opening_keys)}"
            for opening, opening_keys in shared
        ]

    overused = overused_phrases(texts.values())
    lines.append(
        f"Over-used words and phrases (in {OVERUSED_SHARE:.0%}+ of the library, at least "
        f"{OVERUSED_MIN_TEXTS} texts): {len(overused) or 'none'}"
    )
    lines += [
        f"  {_phrase_label(key, form)} x{count} ({count / len(texts):.0%})"
        for key, form, count in overused[:MAX_PHRASES_IN_REPORT]
    ]
    seeded_use = Counter(
        key for text in texts.values() for key, _ in text_phrases(text) if key in SEEDED_PHRASES
    )
    lines.append(
        "Seeded avoid list, texts still using each: "
        + ", ".join(f"«{form}» x{seeded_use[key]}" for key, form in SEEDED_PHRASES.items())
    )

    similes = [key for key in scope if simile_count(texts[key])]
    allowed = [key for key in scope if simile_allowed(ALL_PLACEMENTS[key])]
    lines.append(
        f"Similes with «{SIMILE_WORD}»: {len(similes)} of {len(scope)} texts of the selected keys "
        f"({', '.join(similes) or 'none'}); allowed by the rotation in {len(allowed)} "
        f"({', '.join(allowed) or 'none'})"
    )

    usage = result.usage
    lines.append(
        f"Tokens: prompt {usage['prompt_tokens']:,}, completion {usage['completion_tokens']:,}, "
        f"total {usage['total_tokens']:,}"
    )
    if result.generated:
        per_text = usage["total_tokens"] / len(result.generated)
        lines.append(
            f"  {per_text:,.0f} per text, "
            f"about {per_text * len(ALL_KEYS):,.0f} for all {len(ALL_KEYS)}"
        )
    return "\n".join(lines)


def source_line(placement: Placement, source: Mapping[str, Passage]) -> str:
    """Which source passages a placement's prompt carries, for the review file."""
    material = source_material(placement, source)
    line = f"Source: {material.passage.heading if material.passage else 'in-house'}"
    medical = medical_flag(material)
    if medical:
        line += f" [{medical} medical]"
    if material.background:
        line += f" (background: {'; '.join(passage.heading for passage in material.background)})"
    return line


def write_markdown(
    path: Path,
    keys: Iterable[str],
    texts: Mapping[str, str],
    source: Mapping[str, Passage] | None = None,
) -> None:
    """The selected keys' texts for review: the key as a heading, the text, its source line."""
    sections = ["# Chart texts"]
    for key in dict.fromkeys(keys):
        if key not in texts:
            continue
        section = f"## {key}\n\n{texts[key]}"
        if source is not None:
            section += f"\n\n{source_line(ALL_PLACEMENTS[key], source)}"
        sections.append(section)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n\n".join(sections) + "\n", encoding="utf-8", newline="\n")


# ── CLI ──────────────────────────────────────────────────────────────────────

def parse_args(argv: list[str] | None) -> tuple[argparse.Namespace, list[str]]:
    parser = argparse.ArgumentParser(
        prog="python -m scripts.generate_chart_texts",
        description="Generate the instant natal chart texts (fe/src/content/chart-texts.json).",
    )
    which = parser.add_mutually_exclusive_group(required=True)
    which.add_argument(
        "--sample", action="store_true", help=f"the {len(SAMPLE_KEYS)} review keys"
    )
    which.add_argument("--all", action="store_true", help=f"all {len(ALL_KEYS)} keys")
    which.add_argument("--keys", help="comma-separated keys, e.g. sun-leo,moon-house-4")
    which.add_argument(
        "--fix",
        action="store_true",
        help=f"regenerate every library text with a problem, up to {FIX_ATTEMPTS} attempts each",
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="with --fix: list the keys and problems, no calls"
    )
    parser.add_argument(
        "--force", action="store_true", help="regenerate keys that already have a text"
    )
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="library JSON file")
    parser.add_argument(
        "--source", type=Path, default=DEFAULT_SOURCE, help="extracted source passages (JSON)"
    )
    parser.add_argument("--markdown", type=Path, help="also write the selected keys' texts here")
    parser.add_argument("--concurrency", type=int, default=DEFAULT_CONCURRENCY)
    parser.add_argument(
        "--reasoning-effort", help="override OPENAI_REASONING_EFFORT for this run, e.g. medium"
    )
    args = parser.parse_args(argv)

    if args.dry_run and not args.fix:
        parser.error("--dry-run only goes with --fix")
    if args.sample:
        keys = list(SAMPLE_KEYS)
    elif args.all or args.fix:
        keys = list(ALL_KEYS)
    else:
        keys = [key.strip() for key in args.keys.split(",") if key.strip()]
        unknown = [key for key in keys if key not in ALL_PLACEMENTS]
        if unknown:
            parser.error(f"unknown keys: {', '.join(unknown)}")
    if args.concurrency < 1:
        parser.error("--concurrency must be at least 1")
    return args, keys


def main(argv: list[str] | None = None) -> int:
    for stream in (sys.stdout, sys.stderr):
        # Windows consoles default to a legacy code page that cannot print Greek
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s"
    )
    logging.getLogger("httpx").setLevel(logging.WARNING)

    args, keys = parse_args(argv)
    if args.reasoning_effort:
        settings.openai_reasoning_effort = args.reasoning_effort

    if args.fix and args.dry_run:
        texts = load_texts(args.output)
        print(format_fix_plan(fix_plan(texts), len(texts)))
        return 0
    if not args.source.exists():
        print(f"Source file not found: {args.source} (extract the source first)", file=sys.stderr)
        return 2
    source = load_source(args.source)
    if args.fix:
        fixed = asyncio.run(fix(args.output, source=source, concurrency=args.concurrency))
        print(format_fix_report(fixed, args.output))
        return 1 if fixed.still_failing else 0
    result = asyncio.run(run(
        keys, args.output, source=source, force=args.force, concurrency=args.concurrency
    ))
    texts = load_texts(args.output)
    if args.markdown:
        write_markdown(args.markdown, keys, texts, source)
    print(format_report(result, texts, keys, args.output, source))
    return 1 if result.failed else 0


if __name__ == "__main__":
    sys.exit(main())
