import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stage, Grid, Text } from '@react-three/drei';

interface FrequencyViewProps {
    geometry: THREE.BufferGeometry | null;
    isRecording: boolean;
    color: string;
    isPlaying: boolean;
    playbackProgress: number; 
    trimStart: number;        
    trimEnd: number; 
    length: number; // <--- NEW PROP
}

interface LandscapeMeshProps {
    geometry: THREE.BufferGeometry;
    color: string;
    isPlaying: boolean;
    playbackProgress: number;
    trimStart: number;
    trimEnd: number;
    length: number; // <--- NEW PROP
}

const LandscapeMesh = ({ geometry, color, isPlaying, playbackProgress, trimStart, trimEnd, length }: LandscapeMeshProps) => {
    const materialRef = useRef<any>(null);

    // --- CUSTOM SHADER UNIFORMS ---
    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uPlayhead: { value: 0 },   
        uTrimStart: { value: 0 },  
        uTrimEnd: { value: 1 },    
        uIsPlaying: { value: 0 },
        uLength: { value: length }, // <--- Pass dynamic length here
        uScanColor: { value: new THREE.Color('#d946ef') }, 
        uBaseColor: { value: new THREE.Color(color) }
    }), [color]); // Remove length from dep array so we update it via refs instead of re-creating uniforms

    // Update uniforms every frame
    useFrame(({ clock }) => {
        if (materialRef.current && materialRef.current.uniforms) {
            const mat = materialRef.current;
            
            mat.uniforms.uTime.value = clock.getElapsedTime();
            
            // Interpolate playhead for smoothness
            mat.uniforms.uPlayhead.value = THREE.MathUtils.lerp(
                mat.uniforms.uPlayhead.value,
                playbackProgress,
                0.3
            );
            
            mat.uniforms.uIsPlaying.value = isPlaying ? 1 : 0;
            mat.uniforms.uTrimStart.value = trimStart;
            mat.uniforms.uTrimEnd.value = trimEnd;
            
            // DYNAMIC UPDATE: Sync shader length with Slider
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
            uniform float uLength; // <--- Define New Uniform
            uniform vec3 uScanColor;
            uniform vec3 uBaseColor;
            varying vec3 vPosition; 
        ` + shader.fragmentShader;

        shader.vertexShader = `
            varying vec3 vPosition;
        ` + shader.vertexShader;
        
        shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `
            #include <begin_vertex>
            vPosition = (modelMatrix * vec4(position, 1.0)).xyz; 
            `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <dithering_fragment>',
            `
            #include <dithering_fragment>
            
            if (uIsPlaying > 0.5) {
                // DYNAMIC NORMALIZATION LOGIC
                // 1. Center Offset: Half of the total length (e.g., if length is 30, offset is 15)
                float halfLength = uLength / 2.0;
                
                // 2. Normalize Z position based on dynamic length
                // (Z + 15) / 30 -> 0..1
                float normalizedZ = (vPosition.z + halfLength) / uLength;
                
                // Clamp to ensure we don't glitch at edges
                normalizedZ = clamp(normalizedZ, 0.0, 1.0);
                
                // Flip orientation (Audio starts at front, Time moves back)
                normalizedZ = 1.0 - normalizedZ; 

                // 3. Trim Logic
                float meshDuration = uTrimEnd - uTrimStart;
                float relativePlayhead = (uPlayhead - uTrimStart) / meshDuration;
                
                // 4. Scanline Calculation
                float dist = abs(normalizedZ - relativePlayhead);
                float scanline = smoothstep(0.025, 0.0, dist); // Sharp line

                vec3 finalScanColor = mix(gl_FragColor.rgb, uScanColor, scanline);
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
    length // <--- Accept Length Prop
}: FrequencyViewProps) => {
    return (
        <Canvas shadows camera={{ position: [15, 15, 15], fov: 45 }} dpr={[1, 2]}>
            <color attach="background" args={['#09090b']} />
            
            <Stage environment="city" intensity={0.6} adjustCamera={false}>
                {geometry ? (
                    <LandscapeMesh 
                        geometry={geometry} 
                        color={color}
                        isPlaying={isPlaying}
                        playbackProgress={playbackProgress}
                        trimStart={trimStart}
                        trimEnd={trimEnd}
                        length={length} // <--- Pass Length Down
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
            <OrbitControls autoRotate={false} />
        </Canvas>
    );
};