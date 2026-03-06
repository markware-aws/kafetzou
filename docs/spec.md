You are a senior backend engineer.

Extend the existing AI Coffee Cup Reading project by implementing a **two-step AI vision pipeline** for reading coffee cups.

The goal is to improve reading quality by separating:

1. Vision analysis (symbol detection)
2. Fortune interpretation

Do NOT perform both tasks in a single AI call.

---

# 1. Pipeline Overview

The coffee reading pipeline must follow this architecture:

User uploads image
→ S3
→ FastAPI backend
→ Step 1: Vision Analysis (detect symbols)
→ Step 2: Fortune Interpretation
→ Store result in DynamoDB
→ Return structured reading

Both steps must use the **OpenAI API with model `gpt-4o-mini`**.

---

# 2. Backend Service Structure

Extend the backend with the following services:

app/services/

openai_service.py
vision_service.py
fortune_service.py

---

# 3. Step 1 — Vision Analysis

The goal is to analyze the coffee cup image and detect shapes and patterns.

This step MUST NOT perform fortune telling.

Create a service:

vision_service.py

Function:

analyze_coffee_image(image_url: str) -> CoffeeVisionAnalysis

This function:

1. Sends the image to OpenAI
2. Uses a structured response schema
3. Extracts detected symbols
4. Returns structured data

---

# 4. Vision Prompt

Use the following system prompt:

"You are analyzing a photo of a Greek coffee cup after drinking.

Your task is to objectively detect shapes and patterns in the coffee grounds.

Do NOT perform fortune telling.

Identify shapes that resemble common tasseography symbols such as:

heart, bird, snake, road, tree, mountain, ring, house, star, person, eye.

For each symbol return:

- symbol name
- position in cup (rim, middle, bottom)
- confidence score
- short description

Also detect general patterns such as:

- density of grounds
- direction of lines
- clusters of shapes

Return structured JSON only."

---

# 5. Vision Pydantic Schema

Create schema file:

app/schemas/vision.py

Define:

class CoffeeSymbol(BaseModel):
name: str
position: str
confidence: float
description: str

class CoffeeVisionAnalysis(BaseModel):
symbols: list[CoffeeSymbol]
density: str
flow_direction: str
notable_patterns: list[str]

---

# 6. Step 2 — Fortune Interpretation

Create service:

fortune_service.py

Function:

generate_coffee_reading(
vision_analysis: CoffeeVisionAnalysis
) -> CoffeeReading

This step takes the structured vision output and produces a mystical interpretation.

---

# 7. Fortune Prompt

Use this system prompt:

"You are a traditional Greek coffee reader (kafetzou).

Interpret the symbols detected in a coffee cup.

Symbols near the rim indicate events in the near future.
Symbols in the middle indicate medium-term events.
Symbols at the bottom indicate distant future.

Use traditional tasseography symbolism.

Provide a mystical, positive and entertaining interpretation.

Return JSON only."

Include the detected symbols as input.

---

# 8. Reading Schema

Create schema:

app/schemas/coffee_reading.py

class CoffeeReading(BaseModel):

```
general_message: str
love: str
career: str
luck: str
symbols: list[str]
prediction_summary: str
```

---

# 9. Backend Flow

Update endpoint:

POST /read-coffee

Flow:

1. Load image from S3
2. Run vision analysis
3. Generate fortune reading
4. Store both outputs in DynamoDB
5. Return reading

Pseudo flow:

vision = analyze_coffee_image(image_url)

reading = generate_coffee_reading(vision)

save_to_db(vision, reading)

return reading

---

# 10. DynamoDB Storage

Update the readings table to include:

vision_analysis
reading_result
symbols_detected
created_at

---

# 11. Logging

Log:

- detected symbols
- token usage
- AI response times

---

# 12. Error Handling

Handle:

- invalid image
- OpenAI failures
- parsing errors

Return meaningful HTTP errors.

---

# 13. Code Quality

Use:

- async functions
- Pydantic validation
- modular services
- clear typing
- docstrings

---

# 14. Deliverables

Generate:

- updated backend services
- Pydantic schemas
- OpenAI integration
- updated FastAPI endpoint
- example responses
- comments explaining the pipeline

Ensure the backend runs locally with:

uvicorn app.main:app --reload or docker

and the AI pipeline works end-to-end.
