// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import { SelectedDevices } from "../../../../context";
import AudioControls from "../AudioControls";
import LanguageSelector from "../LanguageSelector";

/**
 * Componente simplificado de configurações de áudio
 * Apenas: Language e Device selection
 */
interface AudioSettingsSimpleProps {
  // Language
  language: string;
  setLanguage: (value: string) => void;

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
  // Language
  language,
  setLanguage,

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
      {/* Language Selection */}
      <div className="pb-5 border-b border-cyan-500/20">
        <h4 className="text-cyan-300 mb-3 font-semibold text-base">Language</h4>
        <LanguageSelector language={language} setLanguage={setLanguage} />
      </div>

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
