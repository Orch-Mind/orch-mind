# SPDX-License-Identifier: MIT OR Apache-2.0
"""
Adapter information data model
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Dict, Any


@dataclass
class AdapterInfo:
    """Information about a LoRA adapter."""
    
    adapter_id: str
    adapter_name: str
    base_model: str
    hf_model: str
    adapter_path: str
    registry_path: str
    created_at: str
    enabled: bool = False
    training_method: str = "real_lora_peft"
    status: str = "ready"
    persistent: bool = True
    last_enabled: Optional[str] = None
    last_disabled: Optional[str] = None
    
    @classmethod
    def create_new(cls, adapter_id: str, base_model: str, hf_model: str, 
                   adapter_path: str, registry_path: str) -> 'AdapterInfo':
        """Create a new adapter info instance."""
        return cls(
            adapter_id=adapter_id,
            adapter_name=f"{adapter_id}_adapter",
            base_model=base_model,
            hf_model=hf_model,
            adapter_path=adapter_path,
            registry_path=registry_path,
            created_at=datetime.now().isoformat(),
            enabled=False,
            training_method="real_lora_peft",
            status="ready",
            persistent=True
        )
    
    def enable(self) -> None:
        """Mark adapter as enabled."""
        self.enabled = True
        self.last_enabled = datetime.now().isoformat()
    
    def disable(self) -> None:
        """Mark adapter as disabled."""
        self.enabled = False
        self.last_disabled = datetime.now().isoformat()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "adapter_id": self.adapter_id,
            "adapter_name": self.adapter_name,
            "base_model": self.base_model,
            "hf_model": self.hf_model,
            "adapter_path": self.adapter_path,
            "registry_path": self.registry_path,
            "created_at": self.created_at,
            "enabled": self.enabled,
            "training_method": self.training_method,
            "status": self.status,
            "persistent": self.persistent,
            "last_enabled": self.last_enabled,
            "last_disabled": self.last_disabled
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AdapterInfo':
        """Create from dictionary."""
        return cls(
            adapter_id=data["adapter_id"],
            adapter_name=data["adapter_name"],
            base_model=data["base_model"],
            hf_model=data["hf_model"],
            adapter_path=data["adapter_path"],
            registry_path=data["registry_path"],
            created_at=data["created_at"],
            enabled=data.get("enabled", False),
            training_method=data.get("training_method", "real_lora_peft"),
            status=data.get("status", "ready"),
            persistent=data.get("persistent", True),
            last_enabled=data.get("last_enabled"),
            last_disabled=data.get("last_disabled")
        ) 