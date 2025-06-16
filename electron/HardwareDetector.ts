// SPDX-License-Identifier: MIT OR Apache-2.0
// HardwareDetector – cross-platform hardware capabilities helper
// Uses systeminformation (cross-platform) and optional nvidia-smi for VRAM

import si from "systeminformation";
import { execSync } from "child_process";

export interface GpuInfo {
  vendor: string;
  model: string;
  vramGB: number;
  cuda: boolean;
}

export interface HardwareInfo {
  cpuCores: number;
  ramGB: number;
  gpu?: GpuInfo;
}

/**
 * Detect hardware capabilities relevant for LLM serving.
 * – CPU core count
 * – Total system RAM
 * – First GPU (if any) vendor / model / VRAM and CUDA presence
 */
export async function detectHardware(): Promise<HardwareInfo> {
  const [cpu, mem, graphics] = await Promise.all([
    si.cpu(),
    si.mem(),
    si.graphics(),
  ]);

  const info: HardwareInfo = {
    cpuCores: cpu.physicalCores || cpu.cores || 4,
    ramGB: Math.round(mem.total / 1_073_741_824), // bytes → GiB
  };

  // Pick first controller if exists
  if (graphics.controllers.length > 0) {
    const g = graphics.controllers[0];
    let vramGB = g.vram ? Math.round(g.vram / 1024) : 0; // vram is MB on some OS

    // If NVIDIA, try nvidia-smi for exact memory
    if (g.vendor.toLowerCase().includes("nvidia")) {
      try {
        const out = execSync(
          "nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits",
          { encoding: "utf-8" }
        ).trim();
        vramGB = parseInt(out, 10) / 1024; // reported in MiB
      } catch {}
    }

    info.gpu = {
      vendor: g.vendor,
      model: g.model,
      vramGB: vramGB || 0,
      cuda: g.vendor.toLowerCase().includes("nvidia"),
    };
  }

  return info;
}
