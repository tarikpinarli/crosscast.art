import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

interface SmartCameraProps {
    viewTrigger: { type: string; t: number } | null;
    controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
    geometry: THREE.BufferGeometry | null;
}

export const SmartCamera = ({ viewTrigger, controlsRef, geometry }: SmartCameraProps) => {
    const { camera } = useThree();
    const isAnimating = useRef(false);
    const finalPosition = useRef(new THREE.Vector3(20, 20, 20)); // Default closer
    const finalTarget = useRef(new THREE.Vector3(0, 0, 0));
    const isFirstLoad = useRef(true);

    // Stop animation on user interaction
    useEffect(() => {
        const controls = controlsRef.current;
        if (!controls) return;
        const stopAnimation = () => { isAnimating.current = false; };
        controls.addEventListener('start', stopAnimation);
        return () => controls.removeEventListener('start', stopAnimation);
    }, [controlsRef]);

    // Handle Trigger / Geometry Updates
    useEffect(() => {
        if (!geometry || !controlsRef.current) return;
        
        geometry.computeBoundingBox();
        const box = geometry.boundingBox;
        if (!box) return;

        // 1. Calculate Center
        const center = new THREE.Vector3();
        box.getCenter(center);
        finalTarget.current.copy(center);

        // 2. Calculate Size (Dynamic Zoom) 
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        
        // 3. Determine Distance Multiplier
        // We add a little padding (1.5x to 2x the size) so it fits the screen
        const distance = maxDim * 2.0; 
        const isoDistance = maxDim * 1.5;

        if (viewTrigger || isFirstLoad.current) {
            
            // --- UPDATED LOGIC HERE ---
            if (viewTrigger?.type === 'front') { 
                // Front view: Center X/Y, back up Z
                finalPosition.current.set(center.x, center.y, center.z + distance); 
            } 
            else if (viewTrigger?.type === 'side') { 
                // Side view: Center Y/Z, back up X
                finalPosition.current.set(center.x + distance, center.y, center.z); 
            } 
            else { 
                // Isometric: Offset all axes
                finalPosition.current.set(
                    center.x + isoDistance, 
                    center.y + isoDistance, 
                    center.z + isoDistance
                ); 
            }

            if (isFirstLoad.current) {
                 camera.position.copy(finalPosition.current);
                 controlsRef.current.target.copy(finalTarget.current);
                 controlsRef.current.update();
                 isFirstLoad.current = false;
                 isAnimating.current = false;
            } else {
                 isAnimating.current = true;
            }
        }
    }, [viewTrigger, geometry, controlsRef, camera]);

    // Animation Loop
    useFrame(() => {
        if (!controlsRef.current || !isAnimating.current) return;
        
        const distPos = camera.position.distanceTo(finalPosition.current);
        const distTarget = controlsRef.current.target.distanceTo(finalTarget.current);
        
        // Stop if close enough (tolerance 0.5 units)
        if (distPos < 0.5 && distTarget < 0.5) {
            isAnimating.current = false;
            camera.position.copy(finalPosition.current);
            controlsRef.current.target.copy(finalTarget.current);
            controlsRef.current.update();
            return;
        }
        
        // Lerp factor
        camera.position.lerp(finalPosition.current, 0.1);
        controlsRef.current.target.lerp(finalTarget.current, 0.1);
        controlsRef.current.update();
    });

    return null;
};