// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { useEffect } from "react";
import {
  setOption,
  STORAGE_KEYS,
  subscribeToStorageChanges,
} from "../../../../services/StorageService";

interface LanguageSelectorProps {
  language: string;
  setLanguage: (language: string) => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  language,
  setLanguage,
}) => {
  // Sincroniza com as configurações globais
  useEffect(() => {
    // Handler para mudanças no storage
    const handleStorageChange = (key: string, value: any) => {
      if (
        key === STORAGE_KEYS.DEEPGRAM_LANGUAGE &&
        value &&
        value !== language
      ) {
        console.log(
          "🌐 LanguageSelector: Sincronizando com configurações globais:",
          value
        );
        setLanguage(value);
      }
    };

    // Inscrição no sistema de eventos
    const unsubscribe = subscribeToStorageChanges(handleStorageChange);

    // Limpeza ao desmontar
    return unsubscribe;
  }, [language, setLanguage]);

  return (
    <div className="language-selector-wrapper">
      <select
        title="Transcription Language"
        className="w-full p-2.5 rounded-lg bg-black/40 text-white/90 text-sm border border-cyan-500/20 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all"
        value={language}
        onChange={(e) => {
          const newLanguage = e.target.value;
          console.log("Language selector changed to:", newLanguage);

          // Atualiza o estado local
          setLanguage(newLanguage);

          // Salva automaticamente no storage do sistema
          setOption(STORAGE_KEYS.DEEPGRAM_LANGUAGE, newLanguage);
          console.log(
            "💾 Idioma salvo automaticamente no sistema:",
            newLanguage
          );
        }}
      >
        <option value="pt-BR">Portuguese (Brazil)</option>
        <option value="pt-PT">Portuguese (Portugal)</option>
        <option value="en-US">English (United States)</option>
        <option value="en">English (Global)</option>
        <option value="es">Spanish</option>
        <option value="fr">French</option>
        <option value="de">German</option>
        <option value="it">Italian</option>
        <option value="ja">Japanese</option>
        <option value="zh">Chinese</option>
      </select>
    </div>
  );
};

export default LanguageSelector;
