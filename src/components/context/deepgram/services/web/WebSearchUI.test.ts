// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { IUIUpdateService, WebSearchService } from "./WebSearchService";

/**
 * Mock UI Update Service for testing
 */
class MockUIUpdateService implements IUIUpdateService {
  public steps: Array<{ step: string; details?: string }> = [];

  updateProcessingStatus(message: string): void {
    console.log(`[PROCESSING] ${message}`);
  }

  notifyWebSearchStep(step: string, details?: string): void {
    this.steps.push({ step, details });
    console.log(`[WEB_SEARCH] ${step}${details ? ` - ${details}` : ""}`);
  }

  getSteps(): Array<{ step: string; details?: string }> {
    return this.steps;
  }

  clearSteps(): void {
    this.steps = [];
  }
}

/**
 * Test the web search UI feedback system
 */
export async function testWebSearchUIFeedback(): Promise<void> {
  console.log("🧪 Testing Web Search UI Feedback System");

  const mockUI = new MockUIUpdateService();
  const webSearchService = new WebSearchService(undefined, mockUI);

  // Test 1: Analyze search need with fallback
  console.log("\n📋 Test 1: Search analysis with fallback");
  mockUI.clearSteps();

  const decision = await webSearchService.analyzeSearchNeed(
    "Como está o tempo hoje?"
  );

  console.log("Steps recorded:", mockUI.getSteps());
  console.log("Decision:", decision);

  // Test 2: Process empty results
  console.log("\n📋 Test 2: Process empty results");
  mockUI.clearSteps();

  const emptyResult = await webSearchService.processSearchResults(
    [],
    "test query"
  );

  console.log("Steps recorded:", mockUI.getSteps());
  console.log("Result:", emptyResult);

  console.log("\n✅ Web Search UI Feedback tests completed");
}

// Export for use in other test files
export { MockUIUpdateService };

// Uncomment to run test directly
// testWebSearchUIFeedback().catch(console.error);
