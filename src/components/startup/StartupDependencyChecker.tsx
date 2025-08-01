import React, { useState, useEffect, useRef } from 'react';
import { StartupModelChecker } from './StartupModelChecker';
import { OllamaService } from '../shared/TranscriptionPanel/components/settings/api/OllamaSettings/services/ollamaService';

interface StartupDependencyCheckerState {
  isCheckingDependencies: boolean;
  dependenciesValid: boolean;
  isInstalling: boolean;
  installationProgress: string;
  error: string | null;
  showManualInstructions: boolean;
  isBrewLocked: boolean;
  lastAttemptTime: number;
  skipAutoInstall: boolean;
}

export const StartupDependencyChecker: React.FC = () => {
  const [state, setState] = useState<StartupDependencyCheckerState>({
    isCheckingDependencies: true,
    dependenciesValid: false,
    isInstalling: false,
    installationProgress: '',
    error: null,
    showManualInstructions: false,
    isBrewLocked: false,
    lastAttemptTime: 0,
    skipAutoInstall: false
  });

  // Ref para prevenir execuções simultâneas
  const isAttemptingInstallRef = useRef(false);

  const checkOllamaDependency = async () => {
    try {
      console.log('🚀 [StartupDependencyChecker] === STARTING DEPENDENCY CHECK ===');
      setState(prev => ({
        ...prev,
        isCheckingDependencies: true,
        error: null,
        showManualInstructions: false
      }));

      // Primeiro, verifica usando a API do Electron
      if (window.electronAPI?.checkDependencies) {
        console.log('🔧 [StartupDependencyChecker] Checking dependencies via Electron API...');
        const dependencyStatus = await window.electronAPI.checkDependencies();
        console.log('🔍 [StartupDependencyChecker] Dependency status result:', dependencyStatus);
        
        if (dependencyStatus.ollama?.installed) {
          console.log('🔍 [StartupDependencyChecker] Ollama binary found, verifying service is running...');
          
          // Verificar se o serviço está realmente rodando usando teste HTTP direto
          // (Electron API pode mascarar erros retornando array vazio)
          try {
            console.log('🔍 [StartupDependencyChecker] Testing HTTP direct connection to Ollama service...');
            
            // Testar conexão HTTP direta ao serviço Ollama (mesma que StartupModelChecker usa)
            const response = await fetch('http://localhost:11434/api/tags', {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
              const data = await response.json();
              console.log('✅ [StartupDependencyChecker] HTTP direct connection successful! Ollama service is running.');
              console.log('🔍 [StartupDependencyChecker] Available models:', data.models?.length || 0);
              
              setState(prev => ({
                ...prev,
                isCheckingDependencies: false,
                dependenciesValid: true,
                error: null
              }));
              console.log('✅ [StartupDependencyChecker] === DEPENDENCY CHECK PASSED - LAUNCHING MODEL CHECKER ===');
              return;
            } else {
              throw new Error(`HTTP response not OK: ${response.status}`);
            }
          } catch (serviceError) {
            console.error('❌ [StartupDependencyChecker] HTTP direct connection failed:', serviceError);
            console.log('🚀 [StartupDependencyChecker] Ollama binary installed but service not running - attempting automatic startup...');
            
            // Tentar iniciar o serviço Ollama automaticamente
            setState(prev => ({ ...prev, installationProgress: 'Inicializando serviço Ollama automaticamente...' }));
            
            try {
              // Verificar se temos a API para iniciar serviços
              if (!window.electronAPI?.ollama?.startService) {
                throw new Error('API startService não disponível no Electron');
              }
              
              console.log('🚀 [StartupDependencyChecker] Starting Ollama service via Electron API...');
              
              // Usar a API real do Electron para iniciar o serviço
              const startResult = await window.electronAPI.ollama.startService();
              
              if (startResult.success) {
                console.log('✅ [StartupDependencyChecker] Ollama service started successfully via Electron API!');
                
                // Verificar novamente usando HTTP direto para confirmar
                try {
                  const testResponse = await fetch('http://localhost:11434/api/tags', {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                  });
                  
                  if (testResponse.ok) {
                    await testResponse.json();
                    console.log('✅ [StartupDependencyChecker] Service confirmed accessible via HTTP');
                    
                    setState(prev => ({
                      ...prev,
                      isCheckingDependencies: false,
                      dependenciesValid: true,
                      error: null
                    }));
                    console.log('✅ [StartupDependencyChecker] === DEPENDENCY CHECK PASSED - SERVICE AUTO-STARTED ===');
                    return;
                  } else {
                    throw new Error('HTTP test failed after service start');
                  }
                } catch (httpError) {
                  console.warn('⚠️ [StartupDependencyChecker] Service started but HTTP test failed:', httpError);
                  // Dar uma segunda chance com delay
                  await new Promise(wait => setTimeout(wait, 2000));
                  
                  try {
                    const retryResponse = await fetch('http://localhost:11434/api/tags');
                    if (retryResponse.ok) {
                      setState(prev => ({
                        ...prev,
                        isCheckingDependencies: false,
                        dependenciesValid: true,
                        error: null
                      }));
                      console.log('✅ [StartupDependencyChecker] === SERVICE CONFIRMED ON RETRY ===');
                      return;
                    }
                  } catch (retryError) {
                    console.error('❌ [StartupDependencyChecker] Service started but still not accessible:', retryError);
                  }
                  
                  throw new Error('Serviço iniciado mas não respondeu ao teste HTTP');
                }
              } else {
                throw new Error(startResult.error || 'Falha ao iniciar serviço Ollama');
              }
              
            } catch (autoStartError) {
              console.error('❌ [StartupDependencyChecker] Failed to auto-start Ollama service:', autoStartError);
              
              // Fallback para instruções manuais
              setState(prev => ({
                ...prev,
                isCheckingDependencies: false,
                error: 'Ollama foi instalado com sucesso, mas não foi possível iniciar o serviço automaticamente. Por favor, execute "ollama serve" no terminal para iniciar o serviço, depois clique em "Verificar Novamente".'
              }));
              console.log('⚠️ [StartupDependencyChecker] === AUTO-START FAILED - MANUAL INTERVENTION REQUIRED ===');
              return;
            }
          }
        } else {
          console.log('❌ [StartupDependencyChecker] Ollama binary not found via checkDependencies');
        }
      } else {
        console.error('❌ [StartupDependencyChecker] checkDependencies API not available');
      }

      // Se chegou aqui, Ollama não está instalado
      console.log('🔧 [StartupDependencyChecker] Ollama not found');
      console.log('🔧 [StartupDependencyChecker] Current state:', {
        skipAutoInstall: state.skipAutoInstall,
        isBrewLocked: state.isBrewLocked,
        lastAttemptTime: state.lastAttemptTime
      });
      
      // Verificar se devemos pular instalação automática ou se houve tentativa recente
      const now = Date.now();
      const timeSinceLastAttempt = now - state.lastAttemptTime;
      const COOLDOWN_PERIOD = 30000; // 30 segundos
      
      if (state.skipAutoInstall) {
        console.log('🔧 [StartupDependencyChecker] ⚠️ Skipping auto-install - flag is set');
        setState(prev => ({
          ...prev,
          isCheckingDependencies: false,
          dependenciesValid: false,
          showManualInstructions: true,
          isBrewLocked: true, // Manter indicação de lock
          error: 'Instalação automática desabilitada devido a conflito do Homebrew'
        }));
        return;
      }
      
      if (timeSinceLastAttempt < COOLDOWN_PERIOD && state.lastAttemptTime > 0) {
        console.log(`🔧 [StartupDependencyChecker] ⏰ Cooldown active: ${Math.round((COOLDOWN_PERIOD - timeSinceLastAttempt) / 1000)}s remaining`);
        setState(prev => ({
          ...prev,
          isCheckingDependencies: false,
          dependenciesValid: false,
          isBrewLocked: true,
          error: `Aguarde ${Math.round((COOLDOWN_PERIOD - timeSinceLastAttempt) / 1000)}s antes de tentar novamente`
        }));
        return;
      }
      
      console.log('🔧 [StartupDependencyChecker] 🚀 Attempting automatic installation...');
      await attemptAutoInstallation();
      
    } catch (error) {
      console.error('🔧 [StartupDependencyChecker] Dependency check failed:', error);
      setState(prev => ({
        ...prev,
        isCheckingDependencies: false,
        dependenciesValid: false,
        isInstalling: false,
        error: 'Falha na verificação de dependências',
        showManualInstructions: true
      }));
    }
  };

  const attemptAutoInstallation = async () => {
    // Verificar se já há uma tentativa em andamento
    if (isAttemptingInstallRef.current) {
      console.log('🚫 [StartupDependencyChecker] Installation already in progress - aborting');
      return;
    }

    try {
      // Marcar como em andamento
      isAttemptingInstallRef.current = true;
      console.log('🚀 [StartupDependencyChecker] Starting installation attempt - ref locked');
      
      if (!window.electronAPI?.installOllama) {
        throw new Error('API de instalação não disponível');
      }

      // Registrar timestamp da tentativa
      const attemptTime = Date.now();
      setState(prev => ({
        ...prev,
        isCheckingDependencies: false,
        isInstalling: true,
        installationProgress: 'Iniciando instalação do Ollama...',
        lastAttemptTime: attemptTime
      }));

      // Escutar progresso da instalação
      const progressHandler = (progress: any) => {
        setState(prev => ({
          ...prev,
          installationProgress: progress.message || 'Instalando...'
        }));
      };

      if (window.electronAPI.onInstallProgress) {
        window.electronAPI.onInstallProgress(progressHandler);
      }

      // Executar instalação
      console.log('🦙 [StartupDependencyChecker] Starting Ollama installation...');
      await window.electronAPI.installOllama();
      
      console.log('✅ [StartupDependencyChecker] Ollama installation completed!');
      
      // Verificar se a instalação foi bem-sucedida
      const postInstallStatus = await window.electronAPI.checkDependencies();
      if (postInstallStatus.ollama?.installed) {
        console.log('🔍 [StartupDependencyChecker] Ollama binary installed, checking if service is running...');
        
        // Verificar se o serviço Ollama está funcionando (pode não estar após install via Homebrew)
        setState(prev => ({ ...prev, installationProgress: 'Verificando se o serviço Ollama está ativo...' }));
        
        try {
          // Tentar auto-start imediatamente após instalação (mais direto e confiável)
          console.log('🚀 [StartupDependencyChecker] Attempting auto-start after installation...');
          setState(prev => ({ ...prev, installationProgress: 'Iniciando serviço Ollama automaticamente...' }));
          
          // Verificar se a API de auto-start está disponível
          if (window.electronAPI?.ollama?.startService) {
            console.log('🚀 [StartupDependencyChecker] Auto-starting Ollama service after installation...');
            const startResult = await window.electronAPI.ollama.startService();
            
            if (startResult.success) {
              console.log('✅ [StartupDependencyChecker] Ollama service auto-started after installation!');
              
              // Aguardar um momento para o serviço se estabilizar
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Verificar se conseguimos listar modelos agora
              try {
                const models = await OllamaService.fetchInstalledModels();
                console.log('✅ [StartupDependencyChecker] Ollama service confirmed working after auto-start!');
                
                setState(prev => ({
                  ...prev,
                  isInstalling: false,
                  dependenciesValid: true,
                  installationProgress: 'Instalação e inicialização concluídas com sucesso!',
                  error: null
                }));
                return; // Sucesso! Sair da função
              } catch (modelError) {
                console.warn('⚠️ [StartupDependencyChecker] Auto-start succeeded but model listing failed:', modelError);
                // Mesmo se listar modelos falhar, consideramos sucesso se o startService funcionou
                setState(prev => ({
                  ...prev,
                  isInstalling: false,
                  dependenciesValid: true,
                  installationProgress: 'Serviço iniciado! Pode precisar de alguns segundos para ficar totalmente disponível.',
                  error: null
                }));
                return;
              }
            } else {
              console.error('❌ [StartupDependencyChecker] Auto-start failed:', startResult.error);
              throw new Error(startResult.error || 'Falha ao iniciar serviço automaticamente');
            }
          } else {
            console.log('⚠️ [StartupDependencyChecker] Auto-start API not available, falling back to manual instructions');
            throw new Error('APIs de controle de serviço não disponíveis');
          }
        } catch (serviceError) {
          console.error('❌ [StartupDependencyChecker] Service check failed:', serviceError);
          throw new Error('Ollama foi instalado mas o serviço não está acessível. Execute "ollama serve" no terminal para iniciar o serviço, depois clique em "Verificar Novamente".');
        }
      } else {
        throw new Error('Verificação pós-instalação falhou');
      }
      
    } catch (error) {
      console.error('🦙 [StartupDependencyChecker] Auto-installation failed:', error);
      
      // Detectar se é um erro de lock do Homebrew
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log('🦙 [StartupDependencyChecker] Full error message for analysis:', errorMessage);
      
      const isBrewLocked = errorMessage.includes('brew install ollama') && 
                          (errorMessage.includes('has already locked') || 
                           errorMessage.includes('process has already locked') ||
                           errorMessage.includes('Cellar/ollama') ||
                           errorMessage.includes('.tar.gz.incomplete') ||
                           errorMessage.includes('downloads/') ||
                           errorMessage.includes('Please wait for it to finish'));
      
      if (isBrewLocked) {
        console.log('🍺 [StartupDependencyChecker] Detected Homebrew lock - disabling auto-install');
        setState(prev => ({
          ...prev,
          isInstalling: false,
          dependenciesValid: false,
          isBrewLocked: true,
          skipAutoInstall: true, // Desabilitar tentativas automáticas futuras
          error: 'Processo de instalação do Ollama já em andamento via Homebrew',
          showManualInstructions: false
        }));
      } else {
        setState(prev => ({
          ...prev,
          isInstalling: false,
          dependenciesValid: false,
          isBrewLocked: false,
          error: 'Falha na instalação automática do Ollama',
          showManualInstructions: true
        }));
      }
    } finally {
      // Sempre limpar a ref ao finalizar (sucesso ou erro)
      isAttemptingInstallRef.current = false;
      console.log('🔓 [StartupDependencyChecker] Installation attempt finished - ref unlocked');
    }
  };

  const handleRetry = () => {
    // Reset flags que podem estar impedindo verificação adequada
    setState(prev => ({
      ...prev,
      isBrewLocked: false,
      error: null,
      showManualInstructions: false
      // Note: NÃO resetar skipAutoInstall aqui para evitar loops
    }));
    
    setTimeout(() => {
      checkOllamaDependency();
    }, 100);
  };

  const handleManualInstall = async () => {
    if (window.electronAPI?.getInstallInstructions) {
      try {
        const instructions = await window.electronAPI.getInstallInstructions('ollama');
        console.log('📝 [StartupDependencyChecker] Manual instructions:', instructions);
      } catch (error) {
        console.error('📝 [StartupDependencyChecker] Failed to get manual instructions:', error);
      }
    }
  };

  const handleForceRetry = () => {
    console.log('🔄 [StartupDependencyChecker] Force retry - resetting all flags');
    
    // Reset completo de todos os flags de proteção
    setState(prev => ({
      ...prev,
      isBrewLocked: false,
      skipAutoInstall: false,
      lastAttemptTime: 0,
      error: null,
      showManualInstructions: false
    }));
    
    setTimeout(() => {
      checkOllamaDependency();
    }, 100);
  };

  useEffect(() => {
    checkOllamaDependency();
  }, []);

  // Se as dependências estão OK, renderiza o ModelChecker
  if (state.dependenciesValid) {
    return <StartupModelChecker />;
  }

  // Se ainda está verificando ou instalando
  if (state.isCheckingDependencies || state.isInstalling) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {state.isInstalling ? 'Instalando Ollama...' : 'Verificando dependências...'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
              {state.isInstalling 
                ? state.installationProgress || 'Instalando o Ollama automaticamente...'
                : 'Verificando se o Ollama está instalado e rodando'
              }
            </p>
            {state.isInstalling && (
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full animate-pulse w-3/5"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Se há erro (Ollama não está instalado/rodando)
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-lg w-full mx-4">
        <div className="flex flex-col items-center space-y-6">
          <div className="text-red-500">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.804-.833-2.598 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {state.isBrewLocked ? '⏳ Instalação em Andamento' : 
               state.showManualInstructions ? 'Instalação Manual Necessária' : 
               'Ollama não encontrado'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              {state.error}
            </p>
          </div>

          {state.isBrewLocked ? (
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg w-full border border-orange-200 dark:border-orange-800">
              <h4 className="font-medium text-orange-900 dark:text-orange-200 mb-2">
                🍺 Homebrew está instalando o Ollama
              </h4>
              <p className="text-sm text-orange-700 dark:text-orange-300 mb-3">
                Já existe um processo de instalação do Ollama em andamento no Homebrew. 
                Aguarde a conclusão ou termine o processo manualmente.
              </p>
              <div className="text-xs text-orange-600 dark:text-orange-400 space-y-1">
                <div><strong>Opções:</strong></div>
                <div>• <strong>Aguardar:</strong> O processo pode levar alguns minutos</div>
                <div>• <strong>Verificar terminal:</strong> Execute <code className="bg-orange-200 dark:bg-orange-800 px-1 rounded">ps aux | grep brew</code></div>
                <div>• <strong>Forçar limpeza:</strong> Execute <code className="bg-orange-200 dark:bg-orange-800 px-1 rounded">brew cleanup --prune=all</code></div>
                <div>• <strong>Matar processo:</strong> Execute <code className="bg-orange-200 dark:bg-orange-800 px-1 rounded">pkill -f "brew install"</code></div>
              </div>
            </div>
          ) : state.showManualInstructions ? (
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg w-full">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                Instruções de instalação manual:
              </h4>
              <ol className="text-sm text-gray-700 dark:text-gray-300 space-y-2 list-decimal list-inside">
                <li>
                  Acesse <a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                    https://ollama.com/download
                  </a>
                </li>
                <li>Baixe e instale o Ollama para seu sistema operacional</li>
                <li>Após a instalação, execute: <code className="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">ollama serve</code></li>
                <li>Instale um modelo: <code className="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">ollama pull llama3.2</code></li>
                <li>Clique em "Verificar Novamente" abaixo</li>
              </ol>
            </div>
          ) : (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg w-full border border-blue-200 dark:border-blue-800">
              <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
                ✨ Instalação Automática Disponível
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                Detectamos que o Ollama não está instalado. Podemos instalá-lo automaticamente para você!
              </p>
              <div className="text-xs text-blue-600 dark:text-blue-400">
                • Detecta automaticamente seu sistema operacional<br/>
                • Usa o instalador oficial do Ollama<br/>
                • Configura tudo para você
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            {state.isBrewLocked ? (
              <>
                <button
                  onClick={handleRetry}
                  className="flex-1 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
                >
                  ⏳ Aguardar e Verificar
                </button>
                <button
                  onClick={() => setState(prev => ({ ...prev, showManualInstructions: true, isBrewLocked: false }))}
                  className="flex-1 px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  🛠️ Resolver Manualmente
                </button>
              </>
            ) : !state.showManualInstructions ? (
              <>
                <button
                  onClick={handleRetry}
                  className="flex-1 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                >
                  🚀 Instalar Automaticamente
                </button>
                <button
                  onClick={() => setState(prev => ({ ...prev, showManualInstructions: true }))}
                  className="flex-1 px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  📖 Instalação Manual
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleRetry}
                  className="flex-1 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  🔄 Verificar Novamente
                </button>
                <a
                  href="https://ollama.com/download"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-center"
                >
                  ⬇️ Baixar Ollama
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
