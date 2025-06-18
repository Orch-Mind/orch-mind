import React, { useEffect, useRef } from "react";
import { SelectedDevices } from "../../../../../context";
import AudioSettingsSimple from "../../settings/AudioSettingsSimple";

interface AudioSettingsPopoverProps {
  show: boolean;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement>;
  settings: {
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
  };
}

/**
 * Audio Settings Popover component
 * Shows audio configuration options in a floating panel
 */
export const AudioSettingsPopover: React.FC<AudioSettingsPopoverProps> = ({
  show,
  onClose,
  anchorRef,
  settings,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        anchorRef?.current &&
        !anchorRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (show) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [show, onClose, anchorRef]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (show) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div ref={popoverRef} className="audio-settings-popover-container">
      <div
        className="audio-settings-popover"
        style={{
          backgroundColor: "rgba(17, 24, 39, 0.95)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(0, 240, 255, 0.2)",
          borderRadius: "12px",
          boxShadow:
            "0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 240, 255, 0.1)",
          padding: "24px",
          width: "360px",
          zIndex: 50,
        }}
      >
        <AudioSettingsSimple
          // Language
          language={settings.language}
          setLanguage={settings.setLanguage}
          // Device selection
          isMicrophoneOn={settings.isMicrophoneOn}
          setIsMicrophoneOn={settings.setIsMicrophoneOn}
          isSystemAudioOn={settings.isSystemAudioOn}
          setIsSystemAudioOn={settings.setIsSystemAudioOn}
          audioDevices={settings.audioDevices}
          selectedDevices={settings.selectedDevices}
          handleDeviceChange={settings.handleDeviceChange}
        />
      </div>
    </div>
  );
};
