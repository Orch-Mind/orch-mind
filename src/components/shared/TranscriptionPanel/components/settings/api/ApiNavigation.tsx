// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";

/**
 * Componente de navegação entre seções de API
 * Implementa princípio de Responsabilidade Única (SRP) do SOLID
 * Simplificado para usar apenas Ollama
 */
interface ApiNavigationProps {
  openSection: "ollama" | null;
  setOpenSection: (section: "ollama" | null) => void;
}

export const ApiNavigation: React.FC<ApiNavigationProps> = ({
  openSection,
  setOpenSection,
}) => {
  return (
    <div className="mb-6 border-b border-cyan-900/40">
      <div className="flex space-x-6">
        <button
          type="button"
          className={`px-3 py-2 font-medium transition-colors border-b-2 ${
            openSection === "ollama"
              ? "text-cyan-300 border-cyan-500/70"
              : "text-cyan-500/60 border-transparent hover:text-cyan-400/80 hover:border-cyan-600/30"
          }`}
          onClick={() =>
            setOpenSection(openSection === "ollama" ? null : "ollama")
          }
        >
          🦙 Ollama Local Models
        </button>
      </div>
    </div>
  );
};

export default ApiNavigation;
