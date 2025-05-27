// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { useState } from "react";
import { getUserName, setOption, getOption } from '../../../../services/StorageService';

interface SettingsModalProps {
  show: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  show,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'interface' | 'audio' | 'advanced'>('general');
  // Symbolic: State for options, initialized from storage cortex
  // General
  const [name, setName] = useState<string>(() => getUserName());
  const [enableMatrix, setEnableMatrix] = useState<boolean>(() => getOption<boolean>('enableMatrix') ?? true);
  const [matrixDensity, setMatrixDensity] = useState<number>(() => getOption<number>('matrixDensity') ?? 60);
  const [enableEffects, setEnableEffects] = useState<boolean>(() => getOption<boolean>('enableEffects') ?? true);
  const [enableAnimations, setEnableAnimations] = useState<boolean>(() => getOption<boolean>('enableAnimations') ?? true);

  // Interface
  const [themeColor, setThemeColor] = useState<string>(() => getOption<string>('themeColor') || 'cyan');
  const [glassOpacity, setGlassOpacity] = useState<number>(() => getOption<number>('glassOpacity') ?? 60);
  const [useCompactLayout, setUseCompactLayout] = useState<boolean>(() => getOption<boolean>('useCompactLayout') ?? false);
  const [showStatusBar, setShowStatusBar] = useState<boolean>(() => getOption<boolean>('showStatusBar') ?? true);

  // Audio
  const [audioQuality, setAudioQuality] = useState<string>(() => getOption<string>('audioQuality') || 'high');
  const [noiseReduction, setNoiseReduction] = useState<number>(() => getOption<number>('noiseReduction') ?? 50);
  const [enhancedPunctuation, setEnhancedPunctuation] = useState<boolean>(() => getOption<boolean>('enhancedPunctuation') ?? true);
  const [speakerDiarization, setSpeakerDiarization] = useState<boolean>(() => getOption<boolean>('speakerDiarization') ?? true);

  // ChatGPT & Deepgram
  const [chatgptApiKey, setChatgptApiKey] = useState<string>(() => getOption<string>('chatgptApiKey') || '');
  const [chatgptModel, setChatgptModel] = useState<string>(() => getOption<string>('chatgptModel') || 'gpt-3.5-turbo');
  const [deepgramApiKey, setDeepgramApiKey] = useState<string>(() => getOption<string>('deepgramApiKey') || '');
  const [deepgramModel, setDeepgramModel] = useState<string>(() => getOption<string>('deepgramModel') || 'nova-2');
  const [deepgramLanguage, setDeepgramLanguage] = useState<string>(() => getOption<string>('deepgramLanguage') || 'pt-BR');


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
        
        <h2 className="text-2xl font-bold mb-6 text-center tracking-wide bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(0,240,255,0.5)] orchos-title">
          Quantum System Settings
        </h2>
        
        {/* Name input (symbolic: user identity) */}
        {activeTab === 'general' && (
          <div className="mb-6">
            <label htmlFor="userName" className="block text-cyan-200/80 mb-1">User Name</label>
            <input
              type="text"
              id="userName"
              className="w-full p-2 rounded-lg bg-black/30 border-2 border-cyan-400/40 text-white focus:outline-none focus:border-cyan-400"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter your name"
            />
          </div>
        )}
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
        
        {/* Tab content */}
        <div className="space-y-4">
          {activeTab === 'general' && (
            <>
              <div className="mb-4">
                <h3 className="text-cyan-300 text-lg mb-2">Quantum Consciousness Matrix</h3>
                <div className="space-y-4 pl-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="enableMatrix"
                      className="w-5 h-5 rounded bg-cyan-800/30 border-cyan-500/50 text-cyan-500 focus:ring-cyan-500/30"
                      checked={enableMatrix}
                      onChange={e => setEnableMatrix(e.target.checked)}
                    />
                    <label htmlFor="enableMatrix" className="ml-2 text-cyan-200/90">Enable Quantum Visualization</label>
                  </div>
                  
                  <div>
                    <label htmlFor="matrixDensity" className="block text-cyan-200/80 mb-1">Particle Density</label>
                    <input
                      type="range"
                      id="matrixDensity"
                      min="1"
                      max="100"
                      value={matrixDensity}
                      onChange={e => setMatrixDensity(Number(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-cyan-800/30"
                    />
                  </div>
                </div>
              </div>
              
              <div className="mb-4">
                <h3 className="text-cyan-300 text-lg mb-2">System Performance</h3>
                <div className="space-y-4 pl-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="enableEffects"
                      className="w-5 h-5 rounded bg-cyan-800/30 border-cyan-500/50 text-cyan-500 focus:ring-cyan-500/30"
                      checked={enableEffects}
                      onChange={e => setEnableEffects(e.target.checked)}
                    />
                    <label htmlFor="enableEffects" className="ml-2 text-cyan-200/90">Enable Visual Effects</label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="enableAnimations"
                      className="w-5 h-5 rounded bg-cyan-800/30 border-cyan-500/50 text-cyan-500 focus:ring-cyan-500/30"
                      checked={enableAnimations}
                      onChange={e => setEnableAnimations(e.target.checked)}
                    />
                    <label htmlFor="enableAnimations" className="ml-2 text-cyan-200/90">Enable Animations</label>
                  </div>
                </div>
              </div>
            </>
          )}
          
          {activeTab === 'interface' && (
            <>
              <div className="mb-4">
                <h3 className="text-cyan-300 text-lg mb-2">Theme Settings</h3>
                <div className="space-y-4 pl-4">
                  <div>
                    <label htmlFor="themeColor" className="block text-cyan-200/80 mb-1">Primary Color</label>
                    <div className="flex space-x-2">
                      <button 
                        className={`w-8 h-8 rounded-full bg-cyan-500 ring-2 ring-white/20 ${themeColor === 'cyan' ? 'ring-cyan-400' : ''}`}
                        title="Cyan theme"
                        aria-label="Select cyan theme color"
                        onClick={() => setThemeColor('cyan')}
                      ></button>
                      <button 
                        className={`w-8 h-8 rounded-full bg-purple-500 ring-2 ring-white/20 ${themeColor === 'purple' ? 'ring-purple-400' : ''}`}
                        title="Purple theme"
                        aria-label="Select purple theme color"
                        onClick={() => setThemeColor('purple')}
                      ></button>
                      <button 
                        className={`w-8 h-8 rounded-full bg-blue-500 ring-2 ring-white/20 ${themeColor === 'blue' ? 'ring-blue-400' : ''}`}
                        title="Blue theme"
                        aria-label="Select blue theme color"
                        onClick={() => setThemeColor('blue')}
                      ></button>
                      <button 
                        className={`w-8 h-8 rounded-full bg-emerald-500 ring-2 ring-white/20 ${themeColor === 'emerald' ? 'ring-emerald-400' : ''}`}
                        title="Emerald theme"
                        aria-label="Select emerald theme color"
                        onClick={() => setThemeColor('emerald')}
                      ></button>
                      <button 
                        className={`w-8 h-8 rounded-full bg-amber-500 ring-2 ring-white/20 ${themeColor === 'amber' ? 'ring-amber-400' : ''}`}
                        title="Amber theme"
                        aria-label="Select amber theme color"
                        onClick={() => setThemeColor('amber')}
                      ></button>
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="glassOpacity" className="block text-cyan-200/80 mb-1">Glass Opacity</label>
                    <input
                      type="range"
                      id="glassOpacity"
                      min="10"
                      max="95"
                      value={glassOpacity}
                      onChange={e => setGlassOpacity(Number(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-cyan-800/30"
                    />
                  </div>
                </div>
              </div>
              
              <div className="mb-4">
                <h3 className="text-cyan-300 text-lg mb-2">Layout</h3>
                <div className="space-y-4 pl-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="useCompactLayout"
                      className="w-5 h-5 rounded bg-cyan-800/30 border-cyan-500/50 text-cyan-500 focus:ring-cyan-500/30"
                      checked={useCompactLayout}
                      onChange={e => setUseCompactLayout(e.target.checked)}
                    />
                    <label htmlFor="useCompactLayout" className="ml-2 text-cyan-200/90">Use Compact Layout</label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="showStatusBar"
                      className="w-5 h-5 rounded bg-cyan-800/30 border-cyan-500/50 text-cyan-500 focus:ring-cyan-500/30"
                      checked={showStatusBar}
                      onChange={e => setShowStatusBar(e.target.checked)}
                    />
                    <label htmlFor="showStatusBar" className="ml-2 text-cyan-200/90">Show Status Bar</label>
                  </div>
                </div>
              </div>
            </>
          )}
          
          {activeTab === 'audio' && (
            <>
              <div className="mb-4">
                <h3 className="text-cyan-300 text-lg mb-2">Transcription Settings</h3>
                <div className="space-y-4 pl-4">                  
                  <div>
                    <label htmlFor="audioQuality" className="block text-cyan-200/80 mb-1">Audio Quality</label>
                    <select 
                      id="audioQuality" 
                      className="w-full p-2 rounded-lg bg-black/30 border-2 border-cyan-400/40 text-white focus:outline-none focus:border-cyan-400"
                      value={audioQuality}
                      onChange={e => setAudioQuality(e.target.value)}
                    >
                      <option value="low">Low (16kHz)</option>
                      <option value="standard">Standard (24kHz)</option>
                      <option value="high">High (48kHz)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="noiseReduction" className="block text-cyan-200/80 mb-1">Noise Reduction</label>
                    <input
                      type="range"
                      id="noiseReduction"
                      min="0"
                      max="100"
                      value={noiseReduction}
                      onChange={e => setNoiseReduction(Number(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-cyan-800/30"
                    />
                  </div>
                </div>
              </div>
              
              <div className="mb-4">
                <h3 className="text-cyan-300 text-lg mb-2">Speech Recognition</h3>
                <div className="space-y-4 pl-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="enhancedPunctuation"
                      className="w-5 h-5 rounded bg-cyan-800/30 border-cyan-500/50 text-cyan-500 focus:ring-cyan-500/30"
                      checked={enhancedPunctuation}
                      onChange={e => setEnhancedPunctuation(e.target.checked)}
                    />
                    <label htmlFor="enhancedPunctuation" className="ml-2 text-cyan-200/90">Enhanced Punctuation</label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="speakerDiarization"
                      className="w-5 h-5 rounded bg-cyan-800/30 border-cyan-500/50 text-cyan-500 focus:ring-cyan-500/30"
                      checked={speakerDiarization}
                      onChange={e => setSpeakerDiarization(e.target.checked)}
                    />
                    <label htmlFor="speakerDiarization" className="ml-2 text-cyan-200/90">Speaker Diarization</label>
                  </div>
                </div>
              </div>
            </>
          )}
          
          {activeTab === 'advanced' && (
            <>


              <div className="mb-4">
                <h3 className="text-cyan-300 text-lg mb-2">ChatGPT Settings</h3>
                <div className="space-y-4 pl-4">
                  <div>
                    <label htmlFor="chatgptApiKey" className="block text-cyan-200/80 mb-1">ChatGPT API Key</label>
                    <input
                      type="password"
                      id="chatgptApiKey"
                      className="w-full p-2 rounded-lg bg-black/30 border-2 border-cyan-400/40 text-white focus:outline-none focus:border-cyan-400"
                      placeholder="sk-..."
                      value={chatgptApiKey}
                      onChange={e => setChatgptApiKey(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="chatgptModel" className="block text-cyan-200/80 mb-1">ChatGPT Model</label>
                    <select
                      id="chatgptModel"
                      className="w-full p-2 rounded-lg bg-black/30 border-2 border-cyan-400/40 text-white focus:outline-none focus:border-cyan-400"
                      value={chatgptModel}
                      onChange={e => setChatgptModel(e.target.value)}
                    >
                      <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                      <option value="gpt-4">gpt-4</option>
                      <option value="gpt-4o">gpt-4o</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="text-cyan-300 text-lg mb-2">Deepgram Settings</h3>
                <div className="space-y-4 pl-4">
                  <div>
                    <label htmlFor="deepgramApiKey" className="block text-cyan-200/80 mb-1">Deepgram API Key</label>
                    <input
                      type="password"
                      id="deepgramApiKey"
                      className="w-full p-2 rounded-lg bg-black/30 border-2 border-cyan-400/40 text-white focus:outline-none focus:border-cyan-400"
                      placeholder="Ex: 1a2b3c4d5e6f..."
                      value={deepgramApiKey}
                      onChange={e => setDeepgramApiKey(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="w-full md:w-1/2">
                      <label htmlFor="deepgramModel" className="block text-cyan-200/80 mb-1">Deepgram Model</label>
                      <select
                        id="deepgramModel"
                        className="w-full p-2 rounded-lg bg-black/30 border-2 border-cyan-400/40 text-white focus:outline-none focus:border-cyan-400"
                        value={deepgramModel}
                        onChange={e => setDeepgramModel(e.target.value)}
                      >
                        {/* Conditional rendering of Deepgram models by language */}
                        {['en-US', 'en'].includes(deepgramLanguage) && (
                          <>
                            <option value="nova-3-general">nova-3-general</option>
                            <option value="nova-3-medical">nova-3-medical</option>
                          </>
                        )}
                        {/* nova-2 and others are available for all */}
                        <option value="nova-2-general">nova-2-general</option>
                        <option value="nova-2-meeting">nova-2-meeting</option>
                        <option value="nova-2-phonecall">nova-2-phonecall</option>
                        <option value="nova-2-voicemail">nova-2-voicemail</option>
                        <option value="nova-2-finance">nova-2-finance</option>
                        <option value="nova-2-conversationalai">nova-2-conversationalai</option>
                        <option value="nova-2-video">nova-2-video</option>
                        <option value="nova-2-medical">nova-2-medical</option>
                        <option value="nova-2-drivethru">nova-2-drivethru</option>
                        <option value="nova-2-automotive">nova-2-automotive</option>
                        <option value="nova-2-atc">nova-2-atc</option>
                        <option value="general">general</option>
                        <option value="phonecall">phonecall</option>
                        <option value="meeting">meeting</option>
                        <option value="voicemail">voicemail</option>
                        {/* Only show enhanced for pt-BR */}
                        {deepgramLanguage === 'pt-BR' && (
                          <option value="enhanced">enhanced (pt-BR beta)</option>
                        )}
                      </select>
                    </div>
                    <div className="w-full md:w-1/2">
                      <label htmlFor="deepgramLanguage" className="block text-cyan-200/80 mb-1">Deepgram Language</label>
                      <select
                        id="deepgramLanguage"
                        className="w-full p-2 rounded-lg bg-black/30 border-2 border-cyan-400/40 text-white focus:outline-none focus:border-cyan-400"
                        value={deepgramLanguage}
                        onChange={e => setDeepgramLanguage(e.target.value)}
                      >
                        <option value="pt-BR">Portuguese (Brazil) – pt-BR</option>
                        <option value="pt-PT">Portuguese (Portugal) – pt-PT</option>
                        <option value="en-US">English (United States) – en-US</option>
                        <option value="en">English (Global) – en</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              

            </>
          )}
        </div>
        
        <div className="flex justify-end mt-6 space-x-3 pt-4 border-t border-cyan-400/30">
          <button 
            className="px-5 py-2 rounded-lg bg-transparent text-cyan-300 border border-cyan-400/40 hover:bg-cyan-900/30 transition-all duration-200"
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 transition-all duration-200 shadow-lg shadow-cyan-500/20"
            onClick={() => {
              // General
              setOption('name', name);
              setOption('enableMatrix', enableMatrix);
              setOption('matrixDensity', matrixDensity);
              setOption('enableEffects', enableEffects);
              setOption('enableAnimations', enableAnimations);
              // Interface
              setOption('themeColor', themeColor);
              setOption('glassOpacity', glassOpacity);
              setOption('useCompactLayout', useCompactLayout);
              setOption('showStatusBar', showStatusBar);
              // Audio
              setOption('audioQuality', audioQuality);
              setOption('noiseReduction', noiseReduction);
              setOption('enhancedPunctuation', enhancedPunctuation);
              setOption('speakerDiarization', speakerDiarization);
              setOption('chatgptApiKey', chatgptApiKey);
              setOption('chatgptModel', chatgptModel);
              setOption('deepgramApiKey', deepgramApiKey);
              setOption('deepgramModel', deepgramModel);
              setOption('deepgramLanguage', deepgramLanguage);
              onClose();
            }}
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
