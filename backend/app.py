import os
from flask import Flask
from flask_cors import CORS

from config import UPLOAD_FOLDER, PORT
from extensions import socketio
from routes import api
import sockets  # Import this to register the @socketio event handlers

app = Flask(__name__)

# --- CORS SETUP ---
CORS(app, resources={r"/*": {"origins": "*"}})

# Init SocketIO with the Flask app
socketio.init_app(app)

# Ensure upload directory exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Register the routes blueprint
app.register_blueprint(api)

if __name__ == '__main__':
    socketio.run(app, debug=False, host='0.0.0.0', port=PORT)