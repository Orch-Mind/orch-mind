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
        className="group absolute top-3 right-3 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.3)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid rgba(0, 250, 255, 0.2)",
          color: "rgba(0, 250, 255, 0.8)",
          zIndex: 10,
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
        onMouseDown={(e) => e.preventDefault()}
        title="Close"
        type="button"
        aria-label="Close modal"
      >
        {/* Expanded click area */}
        <span
          className="absolute inset-0 -m-2 rounded-full"
          style={{ zIndex: -1 }}
        />

        {/* Hover effect overlay */}
        <span className="absolute inset-0 rounded-full transition-all duration-200 group-hover:bg-red-500/20 group-hover:border group-hover:border-red-500/40" />

        {/* Icon */}
        <svg
          className="relative z-10 w-5 h-5 transition-all duration-200 group-hover:text-red-400 group-hover:scale-110"
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          fill="currentColor"
          viewBox="0 0 16 16"
          style={{ pointerEvents: "none" }}
        >
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
