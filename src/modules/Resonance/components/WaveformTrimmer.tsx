import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';

interface WaveformTrimmerProps {
    audioBlob: Blob | null;
    trimStart: number; // Expects 0.0 to 1.0
    trimEnd: number;   // Expects 0.0 to 1.0
    playbackProgress: number; 
    isPlaying: boolean;
    onTrimChange: (start: number, end: number) => void; // Expects 0-100 to be sent back
    onTogglePlay: () => void;
}

export const WaveformTrimmer = ({ 
    audioBlob, 
    trimStart, 
    trimEnd, 
    playbackProgress,
    isPlaying,
    onTrimChange,
    onTogglePlay
}: WaveformTrimmerProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [peaks, setPeaks] = useState<number[]>([]);
    const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);

    // 1. PROCESS AUDIO
    useEffect(() => {
        if (!audioBlob) return;
        const processAudio = async () => {
            try {
                const arrayBuffer = await audioBlob.arrayBuffer();
                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                
                const rawData = audioBuffer.getChannelData(0);
                const samples = 80; // Increased resolution slightly
                const blockSize = Math.floor(rawData.length / samples);
                const calculatedPeaks = [];

                for (let i = 0; i < samples; i++) {
                    const start = i * blockSize;
                    let sum = 0;
                    for (let j = 0; j < blockSize; j++) {
                        sum += Math.abs(rawData[start + j]);
                    }
                    calculatedPeaks.push(sum / blockSize);
                }
                const max = Math.max(...calculatedPeaks) || 1;
                setPeaks(calculatedPeaks.map(p => p / max));
            } catch (e) {
                console.error("Audio Decode Error", e);
            }
        };
        processAudio();
    }, [audioBlob]);

    // 2. DRAW
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || peaks.length === 0) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = canvas.width;
        const h = canvas.height;
        const barWidth = w / peaks.length;
        const gap = 1;

        ctx.clearRect(0, 0, w, h);

        // Draw Bars
        peaks.forEach((peak, i) => {
            const x = i * barWidth;
            const barH = Math.max(4, peak * h * 0.8);
            const y = (h - barH) / 2;

            const posPct = i / peaks.length;
            const isActive = posPct >= trimStart && posPct <= trimEnd;
            const isPlayed = posPct < playbackProgress;

            if (isActive) {
                ctx.fillStyle = isPlayed ? '#a855f7' : '#581c87'; 
            } else {
                ctx.fillStyle = '#27272a';
            }
            
            ctx.beginPath();
            ctx.roundRect(x + gap/2, y, barWidth - gap, barH, 2);
            ctx.fill();
        });

        // Overlay & Handles
        const startX = trimStart * w;
        const endX = trimEnd * w;

        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, startX, h);
        ctx.fillRect(endX, 0, w - endX, h);

        const handleWidth = 4;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(startX, 0, handleWidth, h);
        ctx.fillRect(endX - handleWidth, 0, handleWidth, h);

        if (playbackProgress > 0) {
            const dotX = playbackProgress * w;
            ctx.beginPath();
            ctx.arc(dotX, h/2, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'white';
        }
    }, [peaks, trimStart, trimEnd, playbackProgress]);

    // 3. MOUSE LOGIC (FIXED)
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pct = x / rect.width;
        const threshold = 0.05;
        
        if (Math.abs(pct - trimStart) < threshold) setIsDragging('start');
        else if (Math.abs(pct - trimEnd) < threshold) setIsDragging('end');
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !containerRef.current) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        let pct = Math.max(0, Math.min(1, x / rect.width));

        // FIX: Multiply by 100 because Parent expects 0-100 range
        if (isDragging === 'start') {
            pct = Math.min(pct, trimEnd - 0.05);
            onTrimChange(pct * 100, trimEnd * 100); 
        } else {
            pct = Math.max(pct, trimStart + 0.05);
            onTrimChange(trimStart * 100, pct * 100);
        }
    };

    const handleMouseUp = () => setIsDragging(null);

    return (
        <div className="bg-zinc-900/50 rounded-lg p-3 border border-white/5 space-y-2 select-none">
             <div className="flex items-center justify-between text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                <span>Start</span>
                <span>Trim Region</span>
                <span>End</span>
             </div>
             
             <div className="flex items-center gap-3">
                 <button 
                    onClick={onTogglePlay}
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${isPlaying ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-purple-400 hover:bg-zinc-700'}`}
                 >
                    {isPlaying ? <Pause size={16} fill="currentColor"/> : <Play size={16} fill="currentColor"/>}
                 </button>

                 <div 
                    ref={containerRef}
                    className="flex-1 h-12 relative cursor-ew-resize touch-none" // touch-none helps on mobile
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                 >
                    <canvas 
                        ref={canvasRef} 
                        width={400} 
                        height={60} 
                        className="w-full h-full rounded bg-black/40"
                    />
                 </div>
             </div>
        </div>
    );
};