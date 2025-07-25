export type OSType = 'windows' | 'macos' | 'linux' | 'unknown';
export type MacArchitecture = 'intel' | 'arm64' | 'unknown';

export function detectMacArchitecture(): MacArchitecture {
  if (typeof window === 'undefined') return 'unknown';
  
  // Try to detect Mac architecture using various methods
  try {
    // Method 1: Check platform API (most reliable)
    if ('platform' in navigator && typeof navigator.platform === 'string') {
      const platform = navigator.platform;
      console.log('Platform detected:', platform);
      
      // macOS on Apple Silicon typically reports 'MacIntel' (confusingly)
      // but we can check other indicators
      if (platform === 'MacIntel') {
        // Check if we can access more detailed info
        const userAgent = window.navigator.userAgent;
        console.log('User agent:', userAgent);
        
        // Look for Apple Silicon indicators in user agent
        if (userAgent.includes('Mac OS X')) {
          // For Apple Silicon, check available memory/performance hints
          // Most Apple Silicon Macs have 8+ logical cores
          const cores = navigator.hardwareConcurrency || 0;
          console.log('Hardware concurrency:', cores);
          
          // Apple Silicon Macs typically have 8+ cores, Intel Macs often have fewer
          // But this is a heuristic, not definitive
          if (cores >= 8) {
            // Additional check: Apple Silicon devices often have more memory
            // But we can't access this directly, so we use timing as a heuristic
            const start = performance.now();
            for (let i = 0; i < 100000; i++) {
              Math.random();
            }
            const duration = performance.now() - start;
            
            // Apple Silicon is typically faster at basic operations
            if (duration < 5) {
              return 'arm64';
            }
          }
        }
        
        // Default to Intel for MacIntel platform if we can't determine otherwise
        return 'intel';
      }
      
      // Other platform strings
      if (platform.includes('ARM') || platform.includes('arm64')) {
        return 'arm64';
      }
    }
    
    // Method 2: Check user agent for explicit ARM64 indicators
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (userAgent.includes('arm64') || userAgent.includes('aarch64')) {
      return 'arm64';
    }
    
    // Method 3: WebGL renderer string (sometimes indicates GPU which can hint at architecture)
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') as WebGLRenderingContext | null;
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          console.log('WebGL renderer:', renderer);
          
          // Apple Silicon Macs use Apple GPU
          if (renderer && typeof renderer === 'string' && renderer.includes('Apple')) {
            return 'arm64';
          }
        }
      }
    } catch (e) {
      // WebGL detection failed, continue with other methods
    }
    
    // Default to unknown instead of guessing incorrectly
    return 'unknown';
  } catch (error) {
    console.warn('Could not detect Mac architecture:', error);
    return 'unknown';
  }
}

export function detectOS(): OSType {
  if (typeof window === 'undefined') return 'unknown';
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('win')) return 'windows';
  if (userAgent.includes('mac')) return 'macos';
  if (userAgent.includes('linux')) return 'linux';
  
  return 'unknown';
}

export function getDownloadUrl(os: OSType, macArch?: MacArchitecture): string {
  const baseUrl = 'https://pub-164a634507e5411b93a8ae47fcc193f2.r2.dev';
  
  switch (os) {
    case 'windows':
      return `${baseUrl}/Orch-Mind-Windows-0.0.1.exe`;
    case 'macos':
      if (macArch === 'arm64') {
        return `${baseUrl}/Orch-Mind-arm64.pkg`;
      } else {
        return `${baseUrl}/Orch-Mind-x64.pkg`;
      }
    case 'linux':
      return 'https://github.com/guiferrarib/orch-mind/releases/latest'; // Linux removido, fallback para GitHub
    default:
      return 'https://github.com/guiferrarib/orch-mind/releases/latest';
  }
}

export function getOSDisplayName(os: OSType): string {
  switch (os) {
    case 'windows':
      return 'Windows';
    case 'macos':
      return 'macOS';
    case 'linux':
      return 'Linux';
    default:
      return 'Your Platform';
  }
}

export function getMacArchitectureDisplayName(arch: MacArchitecture): string {
  switch (arch) {
    case 'arm64':
      return 'Apple Silicon';
    case 'intel':
      return 'Intel';
    default:
      return 'Unknown';
  }
}
