#!/usr/bin/env python3
# SPDX-License-Identifier: MIT OR Apache-2.0
"""
Migration script to move existing LoRA adapters to the unified registry location
"""

import os
import sys
import json
import shutil
from datetime import datetime

def get_project_root():
    """Get the project root directory - unified logic."""
    try:
        current_file = os.path.abspath(__file__)
        return os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(current_file))))
    except Exception:
        cwd = os.getcwd()
        indicators = ['package.json', 'electron', 'src', '.git']
        
        current_dir = cwd
        for _ in range(5):
            if any(os.path.exists(os.path.join(current_dir, indicator)) for indicator in indicators):
                return current_dir
            parent = os.path.dirname(current_dir)
            if parent == current_dir:
                break
            current_dir = parent
        
        return cwd

def find_existing_adapters():
    """Find existing adapters in old locations."""
    print("🔍 Searching for existing LoRA adapters...")
    
    # Old registry locations
    old_paths = [
        "./lora_training_output/adapter_registry",
        "../lora_training_output/adapter_registry", 
        "./adapter_registry",
        os.path.expanduser("~/Library/Application Support/orch-mind/lora-training/lora_adapter/adapter_registry")
    ]
    
    found_adapters = []
    
    for old_path in old_paths:
        if os.path.exists(old_path):
            print(f"   📂 Found old registry: {old_path}")
            
            # Look for adapter JSON files
            for file in os.listdir(old_path):
                if file.endswith('_adapter.json'):
                    adapter_path = os.path.join(old_path, file)
                    try:
                        with open(adapter_path, 'r') as f:
                            adapter_info = json.load(f)
                        
                        found_adapters.append({
                            'file_path': adapter_path,
                            'info': adapter_info,
                            'old_registry': old_path
                        })
                        
                        print(f"      ✅ Found adapter: {adapter_info.get('adapter_id', 'unknown')}")
                    except Exception as e:
                        print(f"      ❌ Error reading {file}: {e}")
    
    return found_adapters

def migrate_adapters():
    """Migrate existing adapters to the new unified location."""
    print("🚀 LoRA Adapter Migration Tool")
    print("=" * 50)
    
    # Get new unified location
    project_root = get_project_root()
    new_registry_dir = os.path.join(project_root, "lora_adapters", "registry")
    new_weights_dir = os.path.join(project_root, "lora_adapters", "weights")
    
    print(f"📁 New unified location:")
    print(f"   • Project root: {project_root}")
    print(f"   • Registry: {new_registry_dir}")
    print(f"   • Weights: {new_weights_dir}")
    
    # Create new directories
    os.makedirs(new_registry_dir, exist_ok=True)
    os.makedirs(new_weights_dir, exist_ok=True)
    
    # Find existing adapters
    existing_adapters = find_existing_adapters()
    
    if not existing_adapters:
        print("\n✅ No existing adapters found - nothing to migrate")
        return True
    
    print(f"\n📦 Found {len(existing_adapters)} adapters to migrate")
    
    migrated_count = 0
    
    for adapter in existing_adapters:
        try:
            adapter_info = adapter['info']
            adapter_id = adapter_info.get('adapter_id', 'unknown')
            
            print(f"\n🔄 Migrating adapter: {adapter_id}")
            
            # Update paths in adapter info
            old_adapter_path = adapter_info.get('adapter_path', '')
            if old_adapter_path and os.path.exists(old_adapter_path):
                # Copy adapter weights to new location
                new_adapter_path = os.path.join(new_weights_dir, f"{adapter_id}_adapter")
                
                if os.path.exists(new_adapter_path):
                    print(f"   ⚠️ Adapter weights already exist at: {new_adapter_path}")
                else:
                    print(f"   📂 Copying weights: {old_adapter_path} → {new_adapter_path}")
                    shutil.copytree(old_adapter_path, new_adapter_path)
                
                # Update adapter info with new path
                adapter_info['adapter_path'] = new_adapter_path
            
            # Update registry path
            adapter_info['registry_path'] = new_registry_dir
            
            # Add migration metadata
            adapter_info['migrated_at'] = datetime.now().isoformat()
            adapter_info['migrated_from'] = adapter['old_registry']
            adapter_info['migration_version'] = '1.0'
            
            # Save to new location
            new_adapter_file = os.path.join(new_registry_dir, f"{adapter_id}_adapter.json")
            with open(new_adapter_file, 'w') as f:
                json.dump(adapter_info, f, indent=2)
            
            print(f"   ✅ Migrated successfully: {new_adapter_file}")
            migrated_count += 1
            
        except Exception as e:
            print(f"   ❌ Failed to migrate adapter: {e}")
            import traceback
            traceback.print_exc()
    
    print(f"\n🎉 Migration completed!")
    print(f"✅ Successfully migrated {migrated_count}/{len(existing_adapters)} adapters")
    
    if migrated_count > 0:
        print(f"\n📝 Next steps:")
        print(f"1. Test that adapters work with the new system")
        print(f"2. If everything works, you can safely remove old registry directories:")
        for adapter in existing_adapters:
            old_registry = adapter['old_registry']
            if old_registry not in [new_registry_dir, new_weights_dir]:
                print(f"   • {old_registry}")
    
    return migrated_count == len(existing_adapters)

def list_adapters():
    """List all adapters in the new unified location."""
    print("📋 Listing adapters in unified registry...")
    
    project_root = get_project_root()
    registry_dir = os.path.join(project_root, "lora_adapters", "registry")
    
    if not os.path.exists(registry_dir):
        print(f"   ❌ Registry directory not found: {registry_dir}")
        return
    
    adapter_files = [f for f in os.listdir(registry_dir) if f.endswith('_adapter.json')]
    
    if not adapter_files:
        print(f"   📂 No adapters found in: {registry_dir}")
        return
    
    print(f"   📂 Registry: {registry_dir}")
    print(f"   📦 Found {len(adapter_files)} adapters:")
    
    for adapter_file in adapter_files:
        try:
            with open(os.path.join(registry_dir, adapter_file), 'r') as f:
                adapter_info = json.load(f)
            
            adapter_id = adapter_info.get('adapter_id', 'unknown')
            base_model = adapter_info.get('base_model', 'unknown')
            enabled = adapter_info.get('enabled', False)
            migrated = 'migrated_at' in adapter_info
            
            status = "🟢 ENABLED" if enabled else "🔴 DISABLED"
            migration_status = "📦 MIGRATED" if migrated else "🆕 NEW"
            
            print(f"      • {adapter_id} ({base_model}) - {status} - {migration_status}")
            
        except Exception as e:
            print(f"      ❌ Error reading {adapter_file}: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "list":
        list_adapters()
    else:
        success = migrate_adapters()
        sys.exit(0 if success else 1) 