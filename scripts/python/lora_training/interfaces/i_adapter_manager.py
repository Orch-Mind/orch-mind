# SPDX-License-Identifier: MIT OR Apache-2.0
"""
Adapter manager interface
"""

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any


class IAdapterManager(ABC):
    """Interface for adapter management."""
    
    @abstractmethod
    def register_adapter(self, adapter_id: str, base_model: str, hf_model: str, 
                        adapter_path: str) -> Optional[Any]:
        """Register a new adapter."""
        pass
    
    @abstractmethod
    def enable_adapter(self, adapter_id: str) -> Dict[str, Any]:
        """Enable an adapter."""
        pass
    
    @abstractmethod
    def disable_adapter(self, adapter_id: str) -> Dict[str, Any]:
        """Disable an adapter."""
        pass
    
    @abstractmethod
    def get_adapter_info(self, adapter_id: str) -> Optional[Any]:
        """Get adapter information."""
        pass
    
    @abstractmethod
    def list_adapters(self) -> list:
        """List all registered adapters."""
        pass 