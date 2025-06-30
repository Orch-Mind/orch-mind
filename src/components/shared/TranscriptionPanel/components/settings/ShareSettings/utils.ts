// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// DRY: Centralized utility functions
export class ShareUtils {
  // DRY: File size formatting in one place
  static formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024)
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
  }

  // DRY: Crypto operations centralized
  static async hashString(input: string): Promise<string> {
    const crypto = window.crypto;
    const data = new TextEncoder().encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // DRY: Topic generation logic
  static async generateLocalNetworkTopic(): Promise<string> {
    const networkId = "local-network"; // TODO: Get real network ID
    return this.hashString(`orch-os-local-${networkId}`);
  }

  static async codeToTopic(code: string): Promise<string> {
    return this.hashString(`orch-os-room-${code}`);
  }

  static generateAdapterTopic(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  // DRY: Room code generation
  static generateFriendlyCode(): string {
    const words = [
      "MUSIC",
      "PIZZA",
      "COFFEE",
      "BOOKS",
      "GAMES",
      "ART",
      "SPACE",
      "OCEAN",
    ];
    const word = words[Math.floor(Math.random() * words.length)];
    const number = Math.floor(Math.random() * 999)
      .toString()
      .padStart(3, "0");
    return `${word}-${number}`;
  }

  // DRY: Room type utilities
  static getRoomIcon(type: string): string {
    switch (type) {
      case "general":
        return "🌍";
      case "local":
        return "📡";
      case "private":
        return "🔒";
      default:
        return "❓";
    }
  }

  static getRoomName(type: string, code?: string): string {
    switch (type) {
      case "general":
        return "Community Room";
      case "local":
        return "Local Network";
      case "private":
        return `Room ${code}`;
      default:
        return "Unknown";
    }
  }
}

// KISS: Simple notification utilities
export class NotificationUtils {
  // Global flag to suppress notifications during auto-restoration
  static silentMode: boolean = false;

  static setSilentMode(silent: boolean): void {
    this.silentMode = silent;
    console.log(
      `🔕 [NOTIFICATIONS] Silent mode ${silent ? "enabled" : "disabled"}`
    );
  }

  static showError(message: string, forceSilent?: boolean): void {
    if (this.silentMode || forceSilent) {
      console.log(`🔕 [SILENT-ERROR] ${message}`);
      return;
    }
    // TODO: Replace with proper toast notification
    alert(`❌ ${message}`);
  }

  static showSuccess(message: string, forceSilent?: boolean): void {
    if (this.silentMode || forceSilent) {
      console.log(`🔕 [SILENT-SUCCESS] ${message}`);
      return;
    }
    // TODO: Replace with proper toast notification
    alert(`✅ ${message}`);
  }
}

// DRY: Clipboard utilities with fallback support
export class ClipboardUtils {
  /**
   * Copy text to clipboard with robust permission handling and fallback support
   * Following MDN best practices for browser compatibility
   * @param text Text to copy
   * @returns Promise<boolean> Success status
   */
  static async copyToClipboard(text: string): Promise<boolean> {
    // Try different approaches in order of preference
    const modernSuccess = await this.tryClipboardWithPermission(text);
    if (modernSuccess) return true;

    const directSuccess = await this.tryClipboardDirect(text);
    if (directSuccess) return true;

    // Use fallback method
    const fallbackSuccess = this.fallbackCopyToClipboard(text);
    if (fallbackSuccess) {
      console.log("💡 Copy successful via compatibility fallback method");
    }

    return fallbackSuccess;
  }

  /**
   * Try clipboard API with explicit permission request
   */
  private static async tryClipboardWithPermission(
    text: string
  ): Promise<boolean> {
    try {
      // Check if we're in a secure context (HTTPS/Electron)
      if (!this.isSecureContext()) {
        return false;
      }

      // Check for clipboard API availability
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        return false;
      }

      // Request permission explicitly
      if (navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({
            name: "clipboard-write" as PermissionName,
          });
          if (permission.state === "denied") {
            console.log("🚫 Clipboard permission denied, using fallback");
            return false;
          }
        } catch (permError) {
          // Permission API not supported or failed, continue anyway
          console.log(
            "⚠️ Permission API not available, trying direct clipboard access"
          );
        }
      }

      await navigator.clipboard.writeText(text);
      console.log("✅ Text copied using Clipboard API with permission");
      return true;
    } catch (error) {
      // Only log debug info for expected permission errors
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        console.debug("🔒 Clipboard API permission denied, trying fallback");
      } else {
        console.warn("❌ Clipboard API with permission failed:", error);
      }
      return false;
    }
  }

  /**
   * Try clipboard API directly (might work in some contexts)
   */
  private static async tryClipboardDirect(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        console.log("✅ Text copied using direct Clipboard API");
        return true;
      }
      return false;
    } catch (error) {
      // Only log debug info for expected permission errors
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        console.debug(
          "🔒 Clipboard API blocked by permissions policy, trying fallback"
        );
      } else {
        console.warn("❌ Direct Clipboard API failed:", error);
      }
      return false;
    }
  }

  /**
   * Check if we're in a secure context (HTTPS or Electron)
   */
  private static isSecureContext(): boolean {
    return (
      window.isSecureContext || // Standard check
      location.protocol === "https:" || // HTTPS
      location.hostname === "localhost" || // Localhost
      location.protocol === "file:" || // Electron
      // @ts-ignore - Electron specific
      typeof window.electronAPI !== "undefined" // Electron detection
    );
  }

  /**
   * Fallback copy method using document.execCommand
   * As recommended by MDN for browser compatibility
   * Enhanced with better element handling and error recovery
   */
  private static fallbackCopyToClipboard(text: string): boolean {
    let textArea: HTMLTextAreaElement | null = null;

    try {
      // Create temporary textarea element
      textArea = document.createElement("textarea");
      textArea.value = text;

      // Enhanced positioning to ensure it works across all contexts
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "-9999px";
      textArea.style.width = "1px";
      textArea.style.height = "1px";
      textArea.style.padding = "0";
      textArea.style.border = "none";
      textArea.style.outline = "none";
      textArea.style.boxShadow = "none";
      textArea.style.background = "transparent";
      textArea.setAttribute("readonly", ""); // Prevent mobile keyboard

      document.body.appendChild(textArea);

      // Focus and select with better cross-browser support
      textArea.focus();
      textArea.setSelectionRange(0, text.length);

      // Additional selection for iOS
      if (navigator.userAgent.match(/ipad|ipod|iphone/i)) {
        const range = document.createRange();
        range.selectNodeContents(textArea);
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
        textArea.setSelectionRange(0, text.length);
      }

      // Use execCommand to copy
      const successful = document.execCommand("copy");

      if (successful) {
        console.log("✅ Text copied using execCommand fallback");
        return true;
      } else {
        console.error("❌ execCommand copy failed");
        // Last resort: try to give user manual copy option
        this.showManualCopyFallback(text);
        return false;
      }
    } catch (error) {
      console.error("❌ Fallback copy failed:", error);
      this.showManualCopyFallback(text);
      return false;
    } finally {
      // Ensure cleanup happens regardless of success/failure
      if (textArea && textArea.parentNode) {
        document.body.removeChild(textArea);
      }
    }
  }

  /**
   * Last resort: show manual copy option when all automated methods fail
   */
  private static showManualCopyFallback(text: string): void {
    // Create a simple prompt for manual copy as absolute last resort
    try {
      const message = `Copy failed automatically. Please manually copy this code:\n\n${text}`;

      // On mobile or when available, try to at least show the text in a way user can select
      if (
        confirm(
          `${message}\n\nClick OK to see the code in an alert you can select from.`
        )
      ) {
        // Show in prompt so user can select and copy manually
        prompt("Copy this code manually:", text);
      }
    } catch (error) {
      console.error("❌ Even manual copy fallback failed:", error);
    }
  }

  /**
   * User-friendly copy with automatic notifications and visual feedback
   * @param text Text to copy
   * @param successMessage Custom success message
   * @param onStart Optional callback when copy starts
   * @param onComplete Optional callback when copy completes (success or failure)
   */
  static async copyWithFeedback(
    text: string,
    successMessage: string = "Copied to clipboard!",
    onStart?: () => void,
    onComplete?: (success: boolean) => void
  ): Promise<boolean> {
    // Call start callback for visual feedback
    if (onStart) {
      onStart();
    }

    try {
      const success = await this.copyToClipboard(text);

      if (success) {
        NotificationUtils.showSuccess(successMessage);
      } else {
        NotificationUtils.showError(
          "Failed to copy to clipboard. Please try manually copying the code."
        );
      }

      // Call complete callback
      if (onComplete) {
        onComplete(success);
      }

      return success;
    } catch (error) {
      console.error("❌ Copy with feedback failed:", error);
      NotificationUtils.showError("Copy operation failed");

      if (onComplete) {
        onComplete(false);
      }

      return false;
    }
  }
}
