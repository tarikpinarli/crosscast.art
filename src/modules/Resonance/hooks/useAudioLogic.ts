import { useState, useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { generateLandscapeGeometry } from '../utils/audioToGeo';

export const useAudioLogic = () => {
    // --- STATE ---
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
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
    
    const historyRef = useRef<Uint8Array | null>(null);
    const frameCountRef = useRef(0);
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

    const FREQ_BINS = 64; 

    // Helper: Ensure Audio Context is active (Vital for Mobile)
    const ensureAudioContext = async () => {
        if (!audioContextRef.current) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            audioContextRef.current = new AudioContextClass();
        }
        if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
        }
    };

    // --- 1. START RECORDING ---
    const startRecording = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert("Microphone not supported.");
            return;
        }

        try {
            await ensureAudioContext(); // Wake up audio engine
            
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const analyser = audioContextRef.current!.createAnalyser();
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
                
                // Prepare Player
                if (audioPlayerRef.current) {
                    audioPlayerRef.current.pause();
                    URL.revokeObjectURL(audioPlayerRef.current.src);
                }
                const url = URL.createObjectURL(blob);
                const audio = new Audio(url);
                // Important for mobile: Load immediately
                audio.load();
                audio.onended = () => { setIsPlaying(false); setProgress(0); };
                audioPlayerRef.current = audio;
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

    // --- 2. LOOP ---
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

    // --- 3. STOP ---
    const stopRecording = () => {
        if (audioContextRef.current) {
            // Don't close context, just suspend to keep it alive for playback later
            audioContextRef.current.suspend(); 
            
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

    // --- 4. IMPORT FILE ---
    const importAudioFile = async (file: File) => {
        setIsProcessing(true);
        setGeometry(null);
        setAudioBlob(null);
        setProgress(0);

        try {
            await ensureAudioContext(); // Ensure context exists
            
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer);
            
            // Offline Processing
            const offlineCtx = new OfflineAudioContext(1, audioBuffer.length, audioBuffer.sampleRate);
            const source = offlineCtx.createBufferSource();
            source.buffer = audioBuffer;
            const analyser = offlineCtx.createAnalyser();
            analyser.fftSize = FREQ_BINS * 2;
            analyser.smoothingTimeConstant = 0.5;
            source.connect(analyser);
            analyser.connect(offlineCtx.destination);
            source.start(0);

            const fps = 30;
            const totalFrames = Math.floor(audioBuffer.duration * fps);
            const interval = 1 / fps;
            const capturedData = new Uint8Array(totalFrames * FREQ_BINS);
            const tempArray = new Uint8Array(FREQ_BINS);

            for (let i = 0; i < totalFrames; i++) {
                offlineCtx.suspend(i * interval).then(() => {
                    analyser.getByteFrequencyData(tempArray);
                    capturedData.set(tempArray, i * FREQ_BINS);
                }).then(() => offlineCtx.resume());
            }

            await offlineCtx.startRendering();

            historyRef.current = capturedData;
            frameCountRef.current = totalFrames;
            setDuration(audioBuffer.duration);
            
            // Setup Player
            const blob = new Blob([await file.arrayBuffer()], { type: file.type || 'audio/mp3' });
            setAudioBlob(blob);
            
            if (audioPlayerRef.current) {
                audioPlayerRef.current.pause();
                URL.revokeObjectURL(audioPlayerRef.current.src);
            }
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.load(); // Vital for mobile
            audio.onended = () => { setIsPlaying(false); setProgress(0); };
            audioPlayerRef.current = audio;

            updateGeometry(capturedData, totalFrames, 10, 15, 1.0, 3.0, 0, 1, 0.5, true);
            
        } catch (err) {
            console.error("Import Failed", err);
            alert("Could not process audio file.");
        } finally {
            setIsProcessing(false);
        }
    };

    // --- 5. PLAYBACK (FIXED FOR MOBILE) ---
    const togglePlayback = async (startPct: number, endPct: number) => {
        if (!audioPlayerRef.current) return;

        // MOBILE FIX: Resume context on user click
        await ensureAudioContext();

        if (isPlaying) {
            audioPlayerRef.current.pause();
            setIsPlaying(false);
        } else {
            const totalDur = audioPlayerRef.current.duration;
            if (!totalDur || !isFinite(totalDur)) { 
                // Force play to trigger metadata load if needed
                audioPlayerRef.current.play().catch(e => console.error("Play error", e));
                setIsPlaying(true); 
                return; 
            }

            audioPlayerRef.current.currentTime = totalDur * startPct;
            
            // Promise handling for mobile play
            audioPlayerRef.current.play()
                .then(() => {
                    setIsPlaying(true);
                    // Start Tracking
                    const checkInterval = setInterval(() => {
                        if (!audioPlayerRef.current || audioPlayerRef.current.paused) { 
                            clearInterval(checkInterval); 
                            return; 
                        }
                        const current = audioPlayerRef.current.currentTime;
                        const stopTime = totalDur * endPct;
                        
                        setProgress(current / totalDur);
                        
                        if (current >= stopTime) {
                            audioPlayerRef.current.pause();
                            setIsPlaying(false);
                            setProgress(startPct); // Reset dot
                            clearInterval(checkInterval);
                        }
                    }, 30); // 30ms for smoother UI updates
                })
                .catch(e => console.error("Playback failed (Mobile restriction?)", e));
        }
    };

    // --- 6. GEOMETRY ---
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
            // Cleanup logic
            if (audioPlayerRef.current) { 
                audioPlayerRef.current.pause(); 
                URL.revokeObjectURL(audioPlayerRef.current.src); 
            }
        };
    }, []);

    return {
        isRecording, isProcessing, isPlaying, duration, hasRecording: !!geometry, geometry, audioBlob, progress,
        dataRef: { buffer: historyRef.current, rows: frameCountRef.current },
        actions: { startRecording, stopRecording, updateGeometry, togglePlayback, importAudioFile }
    };
};