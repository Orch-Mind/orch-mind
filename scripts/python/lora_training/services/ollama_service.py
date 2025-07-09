# SPDX-License-Identifier: MIT OR Apache-2.0
"""
Ollama service implementation
"""

import subprocess
from typing import List, Optional
import os
import sys
from interfaces.i_ollama_service import IOllamaService


class OllamaService(IOllamaService):
    """Concrete implementation of Ollama operations."""
    
    def __init__(self):
        """Initialize OllamaService with cached executable path."""
        self._ollama_executable: Optional[str] = None
    
    def _find_ollama_executable(self) -> Optional[str]:
        """Find Ollama executable with robust path detection."""
        # Return cached path if already found
        if self._ollama_executable:
            return self._ollama_executable
        
        # Common Ollama installation paths
        possible_paths = [
            # Direct command (if in PATH)
            "ollama",
            # Homebrew on Apple Silicon
            "/opt/homebrew/bin/ollama",
            # Homebrew on Intel Mac / Linux
            "/usr/local/bin/ollama",
            # Standard Linux locations
            "/usr/bin/ollama",
            "/bin/ollama",
            # Windows common locations
            "C:\\Program Files\\Ollama\\ollama.exe",
            "C:\\Program Files (x86)\\Ollama\\ollama.exe",
            "%LOCALAPPDATA%\\Programs\\Ollama\\ollama.exe",
            # macOS Application bundle
            "/Applications/Ollama.app/Contents/Resources/ollama",
            "/Applications/Ollama.app/Contents/MacOS/ollama",
            # User-specific installations
            os.path.expanduser("~/.local/bin/ollama"),
            os.path.expanduser("~/bin/ollama"),
        ]
        
        # Add Windows-specific paths if on Windows
        if sys.platform == "win32":
            # Expand Windows environment variables
            possible_paths = [os.path.expandvars(p) if "%" in p else p for p in possible_paths]
        
        # Test each path
        for path in possible_paths:
            try:
                # For direct command, test with 'which' or 'where'
                if path == "ollama":
                    if sys.platform == "win32":
                        result = subprocess.run(
                            ["where", "ollama"],
                            capture_output=True,
                            text=True,
                            timeout=5
                        )
                    else:
                        result = subprocess.run(
                            ["which", "ollama"],
                            capture_output=True,
                            text=True,
                            timeout=5
                        )
                    
                    if result.returncode == 0 and result.stdout.strip():
                        self._ollama_executable = result.stdout.strip().split('\n')[0]
                        print(f"✅ Found Ollama via PATH: {self._ollama_executable}")
                        return self._ollama_executable
                else:
                    # For absolute paths, check if file exists and is executable
                    if os.path.exists(path):
                        # Test if it's actually Ollama by running --version
                        result = subprocess.run(
                            [path, "--version"],
                            capture_output=True,
                            text=True,
                            timeout=5
                        )
                        if result.returncode == 0:
                            self._ollama_executable = path
                            print(f"✅ Found Ollama at: {self._ollama_executable}")
                            return self._ollama_executable
            except Exception:
                # Continue to next path
                continue
        
        print("❌ Ollama executable not found in any known location")
        print("   Searched paths:")
        for path in possible_paths[:10]:  # Show first 10 paths
            print(f"   • {path}")
        return None
    
    def is_available(self) -> bool:
        """Check if Ollama is available."""
        ollama_path = self._find_ollama_executable()
        if not ollama_path:
            return False
        
        try:
            result = subprocess.run(
                [ollama_path, 'list'], 
                capture_output=True, 
                text=True, 
                timeout=10
            )
            return result.returncode == 0
        except (FileNotFoundError, subprocess.TimeoutExpired) as e:
            print(f"❌ Error checking Ollama availability: {e}")
            return False
    
    def list_models(self) -> List[str]:
        """List available models."""
        ollama_path = self._find_ollama_executable()
        if not ollama_path:
            return []
        
        try:
            result = subprocess.run(
                [ollama_path, 'list'], 
                capture_output=True, 
                text=True, 
                check=True
            )
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
        ollama_path = self._find_ollama_executable()
        if not ollama_path:
            print("❌ Cannot pull model: Ollama executable not found")
            return False
        
        try:
            print(f"📥 Pulling model: {model_name}")
            result = subprocess.run(
                [ollama_path, 'pull', model_name], 
                capture_output=True, 
                text=True, 
                timeout=600
            )
            
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
        ollama_path = self._find_ollama_executable()
        if not ollama_path:
            print("❌ Cannot create model: Ollama executable not found")
            return False
        
        try:
            print(f"🔗 Creating Ollama model: {model_name}")
            result = subprocess.run([
                ollama_path, 'create', model_name, '-f', modelfile_path
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
        ollama_path = self._find_ollama_executable()
        if not ollama_path:
            print("❌ Cannot remove model: Ollama executable not found")
            return False
        
        try:
            result = subprocess.run(
                [ollama_path, 'rm', model_name], 
                capture_output=True, 
                text=True, 
                check=True
            )
            print(f"🗑️ Model {model_name} removed")
            return True
        except subprocess.CalledProcessError:
            # Model might not exist, that's OK
            return True
        except Exception as e:
            print(f"❌ Error removing model {model_name}: {e}")
            return False 