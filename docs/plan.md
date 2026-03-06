You are a senior full-stack engineer.
Generate a complete production-ready project scaffold for an **AI Coffee Cup Reading Web App**.

The application allows users to upload a photo of their Greek coffee cup and receive an AI-generated fortune reading.

Use modern best practices and clear folder structure.

---

# 1. Architecture

The system must be serverless and consist of:

Frontend:

- Next.js (App Router)
- TailwindCSS
- shadcn/ui components
- Cognito authentication
- Hosted on S3 + CloudFront

The Next.js frontend MUST support static export (output: "export").
Do not use SSR, API routes or middleware.
All data fetching must happen client-side.

Backend:

- FastAPI
- AWS Lambda
- Mangum adapter
- API Gateway

Storage:

- S3 bucket for coffee cup images

Database:

- DynamoDB

AI:

- OpenAI API
- model: gpt-4o-mini
- vision enabled

Validation:

- Pydantic structured responses

---

# 2. Project Structure

Generate a monorepo structure:

coffee-ai-app/

backend/
app/
main.py
routes/
upload.py
readings.py
auth.py
services/
openai_service.py
s3_service.py
dynamodb_service.py
schemas/
coffee_reading.py
core/
config.py
security.py
requirements.txt
lambda_handler.py

frontend/
app/
layout.tsx
page.tsx
dashboard/page.tsx
upload/page.tsx
reading/[id]/page.tsx
components/
upload-form.tsx
reading-card.tsx
navbar.tsx
lib/
api.ts
auth.ts
utils.ts
styles/
globals.css

infra/
terraform or aws-cdk skeleton (optional)

README.md

---

# 3. Backend Requirements

Use FastAPI with Mangum so it runs in AWS Lambda.

Create the following endpoints:

POST /upload-url
Returns a presigned S3 upload URL.

POST /read-coffee
Accepts:
{
"image_key": "string"
}

Flow:

1. Load image from S3
2. Send image to OpenAI
3. Parse structured output
4. Store reading in DynamoDB
5. Return the reading

GET /readings
Returns list of user readings.

GET /readings/{reading_id}
Returns a specific reading.

Authentication:
Validate Cognito JWT tokens.

---

# 4. OpenAI Integration

Create a service:

services/openai_service.py

Use model:

gpt-4o-mini

Send the coffee cup image to the model and ask it to interpret the shapes like a traditional Greek coffee reader.

Use structured output parsing with Pydantic.

---

# 5. Pydantic Schema

Create schema:

CoffeeReading

Fields:

general_message: str
love: str
career: str
luck: str
symbols: list[str]
prediction_summary: str

The OpenAI response must strictly follow this schema.

---

# 6. Prompt Design

System prompt:

"You are a traditional Greek coffee cup reader (kafetzou).

Analyze the coffee grounds inside the cup and interpret the shapes like a mystical fortune teller.

Identify possible symbols such as heart, road, bird, tree, snake, mountain etc.

Be positive, mysterious and entertaining.

Return the result strictly as JSON matching the provided schema."

---

# 7. DynamoDB Design

Table: users

user_id (PK)
email
plan
credits
created_at

Table: readings

user_id (PK)
reading_id (SK)
image_url
symbols_detected
reading_result
tokens_used
cost
created_at

---

# 8. S3 Structure

Bucket example:

coffee-ai-app

/uploads
{user_id}/
{reading_id}.jpg

Images must be uploaded using presigned URLs.

---

# 9. Frontend Requirements

Framework:
Next.js App Router

Styling:
TailwindCSS

UI:
shadcn/ui

Create pages:

/login
/dashboard
/upload
/reading/[id]

---

# 10. Frontend Features

Upload page:

- Upload coffee cup image
- Use presigned S3 upload
- Button: "Read my coffee"

Dashboard:

- List past readings
- Cards showing summary

Reading page:

- Show full interpretation
- Show detected symbols

Use shadcn components:
Card
Button
Input
Textarea
Dialog
Tabs

---

# 11. API Client

Create frontend API wrapper in:

lib/api.ts

Endpoints:

getUploadUrl()
uploadImage()
createReading()
getReadings()
getReading()

---

# 12. Environment Variables

Backend:

OPENAI_API_KEY
AWS_REGION
S3_BUCKET
DYNAMODB_READINGS_TABLE
DYNAMODB_USERS_TABLE
COGNITO_USER_POOL_ID

Frontend:

NEXT_PUBLIC_API_URL
NEXT_PUBLIC_COGNITO_CLIENT_ID

---

# 13. Output Requirements

Generate:

- full folder structure
- example code for each file
- backend endpoints
- OpenAI integration
- DynamoDB client
- S3 presigned upload
- Next.js UI pages
- shadcn components
- Tailwind configuration
- README with setup instructions

Ensure the project runs locally with:

Backend:

uvicorn app.main:app --reload

Frontend:

npm run dev

---

# 14. Code Quality

Use:

- Python typing
- Pydantic validation
- clean service architecture
- modular components
- async code where possible
- clear comments

---

Generate the full project scaffold now.
