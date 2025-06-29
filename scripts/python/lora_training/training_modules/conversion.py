# SPDX-License-Identifier: MIT OR Apache-2.0
# GGUF Conversion Module for LoRA Training

import subprocess
import os
import json
import shutil

def check_llama_cpp():
    """Check if llama.cpp is available for conversion."""
    llama_cpp_path = os.path.expanduser("~/llama.cpp")
    if not os.path.exists(llama_cpp_path):
        print("⚠️  llama.cpp not found, GGUF conversion will be skipped")
        print("   To enable: git clone https://github.com/ggerganov/llama.cpp ~/llama.cpp")
        return None
    return llama_cpp_path

def convert_adapter_to_gguf(adapter_path, output_name):
    """Convert LoRA adapter to GGUF format using llama.cpp."""
    try:
        llama_cpp_path = check_llama_cpp()
        if not llama_cpp_path:
            return None
            
        adapter_config_path = os.path.join(adapter_path, "adapter_config.json")
        if not os.path.exists(adapter_config_path):
            print("❌ No adapter_config.json found")
            return None
            
        print("🔄 Converting LoRA adapter to GGUF format...")
        
        # Run conversion script
        convert_script = os.path.join(llama_cpp_path, "convert-lora-to-ggml.py")
        if not os.path.exists(convert_script):
            print("❌ Conversion script not found in llama.cpp")
            return None
            
        result = subprocess.run(
            ["python", convert_script, adapter_config_path],
            capture_output=True, text=True
        )
        
        if result.returncode != 0:
            print(f"❌ Conversion failed: {result.stderr}")
            return None
            
        # Find generated .bin file
        current_dir = os.getcwd()
        for file in os.listdir(current_dir):
            if file.startswith("ggml-adapter-") and file.endswith(".bin"):
                gguf_path = os.path.join(current_dir, file)
                # Move to adapter directory
                target_path = os.path.join(adapter_path, f"adapter_{output_name}.bin")
                shutil.move(gguf_path, target_path)
                print(f"✅ GGUF adapter created: {target_path}")
                return target_path
                
        print("❌ No GGUF file generated")
        return None
        
    except Exception as e:
        print(f"❌ GGUF conversion error: {e}")
        return None

def create_modelfile_with_adapter(base_model, adapter_path, output_name, use_gguf=False):
    """Create Modelfile with adapter (GGUF or directory)."""
    modelfile_name = f"Modelfile_{output_name}"
    
    # Check for GGUF adapter
    gguf_adapter = None
    if use_gguf:
        for file in os.listdir(adapter_path):
            if file.endswith(".bin"):
                gguf_adapter = os.path.join(adapter_path, file)
                break
    
    # Use GGUF if available, otherwise use directory
    adapter_to_use = gguf_adapter if gguf_adapter else adapter_path
    adapter_type = "GGUF" if gguf_adapter else "PEFT"
    
    modelfile_content = f"""FROM {base_model}

# LoRA Adapter trained with Orch-OS
# Type: {adapter_type}
# Created: {output_name}

ADAPTER {os.path.abspath(adapter_to_use)}

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
    
    print(f"✅ Modelfile created ({adapter_type} adapter): {modelfile_name}")
    return modelfile_name 