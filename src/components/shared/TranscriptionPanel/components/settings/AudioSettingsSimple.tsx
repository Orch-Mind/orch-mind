// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import { SelectedDevices } from "../../../../context";
import AudioControls from "../AudioControls";

/**
 * Componente simplificado de configurações de áudio
 * Apenas: Device selection (Language movido para General Settings)
 */
interface AudioSettingsSimpleProps {
  // Device selection
  isMicrophoneOn: boolean;
  setIsMicrophoneOn: (value: boolean) => void;
  isSystemAudioOn: boolean;
  setIsSystemAudioOn: (value: boolean) => void;
  audioDevices: MediaDeviceInfo[];
  selectedDevices: SelectedDevices;
  handleDeviceChange: (deviceId: string, isSystemAudio: boolean) => void;
}

const AudioSettingsSimple: React.FC<AudioSettingsSimpleProps> = ({
  // Device selection
  isMicrophoneOn,
  setIsMicrophoneOn,
  isSystemAudioOn,
  setIsSystemAudioOn,
  audioDevices,
  selectedDevices,
  handleDeviceChange,
}) => {
  return (
    <div className="space-y-6">
      {/* Device Controls */}
      <div>
        <h4 className="text-cyan-300 mb-4 font-semibold text-base">
          Audio Devices
        </h4>
        <AudioControls
          isMicrophoneOn={isMicrophoneOn}
          setIsMicrophoneOn={setIsMicrophoneOn}
          isSystemAudioOn={isSystemAudioOn}
          setIsSystemAudioOn={setIsSystemAudioOn}
          audioDevices={audioDevices}
          selectedDevices={selectedDevices}
          handleDeviceChange={handleDeviceChange}
        />
      </div>
    </div>
  );
};

export default AudioSettingsSimple;
