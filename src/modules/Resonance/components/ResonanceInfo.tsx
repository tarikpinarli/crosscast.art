import React, { useState } from 'react';
import { 
    Cpu, 
    Download, 
    Mic, 
    ChevronDown, 
    Info, 
    Printer, 
    Box, 
    Zap, 
    Globe, 
    ShieldCheck 
} from 'lucide-react';

export const ResonanceInfo = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="w-full bg-zinc-950/80 backdrop-blur-sm border-t border-zinc-800 relative z-10">
            
            {/* 1. TOGGLE HEADER */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-zinc-900/60 transition-all duration-300 group cursor-pointer border-b border-transparent hover:border-zinc-800"
                aria-expanded={isOpen}
                aria-label="Toggle Resonance Engine Details"
            >
                <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-full transition-all duration-300 ${isOpen ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-900 text-zinc-400 group-hover:text-purple-300'}`}>
                        <Info size={20} />
                    </div>
                    <div className="text-left">
                        <h2 className="text-sm font-bold text-zinc-200 group-hover:text-white uppercase tracking-widest flex items-center gap-2">
                            About Resonance Engine
                            {/* Optional Badge */}
                            <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                v1.0
                            </span>
                        </h2>
                        <p className="text-xs text-zinc-500 group-hover:text-zinc-400 font-medium">
                            Technical Documentation & Use Cases
                        </p>
                    </div>
                </div>
                
                {/* Animated Chevron */}
                <div className={`transition-transform duration-500 ease-out ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
                    <ChevronDown size={20} className="text-zinc-500 group-hover:text-white" />
                </div>
            </button>

            {/* 2. EXPANDABLE CONTENT */}
            <div className={`overflow-hidden transition-all duration-700 ease-in-out ${isOpen ? 'max-h-[1600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <article className="max-w-6xl mx-auto px-6 py-12 text-zinc-400">
                    
                    {/* Hero Section */}
                    <div className="mb-14 border-b border-zinc-800/50 pb-10">
                        <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-500 mb-6 tracking-tight">
                            Audio to 3D Geometry Generator
                        </h1>
                        <p className="text-base md:text-lg leading-relaxed max-w-3xl mb-6 text-zinc-300">
                            The <strong>Resonance Engine</strong> is a browser-based synthesis tool that transmutes audio frequencies into watertight 3D topography. 
                            Leveraging WebGL and local processing, it allows you to visualize soundscapes and export them as efficient
                            <span className="text-purple-400 font-bold"> .GLB</span> binaries.
                        </p>
                        
                        {/* Quick Feature Badges */}
                        <div className="flex flex-wrap gap-3">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
                                <ShieldCheck size={12} className="text-emerald-500" /> Local Privacy
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
                                <Zap size={12} className="text-amber-500" /> Real-time FFT
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
                                <Globe size={12} className="text-blue-500" /> WebAR Ready
                            </span>
                        </div>
                    </div>

                    {/* Main Grid */}
                    <div className="grid md:grid-cols-2 gap-16 mb-16">
                        
                        {/* Column 1: Workflow */}
                        <section className="space-y-8">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2 uppercase tracking-wider text-sm">
                                <Cpu size={16} className="text-purple-500" />
                                Processing Workflow
                            </h3>
                            
                            <div className="relative border-l border-zinc-800 pl-8 space-y-10">
                                {/* Step 1 */}
                                <div className="relative">
                                    <span className="absolute -left-[39px] top-0 bg-zinc-950 border border-zinc-800 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold text-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.2)]">1</span>
                                    <h4 className="text-white font-medium mb-1">Signal Input</h4>
                                    <p className="text-sm text-zinc-500">
                                        Upload an MP3/WAV or record directly via microphone. The engine captures the raw audio buffer for analysis.
                                    </p>
                                </div>
                                {/* Step 2 */}
                                <div className="relative">
                                    <span className="absolute -left-[39px] top-0 bg-zinc-950 border border-zinc-800 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold text-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.2)]">2</span>
                                    <h4 className="text-white font-medium mb-1">Spectral Analysis</h4>
                                    <p className="text-sm text-zinc-500">
                                        Fast Fourier Transform (FFT) breaks audio into frequency bands (Bass, Mids, Treble), mapping amplitude to vertex displacement.
                                    </p>
                                </div>
                                {/* Step 3 */}
                                <div className="relative">
                                    <span className="absolute -left-[39px] top-0 bg-zinc-950 border border-zinc-800 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold text-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.2)]">3</span>
                                    <h4 className="text-white font-medium mb-1">Binary Export</h4>
                                    <p className="text-sm text-zinc-500">
                                        The mesh is serialized into a standard <strong>.GLB</strong> container, preserving geometry and materials in a single file.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Column 2: Applications */}
                        <section className="space-y-8">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2 uppercase tracking-wider text-sm">
                                <Box size={16} className="text-purple-500" />
                                Applications
                            </h3>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="group bg-zinc-900/30 hover:bg-zinc-900/60 p-4 rounded-lg border border-white/5 hover:border-purple-500/30 transition-all duration-300">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-1.5 bg-zinc-800 rounded text-purple-400 group-hover:text-purple-300 group-hover:bg-purple-500/10 transition-colors">
                                            <Printer size={16} />
                                        </div>
                                        <strong className="text-zinc-200 text-sm">3D Printing (Slicers)</strong>
                                    </div>
                                    <p className="text-xs text-zinc-500">
                                        Modern slicers (Bambu Studio, Cura, Prusa) accept .GLB directly. Create sound-wave jewelry or topographic art.
                                    </p>
                                </div>
                                
                                <div className="group bg-zinc-900/30 hover:bg-zinc-900/60 p-4 rounded-lg border border-white/5 hover:border-purple-500/30 transition-all duration-300">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-1.5 bg-zinc-800 rounded text-purple-400 group-hover:text-purple-300 group-hover:bg-purple-500/10 transition-colors">
                                            <Globe size={16} />
                                        </div>
                                        <strong className="text-zinc-200 text-sm">Web & AR Integration</strong>
                                    </div>
                                    <p className="text-xs text-zinc-500">
                                        The GLB format is the "JPEG of 3D." Drop your generated model directly into Three.js, React-Three-Fiber, or WebAR scenes.
                                    </p>
                                </div>

                                <div className="group bg-zinc-900/30 hover:bg-zinc-900/60 p-4 rounded-lg border border-white/5 hover:border-purple-500/30 transition-all duration-300">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-1.5 bg-zinc-800 rounded text-purple-400 group-hover:text-purple-300 group-hover:bg-purple-500/10 transition-colors">
                                            <Box size={16} />
                                        </div>
                                        <strong className="text-zinc-200 text-sm">Game Assets</strong>
                                    </div>
                                    <p className="text-xs text-zinc-500">
                                        Use as generative terrain heightmaps or alien landscapes in Unity, Unreal Engine, or Blender.
                                    </p>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Footer / Specs */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-[11px] text-zinc-500 border-t border-zinc-800/50 pt-8 uppercase tracking-widest">
                        <div>
                            <strong className="text-zinc-400 block mb-1">Output Format</strong>
                            Binary glTF (.glb)
                        </div>
                        <div>
                            <strong className="text-zinc-400 block mb-1">Architecture</strong>
                            React / Three Fiber
                        </div>
                        <div>
                            <strong className="text-zinc-400 block mb-1">Audio Engine</strong>
                            WebAudio API
                        </div>
                        <div>
                            <strong className="text-zinc-400 block mb-1">License</strong>
                            Free for Personal Use
                        </div>
                    </div>

                </article>
            </div>
        </div>
    );
};