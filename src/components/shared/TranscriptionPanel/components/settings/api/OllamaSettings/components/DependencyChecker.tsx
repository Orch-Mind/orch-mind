// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import {
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  DependencyStatus,
  InstallProgress,
} from "../../../../../../../../types/electron";

interface DependencyCheckerProps {
  onDependenciesReady: (ready: boolean) => void;
}

export const DependencyChecker: React.FC<DependencyCheckerProps> = ({
  onDependenciesReady,
}) => {
  const [status, setStatus] = useState<DependencyStatus | null>(null);
  const [checking, setChecking] = useState(true);
  const [initialCheck, setInitialCheck] = useState(true);
  const [installing, setInstalling] = useState<{
    ollama: boolean;
  }>({ ollama: false });
  const [installProgress, setInstallProgress] =
    useState<InstallProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showManualInstructions, setShowManualInstructions] = useState<{
    ollama: boolean;
  }>({ ollama: false });
  const [manualInstructions, setManualInstructions] = useState<{
    ollama: string;
  }>({ ollama: "" });

  // Check dependencies on mount
  useLayoutEffect(() => {
    checkDependencies();

    // Check dependencies periodically
    const interval = setInterval(checkDependencies, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Set up progress listener
    const cleanup = window.electronAPI.onInstallProgress((progress) => {
      setInstallProgress(progress);

      if (progress.status === "completed") {
        setInstalling((prev) => ({ ...prev, [progress.dependency]: false }));
        // Recheck dependencies after successful installation
        setTimeout(checkDependencies, 1000);
      } else if (progress.status === "error") {
        setInstalling((prev) => ({ ...prev, [progress.dependency]: false }));
        setError(progress.error || "Installation failed");
      }
    });

    return cleanup;
  }, []);

  const checkDependencies = async () => {
    // Only show checking state if it's not the initial check
    if (!initialCheck) {
      setChecking(true);
    }
    setError(null);

    try {
      const depStatus = await window.electronAPI.checkDependencies();
      setStatus(depStatus);

      // Notify parent component - only Ollama needed for desktop apps
      const isReady = depStatus.ollama.installed;
      onDependenciesReady(isReady);

      // Load manual instructions for Ollama
      const ollamaInstructions =
        await window.electronAPI.getInstallInstructions("ollama");
      setManualInstructions({
        ollama: ollamaInstructions,
      });
    } catch (err) {
      setError("Failed to check dependencies");
      console.error(err);
    } finally {
      setChecking(false);
      setInitialCheck(false);
    }
  };

  const installOllama = async () => {
    setInstalling((prev) => ({ ...prev, ollama: true }));
    setError(null);

    try {
      await window.electronAPI.installOllama();
    } catch (err) {
      setError("Failed to install Ollama. Try manual installation.");
      setShowManualInstructions((prev) => ({ ...prev, ollama: true }));
    }
  };

  // During initial check, return null to avoid flickering
  if (initialCheck && checking) {
    return null;
  }

  // Show loading state only for subsequent checks
  if (checking && !initialCheck) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3">
        <div className="flex items-center">
          <div className="animate-spin w-4 h-4 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full mr-2"></div>
          <span className="text-yellow-400 text-sm">
            Checking dependencies...
          </span>
        </div>
      </div>
    );
  }

  if (!status) return null;

  const allInstalled = status.ollama.installed;

  // Always show the dependency status in the Requirements tab
  return (
    <div className="space-y-3">
      {/* Success Banner when all installed */}
      {allInstalled && (
        <div className="bg-green-500/10 border border-green-500/30 rounded p-3">
          <div className="flex items-center">
            <CheckCircleIcon className="w-5 h-5 text-green-400 mr-2" />
            <div className="flex-1">
              <h4 className="text-green-400 font-medium text-sm">
                All Requirements Met! ✨
              </h4>
              <p className="text-green-400/70 text-xs mt-1">
                You can now access advanced features in the Advanced tab.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Warning Banner */}
      {!allInstalled && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400 mt-0.5 mr-2 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-yellow-400 font-medium text-sm">
                Dependencies Required
              </h4>
              <p className="text-yellow-400/70 text-xs mt-1">
                Install Ollama below to unlock advanced features.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded p-2">
          <p className="text-red-400 text-xs">{error}</p>
        </div>
      )}

      {/* Installation Progress */}
      {installProgress && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-400 text-sm font-medium">
              Installing {installProgress.dependency}...
            </span>
            {installProgress.progress && (
              <span className="text-blue-400 text-xs">
                {installProgress.progress}%
              </span>
            )}
          </div>
          <div className="relative h-2 bg-blue-500/20 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${installProgress.progress || 0}%` }}
            />
          </div>
          <p className="text-blue-400/70 text-xs mt-2">
            {installProgress.message}
          </p>
        </div>
      )}

      {/* Dependency Status */}
      <div className="space-y-2">
        {/* Ollama Status */}
        <div className="bg-black/30 border border-cyan-500/20 rounded p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm mr-2">🦙</span>
              <div>
                <h5 className="text-cyan-300 text-sm font-medium">Ollama</h5>
                {status.ollama.installed ? (
                  <p className="text-green-400 text-xs flex items-center mt-1">
                    <CheckCircleIcon className="w-3 h-3 mr-1" />
                    Installed{" "}
                    {status.ollama.version &&
                      status.ollama.version !== "installed" &&
                      `(v${status.ollama.version})`}
                  </p>
                ) : (
                  <p className="text-yellow-400 text-xs">Not installed</p>
                )}
              </div>
            </div>

            {!status.ollama.installed && (
              <button
                onClick={installOllama}
                disabled={installing.ollama}
                className="bg-cyan-600/30 hover:bg-cyan-500/40 text-cyan-300 rounded px-3 py-1 text-xs transition-colors disabled:opacity-50 flex items-center"
              >
                {installing.ollama ? (
                  <div className="animate-spin w-3 h-3 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full mr-1" />
                ) : (
                  <ArrowDownTrayIcon className="w-3 h-3 mr-1" />
                )}
                Install
              </button>
            )}
          </div>

          {/* Manual Instructions for Ollama */}
          {showManualInstructions.ollama && (
            <div className="mt-3 p-2 bg-black/20 rounded">
              <h6 className="text-cyan-400 text-xs font-medium mb-1">
                Manual Installation:
              </h6>
              <pre className="text-cyan-300/70 text-[10px] whitespace-pre-wrap">
                {manualInstructions.ollama}
              </pre>
            </div>
          )}
        </div>

        {/* Desktop App Notice */}
        <div className="bg-green-500/10 border border-green-500/30 rounded p-3 mt-3">
          <div className="flex items-start">
            <span className="text-lg mr-2">🖥️</span>
            <div className="flex-1">
              <h5 className="text-green-400 text-sm font-medium">
                Desktop Application
              </h5>
              <p className="text-green-400/70 text-xs mt-1">
                Orch-OS runs natively as a desktop application with excellent
                performance. Only Ollama is required for local LLM
                functionality.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={checkDependencies}
          className="text-cyan-400 hover:text-cyan-300 text-xs transition-colors"
        >
          Recheck Dependencies
        </button>
      </div>
    </div>
  );
};
