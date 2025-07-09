#!/usr/bin/env python3
"""
Test script to validate virtual environment setup for LoRA training
"""

import sys
import os
from pathlib import Path

def test_essential_imports():
    """Test importing essential packages for LoRA training."""
    print("🧪 Testing essential imports...")
    
    # Test 1: psutil (required for memory monitoring)
    try:
        import psutil
        print(f"✅ psutil: {psutil.__version__}")
    except ImportError as e:
        print(f"❌ psutil: {e}")
        return False
    
    # Test 2: torch (required for training)
    try:
        import torch
        print(f"✅ torch: {torch.__version__}")
    except ImportError as e:
        print(f"❌ torch: {e}")
        return False
    
    # Test 3: transformers (required for model loading)
    try:
        import transformers
        print(f"✅ transformers: {transformers.__version__}")
    except ImportError as e:
        print(f"❌ transformers: {e}")
        return False
    
    # Test 4: numpy (usually comes with torch)
    try:
        import numpy
        print(f"✅ numpy: {numpy.__version__}")
    except ImportError as e:
        print(f"❌ numpy: {e}")
        return False
    
    return True

def test_memory_monitor():
    """Test memory monitor functionality."""
    print("\n🧪 Testing memory monitor...")
    
    try:
        sys.path.append(os.path.dirname(os.path.abspath(__file__)))
        from services.memory_monitor import MemoryMonitor
        
        monitor = MemoryMonitor()
        memory_info = monitor.get_memory_info()
        
        print(f"✅ Memory monitor working:")
        print(f"   • System RAM: {memory_info['system']['used_gb']:.1f}GB / {memory_info['system']['total_gb']:.1f}GB")
        print(f"   • Process RAM: {memory_info['process']['rss_gb']:.1f}GB")
        
        return True
    except Exception as e:
        print(f"❌ Memory monitor failed: {e}")
        return False

def test_training_orchestrator():
    """Test training orchestrator import."""
    print("\n🧪 Testing training orchestrator...")
    
    try:
        sys.path.append(os.path.dirname(os.path.abspath(__file__)))
        from orchestrator.training_orchestrator import TrainingOrchestrator
        print("✅ Training orchestrator imported successfully")
        return True
    except Exception as e:
        print(f"❌ Training orchestrator failed: {e}")
        return False

def main():
    """Main test function."""
    print("🚀 LoRA Training Environment Test")
    print("=" * 50)
    
    print(f"Python version: {sys.version}")
    print(f"Python executable: {sys.executable}")
    print(f"Working directory: {os.getcwd()}")
    
    # Run tests
    tests = [
        ("Essential imports", test_essential_imports),
        ("Memory monitor", test_memory_monitor),
        ("Training orchestrator", test_training_orchestrator),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} crashed: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Results:")
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {status}: {test_name}")
        if result:
            passed += 1
    
    print(f"\n📈 Summary: {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("🎉 All tests passed! Environment is ready for LoRA training.")
        return 0
    else:
        print("⚠️ Some tests failed. Please check the environment setup.")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 