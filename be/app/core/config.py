from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # OpenAI
    openai_api_key: str
    openai_model: str = "gpt-6-luna"
    # "low" keeps the two-call coffee pipeline well under API Gateway's 29s timeout
    openai_reasoning_effort: str = "low"

    # AWS
    aws_region: str = "eu-central-1"
    s3_bucket: str

    # DynamoDB
    dynamodb_readings_table: str = "readings"
    dynamodb_tarot_table: str = "tarot_readings"
    dynamodb_astrology_table: str = "astrology_readings"
    dynamodb_astrology_personalized_table: str = "astrology_personalized"
    dynamodb_dreams_table: str = "dream_readings"
    dynamodb_natal_table: str = "natal_readings"
    dynamodb_users_table: str = "users"

    # Cognito
    cognito_user_pool_id: str
    cognito_app_client_id: str
    cognito_region: str = ""

    # Static horoscope CDN (S3 + CloudFront)
    frontend_s3_bucket: str = ""  # e.g. kafetzou-frontend
    cloudfront_distribution_id: str = ""  # e.g. E103BRI0J3RZQA

    # Prewarm secret (used by EventBridge Scheduler to authenticate)
    prewarm_secret: str = ""

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_payment_method_configuration: str = ""
    frontend_url: str = "http://localhost:3000"

    # Email (Resend)
    resend_api_key: str = ""
    email_from: str = "Fortune Teller <noreply@fortuneteller.gr>"
    admin_email: str = "spapafot@gmail.com"
    iris_qr_code_url: str = ""       # public URL to your IRIS QR code image

    @property
    def cognito_pool_region(self) -> str:
        return self.cognito_region or self.aws_region


settings = Settings()
