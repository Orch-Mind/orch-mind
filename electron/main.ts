// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import dotenv from "dotenv"
import { app, BrowserWindow, ipcMain, screen, shell } from "electron"
import path from "path"
import { OpenAIServiceFacade } from "../src/components/context/deepgram/services/openai/OpenAIServiceFacade"
import { initAutoUpdater } from "./autoUpdater"
import { DuckDBHelper } from "./DuckDBHelper"
import { initializeIpcHandlers } from "./ipcHandlers"
import { PineconeHelper } from "./PineconeHelper"
import { ShortcutsHelper } from "./shortcuts"

dotenv.config();

// Immediate console log to verify script execution
console.log("📱 Electron main.ts is executing...");

// Constants
const isDev = !app.isPackaged
console.log("🔧 Development mode:", isDev);

// Application State
const state = {
  // Window management properties
  mainWindow: null as BrowserWindow | null,
  isWindowVisible: false,
  windowPosition: null as { x: number; y: number } | null,
  windowSize: null as { width: number; height: number } | null,
  screenWidth: 0,
  screenHeight: 0,
  step: 0,
  currentX: 0,
  currentY: 0,

  // Application helpers
  shortcutsHelper: null as ShortcutsHelper | null,
  pineconeHelper: null as PineconeHelper | null,
  duckDBHelper: null as DuckDBHelper | null,
  openAIService: null as OpenAIServiceFacade | null,

  // Processing events
  PROCESSING_EVENTS: {
    NEURAL_START: "neural-start",
    NEURAL_STOP: "neural-stop",
    NEURAL_STARTED: "neural-started",
    NEURAL_STOPPED: "neural-stopped",
    NEURAL_ERROR: "neural-error",
    PROMPT_SEND: "prompt-send",
    ON_PROMPT_SEND: "on-prompt-send",
    PROMPT_SENDING: "prompt-sending",
    PROMPT_PARTIAL_RESPONSE: "prompt-partial-response",
    PROMPT_SUCCESS: "prompt-success",
    PROMPT_ERROR: "prompt-error",
    REALTIME_TRANSCRIPTION: "realtime-transcription",
    REALTIME_TRANSCRIPTION_INTERIM: "realtime-transcription-interim",
    SEND_CHUNK: "send-chunk",
    TOOGLE_RECORDING: "toggle-recording",
    CLEAR_TRANSCRIPTION: "clear-transcription",
    SET_DEEPGRAM_LANGUAGE: "set-deepgram-language",
  } as const
}

export interface IShortcutsHelperDeps {
  getMainWindow: () => BrowserWindow | null
  isVisible: () => boolean
  toggleMainWindow: () => void
}

export interface IIpcHandlerDeps {
  getMainWindow: () => BrowserWindow | null
  setWindowDimensions: (width: number, height: number) => void
  pineconeHelper: PineconeHelper | null
  duckDBHelper: DuckDBHelper | null
  PROCESSING_EVENTS: typeof state.PROCESSING_EVENTS
  toggleMainWindow: () => void
  openAIService: OpenAIServiceFacade | null
}

// Initialize helpers
function initializeHelpers() {
  state.shortcutsHelper = new ShortcutsHelper({
    getMainWindow,
    isVisible: () => state.isWindowVisible,
    toggleMainWindow
  })

  // Initialize memory services (Pinecone for cloud, DuckDB for local)
  state.pineconeHelper = new PineconeHelper()
  state.duckDBHelper = new DuckDBHelper()
  state.openAIService = new OpenAIServiceFacade()
}

// Chromium flags for WASM and WebGPU compatibility
if (isDev) {
  app.commandLine.appendSwitch('enable-features', 'SharedArrayBuffer,VaapiVideoDecodeLinuxGL');
  app.commandLine.appendSwitch('enable-unsafe-webgpu');
  app.commandLine.appendSwitch('enable-features', 'Vulkan');
} else {
  // Production - minimal flags for compatibility
  app.commandLine.appendSwitch('enable-features', 'SharedArrayBuffer');
  app.commandLine.appendSwitch('enable-unsafe-webgpu');
}

// Register the neural-coder protocol
if (process.platform === "darwin") {
  app.setAsDefaultProtocolClient("neural-coder")
} else {
  app.setAsDefaultProtocolClient("neural-coder", process.execPath, [
    path.resolve(process.argv[1] || "")
  ])
}

// Handle the protocol. In this case, we choose to show an Error Box.
if (process.defaultApp && process.argv.length >= 2) {
  app.setAsDefaultProtocolClient("neural-coder", process.execPath, [
    path.resolve(process.argv[1])
  ])
}

// Force Single Instance Lock - Unified implementation
console.log("🔒 Requesting single instance lock...");
const gotTheLock = app.requestSingleInstanceLock()
console.log("🔒 Got the lock:", gotTheLock);

if (!gotTheLock) {
  console.log("❌ Another instance is running, quitting...");
  app.quit()
} else {
  console.log("✅ Single instance lock acquired");
  
  // Handle second instance attempts
  app.on("second-instance", (event, commandLine) => {
    console.log("🔄 Second instance detected, focusing main window...");
    // Someone tried to run a second instance, we should focus our window.
    if (state.mainWindow) {
      if (state.mainWindow.isMinimized()) state.mainWindow.restore()
      state.mainWindow.focus()

      // Protocol handler for Windows
      if (process.platform === "win32") {
        // Keep only command line / deep linked arguments
        const deeplinkingUrl = commandLine.pop()
        if (deeplinkingUrl) {
          handleAuthCallback(deeplinkingUrl, state.mainWindow)
        }
      }
    } else {
      // If window doesn't exist, create it
      createWindow()
    }
    
    // Handle deep linking
    const url = commandLine.find((arg) => arg.startsWith("neural-coder://"))
    if (url) {
      handleAuthCallback(url, state.mainWindow)
    }
  })
}

async function handleAuthCallback(url: string, win: BrowserWindow | null) {
  try {
    console.log("Auth callback received:", url)
    const urlObj = new URL(url)
    const code = urlObj.searchParams.get("code")

    if (!code) {
      console.error("Missing code in callback URL")
      return
    }

    if (win) {
      // Send the code to the renderer for PKCE exchange
      win.webContents.send("auth-callback", { code })
    }
  } catch (error) {
    console.error("Error handling auth callback:", error)
  }
}

// Window management functions
async function createWindow(): Promise<void> {
  if (state.mainWindow) {
    if (state.mainWindow.isMinimized()) state.mainWindow.restore()
    state.mainWindow.focus()
    // In main.js/main.ts where you create your window
    state.mainWindow.on('close', () => console.log('Window closing'));
    state.mainWindow.on('closed', () => console.log('Window closed'));
    state.mainWindow.on('hide', () => console.log('Window hidden'));
    state.mainWindow.on('unresponsive', () => console.log('Window unresponsive'));
    return
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const workArea = primaryDisplay.workAreaSize
  state.screenWidth = workArea.width
  state.screenHeight = workArea.height
  state.step = 60
  state.currentY = 50

  const windowSettings: Electron.BrowserWindowConstructorOptions = {
    width: state.screenWidth, // Use entire screen width
    height: state.screenHeight, // Use entire screen height
    x: 0,
    y: 0,
    alwaysOnTop: true,
    webPreferences: {
      // Security configuration following Electron best practices
      sandbox: true, // Enable sandbox for security
      contextIsolation: true, // Critical for security
      nodeIntegration: false, // Disable Node.js in renderer
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      
      // Preload script
      preload: path.join(__dirname, "index.js"),
      scrollBounce: false,
      
      // Security settings
      webSecurity: true, // Keep web security enabled
      allowRunningInsecureContent: false, // Keep secure content policy
      experimentalFeatures: false, // Disable experimental features for security
      // GPU acceleration settings
      webgl: true,
      plugins: true,
      // Additional performance settings
      backgroundThrottling: false,
      // Enable hardware acceleration
      offscreen: false,
    },
    show: true,
    icon: path.join(__dirname, isDev ? "../public/icon.png" : "./icon.png"),
    titleBarOverlay: false,
    autoHideMenuBar: true,
    useContentSize: true,
    resizable: false,
    movable: true,
    minimizable: true,
    maximizable: true,
    closable: true,
    hasShadow: true,
    skipTaskbar: false, // Show in taskbar 
    // type: "panel", // Disable panel type for development
    // GPU performance configuration
    paintWhenInitiallyHidden: false,
    titleBarStyle: "default", // Default title bar for testing
    enableLargerThanScreen: false,
  }

  state.mainWindow = new BrowserWindow(windowSettings)

  // Set up CSP using session.defaultSession approach (YY-EN40P method)
  // This prevents the Electron security warning by setting CSP before window loads
  state.mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = {
      ...details.responseHeaders,
      'Cross-Origin-Opener-Policy': ['same-origin-allow-popups'],
      'Cross-Origin-Embedder-Policy': ['credentialless'],
      'Cross-Origin-Resource-Policy': ['cross-origin'],
      'Content-Security-Policy': [
        isDev 
          ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: https://cdn.jsdelivr.net; script-src-elem 'self' 'unsafe-inline' blob: https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' ws: wss: http://localhost:* https://cdn.jsdelivr.net https://huggingface.co https://*.huggingface.co https://api.openai.com https://*.pinecone.io; worker-src 'self' blob: data: https://cdn.jsdelivr.net; child-src 'self' blob:; object-src 'self' blob:;"
          : "default-src 'self'; script-src 'self' 'wasm-unsafe-eval' blob: https://cdn.jsdelivr.net; script-src-elem 'self' blob: https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://cdn.jsdelivr.net https://huggingface.co https://*.huggingface.co https://api.openai.com https://*.pinecone.io; worker-src 'self' blob: data: https://cdn.jsdelivr.net; child-src 'self' blob:; object-src 'self' blob:;"
      ]
    };

    callback({ responseHeaders });
  })

  // Add more detailed logging for window events
  state.mainWindow.webContents.on("did-finish-load", () => {
    console.log("Window finished loading")
  })
  state.mainWindow.webContents.on(
    "did-fail-load",
    async (event, errorCode, errorDescription) => {
      console.error("Window failed to load:", errorCode, errorDescription)
      if (isDev) {
        // In development, retry loading after a short delay
        console.log("Retrying to load development server...")
        setTimeout(() => {
          state.mainWindow?.loadURL("http://localhost:54321").catch((error) => {
            console.error("Failed to load dev server on retry:", error)
          })
        }, 1000)
      }
    }
  )

  if (isDev) {
    // In development, load from the dev server
    state.mainWindow.loadURL("http://localhost:54321").catch((error) => {
      console.error("Failed to load dev server:", error)
    })
  } else {
    // In production, load from the built files
    console.log(
      "Loading production build:",
      path.join(__dirname, "../dist/index.html")
    )
    state.mainWindow.loadFile(path.join(__dirname, "../dist/index.html"))
  }

  // Configure window behavior
  state.mainWindow.webContents.setZoomFactor(1)
  if (isDev) {
    state.mainWindow.webContents.openDevTools();
  }
  state.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    console.log("Attempting to open URL:", url)
    if (url.includes("google.com")) {
      shell.openExternal(url)
      return { action: "deny" }
    }
    return { action: "allow" }
  })

  // Enhanced screen capture resistance
  //state.mainWindow.setContentProtection(true)

  state.mainWindow.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true
  })
  state.mainWindow.setAlwaysOnTop(true, "screen-saver", 1)

  // Additional screen capture resistance settings
  if (process.platform === "darwin") {
    // Prevent window from being captured in screenshots
    state.mainWindow.setHiddenInMissionControl(true)
    state.mainWindow.setWindowButtonVisibility(false)

    // Prevent window from being included in window switcher
    state.mainWindow.setSkipTaskbar(true)

    // Disable window shadow
    state.mainWindow.setHasShadow(false)
  }

  // Prevent the window from being captured by screen recording
  state.mainWindow.webContents.setBackgroundThrottling(false)
  state.mainWindow.webContents.setFrameRate(60)

  // Set up window listeners
  state.mainWindow.on("closed", () => {
    state.mainWindow = null;
    state.isWindowVisible = false;
  })

  // Initialize window state
  const bounds = state.mainWindow.getBounds()
  state.windowPosition = { x: bounds.x, y: bounds.y }
  state.windowSize = { width: bounds.width, height: bounds.height }
  state.currentX = bounds.x
  state.currentY = bounds.y
  state.isWindowVisible = true

  // Listen for minimize requests from renderer
  ipcMain.on('minimize-window', () => {
    if (state.mainWindow && !state.mainWindow.isMinimized()) {
      state.mainWindow.minimize();
    }
  });

  // Listen for close requests from renderer
  ipcMain.on('close-window', () => {
    if (state.mainWindow && !state.mainWindow.isDestroyed()) {
      state.mainWindow.close();
    }
  });
}

// Window visibility functions
function hideMainWindow(): void {
  if (!state.mainWindow?.isDestroyed()) {
    const bounds = state.mainWindow?.getBounds()
    state.windowPosition = { x: bounds?.x || 0, y: bounds?.y || 0 }
    state.windowSize = { width: bounds?.width || 0, height: bounds?.height || 0 }
    state.mainWindow?.setIgnoreMouseEvents(true, { forward: true })
    state.mainWindow?.setAlwaysOnTop(true, "screen-saver", 1)
    state.mainWindow?.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true
    })
    state.mainWindow?.hide()
    state.isWindowVisible = false
  }
}

function showMainWindow(): void {
  if (!state.mainWindow?.isDestroyed()) {
    if (state.windowPosition && state.windowSize) {
      state.mainWindow?.setBounds({
        ...state.windowPosition,
        ...state.windowSize
      })
    }
    state.mainWindow?.setIgnoreMouseEvents(false)
    state.mainWindow?.setAlwaysOnTop(true, "screen-saver", 1)
    state.mainWindow?.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true
    })
   // state.mainWindow?.setContentProtection(true)
    state.mainWindow?.showInactive()
    state.isWindowVisible = true
  }
}

function toggleMainWindow(): void {
  state.isWindowVisible ? hideMainWindow() : showMainWindow()
}

function setWindowDimensions(width: number, height: number): void {
  if (!state.mainWindow?.isDestroyed()) {
    const [currentX, currentY] = state.mainWindow?.getPosition() || [0, 0]
    const primaryDisplay = screen.getPrimaryDisplay()
    const workArea = primaryDisplay.workAreaSize
    const maxWidth = Math.floor(workArea.width * 0.5)

    state.mainWindow?.setBounds({
      x: Math.min(currentX, workArea.width - maxWidth),
      y: currentY,
      width: Math.min(width + 32, maxWidth),
      height: Math.ceil(height)
    })
  }
}

function loadEnvVariables() {
  if (isDev) {
    console.log("Loading env variables from:", path.join(process.cwd(), ".env"))
    dotenv.config({ path: path.join(process.cwd(), ".env") })
  } else {
    console.log(
      "Loading env variables from:",
      path.join(process.resourcesPath, ".env")
    )
    dotenv.config({ path: path.join(process.resourcesPath, ".env") })
  }
}

async function initializeApp() {
  try {
    console.log("🚀 Starting application initialization...")
    loadEnvVariables()
    console.log("✅ Environment variables loaded")
    
    initializeHelpers()
    console.log("✅ Helpers initialized")
    
    initializeIpcHandlers({
      getMainWindow,
      setWindowDimensions,
      pineconeHelper: state.pineconeHelper,
      duckDBHelper: state.duckDBHelper,
      PROCESSING_EVENTS: state.PROCESSING_EVENTS,
      toggleMainWindow,
      openAIService: state.openAIService
    })
    console.log("✅ IPC handlers initialized")
    
    await createWindow()
    console.log("✅ Window created")
    
    state.shortcutsHelper?.registerGlobalShortcuts()
    console.log("✅ Global shortcuts registered")

    initAutoUpdater()
    console.log(
      "✅ Auto-updater initialized in",
      isDev ? "development" : "production",
      "mode"
    )
    
    console.log("🎉 Application fully initialized!")
  } catch (error) {
    console.error("❌ Failed to initialize application:", error)
    app.quit()
  }
}

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception in main process:', error);
  // Don't exit
});

// App event handlers
app.on("window-all-closed", () => {
  console.log("🪟 All windows closed");
  if (process.platform !== "darwin") {
    console.log("🚪 Quitting app (not macOS)");
    app.quit()
    state.mainWindow = null
  }
})

ipcMain.handle("get-env", (_event, key) => {
  return process.env[key] || null;
});

app.on("activate", () => {
  console.log("🔄 App activated");
  if (BrowserWindow.getAllWindows().length === 0) {
    console.log("🪟 No windows, creating new one");
    createWindow()
  }
})

function getMainWindow(): BrowserWindow | null {
  return state.mainWindow
}

function getPineconeHelper(): PineconeHelper | null {
  return state.pineconeHelper
}

function getDuckDBHelper(): DuckDBHelper | null {
  return state.duckDBHelper
}

export {
  createWindow, getDuckDBHelper, getMainWindow, getPineconeHelper, handleAuthCallback, hideMainWindow,
  setWindowDimensions, showMainWindow, toggleMainWindow
}

console.log("🔄 Setting up app.whenReady() handler...");
app.whenReady().then(() => {
  console.log("✅ App is ready! Calling initializeApp...");
  return initializeApp();
}).catch((error) => {
  console.error("❌ Error in app.whenReady():", error);
});