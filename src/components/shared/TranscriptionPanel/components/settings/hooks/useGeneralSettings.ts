// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useEffect, useMemo, useState } from "react";
import { ModeService, OrchOSMode } from '../../../../../../services/ModeService';
import { getOption, getUserName, setOption, STORAGE_KEYS, subscribeToStorageChanges } from '../../../../../../services/StorageService';

/**
 * Hook para gerenciamento de configurações gerais
 * Componente neural-simbólico para configurações básicas do sistema
 */
export const useGeneralSettings = () => {
  // Estado neural-simbólico para opções gerais
  const [name, setName] = useState<string>(() => getUserName() || 'User');
  const [enableMatrix, setEnableMatrix] = useState<boolean>(() => getOption<boolean>(STORAGE_KEYS.ENABLE_MATRIX) ?? true);
  const [matrixDensity, setMatrixDensity] = useState<number>(() => getOption<number>(STORAGE_KEYS.MATRIX_DENSITY) ?? 60);
  
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
  };
  
  return useMemo(() => ({
    // Valores
    name,
    setName,
    applicationMode,
    setApplicationMode,
    enableMatrix,
    setEnableMatrix,
    matrixDensity,
    setMatrixDensity,
    // Ações
    saveGeneralSettings
  }), [
    name,
    setName,
    applicationMode,
    setApplicationMode,
    enableMatrix,
    setEnableMatrix,
    matrixDensity,
    setMatrixDensity,
    saveGeneralSettings
  ]);
};
