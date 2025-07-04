# SPDX-License-Identifier: MIT OR Apache-2.0
"""
LoRA trainer interface
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional


class ILoRATrainer(ABC):
    """Interface for LoRA training."""
    
    @abstractmethod
    def train(self, config: Any, training_data: List[Dict[str, Any]]) -> Optional[str]:
        """Train LoRA adapter."""
        pass
    
    @abstractmethod
    def validate_dependencies(self) -> bool:
        """Validate that required dependencies are available."""
        pass
    
    @abstractmethod
    def get_training_info(self) -> Dict[str, Any]:
        """Get information about the training process."""
        pass 