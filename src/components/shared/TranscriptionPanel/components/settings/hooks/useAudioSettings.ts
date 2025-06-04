// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useState, useEffect, useRef, useMemo } from "react";
import { getOption, setOption, STORAGE_KEYS, subscribeToStorageChanges } from '../../../../../../services/StorageService';

/**
 * Hook para gerenciamento de configurações de áudio
 * Cortex neural para processamento e qualidade do sinal de áudio
 */
export const useAudioSettings = (show: boolean) => {
  // Estado neural-simbólico para opções de áudio
  const [audioQuality, setAudioQuality] = useState<number>(() => getOption<number>(STORAGE_KEYS.AUDIO_QUALITY) ?? 80);
  const [autoGainControl, setAutoGainControl] = useState<boolean>(() => getOption<boolean>(STORAGE_KEYS.AUTO_GAIN_CONTROL) ?? true);
  const [noiseSuppression, setNoiseSuppression] = useState<boolean>(() => getOption<boolean>(STORAGE_KEYS.NOISE_SUPPRESSION) ?? true);
  const [echoCancellation, setEchoCancellation] = useState<boolean>(() => getOption<boolean>(STORAGE_KEYS.ECHO_CANCELLATION) ?? true);
  const [enhancedPunctuation, setEnhancedPunctuation] = useState<boolean>(() => getOption<boolean>(STORAGE_KEYS.ENHANCED_PUNCTUATION) ?? true);
  const [speakerDiarization, setSpeakerDiarization] = useState<boolean>(() => getOption<boolean>(STORAGE_KEYS.SPEAKER_DIARIZATION) ?? true);
  
  // Transcrição
  const [transcriptionEnabled, setTranscriptionEnabled] = useState<boolean>(() => getOption<boolean>(STORAGE_KEYS.TRANSCRIPTION_ENABLED) ?? true);
  const [speakerIdentification, setSpeakerIdentification] = useState<boolean>(() => getOption<boolean>(STORAGE_KEYS.SPEAKER_IDENTIFICATION) ?? true);
  
  // Sincroniza mudanças do storage para o estado local
  useEffect(() => {
    const handleStorageChange = (key: string, value: any) => {
      switch(key) {
        case STORAGE_KEYS.AUDIO_QUALITY: setAudioQuality(value); break;
        case STORAGE_KEYS.AUTO_GAIN_CONTROL: setAutoGainControl(value); break;
        case STORAGE_KEYS.NOISE_SUPPRESSION: setNoiseSuppression(value); break;
        case STORAGE_KEYS.ECHO_CANCELLATION: setEchoCancellation(value); break;
        case STORAGE_KEYS.ENHANCED_PUNCTUATION: setEnhancedPunctuation(value); break;
        case STORAGE_KEYS.SPEAKER_DIARIZATION: setSpeakerDiarization(value); break;
        case STORAGE_KEYS.TRANSCRIPTION_ENABLED: setTranscriptionEnabled(value); break;
        case STORAGE_KEYS.SPEAKER_IDENTIFICATION: setSpeakerIdentification(value); break;
      }
    };
    
    const unsubscribe = subscribeToStorageChanges(handleStorageChange);
    return () => unsubscribe();
  }, []);
  
  // Salva as configurações de áudio no storage
  const saveAudioSettings = () => {
    setOption(STORAGE_KEYS.AUDIO_QUALITY, audioQuality);
    setOption(STORAGE_KEYS.AUTO_GAIN_CONTROL, autoGainControl);
    setOption(STORAGE_KEYS.NOISE_SUPPRESSION, noiseSuppression);
    setOption(STORAGE_KEYS.ECHO_CANCELLATION, echoCancellation);
    setOption(STORAGE_KEYS.ENHANCED_PUNCTUATION, enhancedPunctuation);
    setOption(STORAGE_KEYS.SPEAKER_DIARIZATION, speakerDiarization);
    setOption(STORAGE_KEYS.TRANSCRIPTION_ENABLED, transcriptionEnabled);
    setOption(STORAGE_KEYS.SPEAKER_IDENTIFICATION, speakerIdentification);
  };
  
  return useMemo(() => ({
    // Valores
    audioQuality,
    setAudioQuality,
    autoGainControl,
    setAutoGainControl,
    noiseSuppression,
    setNoiseSuppression,
    echoCancellation,
    setEchoCancellation,
    enhancedPunctuation,
    setEnhancedPunctuation,
    speakerDiarization,
    setSpeakerDiarization,
    transcriptionEnabled,
    setTranscriptionEnabled,
    speakerIdentification,
    setSpeakerIdentification,
    // Ações
    saveAudioSettings
  }), [
    audioQuality,
    setAudioQuality,
    autoGainControl,
    setAutoGainControl,
    noiseSuppression,
    setNoiseSuppression,
    echoCancellation,
    setEchoCancellation,
    enhancedPunctuation,
    setEnhancedPunctuation,
    speakerDiarization,
    setSpeakerDiarization,
    transcriptionEnabled,
    setTranscriptionEnabled,
    speakerIdentification,
    setSpeakerIdentification,
    saveAudioSettings
  ]);
};
