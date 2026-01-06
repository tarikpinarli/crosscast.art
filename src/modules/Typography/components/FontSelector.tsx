import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Type } from 'lucide-react';
import { FONT_LIBRARY } from '../hooks/useTextLogic';

interface FontSelectorProps {
    selectedFont: typeof FONT_LIBRARY[0];
    onSelect: (font: typeof FONT_LIBRARY[0]) => void;
}

export const FontSelector = ({ selectedFont, onSelect }: FontSelectorProps) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="space-y-2">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Type size={12} /> Active Typeface
            </label>

            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded px-3 py-3 hover:border-purple-500/50 transition-all group"
            >
                <div className="flex flex-col items-start">
                    <span 
                        className="text-lg leading-none text-white mb-1"
                        style={{ fontFamily: selectedFont.googleFont }}
                    >
                        {selectedFont.name}
                    </span>
                    <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-800 px-1.5 py-0.5 rounded">
                        {selectedFont.category}
                    </span>
                </div>
                {isOpen ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
            </button>

            {isOpen && (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200">
                    <div className="max-h-60 overflow-y-auto p-1 space-y-1 custom-scrollbar">
                        {FONT_LIBRARY.map((f) => (
                            <button
                                key={f.name}
                                onClick={() => {
                                    onSelect(f);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-3 py-3 rounded transition-colors flex items-center justify-between group ${
                                    selectedFont.name === f.name 
                                    ? 'bg-purple-900/20 border border-purple-500/30' 
                                    : 'hover:bg-white/5 border border-transparent'
                                }`}
                            >
                                <span 
                                    className={`text-base ${selectedFont.name === f.name ? 'text-purple-300' : 'text-zinc-300'}`}
                                    style={{ fontFamily: f.googleFont }}
                                >
                                    {f.name}
                                </span>
                                {selectedFont.name === f.name && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]"></div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};