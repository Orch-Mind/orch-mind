# SPDX-License-Identifier: MIT OR Apache-2.0
"""
Progress reporter interface
"""

from abc import ABC, abstractmethod
from typing import Optional


class IProgressReporter(ABC):
    """Interface for progress reporting."""
    
    @abstractmethod
    def report_progress(self, current_step: int, total_steps: int, message: str, 
                       phase: Optional[str] = None) -> None:
        """Report training progress."""
        pass
    
    @abstractmethod
    def report_completion(self, message: str = "Training completed successfully") -> None:
        """Report training completion."""
        pass
    
    @abstractmethod
    def report_error(self, error_message: str) -> None:
        """Report training error."""
        pass 