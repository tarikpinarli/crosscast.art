import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { io, Socket } from 'socket.io-client';
import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { PaymentModal } from '../../../components/PaymentModal';
import { usePayment } from '../../../hooks/usePayment';

// Imported Logic & Components
import { BACKEND_URL, FRONTEND_HOST } from './config';
import { compressImage } from './utils';
import { MobileSensorView } from './MobileSensorView';
import { DesktopControlPanel } from './DesktopControlPanel';
import { DesktopDisplayPanel } from './DesktopDisplayPanel';

export default function Replicator() {
    // 1. SAFE HYDRATION STATE
    const [isMounted, setIsMounted] = useState(false);
    
    // 2. APP STATE
    const [sessionId, setSessionId] = useState<string>('');
    const [isMobile, setIsMobile] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [frames, setFrames] = useState<string[]>([]);
    
    // Workflow States
    const [isCheckingCredits, setIsCheckingCredits] = useState(false);
    const [serversBusy, setServersBusy] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [modelReady, setModelReady] = useState(false);
    const [modelUrl, setModelUrl] = useState<string | null>(null);

    // 3. PAYMENT HOOK
    const { showModal, clientSecret, startCheckout, closeModal } = usePayment('replicator-model');

    const socketRef = useRef<Socket | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 4. INITIALIZATION (Runs once on mount)
    useEffect(() => {
        setIsMounted(true);
        
        const queryParams = new URLSearchParams(window.location.search);
        const urlSessionId = queryParams.get('session');
        
        let currentSession = '';

        if (urlSessionId) {
            setIsMobile(true);
            currentSession = urlSessionId;
            setSessionId(urlSessionId);
        } else {
            setIsMobile(false);
            currentSession = uuidv4().slice(0, 8).toUpperCase();
            setSessionId(currentSession);
        }

        console.log("🔌 Connecting to Backend:", BACKEND_URL);
        
        const socket = io(BACKEND_URL, {
            transports: ['websocket', 'polling'], 
            reconnectionAttempts: 10,
            forceNew: true,
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
            console.log("📸 Frame received");
            setFrames([data.image]); 
            setStatusMessage("Optical Data Synced.");
        });

        socket.on('processing_status', (data) => {
            setIsProcessing(true);
            setStatusMessage(data.step);
        });

        socket.on('model_ready', (data) => {
            setIsProcessing(false);
            setModelReady(true);
            const fullModelUrl = data.url.startsWith('http') ? data.url : `${BACKEND_URL}/files/${currentSession}/${data.url}`;
            setModelUrl(fullModelUrl);
            setStatusMessage("Neural Mesh Compiled.");
        });

        return () => { socket.disconnect(); };
    }, []);

    // 5. HANDLERS
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
            } catch (err) { 
                console.error(err);
                alert("Transmission Error"); 
            }
        }
    };

    const triggerGeneration = () => {
        if (socketRef.current) {
            setStatusMessage("Payment Confirmed. Starting Engine...");
            socketRef.current.emit('process_3d', { sessionId });
        }
    };

    const handlePaymentSuccess = () => {
        closeModal();
        triggerGeneration();
    };

    const checkCreditsAndInitialize = async () => {
        setIsCheckingCredits(true);
        try {
            const response = await fetch(`${BACKEND_URL}/check-availability`);
            const data = await response.json();
            
            if (data.available) {
                setServersBusy(false);
                startCheckout();
            } else {
                setServersBusy(true);
            }
        } catch (error) {
            console.error("Availability Check Failed:", error);
            setServersBusy(true); 
        } finally {
            setIsCheckingCredits(false);
        }
    };

    const handleDownload = async () => {
        if (!modelUrl) return;
        try {
            const response = await fetch(modelUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `replicator_scan_${sessionId}.glb`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Download failed:", err);
            alert("Download failed. Please try again.");
        }
    };

    const handleMainAction = () => {
        if (modelReady) {
            handleDownload();
        } else {
            checkCreditsAndInitialize();
        }
    };

    // LOADING STATE
    if (!isMounted) {
        return <div className="bg-black min-h-screen" />;
    }

    // --- MOBILE VIEW ---
    if (isMobile) {
        return (
            <MobileSensorView 
                sessionId={sessionId}
                fileInputRef={fileInputRef}
                onFileUpload={handleFileUpload}
                onCaptureClick={() => fileInputRef.current?.click()}
            />
        );
    }

    // --- DESKTOP VIEW ---
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
                    {/* LEFT: CONTROLS */}
                    <DesktopControlPanel 
                        isConnected={isConnected}
                        frames={frames}
                        isProcessing={isProcessing}
                        isCheckingCredits={isCheckingCredits}
                        serversBusy={serversBusy}
                        modelReady={modelReady}
                        statusMessage={statusMessage}
                        onMainAction={handleMainAction}
                    />

                    {/* RIGHT: DISPLAY */}
                    <DesktopDisplayPanel 
                        sessionId={sessionId}
                        host={FRONTEND_HOST}
                        isConnected={isConnected}
                        frames={frames}
                        isProcessing={isProcessing}
                        statusMessage={statusMessage}
                        modelReady={modelReady}
                        modelUrl={modelUrl}
                        serversBusy={serversBusy}
                        onDismissBusy={() => setServersBusy(false)}
                    />
                </div>
            </div>

            {/* PAYMENT MODAL */}
            {showModal && (
                <PaymentModal 
                    clientSecret={clientSecret} 
                    onClose={closeModal} 
                    onSuccess={handlePaymentSuccess} 
                    color="cyan" 
                    price="$2.99" 
                />
            )}
            
            <Footer />
        </div>
    );
}