#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# SPDX-License-Identifier: MIT OR Apache-2.0
# LoRA Adapter Merging Script - Orch-Mind

import os
import sys
import json
import argparse
import torch
import numpy as np
from pathlib import Path
from typing import Dict, List, Any, Optional
import warnings

# CRITICAL FIX: Force UTF-8 encoding on Windows to handle Unicode characters
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

warnings.filterwarnings("ignore")

def load_adapter_weights(adapter_path: str) -> Dict[str, torch.Tensor]:
    """Load LoRA adapter weights from path."""
    print(f"[LOAD] Loading adapter from: {adapter_path}")
    
    # Try to load pytorch weights
    pytorch_weights = None
    for weight_file in ["adapter_model.bin", "pytorch_model.bin", "adapter_model.safetensors"]:
        weight_path = os.path.join(adapter_path, weight_file)
        if os.path.exists(weight_path):
            try:
                if weight_file.endswith('.safetensors'):
                    try:
                        from safetensors.torch import load_file
                        pytorch_weights = load_file(weight_path)
                    except ImportError:
                        print("[WARNING] safetensors not available, trying torch.load")
                        pytorch_weights = torch.load(weight_path, map_location='cpu')
                else:
                    pytorch_weights = torch.load(weight_path, map_location='cpu')
                print(f"[SUCCESS] Loaded weights from: {weight_file}")
                break
            except Exception as e:
                print(f"[WARNING] Failed to load {weight_file}: {e}")
                continue
    
    if pytorch_weights is None:
        raise FileNotFoundError(f"No valid weight files found in {adapter_path}")
    
    return pytorch_weights

def arithmetic_mean_merge(adapters_weights: List[Dict[str, torch.Tensor]]) -> Dict[str, torch.Tensor]:
    """Merge adapters using arithmetic mean of deltas."""
    print("[MERGE] Performing arithmetic mean merge...")
    
    if not adapters_weights:
        raise ValueError("No adapter weights provided")
    
    # Get all parameter names from first adapter
    param_names = set(adapters_weights[0].keys())
    
    # Ensure all adapters have the same parameters
    for i, adapter in enumerate(adapters_weights[1:], 1):
        if set(adapter.keys()) != param_names:
            print(f"[WARNING] Parameter mismatch in adapter {i}")
            # Use intersection of parameters
            param_names = param_names.intersection(set(adapter.keys()))
    
    merged_weights = {}
    skipped_params = []
    
    for param_name in param_names:
        # Get all adapter weights for this parameter
        param_tensors = [adapter[param_name] for adapter in adapters_weights]
        
        # Check if all tensors have the same shape
        first_shape = param_tensors[0].shape
        compatible = all(tensor.shape == first_shape for tensor in param_tensors)
        
        if compatible:
            # Calculate arithmetic mean
            merged_param = torch.stack(param_tensors, dim=0).mean(dim=0)
            merged_weights[param_name] = merged_param
            print(f"[INFO] Merged parameter: {param_name} (shape: {merged_param.shape})")
        else:
            # Log shape mismatch and skip parameter
            shapes_info = [f"{i}:{tensor.shape}" for i, tensor in enumerate(param_tensors)]
            print(f"[WARNING] Shape mismatch for {param_name}: {', '.join(shapes_info)}")
            print(f"[SKIP] Skipping incompatible parameter: {param_name}")
            skipped_params.append(param_name)
    
    if skipped_params:
        print(f"[WARNING] Skipped {len(skipped_params)} incompatible parameters: {skipped_params}")
    
    print(f"[SUCCESS] Merged {len(merged_weights)} parameters using arithmetic mean (skipped {len(skipped_params)})")
    return merged_weights

def weighted_average_merge(
    adapters_weights: List[Dict[str, torch.Tensor]], 
    weights: List[float]
) -> Dict[str, torch.Tensor]:
    """Merge adapters using weighted average of deltas."""
    print(f"[MERGE] Performing weighted average merge with weights: {weights}")
    
    if len(adapters_weights) != len(weights):
        raise ValueError("Number of adapters must match number of weights")
    
    # Normalize weights
    total_weight = sum(weights)
    normalized_weights = [w / total_weight for w in weights]
    print(f"[INFO] Normalized weights: {normalized_weights}")
    
    param_names = set(adapters_weights[0].keys())
    for adapter in adapters_weights[1:]:
        param_names = param_names.intersection(set(adapter.keys()))
    
    merged_weights = {}
    skipped_params = []
    
    for param_name in param_names:
        param_tensors = [adapter[param_name] for adapter in adapters_weights]
        
        # Check if all tensors have the same shape
        first_shape = param_tensors[0].shape
        compatible = all(tensor.shape == first_shape for tensor in param_tensors)
        
        if compatible:
            # Apply weighted average
            weighted_sum = sum(
                tensor * weight for tensor, weight in zip(param_tensors, normalized_weights)
            )
            merged_weights[param_name] = weighted_sum
            print(f"[INFO] Merged parameter: {param_name} (shape: {weighted_sum.shape})")
        else:
            # Log shape mismatch and skip parameter
            shapes_info = [f"{i}:{tensor.shape}" for i, tensor in enumerate(param_tensors)]
            print(f"[WARNING] Shape mismatch for {param_name}: {', '.join(shapes_info)}")
            print(f"[SKIP] Skipping incompatible parameter: {param_name}")
            skipped_params.append(param_name)
    
    if skipped_params:
        print(f"[WARNING] Skipped {len(skipped_params)} incompatible parameters: {skipped_params}")
    
    print(f"[SUCCESS] Merged {len(merged_weights)} parameters using weighted average (skipped {len(skipped_params)})")
    return merged_weights

def svd_merge(adapters_weights: List[Dict[str, torch.Tensor]]) -> Dict[str, torch.Tensor]:
    """Merge adapters using SVD-based low-rank approximation with fallback to arithmetic mean."""
    print("[MERGE] Performing SVD-based merge...")
    
    param_names = set(adapters_weights[0].keys())
    for adapter in adapters_weights[1:]:
        param_names = param_names.intersection(set(adapter.keys()))
    
    merged_weights = {}
    svd_failures = 0
    
    for param_name in param_names:
        # Stack parameter matrices
        param_matrices = [adapter[param_name] for adapter in adapters_weights]
        
        # Check if all tensors have the same shape
        first_shape = param_matrices[0].shape
        compatible = all(tensor.shape == first_shape for tensor in param_matrices)
        
        if not compatible:
            # Log shape mismatch and skip parameter
            shapes_info = [f"{i}:{tensor.shape}" for i, tensor in enumerate(param_matrices)]
            print(f"[WARNING] Shape mismatch for {param_name}: {', '.join(shapes_info)}")
            print(f"[SKIP] Skipping incompatible parameter: {param_name}")
            continue
        
        # For LoRA, we typically have A and B matrices
        if len(param_matrices[0].shape) == 2:  # Matrix parameter
            try:
                # Concatenate along first dimension and apply SVD
                concatenated = torch.cat(param_matrices, dim=0)
                
                # Use torch.linalg.svd which is more robust than torch.svd
                U, S, Vh = torch.linalg.svd(concatenated, full_matrices=False)
                
                # Keep top-k singular values (rank preservation)
                k = min(8, min(concatenated.shape))  # Typical LoRA rank
                
                # Ensure we don't exceed available singular values
                k = min(k, len(S))
                
                # Check for numerical stability
                if k > 0 and S[0] > 1e-10:  # Avoid near-zero singular values
                    merged_param = U[:, :k] @ torch.diag(S[:k]) @ Vh[:k, :]
                    
                    # Resize back to original shape
                    original_shape = param_matrices[0].shape
                    if merged_param.shape[0] > original_shape[0]:
                        merged_param = merged_param[:original_shape[0], :]
                    
                    merged_weights[param_name] = merged_param
                    print(f"[INFO] SVD merged parameter: {param_name} (rank: {k})")
                else:
                    # Fallback to arithmetic mean for ill-conditioned matrices
                    print(f"[WARNING] SVD failed for {param_name} (ill-conditioned), using arithmetic mean")
                    merged_weights[param_name] = torch.stack(param_matrices, dim=0).mean(dim=0)
                    svd_failures += 1
                    
            except (torch.linalg.LinAlgError, RuntimeError) as e:
                # Fallback to arithmetic mean when SVD fails
                print(f"[WARNING] SVD failed for {param_name}: {e}")
                print(f"[INFO] Falling back to arithmetic mean for {param_name}")
                merged_weights[param_name] = torch.stack(param_matrices, dim=0).mean(dim=0)
                svd_failures += 1
        else:
            # For non-matrix parameters, use simple average
            merged_weights[param_name] = torch.stack(param_matrices, dim=0).mean(dim=0)
            print(f"[INFO] Averaged parameter: {param_name} (non-matrix)")
    
    if svd_failures > 0:
        print(f"[WARNING] SVD failed for {svd_failures} parameters, used arithmetic mean fallback")
    
    print(f"[SUCCESS] Merged {len(merged_weights)} parameters using SVD (with {svd_failures} fallbacks)")
    return merged_weights

def main():
    """Main merging function."""
    parser = argparse.ArgumentParser(description="Merge LoRA adapters")
    parser.add_argument("--config", required=True, help="JSON config file with merge parameters")
    parser.add_argument("--output", required=True, help="Output directory for merged adapter")
    
    args = parser.parse_args()
    
    print("[START] Starting LoRA Adapter Merging...")
    
    try:
        # Load configuration
        with open(args.config, 'r') as f:
            config = json.load(f)
        
        adapters_config = config["adapters"]
        strategy = config["strategy"]
        output_path = args.output
        
        print(f"[INFO] Merge strategy: {strategy}")
        print(f"[INFO] Output path: {output_path}")
        print(f"[INFO] Adapters to merge: {len(adapters_config)}")
        
        # Load all adapter weights
        adapters_weights = []
        adapter_weights_list = []
        
        for adapter_config in adapters_config:
            adapter_path = adapter_config["path"]
            adapter_name = adapter_config["name"]
            weight = adapter_config.get("weight", 1.0)
            
            print(f"\n[LOAD] Loading adapter: {adapter_name}")
            weights = load_adapter_weights(adapter_path)
            adapters_weights.append(weights)
            adapter_weights_list.append(weight)
            
            print(f"[SUCCESS] Loaded {len(weights)} parameters from {adapter_name}")
        
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
        
        # Save merged weights in both formats for maximum compatibility
        # 1. PyTorch format (.bin) - traditional format
        merged_weights_path_bin = os.path.join(output_path, "adapter_model.bin")
        torch.save(merged_weights, merged_weights_path_bin)
        print(f"[SAVE] Saved merged weights (PyTorch): {merged_weights_path_bin}")
        
        # 2. SafeTensors format (.safetensors) - required by Ollama
        merged_weights_path_safetensors = os.path.join(output_path, "adapter_model.safetensors")
        try:
            from safetensors.torch import save_file
            save_file(merged_weights, merged_weights_path_safetensors)
            print(f"[SAVE] Saved merged weights (SafeTensors): {merged_weights_path_safetensors}")
        except ImportError:
            print("[WARNING] SafeTensors not available, installing...")
            import subprocess
            import sys
            subprocess.check_call([sys.executable, "-m", "pip", "install", "safetensors"])
            from safetensors.torch import save_file
            save_file(merged_weights, merged_weights_path_safetensors)
            print(f"[SAVE] Saved merged weights (SafeTensors): {merged_weights_path_safetensors}")
        except Exception as e:
            print(f"[WARNING] Failed to save SafeTensors format: {e}")
            print("   • PyTorch format (.bin) is still available")
            print("   • Some Ollama versions may require SafeTensors format")
        
        # Create adapter config (copy from first adapter and modify)
        first_adapter_config_path = os.path.join(adapters_config[0]["path"], "adapter_config.json")
        if os.path.exists(first_adapter_config_path):
            with open(first_adapter_config_path, 'r') as f:
                adapter_config = json.load(f)
            
            # Modify config for merged adapter
            adapter_config["merged_from"] = [a["name"] for a in adapters_config]
            adapter_config["merge_strategy"] = strategy
            adapter_config["merge_timestamp"] = config.get("timestamp", "")
            
            merged_config_path = os.path.join(output_path, "adapter_config.json")
            with open(merged_config_path, 'w') as f:
                json.dump(adapter_config, f, indent=2)
            print(f"[SAVE] Saved merged config to: {merged_config_path}")
        
        # Save merge metadata
        merge_metadata = {
            "source_adapters": adapters_config,
            "merge_strategy": strategy,
            "merge_timestamp": config.get("timestamp", ""),
            "merged_parameters": len(merged_weights),
            "output_path": output_path
        }
        
        metadata_path = os.path.join(output_path, "merge_metadata.json")
        with open(metadata_path, 'w') as f:
            json.dump(merge_metadata, f, indent=2)
        print(f"[SAVE] Saved merge metadata to: {metadata_path}")
        
        print("\n[SUCCESS] LoRA adapter merging completed successfully!")
        print(f"[INFO] Merged adapter saved to: {output_path}")
        
    except Exception as e:
        print(f"\n[ERROR] Error during merging: {e}")
        import traceback
        import sys
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()