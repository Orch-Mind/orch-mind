// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Re-export the refactored DependencyInstaller
 * This file maintains backward compatibility with the old API
 */
export * from "./dependency-installer";

// Re-export types for backward compatibility
export type { InstallProgress } from "./dependency-installer";

// For backward compatibility, export AllDependenciesStatus as DependencyStatus
import type { AllDependenciesStatus } from "./dependency-installer";
export type DependencyStatus = AllDependenciesStatus;

// For default export compatibility
export { DependencyInstaller as default } from "./dependency-installer";
