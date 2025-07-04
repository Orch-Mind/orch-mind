# SPDX-License-Identifier: MIT OR Apache-2.0
"""
Model mapper interface
"""

from abc import ABC, abstractmethod


class IModelMapper(ABC):
    """Interface for model name mapping."""
    
    @abstractmethod
    def get_huggingface_model_name(self, ollama_model: str) -> str:
        """Map Ollama model name to HuggingFace model name."""
        pass
    
    @abstractmethod
    def supports_model(self, ollama_model: str) -> bool:
        """Check if a model is supported."""
        pass
    
    @abstractmethod
    def get_model_info(self, ollama_model: str) -> dict:
        """Get detailed information about a model."""
        pass 