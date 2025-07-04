# SPDX-License-Identifier: MIT OR Apache-2.0
"""
Memory Monitor Service for LoRA Training
Monitors RAM and GPU memory usage to prevent system crashes
"""

import psutil
import os
import gc
from typing import Dict, Any, Optional
import time


class MemoryMonitor:
    """Monitor system memory usage during training and deployment."""
    
    def __init__(self, warning_threshold: float = 0.85, critical_threshold: float = 0.95):
        """
        Initialize memory monitor.
        
        Args:
            warning_threshold: RAM usage percentage to trigger warning (0.85 = 85%)
            critical_threshold: RAM usage percentage to trigger critical alert (0.95 = 95%)
        """
        self.warning_threshold = warning_threshold
        self.critical_threshold = critical_threshold
        self.process = psutil.Process(os.getpid())
        
    def get_memory_info(self) -> Dict[str, Any]:
        """Get current memory usage information."""
        # System memory
        system_memory = psutil.virtual_memory()
        
        # Process memory
        process_memory = self.process.memory_info()
        
        # GPU memory (if available)
        gpu_memory = self._get_gpu_memory()
        
        return {
            "system": {
                "total_gb": system_memory.total / (1024**3),
                "available_gb": system_memory.available / (1024**3),
                "used_gb": system_memory.used / (1024**3),
                "percent": system_memory.percent,
            },
            "process": {
                "rss_gb": process_memory.rss / (1024**3),  # Resident Set Size
                "vms_gb": process_memory.vms / (1024**3),  # Virtual Memory Size
            },
            "gpu": gpu_memory
        }
    
    def _get_gpu_memory(self) -> Optional[Dict[str, Any]]:
        """Get GPU memory usage if available."""
        try:
            import torch
            if torch.cuda.is_available():
                device = torch.cuda.current_device()
                total_memory = torch.cuda.get_device_properties(device).total_memory
                allocated_memory = torch.cuda.memory_allocated(device)
                cached_memory = torch.cuda.memory_reserved(device)
                
                return {
                    "total_gb": total_memory / (1024**3),
                    "allocated_gb": allocated_memory / (1024**3),
                    "cached_gb": cached_memory / (1024**3),
                    "percent": (allocated_memory / total_memory) * 100,
                }
        except ImportError:
            pass
        
        return None
    
    def check_memory_status(self) -> Dict[str, Any]:
        """Check current memory status and return alerts if needed."""
        memory_info = self.get_memory_info()
        
        status = {
            "memory_info": memory_info,
            "alerts": [],
            "recommendations": [],
            "should_cleanup": False,
            "critical": False
        }
        
        # Check system memory
        system_percent = memory_info["system"]["percent"] / 100
        
        if system_percent >= self.critical_threshold:
            status["alerts"].append(f"🚨 CRITICAL: System RAM usage at {system_percent:.1%}")
            status["recommendations"].append("Immediate memory cleanup required")
            status["should_cleanup"] = True
            status["critical"] = True
            
        elif system_percent >= self.warning_threshold:
            status["alerts"].append(f"⚠️ WARNING: System RAM usage at {system_percent:.1%}")
            status["recommendations"].append("Consider memory cleanup")
            status["should_cleanup"] = True
        
        # Check process memory
        process_rss_gb = memory_info["process"]["rss_gb"]
        if process_rss_gb > 8.0:  # More than 8GB for this process
            status["alerts"].append(f"⚠️ Process using {process_rss_gb:.1f}GB RAM")
            status["recommendations"].append("Process memory usage is high")
        
        # Check GPU memory
        if memory_info["gpu"]:
            gpu_percent = memory_info["gpu"]["percent"] / 100
            if gpu_percent >= 0.9:  # 90% GPU memory
                status["alerts"].append(f"⚠️ GPU memory usage at {gpu_percent:.1%}")
                status["recommendations"].append("GPU memory cleanup needed")
                status["should_cleanup"] = True
        
        return status
    
    def cleanup_memory(self, aggressive: bool = False) -> None:
        """Perform memory cleanup."""
        print("🧹 Performing memory cleanup...")
        
        # Python garbage collection
        collected = gc.collect()
        print(f"   • Collected {collected} objects")
        
        # GPU memory cleanup
        try:
            import torch
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                print("   • GPU cache cleared")
        except ImportError:
            pass
        
        if aggressive:
            # Force more aggressive cleanup
            for _ in range(3):
                gc.collect()
            print("   • Aggressive cleanup completed")
    
    def monitor_training_phase(self, phase_name: str) -> None:
        """Monitor memory during a specific training phase."""
        print(f"📊 Memory status during {phase_name}:")
        
        status = self.check_memory_status()
        memory_info = status["memory_info"]
        
        # Print memory usage
        system = memory_info["system"]
        process = memory_info["process"]
        
        print(f"   • System RAM: {system['used_gb']:.1f}GB / {system['total_gb']:.1f}GB ({system['percent']:.1f}%)")
        print(f"   • Process RAM: {process['rss_gb']:.1f}GB")
        
        if memory_info["gpu"]:
            gpu = memory_info["gpu"]
            print(f"   • GPU Memory: {gpu['allocated_gb']:.1f}GB / {gpu['total_gb']:.1f}GB ({gpu['percent']:.1f}%)")
        
        # Handle alerts
        for alert in status["alerts"]:
            print(f"   {alert}")
        
        # Perform cleanup if needed
        if status["should_cleanup"]:
            self.cleanup_memory(aggressive=status["critical"])
            
            # Check again after cleanup
            new_status = self.check_memory_status()
            new_memory = new_status["memory_info"]["system"]
            print(f"   • After cleanup: {new_memory['used_gb']:.1f}GB ({new_memory['percent']:.1f}%)")
    
    def get_memory_recommendations(self) -> list:
        """Get recommendations for memory optimization."""
        memory_info = self.get_memory_info()
        recommendations = []
        
        total_ram = memory_info["system"]["total_gb"]
        
        if total_ram < 16:
            recommendations.extend([
                "Consider upgrading to 16GB+ RAM for better performance",
                "Use smaller batch sizes during training",
                "Enable gradient checkpointing to save memory"
            ])
        
        if memory_info["gpu"] and memory_info["gpu"]["total_gb"] < 8:
            recommendations.extend([
                "Consider using CPU training for large models",
                "Use smaller LoRA ranks (r=8 instead of r=16)",
                "Enable 8-bit training if supported"
            ])
        
        return recommendations


def monitor_memory_usage(func):
    """Decorator to monitor memory usage of a function."""
    def wrapper(*args, **kwargs):
        monitor = MemoryMonitor()
        
        # Monitor before
        print(f"📊 Memory before {func.__name__}:")
        monitor.monitor_training_phase(f"start of {func.__name__}")
        
        try:
            result = func(*args, **kwargs)
            
            # Monitor after
            print(f"📊 Memory after {func.__name__}:")
            monitor.monitor_training_phase(f"end of {func.__name__}")
            
            return result
            
        except Exception as e:
            # Monitor on error
            print(f"📊 Memory during error in {func.__name__}:")
            monitor.monitor_training_phase(f"error in {func.__name__}")
            monitor.cleanup_memory(aggressive=True)
            raise e
    
    return wrapper 