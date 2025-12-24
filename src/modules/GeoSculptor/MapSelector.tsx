import React, { useRef, useState, useEffect } from 'react';
import Map, { NavigationControl, ScaleControl } from 'react-map-gl';
import { Search, MapPin, Loader2, ScanLine, ArrowRightLeft, ArrowUpDown, MousePointer2, Move3d, ZoomIn } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// --- GEOMETRY HELPER ---
const getDistanceKM = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

interface MapSelectorProps {
  onConfirm: (coords: { lat: number, lon: number, zoom: number, radius: number }) => void;
}

// --- SEARCH BAR ---
const SearchBar = ({ onSelect, mapRef }: { onSelect: (lat: number, lon: number) => void, mapRef: any }) => {
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
        mapRef.current?.flyTo({ center: [lon, lat], zoom: 16, speed: 1.2 });
    };

    return (
        <div className="absolute top-4 left-4 z-20 w-64">
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {isLoading ? <Loader2 size={14} className="text-cyan-400 animate-spin" /> : <Search size={14} className="text-zinc-500" />}
                </div>
                <input 
                    type="text" 
                    className="block w-full pl-9 pr-3 py-2.5 text-xs font-mono bg-black/80 backdrop-blur-md border border-zinc-700 text-zinc-200 rounded-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 placeholder-zinc-600 uppercase tracking-wide shadow-lg"
                    placeholder="Search Location..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsOpen(true)}
                />
            </div>
            {isOpen && results.length > 0 && (
                <div className="absolute mt-1 w-full bg-black/90 border border-zinc-700 rounded-sm shadow-xl max-h-60 overflow-y-auto backdrop-blur-md">
                    {results.map((place) => (
                        <button key={place.id} onClick={() => handleSelect(place)} className="w-full text-left px-3 py-2 text-[10px] text-zinc-400 hover:bg-cyan-900/30 hover:text-cyan-200 border-b border-white/5 flex items-center gap-2">
                            <MapPin size={10} /> <span className="truncate">{place.place_name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- MAIN COMPONENT ---
export const MapSelector = ({ onConfirm }: MapSelectorProps) => {
  const mapRef = useRef<any>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  
  // 1. MEMORY STATE: Initialize from LocalStorage if available
  const [viewState, setViewState] = useState(() => {
      const saved = localStorage.getItem('geo_sculptor_last_pos');
      if (saved) {
          try {
              return JSON.parse(saved);
          } catch (e) {
              // Ignore corruption
          }
      }
      // Fallback: New York
      return { longitude: -74.006, latitude: 40.7128, zoom: 16 };
  });

  const [boxDimensions, setBoxDimensions] = useState({ width: 0, height: 0 });

  // 2. AUTO-SAVE: Save position whenever it changes (Debounced 1s)
  useEffect(() => {
      const timer = setTimeout(() => {
          localStorage.setItem('geo_sculptor_last_pos', JSON.stringify(viewState));
      }, 1000);
      return () => clearTimeout(timer);
  }, [viewState]);

  const updateDimensions = () => {
      if (!mapRef.current || !boxRef.current) return;
      const map = mapRef.current.getMap();
      const box = boxRef.current.getBoundingClientRect();
      const mapRect = map.getCanvas().getBoundingClientRect();

      const left = box.left - mapRect.left;
      const right = box.right - mapRect.left;
      const top = box.top - mapRect.top;
      const bottom = box.bottom - mapRect.top;

      const topLeft = map.unproject([left, top]);
      const topRight = map.unproject([right, top]);
      const bottomLeft = map.unproject([left, bottom]);

      const widthMeters = getDistanceKM(topLeft.lat, topLeft.lng, topRight.lat, topRight.lng) * 1000;
      const heightMeters = getDistanceKM(topLeft.lat, topLeft.lng, bottomLeft.lat, bottomLeft.lng) * 1000;

      setBoxDimensions({ width: widthMeters, height: heightMeters });
  };

  useEffect(() => { updateDimensions(); }, [viewState]);

  const handleConfirm = () => {
      // Also Force-Save immediately on confirm
      localStorage.setItem('geo_sculptor_last_pos', JSON.stringify(viewState));

      const diagonal = Math.sqrt(Math.pow(boxDimensions.width, 2) + Math.pow(boxDimensions.height, 2));
      const radiusKM = (diagonal / 2) / 1000;

      onConfirm({
          lat: viewState.latitude,
          lon: viewState.longitude,
          zoom: viewState.zoom,
          radius: Math.max(0.1, Math.min(3, radiusKM))
      });
  };

  return (
    <div className="w-full h-full relative group bg-zinc-900 rounded-sm overflow-hidden border border-zinc-800 shadow-2xl flex flex-col">
      
      <SearchBar onSelect={(lat, lon) => setViewState(p => ({...p, latitude: lat, longitude: lon}))} mapRef={mapRef} />

      <div className="relative flex-1 w-full h-full overflow-hidden">
          <Map
            ref={mapRef}
            {...viewState}
            onMove={(evt) => setViewState(evt.viewState)}
            onLoad={updateDimensions}
            mapStyle="mapbox://styles/mapbox/dark-v11"
            mapboxAccessToken={MAPBOX_TOKEN}
            maxPitch={60}
            dragRotate={true}
          >
            <NavigationControl position="bottom-right" showCompass={true} />
            <ScaleControl position="bottom-left" />
          </Map>

          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div 
                  ref={boxRef}
                  className="w-64 h-64 border-2 border-cyan-400 bg-cyan-400/5 shadow-[0_0_100px_rgba(34,211,238,0.2)] relative"
              >
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-cyan-400" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-cyan-400" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-cyan-400" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-cyan-400" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4">
                      <div className="absolute top-1/2 left-0 w-full h-[1px] bg-cyan-400/50" />
                      <div className="absolute left-1/2 top-0 h-full w-[1px] bg-cyan-400/50" />
                  </div>
              </div>
          </div>

          {/* HUD CONTROLS */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-none select-none">
              <div className="bg-black/80 backdrop-blur border border-zinc-800 p-2 rounded-sm text-[9px] font-mono text-zinc-400 mb-2">
                  <div className="flex justify-between gap-4"><span>LAT:</span> <span className="text-cyan-500">{viewState.latitude.toFixed(4)}</span></div>
                  <div className="flex justify-between gap-4"><span>LON:</span> <span className="text-cyan-500">{viewState.longitude.toFixed(4)}</span></div>
              </div>

              <div className="bg-black/80 backdrop-blur border border-white/10 p-3 rounded-sm text-[9px] font-mono text-zinc-500 space-y-2 shadow-xl">
                 <div className="flex items-center gap-2">
                    <MousePointer2 size={12} className="text-cyan-500" />
                    <span>PAN: Left Drag</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <Move3d size={12} className="text-cyan-500" />
                    <span>ROTATE: Right Drag</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <ZoomIn size={12} className="text-cyan-500" />
                    <span>ZOOM: Scroll</span>
                 </div>
              </div>
          </div>

          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(6,182,212,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.05)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(circle_at_center,black,transparent_80%)]" />
      </div>

      <div className="h-16 bg-zinc-950 border-t border-white/10 flex items-center justify-between px-6 z-10 relative">
         <div className="flex gap-6 text-[10px] font-mono text-zinc-400">
             <div className="flex items-center gap-2">
                 <ArrowRightLeft size={12} className="text-cyan-500" />
                 <span className="text-zinc-500">WIDTH:</span>
                 <span className="text-cyan-200 text-base">{Math.round(boxDimensions.width)}m</span>
             </div>
             <div className="flex items-center gap-2">
                 <ArrowUpDown size={12} className="text-cyan-500" />
                 <span className="text-zinc-500">HEIGHT:</span>
                 <span className="text-cyan-200 text-base">{Math.round(boxDimensions.height)}m</span>
             </div>
         </div>
         <button 
            onClick={handleConfirm}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-sm text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(8,145,178,0.4)] transition-all hover:scale-105 active:scale-95"
         >
            <ScanLine size={16} /> Capture Area
         </button>
      </div>
    </div>
  );
};