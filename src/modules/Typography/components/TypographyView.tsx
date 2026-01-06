import React, { useState } from 'react';
import * as THREE from 'three';
import { SceneWrapper } from '../../../components/3d/SceneWrapper';
import { ViewToolbar, ViewMode } from '../../../components/ui/ViewToolbar';

interface TypographyViewProps {
    geometry: THREE.BufferGeometry | null;
    isProcessing: boolean;
    status: string;
    // NEW PROPS
    materialParams: {
        color: string;
        roughness: number;
        metalness: number;
    };
}

export const TypographyView = ({ geometry, isProcessing, status, materialParams }: TypographyViewProps) => {
    const [viewTrigger, setViewTrigger] = useState<{ type: string, t: number } | null>(null);
    const [lightsOn, setLightsOn] = useState(true);

    const handleViewChange = (type: ViewMode) => {
        setViewTrigger({ type, t: Date.now() });
    };

    return (
        <div className="w-full h-full bg-black relative group rounded-sm overflow-hidden border border-white/10">
            
            <ViewToolbar 
                onViewChange={handleViewChange} 
                onToggleLight={() => setLightsOn(!lightsOn)} 
                lightsOn={lightsOn} 
            />

            {!geometry && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md pointer-events-none">
                    {isProcessing ? (
                        <div className="w-12 h-12 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    ) : (
                        <div className="w-12 h-12 border-2 border-red-500 rounded-full mb-4 opacity-50"></div>
                    )}
                    <span className="text-xs font-mono text-purple-400 uppercase tracking-widest">{status}</span>
                </div>
            )}

            <SceneWrapper 
                geometry={geometry} 
                viewTrigger={viewTrigger} 
                showRoom={lightsOn}
            >
                <ambientLight intensity={lightsOn ? 0.8 : 1} />
                {lightsOn && (
                    <>
                        <spotLight position={[50, 100, 50]} angle={0.5} penumbra={0.5} intensity={15000} castShadow />
                        <pointLight position={[-50, 50, -50]} intensity={15000} color="#a855f7" /> 
                    </>
                )}

                {geometry && (
                    <mesh 
                        geometry={geometry} 
                        castShadow 
                        receiveShadow 
                    >
                        {/* DYNAMIC MATERIAL */}
                        <meshStandardMaterial 
                            color={materialParams.color}
                            roughness={materialParams.roughness}
                            metalness={materialParams.metalness}
                        />
                    </mesh>
                )}
            </SceneWrapper>
        </div>
    );
};