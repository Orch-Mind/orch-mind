// SPDX-License-Identifier: MIT OR Apache-2.0
// LocalModelManager – UI helper to manage local vLLM models
import React, { useEffect, useState, useMemo } from "react";
import {
  AVAILABLE_MODELS,
} from "../../shared/constants/modelRegistry";
import type { IElectronAPI, VllmStatus, HardwareInfo } from "../../../electron/preload/interfaces/IElectronAPI";

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

  const candidateModels = useMemo(() => {
    if (!hardware) return AVAILABLE_MODELS;
    const vram = hardware.gpu?.vramGB ?? 0;
    const ram = hardware.ramGB;
    const maxSize = vram > 0 ? vram * 0.9 : ram * 0.5; // heuristic
    return AVAILABLE_MODELS.filter((m) => m.sizeGB <= maxSize);
  }, [hardware]);



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
  }, []);

  const handleStart = async () => {
    if (!selected) return;
    await window.electronAPI.vllmStartModel(selected);
    await refreshStatus();
  };

  const handleStop = async () => {
    await window.electronAPI.vllmStopModel();
    await refreshStatus();
  };

  const progressLabel = () => {
    if (status.state === "downloading") return `Downloading weights ${status.progress ?? 0}%`;
    if (status.state === "pulling_image") return `Pulling docker image ${status.progress ?? 0}%`;
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
          value={selected || ''}
          onChange={(e) => setSelected(e.target.value)}
          className="bg-gray-800 border border-gray-600 rounded px-2 py-1"
        >
          {candidateModels.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Status */}
      <div className="space-y-1">
        <div>
          <span className="font-medium">Status:</span> {status.state}
        </div>
        {status.state !== "idle" && status.state !== "ready" && (
          <div className="w-full bg-gray-700 h-4 rounded">
            <div
              className="bg-blue-500 h-4 rounded"
              style={{ width: `${status.progress ?? 0}%` }}
            />
          </div>
        )}
        {progressLabel() && <div className="text-sm">{progressLabel()}</div>}
      </div>

      {/* Actions */}
      <div className="space-x-2">
        <button
          onClick={handleStart}
          disabled={status.state !== "idle" && status.state !== "error" && status.state !== "ready"}
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
      </div>
    </div>
  );
};

export default LocalModelManager;
