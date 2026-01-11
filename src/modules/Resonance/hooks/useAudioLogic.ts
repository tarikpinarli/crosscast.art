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
    
    const rafRef = useRef<number | null>(null); // Recording Loop
    const playbackRafRef = useRef<number | null>(null); // Playback Loop
    
    const startTimeRef = useRef<number>(0);
    const historyRef = useRef<Uint8Array | null>(null);
    const frameCountRef = useRef(0);
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

    const FREQ_BINS = 64; 

    // --- HELPER: Setup Player ---
    // We create the audio element once and keep it ready
    const setupAudioPlayer = (blob: Blob) => {
        setAudioBlob(blob);
        
        // Clean up old player
        if (audioPlayerRef.current) {
            audioPlayerRef.current.pause();
            audioPlayerRef.current.src = "";
        }
        
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        
        // IMPORTANT FOR MOBILE: 
        // We do not call .load() here asynchronously. 
        // We just prepare it.
        
        audio.onended = () => {
            setIsPlaying(false);
            setProgress(0); // Optional: Reset to start
            if (playbackRafRef.current) cancelAnimationFrame(playbackRafRef.current);
        };
        
        audioPlayerRef.current = audio;
    };

    // --- 1. START RECORDING ---
    const startRecording = async () => {
        // ... (Same validation as before) ...
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert("Microphone not supported.");
            return;
        }

        try {
            // Initialize Audio Context (Standard pattern for Web Audio API)
            if (!audioContextRef.current) {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                audioContextRef.current = new AudioContextClass();
            }
            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }
            
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const analyser = audioContextRef.current!.createAnalyser();
            analyser.fftSize = FREQ_BINS * 2; 
            source.connect(analyser);
            analyserRef.current = analyser;

            const mediaRecorder = new MediaRecorder(stream);
            audioChunksRef.current = [];
            
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };
            
            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
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

        } catch (err) {
            console.error("Mic Error:", err);
            setIsRecording(false);
        }
    };

    // --- 2. LOOP (Recording) ---
    const analyzeLoop = () => {
        if (!analyserRef.current || !historyRef.current) return;
        const buffer = new Uint8Array(FREQ_BINS);
        analyserRef.current.getByteFrequencyData(buffer);
        
        // Store data
        const offset = frameCountRef.current * FREQ_BINS;
        if (offset + FREQ_BINS < historyRef.current.length) {
             historyRef.current.set(buffer, offset);
             frameCountRef.current++;
        }
        
        setDuration((Date.now() - startTimeRef.current) / 1000);
        rafRef.current = requestAnimationFrame(analyzeLoop);
    };

    // --- 3. STOP RECORDING ---
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

    // --- 4. IMPORT FILE ---
    const importAudioFile = async (file: File) => {
        setIsProcessing(true);
        setGeometry(null);
        setAudioBlob(null);
        setProgress(0);

        try {
            // Need AudioContext to decode data for geometry generation
            if (!audioContextRef.current) {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                audioContextRef.current = new AudioContextClass();
            }
            // Note: We do NOT await resume() here strictly, we just need decodeAudioData which works anyway usually.
            
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
            
            // --- OFFLINE PROCESSING (Fast Forward) ---
            const offlineCtx = new OfflineAudioContext(1, audioBuffer.length, audioBuffer.sampleRate);
            const source = offlineCtx.createBufferSource();
            source.buffer = audioBuffer;
            const analyser = offlineCtx.createAnalyser();
            analyser.fftSize = FREQ_BINS * 2;
            source.connect(analyser);
            analyser.connect(offlineCtx.destination);
            source.start(0);

            const fps = 30; // Sample rate for the visual mesh
            const totalFrames = Math.floor(audioBuffer.duration * fps);
            const interval = 1 / fps;
            const capturedData = new Uint8Array(totalFrames * FREQ_BINS);
            const tempArray = new Uint8Array(FREQ_BINS);

            for (let i = 0; i < totalFrames; i++) {
                // "Scrub" the offline context
                offlineCtx.suspend(i * interval).then(() => {
                    analyser.getByteFrequencyData(tempArray);
                    capturedData.set(tempArray, i * FREQ_BINS);
                }).then(() => offlineCtx.resume());
            }

            await offlineCtx.startRendering();

            // Set Data
            historyRef.current = capturedData;
            frameCountRef.current = totalFrames;
            setDuration(audioBuffer.duration);
            
            // Setup Playback Blob
            const blob = new Blob([await file.arrayBuffer()], { type: file.type });
            setupAudioPlayer(blob);

            updateGeometry(capturedData, totalFrames, 10, 15, 1.0, 3.0, 0, 1, 0.5, true);
            
        } catch (err) {
            console.error("Import Failed", err);
            alert("Could not process audio file.");
        } finally {
            setIsProcessing(false);
        }
    };

    // --- 5. PLAYBACK (MOBILE FIX) ---
    // NO ASYNC allowed before .play()
    const togglePlayback = (startPct: number, endPct: number) => {
        if (!audioPlayerRef.current) return;
        const audio = audioPlayerRef.current;

        if (isPlaying) {
            // PAUSE
            audio.pause();
            setIsPlaying(false);
            if (playbackRafRef.current) cancelAnimationFrame(playbackRafRef.current);
        } else {
            // PLAY
            // 1. Calculate Start Position
            const totalDur = audio.duration;
            
            // Safety check for infinite duration (sometimes happens on streaming/loading)
            if (!isFinite(totalDur)) {
                 // Try to just play from 0 if metadata missing
                 audio.currentTime = 0;
            } else {
                 // If we are outside the trim zone, jump to start
                 if (progress >= endPct || progress < startPct) {
                    audio.currentTime = totalDur * startPct;
                 } else {
                    audio.currentTime = totalDur * progress;
                 }
            }

            // 2. TRIGGER PLAY IMMEDIATELY (Vital for Mobile)
            // We store the promise to catch errors, but we don't await it to block UI
            const playPromise = audio.play();

            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        // Success! Now we update state and start the loop
                        setIsPlaying(true);
                        
                        // Start Animation Loop
                        const loop = () => {
                            if (!audio || audio.paused) return;
                            
                            const current = audio.currentTime;
                            const duration = audio.duration || 1; // Prevent divide by zero
                            const stopTime = duration * endPct;
                            
                            setProgress(current / duration);

                            if (current >= stopTime) {
                                audio.pause();
                                setIsPlaying(false);
                                setProgress(startPct); // Snap back to visual start
                            } else {
                                playbackRafRef.current = requestAnimationFrame(loop);
                            }
                        };
                        playbackRafRef.current = requestAnimationFrame(loop);
                    })
                    .catch(error => {
                        console.error("Playback prevented:", error);
                        setIsPlaying(false);
                    });
            }
        }
    };

    // --- 6. GEOMETRY GENERATOR (Unchanged) ---
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

        // Resolution Downsampling
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

    // Cleanup
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
        isRecording, isProcessing, isPlaying, duration, hasRecording: !!geometry, geometry, audioBlob, progress,
        dataRef: { buffer: historyRef.current, rows: frameCountRef.current },
        actions: { startRecording, stopRecording, updateGeometry, togglePlayback, importAudioFile }
    };
};