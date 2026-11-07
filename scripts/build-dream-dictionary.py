"""Build fe/public/data/dream-dictionary.json from the Markdown dream dictionary.

Input format: one entry per "## HEADWORD" heading (uppercase, unaccented), followed by
one or more paragraphs. A paragraph "Δες επίσης: Α, Β." lists related headwords.

Usage:
    python scripts/build-dream-dictionary.py [input.md] [output.json]

Defaults: docs/dictionary.md -> fe/public/data/dream-dictionary.json
"""

import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_INPUT = REPO_ROOT / "docs/dictionary.md"
DEFAULT_OUTPUT = REPO_ROOT / "fe/public/data/dream-dictionary.json"
COMBINING_ACUTE = unicodedata.lookup("COMBINING ACUTE ACCENT")

# Headwords whose display form cannot be derived from the text.
TERM_OVERRIDES = {
    "ΓΕΡΑΝΟΣ -ΜΗΧΑΝΗΜΑ": ("Γερανός (μηχάνημα)", ["γερανός"]),
    "ΓΕΡΑΝΟΣ -ΠΟΥΛΙ": ("Γερανός (πουλί)", ["γερανός"]),
    "ΑΓΙΑ ΤΡΑΠΕΖΑ": ("Αγία Τράπεζα", []),
}

# Curated search synonyms: words people type that the headword does not cover. The search
# already handles accents, plurals and diminutives, so only list genuinely different words.
SYNONYMS = {
    "ΛΕΦΤΑ": ["χρήματα", "χαρτονομίσματα", "μετρητά"],
    "ΚΕΡΜΑΤΑ": ["ψιλά"],
    "ΝΕΚΡΟΣ": ["πεθαμένος", "πεθαμένη", "πεθαμένοι"],
    "ΘΑΝΑΤΟΣ": ["πεθαίνω", "πέθανε", "πεθαίνει"],
    "ΓΑΜΟΣ": ["παντρεύομαι", "παντρεύτηκα", "παντρειά", "γαμπρός"],
    "ΕΓΚΥΟΣ": ["εγκυμοσύνη", "εγκυμονώ"],
    "ΓΕΝΝΑ": ["γέννηση", "γεννάω", "τοκετός"],
    "ΚΑΙΩ": ["καίγομαι", "καίγεται", "κάηκε", "κάψιμο"],
    "ΣΚΥΛΟΣ": ["κουτάβι", "σκύλα"],
    "ΓΑΤΑ": ["γάτος"],
    "ΑΛΟΓΟ": ["φοράδα"],
    "ΦΙΔΙ": ["οχιά", "οχιές"],
    "ΜΑΛΛΙΑ": ["τρίχες"],
    "ΜΩΡΟ": ["βρέφος", "νεογέννητο"],
    "ΜΑΝΑ": ["μητέρα", "μαμά"],
    "ΠΑΤΕΡΑΣ": ["μπαμπάς"],
    "ΑΔΕΛΦΙΑ": ["αδερφός", "αδερφή", "αδέρφια"],
    "ΞΑΔΕΛΦΙΑ": ["ξάδερφος", "ξαδέρφη", "ξαδέρφια"],
    "ΣΥΖΥΓΟΣ": ["σύντροφος"],
    "ΕΡΑΣΤΗΣ": ["ερωμένη", "ερωμένος"],
    "ΦΙΛΙ": ["φιλάω", "φιλιέμαι"],
    "ΕΡΩΤΑΣ": ["σεξ"],
    "ΑΠΑΤΗ": ["απιστία"],
    "ΧΩΡΙΣΜΟΣ": ["χωρίζω", "χωρίσαμε"],
    "ΑΥΤΟΚΙΝΗΤΟ": ["αμάξι", "αμάξια", "όχημα"],
    "ΑΕΡΟΠΛΑΝΟ": ["αεροσκάφος", "πτήση"],
    "ΠΕΤΩ": ["πετάω", "πετάς", "πετούσα"],
    "ΠΕΣΙΜΟ": ["πέφτω", "έπεσα", "πτώση"],
    "ΠΝΙΓΜΟΣ": ["πνίγομαι", "πνίγηκα"],
    "ΤΡΕΝΟ": ["τραίνο"],
    "ΘΑΛΑΣΣΑ": ["κύματα", "κύμα"],
    "ΒΡΟΧΗ": ["βρέχει"],
    "ΧΙΟΝΙ": ["χιονίζει"],
    "ΑΙΜΑ": ["αιμορραγία"],
    "ΠΛΗΓΗ": ["τραύμα", "τραυματισμός"],
    "ΑΡΡΩΣΤΟΣ": ["αρρώστια", "ασθένεια"],
    "ΕΓΧΕΙΡΙΣΗ": ["χειρουργείο"],
    "ΕΚΚΛΗΣΙΑ": ["ναός"],
    "ΠΑΠΑΣ": ["ιερέας"],
    "ΔΙΑΒΟΛΟΣ": ["σατανάς", "δαίμονας"],
    "ΧΡΥΣΟΣ": ["χρυσάφι"],
    "ΔΟΛΟΦΟΝΟΣ": ["φόνος", "δολοφονία", "σκοτώνω"],
    "ΟΠΛΟ": ["πιστόλι", "περίστροφο"],
    "ΜΑΧΑΙΡΙ": ["μαχαίρωμα"],
    "ΚΛΕΒΩ": ["κλέφτης", "κλοπή", "ληστεία"],
    "ΚΥΝΗΓΙ": ["κυνηγάω", "κυνηγούν"],
    "ΧΑΝΩ": ["χάθηκα", "χαμένος"],
    "ΕΡΓΑΣΙΑ": ["δουλειά", "εργάζομαι"],
    "ΤΗΛΕΦΩΝΟ": ["κινητό"],
    "ΤΑΞΙΔΙ": ["ταξιδεύω"],
    "ΠΟΝΤΙΚΟΣ": ["ποντίκι", "αρουραίος"],
    "ΓΟΥΡΟΥΝΙ": ["χοίρος"],
    "ΦΑΓΗΤΟ": ["τρώω", "φαΐ"],
    "ΚΑΦΕΣ": ["φλιτζάνι"],
    "ΚΑΠΝΙΖΩ": ["τσιγάρο", "τσιγάρα"],
    "ΜΕΘΥΣΙ": ["μεθάω", "μεθυσμένος"],
    "ΚΑΤΟΥΡΩ": ["τουαλέτα", "ούρα", "κατούρημα"],
    "ΑΚΑΘΑΡΣΙΕΣ": ["κόπρανα", "περιττώματα"],
    "ΚΛΑΜΑ": ["κλαίω", "έκλαιγα"],
    "ΓΕΛΙΟ": ["γελάω"],
    "ΣΧΟΙΝΙ": ["σκοινί"],
    "ΚΑΘΡΕΦΤΗΣ": ["καθρέπτης"],
    "ΑΥΓΟ": ["αβγό"],
    "ΝΤΟΜΑΤΑ": ["τομάτα"],
}

# Accented forms of headwords that never appear (in that form) in the text.
MANUAL_ACCENTS = """
άγαμος αγκαλιά αγοράζω αγρυπνία αγώνας αθώωση ακονίζω ακρίδα άλεσμα αλογόμυγα αναπνοή
ανεβαίνω ανεμώνα άνοδος αόρατος αποχαιρετισμός αργαλειός αρραβώνας αυγό βαδίζω βασανισμός
βαφή βδέλλα βήχας βιασμός βιβλίο βουτιά βρισιά βυζί βύσσινο γάντι γδύσιμο γεύμα γονατίζω
γράφω γύμνια δάγκωμα δέρνω διαγωνισμός διήγηση δίχτυ δίψα εγκαταλείπω εγχείριση εξώστης
επιστρέφω εραστής εργασία ευγένεια ζαρτιέρα ζωγραφίζω ηλιοτρόπιο θαυμασμός θείος θερίζω
θησαυρός θόρυβος θρανίο θρήνος θρόνος θυμός ιδρώτας ιππόδρομος κάθοδος καθρέφτης καίω
καλαμάρι καλόγρια καπνίζω κάπνισμα κατουρώ κατσαρίδα κατσίκα καφές κεράσι κέρατο κλέβω
κόβω κολύμπι κόσκινο κουκουνάρι κούρεμα κουτσομπολιό κρότος κρύβω λαβύρινθος λάκκος
λεκές λογαριασμός λόφος λύνω μαγεία μαθηματικά μαία μακιγιάζ μαϊντανός μεθύσι μελιτζάνα
μετακόμιση μοιρασιά μπακαλιάρος μπουκάλι μυρμήγκι μυρωδιά ναργιλές νεότητα νηστεία
νιαούρισμα νόμισμα ξάπλα ξαστεριά ξεθάβω ξενιτιά ξιφίας ξυπνώ οβελίας οδήγηση οδύνη
ομολογώ παιδαγωγός παντόφλα παραλυσία πασατέμπος πατάτα περαστικός περικυκλώνω
περίπατος πέσιμο πεταλούδα πετώ πίνακας πλαστό πληρωμή πνιγμός πολλαπλασιασμός
πορτοκάλι προσευχή πρωί πυροβολισμός ράψιμο ρηχός σαλιγκάρι σάλπιγγα σανός σαρδέλα
σηκώνω σημαδεύω σιδέρωμα σκάβω σκεπάζω σπάσιμο σταυρός τραγούδι τριαντάφυλλο
τσούγκρισμα τσουκνίδα φασιανός φορέματα φόρος φρούτο χάδια χαλκός χάνω χάρτης χρεοκοπία
χρυσός χτένισμα ψάλλω ψάρεμα ψάχνω ψείρα ψήσιμο ψίθυρος ψύχρα
δένω οικογένεια συμπέθεροι υπόσχεση
""".split()

SEE_ALSO = re.compile(r"^Δες επίσης:?\s*(.+?)\.?$")
# Inline references are written in capitals: "Ισχύουν τα αντίθετα από το ΔΕΝΩ."
INLINE_REFERENCE = re.compile(r"\b[Α-ΩΪΫ]{3,}\b")
SENTENCE_BREAK = re.compile(r"(?<=[.!;…])\s+(?=[«\"(]?[Α-ΩΆΈΉΊΌΎΏΪΫ])")
CONDITION_START = re.compile(r"^(Αν|Εάν|Όταν)\s")
# A comma followed by one of these usually ends the condition and starts the omen.
CONSEQUENCE_STARTERS = {
    "θα", "σημαίνει", "σημαίνουν", "δείχνει", "δείχνουν", "είναι", "σε", "περίμενε",
    "έρχεται", "έρχονται", "κινδυνεύεις", "πρόσεξε", "μην", "προμηνύει", "προμηνύουν",
    "προειδοποιεί", "προβλέπει", "πρόκειται", "αναμένεται", "συμβολίζει", "τότε",
}
# A comma followed by one of these starts a second, contrasting clause ("…, ενώ αν …").
CLAUSE_BREAKS = {"ενώ", "αλλά", "όμως", "αντίθετα"}

GREEK_TO_LATIN = dict(
    zip("αβγδεζηθικλμνξοπρστυφχψω", "a v g d e z i th i k l m n x o p r s t y f ch ps o".split())
)


def fold(text: str) -> str:
    stripped = "".join(c for c in unicodedata.normalize("NFD", text) if not unicodedata.combining(c))
    return stripped.lower().replace("ς", "σ")


def slugify(term: str) -> str:
    folded = fold(term).replace("ου", "ou")
    latin = "".join(GREEK_TO_LATIN.get(c, c) for c in folded)
    return re.sub(r"[^a-z0-9]+", "-", latin).strip("-")


def capitalize(text: str) -> str:
    return text[:1].upper() + text[1:]


def parse_entries(markdown: str) -> list[tuple[str, list[str]]]:
    entries = []
    for chunk in re.split(r"^## ", markdown, flags=re.M)[1:]:
        heading, _, body = chunk.partition("\n")
        paragraphs = [" ".join(p.split()) for p in body.strip().split("\n\n") if p.strip()]
        entries.append((heading.strip(), paragraphs))
    return entries


def build_word_forms(texts: list[str]) -> dict[str, Counter]:
    forms: dict[str, Counter] = defaultdict(Counter)
    for text in texts:
        for word in re.findall(r"[^\W\d_]+", text):
            forms[fold(word)][word.lower()] += 1
    return forms


def best_form(forms: Counter) -> str:
    """Most frequent form with exactly one accent: skips "αυτοκίνητό" (from "αυτοκίνητό σου")
    and unaccented copies. Ties keep first-seen order."""

    def score(form: str) -> tuple[bool, int]:
        accents = unicodedata.normalize("NFD", form).count(COMBINING_ACUTE)
        return accents == 1, forms[form]

    return max(forms, key=score)


def accent_word(word: str, own_forms: dict, corpus_forms: dict, manual: dict) -> str | None:
    key = fold(word)
    if key in manual:
        return manual[key]
    for source in (own_forms, corpus_forms):
        if key in source:
            return best_form(source[key])
    return None


def display_term(heading: str, body: str, corpus_forms: dict, manual: dict) -> str:
    own_forms = build_word_forms([body])
    words = heading.split()
    accented = [accent_word(w, own_forms, corpus_forms, manual) for w in words]
    missing = [w for w, a in zip(words, accented) if a is None]
    if missing:
        raise ValueError(f"No accented form for {missing} in heading {heading!r}")
    return capitalize(" ".join(accented))


def split_condition(sentence: str) -> tuple[str, str] | None:
    """Splits "Αν X, θα Y." into ("Αν X", "θα Y.")."""
    parts = sentence.split(", ")
    if len(parts) < 2:
        return None
    for i in range(1, len(parts)):
        next_word = parts[i].split(" ", 1)[0].lower()
        if next_word in CLAUSE_BREAKS:
            break
        if next_word in CONSEQUENCE_STARTERS:
            return ", ".join(parts[:i]), ", ".join(parts[i:])
    return parts[0], ", ".join(parts[1:])


def structure_body(paragraphs: list[str]) -> dict:
    """General sentences before the first condition become `meaning`; each "Αν …" sentence
    starts a scenario, and the sentences after it stay with it, so reading order is kept."""
    sentences = [s for p in paragraphs for s in SENTENCE_BREAK.split(p)]
    intro: list[str] = []
    scenarios: list[dict] = []
    for sentence in sentences:
        split = split_condition(sentence) if CONDITION_START.match(sentence) else None
        if split:
            scenarios.append({"context": split[0], "meaning": split[1]})
        elif scenarios:
            scenarios[-1]["meaning"] += " " + sentence
        else:
            intro.append(sentence)

    result: dict = {}
    if intro:
        result["meaning"] = " ".join(intro)
    if scenarios:
        result["scenarios"] = scenarios
    return result


def build(markdown: str) -> dict:
    parsed = parse_entries(markdown)
    # "Δες επίσης" lines are uppercase, so they would add unaccented forms.
    corpus_forms = build_word_forms(
        [p for _, paragraphs in parsed for p in paragraphs if not SEE_ALSO.match(p)]
    )
    manual = {fold(w): w for w in MANUAL_ACCENTS}
    unknown_synonyms = set(SYNONYMS) - {heading for heading, _ in parsed}
    if unknown_synonyms:
        raise ValueError(f"SYNONYMS has headings missing from the text: {sorted(unknown_synonyms)}")

    entries = []
    id_by_heading: dict[str, str] = {}
    pending_related: list[tuple[dict, list[str], list[str]]] = []
    for heading, paragraphs in parsed:
        see_also = [m.group(1) for p in paragraphs if (m := SEE_ALSO.match(p))]
        content = [p for p in paragraphs if not SEE_ALSO.match(p)]

        if heading in TERM_OVERRIDES:
            term, aliases = TERM_OVERRIDES[heading]
        else:
            term, aliases = display_term(heading, " ".join(content), corpus_forms, manual), []

        entry_id = slugify(term)
        if entry_id in id_by_heading.values():
            raise ValueError(f"Duplicate id {entry_id!r} for heading {heading!r}")
        id_by_heading[fold(heading)] = entry_id

        entry = {"id": entry_id, "term": term}
        aliases = aliases + SYNONYMS.get(heading, [])
        if aliases:
            entry["aliases"] = aliases
        entry.update(structure_body(content))
        entries.append(entry)
        see_also_refs = [r.strip() for line in see_also for r in line.split(",") if r.strip()]
        inline_refs = [word for p in content for word in INLINE_REFERENCE.findall(p)]
        pending_related.append((entry, see_also_refs, inline_refs))

    for entry, see_also_refs, inline_refs in pending_related:
        unknown = [r for r in see_also_refs if fold(r) not in id_by_heading]
        if unknown:
            raise ValueError(f"{entry['term']}: unknown 'Δες επίσης' targets {unknown}")
        # Capitalised words that are not headwords (e.g. acronyms) are not references.
        refs = see_also_refs + [r for r in inline_refs if fold(r) in id_by_heading]
        related = [id_by_heading[fold(r)] for r in refs]
        related = [r for r in dict.fromkeys(related) if r != entry["id"]]
        if related:
            entry["related"] = related

    return {"version": 1, "entries": entries}


def main() -> None:
    if len(sys.argv) > 3:
        sys.exit(__doc__)
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_INPUT
    output = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_OUTPUT
    dictionary = build(unicodedata.normalize("NFC", source.read_text(encoding="utf-8")))
    output.write_text(
        json.dumps(dictionary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n"
    )
    print(f"Wrote {len(dictionary['entries'])} entries to {output}")


if __name__ == "__main__":
    main()
