// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getOption,
  setOption,
  STORAGE_KEYS,
} from "../../../../../../services/StorageService";

// Event names for cross-hook synchronization
const BETA_SETTINGS_EVENTS = {
  QUANTUM_PROCESSING_CHANGED: "orchos:quantumProcessingChanged",
  QUANTUM_VISUALIZATION_CHANGED: "orchos:quantumVisualizationChanged",
} as const;

// Custom event dispatcher for cross-hook sync
const dispatchBetaSettingsEvent = (eventName: string, value: boolean) => {
  if (typeof window !== "undefined") {
    const event = new CustomEvent(eventName, { detail: { value } });
    window.dispatchEvent(event);
    console.log(`📡 [BETA_SETTINGS] Dispatched event:`, eventName, value);
  }
};

/**
 * Hook para gerenciar configurações experimentais da aba Beta
 * Responsável por funcionalidades experimentais e em desenvolvimento
 * Implementa lazy initialization, prevenção de race conditions e sincronização cross-hook
 */
export const useBetaSettings = () => {
  // Flag para evitar salvar durante carregamento inicial
  const hasLoadedRef = useRef(false);
  // Flag para evitar loops infinitos de eventos
  const isUpdatingFromEventRef = useRef(false);

  // Estado para Quantum Processing - usa lazy initialization
  const [quantumProcessing, setQuantumProcessing] = useState<boolean>(() => {
    try {
      const savedValue = getOption<boolean>(
        STORAGE_KEYS.QUANTUM_PROCESSING_ENABLED
      );
      console.log("🔄 [BETA_SETTINGS] Loading Quantum Processing:", savedValue);
      return savedValue !== undefined ? savedValue : false;
    } catch (error) {
      console.error("❌ Error loading quantum processing setting:", error);
      return false;
    }
  });

  // Estado para Quantum Visualization - usa lazy initialization
  const [quantumVisualization, setQuantumVisualization] = useState<boolean>(
    () => {
      try {
        const savedValue = getOption<boolean>(
          STORAGE_KEYS.QUANTUM_VISUALIZATION_ENABLED
        );
        console.log(
          "🔄 [BETA_SETTINGS] Loading Quantum Visualization:",
          savedValue
        );
        return savedValue !== undefined ? savedValue : false;
      } catch (error) {
        console.error("❌ Error loading quantum visualization setting:", error);
        return false;
      }
    }
  );

  // Marca como carregado após a inicialização
  useEffect(() => {
    hasLoadedRef.current = true;
    console.log("✅ [BETA_SETTINGS] Initial load completed:", {
      quantumProcessing,
      quantumVisualization,
    });
  }, []);

  // Event listeners para sincronização cross-hook
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleQuantumProcessingChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ value: boolean }>;
      const newValue = customEvent.detail.value;

      if (!isUpdatingFromEventRef.current && newValue !== quantumProcessing) {
        console.log(
          "📨 [BETA_SETTINGS] Received quantum processing event:",
          newValue
        );
        isUpdatingFromEventRef.current = true;
        setQuantumProcessing(newValue);
        // Reset flag após update
        setTimeout(() => {
          isUpdatingFromEventRef.current = false;
        }, 0);
      }
    };

    const handleQuantumVisualizationChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ value: boolean }>;
      const newValue = customEvent.detail.value;

      if (
        !isUpdatingFromEventRef.current &&
        newValue !== quantumVisualization
      ) {
        console.log(
          "📨 [BETA_SETTINGS] Received quantum visualization event:",
          newValue
        );
        isUpdatingFromEventRef.current = true;
        setQuantumVisualization(newValue);
        // Reset flag após update
        setTimeout(() => {
          isUpdatingFromEventRef.current = false;
        }, 0);
      }
    };

    window.addEventListener(
      BETA_SETTINGS_EVENTS.QUANTUM_PROCESSING_CHANGED,
      handleQuantumProcessingChange
    );
    window.addEventListener(
      BETA_SETTINGS_EVENTS.QUANTUM_VISUALIZATION_CHANGED,
      handleQuantumVisualizationChange
    );

    return () => {
      window.removeEventListener(
        BETA_SETTINGS_EVENTS.QUANTUM_PROCESSING_CHANGED,
        handleQuantumProcessingChange
      );
      window.removeEventListener(
        BETA_SETTINGS_EVENTS.QUANTUM_VISUALIZATION_CHANGED,
        handleQuantumVisualizationChange
      );
    };
  }, [quantumProcessing, quantumVisualization]);

  // Função para salvar configurações beta apenas após carregamento inicial
  const saveBetaSettings = useCallback(
    (processing?: boolean, visualization?: boolean) => {
      // Só salva após o carregamento inicial para evitar race conditions
      if (!hasLoadedRef.current) {
        console.log("⏸️ [BETA_SETTINGS] Skipping save during initial load");
        return;
      }

      try {
        const processingValue =
          processing !== undefined ? processing : quantumProcessing;
        const visualizationValue =
          visualization !== undefined ? visualization : quantumVisualization;

        setOption(STORAGE_KEYS.QUANTUM_PROCESSING_ENABLED, processingValue);
        setOption(
          STORAGE_KEYS.QUANTUM_VISUALIZATION_ENABLED,
          visualizationValue
        );

        console.log("💾 [BETA_SETTINGS] Settings saved:", {
          quantumProcessing: processingValue,
          quantumVisualization: visualizationValue,
        });
      } catch (error) {
        console.error("❌ Error saving beta settings:", error);
      }
    },
    [quantumProcessing, quantumVisualization]
  );

  // Função para recarregar configurações manualmente
  const loadBetaSettings = useCallback(() => {
    try {
      const savedQuantumProcessing = getOption<boolean>(
        STORAGE_KEYS.QUANTUM_PROCESSING_ENABLED
      );
      const savedQuantumVisualization = getOption<boolean>(
        STORAGE_KEYS.QUANTUM_VISUALIZATION_ENABLED
      );

      console.log("🔄 [BETA_SETTINGS] Manual reload:", {
        savedQuantumProcessing,
        savedQuantumVisualization,
      });

      if (savedQuantumProcessing !== undefined) {
        setQuantumProcessing(savedQuantumProcessing);
      }

      if (savedQuantumVisualization !== undefined) {
        setQuantumVisualization(savedQuantumVisualization);
      }
    } catch (error) {
      console.error("❌ Error loading beta settings:", error);
    }
  }, []);

  // Auto-salvar quando os estados mudam (apenas após carregamento inicial)
  useEffect(() => {
    saveBetaSettings();
  }, [saveBetaSettings]);

  // Wrappers para setters que salvam imediatamente e disparam eventos
  const setQuantumProcessingWithSync = useCallback(
    (value: boolean) => {
      console.log("🧠 [BETA_SETTINGS] Setting Quantum Processing:", value);
      setQuantumProcessing(value);

      // Salva imediatamente para garantir persistência
      if (hasLoadedRef.current) {
        saveBetaSettings(value, quantumVisualization);
      }

      // Dispara evento para sincronizar outras instâncias (apenas se não estiver vindo de um evento)
      if (!isUpdatingFromEventRef.current) {
        dispatchBetaSettingsEvent(
          BETA_SETTINGS_EVENTS.QUANTUM_PROCESSING_CHANGED,
          value
        );
      }
    },
    [quantumVisualization, saveBetaSettings]
  );

  const setQuantumVisualizationWithSync = useCallback(
    (value: boolean) => {
      console.log("🌌 [BETA_SETTINGS] Setting Quantum Visualization:", value);
      setQuantumVisualization(value);

      // Salva imediatamente para garantir persistência
      if (hasLoadedRef.current) {
        saveBetaSettings(quantumProcessing, value);
      }

      // Dispara evento para sincronizar outras instâncias (apenas se não estiver vindo de um evento)
      if (!isUpdatingFromEventRef.current) {
        dispatchBetaSettingsEvent(
          BETA_SETTINGS_EVENTS.QUANTUM_VISUALIZATION_CHANGED,
          value
        );
      }
    },
    [quantumProcessing, saveBetaSettings]
  );

  // Retorna o estado e as funções para manipulação
  return {
    quantumProcessing,
    setQuantumProcessing: setQuantumProcessingWithSync,
    quantumVisualization,
    setQuantumVisualization: setQuantumVisualizationWithSync,
    saveBetaSettings,
    loadBetaSettings,
  };
};
