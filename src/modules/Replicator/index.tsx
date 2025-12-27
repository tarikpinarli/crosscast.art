import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { io, Socket } from 'socket.io-client';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { QrHandshake } from './components/QrHandshake';
import { ModelViewer } from './components/ModelViewer';
import { Cpu, ScanLine, Smartphone, Box, Loader2, Download, Camera } from 'lucide-react';

// --- CONFIGURATION ---
const BACKEND_URL = import.meta.env.PROD 
    ? "https://replicator-backend.onrender.com"
    : ""; 

const SOCKET_URL = import.meta.env.PROD 
    ? "https://replicator-backend.onrender.com"
    : "/";

export default function Replicator() {
  const queryParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const urlSessionId = queryParams.get('session');
  const isMobile = !!urlSessionId; 

  const [sessionId, setSessionId] = useState<string>(urlSessionId || '');
  const [isConnected, setIsConnected] = useState(false);
  const [frames, setFrames] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [modelReady, setModelReady] = useState(false);
  const [modelUrl, setModelUrl] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let currentSession = sessionId;
    if (!isMobile && !sessionId) {
        currentSession = uuidv4().slice(0, 8).toUpperCase();
        setSessionId(currentSession);
    }

    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log(isMobile ? "Mobile Sensor Connected" : "Desktop Host Connected");
      socket.emit('join_session', { 
          sessionId: currentSession, 
          type: isMobile ? 'sensor' : 'host' 
      });
    });

    socket.on('session_status', (data) => {
      if (data.status === 'connected') setIsConnected(true);
    });

    socket.on('frame_received', (data) => {
        setFrames(prev => [...prev, data.image]);
    });

    socket.on('processing_status', (data) => {
        setIsProcessing(true);
        setStatusMessage(data.step);
    });

    socket.on('model_ready', (data) => {
        setIsProcessing(false);
        setStatusMessage("Mesh Compilation Complete.");
        setModelReady(true);
        setModelUrl(data.url);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // --- NEW: COMPRESSION HELPER ---
  // Shrinks 10MB photos down to ~200KB for instant transfer
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          // Resize logic: Max width 800px (Plenty for 3D)
          const MAX_WIDTH = 800;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Compress to JPEG at 70% quality
          resolve(canvas.toDataURL('image/jpeg', 0.7)); 
        };
      };
    });
  };

  // --- UPDATED MOBILE ACTION ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && socketRef.current) {
        // Visual feedback immediate
        const btn = document.getElementById('capture-btn');
        if(btn) btn.innerText = "Transmitting...";
        
        try {
            // Compress first!
            const compressedBase64 = await compressImage(file);
            
            // Send smaller image
            socketRef.current.emit('send_frame', { 
                roomId: sessionId, 
                image: compressedBase64 
            });
            
            // Success Feedback
            if(btn) btn.innerText = "Scan Sent! Take Another";
            setTimeout(() => { if(btn) btn.innerText = "Capture Scan"; }, 2000);
            
        } catch (err) {
            alert("Error sending image");
        }
    }
  };

  // --- DESKTOP ACTIONS ---
  const handleGenerate = () => {
      if (socketRef.current) {
          socketRef.current.emit('process_3d', { sessionId });
      }
  };

  // RENDER: MOBILE VIEW
  if (isMobile) {
      return (
        <div className="bg-black min-h-screen flex flex-col items-center justify-center p-6 text-white">
            <div className="w-full max-w-md space-y-8 text-center">
                <div className="mb-8">
                    <ScanLine size={64} className="text-cyan-500 mx-auto mb-4 animate-pulse" />
                    <h1 className="text-4xl font-black uppercase italic">Sensor <span className="text-cyan-500">Online</span></h1>
                    <p className="text-zinc-500 font-mono text-xs mt-2">LINKED TO SESSION: {sessionId}</p>
                </div>

                <div className="p-8 border border-zinc-800 rounded-3xl bg-zinc-900/50 backdrop-blur">
                    <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                    />
                    <button 
                        id="capture-btn"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-6 bg-cyan-500 text-black font-black text-xl uppercase rounded-xl hover:scale-105 transition-transform flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(6,182,212,0.4)]"
                    >
                        <Camera size={28} />
                        Capture Scan
                    </button>
                    <p className="text-zinc-500 text-[10px] uppercase tracking-widest mt-4">
                        Tap to transmit optical data to host
                    </p>
                </div>
            </div>
        </div>
      );
  }

  // RENDER: DESKTOP VIEW
  return (
    <div className="bg-zinc-950 min-h-screen text-white selection:bg-cyan-500 selection:text-black">
      <Header />
      
      <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto min-h-[80vh] flex flex-col">
        <div className="mb-12 border-l-2 border-cyan-500 pl-6">
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
            The <span className="text-cyan-500">Replicator</span>
          </h1>
          <p className="text-zinc-500 text-xs md:text-sm font-bold uppercase tracking-widest mt-4">
            Optical-to-Mesh Photogrammetry Engine v1.0
          </p>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          <div className="space-y-8">
             <div className="flex gap-4 items-start group">
                <div className={`p-3 rounded-lg border transition-colors ${isConnected ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : 'bg-zinc-900 border-zinc-800 text-cyan-500'}`}>
                    <Smartphone size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-black uppercase italic text-white mb-2">1. Establish Uplink</h3>
                    <p className="text-zinc-500 text-xs font-bold uppercase leading-relaxed max-w-sm">
                        {isConnected ? "Device Paired Successfully." : "Scan QR to connect sensor."}
                    </p>
                </div>
             </div>

             <div className={`flex gap-4 items-start transition-opacity ${isConnected ? 'opacity-100' : 'opacity-50'}`}>
                <div className={`p-3 rounded-lg border transition-colors ${frames.length > 0 ? 'bg-cyan-500/10 border-cyan-500 text-cyan-500' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
                    <ScanLine size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-black uppercase italic text-white mb-2">2. Orbit Subject</h3>
                    <p className="text-zinc-500 text-xs font-bold uppercase leading-relaxed max-w-sm">
                        Capture 360° coverage. <br/>
                        <span className="text-cyan-500">Dataset: {frames.length} Images</span>
                    </p>
                </div>
             </div>

             <div className={`transition-all duration-500 ${frames.length >= 3 ? 'opacity-100 translate-x-0' : 'opacity-30 translate-x-[-10px] pointer-events-none'}`}>
                 <button 
                    onClick={handleGenerate}
                    disabled={isProcessing || modelReady}
                    className={`group flex gap-4 items-center px-6 py-4 rounded-xl transition-all shadow-xl w-full max-w-sm
                        ${modelReady 
                            ? 'bg-emerald-500 text-black hover:scale-105' 
                            : 'bg-white text-black hover:bg-cyan-500 hover:scale-105'
                        }`}
                 >
                    <div className="p-2 bg-black text-white rounded-lg">
                        {isProcessing ? <Loader2 className="animate-spin" size={24}/> : (modelReady ? <Download size={24}/> : <Box size={24} />)}
                    </div>
                    <div className="text-left">
                        <h3 className="text-lg font-black uppercase italic leading-none">
                            {isProcessing ? "Processing..." : (modelReady ? "Download Mesh" : "3. Compile Mesh")}
                        </h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest mt-1 group-hover:text-black/70">
                            {statusMessage || "Ready to Process"}
                        </p>
                    </div>
                 </button>
             </div>
          </div>

          <div className="flex justify-center">
            {!isConnected ? (
                <div className="w-full max-w-md">
                    <QrHandshake sessionId={sessionId} />
                </div>
            ) : (
                <div className="w-full h-96 bg-zinc-900/30 border border-cyan-500/50 rounded-[3rem] relative overflow-hidden flex items-center justify-center group">
                    {modelReady && modelUrl ? (
                        <div className="w-full h-full relative animate-in fade-in zoom-in duration-1000">
                             <ModelViewer url={`${BACKEND_URL}/files/${sessionId}/${modelUrl}`} />
                             <div className="absolute top-6 left-6 pointer-events-none">
                                <div className="bg-emerald-500/10 backdrop-blur border border-emerald-500 text-emerald-500 font-mono text-xs px-3 py-1.5 rounded-full flex items-center gap-2">
                                    <Box size={12} />
                                    <span>Live Render</span>
                                </div>
                             </div>
                        </div>
                    ) : (
                        frames.length > 0 ? (
                            <div className="relative w-full h-full p-2">
                                <img 
                                    src={frames[frames.length - 1]} 
                                    alt="Latest Scan" 
                                    className={`w-full h-full object-cover rounded-[2.5rem] shadow-2xl transition-all duration-700 ${isProcessing ? 'blur-sm scale-95 opacity-50' : ''}`} 
                                />
                                {isProcessing && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                                        <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
                                        <span className="bg-black/80 text-cyan-500 font-mono text-xs px-4 py-2 rounded-full border border-cyan-500/30">
                                            {statusMessage}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center relative z-10 animate-pulse">
                                <Cpu size={64} className="text-cyan-500 mx-auto mb-6" />
                                <h2 className="text-3xl font-black uppercase text-white italic tracking-tighter">
                                    Uplink <span className="text-cyan-500">Active</span>
                                </h2>
                                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-2">
                                    Ready for Optical Stream
                                </p>
                            </div>
                        )
                    )}
                </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}