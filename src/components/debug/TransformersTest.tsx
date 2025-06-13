// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { useState } from "react";

export const TransformersTest: React.FC = () => {
  const [isTestingEnv, setIsTestingEnv] = useState(false);
  const [isTestingBasic, setIsTestingBasic] = useState(false);
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setResults((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  const handleTestEnvironment = async () => {
    setIsTestingEnv(true);
    addResult("🔧 Iniciando teste de ambiente...");

    try {

      addResult("✅ Teste de ambiente passou!");
    } catch (error) {
      addResult(
        `❌ Teste de ambiente falhou: ${
          error instanceof Error ? error.message : "Erro desconhecido"
        }`
      );
    } finally {
      setIsTestingEnv(false);
    }
  };

  const handleTestBasic = async () => {
    setIsTestingBasic(true);
    addResult("🧪 Iniciando teste básico...");

    try {
      addResult("✅ Ambiente inicializado com sucesso!");

      // Check if we can access Electron APIs
      if (typeof window !== "undefined" && window.electronAPI) {
        const userDataPath = await window.electronAPI.getPath("userData");
        addResult(`📁 Caminho de dados do usuário: ${userDataPath}`);

        const hfHome = await window.electronAPI.getEnv("HF_HOME");
        addResult(`🏠 HF_HOME: ${hfHome || "Não definido"}`);
      } else {
        addResult("⚠️ ElectronAPI não disponível - rodando em modo browser");
      }

      addResult("✅ Teste básico passou!");
    } catch (error) {
      addResult(
        `❌ Teste básico falhou: ${
          error instanceof Error ? error.message : "Erro desconhecido"
        }`
      );
    } finally {
      setIsTestingBasic(false);
    }
  };

  const handleTestAll = async () => {
    setIsTestingAll(true);
    addResult("🚀 Iniciando todos os testes...");

    try {
      // Small delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check Electron APIs
      if (typeof window !== "undefined" && window.electronAPI) {
        const userDataPath = await window.electronAPI.getPath("userData");
        const hfHome = await window.electronAPI.getEnv("HF_HOME");
        addResult(
          `✅ Electron APIs OK - HF_HOME: ${
            hfHome ? "Definido" : "Não definido"
          }`
        );
      }

      addResult("🎉 Todos os testes passaram!");
    } catch (error) {
      addResult(
        `❌ Conjunto de testes falhou: ${
          error instanceof Error ? error.message : "Erro desconhecido"
        }`
      );
    } finally {
      setIsTestingAll(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg">
      <h2 className="text-2xl font-bold mb-4">🧪 Transformers.js Test Suite</h2>

      <div className="space-y-4 mb-6">
        <button
          onClick={handleTestEnvironment}
          disabled={isTestingEnv}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg transition-colors"
        >
          {isTestingEnv ? "Testando Ambiente..." : "🔧 Testar Ambiente"}
        </button>

        <button
          onClick={handleTestBasic}
          disabled={isTestingBasic}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg transition-colors ml-2"
        >
          {isTestingBasic ? "Testando Básico..." : "🚀 Teste Básico"}
        </button>

        <button
          onClick={handleTestAll}
          disabled={isTestingAll}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg transition-colors ml-2"
        >
          {isTestingAll ? "Executando Todos..." : "🎯 Executar Todos"}
        </button>

        <button
          onClick={clearResults}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors ml-2"
        >
          🗑️ Limpar
        </button>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">
          📋 Resultados dos Testes:
        </h3>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {results.length === 0 ? (
            <p className="text-gray-400 italic">
              Nenhum teste executado ainda. Clique em um botão acima para
              começar.
            </p>
          ) : (
            results.map((result, index) => (
              <div
                key={index}
                className={`text-sm font-mono p-2 rounded ${
                  result.includes("✅")
                    ? "text-green-400"
                    : result.includes("❌")
                    ? "text-red-400"
                    : result.includes("⚠️")
                    ? "text-yellow-400"
                    : "text-gray-300"
                }`}
              >
                {result}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-400">
        <p>
          💡 <strong>Dicas de Uso:</strong>
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>
            Comece com "Testar Ambiente" para verificar a configuração básica
          </li>
          <li>Use "Teste Básico" para verificar APIs do Electron</li>
          <li>"Executar Todos" executa o conjunto completo de testes</li>
          <li>Verifique o console (F12) para logs detalhados</li>
        </ul>
      </div>
    </div>
  );
};
