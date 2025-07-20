import { version } from "os";

export type OSType = 'windows' | 'macos' | 'linux' | 'unknown';

export function detectOS(): OSType {
  if (typeof window === 'undefined') return 'unknown';
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('win')) return 'windows';
  if (userAgent.includes('mac')) return 'macos';
  if (userAgent.includes('linux')) return 'linux';
  
  return 'unknown';
}

export function getDownloadUrl(os: OSType): string {
  const baseUrl = `https://github.com/guiferrarib/orch-mind/releases/download/v0.0.1`;
  
  switch (os) {
    case 'windows':
      return `${baseUrl}/Orch-Mind-Windows-0.0.1.exe`;
    case 'macos':
      return `${baseUrl}/Orch-Mind-arm64.pkg`;
    case 'linux':
      return `${baseUrl}/Orch-Mind-Linux-0.0.1.AppImage`;
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
