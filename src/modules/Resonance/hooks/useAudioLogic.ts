import { useState, useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { generateLandscapeGeometry } from '../utils/audioToGeo';

export const useAudioLogic = () => {
    // --- STATE ---
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false); // <--- NEW (Loading state)
    const [isPlaying, setIsPlaying] = useState(false);
    const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
    const [duration, setDuration] = useState(0); 
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [progress, setProgress] = useState(0); 

    // --- REFS ---
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const rafRef = useRef<number | null>(null);
    const startTimeRef = useRef<number>(0);
    
    // Data Buffers
    const historyRef = useRef<Uint8Array | null>(null);
    const frameCountRef = useRef(0);
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

    const FREQ_BINS = 64; 

    // --- 1. START RECORDING (Mic) ---
    const startRecording = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert("Microphone not supported.");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            audioContextRef.current = new AudioContextClass();
            const source = audioContextRef.current.createMediaStreamSource(stream);
            
            const analyser = audioContextRef.current.createAnalyser();
            analyser.fftSize = FREQ_BINS * 2; 
            analyser.smoothingTimeConstant = 0.5; 
            source.connect(analyser);
            analyserRef.current = analyser;

            const mediaRecorder = new MediaRecorder(stream);
            audioChunksRef.current = [];
            
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };
            
            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                if (audioPlayerRef.current) URL.revokeObjectURL(audioPlayerRef.current.src);
                const url = URL.createObjectURL(blob);
                audioPlayerRef.current = new Audio(url);
                audioPlayerRef.current.onended = () => { setIsPlaying(false); setProgress(0); };
            };
            
            mediaRecorder.start();
            mediaRecorderRef.current = mediaRecorder;

            const MAX_FRAMES = 1800; 
            historyRef.current = new Uint8Array(MAX_FRAMES * FREQ_BINS);
            frameCountRef.current = 0;
            
            startTimeRef.current = Date.now();
            setIsRecording(true);
            setAudioBlob(null);
            setGeometry(null);

            analyzeLoop();

        } catch (err) {
            console.error("Mic Error:", err);
            setIsRecording(false);
        }
    };

    const analyzeLoop = () => {
        if (!analyserRef.current || !historyRef.current) return;
        const buffer = new Uint8Array(FREQ_BINS);
        analyserRef.current.getByteFrequencyData(buffer);
        const offset = frameCountRef.current * FREQ_BINS;
        if (offset + FREQ_BINS < historyRef.current.length) {
             historyRef.current.set(buffer, offset);
             frameCountRef.current++;
        }
        setDuration((Date.now() - startTimeRef.current) / 1000);
        rafRef.current = requestAnimationFrame(analyzeLoop);
    };

    const stopRecording = () => {
        if (audioContextRef.current) {
            audioContextRef.current.close();
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            setIsRecording(false);
            
            if (frameCountRef.current > 2 && historyRef.current) {
                const recordedLength = frameCountRef.current * FREQ_BINS;
                const finalData = historyRef.current.slice(0, recordedLength);
                updateGeometry(finalData, frameCountRef.current, 10, 15, 1.0, 3.0, 0, 1, 0.5, true);
            }
        }
    };

    // --- 2. IMPORT FILE (Offline Processing) ---
    const importAudioFile = async (file: File) => {
        setIsProcessing(true);
        setGeometry(null);
        setAudioBlob(null);
        setProgress(0);

        try {
            const arrayBuffer = await file.arrayBuffer();
            
            // 1. Decode Audio
            const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
            
            // 2. Setup Offline Processing
            const offlineCtx = new OfflineAudioContext(1, audioBuffer.length, audioBuffer.sampleRate);
            const source = offlineCtx.createBufferSource();
            source.buffer = audioBuffer;
            
            const analyser = offlineCtx.createAnalyser();
            analyser.fftSize = FREQ_BINS * 2;
            analyser.smoothingTimeConstant = 0.5;
            
            source.connect(analyser);
            analyser.connect(offlineCtx.destination);
            source.start(0);

            // 3. Extract Frequency Data "Frame by Frame"
            const fps = 30; // Capture 30 frames per second of audio
            const totalDuration = audioBuffer.duration;
            const totalFrames = Math.floor(totalDuration * fps);
            const interval = 1 / fps;
            
            // Pre-allocate buffer
            const capturedData = new Uint8Array(totalFrames * FREQ_BINS);
            const tempArray = new Uint8Array(FREQ_BINS);

            // Schedule "Suspend" events to take snapshots
            for (let i = 0; i < totalFrames; i++) {
                offlineCtx.suspend(i * interval).then(() => {
                    analyser.getByteFrequencyData(tempArray);
                    capturedData.set(tempArray, i * FREQ_BINS);
                }).then(() => offlineCtx.resume());
            }

            // 4. Run the rendering (This happens super fast)
            await offlineCtx.startRendering();

            // 5. Store Data
            historyRef.current = capturedData;
            frameCountRef.current = totalFrames;
            setDuration(totalDuration);
            
            // 6. Setup Audio Player for the uploaded file
            const blob = new Blob([await file.arrayBuffer()], { type: file.type || 'audio/mp3' }); // Re-blob for player
            setAudioBlob(blob);
            
            if (audioPlayerRef.current) URL.revokeObjectURL(audioPlayerRef.current.src);
            const url = URL.createObjectURL(blob);
            audioPlayerRef.current = new Audio(url);
            audioPlayerRef.current.onended = () => { setIsPlaying(false); setProgress(0); };

            // 7. Generate Initial Mesh
            updateGeometry(capturedData, totalFrames, 10, 15, 1.0, 3.0, 0, 1, 0.5, true);
            
        } catch (err) {
            console.error("Import Failed", err);
            alert("Could not process audio file.");
        } finally {
            setIsProcessing(false);
            // Close temp context
            // tempCtx.close(); // optional depending on browser GC
        }
    };

    // --- 3. PLAYBACK ---
    const togglePlayback = (startPct: number, endPct: number) => {
        if (!audioPlayerRef.current) return;
        if (isPlaying) {
            audioPlayerRef.current.pause();
            setIsPlaying(false);
        } else {
            const totalDur = audioPlayerRef.current.duration;
            if (!totalDur || !isFinite(totalDur)) { audioPlayerRef.current.play(); setIsPlaying(true); return; }

            audioPlayerRef.current.currentTime = totalDur * startPct;
            audioPlayerRef.current.play();
            setIsPlaying(true);
            
            const checkInterval = setInterval(() => {
                if (!audioPlayerRef.current || audioPlayerRef.current.paused) { clearInterval(checkInterval); return; }
                const current = audioPlayerRef.current.currentTime;
                const stopTime = totalDur * endPct;
                setProgress(current / totalDur);
                if (current >= stopTime) {
                    audioPlayerRef.current.pause();
                    setIsPlaying(false);
                    setProgress(startPct);
                    clearInterval(checkInterval);
                }
            }, 50);
        }
    };

    // --- 4. GEOMETRY ---
    const updateGeometry = useCallback((
        data: Uint8Array, 
        totalRows: number,
        width: number, 
        length: number,
        baseHeight: number,
        gain: number,
        trimStart: number, 
        trimEnd: number,
        resolution: number,
        mirrored: boolean
    ) => {
        if (!data || totalRows < 2) return;
        
        const startRow = Math.floor(totalRows * trimStart);
        const endRow = Math.floor(totalRows * trimEnd);
        let rowCount = endRow - startRow;
        if (rowCount < 2) return;

        const startIdx = startRow * FREQ_BINS;
        const endIdx = endRow * FREQ_BINS;
        const rawSlice = data.slice(startIdx, endIdx);

        // Downsampling
        const stride = Math.max(1, Math.floor(1 / resolution));
        let finalData = rawSlice;
        let finalRows = rowCount;

        if (stride > 1) {
            finalRows = Math.floor(rowCount / stride);
            finalData = new Uint8Array(finalRows * FREQ_BINS);
            for (let i = 0; i < finalRows; i++) {
                const sourceRowIndex = i * stride;
                const targetIdx = i * FREQ_BINS;
                const sourceIdx = sourceRowIndex * FREQ_BINS;
                for (let b = 0; b < FREQ_BINS; b++) {
                    finalData[targetIdx + b] = rawSlice[sourceIdx + b];
                }
            }
        }

        const geom = generateLandscapeGeometry(finalData, finalRows, FREQ_BINS, width, length, baseHeight, gain, mirrored);
        setGeometry(geom);
    }, []);

    useEffect(() => {
        return () => {
            if (audioContextRef.current) audioContextRef.current.close();
            if (audioPlayerRef.current) { audioPlayerRef.current.pause(); URL.revokeObjectURL(audioPlayerRef.current.src); }
        };
    }, []);

    return {
        isRecording, isProcessing, isPlaying, duration, hasRecording: !!geometry, geometry, audioBlob, progress,
        dataRef: { buffer: historyRef.current, rows: frameCountRef.current },
        actions: { startRecording, stopRecording, updateGeometry, togglePlayback, importAudioFile }
    };
};