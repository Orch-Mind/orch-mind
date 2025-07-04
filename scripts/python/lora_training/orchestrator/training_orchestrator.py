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
            
            # Step 1: Validate configuration
            self.progress_reporter.report_progress(2, 100, "Validating configuration")
            if not self._validate_config(config):
                return None
            
            # Step 2: Load and process training data
            self.progress_reporter.report_progress(5, 100, "Loading training data")
            training_data = self.data_processor.load_data(config.data_file)
            if not training_data:
                self.progress_reporter.report_error("Failed to load training data")
                return None
            
            print(f"📊 Loaded {len(training_data)} training examples")
            
            # Validate and format data
            if not self.data_processor.validate_data(training_data):
                self.progress_reporter.report_error("Training data validation failed")
                return None
            
            formatted_data = self.data_processor.format_data(training_data)
            if not formatted_data:
                self.progress_reporter.report_error("Failed to format training data")
                return None
            
            # Memory check after data loading
            self.memory_monitor.monitor_training_phase("after data loading")
            
            # Step 3: Get HuggingFace model name
            self.progress_reporter.report_progress(10, 100, "Mapping model configuration")
            hf_model_name = self.model_mapper.get_huggingface_model_name(config.base_model)
            if not hf_model_name:
                self.progress_reporter.report_error(f"Unsupported model: {config.base_model}")
                return None
            
            print(f"🤗 HuggingFace Model: {hf_model_name}")
            
            # Step 4: Deploy base model if needed
            self.progress_reporter.report_progress(15, 100, "Deploying base model")
            deployed_model_name = self._deploy_base_model_if_needed(config, hf_model_name)
            if not deployed_model_name:
                return None
            
            # Memory check after deployment
            self.memory_monitor.monitor_training_phase("after base model deployment")
            
            # Step 5: Train LoRA adapter
            self.progress_reporter.report_progress(20, 100, "Starting LoRA training")
            
            # Create training config
            training_config = self._create_training_config(config, hf_model_name)
            
            # Train the adapter with memory monitoring
            adapter_path = self.lora_trainer.train(training_config, formatted_data)
            if not adapter_path:
                self.progress_reporter.report_error("LoRA training failed")
                return None
            
            # Memory cleanup after training
            self.memory_monitor.monitor_training_phase("after LoRA training")
            self.memory_monitor.cleanup_memory(aggressive=True)
            
            # Step 6: Merge and deploy final model
            self.progress_reporter.report_progress(95, 100, "Merging and deploying final model")
            
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
            self.progress_reporter.report_progress(100, 100, "Registering adapter")
            registration_success = self.adapter_manager.register_adapter(
                adapter_id=config.output_name,
                base_model=config.base_model,
                hf_model=hf_model_name,
                adapter_path=adapter_path
            )
            
            if registration_success:
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
    
    def _merge_and_deploy_if_unsloth(self, config: Any, hf_model_name: str, adapter_path: str, deployed_model_name: str) -> Optional[str]:
        """Merge LoRA adapter with base model and deploy to Ollama with memory optimization."""
        print(f"\n🔗 UNSLOTH MERGE & DEPLOY PROCESS")
        print(f"   • HuggingFace Model: {hf_model_name}")
        print(f"   • Adapter Path: {adapter_path}")
        print(f"   • Base Model: {deployed_model_name}")
        
        # Check if this is a Unsloth model
        if not self.model_mapper.is_unsloth_model(config.base_model):
            print(f"✅ Standard model - no merge needed, using: {deployed_model_name}")
            return deployed_model_name
        
        # Memory check before merge
        self.memory_monitor.monitor_training_phase("before merge process")
        
        # Create temporary directory for merge process
        import tempfile
        temp_dir = tempfile.mkdtemp(prefix="unsloth_merge_")
        
        try:
            self.progress_reporter.report_progress(96, 100, "Merging LoRA adapter with base model")
            
            # Import required libraries
            import torch
            from transformers import AutoTokenizer, AutoModelForCausalLM
            from peft import PeftModel
            import gc
            
            try:
                print(f"🔄 Loading base model for merge: {hf_model_name}")
                
                # Memory check before loading model
                self.memory_monitor.monitor_training_phase("before loading base model")
                
                # Load tokenizer first (lightweight)
                tokenizer = AutoTokenizer.from_pretrained(hf_model_name, trust_remote_code=True)
                
                # Load base model with memory optimization
                print("   • Loading base model with memory optimization...")
                base_model = AutoModelForCausalLM.from_pretrained(
                    hf_model_name,
                    torch_dtype=torch.float16,  # Use float16 to save memory
                    device_map="auto" if torch.cuda.is_available() else "cpu",
                    trust_remote_code=True,
                    load_in_8bit=False,
                    low_cpu_mem_usage=True,  # Enable low memory usage
                )
                
                # Memory check after loading base model
                self.memory_monitor.monitor_training_phase("after loading base model")
                
                print(f"🔗 Loading LoRA adapter: {adapter_path}")
                
                # Load LoRA adapter
                model_with_adapter = PeftModel.from_pretrained(base_model, adapter_path)
                
                # Clear base model from memory before merge
                del base_model
                torch.cuda.empty_cache() if torch.cuda.is_available() else None
                gc.collect()
                
                # Memory check after loading adapter
                self.memory_monitor.monitor_training_phase("after loading adapter")
                
                print(f"💾 Merging adapter and saving to temporary directory")
                
                # Merge adapter with base model
                merged_model = model_with_adapter.merge_and_unload()
                
                # Clear adapter model from memory
                del model_with_adapter
                torch.cuda.empty_cache() if torch.cuda.is_available() else None
                gc.collect()
                
                # Memory check after merge
                self.memory_monitor.monitor_training_phase("after merge operation")
                
                # Save merged model with memory optimization
                print(f"   • Saving merged model with safe serialization...")
                try:
                    # Use save_model to handle shared tensors correctly
                    merged_model.save_model(temp_dir)
                except AttributeError:
                    # Fallback to save_pretrained without safe_serialization
                    merged_model.save_pretrained(
                        temp_dir, 
                        safe_serialization=False,  # Disable to avoid shared tensor issues
                        max_shard_size="2GB"
                    )
                tokenizer.save_pretrained(temp_dir)
                
                # Clear merged model from memory before GGUF conversion
                del merged_model
                torch.cuda.empty_cache() if torch.cuda.is_available() else None
                gc.collect()
                
                # Memory check after saving
                self.memory_monitor.monitor_training_phase("after saving merged model")
                
                print(f"   • Memory cleared after merge")
                
                self.progress_reporter.report_progress(98, 100, "Converting merged model to GGUF")
                
                # Convert merged model to GGUF with memory optimization
                gguf_path = self._convert_merged_to_gguf_optimized(temp_dir, hf_model_name)
                if not gguf_path:
                    return None
                
                # Memory check after GGUF conversion
                self.memory_monitor.monitor_training_phase("after GGUF conversion")
                
                # Create final model name
                final_model_name = f"{config.output_name}-final"
                
                self.progress_reporter.report_progress(99, 100, "Deploying final model to Ollama")
                
                # Deploy final model to Ollama
                success = self._deploy_final_model_to_ollama(gguf_path, final_model_name, config, hf_model_name)
                
                if success:
                    print(f"✅ Final model deployed: {final_model_name}")
                    print(f"💡 This model contains the base model + LoRA adapter merged")
                    return final_model_name
                else:
                    return None
                    
            except Exception as e:
                print(f"❌ Error during merge and deploy: {e}")
                import traceback
                traceback.print_exc()
                return None
                
        finally:
            # Clean up temporary directory
            print(f"🧹 Cleaned up temporary directory")
            shutil.rmtree(temp_dir, ignore_errors=True)
            
            # Final memory cleanup
            torch.cuda.empty_cache() if torch.cuda.is_available() else None
            gc.collect()
            
            # Memory check after cleanup
            self.memory_monitor.monitor_training_phase("after merge cleanup")
    
    def _convert_merged_to_gguf_optimized(self, model_path: str, hf_model_name: str) -> Optional[str]:
        """Convert merged model to GGUF format with memory optimization."""
        print("🔄 Converting merged model to GGUF...")
        
        # Find llama.cpp (with automatic installation)
        llama_cpp_dir = self._find_llama_cpp()
        if not llama_cpp_dir:
            print("❌ llama.cpp not found and installation failed")
            return None
        
        convert_script = os.path.join(llama_cpp_dir, "convert_hf_to_gguf.py")
        if not os.path.exists(convert_script):
            print(f"❌ Convert script not found: {convert_script}")
            return None
        
        # Output GGUF file
        gguf_path = os.path.join(model_path, "merged_model.gguf")
        
        try:
            import subprocess
            convert_cmd = [
                sys.executable, convert_script,
                model_path,
                "--outfile", gguf_path,
                "--outtype", "f16",  # Use f16 for better compatibility with current llama.cpp
                "--use-temp-file"  # Use temp file to manage memory
            ]
            
            print(f"   • Running GGUF conversion with memory optimization...")
            
            # Set environment variables for memory optimization
            env = os.environ.copy()
            env.update({
                'OMP_NUM_THREADS': '2',  # Limit CPU threads
                'MKL_NUM_THREADS': '2',  # Limit MKL threads
                'PYTHONUNBUFFERED': '1',
                'TOKENIZERS_PARALLELISM': 'false',  # Disable tokenizer parallelism to save memory
                'PYTORCH_CUDA_ALLOC_CONF': 'max_split_size_mb:512',  # Limit CUDA memory allocation
            })
            
            result = subprocess.run(
                convert_cmd,
                capture_output=True,
                text=True,
                timeout=2400,  # 40 minutes timeout
                env=env
            )
            
            if result.returncode == 0:
                if os.path.exists(gguf_path):
                    file_size = os.path.getsize(gguf_path) / (1024**3)  # Size in GB
                    print(f"✅ GGUF conversion successful: {gguf_path} ({file_size:.2f}GB)")
                    return gguf_path
                else:
                    print(f"❌ GGUF file not created: {gguf_path}")
                    return None
            else:
                print(f"❌ GGUF conversion failed:")
                print(f"   • stdout: {result.stdout}")
                print(f"   • stderr: {result.stderr}")
                return None
                
        except subprocess.TimeoutExpired:
            print("❌ GGUF conversion timed out")
            return None
        except Exception as e:
            print(f"❌ GGUF conversion error: {e}")
            return None
    
    def _deploy_final_model_to_ollama(self, gguf_path: str, model_name: str, config: Any, hf_model_name: str) -> bool:
        """Deploy final merged model to Ollama."""
        print(f"🔗 Creating final Ollama model: {model_name}")
        
        try:
            # Create Modelfile for final model
            modelfile_content = f"""FROM {gguf_path}

SYSTEM \"\"\"You are the Integrative Symbolic Intelligence of Orch-OS with specialized LoRA fine-tuning.

Model Information:
- Base Model: {hf_model_name}
- Adapter ID: {config.output_name}
- Training Method: LoRA merge (Unsloth approach)
- Architecture: Merged model (base + adapter)

This model has enhanced capabilities from fine-tuning on user-specific data.
The LoRA adapter has been merged directly into the model weights for maximum compatibility.

Respond helpfully and conversationally, utilizing your specialized training.\"\"\"

# Official Gemma 3 inference settings as per Unsloth documentation
PARAMETER temperature 1.0
PARAMETER top_p 0.95
PARAMETER top_k 64
PARAMETER min_p 0.0
PARAMETER repeat_penalty 1.0

# Final Model Metadata
# ADAPTER_ID: {config.output_name}
# BASE_MODEL: {hf_model_name}
# METHOD: unsloth_merge
# TYPE: final_merged_model
"""
            
            # Save Modelfile
            modelfile_path = os.path.join(os.path.dirname(gguf_path), "Modelfile")
            with open(modelfile_path, 'w') as f:
                f.write(modelfile_content)
            
            print(f"✅ Modelfile created: {modelfile_path}")
            
            # Create Ollama model
            success = self.ollama_service.create_model(model_name, modelfile_path)
            
            if success:
                print(f"✅ Final model deployed successfully: {model_name}")
                print(f"💡 This model can be used directly without adapters")
            
            return success
            
        except Exception as e:
            print(f"❌ Failed to create final Ollama model: {e}")
            return False
    
    def _find_llama_cpp(self) -> Optional[str]:
        """Find llama.cpp installation directory with automatic installation."""
        # First check in project root
        current_file = os.path.abspath(__file__)
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(current_file))))
        project_llama_cpp = os.path.join(project_root, "llama.cpp")
        
        if os.path.exists(project_llama_cpp):
            return project_llama_cpp
        
        # Check common installation locations
        possible_locations = [
            os.path.expanduser("~/llama.cpp"),
            "/usr/local/llama.cpp",
            "/opt/llama.cpp",
            "C:\\llama.cpp",
            "C:\\tools\\llama.cpp",
        ]
        
        for location in possible_locations:
            if os.path.exists(location):
                return location
        
        # If not found, try to install automatically
        print("🔍 llama.cpp not found - attempting automatic installation...")
        
        try:
            # Import and use the llama.cpp installer (non-interactive)
            from llama_cpp_installer import install_llama_cpp_non_interactive
            
            installed_path = install_llama_cpp_non_interactive()
            if installed_path:
                print(f"✅ llama.cpp installed automatically at: {installed_path}")
                return installed_path
            else:
                print("❌ Automatic installation failed")
                return None
                
        except ImportError:
            print("❌ llama.cpp installer not available")
            return None
        except Exception as e:
            print(f"❌ Error during automatic installation: {e}")
            return None
    
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
        print(f"\n💡 Enable adapter: Use Orch-OS interface or CLI")
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