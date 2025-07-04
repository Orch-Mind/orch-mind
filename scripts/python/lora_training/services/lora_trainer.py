# SPDX-License-Identifier: MIT OR Apache-2.0
"""
LoRA trainer service implementation
"""

import os
import sys
import tempfile
from typing import List, Dict, Any, Optional
from interfaces.i_lora_trainer import ILoRATrainer
from interfaces.i_progress_reporter import IProgressReporter
from models.training_config import TrainingConfig
from services.hardware_detector import HardwareDetector


class LoRATrainer(ILoRATrainer):
    """Concrete implementation of LoRA training."""
    
    def __init__(self, progress_reporter: IProgressReporter):
        self.progress_reporter = progress_reporter
        self.training_info = {}
        self.hardware_detector = HardwareDetector()
    
    def validate_dependencies(self) -> bool:
        """Validate that required dependencies are available."""
        required_packages = [
            "torch", "transformers", "peft", "datasets", 
            "accelerate", "safetensors", "numpy", "tqdm"
        ]
        
        missing_deps = []
        for package in required_packages:
            try:
                __import__(package.replace('-', '_'))
                print(f"   ✓ {package}")
            except ImportError:
                missing_deps.append(package)
                print(f"   ❌ {package} not found")
        
        if missing_deps:
            print(f"📦 Installing {len(missing_deps)} packages...")
            try:
                import subprocess
                subprocess.check_call([
                    sys.executable, "-m", "pip", "install", "-q"
                ] + missing_deps)
                print("✅ Dependencies installed!")
                return True
            except Exception as e:
                print(f"❌ Failed to install dependencies: {e}")
                return False
        
        return True
    
    def train(self, config: Any, training_data: List[Dict[str, Any]]) -> Optional[str]:
        """Train LoRA adapter with memory optimization."""
        try:
            # Validate dependencies first
            if not self.validate_dependencies():
                return None
            
            # Import required libraries
            import torch
            from transformers import (
                AutoTokenizer, AutoModelForCausalLM, 
                TrainingArguments, Trainer, DataCollatorForLanguageModeling,
                TrainerCallback
            )
            from peft import (
                LoraConfig, get_peft_model, TaskType, 
                prepare_model_for_kbit_training
            )
            from datasets import Dataset
            import gc
            
            # Memory optimization: Clear any existing CUDA cache
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            gc.collect()
            
            # Progress callback class
            class ProgressCallback(TrainerCallback):
                def __init__(self, progress_reporter: IProgressReporter, max_steps: int):
                    self.progress_reporter = progress_reporter
                    self.max_steps = max_steps
                    self.current_step = 0
                    
                def on_step_end(self, args, state, control, **kwargs):
                    self.current_step = state.global_step
                    
                    # Report progress with different messages based on training phase
                    if self.current_step <= self.max_steps * 0.1:
                        message = f"Training step {self.current_step}/{self.max_steps}"
                        phase = "warmup"
                    elif self.current_step <= self.max_steps * 0.8:
                        message = f"Training step {self.current_step}/{self.max_steps}"
                        phase = "main"
                    else:
                        message = f"Training step {self.current_step}/{self.max_steps}"
                        phase = "fine-tuning"
                    
                    self.progress_reporter.report_progress(
                        self.current_step, self.max_steps, message, phase
                    )
                    
                    # Memory cleanup every 10 steps
                    if self.current_step % 10 == 0:
                        if torch.cuda.is_available():
                            torch.cuda.empty_cache()
                        gc.collect()
                    
                def on_train_end(self, args, state, control, **kwargs):
                    self.progress_reporter.report_progress(
                        self.max_steps, self.max_steps, "Training completed, saving adapter"
                    )
                    
                    # Final memory cleanup
                    if torch.cuda.is_available():
                        torch.cuda.empty_cache()
                    gc.collect()
            
            # Get hardware-optimized configuration
            self.hardware_detector.print_hardware_info()
            hw_config = self.hardware_detector.get_optimal_config(config.hf_model_name)
            
            # Validate MPS if available
            if hw_config.device_type == "mps":
                if not self.hardware_detector.validate_mps_compatibility():
                    print("⚠️  MPS validation failed, falling back to CPU")
                    hw_config = self.hardware_detector._get_cpu_config(config.hf_model_name)
            
            # Load model and tokenizer with hardware-optimized settings
            self.progress_reporter.report_progress(5, config.max_steps, f"Loading base model (optimized for {hw_config.device_type.upper()})")
            
            print(f"📥 Loading model: {config.hf_model_name}")
            print(f"🔧 Hardware config: {hw_config.device_type.upper()}, dtype: {hw_config.torch_dtype}")
            
            tokenizer = AutoTokenizer.from_pretrained(config.hf_model_name, trust_remote_code=True)
            
            # Convert torch_dtype string to actual dtype
            if hw_config.torch_dtype == "float16":
                model_dtype = torch.float16
            elif hw_config.torch_dtype == "bfloat16":
                model_dtype = torch.bfloat16
            else:
                model_dtype = torch.float32
            
            # Load model with hardware-optimized settings
            model = AutoModelForCausalLM.from_pretrained(
                config.hf_model_name,
                torch_dtype=model_dtype,
                device_map=hw_config.device_map,
                trust_remote_code=True,
                load_in_8bit=hw_config.load_in_8bit,
                low_cpu_mem_usage=hw_config.low_cpu_mem_usage,
            )
            
            # Add padding token if missing
            if tokenizer.pad_token is None:
                tokenizer.pad_token = tokenizer.eos_token
                tokenizer.pad_token_id = tokenizer.eos_token_id
            
            tokenizer.padding_side = "right"
            
            # Prepare model for training
            self.progress_reporter.report_progress(
                20, config.max_steps, 
                f"Configuring LoRA adapters (r={config.lora_rank}, α={config.lora_alpha})"
            )
            
            model = prepare_model_for_kbit_training(model)
            
            # Get optimized target modules for this model
            optimized_target_modules = self.hardware_detector.get_target_modules_for_model(config.hf_model_name)
            target_modules = config.target_modules if config.target_modules else optimized_target_modules
            
            print(f"🎯 Target modules: {target_modules}")
            
            # Configure LoRA with hardware-optimized settings
            lora_config = LoraConfig(
                r=config.lora_rank,
                lora_alpha=config.lora_alpha,
                target_modules=target_modules,
                lora_dropout=config.lora_dropout,
                bias="none",
                task_type=TaskType.CAUSAL_LM,
            )
            
            # Apply LoRA to model
            self.progress_reporter.report_progress(25, config.max_steps, "Setting up PEFT neural pathways")
            model = get_peft_model(model, lora_config)
            
            # Ensure gradients are enabled for LoRA parameters
            for name, param in model.named_parameters():
                if 'lora_' in name:
                    param.requires_grad = True
            
            model.print_trainable_parameters()
            
            # Memory cleanup after model setup
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            gc.collect()
            
            # Prepare dataset
            self.progress_reporter.report_progress(30, config.max_steps, "Tokenizing training data")
            
            dataset = Dataset.from_list(training_data)
            dataset = dataset.map(self._format_instruction)
            
            # Tokenize dataset
            tokenized_dataset = dataset.map(
                lambda examples: self._tokenize_function(examples, tokenizer),
                batched=True,
                remove_columns=dataset.column_names
            )
            
            # Get optimized batch size
            optimized_batch_size = self.hardware_detector.get_recommended_batch_size(config.batch_size, config.hf_model_name)
            
            print(f"📊 Batch size: {config.batch_size} → {optimized_batch_size} (hardware optimized)")
            print(f"🔧 FP16 Trainer: {hw_config.use_fp16_trainer} (MPS uses model-level float16 instead)")
            
            # Training arguments with hardware-optimized settings
            training_args = TrainingArguments(
                output_dir=os.path.join(config.output_dir, "training_output"),
                num_train_epochs=config.num_epochs,
                max_steps=config.max_steps,
                per_device_train_batch_size=optimized_batch_size,
                gradient_accumulation_steps=config.gradient_accumulation_steps,
                warmup_steps=config.warmup_steps,
                learning_rate=config.learning_rate,
                fp16=hw_config.use_fp16_trainer,  # Use hardware-optimized fp16 setting
                logging_steps=config.logging_steps,
                optim=config.optim,
                weight_decay=config.weight_decay,
                lr_scheduler_type=config.lr_scheduler_type,
                save_steps=config.save_steps,
                save_total_limit=1,
                report_to=None,
                dataloader_num_workers=hw_config.dataloader_num_workers,
                remove_unused_columns=False,
                dataloader_pin_memory=hw_config.dataloader_pin_memory,
                gradient_checkpointing=hw_config.gradient_checkpointing,
            )
            
            # Data collator
            data_collator = DataCollatorForLanguageModeling(
                tokenizer=tokenizer,
                mlm=False,
                pad_to_multiple_of=8,
            )
            
            # Create trainer with progress callback
            progress_callback = ProgressCallback(self.progress_reporter, config.max_steps)
            trainer = Trainer(
                model=model,
                args=training_args,
                train_dataset=tokenized_dataset,
                data_collator=data_collator,
                callbacks=[progress_callback],
            )
            
            # Train the model
            self.progress_reporter.report_progress(35, config.max_steps, "Starting LoRA training process")
            trainer.train()
            
            # Memory cleanup after training
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            gc.collect()
            
            # Save the adapter
            self.progress_reporter.report_progress(95, config.max_steps, "Saving adapter weights")
            adapter_dir = os.path.join(config.output_dir, "lora_adapter")
            os.makedirs(adapter_dir, exist_ok=True)
            
            trainer.save_model(adapter_dir)
            tokenizer.save_pretrained(adapter_dir)
            
            # Clear trainer and model from memory
            del trainer
            del model
            del tokenized_dataset
            del dataset
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            gc.collect()
            
            self.training_info = {
                "adapter_path": adapter_dir,
                "training_steps": config.max_steps,
                "training_examples": len(training_data),
                "model_parameters": "N/A",  # Avoid keeping model reference
                "trainable_parameters": "N/A"  # Avoid keeping model reference
            }
            
            print(f"💾 LoRA adapter saved: {adapter_dir}")
            print(f"🧹 Memory cleaned up after training")
            return adapter_dir
            
        except Exception as e:
            self.progress_reporter.report_error(f"Training failed: {str(e)}")
            print(f"❌ Training error: {e}")
            import traceback
            traceback.print_exc()
            
            # Emergency memory cleanup
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            gc.collect()
            
            return None
    
    def get_training_info(self) -> Dict[str, Any]:
        """Get information about the training process."""
        return self.training_info
    
    def _format_instruction(self, example: Dict[str, Any]) -> Dict[str, str]:
        """Format instruction for training."""
        if example["input"]:
            text = f"### Instruction:\n{example['instruction']}\n\n### Input:\n{example['input']}\n\n### Response:\n{example['output']}"
        else:
            text = f"### Instruction:\n{example['instruction']}\n\n### Response:\n{example['output']}"
        return {"text": text}
    
    def _tokenize_function(self, examples: Dict[str, Any], tokenizer) -> Dict[str, Any]:
        """Tokenize examples for training."""
        texts = examples["text"] if isinstance(examples["text"], list) else [examples["text"]]
        
        tokenized = tokenizer(
            texts,
            padding=True,
            truncation=True,
            max_length=512,
            return_overflowing_tokens=False,
            add_special_tokens=True,
            return_tensors=None,
        )
        
        # Add labels (copy of input_ids for causal LM)
        tokenized["labels"] = tokenized["input_ids"].copy()
        
        return tokenized 