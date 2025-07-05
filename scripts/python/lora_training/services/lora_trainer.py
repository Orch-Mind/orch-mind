# SPDX-License-Identifier: MIT OR Apache-2.0
"""
LoRA trainer service implementation
"""

import os
import sys
import tempfile
import json
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
    
    def count_training_examples(self, training_data: List[Dict[str, Any]]) -> int:
        """Count valid training examples in the dataset."""
        valid_examples = 0
        for example in training_data:
            # Check if example has required fields and non-empty content
            if (isinstance(example, dict) and 
                'instruction' in example and 
                'output' in example and
                example['instruction'].strip() and 
                example['output'].strip()):
                valid_examples += 1
        return valid_examples
    
    def calculate_smart_hyperparameters(self, config: Any, num_examples: int) -> Dict[str, Any]:
        """
        Calculate intelligent hyperparameters based on dataset size.
        
        This prevents overfitting in small datasets by:
        - Reducing training steps for small datasets
        - Using conservative learning rates
        - Adjusting other parameters proportionally
        """
        
        print(f"\n🧠 Smart Hyperparameter Calculation")
        print(f"📊 Dataset size: {num_examples} examples")
        
        # Calculate effective batch size (considering gradient accumulation)
        effective_batch_size = config.batch_size * config.gradient_accumulation_steps
        
        # Determine dataset category and optimal parameters
        if num_examples <= 5:
            # Very small datasets (testing/debugging)
            category = "Very Small (Testing)"
            epochs_multiplier = 1  # Just 1 epoch
            learning_rate = 1e-5   # Very conservative
            warmup_ratio = 0.0     # No warmup needed
            save_ratio = 1.0       # Save at the end
            
        elif num_examples <= 20:
            # Small datasets
            category = "Small"
            epochs_multiplier = 2  # 2 epochs
            learning_rate = 2e-5   # Conservative
            warmup_ratio = 0.1     # Minimal warmup
            save_ratio = 0.5       # Save halfway and end
            
        elif num_examples <= 100:
            # Medium datasets
            category = "Medium"
            epochs_multiplier = 3  # 3 epochs
            learning_rate = 5e-5   # Moderate
            warmup_ratio = 0.1     # Standard warmup
            save_ratio = 0.3       # Save more frequently
            
        else:
            # Large datasets
            category = "Large"
            epochs_multiplier = None  # Use original config
            learning_rate = config.learning_rate  # Use original
            warmup_ratio = 0.1     # Standard warmup
            save_ratio = 0.2       # Save frequently
        
        # Calculate optimal steps
        if epochs_multiplier is not None:
            # For small/medium datasets: calculate based on examples and epochs
            steps_per_epoch = max(1, num_examples // effective_batch_size)
            optimal_max_steps = steps_per_epoch * epochs_multiplier
            optimal_max_steps = max(1, optimal_max_steps)  # At least 1 step
        else:
            # For large datasets: use original config
            optimal_max_steps = config.max_steps
        
        # Calculate proportional parameters
        optimal_warmup_steps = max(1, int(optimal_max_steps * warmup_ratio))
        optimal_save_steps = max(1, int(optimal_max_steps * save_ratio))
        optimal_logging_steps = max(1, min(10, optimal_max_steps // 4))
        
        # Ensure save_steps doesn't exceed max_steps
        optimal_save_steps = min(optimal_save_steps, optimal_max_steps)
        
        # Prepare results
        smart_params = {
            'max_steps': optimal_max_steps,
            'learning_rate': learning_rate,
            'warmup_steps': optimal_warmup_steps,
            'save_steps': optimal_save_steps,
            'logging_steps': optimal_logging_steps,
            'num_epochs': epochs_multiplier if epochs_multiplier else config.num_epochs
        }
        
        # Report the decisions
        print(f"📋 Dataset Category: {category}")
        print(f"🎯 Optimal Configuration:")
        print(f"   • Max Steps: {config.max_steps} → {optimal_max_steps}")
        print(f"   • Learning Rate: {config.learning_rate} → {learning_rate}")
        print(f"   • Warmup Steps: {config.warmup_steps} → {optimal_warmup_steps}")
        print(f"   • Save Steps: {config.save_steps} → {optimal_save_steps}")
        print(f"   • Logging Steps: {config.logging_steps} → {optimal_logging_steps}")
        
        if num_examples <= 5:
            print(f"⚠️  Very small dataset detected!")
            print(f"   • Using minimal training to prevent overfitting")
            print(f"   • Model will see each example only {epochs_multiplier} time(s)")
            print(f"   • Conservative learning rate to preserve base knowledge")
        elif num_examples <= 20:
            print(f"📝 Small dataset detected - using conservative approach")
        elif num_examples <= 100:
            print(f"📊 Medium dataset - balanced training configuration")
        else:
            print(f"🚀 Large dataset - using optimized configuration")
        
        return smart_params
    
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
        """Train LoRA adapter with memory optimization and smart hyperparameters."""
        try:
            # Validate dependencies first
            if not self.validate_dependencies():
                return None
            
            # Count training examples and calculate smart hyperparameters
            num_examples = self.count_training_examples(training_data)
            smart_params = self.calculate_smart_hyperparameters(config, num_examples)
            
            # Apply smart hyperparameters to config
            config.max_steps = smart_params['max_steps']
            config.learning_rate = smart_params['learning_rate']
            config.warmup_steps = smart_params['warmup_steps']
            config.save_steps = smart_params['save_steps']
            config.logging_steps = smart_params['logging_steps']
            
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
            
            # Enhanced Progress callback class with real training progress
            class ProgressCallback(TrainerCallback):
                def __init__(self, progress_reporter: IProgressReporter, base_progress: int = 25, training_range: int = 65):
                    """
                    Initialize progress callback with coordinated ranges.
                    
                    Args:
                        progress_reporter: Progress reporter instance
                        base_progress: Progress already completed by orchestrator (default 25%)
                        training_range: Range allocated for training phase (default 65%, so 25-90%)
                    """
                    self.progress_reporter = progress_reporter
                    self.base_progress = base_progress
                    self.training_range = training_range
                    self.max_progress = base_progress + training_range  # 90%
                    self.current_step = 0
                    self.max_steps = 0
                    self.current_epoch = 0
                    self.total_epochs = 0
                    
                def on_train_begin(self, args, state, control, **kwargs):
                    """Called at the beginning of training."""
                    self.max_steps = state.max_steps
                    self.total_epochs = args.num_train_epochs
                    
                    self.progress_reporter.report_progress(
                        self.base_progress, 100,
                        f"Training started: {self.max_steps} steps, {self.total_epochs} epochs",
                        "training_start"
                    )
                    
                def on_epoch_begin(self, args, state, control, **kwargs):
                    """Called at the beginning of each epoch."""
                    self.current_epoch = int(state.epoch) + 1
                    
                    # Calculate progress based on epoch
                    epoch_progress = (state.epoch / self.total_epochs) * self.training_range
                    current_progress = self.base_progress + epoch_progress
                    
                    self.progress_reporter.report_progress(
                        current_progress, 100,
                        f"Epoch {self.current_epoch}/{self.total_epochs} starting",
                        "epoch_start"
                    )
                    
                def on_step_end(self, args, state, control, **kwargs):
                    """Called at the end of each training step with real progress."""
                    self.current_step = state.global_step
                    
                    # Calculate real progress based on actual training steps
                    step_progress = (state.global_step / state.max_steps) * self.training_range
                    current_progress = min(self.max_progress, self.base_progress + step_progress)
                    
                    # Get current epoch info
                    current_epoch = int(state.epoch) + 1 if hasattr(state, 'epoch') else 1
                    
                    # Format message with step and epoch info
                    message = f"Step {self.current_step}/{self.max_steps} (Epoch {current_epoch}/{self.total_epochs})"
                    
                    # Add loss information if available
                    if hasattr(state, 'log_history') and state.log_history:
                        last_log = state.log_history[-1]
                        if 'train_loss' in last_log:
                            loss_value = last_log['train_loss']
                            message += f" - Loss: {loss_value:.4f}"
                    
                    # Determine training phase
                    progress_ratio = state.global_step / state.max_steps
                    if progress_ratio <= 0.1:
                        phase = "warmup"
                    elif progress_ratio <= 0.8:
                        phase = "main_training"
                    else:
                        phase = "fine_tuning"
                    
                    self.progress_reporter.report_progress(
                        current_progress, 100, message, phase
                    )
                    
                    # Memory cleanup every 10 steps
                    if self.current_step % 10 == 0:
                        if torch.cuda.is_available():
                            torch.cuda.empty_cache()
                        gc.collect()
                    
                def on_epoch_end(self, args, state, control, **kwargs):
                    """Called at the end of each epoch."""
                    current_epoch = int(state.epoch)
                    
                    # Calculate progress based on completed epochs
                    epoch_progress = (current_epoch / self.total_epochs) * self.training_range
                    current_progress = self.base_progress + epoch_progress
                    
                    # Add epoch completion info
                    message = f"Epoch {current_epoch}/{self.total_epochs} completed"
                    
                    # Add loss information if available
                    if hasattr(state, 'log_history') and state.log_history:
                        last_log = state.log_history[-1]
                        if 'train_loss' in last_log:
                            loss_value = last_log['train_loss']
                            message += f" - Final Loss: {loss_value:.4f}"
                    
                    self.progress_reporter.report_progress(
                        current_progress, 100, message, "epoch_complete"
                    )
                    
                def on_train_end(self, args, state, control, **kwargs):
                    """Called at the end of training."""
                    self.progress_reporter.report_progress(
                        self.max_progress, 100, 
                        f"Training completed: {state.global_step} steps in {int(state.epoch)} epochs",
                        "training_complete"
                    )
                    
                    # Final memory cleanup
                    if torch.cuda.is_available():
                        torch.cuda.empty_cache()
                    gc.collect()
                    
                def on_log(self, args, state, control, logs=None, **kwargs):
                    """Called when logging occurs - capture detailed metrics."""
                    if logs and 'train_loss' in logs:
                        # Calculate current progress
                        step_progress = (state.global_step / state.max_steps) * self.training_range
                        current_progress = min(self.max_progress, self.base_progress + step_progress)
                        
                        # Create detailed message with metrics
                        message = f"Step {state.global_step}/{state.max_steps}"
                        
                        if 'train_loss' in logs:
                            message += f" - Loss: {logs['train_loss']:.4f}"
                        if 'learning_rate' in logs:
                            message += f" - LR: {logs['learning_rate']:.2e}"
                        if 'epoch' in logs:
                            message += f" - Epoch: {logs['epoch']:.2f}"
                            
                        self.progress_reporter.report_progress(
                            current_progress, 100, message, "training_metrics"
                        )
            
            # Get hardware-optimized configuration
            self.hardware_detector.print_hardware_info()
            hw_config = self.hardware_detector.get_optimal_config(config.hf_model_name)
            
            # Validate MPS if available
            if hw_config.device_type == "mps":
                if not self.hardware_detector.validate_mps_compatibility():
                    print("⚠️  MPS validation failed, falling back to CPU")
                    hw_config = self.hardware_detector._get_cpu_config(config.hf_model_name)
            
            # Load model and tokenizer with hardware-optimized settings
            # Note: progress_reporter is used here but range is coordinated with orchestrator
            self.progress_reporter.report_progress(20, 100, f"Loading base model (optimized for {hw_config.device_type.upper()})", "model_loading")
            
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
                22, 100, 
                f"Configuring LoRA adapters (r={config.lora_rank}, α={config.lora_alpha})",
                "lora_setup"
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
            self.progress_reporter.report_progress(23, 100, "Setting up PEFT neural pathways", "peft_setup")
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
            
            # Prepare dataset with progress reporting
            self.progress_reporter.report_progress(24, 100, "Preparing training dataset", "data_preparation")
            
            dataset = Dataset.from_list(training_data)
            dataset = dataset.map(self._format_instruction)
            
            # Tokenize dataset with progress
            self.progress_reporter.report_progress(25, 100, "Tokenizing training data", "tokenization")
            
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
            
            # Create trainer with enhanced progress callback
            # Progress range: 25-90% allocated for training
            progress_callback = ProgressCallback(self.progress_reporter, base_progress=25, training_range=65)
            trainer = Trainer(
                model=model,
                args=training_args,
                train_dataset=tokenized_dataset,
                data_collator=data_collator,
                callbacks=[progress_callback],
            )
            
            # Train the model - progress will be reported by the callback
            self.progress_reporter.report_progress(25, 100, "Starting LoRA training process", "training_start")
            trainer.train()
            
            # Memory cleanup after training
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            gc.collect()
            
            # Save the adapter
            self.progress_reporter.report_progress(90, 100, "Saving adapter weights", "saving")
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