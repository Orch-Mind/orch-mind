# SPDX-License-Identifier: MIT OR Apache-2.0
"""
Ollama service interface
"""

from abc import ABC, abstractmethod
from typing import List, Optional


class IOllamaService(ABC):
    """Interface for Ollama operations."""
    
    @abstractmethod
    def is_available(self) -> bool:
        """Check if Ollama is available."""
        pass
    
    @abstractmethod
    def list_models(self) -> List[str]:
        """List available models."""
        pass
    
    @abstractmethod
    def model_exists(self, model_name: str) -> bool:
        """Check if a model exists locally."""
        pass
    
    @abstractmethod
    def pull_model(self, model_name: str) -> bool:
        """Pull a model from the registry."""
        pass
    
    @abstractmethod
    def create_model(self, model_name: str, modelfile_path: str) -> bool:
        """Create a model from Modelfile."""
        pass
    
    @abstractmethod
    def remove_model(self, model_name: str) -> bool:
        """Remove a model."""
        pass 