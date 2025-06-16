// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Structure for symbolic insights extracted from neural signals.
 * Core type definition for symbolic neural processing.
 */
export interface SymbolicInsight {
  type: string;
  content?: string;
  core?: string;
  keywords?: string[];
  [key: string]: string | number | boolean | object | undefined;
}
