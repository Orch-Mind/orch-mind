// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { ChildProcess, spawn } from "child_process";
import { EventEmitter } from "events";
import * as os from "os";
import { CommandExecutor } from "../../../electron/services/dependency-installer/services/CommandExecutor";

// Mock child_process
jest.mock("child_process");

// Mock os.platform
jest.mock("os", () => ({
  platform: jest.fn(() => "darwin"), // Default to darwin
}));

// Mock util.promisify - needs to be after other mocks
jest.mock("util", () => {
  const mockExecAsync = jest.fn();
  return {
    ...jest.requireActual("util"),
    promisify: jest.fn(() => mockExecAsync),
    __mockExecAsync: mockExecAsync, // Export for test access
  };
});

describe("CommandExecutor", () => {
  let executor: CommandExecutor;
  let mockExecAsync: jest.Mock;
  const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
  const mockPlatform = os.platform as jest.MockedFunction<typeof os.platform>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Get the mock from the util module
    const util = require("util");
    mockExecAsync = util.__mockExecAsync;
    mockExecAsync.mockClear();

    mockPlatform.mockReturnValue("darwin");
    executor = new CommandExecutor();
  });

  describe("execute", () => {
    it("should execute command successfully", async () => {
      mockExecAsync.mockResolvedValueOnce({
        stdout: "success output",
        stderr: "",
      });

      const result = await executor.execute("echo test");

      expect(result.stdout).toBe("success output");
      expect(result.stderr).toBe("");
      expect(mockExecAsync).toHaveBeenCalledWith("echo test");
    });

    it("should handle command failure", async () => {
      const error = new Error("Error details");
      mockExecAsync.mockRejectedValueOnce(error);

      await expect(executor.execute("test command")).rejects.toThrow(
        "Command failed: test command\nError details"
      );
    });
  });

  describe("executeWithProgress", () => {
    it("should execute command with progress updates", async () => {
      const mockChild = new EventEmitter() as any;
      mockChild.stdout = new EventEmitter();
      mockChild.stderr = new EventEmitter();

      mockSpawn.mockReturnValueOnce(mockChild as ChildProcess);

      const progressUpdates: string[] = [];
      const promise = executor.executeWithProgress("echo test", (data) => {
        progressUpdates.push(data);
      });

      // Simulate data events
      mockChild.stdout.emit("data", Buffer.from("Progress 1\n"));
      mockChild.stdout.emit("data", Buffer.from("Progress 2\n"));
      mockChild.emit("close", 0);

      await promise;

      expect(progressUpdates).toEqual(["Progress 1\n", "Progress 2\n"]);
      expect(mockSpawn).toHaveBeenCalledWith(
        "echo test",
        [],
        expect.objectContaining({
          shell: true,
          stdio: "pipe",
        })
      );
    });

    it("should reject on non-zero exit code", async () => {
      const mockChild = new EventEmitter() as any;
      mockChild.stdout = new EventEmitter();
      mockChild.stderr = new EventEmitter();

      mockSpawn.mockReturnValueOnce(mockChild as ChildProcess);

      const promise = executor.executeWithProgress("failing-command");

      mockChild.stderr.emit("data", Buffer.from("Error output"));
      mockChild.emit("close", 1);

      await expect(promise).rejects.toThrow(
        "Command failed with code 1: failing-command"
      );
    });

    it("should handle spawn errors", async () => {
      const mockChild = new EventEmitter() as any;
      mockChild.stdout = new EventEmitter();
      mockChild.stderr = new EventEmitter();

      mockSpawn.mockReturnValueOnce(mockChild as ChildProcess);

      const promise = executor.executeWithProgress("error-command");

      mockChild.emit("error", new Error("Spawn error"));

      await expect(promise).rejects.toThrow("Spawn error");
    });

    it("should use PowerShell on Windows", async () => {
      mockPlatform.mockReturnValue("win32");
      const windowsExecutor = new CommandExecutor();

      const mockChild = new EventEmitter() as any;
      mockChild.stdout = new EventEmitter();
      mockChild.stderr = new EventEmitter();

      mockSpawn.mockReturnValueOnce(mockChild as ChildProcess);

      const promise = windowsExecutor.executeWithProgress("test");
      mockChild.emit("close", 0);
      await promise;

      expect(mockSpawn).toHaveBeenCalledWith(
        "test",
        [],
        expect.objectContaining({
          shell: "powershell.exe",
        })
      );
    });
  });

  describe("checkCommand", () => {
    it("should return true when command exists", async () => {
      mockExecAsync.mockResolvedValueOnce({
        stdout: "/usr/bin/docker",
        stderr: "",
      });

      const exists = await executor.checkCommand("docker");
      expect(exists).toBe(true);
      expect(mockExecAsync).toHaveBeenCalledWith("which docker");
    });

    it("should return false when command doesn't exist", async () => {
      mockExecAsync.mockRejectedValueOnce(new Error("Command not found"));

      const exists = await executor.checkCommand("nonexistent");
      expect(exists).toBe(false);
      expect(mockExecAsync).toHaveBeenCalledWith("which nonexistent");
    });

    it("should use where command on Windows", async () => {
      mockPlatform.mockReturnValue("win32");
      const windowsExecutor = new CommandExecutor();

      mockExecAsync.mockResolvedValueOnce({
        stdout: "C:\\Program Files\\Docker\\docker.exe",
        stderr: "",
      });

      const exists = await windowsExecutor.checkCommand("docker");

      expect(exists).toBe(true);
      expect(mockExecAsync).toHaveBeenCalledWith("where docker");
    });
  });
});
