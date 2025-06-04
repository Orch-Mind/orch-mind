// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useState, useEffect, useMemo } from "react";
import { getOption, setOption, STORAGE_KEYS, subscribeToStorageChanges } from '../../../../../../services/StorageService';

/**
 * Hook para gerenciamento de configurações de depuração
 * Neurônio metacognitivo de diagnóstico e instrumentação
 */
export const useDebugSettings = () => {
  // Estado neural-simbólico para opções de debug
  const [debugMode, setDebugMode] = useState<boolean>(() => getOption<boolean>(STORAGE_KEYS.DEBUG_MODE) ?? false);
  const [logLevel, setLogLevel] = useState<string>(() => getOption<string>(STORAGE_KEYS.LOG_LEVEL) || 'info');
  
  // Sincroniza mudanças do storage para o estado local
  useEffect(() => {
    const handleStorageChange = (key: string, value: any) => {
      switch(key) {
        case STORAGE_KEYS.DEBUG_MODE: setDebugMode(value); break;
        case STORAGE_KEYS.LOG_LEVEL: setLogLevel(value); break;
      }
    };
    
    const unsubscribe = subscribeToStorageChanges(handleStorageChange);
    return () => unsubscribe();
  }, []);
  
  // Salva as configurações de debug no storage
  const saveDebugSettings = () => {
    setOption(STORAGE_KEYS.DEBUG_MODE, debugMode);
    setOption(STORAGE_KEYS.LOG_LEVEL, logLevel);
  };
  
  return useMemo(() => ({
    // Valores
    debugMode,
    setDebugMode,
    logLevel,
    setLogLevel,
    // Ações
    saveDebugSettings
  }), [
    debugMode,
    setDebugMode,
    logLevel,
    setLogLevel,
    saveDebugSettings
  ]);
};
