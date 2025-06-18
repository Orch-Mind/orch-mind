// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useCallback } from "react";

interface DebugActions {
  debugDatabase?: (action: string, options?: any) => Promise<any>;
  testDatabaseDiagnosis?: () => Promise<any>;
  testEmbeddingModel?: () => Promise<void>;
}

/**
 * Hook for debug functions - only available in development
 * Following YAGNI principle - You Aren't Gonna Need It in production
 */
export function useDeepgramDebug(): DebugActions {
  const debugDatabase = useCallback(
    async (
      action: "count" | "inspect" | "debug" | "diagnose" = "count",
      options?: any
    ) => {
      if (process.env.NODE_ENV !== "development") {
        return null;
      }

      try {
        console.log(`🔍 [DEBUG] Executando ação de debug: ${action}`);

        const electronAPI = window.electronAPI as any;
        if (electronAPI?.duckdbCommand) {
          const result = await electronAPI.duckdbCommand(action, options || {});
          console.log(`✅ [DEBUG] Resultado do ${action}:`, result);
          return result;
        } else {
          console.warn(
            "⚠️ [DEBUG] duckdbCommand não disponível no electronAPI"
          );
          return null;
        }
      } catch (error) {
        console.error(`❌ [DEBUG] Erro ao executar ${action}:`, error);
        return null;
      }
    },
    []
  );

  const testDatabaseDiagnosis = useCallback(async () => {
    if (process.env.NODE_ENV !== "development") {
      return null;
    }

    console.log("🔍 Executando diagnóstico completo do banco de dados...");
    try {
      const diagnosis = await debugDatabase("diagnose");
      if (diagnosis) {
        console.log("📊 DIAGNÓSTICO COMPLETO:", diagnosis);
        console.log(
          "📈 Estatísticas por namespace:",
          diagnosis.embedding_analysis?.by_namespace
        );
        console.log("🔧 Info do sistema:", diagnosis.system_info);

        // Check for potential issues
        if (diagnosis.system_info?.db_type === "mock") {
          console.warn("⚠️ ALERTA: Usando banco MOCK - dados não persistem!");
        }

        if (diagnosis.embedding_analysis?.by_namespace?.length === 0) {
          console.warn(
            "⚠️ ALERTA: Nenhum embedding encontrado em qualquer namespace!"
          );
        }

        return diagnosis;
      }
    } catch (error) {
      console.error("❌ Erro durante diagnóstico:", error);
    }
    return null;
  }, [debugDatabase]);

  const testEmbeddingModel = useCallback(async () => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    console.log("🧪 Testando modelo de embeddings...");
    try {
      const testText = "This is a test sentence for embedding generation.";
      console.log("📝 Texto de teste:", testText);

      const electronAPI = window.electronAPI as any;
      if (electronAPI?.duckdbCommand) {
        const testVector = {
          id: "test-embedding-" + Date.now(),
          values: Array.from({ length: 384 }, () => Math.random()),
          metadata: { content: testText, test: true },
        };

        console.log("💾 Salvando embedding de teste...");
        const saveResult = await electronAPI.duckdbCommand("save", {
          vectors: [testVector],
          namespace: "test",
        });

        console.log("✅ Resultado do save:", saveResult);

        console.log("🔍 Buscando embedding salvo...");
        const queryResult = await electronAPI.duckdbCommand("query", {
          embedding: testVector.values,
          topK: 1,
          threshold: 0.1,
          namespace: "test",
        });

        console.log("✅ Resultado da busca:", queryResult);
        console.log("✅ Teste de embedding concluído com sucesso");
      }
    } catch (error) {
      console.error("❌ Erro durante teste de embedding:", error);
    }
  }, []);

  // Only return debug functions in development mode
  if (process.env.NODE_ENV !== "development") {
    return {};
  }

  return {
    testDatabaseDiagnosis,
    testEmbeddingModel,
  };
}
