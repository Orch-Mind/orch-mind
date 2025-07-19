// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useEffect } from 'react';

/**
 * 🧠 Symbolic OrbitControls Fix Hook for Orch-Mind
 * 
 * Neural Fix Cortex - resolves passive event listener conflicts with @react-three/drei
 * OrbitControls by ensuring wheel events can call preventDefault() properly.
 */
export function useOrbitControlsFix(): void {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    // Global fix for OrbitControls passive event listener issues
    const fixPassiveEvents = () => {
      // Override addEventListener globally to fix wheel events
      const originalAddEventListener = EventTarget.prototype.addEventListener;
      
      EventTarget.prototype.addEventListener = function(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions
      ) {
        // For wheel events, force non-passive to allow preventDefault
        if (type === 'wheel' || type === 'mousewheel') {
          let opts: AddEventListenerOptions;
          
          if (typeof options === 'boolean') {
            opts = { capture: options, passive: false };
          } else if (options) {
            opts = { ...options, passive: false };
          } else {
            opts = { passive: false };
          }
          
          return originalAddEventListener.call(this, type, listener, opts);
        }
        
        return originalAddEventListener.call(this, type, listener, options);
      };
    };

    // Apply the fix
    fixPassiveEvents();

    // Additional canvas-specific fixes
    const applyCanvasFixes = () => {
      const canvases = document.querySelectorAll('canvas');
      canvases.forEach(canvas => {
        // Ensure touch-action is set for better mobile support
        canvas.style.touchAction = 'none';
        
        // Add a custom wheel event listener that won't be passive
        const wheelHandler = (e: WheelEvent) => {
          // Allow default OrbitControls behavior
          // This is just to register a non-passive listener
        };
        
        canvas.addEventListener('wheel', wheelHandler, { passive: false });
      });
    };

    // Apply canvas fixes immediately and after a delay for dynamic content
    applyCanvasFixes();
    const timeoutId = setTimeout(applyCanvasFixes, 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);
} 