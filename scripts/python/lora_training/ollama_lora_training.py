#!/usr/bin/env python3
# SPDX-License-Identifier: MIT OR Apache-2.0
"""
Main entry point for LoRA training with Ollama integration
"""

import argparse
import sys
import os
from pathlib import Path
from typing import Dict, Any

# Add the current directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.progress_reporter import ProgressReporter
from services.ollama_service import OllamaService
from services.model_mapper import ModelMapper
from services.training_data_processor import TrainingDataProcessor
from services.lora_trainer import LoRATrainer
from services.adapter_manager import AdapterManager
from services.deployment_service import SimpleDeploymentService
from orchestrator.training_orchestrator import TrainingOrchestrator
from models.training_config import TrainingConfig
from typing import Dict, Any


def get_project_root() -> str:
    """Get the project root directory."""
    current_dir = Path(__file__).parent
    # Go up 4 levels: lora_training -> python -> scripts -> orch-os
    project_root = current_dir.parent.parent.parent
    return str(project_root)


def report_progress(step, total_steps, message=""):
    """Report training progress in a format that can be parsed by the frontend."""
    if total_steps > 0:
        progress = min(100, (step / total_steps) * 100)
        print(f"PROGRESS:{progress:.1f}:{message}")
        sys.stdout.flush()


def train_lora_adapter(hf_model_name, training_data, output_dir, max_steps):
    """Compatibility function for LoRA training - delegates to LoRATrainer directly."""
    print(f"\n🔧 Starting LoRA training (compatibility mode)...")
    print(f"   • HuggingFace Model: {hf_model_name}")
    print(f"   • Training Examples: {len(training_data)}")
    print(f"   • Max Steps: {max_steps}")
    
    try:
        # Create services
        services = create_services()
        
        # Get the LoRA trainer directly
        lora_trainer = services['lora_trainer']
        
        # Create training configuration
        config = TrainingConfig(
            base_model="compatibility_mode",
            output_name="compatibility_adapter",
            data_file="",  # Will be set from training_data
            hf_model_name=hf_model_name,
            output_dir=output_dir,
            max_steps=max_steps,
            batch_size=1,
            learning_rate=2e-4,
            lora_rank=16,
            lora_alpha=32,
            lora_dropout=0.05,
        )
        
        # Execute training directly via LoRATrainer
        result = lora_trainer.train(config, training_data)
        
        if result:
            print(f"✅ LoRA training completed: {result}")
            return result
        else:
            print("❌ LoRA training failed")
            return None
            
    except Exception as e:
        print(f"❌ LoRA training error: {e}")
        import traceback
        traceback.print_exc()
        return None


def manage_lora_adapters(hf_model_name, adapter_path, output_name, base_model_name):
    """Compatibility function for LoRA adapter management."""
    print(f"\n🔧 Managing LoRA adapter (compatibility mode)...")
    print(f"   • HF Model: {hf_model_name}")
    print(f"   • Adapter Path: {adapter_path}")
    print(f"   • Output Name: {output_name}")
    print(f"   • Base Model: {base_model_name}")
    
    try:
        # Create services
        services = create_services()
        
        # Register adapter using adapter manager
        adapter_manager = services['adapter_manager']
        
        adapter_info = adapter_manager.register_adapter(
            adapter_id=output_name,
            base_model=base_model_name,
            hf_model=hf_model_name,
            adapter_path=adapter_path
        )
        
        if adapter_info:
            print(f"✅ Adapter registered: {adapter_info.adapter_id}")
            return adapter_info
        else:
            print("❌ Failed to register adapter")
            return None
            
    except Exception as e:
        print(f"❌ Adapter management error: {e}")
        import traceback
        traceback.print_exc()
        return None


def create_services() -> Dict[str, Any]:
    """Create all required services."""
    # Progress reporter
    progress_reporter = ProgressReporter()
    
    # Ollama service
    ollama_service = OllamaService()
    
    # Model mapper
    model_mapper = ModelMapper()
    
    # Training data processor
    data_processor = TrainingDataProcessor()
    
    # LoRA trainer
    lora_trainer = LoRATrainer(progress_reporter)
    
    # Adapter manager
    adapter_manager = AdapterManager(ollama_service)
    
    # Deployment service
    deployment_service = SimpleDeploymentService(ollama_service)
    
    return {
        'progress_reporter': progress_reporter,
        'ollama_service': ollama_service,
        'model_mapper': model_mapper,
        'data_processor': data_processor,
        'lora_trainer': lora_trainer,
        'adapter_manager': adapter_manager,
        'unsloth_deployment_service': deployment_service  # Keep the old name for compatibility
    }


def create_orchestrator(services: Dict[str, Any]) -> TrainingOrchestrator:
    """Create and configure the training orchestrator."""
    return TrainingOrchestrator(
        progress_reporter=services['progress_reporter'],
        ollama_service=services['ollama_service'],
        model_mapper=services['model_mapper'],
        data_processor=services['data_processor'],
        lora_trainer=services['lora_trainer'],
        adapter_manager=services['adapter_manager'],
        deployment_service=services['unsloth_deployment_service']
    )


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Train LoRA adapter for Ollama models")
    parser.add_argument("--data", required=True, help="Path to training data file")
    parser.add_argument("--base-model", required=True, help="Base model name")
    parser.add_argument("--output", required=True, help="Output adapter name")
    parser.add_argument("--max-steps", type=int, default=100, help="Maximum training steps")
    parser.add_argument("--batch-size", type=int, default=1, help="Batch size")
    parser.add_argument("--learning-rate", type=float, default=2e-4, help="Learning rate")
    parser.add_argument("--lora-rank", type=int, default=16, help="LoRA rank")
    parser.add_argument("--lora-alpha", type=int, default=32, help="LoRA alpha")
    parser.add_argument("--lora-dropout", type=float, default=0.1, help="LoRA dropout")
    parser.add_argument("--warmup-steps", type=int, default=10, help="Warmup steps")
    parser.add_argument("--logging-steps", type=int, default=10, help="Logging steps")
    parser.add_argument("--save-steps", type=int, default=50, help="Save steps")
    parser.add_argument("--num-epochs", type=int, default=3, help="Number of epochs")
    parser.add_argument("--gradient-accumulation-steps", type=int, default=1, help="Gradient accumulation steps")
    parser.add_argument("--fp16", action="store_true", default=False, help="Use fp16")
    parser.add_argument("--optim", default="adamw_torch", help="Optimizer")
    parser.add_argument("--weight-decay", type=float, default=0.01, help="Weight decay")
    parser.add_argument("--lr-scheduler-type", default="cosine", help="Learning rate scheduler type")
    
    args = parser.parse_args()
    
    print("🚀 Real LoRA Training for Orch-OS")
    print("📊 Configuration:")
    print(f"   • Ollama Model: {args.base_model}")
    print(f"   • Data: {args.data}")
    print(f"   • Output: {args.output}")
    print(f"   • Max Steps: {args.max_steps}")
    print(f"   • Batch Size: {args.batch_size}")
    print(f"   • Learning Rate: {args.learning_rate}")
    print(f"   • LoRA Rank: {args.lora_rank}")
    print(f"   • LoRA Alpha: {args.lora_alpha}")
    
    # Create training configuration
    config = TrainingConfig(
        base_model=args.base_model,
        output_name=args.output,
        data_file=args.data,
        hf_model_name="",  # Will be set by model mapper
        output_dir=os.path.join(get_project_root(), "lora_adapters"),
        max_steps=args.max_steps,
        batch_size=args.batch_size,
        learning_rate=args.learning_rate,
        lora_rank=args.lora_rank,
        lora_alpha=args.lora_alpha,
        lora_dropout=args.lora_dropout,
        warmup_steps=args.warmup_steps,
        logging_steps=args.logging_steps,
        save_steps=args.save_steps,
        num_epochs=args.num_epochs,
        gradient_accumulation_steps=args.gradient_accumulation_steps,
        fp16=args.fp16,
        optim=args.optim,
        weight_decay=args.weight_decay,
        lr_scheduler_type=args.lr_scheduler_type,
        target_modules=None  # Will use default
    )
    
    # Create services
    services = create_services()
    
    # Create orchestrator
    orchestrator = create_orchestrator(services)
    
    # Execute training
    result = orchestrator.execute_training_pipeline(config)
    
    if result:
        print("✅ Training completed successfully!")
        print(f"📁 Adapter saved: {result.adapter_path}")
        print(f"🎯 Model deployed: {config.output_name}-final")
    else:
        print("❌ Training failed!")
        sys.exit(1)


if __name__ == "__main__":
    main() 