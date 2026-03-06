from mangum import Mangum
from app.main import app

# AWS Lambda handler via Mangum adapter
handler = Mangum(app, lifespan="off")
