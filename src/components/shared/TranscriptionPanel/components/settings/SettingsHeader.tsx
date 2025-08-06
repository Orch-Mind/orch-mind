// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import { useTranslation } from "react-i18next";
import { SettingsHeaderProps } from "./types";

/**
 * Componente para o cabeçalho do modal de configurações
 * Separado seguindo o princípio de responsabilidade única (SRP)
 */
const SettingsHeader: React.FC<SettingsHeaderProps> = ({ onClose }) => {
  const { t } = useTranslation();
  return (
    <>
      <button
        onClick={onClose}
        className="absolute top-3 right-3 w-12 h-12 rounded-full flex items-center justify-center"
        style={{
          // Base styles
          backgroundColor: "rgba(0, 0, 0, 0.3)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid rgba(0, 250, 255, 0.2)",
          color: "rgba(0, 250, 255, 0.8)",

          // Remove default browser styles
          outline: "none",
          WebkitTapHighlightColor: "transparent",
          WebkitTouchCallout: "none",
          userSelect: "none",
          MozUserSelect: "none",
          WebkitUserSelect: "none",
          msUserSelect: "none",

          // Smooth transitions
          transition: "all 0.2s ease",
          cursor: "pointer",

          // Position
          zIndex: 10,
        }}
        // Hover styles
        onMouseEnter={(e) => {
          const btn = e.currentTarget;
          btn.style.backgroundColor = "rgba(239, 68, 68, 0.2)";
          btn.style.borderColor = "rgba(239, 68, 68, 0.4)";
          btn.style.color = "rgba(248, 113, 113, 1)";
          btn.style.transform = "scale(1.05)";
          btn.style.boxShadow = "0 0 20px rgba(239, 68, 68, 0.3)";
        }}
        onMouseLeave={(e) => {
          const btn = e.currentTarget;
          btn.style.backgroundColor = "rgba(0, 0, 0, 0.3)";
          btn.style.borderColor = "rgba(0, 250, 255, 0.2)";
          btn.style.color = "rgba(0, 250, 255, 0.8)";
          btn.style.transform = "scale(1)";
          btn.style.boxShadow = "none";
        }}
        // Active state
        onMouseDown={(e) => {
          const btn = e.currentTarget;
          btn.style.transform = "scale(0.95)";
        }}
        onMouseUp={(e) => {
          const btn = e.currentTarget;
          btn.style.transform = "scale(1.05)";
        }}
        // Focus styles (keyboard navigation)
        onFocus={(e) => {
          const btn = e.currentTarget;
          btn.style.boxShadow = "0 0 0 2px rgba(0, 250, 255, 0.5)";
        }}
        onBlur={(e) => {
          const btn = e.currentTarget;
          btn.style.boxShadow = "none";
        }}
        title={t('settings.closeSettings')}
        type="button"
        aria-label={t('settings.closeSettings')}
        role="button"
        tabIndex={0}
      >
        {/* Icon */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 16 16"
          fill="currentColor"
          style={{
            transition: "transform 0.2s ease",
            pointerEvents: "none",
          }}
        >
          <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
        </svg>
      </button>

      <h2 className="text-2xl font-bold mb-4 text-center tracking-wide bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(0,240,255,0.5)] orchos-title">
        {t('settings.title')}
      </h2>
    </>
  );
};

export default SettingsHeader;
