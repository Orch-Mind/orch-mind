// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { ICommandExecutor } from "../../../electron/services/dependency-installer/interfaces/IDependency";
import { IPlatformInstaller } from "../../../electron/services/dependency-installer/interfaces/IPlatformInstaller";
import { OllamaDependency } from "../../../electron/services/dependency-installer/services/OllamaDependency";

describe("OllamaDependency", () => {
  let mockCommandExecutor: jest.Mocked<ICommandExecutor>;
  let mockInstallerFactory: jest.MockedFunction<
    (platform: NodeJS.Platform) => IPlatformInstaller
  >;
  let mockInstaller: jest.Mocked<IPlatformInstaller>;
  let dependency: OllamaDependency;

  beforeEach(() => {
    // Mock command executor
    mockCommandExecutor = {
      execute: jest.fn(),
      executeWithProgress: jest.fn(),
      checkCommand: jest.fn(),
    };

    // Mock installer with proper manual instructions
    mockInstaller = {
      platform: "darwin" as NodeJS.Platform,
      canHandle: jest.fn().mockReturnValue(true),
      install: jest.fn(),
      checkPrivileges: jest.fn().mockResolvedValue(true),
      getManualInstructions: jest.fn().mockImplementation((dep: string) => {
        if (dep === "ollama") {
          const platform = process.platform;
          if (platform === "darwin") {
            return `Manual installation for macOS:
1. Download from https://ollama.com/download/mac
2. Open the downloaded file and drag Ollama to Applications
3. Launch Ollama from Applications
Alternative: Run 'brew install ollama' in Terminal`;
          } else if (platform === "win32") {
            return `Manual installation for Windows:
1. Download from https://ollama.com/download/windows
2. Run the downloaded .exe installer
3. Follow the installation wizard`;
          } else {
            return `Manual installation for Linux:
1. Run: curl -fsSL https://ollama.ai/install.sh | sh
Or visit https://ollama.com/download for more options`;
          }
        }
        return "Unknown dependency";
      }),
    };

    // Mock installer factory
    mockInstallerFactory = jest.fn().mockReturnValue(mockInstaller);

    dependency = new OllamaDependency(
      mockCommandExecutor,
      mockInstallerFactory
    );
  });

  describe("Basic properties", () => {
    it("should have correct name and display name", () => {
      expect(dependency.name).toBe("ollama");
      expect(dependency.displayName).toBe("Ollama");
    });
  });

  describe("check", () => {
    it("should return installed true when ollama version command works", async () => {
      // First command succeeds
      mockCommandExecutor.execute
        .mockResolvedValueOnce({
          stdout: "ollama version 0.1.24",
          stderr: "",
        })
        .mockResolvedValueOnce({
          stdout: "/usr/local/bin/ollama",
          stderr: "",
        });

      const status = await dependency.check();

      expect(status.installed).toBe(true);
      expect(status.version).toBe("0.1.24");
      expect(status.path).toBe("/usr/local/bin/ollama");
      expect(mockCommandExecutor.execute).toHaveBeenCalledWith(
        "ollama --version"
      );
      expect(mockCommandExecutor.execute).toHaveBeenCalledWith("which ollama");
    });

    it("should try multiple version commands", async () => {
      // First command fails, second succeeds
      mockCommandExecutor.execute
        .mockRejectedValueOnce(new Error("Command failed"))
        .mockResolvedValueOnce({
          stdout: "0.9.1",
          stderr: "",
        })
        .mockResolvedValueOnce({
          stdout: "/usr/local/bin/ollama",
          stderr: "",
        });

      const status = await dependency.check();

      expect(status.installed).toBe(true);
      expect(status.version).toBe("0.9.1");
      expect(mockCommandExecutor.execute).toHaveBeenCalledWith(
        "ollama --version"
      );
      expect(mockCommandExecutor.execute).toHaveBeenCalledWith(
        "ollama version"
      );
    });

    it("should fallback to checkCommand if all version commands fail", async () => {
      // All version commands fail
      mockCommandExecutor.execute
        .mockRejectedValueOnce(new Error("Command failed"))
        .mockRejectedValueOnce(new Error("Command failed"))
        .mockRejectedValueOnce(new Error("Command failed"))
        .mockResolvedValueOnce({
          stdout: "/usr/local/bin/ollama",
          stderr: "",
        });

      mockCommandExecutor.checkCommand.mockResolvedValueOnce(true);

      const status = await dependency.check();

      expect(status.installed).toBe(true);
      expect(status.version).toBe("installed");
      expect(mockCommandExecutor.checkCommand).toHaveBeenCalledWith("ollama");
    });

    it("should return installed false when ollama is not found", async () => {
      // All commands fail
      mockCommandExecutor.execute.mockRejectedValue(
        new Error("Command failed")
      );
      mockCommandExecutor.checkCommand.mockResolvedValueOnce(false);

      const status = await dependency.check();

      expect(status.installed).toBe(false);
      expect(status.version).toBeUndefined();
    });

    it("should extract version correctly from different formats", async () => {
      mockCommandExecutor.execute
        .mockResolvedValueOnce({
          stdout: "Ollama v0.9.1\nBuild: abc123",
          stderr: "",
        })
        .mockResolvedValueOnce({
          stdout: "/usr/local/bin/ollama",
          stderr: "",
        });

      const status = await dependency.check();

      expect(status.version).toBe("0.9.1");
    });
  });

  describe("install", () => {
    it("should delegate installation to platform installer", async () => {
      await dependency.install(mockCommandExecutor, "darwin");

      expect(mockInstallerFactory).toHaveBeenCalledWith("darwin");
      expect(mockInstaller.install).toHaveBeenCalledWith("ollama");
    });

    it("should use different installers for different platforms", async () => {
      const linuxInstaller: jest.Mocked<IPlatformInstaller> = {
        platform: "linux",
        canHandle: jest.fn().mockReturnValue(true),
        install: jest.fn(),
        checkPrivileges: jest.fn().mockResolvedValue(true),
        getManualInstructions: jest.fn(),
      };

      mockInstallerFactory.mockReturnValueOnce(linuxInstaller);

      await dependency.install(mockCommandExecutor, "linux");

      expect(mockInstallerFactory).toHaveBeenCalledWith("linux");
      expect(linuxInstaller.install).toHaveBeenCalledWith("ollama");
    });
  });

  describe("getManualInstructions", () => {
    it("should delegate to platform installer for macOS", () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, "platform", { value: "darwin" });

      const instructions = dependency.getManualInstructions("darwin");

      expect(mockInstallerFactory).toHaveBeenCalledWith("darwin");
      expect(mockInstaller.getManualInstructions).toHaveBeenCalledWith(
        "ollama"
      );
      expect(instructions).toContain("macOS");
      expect(instructions).toContain("brew install ollama");
      expect(instructions).toContain("ollama.com/download");

      Object.defineProperty(process, "platform", { value: originalPlatform });
    });

    it("should delegate to platform installer for Windows", () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, "platform", { value: "win32" });

      mockInstaller.getManualInstructions.mockReturnValueOnce(
        `Manual installation for Windows:
1. Download from https://ollama.com/download/windows
2. Run the downloaded .exe installer
3. Follow the installation wizard`
      );

      const instructions = dependency.getManualInstructions("win32");

      expect(instructions).toContain("Windows");
      expect(instructions).toContain("ollama.com/download");
      expect(instructions).toContain(".exe");

      Object.defineProperty(process, "platform", { value: originalPlatform });
    });

    it("should delegate to platform installer for Linux", () => {
      mockInstaller.getManualInstructions.mockReturnValueOnce(
        `Manual installation for Linux:
1. Run: curl -fsSL https://ollama.ai/install.sh | sh
Or visit https://ollama.com/download for more options`
      );

      const instructions = dependency.getManualInstructions("linux");

      expect(instructions).toContain("Linux");
      expect(instructions).toContain("curl");
      expect(instructions).toContain("install.sh");
    });

    it("should delegate to platform installer for unknown platforms", () => {
      mockInstaller.getManualInstructions.mockReturnValueOnce(
        "Please visit https://ollama.com/download for installation instructions."
      );

      const instructions = dependency.getManualInstructions(
        "freebsd" as NodeJS.Platform
      );

      expect(instructions).toContain("ollama.com/download");
      expect(instructions).not.toContain("macOS");
      expect(instructions).not.toContain("Windows");
      expect(instructions).not.toContain("Linux");
    });
  });
});
