// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { spawn } from "child_process";
import * as crypto from "crypto";
import * as fs from "fs/promises";
import * as path from "path";

export interface AdapterMergeMetadata {
  sourceAdapters: Array<{
    id: string;
    name: string;
    baseModel: string;
    checksum: string;
    timestamp: string;
    author?: string;
    peers?: number;
  }>;
  mergeStrategy: "arithmetic_mean" | "weighted_average" | "svd_merge";
  mergeTimestamp: string;
  mergedBy: string;
  targetBaseModel: string;
  mergedAdapterPath: string;
  mergedChecksum: string;
}

export interface MergeRequest {
  adapters: Array<{
    name: string;
    path: string;
    baseModel: string;
    checksum: string;
    weight?: number; // Para weighted average
  }>;
  strategy: "arithmetic_mean" | "weighted_average" | "svd_merge";
  outputName: string;
  targetBaseModel: string;
}

export interface MergeResult {
  success: boolean;
  mergedAdapterPath?: string;
  metadata?: AdapterMergeMetadata;
  error?: string;
}

export class LoRAMergeService {
  private readonly mergeDir: string;
  private readonly pythonScriptPath: string;

  constructor() {
    this.mergeDir = path.join(process.cwd(), "adapters", "merged");
    this.pythonScriptPath = path.join(
      process.cwd(),
      "scripts",
      "python",
      "lora_training",
      "merge_lora.py"
    );
  }

  /**
   * Valida se todos os adapters são compatíveis para fusão
   */
  private async validateAdaptersForMerge(
    adapters: MergeRequest["adapters"]
  ): Promise<void> {
    if (adapters.length < 2) {
      throw new Error("Pelo menos 2 adapters são necessários para fusão");
    }

    // Verificar se todos os adapters têm o mesmo base model
    const baseModel = adapters[0].baseModel;
    const incompatibleAdapters = adapters.filter(
      (adapter) => adapter.baseModel !== baseModel
    );

    if (incompatibleAdapters.length > 0) {
      throw new Error(
        `Adapters incompatíveis encontrados. Base model esperado: ${baseModel}. ` +
          `Incompatíveis: ${incompatibleAdapters
            .map((a) => `${a.name} (${a.baseModel})`)
            .join(", ")}`
      );
    }

    // Verificar se todos os adapters existem
    for (const adapter of adapters) {
      const configPath = path.join(adapter.path, "adapter_config.json");
      try {
        await fs.access(configPath);
        console.log(`✅ Adapter validated: ${adapter.name}`);
      } catch (error) {
        throw new Error(
          `Adapter não encontrado: ${adapter.name} em ${adapter.path}`
        );
      }
    }

    console.log(
      `🔍 All ${adapters.length} adapters validated for base model: ${baseModel}`
    );
  }

  /**
   * Cria script Python para fusão de adapters LoRA
   */
  private createMergeScript(request: MergeRequest, outputPath: string): string {
    const adaptersConfig = request.adapters.map((adapter) => ({
      name: adapter.name,
      path: adapter.path,
      weight: adapter.weight || 1.0,
    }));

    return `#!/usr/bin/env python3
# SPDX-License-Identifier: MIT OR Apache-2.0
# LoRA Adapter Merging Script - Orch-OS

import os
import sys
import json
import torch
import numpy as np
from pathlib import Path
from typing import Dict, List, Any
import warnings

warnings.filterwarnings("ignore")

def load_adapter_weights(adapter_path: str) -> Dict[str, torch.Tensor]:
    """Load LoRA adapter weights from path."""
    print(f"📂 Loading adapter from: {adapter_path}")
    
    # Try to load pytorch weights
    pytorch_weights = None
    for weight_file in ["adapter_model.bin", "pytorch_model.bin", "adapter_model.safetensors"]:
        weight_path = os.path.join(adapter_path, weight_file)
        if os.path.exists(weight_path):
            try:
                if weight_file.endswith('.safetensors'):
                    from safetensors.torch import load_file
                    pytorch_weights = load_file(weight_path)
                else:
                    pytorch_weights = torch.load(weight_path, map_location='cpu')
                print(f"✅ Loaded weights from: {weight_file}")
                break
            except Exception as e:
                print(f"⚠️ Failed to load {weight_file}: {e}")
                continue
    
    if pytorch_weights is None:
        raise FileNotFoundError(f"No valid weight files found in {adapter_path}")
    
    return pytorch_weights

def arithmetic_mean_merge(adapters_weights: List[Dict[str, torch.Tensor]]) -> Dict[str, torch.Tensor]:
    """Merge adapters using arithmetic mean of deltas."""
    print("🧮 Performing arithmetic mean merge...")
    
    if not adapters_weights:
        raise ValueError("No adapter weights provided")
    
    # Get all parameter names from first adapter
    param_names = set(adapters_weights[0].keys())
    
    # Ensure all adapters have the same parameters
    for i, adapter in enumerate(adapters_weights[1:], 1):
        if set(adapter.keys()) != param_names:
            print(f"⚠️ Parameter mismatch in adapter {i}")
            # Use intersection of parameters
            param_names = param_names.intersection(set(adapter.keys()))
    
    merged_weights = {}
    
    for param_name in param_names:
        # Stack all adapter weights for this parameter
        param_tensors = [adapter[param_name] for adapter in adapters_weights]
        
        # Calculate arithmetic mean
        merged_param = torch.stack(param_tensors, dim=0).mean(dim=0)
        merged_weights[param_name] = merged_param
        
        print(f"📊 Merged parameter: {param_name} (shape: {merged_param.shape})")
    
    print(f"✅ Merged {len(merged_weights)} parameters using arithmetic mean")
    return merged_weights

def weighted_average_merge(
    adapters_weights: List[Dict[str, torch.Tensor]], 
    weights: List[float]
) -> Dict[str, torch.Tensor]:
    """Merge adapters using weighted average of deltas."""
    print(f"⚖️ Performing weighted average merge with weights: {weights}")
    
    if len(adapters_weights) != len(weights):
        raise ValueError("Number of adapters must match number of weights")
    
    # Normalize weights
    total_weight = sum(weights)
    normalized_weights = [w / total_weight for w in weights]
    print(f"📊 Normalized weights: {normalized_weights}")
    
    param_names = set(adapters_weights[0].keys())
    for adapter in adapters_weights[1:]:
        param_names = param_names.intersection(set(adapter.keys()))
    
    merged_weights = {}
    
    for param_name in param_names:
        # Weighted sum of parameters
        weighted_sum = None
        for adapter, weight in zip(adapters_weights, normalized_weights):
            param_tensor = adapter[param_name] * weight
            if weighted_sum is None:
                weighted_sum = param_tensor
            else:
                weighted_sum += param_tensor
        
        merged_weights[param_name] = weighted_sum
        print(f"📊 Merged parameter: {param_name} (shape: {weighted_sum.shape})")
    
    print(f"✅ Merged {len(merged_weights)} parameters using weighted average")
    return merged_weights

def svd_merge(adapters_weights: List[Dict[str, torch.Tensor]]) -> Dict[str, torch.Tensor]:
    """Merge adapters using SVD-based low-rank approximation."""
    print("🔬 Performing SVD-based merge...")
    
    param_names = set(adapters_weights[0].keys())
    for adapter in adapters_weights[1:]:
        param_names = param_names.intersection(set(adapter.keys()))
    
    merged_weights = {}
    
    for param_name in param_names:
        # Stack parameter matrices
        param_matrices = [adapter[param_name] for adapter in adapters_weights]
        
        # For LoRA, we typically have A and B matrices
        if len(param_matrices[0].shape) == 2:  # Matrix parameter
            # Concatenate along first dimension and apply SVD
            concatenated = torch.cat(param_matrices, dim=0)
            
            # SVD decomposition
            U, S, V = torch.svd(concatenated)
            
            # Keep top-k singular values (rank preservation)
            k = min(16, min(concatenated.shape))  # Typical LoRA rank
            merged_param = U[:, :k] @ torch.diag(S[:k]) @ V[:, :k].T
            
            # Resize back to original shape
            original_shape = param_matrices[0].shape
            if merged_param.shape[0] > original_shape[0]:
                merged_param = merged_param[:original_shape[0], :]
            
            merged_weights[param_name] = merged_param
        else:
            # For non-matrix parameters, use simple average
            merged_weights[param_name] = torch.stack(param_matrices, dim=0).mean(dim=0)
        
        print(f"📊 SVD merged parameter: {param_name}")
    
    print(f"✅ Merged {len(merged_weights)} parameters using SVD")
    return merged_weights

def main():
    """Main merging function."""
    print("🚀 Starting LoRA Adapter Merging...")
    
    # Configuration
    adapters_config = ${JSON.stringify(adaptersConfig, null, 2)}
    strategy = "${request.strategy}"
    output_path = "${outputPath}"
    
    print(f"📋 Merge strategy: {strategy}")
    print(f"📁 Output path: {output_path}")
    print(f"🔗 Adapters to merge: {len(adapters_config)}")
    
    try:
        # Load all adapter weights
        adapters_weights = []
        adapter_weights_list = []
        
        for adapter_config in adapters_config:
            adapter_path = adapter_config["path"]
            adapter_name = adapter_config["name"]
            weight = adapter_config["weight"]
            
            print(f"\\n📂 Loading adapter: {adapter_name}")
            weights = load_adapter_weights(adapter_path)
            adapters_weights.append(weights)
            adapter_weights_list.append(weight)
            
            print(f"✅ Loaded {len(weights)} parameters from {adapter_name}")
        
        # Perform merge based on strategy
        if strategy == "arithmetic_mean":
            merged_weights = arithmetic_mean_merge(adapters_weights)
        elif strategy == "weighted_average":
            merged_weights = weighted_average_merge(adapters_weights, adapter_weights_list)
        elif strategy == "svd_merge":
            merged_weights = svd_merge(adapters_weights)
        else:
            raise ValueError(f"Unsupported merge strategy: {strategy}")
        
        # Create output directory
        os.makedirs(output_path, exist_ok=True)
        
        # Save merged weights
        merged_weights_path = os.path.join(output_path, "adapter_model.bin")
        torch.save(merged_weights, merged_weights_path)
        print(f"💾 Saved merged weights to: {merged_weights_path}")
        
        # Create adapter config (copy from first adapter and modify)
        first_adapter_config_path = os.path.join(adapters_config[0]["path"], "adapter_config.json")
        if os.path.exists(first_adapter_config_path):
            with open(first_adapter_config_path, 'r') as f:
                adapter_config = json.load(f)
            
            # Modify config for merged adapter
            adapter_config["merged_from"] = [a["name"] for a in adapters_config]
            adapter_config["merge_strategy"] = strategy
            adapter_config["merge_timestamp"] = "${new Date().toISOString()}"
            
            merged_config_path = os.path.join(output_path, "adapter_config.json")
            with open(merged_config_path, 'w') as f:
                json.dump(adapter_config, f, indent=2)
            print(f"📋 Saved merged config to: {merged_config_path}")
        
        # Save merge metadata
        merge_metadata = {
            "source_adapters": adapters_config,
            "merge_strategy": strategy,
            "merge_timestamp": "${new Date().toISOString()}",
            "merged_parameters": len(merged_weights),
            "output_path": output_path
        }
        
        metadata_path = os.path.join(output_path, "merge_metadata.json")
        with open(metadata_path, 'w') as f:
            json.dump(merge_metadata, f, indent=2)
        print(f"📊 Saved merge metadata to: {metadata_path}")
        
        print("\\n🎉 LoRA adapter merging completed successfully!")
        print(f"📈 Merged adapter saved to: {output_path}")
        
    except Exception as e:
        print(f"\\n❌ Error during merging: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
`;
  }

  /**
   * Executa a fusão de adapters LoRA
   */
  async mergeAdapters(request: MergeRequest): Promise<MergeResult> {
    console.log(`🔄 Starting LoRA adapter merge: ${request.outputName}`);

    try {
      // Validar adapters
      await this.validateAdaptersForMerge(request.adapters);

      // Criar diretório de saída
      await fs.mkdir(this.mergeDir, { recursive: true });

      const outputPath = path.join(this.mergeDir, request.outputName);
      await fs.mkdir(outputPath, { recursive: true });

      // Criar script de fusão
      const scriptContent = this.createMergeScript(request, outputPath);
      const scriptPath = path.join(
        this.mergeDir,
        `merge_${request.outputName}.py`
      );
      await fs.writeFile(scriptPath, scriptContent);

      // Executar script Python
      console.log(`🐍 Executing merge script: ${scriptPath}`);

      const result = await this.executeMergeScript(scriptPath);

      if (!result.success) {
        throw new Error(result.error || "Merge script execution failed");
      }

      // Calcular checksum do adapter merged
      const mergedWeightsPath = path.join(outputPath, "adapter_model.bin");
      const mergedChecksum = await this.calculateFileChecksum(
        mergedWeightsPath
      );

      // Criar metadados de fusão
      const metadata: AdapterMergeMetadata = {
        sourceAdapters: request.adapters.map((adapter) => ({
          id: crypto.randomBytes(16).toString("hex"),
          name: adapter.name,
          baseModel: adapter.baseModel,
          checksum: adapter.checksum,
          timestamp: new Date().toISOString(),
        })),
        mergeStrategy: request.strategy,
        mergeTimestamp: new Date().toISOString(),
        mergedBy: "Orch-OS",
        targetBaseModel: request.targetBaseModel,
        mergedAdapterPath: outputPath,
        mergedChecksum,
      };

      // Salvar metadados
      const metadataPath = path.join(outputPath, "orch_merge_metadata.json");
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

      console.log(`✅ LoRA merge completed: ${request.outputName}`);
      console.log(`📁 Output path: ${outputPath}`);
      console.log(`🔒 Checksum: ${mergedChecksum}`);

      return {
        success: true,
        mergedAdapterPath: outputPath,
        metadata,
      };
    } catch (error) {
      console.error(`❌ LoRA merge failed: ${error}`);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Executa script Python de fusão
   */
  private async executeMergeScript(
    scriptPath: string
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const python = spawn("python3", [scriptPath]);

      let output = "";
      let errorOutput = "";

      python.stdout.on("data", (data) => {
        const message = data.toString();
        console.log(message);
        output += message;
      });

      python.stderr.on("data", (data) => {
        const error = data.toString();
        console.error(error);
        errorOutput += error;
      });

      python.on("close", (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({
            success: false,
            error: `Script exited with code ${code}. Error: ${errorOutput}`,
          });
        }
      });

      python.on("error", (error) => {
        resolve({
          success: false,
          error: `Failed to execute script: ${error.message}`,
        });
      });
    });
  }

  /**
   * Calcula checksum de um arquivo
   */
  private async calculateFileChecksum(filePath: string): Promise<string> {
    const fileBuffer = await fs.readFile(filePath);
    return crypto.createHash("sha256").update(fileBuffer).digest("hex");
  }

  /**
   * Lista adapters merged disponíveis
   */
  async listMergedAdapters(): Promise<
    Array<{
      name: string;
      path: string;
      metadata: AdapterMergeMetadata;
    }>
  > {
    try {
      const mergedDirs = await fs.readdir(this.mergeDir);
      const adapters = [];

      for (const dirName of mergedDirs) {
        const dirPath = path.join(this.mergeDir, dirName);
        const metadataPath = path.join(dirPath, "orch_merge_metadata.json");

        try {
          const metadataContent = await fs.readFile(metadataPath, "utf-8");
          const metadata = JSON.parse(metadataContent) as AdapterMergeMetadata;

          adapters.push({
            name: dirName,
            path: dirPath,
            metadata,
          });
        } catch (error) {
          console.warn(`⚠️ Could not read metadata for ${dirName}: ${error}`);
        }
      }

      return adapters;
    } catch (error) {
      console.error(`❌ Error listing merged adapters: ${error}`);
      return [];
    }
  }

  /**
   * Remove adapter merged
   */
  async removeMergedAdapter(
    adapterName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const adapterPath = path.join(this.mergeDir, adapterName);
      await fs.rm(adapterPath, { recursive: true, force: true });

      console.log(`🗑️ Removed merged adapter: ${adapterName}`);
      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(
        `❌ Failed to remove merged adapter ${adapterName}: ${errorMessage}`
      );
      return { success: false, error: errorMessage };
    }
  }
}
