# SPDX-License-Identifier: MIT OR Apache-2.0
# Dynamic Step Calculator for LoRA Training

import math
from typing import Dict, Any

def calculate_optimal_steps(
    dataset_size: int,
    lora_rank: int = 16,
    learning_rate: float = 3e-4,
    is_incremental: bool = False,
    task_complexity: str = "medium"
) -> Dict[str, Any]:
    """
    Calculate optimal training steps based on dataset and task characteristics.
    
    Based on LoRA best practices:
    - Minimum: 100-200 steps for subtle changes
    - Recommended: 500-1500 steps for most cases
    - Small dataset: 300-800 steps
    - Large dataset: 1000-3000+ steps
    
    Args:
        dataset_size: Number of training examples
        lora_rank: LoRA rank (affects training speed)
        learning_rate: Learning rate (affects convergence)
        is_incremental: Whether this is incremental training
        task_complexity: "simple", "medium", "complex"
    
    Returns:
        Dict with calculated steps and rationale
    """
    
    # Base step calculations
    base_steps = calculate_base_steps(dataset_size)
    
    # Apply modifiers
    steps = base_steps
    modifiers = []
    
    # 1. LoRA Rank adjustment
    rank_modifier = calculate_rank_modifier(lora_rank)
    steps = int(steps * rank_modifier)
    modifiers.append(f"LoRA rank {lora_rank}: {rank_modifier:.2f}x")
    
    # 2. Learning rate adjustment
    lr_modifier = calculate_lr_modifier(learning_rate)
    steps = int(steps * lr_modifier)
    modifiers.append(f"Learning rate {learning_rate}: {lr_modifier:.2f}x")
    
    # 3. Task complexity adjustment
    complexity_modifier = calculate_complexity_modifier(task_complexity)
    steps = int(steps * complexity_modifier)
    modifiers.append(f"Task complexity {task_complexity}: {complexity_modifier:.2f}x")
    
    # 4. Incremental training adjustment
    if is_incremental:
        incremental_modifier = 0.7  # Incremental needs fewer steps
        steps = int(steps * incremental_modifier)
        modifiers.append(f"Incremental training: {incremental_modifier:.2f}x")
    
    # Apply safety bounds
    final_steps = apply_safety_bounds(steps, dataset_size, is_incremental)
    
    # Calculate epochs estimate
    estimated_epochs = calculate_estimated_epochs(final_steps, dataset_size)
    
    return {
        "steps": final_steps,
        "base_steps": base_steps,
        "dataset_size": dataset_size,
        "estimated_epochs": estimated_epochs,
        "modifiers": modifiers,
        "rationale": generate_rationale(dataset_size, final_steps, task_complexity, is_incremental),
        "efficiency_category": categorize_efficiency(final_steps, dataset_size)
    }

def calculate_base_steps(dataset_size: int) -> int:
    """Calculate base steps based on dataset size following LoRA best practices."""
    
    if dataset_size <= 5:
        # Very small dataset: 400-600 steps (Entry Point AI recommendation)
        return 550
    elif dataset_size <= 10:
        # Small dataset: 300-800 steps
        return 650
    elif dataset_size <= 15:
        # Small-medium dataset: 500-800 steps
        return 700
    elif dataset_size <= 25:
        # Medium-small dataset: 600-1000 steps
        return 800
    elif dataset_size <= 50:
        # Medium dataset: 800-1200 steps
        return 1000
    elif dataset_size <= 100:
        # Medium-large dataset: 1000-1500 steps
        return 1300
    elif dataset_size <= 200:
        # Large dataset: 1200-2000 steps
        return 1600
    else:
        # Very large dataset: 1500-3000+ steps
        return min(2000 + (dataset_size - 200) * 5, 3000)

def calculate_rank_modifier(lora_rank: int) -> float:
    """
    Calculate modifier based on LoRA rank.
    Lower rank trains faster, higher rank needs more precision.
    """
    if lora_rank <= 8:
        return 0.85  # Low rank trains faster
    elif lora_rank <= 16:
        return 1.0   # Standard
    elif lora_rank <= 32:
        return 1.15  # Higher rank needs more precision
    else:
        return 1.3   # Very high rank needs significantly more steps

def calculate_lr_modifier(learning_rate: float) -> float:
    """
    Calculate modifier based on learning rate.
    High LR = fewer steps, Low LR = more steps.
    """
    if learning_rate >= 5e-4:
        return 0.8  # High LR converges faster
    elif learning_rate >= 3e-4:
        return 1.0  # Standard
    elif learning_rate >= 1e-4:
        return 1.2  # Lower LR needs more steps
    else:
        return 1.4  # Very low LR needs many more steps

def calculate_complexity_modifier(task_complexity: str) -> float:
    """Calculate modifier based on task complexity."""
    complexity_map = {
        "simple": 0.7,    # Simple tasks: style changes, basic patterns
        "medium": 1.0,    # Medium tasks: new knowledge, conversation patterns
        "complex": 1.4    # Complex tasks: reasoning, domain expertise
    }
    return complexity_map.get(task_complexity, 1.0)

def apply_safety_bounds(steps: int, dataset_size: int, is_incremental: bool) -> int:
    """Apply minimum and maximum safety bounds based on Entry Point AI recommendations."""
    
    # Minimum based on Entry Point AI best practices
    if is_incremental:
        min_steps = 100  # Incremental can be lower
    else:
        # For initial training, ensure minimum aligns with recommendations
        if dataset_size <= 10:
            min_steps = 400  # Small dataset minimum
        elif dataset_size <= 50:
            min_steps = 500  # Medium dataset minimum  
        else:
            min_steps = 800  # Large dataset minimum
    
    # Maximum to prevent overfitting - more generous for small datasets
    if dataset_size <= 5:
        max_steps = 1000  # Very small datasets can have more steps per example
    elif dataset_size <= 20:
        max_steps = dataset_size * 50  # Up to 50 steps per example for small datasets
    else:
        max_steps = dataset_size * 25  # Up to 25 steps per example for larger datasets
    
    # Absolute maximum
    absolute_max = 5000
    max_steps = min(max_steps, absolute_max)
    
    return max(min_steps, min(steps, max_steps))

def calculate_estimated_epochs(steps: int, dataset_size: int) -> float:
    """Calculate estimated epochs based on steps and dataset size."""
    if dataset_size == 0:
        return 0
    
    # Estimate based on typical batch processing
    # Assuming batch_size=1 and gradient_accumulation_steps=4
    effective_batch_size = 4
    steps_per_epoch = max(1, dataset_size // effective_batch_size)
    
    return round(steps / steps_per_epoch, 2)

def categorize_efficiency(steps: int, dataset_size: int) -> str:
    """Categorize the efficiency level of the training configuration."""
    
    if steps <= 300:
        return "Quick Training (subtle changes)"
    elif steps <= 800:
        return "Standard Training (balanced)"
    elif steps <= 1500:
        return "Thorough Training (comprehensive)"
    elif steps <= 3000:
        return "Intensive Training (complex tasks)"
    else:
        return "Maximum Training (very complex)"

def generate_rationale(dataset_size: int, steps: int, complexity: str, is_incremental: bool) -> str:
    """Generate human-readable rationale for the calculated steps."""
    
    mode = "incremental" if is_incremental else "initial"
    
    rationale = f"""
Training Configuration ({mode}):
• Dataset: {dataset_size} examples
• Steps: {steps}
• Task: {complexity} complexity

Rationale:
"""
    
    if dataset_size <= 10:
        rationale += "• Small dataset requires more steps per example for effective learning\n"
    elif dataset_size >= 100:
        rationale += "• Large dataset allows for efficient learning with fewer steps per example\n"
    else:
        rationale += "• Medium dataset size provides balanced training efficiency\n"
    
    if is_incremental:
        rationale += "• Incremental training uses fewer steps to preserve existing knowledge\n"
    
    if complexity == "simple":
        rationale += "• Simple task complexity allows for quicker convergence\n"
    elif complexity == "complex":
        rationale += "• Complex task requires more training steps for proper learning\n"
    
    # Efficiency assessment
    epochs_estimate = calculate_estimated_epochs(steps, dataset_size)
    rationale += f"• Estimated ~{epochs_estimate} epochs of training\n"
    
    return rationale.strip()

def get_steps_for_frontend(
    dataset_size: int,
    is_incremental: bool = False,
    user_preference: str = "balanced"
) -> int:
    """
    Simplified function for frontend/electron integration.
    
    Args:
        dataset_size: Number of training examples
        is_incremental: Whether this is incremental training
        user_preference: "quick", "balanced", "thorough"
    
    Returns:
        Calculated optimal steps
    """
    
    # Map user preference to complexity
    complexity_map = {
        "quick": "simple",
        "balanced": "medium", 
        "thorough": "complex"
    }
    complexity = complexity_map.get(user_preference, "medium")
    
    result = calculate_optimal_steps(
        dataset_size=dataset_size,
        lora_rank=16,  # Standard rank
        learning_rate=3e-4,  # Standard LR
        is_incremental=is_incremental,
        task_complexity=complexity
    )
    
    return result["steps"]

# Quick reference for common scenarios
QUICK_REFERENCE = {
    "very_small_dataset": {"examples": "1-5", "recommended_steps": "400-600"},
    "small_dataset": {"examples": "6-20", "recommended_steps": "500-800"},
    "medium_dataset": {"examples": "21-50", "recommended_steps": "700-1200"},
    "large_dataset": {"examples": "51-100", "recommended_steps": "1000-1800"},
    "very_large_dataset": {"examples": "100+", "recommended_steps": "1500-3000+"}
}

def analyze_content_complexity(data_path: str) -> Dict[str, Any]:
    """
    Analyze the actual content of training messages to calculate optimal steps.
    
    This function reads the JSONL training data and analyzes:
    - Total tokens/words across all messages
    - Vocabulary diversity (unique words ratio)
    - Syntactic complexity (sentence structure)
    - Conversation patterns
    
    Returns content-based metrics for dynamic step calculation.
    """
    import json
    import re
    from collections import Counter
    
    try:
        with open(data_path, 'r', encoding='utf-8') as f:
            data = [json.loads(line) for line in f if line.strip()]
    except Exception as e:
        print(f"⚠️ Could not analyze content: {e}")
        return {
            "total_tokens": 100,
            "vocabulary_size": 50,
            "complexity_score": 0.5,
            "estimated_learning_difficulty": "medium"
        }
    
    # Combine all text content
    all_text = []
    total_messages = len(data)
    
    for item in data:
        input_text = str(item.get('input', '')).strip()
        output_text = str(item.get('output', '')).strip()
        all_text.append(input_text + ' ' + output_text)
    
    combined_text = ' '.join(all_text).lower()
    
    # 1. Token Analysis
    words = re.findall(r'\b\w+\b', combined_text)
    total_tokens = len(words)
    unique_words = len(set(words))
    vocabulary_diversity = unique_words / total_tokens if total_tokens > 0 else 0
    
    # 2. Sentence Complexity Analysis
    sentences = re.split(r'[.!?]+', combined_text)
    avg_sentence_length = sum(len(s.split()) for s in sentences) / len(sentences) if sentences else 0
    
    # 3. Complexity Indicators
    question_ratio = combined_text.count('?') / max(total_tokens, 1)
    
    # 4. Calculate Content Complexity Score (0-1)
    complexity_factors = [
        min(vocabulary_diversity * 2, 1.0),  # Vocabulary richness
        min(avg_sentence_length / 15, 1.0),  # Sentence complexity  
        min(question_ratio * 10, 1.0),       # Interactive content
    ]
    
    complexity_score = sum(complexity_factors) / len(complexity_factors)
    
    # 5. Estimate Learning Difficulty
    if complexity_score < 0.3:
        difficulty = "simple"
    elif complexity_score < 0.6:
        difficulty = "medium"
    else:
        difficulty = "complex"
    
    return {
        "total_tokens": total_tokens,
        "vocabulary_size": unique_words,
        "vocabulary_diversity": vocabulary_diversity,
        "avg_sentence_length": avg_sentence_length,
        "complexity_score": complexity_score,
        "estimated_learning_difficulty": difficulty,
        "total_messages": total_messages,
        "complexity_factors": {
            "vocabulary_richness": complexity_factors[0],
            "sentence_complexity": complexity_factors[1], 
            "interactive_content": complexity_factors[2],
        }
    }

def calculate_content_based_steps(data_path: str, target_training_minutes: int = 10) -> Dict[str, Any]:
    """
    Calculate optimal steps based on actual message content analysis.
    
    Designed for FAST but EFFECTIVE training (5-15 minutes).
    
    Args:
        data_path: Path to JSONL training data
        target_training_minutes: Target training duration (default: 10 minutes)
    
    Returns:
        Dict with calculated steps and content analysis
    """
    
    # 1. Analyze actual content
    content_analysis = analyze_content_complexity(data_path)
    
    total_tokens = content_analysis["total_tokens"]
    complexity_score = content_analysis["complexity_score"]
    difficulty = content_analysis["estimated_learning_difficulty"]
    
    # 2. Base steps calculation using content-aware formula
    # Rule: More complex content needs more steps per token
    if total_tokens <= 500:
        # Very short content: focus on quality over quantity
        base_steps = 150 + (total_tokens * 0.8)
    elif total_tokens <= 2000:
        # Medium content: balanced approach
        base_steps = 300 + (total_tokens * 0.4)
    elif total_tokens <= 5000:
        # Long content: efficiency focus
        base_steps = 500 + (total_tokens * 0.2)
    else:
        # Very long content: prevent overfitting
        base_steps = 800 + (total_tokens * 0.1)
    
    # 3. Apply complexity modifiers
    complexity_modifier = 0.7 + (complexity_score * 0.6)  # Range: 0.7-1.3
    steps = int(base_steps * complexity_modifier)
    
    # 4. Apply time-based optimization for fast training
    # Target: 5-15 minutes training time
    time_based_max = target_training_minutes * 50  # ~50 steps per minute on modern hardware
    
    if steps > time_based_max:
        steps = time_based_max
        time_optimized = True
    else:
        time_optimized = False
    
    # 5. Apply safety bounds for effectiveness
    min_steps = max(100, total_tokens // 20)  # At least 100 steps, or 1 step per 20 tokens
    max_steps = min(1000, total_tokens // 5)   # At most 1000 steps, or 1 step per 5 tokens
    
    final_steps = max(min_steps, min(steps, max_steps))
    
    # 6. Calculate training estimates
    estimated_minutes = final_steps / 50  # Rough estimate: 50 steps per minute
    tokens_per_step = total_tokens / final_steps if final_steps > 0 else 0
    
    return {
        "steps": final_steps,
        "content_analysis": content_analysis,
        "calculation_details": {
            "base_steps": int(base_steps),
            "complexity_modifier": complexity_modifier,
            "time_optimized": time_optimized,
            "tokens_per_step": round(tokens_per_step, 1)
        },
        "training_estimates": {
            "estimated_minutes": round(estimated_minutes, 1),
            "estimated_seconds": round(estimated_minutes * 60),
            "efficiency_level": "fast" if estimated_minutes <= 10 else "standard"
        },
        "optimization_summary": f"""
Content-Based Step Calculation:
• Total tokens: {total_tokens:,}
• Complexity: {difficulty} ({complexity_score:.2f})
• Calculated steps: {final_steps}
• Training time: ~{estimated_minutes:.1f} minutes
• Efficiency: {tokens_per_step:.1f} tokens per step
""".strip()
    } 