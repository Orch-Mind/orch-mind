// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { buildSignalFromArgs } from "../shared/utils/neuralSignalParser";

describe("neuralSignalParser", () => {
  describe("buildSignalFromArgs", () => {
    describe("symbolic_query handling", () => {
      it("should handle valid JSON string without warnings", () => {
        const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

        const args = {
          core: "communication",
          intensity: 0.8,
          symbolic_query: '{"query":"saudação e interação social em pt-BR"}',
          keywords: ["saudação", "interação"],
        };

        const result = buildSignalFromArgs(args);

        expect(result).toBeTruthy();
        expect(result?.symbolic_query).toEqual({
          query: "saudação e interação social em pt-BR",
        });

        // Should not log any warnings for valid JSON
        expect(consoleSpy).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
      });

      it("should handle object symbolic_query", () => {
        const args = {
          core: "emotion",
          intensity: 0.7,
          symbolic_query: { query: "emoção e sentimento em pt-BR" },
          keywords: ["emoção", "sentimento"],
        };

        const result = buildSignalFromArgs(args);

        expect(result).toBeTruthy();
        expect(result?.symbolic_query).toEqual({
          query: "emoção e sentimento em pt-BR",
        });
      });

      it("should handle empty object and use fallback", () => {
        const consoleSpy = jest.spyOn(console, "log").mockImplementation();

        const args = {
          core: "memory",
          intensity: 0.5,
          symbolic_query: {},
          keywords: [],
        };

        const result = buildSignalFromArgs(args, "test prompt");

        expect(result).toBeTruthy();
        expect(result?.symbolic_query?.query).toBe("test prompt");

        // Should log about using default
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining("Empty object, using default query")
        );

        consoleSpy.mockRestore();
      });

      it("should fix malformed JSON with object: instead of query:", () => {
        const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

        const args = {
          core: "analysis",
          intensity: 0.6,
          symbolic_query: '{object:"missing quotes"}',
          keywords: [],
        };

        const result = buildSignalFromArgs(args);

        expect(result).toBeTruthy();
        expect(result?.symbolic_query).toEqual({
          query: "missing quotes",
        });

        // Should log about applying fixes
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining("Applied formatting fixes")
        );

        consoleSpy.mockRestore();
      });

      it("should handle completely invalid format", () => {
        const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

        const args = {
          core: "planning",
          intensity: 0.9,
          symbolic_query: "not even close to JSON",
          keywords: [],
        };

        const result = buildSignalFromArgs(args, "fallback prompt");

        expect(result).toBeTruthy();
        expect(result?.symbolic_query?.query).toBe("fallback prompt");

        // Should log about needing special parsing
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining("needs special parsing")
        );

        consoleSpy.mockRestore();
      });

      it("should handle llama3.1 format with type instead of query", () => {
        const consoleSpy = jest.spyOn(console, "log").mockImplementation();

        const args = {
          core: "reasoning",
          intensity: 0.8,
          symbolic_query: { type: "question" },
          keywords: ["reasoning"],
        };

        const result = buildSignalFromArgs(args, "user question");

        expect(result).toBeTruthy();
        expect(result?.symbolic_query?.query).toBe("user question");

        // Should log about finding type instead of query
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining("Found 'type' instead of 'query'")
        );

        consoleSpy.mockRestore();
      });
    });

    describe("edge cases", () => {
      it("should handle missing core field", () => {
        const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

        const args = {
          intensity: 0.5,
          symbolic_query: { query: "test" },
        };

        const result = buildSignalFromArgs(args);

        expect(result).toBeNull();
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining("Missing core field")
        );

        consoleSpy.mockRestore();
      });

      it("should ensure query is never empty", () => {
        const args = {
          core: "memory",
          symbolic_query: { query: "   " }, // whitespace only
          keywords: ["memory", "recall"],
        };

        const result = buildSignalFromArgs(args);

        expect(result).toBeTruthy();
        expect(result?.symbolic_query?.query).toBe(
          "memory activation for user input"
        );
      });
    });
  });
});
