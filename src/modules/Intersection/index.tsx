import React, { useState, useEffect, useCallback } from 'react';
import { Upload, Zap, Ruler, Grid as GridIcon, Activity, Sliders, CheckCircle2 } from 'lucide-react'; 
import { Viewer3D } from './Viewer3D';
import { createMask, getAlignedImageData, generateVoxelGeometry } from '../../utils/intersection/voxelEngine'; // Removed exportToSTL
import * as THREE from 'three';
import { GLTFExporter } from 'three-stdlib'; // <--- NEW IMPORT

import { ModuleLayout } from '../../components/layout/ModuleLayout';
import { CyberSlider } from '../../components/ui/CyberSlider';
import { PaymentModal } from '../../components/PaymentModal';
import { usePayment } from '../../hooks/usePayment';

export default function IntersectionModule() {
  // 1. Logic Hook
  const { showModal, clientSecret, startCheckout, closeModal } = usePayment('intersection-basic');

  // 2. State
  const [imgA, setImgA] = useState<string | null>(null);
  const [imgB, setImgB] = useState<string | null>(null);
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // --- Session Access State ---
  const [hasAccess, setHasAccess] = useState(false);

  // 3. Parameters
  const [artisticMode, setArtisticMode] = useState(false);
  const [smoothingIterations, setSmoothingIterations] = useState(3);
  const [threshold, setThreshold] = useState(128);
  const [physicalHeight, setPhysicalHeight] = useState(10); 
  const [gridSize, setGridSize] = useState(100); 
  const [lightDistance, setLightDistance] = useState(100); 

  // --- Logic (Kept Same) ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setImg: (s: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => setImg(evt.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const processGeometry = useCallback(async () => {
    if (!imgA && !imgB) return;
    setIsProcessing(true);
    await new Promise(r => setTimeout(r, 100));
    try {
      const [dataA, dataB] = await getAlignedImageData(imgA, imgB, gridSize);
      const maskA = dataA ? createMask(dataA, gridSize, threshold) : null;
      const maskB = dataB ? createMask(dataB, gridSize, threshold) : null;
      const geom = generateVoxelGeometry(maskA, maskB, artisticMode, smoothingIterations, physicalHeight, gridSize, lightDistance);
      setGeometry(geom);
    } catch (e) { console.error(e); } finally { setIsProcessing(false); }
  }, [imgA, imgB, artisticMode, smoothingIterations, threshold, physicalHeight, gridSize, lightDistance]); 

  useEffect(() => {
    const timer = setTimeout(() => { if(imgA || imgB) processGeometry(); }, 800);
    return () => clearTimeout(timer);
  }, [imgA, imgB, artisticMode, smoothingIterations, threshold, physicalHeight, gridSize, lightDistance, processGeometry]);

  // --- UPDATED: GLB Export Logic ---
  const performDownload = () => {
    if (!geometry) return;

    // 1. Create a mesh for export (GLTF requires a Mesh, not just Geometry)
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x22d3ee, // Default Cyan color for the shadow caster
        roughness: 0.5,
        metalness: 0.1
    });
    const mesh = new THREE.Mesh(geometry, material);

    // 2. Export to GLB
    const exporter = new GLTFExporter();
    exporter.parse(
        mesh,
        (gltf) => {
            const blob = new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url; 
            link.download = `shadow-sculpture-${Date.now()}.glb`; 
            link.click();
            URL.revokeObjectURL(url);
        },
        (err) => console.error("Export Failed", err),
        { binary: true }
    );
  };

  // --- The Gatekeeper Function ---
  const handleExportRequest = () => {
    if (!geometry) return;

    if (hasAccess) {
        performDownload();
    } else {
        startCheckout();
    }
  };

  // --- Success Handler ---
  const handlePaymentSuccess = () => {
    setHasAccess(true); // Unlock session
    performDownload();  // Download the file
    closeModal();       // Close modal
  };

  return (
    <>
      <ModuleLayout
        title="Shadow Sculptor"
        subtitle={hasAccess ? "UNLOCKED // SESSION ACTIVE" : "Intersection Engine v1.0"}
        color={hasAccess ? "emerald" : "cyan"} 
        canExport={!!geometry}
        onExport={handleExportRequest} 
        sidebar={
          <div className="space-y-6">
            
            {/* --- Session Status Indicator --- */}
            {hasAccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/50 p-3 rounded flex items-center gap-3 animate-in fade-in">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <div>
                        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Session Unlocked</p>
                        <p className="text-[9px] text-zinc-500 uppercase">Downloads are free until refresh</p>
                    </div>
                </div>
            )}

            {/* Uploads */}
            <div className="grid grid-cols-2 gap-3">
               <label className={`h-28 border cursor-pointer flex flex-col items-center justify-center overflow-hidden transition-all ${imgA ? 'border-cyan-400 bg-zinc-900/40' : 'border-cyan-500/30 bg-cyan-950/10 hover:bg-cyan-900/20'}`}>
                   <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, setImgA)} className="hidden" />
                   {imgA ? <img src={imgA} className="h-full w-full object-contain p-2 opacity-80" /> : <div className="text-center"><Upload className="text-cyan-500/50 mx-auto mb-1"/><span className="text-[9px] uppercase text-zinc-500 font-bold">Front View</span></div>}
               </label>
               <label className={`h-28 border cursor-pointer flex flex-col items-center justify-center overflow-hidden transition-all ${imgB ? 'border-cyan-400 bg-zinc-900/40' : 'border-cyan-500/30 bg-cyan-950/10 hover:bg-cyan-900/20'}`}>
                   <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, setImgB)} className="hidden" />
                   {imgB ? <img src={imgB} className="h-full w-full object-contain p-2 opacity-80" /> : <div className="text-center"><Upload className="text-cyan-500/50 mx-auto mb-1"/><span className="text-[9px] uppercase text-zinc-500 font-bold">Side View</span></div>}
               </label>
            </div>

            {/* --- SLIDERS --- */}
            
            <CyberSlider 
                label="Light Distance" icon={Zap} value={lightDistance} onChange={setLightDistance} min={30} max={160} step={5} unit="cm" 
                color="cyan"
                tooltip="Distance from your light source to the sculpture. Affects how the shadow perspective distorts." 
            />

            <CyberSlider 
                label="Resolution" icon={GridIcon} value={gridSize} onChange={setGridSize} min={50} max={400} step={10} unit="px" 
                color="cyan"
                tooltip="Voxel grid density. Higher values (150+) are smoother but require more processing power." 
            />

            <CyberSlider 
                label="Height" icon={Ruler} value={physicalHeight} onChange={setPhysicalHeight} min={5} max={40} unit="cm" 
                color="cyan"
                tooltip="Target physical height for 3D printing. The sculpture will be scaled to this size." 
            />

            <CyberSlider 
                label="Threshold" icon={Sliders} value={threshold} onChange={setThreshold} min={0} max={255} 
                color="cyan"
                tooltip="Silhouette contrast cutoff. Adjust if your image background is not perfectly white/transparent." 
            />

            <CyberSlider 
                label="Smoothness" icon={Activity} value={smoothingIterations} onChange={setSmoothingIterations} min={0} max={8} unit="x" 
                color="cyan"
                tooltip="Laplacian smoothing passes. Removes the 'staircase' effect from the voxels." 
            />

            <label className="flex items-center gap-3 cursor-pointer group border-t border-white/5 pt-4">
                <div className={`w-3 h-3 border border-zinc-600 ${artisticMode ? 'bg-cyan-500 border-cyan-500' : 'bg-transparent'}`}></div>
                <input type="checkbox" checked={artisticMode} onChange={(e) => setArtisticMode(e.target.checked)} className="hidden" />
                <span className="text-[10px] uppercase font-bold text-zinc-500 group-hover:text-white">Artistic Debris Mode</span>
            </label>
          </div>
        }
      >
        <Viewer3D geometry={geometry} showGrid={true} isSmooth={smoothingIterations > 0} lightDistanceCM={lightDistance} isProcessing={isProcessing}/>
      </ModuleLayout>

      {showModal && (
        <PaymentModal 
          clientSecret={clientSecret} 
          onClose={closeModal} 
          onSuccess={handlePaymentSuccess} 
          color="cyan"
          price="$0.99"
        />
      )}
      <div className="hidden border-cyan-500/20 border-t-cyan-500 bg-cyan-500/20 text-cyan-500/60"></div>
    </>
  );
}