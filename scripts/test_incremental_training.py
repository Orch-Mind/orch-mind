#!/usr/bin/env python3
# SPDX-License-Identifier: MIT OR Apache-2.0
# Test for Incremental Training Logic

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'python', 'lora_training'))

from train_lora import extract_base_model

def test_base_model_extraction():
    """Test the extract_base_model function to ensure it works correctly."""
    print("🧪 Testing Base Model Extraction Logic")
    print("=" * 50)
    
    test_cases = [
        # (input, expected_output)
        ("gemma3:latest", "gemma3:latest"),
        ("gemma3-custom:latest", "gemma3:latest"),
        ("llama3.1:latest", "llama3.1:latest"),
        ("llama3.1-custom:latest", "llama3.1:latest"),
        ("mistral:latest", "mistral:latest"),
        ("mistral-custom:latest", "mistral:latest"),
        ("qwen3:latest", "qwen3:latest"),
        ("qwen3-custom:latest", "qwen3:latest"),
        # Edge cases
        ("gemma3", "gemma3:latest"),
        ("gemma3-custom", "gemma3:latest"),
        ("model-name-custom:latest", "model-name:latest"),
    ]
    
    all_passed = True
    
    for input_model, expected in test_cases:
        result = extract_base_model(input_model)
        status = "✅ PASS" if result == expected else "❌ FAIL"
        print(f"{status} | {input_model:<25} → {result:<25} (expected: {expected})")
        
        if result != expected:
            all_passed = False
    
    print("\n" + "=" * 50)
    if all_passed:
        print("🎉 All tests PASSED! Incremental training logic is working correctly.")
        print("\n📝 This means:")
        print("   - gemma3-custom:latest will be treated as gemma3:latest base")
        print("   - Always results in gemma3-custom:latest custom model")
        print("   - No more duplicate models like gemma3-custom-custom:latest")
    else:
        print("❌ Some tests FAILED! Check the extract_base_model function.")
    
    return all_passed

if __name__ == "__main__":
    success = test_base_model_extraction()
    sys.exit(0 if success else 1) 