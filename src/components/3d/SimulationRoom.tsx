import React from 'react';

export const SimulationRoom = () => {
  const wallSize = 10000;    
  const wallDistance = 1500; 
  const floorLevel = -800;  
  const wallColor = "#52525b"; 
  const floorColor = "#3f3f46"; 

  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, floorLevel, 0]}>
        <planeGeometry args={[wallSize, wallSize]} />
        <meshStandardMaterial color={floorColor} roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh receiveShadow position={[0, -200, -wallDistance]}>
        <planeGeometry args={[wallSize, wallSize]} />
        <meshStandardMaterial color={wallColor} roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh receiveShadow rotation={[0, Math.PI / 2, 0]} position={[-wallDistance, -200, 0]}>
        <planeGeometry args={[wallSize, wallSize]} />
        <meshStandardMaterial color={wallColor} roughness={0.5} metalness={0.2} />
      </mesh>
    </group>
  );
};