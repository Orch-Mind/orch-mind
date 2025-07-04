# SPDX-License-Identifier: MIT OR Apache-2.0
"""
Training data processor service implementation
"""

import json
import os
import sys
from typing import List, Dict, Any, Tuple
from interfaces.i_training_data_processor import ITrainingDataProcessor


class TrainingDataProcessor(ITrainingDataProcessor):
    """Concrete implementation of training data processing."""
    
    def load_data(self, data_path: str) -> List[Dict[str, Any]]:
        """Load training data from file."""
        if not os.path.exists(data_path):
            raise FileNotFoundError(f"Training data file not found: {data_path}")
        
        try:
            with open(data_path, 'r', encoding='utf-8') as f:
                raw_data = [json.loads(line) for line in f if line.strip()]
            
            print(f"📚 Loaded {len(raw_data)} training examples from {data_path}")
            return raw_data
            
        except Exception as e:
            raise ValueError(f"Failed to load training data: {e}")
    
    def validate_data(self, data: List[Dict[str, Any]]) -> bool:
        """Validate training data format."""
        if not data:
            print("❌ No training data provided")
            return False
        
        if len(data) < 2:
            print("⚠️ Warning: Very small dataset (< 2 examples)")
        
        # Check data format
        valid_examples = 0
        for i, item in enumerate(data):
            if self._is_valid_example(item):
                valid_examples += 1
            else:
                print(f"⚠️ Invalid example at index {i}: {item}")
        
        validation_rate = valid_examples / len(data)
        print(f"📊 Validation: {valid_examples}/{len(data)} examples valid ({validation_rate:.1%})")
        
        return validation_rate > 0.5  # At least 50% valid
    
    def format_data(self, data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Format data for training."""
        formatted_data = []
        
        for item in data:
            formatted_item = self._format_single_item(item)
            if formatted_item:
                formatted_data.append(formatted_item)
        
        print(f"📝 Formatted {len(formatted_data)} examples for training")
        return formatted_data
    
    def calculate_optimal_steps(self, data_path: str) -> Tuple[int, Dict[str, Any]]:
        """Calculate optimal training steps based on data."""
        try:
            # Import the step calculator
            current_dir = os.path.dirname(os.path.abspath(__file__))
            training_modules_dir = os.path.join(
                os.path.dirname(current_dir), "training_modules"
            )
            sys.path.append(training_modules_dir)
            
            from step_calculator import calculate_content_based_steps
            
            # Calculate steps based on actual content
            step_calculation = calculate_content_based_steps(data_path, target_training_minutes=5)
            calculated_steps = step_calculation["steps"]
            
            print(f"📊 Content Analysis Results:")
            print(f"   • Total tokens: {step_calculation['content_analysis']['total_tokens']:,}")
            print(f"   • Complexity: {step_calculation['content_analysis']['estimated_learning_difficulty']}")
            print(f"   • Calculated steps: {calculated_steps}")
            print(f"   • Estimated training time: ~{step_calculation['training_estimates']['estimated_minutes']:.1f} minutes")
            
            return calculated_steps, step_calculation
            
        except Exception as e:
            print(f"⚠️ Could not calculate optimal steps: {e}")
            # Fallback to simple heuristic
            data = self.load_data(data_path)
            fallback_steps = min(1000, max(100, len(data) * 10))
            print(f"📌 Using fallback steps: {fallback_steps}")
            
            return fallback_steps, {
                "method": "fallback",
                "data_size": len(data),
                "steps": fallback_steps
            }
    
    def _is_valid_example(self, item: Dict[str, Any]) -> bool:
        """Check if a single example is valid."""
        # Check for instruction-output format
        if "instruction" in item and "output" in item:
            return bool(item["instruction"].strip() and item["output"].strip())
        
        # Check for messages format
        if "messages" in item:
            messages = item["messages"]
            if isinstance(messages, list) and len(messages) >= 2:
                has_user = any(m.get("role") == "user" for m in messages)
                has_assistant = any(m.get("role") == "assistant" for m in messages)
                return has_user and has_assistant
        
        # Check for generic text
        text = str(item)
        return len(text.strip()) > 10
    
    def _format_single_item(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Format a single training item."""
        if "instruction" in item and "output" in item:
            # Already in correct format
            return {
                "instruction": item["instruction"],
                "input": item.get("input", ""),
                "output": item["output"]
            }
        
        elif "messages" in item:
            # Convert from messages format
            messages = item["messages"]
            if isinstance(messages, list) and len(messages) >= 2:
                user_msg = next((m for m in messages if m["role"] == "user"), None)
                assistant_msg = next((m for m in messages if m["role"] == "assistant"), None)
                
                if user_msg and assistant_msg:
                    return {
                        "instruction": user_msg["content"],
                        "input": "",
                        "output": assistant_msg["content"]
                    }
        
        else:
            # Try to extract from generic format
            text = str(item)
            if len(text.strip()) > 10:
                return {
                    "instruction": text[:100] + "..." if len(text) > 100 else text,
                    "input": "",
                    "output": text
                }
        
        return None 