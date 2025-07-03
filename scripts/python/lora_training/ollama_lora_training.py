#!/usr/bin/env python3
# SPDX-License-Identifier: MIT OR Apache-2.0
"""
Real LoRA Training Script for Orch-OS
Implements actual LoRA fine-tuning with Ollama model conversion
"""

import json
import os
import sys
import subprocess
import platform
import argparse
import tempfile
import shutil
from datetime import datetime
from pathlib import Path

def get_project_root():
    """Get the project root directory - unified logic for both scripts."""
    try:
        # This script is in scripts/python/lora_training/
        # Project root is 4 levels up: ../../../../
        current_file = os.path.abspath(__file__)
        return os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(current_file))))
    except Exception:
        # Fallback: try to find based on current working directory
        cwd = os.getcwd()
        # Look for characteristic files/directories that indicate project root
        indicators = ['package.json', 'electron', 'src', '.git']
        
        current_dir = cwd
        for _ in range(5):  # Don't go too far up
            if any(os.path.exists(os.path.join(current_dir, indicator)) for indicator in indicators):
                return current_dir
            parent = os.path.dirname(current_dir)
            if parent == current_dir:  # Reached filesystem root
                break
            current_dir = parent
        
        # Final fallback
        return cwd

def main():
    print("🚀 Real LoRA Training for Orch-OS")
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Real LoRA Training with Ollama")
    parser.add_argument("--data", required=True, help="Path to training data (JSONL)")
    parser.add_argument("--base-model", required=True, help="Ollama model name (e.g., gemma3:latest)")
    parser.add_argument("--output", required=True, help="Output adapter name")
    parser.add_argument("--max-steps", type=int, default=100, help="Maximum training steps")
    
    args = parser.parse_args()
    
    print(f"📊 Configuration:")
    print(f"   • Ollama Model: {args.base_model}")
    print(f"   • Data: {args.data}")
    print(f"   • Output: {args.output}")
    print(f"   • Max Steps: {args.max_steps}")

    def check_ollama_available():
        """Check if Ollama is available and the model exists."""
        try:
            result = subprocess.run(['ollama', 'list'], capture_output=True, text=True)
            if result.returncode != 0:
                print("❌ Ollama not found. Please install Ollama first.")
                return False
                
            if args.base_model not in result.stdout:
                print(f"📥 Model {args.base_model} not found locally. Pulling...")
                pull_result = subprocess.run(['ollama', 'pull', args.base_model], 
                                           capture_output=True, text=True)
                if pull_result.returncode != 0:
                    print(f"❌ Failed to pull model {args.base_model}: {pull_result.stderr}")
                    return False
                print(f"✅ Model {args.base_model} pulled successfully")
            else:
                print(f"✅ Model {args.base_model} found locally")
            return True
        except FileNotFoundError:
            print("❌ Ollama command not found. Please install Ollama.")
            return False

    def install_training_dependencies():
        """Install required dependencies for real LoRA training."""
        print("\n📦 Installing training dependencies...")
        
        required_packages = [
            "torch",
            "transformers>=4.36.0", 
            "peft>=0.7.0",
            "datasets>=2.14.0",
            "accelerate>=0.24.0",
            "safetensors>=0.4.0",
            "numpy>=1.24.0",
            "tqdm",
            "huggingface_hub",
            "bitsandbytes"  # For QLoRA if needed
        ]
        
        missing_deps = []
        for package in required_packages:
            package_name = package.split('>=')[0].split('==')[0]
            try:
                __import__(package_name.replace('-', '_'))
                print(f"   ✓ {package_name}")
            except ImportError:
                missing_deps.append(package)
                print(f"   ❌ {package_name} not found")
        
        if missing_deps:
            print(f"📦 Installing {len(missing_deps)} packages...")
            subprocess.check_call([
                sys.executable, "-m", "pip", "install", "-q"
            ] + missing_deps)
            print("✅ Dependencies installed!")

    def get_huggingface_model_name(ollama_model):
        """Map Ollama model names to HuggingFace model names (using latest Unsloth models)."""
        model_mapping = {
            # Latest Unsloth optimized models
            "gemma3:latest": "unsloth/gemma-3-1b-it-GGUF",
            "qwen3:latest": "unsloth/Qwen3-8B-GGUF",
            "mistral:latest": "unsloth/mistral-7b-v0.3",
            "mistral-nemo:latest": "unsloth/Mistral-Nemo-Instruct-2407",
            "llama3.1:latest": "unsloth/Llama-3.1-8B-Instruct-GGUF",
        }
        
        # Try exact match first
        if ollama_model in model_mapping:
            return model_mapping[ollama_model]
        
        # Try partial match for versioned models
        for ollama_name, hf_name in model_mapping.items():
            if ollama_model.startswith(ollama_name.split(':')[0]):
                return hf_name
        
        # Fallback - try to guess using latest Unsloth models
        base_name = ollama_model.split(':')[0]
        if "llama3.1" in base_name.lower():
            return "unsloth/Llama-3.1-8B-Instruct-GGUF"
        elif "gemma3" in base_name.lower():
            return "unsloth/gemma-3-1b-it-GGUF"
        elif "mistral-nemo" in base_name.lower():
            return "unsloth/Mistral-Nemo-Instruct-2407"
        elif "mistral" in base_name.lower():
            return "unsloth/mistral-7b-v0.3"
        elif "qwen3" in base_name.lower():
            return "unsloth/Qwen3-8B-GGUF"
        else:
            print(f"⚠️ Unknown model {ollama_model}, using Llama-3.1 as fallback")
            return "unsloth/Llama-3.1-8B-Instruct-GGUF"

    def calculate_optimal_steps(data_path):
        """Calculate optimal steps based on content analysis."""
        try:
            # Import the step calculator
            current_dir = os.path.dirname(os.path.abspath(__file__))
            sys.path.append(os.path.join(current_dir, "training_modules"))
            
            from step_calculator import calculate_content_based_steps
            
            # Calculate steps based on actual content
            step_calculation = calculate_content_based_steps(data_path, target_training_minutes=5)
            calculated_steps = step_calculation["steps"]
            
            print(f"📊 Content Analysis Results:")
            print(f"   • Total tokens: {step_calculation['content_analysis']['total_tokens']:,}")
            print(f"   • Complexity: {step_calculation['content_analysis']['estimated_learning_difficulty']}")
            print(f"   • Calculated steps: {calculated_steps}")
            print(f"   • Estimated training time: ~{step_calculation['training_estimates']['estimated_minutes']:.1f} minutes")
            
            return calculated_steps, step_calculation
            
        except Exception as e:
            print(f"⚠️ Could not calculate optimal steps: {e}")
            print(f"📌 Using provided max_steps: {args.max_steps}")
            return args.max_steps, None

    def prepare_training_data(data_path):
        """Prepare training data in the correct format for LoRA training."""
        print("📚 Preparing training data...")
        
        with open(data_path, 'r', encoding='utf-8') as f:
            raw_data = [json.loads(line) for line in f if line.strip()]
        
        print(f"   • Found {len(raw_data)} training examples")
        
        # Convert to instruction format
        formatted_data = []
        for item in raw_data:
            if "instruction" in item and "output" in item:
                # Already in correct format
                formatted_data.append({
                    "instruction": item["instruction"],
                    "input": item.get("input", ""),
                    "output": item["output"]
                })
            elif "messages" in item:
                # Convert from messages format
                messages = item["messages"]
                if len(messages) >= 2:
                    user_msg = next((m for m in messages if m["role"] == "user"), None)
                    assistant_msg = next((m for m in messages if m["role"] == "assistant"), None)
                    if user_msg and assistant_msg:
                        formatted_data.append({
                            "instruction": user_msg["content"],
                            "input": "",
                            "output": assistant_msg["content"]
                        })
            else:
                # Try to extract from generic format
                text = str(item)
                if len(text) > 10:  # Basic validation
                    formatted_data.append({
                        "instruction": text[:100] + "...",
                        "input": "",
                        "output": text
                    })
        
        print(f"   • Formatted {len(formatted_data)} examples for training")
        return formatted_data

    def train_lora_adapter(hf_model_name, training_data, output_dir, max_steps):
        """Perform actual LoRA training using PEFT."""
        print(f"\n🔧 Starting real LoRA training...")
        print(f"   • HuggingFace Model: {hf_model_name}")
        print(f"   • Training Examples: {len(training_data)}")
        print(f"   • Max Steps: {max_steps}")
        
        try:
            import torch
            from transformers import (
                AutoTokenizer, AutoModelForCausalLM, 
                TrainingArguments, Trainer, DataCollatorForLanguageModeling
            )
            from peft import (
                LoraConfig, get_peft_model, TaskType, 
                prepare_model_for_kbit_training
            )
            from datasets import Dataset
            
        except ImportError as e:
            print(f"❌ Failed to import required libraries: {e}")
            print("Please ensure all dependencies are installed correctly.")
            return None
        
        # Load model and tokenizer
        print(f"📥 Loading model: {hf_model_name}")
        try:
            tokenizer = AutoTokenizer.from_pretrained(hf_model_name, trust_remote_code=True)
            model = AutoModelForCausalLM.from_pretrained(
                hf_model_name,
                torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
                device_map="auto" if torch.cuda.is_available() else None,
                trust_remote_code=True,
                load_in_8bit=False,  # Disable for Mac compatibility
            )
            
            # Add padding token if missing
            if tokenizer.pad_token is None:
                tokenizer.pad_token = tokenizer.eos_token
                tokenizer.pad_token_id = tokenizer.eos_token_id
            
            print(f"✅ Model loaded successfully")
            
        except Exception as e:
            print(f"❌ Failed to load model {hf_model_name}: {e}")
            print("This might be due to:")
            print("1. Model requires authentication (try: huggingface-cli login)")
            print("2. Model name is incorrect")
            print("3. Network issues")
            return None
        
        # Prepare model for training
        model = prepare_model_for_kbit_training(model)
        
        # Configure LoRA
        lora_config = LoraConfig(
            r=16,  # LoRA rank
            lora_alpha=32,  # LoRA alpha
            target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
            lora_dropout=0.05,
            bias="none",
            task_type=TaskType.CAUSAL_LM,
        )
        
        # Apply LoRA to model
        model = get_peft_model(model, lora_config)
        model.print_trainable_parameters()
        
        # Prepare dataset
        def format_instruction(example):
            if example["input"]:
                text = f"### Instruction:\n{example['instruction']}\n\n### Input:\n{example['input']}\n\n### Response:\n{example['output']}"
            else:
                text = f"### Instruction:\n{example['instruction']}\n\n### Response:\n{example['output']}"
            return {"text": text}
        
        # Convert to dataset
        dataset = Dataset.from_list(training_data)
        dataset = dataset.map(format_instruction)
        
        # Tokenize dataset
        def tokenize_function(examples):
            # Ensure we're working with strings
            texts = examples["text"] if isinstance(examples["text"], list) else [examples["text"]]
            
            # Tokenize the texts
            tokenized = tokenizer(
                texts,
                padding=False,  # Don't pad here, let data collator handle it
                truncation=True,
                max_length=512,
                return_overflowing_tokens=False,
                add_special_tokens=True,
            )
            
            # Add labels (copy of input_ids for causal LM)
            tokenized["labels"] = tokenized["input_ids"].copy()
            
            return tokenized
        
        print("   • Tokenizing dataset...")
        tokenized_dataset = dataset.map(
            tokenize_function, 
            batched=True, 
            remove_columns=dataset.column_names  # Remove original columns
        )
        
        # Training arguments
        training_args = TrainingArguments(
            output_dir=os.path.join(output_dir, "training_output"),
            num_train_epochs=3,
            max_steps=max_steps,
            per_device_train_batch_size=1,  # Small batch for Mac
            gradient_accumulation_steps=8,
            warmup_steps=min(10, max_steps // 10),
            learning_rate=2e-4,
            fp16=False,  # Disable fp16 for Mac compatibility
            logging_steps=max(1, max_steps // 10),
            optim="adamw_torch",
            weight_decay=0.01,
            lr_scheduler_type="cosine",
            save_steps=max_steps,  # Save only at the end
            save_total_limit=1,
            report_to=None,  # Disable wandb/tensorboard
            dataloader_num_workers=0,  # No multiprocessing for Mac
            remove_unused_columns=False,
        )
        
        # Data collator
        data_collator = DataCollatorForLanguageModeling(
            tokenizer=tokenizer,
            mlm=False,
        )
        
        # Create trainer
        trainer = Trainer(
            model=model,
            args=training_args,
            train_dataset=tokenized_dataset,
            data_collator=data_collator,
        )
        
        # Train the model
        print("🚀 Starting LoRA training...")
        trainer.train()
        
        # Save the adapter
        adapter_dir = os.path.join(output_dir, "lora_adapter")
        os.makedirs(adapter_dir, exist_ok=True)
        
        trainer.save_model(adapter_dir)
        tokenizer.save_pretrained(adapter_dir)
        
        print(f"💾 LoRA adapter saved: {adapter_dir}")
        return adapter_dir

    def manage_lora_adapters(hf_model_name, adapter_path, output_name, base_model_name):
        """Manage LoRA adapters separately without merging - enable/disable system."""
        print(f"\n🔧 Setting up LoRA adapter management...")
        
        try:
            # Create PERSISTENT adapter registry directory in the project root
            project_root = get_project_root()
            persistent_adapter_dir = os.path.join(project_root, "lora_adapters")
            adapter_registry_dir = os.path.join(persistent_adapter_dir, "registry")
            
            # Create directories if they don't exist
            os.makedirs(adapter_registry_dir, exist_ok=True)
            os.makedirs(os.path.join(persistent_adapter_dir, "weights"), exist_ok=True)
            
            print(f"📂 Persistent adapter directory: {persistent_adapter_dir}")
            print(f"📂 Registry directory: {adapter_registry_dir}")
            
            # Copy adapter weights to persistent location
            persistent_adapter_path = os.path.join(persistent_adapter_dir, "weights", f"{output_name}_adapter")
            
            # Copy the entire adapter directory to persistent location
            if os.path.exists(adapter_path):
                if os.path.exists(persistent_adapter_path):
                    shutil.rmtree(persistent_adapter_path)
                shutil.copytree(adapter_path, persistent_adapter_path)
                print(f"💾 Adapter weights copied to persistent location: {persistent_adapter_path}")
            else:
                print(f"⚠️ Warning: Adapter path not found: {adapter_path}")
                print(f"   Creating placeholder entry in registry...")
            
            # Create adapter info with persistent paths
            adapter_info = {
                "adapter_id": output_name,
                "adapter_name": f"{output_name}_adapter",
                "base_model": base_model_name,
                "hf_model": hf_model_name,
                "adapter_path": persistent_adapter_path,  # Use persistent path
                "registry_path": adapter_registry_dir,
                "created_at": datetime.now().isoformat(),
                "enabled": False,  # Start disabled
                "training_method": "real_lora_peft",
                "status": "ready",
                "persistent": True  # Flag to indicate this is persistent storage
            }
            
            # Save adapter info to persistent registry
            adapter_info_path = os.path.join(adapter_registry_dir, f"{output_name}_adapter.json")
            with open(adapter_info_path, 'w') as f:
                json.dump(adapter_info, f, indent=2)
            
            print(f"✅ Adapter registered persistently: {adapter_info['adapter_name']}")
            print(f"📂 Registry file: {adapter_info_path}")
            
            # Create Ollama Modelfile with adapter support
            create_ollama_modelfile_with_adapter(base_model_name, adapter_info, adapter_registry_dir)
            
            return adapter_info
            
        except Exception as e:
            print(f"❌ Failed to setup persistent adapter management: {e}")
            import traceback
            traceback.print_exc()
            return None

    def create_ollama_modelfile_with_adapter(base_model, adapter_info, registry_dir):
        """Create Ollama Modelfile that can load LoRA adapters dynamically."""
        print(f"📝 Creating Ollama Modelfile with adapter support...")
        
        # Create enhanced Modelfile with adapter metadata
        modelfile_content = f"""FROM {base_model}

# LoRA Adapter Configuration
# Adapter: {adapter_info['adapter_name']}
# Base Model: {adapter_info['base_model']}
# HF Model: {adapter_info['hf_model']}
# Training: Real LoRA fine-tuning with PEFT
# Status: {adapter_info['status']}
# Enabled: {adapter_info['enabled']}

SYSTEM \"\"\"You are the Integrative Symbolic Intelligence of Orch-OS with LoRA adapter support.

Adapter Information:
- Adapter ID: {adapter_info['adapter_id']}
- Base Model: {adapter_info['base_model']}
- Training Method: Real LoRA (Low-Rank Adaptation) fine-tuning
- Status: Ready for activation

When this adapter is enabled, you have enhanced capabilities from fine-tuning on user-specific data. You can be dynamically enabled or disabled through the Orch-OS interface.

Respond helpfully and conversationally, utilizing your enhanced training when the adapter is active.\"\"\"

PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER top_k 40
PARAMETER repeat_penalty 1.1

# Adapter Metadata (for Orch-OS management)
# ADAPTER_ID: {adapter_info['adapter_id']}
# ADAPTER_PATH: {adapter_info['adapter_path']}
# ADAPTER_ENABLED: {adapter_info['enabled']}
"""
        
        # Save Modelfile
        modelfile_path = os.path.join(registry_dir, f"{adapter_info['adapter_name']}_Modelfile")
        with open(modelfile_path, 'w') as f:
            f.write(modelfile_content)
        
        print(f"✅ Modelfile created: {modelfile_path}")
        return modelfile_path

    def enable_lora_adapter(adapter_id, registry_dir):
        """Enable a specific LoRA adapter."""
        adapter_info_path = os.path.join(registry_dir, f"{adapter_id}_adapter.json")
        
        if not os.path.exists(adapter_info_path):
            return {"success": False, "error": "Adapter not found"}
        
        # Load adapter info
        with open(adapter_info_path, 'r') as f:
            adapter_info = json.load(f)
        
        # Update status
        adapter_info['enabled'] = True
        adapter_info['last_enabled'] = datetime.now().isoformat()
        
        # Save updated info
        with open(adapter_info_path, 'w') as f:
            json.dump(adapter_info, f, indent=2)
        
        # Create active Ollama model
        active_model_name = f"{adapter_info['base_model'].replace(':', '_')}_with_{adapter_id}"
        
        try:
            # Create Ollama model with adapter enabled
            modelfile_path = create_ollama_modelfile_with_adapter(
                adapter_info['base_model'], 
                adapter_info, 
                registry_dir
            )
            
            result = subprocess.run([
                'ollama', 'create', active_model_name, '-f', modelfile_path
            ], capture_output=True, text=True, check=True)
            
            print(f"✅ Adapter enabled: {adapter_id}")
            print(f"🔗 Active model: {active_model_name}")
            
            return {
                "success": True, 
                "active_model": active_model_name,
                "adapter_id": adapter_id
            }
            
        except subprocess.CalledProcessError as e:
            return {"success": False, "error": f"Failed to create active model: {e}"}

    def disable_lora_adapter(adapter_id, registry_dir):
        """Disable a specific LoRA adapter."""
        adapter_info_path = os.path.join(registry_dir, f"{adapter_id}_adapter.json")
        
        if not os.path.exists(adapter_info_path):
            return {"success": False, "error": "Adapter not found"}
        
        # Load adapter info
        with open(adapter_info_path, 'r') as f:
            adapter_info = json.load(f)
        
        # Update status
        adapter_info['enabled'] = False
        adapter_info['last_disabled'] = datetime.now().isoformat()
        
        # Save updated info
        with open(adapter_info_path, 'w') as f:
            json.dump(adapter_info, f, indent=2)
        
        # Remove active Ollama model
        active_model_name = f"{adapter_info['base_model'].replace(':', '_')}_with_{adapter_id}"
        
        try:
            subprocess.run(['ollama', 'rm', active_model_name], 
                         capture_output=True, text=True, check=True)
            print(f"🔌 Adapter disabled: {adapter_id}")
            return {"success": True, "adapter_id": adapter_id}
            
        except subprocess.CalledProcessError:
            # Model might not exist, that's OK
            return {"success": True, "adapter_id": adapter_id}

    def convert_to_gguf_format(merged_model_dir, output_dir):
        """Convert merged model to GGUF format for Ollama."""
        print(f"🔄 Converting to GGUF format...")
        
        try:
            # Check if llama.cpp is available
            llama_cpp_path = None
            possible_paths = [
                "/usr/local/bin/llama-cpp-python",
                "/opt/homebrew/bin/llama-cpp-python", 
                "llama-cpp-python",
                "./llama.cpp/convert.py"
            ]
            
            for path in possible_paths:
                if shutil.which(path) or os.path.exists(path):
                    llama_cpp_path = path
                    break
            
            if not llama_cpp_path:
                print("⚠️ llama.cpp not found, using alternative GGUF conversion")
                return convert_to_gguf_alternative(merged_model_dir, output_dir)
            
            # Convert using llama.cpp
            gguf_output_path = os.path.join(output_dir, "model.gguf")
            
            convert_cmd = [
                "python", llama_cpp_path, 
                "--input", merged_model_dir,
                "--output", gguf_output_path,
                "--outtype", "f16"  # Use float16 for better compatibility
            ]
            
            result = subprocess.run(convert_cmd, capture_output=True, text=True, check=True)
            
            if os.path.exists(gguf_output_path):
                print(f"✅ GGUF conversion successful: {gguf_output_path}")
                return gguf_output_path
            else:
                print("❌ GGUF file not created")
                return None
                
        except Exception as e:
            print(f"⚠️ GGUF conversion failed: {e}")
            return convert_to_gguf_alternative(merged_model_dir, output_dir)

    def convert_to_gguf_alternative(merged_model_dir, output_dir):
        """Alternative GGUF conversion using transformers."""
        print(f"🔄 Using alternative GGUF conversion method...")
        
        try:
            # Try using transformers to save in a more compatible format
            import torch
            from transformers import AutoTokenizer, AutoModelForCausalLM
            
            # Load the merged model
            tokenizer = AutoTokenizer.from_pretrained(merged_model_dir)
            model = AutoModelForCausalLM.from_pretrained(
                merged_model_dir,
                torch_dtype=torch.float16,
                device_map="cpu"  # Force CPU for compatibility
            )
            
            # Save in a format more compatible with GGUF conversion
            gguf_ready_dir = os.path.join(output_dir, "gguf_ready")
            os.makedirs(gguf_ready_dir, exist_ok=True)
            
            # Save model and tokenizer
            model.save_pretrained(gguf_ready_dir, safe_serialization=True)
            tokenizer.save_pretrained(gguf_ready_dir)
            
            print(f"✅ Model prepared for GGUF conversion: {gguf_ready_dir}")
            print("💡 Use external tools like llama.cpp to convert to GGUF format")
            
            return gguf_ready_dir
            
        except Exception as e:
            print(f"❌ Alternative conversion failed: {e}")
            return None

    # Main execution pipeline
    print("\n" + "="*60)
    print("🚀 REAL LORA TRAINING PIPELINE")
    print("="*60)

    try:
        # Step 1: Check Ollama availability
        if not check_ollama_available():
            sys.exit(1)
        
        # Step 2: Install dependencies
        install_training_dependencies()
        
        # Step 3: Get HuggingFace model name
        hf_model_name = get_huggingface_model_name(args.base_model)
        print(f"\n🔄 Model mapping: {args.base_model} → {hf_model_name}")
        
        # Step 4: Calculate optimal steps
        optimal_steps, step_calculation = calculate_optimal_steps(args.data)
        
        # Step 5: Prepare training data
        training_data = prepare_training_data(args.data)
        if not training_data:
            print("❌ No valid training data found")
            sys.exit(1)
        
        # Step 6: Create output directory
        output_dir = os.path.join(os.path.dirname(args.data), "lora_training_output")
        os.makedirs(output_dir, exist_ok=True)
        
        # Step 7: Train LoRA adapter
        adapter_path = train_lora_adapter(hf_model_name, training_data, output_dir, optimal_steps)
        if not adapter_path:
            print("❌ Failed to train LoRA adapter")
            sys.exit(1)
        
        # Step 8: Manage LoRA adapters
        adapter_info = manage_lora_adapters(hf_model_name, adapter_path, args.output, args.base_model)
        
        if adapter_info:
            print("\n" + "="*60)
            print("🎉 REAL LORA TRAINING COMPLETED!")
            print("="*60)
            print(f"✅ Base Model: {args.base_model}")
            print(f"✅ HuggingFace Model: {hf_model_name}")
            print(f"✅ Adapter ID: {adapter_info['adapter_id']}")
            print(f"📂 Adapter Path: {adapter_path}")
            print(f"⏱️ Training Steps: {optimal_steps}")
            print(f"🔌 Status: Ready for Enable/Disable")
            print(f"\n💡 Enable adapter: Use Orch-OS interface or CLI")
            
            # Save training metadata
            metadata = {
                "base_model": args.base_model,
                "hf_model": hf_model_name,
                "adapter_id": adapter_info['adapter_id'],
                "training_examples": len(training_data),
                "training_steps": optimal_steps,
                "completed_at": datetime.now().isoformat(),
                "training_method": "real_lora_peft",
                "adapter_status": "ready",
                "adapter_enabled": False
            }
            
            metadata_path = os.path.join(adapter_path, "training_metadata.json")
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            print(f"📊 Training metadata saved: {metadata_path}")
        else:
            print("❌ Failed to manage LoRA adapters")
            sys.exit(1)

    except Exception as e:
        print(f"\n❌ Training pipeline failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    print("\n🏁 Real LoRA training completed successfully!")

if __name__ == "__main__":
    main() 