import asyncio

from app.schemas.coffee_reading import CoffeeReading
from app.schemas.vision import CoffeeSymbol, CoffeeVisionAnalysis
from app.services import fortune_service, writing_style


def _vision(symbols=None, letters=None) -> CoffeeVisionAnalysis:
    return CoffeeVisionAnalysis(
        is_coffee_cup=True,
        symbols=symbols if symbols is not None else [],
        letters=letters if letters is not None else [],
        density="μέτριο",
        flow_direction="προς το χείλος",
    )


def _symbol(name: str, confidence: float, position: str = "μέση") -> CoffeeSymbol:
    return CoffeeSymbol(name=name, position=position, confidence=confidence, description="σχήμα")


def _reading(**overrides) -> CoffeeReading:
    fields = {
        "general_message": "Εδώ στο χείλος έχετε ένα πουλί, νέα που έρχονται σύντομα.",
        "love": "Μια κουβέντα με τον σύντροφό σας βγαίνει καλά.",
        "career": "Μια πρόταση στη δουλειά θέλει προσοχή.",
        "luck": "Ένα μικρό ποσό έρχεται τις επόμενες μέρες.",
        "symbols": ["πουλί"],
        "prediction_summary": "Καλά νέα στην πόρτα.",
    }
    fields.update(overrides)
    return CoffeeReading(**fields)


class TestBuildSymbolsDescription:
    def test_should_list_clearest_symbols_first(self):
        vision = _vision([_symbol("φίδι", 0.3), _symbol("πουλί", 0.9), _symbol("δρόμος", 0.6)])

        text = fortune_service._build_symbols_description(vision)

        assert text.index("πουλί") < text.index("δρόμος") < text.index("φίδι")

    def test_should_mark_low_confidence_symbols_as_faint_without_percentages(self):
        vision = _vision([_symbol("φίδι", 0.3), _symbol("πουλί", 0.9)])

        text = fortune_service._build_symbols_description(vision)

        assert "φίδι (θέση: μέση, αχνό)" in text
        assert "πουλί (θέση: μέση, καθαρό)" in text
        assert "%" not in text

    def test_should_say_no_letters_when_none_were_seen(self):
        text = fortune_service._build_symbols_description(_vision([_symbol("πουλί", 0.9)]))

        assert "Γράμματα/αριθμοί: κανένα" in text

    def test_should_say_no_symbols_when_none_were_seen(self):
        text = fortune_service._build_symbols_description(_vision())

        assert "- κανένα" in text


class TestGenerateCoffeeReading:
    def test_should_send_the_cup_description_to_the_model(self, fake_chat):
        chat = fake_chat(_reading())

        asyncio.run(fortune_service.generate_coffee_reading(_vision([_symbol("πουλί", 0.9)], ["Μ"])))

        assert "πουλί (θέση: μέση, καθαρό)" in chat.calls[0]["user_text"]
        assert "Γράμματα/αριθμοί: Μ" in chat.calls[0]["user_text"]

    def test_should_regenerate_when_a_confidence_percentage_leaks(self, fake_chat):
        chat = fake_chat(
            _reading(general_message="Ένα πουλί με εμπιστοσύνη 80% φέρνει νέα."),
            _reading(),
        )

        reading, _ = asyncio.run(fortune_service.generate_coffee_reading(_vision([_symbol("πουλί", 0.8)])))

        assert len(chat.calls) == 2
        assert "ποσοστά" in chat.calls[1]["user_text"]
        assert "%" not in reading.general_message


class TestPromptExample:
    def test_should_pass_its_own_banned_check(self):
        example = fortune_service._EXAMPLE

        assert [label for label, pattern in fortune_service._BANNED_PATTERNS if pattern.search(example)] == []
        assert example.count("!") <= writing_style.MAX_EXCLAMATIONS
