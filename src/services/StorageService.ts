// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// StorageService.ts
// Storage service for Orch-Mind user settings (localStorage-based)
// Provides pure functions for saving and retrieving user config.

/**
 * STORAGE_KEYS: Mapeamento neural-simbólico das chaves de configuração
 *
 * Este objeto representa o "mapa sináptico" das configurações no sistema,
 * funcionando como uma única fonte de verdade para todas as chaves de armazenamento.
 *
 * Seguindo os princípios neural-simbólicos do Orch-Mind, cada chave representa um
 * "sinal" específico que flui através do sistema e deve manter consistência
 * semântica em todos os contextos.
 */
/**
 * STORAGE_KEYS: Mapeamento neural-simbólico das chaves de configuração
 *
 * Organizado por categorias semânticas para seguir o princípio neural-simbólico
 * do Orch-Mind de manter uma estrutura cognitiva clara e consistente.
 *
 * IMPORTANTE: Ao adicionar novas chaves, utilize a mesma string que é usada
 * nos componentes para evitar problemas de sincronização.
 */
export const STORAGE_KEYS = {
  // Chave principal para armazenamento de todas as configurações
  SETTINGS_ROOT: "orchos.user.settings",

  // ===== Configurações gerais do sistema =====
  USER_NAME: "userName",

  // ===== Configurações visuais/interface =====
  // Matriz quântica e efeitos
  ENABLE_MATRIX: "enableMatrix",
  QUANTUM_PROCESSING_ENABLED: "quantumProcessingEnabled",
  QUANTUM_VISUALIZATION_ENABLED: "quantumVisualizationEnabled",

  // Estilo e tema
  DARK_MODE: "darkMode",
  THEME: "theme",
  UI_DENSITY: "uiDensity",
  ENABLE_NEUMORPHISM: "enableNeumorphism",
  ENABLE_GLASSMORPHISM: "enableGlassmorphism",
  PANEL_TRANSPARENCY: "panelTransparency",
  COLOR_THEME: "colorTheme",
  SHOW_ADVANCED_SETTINGS: "showAdvancedSettings",

  // ===== Configurações de APIs e serviços externos =====
  // OpenAI/ChatGPT
  OPENAI_API_KEY: "openaiApiKey", // Mesmo que chatgptApiKey
  CHATGPT_MODEL: "chatgptModel",
  CHATGPT_TEMPERATURE: "chatgptTemperature",
  CHATGPT_MAX_TOKENS: "chatgptMaxTokens",
  OPENAI_EMBEDDING_MODEL: "openaiEmbeddingModel",

  // Ollama Settings
  OLLAMA_MODEL: "ollamaModel",
  OLLAMA_EMBEDDING_MODEL: "ollamaEmbeddingModel",
  OLLAMA_ENABLED: "ollamaEnabled",

  // Deepgram
  DEEPGRAM_API_KEY: "deepgramApiKey",
  DEEPGRAM_MODEL: "deepgramModel",
  DEEPGRAM_LANGUAGE: "deepgramLanguage",
  DEEPGRAM_TIER: "deepgramTier",

  // Pinecone
  PINECONE_API_KEY: "pineconeApiKey",
  PINECONE_ENVIRONMENT: "pineconeEnvironment",
  PINECONE_INDEX: "pineconeIndex",

  // ===== Configurações de banco de dados local =====
  DUCKDB_PATH: "duckdbPath", // Caminho personalizado para o banco DuckDB

  // ===== Configurações de ferramentas (tools) =====
  TOOLS_ENABLED: "toolsEnabled", // Habilita/desabilita ferramentas no modo básico
  WEB_SEARCH_ENABLED: "webSearchEnabled", // Habilita/desabilita busca na web

  // ===== Configurações de debugging =====
  DEBUG_MODE: "debugMode",
  LOG_LEVEL: "logLevel",
};

// Symbolic: All user options are stored as a map/object in the selected storage cortex.
export type UserSettings = Record<string, any>;

function isRenderer(): boolean {
  // Electron renderer or browser
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

/**
 * Cria e retorna um novo backend para armazenamento
 * IMPORTANTE: Não mais usa cache estático para evitar problemas com estados desatualizados
 * CORREÇÃO: Removido require() para compatibilidade com renderer process
 */
function getBackend() {
  // Identificar ambiente de execução
  const isInRenderer = isRenderer();

  // Para aplicações Electron, sempre usar localStorage no renderer
  // O electron-store será usado apenas no main process quando necessário
  if (isInRenderer || typeof window !== "undefined") {
    return {
      get: () => {
        try {
          const raw = window.localStorage.getItem(STORAGE_KEYS.SETTINGS_ROOT);

          if (!raw) {
            return {};
          }

          const parsedData = JSON.parse(raw) as UserSettings;

          // Extrair informações importantes para logs
          const userName =
            parsedData[STORAGE_KEYS.USER_NAME] || parsedData["name"] || "N/A";
          const lang = parsedData[STORAGE_KEYS.DEEPGRAM_LANGUAGE] || "N/A";
          const model = parsedData[STORAGE_KEYS.DEEPGRAM_MODEL] || "N/A";

          return parsedData;
        } catch (error) {
          console.error("❌ [STORAGE] Erro ao ler localStorage:", error);
          return {};
        }
      },
      set: (data: UserSettings) => {
        try {
          const jsonString = JSON.stringify(data);
          window.localStorage.setItem(STORAGE_KEYS.SETTINGS_ROOT, jsonString);

          // Verificar se os dados foram realmente salvos
          const verification = window.localStorage.getItem(
            STORAGE_KEYS.SETTINGS_ROOT
          );
          if (!verification) {
            console.error(
              "❌ [STORAGE] Falha na verificação: dados não foram salvos no localStorage"
            );
          }

          // Se estamos em um ambiente Electron, também sincronizar com o main process via IPC
          if (typeof window !== "undefined" && (window as any).electronAPI?.storage?.setUserSettings) {
            try {
              (window as any).electronAPI.storage.setUserSettings(data);
            } catch (error) {
              console.debug("📝 [STORAGE] IPC sync failed (expected in development):", error);
            }
          }
        } catch (error) {
          console.error("❌ [STORAGE] Erro ao salvar no localStorage:", error);
        }
      },
    };
  } else {
    // Node.js environment: use in-memory fallback for main process
    // The main process should use electron-store directly, not this service
    console.warn("⚠️ [STORAGE] Using memory fallback in Node.js environment");
    let memoryStore = {};
    return {
      get: () => memoryStore,
      set: (data: UserSettings) => {
        memoryStore = data;
      },
    };
  }
}

/**
 * Saves all user settings (the entire map) to storage cortex.
 */
export function setAllOptions(options: UserSettings): void {
  getBackend().set(options);
}

/**
 * Retrieves all user settings (the entire map) from storage cortex.
 */
export function getAllOptions(): UserSettings {
  return getBackend().get();
}

// Sistema de eventos para notificar sobre mudanças no storage
type StorageChangeListener = (key: string, value: any) => void;
const storageChangeListeners: StorageChangeListener[] = [];

/**
 * Registra um listener para ser notificado quando uma opção específica mudar
 * @param listener Função que será chamada quando a opção mudar
 */
export function subscribeToStorageChanges(
  listener: StorageChangeListener
): () => void {
  storageChangeListeners.push(listener);

  // Retorna uma função para cancelar a inscrição
  return () => {
    const index = storageChangeListeners.indexOf(listener);
    if (index > -1) {
      storageChangeListeners.splice(index, 1);
    }
  };
}

/**
 * Sets a single option by key.
 */
export function setOption<T = any>(key: string, value: T): void {
  const options = getAllOptions();
  options[key] = value;
  setAllOptions(options);

  // Notifica os listeners
  storageChangeListeners.forEach((listener) => {
    try {
      listener(key, value);
    } catch (err) {
      console.error(`Error in storage change listener for ${key}:`, err);
    }
  });
}

/**
 * Gets a single option by key, or undefined if not set.
 */
export function getOption<T = any>(key: string): T | undefined {
  const options = getAllOptions();
  return options[key];
}

// Symbolic helpers for common options

export function getUserName(): string {
  // Função direta: apenas busca o valor usando a chave padrão
  return getOption<string>(STORAGE_KEYS.USER_NAME) || "User";
}

export function setUserName(name: string): void {
  // Usa a chave padronizada para salvar o nome do usuário
  setOption(STORAGE_KEYS.USER_NAME, name);
}

/**
 * Função utilitária para resetar completamente o storage do Orch-Mind
 * Útil para testes ou quando há inconsistências nas configurações
 */
export function resetStorage(): void {
  const backend = getBackend();
  backend.set({});

  // Recarregar automaticamente a página se em ambiente de navegador
  if (typeof window !== "undefined") {
    window.location.reload();
  }
}

/**
 * Limpa chaves antigas e desatualizadas do armazenamento
 * Mantém apenas as chaves definidas no objeto STORAGE_KEYS
 */
export function cleanupStorage(): void {
  // Obter todas as opções atuais
  const options = getAllOptions();
  const currentSettings = { ...options };

  // Criar um conjunto com todos os valores (não chaves) de STORAGE_KEYS
  const validValues = new Set<string>();
  Object.values(STORAGE_KEYS).forEach((value) => {
    validValues.add(value as string);
  });

  // Identificar e remover chaves desatualizadas
  let removedCount = 0;
  for (const key in currentSettings) {
    // Pular a chave principal de configurações
    if (key === STORAGE_KEYS.SETTINGS_ROOT) continue;

    // Se a chave não estiver nos valores válidos, removê-la
    if (!validValues.has(key)) {
      delete currentSettings[key];
      removedCount++;
    }
  }

  // Salvar configurações limpas
  setAllOptions(currentSettings);
  console.log(
    `🧠 [STORAGE] Limpeza neural-simbólica concluída: ${removedCount} chaves antigas removidas`
  );
}
