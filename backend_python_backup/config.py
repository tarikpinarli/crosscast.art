import os
from pathlib import Path
from dotenv import load_dotenv

# --- CONFIG ---
# Preserving your exact path logic
env_path = Path(__file__).resolve().parent.parent / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

TRIPO_API_KEY = os.environ.get("TRIPO_API_KEY")
IMGBB_API_KEY = os.environ.get("IMGBB_API_KEY")
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY")

UPLOAD_FOLDER = 'scans'
PORT = int(os.environ.get("PORT", 5005))