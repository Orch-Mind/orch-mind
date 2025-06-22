// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { NeuralSignal } from "../components/context/deepgram/interfaces/neural/NeuralSignalTypes";
import { IOpenAIService } from "../components/context/deepgram/interfaces/openai/IOpenAIService";
import { NeuralSignalEnricher } from "../components/context/deepgram/services/transcription/processors/NeuralSignalEnricher";

// Mock implementation for testing
class MockOpenAIService implements Partial<IOpenAIService> {
  private processingDelay = 100; // ms delay to simulate API call
  public shouldFail = false;

  async enrichSemanticQuery(
    signals: Array<{
      core: string;
      query: string;
      intensity: number;
      context?: string;
    }>,
    language?: string
  ): Promise<Array<{ enrichedQuery: string; keywords: string[] }>> {
    if (this.shouldFail) {
      throw new Error("Batch processing failed");
    }

    // Batch processing is more efficient - single delay for all signals
    await new Promise((resolve) => setTimeout(resolve, this.processingDelay));

    return signals.map((signal) => ({
      enrichedQuery: `Batch Enriched: ${signal.query} (${signal.core})${
        language ? ` [${language}]` : ""
      }`,
      keywords: ["batch", "keyword1", "keyword2", signal.core],
    }));
  }
}

describe("Batch Enrichment Performance Test", () => {
  let enricher: NeuralSignalEnricher;
  let mockService: MockOpenAIService;

  beforeEach(() => {
    mockService = new MockOpenAIService();
    enricher = new NeuralSignalEnricher(
      mockService as unknown as IOpenAIService
    );
  });

  it("should process multiple signals efficiently with batch processing", async () => {
    // Create test signals
    const testSignals: NeuralSignal[] = [
      {
        core: "memory",
        intensity: 0.8,
        symbolic_query: { query: "remember the conversation" },
        keywords: [],
        topK: 10,
      },
      {
        core: "valence",
        intensity: 0.6,
        symbolic_query: { query: "positive emotions" },
        keywords: [],
        topK: 8,
      },
      {
        core: "creativity",
        intensity: 0.9,
        symbolic_query: { query: "generate new ideas" },
        keywords: [],
        topK: 12,
      },
    ];

    console.log("\n=== Batch Enrichment Test ===\n");
    console.log(`Testing with ${testSignals.length} neural signals...\n`);

    // Test batch processing
    const startTime = Date.now();
    const results = await enricher.enrichSignals(testSignals, "en");
    const endTime = Date.now() - startTime;

    console.log(`Batch Processing Time: ${endTime}ms`);
    console.log(
      `Average time per signal: ${(endTime / testSignals.length).toFixed(2)}ms`
    );

    // Verify results are properly enriched
    expect(results.length).toBe(testSignals.length);
    results.forEach((result, index) => {
      expect(result.symbolic_query?.query).toContain("Batch Enriched:");
      expect(result.symbolic_query?.query).toContain(
        `(${testSignals[index].core})`
      );
      expect(result.symbolic_query?.query).toContain("[en]");
      expect(result.keywords).toBeDefined();
      expect(result.keywords?.length).toBe(4);
      expect(result.keywords).toContain(testSignals[index].core);
      expect(result.topK).toBe(testSignals[index].topK);
      expect(result.core).toBe(testSignals[index].core);
      expect(result.intensity).toBe(testSignals[index].intensity);
    });
  });

  it("should handle empty signal array", async () => {
    const results = await enricher.enrichSignals([], "en");
    expect(results).toEqual([]);
  });

  it("should fallback gracefully when batch method fails", async () => {
    // Make batch method throw an error
    mockService.shouldFail = true;

    const testSignals: NeuralSignal[] = [
      {
        core: "memory",
        intensity: 0.8,
        symbolic_query: { query: "test query" },
        keywords: [],
        topK: 10,
      },
    ];

    // Should return signals with original queries as fallback
    const results = await enricher.enrichSignals(testSignals, "en");
    expect(results.length).toBe(1);
    expect(results[0].symbolic_query?.query).toBe("test query");
    expect(results[0].topK).toBe(10);
    expect(results[0].core).toBe("memory");
  });

  it("should calculate topK when not provided", async () => {
    const testSignals: NeuralSignal[] = [
      {
        core: "memory",
        intensity: 0.5,
        symbolic_query: { query: "test query" },
        keywords: [],
        // topK not provided
      },
      {
        core: "creativity",
        intensity: 1.0,
        symbolic_query: { query: "creative query" },
        keywords: [],
        topK: NaN, // Invalid topK
      },
    ];

    const results = await enricher.enrichSignals(testSignals, "en");

    // topK should be calculated as Math.round(5 + intensity * 10)
    expect(results[0].topK).toBe(10); // 5 + 0.5 * 10 = 10
    expect(results[1].topK).toBe(15); // 5 + 1.0 * 10 = 15
  });

  it("should handle signals with context", async () => {
    const testSignals: NeuralSignal[] = [
      {
        core: "memory",
        intensity: 0.8,
        symbolic_query: { query: "remember with context" },
        keywords: [],
        topK: 10,
        // Note: context is passed through batchData mapping in NeuralSignalEnricher
      },
    ];

    const results = await enricher.enrichSignals(testSignals, "pt");

    expect(results[0].symbolic_query?.query).toContain("[pt]");
    expect(results[0].keywords).toBeDefined();
    expect(results[0].keywords?.length).toBeGreaterThan(0);
  });

  it("should preserve filters and other signal properties", async () => {
    const testSignals: NeuralSignal[] = [
      {
        core: "memory",
        intensity: 0.8,
        symbolic_query: {
          query: "test query",
          filters: { type: "episodic" },
        },
        keywords: [],
        topK: 10,
        filters: { category: "personal" },
        symbolicInsights: { depth: "surface" },
      },
    ];

    const results = await enricher.enrichSignals(testSignals, "en");

    expect(results[0].filters).toEqual({ category: "personal" });
    expect(results[0].symbolicInsights).toEqual({ depth: "surface" });
    expect(results[0].symbolic_query?.filters).toEqual({ type: "episodic" });
  });

  it("should handle partial enrichment failures", async () => {
    // Mock that returns fewer enrichments than signals
    mockService.enrichSemanticQuery = async (signals) => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      // Return only first enrichment
      return [
        {
          enrichedQuery: "Enriched first signal",
          keywords: ["test"],
        },
      ];
    };

    const testSignals: NeuralSignal[] = [
      {
        core: "memory",
        intensity: 0.8,
        symbolic_query: { query: "first query" },
        keywords: [],
        topK: 10,
      },
      {
        core: "creativity",
        intensity: 0.9,
        symbolic_query: { query: "second query" },
        keywords: [],
        topK: 12,
      },
    ];

    const results = await enricher.enrichSignals(testSignals, "en");

    // First signal should be enriched
    expect(results[0].symbolic_query?.query).toBe("Enriched first signal");
    expect(results[0].keywords).toEqual(["test"]);

    // Second signal should keep original query
    expect(results[1].symbolic_query?.query).toBe("second query");
    expect(results[1].keywords).toEqual([]);
  });
});
