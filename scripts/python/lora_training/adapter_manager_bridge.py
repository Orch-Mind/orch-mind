#!/usr/bin/env python3
# SPDX-License-Identifier: MIT OR Apache-2.0
"""
Adapter Manager Bridge - Orch-OS
Bridge between old CLI interface and new refactored AdapterManager
"""

import json
import sys
import argparse
from services.adapter_manager import AdapterManager
from services.ollama_service import OllamaService


def load_adapter_info_from_registry(adapter_id: str):
    """Load adapter info using the refactored system."""
    try:
        # Create services
        ollama_service = OllamaService()
        adapter_manager = AdapterManager(ollama_service)
        
        # Get adapter info
        adapter_info = adapter_manager.get_adapter_info(adapter_id)
        if adapter_info:
            return adapter_info.to_dict()
        else:
            return None
    except Exception as e:
        print(f"❌ Error loading adapter info: {e}", file=sys.stderr)
        return None


def enable_adapter_bridge(adapter_id: str):
    """Enable adapter using the refactored AdapterManager."""
    print(f"🚀 Enabling adapter with REFACTORED AdapterManager: {adapter_id}")
    
    try:
        # Create services
        ollama_service = OllamaService()
        adapter_manager = AdapterManager(ollama_service)
        
        # Enable adapter
        result = adapter_manager.enable_adapter(adapter_id)
        
        if result["success"]:
            # Return success in the format expected by LoRATrainingService
            response = {
                "success": True,
                "adapter_id": adapter_id,
                "active_model_name": result.get("active_model"),
                "active_model": result.get("active_model"),  # Backward compatibility
                "adapter_path": result.get("adapter_id"),
                "method": result.get("method", "adapter_directive")
            }
            
            print(f"✅ Adapter enabled successfully!")
            print(f"   • Active model: {result.get('active_model')}")
            print(f"   • Method: {result.get('method')}")
            print(json.dumps(response, indent=2))
            return response
        else:
            # Return error in expected format
            error_response = {
                "success": False,
                "error": result.get("error", "Unknown error")
            }
            
            print(f"❌ Failed to enable adapter: {result.get('error')}")
            print(json.dumps(error_response, indent=2))
            return error_response
            
    except Exception as e:
        error_response = {
            "success": False,
            "error": f"Bridge error: {str(e)}"
        }
        
        print(f"❌ Bridge error: {e}", file=sys.stderr)
        print(json.dumps(error_response, indent=2))
        return error_response


def disable_adapter_bridge(adapter_id: str):
    """Disable adapter using the refactored AdapterManager."""
    print(f"🔄 Disabling adapter with REFACTORED AdapterManager: {adapter_id}")
    
    try:
        # Create services
        ollama_service = OllamaService()
        adapter_manager = AdapterManager(ollama_service)
        
        # Disable adapter
        result = adapter_manager.disable_adapter(adapter_id)
        
        if result["success"]:
            response = {
                "success": True,
                "adapter_id": adapter_id,
                "message": "Adapter disabled successfully"
            }
            
            print(f"✅ Adapter disabled successfully!")
            print(json.dumps(response, indent=2))
            return response
        else:
            error_response = {
                "success": False,
                "error": result.get("error", "Unknown error")
            }
            
            print(f"❌ Failed to disable adapter: {result.get('error')}")
            print(json.dumps(error_response, indent=2))
            return error_response
            
    except Exception as e:
        error_response = {
            "success": False,
            "error": f"Bridge error: {str(e)}"
        }
        
        print(f"❌ Bridge error: {e}", file=sys.stderr)
        print(json.dumps(error_response, indent=2))
        return error_response


def list_adapters_bridge():
    """List adapters using the refactored AdapterManager."""
    print("📋 Listing adapters with REFACTORED AdapterManager")
    
    try:
        # Create services
        ollama_service = OllamaService()
        adapter_manager = AdapterManager(ollama_service)
        
        # List adapters
        adapters = adapter_manager.list_adapters()
        
        adapters_data = []
        for adapter in adapters:
            adapters_data.append(adapter.to_dict())
        
        response = {
            "success": True,
            "adapters": adapters_data,
            "count": len(adapters_data)
        }
        
        print(f"✅ Found {len(adapters_data)} adapters")
        print(json.dumps(response, indent=2))
        return response
        
    except Exception as e:
        error_response = {
            "success": False,
            "error": f"Bridge error: {str(e)}",
            "adapters": [],
            "count": 0
        }
        
        print(f"❌ Bridge error: {e}", file=sys.stderr)
        print(json.dumps(error_response, indent=2))
        return error_response


def main():
    """Main CLI interface - maintains compatibility with old real_adapter_manager.py."""
    parser = argparse.ArgumentParser(description="Adapter Manager Bridge - Uses Refactored AdapterManager")
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Enable command
    enable_parser = subparsers.add_parser('enable', help='Enable adapter')
    enable_parser.add_argument('adapter_id', help='Adapter ID to enable')
    
    # Disable command
    disable_parser = subparsers.add_parser('disable', help='Disable adapter')
    disable_parser.add_argument('adapter_id', help='Adapter ID to disable')
    
    # List command
    list_parser = subparsers.add_parser('list', help='List all adapters')
    
    # Test command
    test_parser = subparsers.add_parser('test', help='Test adapter info loading')
    test_parser.add_argument('adapter_id', help='Adapter ID to test')
    
    args = parser.parse_args()
    
    print(f"🌉 ADAPTER MANAGER BRIDGE - Using Refactored Architecture")
    print(f"📋 Command: {args.command}")
    
    if args.command == 'enable':
        result = enable_adapter_bridge(args.adapter_id)
        sys.exit(0 if result.get('success') else 1)
        
    elif args.command == 'disable':
        result = disable_adapter_bridge(args.adapter_id)
        sys.exit(0 if result.get('success') else 1)
        
    elif args.command == 'list':
        result = list_adapters_bridge()
        sys.exit(0 if result.get('success') else 1)
        
    elif args.command == 'test':
        adapter_info = load_adapter_info_from_registry(args.adapter_id)
        if adapter_info:
            print("✅ Adapter found in refactored registry")
            print(json.dumps(adapter_info, indent=2))
            sys.exit(0)
        else:
            print("❌ Adapter not found")
            sys.exit(1)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main() 