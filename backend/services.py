import requests
import base64
import os
from config import TRIPO_API_KEY, IMGBB_API_KEY
from extensions import socketio

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
        response = requests.get("https://api.tripo3d.ai/v2/openapi/user/balance", headers=headers)
        data = response.json()
        
        if data.get('code') == 0:
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