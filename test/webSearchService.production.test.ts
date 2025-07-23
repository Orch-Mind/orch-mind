/**
 * Production Behavior Test for WebSearchService
 * This test simulates REAL production environment to identify why
 * the app returns generic responses instead of specific pricing
 */

import { WebSearchService } from '../src/components/context/deepgram/services/web/WebSearchService';
import { SimplePromptProcessor } from '../src/components/context/deepgram/services/transcription/SimplePromptProcessor';
import { getOption, setOption, STORAGE_KEYS } from '../src/services/StorageService';

// Mock minimal dependencies but keep core logic
jest.mock('../src/services/StorageService', () => ({
  getOption: jest.fn(),
  setOption: jest.fn(),
  STORAGE_KEYS: {
    WEB_SEARCH_ENABLED: 'webSearchEnabled',
    OLLAMA_MODEL: 'ollamaModel',
  }
}));

jest.mock('../src/components/context/deepgram/utils/LoggingUtils', () => ({
  LoggingUtils: {
    logInfo: (msg: string) => console.log(`ℹ️ ${msg}`),
    logWarning: (msg: string) => console.log(`⚠️ ${msg}`),
    logError: (msg: string) => console.log(`❌ ${msg}`),
  }
}));

describe('WebSearchService Production Behavior Test', () => {
  let webSearchService: WebSearchService;
  let processor: SimplePromptProcessor;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Enable web search (simulating production setting)
    (getOption as jest.Mock).mockImplementation((key: string) => {
      if (key === STORAGE_KEYS.WEB_SEARCH_ENABLED) return true;
      if (key === STORAGE_KEYS.OLLAMA_MODEL) return 'llama3.2:latest';
      return false;
    });

    // PROPERLY Mock window.electronAPI for web search to simulate production
    Object.defineProperty(global, 'window', {
      value: {
        electronAPI: {
          webSearch: jest.fn().mockResolvedValue([
            {
              title: 'PlayStation 5 Slim - Sony Store Brasil',
              url: 'https://store.sony.com.br/playstation5-slim',
              snippet: 'PlayStation 5 Slim por R$ 3.899,00 à vista ou parcelado em até 10x sem juros',
              source: 'store.sony.com.br',
              content: 'O PlayStation 5 Slim está disponível por R$ 3.899,00 na Sony Store. Especificações: SSD ultra-rápido, ray tracing, 4K gaming até 120fps. Disponível em estoque para entrega imediata.'
            },
            {
              title: 'PS5 Slim Preço - Magazine Luiza',
              url: 'https://magazineluiza.com.br/ps5-slim',
              snippet: 'Console PlayStation 5 Slim com desconto especial por R$ 3.699,00',
              source: 'magazineluiza.com.br',
              content: 'PlayStation 5 Slim com 825GB SSD. Preço promocional R$ 3.699,00 parcelado em 12x sem juros no cartão Magazine Luiza. Promoção limitada.'
            },
            {
              title: 'PlayStation 5 Slim - Amazon Brasil',
              url: 'https://amazon.com.br/ps5-slim',
              snippet: 'PS5 Slim na Amazon por R$ 3.799,00 com frete grátis para todo Brasil',
              source: 'amazon.com.br',
              content: 'Console PlayStation 5 Slim disponível na Amazon por R$ 3.799,00. Frete grátis Prime. Produto genuíno Sony com garantia nacional.'
            }
          ])
        }
      },
      writable: true
    });

    // Mock the LLM service with behavior that matches REAL production issues
    const mockLLMService = {
      callOpenAIWithFunctions: jest.fn().mockImplementation(async (options: any) => {
        const prompt = options.messages[1]?.content || '';
        
        console.log('🧠 [PRODUCTION_TEST] LLM callOpenAI prompt:', prompt.substring(0, 200) + '...');
        
        // Test different scenarios
        if (prompt.includes('CONSULTA DO USUÁRIO')) {
          // This is the processSearchResults call - simulate real LLM extracting data
          const webData = prompt.match(/RESULTADOS DA BUSCA WEB:\s*([\s\S]*?)\s*TAREFA:/m);
          if (webData && webData[1]) {
            const results = webData[1];
            console.log('📊 [PRODUCTION_TEST] LLM processing web data:', results.substring(0, 300) + '...');
            
            // Extract prices from the web results
            const priceMatches = results.match(/R\$[\s]*[\d.,]+/g) || [];
            console.log('💰 [PRODUCTION_TEST] Prices found:', priceMatches);
            
            if (priceMatches.length > 0) {
              return {
                choices: [{
                  message: {
                    content: `## Preços do PlayStation 5 Slim

Encontrei os seguintes preços para o PS5 Slim:

**💰 Preços Disponíveis:**
- Sony Store: ${priceMatches[0] || 'R$ 3.899,00'}
- Magazine Luiza: ${priceMatches[1] || 'R$ 3.699,00'}
- Amazon: ${priceMatches[2] || 'R$ 3.799,00'}

**💡 Melhor Opção:**
O menor preço encontrado é na Magazine Luiza por ${priceMatches[1] || 'R$ 3.699,00'}.

*Dados extraídos da pesquisa web realizada agora*`
                  }
                }]
              };
            }
          }
          
          // Fallback if no web data processed correctly
          return {
            choices: [{
              message: {
                content: "## Resultado da Busca\n\nInformações sobre preços encontradas, mas não foi possível extrair valores específicos dos resultados da web."
              }
            }]
          };
        }

        // For search strategy generation  
        return {
          choices: [{
            message: {
              content: JSON.stringify({
                searchQueries: ['PS5 Slim preço Brasil 2025', 'PlayStation 5 Slim valor loja'],
                resultsCount: 5,
                reasoning: 'Buscar preços atuais do PS5 Slim no mercado brasileiro'
              })
            }
          }]
        };
      }),
      
      streamOpenAIResponse: jest.fn().mockImplementation(async (messages: any[], temperature: number, onChunk: any) => {
        const userPrompt = messages[messages.length - 1]?.content || '';
        console.log('🎯 [PRODUCTION_TEST] Final streamOpenAI call with user prompt:', userPrompt.substring(0, 100) + '...');
        console.log('🎯 [PRODUCTION_TEST] Total messages:', messages.length);
        
        // Check if web context is present
        const hasWebContext = messages.some((msg: any) => 
          msg.content && msg.content.includes('WEB SEARCH CONTEXT')
        );
        
        console.log('🔍 [PRODUCTION_TEST] Web context present:', hasWebContext);
        
        if (hasWebContext) {
          // Extract web context
          const webContextMsg = messages.find((msg: any) => 
            msg.content && msg.content.includes('WEB SEARCH CONTEXT')
          );
          console.log('📄 [PRODUCTION_TEST] Web context preview:', webContextMsg?.content.substring(0, 300) + '...');
          
          // If web context exists, extract pricing and return specific answer
          const webContent = webContextMsg?.content || '';
          const priceMatches = webContent.match(/R\$[\s]*[\d.,]+/g) || [];
          
          if (priceMatches.length > 0) {
            const response = `Encontrei os preços do PS5 Slim:\n\n💰 Sony Store: ${priceMatches[0]}\n💰 Magazine Luiza: ${priceMatches[1] || 'R$ 3.699,00'}\n💰 Amazon: ${priceMatches[2] || 'R$ 3.799,00'}\n\n🎯 Melhor preço: ${priceMatches[1] || priceMatches[0]} na Magazine Luiza`;
            
            // Simulate streaming
            for (const char of response) {
              if (onChunk) onChunk(char);
            }
            
            return response;
          }
        }
        
        // This is the PROBLEMATIC behavior happening in production
        // When web context is missing or not processed, LLM gives generic response
        const response = "Ok, procurando o valor do PS5 Slim para você! 😊";
        
        console.log('❌ [PRODUCTION_ISSUE] Returning generic response - web context not processed correctly');
        
        // Simulate streaming chunks
        for (const char of response) {
          if (onChunk) onChunk(char);
        }
        
        return response;
      })
    };

    // Create services with mocked dependencies
    webSearchService = new WebSearchService(mockLLMService as any, undefined);
    
    // Mock SimplePromptProcessor's memory service
    const mockMemoryService = {
      queryExpandedMemory: jest.fn().mockResolvedValue(''),
      getConversationHistory: jest.fn().mockReturnValue([]),
      saveConversation: jest.fn().mockResolvedValue(undefined)
    };

    // Mock UI service
    const mockUIService = {
      notifyWebSearchStep: jest.fn(),
      showProcessingStatus: jest.fn()
    };

    processor = new SimplePromptProcessor(
      mockLLMService as any,
      mockMemoryService as any,
      mockUIService as any,
      null as any,
      null as any
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should identify why production returns generic responses instead of specific pricing', async () => {
    console.log('\n🔍 [PRODUCTION_DEBUG] Testing real production behavior...\n');

    const userQuery = "pesquise o valor do PS5 slim";
    
    console.log(`📝 User Query: "${userQuery}"`);
    console.log('🔧 Web Search Enabled:', getOption(STORAGE_KEYS.WEB_SEARCH_ENABLED));
    
    try {
      // Test the complete flow like in production
      const result = await (processor as any)._executeSimpleCompletion(userQuery);
      
      console.log('\n📊 [PRODUCTION_RESULT]');
      console.log('Response:', result.response);
      console.log('Length:', result.response.length);
      console.log('Contains pricing:', /R\$[\s]*[\d.,]+/.test(result.response));
      console.log('Is generic:', result.response.includes('procurando') || result.response.includes('pesquisar'));
      
      // This should help us understand the gap between test and production
      expect(result.response).toBeDefined();
      
      // Document the issue
      if (result.response.includes('procurando')) {
        console.log('\n❌ [ISSUE_IDENTIFIED] Production returns generic "procurando" response');
        console.log('   Expected: Specific pricing like "R$ 3.899,00"');
        console.log('   Actual: Generic acknowledgment response');
      }
      
      if (!/R\$[\s]*[\d.,]+/.test(result.response)) {
        console.log('\n❌ [ISSUE_IDENTIFIED] No pricing information in response');
        console.log('   Web context may not be reaching final LLM call');
      }
      
    } catch (error) {
      console.error('❌ [PRODUCTION_ERROR]', error);
      throw error;
    }
  });

  it('should test WebSearchService components individually', async () => {
    console.log('\n🔧 [COMPONENT_TEST] Testing WebSearchService components...\n');
    
    // Test 1: Search strategy generation
    const strategy = await webSearchService.generateSearchStrategy("PS5 Slim preço");
    console.log('📋 Search Strategy:', strategy);
    
    // Test 2: Web search execution  
    const searchResults = await webSearchService.searchWeb(strategy.searchQueries);
    console.log('🔍 Search Results Count:', searchResults.length);
    console.log('🔍 First Result:', searchResults[0]);
    
    // Test 3: Result processing (this is where the issue might be)
    const processedResults = await webSearchService.processSearchResults(searchResults, "PS5 Slim preço");
    console.log('🧠 Processed Results Length:', processedResults.length);
    console.log('🧠 Processed Results:', processedResults.substring(0, 300) + '...');
    console.log('🧠 Contains Pricing:', /R\$[\s]*[\d.,]+/.test(processedResults));
    
    // The issue might be here - processSearchResults might not be working correctly
    expect(processedResults).toBeDefined();
    
    if (processedResults.length < 100) {
      console.log('\n❌ [ISSUE_FOUND] processSearchResults returns short/empty content');
    }
    
    if (!/R\$[\s]*[\d.,]+/.test(processedResults)) {
      console.log('\n❌ [ISSUE_FOUND] processSearchResults not extracting pricing');
    }
  });
});
