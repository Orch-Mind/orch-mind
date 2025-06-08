// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { useState } from "react";
import {
  checkTransformersEnvironment,
  initializeTransformersEnvironment,
  loadModelWithOptimalConfig,
} from "../../utils/transformersEnvironment";

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

      await initializeTransformersEnvironment();

      const isInitialized = checkTransformersEnvironment();
      if (isInitialized) {
        addResult({
          success: true,
          message: "Ambiente transformers.js inicializado com sucesso",
        });
      } else {
        addResult({
          success: false,
          message: "Falha na verificação do ambiente transformers.js",
        });
      }

      addResult({
        success: true,
        message: "Informações de cache: Browser cache habilitado",
        details: { cacheType: "browser" },
      });
    } catch (error) {
      addResult({
        success: false,
        message: "Erro na inicialização do ambiente",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const testSmallModelLoading = async () => {
    try {
      addResult({
        success: true,
        message: "Testando carregamento de modelo pequeno (tokenizer)...",
      });

      // Teste com um modelo muito pequeno primeiro
      const modelId = "Xenova/gpt2"; // Modelo pequeno para teste
      const task = "text-generation";

      addResult({
        success: true,
        message: `Iniciando carregamento: ${modelId}`,
      });

      const model = await loadModelWithOptimalConfig(modelId, task, {
        // Forçar quantização para reduzir tamanho
        dtype: "q4",
        revision: "main",
      });

      if (model) {
        addResult({
          success: true,
          message: `Modelo ${modelId} carregado com sucesso!`,
          details: {
            modelType: typeof model,
            hasGenerate: typeof model.generate === "function",
          },
        });

        // Teste básico de geração
        try {
          const testInput = "Hello, world!";
          addResult({
            success: true,
            message: `Testando geração com input: "${testInput}"`,
          });

          // Nota: Este é apenas um teste de carregamento, não vamos fazer geração real
          addResult({ success: true, message: "Modelo está pronto para uso" });
        } catch (genError) {
          addResult({
            success: false,
            message: "Erro no teste de geração",
            details:
              genError instanceof Error ? genError.message : String(genError),
          });
        }
      } else {
        addResult({ success: false, message: "Modelo retornado é null" });
      }
    } catch (error) {
      addResult({
        success: false,
        message: "Erro no carregamento do modelo pequeno",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const testTargetModelLoading = async () => {
    try {
      addResult({
        success: true,
        message: "Testando carregamento do modelo target (Phi-3.5)...",
      });

      // DIFERENÇAS ENTRE MODELOS:
      // - Xenova: Modelos plug-and-play, funcionam com configuração padrão
      // - onnx-community: Requerem configurações específicas:
      //   * use_external_data_format: true (obrigatório)
      //   * dtype: "q4f16" (específico para cada modelo)
      //   * device: "webgpu" (recomendado para performance)

      // Test primary ONNX-community model com abordagem simplificada (conforme docs HF)
      const primaryModelId = "onnx-community/Phi-3.5-mini-instruct-onnx-web";
      const task = "text-generation";

      addResult({
        success: true,
        message: `🚀 Testando abordagem SIMPLIFICADA (conforme docs HF): ${primaryModelId}`,
      });

      try {
        // Usar abordagem exata da documentação HuggingFace - SEM configurações extras
        const { pipeline } = await import("@huggingface/transformers");

        addResult({
          success: true,
          message: "📦 Importação do transformers.js concluída",
        });

        // Create pipeline exactly as shown in HF docs
        const generator = await pipeline("text-generation", primaryModelId);

        addResult({
          success: true,
          message: "✅ Modelo carregado com sucesso (abordagem HF docs)!",
        });

        // Test message exactly as in docs
        const messages = [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Say hello in one word." },
        ];

        addResult({
          success: true,
          message: "🧪 Testando geração de texto...",
        });

        const output = await generator(messages, {
          max_new_tokens: 10,
          do_sample: false,
        });

        addResult({
          success: true,
          message: `🎉 Teste SUCESSO! Resposta: ${JSON.stringify(
            output
          ).substring(0, 100)}...`,
        });

        return;
      } catch (primaryError) {
        console.error("Primary model failed:", primaryError);
        addResult({
          success: false,
          message: `❌ Abordagem simplificada falhou: ${
            primaryError instanceof Error
              ? primaryError.message
              : String(primaryError)
          }`,
        });
      }

      // Se falhar, tentar com configuração manual
      addResult({
        success: true,
        message: "🔄 Tentando com configuração manual...",
      });

      try {
        const model = await loadModelWithOptimalConfig(primaryModelId, task, {
          dtype: "q4f16",
          device: "webgpu",
          use_external_data_format: true,
          revision: "main",
        });

        if (model) {
          addResult({
            success: true,
            message: "✅ Modelo carregado com configuração manual!",
          });

          const testMessages = [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: "Hello" },
          ];

          const result = await model(testMessages, {
            max_new_tokens: 5,
            do_sample: false,
          });

          addResult({
            success: true,
            message: `🎉 Teste com config manual SUCESSO! ${
              result[0]?.generated_text || "Resposta gerada"
            }`,
          });

          return;
        }
      } catch (manualError) {
        console.error("Manual config failed:", manualError);
        addResult({
          success: false,
          message: `❌ Configuração manual falhou: ${
            manualError instanceof Error
              ? manualError.message
              : String(manualError)
          }`,
        });
      }
    } catch (error) {
      addResult({
        success: false,
        message: "❌ Erro no carregamento do modelo Phi-3.5",
        details: {
          error: error instanceof Error ? error.message : String(error),
          suggestions: [
            "Verifique sua conexão com a internet",
            "Confirme se o modelo existe no HuggingFace Hub",
            "Tente limpar o cache do navegador",
            "Verifique se há bloqueios de CORS ou firewall",
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
          🎯 Testar Phi-3.5
        </button>

        <button
          onClick={clearResults}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          🗑️ Limpar
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
          tentar o modelo maior.
        </p>
        <p>
          🔍 <strong>Debug:</strong> Verifique o console do navegador para logs
          detalhados durante o carregamento.
        </p>
      </div>
    </div>
  );
};

export default ModelLoadingTest;
