// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { useEffect, useRef } from "react";
import { DependencyChecker } from "./api/OllamaSettings/components/DependencyChecker";

interface RequirementsSettingsProps {
  onDependenciesReady: (ready: boolean) => void;
}

// Cache for dependency status
let dependencyCache: { status: any; timestamp: number } | null = null;
const CACHE_DURATION = 30000; // 30 seconds

/**
 * Componente para gerenciar os requisitos do sistema
 * Exibe e permite instalar as dependências necessárias (Ollama e Docker)
 */
const RequirementsSettings: React.FC<RequirementsSettingsProps> = ({
  onDependenciesReady,
}) => {
  const hasChecked = useRef(false);

  // Check dependencies on mount
  useEffect(() => {
    const checkInitialDependencies = async () => {
      // If we already checked recently, don't check again
      if (hasChecked.current) return;
      hasChecked.current = true;

      try {
        // Check cache first
        if (
          dependencyCache &&
          Date.now() - dependencyCache.timestamp < CACHE_DURATION
        ) {
          const isReady =
            dependencyCache.status.ollama.installed &&
            dependencyCache.status.docker.installed;
          onDependenciesReady(isReady);
          return;
        }

        // Perform actual check
        const status = await window.electronAPI.checkDependencies();

        // Update cache
        dependencyCache = { status, timestamp: Date.now() };

        const isReady = status.ollama.installed && status.docker.installed;
        onDependenciesReady(isReady);
      } catch (error) {
        console.error("Failed to check initial dependencies:", error);
        onDependenciesReady(false);
      }
    };

    checkInitialDependencies();
  }, [onDependenciesReady]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-cyan-300 mb-2">System Requirements</h3>
        <p className="text-cyan-100/60 text-sm mb-4">
          Orch-OS requires the following dependencies to enable advanced
          features:
        </p>
      </div>

      {/* Dependency Checker */}
      <DependencyChecker onDependenciesReady={onDependenciesReady} />
    </div>
  );
};

export default RequirementsSettings;
