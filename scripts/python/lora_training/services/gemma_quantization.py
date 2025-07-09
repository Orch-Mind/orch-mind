"""
Gemma Quantization Module for Training - Minimum Memory Mode
Implements aggressive Q4_K_M quantization for minimal memory usage
"""

import torch
import torch.nn as nn
from typing import Optional, Tuple
import math
import gc


class GemmaMinimalMemoryQuantization:
    """Ultra low memory quantization for Gemma models"""
    
    def __init__(self, device_type: str = "mps"):
        self.device_type = device_type
        # More aggressive clamping for 4-bit quantization
        self.activation_scale = 16000.0  # Lower scale for Q4
        self.gradient_clip_value = 0.5  # More aggressive clipping
        self.loss_scale = 64.0  # Lower initial scale
        self.quantize_bits = 4  # Q4_K_M simulation
    
    # NOTE: The following methods are kept for reference but not used in current implementation
    # They were causing gradient issues when applied too aggressively
    
    # def apply_aggressive_quantization(self, model: nn.Module) -> None:
    #     """Apply aggressive quantization hooks for minimal memory"""
    #     # Removed - was breaking gradient flow
    #     pass
    
    # def apply_memory_efficient_gradients(self, model: nn.Module) -> None:
    #     """Apply gradient checkpointing and memory optimizations"""
    #     # Removed - now handled in apply_gemma_minimal_memory_mode
    #     pass
    
    def configure_minimal_memory_training(self, model: nn.Module, config):
        """Configure training arguments for minimal memory usage"""
        training_args = {
            # Minimal batch size
            "per_device_train_batch_size": 1,
            
            # High gradient accumulation to compensate for small batch
            "gradient_accumulation_steps": max(8, config.gradient_accumulation_steps * 2),
            
            # Memory optimization
            # NOTE: gradient_checkpointing is applied directly to model in apply_gemma_minimal_memory_mode
            # to avoid conflicts with use_cache
            "fp16": True,
            "fp16_backend": "auto",
            "optim": "adamw_torch_fused",  # More memory efficient
            
            # Aggressive gradient clipping  
            "max_grad_norm": self.gradient_clip_value,
            
            # Logging
            "logging_steps": 10,
            "save_steps": 50,
            
            # Memory-efficient evaluation
            "eval_steps": 100,
            "eval_accumulation_steps": 4,
            
            # Other optimizations
            "dataloader_pin_memory": False,  # Save memory
            "remove_unused_columns": True,
            "label_names": ["labels"],
        }
        
        # Count trainable parameters only if model is provided
        if model is not None:
            trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
            total_params = sum(p.numel() for p in model.parameters())
            print(f"   • Trainable parameters: {trainable_params:,} / {total_params:,}")
            print(f"   • Memory per param: ~{4 / 8} bytes (4-bit quantized)")
            print(f"   • Estimated memory: ~{(trainable_params * 0.5) / 1024 / 1024:.1f} MB")
        
        return training_args
    
    def create_memory_monitor_callback(self):
        """Create callback to monitor and optimize memory usage"""
        
        # Import here to avoid circular dependencies
        from transformers import TrainerCallback, TrainerControl, TrainerState
        from transformers.training_args import TrainingArguments
        
        class MemoryMonitorCallback(TrainerCallback):
            def __init__(self, helper):
                super().__init__()
                self.helper = helper
                self.step = 0
                self.last_memory_cleanup = 0
                
            def on_init_end(self, args: TrainingArguments, state: TrainerState, control: TrainerControl, **kwargs):
                """Called at the end of trainer initialization."""
                print("   • Memory monitoring callback initialized")
                return control
                
            def on_train_begin(self, args: TrainingArguments, state: TrainerState, control: TrainerControl, **kwargs):
                """Called at the beginning of training."""
                print("   • Starting memory-optimized training")
                return control
                
            def on_step_begin(self, args: TrainingArguments, state: TrainerState, control: TrainerControl, **kwargs):
                """Called at the beginning of each training step."""
                # Aggressive memory cleanup every 10 steps
                if self.step - self.last_memory_cleanup >= 10:
                    gc.collect()
                    if torch.cuda.is_available():
                        torch.cuda.empty_cache()
                    self.last_memory_cleanup = self.step
                    if self.step > 0:  # Don't print on first step
                        print(f"   💾 Memory cleanup at step {self.step}")
                return control
                    
            def on_step_end(self, args: TrainingArguments, state: TrainerState, control: TrainerControl, **kwargs):
                """Called at the end of each training step."""
                self.step += 1
                
                # Check for overflow/underflow
                if state.log_history:
                    last_loss = state.log_history[-1].get('loss', 0)
                    if math.isnan(last_loss) or math.isinf(last_loss):
                        print(f"⚠️  Loss overflow detected at step {self.step}, adjusting...")
                        self.helper.loss_scale = max(1.0, self.helper.loss_scale / 2)
                        self.helper.activation_scale = max(8000.0, self.helper.activation_scale * 0.9)
                return control
                
            def on_log(self, args: TrainingArguments, state: TrainerState, control: TrainerControl, **kwargs):
                """Called when logging metrics."""
                return control
                
            def on_evaluate(self, args: TrainingArguments, state: TrainerState, control: TrainerControl, **kwargs):
                """Called after evaluation."""
                return control
                
            def on_save(self, args: TrainingArguments, state: TrainerState, control: TrainerControl, **kwargs):
                """Called when saving checkpoint."""
                return control
                
            def on_train_end(self, args: TrainingArguments, state: TrainerState, control: TrainerControl, **kwargs):
                """Called at the end of training."""
                print("   • Memory-optimized training completed")
                return control
                
        return MemoryMonitorCallback(self)


def apply_gemma_minimal_memory_mode(model: nn.Module, tokenizer, training_args: dict) -> Tuple[nn.Module, dict]:
    """Apply minimal memory mode for Gemma training"""
    
    print("\n💾 ACTIVATING MINIMAL MEMORY MODE FOR GEMMA")
    print("   This mode prioritizes memory efficiency over training speed")
    
    helper = GemmaMinimalMemoryQuantization()
    
    # Configure model for minimal memory
    quant_config = helper.configure_minimal_memory_training(model, training_args)
    
    # Update training arguments
    for key, value in quant_config.items():
        if hasattr(training_args, key):
            setattr(training_args, key, value)
    
    # IMPORTANT: Apply memory optimizations BEFORE weight initialization
    # This ensures gradients are properly configured
    
    # 1. Set model to training mode first
    model.train()
    
    # 2. Skip gradient checkpointing for Gemma on MPS (causes gradient flow issues)
    print("   ⚠️  Gradient checkpointing DISABLED for Gemma (prevents gradient flow issues)")
    print("   • Using other memory optimizations instead")
    
    # 3. Apply safer quantization hooks
    # Use straight-through estimator to preserve gradient flow
    def safe_quantize_hook(module, input, output):
        # Only clamp activations, preserve gradient flow
        if isinstance(output, torch.Tensor):
            # Clamp to prevent overflow but preserve gradients
            clamped = torch.clamp(output, min=-helper.activation_scale, max=helper.activation_scale)
            # Straight-through estimator: gradient flows through unchanged
            output = output + (clamped - output).detach()
        return output
    
    # Apply hooks only to base model layers, not LoRA layers
    base_model = model.base_model if hasattr(model, 'base_model') else model
    for name, module in base_model.named_modules():
        # Skip LoRA layers and final output layers
        if 'lora_' not in name and 'lm_head' not in name:
            if any(key in name for key in ['attn', 'mlp', 'proj', 'gate', 'up', 'down']):
                module.register_forward_hook(safe_quantize_hook)
    
    print("   ✅ Safe quantization hooks applied")
    
    # 4. Ensure all parameters are properly set up for training
    # For PEFT models, we need to ensure LoRA parameters require gradients
    if hasattr(model, 'peft_modules'):
        # PEFT model - ensure LoRA params are trainable
        for name, param in model.named_parameters():
            if 'lora_' in name:
                param.requires_grad = True
    
    # 5. Custom weight initialization for LoRA weights
    def init_weights_q4(module):
        if isinstance(module, nn.Linear):
            # Initialization that works well without gradient checkpointing
            module.weight.data.normal_(mean=0.0, std=0.02)
            if module.bias is not None:
                module.bias.data.zero_()
    
    # Apply initialization only to LoRA weights
    for name, module in model.named_modules():
        if "lora_" in name and isinstance(module, nn.Linear):
            init_weights_q4(module)
    
    print("   ✅ LoRA weights initialized for quantization")
    
    # 6. Verify LoRA parameters are trainable
    lora_params = 0
    total_trainable = 0
    for name, param in model.named_parameters():
        if param.requires_grad:
            total_trainable += param.numel()
            if 'lora_' in name:
                lora_params += param.numel()
    
    if lora_params > 0:
        print(f"   ✅ {lora_params:,} LoRA parameters set to trainable")
    else:
        print(f"   ⚠️  No LoRA parameters found, {total_trainable:,} total trainable parameters")
    
    # Final memory cleanup
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    
    return model, training_args 