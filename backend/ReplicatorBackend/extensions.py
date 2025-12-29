from flask_socketio import SocketIO
import stripe
from config import STRIPE_SECRET_KEY

# Setup Stripe
if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY

# Initialize SocketIO
# Preserving your specific config: ping_timeout=60, async_mode='eventlet'
socketio = SocketIO(cors_allowed_origins="*", ping_timeout=60, async_mode='eventlet')