import React, { useRef, useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, SpotLight } from '@react-three/drei';
import { Zap, ScanLine, UploadCloud } from 'lucide-react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

// --- NEW IMPORTS ---
import { SimulationRoom } from '../../components/3d/SimulationRoom';
import { SmartCamera } from '../../components/3d/SmartCamera';
import { ViewToolbar } from '../../components/ui/ViewToolbar';

interface Viewer3DProps {
  geometry: THREE.BufferGeometry | null;
  showGrid: boolean;
  isSmooth: boolean; 
  lightDistanceCM?: number;
  isProcessing: boolean;
}

// --- KEEPING MATERIAL & CONTENT LOCAL (To prevent changes) ---
const ArtisticMaterial = ({ isSmooth }: { isSmooth: boolean }) => {
  return (
    <meshStandardMaterial
      color="#f1f5f9"         
      flatShading={!isSmooth}     
      roughness={0.1}         
      metalness={0.5}
      side={THREE.DoubleSide} 
      shadowSide={THREE.DoubleSide} 
    />
  );
};

const SceneContent = ({ geometry, isSmooth, lightsOn, lightDistCM }: { geometry: THREE.BufferGeometry, isSmooth: boolean, lightsOn: boolean, lightDistCM: number }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const centerHeight = useMemo(() => {
        if (!geometry) return 0;
        geometry.computeBoundingBox();
        const box = geometry.boundingBox;
        if (!box) return 0;
        return (box.max.y + box.min.y) / 2;
    }, [geometry]);

    const baseIntensity = 3500000; 
    const intensityMultiplier = Math.max(1, lightDistCM / 40); 
    const spotIntensity = baseIntensity * intensityMultiplier;
    const unitScale = 20; 
    const lightDist = lightDistCM * unitScale;
    const effectiveRange = lightDist + 8000; 

    return (
        <>
            {/* Reusable Room Component */}
            {lightsOn && <SimulationRoom />}
            
            <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow position={[0, 0, 0]}>
                <ArtisticMaterial isSmooth={isSmooth} />
            </mesh>
            <ambientLight intensity={lightsOn ? 0.4 : 0.8} />
            <hemisphereLight intensity={lightsOn ? 0.2 : 0.4} groundColor="#111111" color="#ffffff" />
            {lightsOn && (
                <>
                    <SpotLight position={[0, centerHeight, lightDist]} angle={0.5} penumbra={0.1} intensity={spotIntensity} castShadow distance={effectiveRange} shadow-camera-far={effectiveRange} shadow-mapSize={[4096, 4096]} shadow-bias={-0.00005} target-position={[0, centerHeight, 0]} color="#ffffff" decay={2} />
                    <SpotLight position={[lightDist, centerHeight, 0]} angle={0.5} penumbra={0.1} intensity={spotIntensity} castShadow distance={effectiveRange} shadow-camera-far={effectiveRange} shadow-mapSize={[4096, 4096]} shadow-bias={-0.00005} target-position={[0, centerHeight, 0]} color="#fcd34d" decay={2} />
                </>
            )}
        </>
    );
};

export const Viewer3D: React.FC<Viewer3DProps> = ({ geometry, showGrid, isSmooth, lightDistanceCM = 100, isProcessing }) => {
  const [viewTrigger, setViewTrigger] = useState<{ type: string, t: number } | null>(null);
  const [lightsOn, setLightsOn] = useState(true); 
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  const handleViewChange = (type: string) => setViewTrigger({ type, t: Date.now() });
  const handleReset = () => setViewTrigger({ type: 'iso', t: Date.now() });

  return (
    <div className="w-full h-full bg-black rounded-sm overflow-hidden shadow-2xl border border-white/10 relative group">
      
      {/* LOADING OVERLAY (Unchanged) */}
      {!geometry && (
        <div className="absolute inset-0 flex flex-col gap-4 items-center justify-center z-10 pointer-events-none bg-black/40 backdrop-blur-sm">
          {isProcessing ? (
             <>
               <div className="w-16 h-16 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin shadow-[0_0_30px_rgba(34,211,238,0.2)]"></div>
               <div className="flex flex-col items-center">
                   <p className="text-xs font-mono tracking-[0.3em] uppercase text-cyan-400 animate-pulse">Computing Matrix...</p>
                   <p className="text-[9px] text-cyan-500/50 uppercase mt-1">Voxelizing Intersections</p>
               </div>
             </>
          ) : (
             <>
               <div className="relative">
                  <div className="absolute inset-0 bg-zinc-500/20 blur-xl rounded-full"></div>
                  <UploadCloud size={48} strokeWidth={1} className="text-zinc-600 relative z-10" />
               </div>
               <div className="flex flex-col items-center gap-1">
                   <p className="text-sm font-bold tracking-[0.2em] uppercase text-zinc-500">System Standby</p>
                   <p className="text-[10px] text-zinc-700 uppercase tracking-widest">Upload Silhouettes to Initialize</p>
               </div>
             </>
          )}
        </div>
      )}
      
      {/* REUSABLE UI COMPONENT */}
      <ViewToolbar 
        onViewChange={handleViewChange}
        onToggleLight={() => setLightsOn(!lightsOn)}
        lightsOn={lightsOn}
      />

      <Canvas shadows dpr={[1, 2]} gl={{ preserveDrawingBuffer: true }}>
        <PerspectiveCamera makeDefault position={[800, 500, 800]} fov={50} near={0.1} far={15000} />
        <OrbitControls makeDefault ref={controlsRef} autoRotate={false} enableDamping={true} dampingFactor={0.05} maxPolarAngle={Math.PI / 1.5} maxDistance={8000} />
        
        {/* REUSABLE CAMERA LOGIC */}
        <SmartCamera viewTrigger={viewTrigger} controlsRef={controlsRef} geometry={geometry} />
        
        {geometry && <SceneContent geometry={geometry} isSmooth={isSmooth} lightsOn={lightsOn} lightDistCM={lightDistanceCM} />}
        <fog attach="fog" args={['#000000', 4000, 15000]} /> 
      </Canvas>

      {/* BOTTOM OVERLAY (Unchanged) */}
      {geometry && lightsOn && (
        <div className="absolute bottom-4 left-4 z-20 pointer-events-none opacity-80">
           <div className="flex flex-col gap-1 text-[9px] font-mono text-cyan-400/80 uppercase tracking-wider">
             <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-2 border-l-2 border-cyan-500 rounded-r-sm shadow-[0_0_20px_rgba(0,0,0,0.5)]">
               <Zap size={10} className="text-yellow-400" />
               <span>Light Distance: <span className="text-white font-bold">{lightDistanceCM}cm</span></span>
             </div>
             <div className="pl-3 flex items-center gap-1 text-zinc-500">
               <ScanLine size={10} />
               <span>Shadow Projection Active</span>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};