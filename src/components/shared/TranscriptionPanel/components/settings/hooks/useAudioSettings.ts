// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useState, useEffect, useRef } from "react";
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
  const [language, setLanguage] = useState<string>(() => getOption<string>(STORAGE_KEYS.DEEPGRAM_LANGUAGE) || 'pt-BR');
  
  // Transcrição
  const [transcriptionEnabled, setTranscriptionEnabled] = useState<boolean>(() => getOption<boolean>(STORAGE_KEYS.TRANSCRIPTION_ENABLED) ?? true);
  const [speakerIdentification, setSpeakerIdentification] = useState<boolean>(() => getOption<boolean>(STORAGE_KEYS.SPEAKER_IDENTIFICATION) ?? true);
  
  // Referência para detectar mudanças no show
  const prevShowRef = useRef(false);
  
  // Atualiza o idioma quando o modal é aberto
  useEffect(() => {
    if (show && !prevShowRef.current) {
      const storedLanguage = getOption(STORAGE_KEYS.DEEPGRAM_LANGUAGE);
      if (storedLanguage) {
        console.log('🔄 useAudioSettings: Modal aberto, carregando idioma:', storedLanguage);
        setLanguage(storedLanguage);
      }
    }
    prevShowRef.current = show;
  }, [show]);
  
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
        case STORAGE_KEYS.DEEPGRAM_LANGUAGE: 
          console.log('🌐 useAudioSettings: Atualizando idioma:', value);
          setLanguage(value);
          break;
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
    setOption(STORAGE_KEYS.DEEPGRAM_LANGUAGE, language);
    setOption(STORAGE_KEYS.TRANSCRIPTION_ENABLED, transcriptionEnabled);
    setOption(STORAGE_KEYS.SPEAKER_IDENTIFICATION, speakerIdentification);
  };
  
  return {
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
    language,
    setLanguage,
    transcriptionEnabled,
    setTranscriptionEnabled,
    speakerIdentification,
    setSpeakerIdentification,
    
    // Ações
    saveAudioSettings
  };
};
