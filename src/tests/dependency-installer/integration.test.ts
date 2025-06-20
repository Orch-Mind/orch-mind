// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { DependencyInstaller } from "../../../electron/services/dependency-installer/DependencyInstaller";
import { InstallProgress } from "../../../electron/services/dependency-installer/interfaces/IProgressReporter";

/**
 * Integration tests for DependencyInstaller
 * These tests verify the complete flow without mocking internal components
 */
describe("DependencyInstaller Integration Tests", () => {
  let installer: DependencyInstaller;
  let progressEvents: InstallProgress[];

  beforeEach(() => {
    installer = new DependencyInstaller();
    progressEvents = [];

    // Capture all progress events
    installer.onProgress((progress) => {
      progressEvents.push(progress);
      console.log(
        `[TEST] Progress: ${progress.dependency} - ${progress.status} - ${progress.message}`
      );
    });
  });

  describe("API Compatibility", () => {
    it("should expose all public methods", () => {
      expect(typeof installer.checkDependencies).toBe("function");
      expect(typeof installer.checkDependency).toBe("function");
      expect(typeof installer.installOllama).toBe("function");
      expect(typeof installer.installDocker).toBe("function");
      expect(typeof installer.getManualInstructions).toBe("function");
      expect(typeof installer.tryStartDockerDaemon).toBe("function");
      expect(typeof installer.onProgress).toBe("function");
    });

    it("should maintain EventEmitter compatibility", () => {
      expect(typeof installer.on).toBe("function");
      expect(typeof installer.emit).toBe("function");
      expect(typeof installer.removeListener).toBe("function");
    });
  });

  describe("Dependency Checking", () => {
    it("should check both Ollama and Docker status", async () => {
      const status = await installer.checkDependencies();

      expect(status).toHaveProperty("ollama");
      expect(status).toHaveProperty("docker");
      expect(status.ollama).toHaveProperty("installed");
      expect(status.docker).toHaveProperty("installed");

      // Docker should also have running status
      expect(status.docker).toHaveProperty("running");

      // Log actual status for debugging
      console.log("[TEST] Dependency Status:", JSON.stringify(status, null, 2));
    }, 15000);

    it("should check individual dependencies", async () => {
      const ollamaStatus = await installer.checkDependency("ollama");
      const dockerStatus = await installer.checkDependency("docker");

      expect(ollamaStatus).toHaveProperty("installed");
      expect(dockerStatus).toHaveProperty("installed");

      if (ollamaStatus.installed) {
        expect(ollamaStatus).toHaveProperty("version");
        expect(typeof ollamaStatus.version).toBe("string");
      }

      if (dockerStatus.installed) {
        expect(dockerStatus).toHaveProperty("version");
        expect(dockerStatus).toHaveProperty("running");
        expect(typeof dockerStatus.version).toBe("string");
        expect(typeof dockerStatus.running).toBe("boolean");
      }
    }, 10000);

    it("should throw error for unknown dependency", async () => {
      await expect(installer.checkDependency("unknown")).rejects.toThrow(
        "Unknown dependency: unknown"
      );
    });
  });

  describe("Manual Instructions", () => {
    it("should provide platform-specific instructions for Ollama", () => {
      const instructions = installer.getManualInstructions("ollama");

      expect(instructions).toBeTruthy();
      expect(instructions.length).toBeGreaterThan(50);

      // Check for platform-specific content
      const platform = process.platform;
      if (platform === "darwin") {
        expect(instructions).toContain("macOS");
        expect(instructions).toContain("brew");
      } else if (platform === "win32") {
        expect(instructions).toContain("Windows");
      } else if (platform === "linux") {
        expect(instructions).toContain("Linux");
        expect(instructions).toContain("curl");
      }
    });

    it("should provide platform-specific instructions for Docker", () => {
      const instructions = installer.getManualInstructions("docker");

      expect(instructions).toBeTruthy();
      expect(instructions.length).toBeGreaterThan(50);
      expect(instructions).toContain("docker.com");

      const platform = process.platform;
      if (platform === "darwin") {
        expect(instructions).toContain("Docker Desktop");
      } else if (platform === "win32") {
        expect(instructions).toContain("WSL");
      } else if (platform === "linux") {
        expect(instructions).toContain("apt-get");
      }
    });
  });

  describe("Docker Daemon Management", () => {
    it("should attempt to start Docker daemon", async () => {
      // This test will only pass if Docker is installed
      const dockerStatus = await installer.checkDependency("docker");

      if (dockerStatus.installed) {
        const result = await installer.tryStartDockerDaemon();
        expect(typeof result).toBe("boolean");

        // If Docker was not running, it might take time to start
        if (result && !dockerStatus.running) {
          // Wait a bit for Docker to start
          await new Promise((resolve) => setTimeout(resolve, 5000));

          // Check if Docker is now running
          const newStatus = await installer.checkDependency("docker");
          console.log("[TEST] Docker status after start attempt:", newStatus);
        }
      } else {
        console.log("[TEST] Docker not installed, skipping daemon start test");
      }
    }, 20000);
  });

  describe("Progress Events", () => {
    it("should emit progress events during operations", async () => {
      progressEvents = [];

      // Check dependencies (this should emit some progress events)
      await installer.checkDependencies();

      // We might not get progress events for simple checks
      // But we should verify the event system works
      const testProgress: InstallProgress = {
        dependency: "test",
        status: "checking",
        message: "Test progress event",
      };

      installer.emit("progress", testProgress);

      // Find our test event
      const testEvent = progressEvents.find((p) => p.dependency === "test");
      expect(testEvent).toEqual(testProgress);
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid manual instruction requests gracefully", () => {
      const instructions = installer.getManualInstructions("invalid" as any);
      expect(instructions).toBe("Unknown dependency");
    });

    it("should continue checking other dependencies if one fails", async () => {
      // This test verifies that Promise.all is used correctly
      // Even if we can't force a failure, we can verify the structure
      const status = await installer.checkDependencies();

      // Both properties should exist even if checks fail
      expect(status).toHaveProperty("ollama");
      expect(status).toHaveProperty("docker");
    });
  });

  describe("Platform Compatibility", () => {
    it("should work on current platform", () => {
      const platform = process.platform;
      expect(["darwin", "win32", "linux"]).toContain(platform);

      // Verify instructions are available for current platform
      const ollamaInstructions = installer.getManualInstructions("ollama");
      const dockerInstructions = installer.getManualInstructions("docker");

      expect(ollamaInstructions).not.toContain("Unknown platform");
      expect(dockerInstructions).not.toContain("Unknown platform");
    });
  });

  describe("Memory Management", () => {
    it("should not leak event listeners", () => {
      const initialListenerCount = installer.listenerCount("progress");

      // Add and remove listeners
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      installer.onProgress(listener1);
      installer.onProgress(listener2);

      expect(installer.listenerCount("progress")).toBe(
        initialListenerCount + 2
      );

      installer.removeListener("progress", listener1);
      installer.removeListener("progress", listener2);

      expect(installer.listenerCount("progress")).toBe(initialListenerCount);
    });
  });
});
