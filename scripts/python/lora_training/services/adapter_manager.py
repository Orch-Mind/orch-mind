# SPDX-License-Identifier: MIT OR Apache-2.0
"""
Adapter manager service implementation
"""

import json
import os
import shutil
from typing import Optional, Dict, Any, List
from interfaces.i_adapter_manager import IAdapterManager
from interfaces.i_ollama_service import IOllamaService
from models.adapter_info import AdapterInfo
from utils import (
    sanitize_model_name, 
    get_project_root, 
    create_sanitized_model_name
)


class AdapterManager(IAdapterManager):
    """Concrete implementation of adapter management."""
    
    def __init__(self, ollama_service: IOllamaService):
        self.ollama_service = ollama_service
        self.registry_dir = self._get_registry_dir()
    
    def register_adapter(self, adapter_id: str, base_model: str, hf_model: str, 
                        adapter_path: str) -> Optional[Any]:
        """Register a new adapter."""
        try:
            # Sanitize adapter_id to ensure compatibility
            adapter_id_clean = sanitize_model_name(adapter_id)
            print(f"🧹 Sanitized adapter name: {adapter_id} → {adapter_id_clean}")
            
            # Create persistent adapter paths
            persistent_adapter_dir = os.path.join(
                get_project_root(), "lora_adapters", "weights"
            )
            os.makedirs(persistent_adapter_dir, exist_ok=True)
            
            persistent_adapter_path = os.path.join(
                persistent_adapter_dir, f"{adapter_id_clean}_adapter"
            )
            
            # Copy adapter weights to persistent location
            if os.path.exists(adapter_path):
                if os.path.exists(persistent_adapter_path):
                    shutil.rmtree(persistent_adapter_path)
                shutil.copytree(adapter_path, persistent_adapter_path)
                print(f"💾 Adapter weights copied to: {persistent_adapter_path}")
            else:
                print(f"⚠️ Warning: Adapter path not found: {adapter_path}")
                print(f"   Creating placeholder entry in registry...")
            
            # Create adapter info
            adapter_info = AdapterInfo.create_new(
                adapter_id=adapter_id_clean,
                base_model=base_model,
                hf_model=hf_model,
                adapter_path=persistent_adapter_path,
                registry_path=self.registry_dir
            )
            
            # Save adapter info to registry
            adapter_info_path = os.path.join(
                self.registry_dir, f"{adapter_id_clean}_adapter.json"
            )
            with open(adapter_info_path, 'w') as f:
                json.dump(adapter_info.to_dict(), f, indent=2)
            
            print(f"✅ Adapter registered: {adapter_info.adapter_name}")
            print(f"📂 Registry file: {adapter_info_path}")
            
            return adapter_info
            
        except Exception as e:
            print(f"❌ Failed to register adapter: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def enable_adapter(self, adapter_id: str) -> Dict[str, Any]:
        """Enable an adapter using the appropriate strategy based on model type."""
        adapter_info = self.get_adapter_info(adapter_id)
        if not adapter_info:
            return {"success": False, "error": "Adapter not found"}
        
        try:
            print(f"\n🚀 Enabling adapter: {adapter_id}")
            print(f"   • Base Model: {adapter_info.base_model}")
            print(f"   • HuggingFace Model: {adapter_info.hf_model}")
            
            # Check compatibility (Unsloth detection)
            compatibility = self._check_adapter_compatibility(adapter_info)
            
            if compatibility.get("is_unsloth"):
                # For Unsloth models, use the final merged model approach
                return self._enable_unsloth_final_model(adapter_info, adapter_id)
            else:
                # For standard models, use ADAPTER directive
                return self._enable_standard_adapter(adapter_info, adapter_id)
                
        except Exception as e:
            error_msg = f"Failed to enable adapter: {str(e)}"
            print(f"❌ {error_msg}")
            return {"success": False, "error": error_msg}
    
    def _enable_unsloth_final_model(self, adapter_info: Any, adapter_id: str) -> Dict[str, Any]:
        """Enable Unsloth adapter by activating the final merged model."""
        print(f"🔗 UNSLOTH MODEL: Using final merged model approach")
        
        # The final model should have been created during training
        final_model_name = f"{adapter_id}-final"
        
        # Check if final model exists in Ollama
        if not self.ollama_service.model_exists(final_model_name):
            return {
                "success": False,
                "error": f"Final merged model '{final_model_name}' not found. Please retrain the adapter using the complete Unsloth workflow."
            }
        
        print(f"✅ Final merged model found: {final_model_name}")
        print(f"💡 This model contains base model + LoRA adapter merged together")
        print(f"🎯 No ADAPTER directive needed - model is ready to use directly")
        
        # Create an alias or just return success since the model is already available
        return {
            "success": True,
            "message": f"Unsloth adapter enabled successfully",
            "final_model": final_model_name,
            "strategy": "unsloth_final_model",
            "description": "Final merged model is ready for use",
            "usage": f"Use model '{final_model_name}' in Ollama"
        }
    
    def _enable_standard_adapter(self, adapter_info: Any, adapter_id: str) -> Dict[str, Any]:
        """Enable standard adapter using ADAPTER directive."""
        print(f"✅ STANDARD MODEL: Using ADAPTER directive approach")
        
        # Create Modelfile with ADAPTER directive
        active_model_name = self._create_active_model_name(adapter_info.base_model, adapter_id)
        modelfile_path = self._create_adapter_modelfile(adapter_info, active_model_name)
        
        if not modelfile_path:
            return {"success": False, "error": "Failed to create Modelfile"}
        
        # Create Ollama model
        success, error_msg = self._create_ollama_model_with_error_detection(
            active_model_name, modelfile_path, {"is_unsloth": False}
        )
        
        if success:
            print(f"✅ Standard adapter enabled successfully: {active_model_name}")
            return {
                "success": True,
                "message": f"Standard adapter enabled successfully",
                "active_model": active_model_name,
                "strategy": "adapter_directive",
                "description": "Adapter loaded using Ollama ADAPTER directive"
            }
        else:
            return {"success": False, "error": error_msg}
    
    def _create_active_model_name(self, base_model: str, adapter_id: str) -> str:
        """Create active model name for standard adapters."""
        return create_sanitized_model_name(base_model, adapter_id)
    
    def disable_adapter(self, adapter_id: str) -> Dict[str, Any]:
        """Disable an adapter."""
        adapter_info = self.get_adapter_info(adapter_id)
        if not adapter_info:
            return {"success": False, "error": "Adapter not found"}
        
        try:
            # Update adapter status
            adapter_info.disable()
            self._save_adapter_info(adapter_info)
            
            # Remove active Ollama model
            active_model_name = create_sanitized_model_name(
                adapter_info.base_model, adapter_id
            )
            
            self.ollama_service.remove_model(active_model_name)
            print(f"🔌 Adapter disabled: {adapter_id}")
            
            return {"success": True, "adapter_id": adapter_id}
            
        except Exception as e:
            return {"success": False, "error": f"Failed to disable adapter: {e}"}
    
    def get_adapter_info(self, adapter_id: str) -> Optional[Any]:
        """Get adapter information. Handles both original and sanitized adapter names."""
        # Try original adapter_id first
        adapter_info_path = os.path.join(
            self.registry_dir, f"{adapter_id}_adapter.json"
        )
        
        print(f"🔍 Looking for adapter: {adapter_id}")
        print(f"   • Trying original name: {adapter_info_path}")
        
        if os.path.exists(adapter_info_path):
            try:
                with open(adapter_info_path, 'r') as f:
                    data = json.load(f)
                print(f"✅ Found adapter with original name")
                return AdapterInfo.from_dict(data)
            except Exception as e:
                print(f"❌ Failed to load adapter info: {e}")
        
        # Try sanitized adapter_id
        sanitized_adapter_id = sanitize_model_name(adapter_id)
        if sanitized_adapter_id != adapter_id:
            sanitized_adapter_info_path = os.path.join(
                self.registry_dir, f"{sanitized_adapter_id}_adapter.json"
            )
            
            print(f"   • Trying sanitized name: {sanitized_adapter_id}")
            print(f"   • Sanitized path: {sanitized_adapter_info_path}")
            
            if os.path.exists(sanitized_adapter_info_path):
                try:
                    with open(sanitized_adapter_info_path, 'r') as f:
                        data = json.load(f)
                    print(f"✅ Found adapter with sanitized name")
                    return AdapterInfo.from_dict(data)
                except Exception as e:
                    print(f"❌ Failed to load sanitized adapter info: {e}")
        
        # If not found, list available adapters for debugging
        print(f"❌ Adapter '{adapter_id}' not found in registry")
        try:
            available_files = [f for f in os.listdir(self.registry_dir) if f.endswith('_adapter.json')]
            if available_files:
                print(f"   • Available adapters: {available_files}")
            else:
                print(f"   • No adapters found in registry")
        except Exception as e:
            print(f"   • Could not list registry contents: {e}")
        
        return None
    
    def list_adapters(self) -> List[Any]:
        """List all registered adapters."""
        adapters = []
        
        if not os.path.exists(self.registry_dir):
            return adapters
        
        for filename in os.listdir(self.registry_dir):
            if filename.endswith('_adapter.json'):
                adapter_id = filename.replace('_adapter.json', '')
                adapter_info = self.get_adapter_info(adapter_id)
                if adapter_info:
                    adapters.append(adapter_info)
        
        return adapters
    
    def _get_registry_dir(self) -> str:
        """Get the adapter registry directory."""
        project_root = get_project_root()
        registry_dir = os.path.join(project_root, "lora_adapters", "registry")
        os.makedirs(registry_dir, exist_ok=True)
        return registry_dir
    
    def _save_adapter_info(self, adapter_info: Any) -> None:
        """Save adapter info to registry."""
        adapter_info_path = os.path.join(
            self.registry_dir, f"{adapter_info.adapter_id}_adapter.json"
        )
        with open(adapter_info_path, 'w') as f:
            json.dump(adapter_info.to_dict(), f, indent=2)
    
    def _create_adapter_modelfile(self, adapter_info: Any, active_model_name: str) -> Optional[str]:
        """Create Modelfile with ADAPTER directive following Ollama documentation."""
        print(f"📝 Creating Modelfile with ADAPTER directive...")
        
        try:
            # Check if this is a Unsloth model to determine the correct base model
            compatibility = self._check_adapter_compatibility(adapter_info)
            
            if compatibility.get("is_unsloth"):
                # For Unsloth models, use the deployed base model (e.g., gemma3-latest-custom)
                base_model_for_adapter = adapter_info.base_model
                print(f"🔍 UNSLOTH MODEL: Using deployed base model: {base_model_for_adapter}")
                print(f"   • This uses the model deployed during training specifically for Unsloth adapters")
            else:
                # For standard models, use the original base model
                # Extract original model name by removing -custom suffix
                base_model_for_adapter = adapter_info.base_model.replace('-custom', '')
                print(f"✅ STANDARD MODEL: Using original base model: {base_model_for_adapter}")
            
            # Create Modelfile following EXACT official documentation format
            modelfile_content = f"""FROM {base_model_for_adapter}
ADAPTER {os.path.abspath(adapter_info.adapter_path)}

SYSTEM \"\"\"You are a helpful AI assistant.\"\"\"

PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER top_k 40
PARAMETER repeat_penalty 1.1

# Adapter Metadata
# ADAPTER_ID: {adapter_info.adapter_id}
# ADAPTER_PATH: {adapter_info.adapter_path}
# BASE_MODEL: {base_model_for_adapter}
# HF_MODEL: {adapter_info.hf_model}
# METHOD: adapter_directive
# UNSLOTH_COMPATIBLE: {compatibility.get("is_unsloth", False)}
"""
            
            # Save Modelfile in current directory (best practice)
            modelfile_path = os.path.join(os.getcwd(), f"{adapter_info.adapter_id}_adapter_Modelfile")
            
            with open(modelfile_path, 'w') as f:
                f.write(modelfile_content)
            
            print(f"✅ ADAPTER Modelfile created: {modelfile_path}")
            print(f"   • FROM: {base_model_for_adapter}")
            print(f"   • ADAPTER: {adapter_info.adapter_path}")
            
            if compatibility.get("is_unsloth"):
                print(f"   • Strategy: Using deployed Unsloth-compatible base model")
            else:
                print(f"   • Strategy: Using standard ADAPTER directive")
            
            return modelfile_path
            
        except Exception as e:
            print(f"❌ Failed to create Modelfile: {e}")
            return None
    
    def _check_adapter_compatibility(self, adapter_info: Any) -> Dict[str, Any]:
        """
        Check if the adapter is compatible with current Ollama version.
        Automatically detects Unsloth models and provides compatibility warnings.
        """
        base_model = adapter_info.base_model
        hf_model_name = adapter_info.hf_model
        adapter_id = adapter_info.adapter_id
        
        # Check if this is a Unsloth model by examining the HF model name
        is_unsloth_model = False
        unsloth_indicators = [
            'unsloth/', 'gemma-3', 'gemma-2', 'Qwen3', 'mistral-7b-v0.3', 
            'Mistral-Nemo', 'Llama-3.1', 'Llama-3'
        ]
        
        for indicator in unsloth_indicators:
            if indicator in hf_model_name:
                is_unsloth_model = True
                break
        
        # Also check base model name for Unsloth patterns
        unsloth_base_patterns = ['gemma3:', 'gemma3n:']
        for pattern in unsloth_base_patterns:
            if pattern in base_model:
                is_unsloth_model = True
                break
        
        if is_unsloth_model:
            return {
                "compatible": True,  # Still try the official method first
                "is_unsloth": True,
                "warning": "Unsloth adapter detected - may cause 'unsupported architecture' error in Ollama",
                "recommendation": "If official method fails, consider full model deployment approach",
                "expected_error": "Error: unsupported architecture"
            }
        else:
            print(f"✅ STANDARD MODEL DETECTED: {hf_model_name}")
            print(f"   • Expected compatibility: HIGH")
            
            return {
                "compatible": True,
                "is_unsloth": False,
                "warning": None,
                "recommendation": "Should work with standard Ollama ADAPTER directive"
            }
    
    def _create_ollama_model_with_error_detection(self, active_model_name: str, 
                                                modelfile_path: str, 
                                                compatibility: Dict[str, Any]) -> tuple[bool, str]:
        """
        Create Ollama model with enhanced error detection for Unsloth incompatibility.
        Returns (success, error_message).
        """
        try:
            print(f"🔧 Creating Ollama model: {active_model_name}")
            
            # Try to create the model
            success = self.ollama_service.create_model(active_model_name, modelfile_path)
            
            if success:
                return True, ""
            else:
                # If creation failed, check if it's a known Unsloth issue
                if compatibility.get("is_unsloth"):
                    error_msg = self._generate_unsloth_error_message(compatibility)
                    return False, error_msg
                else:
                    return False, "Failed to create Ollama model"
                    
        except Exception as e:
            error_str = str(e)
            
            # Check for specific Unsloth incompatibility error
            if "Error: unsupported architecture" in error_str or "unsupported architecture" in error_str:
                if compatibility.get("is_unsloth"):
                    error_msg = self._generate_unsloth_error_message(compatibility)
                    print(f"\n🚨 UNSLOTH INCOMPATIBILITY DETECTED:")
                    print(f"   • Error: 'unsupported architecture' - This is a known issue with Unsloth adapters")
                    print(f"   • Cause: Ollama cannot process adapters trained with Unsloth due to architectural differences")
                    
                    return False, error_msg
                else:
                    return False, f"Unsupported architecture error: {error_str}"
            else:
                return False, f"Failed to create Ollama model: {error_str}"
    
    def _generate_unsloth_error_message(self, compatibility: Dict[str, Any]) -> str:
        """Generate detailed error message for Unsloth incompatibility."""
        return (
            f"UNSLOTH INCOMPATIBILITY: Ollama cannot process Unsloth adapters due to 'unsupported architecture'. "
            f"Unsloth models use optimized architectures that differ from standard transformers. "
            f"Ollama's ADAPTER directive expects standard LoRA format, creating a mismatch during conversion. "
            f"Solutions: 1) Use deployment approach to deploy Unsloth model directly, "
            f"2) Train with native Ollama models, 3) Wait for better Unsloth support in future versions."
        ) 