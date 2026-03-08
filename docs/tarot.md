You are a senior full-stack engineer.

Extend the existing AI fortune reading project by adding a **Tarot Reading feature**.

The application already supports coffee cup readings.

Add tarot card readings as an additional feature.

---

# 1. Feature Overview

Users can perform a tarot reading.

The backend randomly selects tarot cards and generates an interpretation using OpenAI.

Supported spreads:

1 card reading
3 card reading (Past / Present / Future)

---

# 2. Tarot Dataset

Load tarot cards from:

tarot_cards.json

The dataset contains:

- 22 Major Arcana
- 56 Minor Arcana

Create a service:

services/tarot_service.py

---

# 3. Card Selection

Implement functions:

draw_one_card()

draw_three_cards()

Cards must be randomly selected from the full 78-card deck.

Avoid duplicates in a spread.

Example return:

{
"cards": [
"The Fool",
"Three of Cups",
"The Tower"
]
}

---

# 4. API Endpoint

Create endpoint:

POST /tarot-reading

Request:

{
"spread": "one_card"
}

or

{
"spread": "three_card"
}

---

# 5. OpenAI Integration

Use model:

gpt-4o-mini

Prompt example:

"You are a tarot reader.

Interpret the following tarot cards.

Spread type: Past / Present / Future

Past: {card1}
Present: {card2}
Future: {card3}

Provide a mystical interpretation."

---

# 6. Pydantic Schema

Create:

schemas/tarot_reading.py

class TarotReading(BaseModel):

```
cards: list[str]
interpretation: str
advice: str
summary: str
```

---

# 7. Backend Flow

tarot_cards = draw_three_cards()

reading = generate_tarot_reading(tarot_cards)

store_reading_in_db(reading)

return reading

---

# 8. Frontend

Add page:

/tarot

Add UI components:

- draw cards button
- display card names
- show AI interpretation

Use shadcn/ui components.

---

# 9. Dashboard

Users should see:

Coffee Reading
Tarot Reading

in the main dashboard.

---

# 10. Deliverables

Generate:

- tarot dataset loader
- tarot service
- API endpoint
- OpenAI integration
- frontend tarot page
- example responses
