# SPDX-License-Identifier: MIT OR Apache-2.0
"""
Ollama service implementation
"""

import subprocess
from typing import List
from interfaces.i_ollama_service import IOllamaService


class OllamaService(IOllamaService):
    """Concrete implementation of Ollama operations."""
    
    def is_available(self) -> bool:
        """Check if Ollama is available."""
        try:
            result = subprocess.run(['ollama', 'list'], 
                                  capture_output=True, text=True, timeout=10)
            return result.returncode == 0
        except (FileNotFoundError, subprocess.TimeoutExpired):
            return False
    
    def list_models(self) -> List[str]:
        """List available models."""
        try:
            result = subprocess.run(['ollama', 'list'], 
                                  capture_output=True, text=True, check=True)
            # Parse model names from output
            models = []
            for line in result.stdout.strip().split('\n')[1:]:  # Skip header
                if line.strip():
                    model_name = line.split()[0]
                    models.append(model_name)
            return models
        except subprocess.CalledProcessError:
            return []
    
    def model_exists(self, model_name: str) -> bool:
        """Check if a model exists locally."""
        models = self.list_models()
        return model_name in models
    
    def pull_model(self, model_name: str) -> bool:
        """Pull a model from the registry."""
        try:
            print(f"📥 Pulling model: {model_name}")
            result = subprocess.run(['ollama', 'pull', model_name], 
                                  capture_output=True, text=True, timeout=600)
            
            if result.returncode == 0:
                print(f"✅ Model {model_name} pulled successfully")
                return True
            else:
                print(f"❌ Failed to pull model {model_name}: {result.stderr}")
                return False
        except subprocess.TimeoutExpired:
            print(f"❌ Timeout pulling model {model_name}")
            return False
        except Exception as e:
            print(f"❌ Error pulling model {model_name}: {e}")
            return False
    
    def create_model(self, model_name: str, modelfile_path: str) -> bool:
        """Create a model from Modelfile."""
        try:
            print(f"🔗 Creating Ollama model: {model_name}")
            result = subprocess.run([
                'ollama', 'create', model_name, '-f', modelfile_path
            ], capture_output=True, text=True, timeout=300)
            
            if result.returncode == 0:
                print(f"✅ Model {model_name} created successfully")
                return True
            else:
                print(f"❌ Failed to create model {model_name}:")
                print(f"   • stdout: {result.stdout}")
                print(f"   • stderr: {result.stderr}")
                return False
        except subprocess.TimeoutExpired:
            print(f"❌ Timeout creating model {model_name}")
            return False
        except Exception as e:
            print(f"❌ Error creating model {model_name}: {e}")
            return False
    
    def remove_model(self, model_name: str) -> bool:
        """Remove a model."""
        try:
            result = subprocess.run(['ollama', 'rm', model_name], 
                                  capture_output=True, text=True, check=True)
            print(f"🗑️ Model {model_name} removed")
            return True
        except subprocess.CalledProcessError:
            # Model might not exist, that's OK
            return True
        except Exception as e:
            print(f"❌ Error removing model {model_name}: {e}")
            return False 