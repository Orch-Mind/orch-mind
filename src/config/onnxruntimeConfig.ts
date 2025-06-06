// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// onnxruntimeConfig.ts
// Symbolic cortex: Global ONNX Runtime configuration for Orch-OS
// Optimizes neural execution providers and suppresses unnecessary warnings

/**
 * Global ONNX Runtime configuration to optimize performance and reduce warnings
 * Symbolic: Neural execution environment optimization for browser compatibility
 */
export class OnnxRuntimeConfig {
  
  /**
   * Initialize global ONNX Runtime environment settings
   * This should be called once at application startup before any model loading
   */
  static initializeGlobalOnnxSettings(): void {
    // Suppress ONNX Runtime console warnings globally if possible
    try {
      // Try to configure global ONNX environment if available
      if (typeof window !== 'undefined' && (window as any).ort) {
        const ort = (window as any).ort;
        
        // Configure global ONNX Runtime settings
        if (ort.env) {
          // Set global log level to suppress warnings
          ort.env.logLevel = 'error'; // Only show errors, suppress warnings
          ort.env.debug = false; // Disable debug output
        }
      }
      
      // Set environment variables for ONNX Runtime behavior in Electron/Node
      if (typeof process !== 'undefined' && process.env) {
        // Suppress ONNX Runtime warnings via environment variables
        process.env.ORT_LOGGING_LEVEL = '3'; // Error level only
        process.env.ORT_ENABLE_VERBOSE_LOGGING = '0'; // Disable verbose logging
        process.env.ORT_DISABLE_ALL_LOGS = '0'; // Keep error logs only
      }
      
      console.log('[ONNX-CONFIG] ✅ Global ONNX Runtime optimization settings applied');
    } catch (error) {
      console.warn('[ONNX-CONFIG] ⚠️ Could not apply global ONNX settings:', error);
    }
  }
  
  /**
   * Get optimized session options for ONNX Runtime
   * Based on official ONNX Runtime documentation and community best practices
   * @see https://onnxruntime.ai/docs/performance/transformers-optimization.html
   */
  static getOptimizedSessionOptions(device: 'webgpu' | 'wasm' = 'wasm'): any {
    return {
      // ✅ RECOMMENDED: Specify execution providers in order of preference
      executionProviders: device === 'webgpu' 
        ? ['webgpu', 'wasm'] 
        : ['wasm'],
        
      // ✅ RECOMMENDED: Control logging level (production setting)
      logSeverityLevel: 2, // Show warnings and errors (0=Verbose, 1=Info, 2=Warning, 3=Error, 4=Fatal)
      logVerbosityLevel: 0, // Minimize verbosity but don't completely silence
      
      // ✅ RECOMMENDED: Optimizations that are safe for browser environments
      graphOptimizationLevel: 'basic', // Use basic optimizations (recommended for production)
      enableProfiling: false, // Disable profiling for production performance
      
      // ⚠️ CONDITIONAL: Browser-specific settings (only disable if causing issues)
      ...(typeof window !== 'undefined' && {
        // These are only disabled if running in browser and causing compatibility issues
        enableCpuMemArena: true,  // Keep enabled unless it causes issues
        enableMemPattern: true,   // Keep enabled for better performance
      }),
      
      // ✅ RECOMMENDED: Thread management for browser compatibility
      ...(device === 'wasm' && {
        interOpNumThreads: 1,     // Single thread for WASM compatibility
        intraOpNumThreads: 1,     // Single thread for WASM compatibility
      }),
    };
  }
  
  /**
   * ⚠️ OPTIONAL: Suppress specific harmless ONNX Runtime warnings
   * WARNING: Use this only for known harmless warnings that clutter the console
   * @see https://onnxruntime.ai/docs/performance/transformers-optimization.html
   */
  static suppressHarmlessOnnxWarnings(): void {
    if (typeof console !== 'undefined') {
      const originalWarn = console.warn;
      const originalError = console.error;
      
      // Function to check if message is a known harmless ONNX warning
      const isHarmlessOnnxWarning = (message: string): boolean => {
        return (
          message.includes('[W:onnxruntime:, session_state.cc:1280 VerifyEachNodeIsAssignedToAnEp] Some nodes were not assigned to the preferred execution providers') ||
          message.includes('[W:onnxruntime:, session_state.cc:1282 VerifyEachNodeIsAssignedToAnEp] Rerunning with verbose output') ||
          // Specific ONNX Runtime informational messages that are expected in browser
          (message.includes('VerifyEachNodeIsAssignedToAnEp') && message.includes('Some nodes were not assigned')) ||
          (message.includes('ORT explicitly assigns shape related ops to CPU to improve perf'))
        );
      };
      
      // Intercept console.warn for ONNX warnings
      console.warn = function(...args: any[]) {
        const message = args.join(' ');
        
        if (isHarmlessOnnxWarning(message)) {
          // These warnings are expected and harmless - ONNX Runtime is working correctly
          return;
        }
        
        // Keep ALL other warnings - important for debugging
        originalWarn.apply(console, args);
      };
      
      // Intercept console.error for ONNX warnings (since ONNX Runtime uses console.error for some warnings)
      console.error = function(...args: any[]) {
        const message = args.join(' ');
        
        if (isHarmlessOnnxWarning(message)) {
          // These warnings are expected and harmless - ONNX Runtime is working correctly
          return;
        }
        
        // Keep ALL other errors - critical for debugging
        originalError.apply(console, args);
      };
      
      console.log('[ONNX-CONFIG] 🔇 Suppressing known harmless ONNX Runtime warnings');
    }
  }
  
  /**
   * Restore original console methods
   * Call this if you need to restore normal console behavior
   */
  static restoreConsole(): void {
    // This would require storing references to original methods
    // For now, reload the page to restore console
    console.log('[ONNX-CONFIG] 📢 To restore full console logging, reload the page');
  }
}

/**
 * Auto-initialize ONNX Runtime configuration when this module is imported
 */
if (typeof window !== 'undefined') {
  // Initialize on browser load
  window.addEventListener('load', () => {
    OnnxRuntimeConfig.initializeGlobalOnnxSettings();
    OnnxRuntimeConfig.suppressHarmlessOnnxWarnings();
  });
} else {
  // Initialize immediately in Node.js environments
  OnnxRuntimeConfig.initializeGlobalOnnxSettings();
} 