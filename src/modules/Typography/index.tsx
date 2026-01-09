import React, { useState } from 'react';
import { Type, MoveVertical, Box, CheckCircle2, AlignHorizontalSpaceAround } from 'lucide-react';

import { ModuleLayout } from '../../components/layout/ModuleLayout';
import { CyberSlider } from '../../components/ui/CyberSlider';
import { PaymentModal } from '../../components/PaymentModal';
import { usePayment } from '../../hooks/usePayment';

import { useTextLogic } from './hooks/useTextLogic';
import { TypographyView } from './components/TypographyView';
import { FontSelector } from './components/FontSelector';
import { MaterialLab } from './components/MaterialLab';

export default function TypographyModule() {
    const { showModal, clientSecret, startCheckout, closeModal } = usePayment('typography-basic');
    const [hasAccess, setHasAccess] = useState(false);

    const { 
        text, setText, 
        selectedFont, setSelectedFont, 
        geometry, isProcessing, 
        status, 
        params, 
        materialParams, setMaterialParams, 
        exportGLB // <--- UPDATED IMPORT
    } = useTextLogic();

    const handleExportRequest = () => {
        if (!geometry) return;
        if (hasAccess) exportGLB();
        else startCheckout();
    };

    const handlePaymentSuccess = () => {
        setHasAccess(true);
        exportGLB();
        closeModal();
    };

    return (
        <>
            <ModuleLayout
                title="Glyph Engine"
                subtitle="TrueType to Mesh Extruder"
                color="purple"
                canExport={!!geometry}
                onExport={handleExportRequest}
                sidebar={
                    <div className="space-y-6">
                        {/* TEXT & FONT */}
                        <div className="space-y-3">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <Type size={12} /> Text Content
                            </label>
                            <textarea 
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded p-3 text-white font-mono text-sm focus:border-purple-500 focus:outline-none min-h-[100px] resize-none"
                                placeholder="TYPE HERE..."
                            />
                        </div>
                        <FontSelector selectedFont={selectedFont} onSelect={setSelectedFont} />

                        <div className="h-px bg-zinc-800"></div>

                        {/* MATERIAL LAB */}
                        <MaterialLab 
                            materialParams={materialParams} 
                            setMaterialParams={setMaterialParams} 
                        />

                        <div className="h-px bg-zinc-800"></div>

                        {/* GEOMETRY PARAMS */}
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Geometry</label>
                            <CyberSlider label="Character Gap" icon={AlignHorizontalSpaceAround} value={params.letterSpacing} onChange={params.setLetterSpacing} min={0} max={10} step={0.5} color="purple" unit="px" />
                            <CyberSlider label="Thickness" icon={MoveVertical} value={params.depth} onChange={params.setDepth} min={0.5} max={10} step={0.5} color="purple" unit="mm" />
                            <CyberSlider label="Bevel Depth" icon={Box} value={params.bevelThickness} onChange={params.setBevelThickness} min={0} max={2} step={0.1} color="purple" unit="mm" />
                        </div>

                        {hasAccess && (
                             <div className="bg-emerald-500/10 border border-emerald-500/50 p-3 rounded-sm flex items-center gap-3">
                                <CheckCircle2 size={16} className="text-emerald-500" />
                                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Session Unlocked</p>
                            </div>
                        )}
                    </div>
                }
            >
                <TypographyView 
                    geometry={geometry} 
                    isProcessing={isProcessing} 
                    status={status} 
                    materialParams={materialParams}
                />
            </ModuleLayout>

            {showModal && <PaymentModal clientSecret={clientSecret} onClose={closeModal} onSuccess={handlePaymentSuccess} color="purple" price="$0.99" />}
        </>
    );
}