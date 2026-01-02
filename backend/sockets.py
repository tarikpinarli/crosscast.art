import os
import base64
from flask_socketio import emit, join_room
from extensions import socketio
from config import UPLOAD_FOLDER
from services import upload_to_imgbb, generate_mesh_tripo

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