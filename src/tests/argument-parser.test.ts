// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { ArgumentParser } from "../utils/ollama-parsers/parsers/helpers/ArgumentParser";

describe("ArgumentParser", () => {
  describe("parseArguments", () => {
    it("deve parsear argumentos simples", () => {
      const args = 'core:"communication", intensity:0.8';
      const result = ArgumentParser.parseArguments(args);

      expect(result).toEqual({
        core: "communication",
        intensity: 0.8,
      });
    });

    it("deve parsear symbolic_query como objeto JSON", () => {
      const args =
        'symbolic_query:{"query":"saudação e interação social em pt-BR"}';
      const result = ArgumentParser.parseArguments(args);

      expect(result.symbolic_query).toEqual({
        query: "saudação e interação social em pt-BR",
      });
    });

    it("deve lidar com braces aninhados em JSON", () => {
      const args = 'symbolic_query:{"query":"test {with} nested braces"}';
      const result = ArgumentParser.parseArguments(args);

      expect(result.symbolic_query).toEqual({
        query: "test {with} nested braces",
      });
    });

    it("deve parsear múltiplos argumentos complexos", () => {
      const args =
        'core:"planning", intensity:0.9, symbolic_query:{"query":"análise com {contexto} complexo"}, keywords:["análise", "contexto"]';
      const result = ArgumentParser.parseArguments(args);

      expect(result).toEqual({
        core: "planning",
        intensity: 0.9,
        symbolic_query: { query: "análise com {contexto} complexo" },
        keywords: ["análise", "contexto"],
      });
    });

    it("deve suportar separador = além de :", () => {
      const args = "deterministic=true, temperature=0.8";
      const result = ArgumentParser.parseArguments(args);

      expect(result).toEqual({
        deterministic: true,
        temperature: 0.8,
      });
    });
  });
});
