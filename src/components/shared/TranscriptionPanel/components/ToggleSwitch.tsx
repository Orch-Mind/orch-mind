// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";

interface ToggleSwitchProps {
  label: string;
  isOn: boolean;
  onChange: () => void;
  title: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  label,
  isOn,
  onChange,
  title,
}) => (
  <div className="flex items-center justify-between py-3">
    <span className="text-sm text-gray-300 font-medium">{label}</span>
    <button
      type="button"
      title={title}
      onClick={onChange}
      className="relative h-7 w-12 rounded-full transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-gray-900"
      style={{
        backgroundColor: isOn ? "#00D9FF" : "#374151",
        boxShadow: isOn
          ? "inset 0 0 0 2px rgba(255, 255, 255, 0.5), inset 0 0 0 1px rgba(0, 217, 255, 1), 0 0 12px rgba(0, 217, 255, 0.5), 0 0 4px rgba(0, 217, 255, 0.8)"
          : "inset 0 0 0 2px rgba(255, 255, 255, 0.1), inset 0 0 0 1px rgba(156, 163, 175, 0.5), 0 1px 2px rgba(0, 0, 0, 0.1)",
      }}
      aria-label={`${label}: ${isOn ? "on" : "off"}`}
    >
      <div
        className="absolute top-[2px] h-[22px] w-[22px] rounded-full transition-transform duration-200 ease-in-out"
        style={{
          transform: isOn ? "translateX(22px)" : "translateX(2px)",
          backgroundColor: "#FFFFFF",
          boxShadow: isOn
            ? "inset 0 0 0 2px rgba(0, 217, 255, 0.6), 0 3px 5px rgba(0, 0, 0, 0.3), 0 0 8px rgba(0, 217, 255, 0.4)"
            : "inset 0 0 0 1px rgba(156, 163, 175, 0.3), 0 3px 5px rgba(0, 0, 0, 0.2), 0 0 0 0.5px rgba(0, 0, 0, 0.08)",
        }}
      />
    </button>
  </div>
);

export default ToggleSwitch;
