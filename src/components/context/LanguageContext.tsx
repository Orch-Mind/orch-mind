// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { createContext, useState } from "react";

export const LanguageContext = createContext<{
    language: string;
    setLanguage: (lang: string) => void;
  }>({ language: "pt-BR", setLanguage: () => {} });
  
  import { useEffect } from "react";
import { getOption, setOption, subscribeToStorageChanges } from "../../services/StorageService";

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  // Initialize from storage
  const [language, setLanguageState] = useState(() => getOption("deepgramLanguage") || "pt-BR");

  // Persist to storage and update context
  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    setOption("deepgramLanguage", lang);
  };

  // Monitora e sincroniza com mudanças no storage usando o sistema de eventos
  useEffect(() => {
    // Função que reage a mudanças no storage
    const handleStorageChange = (key: string, value: any) => {
      // Só reage se for a configuração de idioma que mudou
      if (key === 'deepgramLanguage' && value && value !== language) {
        console.log('🌐 LanguageContext: Recebida mudança de idioma do storage:', value);
        setLanguageState(value);
      }
    };
    
    // Sincroniza imediatamente na montagem
    const storedLanguage = getOption("deepgramLanguage");
    if (storedLanguage && storedLanguage !== language) {
      setLanguageState(storedLanguage);
    }
    
    // Se inscreve para receber mudanças no storage
    const unsubscribe = subscribeToStorageChanges(handleStorageChange);
    
    // Cancela a inscrição quando o componente é desmontado
    return unsubscribe;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};