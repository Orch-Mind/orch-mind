// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { QuantumField } from './components/QuantumField';
import './QuantumVisualizationCSS.css';
import { useOrbitControlsFix } from './utils/performance/hooks/useOrbitControlsFix';

// === Performance Configuration ===
const PERFORMANCE_CONFIG = {
  frameRate: 60,
  pixelRatio: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1,
  shadowMapSize: 1024,
  antialias: false, // Disable for performance
  powerPreference: 'high-performance' as const,
  stencil: false,
  depth: true,
  alpha: false // Disable transparency for better performance
} as const;

// === Constants ===
// Classes CSS dos elementos estáticos
const QUANTUM_ELEMENT_CLASSES = [
  'quantum-element-1',
  'quantum-element-2',
  'quantum-element-3',
  'quantum-element-4',
  'quantum-element-5',
  'quantum-element-6'
] as const;

// === CSS Fallback Component ===
const CssQuantumFallback: React.FC = React.memo(() => (
  <div className="quantum-visualization-css">
    {/* Fundo */}
    <div className="quantum-background" />

    {/* Elementos quânticos estáticos */}
    {QUANTUM_ELEMENT_CLASSES.map((cls, idx) => (
      <div key={`${cls}-${idx}`} className={cls} />
    ))}

    {/* Partículas adicionais */}
    <div className="quantum-particles-container">
      {Array.from({ length: 10 }, (_, idx) => {
        // Posição e atraso determinísticos (5 posições x 5 delays)
        const posCls = `quantum-particle-pos-${(idx % 5) + 1}`;
        const delayCls = `quantum-particle-delay-${(idx % 5) + 1}`;
        return <div key={`particle-${idx}`} className={`quantum-particle ${posCls} ${delayCls}`} />;
      })}
    </div>
  </div>
));

CssQuantumFallback.displayName = 'CssQuantumFallback';

// === Optimized OrbitControls Configuration ===
const ORBIT_CONTROLS_CONFIG = {
  enablePan: true,
  enableZoom: true,
  enableRotate: true,
  minDistance: 8,
  maxDistance: 30,
  enableDamping: true,
  dampingFactor: 0.05,
  rotateSpeed: 0.5,
  zoomSpeed: 0.8,
  panSpeed: 0.8,
  // Performance optimizations
  maxPolarAngle: Math.PI,
  minPolarAngle: 0,
  autoRotate: false,
  autoRotateSpeed: 2.0,
  // Fix passive event listener issues
  mouseButtons: {
    LEFT: 0,  // Rotate
    MIDDLE: 1, // Dolly
    RIGHT: 2   // Pan
  },
  touches: {
    ONE: 0,   // Rotate
    TWO: 2    // Dolly & Pan
  }
} as const;

// === Three.js Scene Components ===
const QuantumThreeScene: React.FC = React.memo(() => (
  <>
    <ambientLight intensity={1} />
    <OrbitControls {...ORBIT_CONTROLS_CONFIG} />
    <QuantumField />
  </>
));

QuantumThreeScene.displayName = 'QuantumThreeScene';

/**
 * Performance-optimized error boundary for WebGL context loss
 * Implements symbolic graceful degradation for neural processing stability
 */
class WebGLErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ComponentType },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ComponentType }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn('[QuantumModel] WebGL context error, falling back to CSS:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback;
      return <FallbackComponent />;
    }

    return this.props.children;
  }
}

// === Main Component ===
export const QuantumModel: React.FC = React.memo(() => {
  const [webglAvailable, setWebglAvailable] = useState<boolean>(true);

  // Memoized WebGL detection for performance
  const webglSupport = useMemo(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl =
        canvas.getContext('webgl2', { powerPreference: PERFORMANCE_CONFIG.powerPreference }) ||
        canvas.getContext('webgl', { powerPreference: PERFORMANCE_CONFIG.powerPreference }) ||
        canvas.getContext('experimental-webgl', { powerPreference: PERFORMANCE_CONFIG.powerPreference });
      
      if (gl && 'clearColor' in gl && 'clear' in gl && 'COLOR_BUFFER_BIT' in gl) {
        // Test basic rendering capability
        (gl as WebGLRenderingContext).clearColor(0, 0, 0, 1);
        (gl as WebGLRenderingContext).clear((gl as WebGLRenderingContext).COLOR_BUFFER_BIT);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    setWebglAvailable(webglSupport);
  }, [webglSupport]);

  // Fix passive event listener issues with OrbitControls
  useOrbitControlsFix();

  // Performance-optimized Canvas configuration
  const canvasConfig = useMemo(() => ({
    className: "quantum-three-canvas",
    shadows: true,
    camera: { position: [0, 0, 15] as [number, number, number], fov: 40 },
    dpr: PERFORMANCE_CONFIG.pixelRatio,
    performance: { min: 0.8 }, // Maintain 80% frame rate minimum
    gl: {
      powerPreference: PERFORMANCE_CONFIG.powerPreference,
      antialias: PERFORMANCE_CONFIG.antialias,
      stencil: PERFORMANCE_CONFIG.stencil,
      depth: PERFORMANCE_CONFIG.depth,
      alpha: PERFORMANCE_CONFIG.alpha,
      preserveDrawingBuffer: false,
      premultipliedAlpha: false,
      failIfMajorPerformanceCaveat: false
    },
    onCreated: ({ gl, size }: { gl: any; size: { width: number; height: number } }) => {
      try {
        // Optimize WebGL context for performance
        if (gl.shadowMap) {
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = 2; // PCFShadowMap for performance
        }
        
        // Use renderer setSize if available
        if (gl.setSize && typeof gl.setSize === 'function') {
          gl.setSize(size.width, size.height);
        }
        
        if (gl.setClearColor && typeof gl.setClearColor === 'function') {
          gl.setClearColor(0x000000);
        }
        
        // Enable performance optimizations
        if (gl.setPixelRatio && typeof gl.setPixelRatio === 'function') {
          gl.setPixelRatio(PERFORMANCE_CONFIG.pixelRatio);
        }
        
        if (gl.outputEncoding !== undefined) {
          gl.outputEncoding = 3001; // sRGBEncoding
        }
        
        // Fix passive event listener issues with OrbitControls
        if (gl.domElement) {
          // Set touch-action to prevent default browser behavior
          gl.domElement.style.touchAction = 'none';
          
          // Override wheel event handler to be non-passive
          const originalAddEventListener = gl.domElement.addEventListener;
          gl.domElement.addEventListener = function(type: string, listener: any, options?: any) {
            // For wheel events used by OrbitControls, ensure they're non-passive
            if (type === 'wheel' || type === 'mousewheel') {
              const opts = typeof options === 'object' 
                ? { ...options, passive: false }
                : { passive: false };
              return originalAddEventListener.call(this, type, listener, opts);
            }
            return originalAddEventListener.call(this, type, listener, options);
          };
        }
        
      } catch (error) {
        console.warn('[QuantumModel] WebGL configuration warning:', error);
      }
    }
  }), []);

  if (webglAvailable) {
    return (
      <WebGLErrorBoundary fallback={CssQuantumFallback}>
        <Canvas {...canvasConfig}>
          <Suspense fallback={null}>
            <QuantumThreeScene />
          </Suspense>
        </Canvas>
      </WebGLErrorBoundary>
    );
  }

  console.log('[QuantumModel] WebGL não disponível, usando fallback CSS com otimizações neurais');
  return <CssQuantumFallback />;
});

QuantumModel.displayName = 'QuantumModel';

export default QuantumModel;