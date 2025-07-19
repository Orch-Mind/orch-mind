// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { createContext, useState, useEffect } from "react";
import { getOption, setOption, subscribeToStorageChanges, STORAGE_KEYS } from "../../services/StorageService";

/**
 * Hook personalizado para gerenciar configurações do storage
 * Permite um "espelhamento neural" de uma configuração global do storage
 */
function useStorageSetting<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  // Estado local que espelha o valor no storage
  const [value, setValue] = useState<T>(() => {
    const storedValue = getOption<T>(key);
    return storedValue !== undefined ? storedValue : defaultValue;
  });

  // Efeito para sincronizar com mudanças no storage
  useEffect(() => {
    const handleStorageChange = (changedKey: string, newValue: any) => {
      if (changedKey === key && newValue !== undefined) {
        console.log(`💾 [STORAGE-MIRROR] Valor atualizado para ${key}:`, newValue);
        setValue(newValue as T);
      }
    };
    
    // Inscreve para mudanças e retorna função de limpeza
    return subscribeToStorageChanges(handleStorageChange);
  }, [key]);

  // Função para atualizar o valor
  const updateValue = (newValue: T) => {
    setValue(newValue);
    setOption(key, newValue);
  };

  return [value, updateValue];
}

// =====================================
// Contexto de linguagem do Orch-Mind
// =====================================

export const LanguageContext = createContext<{  
  language: string;
  setLanguage: (language: string) => void;
}>({ language: "pt-BR", setLanguage: () => {} });

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  // Espelha configurações diretamente do storage neural
  const [language, setLanguageInternal] = useStorageSetting(STORAGE_KEYS.DEEPGRAM_LANGUAGE, "pt-BR");
  
  // Simples wrapper para manter a API consistente
  const setLanguage = (newLanguage: string) => {
    setLanguageInternal(newLanguage);
    console.log(`🌎 LanguageContext: Idioma alterado para ${newLanguage}`);
  };
  
  // O contexto agora é sempre atualizado automaticamente graças ao espelhamento neural

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};