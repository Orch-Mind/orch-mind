// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import { SettingsHeaderProps } from "./types";

/**
 * Componente para o cabeçalho do modal de configurações
 * Separado seguindo o princípio de responsabilidade única (SRP)
 */
const SettingsHeader: React.FC<SettingsHeaderProps> = ({ onClose }) => {
  return (
    <>
      <button
        className="orchos-btn-circle absolute top-4 right-4"
        onClick={onClose}
        title="Close"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
          <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
        </svg>
      </button>
      
      <h2 className="text-2xl font-bold mb-4 text-center tracking-wide bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(0,240,255,0.5)] orchos-title">
        Quantum System Settings
      </h2>
    </>
  );
};

export default SettingsHeader;
