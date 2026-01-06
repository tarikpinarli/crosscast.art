// src/modules/Typography/utils/meshGenerator.ts
import * as THREE from 'three';
import { FontLoader, TextGeometry, mergeBufferGeometries } from 'three-stdlib';

interface GeneratorParams {
    text: string;
    fontUrl: string;
    depth: number;
    bevelThickness: number;
    bevelSize: number;
    letterSpacing: number;
    onStatus: (status: string) => void;
}

export const generateTextMesh = (params: GeneratorParams): Promise<THREE.BufferGeometry> => {
    const { text, fontUrl, depth, bevelThickness, bevelSize, letterSpacing, onStatus } = params;
    const size = 20;

    return new Promise((resolve, reject) => {
        const loader = new FontLoader();
        
        loader.load(fontUrl, (font) => {
            onStatus("Parsing Geometry...");
            try {
                const textOptions: any = {
                    font: font,
                    size: size,
                    height: depth,
                    curveSegments: 4,
                    bevelEnabled: true,
                    bevelThickness: bevelThickness,
                    bevelSize: bevelSize,
                    bevelOffset: 0,
                    bevelSegments: 3
                };

                const geometries: THREE.BufferGeometry[] = [];
                let xOffset = 0;
                const lines = text.split('\n');
                let yOffset = 0;
                const lineHeight = size * 1.5;

                lines.forEach((line) => {
                    xOffset = 0;
                    const lineChars = line.split('');
                    
                    lineChars.forEach((char) => {
                        if (char === ' ') {
                            xOffset += size * 0.5 + letterSpacing;
                            return;
                        }
                        const charGeo = new TextGeometry(char, textOptions);
                        charGeo.computeBoundingBox();
                        const charWidth = charGeo.boundingBox!.max.x - charGeo.boundingBox!.min.x;
                        
                        charGeo.translate(xOffset, yOffset, 0);
                        geometries.push(charGeo);
                        
                        xOffset += charWidth + letterSpacing;
                    });
                    yOffset -= lineHeight;
                });

                if (geometries.length > 0) {
                    const mergedGeo = mergeBufferGeometries(geometries);
                    mergedGeo.center();
                    mergedGeo.computeVertexNormals();
                    resolve(mergedGeo);
                } else {
                    reject(new Error("Empty Mesh"));
                }
            } catch (err) {
                reject(err);
            }
        }, 
        (xhr) => {
            const percent = Math.floor((xhr.loaded / xhr.total * 100));
            if (isFinite(percent)) onStatus(`Downloading: ${percent}%`);
        },
        (err) => {
            reject(err);
        });
    });
};