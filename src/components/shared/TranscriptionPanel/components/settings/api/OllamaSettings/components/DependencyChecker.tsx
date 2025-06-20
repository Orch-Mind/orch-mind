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
  const [dockerRequired, setDockerRequired] = useState(true);
  const [installing, setInstalling] = useState<{
    ollama: boolean;
    docker: boolean;
  }>({ ollama: false, docker: false });
  const [installProgress, setInstallProgress] =
    useState<InstallProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showManualInstructions, setShowManualInstructions] = useState<{
    ollama: boolean;
    docker: boolean;
  }>({ ollama: false, docker: false });
  const [manualInstructions, setManualInstructions] = useState<{
    ollama: string;
    docker: string;
  }>({ ollama: "", docker: "" });
  const [startingDocker, setStartingDocker] = useState(false);

  // Check dependencies on mount
  useLayoutEffect(() => {
    checkDependencies();

    // Check dependencies periodically
    const interval = setInterval(checkDependencies, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Detect hardware on mount to determine if Docker is needed
    detectHardware();

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

      // Notify parent component based on what's actually required
      const isReady = dockerRequired
        ? depStatus.ollama.installed && depStatus.docker.installed
        : depStatus.ollama.installed; // Only Ollama needed for Apple Silicon

      onDependenciesReady(isReady);

      // Load manual instructions for both dependencies
      const [ollamaInstructions, dockerInstructions] = await Promise.all([
        window.electronAPI.getInstallInstructions("ollama"),
        window.electronAPI.getInstallInstructions("docker"),
      ]);

      setManualInstructions({
        ollama: ollamaInstructions,
        docker: dockerInstructions,
      });

      // Check if Docker was just started automatically
      if (status && !status.docker.running && depStatus.docker.running) {
        setStartingDocker(false);
      } else if (
        status &&
        status.docker.installed &&
        !status.docker.running &&
        depStatus.docker.installed &&
        !depStatus.docker.running &&
        !startingDocker
      ) {
        setStartingDocker(true);
        // Reset startingDocker after 15 seconds if Docker doesn't start
        setTimeout(() => {
          setStartingDocker(false);
        }, 15000);
      }
    } catch (err) {
      setError("Failed to check dependencies");
      console.error(err);
    } finally {
      setChecking(false);
      setInitialCheck(false);
    }
  };

  const detectHardware = async () => {
    try {
      const result = await window.electronAPI.detectHardware();
      if (result.success) {
        setDockerRequired(result.dockerRequired);
        console.log(
          `[DependencyChecker] Hardware detected - Docker required: ${result.dockerRequired}`,
          result.hardware
        );
      }
    } catch (error) {
      console.error("[DependencyChecker] Failed to detect hardware:", error);
      // Default to requiring Docker if detection fails
      setDockerRequired(true);
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

  const installDocker = async () => {
    setInstalling((prev) => ({ ...prev, docker: true }));
    setError(null);

    try {
      await window.electronAPI.installDocker();
    } catch (err) {
      setError("Failed to install Docker. Try manual installation.");
      setShowManualInstructions((prev) => ({ ...prev, docker: true }));
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

  const allInstalled = dockerRequired
    ? status.ollama.installed && status.docker.installed
    : status.ollama.installed; // Only check Ollama for Apple Silicon

  // Always show the dependency status in the Requirements tab
  return (
    <div className="space-y-3">
      {/* Success Banner when all installed */}
      {allInstalled && (!dockerRequired || status.docker.running) && (
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

      {/* Partial Success Banner */}
      {allInstalled && dockerRequired && !status.docker.running && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3">
          <div className="flex items-start">
            <div className="animate-pulse w-5 h-5 mt-0.5 mr-2 flex-shrink-0">
              ⚡
            </div>
            <div className="flex-1">
              <h4 className="text-blue-400 font-medium text-sm">
                Almost Ready!
              </h4>
              <p className="text-blue-400/70 text-xs mt-1">
                All dependencies are installed. Just start Docker Desktop to
                enable advanced features.
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
                Install the missing dependencies below to unlock advanced
                features.
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

        {/* Docker Status - Only show if required */}
        {dockerRequired && (
          <div className="bg-black/30 border border-cyan-500/20 rounded p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-sm mr-2">🐳</span>
                <div>
                  <h5 className="text-cyan-300 text-sm font-medium">Docker</h5>
                  {status.docker.installed ? (
                    <div>
                      <p className="text-green-400 text-xs flex items-center mt-1">
                        <CheckCircleIcon className="w-3 h-3 mr-1" />
                        Installed{" "}
                        {status.docker.version && `(v${status.docker.version})`}
                      </p>
                      {status.docker.running && (
                        <p className="text-green-400 text-xs mt-1 flex items-center">
                          <span className="animate-pulse w-2 h-2 bg-green-400 rounded-full mr-1"></span>
                          Docker daemon is running
                        </p>
                      )}
                      {!status.docker.running && startingDocker && (
                        <p className="text-yellow-400 text-xs mt-1 flex items-center">
                          <span className="animate-spin w-3 h-3 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full mr-1"></span>
                          Starting Docker daemon...
                        </p>
                      )}
                      {!status.docker.running && !startingDocker && (
                        <p className="text-yellow-400 text-xs mt-1 flex items-center">
                          <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                          Docker daemon is not running
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-yellow-400 text-xs">Not installed</p>
                  )}
                </div>
              </div>

              {!status.docker.installed && (
                <button
                  onClick={installDocker}
                  disabled={installing.docker}
                  className="bg-cyan-600/30 hover:bg-cyan-500/40 text-cyan-300 rounded px-3 py-1 text-xs transition-colors disabled:opacity-50 flex items-center"
                >
                  {installing.docker ? (
                    <div className="animate-spin w-3 h-3 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full mr-1" />
                  ) : (
                    <ArrowDownTrayIcon className="w-3 h-3 mr-1" />
                  )}
                  Install
                </button>
              )}

              {status.docker.installed &&
                !status.docker.running &&
                !startingDocker && (
                  <p className="text-yellow-500 text-xs">
                    Launch Docker Desktop
                  </p>
                )}
            </div>

            {/* Manual Instructions for Docker */}
            {showManualInstructions.docker && (
              <div className="mt-3 p-2 bg-black/20 rounded">
                <h6 className="text-cyan-400 text-xs font-medium mb-1">
                  Manual Installation:
                </h6>
                <pre className="text-cyan-300/70 text-[10px] whitespace-pre-wrap">
                  {manualInstructions.docker}
                </pre>
              </div>
            )}

            {/* Docker Running Hint */}
            {status.docker.installed && !status.docker.running && (
              <div className="mt-2 p-2 bg-yellow-500/10 rounded border border-yellow-500/20">
                <p className="text-yellow-400 text-xs font-medium mb-1">
                  To start Docker:
                </p>
                <ul className="text-yellow-300/80 text-[10px] space-y-1">
                  <li>• Open Docker Desktop from your Applications</li>
                  <li>• Wait for the Docker icon in the system tray</li>
                  <li>• The whale icon should be steady (not animated)</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Apple Silicon Notice */}
        {!dockerRequired && (
          <div className="bg-green-500/10 border border-green-500/30 rounded p-3 mt-3">
            <div className="flex items-start">
              <span className="text-lg mr-2">🍎</span>
              <div className="flex-1">
                <h5 className="text-green-400 text-sm font-medium">
                  Apple Silicon Detected
                </h5>
                <p className="text-green-400/70 text-xs mt-1">
                  Your Mac uses Apple Silicon (M1/M2/M3) which provides
                  excellent performance with Ollama running natively. Docker is
                  not required for your system.
                </p>
              </div>
            </div>
          </div>
        )}
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
