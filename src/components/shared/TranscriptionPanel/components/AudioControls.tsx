// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import { AudioControlsProps } from "../types/interfaces";
import DeviceSelector from "./DeviceSelector";
import ToggleSwitch from "./ToggleSwitch";

const AudioControls: React.FC<AudioControlsProps> = ({
  isMicrophoneOn,
  setIsMicrophoneOn,
  isSystemAudioOn,
  setIsSystemAudioOn,
  audioDevices,
  selectedDevices,
  handleDeviceChange,
}) => {
  return (
    <div className="space-y-4">
      {/* Microphone Section */}
      <div className="space-y-2">
        <ToggleSwitch
          label="Microphone"
          isOn={isMicrophoneOn}
          onChange={() => setIsMicrophoneOn(!isMicrophoneOn)}
          title="Toggle microphone"
        />

        {isMicrophoneOn && (
          <div className="ml-0 animate-fadeIn">
            <DeviceSelector
              devices={audioDevices}
              selectedId={selectedDevices.microphone ?? ""}
              onChange={(deviceId) => handleDeviceChange(deviceId, false)}
              title="Select microphone"
              isSystemAudio={false}
            />
          </div>
        )}
      </div>

      {/* System Audio Section */}
      <div className="space-y-2">
        <ToggleSwitch
          label="System Audio"
          isOn={isSystemAudioOn}
          onChange={() => setIsSystemAudioOn(!isSystemAudioOn)}
          title="Toggle system audio"
        />

        {isSystemAudioOn && (
          <div className="ml-0 animate-fadeIn">
            <DeviceSelector
              devices={audioDevices}
              selectedId={selectedDevices.systemAudio ?? ""}
              onChange={(deviceId) => handleDeviceChange(deviceId, true)}
              title="Select system audio source"
              isSystemAudio={true}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioControls;
