// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// Main class
export { DependencyInstaller } from "./DependencyInstaller";
export type { AllDependenciesStatus } from "./DependencyInstaller";

// Interfaces
export type { DependencyStatus } from "./interfaces/IDependency";
export type {
  InstallProgress,
  ProgressStatus,
} from "./interfaces/IProgressReporter";

// Re-export for backward compatibility
export { DependencyInstaller as default } from "./DependencyInstaller";
