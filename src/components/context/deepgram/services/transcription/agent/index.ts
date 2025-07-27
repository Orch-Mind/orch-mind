// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Agent Module - Refactored AgentPromptProcessor
 * 
 * This module exports all agent components following SOLID principles:
 * - SRP: Single Responsibility Principle - each component has one job
 * - DRY: Don't Repeat Yourself - eliminated code duplication
 * - KISS: Keep It Simple, Stupid - simplified complex logic
 * - YAGNI: You Ain't Gonna Need It - removed unnecessary features
 */

// Main orchestrator class
export { AgentPromptProcessor } from "./AgentPromptProcessor";

// Types and interfaces
export * from "./types/AgentTypes";

// Core components
export { ResponseProcessor } from "./core/ResponseProcessor";
export { WebSearchAdapter } from "./core/WebSearchAdapter";

// Workspace management
export { ContextEngine } from "./workspace/ContextEngine";

// Action execution
export { ActionExecutor } from "./execution/ActionExecutor";

// Memory management
export { AgentMemoryManager } from "./memory/AgentMemoryManager";
