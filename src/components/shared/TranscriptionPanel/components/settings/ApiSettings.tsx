// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from 'react';
import { setOption, subscribeToStorageChanges, STORAGE_KEYS } from '../../../../../services/StorageService';

/**
 * Componente para configurações de APIs externas (Deepgram, ChatGPT, Pinecone)
 * Segue os princípios neurais-simbólicos e Clean Architecture do Orch-OS
 */
interface ApiSettingsProps {
  applicationMode: 'basic' | 'advanced';
  setApplicationMode: (mode: 'basic' | 'advanced') => void;
  // Pinecone
  pineconeApiKey: string;
  setPineconeApiKey: (value: string) => void;
  // ChatGPT
  chatgptApiKey: string;
  setChatgptApiKey: (value: string) => void;
  chatgptModel: string;
  setChatgptModel: (value: string) => void;
  // Deepgram
  deepgramApiKey: string;
  setDeepgramApiKey: (value: string) => void;
  deepgramModel: string;
  setDeepgramModel: (value: string) => void;
  deepgramLanguage: string;
  setDeepgramLanguage: (value: string) => void;
  // Handlers
  openSection: 'pinecone' | 'chatgpt' | 'deepgram' | null;
  setOpenSection: (section: 'pinecone' | 'chatgpt' | 'deepgram' | null) => void;
}

const ApiSettings: React.FC<ApiSettingsProps> = ({
  applicationMode,
  setApplicationMode,
  pineconeApiKey,
  setPineconeApiKey,
  chatgptApiKey,
  setChatgptApiKey,
  chatgptModel,
  setChatgptModel,
  deepgramApiKey,
  setDeepgramApiKey,
  deepgramModel,
  setDeepgramModel,
  deepgramLanguage,
  setDeepgramLanguage,
  openSection,
  setOpenSection
}) => {
  // Renderização condicional baseada no modo da aplicação
  if (applicationMode === 'basic') {
    return (
      <div className="p-4 rounded-lg bg-black/30 border border-cyan-500/20">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-r from-cyan-500/30 to-blue-500/30 mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="text-cyan-300">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
              <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
            </svg>
          </div>
          <h3 className="text-lg font-medium text-cyan-300">Basic Mode Services</h3>
        </div>
        
        <div className="space-y-4">
          <div className="bg-black/40 p-4 rounded-md">
            <h4 className="text-cyan-400 font-medium mb-2">HuggingFace Models</h4>
            <p className="text-white/70 text-sm">Select local models to use for your Orch-OS instance.</p>
            <div className="mt-3">
              <select 
                className="w-full p-2 rounded bg-black/40 text-white/90 border border-cyan-500/30"
                title="Select HuggingFace Model"
                aria-label="Select HuggingFace Model"
              >
                <option value="distilbert">DistilBERT (Small & Fast)</option>
                <option value="bert-base">BERT Base</option>
                <option value="llama-7b">Llama 7B (Recommended)</option>
              </select>
            </div>
          </div>
          
          <div className="bg-black/40 p-4 rounded-md">
            <h4 className="text-cyan-400 font-medium mb-2">Local Storage</h4>
            <p className="text-white/70 text-sm">Storage location for your neural memory database.</p>
            <div className="mt-3 flex">
              <input 
                type="text" 
                className="flex-1 p-2 rounded-l bg-black/40 text-white/90 border border-cyan-500/30"
                value="./orch-os-memory"
                readOnly
                title="Local storage location"
                aria-label="Local storage location"
              />
              <button className="bg-cyan-600/30 hover:bg-cyan-500/40 text-cyan-300 rounded-r px-3 border border-cyan-500/30">
                Browse
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex justify-end">
          <button 
            className="text-cyan-300 bg-gradient-to-r from-cyan-600/30 to-blue-600/30 hover:from-cyan-500/40 hover:to-blue-500/40 px-4 py-2 rounded-md border border-cyan-500/30 transition-all duration-300"
            onClick={() => setApplicationMode('advanced')}
          >
            Switch to Advanced Mode
          </button>
        </div>
      </div>
    );
  }

  // Modo Advanced - APIs completas
  return (
    <div className="flex flex-col w-full">
      {/* Sub-abas de navegação para os serviços de API */}
      <div className="mb-6 border-b border-cyan-900/40">
        <div className="flex space-x-6">
          <button 
            type="button"
            className={`px-3 py-2 font-medium transition-colors border-b-2 ${openSection === 'pinecone' 
              ? 'text-cyan-300 border-cyan-500/70' 
              : 'text-cyan-500/60 border-transparent hover:text-cyan-400/80 hover:border-cyan-600/30'}`}
            onClick={() => setOpenSection(openSection === 'pinecone' ? null : 'pinecone')}
          >
            Pinecone
          </button>

          <button 
            type="button"
            className={`px-3 py-2 font-medium transition-colors border-b-2 ${openSection === 'chatgpt' 
              ? 'text-cyan-300 border-cyan-500/70' 
              : 'text-cyan-500/60 border-transparent hover:text-cyan-400/80 hover:border-cyan-600/30'}`}
            onClick={() => setOpenSection(openSection === 'chatgpt' ? null : 'chatgpt')}
          >
            ChatGPT
          </button>

          <button 
            type="button"
            className={`px-3 py-2 font-medium transition-colors border-b-2 ${openSection === 'deepgram' 
              ? 'text-cyan-300 border-cyan-500/70' 
              : 'text-cyan-500/60 border-transparent hover:text-cyan-400/80 hover:border-cyan-600/30'}`}
            onClick={() => setOpenSection(openSection === 'deepgram' ? null : 'deepgram')}
          >
            Deepgram
          </button>
        </div>
      </div>
      
      {/* Seção Pinecone */}
      {openSection === 'pinecone' && (
        <div className="p-4 rounded-md bg-black/20 mb-4 animate-fade-in">
          <h3 className="text-lg text-cyan-300 mb-4">Pinecone Vector Database</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="pineconeApiKey" className="block mb-1 text-sm text-cyan-200/80">Pinecone API Key</label>
              <input 
                type="password"
                id="pineconeApiKey"
                className="w-full p-2 rounded bg-black/40 text-white/90 border border-cyan-500/30"
                value={pineconeApiKey}
                onChange={e => setPineconeApiKey(e.target.value)}
                placeholder="Enter your Pinecone API key"
              />
              <p className="text-xs text-cyan-400/60 mt-1">Used for long-term memory storage.</p>
            </div>
          </div>
        </div>
      )}

      {/* Seção ChatGPT */}
      {openSection === 'chatgpt' && (
        <div className="p-4 rounded-md bg-black/20 mb-4 animate-fade-in">
          <h3 className="text-lg text-cyan-300 mb-4">ChatGPT Integration</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="chatgptApiKey" className="block mb-1 text-sm text-cyan-200/80">ChatGPT API Key</label>
              <input 
                type="password"
                id="chatgptApiKey"
                className="w-full p-2 rounded bg-black/40 text-white/90 border border-cyan-500/30"
                value={chatgptApiKey}
                onChange={e => setChatgptApiKey(e.target.value)}
                placeholder="Enter your ChatGPT API key"
              />
            </div>
            
            <div>
              <label htmlFor="chatgptModel" className="block mb-1 text-sm text-cyan-200/80">ChatGPT Model</label>
              <select
                id="chatgptModel"
                className="w-full p-2 rounded bg-black/40 text-white/90 border border-cyan-500/30"
                value={chatgptModel}
                onChange={e => setChatgptModel(e.target.value)}
                title="Select ChatGPT Model"
              >
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-4o">GPT-4o</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Seção Deepgram */}
      {openSection === 'deepgram' && (
        <div className="p-4 rounded-md bg-black/20 mb-4 animate-fade-in">
          <h3 className="text-lg text-cyan-300 mb-4">Deepgram Voice Transcription</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="deepgramApiKey" className="block mb-1 text-sm text-cyan-200/80">Deepgram API Key</label>
              <input 
                type="password"
                id="deepgramApiKey"
                className="w-full p-2 rounded bg-black/40 text-white/90 border border-cyan-500/30"
                value={deepgramApiKey}
                onChange={e => setDeepgramApiKey(e.target.value)}
                placeholder="Enter your Deepgram API key"
              />
            </div>
            
            <div>
              <label htmlFor="deepgramModel" className="block mb-1 text-sm text-cyan-200/80">Deepgram Model</label>
              <select
                id="deepgramModel"
                className="w-full p-2 rounded bg-black/40 text-white/90 border border-cyan-500/30"
                value={deepgramModel}
                onChange={e => setDeepgramModel(e.target.value)}
                title="Select Deepgram Model"
              >
                {/* Nova-3 - Latest and most advanced */}
                <optgroup label="Nova-3 Models">
                  <option value="nova-3">Nova-3 General</option>
                  <option value="nova-3-medical">Nova-3 Medical</option>
                </optgroup>
                
                {/* Nova-2 - Second generation */}
                <optgroup label="Nova-2 Models">
                  <option value="nova-2">Nova-2 General (Recommended)</option>
                  <option value="nova-2-meeting">Nova-2 Meeting</option>
                  <option value="nova-2-phonecall">Nova-2 Phone Call</option>
                  <option value="nova-2-video">Nova-2 Video</option>
                </optgroup>
                
                {/* Nova - First generation */}
                <optgroup label="Nova Models">
                  <option value="nova">Nova General</option>
                  <option value="nova-phonecall">Nova Phone Call</option>
                </optgroup>
                
                {/* Enhanced - Legacy models */}
                <optgroup label="Enhanced Models">
                  <option value="enhanced">Enhanced General</option>
                  <option value="enhanced-meeting">Enhanced Meeting</option>
                  <option value="enhanced-phonecall">Enhanced Phone Call</option>
                  <option value="enhanced-finance">Enhanced Finance</option>
                </optgroup>
                
                {/* Base - Basic models */}
                <optgroup label="Base Models">
                  <option value="base">Base General</option>
                  <option value="base-meeting">Base Meeting</option>
                  <option value="base-phonecall">Base Phone Call</option>
                  <option value="base-finance">Base Finance</option>
                </optgroup>
              </select>
            </div>
            
            {/* Compatibilidade modelo-idioma */}
            <div>
              <label htmlFor="deepgramLanguage" className="block mb-1 text-sm text-cyan-200/80">Transcription Language</label>
              
              {/* Mapa de compatibilidade entre modelos e idiomas */}
              {(() => {
                // Tipagem para assegurar que os índices string funcionem corretamente
                type ModelLanguageMap = {
                  [key: string]: string[];
                };
                
                // Dicionário de idiomas disponíveis por família de modelo
                // Baseado na documentação oficial mais recente do Deepgram
                const modelLanguageCompatibility: ModelLanguageMap = {
                  // Nova-3 suporta apenas inglês na versão inicial
                  'nova-3': ['en', 'en-US', 'en-GB', 'en-AU', 'en-IN', 'en-NZ'],
                  'nova-3-medical': ['en', 'en-US', 'en-GB', 'en-AU', 'en-IN', 'en-NZ'],
                  
                  // Nova-2 tem suporte extenso a idiomas
                  'nova-2': [
                    'multi', 
                    'en', 'en-US', 'en-GB', 'en-AU', 'en-IN', 'en-NZ',
                    'pt', 'pt-BR', 'pt-PT',
                    'es', 'es-419',
                    'fr', 'fr-CA',
                    'de', 'de-CH',
                    'it', 'ja', 'ko', 'ko-KR',
                    'zh-CN', 'zh-TW', 'zh-HK',
                    'ru', 'hi', 'nl', 'nl-BE',
                    'bg', 'ca', 'cs', 'da', 'da-DK',
                    'el', 'et', 'fi', 'hu', 'id',
                    'lv', 'lt', 'ms', 'no', 'pl', 'ro',
                    'sk', 'sv', 'sv-SE', 'th', 'th-TH',
                    'tr', 'uk', 'vi'
                  ],
                  'nova-2-meeting': [
                    'multi', 
                    'en', 'en-US', 'en-GB', 'en-AU', 'en-IN', 'en-NZ',
                    'es', 'fr', 'de', 'pt-BR'
                  ],
                  'nova-2-phonecall': [
                    'multi', 
                    'en', 'en-US', 'en-GB', 'en-AU', 'en-IN', 
                    'es', 'fr', 'de', 'pt-BR'
                  ],
                  'nova-2-video': [
                    'multi',
                    'en', 'en-US', 'en-GB', 'en-AU',  
                    'es', 'fr', 'de', 'pt-BR'
                  ],
                  
                  // Nova suporta principalmente inglês
                  'nova': ['en', 'en-US', 'en-GB', 'en-AU'],
                  'nova-phonecall': ['en', 'en-US', 'en-GB'],
                  
                  // Enhanced suporta alguns idiomas principais
                  'enhanced': ['en', 'en-US', 'en-GB', 'en-AU', 'es', 'fr', 'de', 'pt-BR', 'ja', 'ko'],
                  'enhanced-meeting': ['en', 'en-US', 'en-GB', 'es', 'fr', 'de'],
                  'enhanced-phonecall': ['en', 'en-US', 'en-GB', 'es'],
                  'enhanced-finance': ['en', 'en-US', 'en-GB'],
                  
                  // Base com suporte limitado
                  'base': ['en', 'en-US', 'en-GB', 'en-AU', 'es', 'fr', 'de', 'pt-BR', 'ja'],
                  'base-meeting': ['en', 'en-US', 'en-GB'],
                  'base-phonecall': ['en', 'en-US', 'en-GB', 'es'],
                  'base-finance': ['en', 'en-US']
                };
                
                // Determinar os idiomas disponíveis para o modelo selecionado
                const modelPrefix = deepgramModel.split('-')[0]; // ex: 'nova-2-meeting' -> 'nova'
                const availableLanguages = modelLanguageCompatibility[deepgramModel] ||
                                          modelLanguageCompatibility[`${modelPrefix}-general`] ||
                                          modelLanguageCompatibility[modelPrefix] || 
                                          ['en', 'en-US']; // fallback para inglês
                                       
                // Verificar se o idioma atual é compatível
                const isCurrentLanguageCompatible = availableLanguages.includes(deepgramLanguage);
                
                // Se não for compatível, selecionar o primeiro idioma disponível
                React.useEffect(() => {
                  if (!isCurrentLanguageCompatible && availableLanguages.length > 0) {
                    console.log(`🌐 Modelo ${deepgramModel} não suporta idioma ${deepgramLanguage}, alterando para ${availableLanguages[0]}`);
                    setDeepgramLanguage(availableLanguages[0]);
                    // Salvar na configuração global
                    setOption(STORAGE_KEYS.DEEPGRAM_LANGUAGE, availableLanguages[0]);
                  }
                }, [deepgramModel]);
                
                // Ouvir mudanças nas configurações globais
                React.useEffect(() => {
                  const handleStorageChange = (key: string, value: any) => {
                    if (key === 'deepgramLanguage' && value && value !== deepgramLanguage) {
                      // Verifica se o novo idioma é compatível com o modelo atual
                      if (availableLanguages.includes(value)) {
                        console.log(`🌐 ApiSettings: Sincronizando idioma com configurações globais: ${value}`);
                        setDeepgramLanguage(value);
                      } else {
                        console.log(`⚠️ ApiSettings: Idioma ${value} incompatível com modelo ${deepgramModel}`);
                      }
                    }
                  };
                  
                  // Registra o listener para mudanças
                  const unsubscribe = subscribeToStorageChanges(handleStorageChange);
                  
                  // Limpeza ao desmontar
                  return () => unsubscribe();
                }, [availableLanguages]);
               
                // Definições de idiomas para exibição
                // Tipagem para assegurar que os índices string funcionem corretamente
                type LanguageDisplayMap = { 
                  [key: string]: string;
                };
                
                const languageDisplay: LanguageDisplayMap = {
                  'multi': 'Multilingual (Auto-detect)',
                  'en': 'English (Global)',
                  'en-US': 'English (US)',
                  'en-GB': 'English (UK)',
                  'en-AU': 'English (Australia)',
                  'en-IN': 'English (India)',
                  'en-NZ': 'English (New Zealand)',
                  'pt': 'Portuguese',
                  'pt-BR': 'Portuguese (Brazil)',
                  'pt-PT': 'Portuguese (Portugal)',
                  'es': 'Spanish',
                  'es-419': 'Spanish (Latin America)',
                  'fr': 'French',
                  'fr-CA': 'French (Canada)',
                  'de': 'German',
                  'de-CH': 'German (Switzerland)',
                  'it': 'Italian',
                  'ja': 'Japanese',
                  'ko': 'Korean',
                  'ko-KR': 'Korean',
                  'zh-CN': 'Chinese (Simplified)',
                  'zh-TW': 'Chinese (Traditional)',
                  'zh-HK': 'Chinese (Cantonese)',
                  'ru': 'Russian',
                  'hi': 'Hindi',
                  'nl': 'Dutch',
                  'nl-BE': 'Dutch (Belgium)/Flemish',
                  'bg': 'Bulgarian',
                  'ca': 'Catalan',
                  'cs': 'Czech',
                  'da': 'Danish',
                  'da-DK': 'Danish',
                  'el': 'Greek',
                  'et': 'Estonian',
                  'fi': 'Finnish',
                  'hu': 'Hungarian',
                  'id': 'Indonesian',
                  'lv': 'Latvian',
                  'lt': 'Lithuanian',
                  'ms': 'Malay',
                  'no': 'Norwegian',
                  'pl': 'Polish',
                  'ro': 'Romanian',
                  'sk': 'Slovak',
                  'sv': 'Swedish',
                  'sv-SE': 'Swedish',
                  'th': 'Thai',
                  'th-TH': 'Thai',
                  'tr': 'Turkish',
                  'uk': 'Ukrainian',
                  'vi': 'Vietnamese'
                };
                
                // Renderizar o seletor de idiomas com base nos idiomas disponíveis
                return (
                  <select
                    id="deepgramLanguage"
                    className="w-full p-2 rounded bg-black/40 text-white/90 border border-cyan-500/30"
                    value={deepgramLanguage}
                    onChange={e => setDeepgramLanguage(e.target.value)}
                    title="Select Transcription Language"
                  >
                    {availableLanguages.map((lang: string) => (
                      <option key={lang} value={lang}>
                        {languageDisplay[lang] || lang}
                      </option>
                    ))}
                  </select>
                );
              })()}
              
              {/* Nota informativa sobre compatibilidade */}
              <p className="text-xs text-cyan-200/50 mt-1">
                {deepgramModel.includes('nova-3') ? 
                  'Nova-3 currently supports English only. More languages coming soon.' :
                  deepgramModel.includes('nova-2') ?
                    'Nova-2 supports up to 36 languages with best-in-class accuracy.' :
                    'Limited language support for this model.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiSettings;
