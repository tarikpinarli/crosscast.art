import React from 'react';
import { Smartphone, ScanLine, Loader2, XCircle, Download, Lock } from 'lucide-react';

interface DesktopControlPanelProps {
    isConnected: boolean;
    frames: string[];
    isProcessing: boolean;
    isCheckingCredits: boolean;
    serversBusy: boolean;
    modelReady: boolean;
    statusMessage: string;
    onMainAction: () => void;
}

export const DesktopControlPanel: React.FC<DesktopControlPanelProps> = ({
    isConnected,
    frames,
    isProcessing,
    isCheckingCredits,
    serversBusy,
    modelReady,
    statusMessage,
    onMainAction
}) => {
    return (
        <div className="space-y-8">
            {/* STEP 1 */}
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

            {/* STEP 2 */}
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

            {/* STEP 3 / ACTION BUTTON */}
            <div className={`transition-all duration-500 ${frames.length >= 1 ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                <button
                    onClick={onMainAction}
                    disabled={isProcessing || isCheckingCredits || serversBusy}
                    className={`group flex gap-4 items-center px-6 py-4 rounded-xl transition-all shadow-xl w-full max-w-sm
                    ${modelReady 
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_30px_rgba(16,185,129,0.4)]' 
                        : serversBusy
                            ? 'bg-red-500/10 border border-red-500 cursor-not-allowed'
                            : 'bg-white text-black hover:bg-cyan-500 hover:scale-105'
                    }`}
                >
                    <div className={`p-2 rounded-lg ${serversBusy ? 'text-red-500' : 'bg-black text-white'}`}>
                        {isProcessing || isCheckingCredits ? (
                            <Loader2 className="animate-spin" size={24} />
                        ) : serversBusy ? (
                            <XCircle size={24} />
                        ) : modelReady ? (
                            <Download size={24} />
                        ) : (
                            <Lock size={24} /> 
                        )}
                    </div>
                    <div className="text-left">
                        <h3 className={`text-lg font-black uppercase italic leading-none ${serversBusy ? 'text-red-500' : ''}`}>
                            {isCheckingCredits
                                ? "Verifying Capacity..."
                                : isProcessing 
                                    ? "Generating Mesh..." 
                                    : serversBusy
                                        ? "Servers Busy"
                                        : modelReady 
                                            ? "Download Model" 
                                            : "3. Generate Mesh"}
                        </h3>
                        <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80 ${serversBusy ? 'text-red-400' : ''}`}>
                            {serversBusy 
                                ? "High Traffic - Try Later" 
                                : statusMessage || (modelReady ? "Ready for Export" : "Secure Payment Gateway")}
                        </p>
                    </div>
                </button>
            </div>
        </div>
    );
};