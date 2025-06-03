// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useEffect, useRef, useState } from "react";
import { SettingsState } from './types';
import { useNavigationState } from './hooks/useNavigationState';
import { useGeneralSettings } from './hooks/useGeneralSettings';
import { useInterfaceSettings } from './hooks/useInterfaceSettings';
import { useAudioSettings } from './hooks/useAudioSettings';
import { useApiSettings } from './hooks/useApiSettings';
import { useDebugSettings } from './hooks/useDebugSettings';
import { setOption, STORAGE_KEYS, getOption } from '../../../../../services/StorageService';
import { OrchOSMode, OrchOSModeEnum, ModeService } from '../../../../../services/ModeService';

/**
 * Hook orquestrador para gerenciamento de estado neural-simbólico das configurações
 * Implementa o princípio de responsabilidade única e composição
 * agregando os hooks especializados por domínio
 */
export const useSettingsState = (show: boolean): SettingsState => {
  // Composição de hooks especializados por domínio
  const navigation = useNavigationState();
  const general = useGeneralSettings();
  const interfaceSettings = useInterfaceSettings();
  const audio = useAudioSettings(show);
  const api = useApiSettings();
  const debug = useDebugSettings();
  
  // Modo de aplicação (Básico/Avançado)
  const [applicationMode, setApplicationModeState] = useState<OrchOSMode>(() => ModeService.getMode());
  
  // Handler para alteração do modo com persistência
  const setApplicationMode = (mode: OrchOSMode) => {
    ModeService.setMode(mode);
    setApplicationModeState(mode);
  };
  
  // Sincroniza o idioma entre hooks quando muda em um deles
  const prevLanguageRef = useRef(audio.language);
  
  useEffect(() => {
    if (audio.language !== prevLanguageRef.current) {
      // Sincroniza o idioma entre Deepgram e configurações gerais
      setOption(STORAGE_KEYS.DEEPGRAM_LANGUAGE, audio.language);
      api.setDeepgramLanguage(audio.language);
      prevLanguageRef.current = audio.language;
    }
  }, [audio.language]);
  
  useEffect(() => {
    if (api.deepgramLanguage !== prevLanguageRef.current) {
      // Sincroniza o idioma entre Deepgram e configurações de áudio
      setOption(STORAGE_KEYS.DEEPGRAM_LANGUAGE, api.deepgramLanguage);
      audio.setLanguage(api.deepgramLanguage);
      prevLanguageRef.current = api.deepgramLanguage;
    }
  }, [api.deepgramLanguage]);
  
  // Função unificada para salvar todas as configurações
  const saveSettings = () => {
    // Salva as configurações de cada domínio
    general.saveGeneralSettings();
    interfaceSettings.saveInterfaceSettings();
    audio.saveAudioSettings();
    api.saveApiSettings();
    debug.saveDebugSettings();
  };
  
  // Combina todos os estados e funções dos hooks especializados
  return {
    // Navegação
    ...navigation,
    
    // General
    ...general,
    
    // Interface
    ...interfaceSettings,
    
    // Audio e Transcrição
    ...audio,
    
    // API (OpenAI, Deepgram, HuggingFace, Pinecone)
    ...api,
    
    // Debug
    ...debug,
    
    // Modo da aplicação
    applicationMode,
    setApplicationMode,
    
    // Ação unificada
    saveSettings
  };
};
