// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Utility class for showing notifications in the ShareSettings components
 * Provides consistent notification handling across the P2P sharing system
 */
export class NotificationUtils {
  /**
   * Show success notification
   */
  static showSuccess(message: string): void {
    console.log(`✅ SUCCESS: ${message}`);

    // In a real implementation, this would integrate with a toast system
    // For now, we'll use console logging with visual indicators
    if (typeof window !== "undefined" && window.alert) {
      // Temporary implementation using alert for immediate feedback
      window.alert(`✅ ${message}`);
    }
  }

  /**
   * Show error notification
   */
  static showError(message: string): void {
    console.error(`❌ ERROR: ${message}`);

    // In a real implementation, this would integrate with a toast system
    // For now, we'll use console logging with visual indicators
    if (typeof window !== "undefined" && window.alert) {
      // Temporary implementation using alert for immediate feedback
      window.alert(`❌ ${message}`);
    }
  }

  /**
   * Show info notification
   */
  static showInfo(message: string): void {
    console.info(`ℹ️ INFO: ${message}`);

    // In a real implementation, this would integrate with a toast system
    // For now, we'll use console logging with visual indicators
    if (typeof window !== "undefined" && window.alert) {
      // Temporary implementation using alert for immediate feedback
      window.alert(`ℹ️ ${message}`);
    }
  }

  /**
   * Show warning notification
   */
  static showWarning(message: string): void {
    console.warn(`⚠️ WARNING: ${message}`);

    // In a real implementation, this would integrate with a toast system
    // For now, we'll use console logging with visual indicators
    if (typeof window !== "undefined" && window.alert) {
      // Temporary implementation using alert for immediate feedback
      window.alert(`⚠️ ${message}`);
    }
  }
}
