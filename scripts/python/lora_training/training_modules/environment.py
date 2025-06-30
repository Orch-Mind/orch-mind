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

def check_package_installed(python_executable, package_name):
    """Check if a Python package is already installed."""
    try:
        # Extract just the package name (remove version specs)
        base_package = package_name.split('>=')[0].split('==')[0].split('[')[0]
        
        result = subprocess.run(
            [python_executable, "-c", f"import {base_package}; print('installed')"],
            capture_output=True, text=True, timeout=5
        )
        return result.returncode == 0 and "installed" in result.stdout
    except:
        return False

def setup_dependencies(python_executable):
    """Install dependencies using the compatible Python."""
    try:
        print("🔍 Checking installed dependencies...")
        
        # Check if CUDA is available
        has_cuda = False
        torch_installed = check_package_installed(python_executable, "torch")
        
        if torch_installed:
            try:
                result = subprocess.run(
                    [python_executable, "-c", "import torch; print(torch.cuda.is_available())"],
                    capture_output=True, text=True, check=True, timeout=10
                )
                has_cuda = result.stdout.strip().lower() == "true"
                print(f"✅ Torch already installed - CUDA available: {has_cuda}")
            except:
                print("✅ Torch already installed - CUDA status unknown")
        else:
            # If torch is not installed yet, check for NVIDIA GPU on system
            try:
                subprocess.run(["nvidia-smi"], capture_output=True, check=True, timeout=5)
                has_cuda = True
                print("🔍 NVIDIA GPU detected - will install CUDA packages")
            except:
                has_cuda = False
                print("🔍 No NVIDIA GPU detected - will install CPU-only packages")
        
        if has_cuda:
            essential_packages = [
                "torch", "transformers>=4.36.0", "datasets",
                "accelerate", "peft>=0.7.0", "trl", "bitsandbytes"
            ]
        else:
            essential_packages = [
                "torch", "transformers>=4.36.0", "datasets",
                "accelerate", "peft>=0.7.0", "trl"
            ]
        
        # Check which packages need installation
        packages_to_install = []
        for package in essential_packages:
            if not check_package_installed(python_executable, package):
                packages_to_install.append(package)
            else:
                base_name = package.split('>=')[0]
                print(f"✅ {base_name} already installed")
        
        if not packages_to_install:
            print("✅ All essential packages already installed - skipping installation")
            return True
        
        print(f"🚀 Installing {len(packages_to_install)} missing packages...")
        for package in packages_to_install:
            print(f"Installing {package}...")
            subprocess.check_call([
                python_executable, "-m", "pip", "install", 
                "--break-system-packages", "--user", "--upgrade", "--quiet",
                package
            ], timeout=300)  # 5 minute timeout per package
        
        print("✅ Essential packages installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Dependency installation failed: {e}")
        return False
    except subprocess.TimeoutExpired:
        print("❌ Dependency installation timed out")
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