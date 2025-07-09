#!/usr/bin/env python3
# SPDX-License-Identifier: MIT OR Apache-2.0
"""
Shared utilities for LoRA training scripts in Orch-OS
Centralizes common functions to follow DRY principle
"""

import os
import re
from typing import Optional


def sanitize_model_name(name: str) -> str:
    """
    Sanitize model name for Ollama compatibility.
    Ollama model names must be lowercase and contain only alphanumeric characters, hyphens, and underscores.
    
    Args:
        name: Input model name to sanitize
        
    Returns:
        Sanitized model name compatible with Ollama
    """
    if not name or not isinstance(name, str):
        return "unnamed"
    
    # Convert to lowercase
    sanitized = name.lower()
    
    # Try to use Unicode normalization for better accent handling
    try:
        import unicodedata
        # Normalize and remove accents using Unicode normalization
        sanitized = unicodedata.normalize('NFD', sanitized)
        sanitized = ''.join(c for c in sanitized if unicodedata.category(c) != 'Mn')
    except ImportError:
        # Fallback: Handle common accented characters manually
        accent_map = {
            'á': 'a', 'à': 'a', 'ã': 'a', 'â': 'a', 'ä': 'a',
            'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
            'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
            'ó': 'o', 'ò': 'o', 'õ': 'o', 'ô': 'o', 'ö': 'o',
            'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
            'ç': 'c', 'ñ': 'n'
        }
        
        for accented, plain in accent_map.items():
            sanitized = sanitized.replace(accented, plain)
    
    # Replace spaces and special characters with hyphens
    # Keep underscores and hyphens as they are
    sanitized = re.sub(r'[^a-z0-9_-]', '-', sanitized)
    
    # Remove multiple consecutive hyphens only (not underscores)
    sanitized = re.sub(r'-{2,}', '-', sanitized)
    
    # Remove leading/trailing hyphens/underscores
    sanitized = sanitized.strip('-_')
    
    # Ensure it's not empty
    if not sanitized:
        sanitized = "unnamed"
    
    # Ensure it doesn't start with a number (Ollama requirement)
    if sanitized[0].isdigit():
        sanitized = f"model-{sanitized}"
    
    return sanitized


def get_project_root() -> str:
    """
    Get the project root directory - unified logic for all scripts.
    For production builds, uses writable userData directory.
    
    Returns:
        Path to the project root directory (writable location)
    """
    try:
        # Check if we're running from a packaged application (read-only Resources directory)
        current_file = os.path.abspath(__file__)
        
        # If we're in /Applications/.../Contents/Resources/, use writable userData directory
        if '/Applications/' in current_file and '/Contents/Resources/' in current_file:
            print("🏗️  Detected packaged application - using writable userData directory")
            
            # Use macOS userData directory for writable access
            user_data_dir = os.path.expanduser("~/Library/Application Support/Orch-OS")
            os.makedirs(user_data_dir, exist_ok=True)
            print(f"✅ Using writable project root: {user_data_dir}")
            return user_data_dir
        
        # For development mode: project root is 4 levels up from this script
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(current_file))))
        
        # Verify this is writable (development mode check)
        test_file = os.path.join(project_root, '.writable_test')
        try:
            with open(test_file, 'w') as f:
                f.write('test')
            os.remove(test_file)
            print(f"✅ Using development project root: {project_root}")
            return project_root
        except (PermissionError, OSError):
            print("⚠️  Development directory not writable, falling back to userData")
            # Fall back to userData directory
            user_data_dir = os.path.expanduser("~/Library/Application Support/Orch-OS")
            os.makedirs(user_data_dir, exist_ok=True)
            return user_data_dir
            
    except Exception as e:
        print(f"⚠️  Error detecting project root ({e}), using userData fallback")
        
    # Fallback: try to find based on current working directory
    cwd = os.getcwd()
    # Look for characteristic files/directories that indicate project root
    indicators = ['package.json', 'electron', 'src', '.git']
    
    current_dir = cwd
    for _ in range(5):  # Don't go too far up
        if any(os.path.exists(os.path.join(current_dir, indicator)) for indicator in indicators):
            # Test if it's writable
            try:
                test_file = os.path.join(current_dir, '.writable_test')
                with open(test_file, 'w') as f:
                    f.write('test')
                os.remove(test_file)
                print(f"✅ Found writable project root: {current_dir}")
                return current_dir
            except (PermissionError, OSError):
                print(f"⚠️  Found project root but not writable: {current_dir}")
                break
        parent = os.path.dirname(current_dir)
        if parent == current_dir:  # Reached filesystem root
            break
        current_dir = parent
    
    # Final fallback: use userData directory
    user_data_dir = os.path.expanduser("~/Library/Application Support/Orch-OS")
    os.makedirs(user_data_dir, exist_ok=True)
    print(f"✅ Using final fallback userData directory: {user_data_dir}")
    return user_data_dir


def get_adapter_registry_dir() -> str:
    """
    Get the unified adapter registry directory (consistent across all scripts).
    
    Returns:
        Path to the adapter registry directory
    """
    # Primary path: project root (consistent with ollama_lora_training.py)
    try:
        project_root = get_project_root()
        primary_path = os.path.join(project_root, "lora_adapters", "registry")
        if os.path.exists(primary_path):
            return primary_path
    except Exception:
        pass
    
    # Fallback paths for compatibility with older installations
    alt_paths = [
        "./lora_training_output/adapter_registry",
        "../lora_training_output/adapter_registry", 
        "./adapter_registry",
        os.path.expanduser("~/Library/Application Support/orch-os/lora-training/lora_adapter/adapter_registry")
    ]
    
    for path in alt_paths:
        if os.path.exists(path):
            return os.path.abspath(path)
    
    # Default: create primary path (consistent with ollama_lora_training.py)
    try:
        project_root = get_project_root()
        primary_path = os.path.join(project_root, "lora_adapters", "registry")
        os.makedirs(primary_path, exist_ok=True)
        print(f"✅ Created adapter registry directory: {primary_path}")
        return primary_path
    except Exception as e:
        # Final fallback
        fallback_path = os.path.expanduser("~/Library/Application Support/orch-os/lora-training/lora_adapter/adapter_registry")
        os.makedirs(fallback_path, exist_ok=True)
        print(f"⚠️ Using fallback adapter registry: {fallback_path}")
        return fallback_path


def create_sanitized_model_name(base_model: str, adapter_id: str, separator: str = "-with-") -> str:
    """
    Create a sanitized model name for Ollama from base model and adapter ID.
    
    Args:
        base_model: Base model name (e.g., "gemma3:latest")
        adapter_id: Adapter identifier
        separator: Separator between base model and adapter (default: "-with-")
        
    Returns:
        Sanitized model name suitable for Ollama
    """
    base_model_clean = sanitize_model_name(base_model.replace(':', '_'))
    adapter_id_clean = sanitize_model_name(adapter_id)
    return f"{base_model_clean}{separator}{adapter_id_clean}"


def validate_model_name(name: str) -> bool:
    """
    Validate if a model name follows Ollama naming conventions.
    
    Args:
        name: Model name to validate
        
    Returns:
        True if the name is valid, False otherwise
    """
    if not name or not isinstance(name, str):
        return False
    
    # Check Ollama naming requirements
    is_lowercase = name.islower()
    has_valid_chars = all(c.isalnum() or c in '-_' for c in name)
    no_leading_trailing_separators = not name.startswith(('-', '_')) and not name.endswith(('-', '_'))
    no_consecutive_separators = '--' not in name and '__' not in name
    
    return is_lowercase and has_valid_chars and no_leading_trailing_separators and no_consecutive_separators 