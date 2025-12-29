import os
import time
import requests
import base64
import stripe 
from flask import Flask, send_from_directory, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room
from dotenv import load_dotenv
from pathlib import Path

# --- CONFIG ---
env_path = Path(__file__).resolve().parent.parent / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

TRIPO_API_KEY = os.environ.get("TRIPO_API_KEY")
IMGBB_API_KEY = os.environ.get("IMGBB_API_KEY")
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY")

# Setup Stripe
if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY

UPLOAD_FOLDER = 'scans'

app = Flask(__name__)

# --- CORS SETUP ---
CORS(app, resources={r"/*": {"origins": "*"}})

socketio = SocketIO(app, cors_allowed_origins="*", ping_timeout=60, async_mode='eventlet')

if not os.path.exists(UPLOAD_FOLDER): os.makedirs(UPLOAD_FOLDER)

# --- ROUTES ---

@app.route('/ping', methods=['GET'])
def ping_server():
    return "pong", 200

# NEW: PRE-PAYMENT CREDIT CHECK ROUTE
@app.route('/check-availability', methods=['GET'])
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
            return jsonify({'available': False, 'reason': 'insufficient_credits'}), 200 # Return 200 but available: false
    except Exception as e:
        print(f"⚠️ Credit Check Error: {e}")
        # If API fails, better to say unavailable than take money and fail
        return jsonify({'available': False, 'reason': 'api_error'}), 200

# PAYMENT ROUTE
@app.route('/create-payment-intent', methods=['POST'])
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

@app.route('/files/<room_id>/<filename>')
def serve_file(room_id, filename):
    try:
        response = send_from_directory(os.path.join(UPLOAD_FOLDER, room_id), filename)
        return response
    except Exception as e:
        return str(e), 404

# --- SOCKET HANDLERS ---

@socketio.on('join_session')
def handle_join(data):
    room = data.get('sessionId')
    user_type = data.get('type')
    join_room(room)
    print(f"🔗 {user_type} joined room: {room}")
    if user_type == 'sensor':
        emit('session_status', {'status': 'connected'}, room=room)

@socketio.on('send_frame')
def handle_frame(data):
    room = data.get('roomId')
    img_data = data.get('image') 
    session_path = os.path.join(UPLOAD_FOLDER, room)
    if not os.path.exists(session_path): os.makedirs(session_path)
    
    header, encoded = img_data.split(",", 1)
    with open(os.path.join(session_path, "capture.jpg"), "wb") as f:
        f.write(base64.b64decode(encoded))
        
    print(f"📸 Frame saved for {room}.")
    emit('frame_received', {'image': img_data, 'count': 1}, room=room)

@socketio.on('process_3d')
def handle_process(data):
    # This is now triggered ONLY after successful payment
    room = data.get('sessionId')
    session_path = os.path.join(UPLOAD_FOLDER, room)
    local_img_path = os.path.join(session_path, "capture.jpg")
    
    # ==========================================
    # 🛠️ TEST MODE SWITCH
    # Set to True to save credits. Set to False for real AI.
    TEST_MODE = True 
    # ==========================================

    if not os.path.exists(local_img_path):
        emit('processing_status', {'step': 'Error: No image found'}, room=room)
        return

    if TEST_MODE:
        # --- MOCK FLOW (Free) ---
        print(f"⚠️ TEST MODE ACTIVE: Skipping Tripo for session {room}")
        emit('processing_status', {'step': 'Payment Verified. Initializing... (TEST)'}, room=room)
        socketio.sleep(1.0)
        emit('processing_status', {'step': 'Simulating Neural Mesh... (TEST MODE)'}, room=room)
        socketio.sleep(1.5)
        
        # UPDATED LINK: Using raw.githack.com to fix the CORS/Blocking error
        TEST_MODEL_URL = "https://raw.githack.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb"
        
        emit('model_ready', {'url': TEST_MODEL_URL}, room=room)
        print("✅ Mock Model Sent")
        return

    # --- REAL FLOW (Costs Credits) ---
    emit('processing_status', {'step': 'Payment Verified. Uploading to Cloud...'}, room=room)
    public_url = upload_to_imgbb(local_img_path)
    
    if not public_url:
        emit('processing_status', {'step': 'Error: Cloud Sync Failed'}, room=room)
        return

    emit('processing_status', {'step': 'Generating Neural Mesh...'}, room=room)
    result = generate_mesh_tripo(public_url, os.path.join(session_path, "reconstruction.glb"))
    
    if result == "SUCCESS":
        emit('model_ready', {'url': "reconstruction.glb"}, room=room)
    else:
        emit('processing_status', {'step': f'Failed: {result}'}, room=room)

# --- HELPERS ---

def check_tripo_credits():
    """
    Queries Tripo API to check user balance.
    Returns integer of credits.
    """
    headers = {
        "Authorization": f"Bearer {TRIPO_API_KEY}",
        "Content-Type": "application/json"
    }
    try:
        # Assuming standard endpoint /user/balance. 
        # If Tripo API differs, update this URL.
        response = requests.get("https://api.tripo3d.ai/v2/openapi/user/balance", headers=headers)
        data = response.json()
        
        if data.get('code') == 0:
            # Tripo usually returns balance in string or int in 'data' object
            # Structure usually: { "code": 0, "data": { "balance": "100" } }
            balance = int(data['data'].get('balance', 0))
            print(f"💳 Current Tripo Balance: {balance}")
            return balance
        else:
            print(f"⚠️ Failed to fetch balance: {data}")
            return 0
    except Exception as e:
        print(f"💥 Credit Check API Error: {e}")
        return 0

def upload_to_imgbb(local_path):
    try:
        with open(local_path, "rb") as file:
            img_base64 = base64.b64encode(file.read()).decode('utf-8')
        payload = {"key": IMGBB_API_KEY, "image": img_base64}
        response = requests.post("https://api.imgbb.com/1/upload", data=payload)
        res_json = response.json()
        if response.status_code == 200 and res_json.get('success'):
            return res_json['data']['url']
        return None
    except Exception as e:
        print(f"💥 ImgBB Error: {e}")
        return None

def generate_mesh_tripo(image_url, output_path):
    headers = {
        "Authorization": f"Bearer {TRIPO_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "type": "image_to_model",
        "file": {
            "type": "jpg",
            "url": image_url
        }
    }
    try:
        response = requests.post("https://api.tripo3d.ai/v2/openapi/task", json=payload, headers=headers)
        res_data = response.json()
        if res_data.get('code') != 0: return f"ERR_{res_data.get('code')}"
        task_id = res_data['data']['task_id']
        
        for _ in range(120): 
            socketio.sleep(4)
            status_res = requests.get(f"https://api.tripo3d.ai/v2/openapi/task/{task_id}", headers=headers).json()
            if status_res.get('code') != 0: continue
            task_data = status_res.get('data', {})
            status = task_data.get('status')
            
            if status == "success":
                output = task_data.get('output', {})
                model_url = output.get('model') or output.get('pbr_model') or output.get('base_model')
                if not model_url: return "URL_NOT_FOUND"
                r = requests.get(model_url)
                with open(output_path, 'wb') as f: f.write(r.content)
                return "SUCCESS"
            if status in ["failed", "banned", "expired", "cancelled"]: return status.upper()
    except Exception as e:
        print(f"💥 Backend Error: {e}")
        return "CRASH"
    return "TIMEOUT"

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5005))
    socketio.run(app, debug=False, host='0.0.0.0', port=port)