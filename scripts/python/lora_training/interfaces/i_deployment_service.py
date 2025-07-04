# SPDX-License-Identifier: MIT OR Apache-2.0
"""
Interface for deployment services
"""

from abc import ABC, abstractmethod
from typing import Optional


class IDeploymentService(ABC):
    """Interface for model deployment services."""
    
    @abstractmethod
    def deploy_base_model(self, hf_model_name: str, deployed_model_name: str) -> bool:
        """
        Deploy a base model to the target system.
        
        Args:
            hf_model_name: HuggingFace model name
            deployed_model_name: Name to deploy the model as
            
        Returns:
            True if deployment was successful, False otherwise
        """
        pass
    
    @abstractmethod
    def is_model_deployed(self, model_name: str) -> bool:
        """
        Check if a model is already deployed.
        
        Args:
            model_name: Name of the model to check
            
        Returns:
            True if model is deployed, False otherwise
        """
        pass
    
    @abstractmethod
    def get_deployed_model_info(self, model_name: str) -> Optional[dict]:
        """
        Get information about a deployed model.
        
        Args:
            model_name: Name of the model
            
        Returns:
            Model information dict or None if not found
        """
        pass 