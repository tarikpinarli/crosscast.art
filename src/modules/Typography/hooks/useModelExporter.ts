import * as THREE from 'three';
import { useCallback } from 'react';
import { GLTFExporter } from 'three-stdlib';

interface MaterialParams {
    color: string;
    roughness: number;
    metalness: number;
}

export const useModelExporter = () => {
    const exportModel = useCallback((geometry: THREE.BufferGeometry | null, materialParams: MaterialParams) => {
        if (!geometry) return;
        
        // 1. Create a temporary mesh with the EXACT user material
        const material = new THREE.MeshStandardMaterial({
            color: materialParams.color,
            roughness: materialParams.roughness,
            metalness: materialParams.metalness
        });
        
        const mesh = new THREE.Mesh(geometry, material);

        // 2. Use GLTFExporter (Supports Color, Metal, Roughness)
        const exporter = new GLTFExporter();
        
        exporter.parse(
            mesh,
            (gltf) => {
                const blob = new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `typography_${Date.now()}.glb`; // Note the .glb extension
                link.click();
            },
            (err) => console.error("Export Failed:", err),
            { binary: true } // Export as binary .glb (single file)
        );
    }, []);

    return { exportModel };
};