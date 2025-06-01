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
   * @returns Resposta contendo array de sinais neurais para ativação das áreas cerebrais
   */
  generateNeuralSignal(prompt: string, temporaryContext?: string, language?: string): Promise<NeuralSignalResponse>;

  /**
   * Expande semanticamente a query de um núcleo cerebral, retornando uma versão enriquecida, 
   * palavras-chave e dicas de contexto.
   * Symbolic: Expansão de campo semântico para ativação cortical
   */
  enrichSemanticQueryForSignal(
    core: string, 
    query: string, 
    intensity: number, 
    context?: string, 
    language?: string
  ): Promise<{ enrichedQuery: string, keywords: string[] }>;
}
