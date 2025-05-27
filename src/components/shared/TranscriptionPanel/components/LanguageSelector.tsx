// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { useEffect } from 'react';
import { setOption, getOption, subscribeToStorageChanges } from '../../../../services/StorageService';

interface LanguageSelectorProps {
  language: string;
  setLanguage: (language: string) => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  language,
  setLanguage
}) => {
  // Sincroniza com as configurações globais
  useEffect(() => {
    // Handler para mudanças no storage
    const handleStorageChange = (key: string, value: any) => {
      if (key === 'deepgramLanguage' && value && value !== language) {
        console.log('🌐 LanguageSelector: Sincronizando com configurações globais:', value);
        setLanguage(value);
      }
    };
    
    // Inscrição no sistema de eventos
    const unsubscribe = subscribeToStorageChanges(handleStorageChange);
    
    // Limpeza ao desmontar
    return unsubscribe;
  }, [language, setLanguage]);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <label className="text-sm block mb-1">Transcription Language:</label>
      <select
        title="Transcription Language"
        className="w-full p-2 rounded bg-black/40 text-white/90 text-sm"
        value={language}
        onChange={(e) => {
          const newLanguage = e.target.value;
          console.log('Language selector changed to:', newLanguage);
          
          // Atualiza o estado local
          setLanguage(newLanguage);
          
          // Salva automaticamente no storage do sistema
          setOption('deepgramLanguage', newLanguage);
          console.log('💾 Idioma salvo automaticamente no sistema:', newLanguage);
        }}
      >
        <option value="pt-BR">Portuguese (Brazil) – pt-BR</option>
        <option value="pt-PT">Portuguese (Portugal) – pt-PT</option>
        <option value="en-US">English (United States) – en-US</option>
        <option value="en">English (Global) – en</option>
      </select>
    </div>
  );
};

export default LanguageSelector;
