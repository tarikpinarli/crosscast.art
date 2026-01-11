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
    const [debugMsg, setDebugMsg] = useState(""); 

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
    const mimeTypeRef = useRef<string>(""); 

    const FREQ_BINS = 64; 

    // --- HELPER: Setup Player ---
    const setupAudioPlayer = (blobOrFile: Blob | File) => {
        setAudioBlob(blobOrFile);
        
        if (audioPlayerRef.current) {
            audioPlayerRef.current.pause();
            audioPlayerRef.current.src = "";
            audioPlayerRef.current.load(); 
        }
        
        // OPTIMIZATION: Stream directly from file to save memory
        const url = URL.createObjectURL(blobOrFile);
        const audio = new Audio(url);
        audio.preload = 'metadata'; 

        audio.onended = () => {
            setIsPlaying(false);
            setProgress(0); 
            if (playbackRafRef.current) cancelAnimationFrame(playbackRafRef.current);
        };
        
        audio.onerror = (e) => {
            const code = audio.error ? audio.error.code : 0;
            let msg = "Unknown Audio Error";
            if (code === 4) msg = "Format not supported by browser, but Mesh generated.";
            if (code === 3) msg = "Decoding error.";
            console.warn("Audio Playback Error:", msg);
            setDebugMsg(msg);
        };

        audioPlayerRef.current = audio;
    };

    // --- 6. GEOMETRY GENERATION ---
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
        mirrored: boolean,
        smoothing: number
    ) => {
        if (!data || totalRows < 2) return;
        
        // Clamp indices
        const startRow = Math.floor(totalRows * trimStart);
        const endRow = Math.floor(totalRows * trimEnd);
        let rowCount = endRow - startRow;
        
        if (rowCount < 2) return;

        const startIdx = startRow * FREQ_BINS;
        const endIdx = endRow * FREQ_BINS;
        
        // Safety check
        if (endIdx > data.length) return; 
        const rawSlice = data.slice(startIdx, endIdx);

        // Resolution Stride Logic
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
                
                if (sourceIdx + FREQ_BINS <= rawSlice.length) {
                    for (let b = 0; b < FREQ_BINS; b++) {
                        finalData[targetIdx + b] = rawSlice[sourceIdx + b];
                    }
                }
            }
        }

        const geom = generateLandscapeGeometry(
            finalData, 
            finalRows, 
            FREQ_BINS, 
            width, 
            length, 
            baseHeight, 
            gain, 
            mirrored,
            smoothing
        );
        setGeometry(geom);
    }, []);

    // --- 1. START RECORDING ---
    const startRecording = async () => {
        setDebugMsg("");
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert("Microphone not supported.");
            return;
        }

        try {
            if (!audioContextRef.current) {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                audioContextRef.current = new AudioContextClass();
            }
            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }
            
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            let mimeType = 'audio/webm';
            if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
            else if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';
            mimeTypeRef.current = mimeType;

            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const analyser = audioContextRef.current!.createAnalyser();
            analyser.fftSize = FREQ_BINS * 2; 
            source.connect(analyser);
            analyserRef.current = analyser;

            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            audioChunksRef.current = [];
            
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };
            
            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: mimeTypeRef.current });
                setupAudioPlayer(blob);
            };
            
            mediaRecorder.start();
            mediaRecorderRef.current = mediaRecorder;

            const MAX_FRAMES = 3600; 
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
            audioContextRef.current.suspend(); 
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            setIsRecording(false);
            
            if (frameCountRef.current > 2 && historyRef.current) {
                const recordedLength = frameCountRef.current * FREQ_BINS;
                const finalData = historyRef.current.slice(0, recordedLength);
                updateGeometry(finalData, frameCountRef.current, 10, 15, 1.0, 3.0, 0, 1, 0.5, true, 0.5);
            }
        }
    };

    // --- 4. IMPORT (OPTIMIZED FOR LARGE FILES) ---
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
            
            // --- AUTO SCALING LOGIC ---
            // 2048 samples = ~21fps
            // 4096 samples = ~10fps
            // 16384 samples = ~2.6fps (for massive files)
            let bufferSize = 2048;
            if (audioBuffer.duration > 60) bufferSize = 4096;
            if (audioBuffer.duration > 300) bufferSize = 16384; 

            // Create Offline Context
            const offlineCtx = new OfflineAudioContext(1, audioBuffer.length, audioBuffer.sampleRate);
            
            // Source
            const source = offlineCtx.createBufferSource();
            source.buffer = audioBuffer;

            // Analyser
            const analyser = offlineCtx.createAnalyser();
            analyser.fftSize = FREQ_BINS * 2;
            analyser.smoothingTimeConstant = 0.2;

            // Script Processor (The Fast-Forward Mechanism)
            const processor = offlineCtx.createScriptProcessor(bufferSize, 1, 1);
            
            // Connect Graph
            source.connect(analyser);
            analyser.connect(processor);
            processor.connect(offlineCtx.destination);

            // Container for data
            const capturedBuffers: Uint8Array[] = [];
            const tempArray = new Uint8Array(FREQ_BINS);

            // Capture logic
            processor.onaudioprocess = () => {
                analyser.getByteFrequencyData(tempArray);
                // We must copy the array, otherwise it gets overwritten
                capturedBuffers.push(new Uint8Array(tempArray));
            };

            // Start Rendering
            source.start(0);
            await offlineCtx.startRendering();

            // Processing Finished: Flatten the data
            const totalFrames = capturedBuffers.length;
            const fullData = new Uint8Array(totalFrames * FREQ_BINS);
            
            for(let i=0; i < totalFrames; i++) {
                fullData.set(capturedBuffers[i], i * FREQ_BINS);
            }

            historyRef.current = fullData;
            frameCountRef.current = totalFrames;
            setDuration(audioBuffer.duration);
            
            // Setup Player
            setupAudioPlayer(file);

            // Update Geometry
            updateGeometry(fullData, totalFrames, 10, 15, 1.0, 3.0, 0, 1, 0.5, true, 0.5);
            
        } catch (err: any) {
            console.error("Import Failed", err);
            setDebugMsg("Import Fail: " + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    // --- 5. PLAYBACK ---
    const togglePlayback = (startPct: number, endPct: number) => {
        if (!audioPlayerRef.current) return;
        const audio = audioPlayerRef.current;

        if (audio.error) {
            alert("This audio format is not supported for playback by your browser, but the 3D mesh was generated successfully.");
            return;
        }

        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
            if (playbackRafRef.current) cancelAnimationFrame(playbackRafRef.current);
        } else {
            const totalDur = audio.duration;
            
            if (!isFinite(totalDur)) {
                 audio.currentTime = 0;
            } else {
                 if (progress >= endPct || progress < startPct) {
                    audio.currentTime = totalDur * startPct;
                 } else {
                    audio.currentTime = totalDur * progress;
                 }
            }

            const playPromise = audio.play();

            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        setIsPlaying(true);
                        setDebugMsg(""); 

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
                        setDebugMsg("Play Fail: " + error.message);
                        setIsPlaying(false);
                    });
            }
        }
    };

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