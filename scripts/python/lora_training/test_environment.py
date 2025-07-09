#!/usr/bin/env python3
"""
Environment validation test for LoRA training in Orch-OS
"""

import sys
import os
import subprocess
from pathlib import Path

def test_python_imports():
    """Test that all required Python modules are available."""
    print("🧪 Testing Python imports...")
    
    required_modules = [
        'psutil',
        'torch',
        'transformers',
        'numpy',
        'json'
    ]
    
    failed_imports = []
    
    for module in required_modules:
        try:
            __import__(module)
            if module == 'psutil':
                import psutil
                print(f"  ✅ {module}: {psutil.__version__}")
            elif module == 'torch':
                import torch
                print(f"  ✅ {module}: {torch.__version__}")
            elif module == 'transformers':
                import transformers
                print(f"  ✅ {module}: {transformers.__version__}")
            else:
                print(f"  ✅ {module}: imported successfully")
        except ImportError as e:
            print(f"  ❌ {module}: {e}")
            failed_imports.append(module)
    
    return len(failed_imports) == 0

def test_memory_monitor():
    """Test the memory monitor service specifically."""
    print("🧠 Testing memory monitor...")
    
    try:
        from services.memory_monitor import MemoryMonitor, monitor_memory_usage
        
        # Test creating a MemoryMonitor instance
        monitor = MemoryMonitor()
        print("  ✅ MemoryMonitor instance created")
        
        # Test getting initial memory info
        memory_info = monitor.get_memory_info()
        print(f"  ✅ Memory info: {memory_info['available_gb']:.1f}GB available")
        
        # Test monitor_memory_usage decorator
        @monitor_memory_usage
        def test_function():
            return "test completed"
        
        result = test_function()
        print(f"  ✅ Memory monitoring decorator: {result}")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Memory monitor test failed: {e}")
        return False

def test_training_orchestrator():
    """Test the training orchestrator import."""
    print("🎯 Testing training orchestrator...")
    
    try:
        from orchestrator.training_orchestrator import TrainingOrchestrator
        print("  ✅ TrainingOrchestrator imported successfully")
        
        # Test creating an instance (without initializing training)
        orchestrator = TrainingOrchestrator()
        print("  ✅ TrainingOrchestrator instance created")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Training orchestrator test failed: {e}")
        return False

def test_file_structure():
    """Test that all required files are present."""
    print("📁 Testing file structure...")
    
    current_dir = Path(__file__).parent
    required_files = [
        'ollama_lora_training.py',
        'requirements.txt',
        'services/memory_monitor.py',
        'orchestrator/training_orchestrator.py'
    ]
    
    missing_files = []
    
    for file_path in required_files:
        full_path = current_dir / file_path
        if full_path.exists():
            print(f"  ✅ {file_path}: found")
        else:
            print(f"  ❌ {file_path}: missing")
            missing_files.append(file_path)
    
    return len(missing_files) == 0

def test_ollama_availability():
    """Test if Ollama is available."""
    print("🦙 Testing Ollama availability...")
    
    try:
        # Use OllamaService for robust path detection
        from services.ollama_service import OllamaService
        ollama_service = OllamaService()
        
        if ollama_service.is_available():
            print("  ✅ Ollama is available and running")
            
            # Try to list models
            models = ollama_service.list_models()
            if models:
                print(f"  ✅ Found {len(models)} models:")
                for model in models[:5]:  # Show first 5 models
                    print(f"     • {model}")
                if len(models) > 5:
                    print(f"     ... and {len(models) - 5} more")
            else:
                print("  ⚠️ No models found - you may need to pull a model first")
            
            return True
        else:
            print("  ❌ Ollama is not available or not running")
            print("  💡 Make sure Ollama is installed and running")
            return False
            
    except Exception as e:
        print(f"  ❌ Error testing Ollama: {e}")
        return False

def test_python_version():
    """Test Python version compatibility."""
    print("🐍 Testing Python version...")
    
    version = sys.version_info
    print(f"  Python version: {version.major}.{version.minor}.{version.micro}")
    
    if version.major == 3 and version.minor >= 9:
        print("  ✅ Python version is compatible")
        return True
    else:
        print("  ❌ Python version must be 3.9 or higher")
        return False

def main():
    """Run all tests."""
    print("=" * 60)
    print("🧪 Orch-OS LoRA Training Environment Test")
    print("=" * 60)
    
    tests = [
        ("Python Version", test_python_version),
        ("Python Imports", test_python_imports),
        ("File Structure", test_file_structure),
        ("Memory Monitor", test_memory_monitor),
        ("Training Orchestrator", test_training_orchestrator),
        ("Ollama Availability", test_ollama_availability)
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        print(f"\n📋 {test_name}:")
        try:
            results[test_name] = test_func()
        except Exception as e:
            print(f"  ❌ Unexpected error: {e}")
            results[test_name] = False
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Test Results Summary:")
    print("=" * 60)
    
    passed = sum(results.values())
    total = len(results)
    
    for test_name, passed_test in results.items():
        status = "✅ PASS" if passed_test else "❌ FAIL"
        print(f"  {status}: {test_name}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Environment is ready for LoRA training.")
        return 0
    else:
        print("⚠️  Some tests failed. Please fix the issues before training.")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code) 