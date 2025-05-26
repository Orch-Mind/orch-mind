// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { useState, useEffect, Suspense } from 'react';
import './QuantumVisualizationCSS.css';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { QuantumField } from './components/QuantumField';

// === Constants ===
// Classes CSS dos elementos estáticos
const QUANTUM_ELEMENT_CLASSES = [
  'quantum-element-1',
  'quantum-element-2',
  'quantum-element-3',
  'quantum-element-4',
  'quantum-element-5',
  'quantum-element-6'
];

// === CSS Fallback Component ===
const CssQuantumFallback: React.FC = () => (
  <div className="quantum-visualization-css">
    {/* Fundo */}
    <div className="quantum-background" />

    {/* Elementos quânticos estáticos */}
    {QUANTUM_ELEMENT_CLASSES.map((cls, idx) => (
      <div key={idx} className={cls} />
    ))}

    {/* Partículas adicionais */}
    <div className="quantum-particles-container">
      {Array.from({ length: 10 }).map((_, idx) => {
        // Posição e atraso determinísticos (5 posições x 5 delays)
        const posCls = `quantum-particle-pos-${(idx % 5) + 1}`;
        const delayCls = `quantum-particle-delay-${(idx % 5) + 1}`;
        return <div key={idx} className={`quantum-particle ${posCls} ${delayCls}`} />;
      })}
    </div>
  </div>
);

// === Three.js Scene Components ===

const QuantumThreeScene: React.FC = () => (
  <>
    <ambientLight intensity={1} />

    <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} minDistance={8} maxDistance={30} />
    <QuantumField />
  </>
);

// === Main Component ===
export const QuantumModel: React.FC = () => {
  const [webglAvailable, setWebglAvailable] = useState<boolean>(true);

  useEffect(() => {
    // Try to detect WebGL support
    try {
      const canvas = document.createElement('canvas');
      const gl =
        canvas.getContext('webgl2') ||
        canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl');
      setWebglAvailable(!!gl);
    } catch {
      setWebglAvailable(false);
    }
  }, []);

  useEffect(() => {
    console.log('QuantumModel montado!');
  }, []);

  if (webglAvailable) {
    console.log('WebGL disponível, renderizando Canvas Three.js!');
    return (
      <Canvas className="quantum-three-canvas" shadows camera={{ position: [0, 0, 15], fov: 40 }}>
        <Suspense fallback={null}>
          <QuantumThreeScene />
        </Suspense>
      </Canvas>
    );
  }

  console.log('WebGL NÃO disponível, usando fallback CSS!');
  return <CssQuantumFallback />;
};

export default QuantumModel;