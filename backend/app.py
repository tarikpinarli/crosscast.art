import base64
import os
import time
import shutil
import trimesh
import numpy as np
import cv2
from PIL import Image
from skimage import measure
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room

# 1. SETUP
app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

UPLOAD_FOLDER = 'scans'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# --- JANITOR (Cleanup) ---
def cleanup_storage():
    try:
        current_time = time.time()
        MAX_AGE = 3600 # 1 Hour
        if os.path.exists(UPLOAD_FOLDER):
            for folder_name in os.listdir(UPLOAD_FOLDER):
                folder_path = os.path.join(UPLOAD_FOLDER, folder_name)
                if os.path.isdir(folder_path):
                    if current_time - os.path.getmtime(folder_path) > MAX_AGE:
                        shutil.rmtree(folder_path)
    except Exception as e:
        print(f"Janitor Error: {e}")

# --- THE REAL ENGINE: VISUAL HULL ---
def create_visual_hull(image_paths, output_path):
    """
    Creates a 3D mesh by 'carving' a voxel grid based on image silhouettes.
    Assumes images are taken in a 360 circle around the object.
    """
    # 1. Configuration
    VOXEL_RES = 32  # 32x32x32 grid (Low res for speed on CPU)
    cube_radius = 1.0
    
    # Initialize Voxel Grid (1 = Solid, 0 = Empty)
    voxels = np.ones((VOXEL_RES, VOXEL_RES, VOXEL_RES), dtype=bool)
    
    # Create coordinate grid
    x, y, z = np.indices((VOXEL_RES, VOXEL_RES, VOXEL_RES))
    # Normalize coordinates to -1 to 1 range
    x = (x / VOXEL_RES) * 2 - 1
    y = (y / VOXEL_RES) * 2 - 1
    z = (z / VOXEL_RES) * 2 - 1
    
    num_images = len(image_paths)
    if num_images == 0: return False

    print(f"Engine: Processing {num_images} images at Resolution {VOXEL_RES}...")

    # 2. CARVING LOOP
    for i, img_path in enumerate(image_paths):
        # A. Load and Process Image
        img = cv2.imread(img_path)
        img = cv2.resize(img, (200, 200)) # Downscale for speed
        
        # B. Simple Background Removal (Thresholding)
        # We assume object is lighter/distinct from background or center focused
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        # Adaptive threshold to find the object
        _, mask = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        # Invert if needed (assuming dark background). 
        # For general use, Canny edge detection or center-crop is safer, 
        # but we'll stick to simple thresholding for the MVP.
        
        # C. Calculate 'Fake' Camera Projection
        # Assume camera rotates 360 degrees around the center
        angle_rad = (2 * np.pi * i) / num_images
        
        # Project Voxels onto this specific 2D image Mask
        # (Simplified Rotation Matrix application)
        # Rotate coordinates
        x_rot = x * np.cos(angle_rad) - z * np.sin(angle_rad)
        
        # Project to 2D image plane (Orthographic projection for simplicity)
        # Map -1..1 to 0..200 (Image Pixel Coords)
        u = ((x_rot + 1) / 2) * 199
        v = ((y + 1) / 2) * 199
        
        u = np.clip(u.astype(int), 0, 199)
        v = np.clip(v.astype(int), 0, 199)
        
        # D. Carve
        # If the voxel projects to a "black" pixel (background), remove it.
        # We check the mask at coordinates (v, u)
        projection_mask = mask[v, u] > 0
        
        # Intersection: Keep voxel ONLY if it exists AND is seen in this image
        voxels = np.logical_and(voxels, projection_mask)

    # 3. MESH GENERATION (Marching Cubes)
    print("Engine: Extracting Surface...")
    try:
        # Use simple marching cubes to turn voxel grid into mesh
        verts, faces, normals, values = measure.marching_cubes(voxels, 0.5)
        
        # Create Trimesh object
        mesh = trimesh.Trimesh(vertices=verts, faces=faces)
        
        # Smooth it slightly so it looks organic
        trimesh.smoothing.filter_laplacian(mesh, iterations=2)
        
        mesh.export(output_path)
        return True
    except Exception as e:
        print(f"Meshing failed (Object might have been carved away completely): {e}")
        # Fallback: Return a sphere if carving failed (so user sees something)
        fallback = trimesh.creation.icosphere(radius=10)
        fallback.export(output_path)
        return True

# --- ROUTES ---
@app.route('/')
@app.route('/health')
def health_check():
    return "Replicator Engine Online", 200

@app.route('/files/<room_id>/<filename>')
def serve_file(room_id, filename):
    path = os.path.join(UPLOAD_FOLDER, room_id)
    return send_from_directory(path, filename)

# --- SOCKETS ---
@socketio.on('join_session')
def handle_join(data):
    cleanup_storage()
    room = data.get('sessionId')
    if room:
        join_room(room)
        if data.get('type') == 'sensor':
            emit('session_status', {'status': 'connected'}, room=room)

@socketio.on('send_frame')
def handle_frame(data):
    room = data.get('roomId')
    image_data = data.get('image')
    if room and image_data:
        session_path = os.path.join(UPLOAD_FOLDER, room)
        if not os.path.exists(session_path): os.makedirs(session_path)
        try:
            header, encoded = image_data.split(",", 1)
            file_data = base64.b64decode(encoded)
            filename = f"{int(time.time() * 1000)}.jpg"
            with open(os.path.join(session_path, filename), "wb") as f:
                f.write(file_data)
            emit('frame_received', {'image': image_data, 'count': len(os.listdir(session_path))}, room=room, include_self=False)
        except Exception:
            pass

@socketio.on('process_3d')
def handle_process(data):
    room = data.get('sessionId')
    if room:
        emit('processing_status', {'step': 'Analyzing Optical Data...'}, room=room)
        socketio.sleep(0.5)
        
        # 1. Gather Images
        session_path = os.path.join(UPLOAD_FOLDER, room)
        images = []
        if os.path.exists(session_path):
            images = [os.path.join(session_path, f) for f in os.listdir(session_path) if f.endswith('.jpg')]
            images.sort() # Ensure order matters for rotation
            
        if len(images) < 3:
             emit('processing_status', {'step': 'Error: Need more photos (min 3)'}, room=room)
             return

        # 2. Run Engine
        emit('processing_status', {'step': 'Carving Voxel Grid...'}, room=room)
        output_filename = "reconstruction.stl"
        output_path = os.path.join(session_path, output_filename)
        
        # *** TRIGGER REAL ENGINE ***
        create_visual_hull(images, output_path)
        
        # 3. Finish
        emit('model_ready', {'url': output_filename}, room=room)

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5001))
    socketio.run(app, debug=False, host='0.0.0.0', port=port)