from pydantic import BaseModel, Field


class CoffeeSymbol(BaseModel):
    name: str = Field(..., description="Name of the detected symbol (e.g. heart, bird, snake)")
    position: str = Field(..., description="Position in cup: rim, middle, or bottom")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score between 0 and 1")
    description: str = Field(..., description="Short description of the shape observed")


class CoffeeVisionAnalysis(BaseModel):
    is_coffee_cup: bool = Field(..., description="True if the image shows a Greek coffee cup with grounds")
    symbols: list[CoffeeSymbol] = Field(default_factory=list, description="Detected tasseography symbols")
    letters: list[str] = Field(default_factory=list, description="Letters or numbers visible in the grounds (e.g. 'Α', 'Μ', '7')")
    density: str = Field(default="άγνωστο", description="Density of coffee grounds: light, medium, or dense")
    flow_direction: str = Field(default="άγνωστο", description="Direction of lines or flow in the grounds")
    notable_patterns: list[str] = Field(default_factory=list, description="Notable overall patterns observed")
