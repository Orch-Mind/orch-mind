// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

export interface NeuralIntegrationResult {
  neuralResults: Array<{
    core: string;
    intensity: number;
    output: string;
    insights: Record<string, unknown>;
  }>;
  strategyDecision: any;
  temperature: number;
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
