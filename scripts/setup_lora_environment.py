#!/usr/bin/env python3
# SPDX-License-Identifier: MIT OR Apache-2.0
# Orch-Mind LoRA Environment Setup and Verification Script
# This script can be run manually to check or install LoRA training dependencies

import sys
import subprocess
import platform
import importlib.util
import os
from pathlib import Path

class Colors:
    """ANSI color codes for terminal output"""
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

def log(message, color=None):
    """Print colored log message"""
    if color:
        print(f"{color}[Orch-Mind Setup]{Colors.END} {message}")
    else:
        print(f"[Orch-Mind Setup] {message}")

def check_python_version():
    """Check if Python version is compatible"""
    log("Verificando versão do Python...", Colors.BLUE)
    
    version = sys.version_info
    if version.major == 3 and 9 <= version.minor <= 15:
        if version.minor == 11:
            log(f"✅ Python {version.major}.{version.minor}.{version.micro} é a versão recomendada!", Colors.GREEN)
        else:
            log(f"✅ Python {version.major}.{version.minor}.{version.micro} é compatível (recomendado: 3.11)", Colors.GREEN)
        return True
    else:
        log(f"❌ Python {version.major}.{version.minor}.{version.micro} não é compatível", Colors.RED)
        log("Versões suportadas: Python 3.9-3.15 (recomendado: 3.11)", Colors.YELLOW)
        show_python_installation_instructions()
        return False

def show_python_installation_instructions():
    """Show platform-specific Python installation instructions"""
    system = platform.system().lower()
    
    log("\n📥 Como instalar Python 3.11:", Colors.BLUE)
    
    if system == "darwin":  # macOS
        print("  🍎 macOS:")
        print("    1. Via Homebrew: brew install python@3.11")
        print("    2. Via python.org: https://www.python.org/downloads/")
        print("    3. Via script do Orch-Mind: ./build/postinstall.sh")
        
    elif system == "linux":  # Linux
        print("  🐧 Linux:")
        print("    • Ubuntu/Debian: sudo apt install python3.11")
        print("    • Fedora/RHEL: sudo dnf install python3.11")
        print("    • Arch Linux: sudo pacman -S python")
        print("    • Via script do Orch-Mind: sudo ./build/postinstall-linux.sh")
        
    elif system == "windows":  # Windows
        print("  🪟 Windows:")
        print("    1. Baixe de: https://www.python.org/downloads/")
        print("    2. Execute o instalador e marque 'Add Python to PATH'")
        print("    3. Via winget: winget install Python.Python.3.11")
        
    else:
        print(f"  ❓ Sistema {system} - consulte: https://www.python.org/downloads/")
    
    print(f"\n  💡 Após instalar, execute novamente: python scripts/setup_lora_environment.py")

def check_cuda_availability():
    """Check if CUDA is available on the system"""
    log("Verificando disponibilidade de CUDA...", Colors.BLUE)
    
    # Try nvidia-smi command
    try:
        result = subprocess.run(['nvidia-smi'], capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            log("✅ NVIDIA GPU detectada - CUDA disponível", Colors.GREEN)
            return True
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    
    # Try importing torch and check CUDA
    try:
        import torch
        if torch.cuda.is_available():
            log("✅ PyTorch detectou CUDA disponível", Colors.GREEN)
            return True
        else:
            log("⚠️ PyTorch instalado mas CUDA não detectado", Colors.YELLOW)
            return False
    except ImportError:
        pass
    
    log("ℹ️ CUDA não detectado - usando configuração CPU-only", Colors.YELLOW)
    return False

def check_package_installed(package_name, import_name=None):
    """Check if a Python package is installed"""
    if import_name is None:
        import_name = package_name
    
    try:
        importlib.import_module(import_name)
        return True
    except ImportError:
        return False

def install_package(package_name, upgrade=True):
    """Install a Python package using pip"""
    cmd = [sys.executable, '-m', 'pip', 'install', package_name, '--user']
    if upgrade:
        cmd.append('--upgrade')
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        return result.returncode == 0
    except subprocess.TimeoutExpired:
        log(f"⏰ Timeout ao instalar {package_name}", Colors.RED)
        return False

def check_and_install_dependencies():
    """Check and install all required dependencies"""
    log("Verificando e instalando dependências LoRA...", Colors.BLUE)
    
    # Check CUDA availability
    has_cuda = check_cuda_availability()
    
    # Define required packages
    basic_packages = [
        ('torch', 'torch'),
        ('transformers>=4.36.0', 'transformers'),
        ('datasets', 'datasets'),
        ('accelerate', 'accelerate'),
        ('peft>=0.7.0', 'peft'),
        ('trl', 'trl'),
    ]
    
    # Add CUDA-specific packages
    if has_cuda:
        basic_packages.append(('bitsandbytes', 'bitsandbytes'))
        log("ℹ️ Incluindo bitsandbytes para suporte CUDA", Colors.BLUE)
    else:
        log("ℹ️ Pulando bitsandbytes (CUDA não disponível)", Colors.YELLOW)
    
    # Check and install each package
    failed_packages = []
    installed_packages = []
    
    for package_spec, import_name in basic_packages:
        package_name = package_spec.split('>=')[0].split('==')[0]  # Get base package name
        log(f"Verificando {package_name}...", Colors.BLUE)
        
        if check_package_installed(package_name, import_name):
            log(f"✅ {package_name} já está instalado", Colors.GREEN)
            installed_packages.append(package_name)
        else:
            log(f"📦 Instalando {package_name}...", Colors.YELLOW)
            if install_package(package_spec):
                log(f"✅ {package_name} instalado com sucesso", Colors.GREEN)
                installed_packages.append(package_name)
            else:
                log(f"❌ Falha ao instalar {package_name}", Colors.RED)
                failed_packages.append(package_name)
    
    return installed_packages, failed_packages

def test_imports():
    """Test if all required packages can be imported"""
    log("Testando importações...", Colors.BLUE)
    
    test_imports = [
        ('torch', 'PyTorch'),
        ('transformers', 'Transformers'),
        ('datasets', 'Datasets'),
        ('accelerate', 'Accelerate'),
        ('peft', 'PEFT'),
        ('trl', 'TRL'),
    ]
    
    # Test bitsandbytes only if CUDA is available
    if check_cuda_availability():
        test_imports.append(('bitsandbytes', 'Bitsandbytes'))
    
    success_count = 0
    for module, name in test_imports:
        try:
            importlib.import_module(module)
            log(f"✅ {name} importado com sucesso", Colors.GREEN)
            success_count += 1
        except ImportError as e:
            log(f"❌ Falha ao importar {name}: {e}", Colors.RED)
    
    return success_count, len(test_imports)

def check_ollama():
    """Check if Ollama is installed and accessible"""
    log("Verificando Ollama...", Colors.BLUE)
    
    try:
        result = subprocess.run(['ollama', '--version'], capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            version = result.stdout.strip()
            log(f"✅ Ollama instalado: {version}", Colors.GREEN)
            return True
        else:
            log("❌ Ollama não responde corretamente", Colors.RED)
            return False
    except FileNotFoundError:
        log("❌ Ollama não encontrado no PATH", Colors.RED)
        return False
    except subprocess.TimeoutExpired:
        log("⏰ Timeout ao verificar Ollama", Colors.YELLOW)
        return False



def create_test_script():
    """Create a test script to verify LoRA training setup"""
    log("Criando script de teste...", Colors.BLUE)
    
    test_script = """#!/usr/bin/env python3
# Test script for LoRA training environment
import sys

def test_basic_imports():
    print("Testando importações básicas...")
    try:
        import torch
        print(f"✅ PyTorch {torch.__version__}")
        print(f"   - CUDA disponível: {torch.cuda.is_available()}")
        if torch.cuda.is_available():
            print(f"   - Dispositivos CUDA: {torch.cuda.device_count()}")
        
        import transformers
        print(f"✅ Transformers {transformers.__version__}")
        
        import datasets
        print(f"✅ Datasets {datasets.__version__}")
        
        import peft
        print(f"✅ PEFT {peft.__version__}")
        
        import trl
        print(f"✅ TRL {trl.__version__}")
        
        import accelerate
        print(f"✅ Accelerate {accelerate.__version__}")
        
        try:
            import bitsandbytes
            print(f"✅ Bitsandbytes {bitsandbytes.__version__}")
        except ImportError:
            print("ℹ️ Bitsandbytes não instalado (normal em sistemas CPU-only)")
        
        return True
    except ImportError as e:
        print(f"❌ Erro de importação: {e}")
        return False

def test_model_loading():
    print("\\nTestando carregamento de modelo básico...")
    try:
        from transformers import AutoTokenizer
        tokenizer = AutoTokenizer.from_pretrained("hf-internal-testing/llama-tokenizer")
        print("✅ Carregamento de tokenizer funcional")
        return True
    except Exception as e:
        print(f"❌ Erro no carregamento: {e}")
        return False

if __name__ == "__main__":
    print("=== Teste do Ambiente LoRA do Orch-Mind ===")
    
    success = True
    success &= test_basic_imports()
    success &= test_model_loading()
    
    print("\\n" + "="*50)
    if success:
        print("✅ Ambiente LoRA configurado corretamente!")
        sys.exit(0)
    else:
        print("❌ Problemas encontrados no ambiente LoRA")
        sys.exit(1)
"""
    
    test_file = Path("test_lora_environment.py")
    try:
        with open(test_file, 'w') as f:
            f.write(test_script)
        log(f"✅ Script de teste criado: {test_file.absolute()}", Colors.GREEN)
        log(f"Execute: python {test_file} para testar o ambiente", Colors.BLUE)
        return True
    except Exception as e:
        log(f"❌ Falha ao criar script de teste: {e}", Colors.RED)
        return False

def main():
    """Main setup and verification function"""
    print(f"{Colors.BOLD}=== Orch-Mind LoRA Environment Setup ==={Colors.END}")
    print(f"Sistema: {platform.system()} {platform.release()}")
    print(f"Python: {sys.version}")
    print()
    
    # Check Python version
    if not check_python_version():
        log("❌ Python 3.11 é necessário para o treinamento LoRA do Orch-Mind", Colors.RED)
        log("📋 Siga as instruções acima para instalar Python 3.11", Colors.YELLOW)
        return 1
    
    # Install/check Python dependencies
    installed, failed = check_and_install_dependencies()
    
    print(f"\n{Colors.BOLD}=== Resultado da Instalação ==={Colors.END}")
    log(f"Pacotes instalados: {len(installed)}", Colors.GREEN)
    for pkg in installed:
        print(f"  ✅ {pkg}")
    
    if failed:
        log(f"Pacotes com falha: {len(failed)}", Colors.RED)
        for pkg in failed:
            print(f"  ❌ {pkg}")
    
    # Test imports
    print(f"\n{Colors.BOLD}=== Teste de Importações ==={Colors.END}")
    success_count, total_count = test_imports()
    
    # Check external dependencies
    print(f"\n{Colors.BOLD}=== Dependências Externas ==={Colors.END}")
    ollama_ok = check_ollama()
    
    # Create test script
    print(f"\n{Colors.BOLD}=== Criando Script de Teste ==={Colors.END}")
    test_created = create_test_script()
    
    # Final summary
    print(f"\n{Colors.BOLD}=== Resumo Final ==={Colors.END}")
    
    if success_count == total_count and not failed:
        log("✅ Ambiente LoRA configurado com sucesso!", Colors.GREEN)
        print("🎉 O Orch-Mind está pronto para treinamento LoRA!")
        
        if not ollama_ok:
            log("⚠️ Ollama não está disponível - instale manualmente se necessário", Colors.YELLOW)
        
        return 0
    else:
        log("❌ Problemas encontrados na configuração", Colors.RED)
        if failed:
            log("Tente instalar os pacotes manualmente:", Colors.YELLOW)
            for pkg in failed:
                print(f"  pip install --user --upgrade {pkg}")
        return 1

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        log("\nOperação cancelada pelo usuário", Colors.YELLOW)
        sys.exit(1)
    except Exception as e:
        log(f"Erro inesperado: {e}", Colors.RED)
        sys.exit(1)