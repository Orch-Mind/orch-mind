# SPDX-License-Identifier: MIT OR Apache-2.0
"""
Training configuration data model
"""

from dataclasses import dataclass
from typing import Optional, Dict, Any


@dataclass
class TrainingConfig:
    """Configuration for LoRA training."""
    
    # Required parameters
    base_model: str
    output_name: str
    data_file: str
    max_steps: int
    
    # Optional parameters with ULTRA MEMORY defaults
    learning_rate: float = 2e-5
    lora_rank: int = 8  # Reduced from 8 to save memory
    lora_alpha: int = 16  # Reduced from 16 to match rank
    lora_dropout: float = 0.1  # Increased for regularization
    batch_size: int = 1  # Force minimal batch size
    gradient_accumulation_steps: int = 4  # Balanced for memory efficiency and training steps
    warmup_steps: Optional[int] = None
    
    # Model-specific parameters
    hf_model_name: Optional[str] = None
    target_modules: Optional[list] = None
    
    # Training parameters - ULTRA MEMORY optimized
    num_epochs: int = 1
    fp16: bool = True  # Enable FP16 for memory savings
    optim: str = "adamw_torch"  # Memory-efficient optimizer
    weight_decay: float = 0.01
    lr_scheduler_type: str = "cosine"
    max_seq_length: int = 512  # Reduced from default 2048 to save memory
    
    # Output parameters
    output_dir: Optional[str] = None
    save_steps: Optional[int] = None
    logging_steps: Optional[int] = None
    
    def __post_init__(self):
        """Post-initialization validation and defaults."""
        if self.warmup_steps is None:
            self.warmup_steps = min(5, self.max_steps // 20)
        
        if self.save_steps is None:
            self.save_steps = self.max_steps
        
        if self.logging_steps is None:
            self.logging_steps = max(1, self.max_steps // 20)
        
        if self.target_modules is None:
            # Default target modules - will be optimized by HardwareDetector based on model architecture
            self.target_modules = [
                "q_proj", "k_proj", "v_proj", "o_proj", 
                "gate_proj", "up_proj", "down_proj"
            ]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "base_model": self.base_model,
            "output_name": self.output_name,
            "data_file": self.data_file,
            "max_steps": self.max_steps,
            "learning_rate": self.learning_rate,
            "lora_rank": self.lora_rank,
            "lora_alpha": self.lora_alpha,
            "lora_dropout": self.lora_dropout,
            "batch_size": self.batch_size,
            "gradient_accumulation_steps": self.gradient_accumulation_steps,
            "warmup_steps": self.warmup_steps,
            "hf_model_name": self.hf_model_name,
            "target_modules": self.target_modules,
            "num_epochs": self.num_epochs,
            "fp16": self.fp16,
            "optim": self.optim,
            "weight_decay": self.weight_decay,
            "lr_scheduler_type": self.lr_scheduler_type,
            "output_dir": self.output_dir,
            "save_steps": self.save_steps,
            "logging_steps": self.logging_steps
        }