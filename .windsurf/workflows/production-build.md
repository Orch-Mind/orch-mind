---
description: Production build configuration for ONNX model loading
---

# Production Build Configuration for ONNX Models

## Building for Production

Run the production build:

```bash
npm run build
```

## Production Configuration Guide

### 1. Electron Main Process Configuration

Make sure your Electron main process includes these headers for static files. Add this to your Electron main process where you set up the window:

```typescript
// Add to your electron/main.ts
webPreferences: {
  webSecurity: true,
  // Allow accessing local content from remote sources (for ONNX models)
  allowRunningInsecureContent: false,
  
  // Enable WASM, SharedArrayBuffer and other required capabilities
  contextIsolation: true,
  sandbox: true,
  
  // Enable web workers
  nodeIntegration: false,
  
  // Optional: custom schemes
  additionalArguments: ['--enable-features=SharedArrayBuffer'],
}
```

### 2. Electron Session Configuration

```typescript
// Add this to your Electron main process startup
app.whenReady().then(() => {
  const session = session.defaultSession;
  
  // Set CSP headers for all responses
  session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: https://cdn.jsdelivr.net; " +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
          "img-src 'self' data: blob:; " +
          "font-src 'self' data: https://fonts.gstatic.com; " +
          "connect-src 'self' ws: wss: http://localhost:* https://huggingface.co https://*.huggingface.co " +
          "https://cdn-lfs.huggingface.co https://cdn-lfs-us-1.hf.co https://cdn-lfs-eu-1.hf.co https://cdn-lfs.hf.co " +
          "https://cas-bridge.xethub.hf.co https://cas-server.xethub.hf.co https://transfer.xethub.hf.co; " +
          "worker-src 'self' blob: data:; " +
          "child-src 'self' blob:; " +
          "object-src 'self' blob:"
        ],
        'Cross-Origin-Opener-Policy': ['same-origin-allow-popups'],
        'Cross-Origin-Embedder-Policy': ['credentialless'],
        'Cross-Origin-Resource-Policy': ['cross-origin']
      }
    });
  });
});
```

### 3. Static File Handling in Production

For production builds, ensure your static ONNX models are copied to the correct location:

```typescript
// Add to your build script or vite.config.ts
const copyModels = () => {
  return {
    name: 'copy-model-files',
    closeBundle() {
      // Copy models from public/models to dist/models
      fs.cpSync('public/models', 'dist/models', { recursive: true });
    }
  };
};
```
