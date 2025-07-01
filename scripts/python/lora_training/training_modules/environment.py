# SPDX-License-Identifier: MIT OR Apache-2.0
# Environment Setup Module for LoRA Training

import subprocess
from pathlib import Path
import sys
import os
import platform
import shutil

def find_compatible_python():
    """Find a Python version compatible with training libraries (3.9-3.15)."""
    # Different commands based on OS
    if platform.system() == "Windows":
        python_candidates = [
            "py -3.11", "py -3.10", "py -3.9", "py -3.12",
            "python", "python3", "py"
        ]
    else:
        python_candidates = [
            "python3.11", "python3.10", "python3.9",
            "python3.12", "python3.13", "python3.14", "python3.15", "python3"
        ]
    
    for python_cmd in python_candidates:
        try:
            # Set environment for proper encoding on Windows
            env = dict(os.environ)
            env['PYTHONIOENCODING'] = 'utf-8'
            
            result = subprocess.run(
                python_cmd.split() + ["--version"],
                capture_output=True, text=True, check=True,
                env=env, errors='replace'
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
    
    # If not found in PATH, try common Windows locations
    if platform.system() == "Windows":
        windows_paths = [
            r"C:\Python311\python.exe",
            r"C:\Python310\python.exe",
            r"C:\Python39\python.exe",
            r"C:\Python312\python.exe",
            os.path.expandvars(r"%LOCALAPPDATA%\Programs\Python\Python311\python.exe"),
            os.path.expandvars(r"%LOCALAPPDATA%\Programs\Python\Python310\python.exe"),
            os.path.expandvars(r"%LOCALAPPDATA%\Programs\Python\Python39\python.exe"),
            os.path.expandvars(r"%LOCALAPPDATA%\Programs\Python\Python312\python.exe"),
            r"C:\Program Files\Python311\python.exe",
            r"C:\Program Files\Python310\python.exe",
            r"C:\Program Files\Python39\python.exe",
            r"C:\Program Files (x86)\Python311\python.exe",
            r"C:\Program Files (x86)\Python310\python.exe",
        ]
        
        for python_path in windows_paths:
            if os.path.exists(python_path):
                try:
                    env = dict(os.environ)
                    env['PYTHONIOENCODING'] = 'utf-8'
                    
                    result = subprocess.run(
                        [python_path, "--version"],
                        capture_output=True, text=True, check=True,
                        env=env, errors='replace'
                    )
                    version_str = result.stdout.strip().split()[1]
                    major, minor = map(int, version_str.split('.')[:2])
                    
                    if major == 3 and 9 <= minor <= 15:
                        print(f"✅ Found compatible Python at: {python_path} (version {version_str})")
                        return python_path
                except:
                    continue
    
    raise Exception("No compatible Python version found (3.9-3.15 required)")

def get_python_executable(python_cmd):
    """Get the absolute path to the Python executable."""
    # Handle Windows py launcher commands
    if isinstance(python_cmd, str) and python_cmd.startswith("py "):
        cmd_list = python_cmd.split() + ["-c", "import sys; print(sys.executable)"]
    else:
        cmd_list = [python_cmd, "-c", "import sys; print(sys.executable)"]
    
    # Set environment for proper encoding
    env = dict(os.environ)
    env['PYTHONIOENCODING'] = 'utf-8'
    
    try:
        result = subprocess.run(cmd_list, 
                              capture_output=True, text=True, check=True,
                              env=env, errors='replace')
        executable_path = result.stdout.strip()
        print(f"   Python command '{python_cmd}' resolved to: {executable_path}")
        return executable_path
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to get Python executable path for: {python_cmd}")
        print(f"   Error: {e.stderr}")
        raise

def check_package_installed(python_executable, package_name):
    """Check if a Python package is already installed."""
    try:
        # Extract just the package name (remove version specs)
        base_package = package_name.split('>=')[0].split('==')[0].split('[')[0]
        
        # Set environment for proper encoding
        env = dict(os.environ)
        env['PYTHONIOENCODING'] = 'utf-8'
        
        result = subprocess.run(
            [python_executable, "-c", f"import {base_package}; print('installed')"],
            capture_output=True, text=True, timeout=5,
            env=env, errors='replace'
        )
        return result.returncode == 0 and "installed" in result.stdout
    except:
        return False

def setup_dependencies(python_executable):
    """Install dependencies using the compatible Python."""
    try:
        print("🔍 Checking installed dependencies...")
        print(f"   Using Python executable: {python_executable}")
        
        # Check if CUDA is available
        has_cuda = False
        torch_installed = check_package_installed(python_executable, "torch")
        
        if torch_installed:
            try:
                env = dict(os.environ)
                env['PYTHONIOENCODING'] = 'utf-8'
                result = subprocess.run(
                    [python_executable, "-c", "import torch; print(torch.cuda.is_available())"],
                    capture_output=True, text=True, check=True, timeout=10,
                    env=env, errors='replace'
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
        env = dict(os.environ)
        env['PYTHONIOENCODING'] = 'utf-8'
        
        for package in packages_to_install:
            print(f"Installing {package}...")
            try:
                # First check if pip is available
                pip_check = subprocess.run(
                    [python_executable, "-m", "pip", "--version"],
                    capture_output=True, text=True, env=env, errors='replace'
                )
                if pip_check.returncode != 0:
                    print(f"❌ pip not available for {python_executable}")
                    print(f"   Error: {pip_check.stderr}")
                    return False
                
                # Install the package
                pip_cmd = [python_executable, "-m", "pip", "install", "--user", "--upgrade", "--quiet"]
                
                # Only add --break-system-packages on non-Windows systems
                if platform.system() != "Windows":
                    pip_cmd.insert(4, "--break-system-packages")
                
                pip_cmd.append(package)
                subprocess.check_call(pip_cmd, timeout=300, env=env)  # 5 minute timeout per package
            except FileNotFoundError as e:
                print(f"❌ Python executable not found: {python_executable}")
                print(f"   Error: {e}")
                return False
        
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
        shutil.rmtree(venv_dir)
    
    try:
        python_executable = get_python_executable(python_cmd)
        
        env = dict(os.environ)
        env['PYTHONIOENCODING'] = 'utf-8'
        
        subprocess.run([python_executable, "-m", "venv", str(venv_dir)], check=True, env=env)

        if sys.platform == "win32":
            pip_exe = venv_dir / "Scripts" / "pip.exe"
            python_exe = venv_dir / "Scripts" / "python.exe"
        else:
            pip_exe = venv_dir / "bin" / "pip"
            python_exe = venv_dir / "bin" / "python"

        packages = ["torch", "transformers", "datasets", "accelerate", "peft", "trl", "bitsandbytes"]
        for package in packages:
            subprocess.check_call([str(pip_exe), "install", package, "--quiet"], env=env)
            
        print("✅ Virtual environment setup successful")
        return str(python_exe)
    except subprocess.CalledProcessError as e:
        print(f"❌ Virtual environment setup failed: {e}")
        return None