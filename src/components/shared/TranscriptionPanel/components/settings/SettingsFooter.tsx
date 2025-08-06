// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import { useTranslation } from "react-i18next";
import { SettingsFooterProps } from "./types";

/**
 * Componente para o rodapé do modal de configurações
 * Implementa o princípio de responsabilidade única isolando
 * a interface de ações do usuário
 */
const SettingsFooter: React.FC<SettingsFooterProps> = ({
  onClose,
  saveSettings,
}) => {
  const { t } = useTranslation();
  
  // Handler para salvar configurações e fechar
  const handleApplyChanges = () => {
    saveSettings();
    onClose();
  };

  return (
    <div className="flex justify-end space-x-4 mt-8">
      <button
        className="px-6 py-2 text-cyan-400/80 rounded-lg transition-all"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.3)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid rgba(0, 250, 255, 0.2)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.4)";
          e.currentTarget.style.borderColor = "rgba(0, 250, 255, 0.4)";
          e.currentTarget.style.boxShadow = "0 0 15px rgba(0, 250, 255, 0.2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.3)";
          e.currentTarget.style.borderColor = "rgba(0, 250, 255, 0.2)";
          e.currentTarget.style.boxShadow = "";
        }}
        onClick={onClose}
      >
        {t('common.cancel')}
      </button>
      <button
        className="px-6 py-2 text-cyan-300 rounded-lg transition-all"
        style={{
          background:
            "linear-gradient(135deg, rgba(0, 250, 255, 0.15) 0%, rgba(124, 77, 255, 0.15) 100%)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid rgba(0, 250, 255, 0.4)",
          boxShadow:
            "0 0 20px rgba(0, 250, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background =
            "linear-gradient(135deg, rgba(0, 250, 255, 0.25) 0%, rgba(124, 77, 255, 0.25) 100%)";
          e.currentTarget.style.borderColor = "rgba(0, 250, 255, 0.6)";
          e.currentTarget.style.boxShadow =
            "0 0 30px rgba(0, 250, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background =
            "linear-gradient(135deg, rgba(0, 250, 255, 0.15) 0%, rgba(124, 77, 255, 0.15) 100%)";
          e.currentTarget.style.borderColor = "rgba(0, 250, 255, 0.4)";
          e.currentTarget.style.boxShadow =
            "0 0 20px rgba(0, 250, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)";
          e.currentTarget.style.transform = "";
        }}
        onClick={handleApplyChanges}
      >
        {t('common.apply')}
      </button>
    </div>
  );
};

export default SettingsFooter;
