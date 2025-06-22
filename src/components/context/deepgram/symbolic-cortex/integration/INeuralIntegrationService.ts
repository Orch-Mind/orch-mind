// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

export interface NeuralIntegrationResult {
  /**
   * The integrated prompt to be sent to the LLM
   */
  prompt: string;

  /**
   * The temperature decided by the collapse strategy (0.1-1.5)
   */
  temperature: number;

  /**
   * Whether the collapse was deterministic or probabilistic
   */
  isDeterministic: boolean;
}

export interface INeuralIntegrationService {
  integrate(
    neuralResults: Array<{
      core: string;
      intensity: number;
      output: string;
      insights: Record<string, unknown>;
    }>,
    originalInput: string,
    language?: string
  ): Promise<NeuralIntegrationResult>;
}
