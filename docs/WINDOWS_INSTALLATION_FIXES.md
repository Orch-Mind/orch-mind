# Windows Installation Fixes for Orch-OS

## Overview
This document outlines fixes for common Windows installation issues with Orch-OS.

## Issues and Solutions

### 1. Incorrect Executable Name
**Problem**: The installer was creating `orch-os.exe` instead of the expected `Orch-OS.exe`.

**Solution**: Updated `package.json` build configuration:
```json
"win": {
  "executableName": "Orch-OS"
}
```

### 2. Missing Desktop/Start Menu Shortcuts
**Problem**: Shortcuts were not being created during installation.

**Solution**: 
- Updated NSIS configuration in `package.json`
- Created proper installation scripts
- Added batch file launchers

### 3. Bundle Size Explosion (1.3GB → 11GB+)

**Problem**: The executable size increased dramatically from 1.3GB to 11GB+ due to accidentally bundling:
- **Virtual Environments**: 1.5GB (venv/ + training_venv/)
- **LoRA Adapters**: 12GB (lora_adapters/)
- **Adapter Collections**: 3.8GB (adapters/)
- **Training Outputs**: 554MB (lora_training_output/)

**Root Cause**: 
- Virtual environments containing PyTorch, Transformers, and other heavy ML dependencies
- Local adapter files and training outputs being included in the bundle
- Python cache files (__pycache__, .pytest_cache)

**Solution**:

#### Updated `.gitignore`:
```gitignore
# Python virtual environments (CRITICAL: These are huge!)
venv/
.venv/
**/venv/**
**/training_venv/**

# LoRA adapters and training outputs (CRITICAL: These are multi-GB!)
lora_adapters/
adapters/
lora_adapter/
lora_training_output/
**/training_output/**

# llama.cpp installations (should be installed on-the-fly)
llama.cpp/**
**/llama.cpp

# Python cache files
**/__pycache__/**
**/*.pyc
**/.pytest_cache/**
```

#### Updated `package.json` electron-builder configuration:
```json
"files": [
  "dist/**/*",
  "dist-electron/**/*",
  "!**/venv/**",
  "!**/training_venv/**",
  "!**/lora_adapters/**",
  "!**/adapters/**",
  "!**/lora_training_output/**",
  "!**/llama.cpp/**",
  "!**/__pycache__/**"
],
"extraResources": [
  {
    "from": "scripts/python",
    "to": "scripts/python",
    "filter": [
      "**/*",
      "!**/__pycache__/**",
      "!**/venv/**",
      "!**/training_venv/**",
      "!**/lora_adapters/**",
      "!**/adapters/**",
      "!**/llama.cpp/**"
    ]
  }
]
```

**Key Principles**:
1. **Virtual environments should NEVER be bundled** - they should be created on-the-fly during runtime
2. **llama.cpp should be installed dynamically** - the app has automatic installation capability
3. **User-generated content** (adapters, training outputs) should not be in the app bundle
4. **Only include essential Python scripts** - exclude all caches, outputs, and dependencies

**Expected Result**: Bundle size should return to ~210MB containing only:
- Core application code
- Essential Python scripts (without dependencies)
- UI assets and configurations

### 4. JavaScript Error: "Cannot find module 'b4a'"

**Problem**: After installation, the app crashes with:
```
Uncaught Exception: Error: Cannot find module 'b4a'
Require stack:
- C:\Users\user\AppData\Local\Programs\Orch-OS\resources\app.asar\dist-electron\main-BKe7Xabh.js
```

**Root Cause**: 
The `b4a` module is a Node.js dependency used by the P2P system (Hyperswarm) in the Electron main process. It was being marked as "external" in the Vite configuration, which means it wouldn't be bundled with the application, but it also wasn't being included in the final package.

**Solution**: 

#### Updated `package.json` electron-builder configuration:
```json
"files": [
  "dist/**/*",
  "dist-electron/**/*",
  "package.json",
  "electron/**/*",
  "scripts/**/*",
  "node_modules/b4a/**/*",
  "node_modules/hyperswarm/**/*", 
  "node_modules/hypercore-crypto/**/*"
],
"asarUnpack": [
  "**/*.node",
  "**/b4a/**",
  "**/hyperswarm/**",
  "**/hypercore-crypto/**"
]
```

**Technical Details**:
- The P2P modules (`b4a`, `hyperswarm`, `hypercore-crypto`) are kept as "external" in Vite config (correct for Node.js modules)
- They are explicitly included in the `files` array to ensure they're copied to the final package
- They are added to `asarUnpack` to ensure they're available outside the asar archive
- Result: Modules are available at `app.asar.unpacked/node_modules/` for the main process

**Verification**: After building, check that dependencies exist:
```bash
find release/mac-arm64 -name "b4a" -o -name "hyperswarm" -o -name "hypercore-crypto"
```

Should show:
```
release/mac-arm64/Orch-OS.app/Contents/Resources/app.asar.unpacked/node_modules/b4a
release/mac-arm64/Orch-OS.app/Contents/Resources/app.asar.unpacked/node_modules/hyperswarm
release/mac-arm64/Orch-OS.app/Contents/Resources/app.asar.unpacked/node_modules/hypercore-crypto
```

### 5. ReferenceError: require is not defined (Renderer Process)

**Problem**: App crashes with error in renderer process:
```
index-D4j7QW_O.js:7497 Uncaught ReferenceError: require is not defined
    at index-D4j7QW_O.js:7497:860
```

**Root Cause**: 
The `StorageService.ts` was being used in the renderer process but contained a `require("electron-store")` statement. When Vite bundles the renderer code, it includes this file, but the renderer process doesn't have access to `require` when `nodeIntegration: false` (which is correct for security).

**Solution**: 

#### Updated `src/services/StorageService.ts`:
```typescript
function getBackend() {
  const isInRenderer = isRenderer();

  // Para aplicações Electron, sempre usar localStorage no renderer
  // O electron-store será usado apenas no main process quando necessário
  if (isInRenderer || typeof window !== "undefined") {
    return {
      get: () => {
        // Use localStorage in renderer process
        const raw = window.localStorage.getItem(STORAGE_KEYS.SETTINGS_ROOT);
        return raw ? JSON.parse(raw) : {};
      },
      set: (data: UserSettings) => {
        // Save to localStorage in renderer process
        window.localStorage.setItem(STORAGE_KEYS.SETTINGS_ROOT, JSON.stringify(data));
        
        // Optional: sync with main process via IPC if available
        if (typeof window !== "undefined" && (window as any).electronAPI?.storage?.setUserSettings) {
          try {
            (window as any).electronAPI.storage.setUserSettings(data);
          } catch (error) {
            console.debug("📝 [STORAGE] IPC sync failed (expected in development):", error);
          }
        }
      },
    };
  } else {
    // Node.js environment: use in-memory fallback
    // The main process should use electron-store directly when needed
    let memoryStore = {};
    return {
      get: () => memoryStore,
      set: (data: UserSettings) => { memoryStore = data; },
    };
  }
}
```

**Key Changes**:
1. **Removed `require("electron-store")`** from StorageService.ts
2. **Always use localStorage in renderer** - this is the standard approach for Electron apps
3. **Added optional IPC sync** for future main process synchronization if needed
4. **Fallback to memory storage** in Node.js environments

**Benefits**:
- No more require() errors in renderer process
- Proper separation between renderer and main process storage
- Maintains compatibility with existing code
- Follows Electron security best practices

### 6. Path Resolution Issues
**Problem**: Application couldn't find resources after installation.

**Solution**: Updated path resolution in various services to use proper Windows paths.

## Testing
After applying these fixes:
1. Clean build: `npm run cleanup && npm run build`
2. Create installer: `npm run dist`
3. Verify executable size is ~210MB (not 11GB+)
4. Test installation on clean Windows system
5. Verify all shortcuts work properly
6. Test that P2P functionality works (no b4a errors)
7. Test that app starts without require errors
8. Test that user settings persist correctly
9. Test that llama.cpp installs automatically when needed

## Dependencies That Should Be Installed On-the-Fly
- **llama.cpp**: Installed automatically by the app when needed
- **Python dependencies**: Installed in virtual environments during runtime
- **LoRA training dependencies**: Created as needed per training session

## Never Bundle These
- Virtual environments (venv/, training_venv/)
- User-generated adapters (lora_adapters/, adapters/)
- Training outputs (lora_training_output/)
- Python cache files (__pycache__, .pytest_cache)
- Large binaries that can be downloaded (llama.cpp)

## Always Include These in Electron Package
- Core Node.js dependencies used by main process (b4a, hyperswarm, hypercore-crypto)
- Essential Python scripts (without their virtual environments)
- Application code and UI assets

## Security Best Practices Applied
- **nodeIntegration: false** - Renderer process doesn't have Node.js access
- **contextIsolation: true** - Renderer and main process are properly isolated
- **sandbox: true** - Additional security layer for renderer
- **localStorage for renderer storage** - Standard web API, no Node.js dependencies
- **IPC for main/renderer communication** - Secure communication channel 