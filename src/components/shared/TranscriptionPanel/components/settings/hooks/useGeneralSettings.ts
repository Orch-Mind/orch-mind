// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useEffect, useMemo, useState } from "react";
import {
  getOption,
  getUserName,
  setOption,
  STORAGE_KEYS,
  subscribeToStorageChanges,
} from "../../../../../../services/StorageService";

/**
 * Hook para gerenciamento de configurações gerais
 * Componente neural-simbólico para configurações básicas do sistema
 * Agora inclui gerenciamento de idioma de transcrição
 */
export const useGeneralSettings = () => {
  // Estado neural-simbólico para opções gerais
  const [name, setName] = useState<string>(() => getUserName() || "User");

  const [language, setLanguage] = useState<string>(
    () => getOption<string>(STORAGE_KEYS.DEEPGRAM_LANGUAGE) ?? "pt-BR"
  );

  // Sincroniza mudanças do storage para o estado local
  useEffect(() => {
    const handleStorageChange = (key: string, value: any) => {
      switch (key) {
        case STORAGE_KEYS.USER_NAME:
          setName(value);
          break;
        case STORAGE_KEYS.DEEPGRAM_LANGUAGE:
          setLanguage(value);
          break;
      }
    };

    const unsubscribe = subscribeToStorageChanges(handleStorageChange);
    return () => unsubscribe();
  }, []);

  // Salva as configurações gerais no storage
  const saveGeneralSettings = () => {
    setOption(STORAGE_KEYS.USER_NAME, name);
    setOption(STORAGE_KEYS.DEEPGRAM_LANGUAGE, language);
  };

  return useMemo(
    () => ({
      // Valores
      name,
      setName,
      language,
      setLanguage,
      // Ações
      saveGeneralSettings,
    }),
    [name, setName, language, setLanguage, saveGeneralSettings]
  );
};
