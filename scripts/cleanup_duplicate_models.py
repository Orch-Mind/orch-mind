#!/usr/bin/env python3
# SPDX-License-Identifier: MIT OR Apache-2.0
# Script to cleanup duplicate Ollama models

import subprocess
import re
import json

def get_ollama_models():
    """Get list of all Ollama models."""
    try:
        result = subprocess.run(["ollama", "list"], capture_output=True, text=True, check=True)
        models = []
        lines = result.stdout.strip().split('\n')[1:]  # Skip header
        
        for line in lines:
            if line.strip():
                # Extract model name (first column)
                parts = line.split()
                if parts:
                    model_name = parts[0]
                    models.append(model_name)
        
        return models
    except Exception as e:
        print(f"❌ Error getting Ollama models: {e}")
        return []

def find_duplicate_models(models):
    """Find models that appear to be duplicates."""
    duplicates = []
    base_models = {}
    
    for model in models:
        # Look for patterns like "gemma3-custom-custom" (duplicate suffix)
        if "-custom-custom" in model:
            base_name = model.replace("-custom-custom:latest", "").replace("-custom-custom", "")
            clean_name = f"{base_name}-custom:latest"
            duplicates.append({
                "duplicate": model,
                "correct": clean_name,
                "base": base_name
            })
        
        # Track base models for reference
        if "-custom:" in model or model.endswith("-custom"):
            base_name = model.replace("-custom:latest", "").replace("-custom", "")
            base_models[base_name] = model
    
    return duplicates, base_models

def cleanup_duplicates(duplicates):
    """Remove duplicate models."""
    print(f"🔍 Found {len(duplicates)} duplicate models to clean up:")
    
    for dup in duplicates:
        print(f"  - {dup['duplicate']} → should be {dup['correct']}")
    
    if not duplicates:
        print("✅ No duplicate models found!")
        return
    
    confirm = input(f"\n❓ Remove {len(duplicates)} duplicate models? (y/N): ")
    if confirm.lower() != 'y':
        print("❌ Cleanup cancelled.")
        return
    
    for dup in duplicates:
        try:
            print(f"🗑️ Removing duplicate: {dup['duplicate']}")
            subprocess.run(["ollama", "rm", dup['duplicate']], check=True, capture_output=True)
            print(f"✅ Removed: {dup['duplicate']}")
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to remove {dup['duplicate']}: {e}")
        except Exception as e:
            print(f"❌ Error removing {dup['duplicate']}: {e}")

def main():
    print("🚀 Ollama Model Cleanup Tool")
    print("=" * 40)
    
    # Get all models
    print("📋 Getting list of Ollama models...")
    models = get_ollama_models()
    
    if not models:
        print("❌ No models found or unable to connect to Ollama")
        return
    
    print(f"📊 Found {len(models)} total models:")
    for model in models:
        print(f"   - {model}")
    
    print("\n🔍 Analyzing for duplicates...")
    duplicates, base_models = find_duplicate_models(models)
    
    if duplicates:
        cleanup_duplicates(duplicates)
    else:
        print("✅ No duplicate models found!")
    
    print("\n📋 Current base models after cleanup:")
    updated_models = get_ollama_models()
    custom_models = [m for m in updated_models if "-custom" in m]
    
    if custom_models:
        for model in custom_models:
            print(f"   ✅ {model}")
    else:
        print("   (No custom models found)")
    
    print("\n🎉 Cleanup completed!")

if __name__ == "__main__":
    main() 