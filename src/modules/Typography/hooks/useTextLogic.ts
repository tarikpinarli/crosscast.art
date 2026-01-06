import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { FONT_LIBRARY } from '../data/fontLibrary';
import { generateTextMesh } from '../utils/meshGenerator';
import { useModelExporter } from './useModelExporter'; // <--- UPDATED IMPORT

export { FONT_LIBRARY };

export const useTextLogic = () => {
    const [text, setText] = useState("CROSS\nCAST");
    const [selectedFont, setSelectedFont] = useState(FONT_LIBRARY[0]); 
    const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState("Initializing..."); 

    // Geometry Params
    const [depth, setDepth] = useState(4); 
    const [bevelThickness, setBevelThickness] = useState(0.5);
    const [bevelSize, setBevelSize] = useState(0.3);
    const [letterSpacing, setLetterSpacing] = useState(1);

    // Material Params
    const [materialParams, setMaterialParams] = useState({
        color: '#ffffff', 
        roughness: 0.2,   
        metalness: 0.2    
    });

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    // <--- USE NEW EXPORTER
    const { exportModel } = useModelExporter(); 

    useEffect(() => {
        const linkId = 'typography-module-fonts-githack';
        if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=Lato:wght@400;700&family=Merriweather:wght@400;700&family=Open+Sans:wght@400;700&family=Roboto:wght@400;700&family=Roboto+Mono&display=swap';
            document.head.appendChild(link);
        }
    }, []);

    const generateMesh = async () => {
        setIsProcessing(true);
        setStatus(`Fetching: ${selectedFont.name}`);
        
        try {
            const geo = await generateTextMesh({
                text,
                fontUrl: selectedFont.url,
                depth,
                bevelThickness,
                bevelSize,
                letterSpacing,
                onStatus: setStatus
            });
            
            setGeometry(geo);
            setStatus("Ready");
        } catch (e: any) {
            console.error(e);
            setStatus("Error");
        } finally {
            setIsProcessing(false);
        }
    };

    useEffect(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => { generateMesh(); }, 600); 
        return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
    }, [text, selectedFont, depth, bevelThickness, bevelSize, letterSpacing]);

    // <--- UPDATED EXPORT FUNCTION
    // We now pass the materialParams to the exporter
    const exportSTL = () => exportModel(geometry, materialParams);

    return {
        text, setText,
        selectedFont, setSelectedFont,
        geometry, isProcessing,
        status, 
        params: { 
            depth, setDepth, 
            bevelThickness, setBevelThickness, 
            bevelSize, setBevelSize, 
            letterSpacing, setLetterSpacing 
        },
        materialParams, setMaterialParams,
        exportSTL // This function name stays the same for compatibility with index.tsx
    };
};