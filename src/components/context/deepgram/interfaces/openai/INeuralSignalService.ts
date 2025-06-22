// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// INeuralSignalService.ts
// Symbolic: Neural interface for symbolic signal generation and processing

import { NeuralSignalResponse } from "../neural/NeuralSignalTypes";

/**
 * Interface para o serviço de geração de sinais neurais simbólicos
 * Symbolic: Representa o córtex de geração e processamento de sinais neurais
 */
export interface INeuralSignalService {
  /**
   * Gera sinais neurais simbólicos baseados em um prompt para ativação do cérebro artificial
   * @param prompt O prompt estruturado para gerar sinais neurais (estímulo sensorial)
   * @param temporaryContext Contexto temporário opcional (campo contextual efêmero)
   * @param language Idioma para processamento
   * @returns Resposta contendo array de sinais neurais para ativação das áreas cerebrais
   */
  generateNeuralSignal(
    prompt: string,
    temporaryContext?: string,
    language?: string
  ): Promise<NeuralSignalResponse>;

  /**
   * Batch semantic enrichment for multiple neural signals
   * Processes multiple signals in a single LLM call for improved efficiency
   * @param signals Array of signal data to enrich
   * @param language Language context for enrichment
   * @returns Array of enrichment results in the same order as input
   */
  enrichSemanticQuery(
    signals: Array<{
      core: string;
      query: string;
      intensity: number;
      context?: string;
    }>,
    language?: string
  ): Promise<Array<{ enrichedQuery: string; keywords: string[] }>>;
}
