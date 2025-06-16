// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { memo, useState } from "react";
import { OrchOSModeEnum } from "../../../../../services/ModeService";
import {
  getOption,
  setOption,
  STORAGE_KEYS,
} from "../../../../../services/StorageService";

import { BasicModeSettings, OllamaSettings } from "./api";
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
    applicationMode,
    setApplicationMode,
    ollamaModel,
    setOllamaModel,
    ollamaEmbeddingModel,
    setOllamaEmbeddingModel,
    ollamaEnabled,
    setOllamaEnabled,
  }) => {
    // Estado para configurações avançadas
    const [duckDbPath, setDuckDbPath] = useState<string>(
      () => getOption<string>(STORAGE_KEYS.DUCKDB_PATH) || "./orch-os-memory"
    );

    const [toolsEnabled, setToolsEnabled] = useState<boolean>(
      () => getOption<boolean>(STORAGE_KEYS.TOOLS_ENABLED) ?? true
    );

    // AI model options for HuggingFace (modo básico)
    const HF_MODELS = [
      {
        id: "Xenova/llama2.c-stories15M",
        label: "Llama2.c Stories (~15MB) - Ultra pequeno",
      },
      {
        id: "Xenova/distilgpt2",
        label: "DistilGPT-2 (~353MB) - Otimizado",
      },
      {
        id: "Xenova/gpt2",
        label: "GPT-2 Base (~548MB) - Estável",
      },
      {
        id: "Xenova/TinyLlama-1.1B-Chat-v1.0",
        label: "TinyLlama Chat (~1.1B) - Modelo de chat",
      },
    ];

    // Lista de modelos de embedding compatíveis (modo básico)
    const HF_EMBEDDING_MODELS = [
      {
        id: "Xenova/all-MiniLM-L6-v2",
        label: "all-MiniLM-L6-v2 (MiniLM 384d) — Recomendado",
      },
    ];

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

    // Handler para atualização do modelo HuggingFace (modo básico)
    const handleHfModelChange = (value: string) => {
      setOption(STORAGE_KEYS.HF_MODEL, value);
    };

    // Handler para atualização do modelo de embedding HuggingFace (modo básico)
    const handleHfEmbeddingModelChange = (value: string) => {
      setOption(STORAGE_KEYS.HF_EMBEDDING_MODEL, value);
    };

    // Renderização condicional baseada no modo da aplicação
    if (applicationMode === OrchOSModeEnum.BASIC) {
      return (
        <div className="space-y-4">
          {/* Header explicativo para modo básico */}
          <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-green-500/20">
                <span className="text-green-400 text-sm">🤗</span>
              </div>
              <div>
                <h3 className="text-green-400 font-medium">
                  Modo Basic - HuggingFace
                </h3>
                <p className="text-green-400/70 text-sm">
                  Modelos leves executados via Transformers.js no navegador
                </p>
              </div>
            </div>
          </div>

          <BasicModeSettings
            applicationMode={applicationMode}
            setApplicationMode={setApplicationMode}
            hfModel=""
            setHfModel={handleHfModelChange}
            hfEmbeddingModel=""
            setHfEmbeddingModel={handleHfEmbeddingModelChange}
            hfModelOptions={HF_MODELS}
            hfEmbeddingModelOptions={HF_EMBEDDING_MODELS}
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col w-full space-y-6">
        {/* Header explicativo para modo avançado */}
        <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-cyan-500/20">
              <span className="text-cyan-400 text-sm">🦙</span>
            </div>
            <div>
              <h3 className="text-cyan-400 font-medium">
                Modo Advanced - Configurações Completas
              </h3>
              <p className="text-cyan-400/70 text-sm">
                Ollama, banco de dados e configurações avançadas
              </p>
            </div>
          </div>
        </div>

        {/* Seção Ollama - Modelos Locais */}
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

        {/* Botão para voltar ao modo básico */}
        <div className="flex justify-end">
          <button
            type="button"
            className="bg-gradient-to-r from-green-500/20 to-blue-500/20 text-green-300 border border-green-500/30 rounded-lg px-6 py-2 hover:from-green-500/30 hover:to-blue-500/30 transition-all shadow-[0_0_10px_rgba(0,255,100,0.2)] backdrop-blur-sm"
            onClick={() => setApplicationMode(OrchOSModeEnum.BASIC)}
          >
            🤗 Switch to Basic Mode (HuggingFace)
          </button>
        </div>
      </div>
    );
  }
);

export default ApiSettings;
