from pydantic import BaseModel, Field


class CoffeeReading(BaseModel):
    general_message: str = Field(..., description="Overall fortune message")
    love: str = Field(..., description="Love and relationships interpretation")
    career: str = Field(..., description="Career and professional life interpretation")
    luck: str = Field(..., description="Luck and fortune interpretation")
    symbols: list[str] = Field(..., description="Key symbols that influenced the reading")
    prediction_summary: str = Field(..., description="Short mystical summary of the prediction")
