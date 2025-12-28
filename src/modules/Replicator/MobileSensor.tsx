import React, { useEffect, useState, useRef } from 'react';
// We use useSearchParams because index.tsx sends ?session=ID, not /ID
import { useSearchParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { Camera, Activity, CheckCircle2 } from 'lucide-react';
import { useParams } from 'react-router-dom';

// ⚠️ FIX: Point directly to Render, not "/"
const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || "https://your-app-name.onrender.com";

export default function MobileSensor() {
  const { id } = useParams(); // This grabs the ID from the URL path /sensor/XYZ
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  
  // Refs for video handling
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!id) return;
    
    console.log("🔌 Mobile connecting to:", SOCKET_URL);

    const newSocket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      console.log("✅ Mobile Sensor Connected");
      setConnected(true);
      // This triggers the "Uplink Active" on Desktop
      newSocket.emit('join_session', { sessionId: id, type: 'sensor' });
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    setSocket(newSocket);
    return () => { newSocket.disconnect(); };
  }, [id]);

  // --- CAMERA LOGIC ---
  const startCamera = async () => {
    try {
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera Error:", err);
      alert("Could not access camera. Ensure you are using HTTPS.");
      setCameraActive(false);
    }
  };

  const captureFrame = () => {
    const video = videoRef.current;
    
    if (video && socket && id) {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        
        if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = canvas.toDataURL("image/jpeg", 0.7);
            
            // Send to Desktop
            socket.emit('send_frame', { roomId: id, image: imageData });
            
            // Visual Flash
            video.style.opacity = "0";
            setTimeout(() => video.style.opacity = "1", 100);
        }
    }
  };

  return (
    <div className="bg-black min-h-screen text-white flex flex-col items-center justify-center relative overflow-hidden">
      
      {/* CASE 1: CAMERA IS ACTIVE */}
      {cameraActive ? (
        <div className="relative w-full h-screen bg-black flex flex-col">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            
            <div className="absolute inset-0 pointer-events-none border-[1px] border-cyan-500/30 m-4 rounded-3xl">
                {/* Crosshairs */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border-t border-l border-white/50"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border-b border-r border-white/50"></div>
                
                {/* Status Top */}
                <div className="absolute top-8 left-0 w-full flex justify-center">
                    <div className="bg-black/50 backdrop-blur-md px-4 py-1 rounded-full border border-white/10 flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-[10px] uppercase font-mono tracking-widest">Live Feed</span>
                    </div>
                </div>

                {/* Shutter Button */}
                <div className="absolute bottom-12 left-0 w-full flex justify-center pointer-events-auto">
                    <button onClick={captureFrame} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-transform bg-white/10 backdrop-blur-sm">
                        <div className="w-16 h-16 bg-white rounded-full"></div>
                    </button>
                </div>
            </div>
        </div>
      ) : (
        /* CASE 2: WAITING SCREEN */
        <div className="p-6 flex flex-col items-center w-full max-w-sm animate-in fade-in zoom-in duration-700">
           <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] -z-10"></div>
           
           <div className="relative mb-12">
               <div className={`absolute inset-0 blur-3xl opacity-20 animate-pulse ${connected ? 'bg-emerald-500' : 'bg-cyan-500'}`}></div>
               <div className="w-40 h-40 rounded-full border-4 border-zinc-800 flex items-center justify-center bg-zinc-900 relative shadow-2xl">
                   <div className={`absolute inset-0 border-2 border-dashed rounded-full animate-[spin_10s_linear_infinite] opacity-50 ${connected ? 'border-emerald-500' : 'border-cyan-500'}`}></div>
                   {connected ? <CheckCircle2 className="text-emerald-500" size={48} /> : <Activity className="text-cyan-500" size={48} />}
               </div>
           </div>

           <div className="text-center space-y-4 mb-16">
               <h1 className="text-3xl font-black uppercase italic tracking-tighter">
                   Sensor <span className={connected ? 'text-emerald-500' : 'text-cyan-500'}>{connected ? 'Online' : 'Linking'}</span>
               </h1>
               <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest px-4">
                   {connected ? `Connected to Node: ${id?.slice(0,4)}` : "Searching..."}
               </p>
           </div>

           <button onClick={startCamera} disabled={!connected} className={`w-full font-black uppercase py-6 rounded-2xl tracking-[0.2em] flex items-center justify-center gap-3 shadow-lg transition-all active:scale-95 ${connected ? 'bg-cyan-500 text-black hover:bg-cyan-400' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}>
               <Camera size={24} />
               {connected ? "Open Camera" : "Waiting for Uplink"}
           </button>
        </div>
      )}
    </div>
  );
}