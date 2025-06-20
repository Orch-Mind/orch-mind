// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { EventEmitter } from "events";
import { DependencyInstaller } from "../../../electron/services/dependency-installer/DependencyInstaller";
import { InstallProgress } from "../../../electron/services/dependency-installer/interfaces/IProgressReporter";

// Create mock implementations
const mockOllamaDep = {
  name: "ollama",
  displayName: "Ollama",
  check: jest.fn(),
  getManualInstructions: jest.fn().mockReturnValue(
    `Manual installation for macOS:
1. Download from https://ollama.com/download/mac
2. Open the downloaded file and drag Ollama to Applications
3. Launch Ollama from Applications
Alternative: Run 'brew install ollama' in Terminal`
  ),
  install: jest.fn(),
};

const mockDockerDep = {
  name: "docker",
  displayName: "Docker",
  check: jest.fn(),
  getManualInstructions: jest.fn().mockReturnValue(
    `Manual installation for macOS:
1. Download Docker Desktop from https://docker.com/products/docker-desktop
2. Open the downloaded .dmg file
3. Drag Docker to Applications
4. Launch Docker Desktop
Alternative: Run 'brew install --cask docker' in Terminal`
  ),
  install: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
};

// Mock all dependencies
jest.mock(
  "../../../electron/services/dependency-installer/services/CommandExecutor"
);
jest.mock(
  "../../../electron/services/dependency-installer/services/OllamaDependency",
  () => ({
    OllamaDependency: jest.fn().mockImplementation(() => mockOllamaDep),
  })
);
jest.mock(
  "../../../electron/services/dependency-installer/services/DockerDependency",
  () => ({
    DockerDependency: jest.fn().mockImplementation(() => mockDockerDep),
  })
);
jest.mock(
  "../../../electron/services/dependency-installer/services/ProgressReporter"
);
jest.mock(
  "../../../electron/services/dependency-installer/strategies/PlatformInstallerFactory"
);

describe("DependencyInstaller", () => {
  let installer: DependencyInstaller;
  let mockProgressCallback: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock implementations
    mockOllamaDep.check.mockReset();
    mockOllamaDep.install.mockReset();
    mockDockerDep.check.mockReset();
    mockDockerDep.install.mockReset();
    mockDockerDep.start.mockReset();
    mockDockerDep.stop.mockReset();

    installer = new DependencyInstaller();
    mockProgressCallback = jest.fn();
  });

  describe("Constructor and EventEmitter", () => {
    it("should extend EventEmitter", () => {
      expect(installer).toBeInstanceOf(EventEmitter);
    });

    it("should initialize dependencies", () => {
      expect(installer).toBeDefined();
      // The constructor should set up dependencies internally
    });
  });

  describe("checkDependencies", () => {
    it("should check all dependencies and return combined status", async () => {
      mockOllamaDep.check.mockResolvedValueOnce({
        installed: true,
        version: "0.1.24",
      });
      mockDockerDep.check.mockResolvedValueOnce({
        installed: true,
        version: "24.0.5",
        running: true,
      });

      const status = await installer.checkDependencies();

      expect(status).toEqual({
        ollama: { installed: true, version: "0.1.24" },
        docker: { installed: true, version: "24.0.5", running: true },
      });
      expect(mockOllamaDep.check).toHaveBeenCalled();
      expect(mockDockerDep.check).toHaveBeenCalled();
    });

    it("should handle check failures gracefully", async () => {
      mockOllamaDep.check.mockResolvedValueOnce({ installed: false });
      mockDockerDep.check.mockRejectedValueOnce(new Error("Check failed"));

      await expect(installer.checkDependencies()).rejects.toThrow(
        "Check failed"
      );
    });
  });

  describe("checkDependency", () => {
    it("should check specific dependency", async () => {
      mockOllamaDep.check.mockResolvedValueOnce({
        installed: true,
        version: "0.1.24",
      });

      const status = await installer.checkDependency("ollama");

      expect(status).toEqual({ installed: true, version: "0.1.24" });
      expect(mockOllamaDep.check).toHaveBeenCalled();
    });

    it("should throw error for unknown dependency", async () => {
      await expect(installer.checkDependency("unknown")).rejects.toThrow(
        "Unknown dependency: unknown"
      );
    });
  });

  describe("installOllama", () => {
    it("should install Ollama dependency", async () => {
      mockOllamaDep.check
        .mockResolvedValueOnce({ installed: false })
        .mockResolvedValueOnce({ installed: true, version: "0.1.24" });

      const progressReporter = (installer as any).progressReporter;
      jest.spyOn(progressReporter, "reportChecking");
      jest.spyOn(progressReporter, "reportCompleted");

      await installer.installOllama();

      expect(mockOllamaDep.install).toHaveBeenCalled();
    });
  });

  describe("installDocker", () => {
    it("should install Docker dependency", async () => {
      mockDockerDep.check
        .mockResolvedValueOnce({ installed: false })
        .mockResolvedValueOnce({ installed: true, version: "24.0.5" });

      await installer.installDocker();

      expect(mockDockerDep.install).toHaveBeenCalled();
    });
  });

  describe("getManualInstructions", () => {
    it("should return manual instructions for valid dependency", () => {
      const instructions = installer.getManualInstructions("ollama");
      expect(instructions).toBeTruthy();
      expect(instructions.length).toBeGreaterThan(10);
      expect(instructions).toContain("ollama");
    });

    it("should return error message for unknown dependency", () => {
      const instructions = installer.getManualInstructions("unknown" as any);
      expect(instructions).toBe("Unknown dependency");
    });
  });

  describe("tryStartDockerDaemon", () => {
    it("should attempt to start Docker daemon", async () => {
      mockDockerDep.start.mockResolvedValueOnce(true);

      const result = await installer.tryStartDockerDaemon();

      expect(result).toBe(true);
      expect(mockDockerDep.start).toHaveBeenCalled();
    });

    it("should return false if docker is not a service dependency", async () => {
      // Temporarily remove start method
      const originalStart = mockDockerDep.start;
      delete (mockDockerDep as any).start;

      const result = await installer.tryStartDockerDaemon();

      expect(result).toBe(false);

      // Restore start method
      mockDockerDep.start = originalStart;
    });
  });

  describe("Progress Events", () => {
    it("should forward progress events", (done) => {
      installer.onProgress((progress: InstallProgress) => {
        expect(progress).toEqual({
          dependency: "test",
          status: "checking",
          message: "Test message",
        });
        done();
      });

      // Emit progress event
      installer.emit("progress", {
        dependency: "test",
        status: "checking",
        message: "Test message",
      });
    });

    it("should handle multiple progress listeners", () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      installer.onProgress(listener1);
      installer.onProgress(listener2);

      const progress: InstallProgress = {
        dependency: "test",
        status: "installing",
        message: "Installing...",
        progress: 50,
      };

      installer.emit("progress", progress);

      expect(listener1).toHaveBeenCalledWith(progress);
      expect(listener2).toHaveBeenCalledWith(progress);
    });
  });

  describe("Private installDependency method", () => {
    it("should skip installation if already installed", async () => {
      mockOllamaDep.check.mockResolvedValueOnce({
        installed: true,
        version: "1.0.0",
      });

      const progressReporter = (installer as any).progressReporter;
      const reportCheckingSpy = jest.spyOn(progressReporter, "reportChecking");
      const reportCompletedSpy = jest.spyOn(
        progressReporter,
        "reportCompleted"
      );

      await installer.installOllama();

      expect(mockOllamaDep.check).toHaveBeenCalled();
      expect(mockOllamaDep.install).not.toHaveBeenCalled();
      expect(reportCheckingSpy).toHaveBeenCalledWith(
        "ollama",
        "Checking current installation status..."
      );
      expect(reportCompletedSpy).toHaveBeenCalledWith(
        "ollama",
        "Ollama is already installed!"
      );
    });

    it("should install dependency if not installed", async () => {
      mockOllamaDep.check
        .mockResolvedValueOnce({ installed: false })
        .mockResolvedValueOnce({ installed: true, version: "1.0.0" });

      mockOllamaDep.install.mockResolvedValueOnce(undefined);

      const progressReporter = (installer as any).progressReporter;
      const reportCompletedSpy = jest.spyOn(
        progressReporter,
        "reportCompleted"
      );

      await installer.installOllama();

      expect(mockOllamaDep.check).toHaveBeenCalledTimes(2);
      expect(mockOllamaDep.install).toHaveBeenCalled();
      expect(reportCompletedSpy).toHaveBeenCalledWith(
        "ollama",
        "Ollama installed successfully!"
      );
    });

    it("should throw error if installation verification fails", async () => {
      mockOllamaDep.check.mockResolvedValue({ installed: false });
      mockOllamaDep.install.mockResolvedValueOnce(undefined);

      await expect(installer.installOllama()).rejects.toThrow(
        "Ollama installation verification failed"
      );
    });

    it("should report error on installation failure", async () => {
      mockOllamaDep.check.mockResolvedValueOnce({ installed: false });
      mockOllamaDep.install.mockRejectedValueOnce(new Error("Install failed"));

      const progressReporter = (installer as any).progressReporter;
      const reportErrorSpy = jest.spyOn(progressReporter, "reportError");

      await expect(installer.installOllama()).rejects.toThrow("Install failed");

      expect(reportErrorSpy).toHaveBeenCalledWith(
        "ollama",
        "Failed to install Ollama",
        "Install failed"
      );
    });
  });
});
