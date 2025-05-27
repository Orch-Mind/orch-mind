// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { createContext, useState } from "react";

export const LanguageContext = createContext<{
    language: string;
    setLanguage: (lang: string) => void;
  }>({ language: "pt-BR", setLanguage: () => {} });
  
  import { useEffect } from "react";
import { getOption, setOption } from "../../services/StorageService";

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  // Initialize from storage
  const [language, setLanguageState] = useState(() => getOption("deepgramLanguage") || "pt-BR");

  // Persist to storage and update context
  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    setOption("deepgramLanguage", lang);
  };

  // Sync with external storage changes (e.g., SettingsModal)
  useEffect(() => {
    const stored = getOption("deepgramLanguage");
    if (stored && stored !== language) {
      setLanguageState(stored);
    }
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};