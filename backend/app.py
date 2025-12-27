import os
import time
import requests
import base64
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room
from dotenv import load_dotenv
from pathlib import Path

# --- CONFIG ---
# Load env if local, otherwise skip (Render handles this via Dashboard)
env_path = Path(__file__).resolve().parent.parent / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

TRIPO_API_KEY = os.environ.get("TRIPO_API_KEY")
IMGBB_API_KEY = os.environ.get("IMGBB_API_KEY")
UPLOAD_FOLDER = 'scans'

app = Flask(__name__)

# --- CORS SETUP ---
# Allow all origins, methods, and headers for Vercel/Frontend access
CORS(app, resources={r"/*": {"origins": "*"}})

socketio = SocketIO(app, cors_allowed_origins="*", ping_timeout=60, async_mode='eventlet')

if not os.path.exists(UPLOAD_FOLDER): os.makedirs(UPLOAD_FOLDER)

# --- NEW PING ROUTE ---
@app.route('/ping', methods=['GET'])
def ping_server():
    return "pong", 200

# --- HELPER FUNCTIONS ---
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
    
    print(f"📡 Tripo: Submitting task for {image_url}")
    try:
        response = requests.post("https://api.tripo3d.ai/v2/openapi/task", json=payload, headers=headers)
        res_data = response.json()
        
        if res_data.get('code') != 0:
            return f"ERR_{res_data.get('code')}"
            
        task_id = res_data['data']['task_id']
        print(f"✅ Task ID: {task_id}. Polling...")

        for _ in range(120): 
            socketio.sleep(4)
            status_res = requests.get(f"https://api.tripo3d.ai/v2/openapi/task/{task_id}", headers=headers).json()
            
            if status_res.get('code') != 0: continue
            
            task_data = status_res.get('data', {})
            status = task_data.get('status')
            
            print(f"⏳ Progress: {task_data.get('progress', 0)}% | Status: {status}")
            
            if status == "success":
                output = task_data.get('output', {})
                model_url = output.get('model') or output.get('pbr_model') or output.get('base_model')
                
                if not model_url:
                    return "URL_NOT_FOUND"

                print(f"📦 Downloading finalized model...")
                r = requests.get(model_url)
                with open(output_path, 'wb') as f: 
                    f.write(r.content)
                return "SUCCESS"
            
            if status in ["failed", "banned", "expired", "cancelled"]:
                return status.upper()
                
    except Exception as e:
        print(f"💥 Backend Error: {e}")
        return "CRASH"
    return "TIMEOUT"

# --- ROUTES & SOCKETS ---

@app.route('/files/<room_id>/<filename>')
def serve_file(room_id, filename):
    try:
        response = send_from_directory(os.path.join(UPLOAD_FOLDER, room_id), filename)
        return response
    except Exception as e:
        return str(e), 404

@socketio.on('join_session')
def handle_join(data):
    join_room(data.get('sessionId'))

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
    room = data.get('sessionId')
    session_path = os.path.join(UPLOAD_FOLDER, room)
    local_img_path = os.path.join(session_path, "capture.jpg")
    
    if not os.path.exists(local_img_path):
        emit('processing_status', {'step': 'Error: No image found'}, room=room)
        return

    emit('processing_status', {'step': 'Cloud Uplink Active...'}, room=room)
    public_url = upload_to_imgbb(local_img_path)
    
    if not public_url:
        emit('processing_status', {'step': 'Error: Cloud Sync Failed'}, room=room)
        return

    emit('processing_status', {'step': 'Neural Mesh Generation...'}, room=room)
    result = generate_mesh_tripo(public_url, os.path.join(session_path, "reconstruction.glb"))
    
    if result == "SUCCESS":
        emit('model_ready', {'url': "reconstruction.glb"}, room=room)
    else:
        emit('processing_status', {'step': f'Failed: {result}'}, room=room)

if __name__ == '__main__':
    # Render provides PORT via environment variable
    port = int(os.environ.get("PORT", 5005))
    socketio.run(app, debug=False, host='0.0.0.0', port=port)