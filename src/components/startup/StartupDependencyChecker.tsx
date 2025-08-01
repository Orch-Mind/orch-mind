import React, { useState, useEffect, useRef } from 'react';
import { StartupModelChecker } from './StartupModelChecker';

interface DependencyStatus {
  installed: boolean;
  error?: string;
}

interface StartupDependencyCheckerState {
  isCheckingDependencies: boolean;
  dependencies: {
    ollama: DependencyStatus;
    python: DependencyStatus;
  };
  allDependenciesValid: boolean;
  isInstalling: boolean;
  installationProgress: string;
  error: string | null;
  isBrewLocked: boolean;
}

export const StartupDependencyChecker: React.FC = () => {
  const [state, setState] = useState<StartupDependencyCheckerState>({
    isCheckingDependencies: true,
    dependencies: {
      ollama: { installed: false },
      python: { installed: false }
    },
    allDependenciesValid: false,
    isInstalling: false,
    installationProgress: '',
    error: null,
    isBrewLocked: false
  });

  // Ref to prevent simultaneous executions
  const isAttemptingInstallRef = useRef(false);

  // Helper function to render dependency status (DRY principle)
  const renderDependencyStatus = (name: string, installed: boolean) => (
    <div className="flex items-center justify-between">
      <span className="text-gray-600 dark:text-gray-300">{name}:</span>
      <span className={`font-medium ${
        installed 
          ? 'text-green-600 dark:text-green-400' 
          : 'text-red-600 dark:text-red-400'
      }`}>
        {installed ? '✅ Installed' : '❌ Not Installed'}
      </span>
    </div>
  );

  const checkAllDependencies = async () => {
    try {
      setState(prev => ({
        ...prev,
        isCheckingDependencies: true,
        error: null
      }));

      // Check using Electron API
      if (window.electronAPI?.checkDependencies) {
        const dependencyStatus = await window.electronAPI.checkDependencies();
        
        // Update individual dependency status
        const updatedDependencies = {
          ollama: {
            ...state.dependencies.ollama,
            installed: dependencyStatus.ollama?.installed || false,
            needsInstall: !dependencyStatus.ollama?.installed
          },
          python: {
            ...state.dependencies.python,
            installed: (dependencyStatus as any).python?.installed || false,
            needsInstall: !(dependencyStatus as any).python?.installed
          }
        };
        
        setState(prev => ({
          ...prev,
          dependencies: updatedDependencies
        }));
        
        // Check if all dependencies are installed
        const allDependenciesInstalled = updatedDependencies.ollama.installed && updatedDependencies.python.installed;
        
        if (!allDependenciesInstalled) {
          // Some dependencies need to be installed
          const missingDependencies = [];
          if (!updatedDependencies.ollama.installed) missingDependencies.push('Ollama');
          if (!updatedDependencies.python.installed) missingDependencies.push('Python');
          
          // Go to automatic installation flow
          await attemptAutoInstallation(missingDependencies);
          return;
        }
        
        // If Python is OK but Ollama needs service verification
        if (dependencyStatus.ollama?.installed) {
          // Test direct HTTP connection to Ollama service
          try {
            const response = await fetch('http://localhost:11434/api/tags', {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
              const data = await response.json();
              
              setState(prev => ({
                ...prev,
                isCheckingDependencies: false,
                allDependenciesValid: true,
                error: null
              }));
              return;
            } else {
              throw new Error(`HTTP response not OK: ${response.status}`);
            }
          } catch (serviceError) {
            console.error('❌ [StartupDependencyChecker] HTTP direct connection failed:', serviceError);
            
            // Tentar iniciar o serviço Ollama automaticamente
            setState(prev => ({ ...prev, installationProgress: 'Inicializando serviço Ollama automaticamente...' }));
            
            try {
              // Verificar se temos a API para iniciar serviços
              if (!window.electronAPI?.startService) {
                throw new Error('startService API not available in Electron');
              }
              
              // Use Electron API to start the service
              const startResult = await window.electronAPI.startService();
              
              if (startResult.success) {
                // Verify using HTTP direct connection to confirm
                try {
                  const testResponse = await fetch('http://localhost:11434/api/tags', {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                  });
                  
                  if (testResponse.ok) {
                    await testResponse.json();
                    
                    setState(prev => ({
                      ...prev,
                      isCheckingDependencies: false,
                      allDependenciesValid: true,
                      installationProgress: 'Service auto-started successfully!',
                      error: null
                    }));
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
                        allDependenciesValid: true,
                        error: null
                      }));

                      return;
                    }
                  } catch (retryError) {
                    console.error('❌ [StartupDependencyChecker] Service started but still not accessible:', retryError);
                  }
                  
                  throw new Error('Service started but did not respond to HTTP test');
                }
              } else {
                throw new Error(startResult.error || 'Failed to start Ollama service');
              }
              
            } catch (autoStartError) {
              console.error('❌ [StartupDependencyChecker] Failed to auto-start Ollama service:', autoStartError);
              
              // Fallback para instruções manuais
              setState(prev => ({
                ...prev,
                isCheckingDependencies: false,
                error: 'Ollama was installed successfully, but the service could not be started automatically. Please run "ollama serve" in terminal to start the service, then click "Try Again".'
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

      // If reached here, Ollama is not installed
      await attemptAutoInstallation();
      
    } catch (error) {
      console.error('❌ [StartupDependencyChecker] Dependency check failed:', error);
      setState(prev => ({
        ...prev,
        isCheckingDependencies: false,
        allDependenciesValid: false,
        isInstalling: false,
        error: 'Dependency verification failed',
        showManualInstructions: true
      }));
    }
  };

  const attemptAutoInstallation = async (missingDependencies: string[] = ['Ollama']) => {
    // Check if installation attempt is already in progress
    if (isAttemptingInstallRef.current) {
      return;
    }

    try {
      // Mark as in progress
      isAttemptingInstallRef.current = true;
      
      // Check available installation APIs
      const availableAPIs = {
        ollama: !!window.electronAPI?.installOllama,
        python: !!window.electronAPI?.installPython
      };
      
      if (!availableAPIs.ollama && missingDependencies.includes('Ollama')) {
        throw new Error('Ollama installation API not available');
      }
      if (missingDependencies.includes('Python') && !window.electronAPI.installPython) {
        throw new Error('Python installation API not available');
      }

      // Set installation state
      setState(prev => ({
        ...prev,
        isCheckingDependencies: false,
        isInstalling: true,
        installationProgress: `Starting installation of: ${missingDependencies.join(', ')}...`
      }));

      // Listen for installation progress
      const progressHandler = (progress: any) => {
        setState(prev => ({
          ...prev,
          installationProgress: progress.message || 'Installing...'
        }));
      };

      if (window.electronAPI.onInstallProgress) {
        window.electronAPI.onInstallProgress(progressHandler);
      }

      // Execute sequential installations
      let installationResults = [];
      
      for (const dependency of missingDependencies) {
        setState(prev => ({
          ...prev,
          installationProgress: `Installing ${dependency}...`
        }));
        
        try {
          if (dependency === 'Ollama' && window.electronAPI.installOllama) {
            await window.electronAPI.installOllama();
            installationResults.push({ dependency: 'Ollama', success: true });
          } else if (dependency === 'Python' && window.electronAPI.installPython) {
            await window.electronAPI.installPython();
            installationResults.push({ dependency: 'Python', success: true });
          } else {
            console.warn(`⚠️ [StartupDependencyChecker] No installation API available for ${dependency}`);
            installationResults.push({ dependency, success: false, error: 'API not available' });
          }
        } catch (installError) {
          console.error(`❌ [StartupDependencyChecker] ${dependency} installation failed:`, installError);
          installationResults.push({ dependency, success: false, error: installError });
        }
      }
      
      // Verify post-installation status
      const postInstallStatus = await window.electronAPI.checkDependencies();
      

      const finalStatus = {
        ollama: {
          requested: missingDependencies.includes('Ollama'),
          installed: postInstallStatus.ollama?.installed || false
        },
        python: {
          requested: missingDependencies.includes('Python'),
          installed: (postInstallStatus as any).python?.installed || false
        }
      };
      
      // If Python was requested and installed successfully, no service verification needed
      // If Ollama was requested and installed, need to verify if service is running
      if (finalStatus.ollama.requested && finalStatus.ollama.installed) {
        
        // Check if Ollama service is working (might not be after Homebrew install)
        setState(prev => ({ ...prev, installationProgress: 'Checking if Ollama service is active...' }));
        
        try {
          // Attempt auto-start immediately after installation
          setState(prev => ({ ...prev, installationProgress: 'Starting Ollama service automatically...' }));
          
          // Check if auto-start API is available
          if (window.electronAPI?.startService) {
            const startResult = await window.electronAPI.startService();
            
            if (startResult.success) {
              // Wait for service to stabilize
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Service auto-started successfully
              setState(prev => ({
                ...prev,
                isInstalling: false,
                allDependenciesValid: true,
                installationProgress: 'Installation and initialization completed successfully!',
                error: null
              }));
              return; // Success! Exit function
            } else {
              console.error('❌ [StartupDependencyChecker] Auto-start failed:', startResult.error);
              throw new Error(startResult.error || 'Falha ao iniciar serviço automaticamente');
            }
          } else {
            console.log('⚠️ [StartupDependencyChecker] Auto-start API not available, falling back to manual instructions');
            throw new Error('Service control APIs not available');
          }
        } catch (serviceError) {
          console.error('❌ [StartupDependencyChecker] Service check failed:', serviceError);
          throw new Error('Ollama was installed but the service is not accessible. Run "ollama serve" in terminal to start the service, then click "Try Again".');
        }
      } else {
        // Se Ollama não foi solicitado ou não foi instalado, verificar se todas as outras dependências estão OK
        const ollamaOK = (!finalStatus.ollama.requested || finalStatus.ollama.installed);
        const pythonOK = (!finalStatus.python.requested || finalStatus.python.installed);
        const allRequestedInstalled = ollamaOK && pythonOK;
        
        if (allRequestedInstalled) {
          setState(prev => ({
            ...prev,
            isInstalling: false,
            allDependenciesValid: true,
            installationProgress: 'All dependencies installed successfully!',
            error: null
          }));
          return;
        } else {
          throw new Error('Post-installation verification failed - some dependencies were not installed');
        }
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

        setState(prev => ({
          ...prev,
          isInstalling: false,
          allDependenciesValid: false,
          isBrewLocked: true,
          skipAutoInstall: true, // Disable future automatic attempts
          error: 'Ollama installation process already in progress via Homebrew',
          showManualInstructions: false
        }));
      } else {
        setState(prev => ({
          ...prev,
          isInstalling: false,
          allDependenciesValid: false,
          isBrewLocked: false,
          error: 'Automatic Ollama installation failed',
          showManualInstructions: true
        }));
      }
    } finally {
      // Sempre limpar a ref ao finalizar (sucesso ou erro)
      isAttemptingInstallRef.current = false;

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
      checkAllDependencies();
    }, 100);
  };





  useEffect(() => {
    checkAllDependencies();
  }, []);

  // Se as dependências estão OK, renderiza o ModelChecker
  if (state.allDependenciesValid) {
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
              {state.isInstalling ? 'Installing Dependencies...' : 'Checking Dependencies...'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
              {state.isInstalling 
                ? state.installationProgress || 'Installing dependencies automatically...'
                : 'Checking if Ollama and Python are installed and working'
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
              {state.isBrewLocked ? '⏳ Installation in Progress' : 'Dependencies Not Found'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              {state.error}
            </p>
            
            {/* Dependency status */}
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg w-full mb-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                📋 Dependency Status:
              </h4>
              <div className="space-y-1 text-xs">
                {renderDependencyStatus('Ollama', state.dependencies.ollama.installed)}
                {renderDependencyStatus('Python', state.dependencies.python.installed)}
              </div>
            </div>
          </div>

          {state.isBrewLocked ? (
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg w-full border border-orange-200 dark:border-orange-800">
              <h4 className="font-medium text-orange-900 dark:text-orange-200 mb-2">
                Installation in Progress
              </h4>
              <p className="text-sm text-orange-700 dark:text-orange-300 mb-3">
                Homebrew is installing dependencies
              </p>
              <p className="text-sm text-orange-600 dark:text-orange-400 mb-3">
                Please wait for the process to complete or resolve manually if needed.
              </p>
              <div className="text-xs text-orange-600 dark:text-orange-400 space-y-1">
                <div>• Check terminal: Look for prompts waiting for interaction</div>
                <div>• Force cleanup: Run <code className="bg-orange-200 dark:bg-orange-800 px-1 rounded">brew cleanup --prune=all</code></div>
                <div>• Kill process: Run <code className="bg-orange-200 dark:bg-orange-800 px-1 rounded">pkill -f "brew install"</code></div>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg w-full border border-blue-200 dark:border-blue-800">
              <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
                Automatic Installation Available
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                Missing dependencies detected. We can install them automatically for you!
              </p>
              <div className="text-xs text-blue-600 dark:text-blue-400">
                • Automatically detects your operating system<br/>
                • Uses official installers<br/>
                • Configures everything for you
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              onClick={handleRetry}
              className="flex-1 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              {state.isBrewLocked ? '⏳ Wait and Check Again' : '🚀 Try Again'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
