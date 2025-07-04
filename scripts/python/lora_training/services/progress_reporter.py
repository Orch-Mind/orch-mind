# SPDX-License-Identifier: MIT OR Apache-2.0
"""
Progress reporter service implementation
"""

import sys
from typing import Optional
from interfaces.i_progress_reporter import IProgressReporter
from models.progress_info import ProgressInfo


class ProgressReporter(IProgressReporter):
    """Concrete implementation of progress reporting."""
    
    def __init__(self, verbose: bool = True):
        self.verbose = verbose
    
    def report_progress(self, current_step: int, total_steps: int, message: str, 
                       phase: Optional[str] = None) -> None:
        """Report training progress."""
        progress_info = ProgressInfo.create(current_step, total_steps, message, phase)
        
        # Print progress in format expected by frontend
        print(progress_info.to_progress_string())
        sys.stdout.flush()
        
        # Optional verbose output
        if self.verbose:
            print(f"   • Step {current_step}/{total_steps} ({progress_info.percentage:.1f}%): {progress_info.format_message()}")
    
    def report_completion(self, message: str = "Training completed successfully") -> None:
        """Report training completion."""
        print(f"PROGRESS:100.0:{message}")
        sys.stdout.flush()
        
        if self.verbose:
            print(f"✅ {message}")
    
    def report_error(self, error_message: str) -> None:
        """Report training error."""
        print(f"ERROR:{error_message}")
        sys.stdout.flush()
        
        if self.verbose:
            print(f"❌ {error_message}")
    
    def set_verbose(self, verbose: bool) -> None:
        """Set verbose mode."""
        self.verbose = verbose 