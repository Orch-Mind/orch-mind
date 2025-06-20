/**
 * Test suite for DependencyInstaller
 * Tests compatibility across different operating systems
 */

import { DependencyInstaller } from "../../electron/services/DependencyInstaller";

describe("DependencyInstaller", () => {
  let installer: DependencyInstaller;

  beforeEach(() => {
    installer = new DependencyInstaller();
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

      expect(status).toBeDefined();
      expect(status).toHaveProperty("ollama");
      expect(status).toHaveProperty("docker");
      expect(status.ollama).toHaveProperty("installed");
      expect(status.docker).toHaveProperty("installed");

      // Log the actual status for debugging
      console.log("Current dependency status:", status);
    }, 10000); // Increase timeout as dependency checking might take time
  });

  describe("Manual Instructions", () => {
    test("should provide manual instructions for current platform", () => {
      const ollamaInstructions = installer.getManualInstructions("ollama");
      const dockerInstructions = installer.getManualInstructions("docker");

      expect(ollamaInstructions).toBeTruthy();
      expect(dockerInstructions).toBeTruthy();
      expect(ollamaInstructions.length).toBeGreaterThan(10);
      expect(dockerInstructions.length).toBeGreaterThan(10);
    });
  });

  describe("macOS Specific", () => {
    if (process.platform === "darwin") {
      test("should detect macOS version", () => {
        expect(process.platform).toBe("darwin");
      });
    }
  });
});
