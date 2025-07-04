# SPDX-License-Identifier: MIT OR Apache-2.0
"""
Hardware detection and optimization service for LoRA training
"""

import platform
import sys
from typing import Dict, Any, Optional, List
from dataclasses import dataclass


@dataclass
class HardwareConfig:
    """Hardware configuration for training optimization."""
    device_type: str  # "cuda", "mps", "cpu"
    torch_dtype: str  # "float16", "float32", "bfloat16"
    use_fp16_trainer: bool  # Whether to use fp16 flag in Trainer
    device_map: Optional[str]  # Device mapping strategy
    low_cpu_mem_usage: bool
    load_in_8bit: bool
    gradient_checkpointing: bool
    dataloader_pin_memory: bool
    dataloader_num_workers: int
    batch_size_multiplier: float  # Multiplier for batch size based on hardware


class HardwareDetector:
    """Detects hardware capabilities and provides optimal training configuration."""
    
    def __init__(self):
        self.hardware_info = self._detect_hardware()
    
    def _detect_hardware(self) -> Dict[str, Any]:
        """Detect available hardware and capabilities."""
        import torch
        
        hardware_info = {
            "platform": platform.system(),
            "machine": platform.machine(),
            "python_version": sys.version,
            "torch_version": torch.__version__,
            "cuda_available": torch.cuda.is_available(),
            "mps_available": hasattr(torch.backends, 'mps') and torch.backends.mps.is_available(),
            "cpu_count": torch.get_num_threads(),
        }
        
        # CUDA specific info
        if hardware_info["cuda_available"]:
            hardware_info["cuda_device_count"] = torch.cuda.device_count()
            hardware_info["cuda_device_name"] = torch.cuda.get_device_name(0)
            hardware_info["cuda_memory"] = torch.cuda.get_device_properties(0).total_memory
        
        # MPS specific info
        if hardware_info["mps_available"]:
            hardware_info["mps_device_name"] = "Apple Silicon GPU"
            # MPS doesn't have direct memory query, estimate based on system
            if "M1" in platform.processor() or "M2" in platform.processor() or "M3" in platform.processor():
                hardware_info["estimated_gpu_memory"] = 8 * 1024**3  # 8GB estimate
            else:
                hardware_info["estimated_gpu_memory"] = 4 * 1024**3  # 4GB estimate
        
        return hardware_info
    
    def get_optimal_config(self, model_name: str = "") -> HardwareConfig:
        """Get optimal hardware configuration for training."""
        
        # Apple Silicon MPS optimization
        if self.hardware_info["mps_available"] and self.hardware_info["platform"] == "Darwin":
            return self._get_mps_config(model_name)
        
        # CUDA optimization
        elif self.hardware_info["cuda_available"]:
            return self._get_cuda_config(model_name)
        
        # CPU fallback
        else:
            return self._get_cpu_config(model_name)
    
    def _get_mps_config(self, model_name: str) -> HardwareConfig:
        """Optimized configuration for Apple Silicon MPS."""
        return HardwareConfig(
            device_type="mps",
            torch_dtype="float16",  # Load model in float16 for memory efficiency
            use_fp16_trainer=False,  # CRITICAL: Don't use fp16 flag in Trainer for MPS
            device_map=None,  # Don't use device_map with MPS, let PyTorch handle it
            low_cpu_mem_usage=True,
            load_in_8bit=False,  # 8-bit quantization not stable on MPS
            gradient_checkpointing=False,  # Can cause issues with MPS gradients
            dataloader_pin_memory=False,  # Pin memory not beneficial for MPS
            dataloader_num_workers=0,  # Multiprocessing can cause issues on macOS
            batch_size_multiplier=1.0,  # Standard batch size for MPS
        )
    
    def _get_cuda_config(self, model_name: str) -> HardwareConfig:
        """Optimized configuration for CUDA."""
        gpu_memory = self.hardware_info.get("cuda_memory", 0)
        
        # Adjust settings based on GPU memory
        if gpu_memory > 16 * 1024**3:  # > 16GB
            batch_multiplier = 2.0
            use_8bit = False
        elif gpu_memory > 8 * 1024**3:  # > 8GB
            batch_multiplier = 1.5
            use_8bit = False
        else:  # <= 8GB
            batch_multiplier = 1.0
            use_8bit = True
        
        return HardwareConfig(
            device_type="cuda",
            torch_dtype="float16",
            use_fp16_trainer=True,  # Safe to use fp16 with CUDA
            device_map="auto",
            low_cpu_mem_usage=True,
            load_in_8bit=use_8bit,
            gradient_checkpointing=True,
            dataloader_pin_memory=True,
            dataloader_num_workers=4,
            batch_size_multiplier=batch_multiplier,
        )
    
    def _get_cpu_config(self, model_name: str) -> HardwareConfig:
        """Optimized configuration for CPU-only training."""
        return HardwareConfig(
            device_type="cpu",
            torch_dtype="float32",  # CPU works better with float32
            use_fp16_trainer=False,
            device_map=None,
            low_cpu_mem_usage=True,
            load_in_8bit=False,
            gradient_checkpointing=True,  # Helps with memory on CPU
            dataloader_pin_memory=False,
            dataloader_num_workers=min(4, self.hardware_info["cpu_count"]),
            batch_size_multiplier=0.5,  # Smaller batches for CPU
        )
    
    def get_target_modules_for_model(self, model_name: str) -> List[str]:
        """Get optimal target modules for specific model architectures."""
        model_name_lower = model_name.lower()
        
        # Gemma specific modules
        if "gemma" in model_name_lower:
            return [
                "q_proj", "k_proj", "v_proj", "o_proj",  # Attention layers
                "gate_proj", "up_proj", "down_proj"      # MLP layers
            ]
        
        # Llama specific modules (including Llama 3.1)
        elif "llama" in model_name_lower:
            return [
                "q_proj", "k_proj", "v_proj", "o_proj",  # Attention layers
                "gate_proj", "up_proj", "down_proj"      # MLP layers
            ]
        
        # Qwen specific modules
        elif "qwen" in model_name_lower:
            return [
                "q_proj", "k_proj", "v_proj", "o_proj",  # Attention layers
                "gate_proj", "up_proj", "down_proj"      # MLP layers
            ]
        
        # Mistral specific modules
        elif "mistral" in model_name_lower:
            return [
                "q_proj", "k_proj", "v_proj", "o_proj",  # Attention layers
                "gate_proj", "up_proj", "down_proj"      # MLP layers
            ]
        
        # CodeLlama specific modules
        elif "codellama" in model_name_lower:
            return [
                "q_proj", "k_proj", "v_proj", "o_proj",  # Attention layers
                "gate_proj", "up_proj", "down_proj"      # MLP layers
            ]
        
        # Default fallback for unknown models
        else:
            return [
                "q_proj", "k_proj", "v_proj", "o_proj",  # Common attention layers
                "gate_proj", "up_proj", "down_proj",     # Common MLP layers
                "fc_in", "fc_out",                       # Alternative MLP names
                "c_attn", "c_proj",                      # GPT-style names
            ]
    
    def print_hardware_info(self):
        """Print detected hardware information."""
        print("\n🖥️  HARDWARE DETECTION REPORT")
        print("=" * 50)
        print(f"Platform: {self.hardware_info['platform']}")
        print(f"Machine: {self.hardware_info['machine']}")
        print(f"PyTorch Version: {self.hardware_info['torch_version']}")
        print(f"CPU Threads: {self.hardware_info['cpu_count']}")
        
        if self.hardware_info["cuda_available"]:
            print(f"🚀 CUDA Available: YES")
            print(f"   • Device Count: {self.hardware_info['cuda_device_count']}")
            print(f"   • Device Name: {self.hardware_info['cuda_device_name']}")
            print(f"   • Memory: {self.hardware_info['cuda_memory'] / 1024**3:.1f} GB")
        else:
            print(f"🚀 CUDA Available: NO")
        
        if self.hardware_info["mps_available"]:
            print(f"🍎 MPS Available: YES")
            print(f"   • Device: {self.hardware_info['mps_device_name']}")
            print(f"   • Estimated Memory: {self.hardware_info['estimated_gpu_memory'] / 1024**3:.1f} GB")
        else:
            print(f"🍎 MPS Available: NO")
        
        print("=" * 50)
    
    def get_recommended_batch_size(self, base_batch_size: int, model_name: str = "") -> int:
        """Get recommended batch size based on hardware."""
        config = self.get_optimal_config(model_name)
        recommended = max(1, int(base_batch_size * config.batch_size_multiplier))
        return recommended
    
    def validate_mps_compatibility(self) -> bool:
        """Validate MPS compatibility and warn about potential issues."""
        if not self.hardware_info["mps_available"]:
            return False
        
        import torch
        
        # Test basic MPS functionality
        try:
            # Create a simple tensor on MPS
            test_tensor = torch.randn(10, 10, device="mps")
            test_result = torch.mm(test_tensor, test_tensor.t())
            
            # Test float16 operations
            test_tensor_fp16 = test_tensor.to(torch.float16)
            test_result_fp16 = torch.mm(test_tensor_fp16, test_tensor_fp16.t())
            
            print("✅ MPS validation passed - ready for training")
            return True
            
        except Exception as e:
            print(f"❌ MPS validation failed: {e}")
            print("   Falling back to CPU training")
            return False