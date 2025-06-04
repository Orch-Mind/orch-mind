// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import dotenv from "dotenv"
import { app, BrowserWindow, ipcMain, screen, shell } from "electron"
import path from "path"
import { OpenAIService } from "../src/components/context/deepgram/services/openai/OpenAIService"
import { initAutoUpdater } from "./autoUpdater"
import { initializeIpcHandlers } from "./ipcHandlers"
import { DuckDBHelper } from "./DuckDBHelper"
import { PineconeHelper } from "./PineconeHelper"
import { ShortcutsHelper } from "./shortcuts"

dotenv.config();
// Constants
const isDev = !app.isPackaged

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
  openAIService: null as OpenAIService | null,

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
  openAIService: OpenAIService | null
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
  state.openAIService = new OpenAIService()
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

// Force Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on("second-instance", (event, commandLine) => {
    // Someone tried to run a second instance, we should focus our window.
    if (state.mainWindow) {
      if (state.mainWindow.isMinimized()) state.mainWindow.restore()
      state.mainWindow.focus()

      // Protocol handler for state.mainWindow32
      // argv: An array of the second instance's (command line / deep linked) arguments
      if (process.platform === "win32") {
        // Keep only command line / deep linked arguments
        const deeplinkingUrl = commandLine.pop()
        if (deeplinkingUrl) {
          handleAuthCallback(deeplinkingUrl, state.mainWindow)
        }
      }
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
      nodeIntegration: false,
      contextIsolation: true,
      preload: isDev
        ? path.join(__dirname, "../dist-electron/preload.js")
        : path.join(__dirname, "preload.js"),
      scrollBounce: false,
    },
    show: true,
    frame: false,
    transparent: true,
    fullscreenable: false,
    hasShadow: false,
    backgroundColor: "#00000000",
    focusable: true,
    skipTaskbar: true,
    type: "panel",
    paintWhenInitiallyHidden: true,
    titleBarStyle: "hidden",
    enableLargerThanScreen: true,
    movable: true
  }

  state.mainWindow = new BrowserWindow(windowSettings)

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
    state.mainWindow.setBackgroundColor("#00000000")

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
    state.mainWindow?.setOpacity(0)
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
    state.mainWindow?.setOpacity(0)
    state.mainWindow?.showInactive()
    state.mainWindow?.setOpacity(1)
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
    loadEnvVariables()
    initializeHelpers()
    initializeIpcHandlers({
      getMainWindow,
      setWindowDimensions,
      pineconeHelper: state.pineconeHelper,
      duckDBHelper: state.duckDBHelper,
      PROCESSING_EVENTS: state.PROCESSING_EVENTS,
      toggleMainWindow,
      openAIService: state.openAIService
    })
    
    await createWindow()
    state.shortcutsHelper?.registerGlobalShortcuts()

    initAutoUpdater()
    console.log(
      "Auto-updater initialized in",
      isDev ? "development" : "production",
      "mode"
    )
  } catch (error) {
    console.error("Failed to initialize application:", error)
    app.quit()
  }
}

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception in main process:', error);
  // Don't exit
});

app.on("second-instance", (event, commandLine) => {
  console.log("second-instance event received:", commandLine)
  const url = commandLine.find((arg) => arg.startsWith("neural-coder://"))
  if (url) {
    handleAuthCallback(url, state.mainWindow)
  }

  // Focus or create the main window
  if (!state.mainWindow) {
    createWindow()
  } else {
    if (state.mainWindow.isMinimized()) state.mainWindow.restore()
    state.mainWindow.focus()
  }
})

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit()
      state.mainWindow = null
    }
  })
}

ipcMain.handle("get-env", (_event, key) => {
  return process.env[key] || null;
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
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
  createWindow, getMainWindow, getPineconeHelper, getDuckDBHelper, handleAuthCallback, hideMainWindow,
  setWindowDimensions, showMainWindow, toggleMainWindow
}

app.whenReady().then(initializeApp)