// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  setOption,
  STORAGE_KEYS,
} from "../../../../../../services/StorageService";
import { useDeepgramLanguageCompatibility } from "./hooks/useDeepgramLanguageCompatibility";
import { DeepgramSettingsProps } from "./types";

/**
 * Componente para configuração da integração com Deepgram
 * Implementa princípio de Responsabilidade Única (SRP) do SOLID
 * Extrai lógica de compatibilidade para um hook customizado
 *
 * DEBUG: Adicionados logs temporários para diagnóstico de persistência
 */
const DeepgramSettings: React.FC<DeepgramSettingsProps> = React.memo(
  ({
    deepgramApiKey,
    setDeepgramApiKey,
    deepgramModel,
    setDeepgramModel,
    deepgramLanguage,
    setDeepgramLanguage,
  }) => {
    const { t } = useTranslation();
    // Hook para gerenciar compatibilidade entre modelo e idioma
    const { getCompatibleLanguages, getLanguageDisplay } =
      useDeepgramLanguageCompatibility();
    const compatibleLanguages = getCompatibleLanguages(deepgramModel);

    // Efeito para verificar e ajustar idioma quando o modelo muda
    useEffect(() => {
      // Só ajuste se realmente necessário
      const isCurrentLanguageCompatible =
        compatibleLanguages.includes(deepgramLanguage);
      const fallbackLanguage = compatibleLanguages[0];

      if (
        !isCurrentLanguageCompatible &&
        fallbackLanguage &&
        deepgramLanguage !== fallbackLanguage
      ) {
        console.log(
          `🌐 ${t('api.deepgram.warnings.languageNotSupported')}`
        );
        setDeepgramLanguage(fallbackLanguage);
      }
      // Se já está compatível ou já é o fallback, não faz nada!
    }, [
      deepgramModel,
      deepgramLanguage,
      compatibleLanguages,
      setDeepgramLanguage,
    ]);

    // Move os logs para um useEffect para evitar logs em cada render
    useEffect(() => {
      console.log("[DeepgramSettings] deepgramModel alterado:", deepgramModel);
    }, [deepgramModel]);

    useEffect(() => {
      console.log(
        "[DeepgramSettings] deepgramLanguage alterado:",
        deepgramLanguage
      );
    }, [deepgramLanguage]);

    return (
      <div className="p-3 rounded-md bg-black/20 mb-3 animate-fade-in">
        <h3 className="text-lg text-cyan-300 mb-2">
          {t('api.deepgram.title')}
        </h3>
        <div className="space-y-3">
          <div>
            <label
              htmlFor="deepgramApiKey"
              className="block text-sm text-cyan-200/70 mb-1"
            >
              {t('api.deepgram.apiKey')}
            </label>
            <input
              type="password"
              id="deepgramApiKey"
              className="w-full p-2 rounded bg-black/40 text-white/90 border border-cyan-500/30"
              value={deepgramApiKey}
              onChange={(e) => {
                setDeepgramApiKey(e.target.value);
                setOption(STORAGE_KEYS.DEEPGRAM_API_KEY, e.target.value);
              }}
              placeholder={t('api.deepgram.apiKeyPlaceholder')}
            />
          </div>

          <div>
            <label
              htmlFor="deepgramModel"
              className="block text-sm text-cyan-200/70 mb-1"
            >
              {t('api.deepgram.model')}
            </label>
            <select
              id="deepgramModel"
              className="w-full p-2 rounded bg-black/40 text-white/90 border border-cyan-500/30"
              value={deepgramModel}
              onChange={(e) => {
                console.log("Salvando modelo Deepgram:", e.target.value);
                setDeepgramModel(e.target.value);
                setOption(STORAGE_KEYS.DEEPGRAM_MODEL, e.target.value);
              }}
              title={t('api.deepgram.selectModel')}
            >
              {/* Nova-3 - Latest and most advanced */}
              <optgroup label={t('api.deepgram.models.nova3')}>
                <option value="nova-3">{t('api.deepgram.models.nova3General')}</option>
                <option value="nova-3-medical">{t('api.deepgram.models.nova3Medical')}</option>
              </optgroup>

              {/* Nova-2 - Second generation */}
              <optgroup label={t('api.deepgram.models.nova2')}>
                <option value="nova-2">{t('api.deepgram.models.nova2General')}</option>
                <option value="nova-2-meeting">{t('api.deepgram.models.nova2Meeting')}</option>
                <option value="nova-2-phonecall">{t('api.deepgram.models.nova2Phonecall')}</option>
                <option value="nova-2-video">{t('api.deepgram.models.nova2Video')}</option>
              </optgroup>

              {/* Nova - First generation */}
              <optgroup label={t('api.deepgram.models.nova')}>
                <option value="nova">{t('api.deepgram.models.novaGeneral')}</option>
                <option value="nova-phonecall">{t('api.deepgram.models.novaPhonecall')}</option>
              </optgroup>

              {/* Enhanced - Legacy models */}
              <optgroup label={t('api.deepgram.models.enhanced')}>
                <option value="enhanced">{t('api.deepgram.models.enhancedGeneral')}</option>
                <option value="enhanced-meeting">{t('api.deepgram.models.enhancedMeeting')}</option>
                <option value="enhanced-phonecall">{t('api.deepgram.models.enhancedPhonecall')}</option>
                <option value="enhanced-finance">{t('api.deepgram.models.enhancedFinance')}</option>
              </optgroup>

              {/* Base - Basic models */}
              <optgroup label={t('api.deepgram.models.base')}>
                <option value="base">{t('api.deepgram.models.baseGeneral')}</option>
                <option value="base-meeting">{t('api.deepgram.models.baseMeeting')}</option>
                <option value="base-phonecall">{t('api.deepgram.models.basePhonecall')}</option>
                <option value="base-finance">{t('api.deepgram.models.baseFinance')}</option>
              </optgroup>
            </select>
          </div>

          {/* Compatibilidade modelo-idioma */}
          <div>
            <label
              htmlFor="deepgramLanguage"
              className="block text-sm text-cyan-200/70 mb-1"
            >
              {t('api.deepgram.language')}
            </label>

            {/* Seletor de idioma filtrado por compatibilidade com o modelo */}
            <select
              id="deepgramLanguage"
              className="w-full p-2 rounded bg-black/40 text-white/90 border border-cyan-500/30"
              value={deepgramLanguage}
              onChange={(e) => {
                const newValue = e.target.value;
                setDeepgramLanguage(newValue);
                setOption(STORAGE_KEYS.DEEPGRAM_LANGUAGE, newValue);
              }}
              title={t('api.deepgram.selectLanguage')}
            >
              {compatibleLanguages.map((langCode) => (
                <option key={langCode} value={langCode}>
                  {getLanguageDisplay(langCode)}
                </option>
              ))}
            </select>

            {/* Exibir informações de compatibilidade */}
            {compatibleLanguages.length === 1 &&
              compatibleLanguages[0] === "en" && (
                <p className="text-xs text-amber-400 mt-1">
                  {t('api.deepgram.warnings.languageNotSupported')}
                </p>
              )}
            {compatibleLanguages.includes("multi") && (
              <p className="text-xs text-cyan-400/60 mt-1">
                {t('api.deepgram.warnings.multilingualSupport')}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }
);

export default DeepgramSettings;
