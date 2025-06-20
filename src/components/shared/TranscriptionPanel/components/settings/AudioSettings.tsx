// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from 'react';

/**
 * Componente para configurações de áudio e transcrição
 * Responsável por configurações relacionadas a entrada de áudio e processamento
 */
interface AudioSettingsProps {
  enhancedPunctuation: boolean;
  setEnhancedPunctuation: (value: boolean) => void;
  speakerDiarization: boolean;
  setSpeakerDiarization: (value: boolean) => void;
  audioQuality: number;
  setAudioQuality: (value: number) => void;
  autoGainControl: boolean;
  setAutoGainControl: (value: boolean) => void;
  noiseSuppression: boolean;
  setNoiseSuppression: (value: boolean) => void;
  echoCancellation: boolean;
  setEchoCancellation: (value: boolean) => void;
}

const AudioSettings: React.FC<AudioSettingsProps> = ({
  enhancedPunctuation,
  setEnhancedPunctuation,
  speakerDiarization,
  setSpeakerDiarization,
  audioQuality,
  setAudioQuality,
  autoGainControl,
  setAutoGainControl,
  noiseSuppression,
  setNoiseSuppression,
  echoCancellation,
  setEchoCancellation
}) => {
  return (
    <div className="space-y-4">
      {/* Configurações de transcrição */}
      <div>
        <h3 className="text-cyan-300 mb-2">Transcription Options</h3>
        
        <div className="flex items-center mb-2">
          <input
            type="checkbox"
            id="enhancedPunctuation"
            className="mr-2 h-5 w-5 rounded-sm accent-cyan-400 bg-black/50"
            checked={enhancedPunctuation}
            onChange={e => setEnhancedPunctuation(e.target.checked)}
          />
          <label htmlFor="enhancedPunctuation" className="text-cyan-100/80">Enhanced Punctuation</label>
        </div>
        
        <div className="flex items-center mb-2">
          <input
            type="checkbox"
            id="speakerDiarization"
            className="mr-2 h-5 w-5 rounded-sm accent-cyan-400 bg-black/50"
            checked={speakerDiarization}
            onChange={e => setSpeakerDiarization(e.target.checked)}
          />
          <label htmlFor="speakerDiarization" className="text-cyan-100/80">Speaker Diarization</label>
        </div>
      </div>

      {/* Qualidade de áudio */}
      <div>
                  <label className="block text-sm text-cyan-200/70 mb-1">Audio Quality</label>
        <div className="flex items-center gap-3">
          <span className="text-xs text-cyan-400/60">Low</span>
          <input
            title="Audio Quality"
            type="range"
            min="0"
            max="100"
            value={audioQuality}
            onChange={e => setAudioQuality(parseInt(e.target.value))}
            className="flex-1 accent-cyan-400"
          />
          <span className="text-xs text-cyan-400/60">High</span>
        </div>
      </div>

      {/* Processamento de áudio */}
      <div>
        <h3 className="text-cyan-300 mb-2">Audio Processing</h3>
        
        <div className="flex items-center mb-2">
          <input
            type="checkbox"
            id="autoGainControl"
            className="mr-2 h-5 w-5 rounded-sm accent-cyan-400 bg-black/50"
            checked={autoGainControl}
            onChange={e => setAutoGainControl(e.target.checked)}
          />
          <label htmlFor="autoGainControl" className="text-cyan-100/80">Auto Gain Control</label>
        </div>
        
        <div className="flex items-center mb-2">
          <input
            type="checkbox"
            id="noiseSuppression"
            className="mr-2 h-5 w-5 rounded-sm accent-cyan-400 bg-black/50"
            checked={noiseSuppression}
            onChange={e => setNoiseSuppression(e.target.checked)}
          />
          <label htmlFor="noiseSuppression" className="text-cyan-100/80">Noise Suppression</label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="echoCancellation"
            className="mr-2 h-5 w-5 rounded-sm accent-cyan-400 bg-black/50"
            checked={echoCancellation}
            onChange={e => setEchoCancellation(e.target.checked)}
          />
          <label htmlFor="echoCancellation" className="text-cyan-100/80">Echo Cancellation</label>
        </div>
      </div>
    </div>
  );
};

export default AudioSettings;
