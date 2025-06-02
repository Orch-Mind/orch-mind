// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { useEffect, useRef, useState } from "react";
import { getOption, getUserName, setOption, STORAGE_KEYS, subscribeToStorageChanges } from '../../../../services/StorageService';
import { SUPPORTED_HF_EMBEDDING_MODELS } from '../../../../services/huggingface/HuggingFaceEmbeddingService';
import { ModeService, OrchOSMode, OrchOSModeEnum } from '../../../../services/ModeService'; // Orch-OS Mode Cortex
import {
  ApiSettings,
  AudioSettings,
  GeneralSettings,
  InterfaceSettings,
  ApiSettingsProps
} from './settings';

interface SettingsModalProps {
  show: boolean;
  onClose: () => void;
}

/**
 * Modal de configurações do Orch-OS
 * Refatorado seguindo os princípios neural-simbólicos:
 * - Clean Architecture (separação de responsabilidades)
 * - SOLID (componentes com responsabilidade única)
 * - KISS (simplificação da lógica)
 */
const SettingsModal: React.FC<SettingsModalProps> = ({
  show,
  onClose
}) => {
  // Estado de navegação e seções
  const [openSection, setOpenSection] = useState<'pinecone' | 'chatgpt' | 'deepgram' | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'interface' | 'audio' | 'advanced'>('general');
  
  // Estado neural-simbólico para opções, inicializado do storage cortex
  // General
  const [name, setName] = useState<string>(() => getUserName() || 'User');
  const [enableMatrix, setEnableMatrix] = useState<boolean>(() => getOption<boolean>(STORAGE_KEYS.ENABLE_MATRIX) ?? true);
  const [matrixDensity, setMatrixDensity] = useState<number>(() => getOption<number>(STORAGE_KEYS.MATRIX_DENSITY) ?? 60);
  const [enableEffects, setEnableEffects] = useState<boolean>(() => getOption<boolean>(STORAGE_KEYS.ENABLE_EFFECTS) ?? true);
  const [enableAnimations, setEnableAnimations] = useState<boolean>(() => getOption<boolean>(STORAGE_KEYS.ENABLE_ANIMATIONS) ?? true);
  
  // Interface
  const [darkMode, setDarkMode] = useState<boolean>(() => getOption<boolean>(STORAGE_KEYS.DARK_MODE) ?? true);
  const [enableNeumorphism, setEnableNeumorphism] = useState<boolean>(() => getOption<boolean>(STORAGE_KEYS.ENABLE_NEUMORPHISM) ?? true);
  const [enableGlassmorphism, setEnableGlassmorphism] = useState<boolean>(() => getOption<boolean>(STORAGE_KEYS.ENABLE_GLASSMORPHISM) ?? true);
  const [panelTransparency, setPanelTransparency] = useState<number>(() => getOption<number>(STORAGE_KEYS.PANEL_TRANSPARENCY) ?? 70);
  const [colorTheme, setColorTheme] = useState<string>(() => getOption<string>(STORAGE_KEYS.COLOR_THEME) || 'quantum-blue');
  
  // Audio
  const [audioQuality, setAudioQuality] = useState<number>(() => getOption<number>(STORAGE_KEYS.AUDIO_QUALITY) ?? 80);
  const [autoGainControl, setAutoGainControl] = useState<boolean>(() => getOption<boolean>(STORAGE_KEYS.AUTO_GAIN_CONTROL) ?? true);
  const [noiseSuppression, setNoiseSuppression] = useState<boolean>(() => getOption<boolean>(STORAGE_KEYS.NOISE_SUPPRESSION) ?? true);
  const [echoCancellation, setEchoCancellation] = useState<boolean>(() => getOption<boolean>(STORAGE_KEYS.ECHO_CANCELLATION) ?? true);
  const [enhancedPunctuation, setEnhancedPunctuation] = useState<boolean>(() => getOption<boolean>(STORAGE_KEYS.ENHANCED_PUNCTUATION) ?? true);
  const [speakerDiarization, setSpeakerDiarization] = useState<boolean>(() => getOption<boolean>(STORAGE_KEYS.SPEAKER_DIARIZATION) ?? true);
  const [language, setLanguage] = useState<string>(() => getOption<string>(STORAGE_KEYS.DEEPGRAM_LANGUAGE) || 'pt-BR');

  // ChatGPT, Deepgram & Pinecone
  const [chatgptApiKey, setChatgptApiKey] = useState<string>(() => getOption<string>(STORAGE_KEYS.OPENAI_API_KEY) || '');
  const [chatgptModel, setChatgptModel] = useState<string>(() => getOption<string>(STORAGE_KEYS.CHATGPT_MODEL) || 'gpt-3.5-turbo');
  const [chatgptTemperature, setChatgptTemperature] = useState<number>(() => getOption<number>(STORAGE_KEYS.CHATGPT_TEMPERATURE) ?? 0.7);
  const [chatgptMaxTokens, setChatgptMaxTokens] = useState<number>(() => getOption<number>(STORAGE_KEYS.CHATGPT_MAX_TOKENS) ?? 2000);
  const [openaiEmbeddingModel, setOpenaiEmbeddingModel] = useState<string>(() => getOption<string>(STORAGE_KEYS.OPENAI_EMBEDDING_MODEL) || 'text-embedding-3-large');
  
  // HuggingFace
  const [hfModel, setHfModel] = useState<string>(() => getOption<string>(STORAGE_KEYS.HF_MODEL) || '');
  const [hfEmbeddingModel, setHfEmbeddingModel] = useState<string>(() => getOption<string>(STORAGE_KEYS.HF_EMBEDDING_MODEL) || SUPPORTED_HF_EMBEDDING_MODELS[0]);
  
  // Deepgram
  const [deepgramApiKey, setDeepgramApiKey] = useState<string>(() => getOption<string>(STORAGE_KEYS.DEEPGRAM_API_KEY) || '');
  const [deepgramModel, setDeepgramModel] = useState<string>(() => getOption<string>(STORAGE_KEYS.DEEPGRAM_MODEL) || 'nova-2');
  const [deepgramLanguage, setDeepgramLanguage] = useState<string>(() => getOption<string>(STORAGE_KEYS.DEEPGRAM_LANGUAGE) || 'pt-BR');
  const [deepgramTier, setDeepgramTier] = useState<string>(() => getOption<string>(STORAGE_KEYS.DEEPGRAM_TIER) || 'enhanced');
  
  // Transcrição
  const [transcriptionEnabled, setTranscriptionEnabled] = useState<boolean>(() => getOption<boolean>(STORAGE_KEYS.TRANSCRIPTION_ENABLED) ?? true);
  const [speakerIdentification, setSpeakerIdentification] = useState<boolean>(() => getOption<boolean>(STORAGE_KEYS.SPEAKER_IDENTIFICATION) ?? true);
  
  // Pinecone
  const [pineconeApiKey, setPineconeApiKey] = useState<string>(() => getOption<string>(STORAGE_KEYS.PINECONE_API_KEY) || '');
  const [pineconeEnvironment, setPineconeEnvironment] = useState<string>(() => getOption<string>(STORAGE_KEYS.PINECONE_ENVIRONMENT) || '');
  const [pineconeIndex, setPineconeIndex] = useState<string>(() => getOption<string>(STORAGE_KEYS.PINECONE_INDEX) || '');
  
  // Interface adicional
  const [theme, setTheme] = useState<string>(() => getOption<string>(STORAGE_KEYS.THEME) || 'auto');
  const [uiDensity, setUiDensity] = useState<string>(() => getOption<string>(STORAGE_KEYS.UI_DENSITY) || 'normal');
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(() => getOption<boolean>(STORAGE_KEYS.SHOW_ADVANCED_SETTINGS) ?? false);
  
  // Debug
  const [debugMode, setDebugMode] = useState<boolean>(() => getOption<boolean>(STORAGE_KEYS.DEBUG_MODE) ?? false);
  const [logLevel, setLogLevel] = useState<string>(() => getOption<string>(STORAGE_KEYS.LOG_LEVEL) || 'info');
  
  // Orch-OS Mode Cortex: single source of truth for mode
  // Symbolic: mode state uses enum for full type safety
  const [applicationMode, setApplicationMode] = useState<OrchOSMode>(
    () => ModeService.getMode()
  );

  // Atualiza o idioma APENAS quando o modal é aberto (show muda de false para true)
  // Usando uma ref para rastrear o estado anterior
  const prevShowRef = useRef(false);
  
  useEffect(() => {
    // Symbolic: ensure mode state syncs with ModeService on modal open
    if (show && !prevShowRef.current) {
      setApplicationMode(ModeService.getMode());
      // Busca o valor mais recente do storage quando o modal é aberto
      const storedLanguage = getOption(STORAGE_KEYS.DEEPGRAM_LANGUAGE);
      if (storedLanguage) {
        console.log('🔄 SettingsModal: Modal aberto, carregando idioma:', storedLanguage);
        setDeepgramLanguage(storedLanguage);
        setLanguage(storedLanguage);
      }
    }
    prevShowRef.current = show;
  }, [show]);
  
  // Sistema de sincronização neural-simbólica entre componentes
  // Escuta por mudanças em todas as configurações e atualiza o estado local
  useEffect(() => {
    // Handler para mudanças no storage (cortex de memória)
    const handleStorageChange = (key: string, value: any) => {
      console.log(`🔄 SettingsModal: Detectou mudança na configuração global: ${key}`, value);
      // Symbolic: sync mode cortex
      if (key === STORAGE_KEYS.APPLICATION_MODE) {
        ModeService.setMode(value);
        setApplicationMode(value as OrchOSMode);
      }
      // Mapeia cada configuração ao seu setter correspondente
      switch(key) {
        // General
        case STORAGE_KEYS.USER_NAME: setName(value); break;
        case STORAGE_KEYS.APPLICATION_MODE: setApplicationMode(value); break;
        case STORAGE_KEYS.ENABLE_MATRIX: setEnableMatrix(value); break;
        case STORAGE_KEYS.MATRIX_DENSITY: setMatrixDensity(value); break;
        case STORAGE_KEYS.ENABLE_EFFECTS: setEnableEffects(value); break;
        case STORAGE_KEYS.ENABLE_ANIMATIONS: setEnableAnimations(value); break;
        
        // Interface
        case STORAGE_KEYS.DARK_MODE: setDarkMode(value); break;
        case STORAGE_KEYS.ENABLE_NEUMORPHISM: setEnableNeumorphism(value); break;
        case STORAGE_KEYS.ENABLE_GLASSMORPHISM: setEnableGlassmorphism(value); break;
        case STORAGE_KEYS.PANEL_TRANSPARENCY: setPanelTransparency(value); break;
        case STORAGE_KEYS.COLOR_THEME: setColorTheme(value); break;
        case STORAGE_KEYS.THEME: setTheme(value); break;
        case STORAGE_KEYS.UI_DENSITY: setUiDensity(value); break;
        case STORAGE_KEYS.SHOW_ADVANCED_SETTINGS: setShowAdvancedSettings(value); break;
        
        // Audio
        case STORAGE_KEYS.AUDIO_QUALITY: setAudioQuality(value); break;
        case STORAGE_KEYS.AUTO_GAIN_CONTROL: setAutoGainControl(value); break;
        case STORAGE_KEYS.NOISE_SUPPRESSION: setNoiseSuppression(value); break;
        case STORAGE_KEYS.ECHO_CANCELLATION: setEchoCancellation(value); break;
        case STORAGE_KEYS.ENHANCED_PUNCTUATION: setEnhancedPunctuation(value); break;
        case STORAGE_KEYS.SPEAKER_DIARIZATION: setSpeakerDiarization(value); break;
        
        // Transcrição
        case STORAGE_KEYS.TRANSCRIPTION_ENABLED: setTranscriptionEnabled(value); break;
        case STORAGE_KEYS.SPEAKER_IDENTIFICATION: setSpeakerIdentification(value); break;
        
        // Sincronização especial entre language e deepgramLanguage
        case STORAGE_KEYS.DEEPGRAM_LANGUAGE: 
          console.log('🌐 Atualizando idiomas no modal:', value);
          setDeepgramLanguage(value);
          setLanguage(value);
          break;
          
        // OpenAI/ChatGPT
        case STORAGE_KEYS.OPENAI_API_KEY: setChatgptApiKey(value); break;
        case STORAGE_KEYS.CHATGPT_MODEL: setChatgptModel(value); break;
        case STORAGE_KEYS.CHATGPT_TEMPERATURE: setChatgptTemperature(value); break;
        case STORAGE_KEYS.CHATGPT_MAX_TOKENS: setChatgptMaxTokens(value); break;
        case STORAGE_KEYS.OPENAI_EMBEDDING_MODEL: setOpenaiEmbeddingModel(value); break;
        
        // HuggingFace
        case STORAGE_KEYS.HF_MODEL: setHfModel(value); break;
        case STORAGE_KEYS.HF_EMBEDDING_MODEL: setHfEmbeddingModel(value); break;
        
        // Deepgram
        case STORAGE_KEYS.DEEPGRAM_API_KEY: setDeepgramApiKey(value); break;
        case STORAGE_KEYS.DEEPGRAM_MODEL: setDeepgramModel(value); break;
        case STORAGE_KEYS.DEEPGRAM_TIER: setDeepgramTier(value); break;
        
        // Pinecone
        case STORAGE_KEYS.PINECONE_API_KEY: setPineconeApiKey(value); break;
        case STORAGE_KEYS.PINECONE_ENVIRONMENT: setPineconeEnvironment(value); break;
        case STORAGE_KEYS.PINECONE_INDEX: setPineconeIndex(value); break;
        
        // Debug
        case STORAGE_KEYS.DEBUG_MODE: setDebugMode(value); break;
        case STORAGE_KEYS.LOG_LEVEL: setLogLevel(value); break;
      }
    };
    
    // Registra o listener para mudanças no storage
    const unsubscribe = subscribeToStorageChanges(handleStorageChange);
    
    // Limpa o listener quando o componente for desmontado
    return () => {
      unsubscribe();
    };
  }, []); // Sem dependências - só executa uma vez na montagem do componente

  // Salva todas as configurações no armazenamento
  useEffect(() => {
    if (applicationMode) setOption(STORAGE_KEYS.APPLICATION_MODE, applicationMode);
    ModeService.setMode(applicationMode); // Symbolic: update mode cortex

    // General
    setOption(STORAGE_KEYS.USER_NAME, name);
    setOption(STORAGE_KEYS.ENABLE_MATRIX, enableMatrix);
    setOption(STORAGE_KEYS.MATRIX_DENSITY, matrixDensity);
    setOption(STORAGE_KEYS.ENABLE_EFFECTS, enableEffects);
    setOption(STORAGE_KEYS.ENABLE_ANIMATIONS, enableAnimations);
    
    // Interface
    setOption(STORAGE_KEYS.DARK_MODE, darkMode);
    setOption(STORAGE_KEYS.ENABLE_NEUMORPHISM, enableNeumorphism);
    setOption(STORAGE_KEYS.ENABLE_GLASSMORPHISM, enableGlassmorphism);
    setOption(STORAGE_KEYS.PANEL_TRANSPARENCY, panelTransparency);
    setOption(STORAGE_KEYS.COLOR_THEME, colorTheme);
    
    // Audio
    setOption(STORAGE_KEYS.AUDIO_QUALITY, audioQuality);
    setOption(STORAGE_KEYS.AUTO_GAIN_CONTROL, autoGainControl);
    setOption(STORAGE_KEYS.NOISE_SUPPRESSION, noiseSuppression);
    setOption(STORAGE_KEYS.ECHO_CANCELLATION, echoCancellation);
    setOption(STORAGE_KEYS.ENHANCED_PUNCTUATION, enhancedPunctuation);
    setOption(STORAGE_KEYS.SPEAKER_DIARIZATION, speakerDiarization);
    
    // Persistência universal (independente do modo)
    setOption(STORAGE_KEYS.HF_MODEL, hfModel);
    setOption(STORAGE_KEYS.THEME, theme);
    setOption(STORAGE_KEYS.UI_DENSITY, uiDensity);
    setOption(STORAGE_KEYS.SHOW_ADVANCED_SETTINGS, showAdvancedSettings);
    setOption(STORAGE_KEYS.TRANSCRIPTION_ENABLED, transcriptionEnabled);
    setOption(STORAGE_KEYS.SPEAKER_IDENTIFICATION, speakerIdentification);
    setOption(STORAGE_KEYS.PINECONE_ENVIRONMENT, pineconeEnvironment);
    setOption(STORAGE_KEYS.PINECONE_INDEX, pineconeIndex);
    setOption(STORAGE_KEYS.DEEPGRAM_TIER, deepgramTier);
    setOption(STORAGE_KEYS.CHATGPT_TEMPERATURE, chatgptTemperature);
    setOption(STORAGE_KEYS.CHATGPT_MAX_TOKENS, chatgptMaxTokens);
    setOption(STORAGE_KEYS.DEBUG_MODE, debugMode);
    setOption(STORAGE_KEYS.LOG_LEVEL, logLevel);

    // Configurações específicas por modo
    if (applicationMode === OrchOSModeEnum.ADVANCED) {
      // API Keys para o modo avançado apenas
      setOption(STORAGE_KEYS.OPENAI_API_KEY, chatgptApiKey);
      setOption(STORAGE_KEYS.CHATGPT_MODEL, chatgptModel);
      setOption(STORAGE_KEYS.OPENAI_EMBEDDING_MODEL, openaiEmbeddingModel);
      setOption(STORAGE_KEYS.DEEPGRAM_API_KEY, deepgramApiKey);
      setOption(STORAGE_KEYS.DEEPGRAM_MODEL, deepgramModel);
      setOption(STORAGE_KEYS.DEEPGRAM_LANGUAGE, deepgramLanguage);
      setOption(STORAGE_KEYS.PINECONE_API_KEY, pineconeApiKey);
    } else {
      // Configurações específicas para o modo básico
      setOption(STORAGE_KEYS.HF_EMBEDDING_MODEL, hfEmbeddingModel);
    }
  }, [ 
    name, enableMatrix, matrixDensity, enableEffects, enableAnimations, darkMode, enableNeumorphism, 
    enableGlassmorphism, panelTransparency, colorTheme, audioQuality, autoGainControl,
    noiseSuppression, echoCancellation, enhancedPunctuation, speakerDiarization, 
    chatgptApiKey, chatgptModel, openaiEmbeddingModel, hfEmbeddingModel, deepgramApiKey, deepgramModel, deepgramLanguage, pineconeApiKey, applicationMode]);

  // Se não for exibido, não renderizar nada
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900/90 rounded-2xl shadow-2xl p-8 w-full max-w-2xl relative backdrop-blur-lg ring-2 ring-cyan-400/10 max-h-[80vh] overflow-auto">
        <button
          className="orchos-btn-circle absolute top-4 right-4"
          onClick={onClose}
          title="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
          </svg>
        </button>
        
        <h2 className="text-2xl font-bold mb-4 text-center tracking-wide bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(0,240,255,0.5)] orchos-title">
          Quantum System Settings
        </h2>
        
        {/* Tabs navigation */}
        <div className="flex space-x-2 mb-6 border-b border-cyan-400/30 pb-2">
          <button 
            className={`px-4 py-2 rounded-t-lg ${activeTab === 'general' ? 'bg-cyan-500/20 text-cyan-300' : 'text-cyan-400/60 hover:text-cyan-300'} transition-all duration-200`}
            onClick={() => setActiveTab('general')}
          >
            General
          </button>
          <button 
            className={`px-4 py-2 rounded-t-lg ${activeTab === 'interface' ? 'bg-cyan-500/20 text-cyan-300' : 'text-cyan-400/60 hover:text-cyan-300'} transition-all duration-200`}
            onClick={() => setActiveTab('interface')}
          >
            Interface
          </button>
          <button 
            className={`px-4 py-2 rounded-t-lg ${activeTab === 'audio' ? 'bg-cyan-500/20 text-cyan-300' : 'text-cyan-400/60 hover:text-cyan-300'} transition-all duration-200`}
            onClick={() => setActiveTab('audio')}
          >
            Audio
          </button>
          <button 
            className={`px-4 py-2 rounded-t-lg ${activeTab === 'advanced' ? 'bg-cyan-500/20 text-cyan-300' : 'text-cyan-400/60 hover:text-cyan-300'} transition-all duration-200`}
            onClick={() => setActiveTab('advanced')}
          >
            Advanced
          </button>
        </div>
        
        {/* Conteúdo das abas utilizando os componentes modularizados */}
        <div className="mb-6">
          {/* General Tab */}
          {activeTab === 'general' && (
            <GeneralSettings
              name={name}
              setName={setName}
              applicationMode={applicationMode}
              setApplicationMode={(mode: OrchOSMode) => setApplicationMode(mode)}
              enableMatrix={enableMatrix}
              setEnableMatrix={setEnableMatrix}
              matrixDensity={matrixDensity}
              setMatrixDensity={setMatrixDensity}
              enableEffects={enableEffects}
              setEnableEffects={setEnableEffects}
              enableAnimations={enableAnimations}
              setEnableAnimations={setEnableAnimations}
            />
          )}
          
          {/* Interface Tab */}
          {activeTab === 'interface' && (
            <InterfaceSettings
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              enableNeumorphism={enableNeumorphism}
              setEnableNeumorphism={setEnableNeumorphism}
              enableGlassmorphism={enableGlassmorphism}
              setEnableGlassmorphism={setEnableGlassmorphism}
              panelTransparency={panelTransparency}
              setPanelTransparency={setPanelTransparency}
              colorTheme={colorTheme}
              setColorTheme={setColorTheme}
            />
          )}
          
          {/* Audio Tab */}
          {activeTab === 'audio' && (
            <AudioSettings
              enhancedPunctuation={enhancedPunctuation}
              setEnhancedPunctuation={setEnhancedPunctuation}
              speakerDiarization={speakerDiarization}
              setSpeakerDiarization={setSpeakerDiarization}
              audioQuality={audioQuality}
              setAudioQuality={setAudioQuality}
              autoGainControl={autoGainControl}
              setAutoGainControl={setAutoGainControl}
              noiseSuppression={noiseSuppression}
              setNoiseSuppression={setNoiseSuppression}
              echoCancellation={echoCancellation}
              setEchoCancellation={setEchoCancellation}
            />
          )}
          
          {/* Advanced Tab */}
          {activeTab === 'advanced' && (
            <ApiSettings
              applicationMode={applicationMode}
              setApplicationMode={setApplicationMode}
              pineconeApiKey={pineconeApiKey}
              setPineconeApiKey={setPineconeApiKey}
              chatgptApiKey={chatgptApiKey}
              setChatgptApiKey={setChatgptApiKey}
              chatgptModel={chatgptModel}
              setChatgptModel={setChatgptModel}
              openaiEmbeddingModel={openaiEmbeddingModel}
              setOpenaiEmbeddingModel={setOpenaiEmbeddingModel}
              hfModel={hfModel}
              setHfModel={setHfModel}
              hfEmbeddingModel={hfEmbeddingModel}
              setHfEmbeddingModel={setHfEmbeddingModel}
              deepgramApiKey={deepgramApiKey}
              setDeepgramApiKey={setDeepgramApiKey}
              deepgramModel={deepgramModel}
              setDeepgramModel={setDeepgramModel}
              deepgramLanguage={deepgramLanguage}
              setDeepgramLanguage={setDeepgramLanguage}
              openSection={openSection}
              setOpenSection={setOpenSection}
            />
          )}
        </div>
        
        {/* Botões de ação */}
        <div className="flex justify-end space-x-4 mt-8">
          <button 
            className="px-6 py-2 bg-black/40 text-cyan-400/80 rounded hover:bg-black/60 hover:text-cyan-300 transition-all"
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="px-6 py-2 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-300 rounded hover:from-cyan-500/40 hover:to-blue-500/40 transition-all shadow-[0_0_10px_rgba(0,200,255,0.2)] backdrop-blur-sm"
            onClick={onClose}
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
