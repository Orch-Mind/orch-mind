// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Hook para gerenciar compatibilidade entre modelos Deepgram e idiomas
 * Aplica princípios de Responsabilidade Única e extrai lógica de negócio do componente
 * Otimizado para evitar cálculos repetidos e logs excessivos
 */
export const useDeepgramLanguageCompatibility = () => {
  // Cache de resultados para evitar recálculos desnecessários
  const modelLanguageCache = new Map<string, string[]>();
  // Dicionário de idiomas disponíveis por família de modelo
  const modelLanguageCompatibility: { [key: string]: string[] } = {
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
      'pt', 'pt-BR', 'pt-PT',
      'es', 'es-419', 'fr', 'de', 'it', 'ja'
    ],
    'nova-2-phonecall': [
      'multi', 
      'en', 'en-US', 'en-GB', 'en-AU', 'en-IN', 'en-NZ',
      'pt', 'pt-BR', 'pt-PT',
      'es', 'es-419', 'fr', 'de', 'it', 'ja'
    ],
    'nova-2-video': [
      'multi', 
      'en', 'en-US', 'en-GB', 'en-AU', 'en-IN', 'en-NZ',
      'pt', 'pt-BR', 'pt-PT',
      'es', 'es-419', 'fr', 'de', 'it', 'ja'
    ],
    
    // Nova modelos padrão
    'nova': ['en', 'en-US', 'en-GB', 'en-AU', 'en-IN', 'en-NZ', 'pt', 'pt-BR', 'es', 'fr', 'de', 'it', 'ja', 'ko', 'nl', 'pl', 'ru'],
    'nova-phonecall': ['en', 'en-US', 'en-GB', 'pt', 'pt-BR', 'es', 'fr', 'de', 'it', 'ja'],
    
    // Enhanced models
    'enhanced': ['en', 'en-US', 'en-GB', 'en-AU', 'pt', 'pt-BR', 'es', 'es-419', 'fr', 'de', 'it', 'ja', 'hi', 'nl', 'id', 'zh-CN', 'ko', 'ru'],
    'enhanced-meeting': ['en', 'en-US', 'en-GB', 'pt', 'pt-BR', 'es', 'fr', 'de', 'it', 'ja'],
    'enhanced-phonecall': ['en', 'en-US', 'en-GB', 'pt', 'pt-BR', 'es', 'fr', 'de', 'it', 'ja', 'ko'],
    'enhanced-finance': ['en', 'en-US', 'en-GB'],
    
    // Base models
    'base': ['en', 'en-US', 'en-GB', 'pt', 'pt-BR', 'es', 'fr', 'de', 'it', 'ja', 'hi', 'nl', 'id', 'zh-CN', 'ko'],
    'base-meeting': ['en', 'en-US', 'en-GB', 'pt', 'pt-BR', 'es', 'fr', 'de', 'it', 'ja'],
    'base-phonecall': ['en', 'en-US', 'en-GB', 'pt', 'pt-BR', 'es', 'fr', 'de', 'it', 'ja', 'ko'],
    'base-finance': ['en', 'en-US', 'en-GB']
  };

  // Definições de idiomas para exibição
  const languageDisplay: { [key: string]: string } = {
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

  /**
   * Retorna os idiomas compatíveis para um determinado modelo
   * Com tratamento robusto para variações na forma como o modelo está salvo
   * Otimizado com cache e logs reduzidos
   */
  const getCompatibleLanguages = (model: string): string[] => {
    // Tratamento para casos undefined/null
    if (!model) {
      return ['en', 'en-US'];
    }
    
    // Verificar cache primeiro
    if (modelLanguageCache.has(model)) {
      return modelLanguageCache.get(model)!;
    }
    
    // Criar cópia normalizada para consulta (lowercase)
    const normalizedModel = model.toLowerCase();
    
    // Estratégia de resolução:
    let result: string[];
    
    // 1. Tentar encontrar o modelo exato ou normalizado
    if (modelLanguageCompatibility[model]) {
      result = modelLanguageCompatibility[model];
    } else {
      // 2. Tentar encontrar o modelo normalizado (case insensitive)
      const exactMatchKey = Object.keys(modelLanguageCompatibility).find(
        key => key.toLowerCase() === normalizedModel
      );
      
      if (exactMatchKey) {
        result = modelLanguageCompatibility[exactMatchKey];
      } else {
        // 3. Tentar extrair família do modelo (ex: 'nova-2-meeting' -> 'nova-2')
        const modelFamily = model.split('-').slice(0, 2).join('-');
        
        if (modelLanguageCompatibility[modelFamily]) {
          result = modelLanguageCompatibility[modelFamily];
        } else {
          // 4. Tentar obter o modelo base (ex: 'nova-2-meeting' -> 'nova')
          const modelPrefix = model.split('-')[0];
          
          if (modelLanguageCompatibility[modelPrefix]) {
            result = modelLanguageCompatibility[modelPrefix];
          } else {
            // 5. Fallback para inglês (sempre disponível)
            console.warn(`⚠️ [Deepgram] Modelo não reconhecido: '${model}', usando fallback para inglês`);
            result = ['en', 'en-US'];
          }
        }
      }
    }
    
    // Salvar no cache
    modelLanguageCache.set(model, result);
    return result;
  };

  /**
   * Retorna o nome de exibição para um código de idioma
   */
  const getLanguageDisplay = (code: string): string => {
    return languageDisplay[code] || code;
  };

  return {
    getCompatibleLanguages,
    getLanguageDisplay,
    languageDisplay,
    modelLanguageCompatibility
  };
};

export default useDeepgramLanguageCompatibility;
