import React, { useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stage, Grid, Environment } from '@react-three/drei';

interface SonicTotemViewProps {
    geometry: THREE.BufferGeometry | null;
    isRecording: boolean;
    color: string;
}

const TotemMesh = ({ geometry, color }: { geometry: THREE.BufferGeometry, color: string }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    
    return (
        <group>
            <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
                {/* UPDATED MATERIAL:
                   - DoubleSide: Makes walls solid from inside and out.
                   - Roughness 0.6: Looks like unglazed ceramic/clay.
                */}
                <meshStandardMaterial 
                    color={color} 
                    roughness={0.6} 
                    metalness={0.0}
                    side={THREE.DoubleSide} 
                    flatShading={false}
                />
            </mesh>
        </group>
    );
};

// ... RecordingVisualizer (Same as before) ...
const RecordingVisualizer = () => {
    const ringRef = useRef<THREE.Mesh>(null);
    useFrame(({ clock }) => {
        if (ringRef.current) {
            const s = 1 + Math.sin(clock.getElapsedTime() * 10) * 0.2;
            ringRef.current.scale.set(s, s, s);
            ringRef.current.rotation.z += 0.02;
        }
    });

    return (
        <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[3, 0.1, 16, 100]} />
            <meshBasicMaterial color="#a855f7" />
        </mesh>
    );
};

export const SonicTotemView = ({ geometry, isRecording, color }: SonicTotemViewProps) => {
    return (
        <Canvas shadows camera={{ position: [0, 8, 18], fov: 35 }} dpr={[1, 2]}>
            <color attach="background" args={['#09090b']} />
            
            {/* Lighting Setup: 
                "City" gives good reflections for ceramic looks.
                Intensity bumped to 1.0 so it's not dark.
            */}
            <Stage environment="city" intensity={1.0} adjustCamera={false} shadows={true}>
                {geometry ? (
                    <TotemMesh geometry={geometry} color={color} />
                ) : isRecording ? (
                    <RecordingVisualizer />
                ) : (
                    <mesh rotation={[Math.PI/2, 0, 0]}>
                        <ringGeometry args={[3.9, 4, 64]} />
                        <meshBasicMaterial color="#333" transparent opacity={0.5} />
                    </mesh>
                )}
            </Stage>

            <Grid 
                position={[0, -0.05, 0]} 
                args={[100, 100]} 
                cellColor="#333" 
                sectionColor="#a855f7" 
                sectionSize={5} 
                fadeDistance={30} 
            />

            <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.5} />
        </Canvas>
    );
};