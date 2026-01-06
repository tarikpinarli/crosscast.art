import React, { useState } from 'react';
import { Palette, ChevronDown, ChevronUp, Sparkles, Gem } from 'lucide-react';
import { CyberSlider } from '../../../components/ui/CyberSlider';

interface MaterialLabProps {
    materialParams: {
        color: string;
        roughness: number;
        metalness: number;
    };
    setMaterialParams: React.Dispatch<React.SetStateAction<{
        color: string;
        roughness: number;
        metalness: number;
    }>>;
}

export const MaterialLab = ({ materialParams, setMaterialParams }: MaterialLabProps) => {
    const [isOpen, setIsOpen] = useState(false);

    // Organized Color Palettes
    const PALETTES = {
        warm: ['#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'],
        orange: ['#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12'],
        yellow: ['#fefce8', '#fef9c3', '#fef08a', '#fde047', '#facc15', '#eab308', '#ca8a04', '#a16207', '#854d0e', '#713f12'],
        green: ['#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'],
        cyan: ['#ecfeff', '#cffafe', '#a5f3fc', '#67e8f9', '#22d3ee', '#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63'],
        blue: ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'],
        indigo: ['#eef2ff', '#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81'],
        violet: ['#f5f3ff', '#ede9fe', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95'],
        pink: ['#fdf2f8', '#fce7f3', '#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843'],
    };

    const renderSwatchGroup = (colors: string[]) => (
        <div className="grid grid-cols-6 gap-1">
            {colors.slice(2, 8).map(c => (
                <button
                    key={c}
                    onClick={() => setMaterialParams(prev => ({ ...prev, color: c }))}
                    className={`w-full aspect-square rounded-sm transition-all relative ${
                        materialParams.color === c 
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-black z-10 scale-105' 
                        : 'hover:scale-105 hover:brightness-110 border border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                    title={c}
                />
            ))}
        </div>
    );

    return (
        <div className="space-y-2">
            {/* HEADER / TOGGLE */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded px-3 py-3 hover:border-purple-500/50 transition-all group"
            >
                <div className="flex items-center gap-2">
                    <Palette size={12} className="text-zinc-500 group-hover:text-purple-400" />
                    <span className="text-[9px] font-bold text-zinc-500 group-hover:text-white uppercase tracking-widest">Material Lab</span>
                </div>
                
                <div className="flex items-center gap-2">
                    {/* Tiny preview of active color when closed */}
                    {!isOpen && (
                        <div 
                            className="w-3 h-3 rounded-full border border-white/20" 
                            style={{ backgroundColor: materialParams.color }}
                        />
                    )}
                    {isOpen ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
                </div>
            </button>

            {/* EXPANDABLE BODY */}
            {isOpen && (
                <div className="bg-zinc-900/30 border border-zinc-800/50 rounded p-3 space-y-4 animate-in slide-in-from-top-2 fade-in duration-200">
                    
                    {/* 1. COLOR PALETTES */}
                    <div className="space-y-2">
                        <label className="text-[8px] font-bold text-zinc-600 uppercase">Base Color</label>
                        
                        {/* Monochrome */}
                        <div className="grid grid-cols-6 gap-1 mb-2 pb-2 border-b border-zinc-800">
                             {['#ffffff', '#d4d4d8', '#a1a1aa', '#52525b', '#27272a', '#000000'].map(c => (
                                <button
                                    key={c}
                                    onClick={() => setMaterialParams(prev => ({ ...prev, color: c }))}
                                    className={`w-full aspect-square rounded-full border border-zinc-700 transition-all ${
                                        materialParams.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-105' : 'hover:scale-105'
                                    }`}
                                    style={{ backgroundColor: c }}
                                />
                             ))}
                        </div>
                        
                        {/* Spectrum */}
                        <div className="space-y-1">
                            {renderSwatchGroup(PALETTES.warm)}
                            {renderSwatchGroup(PALETTES.orange)}
                            {renderSwatchGroup(PALETTES.yellow)}
                            {renderSwatchGroup(PALETTES.green)}
                            {renderSwatchGroup(PALETTES.cyan)}
                            {renderSwatchGroup(PALETTES.blue)}
                            {renderSwatchGroup(PALETTES.indigo)}
                            {renderSwatchGroup(PALETTES.pink)}
                        </div>
                    </div>

                    {/* 2. SLIDERS */}
                    <div className="space-y-2 pt-2 border-t border-zinc-800">
                        <CyberSlider 
                            label="Roughness" 
                            icon={Sparkles} 
                            value={materialParams.roughness} 
                            onChange={(v) => setMaterialParams(prev => ({ ...prev, roughness: v }))} 
                            min={0} max={1} step={0.05} 
                            color="purple" 
                        />
                        <CyberSlider 
                            label="Metallic" 
                            icon={Gem} 
                            value={materialParams.metalness} 
                            onChange={(v) => setMaterialParams(prev => ({ ...prev, metalness: v }))} 
                            min={0} max={1} step={0.05} 
                            color="purple" 
                        />
                    </div>
                </div>
            )}
        </div>
    );
};