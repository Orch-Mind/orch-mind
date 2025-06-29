# SPDX-License-Identifier: MIT OR Apache-2.0
# Environment Setup Module for LoRA Training

import subprocess
from pathlib import Path
import sys

def find_compatible_python():
    """Find a Python version compatible with training libraries (3.9-3.15)."""
    python_candidates = [
        "python3.11", "python3.10", "python3.9",
        "python3.12", "python3.13", "python3.14", "python3.15", "python3"
    ]
    
    for python_cmd in python_candidates:
        try:
            result = subprocess.run(
                [python_cmd, "--version"],
                capture_output=True, text=True, check=True
            )
            version_str = result.stdout.strip().split()[1]
            major, minor = map(int, version_str.split('.')[:2])
            
            if major == 3 and 9 <= minor <= 15:
                if minor >= 12:
                    print(f"⚠️  Found {python_cmd} (version {version_str}) - prioritizing instant creation")
                else:
                    print(f"✅ Found compatible Python: {python_cmd} (version {version_str})")
                return python_cmd
        except (subprocess.CalledProcessError, FileNotFoundError, ValueError, IndexError):
            continue
    
    raise Exception("No compatible Python version found (3.9-3.15 required)")

def get_python_executable(python_cmd):
    """Get the absolute path to the Python executable."""
    result = subprocess.run([python_cmd, "-c", "import sys; print(sys.executable)"], 
                          capture_output=True, text=True, check=True)
    return result.stdout.strip()

def setup_dependencies(python_executable):
    """Install dependencies using the compatible Python."""
    try:
        print("🚀 Installing essential dependencies...")
        
        # Check if CUDA is available
        has_cuda = False
        try:
            result = subprocess.run(
                [python_executable, "-c", "import torch; print(torch.cuda.is_available())"],
                capture_output=True, text=True, check=True
            )
            has_cuda = result.stdout.strip().lower() == "true"
        except:
            # If torch is not installed yet, check for NVIDIA GPU on system
            try:
                subprocess.run(["nvidia-smi"], capture_output=True, check=True)
                has_cuda = True
            except:
                has_cuda = False
        
        if has_cuda:
            print("✅ CUDA detected - installing full package set")
            essential_packages = [
                "torch", "transformers>=4.36.0", "datasets",
                "accelerate", "peft>=0.7.0", "trl", "bitsandbytes"
            ]
        else:
            print("⚠️  No CUDA detected - installing CPU-only packages")
            essential_packages = [
                "torch", "transformers>=4.36.0", "datasets",
                "accelerate", "peft>=0.7.0", "trl"
            ]
        
        for package in essential_packages:
            print(f"Installing {package}...")
            subprocess.check_call([
                python_executable, "-m", "pip", "install", 
                "--break-system-packages", "--user", "--upgrade", "--quiet",
                package
            ])
        
        print("✅ Essential packages installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Dependency installation failed: {e}")
        return False

def setup_virtual_environment(script_dir, python_cmd):
    """Setup a virtual environment if direct installation fails."""
    print("🚀 Trying to set up a virtual environment...")
    
    venv_dir = script_dir / "training_venv"
    if venv_dir.exists():
        import shutil
        shutil.rmtree(venv_dir)
    
    try:
        python_executable = get_python_executable(python_cmd)
        subprocess.run([python_executable, "-m", "venv", str(venv_dir)], check=True)

        if sys.platform == "win32":
            pip_exe = venv_dir / "Scripts" / "pip.exe"
        else:
            pip_exe = venv_dir / "bin" / "pip"

        packages = ["torch", "transformers", "datasets", "accelerate", "peft", "trl", "bitsandbytes"]
        for package in packages:
            subprocess.check_call([str(pip_exe), "install", package, "--quiet"])
            
        print("✅ Virtual environment setup successful")
        return str(pip_exe).replace('pip', 'python')
    except subprocess.CalledProcessError as e:
        print(f"❌ Virtual environment setup failed: {e}")
        return None