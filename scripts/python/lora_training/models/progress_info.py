# SPDX-License-Identifier: MIT OR Apache-2.0
"""
Progress information data model
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class ProgressInfo:
    """Information about training progress."""
    
    current_step: int
    total_steps: int
    message: str
    percentage: float
    phase: Optional[str] = None
    
    @classmethod
    def create(cls, current_step: int, total_steps: int, message: str, 
               phase: Optional[str] = None) -> 'ProgressInfo':
        """Create a new progress info instance."""
        percentage = min(100.0, (current_step / total_steps) * 100.0) if total_steps > 0 else 0.0
        return cls(
            current_step=current_step,
            total_steps=total_steps,
            message=message,
            percentage=percentage,
            phase=phase
        )
    
    def is_complete(self) -> bool:
        """Check if training is complete."""
        return self.current_step >= self.total_steps
    
    def format_message(self) -> str:
        """Format progress message for display."""
        if self.phase:
            return f"[{self.phase}] {self.message}"
        return self.message
    
    def to_progress_string(self) -> str:
        """Convert to progress string format expected by frontend."""
        return f"PROGRESS:{self.percentage:.1f}:{self.format_message()}" 