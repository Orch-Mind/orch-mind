// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// Central user config for the application
import { getUserName } from '../services/StorageService';

// Central user config for the application
export function getPrimaryUser(): string {
  // Symbolic: retrieves the primary user's name from storage cortex
  return getUserName();
}
