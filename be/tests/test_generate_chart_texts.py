import asyncio
import json
import random
import re
from pathlib import Path

import httpx
import openai
import pytest

from app.services import chart_service
from scripts import generate_chart_texts as gen

SCRIPT_PATH = Path(gen.__file__)


def _text(opening: str = "Κρατάτε τον λόγο σας", words: int = 170) -> str:
    """A text that passes every shape check: two paragraphs, `words` words, no point names."""
    filler = words - len(opening.split())
    first_count = filler // 2
    first = " ".join([opening, *["σταθερά"] * first_count]) + "."
    second = " ".join(["Προσέχετε", *["ήρεμα"] * (filler - first_count - 1)]) + "."
    return f"{first}\n\n{second}"


def _placement(key: str) -> gen.Placement:
    return gen.ALL_PLACEMENTS[key]


def _write_library(path: Path, texts: dict[str, str]) -> None:
    path.write_text(json.dumps({"texts": texts}, ensure_ascii=False), encoding="utf-8")


def _read_library(path: Path) -> dict[str, str]:
    return json.loads(path.read_text(encoding="utf-8"))["texts"]


def _sky_longitude(body: str, sun: float, rng: random.Random) -> float:
    """A random longitude that the sky allows: Mercury and Venus stay close to the Sun."""
    if body == "sun":
        return sun
    elongation = gen.MAX_ELONGATION.get(body)
    if elongation is None:
        return rng.uniform(0, 360)
    return (sun + rng.uniform(-elongation, elongation)) % 360


def _connection_error() -> openai.APIConnectionError:
    return openai.APIConnectionError(request=httpx.Request("POST", "https://api.openai.com"))


class TestKeys:
    def test_library_has_490_unique_keys(self):
        assert len(gen.ALL_KEYS) == 490
        assert len(set(gen.ALL_KEYS)) == 490

    def test_aspects_mercury_and_venus_cannot_reach_have_no_key(self):
        impossible = {
            f"{first}-{aspect}-{second}"
            for first, second in [("sun", "mercury"), ("sun", "venus")]
            for aspect in ["sextile", "square", "trine", "opposition"]
        } | {f"mercury-{aspect}-venus" for aspect in ["square", "trine", "opposition"]}

        assert len(impossible) == 11
        assert not impossible & set(gen.ALL_KEYS)
        assert {"sun-conjunction-mercury", "sun-conjunction-venus"} <= set(gen.ALL_KEYS)
        assert {"mercury-conjunction-venus", "mercury-sextile-venus"} <= set(gen.ALL_KEYS)

    def test_separation_is_bound_only_for_the_inner_planets(self):
        assert gen.max_separation("sun", "venus") == 48.0
        assert gen.max_separation("mercury", "venus") == 76.0
        assert gen.max_separation("sun", "mars") == 180.0
        assert gen.max_separation("mercury", "mars") == 180.0

    def test_keys_come_in_the_four_shapes_with_the_expected_counts(self):
        signs = "|".join(chart_service.ZODIAC_SIGNS)
        bodies = "|".join(chart_service.PLANET_BODIES)
        planets = "|".join(body for body in chart_service.PLANET_BODIES if body != "north_node")
        aspects = "|".join(aspect for aspect, _, _ in chart_service.ASPECTS)
        shapes = {
            "ascendant": re.compile(rf"ascendant-({signs})"),
            "sign": re.compile(rf"({bodies})-({signs})"),
            "house": re.compile(rf"({bodies})-house-([1-9]|1[0-2])"),
            "aspect": re.compile(rf"({planets})-({aspects})-({planets})"),
        }

        counts = dict.fromkeys(shapes, 0)
        for key in gen.ALL_KEYS:
            matching = [shape for shape, pattern in shapes.items() if pattern.fullmatch(key)]
            assert len(matching) == 1, key
            counts[matching[0]] += 1

        assert counts == {"ascendant": 12, "sign": 132, "house": 132, "aspect": 214}

    def test_sample_keys_are_library_keys(self):
        assert set(gen.SAMPLE_KEYS) <= set(gen.ALL_KEYS)
        assert len(gen.SAMPLE_KEYS) == 12

    def test_aspect_keys_put_the_planet_first_in_planet_bodies_order(self):
        order = list(chart_service.PLANET_BODIES)
        aspect_placements = [p for p in gen.ALL_PLACEMENTS.values() if p.aspect]

        assert len(aspect_placements) == 214
        for placement in aspect_placements:
            first, second = placement.points
            assert "north_node" not in placement.points
            assert order.index(first) < order.index(second), placement.key

    def test_every_aspect_find_aspects_reports_has_a_key(self):
        rng = random.Random(7)
        found_types = set()
        for _ in range(300):
            sun = rng.uniform(0, 360)
            planets = [
                {"id": body, "longitude": _sky_longitude(body, sun, rng)}
                for body in chart_service.PLANET_BODIES
            ]
            for aspect in chart_service.find_aspects(planets, include_moon=True):
                key = f"{aspect['planet_a']}-{aspect['type']}-{aspect['planet_b']}"
                assert key in gen.ALL_PLACEMENTS, key
                found_types.add(aspect["type"])

        assert found_types == {aspect for aspect, _, _ in chart_service.ASPECTS}

    def test_a_conjunction_of_all_planets_matches_the_45_conjunction_keys(self):
        planets = [{"id": body, "longitude": 100.0} for body in chart_service.PLANET_BODIES]

        found = {
            f"{aspect['planet_a']}-{aspect['type']}-{aspect['planet_b']}"
            for aspect in chart_service.find_aspects(planets, include_moon=True)
        }

        expected = {key for key, p in gen.ALL_PLACEMENTS.items() if p.aspect == "conjunction"}
        assert found == expected
        assert len(found) == 45


class TestPrompt:
    def test_house_text_names_the_theme_from_the_natal_data(self):
        user_text = gen.build_user_text(_placement("venus-house-8"))

        assert "Αφροδίτη" in user_text
        assert "κοινά οικονομικά" in user_text

    def test_node_is_described_as_a_point(self):
        user_text = gen.build_user_text(_placement("north_node-house-5"))

        assert "σημείο, όχι πλανήτης" in user_text

    def test_outer_planet_aspects_and_signs_get_the_generation_note(self):
        assert "γενιά" in gen.build_user_text(_placement("uranus-conjunction-neptune"))
        assert "γενιά" in gen.build_user_text(_placement("pluto-scorpio"))
        assert "γενιά" not in gen.build_user_text(_placement("mars-square-pluto"))
        assert "γενιά" not in gen.build_user_text(_placement("pluto-house-4"))

    def test_openings_other_texts_share_are_named_as_ones_to_avoid(self):
        user_text = gen.build_user_text(
            _placement("sun-scorpio"),
            gen.Habits(openings={gen.opening_key("Όταν κάτι σας"): "Όταν κάτι σας"}),
        )

        assert "«Όταν κάτι σας»" in user_text

    def test_neighbouring_keys_get_different_hints(self):
        first = gen.build_user_text(_placement("sun-aries")).splitlines()
        second = gen.build_user_text(_placement("sun-taurus")).splitlines()

        for prefix in ("Άνοιγμα", "Ονομασία"):
            first_line = next(line for line in first if line.startswith(prefix))
            second_line = next(line for line in second if line.startswith(prefix))
            assert first_line != second_line, prefix

    def test_hints_do_not_change_between_runs(self):
        placement = _placement("venus-house-8")

        assert gen.build_user_text(placement) == gen.build_user_text(placement)

    def test_system_prompt_uses_the_neutral_gender_rule(self):
        assert gen.writing_style.gender_rule(None) in gen.SYSTEM_PROMPT

    def test_script_has_no_em_or_en_dashes(self):
        source = SCRIPT_PATH.read_text(encoding="utf-8")

        assert "\u2014" not in source
        assert "\u2013" not in source


class TestChecks:
    def test_a_well_shaped_text_has_no_problems(self):
        assert gen.all_problems(_text(), _placement("sun-scorpio")) == []

    def test_one_paragraph_is_accepted(self):
        text = _text().replace("\n\n", " ")

        assert gen.text_problems(text, _placement("sun-scorpio")) == []

    def test_three_paragraphs_are_flagged(self):
        text = _text().replace("σταθερά σταθερά", "σταθερά.\n\nσταθερά", 1)

        problems = gen.text_problems(text, _placement("sun-scorpio"))

        assert problems == ["3 παράγραφοι αντί για μία ή δύο"]

    def test_single_line_breaks_count_as_paragraphs_and_are_normalized(self):
        text = _text().replace("\n\n", "\n")

        assert gen.text_problems(text, _placement("sun-scorpio")) == []
        assert gen.normalize_text(text) == _text()

    def test_too_short_and_too_long_texts_are_flagged(self):
        short = gen.text_problems(_text(words=139), _placement("sun-scorpio"))
        long = gen.text_problems(_text(words=191), _placement("sun-scorpio"))

        assert short == ["139 λέξεις αντί για 140 έως 190"]
        assert long == ["191 λέξεις αντί για 140 έως 190"]

    @pytest.mark.parametrize(
        ("key", "opening"),
        [
            ("sun-scorpio", "Ο Ήλιος σας"),
            ("sun-scorpio", "Με τον Ήλιο"),
            ("ascendant-pisces", "Ο Ωροσκόπος στους"),
            ("north_node-house-5", "Ο Βόρειος Δεσμός"),
            ("mars-square-pluto", "Ο Πλούτωνας και"),
        ],
    )
    def test_opening_with_the_placement_name_is_flagged(self, key, opening):
        problems = gen.text_problems(_text(opening), _placement(key))

        assert any(problem.startswith("ξεκινά με το όνομα") for problem in problems)

    def test_naming_another_point_of_the_chart_is_flagged(self):
        text = _text("Κρατάτε τον λόγο σας, όπως και η Σελήνη σας,")

        problems = gen.text_problems(text, _placement("sun-scorpio"))

        assert problems == ["άλλα σημεία του χάρτη (Σελήνη): γράψτε μόνο για αυτή τη θέση"]

    def test_both_planets_of_an_aspect_may_be_named(self):
        text = _text("Κρατάτε τον λόγο σας, με τον Ήλιο και τη Σελήνη σας")

        assert gen.text_problems(text, _placement("sun-trine-moon")) == []

    def test_everyday_lowercase_words_are_not_planets(self):
        text = _text("Κάτω από τον ίδιο ουρανό και στον ήλιο")

        assert gen.text_problems(text, _placement("venus-house-8")) == []

    def test_a_second_paragraph_opening_other_texts_share_is_flagged(self):
        avoided = {gen.opening_key("Στη δουλειά σας"): "Στη δουλειά σας"}
        text = _text().replace("Προσέχετε", "Στη δουλειά σας", 1)

        problems = gen.text_problems(text, _placement("sun-leo"), gen.Habits(openings=avoided))

        assert problems == ["άνοιγμα που έχουν ήδη άλλα κείμενα («Στη δουλειά σας»)"]

    def test_an_opening_other_texts_share_is_flagged(self):
        habits = gen.Habits(openings={gen.opening_key("Όταν κάτι σας"): "Όταν κάτι σας"})

        problems = gen.text_problems(_text("ΌΤΑΝ κάτι σας πιέζει"), _placement("sun-leo"), habits)

        assert problems == ["άνοιγμα που έχουν ήδη άλλα κείμενα («ΌΤΑΝ κάτι σας»)"]

    @pytest.mark.parametrize(
        ("phrase", "label"),
        [
            ("στον όγδοο οίκο σας", "οίκος με αριθμό"),
            ("στον οίκο 8", "αριθμοί με ψηφία"),
            ("δουλειά - σπίτι", "παύλες"),
            ("δουλειά \u2014 σπίτι", "παύλες"),
            ("**σημαντικό**", "μορφοποίηση markdown"),
            ("και το μάθημά σας είναι η υπομονή", "«Το μάθημα είναι»"),
            ("και η επιφύλαξη εδώ", "«Το μάθημα είναι»"),
            ("και το κάνετε μόνοι σας", "γένος για τον αναγνώστη"),
            ("και η θέση Ήλιος τρίγωνο Σελήνη", "η λέξη «θέση»"),
            ("η ενέργεια του χάρτη", "ενέργεια"),
            ("δεν είναι επιστήμη", "η ανάγνωση αμφισβητεί"),
        ],
    )
    def test_banned_patterns_include_natal_and_chart_text_rules(self, phrase, label):
        text = _text(f"Κρατάτε τον λόγο σας {phrase}")

        problems = gen.all_problems(text, _placement("venus-house-8"))

        assert any(problem.startswith(label) for problem in problems), problems


class TestResume:
    def test_existing_keys_are_skipped(self):
        todo, skipped = gen.select_keys(["sun-leo", "moon-leo", "sun-leo"], {"sun-leo": "x"}, False)

        assert todo == ["moon-leo"]
        assert skipped == ["sun-leo"]

    def test_force_regenerates_existing_keys(self):
        todo, skipped = gen.select_keys(["sun-leo", "moon-leo"], {"sun-leo": "x"}, True)

        assert todo == ["sun-leo", "moon-leo"]
        assert skipped == []

    def test_missing_library_file_loads_as_empty(self, tmp_path):
        assert gen.load_texts(tmp_path / "chart-texts.json") == {}

    def test_run_generates_only_missing_keys_and_writes_the_contract(self, tmp_path, fake_chat):
        output = tmp_path / "chart-texts.json"
        _write_library(output, {"sun-scorpio": "Παλιό κείμενο."})
        chat = fake_chat(gen.ChartText(text=_text()))

        result = asyncio.run(gen.run(["sun-scorpio", "moon-virgo"], output))

        assert result.generated == ["moon-virgo"]
        assert result.skipped == ["sun-scorpio"]
        assert len(chat.calls) == 1
        assert "Σελήνη στο ζώδιο Παρθένος" in chat.calls[0]["user_text"]
        assert chat.calls[0]["system_prompt"] == gen.SYSTEM_PROMPT
        raw = output.read_text(encoding="utf-8")
        assert "Κρατάτε" in raw  # ensure_ascii=False keeps the Greek readable
        assert list(json.loads(raw)) == ["texts"]
        texts = _read_library(output)
        assert list(texts) == ["moon-virgo", "sun-scorpio"]
        assert texts["sun-scorpio"] == "Παλιό κείμενο."
        assert texts["moon-virgo"] == _text()

    def test_a_text_with_problems_is_regenerated_once_and_reported(self, tmp_path, fake_chat):
        output = tmp_path / "chart-texts.json"
        fake_chat(gen.ChartText(text=_text(words=120)), gen.ChartText(text=_text()))

        result = asyncio.run(gen.run(["moon-virgo"], output))

        assert result.regenerated == {"moon-virgo": ["120 λέξεις αντί για 140 έως 190"]}
        assert result.remaining == {}
        assert result.usage["total_tokens"] == 30

    def test_a_failed_key_is_logged_and_the_others_are_saved(self, tmp_path, monkeypatch):
        output = tmp_path / "chart-texts.json"

        async def fake_generate(placement, habits, material):
            if placement.key == "moon-virgo":
                raise ValueError("OpenAI returned an empty structured response")
            return gen.GeneratedText(_text(), {"total_tokens": 1}, [], [])

        monkeypatch.setattr(gen, "generate_text", fake_generate)

        result = asyncio.run(gen.run(["sun-leo", "moon-virgo", "venus-house-8"], output))

        assert result.failed == ["moon-virgo"]
        assert sorted(result.generated) == ["sun-leo", "venus-house-8"]
        assert sorted(_read_library(output)) == ["sun-leo", "venus-house-8"]

    def test_the_file_is_saved_after_every_text(self, tmp_path, monkeypatch):
        output = tmp_path / "chart-texts.json"
        saved_sizes = []

        async def fake_generate(placement, habits, material):
            if output.exists():
                saved_sizes.append(len(_read_library(output)))
            return gen.GeneratedText(_text(), {}, [], [])

        monkeypatch.setattr(gen, "generate_text", fake_generate)

        asyncio.run(gen.run(["sun-leo", "moon-leo", "mars-leo"], output, concurrency=1))

        assert saved_sizes == [1, 2]
        assert len(_read_library(output)) == 3


class TestRetries:
    def test_transient_errors_are_retried_with_growing_waits(self):
        calls = []
        waits = []

        async def flaky():
            calls.append(1)
            if len(calls) < 3:
                raise _connection_error()
            return "ok"

        async def fake_sleep(seconds):
            waits.append(seconds)

        result = asyncio.run(gen.call_with_retries(flaky, base_delay=2.0, sleep=fake_sleep))

        assert result == "ok"
        assert waits == [2.0, 4.0]

    def test_gives_up_after_the_last_attempt(self):
        async def always_down():
            raise _connection_error()

        async def fake_sleep(seconds):
            pass

        with pytest.raises(openai.APIConnectionError):
            asyncio.run(gen.call_with_retries(always_down, attempts=3, sleep=fake_sleep))

    def test_other_errors_are_not_retried(self):
        waits = []

        async def broken():
            raise ValueError("bad response")

        async def fake_sleep(seconds):
            waits.append(seconds)

        with pytest.raises(ValueError):
            asyncio.run(gen.call_with_retries(broken, sleep=fake_sleep))
        assert waits == []


class TestReport:
    def test_word_stats_give_min_average_and_max(self):
        stats = gen.word_stats([_text(words=150), _text(words=160), _text(words=185)])

        assert stats == (150, 165.0, 185)

    def test_word_stats_of_no_texts_is_none(self):
        assert gen.word_stats([]) is None

    def test_shared_openings_ignore_accents_and_case_and_need_three_texts(self):
        texts = {
            "sun-leo": _text("Όταν κάτι σας πιέζει"),
            "moon-leo": _text("ΟΤΑΝ κατι σας αρέσει"),
            "mars-leo": _text("όταν κάτι σας θυμώνει"),
            "venus-leo": _text("Κρατάτε τον λόγο σας"),
            "jupiter-leo": _text("Κρατάτε τον λόγο σας"),
        }

        shared = gen.shared_openings(texts)

        # Shown as the first key in sorted order wrote it
        assert shared == [("όταν κάτι σας", ["mars-leo", "moon-leo", "sun-leo"])]

    def test_shared_openings_of_the_second_paragraph(self):
        second = "Στη δουλειά σας κρατάτε τον λόγο σας και οι άλλοι το ξέρουν."
        openings = [("sun-leo", "Α β γ"), ("moon-leo", "Δ ε ζ"), ("mars-leo", "Η θ ι")]
        texts = {key: f"{opening} σταθερά.\n\n{second}" for key, opening in openings}

        assert gen.shared_openings(texts) == []
        assert gen.shared_openings(texts, paragraph=1) == [
            ("Στη δουλειά σας", ["mars-leo", "moon-leo", "sun-leo"])
        ]

    def test_avoided_openings_count_both_paragraphs(self):
        texts = [
            "Κρατάτε τον λόγο σας.\n\nΣτη δουλειά σας προσέχετε.",
            "Σας αρέσει η τάξη.\n\nΣτη δουλειά σας βιάζεστε.",
        ]

        avoided = gen.avoided_openings(texts)

        assert avoided == {gen.opening_key("Στη δουλειά σας"): "Στη δουλειά σας"}

    def test_avoided_openings_need_two_texts(self):
        texts = [_text("Όταν κάτι σας"), _text("όταν κάτι σας"), _text("Κρατάτε τον λόγο")]

        avoided = gen.avoided_openings(texts)

        assert avoided[gen.opening_key("όταν κατι σας")] == "Όταν κάτι σας"
        assert gen.opening_key("Κρατάτε τον λόγο") not in avoided

    def test_report_shows_counts_words_openings_and_tokens(self, tmp_path):
        result = gen.RunResult(
            generated=["sun-leo"],
            skipped=["moon-leo"],
            failed=["mars-leo"],
            remaining={"sun-leo": ["160 λέξεις"]},
            usage={"prompt_tokens": 100, "completion_tokens": 50, "total_tokens": 150},
        )
        texts = {"sun-leo": _text(words=160), "moon-leo": _text(words=180)}

        report = gen.format_report(result, texts, ["sun-leo", "moon-leo", "mars-leo"], tmp_path)

        assert "Generated: 1   Skipped: 1   Failed: 1" in report
        assert "Failed keys (rerun with --keys): mars-leo" in report
        assert "min 160, avg 170.0, max 180" in report
        assert "Still with problems after the retry: 1" in report
        assert "3-word text openings shared by 3+ texts: none" in report
        assert "3-word second-paragraph openings shared by 3+ texts: none" in report
        assert "total 150" in report

    def test_markdown_lists_each_key_with_its_text(self, tmp_path):
        path = tmp_path / "sample.md"

        gen.write_markdown(path, ["sun-leo", "moon-leo"], {"sun-leo": "Α.\n\nΒ."})

        assert path.read_text(encoding="utf-8") == "# Chart texts\n\n## sun-leo\n\nΑ.\n\nΒ.\n"


class TestCli:
    def test_unknown_keys_are_rejected(self, capsys):
        with pytest.raises(SystemExit):
            gen.parse_args(["--keys", "sun-leo,sun-house-13"])

        assert "sun-house-13" in capsys.readouterr().err

    def test_sample_selects_the_review_keys(self):
        _, keys = gen.parse_args(["--sample"])

        assert keys == list(gen.SAMPLE_KEYS)


class TestStockParagraphOpening:
    def test_second_paragraph_starting_with_stin_kathimerinotita_is_flagged(self):
        text = _text().replace("Προσέχετε", "Στην καθημερινότητα", 1)

        problems = gen.all_problems(text, _placement("sun-leo"))

        assert any("Στην καθημερινότητα" in problem for problem in problems)

    def test_the_phrase_inside_a_sentence_is_allowed(self):
        text = _text("Κρατάτε στην καθημερινότητα σας")

        assert gen.all_problems(text, _placement("sun-leo")) == []


def _keys(text: str) -> set:
    return {key for key, _ in gen.text_phrases(text)}


class TestHabits:
    def test_every_form_of_a_tracked_word_counts_as_one(self):
        assert ("ξεχωρ",) in _keys("Ξεχωρίστε τι θέλετε.")
        assert ("ξεχωρ",) in _keys("Μάθετε να ξεχωρίζετε τα σημαντικά.")

    def test_phrases_are_compared_by_stem(self):
        assert ("δυσκο", "συζητ") in _keys("Αποφεύγετε τις δύσκολες συζητήσεις.")
        assert ("δυσκο", "συζητ") in _keys("Μια δύσκολη συζήτηση σας κουράζει.")

    def test_sentence_openers_are_tracked_by_stem(self):
        opener = ("^", "πριν", "πειτε")

        assert opener in _keys("Κρατάτε τον λόγο. Πριν πείτε ναι, σκεφτείτε.")
        assert opener not in _keys("Σκεφτείτε καλά πριν πείτε ναι.")

    def test_a_phrase_needs_two_content_words(self):
        keys = _keys("Μάθετε να αφήνετε τα πράγματα.")

        assert ("να", "αφηνε") not in keys
        assert ("τα", "πραγμ") not in keys
        assert ("αφηνε", "τα", "πραγμ") in keys

    def test_grammar_only_phrases_names_and_house_words_are_not_tracked(self):
        keys = _keys("Ο Ήλιος σας στον τομέα των φίλων κάνει χωρίς να ρωτά.")

        assert not any("ηλιοσ" in key for key in keys)
        assert ("^", "ο", "ηλιοσ") not in keys
        assert ("στον", "τομεα", "των") not in keys

    def test_phrases_stay_inside_a_sentence(self):
        assert ("λογο", "κρατη") not in _keys("Δίνετε τον λόγο. Κρατήστε σημειώσεις.")

    def test_a_phrase_needs_three_texts_in_a_small_library(self):
        tic = "Κρατάτε τον λόγο. Πριν πείτε ναι, σκεφτείτε."
        other = "Κάτι άλλο εντελώς."

        two = gen.overused_phrases([tic, tic, other])
        three = gen.overused_phrases([tic, tic, tic, other])

        assert ("^", "πριν", "πειτε") not in {key for key, _, _ in two}
        assert ("^", "πριν", "πειτε") in {key for key, _, _ in three}

    def test_a_phrase_needs_a_tenth_of_a_large_library(self):
        filler = [f"Κείμενο αριθμός {word}." for word in ["ένα", "δύο"] * 18]
        tic = "Πριν πείτε ναι, σκεφτείτε."

        three_of_39 = gen.overused_phrases([tic] * 3 + filler)
        four_of_40 = gen.overused_phrases([tic] * 4 + filler)

        assert ("^", "πριν", "πειτε") not in {key for key, _, _ in three_of_39}
        assert ("^", "πριν", "πειτε") in {key for key, _, _ in four_of_40}

    def test_a_phrase_holding_a_shorter_overused_one_is_left_out(self):
        texts = ["Οι δύσκολες συζητήσεις σάς κουράζουν."] * 3

        keys = {key for key, _, _ in gen.overused_phrases(texts)}

        assert ("δυσκο", "συζητ") in keys
        assert ("δυσκο", "συζητ", "σασ") not in keys

    def test_a_phrase_holding_an_overused_tracked_word_is_left_out(self):
        texts = ["Μάθετε να ξεχωρίζετε τι θέλετε."] * 3

        keys = {key for key, _, _ in gen.overused_phrases(texts)}

        assert ("ξεχωρ",) in keys
        assert ("ξεχωρ", "τι", "θελετ") not in keys

    def test_overused_phrases_come_most_used_first(self):
        texts = ["Μεγάλα λόγια λέτε."] * 4 + ["Μικρές χαρές ψάχνετε."] * 3

        counts = [count for _, _, count in gen.overused_phrases(texts)]

        assert counts == sorted(counts, reverse=True)
        assert counts[0] == 4 and counts[-1] == 3

    def test_the_prompt_names_at_most_the_capped_number_of_phrases(self):
        # The number leads, so every word has its own stem
        words = [f"λ{index:03d}ξη" for index in range(gen.MAX_AVOIDED_PHRASES_IN_PROMPT + 10)]
        texts = [" ".join(f"{word} κάνει." for word in words)] * 3

        habits = gen.library_habits(texts)

        assert len(habits.phrases) == gen.MAX_AVOIDED_PHRASES_IN_PROMPT

    def test_the_prompt_lists_overused_phrases(self):
        habits = gen.Habits(phrases={("^", "πριν", "πειτε"): "Πριν πείτε"})

        user_text = gen.build_user_text(_placement("sun-leo"), habits)

        assert "«Πριν πείτε»" in user_text
        assert "σε κανέναν τύπο" in user_text

    def test_a_text_using_an_overused_phrase_in_another_form_is_flagged(self):
        habits = gen.Habits(phrases={
            ("δυσκο", "συζητ"): "δύσκολες συζητήσεις",
            ("δοκιμ",): "Δοκιμάστε",
        })
        text = _text("Δοκιμάζετε μια δύσκολη συζήτηση")

        problems = gen.text_problems(text, _placement("sun-leo"), habits)

        assert problems == [
            "λέξεις ή φράσεις που έχουν ήδη πολλά κείμενα («Δοκιμάζετε», «δύσκολη συζήτηση»)"
        ]

    def test_the_report_lists_overused_words_and_phrases(self, tmp_path):
        texts = {
            key: _text(f"Ξεχωρίστε {word} πρώτα")
            for key, word in [("sun-leo", "αυτό"), ("moon-leo", "εκείνο"), ("mars-leo", "κάτι")]
        }

        report = gen.format_report(gen.RunResult(), texts, list(texts), tmp_path)

        assert "Over-used words and phrases (in 10%+ of the library, at least 3 texts):" in report
        assert "ξεχωρ- («Ξεχωρίστε») x3 (100%)" in report

    def test_run_passes_the_library_habits_to_each_text(self, tmp_path, monkeypatch):
        output = tmp_path / "chart-texts.json"
        _write_library(output, {
            key: _text("Ξεχωρίστε τι θέλετε") for key in ["sun-leo", "moon-leo", "mars-leo"]
        })
        seen = []

        async def fake_generate(placement, habits, material):
            seen.append(habits)
            return gen.GeneratedText(_text(), {}, [], [])

        monkeypatch.setattr(gen, "generate_text", fake_generate)

        asyncio.run(gen.run(["venus-leo"], output))

        assert ("ξεχωρ",) in seen[0].phrases


FIXTURE_SOURCE = Path(__file__).parent / "fixtures" / "chart-text-source.json"


@pytest.fixture
def source():
    return gen.load_source(FIXTURE_SOURCE)


class TestSource:
    def test_only_verified_passages_are_loaded(self, source):
        assert "sun-scorpio" in source
        assert "moon-virgo" not in source
        assert "house-8" not in source
        assert source["sun-scorpio"].heading == "The Sun in Scorpio"

    @pytest.mark.parametrize(
        ("key", "expected"),
        [
            ("ascendant-pisces", "ascendant-pisces"),
            ("sun-scorpio", "sun-scorpio"),
            ("venus-house-8", "venus-house-8"),
            ("sun-conjunction-moon", "sun-conjunction-moon"),
            ("venus-sextile-jupiter", "venus-harmonious-jupiter"),
            ("venus-trine-jupiter", "venus-harmonious-jupiter"),
            ("mars-square-saturn", "mars-tense-saturn"),
            ("mars-opposition-saturn", "mars-tense-saturn"),
            ("pluto-scorpio", None),
            ("pluto-house-8", None),
            ("mars-square-pluto", None),
            ("north_node-house-5", None),
            ("north_node-leo", None),
        ],
    )
    def test_each_key_maps_to_its_passage_or_to_in_house(self, key, expected):
        assert gen.passage_key(_placement(key)) == expected

    def test_material_has_the_passage_and_the_sign_background(self, source):
        material = gen.source_material(_placement("sun-scorpio"), source)

        assert material.passage.heading == "The Sun in Scorpio"
        assert [passage.key for passage in material.background] == ["sign-scorpio"]

    def test_an_unverified_passage_leaves_the_key_without_one(self, source):
        material = gen.source_material(_placement("moon-virgo"), source)

        assert material.passage is None

    def test_an_unverified_background_passage_is_left_out(self, source):
        material = gen.source_material(_placement("venus-house-8"), source)

        assert material == gen.SourceMaterial()

    def test_both_aspects_of_a_group_get_the_group_passage(self, source):
        sextile = gen.source_material(_placement("venus-sextile-jupiter"), source)
        trine = gen.source_material(_placement("venus-trine-jupiter"), source)

        assert sextile.passage == trine.passage == source["venus-harmonious-jupiter"]

    def test_the_prompt_carries_the_passage_and_the_group_note(self, source):
        placement = _placement("venus-sextile-jupiter")

        user_text = gen.build_user_text(placement, material=gen.source_material(placement, source))

        assert "«Venus Sextile or Trine Jupiter»" in user_text
        assert "A generous and sociable disposition" in user_text
        assert "όλες τις αρμονικές όψεις" in user_text
        assert "Εξάγωνο: μια ευκαιρία" in user_text

    def test_a_key_without_a_passage_is_told_to_write_from_the_meaning(self, source):
        placement = _placement("moon-virgo")

        user_text = gen.build_user_text(placement, material=gen.source_material(placement, source))

        assert "Δεν υπάρχει απόσπασμα" in user_text
        assert "Unverified" not in user_text

    def test_pluto_keys_get_the_pluto_sheet_and_the_generation_note(self, source):
        placement = _placement("pluto-scorpio")

        user_text = gen.build_user_text(placement, material=gen.source_material(placement, source))

        assert "ο Πλούτωνας είναι το βάθος" in user_text
        assert "γενιά" in user_text
        assert "«Scorpio»" in user_text

    def test_node_keys_get_the_node_sheet_with_the_fortunate_point(self, source):
        placement = _placement("north_node-house-5")

        user_text = gen.build_user_text(placement, material=gen.source_material(placement, source))

        assert "σημείο, όχι πλανήτης" in user_text
        assert "Νότιος Δεσμός" in user_text
        assert "σημείο τύχης" in user_text
        assert "«The Fifth House»" in user_text

    def test_planets_from_the_book_get_no_meaning_sheet(self):
        user_text = gen.build_user_text(_placement("sun-scorpio"))

        assert "χωρίς πηγή" not in user_text

    def test_excerpt_keeps_whole_sentences_within_the_budget(self):
        text = "One two three. Four five six. Seven eight nine."

        assert gen.excerpt(text, 7) == "One two three. Four five six."
        assert gen.excerpt("One two three four five.", 3) == "One two three…"

    def test_coverage_counts_verified_in_house_and_missing_keys(self, source):
        verified, by_design, missing = gen.source_coverage(source)

        # Pluto: 12 signs, 12 houses, 45 aspects. North Node: 12 signs, 12 houses
        assert by_design == 93
        # sun-scorpio, venus sextile and trine jupiter, mars square and opposition saturn
        assert verified == 5
        assert missing == 490 - 93 - 5

    def test_run_counts_sourced_and_in_house_keys(self, tmp_path, monkeypatch, source):
        output = tmp_path / "chart-texts.json"
        materials = {}

        async def fake_generate(placement, habits, material):
            materials[placement.key] = material
            return gen.GeneratedText(_text(), {}, [], [])

        monkeypatch.setattr(gen, "generate_text", fake_generate)

        result = asyncio.run(gen.run(["sun-scorpio", "pluto-scorpio"], output, source=source))

        assert result.sourced == ["sun-scorpio"]
        assert result.in_house == ["pluto-scorpio"]
        assert materials["sun-scorpio"].passage.key == "sun-scorpio"

    def test_report_shows_source_use_and_library_coverage(self, tmp_path, source):
        result = gen.RunResult(generated=["sun-scorpio", "pluto-scorpio"])
        result.sourced, result.in_house = ["sun-scorpio"], ["pluto-scorpio"]
        texts = {"sun-scorpio": _text(), "pluto-scorpio": _text("Σας αρέσει το βάθος")}

        report = gen.format_report(result, texts, list(texts), tmp_path, source)

        assert (
            "Source: 1 generated keys used a verified passage "
            "(0 of them mostly or partly medical), 1 in-house"
        ) in report
        assert (
            "Source coverage of the library: 5 keys with a verified passage, "
            "93 in-house by design (Pluto, North Node), 392 without one"
        ) in report

    def test_markdown_names_the_source_of_each_text(self, tmp_path, source):
        path = tmp_path / "sample.md"
        texts = {"sun-scorpio": "Α.", "pluto-scorpio": "Β."}

        gen.write_markdown(path, ["sun-scorpio", "pluto-scorpio"], texts, source)

        markdown = path.read_text(encoding="utf-8")
        assert "Α.\n\nSource: The Sun in Scorpio (background: Scorpio)" in markdown
        assert "Β.\n\nSource: in-house (background: Scorpio)" in markdown

    @pytest.mark.parametrize(
        ("phrase", "label"),
        [
            ("και μια αρρώστια", "αρρώστιες"),
            ("ως τον θάνατο", "θάνατος"),
            ("και ένα ατύχημα", "θάνατος"),
            ("με τη βοήθεια του Θεού", "θρησκευτικό"),
            ("όπως λέει ο Heindel", "το βιβλίο"),
        ],
    )
    def test_what_the_adaptation_drops_is_flagged(self, phrase, label):
        problems = gen.all_problems(_text(f"Κρατάτε τον λόγο σας {phrase}"), _placement("sun-leo"))

        assert any(problem.startswith(label) for problem in problems), problems

    def test_a_missing_source_file_stops_the_run_before_any_call(self, tmp_path):
        code = gen.main(["--sample", "--source", str(tmp_path / "missing.json")])

        assert code == 2


class TestHarshSource:
    def test_planet_chapters_are_never_background(self):
        assert gen.background_keys(_placement("sun-scorpio")) == ["sign-scorpio"]
        assert gen.background_keys(_placement("venus-house-8")) == ["house-8"]
        assert gen.background_keys(_placement("venus-sextile-jupiter")) == []

    def test_every_flagged_medical_passage_is_a_passage_some_key_uses(self):
        used = {gen.passage_key(placement) for placement in gen.ALL_PLACEMENTS.values()}

        assert gen.MEDICAL_PASSAGES <= used
        assert gen.PARTLY_MEDICAL_PASSAGES <= used
        assert not gen.MEDICAL_PASSAGES & gen.PARTLY_MEDICAL_PASSAGES

    @pytest.mark.parametrize(
        ("key", "flag"),
        [
            ("mars-square-jupiter", "mostly"),
            ("mars-opposition-jupiter", "mostly"),
            ("sun-house-6", "mostly"),
            ("ascendant-virgo", "mostly"),
            ("saturn-pisces", "partly"),
            ("jupiter-square-saturn", "partly"),
            ("sun-scorpio", None),
            ("mars-trine-jupiter", None),
        ],
    )
    def test_library_keys_inherit_the_flag_of_their_passage(self, key, flag):
        placement = _placement(key)
        source_key = gen.passage_key(placement)
        source = {source_key: gen.Passage(source_key, "Heading", "Some text.")}

        material = gen.source_material(placement, source)

        assert gen.medical_flag(material) == flag

    def test_a_mostly_medical_passage_tells_the_model_to_lean_on_the_background(self):
        placement = _placement("sun-house-6")
        source = {"sun-house-6": gen.Passage("sun-house-6", "Sun in the Sixth House", "Text.")}

        user_text = gen.build_user_text(placement, material=gen.source_material(placement, source))

        assert "μιλά κυρίως για υγεία" in user_text

    def test_a_partly_medical_passage_tells_the_model_to_drop_that_part(self):
        placement = _placement("saturn-pisces")
        source = {"saturn-pisces": gen.Passage("saturn-pisces", "Saturn in Pisces", "Text.")}

        user_text = gen.build_user_text(placement, material=gen.source_material(placement, source))

        assert "Μέρος του αποσπάσματος μιλά για υγεία" in user_text

    def test_run_and_markdown_mark_medical_keys(self, tmp_path, monkeypatch):
        source = {"sun-house-6": gen.Passage("sun-house-6", "Sun in the Sixth House", "Text.")}

        async def fake_generate(placement, habits, material):
            return gen.GeneratedText(_text(), {}, [], [])

        monkeypatch.setattr(gen, "generate_text", fake_generate)
        output = tmp_path / "chart-texts.json"

        result = asyncio.run(gen.run(["sun-house-6", "sun-house-5"], output, source=source))

        assert result.medical == ["sun-house-6"]
        line = gen.source_line(_placement("sun-house-6"), source)
        assert line == "Source: Sun in the Sixth House [mostly medical]"

    @pytest.mark.parametrize(
        "phrase",
        ["και ένα έγκλημα", "ως τη φυλακή", "με βίαιο τρόπο", "μια ανέντιμη πλευρά"],
    )
    def test_crime_prison_violence_and_insults_are_flagged(self, phrase):
        problems = gen.all_problems(_text(f"Κρατάτε τον λόγο σας {phrase}"), _placement("sun-leo"))

        assert any(problem.startswith("έγκλημα, φυλακή") for problem in problems), problems

    def test_the_prompt_carries_the_harshness_and_conditional_rules(self):
        assert "δεν φτάνουν ποτέ ως τέτοιες στον αναγνώστη" in gen.SYSTEM_PROMPT
        assert "χωρίς τους μηχανισμούς των όψεων" in gen.SYSTEM_PROMPT
        assert "«parallel»" in gen.SYSTEM_PROMPT
        assert "Λίστες επαγγελμάτων" in gen.SYSTEM_PROMPT


class TestStyleFixes:
    @pytest.mark.parametrize(
        ("written", "fixed"),
        [
            ("Ο Πλούτωνας σας στον Σκορπιό", "Ο Πλούτωνάς σας στον Σκορπιό"),
            ("με τον Πλούτωνα σας", "με τον Πλούτωνά σας"),
            ("το Μεσουράνημα σας", "το Μεσουράνημά σας"),
            ("η θέση του Πλούτωνα του Σκορπιού", "η θέση του Πλούτωνα του Σκορπιού"),
            ("ο Πλούτωνας στον Σκορπιό", "ο Πλούτωνας στον Σκορπιό"),
            ("Ο Πλούτωνάς σας", "Ο Πλούτωνάς σας"),
            ("ο Ήλιος σας", "ο Ήλιος σας"),
        ],
    )
    def test_enclitic_accents_are_added_only_where_greek_needs_them(self, written, fixed):
        assert gen.fix_enclitic_accents(written) == fixed

    def test_normalize_text_fixes_the_enclitic_accent(self):
        assert gen.normalize_text("Ο Πλούτωνας σας.\nΤέλος.") == "Ο Πλούτωνάς σας.\n\nΤέλος."

    def test_the_accented_form_is_still_recognised_as_pluto(self):
        problems = gen.text_problems(_text("Ο Πλούτωνάς σας στον"), _placement("pluto-scorpio"))

        assert problems == ["ξεκινά με το όνομα της θέσης («Πλούτωνάς»)"]

    def test_about_a_third_of_the_library_may_have_a_simile(self):
        allowed = sum(gen.simile_allowed(placement) for placement in gen.ALL_PLACEMENTS.values())

        assert 0.25 < allowed / len(gen.ALL_KEYS) < 0.4

    def test_the_prompt_says_whether_this_text_may_have_a_simile(self):
        allowed = next(p for p in gen.ALL_PLACEMENTS.values() if gen.simile_allowed(p))
        not_allowed = next(p for p in gen.ALL_PLACEMENTS.values() if not gen.simile_allowed(p))

        assert "εδώ μπορείτε να βάλετε μία εικόνα" in gen.build_user_text(allowed)
        assert "χωρίς παρομοιώσεις" in gen.build_user_text(not_allowed)

    def test_a_simile_where_none_is_allowed_is_flagged(self):
        placement = next(p for p in gen.ALL_PLACEMENTS.values() if not gen.simile_allowed(p))

        problems = gen.text_problems(_text("Κρατάτε σαν βράχος τον λόγο"), placement)

        assert problems == ["παρομοίωση με «σαν» σε κείμενο χωρίς παρομοιώσεις"]

    def test_one_simile_is_fine_where_allowed_but_two_are_not(self):
        placement = next(p for p in gen.ALL_PLACEMENTS.values() if gen.simile_allowed(p))

        one = gen.text_problems(_text("Κρατάτε σαν βράχος τον λόγο"), placement)
        two = gen.text_problems(_text("Κρατάτε σαν βράχος σαν πέτρα"), placement)

        assert one == []
        assert two == ["περισσότερες από μία παρομοιώσεις με «σαν»"]

    @pytest.mark.parametrize(
        ("sentence", "seed"),
        [
            ("Αφήνετε χώρο για όλους.", ("χωρο",)),
            ("Έχετε σπάνια ευκολία να ακούτε.", ("^", "εχετε", "σπανι")),
            ("Κρατάτε τον λόγο. Έχετε σπάνια ικανότητα.", ("^", "εχετε", "σπανι")),
            ("Στις σχέσεις ζητάτε βάθος.", ("^", "στισ", "σχεσε")),
            ("Βιάζεστε μερικές φορές.", ("μερικ", "φορεσ")),
            ("Η καθαρή ματιά.", ("καθαρ",)),
            ("Ουσιαστικές σχέσεις.", ("ουσια",)),
            ("Σας βοηθά.", ("βοηθ",)),
            ("Οι γύρω σας.", ("γυρω",)),
        ],
    )
    def test_each_seed_matches_the_tic_it_names(self, sentence, seed):
        assert seed in gen.SEEDED_PHRASES
        assert seed in _keys(sentence)

    def test_the_seeded_tics_are_avoided_from_the_first_text(self):
        habits = gen.library_habits([])

        assert set(gen.SEEDED_PHRASES) <= set(habits.phrases)
        assert "«χώρο»" in gen.build_user_text(_placement("sun-leo"), habits)
        problems = gen.text_problems(_text("Αφήνετε χώρο στους"), _placement("sun-leo"), habits)
        assert problems == ["λέξεις ή φράσεις που έχουν ήδη πολλά κείμενα («χώρο»)"]

    def test_the_library_adds_its_own_tics_after_the_seeds(self):
        habits = gen.library_habits(["Μεγάλα λόγια λέτε."] * 3)

        phrases = list(habits.phrases)
        assert phrases[:len(gen.SEEDED_PHRASES)] == list(gen.SEEDED_PHRASES)
        assert ("μεγαλ", "λογια") in phrases

    def test_rooms_are_tracked(self):
        assert ("δωματ",) in _keys("Ανοίγετε ένα κλειστό δωμάτιο.")

    @pytest.mark.parametrize(
        "phrase",
        ["είτε υπάρχουν είτε όχι", "αν έχετε παιδιά", "αν δεν έχετε σύντροφο"],
    )
    def test_guessing_about_children_partner_or_work_is_flagged(self, phrase):
        problems = gen.all_problems(_text(f"Κρατάτε τον λόγο σας {phrase}"), _placement("sun-leo"))

        assert any(problem.startswith("υποθέσεις για παιδιά") for problem in problems), problems

    def test_the_prompt_names_no_concrete_idiom(self):
        assert "αχίλλειος" not in gen.SYSTEM_PROMPT
        assert "κάθε φορά άλλη" in gen.SYSTEM_PROMPT

    def test_the_report_lists_similes_and_the_seeded_tics(self, tmp_path):
        allowed = next(k for k, p in gen.ALL_PLACEMENTS.items() if gen.simile_allowed(p))
        texts = {allowed: _text("Κρατάτε σαν βράχος"), "sun-leo": _text("Αφήνετε χώρο εδώ")}

        report = gen.format_report(gen.RunResult(), texts, list(texts), tmp_path)

        assert f"Similes with «σαν»: 1 of 2 texts of the selected keys ({allowed})" in report
        assert "«χώρο» x1" in report


class TestReaderGender:
    @pytest.mark.parametrize(
        "phrase",
        [
            "ώσπου να νιώσετε έτοιμοι",
            "αυτό σας κάνει ευάλωτους",
            "σάς κάνει ιδιαίτερα ευαίσθητους",
            "να γίνετε καλοί",
            "μπορεί να γίνετε υπερβολικά αυστηροί",
        ],
    )
    def test_masculine_plural_adjectives_for_the_reader_are_flagged(self, phrase):
        problems = gen.all_problems(_text(f"Κρατάτε τον λόγο σας {phrase}"), _placement("sun-leo"))

        assert any(problem.startswith("επίθετα με γένος") for problem in problems), problems

    @pytest.mark.parametrize(
        "phrase",
        [
            "είστε άνθρωπος με θάρρος",
            "νιώθετε ενοχές",
            "σας κάνει να γελάτε",
            "σας κάνει πιο εύκολο να μιλάτε",
            "δείχνετε στους άλλους",
            "νιώθετε δικούς σας ανθρώπους",
        ],
    )
    def test_nouns_verbs_and_impersonal_phrases_pass(self, phrase):
        problems = gen.all_problems(_text(f"Κρατάτε τον λόγο σας {phrase}"), _placement("sun-leo"))

        assert not any(problem.startswith("επίθετα με γένος") for problem in problems), problems


class TestTrackedForms:
    @pytest.mark.parametrize("word", ["χώρο", "χώρος", "χώρου", "χώροι", "χώρους", "χώρων"])
    def test_every_form_of_choros_is_tracked(self, word):
        assert ("χωρο",) in _keys(f"Ένας {word} εδώ.")

    @pytest.mark.parametrize("word", ["χωρούν", "χωράει", "χωρίς", "χωριό"])
    def test_words_that_only_look_like_choros_are_not(self, word):
        assert ("χωρο",) not in _keys(f"Κάτι {word} εδώ.")


def test_the_gender_problem_quotes_what_was_written():
    problems = gen.text_problems(_text("Μπορεί να γίνετε απότομοι στα"), _placement("sun-leo"))

    assert problems == [
        "επίθετα με γένος για τον αναγνώστη («γίνετε απότομοι»): γράψτε με ουσιαστικό ή ρήμα"
    ]


# Real junk found in the first full library, after a clean Greek text
LEAKED_ENDINGS = [
    ".»}END:VEVENT (analysis) 140? count Greek ~143. Avoid phrase",
    ".»}The word `ξεχωρίσετε` banned in any form. Need replace.",
    ".»} ЖК} (Oops forbidden word space",
    ".»} T2} in reply? No. Need gender issue",
    ".»}}",
    ".»}[/]",
]
SLIPPED_WORDS = [
    "Δεν σας falta φαντασία",
    "να τη συνδέετε עם πράξεις",
    "Η εμπιστοσύνη σας μεγαλώνει בשקט",
    "μπορεί να σας κάνει απότομο/η",
]
EM_DASH = chr(0x2014)


class TestCharacters:
    @pytest.mark.parametrize("ending", LEAKED_ENDINGS)
    def test_model_notes_after_the_text_are_flagged(self, ending):
        problems = gen.text_problems(_text() + ending, _placement("sun-leo"))

        assert any(problem.startswith("ξένοι χαρακτήρες") for problem in problems), problems

    @pytest.mark.parametrize("words", SLIPPED_WORDS)
    def test_words_from_other_languages_and_slashes_are_flagged(self, words):
        problems = gen.text_problems(_text(f"Κρατάτε {words}"), _placement("sun-leo"))

        assert any(problem.startswith("ξένοι χαρακτήρες") for problem in problems), problems

    def test_the_problem_names_the_characters(self):
        problems = gen.character_problems("Κείμενο.»}[/]")

        assert problems[0].startswith("ξένοι χαρακτήρες («}», «[», «/», «]»)")

    @pytest.mark.parametrize("text", ["Λέτε «ναι» και «όχι».", "Ένα «ναι».", "Τίποτα."])
    def test_balanced_quotes_pass(self, text):
        assert gen.quotes_balanced(text)

    @pytest.mark.parametrize("text", ["Λέτε «ναι.", "Λέτε ναι».", "Λέτε »ναι«."])
    def test_unbalanced_quotes_are_flagged(self, text):
        assert not gen.quotes_balanced(text)
        assert "εισαγωγικά « » που δεν ανοίγουν και δεν κλείνουν σωστά" in (
            gen.character_problems(text)
        )

    def test_greek_text_with_the_allowed_punctuation_passes(self):
        text = (
            "Ά Έ Ή Ί Ό Ύ Ώ ά έ ή ί ό ύ ώ ϊ ϋ ΐ ΰ Ϊ Ϋ ς, «λόγια» (λίγα): απ"
            + chr(0x2019) + " όλα, απ' όλα" + chr(0x00B7) + chr(0x0387)
            + " τέλος! Ναι;\n\nΔεύτερη."
        )

        assert gen.character_problems(text) == []

    def test_the_guardrail_regenerates_a_text_with_junk(self, tmp_path, fake_chat):
        output = tmp_path / "chart-texts.json"
        fake_chat(
            gen.ChartText(text=_text() + LEAKED_ENDINGS[0]), gen.ChartText(text=_text())
        )

        result = asyncio.run(gen.run(["sun-leo"], output))

        assert any(p.startswith("ξένοι χαρακτήρες") for p in result.regenerated["sun-leo"])
        assert result.remaining == {}
        assert _read_library(output)["sun-leo"] == _text()

    def test_junk_is_never_stripped_silently(self):
        assert gen.normalize_text(_text() + ".»}}").endswith(".»}}")


class TestFix:
    def _library(self):
        return {
            "sun-leo": _text(),
            "moon-leo": _text() + ".»}}",
            "mars-leo": _text(words=198),
            "venus-leo": _text("Μπορεί να γίνετε απότομοι στα"),
        }

    def test_the_plan_lists_only_texts_with_problems(self):
        plan = gen.fix_plan(self._library())

        assert sorted(plan) == ["mars-leo", "moon-leo", "venus-leo"]

    def test_the_plan_ignores_tics(self):
        assert gen.fix_plan({"sun-leo": _text("Αφήνετε χώρο εδώ")}) == {}

    @pytest.mark.parametrize(
        ("problem", "category"),
        [
            ("198 λέξεις αντί για 140 έως 190", "N λέξεις αντί για 140 έως 190"),
            (
                "επίθετα με γένος για τον αναγνώστη («γίνετε απότομοι»): γράψτε με ουσιαστικό",
                "επίθετα με γένος για τον αναγνώστη",
            ),
            (f"παύλα ({EM_DASH})", "παύλα"),
            ("ξένοι χαρακτήρες («}»): γράψτε μόνο", "ξένοι χαρακτήρες"),
            ("ερώτηση", "ερώτηση"),
        ],
    )
    def test_problems_are_grouped_without_their_details(self, problem, category):
        assert gen.problem_category(problem) == category

    def test_the_dry_run_counts_keys_per_problem(self):
        report = gen.format_fix_plan(gen.fix_plan(self._library()), 4)

        assert report.startswith("--fix would regenerate 3 of 4 keys")
        assert "  ξένοι χαρακτήρες: 1\n    moon-leo" in report
        assert "  N λέξεις αντί για 140 έως 190: 1\n    mars-leo" in report
        assert "  επίθετα με γένος για τον αναγνώστη: 1\n    venus-leo" in report

    def test_fix_keeps_the_best_attempt_and_stops_when_clean(self, tmp_path, monkeypatch):
        output = tmp_path / "chart-texts.json"
        _write_library(output, self._library())
        attempts = {}
        answers = {
            "moon-leo": [_text() + ".»}}", _text("Ξεκινάτε πρωί πρωί")],
            "mars-leo": [_text(words=200), _text(words=195), _text(words=192)],
            "venus-leo": [_text() + "»}", _text(words=199) + "»}", _text("Κρατάτε όλα")],
        }

        async def fake_generate(placement, habits, material):
            attempts[placement.key] = attempts.get(placement.key, 0) + 1
            text = answers[placement.key][attempts[placement.key] - 1]
            return gen.GeneratedText(text, {"total_tokens": 1}, [], [])

        monkeypatch.setattr(gen, "generate_text", fake_generate)

        result = asyncio.run(gen.fix(output, concurrency=1))

        texts = _read_library(output)
        assert attempts == {"moon-leo": 2, "mars-leo": 3, "venus-leo": 3}
        assert sorted(result.fixed) == ["moon-leo", "venus-leo"]
        assert texts["moon-leo"] == _text("Ξεκινάτε πρωί πρωί")
        assert texts["venus-leo"] == _text("Κρατάτε όλα")
        # Every attempt was as bad as the original: the first of them replaces it
        assert texts["mars-leo"] == _text(words=200)
        assert result.still_failing == {"mars-leo": ["200 λέξεις αντί για 140 έως 190"]}
        assert texts["sun-leo"] == _text()
        assert result.usage["total_tokens"] == 8

    def test_fix_never_swaps_a_text_for_a_worse_one(self, tmp_path, monkeypatch):
        output = tmp_path / "chart-texts.json"
        _write_library(output, {"mars-leo": _text(words=198)})

        async def fake_generate(placement, habits, material):
            return gen.GeneratedText(_text(words=199) + "»}", {}, [], [])

        monkeypatch.setattr(gen, "generate_text", fake_generate)

        result = asyncio.run(gen.fix(output, concurrency=1))

        assert _read_library(output)["mars-leo"] == _text(words=198)
        assert result.still_failing == {"mars-leo": ["198 λέξεις αντί για 140 έως 190"]}

    def test_fix_report_names_the_keys_to_redo(self, tmp_path):
        result = gen.FixResult(
            planned={"mars-leo": ["x"], "moon-leo": ["y"]},
            fixed=["moon-leo"],
            still_failing={"mars-leo": ["198 λέξεις"]},
        )

        report = gen.format_fix_report(result, tmp_path)

        assert "Fix: 2 keys had problems, 1 fixed, 1 still failing" in report
        assert "  mars-leo: 198 λέξεις" in report
        assert "--keys mars-leo --force" in report

    def test_dry_run_needs_fix(self, capsys):
        with pytest.raises(SystemExit):
            gen.parse_args(["--all", "--dry-run"])

        assert "--dry-run only goes with --fix" in capsys.readouterr().err

    def test_fix_dry_run_prints_the_plan_without_a_source_or_calls(self, tmp_path, capsys):
        output = tmp_path / "chart-texts.json"
        _write_library(output, self._library())

        code = gen.main([
            "--fix", "--dry-run", "--output", str(output), "--source", str(tmp_path / "none.json")
        ])

        assert code == 0
        assert "--fix would regenerate 3 of 4 keys" in capsys.readouterr().out


class TestSelfDoubt:
    @pytest.mark.parametrize(
        "phrase",
        [
            "στη δημιουργία, στην ψυχαγωγία ή στη μετάδοση ιδεών",
            "η ψυχαγωγία και το παιχνίδι",
        ],
    )
    def test_entertainment_as_a_theme_passes(self, phrase):
        problems = gen.all_problems(_text(f"Κρατάτε τον λόγο σας {phrase}"), _placement("sun-leo"))

        assert not any(problem.startswith("η ανάγνωση αμφισβητεί") for problem in problems)

    @pytest.mark.parametrize(
        "phrase",
        [
            "όλα αυτά είναι μόνο για ψυχαγωγία",
            "για απλή ψυχαγωγία",
            "με ψυχαγωγικό χαρακτήρα",
            "απλώς ψυχαγωγία",
            "μην το πάρετε κατά γράμμα",
            "όχι κυριολεκτικά",
            "δεν είναι επιστήμη",
        ],
    )
    def test_disclaimers_still_fail(self, phrase):
        problems = gen.all_problems(_text(f"Κρατάτε τον λόγο σας {phrase}"), _placement("sun-leo"))

        assert any(problem.startswith("η ανάγνωση αμφισβητεί") for problem in problems), problems

    def test_the_natal_check_is_left_as_it_is(self):
        natal = gen.natal_service._SELF_DOUBT_PATTERNS[0][1]

        assert natal.search("στην ψυχαγωγία")
        assert sum(label == gen._SELF_DOUBT_LABEL for label, _ in gen.BANNED_PATTERNS) == 1
