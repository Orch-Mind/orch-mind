// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useState, useEffect } from "react";
import { getOption, getUserName, setOption, STORAGE_KEYS, subscribeToStorageChanges } from '../../../../../../services/StorageService';
import { ModeService, OrchOSMode } from '../../../../../../services/ModeService';

/**
 * Hook para gerenciamento de configurações gerais
 * Componente neural-simbólico para configurações básicas do sistema
 */
export const useGeneralSettings = () => {
  // Estado neural-simbólico para opções gerais
  const [name, setName] = useState<string>(() => getUserName() || 'User');
  const [enableMatrix, setEnableMatrix] = useState<boolean>(() => getOption<boolean>(STORAGE_KEYS.ENABLE_MATRIX) ?? true);
  const [matrixDensity, setMatrixDensity] = useState<number>(() => getOption<number>(STORAGE_KEYS.MATRIX_DENSITY) ?? 60);
  const [enableEffects, setEnableEffects] = useState<boolean>(() => getOption<boolean>(STORAGE_KEYS.ENABLE_EFFECTS) ?? true);
  const [enableAnimations, setEnableAnimations] = useState<boolean>(() => getOption<boolean>(STORAGE_KEYS.ENABLE_ANIMATIONS) ?? true);
  
  // Orch-OS Mode Cortex: single source of truth for mode
  const [applicationMode, setApplicationMode] = useState<OrchOSMode>(
    () => ModeService.getMode()
  );
  
  // Sincroniza mudanças do storage para o estado local
  useEffect(() => {
    const handleStorageChange = (key: string, value: any) => {
      switch(key) {
        case STORAGE_KEYS.USER_NAME: setName(value); break;
        case STORAGE_KEYS.APPLICATION_MODE: 
          setApplicationMode(value);
          break;
        case STORAGE_KEYS.ENABLE_MATRIX: setEnableMatrix(value); break;
        case STORAGE_KEYS.MATRIX_DENSITY: setMatrixDensity(value); break;
        case STORAGE_KEYS.ENABLE_EFFECTS: setEnableEffects(value); break;
        case STORAGE_KEYS.ENABLE_ANIMATIONS: setEnableAnimations(value); break;
      }
    };
    
    const unsubscribe = subscribeToStorageChanges(handleStorageChange);
    return () => unsubscribe();
  }, []);
  
  // Salva as configurações gerais no storage
  const saveGeneralSettings = () => {
    setOption(STORAGE_KEYS.USER_NAME, name);
    if (applicationMode) {
      setOption(STORAGE_KEYS.APPLICATION_MODE, applicationMode);
      ModeService.setMode(applicationMode); // Atualiza o modo no serviço
    }
    setOption(STORAGE_KEYS.ENABLE_MATRIX, enableMatrix);
    setOption(STORAGE_KEYS.MATRIX_DENSITY, matrixDensity);
    setOption(STORAGE_KEYS.ENABLE_EFFECTS, enableEffects);
    setOption(STORAGE_KEYS.ENABLE_ANIMATIONS, enableAnimations);
  };
  
  return {
    // Valores
    name,
    setName,
    applicationMode,
    setApplicationMode,
    enableMatrix,
    setEnableMatrix,
    matrixDensity,
    setMatrixDensity,
    enableEffects,
    setEnableEffects,
    enableAnimations,
    setEnableAnimations,
    
    // Ações
    saveGeneralSettings
  };
};
