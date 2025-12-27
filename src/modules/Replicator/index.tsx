import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { io, Socket } from 'socket.io-client';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { QrHandshake } from './components/QrHandshake';
import { ModelViewer } from './components/ModelViewer';
import { Cpu, ScanLine, Smartphone, Box, Loader2, Download, Camera } from 'lucide-react';

// --- CONFIGURATION ---
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const FRONTEND_HOST = import.meta.env.PROD
    ? window.location.origin
    : `http://${import.meta.env.VITE_LOCAL_IP}:5173`;

export default function Replicator() {
    // 1. SAFE HYDRATION STATE
    const [isMounted, setIsMounted] = useState(false);
    const [sessionId, setSessionId] = useState<string>('');
    const [isMobile, setIsMobile] = useState(false);

    // 2. APP STATE
    const [isConnected, setIsConnected] = useState(false);
    const [frames, setFrames] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [modelReady, setModelReady] = useState(false);
    const [modelUrl, setModelUrl] = useState<string | null>(null);

    const socketRef = useRef<Socket | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 3. INITIALIZATION (Runs once on mount)
    useEffect(() => {
        setIsMounted(true);
        
        // Check URL only after mounting to prevent Error #418
        const queryParams = new URLSearchParams(window.location.search);
        const urlSessionId = queryParams.get('session');
        
        let currentSession = '';

        if (urlSessionId) {
            // We are the SENSOR (Mobile)
            setIsMobile(true);
            currentSession = urlSessionId;
            setSessionId(urlSessionId);
        } else {
            // We are the HOST (Desktop)
            setIsMobile(false);
            currentSession = uuidv4().slice(0, 8).toUpperCase();
            setSessionId(currentSession);
        }

        // 4. SOCKET CONNECTION
        console.log("🔌 Connecting to Backend:", BACKEND_URL);
        
        const socket = io(BACKEND_URL, {
            transports: ['polling', 'websocket'], // Polling first helps bypass firewalls
            reconnectionAttempts: 10,
            timeout: 60000,
            forceNew: true,
            // Header bypass for local dev (ignored in prod)
            extraHeaders: {
                "ngrok-skip-browser-warning": "69420"
            }
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log("✅ Socket Connected! ID:", socket.id);
            socket.emit('join_session', {
                sessionId: currentSession,
                type: urlSessionId ? 'sensor' : 'host'
            });
        });

        socket.on('session_status', (data) => {
            if (data.status === 'connected') setIsConnected(true);
        });

        socket.on('frame_received', (data) => {
            console.log("📸 Frame received on client");
            setFrames([data.image]); 
            setStatusMessage("Optical Data Synced.");
        });

        socket.on('processing_status', (data) => {
            setIsProcessing(true);
            setStatusMessage(data.step);
        });

        socket.on('model_ready', (data) => {
            console.log("🔥 Model Data Received:", data.url);
            setIsProcessing(false);
            setModelReady(true);
            setModelUrl(data.url);
            setStatusMessage("Neural Mesh Compiled.");
        });

        socket.on('connect_error', (err) => {
            console.error("❌ Connection Error:", err.message);
        });

        return () => { socket.disconnect(); };
    }, []);

    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1024;
                    const scaleSize = MAX_WIDTH / img.width;
                    canvas.width = MAX_WIDTH;
                    canvas.height = img.height * scaleSize;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                };
            };
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && socketRef.current) {
            const btn = document.getElementById('capture-btn');
            if (btn) btn.innerText = "Transmitting...";
            try {
                const compressedBase64 = await compressImage(file);
                socketRef.current.emit('send_frame', {
                    roomId: sessionId,
                    image: compressedBase64
                });
                if (btn) btn.innerText = "Data Sent!";
                setTimeout(() => { if (btn) btn.innerText = "Capture Scan"; }, 2000);
            } catch (err) { alert("Transmission Error"); }
        }
    };

    const handleGenerate = () => {
        if (socketRef.current) {
            socketRef.current.emit('process_3d', { sessionId });
        }
    };

    // 5. LOADING STATE (Prevents Hydration Mismatch)
    if (!isMounted) {
        return (
            <div className="bg-black min-h-screen flex items-center justify-center text-white">
                 <Loader2 className="animate-spin text-cyan-500" size={48} />
            </div>
        );
    }

    // --- MOBILE SENSOR UI ---
    if (isMobile) {
        return (
            <div className="bg-black min-h-screen flex flex-col items-center justify-center p-6 text-white">
                <div className="w-full max-w-md space-y-8 text-center">
                    <ScanLine size={64} className="text-cyan-500 mx-auto mb-4 animate-pulse" />
                    <h1 className="text-4xl font-black uppercase italic">Sensor <span className="text-cyan-500">Online</span></h1>
                    <p className="text-zinc-500 font-mono text-[10px] break-all">SESSION: {sessionId}</p>
                    <div className="p-8 border border-zinc-800 rounded-3xl bg-zinc-900/50 backdrop-blur">
                        <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                        <button id="capture-btn" onClick={() => fileInputRef.current?.click()} className="w-full py-6 bg-cyan-500 text-black font-black text-xl uppercase rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(6,182,212,0.4)]">
                            <Camera size={28} /> Capture Scan
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- DESKTOP UI ---
    return (
        <div className="bg-zinc-950 min-h-screen text-white">
            <Header />
            <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto min-h-[80vh] flex flex-col">
                <div className="mb-12 border-l-2 border-cyan-500 pl-6">
                    <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
                        The <span className="text-cyan-500">Replicator</span>
                    </h1>
                    <p className="text-zinc-500 text-xs md:text-sm font-bold uppercase tracking-widest mt-4">
                        Neural Mesh Engine v1.1
                    </p>
                </div>

                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    {/* LEFT COLUMN: CONTROLS */}
                    <div className="space-y-8">
                        <div className={`flex gap-4 items-start ${isConnected ? 'opacity-100' : 'opacity-50'}`}>
                            <div className={`p-3 rounded-lg border ${isConnected ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : 'bg-zinc-900 border-zinc-800 text-cyan-500'}`}>
                                <Smartphone size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black uppercase italic text-white mb-2">1. Establish Uplink</h3>
                                <p className="text-zinc-500 text-xs font-bold uppercase leading-relaxed max-w-sm">
                                    {isConnected ? "Sensor Linked Successfully." : "Scan QR to connect sensor."}
                                </p>
                            </div>
                        </div>

                        <div className={`flex gap-4 items-start ${frames.length > 0 ? 'opacity-100' : 'opacity-50'}`}>
                            <div className={`p-3 rounded-lg border ${frames.length > 0 ? 'bg-cyan-500/10 border-cyan-500 text-cyan-500' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
                                <ScanLine size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black uppercase italic text-white mb-2">2. Visual Capture</h3>
                                <p className="text-zinc-500 text-xs font-bold uppercase leading-relaxed max-w-sm">
                                    {frames.length > 0 ? "Optical Data Buffered." : "Awaiting Mobile Feed."}
                                </p>
                            </div>
                        </div>

                        <div className={`transition-all duration-500 ${frames.length >= 1 ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                            <button
                                onClick={handleGenerate}
                                disabled={isProcessing || modelReady}
                                className={`group flex gap-4 items-center px-6 py-4 rounded-xl transition-all shadow-xl w-full max-w-sm
                                ${modelReady ? 'bg-emerald-500 text-black' : 'bg-white text-black hover:bg-cyan-500 hover:scale-105'}`}
                            >
                                <div className="p-2 bg-black text-white rounded-lg">
                                    {isProcessing ? <Loader2 className="animate-spin" size={24} /> : (modelReady ? <Download size={24} /> : <Box size={24} />)}
                                </div>
                                <div className="text-left">
                                    <h3 className="text-lg font-black uppercase italic leading-none">
                                        {isProcessing ? "Computing..." : (modelReady ? "Ready to Print" : "3. Compile Mesh")}
                                    </h3>
                                    <p className="text-[10px] font-bold uppercase tracking-widest mt-1">
                                        {statusMessage || "Begin AI Reconstruction"}
                                    </p>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: DISPLAY */}
                    <div className="flex justify-center h-96">
                        <div className="w-full max-w-md h-full bg-zinc-900/30 border border-zinc-800 rounded-[3rem] relative overflow-hidden flex items-center justify-center">
                            
                            {/* PRIORITY 1: 3D MODEL VIEW */}
                            {modelReady && modelUrl ? (
                                <div className="w-full h-full relative animate-in fade-in zoom-in duration-1000">
                                    <ModelViewer url={`${BACKEND_URL}/files/${sessionId}/${modelUrl}`} />
                                    <div className="absolute top-6 left-6 pointer-events-none">
                                        <div className="bg-emerald-500/10 backdrop-blur border border-emerald-500 text-emerald-500 font-mono text-[10px] px-3 py-1.5 rounded-full flex items-center gap-2 uppercase font-bold">
                                            <Box size={12} /> <span>Live Mesh</span>
                                        </div>
                                    </div>
                                </div>
                            ) 
                            /* PRIORITY 2: CAMERA FEED / PROCESSING */
                            : frames.length > 0 ? (
                                <div className="relative w-full h-full p-2">
                                    <img src={frames[0]} alt="Scan" className={`w-full h-full object-cover rounded-[2.5rem] ${isProcessing ? 'blur-sm opacity-50' : ''}`} />
                                    {isProcessing && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
                                            <span className="bg-black/80 text-cyan-500 font-mono text-[10px] px-4 py-2 rounded-full border border-cyan-500/30 uppercase font-bold">
                                                {statusMessage}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )
                            /* PRIORITY 3: QR CODE (If not connected) */
                            : !isConnected ? (
                                <div className="w-full scale-90">
                                    <QrHandshake sessionId={sessionId} host={FRONTEND_HOST} />
                                </div>
                            )
                            /* PRIORITY 4: WAITING STATE (Connected but no photo) */
                            : (
                                <div className="text-center animate-pulse">
                                    <Cpu size={64} className="text-cyan-500 mx-auto mb-6" />
                                    <h2 className="text-3xl font-black uppercase text-white italic tracking-tighter">Uplink <span className="text-cyan-500">Active</span></h2>
                                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-2">Awaiting Optical Feed</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}