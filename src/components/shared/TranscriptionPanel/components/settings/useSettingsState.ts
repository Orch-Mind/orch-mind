// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useEffect, useMemo, useState } from "react";
import { ModeService, OrchOSMode } from "../../../../../services/ModeService";
import { useApiSettings } from "./hooks/useApiSettings";
import { useAudioSettings } from "./hooks/useAudioSettings";
import { useDebugSettings } from "./hooks/useDebugSettings";
import { useGeneralSettings } from "./hooks/useGeneralSettings";
import { useNavigationState } from "./hooks/useNavigationState";
import { SettingsState } from "./types";

/**
 * Hook orquestrador para gerenciamento de estado neural-simbólico das configurações
 * Implementa o princípio de responsabilidade única e composição
 * agregando os hooks especializados por domínio
 */
export const useSettingsState = (show: boolean): SettingsState => {
  // Composição de hooks especializados por domínio
  const navigation = useNavigationState();
  const general = useGeneralSettings();
  const audio = useAudioSettings(show);
  const api = useApiSettings();
  const debug = useDebugSettings();

  // Modo de aplicação (Básico/Avançado)
  const [applicationMode, setApplicationModeState] = useState<OrchOSMode>(() =>
    ModeService.getMode()
  );

  // Estado das dependências do sistema
  const [dependenciesReady, setDependenciesReady] = useState<boolean>(false);
  const [dockerRequired, setDockerRequired] = useState<boolean>(true);

  // Detecta hardware e verifica dependências quando o modal abre
  useEffect(() => {
    if (show) {
      // Detecta hardware para saber se Docker é necessário
      const detectAndCheckDependencies = async () => {
        try {
          // Primeiro detecta o hardware
          const hardwareResult = await window.electronAPI.detectHardware();
          if (hardwareResult.success) {
            setDockerRequired(hardwareResult.dockerRequired);
            console.log(
              `[Settings] Hardware detected - Docker required: ${hardwareResult.dockerRequired}`
            );
          }

          // Depois verifica as dependências
          const depStatus = await window.electronAPI.checkDependencies();

          // Valida dependências baseado no que é realmente necessário
          const isReady = hardwareResult.dockerRequired
            ? depStatus.ollama.installed && depStatus.docker.installed
            : depStatus.ollama.installed; // Apenas Ollama para Apple Silicon

          setDependenciesReady(isReady);
        } catch (error) {
          console.error(
            "[Settings] Failed to detect hardware or check dependencies:",
            error
          );
          setDependenciesReady(false);
        }
      };

      detectAndCheckDependencies();
    }
  }, [show]);

  // Handler para alteração do modo com persistência
  const setApplicationMode = (mode: OrchOSMode) => {
    ModeService.setMode(mode);
    setApplicationModeState(mode);
  };

  // Função unificada para salvar todas as configurações
  const saveSettings = () => {
    // Salva as configurações de cada domínio
    general.saveGeneralSettings();
    audio.saveAudioSettings();
    api.saveApiSettings();
    debug.saveDebugSettings();
  };

  // Combina todos os estados e funções dos hooks especializados
  // Memoiza o objeto para evitar renders desnecessários
  return useMemo(
    () => ({
      // Navegação
      ...navigation,
      // General
      ...general,
      // Audio e Transcrição
      ...audio,
      // API (OpenAI, Deepgram, HuggingFace, Pinecone)
      ...api,
      // Debug
      ...debug,
      // Modo da aplicação
      applicationMode,
      setApplicationMode,
      // Dependencies
      dependenciesReady,
      setDependenciesReady,
      dockerRequired,
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
      hfModel: "",
      setHfModel: () => {},
      hfEmbeddingModel: "",
      setHfEmbeddingModel: () => {},
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
      // Dependências: todos os objetos retornados pelos hooks especializados e applicationMode
      navigation,
      general,
      audio,
      api,
      debug,
      applicationMode,
      setApplicationMode,
      dependenciesReady,
      setDependenciesReady,
      dockerRequired,
      saveSettings,
    ]
  );
};
