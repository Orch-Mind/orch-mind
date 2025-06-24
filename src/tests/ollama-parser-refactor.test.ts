// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { OllamaToolCallParser } from "../utils/OllamaToolCallParser";

describe("OllamaToolCallParser - Refatoração", () => {
  let parser: OllamaToolCallParser;

  beforeEach(() => {
    parser = new OllamaToolCallParser();
  });

  describe("Formato JSON Array (mistral:latest)", () => {
    it("deve parsear formato JSON array corretamente", () => {
      const content = `[{"name":"activateBrainArea","arguments":{"core":"communication","intensity":0.8,"symbolic_query":{"query":"saudação"}}}]`;

      const result = parser.parse(content);

      expect(result).toHaveLength(1);
      expect(result[0].function.name).toBe("activateBrainArea");
      expect(result[0].function.arguments).toEqual({
        core: "communication",
        intensity: 0.8,
        symbolic_query: { query: "saudação" },
      });
    });
  });

  describe("Formato Direct Call (gemma3:latest)", () => {
    it("deve parsear formato de chamada direta", () => {
      const content = `activateBrainArea(core:"communication", intensity:0.8, symbolic_query:{"query":"saudação e interação social em pt-BR"})`;

      const result = parser.parse(content);

      expect(result).toHaveLength(1);
      expect(result[0].function.name).toBe("activateBrainArea");
      expect((result[0].function.arguments as any).symbolic_query).toEqual({
        query: "saudação e interação social em pt-BR",
      });
    });

    it("deve lidar com symbolic_query válido sem warnings", () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const content = `activateBrainArea(core:"planning", symbolic_query:{"query":"teste"})`;

      parser.parse(content);

      // Não deve logar warnings para JSON válido
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("symbolic_query needs special parsing")
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Formato [TOOL_CALLS] (mistral-nemo)", () => {
    it("deve parsear formato TOOL_CALLS", () => {
      const content = `[TOOL_CALLS][{"name":"activateBrainArea","arguments":{"core":"memory","intensity":0.5}}]`;

      const result = parser.parse(content);

      expect(result).toHaveLength(1);
      expect(result[0].function.name).toBe("activateBrainArea");
    });
  });

  describe("Formato Markdown JSON", () => {
    it("deve parsear blocos ```json", () => {
      const content = `\`\`\`json
{"name":"activateBrainArea","arguments":{"core":"analysis","intensity":0.7}}
\`\`\``;

      const result = parser.parse(content);

      expect(result).toHaveLength(1);
      expect(result[0].function.name).toBe("activateBrainArea");
    });
  });

  describe("Métodos estáticos para compatibilidade", () => {
    it("looksLikeToolCall deve funcionar", () => {
      expect(OllamaToolCallParser.looksLikeToolCall("activateBrainArea(")).toBe(
        true
      );
      expect(OllamaToolCallParser.looksLikeToolCall("[TOOL_CALLS]")).toBe(true);
      expect(OllamaToolCallParser.looksLikeToolCall("random text")).toBe(false);
    });

    it("parseAlternativeFormats deve funcionar", () => {
      const content = `[{"name":"activateBrainArea","arguments":{"core":"test"}}]`;

      const result = OllamaToolCallParser.parseAlternativeFormats(content);

      expect(result).toHaveLength(1);
      expect(result[0].function.name).toBe("activateBrainArea");
      expect(result[0].function.arguments).toBe('{"core":"test"}');
    });
  });
});
