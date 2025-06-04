// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { useEffect } from 'react';
import { setOption, STORAGE_KEYS } from '../../../../../../services/StorageService';
import { useDeepgramLanguageCompatibility } from './hooks/useDeepgramLanguageCompatibility';
import { DeepgramSettingsProps } from './types';

/**
 * Componente para configuração da integração com Deepgram
 * Implementa princípio de Responsabilidade Única (SRP) do SOLID
 * Extrai lógica de compatibilidade para um hook customizado
 * 
 * DEBUG: Adicionados logs temporários para diagnóstico de persistência
 */
const DeepgramSettings: React.FC<DeepgramSettingsProps> = React.memo(({
  deepgramApiKey,
  setDeepgramApiKey,
  deepgramModel,
  setDeepgramModel,
  deepgramLanguage,
  setDeepgramLanguage
}) => {
  // Hook para gerenciar compatibilidade entre modelo e idioma
  const { getCompatibleLanguages, getLanguageDisplay } = useDeepgramLanguageCompatibility();
  const compatibleLanguages = getCompatibleLanguages(deepgramModel);

  // Efeito para verificar e ajustar idioma quando o modelo muda
  useEffect(() => {
    // Só ajuste se realmente necessário
    const isCurrentLanguageCompatible = compatibleLanguages.includes(deepgramLanguage);
    const fallbackLanguage = compatibleLanguages[0];

    if (
      !isCurrentLanguageCompatible &&
      fallbackLanguage &&
      deepgramLanguage !== fallbackLanguage
    ) {
      console.log(
        `🌐 Modelo ${deepgramModel} não suporta idioma ${deepgramLanguage}, alterando para ${fallbackLanguage}`
      );
      setDeepgramLanguage(fallbackLanguage);
    }
    // Se já está compatível ou já é o fallback, não faz nada!
  }, [deepgramModel, deepgramLanguage, compatibleLanguages, setDeepgramLanguage]);

  // Move os logs para um useEffect para evitar logs em cada render
  useEffect(() => {
    console.log('[DeepgramSettings] deepgramModel alterado:', deepgramModel);
  }, [deepgramModel]);

  useEffect(() => {
    console.log('[DeepgramSettings] deepgramLanguage alterado:', deepgramLanguage);
  }, [deepgramLanguage]);

  return (
    <div className="p-3 rounded-md bg-black/20 mb-3 animate-fade-in">
      <h3 className="text-lg text-cyan-300 mb-2">Deepgram Voice Transcription</h3>
      <div className="space-y-3">
        <div>
          <label htmlFor="deepgramApiKey" className="block mb-1 text-sm text-cyan-200/80">Deepgram API Key</label>
          <input 
            type="password"
            id="deepgramApiKey"
            className="w-full p-2 rounded bg-black/40 text-white/90 border border-cyan-500/30"
            value={deepgramApiKey}
            onChange={e => {
              setDeepgramApiKey(e.target.value);
              setOption(STORAGE_KEYS.DEEPGRAM_API_KEY, e.target.value);
            }}
            placeholder="Enter your Deepgram API key"
          />
        </div>
        
        <div>
          <label htmlFor="deepgramModel" className="block mb-1 text-sm text-cyan-200/80">Deepgram Model</label>
          <select
            id="deepgramModel"
            className="w-full p-2 rounded bg-black/40 text-white/90 border border-cyan-500/30"
            value={deepgramModel}
            onChange={e => {
              console.log('Salvando modelo Deepgram:', e.target.value);
              setDeepgramModel(e.target.value);
              setOption(STORAGE_KEYS.DEEPGRAM_MODEL, e.target.value);
            }}
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
            
          {/* Seletor de idioma filtrado por compatibilidade com o modelo */}
          <select
            id="deepgramLanguage"
            className="w-full p-2 rounded bg-black/40 text-white/90 border border-cyan-500/30"
            value={deepgramLanguage}
            onChange={e => {
              const newValue = e.target.value;
              setDeepgramLanguage(newValue);
              setOption(STORAGE_KEYS.DEEPGRAM_LANGUAGE, newValue);
            }}
            title="Select Transcription Language"
          >
            {compatibleLanguages.map(langCode => (
              <option key={langCode} value={langCode}>
                {getLanguageDisplay(langCode)}
              </option>
            ))}
          </select>
          
          {/* Exibir informações de compatibilidade */}
          {compatibleLanguages.length === 1 && compatibleLanguages[0] === 'en' && (
            <p className="text-xs text-amber-400 mt-1">
              Este modelo suporta apenas inglês.
            </p>
          )}
          {compatibleLanguages.includes('multi') && (
            <p className="text-xs text-cyan-400/60 mt-1">
              Este modelo suporta detecção automática de idioma.
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

export default DeepgramSettings;
