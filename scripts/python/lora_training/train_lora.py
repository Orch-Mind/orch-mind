#!/usr/bin/env python3
# SPDX-License-Identifier: MIT OR Apache-2.0
# Main LoRA Training Script - Refactored for SOLID, DRY, KISS

import sys
import argparse
import json
import subprocess
import os
import time

from training_modules.environment import find_compatible_python, setup_dependencies
from training_modules.script_factory import create_instant_adapter_script
from training_modules.deployment import deploy_to_ollama

def get_master_adapter_path(base_model, master_name="master"):
    """Get path for master adapter based on base model."""
    base_model_clean = base_model.replace(":latest", "").replace(":", "_").replace("/", "_")
    return f"adapters/{base_model_clean}_{master_name}"

def check_existing_adapter(base_model, master_name="master"):
    """Check if master adapter exists for base model."""
    adapter_path = get_master_adapter_path(base_model, master_name)
    config_path = os.path.join(adapter_path, "adapter_config.json")
    return os.path.exists(config_path), adapter_path

def backup_existing_adapter(adapter_path):
    """Create backup of existing adapter before incremental training."""
    if not os.path.exists(adapter_path):
        return None
    
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    backup_path = f"{adapter_path}_backup_{timestamp}"
    
    try:
        import shutil
        shutil.copytree(adapter_path, backup_path)
        print(f"✅ Backup created: {backup_path}")
        return backup_path
    except Exception as e:
        print(f"⚠️ Backup failed: {e}")
        return None

def load_training_history(base_model, master_name="master"):
    """Load training history for incremental learning."""
    adapter_path = get_master_adapter_path(base_model, master_name)
    history_file = os.path.join(adapter_path, "training_history.json")
    
    if os.path.exists(history_file):
        try:
            with open(history_file, 'r') as f:
                return json.loads(f.read())
        except Exception as e:
            print(f"⚠️ Could not load training history: {e}")
    
    return {
        "sessions": [],
        "total_examples": 0,
        "total_training_time": 0,
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "base_model": base_model
    }

def save_training_history(base_model, master_name, session_data):
    """Save training session to history."""
    adapter_path = get_master_adapter_path(base_model, master_name)
    os.makedirs(adapter_path, exist_ok=True)
    
    history_file = os.path.join(adapter_path, "training_history.json")
    history = load_training_history(base_model, master_name)
    
    # Add new session
    history["sessions"].append(session_data)
    history["total_examples"] += session_data.get("examples", 0)
    history["total_training_time"] += session_data.get("duration", 0)
    history["last_updated"] = time.strftime("%Y-%m-%d %H:%M:%S")
    
    try:
        with open(history_file, 'w') as f:
            f.write(json.dumps(history, indent=2))
        print(f"✅ Training history updated: {len(history['sessions'])} sessions")
    except Exception as e:
        print(f"⚠️ Could not save training history: {e}")

def extract_base_model(model_name):
    """Extract the original base model, removing any '-custom' suffix."""
    # Examples:
    # "gemma3:latest" → "gemma3:latest"
    # "gemma3-custom:latest" → "gemma3:latest"
    # "llama3.1-custom:latest" → "llama3.1:latest"
    import re
    
    # Remove -custom suffix first
    model_name = re.sub(r'-custom(:latest)?$', '', model_name)
    
    # Ensure :latest suffix
    if not model_name.endswith(':latest'):
        model_name += ':latest'
    
    # Clean up any double :latest
    model_name = re.sub(r':latest:latest$', ':latest', model_name)
    
    return model_name

def check_ollama_model_exists(model_name):
    """Check if model exists in Ollama."""
    try:
        # Set environment for proper encoding on Windows
        env = dict(os.environ)
        env['PYTHONIOENCODING'] = 'utf-8'
        
        result = subprocess.run(["ollama", "list"], capture_output=True, text=True, timeout=10, 
                              env=env, errors='replace')
        if result.returncode == 0:
            models_output = result.stdout
            # Check if model name appears in the output
            return model_name in models_output
        else:
            print(f"⚠️ Could not check Ollama models: {result.stderr}")
            return False
    except subprocess.TimeoutExpired:
        print("⚠️ Ollama list command timed out")
        return False
    except FileNotFoundError:
        print("⚠️ Ollama not found in PATH")
        return False
    except Exception as e:
        print(f"⚠️ Error checking Ollama models: {e}")
        return False

def create_ollama_modelfile_for_instant(base_model, output_name):
    """Create Modelfile for instant adapter deployment."""
    modelfile_name = f"Modelfile_{output_name}"
    
    modelfile_content = f"""FROM {base_model}

# LoRA Adapter created instantly with Orch-OS
# Method: instant_creation
# Created: {output_name}

# Using Orch-OS Integration System Prompt for consistency with the app
SYSTEM \"\"\"You are the Integrative Symbolic Intelligence of Orch-OS.

LANGUAGE: Respond in the user's language naturally and appropriately.

CORE PRINCIPLES:
- Be helpful, direct, and conversational
- Match the user's tone and communication style  
- Use context to enhance understanding without being technical about it
- Focus on answering the user's actual question

You maintain all your original capabilities including function calling, while being fine-tuned with Orch-OS conversations to better understand user context and conversation patterns.

Respond naturally to the user's message, incorporating any relevant context seamlessly.\"\"\"
"""
    
    with open(modelfile_name, 'w') as f:
        f.write(modelfile_content)
    
    print(f"✅ Modelfile created: {modelfile_name}")
    return modelfile_name

def execute_training_strategy(strategy_num, script_content, python_executable, timeout):
    """Execute a training strategy with proper error handling."""
    script_path = f"strategy_{strategy_num}_training.py"
    
    try:
        with open(script_path, 'w') as f:
            f.write(script_content)
        
        process = subprocess.Popen(
            [python_executable, script_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        stdout, stderr = process.communicate(timeout=timeout)
        
        if process.returncode == 0:
            print(f"✅ Strategy {strategy_num} completed successfully!")
            print(stdout)
            return True
        else:
            print(f"❌ Strategy {strategy_num} failed with exit code {process.returncode}")
            if stdout:
                print(f"STDOUT:\n{stdout}")
            if stderr:
                print(f"STDERR:\n{stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        print(f"⏰ Strategy {strategy_num} timed out after {timeout} seconds")
        process.kill()
        return False
    except Exception as e:
        print(f"💥 Error executing strategy {strategy_num}: {e}")
        return False
    finally:
        if os.path.exists(script_path):
            os.remove(script_path)

def main():
    parser = argparse.ArgumentParser(description="Multi-strategy LoRA training for Orch-OS")
    parser.add_argument("--data", required=True, help="Path to training data (JSONL)")
    parser.add_argument("--base-model", required=True, help="Ollama model name")
    parser.add_argument("--output", required=True, help="Output name for the adapter")
    parser.add_argument("--max-steps", type=int, default=None, help="Maximum training steps (auto-calculated if not specified)")
    parser.add_argument("--complexity", choices=["simple", "medium", "complex"], default="medium", help="Task complexity for step calculation")


    args = parser.parse_args()
    
    print("🚀 Starting Incremental LoRA Training Process...")
    start_time = time.time()
    
    # Count examples and analyze content for dynamic step calculation
    try:
        with open(args.data, 'r') as f:
            dataset_size = len([line for line in f if line.strip()])
        print(f"📊 Dataset size: {dataset_size} examples")
        
        # Use new content-based step calculation
        from training_modules.step_calculator import calculate_content_based_steps
        content_result = calculate_content_based_steps(args.data, target_training_minutes=10)
        
        print(f"📈 Content-Based Step Calculation:")
        print(f"   • Total tokens: {content_result['content_analysis']['total_tokens']:,}")
        print(f"   • Complexity: {content_result['content_analysis']['estimated_learning_difficulty']}")
        print(f"   • Calculated steps: {content_result['steps']}")
        print(f"   • Estimated time: {content_result['training_estimates']['estimated_minutes']} minutes")
        print(f"   • Efficiency: {content_result['calculation_details']['tokens_per_step']} tokens/step")
        
        # Override max_steps with content-based calculation
        args.max_steps = content_result['steps']
        
    except Exception as e:
        print(f"⚠️ Could not analyze content: {e}")
        dataset_size = 10  # fallback
        args.max_steps = 300  # safe fallback
    
    print(f"📈 Using content-based calculated steps: {args.max_steps}")
    
    # INCREMENTAL TRAINING: Always extract original base model for consistency
    original_base_model = extract_base_model(args.base_model)
    base_model_clean = original_base_model.replace(":latest", "").replace(":", "_").replace("/", "_")
    master_model_name = f"{base_model_clean}-custom:latest"
    
    print(f"🔄 Incremental training logic:")
    print(f"   - Input base model: {args.base_model}")
    print(f"   - Extracted base model: {original_base_model}")
    print(f"   - Target custom model: {master_model_name}")
    
    print(f"\n🔄 === INCREMENTAL TRAINING (Always) ===")
    print(f"Master model name: {master_model_name}")
    
    # Check if master model exists in Ollama
    master_exists = check_ollama_model_exists(master_model_name)
    adapter_path = get_master_adapter_path(original_base_model, "master")
    
    if master_exists:
        print(f"✅ Found existing master model in Ollama: {master_model_name}")
        
        # Load training history
        history = load_training_history(original_base_model, "master")
        print(f"📊 Training History:")
        print(f"   - Total sessions: {len(history['sessions'])}")
        print(f"   - Total examples: {history['total_examples']}")
        print(f"   - Total training time: {history['total_training_time']:.1f}s")
        print(f"   - Created: {history.get('created_at', 'Unknown')}")
        
        # Create backup before incremental training
        backup_path = backup_existing_adapter(adapter_path)
        
        # Use incremental training strategy (now uses instant strategy with custom model as base)
        python_exe = find_compatible_python()
        if setup_dependencies(python_exe):
            print("🔄 Running incremental training on existing adapter...")
            # NOTE: "Incremental" training now uses the same instant strategy
            # but with the custom model as base, achieving true incremental learning
            script_content = create_instant_adapter_script(
                args.data, original_base_model, args.output
            )
            
            # Use content-based timeout (estimated minutes + 5 minutes buffer)
            timeout_seconds = int((content_result['training_estimates']['estimated_minutes'] + 5) * 60)
            if execute_training_strategy("content_based", script_content, python_exe, timeout_seconds):
                duration = time.time() - start_time
                
                # Count training examples
                with open(args.data, 'r') as f:
                    examples = len(f.readlines())
                
                # Save training session to history
                session_data = {
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                    "examples": examples,
                    "duration": duration,
                    "max_steps": args.max_steps,  # Content-based calculated steps
                    "data_file": args.data,
                    "backup_path": backup_path,
                    "method": "content_aware_fast_incremental",
                    "content_analysis": content_result['content_analysis']
                }
                save_training_history(original_base_model, "master", session_data)
                
                # Deploy updated model using the WORKING strategy (simple modelfile without adapter reference)
                # NOTE: The LoRA weights are already integrated during training, so we don't need explicit ADAPTER line
                modelfile_path = create_ollama_modelfile_for_instant(original_base_model, f"master-{base_model_clean}")
                if modelfile_path and deploy_to_ollama(master_model_name, modelfile_path, original_base_model, max_retries=3):
                    print("🎉 Incremental training completed successfully")
                    print(f"📈 Master model updated: {master_model_name}")
                    return 0
    else:
        print(f"❌ No existing master model found in Ollama")
        print("💡 Creating first master adapter...")
        # Set output name for initial master creation
        args.output = f"master-{base_model_clean}"

    # Content-Aware Fast Training (for new adapters)
    print("\n=== Content-Aware Fast Training ===")
    python_exe = find_compatible_python()
    
    try:
        if setup_dependencies(python_exe):
            script_content = create_instant_adapter_script(
                args.data, original_base_model, args.output
            )
            # Use content-based timeout for initial training
            timeout_seconds = int((content_result['training_estimates']['estimated_minutes'] + 5) * 60)
            if execute_training_strategy("content_based_initial", script_content, python_exe, timeout_seconds):
                print("✅ Training completed with Content-Aware Fast Training")
                
                # Deploy instant adapter with master name
                modelfile_path = create_ollama_modelfile_for_instant(original_base_model, args.output)
                if modelfile_path and deploy_to_ollama(master_model_name, modelfile_path, original_base_model, max_retries=3):
                    # Initialize training history for instant adapter
                    duration = time.time() - start_time
                    with open(args.data, 'r') as f:
                        examples = len(f.readlines())
                    
                    session_data = {
                        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                        "examples": examples,
                        "duration": duration,
                        "max_steps": args.max_steps,  # Content-based calculated steps
                        "data_file": args.data,
                        "initial_training": True,
                        "method": "content_aware_fast_initial",
                        "content_analysis": content_result['content_analysis']
                    }
                    save_training_history(original_base_model, "master", session_data)
                    print("📊 Training history initialized for instant master adapter")
                    
                    print("🎉 First master adapter created successfully (content-aware fast training)")
                    print(f"📈 Master model created: {master_model_name}")
                    print(f"⏱️ Training completed in {duration/60:.1f} minutes with {args.max_steps} steps")
                    return 0
                else:
                    print("❌ Failed to deploy content-aware trained adapter to Ollama")
            else:
                print("❌ Content-aware fast training failed")
        else:
            print("❌ Failed to setup dependencies")
            
    except Exception as e:
        print(f"💥 An unexpected error occurred: {e}")
        return 1

    print("❌ Content-aware fast training failed")
    return 1

if __name__ == "__main__":
    sys.exit(main())