// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { memo, useCallback, useEffect } from "react";
import { OrchOSModeEnum } from "../../../../../services/ModeService";
import {
  setOption,
  STORAGE_KEYS,
} from "../../../../../services/StorageService";

import {
  ApiNavigation,
  BasicModeSettings,
  ChatGPTSettings,
  DeepgramSettings,
  PineconeSettings,
} from "./api";
import { ApiSettingsProps } from "./api/types";

/**
 * Componente orquestrador para configurações de APIs externas
 * Refatorado seguindo princípios SOLID:
 * - Single Responsibility Principle: cada subcomponente tem responsabilidade única
 * - Open/Closed Principle: aberto para extensão, fechado para modificação
 * - Liskov Substitution: interfaces consistentes entre componentes
 * - Interface Segregation: interfaces específicas para cada tipo de configuração
 * - Dependency Inversion: depende de abstrações, não implementações concretas
 */
const ApiSettings: React.FC<ApiSettingsProps> = memo(
  ({
    applicationMode,
    setApplicationMode,
    pineconeApiKey,
    setPineconeApiKey,
    chatgptApiKey,
    setChatgptApiKey,
    chatgptModel,
    setChatgptModel,
    openaiEmbeddingModel,
    setOpenaiEmbeddingModel,
    hfModel,
    setHfModel,
    hfEmbeddingModel,
    setHfEmbeddingModel,
    deepgramApiKey,
    setDeepgramApiKey,
    deepgramModel,
    setDeepgramModel,
    deepgramLanguage,
    setDeepgramLanguage,
    openSection,
    setOpenSection,
  }) => {
    // Memoized setters for Deepgram (hooks devem ficar sempre no topo)
    const memoizedSetDeepgramModel = useCallback(
      (value: string) => {
        if (value !== deepgramModel) {
          setDeepgramModel(value);
          setOption(STORAGE_KEYS.DEEPGRAM_MODEL, value);
        }
      },
      [deepgramModel, setDeepgramModel]
    );

    const memoizedSetDeepgramLanguage = useCallback(
      (value: string) => {
        if (value !== deepgramLanguage) {
          setDeepgramLanguage(value);
          setOption(STORAGE_KEYS.DEEPGRAM_LANGUAGE, value);
        }
      },
      [deepgramLanguage, setDeepgramLanguage]
    );

    // AI model options for HuggingFace
    const HF_MODELS = [
      {
        id: "onnx-community/Llama-3.2-3B-Instruct-onnx-web",
        label: "Llama 3.2 3B Instruct (ONNX, recommended for web)",
      },
      {
        id: "onnx-community/Qwen3-1.7B-ONNX",
        label: "Qwen3 1.7B (ONNX, lightweight)",
      },
      {
        id: "onnx-community/DeepSeek-R1-Distill-Qwen-1.5B-ONNX",
        label: "DeepSeek R1 Distill Qwen 1.5B (ONNX, fast)",
      },
      {
        id: "onnx-community/Phi-3.5-mini-instruct-onnx-web",
        label: "Phi-3.5 Mini Instruct (ONNX, web optimized)",
      },
      {
        id: "onnx-community/gemma-3-1b-it-ONNX",
        label: "Gemma 3 1B Instruct (ONNX, efficient)",
      },
    ];

    // Efeito para limpar a seção aberta ao trocar de modo
    useEffect(() => {
      // Reset the open section when switching modes to avoid showing wrong sections
      setOpenSection(null);
    }, [applicationMode, setOpenSection]);

    // Handler para atualização do modelo HuggingFace
    const handleHfModelChange = (value: string) => {
      setHfModel(value);
      setOption(STORAGE_KEYS.HF_MODEL, value);
    };

    // Handler para atualização do modelo de embedding HuggingFace
    const handleHfEmbeddingModelChange = (value: string) => {
      setHfEmbeddingModel(value);
      setOption(STORAGE_KEYS.HF_EMBEDDING_MODEL, value);
    };

    // Modo Advanced - APIs completas
    // Move os logs para um useEffect para evitar logs em cada render
    useEffect(() => {
      // Apenas logar no modo advanced
      if (applicationMode === OrchOSModeEnum.ADVANCED) {
        console.log("[ApiSettings] deepgramModel alterado:", deepgramModel);
      }
    }, [deepgramModel, applicationMode]);

    useEffect(() => {
      // Apenas logar no modo advanced
      if (applicationMode === OrchOSModeEnum.ADVANCED) {
        console.log(
          "[ApiSettings] deepgramLanguage alterado:",
          deepgramLanguage
        );
      }
    }, [deepgramLanguage, applicationMode]);

    // Renderização condicional baseada no modo da aplicação
    // Symbolic: Use enum for mode-dependent logic
    if (applicationMode === OrchOSModeEnum.BASIC) {
      return (
        <BasicModeSettings
          applicationMode={applicationMode}
          setApplicationMode={setApplicationMode}
          hfModel={hfModel}
          setHfModel={handleHfModelChange}
          hfEmbeddingModel={hfEmbeddingModel}
          setHfEmbeddingModel={handleHfEmbeddingModelChange}
          hfModelOptions={HF_MODELS}
          hfEmbeddingModelOptions={HF_MODELS.map((model) => model.id)}
        />
      );
    }

    return (
      <div className="flex flex-col w-full">
        {/* Sub-abas de navegação para os serviços de API */}
        <ApiNavigation
          openSection={openSection}
          setOpenSection={setOpenSection}
        />

        {/* Seção Pinecone */}
        {openSection === "pinecone" && (
          <PineconeSettings
            pineconeApiKey={pineconeApiKey}
            setPineconeApiKey={(value) => {
              setPineconeApiKey(value);
              setOption(STORAGE_KEYS.PINECONE_API_KEY, value);
            }}
          />
        )}

        {/* Seção ChatGPT */}
        {openSection === "chatgpt" && (
          <ChatGPTSettings
            applicationMode={applicationMode}
            chatgptApiKey={chatgptApiKey}
            setChatgptApiKey={(value) => {
              setChatgptApiKey(value);
              setOption(STORAGE_KEYS.OPENAI_API_KEY, value);
            }}
            chatgptModel={chatgptModel}
            setChatgptModel={(value) => {
              setChatgptModel(value);
              setOption(STORAGE_KEYS.CHATGPT_MODEL, value);
            }}
            openaiEmbeddingModel={openaiEmbeddingModel}
            setOpenaiEmbeddingModel={(value) => {
              setOpenaiEmbeddingModel(value);
              setOption(STORAGE_KEYS.OPENAI_EMBEDDING_MODEL, value);
            }}
          />
        )}

        {/* Seção Deepgram */}
        {openSection === "deepgram" && (
          <DeepgramSettings
            deepgramApiKey={deepgramApiKey}
            setDeepgramApiKey={(value) => {
              setDeepgramApiKey(value);
              setOption(STORAGE_KEYS.DEEPGRAM_API_KEY, value);
            }}
            deepgramModel={deepgramModel}
            setDeepgramModel={memoizedSetDeepgramModel}
            deepgramLanguage={deepgramLanguage}
            setDeepgramLanguage={memoizedSetDeepgramLanguage}
          />
        )}

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30 rounded-lg px-6 py-2 hover:from-cyan-500/30 hover:to-blue-500/30 transition-all shadow-[0_0_10px_rgba(0,200,255,0.2)] backdrop-blur-sm"
            onClick={() => setApplicationMode(OrchOSModeEnum.BASIC)}
          >
            Switch to Basic Mode
          </button>
        </div>
      </div>
    );
  }
);

export default ApiSettings;
