import React, { Suspense } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Stage, Center } from '@react-three/drei';
import { GLTFLoader } from 'three-stdlib';

interface ModelViewerProps {
  url: string;
}

function Model({ url }: { url: string }) {
  // CLEAN LOADER: No custom headers causing CORS issues
  const gltf = useLoader(GLTFLoader, url);

  return (
    <primitive 
      object={gltf.scene} 
      scale={1.5} 
      castShadow 
      receiveShadow 
    />
  );
}

export function ModelViewer({ url }: ModelViewerProps) {
  return (
    <div className="w-full h-full cursor-move bg-zinc-900/10">
      <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 5], fov: 45 }}>
        <Suspense fallback={null}>
          <Stage environment="city" intensity={0.5} shadows="contact" adjustCamera>
            <Center>
               <Model url={url} />
            </Center>
          </Stage>
        </Suspense>
        <OrbitControls autoRotate autoRotateSpeed={1} makeDefault enableDamping />
      </Canvas>
    </div>
  );
}