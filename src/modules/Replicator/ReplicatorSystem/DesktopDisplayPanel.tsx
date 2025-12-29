import React from 'react';
import { AlertTriangle, Box, Loader2, Cpu } from 'lucide-react';
import { QrHandshake } from '../components/QrHandshake';
import { ModelViewer } from '../components/ModelViewer';

interface DesktopDisplayPanelProps {
    sessionId: string;
    host: string;
    isConnected: boolean;
    frames: string[];
    isProcessing: boolean;
    statusMessage: string;
    modelReady: boolean;
    modelUrl: string | null;
    serversBusy: boolean;
    onDismissBusy: () => void;
}

export const DesktopDisplayPanel: React.FC<DesktopDisplayPanelProps> = ({
    sessionId,
    host,
    isConnected,
    frames,
    isProcessing,
    statusMessage,
    modelReady,
    modelUrl,
    serversBusy,
    onDismissBusy
}) => {
    return (
        <div className="flex justify-center h-96">
            <div className="w-full max-w-md h-full bg-zinc-900/30 border border-zinc-800 rounded-[3rem] relative overflow-hidden flex items-center justify-center">
                
                {/* Busy Overlay */}
                {serversBusy && (
                    <div className="absolute inset-0 bg-black/80 z-20 flex flex-col items-center justify-center text-center p-6 animate-in fade-in">
                        <AlertTriangle className="text-red-500 w-16 h-16 mb-4" />
                        <h3 className="text-xl font-bold text-white uppercase mb-2">Capacity Reached</h3>
                        <p className="text-zinc-400 text-xs">Our high-performance compute nodes are currently full. Please try again in a few minutes.</p>
                        <button onClick={onDismissBusy} className="mt-6 text-xs uppercase font-bold text-white underline">
                            Dismiss
                        </button>
                    </div>
                )}

                {modelReady && modelUrl ? (
                    <div className="w-full h-full relative animate-in fade-in zoom-in duration-1000">
                        <ModelViewer url={modelUrl} />
                        <div className="absolute top-6 left-6 pointer-events-none">
                            <div className="bg-emerald-500/10 backdrop-blur border border-emerald-500 text-emerald-500 font-mono text-[10px] px-3 py-1.5 rounded-full flex items-center gap-2 uppercase font-bold">
                                <Box size={12} /> <span>Live Mesh</span>
                            </div>
                        </div>
                    </div>
                ) : frames.length > 0 ? (
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
                ) : !isConnected ? (
                    <div className="w-full scale-90">
                        <QrHandshake sessionId={sessionId} host={host} />
                    </div>
                ) : (
                    <div className="text-center animate-pulse">
                        <Cpu size={64} className="text-cyan-500 mx-auto mb-6" />
                        <h2 className="text-3xl font-black uppercase text-white italic tracking-tighter">Uplink <span className="text-cyan-500">Active</span></h2>
                        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-2">Awaiting Optical Feed</p>
                    </div>
                )}
            </div>
        </div>
    );
};