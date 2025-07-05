// SPDX-License-Identifier: MIT OR Apache-2.0
// Training Configuration Hook - Simplified
// Returns real training configuration values from backend

import { useMemo } from "react";

interface LoRAConfig {
  rank: number;
  alpha: number;
  dropout: number;
  learningRate: number;
  batchSize: number;
  gradientAccumulationSteps: number;
  numEpochs: number;
  fp16: boolean;
  optimizer: string;
  weightDecay: number;
  lrSchedulerType: string;
}

interface TrainingConfigData {
  lora: LoRAConfig;
  training: {
    defaultMaxSteps: number;
    warmupRatio: number;
    loggingSteps: number;
    saveSteps: number;
  };
  hardware: {
    defaultDevice: string;
    lowCpuMemUsage: boolean;
    gradientCheckpointing: boolean;
  };
}

interface UseTrainingConfigReturn {
  config: TrainingConfigData;
  loading: boolean;
  error: string | null;
}

// Real configuration values from backend Python
// Source: scripts/python/lora_training/models/training_config.py
const BACKEND_CONFIG: TrainingConfigData = {
  lora: {
    rank: 16, // scripts/python/lora_training/models/training_config.py:22
    alpha: 32, // scripts/python/lora_training/models/training_config.py:23
    dropout: 0.05, // scripts/python/lora_training/models/training_config.py:24
    learningRate: 2e-4, // scripts/python/lora_training/models/training_config.py:20
    batchSize: 1,
    gradientAccumulationSteps: 8,
    numEpochs: 1,
    fp16: false,
    optimizer: "adamw_torch",
    weightDecay: 0.01,
    lrSchedulerType: "cosine",
  },
  training: {
    defaultMaxSteps: 100,
    warmupRatio: 0.1,
    loggingSteps: 10,
    saveSteps: 50,
  },
  hardware: {
    defaultDevice: "auto",
    lowCpuMemUsage: true,
    gradientCheckpointing: true,
  },
};

// Utility to format learning rate in scientific notation
const formatLearningRate = (lr: number): string => {
  if (lr === 0.0002) return "2e-4";
  if (lr === 0.0003) return "3e-4";
  if (lr === 0.00005) return "5e-5";
  if (lr === 0.00002) return "2e-5";
  if (lr === 0.00001) return "1e-5";
  return lr.toExponential(0);
};

export const useTrainingConfig = (): UseTrainingConfigReturn => {
  // Return backend configuration directly - no async loading needed
  const config = useMemo(() => BACKEND_CONFIG, []);

  return {
    config,
    loading: false, // No loading since it's synchronous
    error: null, // No error since it's hardcoded
  };
};

export { formatLearningRate };
export type { LoRAConfig, TrainingConfigData };
