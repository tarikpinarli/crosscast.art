import React, { useState } from 'react';
import { Monitor, RotateCcw, Layers, Video, ChevronUp, ChevronDown, Lightbulb, LightbulbOff } from 'lucide-react';

// FIX: Export this type so SceneWrapper can use it
export type ViewMode = 'iso' | 'front' | 'side';

interface ViewToolbarProps {
    onViewChange: (view: ViewMode) => void;
    onToggleLight?: () => void;
    lightsOn?: boolean;
}

export const ViewToolbar = ({ onViewChange, onToggleLight, lightsOn = true }: ViewToolbarProps) => {
    const [isOpen, setIsOpen] = useState(true);

    const HudButton = ({ onClick, icon: Icon, text, subtext, active = false, warning = false }: any) => (
        <button 
            onClick={onClick} 
            className={`group relative flex items-center justify-between w-full px-3 py-2 border-l-2 transition-all duration-200 overflow-hidden ${
                active ? 'bg-cyan-950/40 border-cyan-400 text-cyan-100' 
                : warning ? 'bg-yellow-950/20 border-yellow-500/50 text-yellow-100 hover:bg-yellow-900/30'
                : 'bg-black/40 border-zinc-700 text-zinc-400 hover:bg-zinc-900/60 hover:border-cyan-500/50 hover:text-cyan-200'
            }`}
        >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500 pointer-events-none"></div>
            <div className="flex items-center gap-3">
                <Icon size={14} className={warning ? "text-yellow-400" : "group-hover:text-cyan-400"} />
                <div className="flex flex-col items-start">
                    <span className="text-[10px] font-bold uppercase tracking-widest leading-none">{text}</span>
                    {subtext && <span className="text-[8px] font-mono text-zinc-500 group-hover:text-cyan-400/70">{subtext}</span>}
                </div>
            </div>
            <div className={`w-1 h-1 rounded-full ${active ? 'bg-cyan-400' : warning ? 'bg-yellow-400' : 'bg-zinc-800 group-hover:bg-cyan-500'}`}></div>
        </button>
    );

    return (
        <div className={`absolute top-4 right-4 z-20 flex flex-col items-end transition-all duration-300 pointer-events-auto ${isOpen ? 'w-48' : 'w-auto'}`}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center py-1.5 px-2 mb-1 hover:bg-white/5 rounded transition-colors group cursor-pointer border border-transparent hover:border-white/5 ${isOpen ? 'w-full justify-between' : 'w-fit justify-center gap-2 self-end'}`}
            >
                {isOpen ? (
                    <div className="flex flex-col items-start">
                        <span className="text-[9px] font-mono text-cyan-500 uppercase tracking-[0.2em]">CAM_CTRL_SYS</span>
                        <span className="text-[7px] text-zinc-500 uppercase tracking-widest">v2.4 ONLINE</span>
                    </div>
                ) : (
                    <Video size={14} className="text-cyan-500/50 group-hover:text-cyan-400" />
                )}
                <div className="flex items-center gap-2">
                     {isOpen && <div className="w-1 h-1 bg-cyan-500 rounded-full animate-pulse"></div>}
                     {isOpen ? <ChevronUp size={12} className="text-zinc-600 group-hover:text-white"/> : <ChevronDown size={12} className="text-zinc-600 group-hover:text-white"/>}
                </div>
            </button>

            <div className={`w-full overflow-hidden transition-all duration-300 ease-in-out bg-black/20 backdrop-blur-sm border-white/5 shadow-lg ${isOpen ? 'max-h-64 opacity-100 border p-1' : 'max-h-0 opacity-0 border-0 p-0'}`}>
                <div className="flex flex-col gap-1">
                    {onToggleLight && (
                        <>
                            <HudButton 
                                onClick={onToggleLight} 
                                icon={lightsOn ? Lightbulb : LightbulbOff} 
                                text={lightsOn ? "Projection" : "Ambient"} 
                                subtext={lightsOn ? "STATUS: ACTIVE" : "STATUS: STANDBY"}
                                warning={true}
                            />
                            <div className="h-px bg-zinc-800/50 my-1 mx-2" />
                        </>
                    )}
                    <HudButton onClick={() => onViewChange('front')} icon={Monitor} text="Front Cam" subtext="AXIS: Z-POS" />
                    <HudButton onClick={() => onViewChange('side')} icon={Layers} text="Side Cam" subtext="AXIS: X-POS" />
                    <HudButton onClick={() => onViewChange('iso')} icon={RotateCcw} text="Reset View" subtext="ISOMETRIC" />
                </div>
            </div>
        </div>
    );
};