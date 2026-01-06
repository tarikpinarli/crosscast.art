import React, { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Import your existing components
import { SmartCamera } from './SmartCamera';
import { SimulationRoom } from './SimulationRoom';

interface SceneWrapperProps {
    children: React.ReactNode;
    geometry: THREE.BufferGeometry | null;
    viewTrigger: { type: string; t: number } | null;
    showRoom?: boolean;
}

export const SceneWrapper = ({ children, geometry, viewTrigger, showRoom = true }: SceneWrapperProps) => {
    const controlsRef = useRef<any>(null);

    return (
        <Canvas shadows dpr={[1, 2]} gl={{ preserveDrawingBuffer: true }}>
            <color attach="background" args={['#09090b']} />
            
            {/* Camera System */}
            <PerspectiveCamera makeDefault position={[20, 20, 20]} fov={45} near={0.1} far={15000} />
            <OrbitControls 
                ref={controlsRef} 
                makeDefault 
                autoRotate={false} 
                enableDamping 
                dampingFactor={0.05} 
                maxPolarAngle={Math.PI / 1.5} 
            />
            
            {/* Your Smart Camera Logic */}
            <SmartCamera 
                viewTrigger={viewTrigger} 
                controlsRef={controlsRef} 
                geometry={geometry} 
            />

            {/* Room & Fog */}
            {showRoom && <SimulationRoom />}
            <fog attach="fog" args={['#000000', 10, 15000]} /> 

            {/* Content */}
            <Suspense fallback={null}>
                {children}
            </Suspense>
        </Canvas>
    );
};