# SPDX-License-Identifier: MIT OR Apache-2.0
"""
Training orchestrator - Main coordination logic
"""

import os
import sys
import shutil
from datetime import datetime
from typing import Optional, Dict, Any, List
from pathlib import Path

# Add the interfaces directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'interfaces'))
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'services'))
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'models'))

from i_progress_reporter import IProgressReporter
from i_ollama_service import IOllamaService
from i_model_mapper import IModelMapper
from i_training_data_processor import ITrainingDataProcessor
from i_lora_trainer import ILoRATrainer
from i_adapter_manager import IAdapterManager
from i_deployment_service import IDeploymentService
from memory_monitor import MemoryMonitor, monitor_memory_usage
from progress_info import ProgressInfo
from adapter_info import AdapterInfo
from models.training_config import TrainingConfig


class TrainingOrchestrator:
    """Main orchestrator for LoRA training pipeline."""
    
    def __init__(self,
                 progress_reporter: IProgressReporter,
                 ollama_service: IOllamaService,
                 model_mapper: IModelMapper,
                 data_processor: ITrainingDataProcessor,
                 lora_trainer: ILoRATrainer,
                 adapter_manager: IAdapterManager,
                 deployment_service: IDeploymentService):
        """Initialize the training orchestrator with memory monitoring."""
        self.progress_reporter = progress_reporter
        self.ollama_service = ollama_service
        self.model_mapper = model_mapper
        self.data_processor = data_processor
        self.lora_trainer = lora_trainer
        self.adapter_manager = adapter_manager
        self.deployment_service = deployment_service
        
        # Initialize memory monitor
        self.memory_monitor = MemoryMonitor(warning_threshold=0.85, critical_threshold=0.95)
        
        # Show initial memory status and recommendations
        print("🧠 Memory Monitor initialized")
        self.memory_monitor.monitor_training_phase("initialization")
        
        # Show recommendations for memory optimization
        recommendations = self.memory_monitor.get_memory_recommendations()
        if recommendations:
            print("💡 Memory optimization recommendations:")
            for rec in recommendations:
                print(f"   • {rec}")
    
    def execute_training_pipeline(self, config: Any) -> Optional[Any]:
        """Execute the complete LoRA training pipeline with memory monitoring."""
        try:
            print(f"\n🚀 STARTING LORA TRAINING PIPELINE")
            print(f"   • Base Model: {config.base_model}")
            print(f"   • Output Name: {config.output_name}")
            print(f"   • Max Steps: {config.max_steps}")
            print(f"   • Data File: {config.data_file}")
            
            # Initial memory check
            self.memory_monitor.monitor_training_phase("pipeline start")
            
            # PHASE 1: Setup and Preparation (0-20%)
            # Step 1: Validate configuration
            self.progress_reporter.report_progress(2, 100, "Validating configuration", "setup")
            if not self._validate_config(config):
                return None
            
            # Step 2: Load and process training data
            self.progress_reporter.report_progress(5, 100, "Loading training data", "data_loading")
            training_data = self.data_processor.load_data(config.data_file)
            if not training_data:
                self.progress_reporter.report_error("Failed to load training data")
                return None
            
            print(f"📊 Loaded {len(training_data)} training examples")
            
            # Validate and format data
            self.progress_reporter.report_progress(8, 100, "Validating training data", "data_validation")
            if not self.data_processor.validate_data(training_data):
                self.progress_reporter.report_error("Training data validation failed")
                return None
            
            self.progress_reporter.report_progress(12, 100, "Formatting training data", "data_formatting")
            formatted_data = self.data_processor.format_data(training_data)
            if not formatted_data:
                self.progress_reporter.report_error("Failed to format training data")
                return None
            
            # Memory check after data loading
            self.memory_monitor.monitor_training_phase("after data loading")
            
            # Step 3: Get HuggingFace model name
            self.progress_reporter.report_progress(15, 100, "Mapping model configuration", "model_mapping")
            hf_model_name = self.model_mapper.get_huggingface_model_name(config.base_model)
            if not hf_model_name:
                self.progress_reporter.report_error(f"Unsupported model: {config.base_model}")
                return None
            
            print(f"🤗 HuggingFace Model: {hf_model_name}")
            
            # Step 4: Deploy base model if needed
            self.progress_reporter.report_progress(18, 100, "Deploying base model", "model_deployment")
            deployed_model_name = self._deploy_base_model_if_needed(config, hf_model_name)
            if not deployed_model_name:
                return None
            
            # Memory check after deployment
            self.memory_monitor.monitor_training_phase("after base model deployment")
            
            # PHASE 2: LoRA Training (20-90%)
            # Note: This range is handled by LoRATrainer's ProgressCallback
            self.progress_reporter.report_progress(20, 100, "Initializing LoRA training", "training_init")
            
            # Create training config
            training_config = self._create_training_config(config, hf_model_name)
            
            # Train the adapter with memory monitoring
            # LoRATrainer will handle progress reporting from 20% to 90%
            adapter_path = self.lora_trainer.train(training_config, formatted_data)
            if not adapter_path:
                self.progress_reporter.report_error("LoRA training failed")
                return None
            
            # Memory cleanup after training
            self.memory_monitor.monitor_training_phase("after LoRA training")
            self.memory_monitor.cleanup_memory(aggressive=True)
            
            # PHASE 3: Finalization (90-100%)
            # Step 6: Merge and deploy final model
            self.progress_reporter.report_progress(92, 100, "Merging and deploying final model", "model_finalization")
            
            final_model_name = self._merge_and_deploy_if_unsloth(
                config, hf_model_name, adapter_path, deployed_model_name
            )
            
            if not final_model_name:
                self.progress_reporter.report_error("Failed to merge and deploy final model")
                return None
            
            # Final memory cleanup
            self.memory_monitor.monitor_training_phase("pipeline completion")
            self.memory_monitor.cleanup_memory(aggressive=True)
            
            # Step 7: Create adapter info
            self.progress_reporter.report_progress(96, 100, "Creating adapter metadata", "metadata_creation")
            adapter_info = AdapterInfo.create_new(
                adapter_id=config.output_name,
                base_model=config.base_model,
                hf_model=hf_model_name,
                adapter_path=adapter_path,
                registry_path=adapter_path
            )
            
            # Add additional metadata
            adapter_info.status = "deployed"
            adapter_info.training_method = "memory_optimized_lora"
            
            # Step 8: Register adapter
            self.progress_reporter.report_progress(98, 100, "Registering adapter", "registration")
            registration_success = self.adapter_manager.register_adapter(
                adapter_id=config.output_name,
                base_model=config.base_model,
                hf_model=hf_model_name,
                adapter_path=adapter_path
            )
            
            if registration_success:
                # Final completion
                self.progress_reporter.report_progress(100, 100, "Training pipeline completed successfully", "completion")
                
                print(f"✅ TRAINING PIPELINE COMPLETED SUCCESSFULLY")
                print(f"   • Adapter: {registration_success.adapter_name}")
                print(f"   • Final Model: {final_model_name}")
                print(f"   • Training Steps: {config.max_steps}")
                print(f"   • Training Examples: {len(formatted_data)}")
                print(f"   • Adapter Path: {registration_success.adapter_path}")
                print(f"   • Status: {registration_success.status}")
                
                # Final memory status
                print(f"\n📊 Final memory status:")
                self.memory_monitor.monitor_training_phase("final cleanup")
                
                return registration_success
            else:
                self.progress_reporter.report_error("Failed to register adapter")
                return None
                
        except Exception as e:
            self.progress_reporter.report_error(f"Training pipeline failed: {str(e)}")
            print(f"❌ Training pipeline error: {e}")
            import traceback
            traceback.print_exc()
            
            # Emergency memory cleanup
            self.memory_monitor.cleanup_memory(aggressive=True)
            return None
    
    def _validate_ollama(self, base_model: str) -> bool:
        """Validate Ollama availability and model."""
        print("🔍 Validating Ollama availability...")
        
        if not self.ollama_service.is_available():
            self.progress_reporter.report_error("Ollama not found. Please install Ollama first.")
            return False
        
        if not self.ollama_service.model_exists(base_model):
            print(f"📥 Model {base_model} not found locally. Pulling...")
            if not self.ollama_service.pull_model(base_model):
                self.progress_reporter.report_error(f"Failed to pull model {base_model}")
                return False
        else:
            print(f"✅ Model {base_model} found locally")
        
        return True
    
    def _get_hf_model_mapping(self, config: Any) -> Optional[str]:
        """Get HuggingFace model mapping."""
        print("🔄 Getting model mapping...")
        
        if not self.model_mapper.supports_model(config.base_model):
            self.progress_reporter.report_error(f"Model {config.base_model} not supported")
            return None
        
        hf_model_name = self.model_mapper.get_huggingface_model_name(config.base_model)
        config.hf_model_name = hf_model_name
        
        model_info = self.model_mapper.get_model_info(config.base_model)
        print(f"🔄 Model mapping: {config.base_model} → {hf_model_name}")
        print(f"   • Size: {model_info.get('size', 'Unknown')}")
        print(f"   • Type: {model_info.get('type', 'Unknown')}")
        print(f"   • Is Unsloth: {model_info.get('is_unsloth', False)}")
        
        return hf_model_name
    
    def _deploy_unsloth_model_if_needed(self, config: Any, hf_model_name: str) -> Optional[str]:
        """Deploy Unsloth model to Ollama if needed."""
        # Check if this is a Unsloth model
        if not self.model_mapper.is_unsloth_model(config.base_model):
            print(f"✅ Model {config.base_model} is not Unsloth - using directly")
            return config.base_model
        
        # This is a Unsloth model - need to deploy it
        print(f"🔍 Detected Unsloth model: {hf_model_name}")
        print(f"📋 Deployment required for LoRA adapter compatibility")
        
        if not self.deployment_service:
            self.progress_reporter.report_error("Unsloth deployment service not available")
            return None
        
        deployed_model_name = self.model_mapper.get_deployed_model_name(config.base_model)
        
        # Deploy the Unsloth model
        success = self.deployment_service.deploy_base_model(
            hf_model_name, deployed_model_name
        )
        
        if not success:
            self.progress_reporter.report_error(f"Failed to deploy Unsloth model {hf_model_name}")
            return None
        
        print(f"✅ Unsloth model deployed: {deployed_model_name}")
        print(f"💡 LoRA adapter will be trained for the deployed model")
        
        return deployed_model_name
    
    def _process_training_data(self, config: Any) -> Optional[list]:
        """Process and validate training data."""
        print("📚 Processing training data...")
        
        try:
            # Load data
            raw_data = self.data_processor.load_data(config.data_path)
            
            # Validate data
            if not self.data_processor.validate_data(raw_data):
                self.progress_reporter.report_error("Training data validation failed")
                return None
            
            # Format data
            formatted_data = self.data_processor.format_data(raw_data)
            
            if not formatted_data:
                self.progress_reporter.report_error("No valid training data found")
                return None
            
            return formatted_data
            
        except Exception as e:
            self.progress_reporter.report_error(f"Failed to process training data: {e}")
            return None
    
    def _calculate_optimal_steps(self, config: Any) -> int:
        """Calculate optimal training steps."""
        print("📊 Calculating optimal training steps...")
        
        try:
            optimal_steps, step_calculation = self.data_processor.calculate_optimal_steps(config.data_path)
            return optimal_steps
        except Exception as e:
            print(f"⚠️ Could not calculate optimal steps: {e}")
            return config.max_steps  # Use provided value as fallback
    
    def _setup_output_directory(self, config: Any) -> None:
        """Setup output directory."""
        if not config.output_dir:
            config.output_dir = os.path.join(
                os.path.dirname(config.data_path), "lora_training_output"
            )
        
        os.makedirs(config.output_dir, exist_ok=True)
        print(f"📂 Output directory: {config.output_dir}")
    
    def _train_lora_adapter(self, config: Any, training_data: list, target_model: str) -> Optional[str]:
        """Train the LoRA adapter."""
        print("🔧 Starting LoRA training...")
        print(f"   • Target model for adapter: {target_model}")
        
        # Update config to use the target model (deployed Unsloth model or original)
        original_base_model = config.base_model
        config.base_model = target_model
        
        adapter_path = self.lora_trainer.train(config, training_data)
        
        # Restore original base model in config
        config.base_model = original_base_model
        
        if adapter_path:
            training_info = self.lora_trainer.get_training_info()
            print(f"📊 Training completed:")
            print(f"   • Adapter path: {adapter_path}")
            print(f"   • Training steps: {training_info.get('training_steps', 'N/A')}")
            print(f"   • Training examples: {training_info.get('training_examples', 'N/A')}")
            print(f"   • Target model: {target_model}")
        
        return adapter_path
    
    def _deploy_adapter_using_convert_script(self, config: Any, hf_model_name: str, adapter_path: str, deployed_model_name: str) -> Optional[str]:
        """Deploy adapter using the same convert_lora_to_gguf.py script as the Deploy tab."""
        print(f"\n🔗 ADAPTER DEPLOYMENT USING DEPLOY TAB SCRIPT")
        print(f"   • Adapter Path: {adapter_path}")
        print(f"   • Base Model: {deployed_model_name}")
        print(f"   • Output Model: {config.output_name}")
        print(f"   • Using same script as Deploy tab for consistency")
        
        try:
            import subprocess
            import sys
            
            # Get the path to the convert script (same script used by Deploy tab)
            current_file = os.path.abspath(__file__)
            print(f"🔍 Current file: {current_file}")
            
            # From: /Users/.../orch-mind/scripts/python/lora_training/orchestrator/training_orchestrator.py
            # We need to go up to the orch-mind root directory
            # Try different approaches to find the project root
            convert_script_path = None
            
            # Method 1: Try using get_project_root utility
            try:
                from scripts.python.lora_training.utils import get_project_root
                project_root = get_project_root()
                test_path = os.path.join(project_root, "scripts", "python", "lora_training", "convert_lora_to_gguf.py")
                print(f"🔍 Testing path (get_project_root): {test_path}")
                if os.path.exists(test_path):
                    convert_script_path = test_path
                    print(f"✅ Found via get_project_root: {convert_script_path}")
            except Exception as e:
                print(f"⚠️ get_project_root failed: {e}")
            
            # Method 2: Calculate from current file path
            if not convert_script_path:
                # Go up directories until we find 'scripts' folder
                current_dir = os.path.dirname(current_file)
                for _ in range(10):  # Safety limit
                    parent_dir = os.path.dirname(current_dir)
                    if parent_dir == current_dir:  # Reached filesystem root
                        break
                    
                    test_path = os.path.join(parent_dir, "scripts", "python", "lora_training", "convert_lora_to_gguf.py")
                    print(f"🔍 Testing path (traversal): {test_path}")
                    if os.path.exists(test_path):
                        convert_script_path = test_path
                        project_root = parent_dir
                        print(f"✅ Found via traversal: {convert_script_path}")
                        break
                    current_dir = parent_dir
            
            # Method 3: Absolute path based on known structure
            if not convert_script_path:
                expected_path = "/Users/guilhermeferraribrescia/orch-mind/scripts/python/lora_training/convert_lora_to_gguf.py"
                print(f"🔍 Testing expected path: {expected_path}")
                if os.path.exists(expected_path):
                    convert_script_path = expected_path
                    project_root = "/Users/guilhermeferraribrescia/orch-mind"
                    print(f"✅ Found via expected path: {convert_script_path}")
            
            if not convert_script_path:
                print(f"❌ Convert script not found in any location")
                return None
            
            print(f"📜 Using convert script: {convert_script_path}")
            
            # Extract adapter ID from path (same logic as Deploy tab)
            adapter_id = os.path.basename(adapter_path)
            
            # Build command exactly like Deploy tab does
            deploy_command = [
                sys.executable,
                convert_script_path,
                "--adapter-id", adapter_id,
                "--base-model", deployed_model_name,
                "--output-model", config.output_name
            ]
            
            print(f"🚀 Executing deployment command:")
            print(f"   Command: {' '.join(deploy_command)}")
            
            # Execute the same script that Deploy tab uses
            result = subprocess.run(
                deploy_command,
                capture_output=True,
                text=True,
                timeout=300,  # 5 minutes timeout
                cwd=project_root if 'project_root' in locals() else os.path.dirname(convert_script_path)
            )
            
            if result.returncode == 0:
                print(f"✅ Deployment script succeeded!")
                print(f"   Output: {result.stdout}")
                if result.stderr:
                    print(f"   Warnings: {result.stderr}")
                
                # Return the output model name
                return config.output_name
            else:
                print(f"❌ Deployment script failed!")
                print(f"   Return code: {result.returncode}")
                print(f"   stdout: {result.stdout}")
                print(f"   stderr: {result.stderr}")
                return None
                
        except subprocess.TimeoutExpired:
            print(f"❌ Deployment script timed out")
            return None
        except Exception as e:
            print(f"❌ Error calling deployment script: {e}")
            import traceback
            traceback.print_exc()
            return None

    def _merge_and_deploy_if_unsloth(self, config: Any, hf_model_name: str, adapter_path: str, deployed_model_name: str) -> Optional[str]:
        """Deploy adapter using the same approach as the Deploy tab for consistency."""
        print(f"\n🔗 ADAPTER DEPLOYMENT PROCESS")
        print(f"   • Strategy: Using same script as Deploy tab")
        print(f"   • Adapter Path: {adapter_path}")
        print(f"   • Base Model: {deployed_model_name}")
        
        # Use the same convert script that the Deploy tab uses
        return self._deploy_adapter_using_convert_script(config, hf_model_name, adapter_path, deployed_model_name)
    
    # Legacy GGUF conversion functions removed - now using convert_lora_to_gguf.py script
    # which uses ADAPTER directive instead of merge+GGUF conversion approach
    
    def _register_adapter(self, config: Any, hf_model_name: str, adapter_path: str, target_model: str) -> Optional[Any]:
        """Register the trained adapter."""
        print("📝 Registering LoRA adapter...")
        
        adapter_info = self.adapter_manager.register_adapter(
            adapter_id=config.output_name,
            base_model=target_model,  # Use deployed model as base
            hf_model=hf_model_name,
            adapter_path=adapter_path
        )
        
        # Store additional metadata about the original model
        if adapter_info and hasattr(adapter_info, 'to_dict'):
            adapter_dict = adapter_info.to_dict()
            adapter_dict['original_ollama_model'] = config.base_model
            adapter_dict['deployment_type'] = 'unsloth_deployed' if target_model != config.base_model else 'direct'
        
        return adapter_info
    
    def _save_training_metadata(self, config: Any, adapter_info: Any, data_size: int) -> None:
        """Save training metadata."""
        metadata = {
            "base_model": config.base_model,
            "hf_model": config.hf_model_name,
            "adapter_id": adapter_info.adapter_id,
            "training_examples": data_size,
            "training_steps": config.max_steps,
            "completed_at": datetime.now().isoformat(),
            "training_method": "real_lora_peft",
            "adapter_status": "ready",
            "adapter_enabled": False,
            "deployment_type": getattr(adapter_info, 'deployment_type', 'direct'),
            "config": config.to_dict()
        }
        
        metadata_path = os.path.join(adapter_info.adapter_path, "training_metadata.json")
        import json
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"📊 Training metadata saved: {metadata_path}")
    
    def _report_success(self, config: Any, adapter_info: Any) -> None:
        """Report successful completion."""
        self.progress_reporter.report_completion("LoRA training completed successfully")
        
        print("\n" + "="*60)
        print("🎉 REAL LORA TRAINING COMPLETED!")
        print("="*60)
        print(f"✅ Original Model: {config.base_model}")
        print(f"✅ HuggingFace Model: {config.hf_model_name}")
        print(f"✅ Target Base Model: {adapter_info.base_model}")
        print(f"✅ Adapter ID: {adapter_info.adapter_id}")
        print(f"📂 Adapter Path: {adapter_info.adapter_path}")
        print(f"⏱️ Training Steps: {config.max_steps}")
        print(f"🔌 Status: Ready for Enable/Disable")
        print(f"\n💡 Enable adapter: Use Orch-Mind interface or CLI")
        print(f"📋 Note: Adapter will use ADAPTER directive with {adapter_info.base_model}")
        print("\n🏁 Real LoRA training completed successfully!")
    
    def _create_training_config(self, config: Any, hf_model_name: str) -> TrainingConfig:
        """Create training configuration from input config."""
        return TrainingConfig(
            base_model=config.base_model,
            output_name=config.output_name,
            data_file=config.data_file,
            hf_model_name=hf_model_name,
            output_dir=config.output_dir,
            max_steps=config.max_steps,
            batch_size=config.batch_size,
            learning_rate=config.learning_rate,
            lora_rank=config.lora_rank,
            lora_alpha=config.lora_alpha,
            lora_dropout=config.lora_dropout,
            warmup_steps=config.warmup_steps,
            logging_steps=config.logging_steps,
            save_steps=config.save_steps,
            num_epochs=config.num_epochs,
            gradient_accumulation_steps=config.gradient_accumulation_steps,
            fp16=config.fp16,
            optim=config.optim,
            weight_decay=config.weight_decay,
            lr_scheduler_type=config.lr_scheduler_type,
            target_modules=config.target_modules
        )
    
    def _validate_config(self, config: Any) -> bool:
        """Validate training configuration."""
        try:
            # Check required fields
            if not config.base_model:
                self.progress_reporter.report_error("Base model is required")
                return False
            
            if not config.data_file:
                self.progress_reporter.report_error("Data file is required")
                return False
            
            if not os.path.exists(config.data_file):
                self.progress_reporter.report_error(f"Data file not found: {config.data_file}")
                return False
            
            if not config.output_name:
                self.progress_reporter.report_error("Output name is required")
                return False
            
            if config.max_steps <= 0:
                self.progress_reporter.report_error("Max steps must be positive")
                return False
            
            # Check Ollama availability
            if not self.ollama_service.is_available():
                self.progress_reporter.report_error("Ollama is not available")
                return False
            
            print(f"✅ Configuration validation passed")
            return True
            
        except Exception as e:
            self.progress_reporter.report_error(f"Configuration validation failed: {e}")
            return False
    
    def _deploy_base_model_if_needed(self, config: Any, hf_model_name: str) -> Optional[str]:
        """Deploy base model if needed for LoRA training."""
        try:
            # For most models, we can use the original model name
            deployed_model_name = config.base_model
            
            # Check if the model is available in Ollama
            available_models = self.ollama_service.list_models()
            
            if config.base_model not in available_models:
                self.progress_reporter.report_error(f"Model {config.base_model} not available in Ollama")
                return None
            
            print(f"✅ Base model {config.base_model} is available")
            return deployed_model_name
            
        except Exception as e:
            self.progress_reporter.report_error(f"Failed to deploy base model: {e}")
            return None 