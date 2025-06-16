// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import {
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import React, { useCallback, useEffect, useState } from "react";

/* ------------------------------------------------------------------
 * Local helper types & globals
 * ------------------------------------------------------------------ */
// Lightweight copy of the vLLM status type (avoids deep relative import)
type VllmStatus = {
  state:
    | "idle"
    | "downloading"
    | "pulling_image"
    | "starting"
    | "ready"
    | "error";
  progress?: number;
  message?: string;
  modelId?: string;
};

// Static model definitions as requested by the user
const AVAILABLE_MODELS: OllamaModel[] = [
  // Main models that support tools/function calling
  {
    id: "qwen3:4b",
    name: "Qwen3 4B",
    description: "Advanced reasoning model with tools support",
    size: "2.6GB",
    category: "main",
    isDownloaded: false,
    isDownloading: false,
  },
  {
    id: "mistral:latest",
    name: "Mistral Latest",
    description: "Fast and efficient model with tools support",
    size: "4.1GB",
    category: "main",
    isDownloaded: false,
    isDownloading: false,
  },
  {
    id: "mistral-nemo:latest",
    name: "Mistral Nemo",
    description: "Optimized Mistral variant for tools and function calling",
    size: "5.5GB",
    category: "main",
    isDownloaded: false,
    isDownloading: false,
  },
  {
    id: "llama3.2:latest",
    name: "Llama 3.2 Latest",
    description: "Meta's latest model with excellent tools integration",
    size: "3.8GB",
    category: "main",
    isDownloaded: false,
    isDownloading: false,
  },
  // Embedding models (keeping as they might be needed for embeddings)
  {
    id: "bge-m3:latest",
    name: "BGE-M3 Latest",
    description:
      "Advanced multilingual embedding model (dense + sparse + multi-vector)",
    size: "2.4GB",
    category: "embedding",
    isDownloaded: false,
    isDownloading: false,
  },
  {
    id: "nomic-embed-text:latest",
    name: "Nomic Embed Text",
    description: "High-quality text embeddings",
    size: "274MB",
    category: "embedding",
    isDownloaded: false,
    isDownloading: false,
  },
  {
    id: "mxbai-embed-large:latest",
    name: "MxBai Embed Large",
    description: "Large embedding model for better accuracy",
    size: "670MB",
    category: "embedding",
    isDownloaded: false,
    isDownloading: false,
  },
];

interface OllamaModel {
  id: string;
  name: string;
  description: string;
  size?: string;
  isDownloaded?: boolean;
  isDownloading?: boolean;
  downloadProgress?: number;
  downloadSpeed?: string;
  downloadETA?: string;
  category?: "main" | "embedding";
}

interface OllamaSettingsProps {
  ollamaModel: string;
  setOllamaModel: (value: string) => void;
  ollamaEmbeddingModel: string;
  setOllamaEmbeddingModel: (value: string) => void;
  ollamaEnabled: boolean;
  setOllamaEnabled: (value: boolean) => void;
  storagePath?: string;
  setStoragePath?: (path: string) => void;
}

export const OllamaSettings: React.FC<OllamaSettingsProps> = ({
  ollamaModel,
  setOllamaModel,
  ollamaEmbeddingModel,
  setOllamaEmbeddingModel,
  ollamaEnabled,
  setOllamaEnabled,
  storagePath = "./orch-os-memory",
  setStoragePath,
}) => {
  const [availableModels, setAvailableModels] =
    useState<OllamaModel[]>(AVAILABLE_MODELS);
  const [installedModels, setInstalledModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingModels, setDownloadingModels] = useState<
    Map<string, { progress: number; speed: string; eta: string }>
  >(new Map());

  // Dropdown open/close state
  const [mainDropdownOpen, setMainDropdownOpen] = useState(false);
  const [embeddingDropdownOpen, setEmbeddingDropdownOpen] = useState(false);

  /* ------------------------------------------------------------------
   * Estado de carregamento dos modelos (vLLM) & polling
   * ------------------------------------------------------------------ */
  const [modelStatus, setModelStatus] = useState<VllmStatus | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const fetchStatus = async () => {
      try {
        if (window.electronAPI?.vllmModelStatus) {
          const res = await window.electronAPI.vllmModelStatus();
          if (res?.success && res.status) {
            setModelStatus(res.status as VllmStatus);
          }
        }
      } catch {
        /* silêncio */
      }
    };
    fetchStatus();
    interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  // Função para buscar modelos instalados
  const fetchInstalledModels = useCallback(async () => {
    try {
      setIsLoadingModels(true);
      setError(null);

      // Tentar usar a API do Electron (Ollama) primeiro
      if (window.electronAPI?.listModels) {
        const models = await window.electronAPI.listModels();
        if (models && Array.isArray(models)) {
          const installed = models.map((m) => m.name || m.id);
          setInstalledModels(installed);
          return;
        }
      }

      // Fallback para API HTTP local do Ollama
      const response = await fetch("http://localhost:11434/api/tags");
      if (response.ok) {
        const data = await response.json();
        if (data.models && Array.isArray(data.models)) {
          setInstalledModels(data.models.map((m: any) => m.name));
        }
      } else {
        throw new Error("Ollama não está rodando ou não está acessível");
      }
    } catch (error) {
      console.error("Erro ao carregar modelos instalados:", error);
      setError(
        "Não foi possível conectar ao Ollama. Verifique se está rodando."
      );
      setInstalledModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  }, []);

  // Função para buscar modelos disponíveis (agora usa lista estática)
  const fetchAvailableModels = useCallback(async () => {
    try {
      setIsLoadingAvailable(true);
      setError(null);

      // Usar lista estática de modelos
      setAvailableModels(AVAILABLE_MODELS);
    } catch (error) {
      console.error("Erro ao carregar modelos disponíveis:", error);
      setError("Erro ao carregar lista de modelos disponíveis");
    } finally {
      setIsLoadingAvailable(false);
    }
  }, []);

  // Atualizar status dos modelos com base nos instalados
  useEffect(() => {
    const updatedModels = availableModels.map((model) => {
      const downloadInfo = downloadingModels.get(model.id);
      return {
        ...model,
        isDownloaded: installedModels.includes(model.id),
        isDownloading: downloadingModels.has(model.id),
        downloadProgress: downloadInfo?.progress || 0,
        downloadSpeed: downloadInfo?.speed || "",
        downloadETA: downloadInfo?.eta || "",
      };
    });
    setAvailableModels(updatedModels);
  }, [installedModels, downloadingModels]);

  // Carregar dados ao montar o componente
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchInstalledModels(), fetchAvailableModels()]);
    };

    loadData();
  }, [fetchInstalledModels, fetchAvailableModels]);

  // Função para baixar modelo com progress via Ollama
  const downloadModel = async (modelId: string) => {
    try {
      // Iniciar download
      setDownloadingModels((prev) =>
        new Map(prev).set(modelId, {
          progress: 0,
          speed: "0 MB/s",
          eta: "Calculando...",
        })
      );

      // Tentar usar a API do Electron (Ollama) primeiro
      if (window.electronAPI?.downloadModel) {
        const success = await window.electronAPI.downloadModel(modelId);
        if (success) {
          // Recarregar lista ao concluir
          await fetchInstalledModels();
          setDownloadingModels((prev) => {
            const newMap = new Map(prev);
            newMap.delete(modelId);
            return newMap;
          });
          return;
        }
      }

      // Fallback para API HTTP do Ollama com simulação de progresso
      const response = await fetch("http://localhost:11434/api/pull", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: modelId,
          stream: false,
        }),
      });

      if (response.ok) {
        // Simular progresso enquanto baixa
        const progressInterval = setInterval(() => {
          setDownloadingModels((prev) => {
            const current = prev.get(modelId);
            if (!current) return prev;

            const newProgress = Math.min(
              current.progress + Math.random() * 10,
              100
            );
            const newMap = new Map(prev);

            if (newProgress >= 100) {
              clearInterval(progressInterval);
              newMap.delete(modelId);
              // Adicionar à lista de instalados
              setInstalledModels((prev) => [...prev, modelId]);
            } else {
              newMap.set(modelId, {
                progress: newProgress,
                speed: `${(Math.random() * 10 + 1).toFixed(1)} MB/s`,
                eta: `${Math.ceil((100 - newProgress) / 10)} min`,
              });
            }

            return newMap;
          });
        }, 1000);
      } else {
        throw new Error("Falha ao baixar modelo");
      }
    } catch (error) {
      console.error("Erro ao baixar modelo:", error);
      setDownloadingModels((prev) => {
        const newMap = new Map(prev);
        newMap.delete(modelId);
        return newMap;
      });
      setError(`Erro ao baixar modelo ${modelId}`);
    }
  };

  // Função para cancelar download
  const cancelDownload = async (modelId: string) => {
    setDownloadingModels((prev) => {
      const newMap = new Map(prev);
      newMap.delete(modelId);
      return newMap;
    });
  };

  // Função para remover modelo
  const removeModel = async (modelId: string) => {
    try {
      // Tentar usar a API do Electron (Ollama) primeiro
      if (window.electronAPI?.removeModel) {
        await window.electronAPI.removeModel(modelId);
        await fetchInstalledModels();
        return;
      }

      // Fallback para API HTTP do Ollama
      const response = await fetch("http://localhost:11434/api/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: modelId,
        }),
      });

      if (response.ok) {
        await fetchInstalledModels();
      } else {
        throw new Error("Falha ao remover modelo");
      }
    } catch (error) {
      console.error("Erro ao remover modelo:", error);
      setError(`Erro ao remover modelo ${modelId}`);
    }
  };

  // Função para recarregar dados
  const refreshData = async () => {
    await Promise.all([fetchInstalledModels(), fetchAvailableModels()]);
  };

  // Função para abrir seletor de diretório
  const handleBrowseStoragePath = async () => {
    try {
      if (window.electronAPI?.selectDirectory) {
        const result = await window.electronAPI.selectDirectory();
        if (result && result.success && result.path && setStoragePath) {
          setStoragePath(result.path);
        }
      } else {
        // Fallback para web - usar input file com webkitdirectory
        const input = document.createElement("input");
        input.type = "file";
        input.webkitdirectory = true;
        input.onchange = (e) => {
          const files = (e.target as HTMLInputElement).files;
          if (files && files.length > 0 && setStoragePath) {
            // Pegar o caminho do primeiro arquivo e extrair o diretório
            const firstFile = files[0];
            const pathParts = firstFile.webkitRelativePath.split("/");
            pathParts.pop(); // Remove o nome do arquivo
            const dirPath = pathParts.join("/");
            setStoragePath(dirPath || "./orch-os-memory");
          }
        };
        input.click();
      }
    } catch (error) {
      console.error("Erro ao selecionar diretório:", error);
    }
  };

  // Função para obter o nome do modelo selecionado
  const getModelDisplayName = (modelId: string, modelsList: OllamaModel[]) => {
    const model = modelsList.find((m) => m.id === modelId);
    return model
      ? `${model.name} (${model.size})`
      : modelId || "Selecione um modelo...";
  };

  // Computed lists for dropdowns
  const mainModelsList = availableModels.filter(
    (m) => m.category !== "embedding"
  );
  const embeddingModelsList = availableModels.filter(
    (m) => m.category === "embedding"
  );

  // Computed lists for the interface
  const downloadedMainModels = mainModelsList.filter((m) => m.isDownloaded);
  const downloadedEmbeddingModels = embeddingModelsList.filter(
    (m) => m.isDownloaded
  );
  const downloadedModels = availableModels.filter((m) => m.isDownloaded);
  const availableForDownload = availableModels.filter((m) => !m.isDownloaded);

  // Indicadores de loading para os spinners
  const mainModelLoading = !!(
    modelStatus &&
    modelStatus.modelId === ollamaModel &&
    modelStatus.state !== "ready" &&
    modelStatus.state !== "idle" &&
    modelStatus.state !== "error"
  );

  const embeddingModelLoading = !!(
    modelStatus &&
    modelStatus.modelId === ollamaEmbeddingModel &&
    modelStatus.state !== "ready" &&
    modelStatus.state !== "idle" &&
    modelStatus.state !== "error"
  );

  // Função para selecionar modelo principal
  const handleSelectMain = async (model: OllamaModel) => {
    setOllamaModel(model.id);
    if (!ollamaEnabled) setOllamaEnabled(true);
    setMainDropdownOpen(false);
    if (!model.isDownloaded && !model.isDownloading) {
      await downloadModel(model.id);
    }
  };

  // Função para selecionar modelo de embedding
  const handleSelectEmbedding = async (model: OllamaModel) => {
    setOllamaEmbeddingModel(model.id);
    setEmbeddingDropdownOpen(false);
    if (!model.isDownloaded && !model.isDownloading) {
      await downloadModel(model.id);
    }
  };

  return (
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm">🦙</span>
          <h3 className="text-sm font-medium text-cyan-300">Ollama Models</h3>
        </div>
        <button
          onClick={refreshData}
          disabled={isLoadingModels || isLoadingAvailable}
          className="bg-cyan-600/30 hover:bg-cyan-500/40 text-cyan-300 rounded px-2 py-1 transition-colors disabled:opacity-50 text-xs"
          title="Refresh models"
        >
          <span
            className={`${
              isLoadingModels || isLoadingAvailable ? "animate-spin" : ""
            }`}
          >
            🔄
          </span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded p-2">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-3 h-3 text-red-400 mr-1" />
            <div>
              <h4 className="text-red-400 font-medium text-[10px]">Erro</h4>
              <p className="text-red-400/70 text-[10px]">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Storage Path - Inline */}
      <div className="flex items-center space-x-2">
        <span className="text-xs text-purple-400">🧠 Storage:</span>
        <input
          type="text"
          value={storagePath}
          onChange={(e) => setStoragePath?.(e.target.value)}
          className="flex-1 bg-black/30 text-purple-300 rounded px-2 py-1 text-xs border border-purple-500/20 focus:outline-none focus:border-purple-400/50"
          placeholder="Storage path..."
        />
        <button
          onClick={handleBrowseStoragePath}
          className="bg-blue-600/30 hover:bg-blue-500/40 text-blue-300 rounded px-2 py-1 text-xs transition-colors"
        >
          📁
        </button>
      </div>

      {/* Model Selection - Horizontal Layout */}
      <div className="grid grid-cols-2 gap-2">
        {/* Main Model */}
        <div className="relative">
          <label className="block text-xs text-cyan-400 mb-1">Main Model</label>
          <button
            onClick={() => setMainDropdownOpen((prev) => !prev)}
            disabled={isLoadingAvailable}
            className="flex items-center justify-between w-full p-2 rounded bg-black/40 text-white/90 border border-cyan-500/30 focus:outline-none hover:bg-black/50 transition-colors text-xs"
          >
            <span className="text-left truncate">
              {ollamaModel ? ollamaModel.split(":")[0] : "Select..."}
            </span>
            <ChevronDownIcon
              className={`w-3 h-3 transition-transform ${
                mainDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {mainDropdownOpen && (
            <div className="absolute z-10 w-full mt-1 bg-black/90 border border-cyan-500/30 rounded shadow-lg max-h-40 overflow-y-auto">
              {mainModelsList.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleSelectMain(model)}
                  className="w-full px-2 py-2 text-left hover:bg-cyan-500/20 transition-colors border-b border-cyan-500/10 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 truncate">
                      <div className="text-white/90 font-medium text-xs truncate">
                        {model.name}
                      </div>
                      <div className="text-cyan-400/60 text-[10px]">
                        {model.size}
                      </div>
                    </div>
                    {model.isDownloaded && (
                      <CheckCircleIcon className="w-3 h-3 text-green-400 ml-2" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Embedding Model */}
        <div className="relative">
          <label className="block text-xs text-cyan-400 mb-1">
            Embedding Model
          </label>
          <button
            onClick={() => setEmbeddingDropdownOpen((prev) => !prev)}
            disabled={isLoadingAvailable}
            className="flex items-center justify-between w-full p-2 rounded bg-black/40 text-white/90 border border-cyan-500/30 focus:outline-none hover:bg-black/50 transition-colors text-xs"
          >
            <span className="text-left truncate">
              {ollamaEmbeddingModel
                ? ollamaEmbeddingModel.split(":")[0]
                : "Select..."}
            </span>
            <ChevronDownIcon
              className={`w-3 h-3 transition-transform ${
                embeddingDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {embeddingDropdownOpen && (
            <div className="absolute z-10 w-full mt-1 bg-black/90 border border-cyan-500/30 rounded shadow-lg max-h-40 overflow-y-auto">
              {embeddingModelsList.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleSelectEmbedding(model)}
                  className="w-full px-2 py-2 text-left hover:bg-cyan-500/20 transition-colors border-b border-cyan-500/10 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 truncate">
                      <div className="text-white/90 font-medium text-xs truncate">
                        {model.name}
                      </div>
                      <div className="text-cyan-400/60 text-[10px]">
                        {model.size}
                      </div>
                    </div>
                    {model.isDownloaded && (
                      <CheckCircleIcon className="w-3 h-3 text-green-400 ml-2" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Downloaded Models - Compact List */}
      {downloadedModels.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-green-400 mb-1">
            ✅ Downloaded ({downloadedModels.length})
          </h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {downloadedModels.map((model) => (
              <div
                key={model.id}
                className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded p-2"
              >
                <div className="flex items-center space-x-2 flex-1 truncate">
                  <CheckCircleIcon className="w-3 h-3 text-green-400" />
                  <span className="text-green-300 text-xs truncate">
                    {model.name}
                  </span>
                  <span className="text-green-400/60 text-[10px]">
                    {model.size}
                  </span>
                  {model.category === "embedding" && (
                    <span className="px-1 py-0.5 bg-blue-500/20 text-blue-300 text-[9px] rounded">
                      Embed
                    </span>
                  )}
                </div>
                <button
                  onClick={() => removeModel(model.id)}
                  className="bg-red-600/20 hover:bg-red-500/30 text-red-400 rounded p-1 transition-colors"
                  title="Remove Model"
                >
                  <TrashIcon className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Models - Compact List */}
      {availableForDownload.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-cyan-400 mb-1">
            📥 Available ({availableForDownload.length})
          </h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {availableForDownload.map((model) => (
              <div
                key={model.id}
                className="bg-black/30 border border-cyan-500/20 rounded p-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-1 truncate">
                    <span className="text-cyan-300 text-xs truncate">
                      {model.name}
                    </span>
                    <span className="text-cyan-400/60 text-[10px]">
                      {model.size}
                    </span>
                    {model.category === "embedding" && (
                      <span className="px-1 py-0.5 bg-blue-500/20 text-blue-300 text-[9px] rounded">
                        Embed
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    {model.isDownloading ? (
                      <button
                        onClick={() => cancelDownload(model.id)}
                        className="bg-red-600/30 hover:bg-red-500/40 text-red-300 rounded p-1 transition-colors"
                        title="Cancel Download"
                      >
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    ) : (
                      <button
                        onClick={() => downloadModel(model.id)}
                        className="bg-cyan-600/30 hover:bg-cyan-500/40 text-cyan-300 rounded p-1 transition-colors"
                        title="Download Model"
                      >
                        <ArrowDownTrayIcon className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {model.isDownloading && (
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-yellow-400">Downloading...</span>
                      <span className="text-yellow-300">
                        {model.downloadProgress?.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1">
                      <div
                        className="bg-gradient-to-r from-yellow-400 to-orange-400 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${model.downloadProgress || 0}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[9px] text-yellow-400/70">
                      <span>{model.downloadSpeed}</span>
                      <span>ETA: {model.downloadETA}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OllamaSettings;
