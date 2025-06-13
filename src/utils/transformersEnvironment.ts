import { pipeline } from "@huggingface/transformers";

// Função modificada para sempre escolher wasm como dispositivo e dtype automático
export async function getOptimalDeviceConfig() {
  return { device: "wasm", dtype: "fp32" }; // Usar fp32 por padrão para compatibilidade
}

// Configurações específicas por modelo
const MODEL_SPECIFIC_CONFIGS: Record<string, Record<string, any>> = {
  "Xenova/distilgpt2": {
    use_external_data_format: false, // Modelo pequeno, não precisa
    dtype: "fp32",
    device: "wasm", // Forçar wasm para compatibilidade
  },
  "Xenova/gpt2": {
    use_external_data_format: true, // Modelo maior, precisa de external data
    dtype: "fp32",
    device: "wasm", // Forçar wasm para compatibilidade
  },
  "Xenova/llama2.c-stories15M": {
    use_external_data_format: false, // Modelo muito pequeno
    dtype: "fp32",
    device: "wasm", // Forçar wasm para compatibilidade
  },
  "Xenova/TinyLlama-1.1B-Chat-v1.0": {
    use_external_data_format: true, // Modelo grande, precisa de external data
    dtype: "fp32",
    device: "wasm", // Forçar wasm para compatibilidade
  },
};

// Main loading method — mantido!
export async function loadModelWithOptimalConfig(
  modelId: string,
  task: string,
  additionalOptions: Record<string, any> = {}
) {
  console.log(`[TransformersEnv] 🔍 DEBUG: Input parameters:`, {
    modelId,
    task,
    additionalOptions,
  });

  const deviceConfig = await getOptimalDeviceConfig();
  console.log(`[TransformersEnv] 🔍 DEBUG: Device config:`, deviceConfig);

  // Obter configurações específicas do modelo
  const modelSpecificConfig = MODEL_SPECIFIC_CONFIGS[modelId] || {};
  console.log(
    `[TransformersEnv] 🔍 DEBUG: Model-specific config for ${modelId}:`,
    modelSpecificConfig
  );

  // Filter out conflicting options from additionalOptions
  const filteredAdditionalOptions = Object.fromEntries(
    Object.entries(additionalOptions).filter(
      ([key]) => !["device", "dtype", "use_external_data_format"].includes(key)
    )
  );
  console.log(
    `[TransformersEnv] 🔍 DEBUG: Filtered additional options:`,
    filteredAdditionalOptions
  );

  // Configurações base para modelos browser-compatible
  const baseOptions: Record<string, any> = {
    // 1. FORCE correct configurations - ignore any incorrect additionalOptions
    device: "wasm", // Always use wasm for browser compatibility
    dtype: "fp32", // Always use fp32 - model-specific configs will override if needed
    local_files_only: false, // Permitir download se não estiver em cache

    // 2. Configurações de sessão para melhor performance
    session_options: {
      logSeverityLevel: 3, // Reduzir logs
      graphOptimizationLevel: "all" as const,
      enableMemPattern: true,
      enableCpuMemArena: true,
      // Execution providers em ordem de preferência
      executionProviders: ["wasm"],
    },

    // 3. Callback de progresso para debugging
    progress_callback: (data: any) => {
      if (data.status === "downloading") {
        console.log(
          `[TransformersEnv] Downloading: ${
            data.name || data.file
          } - ${Math.round(data.progress || 0)}%`
        );
      } else if (data.status === "loading") {
        console.log(`[TransformersEnv] Loading: ${data.name || data.file}`);
      } else if (data.status === "ready") {
        console.log(`[TransformersEnv] Ready: ${data.name || data.file}`);
      }
    },

    // 4. Aplicar opções adicionais (EXCLUINDO device/dtype/use_external_data_format que podem conflitar)
    ...filteredAdditionalOptions,

    // 5. FINAL: Configurações específicas do modelo têm PRECEDÊNCIA MÁXIMA
    ...modelSpecificConfig,
  };

  console.log(
    `[TransformersEnv] 🔍 DEBUG: Base options before model-specific override:`,
    {
      device: baseOptions.device,
      dtype: baseOptions.dtype,
      use_external_data_format: baseOptions.use_external_data_format,
    }
  );

  // CRITICAL: Force correct values one more time to ensure no overrides
  if (modelSpecificConfig.device) {
    baseOptions.device = modelSpecificConfig.device;
  } else {
    baseOptions.device = "wasm";
  }

  if (modelSpecificConfig.dtype) {
    baseOptions.dtype = modelSpecificConfig.dtype;
  } else {
    baseOptions.dtype = "fp32";
  }

  if (modelSpecificConfig.use_external_data_format !== undefined) {
    baseOptions.use_external_data_format =
      modelSpecificConfig.use_external_data_format;
  }

  console.log(`[TransformersEnv] 🔍 DEBUG: Final forced values:`, {
    device: baseOptions.device,
    dtype: baseOptions.dtype,
    use_external_data_format: baseOptions.use_external_data_format,
  });

  console.log(`[TransformersEnv] Loading model ${modelId} with options:`, {
    device: baseOptions.device,
    dtype: baseOptions.dtype,
    use_external_data_format: baseOptions.use_external_data_format,
    local_files_only: baseOptions.local_files_only,
    modelSpecific: modelSpecificConfig,
  });

  console.log(
    `[TransformersEnv] 🔍 DEBUG: Final baseOptions object:`,
    baseOptions
  );

  // FINAL VALIDATION: Ensure critical values are correct
  if (baseOptions.device !== "wasm") {
    console.error(
      `[TransformersEnv] ❌ CRITICAL ERROR: device is ${baseOptions.device}, forcing to wasm`
    );
    baseOptions.device = "wasm";
  }

  if (baseOptions.dtype !== "fp32") {
    console.error(
      `[TransformersEnv] ❌ CRITICAL ERROR: dtype is ${baseOptions.dtype}, forcing to fp32`
    );
    baseOptions.dtype = "fp32";
  }

  if (
    modelId === "Xenova/llama2.c-stories15M" &&
    baseOptions.use_external_data_format !== false
  ) {
    console.error(
      `[TransformersEnv] ❌ CRITICAL ERROR: use_external_data_format is ${baseOptions.use_external_data_format} for ${modelId}, forcing to false`
    );
    baseOptions.use_external_data_format = false;
  }

  console.log(`[TransformersEnv] 🔍 DEBUG: FINAL VALIDATED OPTIONS:`, {
    device: baseOptions.device,
    dtype: baseOptions.dtype,
    use_external_data_format: baseOptions.use_external_data_format,
  });

  return pipeline(task as any, modelId, baseOptions as any);
}
