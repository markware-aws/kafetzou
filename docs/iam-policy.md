# IAM User — Required Permissions

This document covers the IAM user whose `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
go into the backend `.env` file. These are the **runtime** credentials used by the FastAPI app.

---

## Services & Why

| Service | Used for | IAM needed? |
|---------|----------|-------------|
| S3 | Store coffee cup images, generate presigned URLs | Yes |
| DynamoDB | Read/write readings and users tables | Yes |
| Cognito | JWT validation (public JWKS endpoint) | **No** — public HTTP call, no signing |

Cognito sign-up/sign-in is handled by the frontend SDK using your **App Client ID** (not IAM keys),
so the backend user needs zero Cognito permissions.

---

## IAM Policy (JSON)

Create a new **inline policy** or **managed policy** and paste this in.
Replace the placeholder values in the `Resource` fields.

```json
{
  "Version": "2012-10-17",
  "Statement": [

    {
      "Sid": "S3PresignedUpload",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/uploads/*"
    },
    {
      "Sid": "S3ListBucket",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME"
    },

    {
      "Sid": "DynamoDBReadingsTable",
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:YOUR-REGION:YOUR-ACCOUNT-ID:table/readings",
        "arn:aws:dynamodb:YOUR-REGION:YOUR-ACCOUNT-ID:table/readings/index/*"
      ]
    },
    {
      "Sid": "DynamoDBUsersTable",
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem"
      ],
      "Resource": "arn:aws:dynamodb:YOUR-REGION:YOUR-ACCOUNT-ID:table/users"
    }

  ]
}
```

---

## Placeholders to Replace

| Placeholder | Where to find it | Example |
|-------------|-----------------|---------|
| `YOUR-BUCKET-NAME` | S3 → create your bucket, copy its name | `kafetzou-images` |
| `YOUR-REGION` | Top-right of AWS console | `eu-central-1` |
| `YOUR-ACCOUNT-ID` | Top-right → account menu → 12-digit number | `123456789012` |

---

## Step-by-Step Setup in AWS Console

### 1. Create the S3 bucket
- S3 → **Create bucket**
- Name: `kafetzou-images` (or your choice — must be globally unique)
- Region: your chosen region
- Block all public access: **ON** (images served via presigned URLs only)
- Versioning: off

### 2. Create the DynamoDB tables

**readings table**
- Table name: `readings`
- Partition key: `user_id` (String)
- Sort key: `reading_id` (String)
- Capacity: On-demand (free tier friendly)

**users table**
- Table name: `users`
- Partition key: `user_id` (String)
- No sort key
- Capacity: On-demand

### 3. Create the Cognito User Pool
- Cognito → **Create user pool**
- Sign-in: Email
- MFA: Optional (off for dev)
- App client: create one, note the **User Pool ID** and **Client ID**
- No client secret (frontend + mobile use public clients)

### 4. Create the IAM user
- IAM → Users → **Create user**
- User name: `kafetzou-backend-dev`
- Access type: **Programmatic access only** (no console login needed)
- Attach the policy above (paste as inline policy)
- Save the `Access Key ID` and `Secret Access Key` — shown only once

### 5. Fill in your `.env`
```env
AWS_REGION=eu-central-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...

S3_BUCKET=kafetzou-images

DYNAMODB_READINGS_TABLE=readings
DYNAMODB_USERS_TABLE=users

COGNITO_USER_POOL_ID=eu-central-1_xxxxxxxxx
COGNITO_REGION=eu-central-1
```

---

## Security Notes

- **Never commit `.env`** — it is in `.gitignore`
- The policy follows least-privilege: only the exact actions the app performs
- `s3:DeleteObject` is included for future cleanup — remove it if you don't need it
- For production, create a **separate IAM user** (or better: an IAM Role attached to Lambda)
  with the same policy — never use the same credentials for dev and prod
- When deploying to Lambda, replace IAM user keys with an **IAM Role** assigned to the
  Lambda function — no keys in environment at all

---

## Lambda Deployment (future)

When you deploy to Lambda, delete `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` from the
environment entirely. Instead, attach an IAM **Role** to the Lambda function with the same
policy above. boto3 picks up the role automatically — more secure, no key rotation needed.
