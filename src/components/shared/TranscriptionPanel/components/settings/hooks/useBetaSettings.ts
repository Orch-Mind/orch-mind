// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useEffect, useState } from "react";

/**
 * Hook para gerenciar configurações experimentais da aba Beta
 * Responsável por funcionalidades experimentais e em desenvolvimento
 */
export const useBetaSettings = () => {
  // Estado para Quantum Processing - por padrão desabilitado
  const [quantumProcessing, setQuantumProcessing] = useState<boolean>(false);

  // Estado para Quantum Visualization (Matrix) - por padrão desabilitado
  const [quantumVisualization, setQuantumVisualization] =
    useState<boolean>(false);

  // Função para salvar configurações beta no localStorage
  const saveBetaSettings = () => {
    try {
      localStorage.setItem("quantum_processing", String(quantumProcessing));
      localStorage.setItem("enable_matrix", String(quantumVisualization));
      console.log("✅ Beta settings saved successfully");
    } catch (error) {
      console.error("❌ Error saving beta settings:", error);
    }
  };

  // Função para carregar configurações beta do localStorage
  const loadBetaSettings = () => {
    try {
      const savedQuantumProcessing = localStorage.getItem("quantum_processing");
      if (savedQuantumProcessing !== null) {
        setQuantumProcessing(savedQuantumProcessing === "true");
      }

      const savedQuantumVisualization = localStorage.getItem("enable_matrix");
      if (savedQuantumVisualization !== null) {
        setQuantumVisualization(savedQuantumVisualization === "true");
      }
    } catch (error) {
      console.error("❌ Error loading beta settings:", error);
    }
  };

  // Carregar configurações do localStorage quando o componente é montado
  useEffect(() => {
    loadBetaSettings();
  }, []);

  // Retorna o estado e as funções para manipulação
  return {
    quantumProcessing,
    setQuantumProcessing,
    quantumVisualization,
    setQuantumVisualization,
    saveBetaSettings,
    loadBetaSettings,
  };
};
