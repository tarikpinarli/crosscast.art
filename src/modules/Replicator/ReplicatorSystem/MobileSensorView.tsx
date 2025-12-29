import React, { RefObject } from 'react';
import { ScanLine, Camera } from 'lucide-react';

interface MobileSensorViewProps {
    sessionId: string;
    fileInputRef: RefObject<HTMLInputElement>;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onCaptureClick: () => void;
}

export const MobileSensorView: React.FC<MobileSensorViewProps> = ({ 
    sessionId, 
    fileInputRef, 
    onFileUpload, 
    onCaptureClick 
}) => {
    return (
        <div className="bg-black min-h-screen flex flex-col items-center justify-center p-6 text-white">
            <div className="w-full max-w-md space-y-8 text-center">
                <ScanLine size={64} className="text-cyan-500 mx-auto mb-4 animate-pulse" />
                <h1 className="text-4xl font-black uppercase italic">Sensor <span className="text-cyan-500">Online</span></h1>
                <p className="text-zinc-500 font-mono text-[10px] break-all">SESSION: {sessionId}</p>
                <div className="p-8 border border-zinc-800 rounded-3xl bg-zinc-900/50 backdrop-blur">
                    <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        className="hidden" 
                        ref={fileInputRef} 
                        onChange={onFileUpload} 
                    />
                    <button 
                        id="capture-btn" 
                        onClick={onCaptureClick} 
                        className="w-full py-6 bg-cyan-500 text-black font-black text-xl uppercase rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(6,182,212,0.4)]"
                    >
                        <Camera size={28} /> Capture Scan
                    </button>
                </div>
            </div>
        </div>
    );
};