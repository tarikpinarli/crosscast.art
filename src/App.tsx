import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import IntersectionModule from './modules/Intersection'; 
// 👇 IMPORT THE NEW MODULE
import WallArtModule from './modules/WallArt/'; 

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        
        {/* Existing Shadow Tool */}
        <Route path="/app/intersection" element={<IntersectionModule />} />
        
        {/* 👇 NEW WALL ART TOOL */}
        <Route path="/wall-art" element={<WallArtModule />} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}