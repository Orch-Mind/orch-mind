// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useMemo } from "react";
import { useApiSettings } from "./hooks/useApiSettings";
import { useBetaSettings } from "./hooks/useBetaSettings";
import { useDebugSettings } from "./hooks/useDebugSettings";
import { useGeneralSettings } from "./hooks/useGeneralSettings";
import { useNavigationState } from "./hooks/useNavigationState";
import { SettingsState } from "./types";

/**
 * Hook orquestrador para gerenciamento de estado neural-simbólico das configurações
 * Implementa o princípio de responsabilidade única e composição
 * agregando os hooks especializados por domínio
 */
export const useSettingsState = (
  show: boolean,
  initialTab: string = "general"
): SettingsState => {
  // Composição de hooks especializados por domínio
  const navigation = useNavigationState(initialTab);
  const general = useGeneralSettings();
  const api = useApiSettings();
  const debug = useDebugSettings();
  const beta = useBetaSettings();

  // Função unificada para salvar todas as configurações
  const saveSettings = () => {
    // Salva as configurações de cada domínio
    general.saveGeneralSettings();
    api.saveApiSettings();
    debug.saveDebugSettings();
    beta.saveBetaSettings();
  };

  // Combina todos os estados e funções dos hooks especializados
  // Memoiza o objeto para evitar renders desnecessários
  return useMemo(
    () => ({
      // Navegação
      ...navigation,
      // General
      ...general,
      // API (OpenAI, Deepgram, HuggingFace, Pinecone)
      ...api,
      // Debug
      ...debug,
      // Beta
      ...beta,

      // Ação unificada
      saveSettings,
      // Propriedades legado (mantidas para compatibilidade com tipos)
      chatgptApiKey: "",
      setChatgptApiKey: () => {},
      chatgptModel: "",
      setChatgptModel: () => {},
      chatgptTemperature: 0.5,
      setChatgptTemperature: () => {},
      chatgptMaxTokens: 2048,
      setChatgptMaxTokens: () => {},
      openaiEmbeddingModel: "",
      setOpenaiEmbeddingModel: () => {},
      deepgramApiKey: "",
      setDeepgramApiKey: () => {},
      deepgramModel: "",
      setDeepgramModel: () => {},
      deepgramLanguage: "",
      setDeepgramLanguage: () => {},
      deepgramTier: "",
      setDeepgramTier: () => {},
      pineconeApiKey: "",
      setPineconeApiKey: () => {},
      pineconeEnvironment: "",
      setPineconeEnvironment: () => {},
      pineconeIndex: "",
      setPineconeIndex: () => {},
    }),
    [
      // Dependências: todos os objetos retornados pelos hooks especializados
      navigation,
      general,
      api,
      debug,
      beta,
      saveSettings,
    ]
  );
};
