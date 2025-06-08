// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import * as ort from 'onnxruntime-web';

/**
 * onnxruntimeConfig.ts
 * Global ONNX Runtime Web configuration for Orch-OS
 * Applies optimal settings for performance and suppresses benign warnings.
 */
export class OnnxRuntimeConfig {
  /**
   * Apply global ONNX Runtime settings. Call once at startup before any session creation.
   */
  static initialize(): void {
    // WASM flags
    ort.env.wasm.simd = true;
    ort.env.wasm.numThreads = Math.min(4, navigator.hardwareConcurrency || 4);
    ort.env.wasm.proxy = false;

    // WebGPU flags
    if (ort.env.webgpu) {
      ort.env.webgpu.validateInputContent = false;
    }

    // Logging: show warnings and errors only
    ort.env.logSeverityLevel = 2; // 0=VERBOSE,1=INFO,2=WARNING,3=ERROR,4=FATAL
    ort.env.logVerbosityLevel = 0;

    // Suppress known harmless warnings
    this.suppressHarmlessWarnings();
  }

  /**
   * Build optimized SessionOptions for a given provider.
   */
  static getSessionOptions(
    provider: 'webgpu' | 'wasm'
  ): ort.InferenceSession.SessionOptions {
    const executionProviders = provider === 'webgpu' ? ['webgpu', 'wasm'] : ['wasm'];

    return {
      executionProviders,
      graphOptimizationLevel: 'all',
      enableMemPattern: true,
      enableCpuMemArena: true,
      interOpNumThreads: provider === 'wasm' ? 1 : undefined,
      intraOpNumThreads: provider === 'wasm' ? 1 : undefined,
      logSeverityLevel: 2,
      logVerbosityLevel: 0,
    };
  }

  /**
   * Silence known-onboarding warnings from ONNX Runtime Web.
   */
  private static suppressHarmlessWarnings() {
    const origWarn = console.warn;
    const origErr  = console.error;

    const harmlessPatterns = [
      /VerifyEachNodeIsAssignedToAnEp/, // expected fallback info
    ];

    console.warn = (...args: any[]) => {
      const msg = args.join(' ');
      if (harmlessPatterns.some(p => p.test(msg))) return;
      origWarn.apply(console, args);
    };

    console.error = (...args: any[]) => {
      const msg = args.join(' ');
      if (harmlessPatterns.some(p => p.test(msg))) return;
      origErr.apply(console, args);
    };
  }
}

// Auto-initialize if imported in browser
if (typeof window !== 'undefined') {
  OnnxRuntimeConfig.initialize();
}