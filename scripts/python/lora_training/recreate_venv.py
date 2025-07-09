#!/usr/bin/env python3
# SPDX-License-Identifier: MIT OR Apache-2.0
"""
Force recreate the training virtual environment with updated dependencies
Run this script to ensure all required packages are installed
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path


def find_python():
    """Find a compatible Python installation."""
    candidates = ["python3.11", "python3.10", "python3.9", "python3.12", "python3", "python"]
    
    for candidate in candidates:
        try:
            result = subprocess.run(
                [candidate, "--version"],
                capture_output=True,
                text=True
            )
            if result.returncode == 0 and "Python 3." in result.stdout:
                version = result.stdout.strip().split()[1]
                print(f"✅ Found {candidate}: {version}")
                return candidate
        except:
            continue
    
    print("❌ No compatible Python found!")
    return None


def main():
    print("🔄 Force recreating training virtual environment...")
    
    # Get project root
    script_dir = Path(__file__).parent.absolute()
    
    # Determine training directory (matches LoRATrainingService logic)
    if os.path.exists("/Applications/Orch-OS.app"):
        # Production - use writable userData directory
        training_dir = Path.home() / "Library" / "Application Support" / "orch-os" / "lora-training"
    else:
        # Development
        training_dir = script_dir.parent.parent.parent / "lora_training_output"
    
    venv_dir = training_dir / "training_venv"
    
    print(f"📁 Training directory: {training_dir}")
    print(f"📁 Virtual environment: {venv_dir}")
    
    # Remove existing venv if it exists
    if venv_dir.exists():
        print(f"🗑️  Removing existing virtual environment...")
        shutil.rmtree(venv_dir)
        print(f"✅ Removed old virtual environment")
    
    # Find Python
    python_cmd = find_python()
    if not python_cmd:
        print("❌ Cannot proceed without Python")
        sys.exit(1)
    
    # Create new venv
    print(f"🏗️  Creating new virtual environment...")
    subprocess.run([python_cmd, "-m", "venv", str(venv_dir)], check=True)
    print(f"✅ Created virtual environment")
    
    # Determine pip path
    if sys.platform == "win32":
        pip_path = venv_dir / "Scripts" / "pip.exe"
        python_venv = venv_dir / "Scripts" / "python.exe"
    else:
        pip_path = venv_dir / "bin" / "pip"
        python_venv = venv_dir / "bin" / "python"
    
    # Upgrade pip first
    print(f"⬆️  Upgrading pip...")
    subprocess.run([str(pip_path), "install", "--upgrade", "pip"], check=True)
    
    # Install essential packages including new vision dependencies
    essential_packages = [
        "psutil",
        "torch",
        "transformers",
        "pillow>=10.0.0",  # For vision models
        "timm>=0.9.0",     # For vision models
        "numpy",
        "huggingface-hub",
        "safetensors",
        "peft",
        "datasets",
        "accelerate",
        "tqdm"
    ]
    
    print(f"📦 Installing essential packages...")
    for package in essential_packages:
        print(f"   • Installing {package}...")
        try:
            subprocess.run(
                [str(pip_path), "install", package],
                check=True,
                capture_output=True
            )
            print(f"   ✅ {package}")
        except subprocess.CalledProcessError as e:
            print(f"   ❌ Failed to install {package}: {e}")
            print(f"      stdout: {e.stdout.decode() if e.stdout else 'None'}")
            print(f"      stderr: {e.stderr.decode() if e.stderr else 'None'}")
    
    # Try to install from requirements.txt if available
    requirements_path = script_dir / "requirements.txt"
    if requirements_path.exists():
        print(f"📋 Installing from requirements.txt...")
        try:
            subprocess.run(
                [str(pip_path), "install", "-r", str(requirements_path)],
                check=True,
                capture_output=True
            )
            print(f"✅ Installed all requirements")
        except subprocess.CalledProcessError as e:
            print(f"⚠️  Some requirements failed to install, but essential packages should work")
    
    # Verify installation
    print(f"\n🔍 Verifying installation...")
    
    verification_packages = [
        ("psutil", "import psutil; print(f'psutil {psutil.__version__}')"),
        ("torch", "import torch; print(f'torch {torch.__version__}')"),
        ("transformers", "import transformers; print(f'transformers {transformers.__version__}')"),
        ("PIL/Pillow", "import PIL; print(f'Pillow {PIL.__version__}')"),
        ("timm", "import timm; print(f'timm {timm.__version__}')"),
    ]
    
    all_good = True
    for name, test_code in verification_packages:
        try:
            result = subprocess.run(
                [str(python_venv), "-c", test_code],
                capture_output=True,
                text=True,
                check=True
            )
            print(f"   ✅ {result.stdout.strip()}")
        except subprocess.CalledProcessError:
            print(f"   ❌ {name} verification failed")
            all_good = False
    
    if all_good:
        print(f"\n✅ Virtual environment recreated successfully!")
        print(f"💡 You can now try training again")
    else:
        print(f"\n⚠️  Some packages failed verification")
        print(f"💡 Try running the training anyway - it might still work")


if __name__ == "__main__":
    main() 