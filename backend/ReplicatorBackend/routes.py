import os
import stripe
from flask import Blueprint, jsonify, send_from_directory
from config import UPLOAD_FOLDER
from services import check_tripo_credits

# Create a Blueprint for API routes
api = Blueprint('api', __name__)

@api.route('/ping', methods=['GET'])
def ping_server():
    return "pong", 200

# NEW: PRE-PAYMENT CREDIT CHECK ROUTE
@api.route('/check-availability', methods=['GET'])
def check_availability():
    """
    Checks if there are enough credits (>= 30) in Tripo.
    Even in Test Mode, we check the real balance as requested.
    """
    try:
        credits_available = check_tripo_credits()
        # We need at least 30 credits
        if credits_available >= 30:
            return jsonify({'available': True, 'balance': credits_available})
        else:
            return jsonify({'available': False, 'reason': 'insufficient_credits'}), 200 
    except Exception as e:
        print(f"⚠️ Credit Check Error: {e}")
        return jsonify({'available': False, 'reason': 'api_error'}), 200

# PAYMENT ROUTE
@api.route('/create-payment-intent', methods=['POST'])
def create_payment():
    try:
        # 299 = $2.99
        intent = stripe.PaymentIntent.create(
            amount=299,
            currency='usd',
            automatic_payment_methods={'enabled': True},
        )
        return jsonify({'clientSecret': intent['client_secret']})
    except Exception as e:
        print(f"💰 Payment Error: {e}")
        return jsonify(error=str(e)), 403

@api.route('/files/<room_id>/<filename>')
def serve_file(room_id, filename):
    try:
        response = send_from_directory(os.path.join(UPLOAD_FOLDER, room_id), filename)
        return response
    except Exception as e:
        return str(e), 404