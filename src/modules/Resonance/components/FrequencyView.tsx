import React, { useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stage, Grid, Text, PerspectiveCamera } from '@react-three/drei';

import { SmartCamera } from '../../../components/3d/SmartCamera';
import { ViewToolbar } from '../../../components/ui/ViewToolbar';

interface FrequencyViewProps {
    geometry: THREE.BufferGeometry | null;
    isRecording: boolean;
    color: string;
    isPlaying: boolean;
    playbackProgress: number; 
    trimStart: number;        
    trimEnd: number; 
    length: number;
}

interface LandscapeMeshProps {
    geometry: THREE.BufferGeometry;
    color: string;
    isPlaying: boolean;
    playbackProgress: number;
    trimStart: number;
    trimEnd: number;
    length: number;
}

const LandscapeMesh = ({ geometry, color, isPlaying, playbackProgress, trimStart, trimEnd, length }: LandscapeMeshProps) => {
    const materialRef = useRef<any>(null);

    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uPlayhead: { value: 0 },   
        uTrimStart: { value: 0 },  
        uTrimEnd: { value: 1 },    
        uIsPlaying: { value: 0 },
        uLength: { value: length },
        uScanColor: { value: new THREE.Color('#ffffff') }, 
        uBaseColor: { value: new THREE.Color(color) }
    }), [color, length]);

    useFrame(({ clock }) => {
        if (materialRef.current && materialRef.current.uniforms) {
            const mat = materialRef.current;
            mat.uniforms.uTime.value = clock.getElapsedTime();
            mat.uniforms.uPlayhead.value = THREE.MathUtils.lerp(
                mat.uniforms.uPlayhead.value,
                playbackProgress,
                0.5 // Faster lerp for mobile response
            );
            mat.uniforms.uIsPlaying.value = isPlaying ? 1.0 : 0.0;
            mat.uniforms.uTrimStart.value = trimStart;
            mat.uniforms.uTrimEnd.value = trimEnd;
            mat.uniforms.uLength.value = length; 
        }
    });

    useEffect(() => {
        if(materialRef.current && materialRef.current.uniforms) {
             materialRef.current.uniforms.uBaseColor.value.set(color);
        }
    }, [color]);

    const onBeforeCompile = (shader: any) => {
        shader.uniforms = { ...shader.uniforms, ...uniforms };
        materialRef.current = shader;
        materialRef.current.uniforms = shader.uniforms;

        shader.fragmentShader = `
            uniform float uPlayhead;
            uniform float uTrimStart;
            uniform float uTrimEnd;
            uniform float uIsPlaying;
            uniform float uLength;
            uniform vec3 uScanColor;
            uniform vec3 uBaseColor;
            varying vec3 vLocalPosition; 
        ` + shader.fragmentShader;

        shader.vertexShader = `
            varying vec3 vLocalPosition;
        ` + shader.vertexShader;
        
        // FIX: Capture LOCAL position for accurate scanning regardless of Stage transforms
        shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `
            #include <begin_vertex>
            vLocalPosition = position; 
            `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <dithering_fragment>',
            `
            #include <dithering_fragment>
            
            if (uIsPlaying > 0.5) {
                float halfLength = uLength / 2.0;
                // Map local Z to 0..1 range
                float normalizedZ = (vLocalPosition.z + halfLength) / uLength;
                normalizedZ = 1.0 - clamp(normalizedZ, 0.0, 1.0); 

                float meshDuration = uTrimEnd - uTrimStart;
                float relativePlayhead = (uPlayhead - uTrimStart) / meshDuration;
                
                float dist = abs(normalizedZ - relativePlayhead);
                float scanline = smoothstep(0.02, 0.0, dist); 
                
                vec3 finalScanColor = mix(gl_FragColor.rgb, uScanColor, scanline * 0.8);
                gl_FragColor = vec4(finalScanColor, gl_FragColor.a);
            } 
            `
        );
    };

    return (
        <group>
            <mesh geometry={geometry} castShadow receiveShadow>
                <meshStandardMaterial 
                    color={color} 
                    roughness={0.3} 
                    metalness={0.7}
                    flatShading={true}
                    side={THREE.DoubleSide}
                    onBeforeCompile={onBeforeCompile}
                />
            </mesh>
            <mesh geometry={geometry} position={[0, 0.005, 0]}>
                 <meshBasicMaterial color="white" wireframe={true} transparent opacity={0.08} />
            </mesh>
        </group>
    );
};

const RecordingViz = () => {
    return (
        <group>
            {[...Array(5)].map((_, i) => (
                 <mesh key={i} position={[(i-2)*1.5, 0, 0]}>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshBasicMaterial color="#ef4444" wireframe />
                 </mesh>
            ))}
            <Text position={[0, -2, 0]} fontSize={0.5} color="#ef4444" anchorX="center" anchorY="middle">
                Recording...
            </Text>
        </group>
    );
};

export const FrequencyView = ({ 
    geometry, 
    isRecording, 
    color,
    isPlaying,
    playbackProgress,
    trimStart,
    trimEnd,
    length
}: FrequencyViewProps) => {
    
    const [viewTrigger, setViewTrigger] = useState<{ type: string, t: number } | null>(null);
    const controlsRef = useRef<any>(null);

    const handleViewChange = (type: string) => setViewTrigger({ type, t: Date.now() });

    return (
        <div className="w-full h-full relative group">
            <ViewToolbar onViewChange={handleViewChange} />

            <Canvas shadows dpr={[1, 2]}>
                <color attach="background" args={['#09090b']} />
                
                <PerspectiveCamera makeDefault position={[20, 20, 20]} fov={45} />
                <OrbitControls ref={controlsRef} makeDefault autoRotate={false} />
                
                <SmartCamera 
                    viewTrigger={viewTrigger} 
                    controlsRef={controlsRef} 
                    geometry={geometry} 
                />

                <Stage environment="city" intensity={0.6} adjustCamera={false}>
                    {geometry ? (
                        <LandscapeMesh 
                            geometry={geometry} 
                            color={color}
                            isPlaying={isPlaying}
                            playbackProgress={playbackProgress}
                            trimStart={trimStart}
                            trimEnd={trimEnd}
                            length={length}
                        />
                    ) : isRecording ? (
                        <RecordingViz />
                    ) : (
                        <mesh rotation={[-Math.PI/2, 0, 0]}>
                            <planeGeometry args={[10, 10, 10, 10]} />
                            <meshBasicMaterial color="#333" wireframe />
                        </mesh>
                    )}
                </Stage>

                <Grid position={[0, -1, 0]} args={[50, 50]} cellColor="#333" sectionColor={color} />
            </Canvas>
        </div>
    );
};