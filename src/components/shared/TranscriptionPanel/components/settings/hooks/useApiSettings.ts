// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useState, useEffect } from "react";
import { getOption, setOption, STORAGE_KEYS, subscribeToStorageChanges } from '../../../../../../services/StorageService';
import { SUPPORTED_HF_EMBEDDING_MODELS } from '../../../../../../services/huggingface/HuggingFaceEmbeddingService';

/**
 * Hook para gerenciamento de configurações de APIs externas
 * Neurônio de infraestrutura responsável pelas credenciais e parâmetros de serviços
 */
export const useApiSettings = () => {
  // OpenAI/ChatGPT
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
  
  // Pinecone
  const [pineconeApiKey, setPineconeApiKey] = useState<string>(() => getOption<string>(STORAGE_KEYS.PINECONE_API_KEY) || '');
  const [pineconeEnvironment, setPineconeEnvironment] = useState<string>(() => getOption<string>(STORAGE_KEYS.PINECONE_ENVIRONMENT) || '');
  const [pineconeIndex, setPineconeIndex] = useState<string>(() => getOption<string>(STORAGE_KEYS.PINECONE_INDEX) || '');
  
  // Sincroniza mudanças do storage para o estado local
  useEffect(() => {
    const handleStorageChange = (key: string, value: any) => {
      switch(key) {
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
        case STORAGE_KEYS.DEEPGRAM_LANGUAGE: setDeepgramLanguage(value); break;
        case STORAGE_KEYS.DEEPGRAM_TIER: setDeepgramTier(value); break;
        
        // Pinecone
        case STORAGE_KEYS.PINECONE_API_KEY: setPineconeApiKey(value); break;
        case STORAGE_KEYS.PINECONE_ENVIRONMENT: setPineconeEnvironment(value); break;
        case STORAGE_KEYS.PINECONE_INDEX: setPineconeIndex(value); break;
      }
    };
    
    const unsubscribe = subscribeToStorageChanges(handleStorageChange);
    return () => unsubscribe();
  }, []);
  
  // Salva as configurações de API no storage
  const saveApiSettings = () => {
    // OpenAI/ChatGPT
    setOption(STORAGE_KEYS.OPENAI_API_KEY, chatgptApiKey);
    setOption(STORAGE_KEYS.CHATGPT_MODEL, chatgptModel);
    setOption(STORAGE_KEYS.CHATGPT_TEMPERATURE, chatgptTemperature);
    setOption(STORAGE_KEYS.CHATGPT_MAX_TOKENS, chatgptMaxTokens);
    setOption(STORAGE_KEYS.OPENAI_EMBEDDING_MODEL, openaiEmbeddingModel);
    
    // HuggingFace
    setOption(STORAGE_KEYS.HF_MODEL, hfModel);
    setOption(STORAGE_KEYS.HF_EMBEDDING_MODEL, hfEmbeddingModel);
    
    // Deepgram
    setOption(STORAGE_KEYS.DEEPGRAM_API_KEY, deepgramApiKey);
    setOption(STORAGE_KEYS.DEEPGRAM_MODEL, deepgramModel);
    setOption(STORAGE_KEYS.DEEPGRAM_LANGUAGE, deepgramLanguage);
    setOption(STORAGE_KEYS.DEEPGRAM_TIER, deepgramTier);
    
    // Pinecone
    setOption(STORAGE_KEYS.PINECONE_API_KEY, pineconeApiKey);
    setOption(STORAGE_KEYS.PINECONE_ENVIRONMENT, pineconeEnvironment);
    setOption(STORAGE_KEYS.PINECONE_INDEX, pineconeIndex);
  };
  
  return {
    // OpenAI/ChatGPT
    chatgptApiKey,
    setChatgptApiKey,
    chatgptModel,
    setChatgptModel,
    chatgptTemperature,
    setChatgptTemperature,
    chatgptMaxTokens,
    setChatgptMaxTokens,
    openaiEmbeddingModel,
    setOpenaiEmbeddingModel,
    
    // HuggingFace
    hfModel,
    setHfModel,
    hfEmbeddingModel,
    setHfEmbeddingModel,
    
    // Deepgram
    deepgramApiKey,
    setDeepgramApiKey,
    deepgramModel,
    setDeepgramModel,
    deepgramLanguage,
    setDeepgramLanguage,
    deepgramTier,
    setDeepgramTier,
    
    // Pinecone
    pineconeApiKey,
    setPineconeApiKey,
    pineconeEnvironment,
    setPineconeEnvironment,
    pineconeIndex,
    setPineconeIndex,
    
    // Ações
    saveApiSettings
  };
};
