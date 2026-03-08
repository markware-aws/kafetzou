from pydantic import BaseModel, Field


class TarotReading(BaseModel):
    cards: list[str] = Field(..., description="The drawn card names")
    interpretation: str = Field(..., description="Mystical interpretation of the spread")
    advice: str = Field(..., description="Practical guidance drawn from the cards")
    summary: str = Field(..., description="One-sentence essence of the reading")
