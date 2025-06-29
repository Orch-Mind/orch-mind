# SPDX-License-Identifier: MIT OR Apache-2.0
# Ollama Deployment Module for LoRA Training

import subprocess
import os

def create_ollama_modelfile(base_model, adapter_path, output_name):
    """Create Modelfile for Ollama with LoRA adapter."""
    try:
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
        
        print(f"✅ Modelfile created: {modelfile_name}")
        return modelfile_name
    except Exception as e:
        print(f"❌ Error creating Modelfile: {e}")
        return None

def deploy_to_ollama(model_name, modelfile_path, base_model):
    """Deploy the model with LoRA adapter to Ollama."""
    try:
        print(f"🚀 Creating Ollama model: {model_name}")
        
        # Check if model already exists and remove it
        result = subprocess.run(["ollama", "list"], capture_output=True, text=True)
        if model_name in result.stdout:
            print(f"🔄 Removing existing model: {model_name}")
            try:
                subprocess.run(["ollama", "rm", model_name], capture_output=True, text=True, check=True)
                print(f"✅ Existing model removed: {model_name}")
            except subprocess.CalledProcessError as e:
                print(f"⚠️ Could not remove existing model: {e.stderr}")
                # Continue anyway - Ollama might overwrite
        
        # Pull base model if not available
        if base_model not in result.stdout:
            print(f"📥 Pulling base model {base_model}...")
            subprocess.run(["ollama", "pull", base_model], check=True)
        
        # Create model
        result = subprocess.run(
            ["ollama", "create", model_name, "-f", modelfile_path],
            capture_output=True, text=True, check=True
        )
        
        print(f"✅ Model created successfully: {model_name}")
        return True
            
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to deploy to Ollama: {e.stderr}")
        return False
    except Exception as e:
        print(f"❌ Error deploying to Ollama: {e}")
        return False