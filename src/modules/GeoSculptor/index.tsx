import React, { useState, useEffect, useRef } from 'react';
import { Mountain, RotateCcw, Building2, Globe, Loader2, Search, MapPin, ScanLine } from 'lucide-react';
import * as THREE from 'three';
import { STLExporter } from 'three-stdlib';

import { ModuleLayout } from '../../components/layout/ModuleLayout';
import { CyberSlider } from '../../components/ui/CyberSlider';
import { PaymentModal } from '../../components/PaymentModal';
import { usePayment } from '../../hooks/usePayment';
import { GeoView } from './GeoView';
import { MapSelector, MapSelectorRef } from './MapSelector'; // Import the ref type
import { fetchTerrainGeometry, fetchBuildingsGeometry } from '../../utils/geoEngine';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// --- SIDEBAR SEARCH COMPONENT ---
const SidebarSearch = ({ onSelect }: { onSelect: (lat: number, lon: number) => void }) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length < 3) { setResults([]); return; }
            setIsLoading(true);
            try {
                const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&types=place,locality,neighborhood,poi&limit=5`;
                const res = await fetch(endpoint);
                const data = await res.json();
                setResults(data.features || []);
                setIsOpen(true);
            } catch (e) { console.error(e); } finally { setIsLoading(false); }
        }, 500);
        return () => clearTimeout(timer);
    }, [query]);

    const handleSelect = (feature: any) => {
        const [lon, lat] = feature.center;
        setQuery(feature.text);
        setIsOpen(false);
        onSelect(lat, lon);
    };

    return (
        <div className="relative w-full z-50">
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {isLoading ? <Loader2 size={12} className="text-cyan-400 animate-spin" /> : <Search size={12} className="text-zinc-500" />}
                </div>
                <input 
                    type="text" 
                    className="block w-full pl-8 pr-3 py-2 text-[10px] font-mono bg-black/40 border border-zinc-700 text-zinc-200 rounded-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 placeholder-zinc-600 uppercase tracking-wide transition-all"
                    placeholder="Search Location..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsOpen(true)}
                />
            </div>
            {isOpen && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-sm shadow-xl max-h-48 overflow-y-auto z-50">
                    {results.map((place) => (
                        <button key={place.id} onClick={() => handleSelect(place)} className="w-full text-left px-3 py-2 text-[10px] text-zinc-400 hover:bg-cyan-900/30 hover:text-cyan-200 border-b border-white/5 last:border-0 flex items-center gap-2 transition-colors">
                            <MapPin size={10} /> <span className="truncate">{place.place_name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default function GeoSculptorModule() {
  const { showModal, clientSecret, startCheckout, closeModal } = usePayment('geo-sculptor-basic');
  const mapRef = useRef<MapSelectorRef>(null);

  // --- STATE ---
  const [mode, setMode] = useState<'SELECT' | 'VIEW'>('SELECT');
  const [modelData, setModelData] = useState<{ buildings: THREE.BufferGeometry | null, base: THREE.BufferGeometry } | null>(null);
  const [status, setStatus] = useState<string>(""); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [coords, setCoords] = useState<{lat: number, lon: number, zoom: number, radius: number} | null>(null);
  const [isCityMode, setIsCityMode] = useState(true); 
  const [exaggeration, setExaggeration] = useState(1.0); 

  // --- LOGIC ---
  
  // 1. Triggered by the "Capture Area" button in sidebar
  const triggerCapture = () => {
      if (mapRef.current) {
          const selection = mapRef.current.getSelection();
          handleMapConfirm(selection);
      }
  };

  // 2. Main Generation Handler
  const handleMapConfirm = async (selectedCoords: { lat: number, lon: number, zoom: number, radius: number }) => {
      setCoords(selectedCoords);
      setMode('VIEW');
      generateModel(selectedCoords, isCityMode, exaggeration);
  };

  // 3. Generation Logic
  const generateModel = async (
      c: {lat:number, lon:number, radius: number}, 
      cityMode: boolean, 
      exagg: number
  ) => {
      setIsProcessing(true);
      setModelData(null); 
      setStatus("Initializing...");

      try {
          let result;
          if (cityMode) {
             result = await fetchBuildingsGeometry(c.lat, c.lon, c.radius, setStatus);
          } else {
             setStatus("Fetching Terrain Map...");
             result = await fetchTerrainGeometry(c.lat, c.lon, 12, exagg);
          }
          setModelData(result);
      } catch(e: any) {
          console.error(e);
          alert(`Error: ${e.message}`);
          setMode('SELECT');
      } finally {
          setIsProcessing(false);
          setStatus("");
      }
  };

  // 4. Re-generate on Slider Change
  useEffect(() => {
     if (mode === 'VIEW' && coords) {
         const timer = setTimeout(() => generateModel(coords, isCityMode, exaggeration), 500);
         return () => clearTimeout(timer);
     }
  }, [exaggeration, isCityMode]); 

  // 5. Download Logic
  const handleDownload = () => {
    if (!modelData) return;
    const group = new THREE.Group();
    if (modelData.base) group.add(new THREE.Mesh(modelData.base));
    if (modelData.buildings) group.add(new THREE.Mesh(modelData.buildings));
    
    const exporter = new STLExporter();
    const result = exporter.parse(group);
    const blob = new Blob([result], { type: 'application/octet-stream' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `geo_export.stl`; 
    link.click();
    closeModal();
  };

  return (
    <>
      <ModuleLayout
        title="Terra-Former"
        subtitle="Topographic Generator"
        color="cyan"
        canExport={!!modelData && mode === 'VIEW'}
        onExport={startCheckout}
        sidebar={
          <div className="space-y-6">
            
            {/* --- BACK BUTTON (VIEW MODE) --- */}
            {mode === 'VIEW' && (
                <button 
                    onClick={() => setMode('SELECT')}
                    className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 rounded-sm text-xs font-bold uppercase tracking-wider transition-all mb-4"
                >
                    <RotateCcw size={14} /> Select New Area
                </button>
            )}

            <div className="h-px bg-zinc-800 my-4"></div>

            {/* --- RENDER MODE SELECTOR --- */}
            <div className={`space-y-2 ${mode === 'SELECT' ? '' : 'opacity-50 pointer-events-none'}`}>
                <label className="text-[9px] font-bold text-zinc-500 uppercase flex items-center gap-2">
                    <Globe size={10} className="text-cyan-500"/> Render Mode
                </label>
                <div className="flex gap-2">
                    <button onClick={() => setIsCityMode(false)} className={`flex-1 py-3 text-[9px] font-bold uppercase border rounded-sm transition-all ${!isCityMode ? 'bg-cyan-950/40 border-cyan-500 text-cyan-100' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}>
                        <Mountain size={16} className="mx-auto mb-1" /> Terrain
                    </button>
                    <button onClick={() => setIsCityMode(true)} className={`flex-1 py-3 text-[9px] font-bold uppercase border rounded-sm transition-all ${isCityMode ? 'bg-cyan-950/40 border-cyan-500 text-cyan-100' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}>
                        <Building2 size={16} className="mx-auto mb-1" /> City Block
                    </button>
                </div>
            </div>

            {/* --- SEARCH & CAPTURE (ONLY IN SELECT MODE) --- */}
            {mode === 'SELECT' && (
                <div className="space-y-4 pt-4 border-t border-zinc-800">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase flex items-center gap-2">
                        <Search size={10} className="text-cyan-500"/> Search Target
                    </label>
                    
                    {/* 1. Search Bar */}
                    <SidebarSearch onSelect={(lat, lon) => mapRef.current?.flyTo(lat, lon)} />
                    
                    {/* 2. Capture Button */}
                    <button 
                        onClick={triggerCapture}
                        className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white py-3 rounded-sm text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(8,145,178,0.4)] transition-all active:scale-95 hover:scale-[1.02]"
                    >
                        <ScanLine size={16} /> Capture Area
                    </button>
                </div>
            )}

            {/* --- SLIDERS (VIEW MODE ONLY) --- */}
            <div className={`mt-6 ${mode === 'SELECT' ? 'hidden' : 'block'}`}>
                <CyberSlider 
                  label="Vertical Scale" 
                  icon={isCityMode ? Building2 : Mountain} 
                  value={exaggeration} 
                  onChange={setExaggeration} 
                  min={0.5} max={3} step={0.1} unit="x" color="cyan"
                  tooltip="Adjusts vertical height."
                />
            </div>

            {/* STATUS DISPLAY */}
            {isProcessing && (
                <div className="p-4 bg-cyan-950/30 border border-cyan-500/30 rounded-sm mt-8 flex flex-col items-center justify-center animate-pulse">
                    <Loader2 size={24} className="text-cyan-400 animate-spin mb-2" />
                    <span className="text-[10px] font-mono uppercase text-cyan-200 tracking-widest">{status}</span>
                </div>
            )}
          </div>
        }
      >
        {mode === 'SELECT' ? (
            // Pass the REF here so the sidebar can control it
            <MapSelector ref={mapRef} />
        ) : (
            <GeoView 
                modelData={modelData}
                color="#22d3ee"
                isProcessing={isProcessing}
            />
        )}
      </ModuleLayout>

      {showModal && (
        <PaymentModal clientSecret={clientSecret} onClose={closeModal} onSuccess={handleDownload} color="cyan" price="$2.50" />
      )}
    </>
  );
}