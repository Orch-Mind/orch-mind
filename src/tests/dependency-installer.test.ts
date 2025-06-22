// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Test suite for DependencyInstaller
 * Tests compatibility across different operating systems
 *
 * This is the main test file that tests the public API
 * For detailed unit tests, see electron/services/dependency-installer/__tests__/
 */

import type { InstallProgress } from "../../electron/services/DependencyInstaller";
import {
  DependencyInstaller,
  DependencyStatus,
} from "../../electron/services/DependencyInstaller";

describe("DependencyInstaller", () => {
  let installer: DependencyInstaller;
  let progressEvents: InstallProgress[];

  beforeEach(() => {
    installer = new DependencyInstaller();
    progressEvents = [];

    // Capture progress events for testing
    installer.on("progress", (progress: InstallProgress) => {
      progressEvents.push(progress);
    });
  });

  afterEach(() => {
    // Clean up event listeners
    installer.removeAllListeners();
  });

  describe("Platform Detection", () => {
    test("should detect current platform correctly", () => {
      const platform = process.platform;
      expect(["darwin", "win32", "linux"]).toContain(platform);
    });
  });

  describe("Dependency Checking", () => {
    test("should check dependencies without throwing errors", async () => {
      const status = await installer.checkDependencies();

      // Verify structure matches DependencyStatus type
      expect(status).toBeDefined();
      expect(status).toHaveProperty("ollama");
      expect(status).toHaveProperty("docker");
      expect(status.ollama).toHaveProperty("installed");
      expect(status.docker).toHaveProperty("installed");

      // Docker should have additional properties
      expect(status.docker).toHaveProperty("running");

      // Log the actual status for debugging
      console.log(
        "Current dependency status:",
        JSON.stringify(status, null, 2)
      );
    }, 10000); // Increase timeout as dependency checking might take time

    test("should check individual dependencies", async () => {
      const ollamaStatus = await installer.checkDependency("ollama");
      expect(ollamaStatus).toHaveProperty("installed");

      if (ollamaStatus.installed) {
        expect(ollamaStatus).toHaveProperty("version");
        expect(typeof ollamaStatus.version).toBe("string");
      }
    });

    test("should throw for unknown dependency", async () => {
      await expect(installer.checkDependency("unknown")).rejects.toThrow(
        "Unknown dependency: unknown"
      );
    });
  });

  describe("Manual Instructions", () => {
    test("should provide manual instructions for current platform", () => {
      const ollamaInstructions = installer.getManualInstructions("ollama");
      const dockerInstructions = installer.getManualInstructions("docker");

      expect(ollamaInstructions).toBeTruthy();
      expect(dockerInstructions).toBeTruthy();
      expect(ollamaInstructions.length).toBeGreaterThan(10);
      expect(dockerInstructions.length).toBeGreaterThan(10);

      // Instructions should contain URLs
      expect(ollamaInstructions).toMatch(/ollama\.com/);
      expect(dockerInstructions).toMatch(/docker\.com/);
    });

    test("should return platform-specific instructions", () => {
      const platform = process.platform;
      const instructions = installer.getManualInstructions("ollama");

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

    test("should handle invalid dependency name", () => {
      const instructions = installer.getManualInstructions("invalid" as any);
      expect(instructions).toBe("Unknown dependency");
    });
  });

  describe("macOS Specific", () => {
    if (process.platform === "darwin") {
      test("should detect macOS version", () => {
        expect(process.platform).toBe("darwin");
      });

      test("should provide macOS-specific Docker instructions", () => {
        const instructions = installer.getManualInstructions("docker");
        expect(instructions).toContain("Docker Desktop");
        expect(instructions).toContain("macOS");
      });
    }
  });

  describe("Windows Specific", () => {
    if (process.platform === "win32") {
      test("should provide Windows-specific Docker instructions", () => {
        const instructions = installer.getManualInstructions("docker");
        expect(instructions).toContain("WSL 2");
        expect(instructions).toContain("Windows");
      });
    }
  });

  describe("Linux Specific", () => {
    if (process.platform === "linux") {
      test("should provide Linux-specific Docker instructions", () => {
        const instructions = installer.getManualInstructions("docker");
        expect(instructions).toContain("apt-get");
        expect(instructions).toContain("systemctl");
      });
    }
  });

  describe("Progress Events", () => {
    test("should support progress event listeners", (done) => {
      const testProgress: InstallProgress = {
        dependency: "test",
        status: "checking",
        message: "Test message",
      };

      installer.onProgress((progress) => {
        expect(progress).toEqual(testProgress);
        done();
      });

      // Emit test progress
      installer.emit("progress", testProgress);
    });

    test("should capture multiple progress events", () => {
      const progress1: InstallProgress = {
        dependency: "ollama",
        status: "checking",
        message: "Checking Ollama...",
      };

      const progress2: InstallProgress = {
        dependency: "docker",
        status: "installing",
        message: "Installing Docker...",
        progress: 50,
      };

      installer.emit("progress", progress1);
      installer.emit("progress", progress2);

      expect(progressEvents).toHaveLength(2);
      expect(progressEvents[0]).toEqual(progress1);
      expect(progressEvents[1]).toEqual(progress2);
    });
  });

  describe("Docker Daemon Management", () => {
    test("should have tryStartDockerDaemon method", () => {
      expect(typeof installer.tryStartDockerDaemon).toBe("function");
    });

    test("should attempt to start Docker daemon", async () => {
      const result = await installer.tryStartDockerDaemon();
      expect(typeof result).toBe("boolean");

      // Log result for debugging
      console.log("Docker daemon start result:", result);
    });
  });

  describe("Installation Methods", () => {
    test("should have installation methods", () => {
      expect(typeof installer.installOllama).toBe("function");
      expect(typeof installer.installDocker).toBe("function");
    });

    // Note: We don't actually run installation in tests
    // as it would modify the system
  });

  describe("Type Compatibility", () => {
    test("should export correct types", () => {
      // This test verifies that the DependencyStatus type is correctly exported
      const checkType = (status: DependencyStatus) => {
        expect(status.ollama).toBeDefined();
        expect(status.docker).toBeDefined();
      };

      // This would fail at compile time if types are incorrect
      checkType({
        ollama: { installed: true, version: "1.0" },
        docker: { installed: true, version: "24.0", running: true },
      });
    });
  });
});
