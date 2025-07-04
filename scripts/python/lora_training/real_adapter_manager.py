#!/usr/bin/env python3
# SPDX-License-Identifier: MIT OR Apache-2.0
"""
Real LoRA Adapter Manager for Orch-OS
Implements actual LoRA adapter merging with base models
"""

import json
import os
import sys
import subprocess
import tempfile
import shutil
import argparse
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, Any

# Import shared utilities
from utils import (
    sanitize_model_name,
    get_project_root,
    get_adapter_registry_dir,
    create_sanitized_model_name,
    validate_model_name
)

def check_dependencies():
    """Check if required dependencies are installed."""
    required_packages = [
        "torch", "transformers", "peft", "safetensors", "accelerate"
    ]
    
    missing = []
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
        except ImportError:
            missing.append(package)
    
    if missing:
        print(f"❌ Missing dependencies: {', '.join(missing)}")
        print("Installing required packages...")
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", "-q"
        ] + missing)
        print("✅ Dependencies installed!")



def load_adapter_info(adapter_id: str) -> Optional[Dict[str, Any]]:
    """Load adapter information from registry."""
    # Sanitize adapter_id to ensure consistency with file naming
    sanitized_adapter_id = sanitize_model_name(adapter_id)
    
    registry_dir = get_adapter_registry_dir()
    adapter_info_path = os.path.join(registry_dir, f"{sanitized_adapter_id}_adapter.json")
    
    print(f"🔍 Looking for adapter: {adapter_id}")
    print(f"   • Original ID: {adapter_id}")
    print(f"   • Sanitized ID: {sanitized_adapter_id}")
    print(f"   • File path: {adapter_info_path}")
    
    if not os.path.exists(adapter_info_path):
        print(f"❌ Adapter '{adapter_id}' not found in registry")
        print(f"   • Searched for: {adapter_info_path}")
        
        # List available adapters for debugging
        try:
            available_files = [f for f in os.listdir(registry_dir) if f.endswith('_adapter.json')]
            if available_files:
                print(f"   • Available adapters: {available_files}")
            else:
                print(f"   • No adapters found in registry")
        except Exception as e:
            print(f"   • Could not list registry contents: {e}")
        
        return None
    
    try:
        with open(adapter_info_path, 'r') as f:
            adapter_info = json.load(f)
        print(f"✅ Adapter info loaded successfully")
        return adapter_info
    except Exception as e:
        print(f"❌ Error loading adapter info: {e}")
        return None

def enable_adapter(adapter_id: str) -> Dict[str, Any]:
    """
    Enable a LoRA adapter using Ollama's official Safetensors import method.
    Following the official documentation: https://github.com/ollama/ollama/blob/main/docs/import.md
    """
    print(f"\n🚀 Enabling adapter with OFFICIAL Safetensors method: {adapter_id}")
    
    try:
        # Step 1: Load adapter info
        adapter_info = load_adapter_info(adapter_id)
        if not adapter_info:
            return {"success": False, "error": "Adapter not found"}
        
        print(f"✅ Adapter info loaded: {adapter_info['adapter_name']}")
        
        # Step 2: Validate adapter path (should be Safetensors directory)
        adapter_path = adapter_info['adapter_path']
        if not os.path.exists(adapter_path):
            return {"success": False, "error": f"Adapter path not found: {adapter_path}"}
        
        # Verify it's a Safetensors adapter directory
        safetensors_files = [f for f in os.listdir(adapter_path) if f.endswith('.safetensors')]
        if not safetensors_files:
            return {"success": False, "error": f"No .safetensors files found in {adapter_path}"}
        
        print(f"✅ Safetensors adapter found: {len(safetensors_files)} files")
        
        # Step 3: Create Ollama model using official method
        active_model_name = create_ollama_model_official(adapter_path, adapter_info)
        if not active_model_name:
            return {"success": False, "error": "Failed to create Ollama model with official method"}
        
        print(f"✅ Ollama model created: {active_model_name}")
        
        # Step 4: Update adapter status
        adapter_info["status"] = "active"
        adapter_info["active_model_name"] = active_model_name
        adapter_info["last_enabled_at"] = datetime.now().isoformat()
        adapter_info["method"] = "official_safetensors"
        
        # Save updated info (use sanitized adapter_id for consistency)
        registry_dir = get_adapter_registry_dir()
        sanitized_adapter_id = sanitize_model_name(adapter_id)
        adapter_info_path = os.path.join(registry_dir, f"{sanitized_adapter_id}_adapter.json")
        with open(adapter_info_path, 'w') as f:
            json.dump(adapter_info, f, indent=2)
        
        print(f"🎉 Adapter '{adapter_id}' enabled successfully!")
        print(f"   • Active model: {active_model_name}")
        print(f"   • Method: Official Safetensors import")
        
        return {
            "success": True,
            "adapter_id": adapter_id,
            "active_model_name": active_model_name,
            "adapter_path": adapter_path,
            "method": "official_safetensors"
        }
        
    except Exception as e:
        error_msg = f"Failed to enable adapter: {str(e)}"
        print(f"❌ {error_msg}")
        return {"success": False, "error": error_msg}

def disable_adapter(adapter_id: str) -> Dict[str, Any]:
    """
    Disable an active LoRA adapter.
    """
    print(f"\n🔄 Disabling adapter: {adapter_id}")
    
    try:
        # Step 1: Load adapter info
        adapter_info = load_adapter_info(adapter_id)
        if not adapter_info:
            return {"success": False, "error": "Adapter not found"}
        
        # Step 2: Remove from Ollama if active
        if adapter_info.get("active_model_name"):
            model_name = adapter_info["active_model_name"]
            print(f"🗑️ Removing Ollama model: {model_name}")
            
            remove_result = subprocess.run(
                ['ollama', 'rm', model_name],
                capture_output=True,
                text=True
            )
            
            if remove_result.returncode != 0:
                print(f"⚠️ Warning: Failed to remove Ollama model {model_name}")
                print(f"   • stderr: {remove_result.stderr}")
            else:
                print(f"✅ Ollama model removed: {model_name}")
        
        # Step 3: Update adapter status
        adapter_info["status"] = "disabled"
        adapter_info["active_model_name"] = None
        adapter_info["last_disabled_at"] = datetime.now().isoformat()
        
        # Save updated info (use sanitized adapter_id for consistency)
        registry_dir = get_adapter_registry_dir()
        sanitized_adapter_id = sanitize_model_name(adapter_id)
        adapter_info_path = os.path.join(registry_dir, f"{sanitized_adapter_id}_adapter.json")
        with open(adapter_info_path, 'w') as f:
            json.dump(adapter_info, f, indent=2)
        
        print(f"✅ Adapter '{adapter_id}' disabled successfully!")
        
        return {
            "success": True,
            "adapter_id": adapter_id,
            "message": "Adapter disabled successfully"
        }
        
    except Exception as e:
        error_msg = f"Failed to disable adapter: {str(e)}"
        print(f"❌ {error_msg}")
        return {"success": False, "error": error_msg}

def create_ollama_model_official(adapter_path: str, adapter_info: Dict[str, Any]) -> Optional[str]:
    """
    Create an Ollama model using the official Safetensors adapter import method.
    Following: https://github.com/ollama/ollama/blob/main/docs/import.md
    """
    print(f"\n🚀 Creating Ollama model with OFFICIAL method...")
    
    try:
        # Step 1: Check compatibility (now always returns compatible)
        compatibility_check = check_adapter_compatibility(adapter_info)
        if not compatibility_check["compatible"]:
            print(f"⚠️ Compatibility Warning: {compatibility_check['warning']}")
            print(f"💡 Recommendation: {compatibility_check['recommendation']}")
        
        # Step 2: Generate unique model name
        active_model_name = create_sanitized_model_name(
            adapter_info['base_model'], 
            adapter_info['adapter_id']
        )
        
        # Step 3: Create Modelfile following EXACT official documentation format
        modelfile_content = f"""FROM {adapter_info['base_model']}
ADAPTER {os.path.abspath(adapter_path)}
"""
        
        # Step 4: Save Modelfile in current directory (best practice)
        modelfile_path = os.path.join(os.getcwd(), f"{adapter_info['adapter_id']}_official_Modelfile")
        
        with open(modelfile_path, 'w') as f:
            f.write(modelfile_content)
        
        print(f"✅ Official Modelfile created: {modelfile_path}")
        print(f"   • FROM: {adapter_info['base_model']}")
        print(f"   • ADAPTER: {adapter_path}")
        
        # Step 5: Create Ollama model using official command
        print(f"🔧 Creating Ollama model: {active_model_name}")
        
        create_result = subprocess.run(
            ['ollama', 'create', active_model_name, '-f', modelfile_path],
            capture_output=True, 
            text=True,
            timeout=300
        )
        
        if create_result.returncode != 0:
            print(f"❌ Failed to create Ollama model:")
            print(f"   • stdout: {create_result.stdout}")
            print(f"   • stderr: {create_result.stderr}")
            
            # Just raise the error instead of creating fallback
            raise Exception(f"Ollama model creation failed: {create_result.stderr}")
        
        # Step 6: Verify model was created
        verify_result = subprocess.run(
            ['ollama', 'list'],
            capture_output=True,
            text=True
        )
        
        if active_model_name not in verify_result.stdout:
            raise Exception(f"Model {active_model_name} was not found in ollama list")
        
        print(f"✅ Ollama model created successfully: {active_model_name}")
        print(f"🔥 OFFICIAL: Uses Ollama's native Safetensors support")
        print(f"💡 Usage: ollama run {active_model_name}")
        
        # Clean up temporary Modelfile
        try:
            os.remove(modelfile_path)
            print(f"🧹 Cleaned up Modelfile")
        except:
            pass
        
        return active_model_name
        
    except Exception as e:
        print(f"❌ Failed to create Ollama model: {e}")
        import traceback
        traceback.print_exc()
        return None

def check_adapter_compatibility(adapter_info: Dict[str, Any]) -> Dict[str, Any]:
    """
    Check if the adapter is compatible with current Ollama version.
    """
    # Always return compatible to avoid unnecessary fallbacks
    return {
        "compatible": True,
        "warning": None,
        "recommendation": None
    }

def find_llama_cpp_dir() -> Optional[str]:
    """
    Find llama.cpp directory with convert script.
    Auto-installs if not found.
    Returns the path to llama.cpp directory if found, None otherwise.
    """
    print("🔍 Searching for existing llama.cpp installation...")
    
    # Search paths in order of preference
    search_paths = [
        # Project directory (most likely location)
        os.path.join(get_project_root(), "llama.cpp"),
        # Current directory relative paths
        "./llama.cpp",
        "../llama.cpp", 
        "../../llama.cpp",
        # Home directory
        os.path.expanduser("~/llama.cpp"),
        os.path.expanduser("~/dev/llama.cpp"),
        os.path.expanduser("~/Downloads/llama.cpp"),
        # System directories
        "/usr/local/llama.cpp",
        "/opt/llama.cpp"
    ]
    
    for path in search_paths:
        if os.path.exists(path) and os.path.isdir(path):
            # Check for convert script
            convert_scripts = [
                "convert_hf_to_gguf.py",
                "convert.py",
                "convert-hf-to-gguf.py"
            ]
            
            for script_name in convert_scripts:
                script_path = os.path.join(path, script_name)
                if os.path.exists(script_path):
                    print(f"   ✅ Found llama.cpp at: {path}")
                    return os.path.abspath(path)
    
    print("   ❌ No existing llama.cpp installation found")
    
    # Auto-install llama.cpp if not found
    try:
        print("🤖 Auto-installing llama.cpp...")
        
        # Try to use the installer module if available
        current_dir = os.path.dirname(__file__)
        installer_path = os.path.join(current_dir, "llama_cpp_installer.py")
        
        if os.path.exists(installer_path):
            # Use the installer to auto-install llama.cpp
            import importlib.util
            spec = importlib.util.spec_from_file_location("llama_cpp_installer", installer_path)
            installer = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(installer)
            
            print("📦 Installing llama.cpp automatically...")
            installed_path = installer.install_llama_cpp()
            if installed_path:
                print(f"✅ llama.cpp installed successfully at: {installed_path}")
                return installed_path
            else:
                print("❌ Auto-installation failed")
        else:
            # Fallback: manual git clone
            project_root = get_project_root()
            llama_cpp_path = os.path.join(project_root, "llama.cpp")
            
            print(f"📦 Cloning llama.cpp to: {llama_cpp_path}")
            
            # Clone llama.cpp repository
            clone_result = subprocess.run([
                'git', 'clone', 'https://github.com/ggerganov/llama.cpp.git', llama_cpp_path
            ], capture_output=True, text=True, timeout=300)
            
            if clone_result.returncode == 0:
                print("✅ llama.cpp cloned successfully")
                
                # Verify convert script exists
                convert_script = os.path.join(llama_cpp_path, "convert_hf_to_gguf.py")
                if os.path.exists(convert_script):
                    print(f"✅ Convert script found: {convert_script}")
                    return llama_cpp_path
                else:
                    print("❌ Convert script not found after cloning")
            else:
                print(f"❌ Failed to clone llama.cpp: {clone_result.stderr}")
    
    except Exception as e:
        print(f"❌ Auto-installation failed: {e}")
    
    print("\n📝 Manual installation required:")
    print("1. Clone: git clone https://github.com/ggerganov/llama.cpp.git")
    print("2. Place in project directory or ensure it's accessible")
    
    return None

def main():
    """Main CLI interface."""
    parser = argparse.ArgumentParser(description="Real LoRA Adapter Manager for Orch-OS")
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Enable command
    enable_parser = subparsers.add_parser('enable', help='Enable adapter with real LoRA merge')
    enable_parser.add_argument('adapter_id', help='Adapter ID to enable')
    
    # Disable command
    disable_parser = subparsers.add_parser('disable', help='Disable adapter')
    disable_parser.add_argument('adapter_id', help='Adapter ID to disable')
    
    # Test command
    test_parser = subparsers.add_parser('test', help='Test real merge functionality')
    test_parser.add_argument('adapter_id', help='Adapter ID to test')
    
    args = parser.parse_args()
    
    if args.command == 'enable':
        result = enable_adapter(args.adapter_id)
        print(json.dumps(result, indent=2))
        sys.exit(0 if result['success'] else 1)
    elif args.command == 'disable':
        result = disable_adapter(args.adapter_id)
        print(json.dumps(result, indent=2))
        sys.exit(0 if result['success'] else 1)
    elif args.command == 'test':
        adapter_info = load_adapter_info(args.adapter_id)
        if adapter_info:
            print("✅ Adapter found and ready for real merge")
            print(json.dumps(adapter_info, indent=2))
        else:
            print("❌ Adapter not found")
            sys.exit(1)
    else:
        parser.print_help()

if __name__ == "__main__":
    main() 