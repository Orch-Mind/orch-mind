// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { ICommandExecutor } from "../../../electron/services/dependency-installer/interfaces/IDependency";
import { IPlatformInstaller } from "../../../electron/services/dependency-installer/interfaces/IPlatformInstaller";
import { DockerDependency } from "../../../electron/services/dependency-installer/services/DockerDependency";

describe("DockerDependency", () => {
  let mockCommandExecutor: jest.Mocked<ICommandExecutor>;
  let mockInstallerFactory: jest.MockedFunction<
    (platform: NodeJS.Platform) => IPlatformInstaller
  >;
  let mockInstaller: jest.Mocked<IPlatformInstaller>;
  let dependency: DockerDependency;

  beforeEach(() => {
    // Mock command executor
    mockCommandExecutor = {
      execute: jest.fn(),
      executeWithProgress: jest.fn(),
      checkCommand: jest.fn(),
    };

    // Mock installer
    mockInstaller = {
      platform: "darwin" as NodeJS.Platform,
      canHandle: jest.fn().mockReturnValue(true),
      install: jest.fn(),
      checkPrivileges: jest.fn().mockResolvedValue(true),
      getManualInstructions: jest.fn().mockImplementation((dep: string) => {
        if (dep === "docker") {
          return `Manual installation for macOS:
1. Download Docker Desktop from https://docker.com/products/docker-desktop
2. Open the downloaded .dmg file
3. Drag Docker to Applications
4. Launch Docker Desktop
Alternative: Run 'brew install --cask docker' in Terminal`;
        }
        return "Unknown dependency";
      }),
    };

    // Mock installer factory
    mockInstallerFactory = jest.fn().mockReturnValue(mockInstaller);

    dependency = new DockerDependency(
      mockCommandExecutor,
      mockInstallerFactory
    );
  });

  describe("Basic properties", () => {
    it("should have correct name and display name", () => {
      expect(dependency.name).toBe("docker");
      expect(dependency.displayName).toBe("Docker");
    });
  });

  describe("check", () => {
    it("should return full status when docker is running", async () => {
      mockCommandExecutor.execute
        .mockResolvedValueOnce({
          stdout: "Docker version 24.0.5, build 1234567",
          stderr: "",
        })
        .mockResolvedValueOnce({
          stdout: "running containers...",
          stderr: "",
        });

      const status = await dependency.check();

      expect(status.installed).toBe(true);
      expect(status.version).toBe("24.0.5");
      expect(status.running).toBe(true);
      expect(mockCommandExecutor.execute).toHaveBeenCalledWith(
        "docker --version"
      );
      expect(mockCommandExecutor.execute).toHaveBeenCalledWith("docker ps");
    });

    it("should return installed but not running when docker daemon is stopped", async () => {
      mockCommandExecutor.execute
        .mockResolvedValueOnce({
          stdout: "Docker version 24.0.5, build 1234567",
          stderr: "",
        })
        .mockRejectedValueOnce(new Error("Cannot connect to Docker daemon"));

      const status = await dependency.check();

      expect(status.installed).toBe(true);
      expect(status.version).toBe("24.0.5");
      expect(status.running).toBe(false);
    });

    it("should return not installed when docker is not found", async () => {
      mockCommandExecutor.execute.mockRejectedValueOnce(
        new Error("Command not found")
      );

      const status = await dependency.check();

      expect(status.installed).toBe(false);
      expect(status.version).toBeUndefined();
      expect(status.running).toBeUndefined();
    });

    it("should handle Docker Desktop version format", async () => {
      mockCommandExecutor.execute
        .mockResolvedValueOnce({
          stdout:
            "Docker Desktop 4.25.0 (126437)\nDocker version 24.0.6, build ed223bc",
          stderr: "",
        })
        .mockResolvedValueOnce({
          stdout: "running containers...",
          stderr: "",
        });

      const status = await dependency.check();

      expect(status.version).toBe("24.0.6");
    });
  });

  describe("start", () => {
    it("should start Docker daemon on macOS", async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, "platform", { value: "darwin" });

      mockCommandExecutor.execute
        .mockResolvedValueOnce({ stdout: "Docker Desktop started", stderr: "" })
        // Mock the wait for Docker - simulate successful start
        .mockRejectedValueOnce(new Error("Not ready"))
        .mockResolvedValueOnce({ stdout: "CONTAINER ID...", stderr: "" });

      const result = await dependency.start();

      expect(result).toBe(true);
      expect(mockCommandExecutor.execute).toHaveBeenCalledWith(
        "open -a Docker"
      );

      Object.defineProperty(process, "platform", { value: originalPlatform });
    });

    it("should start Docker service on Linux", async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, "platform", { value: "linux" });

      mockCommandExecutor.execute
        .mockResolvedValueOnce({ stdout: "Docker service started", stderr: "" })
        .mockResolvedValueOnce({ stdout: "CONTAINER ID...", stderr: "" });

      const result = await dependency.start();

      expect(result).toBe(true);
      expect(mockCommandExecutor.execute).toHaveBeenCalledWith(
        "sudo systemctl start docker"
      );

      Object.defineProperty(process, "platform", { value: originalPlatform });
    });

    it("should start Docker Desktop on Windows", async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, "platform", { value: "win32" });

      mockCommandExecutor.execute
        .mockResolvedValueOnce({ stdout: "Docker Desktop started", stderr: "" })
        .mockResolvedValueOnce({ stdout: "CONTAINER ID...", stderr: "" });

      const result = await dependency.start();

      expect(result).toBe(true);
      expect(mockCommandExecutor.execute).toHaveBeenCalledWith(
        'start "" "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe"'
      );

      Object.defineProperty(process, "platform", { value: originalPlatform });
    });

    it("should return false on start failure", async () => {
      mockCommandExecutor.execute.mockRejectedValue(
        new Error("Failed to start")
      );

      const result = await dependency.start();

      expect(result).toBe(false);
    });
  });

  describe("stop", () => {
    it("should stop Docker on macOS", async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, "platform", { value: "darwin" });

      // macOS stop returns true without executing commands (GUI interaction required)
      const result = await dependency.stop();

      expect(result).toBe(true);
      // No command execution expected for macOS

      Object.defineProperty(process, "platform", { value: originalPlatform });
    });

    it("should stop Docker service on Linux", async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, "platform", { value: "linux" });

      mockCommandExecutor.execute.mockResolvedValueOnce({
        stdout: "Docker service stopped",
        stderr: "",
      });

      const result = await dependency.stop();

      expect(result).toBe(true);
      expect(mockCommandExecutor.execute).toHaveBeenCalledWith(
        "sudo systemctl stop docker"
      );

      Object.defineProperty(process, "platform", { value: originalPlatform });
    });

    it("should return false on stop failure on Linux", async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, "platform", { value: "linux" });

      mockCommandExecutor.execute.mockRejectedValueOnce(
        new Error("Failed to stop")
      );

      const result = await dependency.stop();

      expect(result).toBe(false);

      Object.defineProperty(process, "platform", { value: originalPlatform });
    });
  });

  describe("getManualInstructions", () => {
    it("should return macOS instructions", () => {
      const instructions = dependency.getManualInstructions("darwin");

      expect(mockInstallerFactory).toHaveBeenCalledWith("darwin");
      expect(mockInstaller.getManualInstructions).toHaveBeenCalledWith(
        "docker"
      );
      expect(instructions).toContain("macOS");
      expect(instructions).toContain("Docker Desktop");
      expect(instructions).toContain("docker.com/products/docker-desktop");
    });

    it("should return Windows instructions", () => {
      mockInstaller.getManualInstructions.mockReturnValueOnce(
        `Manual installation for Windows:
1. Download Docker Desktop from https://docker.com/products/docker-desktop
2. Install Docker Desktop with WSL 2 backend
3. Follow the installation wizard`
      );

      const instructions = dependency.getManualInstructions("win32");

      expect(instructions).toContain("Windows");
      expect(instructions).toContain("Docker Desktop");
      expect(instructions).toContain("WSL 2");
    });

    it("should return Linux instructions", () => {
      mockInstaller.getManualInstructions.mockReturnValueOnce(
        `Manual installation for Linux:
1. Update package index: sudo apt-get update
2. Install Docker: sudo apt-get install docker.io
3. Start service: sudo systemctl start docker
4. Enable on boot: sudo systemctl enable docker`
      );

      const instructions = dependency.getManualInstructions("linux");

      expect(instructions).toContain("Linux");
      expect(instructions).toContain("apt-get");
      expect(instructions).toContain("systemctl");
    });

    it("should return generic instructions for unknown platforms", () => {
      mockInstaller.getManualInstructions.mockReturnValueOnce(
        "Please visit https://docker.com for installation instructions."
      );

      const instructions = dependency.getManualInstructions(
        "freebsd" as NodeJS.Platform
      );

      expect(instructions).toContain("docker.com");
      expect(instructions).not.toContain("macOS");
      expect(instructions).not.toContain("Windows");
      expect(instructions).not.toContain("Linux");
    });
  });

  describe("install", () => {
    it("should delegate installation to platform installer", async () => {
      await dependency.install(mockCommandExecutor, "darwin");

      expect(mockInstallerFactory).toHaveBeenCalledWith("darwin");
      expect(mockInstaller.install).toHaveBeenCalledWith("docker");
    });
  });
});
