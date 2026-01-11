import * as THREE from 'three';
import { STLExporter } from 'three-stdlib';

// --- HELPER: 3x3 Gaussian Blur ---
// This melts the "noise" by averaging every point with its neighbors
const applySmoothing = (data: Uint8Array, width: number, height: number, iterations: number): Float32Array => {
    // Convert to float for better precision during math
    let current = Float32Array.from(data);
    let next = new Float32Array(current.length);

    // If slider is 0, return raw data
    if (iterations <= 0) return current;

    // How many times do we blur? (More iterations = liquid look)
    const loops = Math.floor(iterations * 10); // Slider 0.0-1.0 -> 0 to 10 passes

    for (let i = 0; i < loops; i++) {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                
                // Get neighbors (clamped to edges)
                const left = Math.max(0, x - 1);
                const right = Math.min(width - 1, x + 1);
                const up = Math.max(0, y - 1);
                const down = Math.min(height - 1, y + 1);

                // Simple cross average (Center + Up + Down + Left + Right)
                const sum = current[idx] * 4 // Weight center more heavily
                          + current[y * width + left]
                          + current[y * width + right]
                          + current[up * width + x]
                          + current[down * width + x];
                
                next[idx] = sum / 8;
            }
        }
        // Swap buffers
        let temp = current;
        current = next;
        next = temp;
    }
    return current;
};

// --- HELPER: Smooth Interpolation (From previous step) ---
const getInterpolatedValue = (
    data: Float32Array, // Now accepts Float32
    x: number, 
    y: number, 
    width: number, 
    height: number
): number => {
    const x1 = Math.floor(x);
    const x2 = Math.min(width - 1, Math.ceil(x));
    const y1 = Math.floor(y);
    const y2 = Math.min(height - 1, Math.ceil(y));

    const wx = x - x1;
    const wy = y - y1;

    const val11 = data[(y1 * width) + x1] || 0;
    const val21 = data[(y1 * width) + x2] || 0;
    const val12 = data[(y2 * width) + x1] || 0;
    const val22 = data[(y2 * width) + x2] || 0;

    const top = val11 * (1 - wx) + val21 * wx;
    const bottom = val12 * (1 - wx) + val22 * wx;

    return top * (1 - wy) + bottom * wy;
};

export const generateLandscapeGeometry = (
    audioData: Uint8Array, 
    timeSteps: number,    
    freqBins: number,      
    width: number,        
    length: number,       
    baseHeight: number,   
    gain: number,
    mirrored: boolean = false,
    smoothing: number = 0.5 // <--- NEW PARAMETER (0.0 to 1.0)
): THREE.BufferGeometry => {

    if (!audioData || audioData.length === 0 || timeSteps < 2 || freqBins < 2) {
        return new THREE.BoxGeometry(width, baseHeight, length);
    }
    
    // 1. PRE-PROCESS: Apply the smoothing pass to the data first
    const smoothedData = applySmoothing(audioData, freqBins, timeSteps, smoothing);

    // Increase resolution for smoother look
    const segmentsX = Math.max(1, (freqBins - 1) * 2); 
    const segmentsZ = Math.max(1, (timeSteps - 1) * 2);

    const geometry = new THREE.BoxGeometry(width, baseHeight, length, segmentsX, 1, segmentsZ);
    const posAttribute = geometry.attributes.position;
    const vertexCount = posAttribute.count;

    const topY = baseHeight / 2;
    const epsilon = 0.001; 

    for (let i = 0; i < vertexCount; i++) {
        const x = posAttribute.getX(i);
        const y = posAttribute.getY(i);
        const z = posAttribute.getZ(i);

        if (Math.abs(y - topY) < epsilon) {
            
            const u = (x / width) + 0.5; 
            const v = (z / length) + 0.5; 
            
            let freqCoord;
            if (mirrored) {
                const distFromCenter = Math.abs(u - 0.5) * 2;
                freqCoord = distFromCenter * (freqBins - 1);
            } else {
                freqCoord = u * (freqBins - 1);
            }

            const timeCoord = (1 - v) * (timeSteps - 1);
            const safeFreqCoord = Math.max(0, Math.min(freqBins - 1, freqCoord));
            const safeTimeCoord = Math.max(0, Math.min(timeSteps - 1, timeCoord));

            // Use smoothedData here
            const rawVal = getInterpolatedValue(smoothedData, safeFreqCoord, safeTimeCoord, freqBins, timeSteps);
            let val = rawVal / 255.0; 

            // Visual Drama Logic
            val = Math.pow(val, 3); 
            const freqRatio = safeFreqCoord / freqBins;
            const trebleBoost = 1 + (freqRatio * 1.5);
            val *= trebleBoost;
            if (val < 0.05) val = 0;

            // Tapering
            let taper = 1.0;
            const distZ = Math.min(v, 1 - v); 
            const taperLength = 0.15;
            
            if (distZ < taperLength) {
                const t = distZ / taperLength;
                taper = t * t * (3 - 2 * t); 
            }

            const newY = topY + (val * gain * taper);
            posAttribute.setY(i, newY);
        }
    }

    geometry.computeVertexNormals();
    return geometry;
};