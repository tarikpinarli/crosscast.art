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
    const [debugMsg, setDebugMsg] = useState(""); // New Debug State

    // --- REFS ---
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const rafRef = useRef<number | null>(null); 
    const playbackRafRef = useRef<number | null>(null); 
    
    const startTimeRef = useRef<number>(0);
    const historyRef = useRef<Uint8Array | null>(null);
    const frameCountRef = useRef(0);
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
    const mimeTypeRef = useRef<string>(""); // Store the correct format

    const FREQ_BINS = 64; 

    // --- HELPER: Setup Player ---
    const setupAudioPlayer = (blob: Blob) => {
        setAudioBlob(blob);
        
        if (audioPlayerRef.current) {
            audioPlayerRef.current.pause();
            audioPlayerRef.current.src = "";
            audioPlayerRef.current.load(); // Force unload
        }
        
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        
        // Mobile Safari needs explicit loading sometimes
        audio.load();

        audio.onended = () => {
            setIsPlaying(false);
            setProgress(0); 
            if (playbackRafRef.current) cancelAnimationFrame(playbackRafRef.current);
        };
        
        // Error Listener
        audio.onerror = (e) => {
            const err = "Audio Error: " + (audio.error ? audio.error.code : "Unknown");
            console.error(err);
            setDebugMsg(err);
        };

        audioPlayerRef.current = audio;
    };

    // --- 1. START RECORDING (Mobile Safe) ---
    const startRecording = async () => {
        setDebugMsg("");
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert("Microphone not supported.");
            return;
        }

        try {
            // Initialize Audio Context
            if (!audioContextRef.current) {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                audioContextRef.current = new AudioContextClass();
            }
            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }
            
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // --- DETECT SUPPORTED FORMAT ---
            // iPhones prefer mp4/aac. Computers prefer webm.
            let mimeType = 'audio/webm';
            if (MediaRecorder.isTypeSupported('audio/mp4')) {
                mimeType = 'audio/mp4';
            } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
                mimeType = 'audio/ogg';
            }
            mimeTypeRef.current = mimeType;
            console.log("Using MIME:", mimeType);

            // Connect Visualizer
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const analyser = audioContextRef.current!.createAnalyser();
            analyser.fftSize = FREQ_BINS * 2; 
            source.connect(analyser);
            analyserRef.current = analyser;

            // Start Recorder with specific MIME type
            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            audioChunksRef.current = [];
            
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };
            
            mediaRecorder.onstop = () => {
                // Create Blob with the SAME MIME type used to record
                const blob = new Blob(audioChunksRef.current, { type: mimeTypeRef.current });
                setupAudioPlayer(blob);
            };
            
            mediaRecorder.start();
            mediaRecorderRef.current = mediaRecorder;

            // Setup Buffers
            const MAX_FRAMES = 1800; 
            historyRef.current = new Uint8Array(MAX_FRAMES * FREQ_BINS);
            frameCountRef.current = 0;
            startTimeRef.current = Date.now();
            
            setIsRecording(true);
            setAudioBlob(null);
            setGeometry(null);

            analyzeLoop();

        } catch (err: any) {
            console.error("Mic Error:", err);
            setDebugMsg("Mic Fail: " + err.message);
            setIsRecording(false);
        }
    };

    // --- 2. LOOP (Unchanged) ---
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

    // --- 3. STOP (Unchanged) ---
    const stopRecording = () => {
        if (audioContextRef.current) {
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

    // --- 4. IMPORT (Unchanged) ---
    const importAudioFile = async (file: File) => {
        setIsProcessing(true);
        setGeometry(null);
        setAudioBlob(null);
        setProgress(0);
        setDebugMsg("");

        try {
            if (!audioContextRef.current) {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                audioContextRef.current = new AudioContextClass();
            }
            
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
            
            const offlineCtx = new OfflineAudioContext(1, audioBuffer.length, audioBuffer.sampleRate);
            const source = offlineCtx.createBufferSource();
            source.buffer = audioBuffer;
            const analyser = offlineCtx.createAnalyser();
            analyser.fftSize = FREQ_BINS * 2;
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
            
            const blob = new Blob([await file.arrayBuffer()], { type: file.type });
            setupAudioPlayer(blob);

            updateGeometry(capturedData, totalFrames, 10, 15, 1.0, 3.0, 0, 1, 0.5, true);
            
        } catch (err: any) {
            console.error("Import Failed", err);
            setDebugMsg("Import Fail: " + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    // --- 5. PLAYBACK (DEBUG MODE) ---
    const togglePlayback = (startPct: number, endPct: number) => {
        if (!audioPlayerRef.current) {
            alert("No audio player found");
            return;
        }
        const audio = audioPlayerRef.current;

        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
            if (playbackRafRef.current) cancelAnimationFrame(playbackRafRef.current);
        } else {
            const totalDur = audio.duration;
            
            // Handle NaN duration (common loading issue)
            if (!isFinite(totalDur)) {
                 audio.currentTime = 0;
            } else {
                 if (progress >= endPct || progress < startPct) {
                    audio.currentTime = totalDur * startPct;
                 } else {
                    audio.currentTime = totalDur * progress;
                 }
            }

            // --- THE CRITICAL MOBILE FIX ---
            // We use a simple promise chain with an ALERT on failure
            const playPromise = audio.play();

            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        setIsPlaying(true);
                        setDebugMsg(""); // Clear errors on success

                        const loop = () => {
                            if (!audio || audio.paused) return;
                            const current = audio.currentTime;
                            const duration = audio.duration || 1; 
                            const stopTime = duration * endPct;
                            
                            setProgress(current / duration);

                            if (current >= stopTime) {
                                audio.pause();
                                setIsPlaying(false);
                                setProgress(startPct); 
                            } else {
                                playbackRafRef.current = requestAnimationFrame(loop);
                            }
                        };
                        playbackRafRef.current = requestAnimationFrame(loop);
                    })
                    .catch(error => {
                        console.error("Playback prevented:", error);
                        // ALERT THE USER SO WE KNOW WHY
                        alert("Playback Failed: " + error.message); 
                        setDebugMsg("Play Fail: " + error.message);
                        setIsPlaying(false);
                    });
            }
        }
    };

    // --- 6. GEOMETRY (Unchanged) ---
    const updateGeometry = useCallback((
        data: Uint8Array, totalRows: number, width: number, length: number, baseHeight: number, 
        gain: number, trimStart: number, trimEnd: number, resolution: number, mirrored: boolean
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
            if (audioPlayerRef.current) {
                audioPlayerRef.current.pause();
                audioPlayerRef.current.src = "";
            }
            if (playbackRafRef.current) cancelAnimationFrame(playbackRafRef.current);
        };
    }, []);

    return {
        isRecording, isProcessing, isPlaying, duration, hasRecording: !!geometry, geometry, audioBlob, progress, debugMsg,
        dataRef: { buffer: historyRef.current, rows: frameCountRef.current },
        actions: { startRecording, stopRecording, updateGeometry, togglePlayback, importAudioFile }
    };
};