# SPDX-License-Identifier: MIT OR Apache-2.0
# Ollama Deployment Module for LoRA Training

import subprocess
import os
import time

def verify_adapter_files(adapter_path):
    """Verify that adapter files exist and are ready for deployment."""
    try:
        if not os.path.exists(adapter_path):
            print(f"❌ Adapter path does not exist: {adapter_path}")
            return False
            
        # Check for essential LoRA files
        essential_files = ["adapter_config.json", "adapter_model.safetensors"]
        missing_files = []
        
        for file in essential_files:
            file_path = os.path.join(adapter_path, file)
            if not os.path.exists(file_path):
                missing_files.append(file)
        
        if missing_files:
            print(f"❌ Missing adapter files: {missing_files}")
            return False
            
        print(f"✅ Adapter files verified: {adapter_path}")
        return True
        
    except Exception as e:
        print(f"❌ Error verifying adapter files: {e}")
        return False

def create_ollama_modelfile(base_model, adapter_path, output_name):
    """Create Modelfile for Ollama with LoRA adapter."""
    try:
        # Wait a moment for file system sync
        time.sleep(0.5)
        
        # Verify adapter files exist before creating Modelfile
        if not verify_adapter_files(adapter_path):
            print(f"⚠️ Adapter verification failed, but continuing...")
        
        modelfile_name = f"Modelfile_{output_name}"
        
        # Check if we have a real adapter or simplified one
        training_summary_path = os.path.join(adapter_path, "training_summary.json")
        method = "peft_training" if os.path.exists(training_summary_path) else "instant_creation"

        # Resolve to absolute path for Ollama
        absolute_adapter_path = os.path.abspath(adapter_path)
        
        modelfile_content = f"""FROM {base_model}

# LoRA Adapter trained with Orch-OS
# Method: {method}
# Created: {output_name}

ADAPTER {absolute_adapter_path}

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
        
        # Verify Modelfile was created and has content
        if not os.path.exists(modelfile_name) or os.path.getsize(modelfile_name) == 0:
            print(f"❌ Modelfile creation failed or is empty")
            return None
            
        print(f"✅ Modelfile created: {modelfile_name}")
        return modelfile_name
    except Exception as e:
        print(f"❌ Error creating Modelfile: {e}")
        return None

def deploy_to_ollama(model_name, modelfile_path, base_model, max_retries=3):
    """Deploy the model with LoRA adapter to Ollama with retry logic."""
    for attempt in range(max_retries):
        try:
            print(f"🚀 Creating Ollama model: {model_name} (attempt {attempt + 1}/{max_retries})")
            
            # Verify modelfile exists before proceeding
            if not os.path.exists(modelfile_path):
                print(f"❌ Modelfile not found: {modelfile_path}")
                if attempt < max_retries - 1:
                    print(f"⏳ Waiting 2 seconds before retry...")
                    time.sleep(2)
                    continue
                return False
            
            # Check if model already exists and remove it
            result = subprocess.run(["ollama", "list"], capture_output=True, text=True)
            if model_name in result.stdout:
                print(f"🔄 Removing existing model: {model_name}")
                try:
                    subprocess.run(["ollama", "rm", model_name], capture_output=True, text=True, check=True)
                    print(f"✅ Existing model removed: {model_name}")
                    # Wait after removal to ensure cleanup
                    time.sleep(1)
                except subprocess.CalledProcessError as e:
                    print(f"⚠️ Could not remove existing model: {e.stderr}")
                    # Continue anyway - Ollama might overwrite
            
            # Pull base model if not available
            if base_model not in result.stdout:
                print(f"📥 Pulling base model {base_model}...")
                subprocess.run(["ollama", "pull", base_model], check=True)
            
            # Wait for file system sync before creating model
            time.sleep(1)
            
            # Create model with detailed error handling
            result = subprocess.run(
                ["ollama", "create", model_name, "-f", modelfile_path],
                capture_output=True, text=True, check=True
            )
            
            print(f"✅ Model created successfully: {model_name}")
            
            # Verify model was actually created
            verify_result = subprocess.run(["ollama", "list"], capture_output=True, text=True)
            if model_name in verify_result.stdout:
                print(f"✅ Model verified in Ollama: {model_name}")
                return True
            else:
                print(f"⚠️ Model created but not found in list, retrying...")
                if attempt < max_retries - 1:
                    time.sleep(2)
                    continue
                    
        except subprocess.CalledProcessError as e:
            error_msg = e.stderr.strip() if e.stderr else str(e)
            print(f"❌ Deployment attempt {attempt + 1} failed: {error_msg}")
            
            if "no Modelfile or safetensors files found" in error_msg and attempt < max_retries - 1:
                print(f"⏳ File sync issue detected, waiting 3 seconds before retry...")
                time.sleep(3)
                continue
            elif attempt < max_retries - 1:
                print(f"⏳ Waiting 2 seconds before retry...")
                time.sleep(2)
                continue
            else:
                print(f"❌ All {max_retries} deployment attempts failed")
                return False
                
        except Exception as e:
            print(f"❌ Unexpected error in attempt {attempt + 1}: {e}")
            if attempt < max_retries - 1:
                print(f"⏳ Waiting 2 seconds before retry...")
                time.sleep(2)
                continue
            else:
                return False
    
    return False