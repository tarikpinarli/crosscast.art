import * as THREE from 'three';
import { STLExporter } from 'three-stdlib';

export const generateLandscapeGeometry = (
    audioData: Uint8Array, 
    timeSteps: number,    
    freqBins: number,     
    width: number,        
    length: number,       
    baseHeight: number,   
    gain: number,
    mirrored: boolean = false // <--- NEW PARAM
): THREE.BufferGeometry => {

    // Safety Guard
    if (!audioData || audioData.length === 0 || timeSteps < 2 || freqBins < 2) {
        return new THREE.BoxGeometry(width, baseHeight, length);
    }
    
    // Segments
    const segmentsX = Math.max(1, freqBins - 1);
    const segmentsZ = Math.max(1, timeSteps - 1);

    // Create Box
    const geometry = new THREE.BoxGeometry(width, baseHeight, length, segmentsX, 1, segmentsZ);
    
    const posAttribute = geometry.attributes.position;
    const vertexCount = posAttribute.count;

    const topY = baseHeight / 2;
    const epsilon = 0.001; 

    for (let i = 0; i < vertexCount; i++) {
        const x = posAttribute.getX(i);
        const y = posAttribute.getY(i);
        const z = posAttribute.getZ(i);

        // Only displace the Top Face
        if (Math.abs(y - topY) < epsilon) {
            
            // Map UVs (0..1)
            const u = (x / width) + 0.5; // X axis (Frequency)
            const v = (z / length) + 0.5; // Z axis (Time)
            
            // --- SYMMETRY LOGIC ---
            let freqIndex;
            if (mirrored) {
                // Calculate distance from center (0.5)
                // Result is 0 (center) to 1 (edge)
                const distFromCenter = Math.abs(u - 0.5) * 2;
                freqIndex = Math.floor(distFromCenter * (freqBins - 1));
            } else {
                // Standard Left-to-Right
                freqIndex = Math.floor(u * (freqBins - 1));
            }

            // Clamp Time Index
            const timeIndex = Math.max(0, Math.min(timeSteps - 1, Math.floor((1 - v) * (timeSteps - 1))));
            const safeFreqIndex = Math.max(0, Math.min(freqBins - 1, freqIndex));

            const dataIndex = (timeIndex * freqBins) + safeFreqIndex;
            
            if (dataIndex >= 0 && dataIndex < audioData.length) {
                const rawVal = audioData[dataIndex] / 255.0; 
                
                // --- TAPER LOGIC (Fixing the vertical wall) ---
                // We force the first 10% and last 10% of the mesh to fade to 0
                // This creates a smooth slope instead of a 90-degree cliff
                let taper = 1.0;
                
                // Distance from start/end of Z-axis (0..1)
                const distZ = Math.min(v, 1 - v); 
                const taperLength = 0.1; // 10% fade
                
                if (distZ < taperLength) {
                    // Smooth S-Curve fade
                    const t = distZ / taperLength;
                    taper = t * t * (3 - 2 * t); 
                }

                // Apply Height
                const newY = topY + (rawVal * gain * taper);
                posAttribute.setY(i, newY);
            }
        }
    }

    geometry.computeVertexNormals();
    return geometry;
};

export const exportSTL = (geometry: THREE.BufferGeometry) => {
    const exporter = new STLExporter();
    const mesh = new THREE.Mesh(geometry);
    return exporter.parse(mesh, { binary: true });
};