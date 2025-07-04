# SPDX-License-Identifier: MIT OR Apache-2.0
"""
Training data processor interface
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any


class ITrainingDataProcessor(ABC):
    """Interface for training data processing."""
    
    @abstractmethod
    def load_data(self, data_path: str) -> List[Dict[str, Any]]:
        """Load training data from file."""
        pass
    
    @abstractmethod
    def validate_data(self, data: List[Dict[str, Any]]) -> bool:
        """Validate training data format."""
        pass
    
    @abstractmethod
    def format_data(self, data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Format data for training."""
        pass
    
    @abstractmethod
    def calculate_optimal_steps(self, data_path: str) -> tuple:
        """Calculate optimal training steps based on data."""
        pass 