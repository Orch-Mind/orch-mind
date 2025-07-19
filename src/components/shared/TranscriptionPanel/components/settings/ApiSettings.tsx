// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { memo, useState } from "react";
import {
  getOption,
  setOption,
  STORAGE_KEYS,
} from "../../../../../services/StorageService";

import { OllamaSettings } from "./api";
import { ApiSettingsProps } from "./api/types";

/**
 * Componente orquestrador para configurações de APIs externas
 * Arquitetura de modos:
 * - Modo Basic: HuggingFace (modelos leves via Transformers.js)
 * - Modo Advanced: Ollama + configurações avançadas (interface unificada)
 *
 * Refatorado seguindo princípios SOLID:
 * - Single Responsibility Principle: cada subcomponente tem responsabilidade única
 * - Open/Closed Principle: aberto para extensão, fechado para modificação
 * - Liskov Substitution: interfaces consistentes entre componentes
 * - Interface Segregation: interfaces específicas para cada tipo de configuração
 * - Dependency Inversion: depende de abstrações, não implementações concretas
 */
const ApiSettings: React.FC<ApiSettingsProps> = memo(
  ({
    ollamaModel,
    setOllamaModel,
    ollamaEmbeddingModel,
    setOllamaEmbeddingModel,
    ollamaEnabled,
    setOllamaEnabled,
  }) => {
    // Estado para configurações avançadas
    const [duckDbPath, setDuckDbPath] = useState<string>(
      () => getOption<string>(STORAGE_KEYS.DUCKDB_PATH) || "./orch-mind-memory"
    );

    // Handler para seleção de diretório DuckDB
    const handleBrowseDirectory = async () => {
      try {
        if (typeof window !== "undefined" && (window as any).electronAPI) {
          const result = await (window as any).electronAPI.selectDirectory();

          if (result.success && result.path) {
            const newPath = result.path;
            setDuckDbPath(newPath);
            setOption(STORAGE_KEYS.DUCKDB_PATH, newPath);
            console.log("📁 [SETTINGS] DuckDB path updated:", newPath);

            // Reinicializar DuckDB com o novo caminho
            try {
              const reinitResult = await (
                window as any
              ).electronAPI.reinitializeDuckDB(newPath);
              if (reinitResult.success) {
                console.log(
                  "✅ [SETTINGS] DuckDB successfully reinitialized with new path"
                );
              } else {
                console.error(
                  "❌ [SETTINGS] Failed to reinitialize DuckDB:",
                  reinitResult.error
                );
              }
            } catch (reinitError) {
              console.error(
                "❌ [SETTINGS] Error reinitializing DuckDB:",
                reinitError
              );
            }
          } else if (!result.canceled) {
            console.error(
              "❌ [SETTINGS] Failed to select directory:",
              result.error
            );
          }
        } else {
          console.warn(
            "⚠️ [SETTINGS] Directory selection not available in web mode"
          );
        }
      } catch (error) {
        console.error("❌ [SETTINGS] Error selecting directory:", error);
      }
    };

    // Handler para mudança manual do caminho DuckDB
    const handlePathChange = async (newPath: string) => {
      setDuckDbPath(newPath);
      setOption(STORAGE_KEYS.DUCKDB_PATH, newPath);

      // Reinicializar DuckDB apenas se estamos no Electron e o caminho não está vazio
      if (
        typeof window !== "undefined" &&
        (window as any).electronAPI &&
        newPath.trim()
      ) {
        try {
          const reinitResult = await (
            window as any
          ).electronAPI.reinitializeDuckDB(newPath);
          if (reinitResult.success) {
            console.log(
              "✅ [SETTINGS] DuckDB successfully reinitialized with new path"
            );
          } else {
            console.error(
              "❌ [SETTINGS] Failed to reinitialize DuckDB:",
              reinitResult.error
            );
          }
        } catch (reinitError) {
          console.error(
            "❌ [SETTINGS] Error reinitializing DuckDB:",
            reinitError
          );
        }
      }
    };

    return (
      <div className="flex flex-col w-full space-y-6">
        <OllamaSettings
          ollamaModel={ollamaModel}
          setOllamaModel={(value) => {
            setOllamaModel(value);
            setOption(STORAGE_KEYS.OLLAMA_MODEL, value);
          }}
          ollamaEmbeddingModel={ollamaEmbeddingModel}
          setOllamaEmbeddingModel={(value) => {
            setOllamaEmbeddingModel(value);
            setOption(STORAGE_KEYS.OLLAMA_EMBEDDING_MODEL, value);
          }}
          ollamaEnabled={ollamaEnabled}
          setOllamaEnabled={(value) => {
            setOllamaEnabled(value);
            setOption(STORAGE_KEYS.OLLAMA_ENABLED, value);
          }}
          storagePath={duckDbPath}
          setStoragePath={(path) => {
            handlePathChange(path);
          }}
        />
      </div>
    );
  }
);

export default ApiSettings;
