# SPDX-License-Identifier: MIT OR Apache-2.0
"""
Simple deployment service for LoRA training
"""

import os
import sys
from typing import Optional

# Add the interfaces directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'interfaces'))

from i_deployment_service import IDeploymentService
from i_ollama_service import IOllamaService


class SimpleDeploymentService(IDeploymentService):
    """Simple implementation of deployment service."""
    
    def __init__(self, ollama_service: IOllamaService):
        """Initialize with Ollama service."""
        self.ollama_service = ollama_service
    
    def deploy_base_model(self, hf_model_name: str, deployed_model_name: str) -> bool:
        """
        Deploy a base model to Ollama.
        
        Args:
            hf_model_name: HuggingFace model name
            deployed_model_name: Name to deploy the model as
            
        Returns:
            True if deployment was successful, False otherwise
        """
        try:
            # Check if model is already deployed
            if self.is_model_deployed(deployed_model_name):
                print(f"✅ Model {deployed_model_name} already deployed")
                return True
            
            # For now, just check if the base model exists in Ollama
            # In a real implementation, this would deploy the model
            available_models = self.ollama_service.get_available_models()
            
            # Extract base model name from deployed name
            base_model_name = deployed_model_name.split('-')[0]  # e.g., "gemma3" from "gemma3-unsloth"
            
            for model in available_models:
                if base_model_name in model.lower():
                    print(f"✅ Base model {base_model_name} available in Ollama")
                    return True
            
            print(f"❌ Base model {base_model_name} not available in Ollama")
            return False
            
        except Exception as e:
            print(f"❌ Error deploying model: {e}")
            return False
    
    def is_model_deployed(self, model_name: str) -> bool:
        """
        Check if a model is already deployed.
        
        Args:
            model_name: Name of the model to check
            
        Returns:
            True if model is deployed, False otherwise
        """
        try:
            available_models = self.ollama_service.get_available_models()
            return model_name in available_models
        except Exception:
            return False
    
    def get_deployed_model_info(self, model_name: str) -> Optional[dict]:
        """
        Get information about a deployed model.
        
        Args:
            model_name: Name of the model
            
        Returns:
            Model information dict or None if not found
        """
        try:
            if self.is_model_deployed(model_name):
                return {
                    "name": model_name,
                    "status": "deployed",
                    "type": "base_model"
                }
            return None
        except Exception:
            return None 