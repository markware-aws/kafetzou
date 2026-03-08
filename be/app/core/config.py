from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # OpenAI
    openai_api_key: str

    # AWS
    aws_region: str = "eu-central-1"
    s3_bucket: str

    # DynamoDB
    dynamodb_readings_table: str = "readings"
    dynamodb_tarot_table: str = "tarot_readings"
    dynamodb_users_table: str = "users"

    # Cognito
    cognito_user_pool_id: str
    cognito_app_client_id: str
    cognito_region: str = ""

    # Stripe (to be configured later)
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""

    @property
    def cognito_pool_region(self) -> str:
        return self.cognito_region or self.aws_region


settings = Settings()
