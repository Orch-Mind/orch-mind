#!/usr/bin/env python3
# SPDX-License-Identifier: MIT OR Apache-2.0
"""
Automatic llama.cpp installer for Orch-OS
Detects and installs llama.cpp when needed for GGUF conversion
"""

import os
import sys
import subprocess
import platform
import tempfile
import shutil
from pathlib import Path
from typing import Optional, Tuple, List, Dict, Any

def get_project_root() -> str:
    """Get the project root directory (4 levels up from current file)."""
    current_file = os.path.abspath(__file__)
    # Go up 4 levels: lora_training -> python -> scripts -> orch-os
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(current_file))))
    return project_root

def get_system_info() -> dict:
    """Get system information for optimal llama.cpp installation."""
    system = platform.system().lower()
    machine = platform.machine().lower()
    
    # Detect Apple Silicon
    is_apple_silicon = system == "darwin" and machine in ["arm64", "aarch64"]
    
    # Detect available compilers
    has_xcode = shutil.which("xcode-select") is not None
    has_cmake = shutil.which("cmake") is not None
    has_git = shutil.which("git") is not None
    
    return {
        "system": system,
        "machine": machine,
        "is_apple_silicon": is_apple_silicon,
        "has_xcode": has_xcode,
        "has_cmake": has_cmake,
        "has_git": has_git
    }

def find_existing_llama_cpp() -> Optional[str]:
    """Find existing llama.cpp installation."""
    print("🔍 Searching for existing llama.cpp installation...")
    
    # Get project root for absolute path checking
    project_root = get_project_root()
    
    # Common installation locations (use absolute paths)
    search_paths = [
        # Project directory (absolute path)
        os.path.join(project_root, "llama.cpp"),
        
        # Local project directory (relative paths for backward compatibility)
        "./llama.cpp",
        "../llama.cpp",
        "../../llama.cpp",
        "../../../llama.cpp",
        
        # User directories
        os.path.expanduser("~/llama.cpp"),
        os.path.expanduser("~/Developer/llama.cpp"),
        os.path.expanduser("~/Projects/llama.cpp"),
        
        # System-wide locations
        "/usr/local/llama.cpp",
        "/opt/llama.cpp",
        "/opt/homebrew/llama.cpp"
    ]
    
    for path in search_paths:
        abs_path = os.path.abspath(path)
        print(f"   🔍 Checking: {abs_path}")
        
        if os.path.exists(abs_path):
            # Check if it's a valid llama.cpp directory
            convert_scripts = [
                os.path.join(abs_path, "convert.py"),
                os.path.join(abs_path, "convert_hf_to_gguf.py"),
                os.path.join(abs_path, "convert-hf-to-gguf.py")
            ]
            
            # Check for main executable (CMake build)
            main_executables = [
                os.path.join(abs_path, "build", "bin", "llama-cli"),  # Modern name
                os.path.join(abs_path, "build", "bin", "main"),       # Legacy name
                os.path.join(abs_path, "build", "main"),              # Alternative location
                os.path.join(abs_path, "main")                        # Old make build
            ]
            
            has_convert = any(os.path.exists(script) for script in convert_scripts)
            has_main = any(os.path.exists(exe) for exe in main_executables)
            
            print(f"      • Convert script found: {has_convert}")
            print(f"      • Main executable found: {has_main}")
            
            if has_convert and has_main:
                print(f"   ✅ Found llama.cpp at: {abs_path}")
                return abs_path
    
    print("   ❌ No existing llama.cpp installation found")
    return None

def install_dependencies_macos() -> bool:
    """Install required dependencies on macOS."""
    print("📦 Installing macOS dependencies...")
    
    try:
        # Check if Xcode command line tools are installed
        result = subprocess.run(
            ["xcode-select", "--print-path"],
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            print("   📥 Installing Xcode command line tools...")
            subprocess.run(
                ["xcode-select", "--install"],
                check=True
            )
            print("   ✅ Xcode command line tools installed")
        else:
            print("   ✅ Xcode command line tools already installed")
        
        # Check if Homebrew is available
        if shutil.which("brew") is None:
            print("   📥 Installing Homebrew...")
            subprocess.run([
                "/bin/bash", "-c",
                "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            ], check=True)
            print("   ✅ Homebrew installed")
        else:
            print("   ✅ Homebrew already available")
        
        # Install cmake if not available
        if shutil.which("cmake") is None:
            print("   📥 Installing cmake...")
            subprocess.run(["brew", "install", "cmake"], check=True)
            print("   ✅ cmake installed")
        else:
            print("   ✅ cmake already available")
        
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"   ❌ Failed to install dependencies: {e}")
        return False

def install_dependencies_linux() -> bool:
    """Install required dependencies on Linux."""
    print("📦 Installing Linux dependencies...")
    
    try:
        # Detect package manager
        if shutil.which("apt-get"):
            # Debian/Ubuntu
            print("   📥 Installing via apt-get...")
            subprocess.run([
                "sudo", "apt-get", "update"
            ], check=True)
            subprocess.run([
                "sudo", "apt-get", "install", "-y",
                "build-essential", "cmake", "git"
            ], check=True)
            
        elif shutil.which("yum"):
            # RHEL/CentOS
            print("   📥 Installing via yum...")
            subprocess.run([
                "sudo", "yum", "groupinstall", "-y", "Development Tools"
            ], check=True)
            subprocess.run([
                "sudo", "yum", "install", "-y", "cmake", "git"
            ], check=True)
            
        elif shutil.which("pacman"):
            # Arch Linux
            print("   📥 Installing via pacman...")
            subprocess.run([
                "sudo", "pacman", "-S", "--noconfirm",
                "base-devel", "cmake", "git"
            ], check=True)
            
        else:
            print("   ⚠️ Unknown package manager, please install manually:")
            print("      • build-essential or equivalent")
            print("      • cmake")
            print("      • git")
            return False
        
        print("   ✅ Dependencies installed")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"   ❌ Failed to install dependencies: {e}")
        return False

def clone_and_build_llama_cpp(install_dir: str) -> bool:
    """Clone and build llama.cpp from source."""
    print(f"🔧 Building llama.cpp in: {install_dir}")
    
    try:
        # Check if directory already exists and contains llama.cpp
        if os.path.exists(install_dir):
            # Check if it's already a valid llama.cpp directory
            if os.path.exists(os.path.join(install_dir, "convert_hf_to_gguf.py")):
                print("   ✅ Directory already contains llama.cpp - skipping clone")
            else:
                print("   🧹 Directory exists but is not llama.cpp - cleaning up...")
                shutil.rmtree(install_dir)
                os.makedirs(install_dir, exist_ok=True)
                
                # Clone repository
                print("   📥 Cloning llama.cpp repository...")
                subprocess.run([
                    "git", "clone", 
                    "https://github.com/ggerganov/llama.cpp.git",
                    install_dir
                ], check=True)
        else:
            # Create installation directory and clone
            os.makedirs(install_dir, exist_ok=True)
            
            # Clone repository
            print("   📥 Cloning llama.cpp repository...")
            subprocess.run([
                "git", "clone", 
                "https://github.com/ggerganov/llama.cpp.git",
                install_dir
            ], check=True)
        
        # Change to llama.cpp directory
        original_cwd = os.getcwd()
        os.chdir(install_dir)
        
        try:
            # Check if already built
            build_dir = os.path.join(install_dir, "build")
            llama_cli_path = os.path.join(build_dir, "bin", "llama-cli")
            
            if os.path.exists(llama_cli_path):
                print("   ✅ llama.cpp already built - skipping build")
                return True
            
            # Build with CMake (modern llama.cpp uses CMake instead of make)
            system_info = get_system_info()
            
            print("   🔧 Creating build directory...")
            os.makedirs(build_dir, exist_ok=True)
            
            # Configure with CMake
            cmake_args = [
                "cmake", "..",
                "-DCMAKE_BUILD_TYPE=Release"
            ]
            
            if system_info["is_apple_silicon"]:
                print("   🍎 Configuring for Apple Silicon with Metal support...")
                cmake_args.extend([
                    "-DLLAMA_METAL=ON",
                    "-DLLAMA_METAL_EMBED_LIBRARY=ON"
                ])
            else:
                print("   🔧 Configuring with default options...")
            
            # Run cmake configure
            subprocess.run(cmake_args, cwd=build_dir, check=True)
            
            # Build with cmake
            print("   🔨 Building llama.cpp...")
            subprocess.run([
                "cmake", "--build", ".", 
                "--config", "Release",
                "-j", str(os.cpu_count() or 4)
            ], cwd=build_dir, check=True)
            
            print("   ✅ llama.cpp built successfully")
            
            # Verify installation - check for modern executable names
            main_executables = [
                os.path.join("build", "bin", "llama-cli"),  # Modern name
                os.path.join("build", "bin", "main"),       # Legacy name
                os.path.join("build", "main"),              # Alternative location
                "main"                                      # Old make build
            ]
            
            main_executable = None
            for exe in main_executables:
                if os.path.exists(exe):
                    main_executable = exe
                    break
            
            convert_scripts = ["convert.py", "convert_hf_to_gguf.py", "convert-hf-to-gguf.py"]
            has_convert_script = any(os.path.exists(script) for script in convert_scripts)
            
            if main_executable and has_convert_script:
                print("   ✅ Installation verified")
                print(f"      • Main executable: {main_executable}")
                return True
            else:
                print("   ❌ Installation verification failed")
                print(f"      • Main executable found: {main_executable}")
                print(f"      • Convert script exists: {has_convert_script}")
                return False
                
        finally:
            os.chdir(original_cwd)
        
    except subprocess.CalledProcessError as e:
        print(f"   ❌ Failed to build llama.cpp: {e}")
        return False
    except Exception as e:
        print(f"   ❌ Unexpected error: {e}")
        return False

def get_preferred_install_location() -> str:
    """Get the preferred installation location for llama.cpp."""
    # Try to install in project directory first
    try:
        project_root = get_project_root()
        install_dir = os.path.join(project_root, "llama.cpp")
        
        # Check if we can write to project directory
        if os.access(project_root, os.W_OK):
            return install_dir
    except:
        pass
    
    # Fallback to user directory
    return os.path.expanduser("~/llama.cpp")

def install_llama_cpp() -> Optional[str]:
    """Install llama.cpp automatically."""
    print("🚀 Installing llama.cpp automatically...")
    print("=" * 50)
    
    # Get system information
    system_info = get_system_info()
    print(f"📊 System: {system_info['system']} {system_info['machine']}")
    
    if system_info["is_apple_silicon"]:
        print("🍎 Detected Apple Silicon - will enable Metal support")
    
    # Check dependencies
    if not system_info["has_git"]:
        print("❌ Git is required but not found. Please install Git first.")
        return None
    
    # Install system dependencies
    if system_info["system"] == "darwin":
        if not install_dependencies_macos():
            return None
    elif system_info["system"] == "linux":
        if not install_dependencies_linux():
            return None
    else:
        print(f"⚠️ Unsupported system: {system_info['system']}")
        print("Please install llama.cpp manually from: https://github.com/ggerganov/llama.cpp")
        return None
    
    # Get installation location
    install_dir = get_preferred_install_location()
    print(f"📂 Installation directory: {install_dir}")
    
    # Clone and build
    if clone_and_build_llama_cpp(install_dir):
        print(f"\n🎉 llama.cpp installed successfully!")
        print(f"📂 Location: {install_dir}")
        return install_dir
    else:
        print(f"\n❌ Failed to install llama.cpp")
        return None

def ensure_llama_cpp_available() -> Optional[str]:
    """Ensure llama.cpp is available, installing if necessary."""
    # First, try to find existing installation
    existing_path = find_existing_llama_cpp()
    if existing_path:
        return existing_path
    
    # If not found, ask user if they want to install
    print("\n🤖 llama.cpp is required for GGUF model conversion")
    print("This tool converts merged LoRA models to a format that Ollama can use.")
    
    response = input("\nWould you like to install llama.cpp automatically? (y/N): ").strip().lower()
    
    if response in ['y', 'yes']:
        return install_llama_cpp()
    else:
        print("\n📝 Manual installation instructions:")
        print("1. Clone: git clone https://github.com/ggerganov/llama.cpp.git")
        print("2. Build: cd llama.cpp && make")
        print("3. Ensure the directory is accessible to this script")
        return None

def test_llama_cpp_installation(llama_cpp_dir: str) -> bool:
    """Test if llama.cpp installation is working."""
    print(f"🧪 Testing llama.cpp installation at: {llama_cpp_dir}")
    
    # Check for main executable (multiple possible locations)
    main_executables = [
        os.path.join(llama_cpp_dir, "build", "bin", "llama-cli"),  # Modern name
        os.path.join(llama_cpp_dir, "build", "bin", "main"),       # Legacy name
        os.path.join(llama_cpp_dir, "build", "main"),              # Alternative location
        os.path.join(llama_cpp_dir, "main")                        # Old make build
    ]
    
    main_executable = None
    for exe in main_executables:
        if os.path.exists(exe):
            main_executable = exe
            break
    
    if not main_executable:
        print(f"   ❌ Main executable not found in any of these locations:")
        for exe in main_executables:
            print(f"      • {exe}")
        return False
    
    # Check for convert scripts
    convert_scripts = [
        os.path.join(llama_cpp_dir, "convert.py"),
        os.path.join(llama_cpp_dir, "convert_hf_to_gguf.py"),
        os.path.join(llama_cpp_dir, "convert-hf-to-gguf.py")
    ]
    
    convert_script = None
    for script in convert_scripts:
        if os.path.exists(script):
            convert_script = script
            break
    
    if not convert_script:
        print(f"   ❌ Convert script not found in: {llama_cpp_dir}")
        return False
    
    print(f"   ✅ Main executable: {main_executable}")
    print(f"   ✅ Convert script: {convert_script}")
    
    # Test if main executable runs
    try:
        result = subprocess.run(
            [main_executable, "--help"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            print("   ✅ Main executable is working")
            return True
        else:
            print(f"   ❌ Main executable failed: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        print("   ❌ Main executable timed out")
        return False
    except Exception as e:
        print(f"   ❌ Error testing main executable: {e}")
        return False

def install_llama_cpp_non_interactive() -> Optional[str]:
    """Install llama.cpp automatically without user interaction."""
    print("🚀 Installing llama.cpp automatically (non-interactive)...")
    print("=" * 50)
    
    # First, try to find existing installation
    existing_path = find_existing_llama_cpp()
    if existing_path:
        print(f"✅ Found existing llama.cpp installation: {existing_path}")
        return existing_path
    
    # Get system information
    system_info = get_system_info()
    print(f"📊 System: {system_info['system']} {system_info['machine']}")
    
    if system_info["is_apple_silicon"]:
        print("🍎 Detected Apple Silicon - will enable Metal support")
    
    # Check dependencies
    if not system_info["has_git"]:
        print("❌ Git is required but not found. Please install Git first.")
        return None
    
    # Install system dependencies (non-interactive)
    if system_info["system"] == "darwin":
        if not install_dependencies_macos_non_interactive():
            return None
    elif system_info["system"] == "linux":
        if not install_dependencies_linux_non_interactive():
            return None
    else:
        print(f"⚠️ Unsupported system: {system_info['system']}")
        print("Please install llama.cpp manually from: https://github.com/ggerganov/llama.cpp")
        return None
    
    # Get installation location
    install_dir = get_preferred_install_location()
    print(f"📂 Installation directory: {install_dir}")
    
    # Clone and build
    if clone_and_build_llama_cpp(install_dir):
        print(f"\n🎉 llama.cpp installed successfully!")
        print(f"📂 Location: {install_dir}")
        return install_dir
    else:
        print(f"\n❌ Failed to install llama.cpp")
        return None

def install_dependencies_macos_non_interactive() -> bool:
    """Install required dependencies on macOS without user interaction."""
    print("📦 Installing macOS dependencies (non-interactive)...")
    
    try:
        # Check if Xcode command line tools are installed
        result = subprocess.run(
            ["xcode-select", "--print-path"],
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            print("   ⚠️ Xcode command line tools not found")
            print("   💡 Please install manually: xcode-select --install")
            return False
        else:
            print("   ✅ Xcode command line tools already installed")
        
        # Check if Homebrew is available
        if shutil.which("brew") is None:
            print("   ⚠️ Homebrew not found")
            print("   💡 Please install manually: /bin/bash -c \"$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"")
            return False
        else:
            print("   ✅ Homebrew already available")
        
        # Install cmake if not available
        if shutil.which("cmake") is None:
            print("   📥 Installing cmake...")
            result = subprocess.run(
                ["brew", "install", "cmake"], 
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                print("   ✅ cmake installed")
            else:
                print("   ❌ Failed to install cmake")
                return False
        else:
            print("   ✅ cmake already available")
        
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"   ❌ Failed to install dependencies: {e}")
        return False

def install_dependencies_linux_non_interactive() -> bool:
    """Install required dependencies on Linux without user interaction."""
    print("📦 Installing Linux dependencies (non-interactive)...")
    
    try:
        # Detect package manager
        if shutil.which("apt-get"):
            # Debian/Ubuntu
            print("   📥 Installing via apt-get...")
            result1 = subprocess.run([
                "sudo", "apt-get", "update"
            ], capture_output=True, text=True)
            
            if result1.returncode != 0:
                print("   ❌ Failed to update package list")
                return False
            
            result2 = subprocess.run([
                "sudo", "apt-get", "install", "-y",
                "build-essential", "cmake", "git"
            ], capture_output=True, text=True)
            
            if result2.returncode != 0:
                print("   ❌ Failed to install packages")
                return False
            
        elif shutil.which("yum"):
            # RHEL/CentOS
            print("   📥 Installing via yum...")
            result1 = subprocess.run([
                "sudo", "yum", "groupinstall", "-y", "Development Tools"
            ], capture_output=True, text=True)
            
            if result1.returncode != 0:
                print("   ❌ Failed to install Development Tools")
                return False
            
            result2 = subprocess.run([
                "sudo", "yum", "install", "-y", "cmake", "git"
            ], capture_output=True, text=True)
            
            if result2.returncode != 0:
                print("   ❌ Failed to install cmake and git")
                return False
            
        elif shutil.which("pacman"):
            # Arch Linux
            print("   📥 Installing via pacman...")
            result = subprocess.run([
                "sudo", "pacman", "-S", "--noconfirm",
                "base-devel", "cmake", "git"
            ], capture_output=True, text=True)
            
            if result.returncode != 0:
                print("   ❌ Failed to install packages")
                return False
            
        else:
            print("   ⚠️ Unknown package manager")
            print("   💡 Please install manually: build-essential/equivalent, cmake, git")
            return False
        
        print("   ✅ Dependencies installed")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"   ❌ Failed to install dependencies: {e}")
        return False

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="llama.cpp installer for Orch-OS")
    parser.add_argument("--test", action="store_true", help="Test existing installation")
    parser.add_argument("--install", action="store_true", help="Force installation")
    parser.add_argument("--find", action="store_true", help="Find existing installation")
    
    args = parser.parse_args()
    
    if args.find:
        path = find_existing_llama_cpp()
        if path:
            print(f"Found: {path}")
            sys.exit(0)
        else:
            print("Not found")
            sys.exit(1)
    
    elif args.test:
        path = find_existing_llama_cpp()
        if path and test_llama_cpp_installation(path):
            print("✅ llama.cpp is working correctly")
            sys.exit(0)
        else:
            print("❌ llama.cpp is not working or not found")
            sys.exit(1)
    
    elif args.install:
        path = install_llama_cpp()
        if path:
            print(f"✅ Installed at: {path}")
            sys.exit(0)
        else:
            print("❌ Installation failed")
            sys.exit(1)
    
    else:
        # Default: ensure available
        path = ensure_llama_cpp_available()
        if path:
            print(f"✅ llama.cpp available at: {path}")
            sys.exit(0)
        else:
            print("❌ llama.cpp not available")
            sys.exit(1) 