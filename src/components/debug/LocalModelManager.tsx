// SPDX-License-Identifier: MIT OR Apache-2.0
// LocalModelManager – UI helper to manage local vLLM models
import React, { useEffect, useMemo, useState } from "react";
import type {
  HardwareInfo,
  IElectronAPI,
  VllmStatus,
} from "../../../electron/preload/interfaces/IElectronAPI";

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}

const LocalModelManager: React.FC = () => {
  const [hardware, setHardware] = useState<HardwareInfo | null>(null);
  const [library, setLibrary] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<VllmStatus>({ state: "idle" });
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  // Fetch hardware info & library once
  useEffect(() => {
    (async () => {
      try {
        const hwRes = await window.electronAPI.vllmHardwareInfo();
        if (hwRes?.success && hwRes.info) setHardware(hwRes.info);
      } catch (e) {
        console.error("Hardware info error", e);
      }
      try {
        const libRes = await window.electronAPI.vllmListLibrary();
        if (libRes?.success && libRes.models) setLibrary(libRes.models);
      } catch (e) {
        console.error("Library fetch error", e);
      }
    })();
  }, []);

  // Use dynamic library from API (no hardcoded models)
  const allModels = useMemo(() => {
    if (library.length === 0) return [];
    // Normalize Ollama entries to LocalModelMeta-ish objects
    const mapped = library.map((o: any) => {
      const id = o.name.replace(/[:/]/g, "_");
      return {
        id,
        label: o.display_name || o.name,
        repo: o.name,
        sizeGB: o.size_bytes ? Math.round(o.size_bytes / 1_073_741_824) : 0,
        quant: "fp16" as const,
      };
    });
    return mapped;
  }, [library]);

  const candidateModels = useMemo(() => {
    if (!hardware) return allModels;
    const vram = hardware.gpu?.vramGB ?? 0;
    const ram = hardware.ramGB || 0;
    const maxSize = vram > 0 ? Math.max(ram * 0.5, vram * 0.9) : ram * 0.5;
    return allModels.map((m) => ({
      ...m,
      compatible: (m.sizeGB || 0) <= maxSize,
    }));
  }, [hardware, allModels]);

  const refreshStatus = async () => {
    try {
      const res = await window.electronAPI.vllmModelStatus();
      if (res?.success && res.status) setStatus(res.status as VllmStatus);
    } catch (err) {
      console.error("Status error", err);
    }
  };

  // Set default selected when candidate list first available
  useEffect(() => {
    if (!selected && candidateModels.length > 0) {
      setSelected(candidateModels[0].id);
    }
  }, [candidateModels, selected]);

  // Poll status every 2s when not idle
  useEffect(() => {
    refreshStatus();
    if (!intervalId) {
      const id = setInterval(refreshStatus, 2000);
      setIntervalId(id);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [intervalId]);

  const handleStart = async () => {
    if (!selected) return;
    await window.electronAPI.vllmStartModel(selected);
    await refreshStatus();
  };

  const handleStop = async () => {
    await window.electronAPI.vllmStopModel();
    await refreshStatus();
  };

  const handleDownload = async () => {
    if (!selected) return;
    try {
      await window.electronAPI.vllmDownloadModel(selected);
      await refreshStatus();
    } catch (e) {
      console.error("Download error", e);
    }
  };

  const handleRefreshLibrary = async () => {
    try {
      const libRes = await window.electronAPI.vllmRefreshLibrary();
      if (libRes?.success && libRes.models) setLibrary(libRes.models);
    } catch (e) {
      console.error("Library refresh error", e);
    }
  };

  const progressLabel = () => {
    if (status.state === "downloading")
      return `Downloading weights ${status.progress ?? 0}%`;
    if (status.state === "pulling_image")
      return `Pulling docker image ${status.progress ?? 0}%`;
    if (status.state === "starting") return "Starting server...";
    return status.message ?? "";
  };

  return (
    <div className="p-4 text-gray-200 space-y-4">
      <h2 className="text-lg font-semibold mb-2">Local Model Manager (vLLM)</h2>
      {/* Model selection */}
      <div>
        <label className="mr-2">Model:</label>
        <select
          aria-label="Select a model"
          value={selected || ""}
          onChange={(e) => setSelected(e.target.value)}
          className="bg-gray-800 border border-gray-600 rounded px-2 py-1"
        >
          {candidateModels.map((m: any) => (
            <option
              key={m.id}
              value={m.id}
              disabled={hardware ? !m.compatible : false}
            >
              {m.label}
              {hardware && !m.compatible ? " (incompatível)" : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Status */}
      <div className="space-y-1">
        <div>
          <span className="font-medium">Status:</span> {status.state}
        </div>
        {status.state !== "idle" &&
          status.state !== "ready" &&
          status.progress !== undefined && (
            <div className="w-full bg-gray-700 h-4 rounded">
              <div
                className="bg-blue-500 h-4 rounded"
                style={{ width: `${status.progress}%` }}
              />
            </div>
          )}
        {progressLabel() && <div className="text-sm">{progressLabel()}</div>}
      </div>

      {/* Actions */}
      <div className="space-x-2">
        <button
          onClick={handleStart}
          disabled={
            status.state !== "idle" &&
            status.state !== "error" &&
            status.state !== "ready"
          }
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 px-4 py-2 rounded"
        >
          {status.state === "ready" ? "Restart" : "Start"}
        </button>
        <button
          onClick={handleStop}
          disabled={status.state === "idle"}
          className="bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-2 rounded"
        >
          Stop
        </button>
        <button
          onClick={handleDownload}
          disabled={status.state !== "idle" && status.state !== "error"}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded"
        >
          Download
        </button>
        <button
          onClick={handleRefreshLibrary}
          className="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded"
        >
          Refresh
        </button>
      </div>
    </div>
  );
};

export default LocalModelManager;
