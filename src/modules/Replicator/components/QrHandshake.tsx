import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Wifi } from 'lucide-react';

interface QrHandshakeProps {
  sessionId: string;
}

export const QrHandshake = ({ sessionId }: QrHandshakeProps) => {
  // 1. DYNAMIC URL GENERATION
  // This calculates the real website URL (e.g., https://crosscast.art) 
  // instead of using the hardcoded IP address.
  const [connectionUrl, setConnectionUrl] = useState("");

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // "origin" will be 'https://crosscast.art' when live
      const origin = window.location.origin;
      // We point to the main page with a session parameter
      setConnectionUrl(`${origin}/replicator?session=${sessionId}`);
    }
  }, [sessionId]);

  return (
    <div className="flex flex-col items-center justify-center p-12 border border-zinc-800 bg-zinc-900/50 rounded-[3rem] relative overflow-hidden group">
      {/* Scanning Laser Effect */}
      <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500 shadow-[0_0_20px_rgba(34,211,238,0.8)] animate-[scan_3s_ease-in-out_infinite] opacity-50 pointer-events-none"></div>

      <div className="relative z-10 bg-white p-4 rounded-xl mb-8 shadow-2xl shadow-cyan-500/20 group-hover:scale-105 transition-transform duration-500">
        {connectionUrl && (
            <QRCodeSVG 
            value={connectionUrl} 
            size={200} 
            level="H" 
            includeMargin={true}
            />
        )}
        
        {/* Decorative corner markers */}
        <div className="absolute -top-2 -left-2 w-6 h-6 border-t-4 border-l-4 border-cyan-500 rounded-tl-lg"></div>
        <div className="absolute -top-2 -right-2 w-6 h-6 border-t-4 border-r-4 border-cyan-500 rounded-tr-lg"></div>
        <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-4 border-l-4 border-cyan-500 rounded-bl-lg"></div>
        <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-4 border-r-4 border-cyan-500 rounded-br-lg"></div>
      </div>

      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-cyan-500 font-black uppercase tracking-widest text-xs animate-pulse">
            <Wifi size={14} />
            <span>Awaiting Uplink</span>
        </div>
        <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">
            Scan to Pair Sensor
        </h3>
        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest max-w-xs mx-auto">
            {connectionUrl || "Generating Secure Link..."}
        </p>
      </div>
    </div>
  );
};