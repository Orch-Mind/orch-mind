# SPDX-License-Identifier: MIT OR Apache-2.0
"""
Model mapper service implementation
"""

from typing import Dict, Any
from interfaces.i_model_mapper import IModelMapper


class ModelMapper(IModelMapper):
    """Concrete implementation of model name mapping."""
    
    def __init__(self):
        self.model_mapping = {
            # Latest Unsloth optimized models - following official docs recommendations
            "gemma3n:latest": "mlx-community/gemma-3n-E4B-it-lm-4bit",
            "gemma3:latest": "unsloth/gemma-3-4b-it",
        }
        
        self.model_info = {
            "unsloth/gemma-3-4b-it": {
                "size": "4B",
                "type": "instruction-tuned",
                "description": "Gemma 3 4B instruction-tuned model optimized by Unsloth"
            },
            "mlx-community/gemma-3n-E4B-it-lm-4bit": {
                "size": "4B", 
                "type": "instruction-tuned",
                "description": "Gemma 3N 4B multilingual model"
            },
        }
    
    def get_huggingface_model_name(self, ollama_model: str) -> str:
        """Map Ollama model name to HuggingFace model name."""
        # Try exact match first
        if ollama_model in self.model_mapping:
            return self.model_mapping[ollama_model]
        
        # Try partial match for versioned models
        for ollama_name, hf_name in self.model_mapping.items():
            if ollama_model.startswith(ollama_name.split(':')[0]):
                return hf_name
        
        # Fallback - try to guess using latest Unsloth models
        base_name = ollama_model.split(':')[0].lower()
        
        if "gemma3n" in base_name:
            return "mlx-community/gemma-3n-E4B-it-lm-4bit"
        elif "gemma3" in base_name:
            return "unsloth/gemma-3-4b-it"
        else:
            print(f"⚠️ Unknown model {ollama_model}, using gemma3n as fallback")
            return "mlx-community/gemma-3n-E4B-it-lm-4bit"
    
    def is_unsloth_model(self, ollama_model: str) -> bool:
        """Check if a model is from Unsloth (requires deployment before adapter training)."""
        hf_model = self.get_huggingface_model_name(ollama_model)
        return hf_model.startswith("unsloth/")
    
    def get_deployed_model_name(self, ollama_model: str) -> str:
        """Get the name of the deployed Unsloth model in Ollama."""
        from utils import sanitize_model_name
        base_name = sanitize_model_name(ollama_model.replace(':', '-'))
        return f"{base_name}-custom"
    
    def supports_model(self, ollama_model: str) -> bool:
        """Check if a model is supported."""
        try:
            # If we can map it, it's supported
            hf_model = self.get_huggingface_model_name(ollama_model)
            return hf_model is not None
        except Exception:
            return False
    
    def get_model_info(self, ollama_model: str) -> Dict[str, Any]:
        """Get detailed information about a model."""
        hf_model = self.get_huggingface_model_name(ollama_model)
        
        info = {
            "ollama_model": ollama_model,
            "hf_model": hf_model,
            "supported": True,
            "is_unsloth": self.is_unsloth_model(ollama_model),
            "deployed_model_name": self.get_deployed_model_name(ollama_model) if self.is_unsloth_model(ollama_model) else None
        }
        
        # Add detailed info if available
        if hf_model in self.model_info:
            info.update(self.model_info[hf_model])
        
        return info
    
    def add_model_mapping(self, ollama_model: str, hf_model: str, 
                         model_info: Dict[str, Any] = None) -> None:
        """Add a new model mapping (for extensibility)."""
        self.model_mapping[ollama_model] = hf_model
        if model_info:
            self.model_info[hf_model] = model_info 