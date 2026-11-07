"""
Writing guardrail shared by every AI text the reader sees (horoscopes, coffee, tarot, dreams).

Each service keeps its own voice in its prompt. This module holds the phrases none of them
may use, the gender rule for the reader, and the check that regenerates a text once when a
banned phrase slips through.
"""
import logging
import re
import unicodedata
from functools import lru_cache
from typing import Callable, TypeVar

from pydantic import BaseModel

from app.services.openai_service import structured_chat

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

# (label shown to the model, compiled regex)
BannedPattern = tuple[str, re.Pattern]

# (field name, label shown to the model, compiled regex): checked against that one field only
FieldPattern = tuple[str, str, re.Pattern]


def compile_patterns(phrases: list[tuple[str, str]]) -> list[BannedPattern]:
    return [(label, re.compile(pattern, re.IGNORECASE)) for label, pattern in phrases]


# AI-sounding Greek and punctuation that breaks the plain-columnist tone
COMMON_BANNED_PATTERNS = compile_patterns([
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
    ("νέο κεφάλαιο", r"ν[εέ](ο|α)\s+κεφ[αά]λαι"),
    ("διαίσθηση", r"διαισθ|διαίσθ"),
    ("στρέφει την προσοχή", r"στρ[εέ]φ\w*\s+(την\s+)?προσοχ"),
    ("ψιθυρίζει", r"ψιθυρ"),
    ("παύλα (—)", r"—|\s–\s"),
    ("ερώτηση", r"[;?\u037e]"),  # Greek question mark: ";" or U+037E (escaped so editors cannot normalize it)
    ("emoji", r"[\U0001F300-\U0001FAFF☀-➿]"),
])

# Not checkable by regex: «ταξίδι» is also a literal prediction in coffee and tarot
_UNCHECKED_BANNED_NOTE = "το ταξίδι ως μεταφορά («το ταξίδι της ζωής σας»)"

MAX_EXCLAMATIONS = 1

_GENDER_RULES = {
    "Άνδρας": "Ο αναγνώστης είναι άνδρας: επίθετα και μετοχές στο αρσενικό («είστε έτοιμος»).",
    "Γυναίκα": "Η αναγνώστρια είναι γυναίκα: επίθετα και μετοχές στο θηλυκό («είστε έτοιμη»).",
}
_NEUTRAL_GENDER_RULE = "Αποφύγετε επίθετα και μετοχές με γένος για τον αναγνώστη."


def gender_rule(sex: str | None) -> str:
    """Grammatical-gender instruction for the reader; neutral when the sex is unknown or «Άλλο»."""
    return _GENDER_RULES.get(sex or "", _NEUTRAL_GENDER_RULE)


def banned_list_for_prompt(patterns: list[BannedPattern]) -> str:
    """The comma-separated list that goes after «ΑΠΑΓΟΡΕΥΟΝΤΑΙ» in a system prompt."""
    return ", ".join([label for label, _ in patterns] + [_UNCHECKED_BANNED_NOTE])


def find_banned_phrases(
    reading: BaseModel,
    patterns: list[BannedPattern],
    field_patterns: list[FieldPattern] | None = None,
) -> list[str]:
    """Labels of the banned phrases (or punctuation) found in the reading's text fields."""
    values = reading.model_dump()
    text = " ".join(value for value in values.values() if isinstance(value, str))
    found = [label for label, pattern in patterns if pattern.search(text)]
    for field, label, pattern in field_patterns or []:
        value = values.get(field)
        if isinstance(value, str) and pattern.search(value):
            found.append(label)
    if text.count("!") > MAX_EXCLAMATIONS:
        found.append("πολλά θαυμαστικά")
    return found


# A field line in a prompt's examples («love: ...»); header and «Δεδομένα:» lines are not prose
_EXAMPLE_FIELD_LINE = re.compile(r"^[a-z_]+:\s*(.+)$")
_SENTENCE_END = re.compile(r"[.!·;;]+\s*")

# Five words in a row from an example is copying, not chance
COPIED_PHRASE_WORDS = 5
# A field that opens with the first three words of an example sentence reuses its template
COPIED_OPENING_WORDS = 3


def _plain(word: str) -> str:
    """Lowercase without accents, so «Απόγευμα» and «απογευμα» compare equal."""
    decomposed = unicodedata.normalize("NFD", word.casefold())
    return "".join(char for char in decomposed if not unicodedata.combining(char))


@lru_cache(maxsize=8)
def _example_phrases(
    examples: str, ignored_prefixes: tuple[str, ...]
) -> tuple[dict[tuple[str, ...], str], dict[tuple[str, ...], str]]:
    """(phrases, sentence openings) of the examples, keyed by plain words, valued as written."""
    phrases: dict[tuple[str, ...], str] = {}
    openings: dict[tuple[str, ...], str] = {}
    for line in examples.splitlines():
        match = _EXAMPLE_FIELD_LINE.match(line.strip())
        if not match:
            continue
        for sentence in _SENTENCE_END.split(match.group(1)):
            words = re.findall(r"\w+", sentence)
            plain = [_plain(word) for word in words]
            ignored = [word.startswith(ignored_prefixes) for word in plain]
            # Capitalized words inside a sentence are planets, signs and days: they come from the data
            from_data = [index > 0 and word[0].isupper() for index, word in enumerate(words)]
            if len(words) >= COPIED_OPENING_WORDS and not any(ignored[:COPIED_OPENING_WORDS]):
                openings[tuple(plain[:COPIED_OPENING_WORDS])] = " ".join(words[:COPIED_OPENING_WORDS])
            for start in range(len(words) - COPIED_PHRASE_WORDS + 1):
                end = start + COPIED_PHRASE_WORDS
                if any(ignored[start:end]) or any(from_data[start:end]):
                    continue
                phrases[tuple(plain[start:end])] = " ".join(words[start:end])
    return phrases, openings


def find_example_copies(
    reading: BaseModel, examples: str, ignored_prefixes: tuple[str, ...] = ()
) -> list[str]:
    """
    Phrases and field openings the reading took word for word from the prompt's examples.

    ignored_prefixes: plain (unaccented, lowercase) word starts the rules themselves dictate,
    so sharing them with an example is not copying.
    """
    phrases, openings = _example_phrases(examples, ignored_prefixes)
    found: list[str] = []
    for value in reading.model_dump().values():
        if not isinstance(value, str):
            continue
        plain = [_plain(word) for word in re.findall(r"\w+", value)]
        opening = openings.get(tuple(plain[:COPIED_OPENING_WORDS]))
        if opening:
            found.append(f"άνοιγμα από τα παραδείγματα («{opening}»)")
        for start in range(len(plain) - COPIED_PHRASE_WORDS + 1):
            phrase = phrases.get(tuple(plain[start:start + COPIED_PHRASE_WORDS]))
            if phrase:
                found.append(f"φράση από τα παραδείγματα («{phrase}»)")
    return list(dict.fromkeys(found))


async def generate_with_guardrail(
    *,
    system_prompt: str,
    user_text: str,
    response_model: type[T],
    banned_patterns: list[BannedPattern],
    field_patterns: list[FieldPattern] | None = None,
    extra_checks: list[Callable[[BaseModel], list[str]]] | None = None,
) -> tuple[T, dict]:
    """Generate once; if banned phrases slip through, regenerate once naming them."""

    def problems_in(candidate: BaseModel) -> list[str]:
        found = find_banned_phrases(candidate, banned_patterns, field_patterns)
        for check in extra_checks or []:
            found += check(candidate)
        return found

    reading, usage = await structured_chat(
        system_prompt=system_prompt,
        user_content=[{"type": "text", "text": user_text}],
        response_model=response_model,
    )
    banned = problems_in(reading)
    if not banned:
        return reading, usage

    name = response_model.__name__
    logger.info("%s contained %s, regenerating once", name, banned)
    retry_text = (
        f"{user_text}\n\nΗ προηγούμενη εκδοχή σας περιείχε: {', '.join(banned)}. "
        "Ξαναγράψτε το κείμενο χωρίς αυτά."
    )
    retry_reading, retry_usage = await structured_chat(
        system_prompt=system_prompt,
        user_content=[{"type": "text", "text": retry_text}],
        response_model=response_model,
    )
    remaining = problems_in(retry_reading)
    if remaining:
        logger.warning("%s still contains %s after retry, keeping it", name, remaining)
    combined_usage = {key: usage[key] + retry_usage[key] for key in usage}
    return retry_reading, combined_usage
