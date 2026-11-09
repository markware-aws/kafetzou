"""Extract the natal delineations of Heindel's "The Message of the Stars" (1918) into one file.

Source text: the Rosicrucian Fellowship's online edition (clean HTML, chapters IV to XVII).
Every passage is aligned with the OCR of a 1918 printing scanned by the Internet Archive,
because the online edition is a later, edited text: where the two differ in wording, the scan
wins. OCR noise (misread letters, split words, planet glyphs) is told apart from real wording
differences with the OCR's own word confidences and a vocabulary built from the HTML.
SCAN_DECISIONS, TEXT_FIXES and TRANSCRIBED hold the cases settled by hand against the page
images (https://archive.org/download/<scan id>/page/n<leaf>_w1000.jpg).

The online edition's appendix on Pluto (written about 1970) and its editorial notes are not
in the 1918 printing and are never used.

Usage:
    python -I scripts/extract-heindel.py --raw-dir <empty download folder> [--report <file>]

The raw folder receives the HTML chapters and the scan OCR text on the first run (sequential
requests with a delay) and is reused afterwards.

Outputs: docs/heindel-message-of-the-stars.json and docs/heindel-message-of-the-stars.md
"""

import argparse
import bisect
import difflib
import html
import json
import re
import sys
import time
import urllib.request
from collections import Counter, defaultdict
from html.parser import HTMLParser
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_JSON = REPO_ROOT / 'docs/heindel-message-of-the-stars.json'
DEFAULT_MD = REPO_ROOT / 'docs/heindel-message-of-the-stars.md'

HTML_BASE_URL = 'https://www.rosicrucian.com/mos/'
HTML_TOC_URL = HTML_BASE_URL + 'moseng11.htm'
HTML_FILES = ['moseng02.htm', 'moseng03.htm', 'moseng04.htm', 'moseng05.htm', 'moseng06.htm',
              'moseng07.htm']
SCAN_ID = 'messageofstarses00heiniala'
SCAN_URL = f'https://archive.org/details/{SCAN_ID}'
# The scan's ABBYY OCR as hOCR: the same text as the item's _djvu.txt, plus a confidence for
# every word, which tells real wording differences from misread letters.
SCAN_TEXT_URL = f'https://archive.org/download/{SCAN_ID}/{SCAN_ID}_hocr.html'
SCAN_TEXT_FILE = 'scan_hocr.html'
# ABBYY confidences in this scan run 0 to 30; cleanly printed words sit at 28 to 30.
TRUSTED_CONFIDENCE = 27
# Below this the print is damaged or the "word" is a glyph (planet and aspect symbols).
FAIR_CONFIDENCE = 15
INFLECTION_SUFFIXES = ('s', 'es', 'd', 'ed', 'ly', 'ing', 'al', 'ness')
USER_AGENT = 'Mozilla/5.0 (compatible; kafetzou-heindel-extract/1.0)'
REQUEST_DELAY_SECONDS = 2

PLANETS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']
PLANET_NAMES = {planet: planet.capitalize() for planet in PLANETS}
SIGNS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio',
         'sagittarius', 'capricorn', 'aquarius', 'pisces']
ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth',
            'ninth', 'tenth', 'eleventh', 'twelfth']
ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII',
                  'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX']
CHAPTER_NUMBERS = {roman: index + 1 for index, roman in enumerate(ROMAN_NUMERALS)}
CHAPTER_PLANET = {8: 'sun', 9: 'venus', 10: 'mercury', 11: 'moon', 12: 'saturn', 13: 'jupiter',
                  14: 'mars', 16: 'uranus', 17: 'neptune'}
SCAN_BODY_CHAPTERS = 30
LAST_NATAL_CHAPTER = 17

ASPECT_GROUPS = {
    'conjunction': ('conjunction', 'parallel'),
    'harmonious': ('sextile', 'trine'),
    'tense': ('square', 'opposition'),
}
GROUP_LABELS = {
    'conjunction': 'conjunction or parallel',
    'harmonious': 'sextile or trine',
    'tense': 'square or opposition',
}

# Passages whose wording matches the scan less than this are flagged verified: false. Clean
# passages score 0.95 to 1.0 once the scan's wording is applied; what is left is OCR noise.
SIMILARITY_THRESHOLD = 0.9
# Two chapters giving the same pair: when one text holds all but a few words of the other,
# only the longer one is kept; otherwise both are joined.
CONTAINED_SHARE = 0.97

# Differences between the HTML and the scan settled by hand after reading the scan text:
# (html words, scan words) in normalised form -> 'html' (OCR misread, keep the HTML) or
# 'scan' (a real wording difference, use the scan).
SCAN_DECISIONS: dict[tuple[str, str], str] = {
    # The scan is right: words the HTML mistyped, changed, or spelled the modern way.
    **{pair: 'scan' for pair in [
        ('lengthens', 'lengthen it'), ('eliminative', 'eliminatory'), ('in public', 'publicly'),
        ('different', 'diffident'), ('fears', 'tears'), ('attaches', 'attacks'),
        ('faithfulness', 'faithlessness'), ('shall', 'shell'), ('perverted', 'perverse'),
        ('unpractical', 'impractical'), ('father', 'gather'), ('fathers it', 'gathers its'),
        ('airplanes', 'aeroplanes'), ('classifying', 'classing'), ('mechanic', 'mechanician'),
        ('quality', 'qualify'), ('sagittarius', 'sagittarians'), ('wiriness', 'wiryness'),
        ('creaming', 'dreaming'), ('nationals', 'nations'), ('thickest', 'thickset'),
        ('leash', 'lash'), ('appreciate', 'appreciative'), ('doublebodies', 'doublebodied'),
        ('impeachable', 'unimpeachable'), ('desserts', 'deserts'), ('wresting', 'wrestling'),
        ('lightening', 'lightning'), ('give', 'gave'), ('were', 'is'), ('himself', 'he'),
        ('taurean', 'taurian'), ('practice', 'practise'), ('skeptics', 'sceptics'),
        ('inquiring', 'enquiring'), ('criticize', 'criticise'), ('dietitian', 'dietician'),
        ('dietitians', 'dieticians'), ('ostracized', 'ostracised'), ('fetus', 'foetus'),
        ('savior', 'saviour'), ('subtle', 'subtile'), ('usable', 'useable'),
        ('benefited', 'benefitted'), ('hemoglobin', 'haemoglobin'), ('counselors', 'counsellors'),
        ('gray', 'grey'), ('ever', 'aye'),
    ]},
    # Misread or misprinted in the scan: keep the HTML.
    ('business', 'busines'): 'html',
}

# Text read off the page images where the OCR is too damaged to decide word by word:
# item id -> [(text after the automatic pass, text as printed in 1918)].
TEXT_FIXES: dict[str, list[tuple[str, str]]] = {
    'intro:venus': [('The best House position for her is the Seventh',
                     'The best House position is in the Seventh')],
    'aspect:mars:mercury:sextile+trine': [('nor maliciously', 'or maliciously')],
    'intro:mercury': [('life, Whence we have come, why we are here, and whither we are bound?"',
                       'life: "Whence we have come, Why we are here and Whither we are bound,"')],
}

# Whole passages read off the page images: the online edition rewrote them (sun in Scorpio)
# or the scanned page is torn down one side (Venus in Pisces, leaf n187). "exaltion" in the
# 1918 Venus in Pisces passage is a misprint and is given as "exaltation".
TRANSCRIBED: dict[str, str] = {
    'planet-sign:sun:scorpio': (
        'This gives the person a very blunt and brusque manner with a tendency to ride rough '
        'shod over anybody or anything that stands in the way of his desires; an overweening '
        'egoism and a feeling that he knows better than anybody else; extremely cruel and '
        'indifferent to the sufferings of other people or creatures. It is the sign of the '
        'vivisectionist, the surgeon, the soldier and the butcher, also sea-captains.\n\n'
        'This configuration is good for gain by marriage but gives a tendency to extravagant '
        'expenditure.'
    ),
    'planet-sign:venus:pisces': (
        'Venus in Pisces is in her own exaltation sign where she again blends with the benefic '
        'ray of Jupiter and as Pisces is a watery sign this position signifies a powerful '
        'emotional nature, subdued and toned down by the element of sorrow inherent in the '
        'twelfth house sign. This position therefore, indicates someone capable of feeling a '
        'sentiment such as that felt by our Savior when He said: "Come unto Me all ye that are '
        'weak and heavy laden and I will give you rest." Thus Venus in Pisces indicates a nature '
        'yearning and aching to assist those who are afflicted by bodily ills or suffering from '
        'sorrow. Moved by compassion such people often take up work in a prison or charitable '
        'institution where they find an outlet for their compassion. This position also gives '
        'an intense love of music and when other testimonies concur considerable ability to '
        'express either vocally or instrumentally, for music is the most wonderful outlet for '
        'the deepest emotions of which the human soul is capable. People with Venus in Pisces '
        'are especially liable to financial imposition on the part of others and trouble '
        'through an illegal marriage.'
    ),
}

NAVIGATION_RE = re.compile(
    r'^(Click here|Table of Contents|Index to (Natal|Medical) Astrology|Order the printed|'
    r'Rosicrucian Fellowship|The Message of the Stars|by$|Max Heindel)')
WORD = r"[A-Za-z]+(?:'[A-Za-z]+)*"
TOKEN_RE = re.compile(rf'{WORD}(?:-\s*{WORD})*')


# ----------------------------------------------------------------------------------------
# Download
# ----------------------------------------------------------------------------------------

def download_sources(raw_dir: Path) -> None:
    raw_dir.mkdir(parents=True, exist_ok=True)
    targets = [(HTML_BASE_URL + name, name) for name in HTML_FILES]
    targets.append((SCAN_TEXT_URL, SCAN_TEXT_FILE))
    for url, name in targets:
        path = raw_dir / name
        if path.exists():
            continue
        print(f'downloading {url}', file=sys.stderr)
        request = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
        with urllib.request.urlopen(request, timeout=120) as response:
            path.write_bytes(response.read())
        time.sleep(REQUEST_DELAY_SECONDS)


# ----------------------------------------------------------------------------------------
# HTML -> blocks
# ----------------------------------------------------------------------------------------

class BlockParser(HTMLParser):
    """Flat list of headings and paragraphs, each with its leading bold/italic text."""

    BLOCK_TAGS = {'p', 'table', 'tr', 'div', 'hr', 'blockquote', 'li', 'ul'}
    HEADING_TAGS = {'h1', 'h2', 'h3', 'h4'}
    FORMAT_TAGS = {'b', 'i', 'strong', 'em'}

    def __init__(self, file_name: str):
        super().__init__(convert_charrefs=True)
        self.file_name = file_name
        self.blocks: list[dict] = []
        self.current: dict | None = None
        self.format_depth = 0

    def _flush(self) -> None:
        if self.current is None:
            return
        segments = self.current['segments']
        text = ''.join(part for part, _ in segments)
        if text.strip():
            lead_parts = []
            for part, formatted in segments:
                if not lead_parts and not part.strip():
                    continue
                if not formatted:
                    break
                lead_parts.append(part)
            self.blocks.append({
                'kind': self.current['kind'],
                'text': collapse_spaces(text),
                'lead': collapse_spaces(''.join(lead_parts)),
                'file': self.file_name,
                'line': self.current['line'],
            })
        self.current = None

    def _start(self, kind: str) -> None:
        self._flush()
        self.current = {'kind': kind, 'segments': [], 'line': self.getpos()[0]}

    def handle_starttag(self, tag, attrs):
        if tag in self.HEADING_TAGS:
            self._start('h')
        elif tag in self.BLOCK_TAGS:
            self._start('p')
        elif tag in ('br', 'td') and self.current is not None:
            self.current['segments'].append((' ', self.format_depth > 0 and tag == 'br'))
        elif tag in self.FORMAT_TAGS:
            self.format_depth += 1

    def handle_endtag(self, tag):
        if tag in self.HEADING_TAGS or tag in self.BLOCK_TAGS:
            self._flush()
        elif tag in self.FORMAT_TAGS:
            self.format_depth = max(0, self.format_depth - 1)

    def handle_data(self, data):
        if self.current is None:
            if not data.strip():
                return
            self._start('p')
        self.current['segments'].append((data, self.format_depth > 0))

    def close(self):
        super().close()
        self._flush()


def collapse_spaces(text: str) -> str:
    return re.sub(r'\s+', ' ', text.replace('\xa0', ' ')).strip()


def parse_html_blocks(raw_dir: Path) -> list[dict]:
    blocks = []
    for name in HTML_FILES:
        parser = BlockParser(name)
        parser.feed((raw_dir / name).read_bytes().decode('cp1252'))
        parser.close()
        blocks.extend(block for block in parser.blocks if not NAVIGATION_RE.match(block['text']))
    return blocks


# ----------------------------------------------------------------------------------------
# Blocks -> items (one per heading in the book)
# ----------------------------------------------------------------------------------------

PLANET_WORD = r'(Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune)'
SIGN_WORD = r'(Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|' \
            r'Aquarius|Pisces)'
ORDINAL_WORD = r'(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|' \
               r'Twelfth)'
HOUSE_HEADING_RE = re.compile(rf'\bTHE {PLANET_WORD} IN THE {ORDINAL_WORD} HOUSE\b', re.I)
SIGN_HEADING_RE = re.compile(rf'\bTHE {PLANET_WORD} IN {SIGN_WORD}\b', re.I)
HOUSE_LEAD_RE = re.compile(rf'^(?:The )?{PLANET_WORD} in the (?:Ascendant, or )?{ORDINAL_WORD} '
                           r'House', re.I)
SIGN_LEAD_RE = re.compile(rf'^(?:The )?{PLANET_WORD} (?:in|on) {SIGN_WORD}\b', re.I)
RISING_HEADING_RE = re.compile(rf'\b{SIGN_WORD}, THE\b', re.I)
CHILDREN_HEADING_RE = re.compile(rf'\bCHILDREN OF {SIGN_WORD}\b', re.I)
MUNDANE_HOUSE_LEAD_RE = re.compile(rf'^{ORDINAL_WORD} House\b', re.I)
ASPECT_WORDS_RE = re.compile(r'\b(conjunction|parallel|sextile|trine|square|opposition)\b', re.I)
PLANET_MENTION_RE = re.compile(rf'\b{PLANET_WORD}\b')
CROSS_REFERENCE_RE = re.compile(r'\bsee Page \d+', re.I)


def is_section_heading(text: str) -> bool:
    letters = re.sub(r'[^A-Za-z]', '', text)
    return bool(letters) and letters.isupper()


def section_of(text: str) -> str | None:
    if 'TWELVE HOUSES' in text:
        return 'houses'
    if 'TWELVE SIGNS' in text:
        return 'signs'
    if 'ASPECT' in text:
        return 'aspects'
    return None


def new_item(kind: str, chapter: int, block: dict, **fields) -> dict:
    return {'kind': kind, 'chapter': chapter, 'paragraphs': [], 'file': block['file'],
            'line': block['line'], **fields}


def segment(blocks: list[dict]) -> tuple[list[dict], list[str]]:
    """Group the blocks into items in book order. Returns (items, problems)."""
    items: list[dict] = []
    problems: list[str] = []
    chapter = 0
    section: str | None = None
    current: dict | None = None
    expect_chapter_title = False

    def finish():
        nonlocal current
        if current is not None and current['paragraphs']:
            items.append(current)
        elif current is not None:
            problems.append(f'empty item {current["kind"]} at {current["file"]}:{current["line"]}')
        current = None

    for block in blocks:
        text, lead = block['text'], block['lead']
        chapter_match = re.match(r'^CHAPTER ([IVXL]+)$', text) if block['kind'] == 'h' else None
        if chapter_match:
            finish()
            chapter = CHAPTER_NUMBERS[chapter_match.group(1)]
            section = None
            expect_chapter_title = True
            continue
        if chapter > LAST_NATAL_CHAPTER:
            break
        planet = CHAPTER_PLANET.get(chapter)

        if chapter == 4:
            if block['kind'] == 'h':
                finish()
                section = 'mundane' if text == 'THE HOUSES' else None
                continue
            if section != 'mundane':
                continue
            match = MUNDANE_HOUSE_LEAD_RE.match(text) if lead else None
            if match:
                finish()
                current = new_item('house', chapter, block,
                                   house=ORDINALS.index(match.group(1).lower()) + 1)
            if current is not None:
                current['paragraphs'].append(text)
            continue

        if chapter == 5 or chapter == 7:
            if block['kind'] == 'h':
                pattern = RISING_HEADING_RE if chapter == 5 else CHILDREN_HEADING_RE
                matches = pattern.findall(text)
                if not matches:
                    problems.append(f'unexpected heading in chapter {chapter}: {text}')
                    continue
                finish()
                kind = 'ascendant' if chapter == 5 else 'children'
                current = new_item(kind, chapter, block, sign=matches[-1].lower())
                continue
            if current is None:
                problems.append(f'orphan paragraph in chapter {chapter}: {text[:60]}')
                continue
            current['paragraphs'].append(text)
            continue

        if planet is None:
            continue

        if expect_chapter_title and block['kind'] == 'h':
            expect_chapter_title = False
            finish()
            section = 'intro'
            current = new_item('intro', chapter, block, planet=planet,
                               title=re.sub(r'\s*KEYNOTE:.*$', '', text))
            continue
        expect_chapter_title = False

        if is_section_heading(text) and section_of(text):
            finish()
            section = section_of(text)
            if block['kind'] == 'p' or not (HOUSE_HEADING_RE.search(text) and section == 'houses'
                                            or SIGN_HEADING_RE.search(text) and section == 'signs'):
                continue
        start = None
        if section == 'houses':
            if block['kind'] == 'h':
                found = HOUSE_HEADING_RE.findall(text)
                start = found[-1] if found else None
            elif lead:
                match = HOUSE_LEAD_RE.match(text)
                start = match.groups() if match else None
            if start and start[0].lower() == planet:
                finish()
                current = new_item('planet-house', chapter, block, planet=planet,
                                   house=ORDINALS.index(start[1].lower()) + 1)
                if block['kind'] == 'h':
                    continue
        elif section == 'signs':
            if block['kind'] == 'h':
                found = SIGN_HEADING_RE.findall(text)
                start = found[-1] if found else None
            elif lead:
                match = SIGN_LEAD_RE.match(text)
                start = match.groups() if match else None
            if start and start[0].lower() == planet:
                finish()
                current = new_item('planet-sign', chapter, block, planet=planet,
                                   sign=start[1].lower())
                if block['kind'] == 'h':
                    continue
        elif section == 'aspects' and CROSS_REFERENCE_RE.search(text) and len(text.split()) < 25:
            # "Mars square or opposition Venus. See page 330." is no delineation, but it is
            # still aligned so that the scan's copy of it is not taken for part of a passage.
            finish()
            problems.append(f'cross-reference left out, chapter {chapter}: {text}')
            current = new_item('crossref', chapter, block, planet=planet, other='', aspects=[],
                               lead=text)
        elif section == 'aspects' and block['kind'] == 'p' and lead:
            opening = ' '.join(text.split()[:14])
            aspects = {word.lower() for word in ASPECT_WORDS_RE.findall(lead)}
            mentioned = [name.lower() for name in PLANET_MENTION_RE.findall(opening)]
            others = [name for name in mentioned if name != planet]
            if aspects and others and planet in mentioned:
                finish()
                # A cross-reference to another chapter is no delineation, but it is still
                # aligned so that the scan's copy of it is not taken for part of a passage.
                current = new_item('aspect', chapter, block, planet=planet, other=others[0],
                                   aspects=sorted(aspects), lead=lead.rstrip(' .,:'))

        if block['kind'] == 'h':
            problems.append(f'unhandled heading in chapter {chapter}: {text}')
            continue
        if current is None:
            problems.append(f'orphan paragraph in chapter {chapter} ({section}): {text[:60]}')
            continue
        current['paragraphs'].append(text)
    finish()
    for item in items:
        item['text'] = '\n\n'.join(item['paragraphs'])
    return items, problems


# ----------------------------------------------------------------------------------------
# Scan OCR
# ----------------------------------------------------------------------------------------

def normalise(word: str) -> str:
    return re.sub(r'[^a-z]', '', word.lower())


def tokenize(text: str) -> list[tuple[str, int, int]]:
    tokens = []
    for match in TOKEN_RE.finditer(text):
        norm = normalise(match.group())
        if norm:
            tokens.append((norm, match.start(), match.end()))
    return tokens


def letters_of(text: str) -> str:
    return re.sub(r'[^A-Za-z]', '', text)


def is_page_furniture(line: str) -> bool:
    """Page numbers, library stamps and running heads ("172 THE MESSAGE OF THE STARS")."""
    if len(letters_of(line)) < 2:
        return True
    head = re.match(r'^[\W\d]*\d{1,3}\s+([^a-z]+)$', line) or re.match(r'^([^a-z]+?)\s+\d{1,3}\W*$', line)
    return bool(head) and len(re.findall(r'[A-Z]', head.group(1))) >= 4


# A short line holding one of these is the start of a sentence, never a heading.
SENTENCE_WORDS = {'is', 'are', 'was', 'were', 'be', 'has', 'have', 'when', 'if', 'but', 'and'}
BORN_LINE_RE = re.compile(r'^Born \w+ \d+\w*\.? to \w+ \d+\w*\.?$')


def is_heading_line(line: str, previous: str, following: str) -> bool:
    """Chapter, section and item headings, and running heads the OCR garbled."""
    letters = letters_of(line)
    words = [word for word in line.split() if len(letters_of(word)) >= 2]
    if len(words) >= 2 and sum(c.isupper() for c in letters) >= 0.75 * len(letters):
        return True
    if BORN_LINE_RE.match(line):
        return True
    long_words = [word for word in line.split() if len(letters_of(word)) >= 4]
    if len(line.split()) > 8 or not long_words:
        return False
    # Every long word capitalised; "tJie" (a misread "the") counts, a real lower-case word not.
    if not all(any(c.isupper() for c in letters_of(word)) for word in long_words):
        return False
    if {word.lower() for word in line.split()} & SENTENCE_WORDS:
        return False
    if re.search(r'[.,;:!?"\'-]$', line) or re.search(r'[.;:]\s', line):
        return False
    previous_ends = not previous or bool(re.search(r'[.:;!?"\']$', previous))
    next_letter = re.search(r'[A-Za-z]', following)
    return previous_ends and bool(next_letter) and next_letter.group().isupper()


HOCR_RE = re.compile(r'(?P<page><div class="ocr_page")|(?P<line><span class="ocr_line")|'
                     r'<span class="ocrx_word"[^>]*?x_wconf (?P<conf>\d+)[^>]*>(?P<word>.*?)</span>',
                     re.S)


def read_hocr_pages(hocr: str) -> list[list[list[tuple[str, int]]]]:
    """Pages of lines of (word, ABBYY confidence), in reading order."""
    pages: list[list[list[tuple[str, int]]]] = []
    for match in HOCR_RE.finditer(hocr):
        if match.group('page'):
            pages.append([])
        elif match.group('line'):
            if pages:
                pages[-1].append([])
        elif pages and pages[-1]:
            word = html.unescape(re.sub(r'<[^>]+>', '', match.group('word'))).strip()
            pages[-1][-1].extend((part, int(match.group('conf'))) for part in word.split())
    return [[line for line in page if line] for page in pages]


class Scan:
    """The scan's body text without page furniture and headings, as tokens with confidences.

    Headings are not part of any passage; where one stood, a boundary is recorded so that a
    passage never runs across it.
    """

    def __init__(self, hocr: str):
        lines = []
        for page_number, page in enumerate(read_hocr_pages(hocr)):
            texts = [' '.join(word for word, _ in line) for line in page]
            for index, line in enumerate(page):
                if is_page_furniture(texts[index]):
                    continue
                lines.append((texts[index], line, page_number))
        parts, word_spans, chapter_offsets, boundary_offsets = [], [], [], []
        offset = 0
        for index, (text, line, page_number) in enumerate(lines):
            previous = lines[index - 1][0] if index else ''
            following = lines[index + 1][0] if index + 1 < len(lines) else ''
            if re.match(r'^CHAPTER\s+\S+$', text) and len(chapter_offsets) < SCAN_BODY_CHAPTERS:
                chapter_offsets.append(offset)
            if is_heading_line(text, previous, following):
                boundary_offsets.append(offset)
                continue
            for position, (word, confidence) in enumerate(line):
                if position:
                    parts.append(' ')
                    offset += 1
                word_spans.append((offset, offset + len(word), confidence, page_number))
                parts.append(word)
                offset += len(word)
            parts.append('\n')
            offset += 1
        self.text = ''.join(parts)
        self.tokens = tokenize(self.text)
        self.norms = [token[0] for token in self.tokens]
        starts = [token[1] for token in self.tokens]
        word_starts = [span[0] for span in word_spans]
        self.confidences = []
        self.pages = []
        for _, start, end in self.tokens:
            first = max(bisect.bisect_right(word_starts, start) - 1, 0)
            last = max(bisect.bisect_left(word_starts, end), first + 1)
            self.confidences.append(min(span[2] for span in word_spans[first:last]))
            self.pages.append(word_spans[first][3])
        self.boundaries = sorted({bisect.bisect_left(starts, o) for o in boundary_offsets})
        chapter_tokens = [bisect.bisect_left(starts, o) for o in chapter_offsets] + [len(starts)]
        self.chapter_ranges = {number: (chapter_tokens[number - 1], chapter_tokens[number])
                               for number in range(1, len(chapter_offsets) + 1)}
        self.trigrams = defaultdict(list)
        for i in range(len(self.norms) - 2):
            self.trigrams[(self.norms[i], self.norms[i + 1], self.norms[i + 2])].append(i)

    def boundaries_between(self, low: int, high: int) -> list[int]:
        """Boundaries b with low <= b <= high."""
        return self.boundaries[bisect.bisect_left(self.boundaries, low):
                               bisect.bisect_right(self.boundaries, high)]


SOLID_BLOCK = 3
MAX_DRIFT = 10


def locate(norms: list[str], scan: Scan, low: int, high: int) -> dict | None:
    """Where the passage sits in the scan: its first and last solid matches."""
    votes = Counter()
    for i in range(len(norms) - 2):
        for position in scan.trigrams.get((norms[i], norms[i + 1], norms[i + 2]), ()):
            if low <= position < high:
                votes[position - i] += 1
    if not votes:
        return None
    best = max(votes, key=lambda o: sum(votes.get(o + d, 0) for d in range(-15, 16)))
    window_start = max(low, best - 60)
    window_end = min(high, best + len(norms) + 60)
    matcher = difflib.SequenceMatcher(None, norms, scan.norms[window_start:window_end],
                                      autojunk=False)
    blocks = [block for block in matcher.get_matching_blocks() if block.size >= SOLID_BLOCK]
    if not blocks:
        return None

    def drift(left, right):
        return (right.b - left.b - left.size) - (right.a - left.a - left.size)

    first = next(block for index, block in enumerate(blocks)
                 if index + 1 == len(blocks) or drift(block, blocks[index + 1]) <= MAX_DRIFT)
    last = next(block for index, block in reversed(list(enumerate(blocks)))
                if index == 0 or drift(blocks[index - 1], block) <= MAX_DRIFT)
    return {
        'first': window_start + first.b,
        'natural_start': window_start + first.b - first.a,
        'last': window_start + last.b + last.size,
        'natural_end': window_start + last.b + last.size + len(norms) - last.a - last.size,
    }


SENTENCE_REACH = 15


def border(scan: Scan, previous: dict, following: dict) -> int:
    """Token where `following` starts and `previous` ends, with no heading between them.

    The alignment gives the point; a point inside a sentence moves forward to the end of that
    sentence, so that the last words of one passage never open the next.
    """
    point = max(min(following['anchor']['natural_start'], following['anchor']['first']),
                previous['anchor']['last'])
    for candidate in range(point, min(point + SENTENCE_REACH, following['anchor']['first']) + 1):
        if candidate == 0 or ends_sentence(scan.text[:scan.tokens[candidate][1]][-6:]):
            return candidate
    return point


def assign_segments(items: list[dict], scan: Scan) -> list[str]:
    """Cut the scan into one segment per item: consecutive items share their border, and a
    heading boundary always ends a segment."""
    problems = []
    for index, item in enumerate(items):
        low, high = scan.chapter_ranges[item['chapter']]
        item['scan_low'], item['scan_high'] = low, high
        item['anchor'] = locate(normalise_words(item['text']), scan, low, high)
        if item['anchor'] is None:
            problems.append(f'not found in scan: {describe(item)}')
    located = [item for item in items if item['anchor']]
    for index, item in enumerate(located):
        anchor = item['anchor']
        previous = located[index - 1] if index else None
        following = located[index + 1] if index + 1 < len(located) else None
        if previous and previous['chapter'] == item['chapter']:
            if anchor['first'] < previous['anchor']['last']:
                problems.append(f'out of order in scan: {describe(item)}')
            heads = scan.boundaries_between(previous['anchor']['last'], anchor['first'])
        else:
            heads = scan.boundaries_between(item['scan_low'], anchor['first'])
        natural_start = min(anchor['natural_start'], anchor['first'])
        if heads:
            start = max(heads[-1], natural_start)
        elif previous and previous['chapter'] == item['chapter']:
            start = border(scan, previous, item)
        else:
            start = max(natural_start, item['scan_low'])
        if following and following['chapter'] == item['chapter']:
            limit = following['anchor']['first']
        else:
            limit = item['scan_high']
        tails = scan.boundaries_between(anchor['last'], limit)
        if tails:
            end = tails[0]
        elif following and following['chapter'] == item['chapter']:
            end = border(scan, item, following)
        else:
            end = min(anchor['natural_end'], limit)
        item['span'] = (start, max(end, start))
    return problems


# ----------------------------------------------------------------------------------------
# HTML vs scan: decide every difference, rebuild the text with the scan's wording
# ----------------------------------------------------------------------------------------

def normalise_words(text: str) -> list[str]:
    return [token[0] for token in tokenize(text)]


# Words the HTML writes in lower case somewhere: safe to lower-case after a joined sentence.
LOWERCASE_WORDS: set[str] = set()


def build_vocabulary(blocks: list[dict]) -> set[str]:
    for block in blocks:
        LOWERCASE_WORDS.update(re.findall(r"\b[a-z][a-z']*\b", block['text']))
    LOWERCASE_WORDS.difference_update(PLANETS, SIGNS)
    counts = Counter(token[0] for block in blocks for token in tokenize(block['text']))
    return {word for word, count in counts.items() if count >= 2}


def all_known(words: list[str], vocabulary: set[str]) -> bool:
    return bool(words) and all(word in vocabulary for word in words)


def solid(confidences: list[int], threshold: int) -> bool:
    """Every word at or above the threshold; a long run may have one weak word in ten."""
    weak = [c for c in confidences if c < threshold]
    return not weak or (len(confidences) >= 4 and len(weak) <= 0.1 * len(confidences))


def is_inflection(first: str, second: str) -> bool:
    short, long_ = sorted((first, second), key=len)
    return long_.startswith(short) and long_[len(short):] in INFLECTION_SUFFIXES


def looks_like_heading(piece: str) -> bool:
    long_words = [word for word in piece.split() if len(letters_of(word)) >= 4]
    capitalised = [word for word in long_words if letters_of(word)[0].isupper()]
    return len(capitalised) >= 2 and len(capitalised) >= 0.5 * len(long_words)


def decide(tag: str, html_words: list[str], scan_words: list[str], scan_text: str,
           confidences: list[int], neighbour_confidence: int,
           vocabulary: set[str]) -> tuple[str, str]:
    """('html' | 'scan', reason) for one non-equal opcode.

    The scan wins wherever it can be read: a known word printed clearly, or a different word
    that no misreading of the HTML word could produce. The HTML wins where the scan text is
    a misreading of the same word (tlie / the) or the print is damaged.
    """
    override = SCAN_DECISIONS.get((' '.join(html_words), ' '.join(scan_words)))
    if override:
        return override, 'decided by hand'
    if tag == 'delete':
        if neighbour_confidence < FAIR_CONFIDENCE:
            return 'html', f'scan damaged here (confidence {neighbour_confidence})'
        return 'scan', 'words only in the HTML'
    unknown = [(w, c) for w, c in zip(scan_words, confidences) if w not in vocabulary]
    # A word the HTML never uses is only taken from the scan when it is long enough not to be
    # a glyph or a mangled short word (tlie, oi, ana) and was read clearly.
    garbled = any(len(w) <= 3 for w, _ in unknown)
    rare_words_clear = all(c > TRUSTED_CONFIDENCE for _, c in unknown)
    rare_words_fair = all(c >= TRUSTED_CONFIDENCE for _, c in unknown)
    trusted = solid(confidences, TRUSTED_CONFIDENCE)
    fair = solid(confidences, FAIR_CONFIDENCE)
    html_joined, scan_joined = ''.join(html_words), ''.join(scan_words)
    if tag == 'insert':
        if len(scan_joined) <= 1 or garbled:
            return 'html', 'OCR junk'
        if looks_like_heading(scan_text):
            return 'html', 'heading'
        if fair and rare_words_clear:
            return 'scan', 'words only in the scan'
        return 'html', f'unsure OCR (confidence {min(confidences)})'
    if html_joined == scan_joined:
        if not unknown and not all_known(html_words, vocabulary):
            return 'scan', 'HTML spacing typo'
        return 'html', 'spacing only'
    letter_ratio = difflib.SequenceMatcher(None, html_joined, scan_joined).ratio()
    if not fair:
        return 'html', f'unsure OCR (confidence {min(confidences)}, {letter_ratio:.2f})'
    if unknown:
        if garbled or (not rare_words_fair and letter_ratio >= 0.4):
            return 'html', f'OCR misreading ({letter_ratio:.2f})'
        if letter_ratio < 0.6:
            return 'scan', f'different words, rare scan word ({letter_ratio:.2f})'
        if trusted and rare_words_clear and letter_ratio < 0.75:
            return 'scan', f'rare scan word, clear print ({letter_ratio:.2f})'
        if (trusted and len(scan_words) == len(html_words) == 1
                and is_inflection(html_words[0], scan_words[0])):
            return 'scan', 'other inflection, clear print'
        return 'html', f'OCR misreading ({letter_ratio:.2f})'
    if not all_known(html_words, vocabulary):
        return 'scan', 'HTML typo'
    if trusted or letter_ratio < 0.8:
        return 'scan', f'different words ({letter_ratio:.2f})'
    return 'html', f'unsure OCR (confidence {min(confidences)}, {letter_ratio:.2f})'


def clean_scan_piece(piece: str, vocabulary: set[str]) -> str:
    def join_line_break(match):
        left, right = match.group(1), match.group(2)
        return left + right if normalise(left + right) in vocabulary else f'{left}-{right}'

    piece = re.sub(r'(\w+)-\s*\n\s*(\w+)', join_line_break, piece)
    piece = re.sub(r"[^A-Za-z0-9 ,.;:!?'\"()\-\n]", '', piece)
    piece = re.sub(r"' ?'", '"', piece)
    piece = re.sub(r"(\w) '(s|ll|t)\b", r"\1'\2", piece)
    return collapse_spaces(piece)


def ends_sentence(gap: str) -> bool:
    return bool(re.search(r'[.!?]["\')]*\s*$', gap))


def has_punctuation(gap: str) -> bool:
    return bool(re.search(r'\S', gap))


def reconcile(text: str, scan: Scan, span: tuple[int, int], vocabulary: set[str]) -> tuple[str, list[dict]]:
    """The HTML text with the scan's wording applied, plus the list of differences."""
    html_tokens = tokenize(text)
    html_words = [token[0] for token in html_tokens]
    scan_tokens = scan.tokens[span[0]:span[1]]
    scan_words = [token[0] for token in scan_tokens]
    confidences = scan.confidences[span[0]:span[1]]
    opcodes = difflib.SequenceMatcher(None, html_words, scan_words, autojunk=False).get_opcodes()

    def gap(i: int) -> str:
        if i >= len(html_tokens):
            return ' '
        return text[html_tokens[i - 1][2]:html_tokens[i][1]] if i > 0 else ''

    def html_piece(i1: int, i2: int) -> str:
        return text[html_tokens[i1][1]:html_tokens[i2 - 1][2]] if i2 > i1 else ''

    def scan_gap(j: int) -> str:
        if j <= 0 or j >= len(scan_tokens):
            return ''
        return scan.text[scan_tokens[j - 1][2]:scan_tokens[j][1]]

    def scan_piece(j1: int, j2: int) -> str:
        if j2 <= j1:
            return ''
        return clean_scan_piece(scan.text[scan_tokens[j1][1]:scan_tokens[j2 - 1][2]], vocabulary)

    out = [text[:html_tokens[0][1]]]
    pending_gap: str | None = None
    capitalise_next = False
    lower_next = False
    differences = []
    for tag, i1, i2, j1, j2 in opcodes:
        if tag == 'equal':
            decision = 'html'
        else:
            neighbours = confidences[max(j1 - 1, 0):j1 + 1] or [0]
            decision, reason = decide(tag, html_words[i1:i2], scan_words[j1:j2],
                                      scan_piece(j1, j2), confidences[j1:j2], min(neighbours),
                                      vocabulary)
            differences.append({'tag': tag, 'html': html_piece(i1, i2), 'scan': scan_piece(j1, j2),
                                'confidence': min(confidences[j1:j2], default=0),
                                'page': scan.pages[span[0] + min(j1, len(scan_words) - 1)],
                                'context': ' '.join(scan_words[max(j1 - 3, 0):j2 + 3]),
                                'html_norm': ' '.join(html_words[i1:i2]),
                                'scan_norm': ' '.join(scan_words[j1:j2]),
                                'decision': decision, 'reason': reason})
        if decision == 'html':
            for i in range(i1, i2):
                word = html_piece(i, i + 1)
                if capitalise_next:
                    word = word[:1].upper() + word[1:]
                    capitalise_next = False
                if lower_next and word.lower() in LOWERCASE_WORDS:
                    word = word.lower()
                lower_next = False
                out.append((gap(i) if pending_gap is None else pending_gap) + word)
                pending_gap = None
            continue
        if tag in ('replace', 'insert'):
            before = gap(i1) if pending_gap is None else pending_gap
            scan_before = scan_gap(j1)
            piece = scan_piece(j1, j2)
            mark = re.search(r'[,;:]', scan_before)
            if not has_punctuation(before) and mark:
                before = mark.group() + ' '
            elif ends_sentence(before) and '\n' not in before and piece[:1].islower():
                if j1 == 0 or ends_sentence(scan_before):
                    piece = piece[:1].upper() + piece[1:]
                else:
                    # The scan runs on where the HTML starts a new sentence.
                    before = (mark.group() if mark else '') + ' '
                    lower_next = not ends_sentence(scan_gap(j2))
            out.append(before + piece)
            pending_gap = ' ' if tag == 'insert' and i1 < len(html_tokens) else None
            capitalise_next = False
        else:
            before = gap(i1) if pending_gap is None else pending_gap
            after = gap(i2) if i2 < len(html_tokens) else ''
            pending_gap = before if has_punctuation(before) else after
            starts_sentence = i1 == 0 or bool(re.search(r'[.!?]["\')]*\s*$', ''.join(out)))
            capitalise_next = starts_sentence
    out.append(text[html_tokens[-1][2]:])
    rebuilt = re.sub(r'[ \t]+', ' ', ''.join(out))
    rebuilt = re.sub(r' ([,.;:!?])', r'\1', rebuilt)
    return rebuilt.strip().lstrip('.,;: '), differences


def similarity(text: str, scan: Scan, span: tuple[int, int]) -> float:
    return difflib.SequenceMatcher(None, normalise_words(text), scan.norms[span[0]:span[1]],
                                   autojunk=False).ratio()


def verify_items(items: list[dict], scan: Scan, vocabulary: set[str]) -> list[str]:
    problems = assign_segments(items, scan)
    for item in items:
        if not item.get('anchor'):
            item.update(span=None, final_text=tidy(item['text']), differences=[], similarity=0.0,
                        html_similarity=0.0)
            continue
        final_text, differences = reconcile(item['text'], scan, item['span'], vocabulary)
        final_text = tidy(apply_text_fixes(item, final_text, problems))
        if item_id(item) in TRANSCRIBED:
            final_text = TRANSCRIBED[item_id(item)]
        item.update(final_text=final_text, differences=differences,
                    html_similarity=similarity(item['text'], scan, item['span']),
                    similarity=similarity(final_text, scan, item['span']))
    return problems


def apply_text_fixes(item: dict, text: str, problems: list[str]) -> str:
    """Hand transcriptions from the page images where the OCR is too damaged to use."""
    for old, new in TEXT_FIXES.get(item_id(item), []):
        if old not in text:
            problems.append(f'text fix not applied to {item_id(item)}: {old!r}')
            continue
        text = text.replace(old, new)
    return text


def item_id(item: dict) -> str:
    fields = [item['kind']] + [str(item[k]) for k in ('planet', 'other', 'house', 'sign')
                               if k in item]
    if item['kind'] == 'aspect':
        fields.append('+'.join(item['aspects']))
    return ':'.join(fields)


SENTENCE_START_RE = re.compile(r"(\b\w+)?([.!?][\"')]*\s+)([a-z])")
ABBREVIATIONS = {'etc', 'viz', 'e', 'i', 'g', 'vs', 'cf'}


def capitalise_sentence(match: re.Match) -> str:
    word, gap, letter = match.group(1) or '', match.group(2), match.group(3)
    if word.lower() in ABBREVIATIONS:
        return match.group(0)
    return word + gap + letter.upper()


def tidy(text: str) -> str:
    """No em dashes in the output (house style): the double hyphen becomes a spaced hyphen."""
    text = re.sub(r'\s*(--|\u2014)\s*', ' - ', text)
    text = text.replace(',;', ',').replace('>From', 'From')
    text = re.sub(r'(\w)- (\w)', r'\1-\2', text)
    text = SENTENCE_START_RE.sub(capitalise_sentence, text)
    return re.sub(r'[ \t]+', ' ', text).strip()


def describe(item: dict) -> str:
    fields = [item['kind']] + [str(item[k]) for k in ('planet', 'other', 'house', 'sign', 'lead')
                               if k in item]
    return ' '.join(fields) + f' ({item["file"]}:{item["line"]})'


# ----------------------------------------------------------------------------------------
# Items -> keyed passages
# ----------------------------------------------------------------------------------------

def roman(number: int) -> str:
    return ROMAN_NUMERALS[number - 1]


def title_case(text: str) -> str:
    small = {'of', 'the', 'in', 'and', 'or', 'with', 'to', 'a'}
    words = text.lower().split()
    return ' '.join(w if i and w in small else w.capitalize() for i, w in enumerate(words))


def passage_from(items: list[dict], heading: str) -> dict:
    sims = [item['similarity'] for item in items]
    similarity_value = round(min(sims), 3)
    return {
        'heading': heading,
        'text': '\n\n'.join(item['final_text'] for item in items),
        'verified': all(item['span'] is not None for item in items)
        and (similarity_value >= SIMILARITY_THRESHOLD
             or all(item_id(item) in TRANSCRIBED for item in items)),
        'similarity': similarity_value,
    }


def contained_share(first: dict, second: dict) -> float:
    """Share of the shorter text's words that also stand, in order, in the longer one."""
    words_first, words_second = normalise_words(first['final_text']), normalise_words(second['final_text'])
    matcher = difflib.SequenceMatcher(None, words_first, words_second, autojunk=False)
    matched = sum(block.size for block in matcher.get_matching_blocks())
    return matched / max(min(len(words_first), len(words_second)), 1)


def aspect_groups_of(item: dict) -> list[str]:
    return [group for group, words in ASPECT_GROUPS.items()
            if any(word in item['aspects'] for word in words)]


def build_passages(items: list[dict]) -> tuple[dict, dict]:
    simple: dict[str, tuple[dict, str]] = {}
    aspect_parts: dict[str, list[dict]] = defaultdict(list)
    notes: dict[str, list[str]] = defaultdict(list)

    for order, item in enumerate(items):
        item['chapter_order'] = order
    for item in items:
        kind = item['kind']
        if kind == 'crossref':
            continue
        if kind == 'aspect':
            pair = sorted([item['planet'], item['other']], key=PLANETS.index)
            for group in aspect_groups_of(item):
                aspect_parts[f'{pair[0]}-{group}-{pair[1]}'].append(item)
            continue
        if kind == 'house':
            key, heading = f'house-{item["house"]}', f'The {ORDINALS[item["house"] - 1].capitalize()} House'
        elif kind == 'ascendant':
            key, heading = f'ascendant-{item["sign"]}', f'{item["sign"].capitalize()} Rising'
        elif kind == 'children':
            key, heading = f'sign-{item["sign"]}', f'The Children of {item["sign"].capitalize()}'
        elif kind == 'intro':
            key, heading = f'planet-{item["planet"]}', title_case(item['title'])
        elif kind == 'planet-house':
            key = f'{item["planet"]}-house-{item["house"]}'
            heading = f'{PLANET_NAMES[item["planet"]]} in the {ORDINALS[item["house"] - 1].capitalize()} House'
        else:
            key = f'{item["planet"]}-{item["sign"]}'
            heading = f'{PLANET_NAMES[item["planet"]]} in {item["sign"].capitalize()}'
        if key in simple:
            notes['duplicates'].append(f'{key}: second item at {item["file"]}:{item["line"]}')
            continue
        simple[key] = (item, heading)

    passages: dict[str, dict] = {}
    for key, (item, heading) in simple.items():
        passages[key] = passage_from([item], heading)

    for key, parts in aspect_parts.items():
        first, group, second = key.split('-')
        label = f'{PLANET_NAMES[first]} and {PLANET_NAMES[second]}, {GROUP_LABELS[group]}'
        kept = [parts[0]]
        for part in parts[1:]:
            index, share = max(((i, contained_share(k, part)) for i, k in enumerate(kept)),
                               key=lambda pair: pair[1])
            if share >= CONTAINED_SHARE:
                longer = max(kept[index], part, key=lambda p: len(p['final_text']))
                shorter = part if longer is kept[index] else kept[index]
                notes['near_duplicates'].append(
                    f'{key}: chapter {roman(shorter["chapter"])} text is contained in chapter '
                    f'{roman(longer["chapter"])} ({share:.2f}); kept chapter {roman(longer["chapter"])}')
                kept[index] = longer
                continue
            kept.append(part)
        kept.sort(key=lambda p: p['chapter_order'])
        sources = '; '.join(f'Chapter {roman(p["chapter"])}: "{p["lead"]}"' for p in kept)
        repeated = sorted({p['chapter'] for p in parts if p not in kept})
        if len(kept) > 1:
            heading = f'{label} ({len(kept)} passages joined, one per chapter - {sources}'
        else:
            heading = f'{label} ({sources}'
        if repeated:
            chapters = ', '.join(roman(number) for number in repeated)
            heading += f'; the same text in Chapter {chapters} is left out'
        heading += ')'
        passages[key] = passage_from(kept, heading)
        mixed = [p for p in kept if len(aspect_groups_of(p)) > 1]
        for part in mixed:
            notes['multi_group'].append(f'{key}: "{part["lead"]}" (Chapter {roman(part["chapter"])}) '
                                        f'covers {", ".join(aspect_groups_of(part))}')
    return order_passages(passages), notes


def order_passages(passages: dict) -> dict:
    order = []
    order += [f'ascendant-{s}' for s in SIGNS]
    order += [f'{p}-{s}' for p in PLANETS for s in SIGNS]
    order += [f'{p}-house-{h}' for p in PLANETS for h in range(1, 13)]
    for i, a in enumerate(PLANETS):
        for b in PLANETS[i + 1:]:
            order += [f'{a}-{g}-{b}' for g in ASPECT_GROUPS]
    order += [f'planet-{p}' for p in PLANETS]
    order += [f'sign-{s}' for s in SIGNS]
    order += [f'house-{h}' for h in range(1, 13)]
    unknown = [key for key in passages if key not in order]
    if unknown:
        raise ValueError(f'unexpected keys: {unknown}')
    return {key: passages[key] for key in order if key in passages}


# ----------------------------------------------------------------------------------------
# Output
# ----------------------------------------------------------------------------------------

SOURCE_NOTES = (
    'Text taken from the Rosicrucian Fellowship online edition and checked passage by passage '
    'against the ABBYY OCR (hOCR, with word confidences) of the 1918 third edition scanned by '
    'the Internet Archive (title page: "Third Edition, Enlarged and Revised", "Copyright 1918 '
    'by Max Heindel"; its advertisement pages announce tables "before the beginning of 1919"). '
    'The online edition is a later, edited text, so wherever its wording differs from the scan '
    'the 1918 wording and spelling are used (configuration for position, practise, Taurian, '
    'Saviour, aeroplanes); OCR misreadings and 1918 misprints are not copied. Two passages were '
    'transcribed from the page images: Sun in Scorpio (rewritten in the online edition) and '
    'Venus in Pisces (scanned page torn on one side). Punctuation is the online edition\'s '
    'except around corrected words. Page furniture, the online editorial notes and '
    'cross-references, and the online appendix on Pluto (not in the 1918 text) are left out. '
    'Double hyphens and dashes are written as " - ". Aspect keys group Heindel\'s aspects: '
    'conjunction = conjunction or parallel, harmonious = sextile or trine, tense = square or '
    'opposition; a passage he gives for several aspects at once ("parallel, conjunction, '
    'square or opposition") appears under every group it names. Heindel repeats most pairs '
    'in both planets\' chapters: both texts are joined unless one holds all but a few words of '
    'the other, in which case the longer is kept; the heading says which. similarity is the '
    'word-level difflib ratio between the text and the matching scan text; passages under '
    f'{SIMILARITY_THRESHOLD} are verified: false unless transcribed from the page image (Venus '
    'in Pisces scores low only because the OCR of its torn page is broken). Background keys: '
    'planet-<id> is the '
    'opening of each planet chapter (VIII to XVII), sign-<sign> is Chapter VII "Children of '
    'the Twelve Signs" (written about children), house-<n> is the closing list of Chapter IV '
    '"Mundane Houses".'
)

MD_SECTIONS = [
    ('Rising signs (Chapter V)', lambda key: key.startswith('ascendant-')),
    ('Planets in the signs', lambda key: key.count('-') == 1 and key.split('-')[0] in PLANETS),
    ('Planets in the houses', lambda key: '-house-' in key),
    ('Aspects', lambda key: any(f'-{group}-' in key for group in ASPECT_GROUPS)),
    ('Planets: chapter openings (background)', lambda key: key.startswith('planet-')),
    ('Children of the twelve signs, Chapter VII (background)',
     lambda key: key.startswith('sign-')),
    ('Mundane houses, Chapter IV (background)', lambda key: key.startswith('house-')),
]


def write_outputs(passages: dict, json_path: Path, md_path: Path) -> None:
    document = {
        'source': {
            'title': 'The Message of the Stars',
            'authors': 'Max Heindel and Augusta Foss Heindel',
            'year': 1918,
            'edition_used': 'Third edition, enlarged and revised, Rosicrucian Fellowship, '
                            'Oceanside, California, copyright 1918 (Internet Archive scan of '
                            'the University of California Libraries copy)',
            'scan_url': SCAN_URL,
            'html_url': HTML_TOC_URL,
            'notes': SOURCE_NOTES,
        },
        'passages': passages,
    }
    json_path.write_text(json.dumps(document, ensure_ascii=False, indent=2) + '\n',
                         encoding='utf-8')

    lines = ['# The Message of the Stars (1918) - natal delineations', '',
             'Max Heindel and Augusta Foss Heindel. Generated by scripts/extract-heindel.py '
             f'from {HTML_TOC_URL}, checked against {SCAN_URL}. The JSON next to this file is '
             'the source of truth.', '']
    section = None
    for key, passage in passages.items():
        title = next(title for title, matches in MD_SECTIONS if matches(key))
        if title != section:
            section = title
            lines += [f'# {title}', '']
        lines.append(f'## {key}: {passage["heading"]}')
        lines.append('')
        if not passage['verified']:
            lines.append(f'_Not verified against the 1918 scan (similarity '
                         f'{passage["similarity"]})._')
            lines.append('')
        lines.append(passage['text'])
        lines.append('')
    md_path.write_text('\n'.join(lines), encoding='utf-8')


def write_report(path: Path, items: list[dict], problems: list[str], notes: dict) -> None:
    lines = ['# problems'] + problems + ['']
    for name, entries in notes.items():
        lines += [f'# {name}'] + entries + ['']
    lines.append('# differences')
    for item in items:
        for difference in item.get('differences', []):
            lines.append(f'{item_id(item)} | {difference["tag"]} | {difference["decision"]} | '
                         f'{difference["reason"]} | conf {difference["confidence"]} | page {difference["page"]} | '
                         f'HTML: {difference["html"]!r} | '
                         f'SCAN: {difference["scan"]!r} | KEY: ({difference["html_norm"]!r}, '
                         f'{difference["scan_norm"]!r}) | CTX: {difference["context"]}')
    lines.append('')
    lines.append('# similarity')
    for item in sorted(items, key=lambda i: i['similarity']):
        lines.append(f'{item["similarity"]:.3f} (html {item["html_similarity"]:.3f}) '
                     f'{item_id(item)} {describe(item)}')
    path.write_text('\n'.join(lines), encoding='utf-8')


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--raw-dir', type=Path, required=True)
    parser.add_argument('--json', type=Path, default=DEFAULT_JSON)
    parser.add_argument('--md', type=Path, default=DEFAULT_MD)
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()

    download_sources(args.raw_dir)
    blocks = parse_html_blocks(args.raw_dir)
    items, problems = segment(blocks)
    scan = Scan((args.raw_dir / SCAN_TEXT_FILE).read_text(encoding='utf-8'))
    vocabulary = build_vocabulary(blocks)
    problems += verify_items(items, scan, vocabulary)
    passages, notes = build_passages(items)
    write_outputs(passages, args.json, args.md)
    if args.report:
        write_report(args.report, items, problems, notes)

    counts = Counter()
    for key in passages:
        if key.startswith('ascendant-'):
            counts['ascendant'] += 1
        elif key.startswith(('planet-', 'sign-', 'house-')):
            counts[key.split('-')[0]] += 1
        elif '-house-' in key:
            counts['planet-house'] += 1
        elif any(f'-{group}-' in key for group in ASPECT_GROUPS):
            counts[key.split('-')[1]] += 1
        else:
            counts['planet-sign'] += 1
    unverified = [key for key, passage in passages.items() if not passage['verified']]
    print(json.dumps({'counts': counts, 'unverified': unverified, 'problems': len(problems)},
                     indent=2))


if __name__ == '__main__':
    main()
