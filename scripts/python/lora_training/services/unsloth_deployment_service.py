# SPDX-License-Identifier: MIT OR Apache-2.0
"""
Unsloth Deployment Service
Deploys Unsloth models to Ollama as base models for adapter training
"""

import os
import sys
import tempfile
import shutil
import subprocess
from typing import Optional, Dict, Any
from interfaces.i_ollama_service import IOllamaService
from utils import sanitize_model_name


class UnslothDeploymentService:
    """Service for deploying Unsloth models to Ollama as base models."""
    
    def __init__(self, ollama_service: IOllamaService):
        self.ollama_service = ollama_service
    
    def deploy_base_model(self, hf_model_name: str, deployed_model_name: str) -> bool:
        """
        Deploy a Unsloth model to Ollama as a base model.
        
        Args:
            hf_model_name: HuggingFace model name (e.g., "unsloth/gemma-3-4b-it")
            deployed_model_name: Name for the deployed model in Ollama
            
        Returns:
            True if deployment successful, False otherwise
        """
        print(f"\n🚀 Deploying Unsloth base model to Ollama...")
        print(f"   • HuggingFace Model: {hf_model_name}")
        print(f"   • Target Ollama Model: {deployed_model_name}")
        
        # Check if model already exists
        if self.ollama_service.model_exists(deployed_model_name):
            print(f"✅ Model {deployed_model_name} already exists in Ollama")
            return True
        
        # Check dependencies
        if not self._check_dependencies():
            return False
        
        # Create temporary directory
        temp_dir = tempfile.mkdtemp(prefix="unsloth_base_deploy_")
        
        try:
            # Load and save model
            model_path = self._load_and_save_model(hf_model_name, temp_dir)
            if not model_path:
                return False
            
            # Convert to GGUF
            gguf_path = self._convert_to_gguf(model_path, temp_dir)
            if not gguf_path:
                return False
            
            # Create Ollama model
            return self._create_ollama_base_model(gguf_path, deployed_model_name, hf_model_name)
            
        except Exception as e:
            print(f"❌ Failed to deploy base model: {e}")
            import traceback
            traceback.print_exc()
            return False
            
        finally:
            # Clean up
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
                print(f"🧹 Cleaned up temporary directory")
    
    def _check_dependencies(self) -> bool:
        """Check if required dependencies are available."""
        required_packages = [
            "torch", "transformers", "safetensors", "accelerate", "huggingface_hub"
        ]
        
        missing = []
        for package in required_packages:
            try:
                __import__(package.replace('-', '_'))
            except ImportError:
                missing.append(package)
        
        if missing:
            print(f"❌ Missing dependencies: {', '.join(missing)}")
            print("Installing required packages...")
            try:
                subprocess.check_call([
                    sys.executable, "-m", "pip", "install", "-q"
                ] + missing)
                print("✅ Dependencies installed!")
                return True
            except subprocess.CalledProcessError as e:
                print(f"❌ Failed to install dependencies: {e}")
                return False
        
        return True
    
    def _ensure_conversion_dependencies(self) -> bool:
        """Ensure that GGUF conversion dependencies are available with robust error handling."""
        dependencies = [
            ("sentencepiece", ">=0.1.99"),
            ("protobuf", ">=3.20.0")
        ]
        
        for package, version in dependencies:
            try:
                if package == "protobuf":
                    import google.protobuf
                    print(f"   ✓ {package} (google.protobuf)")
                else:
                    __import__(package)
                    print(f"   ✓ {package}")
            except ImportError:
                print(f"   ❌ {package} not found - installing...")
                
                # Try to install the missing dependency
                success = self._install_conversion_dependency(package, version)
                if not success:
                    print(f"❌ Failed to install {package}")
                    return False
                
                # Verify installation
                try:
                    if package == "protobuf":
                        import google.protobuf
                    else:
                        __import__(package)
                    print(f"   ✅ {package} installed and verified")
                except ImportError:
                    print(f"❌ {package} installation verification failed")
                    return False
        
        print("✅ All conversion dependencies available")
        return True
    
    def _install_conversion_dependency(self, package: str, version: str) -> bool:
        """Install a single conversion dependency with error handling."""
        try:
            package_spec = f"{package}{version}"
            print(f"   📦 Installing {package_spec}...")
            
            result = subprocess.run([
                sys.executable, "-m", "pip", "install", 
                package_spec, "--quiet", "--no-cache-dir"
            ], capture_output=True, text=True, timeout=300)
            
            if result.returncode == 0:
                print(f"   ✅ {package} installed successfully")
                return True
            else:
                print(f"   ❌ {package} installation failed:")
                print(f"      stdout: {result.stdout}")
                print(f"      stderr: {result.stderr}")
                
                # Try force reinstall as fallback
                print(f"   🔄 Attempting force reinstall of {package}...")
                result2 = subprocess.run([
                    sys.executable, "-m", "pip", "install", 
                    package_spec, "--force-reinstall", "--quiet"
                ], capture_output=True, text=True, timeout=300)
                
                if result2.returncode == 0:
                    print(f"   ✅ {package} force reinstall successful")
                    return True
                else:
                    print(f"   ❌ {package} force reinstall also failed")
                    return False
                    
        except subprocess.TimeoutExpired:
            print(f"   ❌ {package} installation timed out")
            return False
        except Exception as e:
            print(f"   ❌ {package} installation error: {e}")
            return False
    
    def _load_and_save_model(self, hf_model_name: str, output_dir: str) -> Optional[str]:
        """Load HuggingFace model and save it locally."""
        print(f"📦 Loading model: {hf_model_name}")
        
        try:
            from transformers import AutoTokenizer, AutoModelForCausalLM
            import torch
            
            # Load model and tokenizer
            print("   • Loading tokenizer...")
            tokenizer = AutoTokenizer.from_pretrained(hf_model_name, trust_remote_code=True)
            
            print("   • Loading model...")
            model = AutoModelForCausalLM.from_pretrained(
                hf_model_name,
                torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
                device_map="auto" if torch.cuda.is_available() else None,
                trust_remote_code=True,
                load_in_8bit=False,
            )
            
            # Add padding token if missing
            if tokenizer.pad_token is None:
                tokenizer.pad_token = tokenizer.eos_token
                tokenizer.pad_token_id = tokenizer.eos_token_id
            
            # Save model
            model_path = os.path.join(output_dir, "base_model")
            os.makedirs(model_path, exist_ok=True)
            
            print(f"   • Saving model to: {model_path}")
            model.save_pretrained(model_path, safe_serialization=True)
            tokenizer.save_pretrained(model_path)
            
            print("✅ Model loaded and saved successfully")
            return model_path
            
        except Exception as e:
            print(f"❌ Failed to load model: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def _convert_to_gguf(self, model_path: str, output_dir: str) -> Optional[str]:
        """Convert model to GGUF format."""
        print("🔄 Converting to GGUF format...")
        
        # Ensure conversion dependencies are installed with robust error handling
        print("📦 Checking conversion dependencies...")
        deps_installed = self._ensure_conversion_dependencies()
        if not deps_installed:
            print("❌ Failed to install conversion dependencies")
            return None
        
        # Find llama.cpp (with automatic installation)
        llama_cpp_dir = self._find_llama_cpp()
        if not llama_cpp_dir:
            print("❌ llama.cpp not found and installation failed")
            return None
        
        convert_script = os.path.join(llama_cpp_dir, "convert_hf_to_gguf.py")
        if not os.path.exists(convert_script):
            print(f"❌ Convert script not found: {convert_script}")
            return None
        
        # Output GGUF file
        gguf_path = os.path.join(output_dir, "base_model.gguf")
        
        try:
            convert_cmd = [
                sys.executable, convert_script,
                model_path,
                "--outfile", gguf_path,
                "--outtype", "f16",
                "--use-temp-file"
            ]
            
            print(f"   • Running conversion...")
            
            env = os.environ.copy()
            env.update({
                'OMP_NUM_THREADS': '2',
                'MKL_NUM_THREADS': '2',
                'PYTHONUNBUFFERED': '1'
            })
            
            result = subprocess.run(
                convert_cmd,
                capture_output=True,
                text=True,
                timeout=2400,  # 40 minutes
                env=env
            )
            
            if result.returncode == 0 and os.path.exists(gguf_path):
                file_size = os.path.getsize(gguf_path) / (1024**3)  # GB
                print(f"✅ GGUF conversion successful: {gguf_path} ({file_size:.2f}GB)")
                return gguf_path
            else:
                print(f"❌ GGUF conversion failed:")
                print(f"   • stdout: {result.stdout}")
                print(f"   • stderr: {result.stderr}")
                return None
                
        except subprocess.TimeoutExpired:
            print("❌ GGUF conversion timed out")
            return None
        except Exception as e:
            print(f"❌ GGUF conversion error: {e}")
            return None
    
    def _find_llama_cpp(self) -> Optional[str]:
        """Find llama.cpp installation directory with automatic installation."""
        # First check in project root
        current_file = os.path.abspath(__file__)
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(current_file))))
        project_llama_cpp = os.path.join(project_root, "llama.cpp")
        
        if os.path.exists(project_llama_cpp):
            return project_llama_cpp
        
        # Check common installation locations
        possible_locations = [
            os.path.expanduser("~/llama.cpp"),
            "/usr/local/llama.cpp",
            "/opt/llama.cpp",
            "C:\\llama.cpp",
            "C:\\tools\\llama.cpp",
        ]
        
        for location in possible_locations:
            if os.path.exists(location):
                return location
        
        # If not found, try to install automatically
        print("🔍 llama.cpp not found - attempting automatic installation...")
        
        try:
            # Import and use the llama.cpp installer (non-interactive)
            from llama_cpp_installer import install_llama_cpp_non_interactive
            
            installed_path = install_llama_cpp_non_interactive()
            if installed_path:
                print(f"✅ llama.cpp installed automatically at: {installed_path}")
                return installed_path
            else:
                print("❌ Automatic installation failed")
                return None
                
        except ImportError:
            print("❌ llama.cpp installer not available")
            return None
        except Exception as e:
            print(f"❌ Error during automatic installation: {e}")
            return None
    
    def _create_ollama_base_model(self, gguf_path: str, model_name: str, 
                                 hf_model_name: str) -> bool:
        """Create Ollama base model from GGUF file."""
        print(f"🔗 Creating Ollama base model: {model_name}")
        
        try:
            # Create Modelfile for base model
            modelfile_content = f"""FROM {gguf_path}

SYSTEM \"\"\"You are a helpful AI assistant.\"\"\"

PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER top_k 40
PARAMETER repeat_penalty 1.1

# Base Model Metadata
# SOURCE: {hf_model_name}
# TYPE: unsloth_base_deployment
# PURPOSE: adapter_training_base
"""
            
            # Save Modelfile
            modelfile_path = os.path.join(os.path.dirname(gguf_path), "Modelfile")
            with open(modelfile_path, 'w') as f:
                f.write(modelfile_content)
            
            print(f"✅ Modelfile created: {modelfile_path}")
            
            # Create Ollama model
            success = self.ollama_service.create_model(model_name, modelfile_path)
            
            if success:
                print(f"✅ Base model deployed successfully: {model_name}")
                print(f"💡 This model can now be used for LoRA adapter training")
            
            return success
            
        except Exception as e:
            print(f"❌ Failed to create Ollama base model: {e}")
            return False