// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";

interface DeviceSelectorProps {
  devices: MediaDeviceInfo[];
  selectedId?: string;
  onChange: (id: string) => void;
  title: string;
  isSystemAudio: boolean;
}

const DeviceSelector: React.FC<DeviceSelectorProps> = ({
  devices,
  selectedId,
  onChange,
  title,
  isSystemAudio,
}) => {
  // Filter devices based on type
  const filteredDevices = devices.filter((device) => {
    const label = device.label.toLowerCase();
    const isSystemDevice =
      label.includes("blackhole") || label.includes("dipper");
    return isSystemAudio ? isSystemDevice : !isSystemDevice;
  });

  return (
    <select
      title={title}
      className="w-full p-2.5 rounded-lg bg-black/40 text-white/90 text-sm border border-cyan-500/20 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all"
      value={selectedId || ""}
      onChange={(e) => onChange(e.target.value)}
    >
      {filteredDevices.length === 0 && (
        <option value="" disabled>
          No {isSystemAudio ? "system audio" : "microphone"} devices found
        </option>
      )}
      {filteredDevices.map((device) => (
        <option key={device.deviceId} value={device.deviceId}>
          {device.label || `Device ${device.deviceId.substring(0, 5)}...`}
        </option>
      ))}
    </select>
  );
};

export default DeviceSelector;
