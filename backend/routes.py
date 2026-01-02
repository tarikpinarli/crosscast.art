import os
import stripe
from flask import Blueprint, jsonify, send_from_directory, request
from config import UPLOAD_FOLDER
from services import check_tripo_credits

# Create a Blueprint for API routes
api = Blueprint('api', __name__)

# --- PRICE CONFIGURATION (Ported from server.js) ---
MODULE_PRICES = {
  'intersection-basic': 99,    # $0.99
  'wall-art-basic': 99,       # $0.99
  'geo-sculptor-basic': 199,  # $1.99
  'replicator-model': 299     # $2.99 (Adding your 3D model price here too)
}

@api.route('/ping', methods=['GET'])
def ping_server():
    return "pong", 200

# PRE-PAYMENT CREDIT CHECK
@api.route('/check-availability', methods=['GET'])
def check_availability():
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

# PAYMENT ROUTE (Updated to handle different Modules)
@api.route('/create-payment-intent', methods=['POST'])
def create_payment():
    try:
        data = request.get_json()
        module_id = data.get('moduleId')

        # 1. Determine Price
        # Default to 299 ($2.99) if no ID is sent, or lookup the ID
        if not module_id:
            amount = 299 
        else:
            amount = MODULE_PRICES.get(module_id)
        
        if not amount:
            return jsonify({'error': 'Invalid Module ID'}), 400

        print(f"💰 Creating Payment for {module_id or 'Default'}: ${amount/100}")

        # 2. Create Stripe Intent
        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency='usd',
            automatic_payment_methods={'enabled': True},
            metadata={'moduleId': module_id}
        )
        return jsonify({'clientSecret': intent['client_secret']})

    except Exception as e:
        print(f"💥 Payment Error: {e}")
        return jsonify(error=str(e)), 403

@api.route('/files/<room_id>/<filename>')
def serve_file(room_id, filename):
    try:
        response = send_from_directory(os.path.join(UPLOAD_FOLDER, room_id), filename)
        return response
    except Exception as e:
        return str(e), 404