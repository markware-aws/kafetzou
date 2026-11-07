import os
import sys
from pathlib import Path

# Settings() requires these at import time; tests never call AWS or OpenAI.
os.environ.setdefault("OPENAI_API_KEY", "test-key")
os.environ.setdefault("S3_BUCKET", "test-bucket")
os.environ.setdefault("COGNITO_USER_POOL_ID", "test-pool")
os.environ.setdefault("COGNITO_APP_CLIENT_ID", "test-client")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
