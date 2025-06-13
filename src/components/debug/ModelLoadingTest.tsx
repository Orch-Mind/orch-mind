// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { useState } from "react";
import { loadModelWithOptimalConfig } from "../../utils/transformersEnvironment";

interface ModelTestResult {
  success: boolean;
  message: string;
  details?: any;
  timestamp: string;
}

export const ModelLoadingTest: React.FC = () => {
  const [results, setResults] = useState<ModelTestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (result: Omit<ModelTestResult, "timestamp">) => {
    const newResult: ModelTestResult = {
      ...result,
      timestamp: new Date().toLocaleTimeString(),
    };
    setResults((prev) => [newResult, ...prev]);
    console.log(
      `[ModelTest] ${result.success ? "✅" : "❌"} ${result.message}`,
      result.details
    );
  };

  const testEnvironmentInitialization = async () => {
    try {
      addResult({
        success: true,
        message: "Testando inicialização do ambiente transformers.js...",
      });

      // Teste 1: Verificar se transformers.js está disponível
      try {
        addResult({
          success: true,
          message: "🔍 Verificando disponibilidade do transformers.js...",
        });

        const { pipeline, env } = await import("@huggingface/transformers");

        addResult({
          success: true,
          message: "✅ Transformers.js importado com sucesso",
          details: {
            pipelineAvailable: typeof pipeline === "function",
            envAvailable: typeof env === "object",
          },
        });

        // Teste 2: Verificar configuração do ambiente
        addResult({
          success: true,
          message: "🔧 Verificando configuração do ambiente...",
        });

        addResult({
          success: true,
          message: `✅ Ambiente configurado - Cache: ${
            env.cacheDir || "browser cache"
          }`,
          details: {
            cacheDir: env.cacheDir,
            backends: env.backends,
            allowLocalModels: env.allowLocalModels,
            allowRemoteModels: env.allowRemoteModels,
          },
        });

        // Teste 3: Verificar conectividade (opcional)
        addResult({
          success: true,
          message: "🌐 Verificando conectividade com Hugging Face Hub...",
        });

        // Teste simples de conectividade
        try {
          const response = await fetch(
            "https://huggingface.co/api/models/Xenova/llama2.c-stories15M",
            {
              method: "HEAD",
              mode: "cors",
            }
          );

          if (response.ok) {
            addResult({
              success: true,
              message: "✅ Conectividade com Hugging Face Hub OK",
            });
          } else {
            addResult({
              success: false,
              message: `⚠️ Conectividade limitada (status: ${response.status})`,
              details: {
                status: response.status,
                statusText: response.statusText,
              },
            });
          }
        } catch (fetchError) {
          addResult({
            success: false,
            message: "⚠️ Erro de conectividade - modelos podem não carregar",
            details: {
              error:
                fetchError instanceof Error
                  ? fetchError.message
                  : String(fetchError),
              suggestion: "Verifique sua conexão com a internet",
            },
          });
        }
      } catch (importError) {
        addResult({
          success: false,
          message: "❌ Erro na importação do transformers.js",
          details: {
            error:
              importError instanceof Error
                ? importError.message
                : String(importError),
            stack: importError instanceof Error ? importError.stack : undefined,
            suggestions: [
              "Verifique se @huggingface/transformers está instalado",
              "Execute: npm install @huggingface/transformers",
              "Verifique se não há conflitos de dependências",
            ],
          },
        });
        return;
      }

      addResult({
        success: true,
        message: "🎉 Ambiente inicializado com sucesso!",
      });
    } catch (error) {
      addResult({
        success: false,
        message: "❌ Erro na inicialização do ambiente",
        details: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      });
    }
  };

  const testSmallModelLoading = async () => {
    try {
      addResult({
        success: true,
        message: "Testando carregamento de modelo pequeno (tokenizer)...",
      });

      // Teste com um modelo muito pequeno primeiro - usar modelo ultra-pequeno para navegador
      const modelId = "Xenova/llama2.c-stories15M"; // Modelo de ~15MB, muito confiável para navegador
      const task = "text-generation";

      addResult({
        success: true,
        message: `Iniciando carregamento: ${modelId} (~15MB)`,
      });

      try {
        const model = await loadModelWithOptimalConfig(modelId, task, {
          // Configuração específica para modelos tiny
          dtype: "fp32", // Usar fp32 para modelos tiny (mais compatível)
          device: "wasm", // Forçar WASM para compatibilidade máxima
          use_external_data_format: false, // Modelos tiny geralmente não precisam
          local_files_only: false, // Permitir download
        });

        if (model) {
          addResult({
            success: true,
            message: `Modelo ${modelId} carregado com sucesso!`,
            details: {
              modelType: typeof model,
              hasGenerate: typeof model.generate === "function",
              modelInfo: model.constructor?.name || "Unknown",
            },
          });

          // Teste básico de geração com modelo tiny
          try {
            const testInput = "Hello";
            addResult({
              success: true,
              message: `Testando geração com input: "${testInput}"`,
            });

            // Teste real de geração com modelo tiny
            const result = await model(testInput, {
              max_new_tokens: 3,
              do_sample: false,
              temperature: 0.1,
            });

            addResult({
              success: true,
              message: `✅ Geração funcionou! Output: ${JSON.stringify(
                result
              ).substring(0, 100)}...`,
            });
          } catch (genError) {
            addResult({
              success: false,
              message: "Erro no teste de geração",
              details: {
                error:
                  genError instanceof Error
                    ? genError.message
                    : String(genError),
                stack: genError instanceof Error ? genError.stack : undefined,
              },
            });
          }
        } else {
          addResult({
            success: false,
            message: "Modelo retornado é null",
            details: { modelId, task },
          });
        }
      } catch (loadError) {
        addResult({
          success: false,
          message: `Erro específico no carregamento do modelo ${modelId}`,
          details: {
            error:
              loadError instanceof Error
                ? loadError.message
                : String(loadError),
            stack: loadError instanceof Error ? loadError.stack : undefined,
            modelId,
            task,
          },
        });
      }
    } catch (error) {
      addResult({
        success: false,
        message: "Erro geral no carregamento do modelo pequeno",
        details: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      });
    }
  };

  const testTargetModelLoading = async () => {
    try {
      addResult({
        success: true,
        message:
          "Testando carregamento de modelos ultra-pequenos para navegador...",
      });

      // Lista de modelos ultra-pequenos que funcionam no navegador
      const tinyModels = [
        {
          id: "Xenova/llama2.c-stories15M",
          size: "~15MB",
          description: "Llama2.c Stories (ultra pequeno)",
          config: {
            dtype: "fp32" as const,
            device: "wasm" as const,
            use_external_data_format: false,
          },
        },
        {
          id: "Xenova/distilgpt2",
          size: "~353MB",
          description: "DistilGPT-2 otimizado",
          config: {
            dtype: "fp32" as const,
            device: "wasm" as const,
            use_external_data_format: false,
          },
        },
        {
          id: "Xenova/gpt2",
          size: "~548MB",
          description: "GPT-2 base (médio)",
          config: {
            dtype: "fp32" as const,
            device: "wasm" as const,
            use_external_data_format: true,
          },
        },
        {
          id: "Xenova/TinyLlama-1.1B-Chat-v1.0",
          size: "~1.1B",
          description: "TinyLlama Chat (grande)",
          config: {
            dtype: "fp32" as const,
            device: "wasm" as const,
            use_external_data_format: true,
          },
        },
      ];

      for (const modelInfo of tinyModels) {
        try {
          addResult({
            success: true,
            message: `🧪 Testando ${modelInfo.id} (${modelInfo.size}) - ${modelInfo.description}`,
          });

          addResult({
            success: true,
            message: `📦 Importando transformers.js...`,
          });

          const { pipeline } = await import("@huggingface/transformers");

          addResult({
            success: true,
            message: `✅ Transformers.js importado com sucesso`,
          });

          // Para modelos de texto, usar text-generation
          const task = modelInfo.id.includes("distilbert")
            ? "feature-extraction"
            : "text-generation";

          addResult({
            success: true,
            message: `📦 Criando pipeline ${task} para ${modelInfo.id}...`,
          });

          // Usar configuração específica para cada modelo
          const generator = await pipeline(task, modelInfo.id, {
            ...modelInfo.config,
            local_files_only: false, // Permitir download
            progress_callback: (data: any) => {
              if (data.status === "downloading") {
                addResult({
                  success: true,
                  message: `📥 Baixando: ${
                    data.name || data.file
                  } - ${Math.round(data.progress || 0)}%`,
                });
              }
            },
          } as any);

          addResult({
            success: true,
            message: `✅ ${modelInfo.id} carregado com sucesso!`,
            details: {
              modelType: typeof generator,
              task: task,
              modelInfo: generator.constructor?.name || "Unknown",
              config: modelInfo.config,
            },
          });

          // Teste básico dependendo do tipo de modelo
          if (task === "text-generation") {
            addResult({
              success: true,
              message: `🧪 Testando geração de texto...`,
            });

            const testOutput = await generator("Hello world", {
              max_new_tokens: 5,
              do_sample: false,
            });

            addResult({
              success: true,
              message: `🎉 Geração funcionou! ${modelInfo.id}: ${JSON.stringify(
                testOutput
              ).substring(0, 80)}...`,
              details: {
                fullOutput: testOutput,
                outputType: typeof testOutput,
                outputLength: Array.isArray(testOutput) ? testOutput.length : 1,
              },
            });
          } else {
            // Para feature-extraction, apenas testar se carrega
            addResult({
              success: true,
              message: `✅ ${modelInfo.id} pronto para feature extraction!`,
              details: {
                task: task,
                ready: true,
              },
            });
          }

          // Parar no primeiro modelo que funcionar
          addResult({
            success: true,
            message: `🎯 SUCESSO! Modelo ${modelInfo.id} está funcionando perfeitamente no navegador!`,
          });
          return;
        } catch (modelError) {
          addResult({
            success: false,
            message: `❌ ${modelInfo.id} falhou: ${
              modelError instanceof Error
                ? modelError.message
                : String(modelError)
            }`,
            details: {
              error:
                modelError instanceof Error
                  ? modelError.message
                  : String(modelError),
              stack: modelError instanceof Error ? modelError.stack : undefined,
              modelId: modelInfo.id,
              modelSize: modelInfo.size,
              config: modelInfo.config,
            },
          });

          // Continuar para o próximo modelo
          continue;
        }
      }

      // Se chegou aqui, nenhum modelo funcionou
      addResult({
        success: false,
        message:
          "❌ Nenhum dos modelos ultra-pequenos funcionou. Problema pode ser de configuração do ambiente.",
        details: {
          testedModels: tinyModels.map((m) => m.id),
          suggestions: [
            "Verifique se o transformers.js está instalado corretamente",
            "Limpe o cache do navegador",
            "Verifique a conexão com a internet",
            "Tente recarregar a página",
            "Verifique o console do navegador para erros detalhados",
          ],
        },
      });
    } catch (error) {
      addResult({
        success: false,
        message: "❌ Erro geral no teste de modelos pequenos",
        details: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          suggestions: [
            "Problema pode ser na importação do transformers.js",
            "Verifique se todas as dependências estão instaladas",
            "Confirme se o ambiente está configurado corretamente",
            "Verifique se há bloqueios de CORS ou rede",
          ],
        },
      });
    }
  };

  const runAllTests = async () => {
    setIsLoading(true);
    setResults([]);

    try {
      addResult({
        success: true,
        message: "🚀 Iniciando todos os testes de modelo...",
      });

      // Teste 1: Inicialização do ambiente
      await testEnvironmentInitialization();

      // Aguardar um pouco entre testes
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Teste 2: Modelo pequeno primeiro
      await testSmallModelLoading();

      // Aguardar um pouco entre testes
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Teste 3: Modelo target
      await testTargetModelLoading();

      addResult({
        success: true,
        message: "🎉 Todos os testes de modelo concluídos!",
      });
    } catch (error) {
      addResult({
        success: false,
        message: "Erro geral nos testes",
        details: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  const clearStoredModel = () => {
    // Limpar qualquer modelo armazenado e forçar o uso do tiny-gpt2
    const {
      setOption,
      getOption,
      STORAGE_KEYS,
    } = require("../../services/StorageService");

    const currentModel = getOption(STORAGE_KEYS.HF_MODEL);
    addResult({
      success: true,
      message: `🗑️ Modelo atual no storage: ${currentModel || "nenhum"}`,
    });

    // Limpar o storage e definir o modelo tiny
    setOption(STORAGE_KEYS.HF_MODEL, "Xenova/llama2.c-stories15M");

    addResult({
      success: true,
      message: `✅ Modelo definido para: Xenova/llama2.c-stories15M`,
    });

    addResult({
      success: true,
      message: `💡 Agora execute o teste novamente para usar o modelo correto`,
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-white">
        🤖 Teste de Carregamento de Modelos
      </h2>

      <div className="flex gap-2 mb-4">
        <button
          onClick={runAllTests}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "⏳ Executando..." : "🚀 Executar Todos os Testes"}
        </button>

        <button
          onClick={testEnvironmentInitialization}
          disabled={isLoading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          🔧 Testar Ambiente
        </button>

        <button
          onClick={testSmallModelLoading}
          disabled={isLoading}
          className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
        >
          📦 Testar Modelo Pequeno
        </button>

        <button
          onClick={testTargetModelLoading}
          disabled={isLoading}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
        >
          🧪 Testar Modelos Tiny
        </button>

        <button
          onClick={clearResults}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          🗑️ Limpar
        </button>

        <button
          onClick={clearStoredModel}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          🗑️ Limpar Modelo Armazenado
        </button>
      </div>

      <div className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto">
        <h3 className="text-lg font-semibold mb-2 text-white">
          Resultados dos Testes:
        </h3>

        {results.length === 0 ? (
          <p className="text-gray-400">
            Nenhum teste executado ainda. Clique em um botão acima para começar.
          </p>
        ) : (
          <div className="space-y-2">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded border-l-4 ${
                  result.success
                    ? "bg-green-900/30 border-green-500 text-green-100"
                    : "bg-red-900/30 border-red-500 text-red-100"
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-medium">
                    {result.success ? "✅" : "❌"} {result.message}
                  </span>
                  <span className="text-xs opacity-70">{result.timestamp}</span>
                </div>

                {result.details && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm opacity-80 hover:opacity-100">
                      Detalhes
                    </summary>
                    <pre className="mt-1 text-xs bg-black/30 p-2 rounded overflow-x-auto">
                      {typeof result.details === "string"
                        ? result.details
                        : JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-400">
        <p>
          💡 <strong>Dica:</strong> Execute "Testar Ambiente" primeiro, depois
          "Testar Modelo Pequeno" para verificar se tudo funciona antes de
          tentar os modelos tiny ultra-compatíveis.
        </p>
        <p>
          🔍 <strong>Debug:</strong> Verifique o console do navegador para logs
          detalhados durante o carregamento.
        </p>
        <p>
          🧪 <strong>Modelos Testados:</strong> Xenova/llama2.c-stories15M
          (~15MB), Xenova/distilgpt2 (~353MB), Xenova/gpt2 (~548MB),
          Xenova/TinyLlama-1.1B-Chat-v1.0 (~1.1B)
        </p>
      </div>
    </div>
  );
};

export default ModelLoadingTest;
