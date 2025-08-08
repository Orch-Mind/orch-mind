// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { NotificationService } from "../../../../../../../shared/services/NotificationService";

/**
 * Utility class for showing notifications in the ShareSettings components
 * Provides consistent notification handling across the P2P sharing system
 * UPDATED: Now uses react-toastify for non-blocking notifications
 */
export class NotificationUtils {
  /**
   * Show success notification
   */
  static showSuccess(message: string): void {
    console.log(`✅ SUCCESS: ${message}`);
    NotificationService.success(`✅ ${message}`);
  }

  /**
   * Show error notification
   */
  static showError(message: string): void {
    console.error(`❌ ERROR: ${message}`);
    NotificationService.error(`❌ ${message}`);
  }

  /**
   * Show info notification
   */
  static showInfo(message: string): void {
    console.info(`ℹ️ INFO: ${message}`);
    NotificationService.info(`ℹ️ ${message}`);
  }

  /**
   * Show warning notification
   */
  static showWarning(message: string): void {
    console.warn(`⚠️ WARNING: ${message}`);
    NotificationService.warning(`⚠️ ${message}`);
  }
}
