import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, CheckCircle2, Sliders, Maximize, Activity, Layers, Component, Split, UploadCloud, Loader2, Wind } from 'lucide-react'; 
import * as THREE from 'three';
import { GLTFExporter } from 'three-stdlib'; 

import { ModuleLayout } from '../../components/layout/ModuleLayout';
import { CyberSlider } from '../../components/ui/CyberSlider';
import { PaymentModal } from '../../components/PaymentModal';
import { usePayment } from '../../hooks/usePayment';

import { useAudioLogic } from './hooks/useAudioLogic';
import { FrequencyView } from './components/FrequencyView';
import { WaveformTrimmer } from './components/WaveformTrimmer';

// --- SEO IMPORTS ---
import { SeoHead } from '../../components/seo/SeoHead';
import { SEO_CONFIG } from '../../config/seoConfig';
import { ResonanceInfo } from './components/ResonanceInfo';

export default function ResonanceModule() {
    const { showModal, clientSecret, startCheckout, closeModal } = usePayment('resonance-basic');
    const [hasAccess, setHasAccess] = useState(false);

    // Audio Logic
    const { isRecording, isProcessing, isPlaying, progress, duration, hasRecording, geometry, dataRef, actions, audioBlob, debugMsg } = useAudioLogic();

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Params
    const [width, setWidth] = useState(10);
    const [length, setLength] = useState(15);
    const [baseThickness, setBaseThickness] = useState(1.0);
    const [gain, setGain] = useState(3.0);
    const [resolution, setResolution] = useState(0.5); 
    const [smoothing, setSmoothing] = useState(0.5); 
    const [isMirrored, setIsMirrored] = useState(true);

    const [trimStart, setTrimStart] = useState(0);
    const [trimEnd, setTrimEnd] = useState(100);

    const handleTrimChange = (start: number, end: number) => { setTrimStart(start); setTrimEnd(end); };
    
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            actions.importAudioFile(e.target.files[0]);
        }
    };

    // Auto-Update Geometry
    useEffect(() => {
        if (hasRecording && dataRef.buffer) {
            const timer = setTimeout(() => {
                const recordedLen = dataRef.rows * 64; 
                const safeBuffer = dataRef.buffer!.slice(0, recordedLen);
                
                actions.updateGeometry(
                    safeBuffer, 
                    dataRef.rows, 
                    width, 
                    length, 
                    baseThickness, 
                    gain, 
                    trimStart/100, 
                    trimEnd/100, 
                    resolution, 
                    isMirrored,
                    smoothing 
                );
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [width, length, baseThickness, gain, trimStart, trimEnd, resolution, isMirrored, smoothing, hasRecording]);

    // Download Logic
    const handleDownload = () => { 
        if (!geometry) return; 

        const exportGeo = geometry.clone();
        const nonIndexedGeo = exportGeo.toNonIndexed();
        nonIndexedGeo.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
            color: 0xa855f7,
            roughness: 0.4,
            metalness: 0.3,
            flatShading: true, 
            side: THREE.DoubleSide
        });
        
        const mesh = new THREE.Mesh(nonIndexedGeo, material);
        const exporter = new GLTFExporter();
        exporter.parse(
            mesh,
            (gltf) => {
                const blob = new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `frequency_landscape_${Date.now()}.glb`; 
                link.click();
                URL.revokeObjectURL(url);
                nonIndexedGeo.dispose();
                exportGeo.dispose();
            },
            (err) => console.error("Export Failed:", err),
            { binary: true }
        );
    };

    const handleExportRequest = () => { if (!geometry) return; if (hasAccess) handleDownload(); else startCheckout(); };
    const handlePaymentSuccess = () => { setHasAccess(true); handleDownload(); closeModal(); };

    return (
        <>
            {/* --- INJECT SEO TAGS HERE --- */}
            <SeoHead {...SEO_CONFIG.resonance} />
            <ModuleLayout
                title="Resonance Engine"
                subtitle={hasAccess ? "UNLOCKED // SESSION ACTIVE" : "Frequency Landscape Generator"}
                color={hasAccess ? "emerald" : "purple"}
                canExport={!!geometry && !isRecording && !isProcessing}
                onExport={handleExportRequest}
                sidebar={
                    <div className="space-y-6">
                        {hasAccess && ( <div className="bg-emerald-500/10 border border-emerald-500/50 p-3 rounded-sm flex items-center gap-3 animate-in fade-in"> <CheckCircle2 size={16} className="text-emerald-500" /> <div> <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Session Unlocked</p> <p className="text-[9px] text-zinc-500 uppercase">Downloads are free</p> </div> </div> )}

                        <div className="bg-zinc-900/50 p-4 rounded-lg border border-white/5 text-center space-y-4">
                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="audio/*" className="hidden" />

                            {isProcessing ? (
                                <div className="flex flex-col items-center justify-center h-16 animate-pulse text-purple-400 gap-2">
                                    <Loader2 size={32} className="animate-spin" />
                                    <span className="text-[10px] font-mono">PROCESSING AUDIO DATA...</span>
                                </div>
                            ) : (
                                <div className={`text-4xl font-mono font-bold tracking-tighter ${isRecording ? 'text-red-500 animate-pulse' : 'text-zinc-500'}`}>
                                    {duration.toFixed(2)}s
                                </div>
                            )}
                            
                            {!isProcessing && (
                                <div className="flex justify-center gap-4 items-center">
                                    {!isRecording && (
                                        <button 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-12 h-12 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center hover:bg-zinc-700 hover:text-white text-zinc-400 transition-all group"
                                            title="Upload Audio File"
                                        >
                                            <UploadCloud size={20} className="group-hover:scale-110 transition-transform" />
                                        </button>
                                    )}

                                    {!isRecording ? (
                                        <button onClick={actions.startRecording} className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all active:scale-95 group">
                                            <Mic className="text-white w-8 h-8 group-hover:scale-110 transition-transform" />
                                        </button>
                                    ) : (
                                        <button onClick={actions.stopRecording} className="w-20 h-20 rounded-full bg-zinc-800 border-2 border-red-500 flex items-center justify-center hover:bg-zinc-700 transition-all">
                                            <Square className="text-red-500 w-8 h-8 fill-red-500" />
                                        </button>
                                    )}
                                </div>
                            )}

                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                                {isRecording ? "Listening..." : isProcessing ? "Please Wait" : "Record or Upload"}
                            </p>

                            {/* Debug UI */}
                            {debugMsg && (
                                <div className={`p-2 border text-xs font-mono rounded mt-2 flex justify-between items-center ${
                                    debugMsg.includes("Mesh generated") 
                                    ? "bg-yellow-900/20 border-yellow-500/50 text-yellow-200" 
                                    : "bg-red-900/50 border-red-500 text-red-200"
                                }`}>
                                    <span>{debugMsg}</span>
                                </div>
                            )}
                        </div>

                        {hasRecording && !isProcessing && (
                             <div className="animate-in fade-in slide-in-from-top-4">
                                <WaveformTrimmer 
                                    audioBlob={audioBlob}
                                    trimStart={trimStart / 100}
                                    trimEnd={trimEnd / 100}
                                    playbackProgress={progress}
                                    isPlaying={isPlaying}
                                    onTrimChange={handleTrimChange}
                                    onTogglePlay={() => actions.togglePlayback(trimStart / 100, trimEnd / 100)}
                                />
                             </div>
                        )}

                        <div className={`space-y-5 transition-opacity duration-500 ${!hasRecording || isProcessing ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                             <div className="h-px bg-zinc-800"></div>

                             <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded border border-white/5">
                                 <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase">
                                     <Split size={14} className="text-purple-500" />
                                     <span>Mountain Symmetry</span>
                                 </div>
                                 <button onClick={() => setIsMirrored(!isMirrored)} className={`w-10 h-5 rounded-full relative transition-colors ${isMirrored ? 'bg-purple-600' : 'bg-zinc-700'}`}>
                                     <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${isMirrored ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                 </button>
                             </div>
                             
                             <CyberSlider label="Mesh Detail" icon={Component} value={resolution} onChange={setResolution} min={0.1} max={1.0} step={0.1} color="purple" />
                             <CyberSlider label="Fluid Smoothing" icon={Wind} value={smoothing} onChange={setSmoothing} min={0} max={1.0} step={0.1} color="purple" />
                             <CyberSlider label="Peak Height" icon={Activity} value={gain} onChange={setGain} min={1} max={8.0} step={0.2} color="purple" />
                             <CyberSlider label="Base Thickness" icon={Layers} value={baseThickness} onChange={setBaseThickness} min={0.2} max={4.0} step={0.1} unit="cm" color="purple" />
                             <CyberSlider label="Width" icon={Maximize} value={width} onChange={setWidth} min={5} max={20} step={1} unit="cm" color="purple" />
                             <CyberSlider label="Length" icon={Sliders} value={length} onChange={setLength} min={10} max={40} unit="cm" color="purple" />
                        </div>
                    </div>
                }
            >
                <FrequencyView 
                    geometry={geometry} 
                    isRecording={isRecording} 
                    color="#a855f7"
                    isPlaying={isPlaying}
                    playbackProgress={progress}
                    trimStart={trimStart / 100}
                    trimEnd={trimEnd / 100}
                    length={length}
                />
            </ModuleLayout>
            <ResonanceInfo />

            {showModal && <PaymentModal clientSecret={clientSecret} onClose={closeModal} onSuccess={handlePaymentSuccess} color="purple" price="$0.99" />}
            <div className="hidden border-purple-500/20 border-t-purple-500 bg-purple-500/20 text-purple-500/60 bg-purple-900/20 border-purple-400/50 from-purple-900/10"></div>
        </>
    );
}