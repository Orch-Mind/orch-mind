// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import dotenv from "dotenv";
import {
  app,
  BrowserWindow,
  ipcMain,
  net,
  protocol,
  screen,
  shell,
  systemPreferences,
} from "electron";
import path, { join } from "path";
import { IOpenAIService } from "../src/components/context/deepgram/interfaces/openai/IOpenAIService";
import { HuggingFaceServiceFacade } from "../src/components/context/deepgram/services/huggingface/HuggingFaceServiceFacade";
import { OpenAIServiceFacade } from "../src/components/context/deepgram/services/openai/OpenAIServiceFacade";
import { getOption, STORAGE_KEYS } from "../src/services/StorageService";
import { initAutoUpdater } from "./autoUpdater";
import { DuckDBHelper } from "./DuckDBHelper";
import { initializeIpcHandlers } from "./ipcHandlers";
import { PineconeHelper } from "./PineconeHelper";
import { ShortcutsHelper } from "./shortcuts";

dotenv.config();

// Immediate console log to verify script execution
console.log("📱 Electron main.ts is executing...");

// Memory optimization for AI/ML workloads - Set Node.js heap limits
// These must be set early before any heavy allocations
if (process.env.NODE_OPTIONS) {
  process.env.NODE_OPTIONS +=
    " --max-old-space-size=8192 --max-semi-space-size=256";
} else {
  process.env.NODE_OPTIONS =
    "--max-old-space-size=8192 --max-semi-space-size=256";
}

console.log("🧠 Memory optimization enabled - V8 heap limit: 8GB");

// Constants
const isDev = !app.isPackaged;
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
  openAIService: null as IOpenAIService | null,
  huggingFaceService: null as HuggingFaceServiceFacade | null,

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
  } as const,
};

export interface IShortcutsHelperDeps {
  getMainWindow: () => BrowserWindow | null;
  isVisible: () => boolean;
  toggleMainWindow: () => void;
}

export interface IIpcHandlerDeps {
  getMainWindow: () => BrowserWindow | null;
  setWindowDimensions: (width: number, height: number) => void;
  pineconeHelper: PineconeHelper | null;
  duckDBHelper: DuckDBHelper | null;
  PROCESSING_EVENTS: typeof state.PROCESSING_EVENTS;
  toggleMainWindow: () => void;
  openAIService: IOpenAIService | null;
}

// Initialize helpers
function initializeHelpers() {
  state.shortcutsHelper = new ShortcutsHelper({
    getMainWindow,
    isVisible: () => state.isWindowVisible,
    toggleMainWindow,
  });

  // Initialize memory services (Pinecone for cloud, DuckDB for local)
  state.pineconeHelper = new PineconeHelper();

  // Initialize DuckDB with custom path if configured
  try {
    const Store = require("electron-store").default;
    const store = new Store();
    const settings = store.get("orchos.user.settings", {});
    const customPath = settings.duckdbPath;

    if (customPath) {
      console.log(`📁 [MAIN] Using custom DuckDB path: ${customPath}`);
      state.duckDBHelper = new DuckDBHelper(customPath);
    } else {
      console.log(`📁 [MAIN] Using default DuckDB path`);
      state.duckDBHelper = new DuckDBHelper();
    }
  } catch (error) {
    console.warn(
      `⚠️ [MAIN] Could not load custom DuckDB path, using default:`,
      error
    );
    state.duckDBHelper = new DuckDBHelper();
  }

  // Initialize both services
  const openAIServiceFacade = new OpenAIServiceFacade();
  const huggingFaceServiceFacade = new HuggingFaceServiceFacade();
  state.huggingFaceService = huggingFaceServiceFacade;

  // Set the appropriate service based on application mode
  const mode = getOption(STORAGE_KEYS.APPLICATION_MODE) || "advanced";
  if (mode === "basic") {
    state.openAIService = huggingFaceServiceFacade;
    console.log("🧠 [MAIN] Using HuggingFaceServiceFacade (Basic mode)");
  } else {
    state.openAIService = openAIServiceFacade;
    console.log("🧠 [MAIN] Using OpenAIServiceFacade (Advanced mode)");
  }
}

// Enhanced Chromium flags for WASM, WebGPU compatibility and error suppression
// Reference: https://www.electronjs.org/docs/latest/development/build-instructions-macos
console.log("🔧 Configuring Chromium flags...");

// Simplified flags to avoid crashes and compatibility issues
const commonFlags = [
  // Essential for ONNX and transformers.js
  "enable-features=SharedArrayBuffer", // Required for WASM threads
  "enable-unsafe-webgpu", // Required for WebGPU models

  // Memory optimization for AI workloads (more conservative)
  "max-old-space-size=4096", // Reduce to 4GB to avoid memory issues
  "max-semi-space-size=128", // More conservative semi-space

  // Network and fetch improvements for model loading
  "disable-web-security", // Allow CORS for HuggingFace models in development
  "disable-features=VizDisplayCompositor", // Reduces GPU crashes

  // macOS specific fixes for crashes
  ...(process.platform === "darwin"
    ? [
        "no-sandbox", // Helps with SetApplicationIsDaemon errors
        "disable-gpu-sandbox", // Prevent GPU process crashes
        "disable-dev-shm-usage", // Prevent shared memory issues
        "disable-software-rasterizer", // Use hardware acceleration
      ]
    : []),
];

// Apply flags
commonFlags.forEach((flag) => {
  if (flag.includes("=")) {
    const [key, value] = flag.split("=", 2);
    app.commandLine.appendSwitch(key, value);
  } else {
    app.commandLine.appendSwitch(flag);
  }
});

// Development vs Production specific flags
if (isDev) {
  console.log("🛠️ Development mode - additional debugging flags");
  app.commandLine.appendSwitch("remote-debugging-port", "9222");
  app.commandLine.appendSwitch("ignore-certificate-errors");
} else {
  console.log("🚀 Production mode - optimized flags");
  app.commandLine.appendSwitch("disable-web-security");
  app.commandLine.appendSwitch("disable-features", "VizDisplayCompositor");
}

// Suppress known harmless Node.js deprecation warning
process.removeAllListeners("warning");
process.on("warning", (warning) => {
  if (
    warning.name === "DeprecationWarning" &&
    warning.message.includes("punycode")
  ) {
    return; // Suppress punycode deprecation warning
  }
  console.warn(warning.message);
});

// Note: System warnings from macOS/Chromium cannot be suppressed
// These are harmless and documented as expected behavior:
// - SetApplicationIsDaemon errors (macOS system)
// - Camera continuity warnings (macOS features not used)
// - Dawn WebGPU deprecation notices (Chromium graphics)
// - DevTools autofill errors (development only)
// - Punycode deprecation (Node.js dependency warning)

// Register the neural-coder protocol
if (process.platform === "darwin") {
  app.setAsDefaultProtocolClient("neural-coder");
} else {
  app.setAsDefaultProtocolClient("neural-coder", process.execPath, [
    path.resolve(process.argv[1] || ""),
  ]);
}

// Handle the protocol. In this case, we choose to show an Error Box.
if (process.defaultApp && process.argv.length >= 2) {
  app.setAsDefaultProtocolClient("neural-coder", process.execPath, [
    path.resolve(process.argv[1]),
  ]);
}

// Force Single Instance Lock - Unified implementation
console.log("🔒 Requesting single instance lock...");
const gotTheLock = app.requestSingleInstanceLock();
console.log("🔒 Got the lock:", gotTheLock);

if (!gotTheLock) {
  console.log("❌ Another instance is running, quitting...");
  app.quit();
} else {
  console.log("✅ Single instance lock acquired");

  // Handle second instance attempts
  app.on("second-instance", (event, commandLine) => {
    console.log("🔄 Second instance detected, focusing main window...");
    // Someone tried to run a second instance, we should focus our window.
    if (state.mainWindow) {
      if (state.mainWindow.isMinimized()) state.mainWindow.restore();
      state.mainWindow.focus();

      // Protocol handler for Windows
      if (process.platform === "win32") {
        // Keep only command line / deep linked arguments
        const deeplinkingUrl = commandLine.pop();
        if (deeplinkingUrl) {
          handleAuthCallback(deeplinkingUrl, state.mainWindow);
        }
      }
    } else {
      // If window doesn't exist, create it
      createWindow();
    }

    // Handle deep linking
    const url = commandLine.find((arg) => arg.startsWith("neural-coder://"));
    if (url) {
      handleAuthCallback(url, state.mainWindow);
    }
  });
}

async function handleAuthCallback(url: string, win: BrowserWindow | null) {
  try {
    console.log("Auth callback received:", url);
    const urlObj = new URL(url);
    const code = urlObj.searchParams.get("code");

    if (!code) {
      console.error("Missing code in callback URL");
      return;
    }

    if (win) {
      // Send the code to the renderer for PKCE exchange
      win.webContents.send("auth-callback", { code });
    }
  } catch (error) {
    console.error("Error handling auth callback:", error);
  }
}

// Set up environment variables for HuggingFace and transformers.js cache
const userDataPath = app.getPath("userData");
process.env.HF_HOME = join(userDataPath, "huggingface");
process.env.TRANSFORMERS_CACHE = join(userDataPath, "transformers-cache");
process.env.HF_HUB_CACHE = join(userDataPath, "huggingface", "hub");

console.log("🔧 [Electron] Environment variables set:");
console.log("  HF_HOME:", process.env.HF_HOME);
console.log("  TRANSFORMERS_CACHE:", process.env.TRANSFORMERS_CACHE);
console.log("  HF_HUB_CACHE:", process.env.HF_HUB_CACHE);

// Window management functions
async function createWindow(): Promise<void> {
  if (state.mainWindow) {
    if (state.mainWindow.isMinimized()) state.mainWindow.restore();
    state.mainWindow.focus();
    // In main.js/main.ts where you create your window
    state.mainWindow.on("close", () => console.log("Window closing"));
    state.mainWindow.on("closed", () => console.log("Window closed"));
    state.mainWindow.on("hide", () => console.log("Window hidden"));
    state.mainWindow.on("unresponsive", () =>
      console.log("Window unresponsive")
    );
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const workArea = primaryDisplay.workAreaSize;
  state.screenWidth = workArea.width;
  state.screenHeight = workArea.height;
  state.step = 60;
  state.currentY = 50;

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
      offscreen: false,

      // DevTools error suppression
      devTools: isDev,

      // Memory optimization for large AI models
      spellcheck: false, // Disable spellcheck to save memory
      enableBlinkFeatures: "SharedArrayBuffer,WebAssembly", // Enable required features

      // Additional WebPreferences to suppress errors and optimize memory
      additionalArguments: [
        "--disable-features=AutofillAssistant",
        "--disable-autofill-assistant-logging",
        // Memory and performance flags specific to renderer process
        "--max-old-space-size=4096", // 4GB for renderer process
        "--initial-old-space-size=1024", // 1GB initial for renderer
        "--expose-gc", // Allow garbage collection in renderer
        "--enable-precise-memory-info", // Enable memory monitoring
        "--aggressive-cache-discard", // Discard unused caches
        "--enable-gpu-memory-buffer-video-frames", // Use GPU memory for video
      ],
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
  };

  state.mainWindow = new BrowserWindow(windowSettings);

  // Enhanced DevTools error suppression
  if (isDev) {
    state.mainWindow.webContents.once("dom-ready", () => {
      // Inject JavaScript to suppress DevTools autofill errors
      state.mainWindow?.webContents
        .executeJavaScript(
          `
        // Suppress DevTools protocol errors
        const originalError = console.error;
        console.error = function(...args) {
          const message = args.join(' ');
          if (
            message.includes('Autofill.enable') ||
            message.includes('Autofill.setAddresses') ||
            message.includes('protocol_client')
          ) {
            return; // Suppress autofill protocol errors
          }
          originalError.apply(console, args);
        };

        // Suppress Dawn warnings and macOS camera warnings
        const originalWarn = console.warn;
        console.warn = function(...args) {
          const message = args.join(' ');
          if (
            message.includes('DawnExperimentalSubgroupLimits') ||
            message.includes('use AdapterPropertiesSubgroups instead') ||
            message.includes('NSCameraUseContinuityCameraDeviceType') ||
            message.includes('AVCaptureDeviceTypeExternal is deprecated')
          ) {
            return; // Suppress these warnings
          }
          originalWarn.apply(console, args);
        };
      `
        )
        .catch(() => {
          // Ignore injection errors
        });
    });
  }

  // Set up CSP using session.defaultSession approach (YY-EN40P method)
  // This prevents the Electron security warning by setting CSP before window loads
  state.mainWindow.webContents.session.webRequest.onHeadersReceived(
    { urls: ["*://*/*"] },
    (details, callback) => {
      const responseHeaders = {
        ...details.responseHeaders,
        "Cross-Origin-Opener-Policy": ["same-origin-allow-popups"],
        "Cross-Origin-Embedder-Policy": ["credentialless"],
        "Cross-Origin-Resource-Policy": ["cross-origin"],
        "Content-Security-Policy": [
          isDev
            ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: data: https://cdn.jsdelivr.net https://unpkg.com; script-src-elem 'self' 'unsafe-inline' blob: data: https://cdn.jsdelivr.net https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' ws: wss: http://localhost:* https://cdn.jsdelivr.net https://unpkg.com https://huggingface.co https://*.huggingface.co https://*.hf.co https://hf.co https://hub-ci.huggingface.co https://cdn-lfs.huggingface.co https://cdn-lfs-us-1.hf.co https://cdn-lfs-eu-1.hf.co https://cdn-lfs.hf.co https://cas-bridge.xethub.hf.co https://cas-server.xethub.hf.co https://transfer.xethub.hf.co https://api.openai.com https://*.pinecone.io; worker-src 'self' blob: data: https://cdn.jsdelivr.net https://unpkg.com; child-src 'self' blob:; object-src 'self' blob:; media-src 'self' data: blob:; manifest-src 'self' https://huggingface.co https://*.huggingface.co https://*.hf.co; frame-src 'none';"
            : "default-src 'self'; script-src 'self' 'wasm-unsafe-eval' blob: data: https://cdn.jsdelivr.net https://unpkg.com; script-src-elem 'self' blob: data: https://cdn.jsdelivr.net https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://cdn.jsdelivr.net https://unpkg.com https://huggingface.co https://*.huggingface.co https://*.hf.co https://hf.co https://hub-ci.huggingface.co https://cdn-lfs.huggingface.co https://cdn-lfs-us-1.hf.co https://cdn-lfs-eu-1.hf.co https://cdn-lfs.hf.co https://cas-bridge.xethub.hf.co https://cas-server.xethub.hf.co https://transfer.xethub.hf.co https://api.openai.com https://*.pinecone.io; worker-src 'self' blob: data: https://cdn.jsdelivr.net https://unpkg.com; child-src 'self' blob:; object-src 'self' blob:; media-src 'self' data: blob:; manifest-src 'self' https://huggingface.co https://*.huggingface.co https://*.hf.co; frame-src 'none';",
        ],
      };

      callback({ responseHeaders });
    }
  );

  // Enhanced error handling and recovery for dev server connection
  state.mainWindow.webContents.on("did-finish-load", () => {
    console.log("✅ Window finished loading successfully");
  });

  state.mainWindow.webContents.on(
    "did-fail-load",
    async (event, errorCode, errorDescription, validatedURL) => {
      console.warn(
        `⚠️ Failed to load: ${errorCode} - ${errorDescription} (${validatedURL})`
      );

      if (isDev && errorCode === -3) {
        // ERR_ABORTED
        console.log(
          "🔄 Development server connection aborted, implementing retry logic..."
        );

        // Wait for dev server to be ready with exponential backoff
        let retryCount = 0;
        const maxRetries = 5;
        const baseDelay = 1000;

        const retryLoad = async () => {
          if (retryCount >= maxRetries) {
            console.error(
              "❌ Max retries reached. Please check if Vite dev server is running on port 54321"
            );
            return;
          }

          retryCount++;
          const delay = baseDelay * Math.pow(2, retryCount - 1);
          console.log(`🔄 Retry ${retryCount}/${maxRetries} in ${delay}ms...`);

          setTimeout(async () => {
            try {
              await state.mainWindow?.loadURL("http://localhost:54321");
              console.log("✅ Successfully connected to dev server");
            } catch (error) {
              console.warn(`⚠️ Retry ${retryCount} failed:`, error);
              await retryLoad();
            }
          }, delay);
        };

        await retryLoad();
      }
    }
  );

  // Enhanced loading with better error handling
  if (isDev) {
    console.log("🛠️ Loading development server...");
    try {
      await state.mainWindow.loadURL("http://localhost:54321");
    } catch (error) {
      console.warn(
        "⚠️ Initial dev server load failed (this is normal), retry logic will handle it:",
        error
      );
    }
  } else {
    // In production, load from the built files
    const prodPath = path.join(__dirname, "../dist/index.html");
    console.log("🚀 Loading production build:", prodPath);
    await state.mainWindow.loadFile(prodPath);
  }

  // Configure window behavior
  state.mainWindow.webContents.setZoomFactor(1);
  if (isDev) {
    state.mainWindow.webContents.openDevTools();
  }
  state.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    console.log("🔗 Attempting to open URL:", url);
    if (url.includes("google.com")) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  // Enhanced screen capture resistance
  //state.mainWindow.setContentProtection(true)

  state.mainWindow.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
  });
  state.mainWindow.setAlwaysOnTop(true, "screen-saver", 1);

  // Additional screen capture resistance settings
  if (process.platform === "darwin") {
    // Prevent window from being captured in screenshots
    state.mainWindow.setHiddenInMissionControl(true);
    state.mainWindow.setWindowButtonVisibility(false);

    // Prevent window from being included in window switcher
    state.mainWindow.setSkipTaskbar(true);

    // Disable window shadow
    state.mainWindow.setHasShadow(false);
  }

  // Prevent the window from being captured by screen recording
  state.mainWindow.webContents.setBackgroundThrottling(false);
  state.mainWindow.webContents.setFrameRate(60);

  // Set up window listeners
  state.mainWindow.on("closed", () => {
    state.mainWindow = null;
    state.isWindowVisible = false;
  });

  // Initialize window state
  const bounds = state.mainWindow.getBounds();
  state.windowPosition = { x: bounds.x, y: bounds.y };
  state.windowSize = { width: bounds.width, height: bounds.height };
  state.currentX = bounds.x;
  state.currentY = bounds.y;
  state.isWindowVisible = true;

  // Listen for minimize requests from renderer
  ipcMain.on("minimize-window", () => {
    if (state.mainWindow && !state.mainWindow.isMinimized()) {
      state.mainWindow.minimize();
    }
  });

  // Listen for close requests from renderer
  ipcMain.on("close-window", () => {
    if (state.mainWindow && !state.mainWindow.isDestroyed()) {
      state.mainWindow.close();
    }
  });

  // Configure session with enhanced security and cache settings
  state.mainWindow.webContents.session.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      console.log(`🔒 [MAIN] Permission request for: ${permission}`);

      // Allow specific permissions needed for audio/video capture
      const allowedPermissions = [
        "camera",
        "microphone",
        "media",
        "audioCapture",
        "videoCapture",
        "desktop-capture",
      ];

      const granted = allowedPermissions.includes(permission);
      console.log(
        `🔒 [MAIN] Permission ${permission}: ${granted ? "GRANTED" : "DENIED"}`
      );

      callback(granted);
    }
  );

  // Also set permission check handler for additional safety
  state.mainWindow.webContents.session.setPermissionCheckHandler(
    (webContents, permission, requestingOrigin) => {
      console.log(
        `🔍 [MAIN] Permission check for ${permission} from ${requestingOrigin}`
      );

      const allowedPermissions = [
        "camera",
        "microphone",
        "media",
        "audioCapture",
        "videoCapture",
      ];

      return allowedPermissions.includes(permission);
    }
  );

  // Note: CSP is already configured via webContents.session.webRequest.onHeadersReceived above
  // This section removed to prevent conflicting CSP headers
}

// Window visibility functions
function hideMainWindow(): void {
  if (!state.mainWindow?.isDestroyed()) {
    const bounds = state.mainWindow?.getBounds();
    state.windowPosition = { x: bounds?.x || 0, y: bounds?.y || 0 };
    state.windowSize = {
      width: bounds?.width || 0,
      height: bounds?.height || 0,
    };
    state.mainWindow?.setIgnoreMouseEvents(true, { forward: true });
    state.mainWindow?.setAlwaysOnTop(true, "screen-saver", 1);
    state.mainWindow?.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
    });
    state.mainWindow?.hide();
    state.isWindowVisible = false;
  }
}

function showMainWindow(): void {
  if (!state.mainWindow?.isDestroyed()) {
    if (state.windowPosition && state.windowSize) {
      state.mainWindow?.setBounds({
        ...state.windowPosition,
        ...state.windowSize,
      });
    }
    state.mainWindow?.setIgnoreMouseEvents(false);
    state.mainWindow?.setAlwaysOnTop(true, "screen-saver", 1);
    state.mainWindow?.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
    });
    // state.mainWindow?.setContentProtection(true)
    state.mainWindow?.showInactive();
    state.isWindowVisible = true;
  }
}

function toggleMainWindow(): void {
  state.isWindowVisible ? hideMainWindow() : showMainWindow();
}

function setWindowDimensions(width: number, height: number): void {
  if (!state.mainWindow?.isDestroyed()) {
    const [currentX, currentY] = state.mainWindow?.getPosition() || [0, 0];
    const primaryDisplay = screen.getPrimaryDisplay();
    const workArea = primaryDisplay.workAreaSize;
    const maxWidth = Math.floor(workArea.width * 0.5);

    state.mainWindow?.setBounds({
      x: Math.min(currentX, workArea.width - maxWidth),
      y: currentY,
      width: Math.min(width + 32, maxWidth),
      height: Math.ceil(height),
    });
  }
}

function loadEnvVariables() {
  if (isDev) {
    const envPath = path.join(process.cwd(), ".env");
    console.log("Loading env variables from:", envPath);
    dotenv.config({ path: envPath });
  } else {
    const envPath = path.join(process.resourcesPath, ".env");
    console.log("Loading env variables from:", envPath);
    dotenv.config({ path: envPath });
  }
}

async function initializeApp() {
  try {
    console.log("🚀 Starting application initialization...");
    loadEnvVariables();
    console.log("✅ Environment variables loaded");

    initializeHelpers();
    console.log("✅ Helpers initialized");

    initializeIpcHandlers({
      getMainWindow,
      setWindowDimensions,
      pineconeHelper: state.pineconeHelper,
      duckDBHelper: state.duckDBHelper,
      PROCESSING_EVENTS: state.PROCESSING_EVENTS,
      toggleMainWindow,
      openAIService: state.openAIService,
    });
    console.log("✅ IPC handlers initialized");

    await createWindow();
    console.log("✅ Window created");

    state.shortcutsHelper?.registerGlobalShortcuts();
    console.log("✅ Global shortcuts registered");

    initAutoUpdater();
    console.log(
      "✅ Auto-updater initialized in",
      isDev ? "development" : "production",
      "mode"
    );

    console.log("🎉 Application fully initialized!");
  } catch (error) {
    console.error("❌ Failed to initialize application:", error);
    app.quit();
  }
}

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception in main process:", error);
  // Don't exit
});

// App event handlers
app.on("window-all-closed", () => {
  console.log("🪟 All windows closed");
  if (process.platform !== "darwin") {
    console.log("🚪 Quitting app (not macOS)");
    app.quit();
    state.mainWindow = null;
  }
});

ipcMain.handle("get-env", (_event, key) => {
  return process.env[key] || null;
});

ipcMain.handle(
  "get-path",
  (_event, name: "userData" | "temp" | "desktop" | "documents") => {
    try {
      return app.getPath(name);
    } catch (error) {
      console.error(`Failed to get path for '${name}':`, error);
      return null;
    }
  }
);

// Handle microphone permission requests
ipcMain.handle("request-microphone-permission", async () => {
  return await requestMicrophonePermission();
});

// Add new function to request microphone permissions for macOS
async function requestMicrophonePermission(): Promise<{
  success: boolean;
  status: string;
  error?: string;
}> {
  try {
    if (process.platform !== "darwin") {
      // On non-macOS platforms, permissions are handled by the browser
      return { success: true, status: "granted" };
    }

    console.log("🎤 [MAIN] Checking microphone permission on macOS...");

    // Check current permission status
    const status = systemPreferences.getMediaAccessStatus("microphone");
    console.log(`🎤 [MAIN] Current microphone permission status: ${status}`);

    if (status === "granted") {
      return { success: true, status: "granted" };
    }

    if (status === "denied") {
      return {
        success: false,
        status: "denied",
        error:
          "Microphone access denied. Please enable microphone access in System Preferences > Security & Privacy > Privacy > Microphone and add this application.",
      };
    }

    if (status === "not-determined") {
      console.log("🎤 [MAIN] Requesting microphone permission...");

      try {
        const granted = await systemPreferences.askForMediaAccess("microphone");

        if (granted) {
          console.log("✅ [MAIN] Microphone permission granted by user");
          return { success: true, status: "granted" };
        } else {
          console.log("❌ [MAIN] Microphone permission denied by user");
          return {
            success: false,
            status: "denied",
            error:
              "User denied microphone access. Please grant permission when prompted or enable it in System Preferences.",
          };
        }
      } catch (permissionError) {
        console.error(
          "❌ [MAIN] Error requesting microphone permission:",
          permissionError
        );
        return {
          success: false,
          status: "error",
          error: `Failed to request microphone permission: ${
            permissionError instanceof Error
              ? permissionError.message
              : "Unknown error"
          }`,
        };
      }
    }

    // Unknown status
    return {
      success: false,
      status: "unknown",
      error: `Unknown permission status: ${status}`,
    };
  } catch (error) {
    console.error("❌ [MAIN] Error checking microphone permissions:", error);
    return {
      success: false,
      status: "error",
      error: `Permission check failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

app.on("activate", () => {
  console.log("🔄 App activated");
  if (BrowserWindow.getAllWindows().length === 0) {
    console.log("🪟 No windows, creating new one");
    createWindow();
  }
});

function getMainWindow(): BrowserWindow | null {
  return state.mainWindow;
}

function getPineconeHelper(): PineconeHelper | null {
  return state.pineconeHelper;
}

function getDuckDBHelper(): DuckDBHelper | null {
  return state.duckDBHelper;
}

export {
  createWindow,
  getDuckDBHelper,
  getMainWindow,
  getPineconeHelper,
  handleAuthCallback,
  hideMainWindow,
  setWindowDimensions,
  showMainWindow,
  toggleMainWindow,
};

// Register custom protocol schemes before app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: "model", privileges: { bypassCSP: false, supportFetchAPI: true } },
]);

console.log("🔄 Setting up app.whenReady() handler...");
app
  .whenReady()
  .then(() => {
    // Register protocol handler after app is ready
    protocol.handle("model", (request) => {
      const url = new URL(request.url);
      const relative = url.pathname.replace(/^\/+/, "");
      const filePath = path.join(app.getPath("userData"), "models", relative);
      // devolve um Response que o protocolo entende
      return net.fetch(`file://${filePath}`);
    });

    console.log("✅ App is ready! Calling initializeApp...");
    return initializeApp();
  })
  .catch((error) => {
    console.error("❌ Error in app.whenReady():", error);
  });
