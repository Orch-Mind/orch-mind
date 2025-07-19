// SPDX-License-Identifier: MIT OR Apache-2.0
// QuantumSettingsIcon.tsx - Epic quantum/futuristic settings icon for Orch-Mind
// Inspired by Icons8 Futuristic Neon Gear, adapted for React

import React from "react";

interface QuantumSettingsIconProps {
  size?: number;
  className?: string;
}

const QuantumSettingsIcon: React.FC<QuantumSettingsIconProps> = ({ size = 28, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    style={{
      filter: 'drop-shadow(0 0 6px #0ff) drop-shadow(0 0 18px #0ff)',
      background: 'transparent',
    }}
  >
    <circle cx="32" cy="32" r="30" stroke="#0ff" strokeWidth="2.5" fill="rgba(10,20,30,0.5)" />
    <g>
      <path
        d="M32 22a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0-8v4m0 28v4m12-12h4m-32 0h4m19.8-13.8l2.8-2.8m-23.6 23.6l2.8-2.8m0-18l-2.8-2.8m23.6 23.6-2.8-2.8"
        stroke="#0ff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: 'drop-shadow(0 0 4px #0ff)' }}
      />
    </g>
    <circle cx="32" cy="32" r="6.5" fill="#0ff" fillOpacity="0.18" />
    <circle cx="32" cy="32" r="4" fill="#0ff" fillOpacity="0.5" />
  </svg>
);

export default QuantumSettingsIcon;
