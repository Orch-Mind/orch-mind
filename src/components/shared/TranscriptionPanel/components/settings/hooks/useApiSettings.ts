// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useEffect, useMemo, useState } from "react";
import {
  getOption,
  setOption,
  STORAGE_KEYS,
  subscribeToStorageChanges,
} from "../../../../../../services/StorageService";

/**
 * Hook para gerenciamento de configurações de APIs externas
 * Interface unificada sem navegação por abas
 * Neurônio de infraestrutura responsável pelas credenciais e parâmetros de serviços
 */
export const useApiSettings = () => {
  // Ollama - configurações principais
  const [ollamaModel, setOllamaModel] = useState<string>(
    () => getOption<string>(STORAGE_KEYS.OLLAMA_MODEL) || ""
  );
  const [ollamaEmbeddingModel, setOllamaEmbeddingModel] = useState<string>(
    () => getOption<string>(STORAGE_KEYS.OLLAMA_EMBEDDING_MODEL) || ""
  );
  const [ollamaEnabled, setOllamaEnabled] = useState<boolean>(
    () => getOption<boolean>(STORAGE_KEYS.OLLAMA_ENABLED) || false
  );

  // Sincroniza mudanças do storage para o estado local
  useEffect(() => {
    const handleStorageChange = (key: string, value: any) => {
      switch (key) {
        // Ollama
        case STORAGE_KEYS.OLLAMA_MODEL:
          if (value !== ollamaModel) setOllamaModel(value);
          break;
        case STORAGE_KEYS.OLLAMA_EMBEDDING_MODEL:
          if (value !== ollamaEmbeddingModel) setOllamaEmbeddingModel(value);
          break;
        case STORAGE_KEYS.OLLAMA_ENABLED:
          if (value !== ollamaEnabled) setOllamaEnabled(value);
          break;
      }
    };

    const unsubscribe = subscribeToStorageChanges(handleStorageChange);
    return () => unsubscribe();
  }, [ollamaModel, ollamaEmbeddingModel, ollamaEnabled]);

  // Salva as configurações de API no storage
  const saveApiSettings = () => {
    // Ollama
    setOption(STORAGE_KEYS.OLLAMA_MODEL, ollamaModel);
    setOption(STORAGE_KEYS.OLLAMA_EMBEDDING_MODEL, ollamaEmbeddingModel);
    setOption(STORAGE_KEYS.OLLAMA_ENABLED, ollamaEnabled);
  };

  // Memoize all API settings to ensure stable reference and avoid unnecessary renders
  return useMemo(
    () => ({
      // Ollama
      ollamaModel,
      setOllamaModel,
      ollamaEmbeddingModel,
      setOllamaEmbeddingModel,
      ollamaEnabled,
      setOllamaEnabled,
      // Salvar tudo
      saveApiSettings,
    }),
    [
      ollamaModel,
      setOllamaModel,
      ollamaEmbeddingModel,
      setOllamaEmbeddingModel,
      ollamaEnabled,
      setOllamaEnabled,
      saveApiSettings,
    ]
  );
};
