// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import LanguageSelector from "../LanguageSelector";

/**
 * Componente para configurações gerais do Orch-OS
 * Segue os princípios neurais-simbólicos (Single Responsibility)
 * Inclui agora configuração de idioma de transcrição
 */

interface GeneralSettingsProps {
  name: string;
  setName: (value: string) => void;
  // Language settings
  language: string;
  setLanguage: (value: string) => void;
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  name,
  setName,
  language,
  setLanguage,
}) => {
  return (
    <div className="space-y-4">
      {/* Nome de usuário - identidade simbólica */}
      <div>
        <h3 className="text-cyan-300 mb-2">User Name</h3>
        <input
          type="text"
          id="userName"
          className="w-full p-2 rounded-lg bg-black/30 border-2 border-cyan-400/40 text-white focus:outline-none focus:border-cyan-400"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
        />
      </div>

      {/* Language Selection */}
      <div className="pt-1">
        <h3 className="text-cyan-300 mb-2">Language</h3>
        <LanguageSelector language={language} setLanguage={setLanguage} />
      </div>
    </div>
  );
};

export default GeneralSettings;
