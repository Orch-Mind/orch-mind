# SPDX-License-Identifier: MIT OR Apache-2.0
# Data Quality Module for LoRA Training

import json
import re
from typing import List, Dict, Any

def filter_quality_data(data: List[Dict[str, Any]], min_length: int = 10, max_length: int = 1000) -> List[Dict[str, Any]]:
    """Filter training data based on quality metrics."""
    filtered_data = []
    stats = {
        "total": len(data),
        "too_short": 0,
        "too_long": 0,
        "empty_content": 0,
        "poor_quality": 0,
        "kept": 0
    }
    
    for item in data:
        # Extract input and output text
        input_text = item.get("input", "").strip()
        output_text = item.get("output", "").strip()
        instruction = item.get("instruction", "").strip()
        
        # Check for empty content
        if not output_text or not (input_text or instruction):
            stats["empty_content"] += 1
            continue
        
        # Check length constraints
        total_length = len(input_text) + len(output_text)
        if total_length < min_length:
            stats["too_short"] += 1
            continue
        if total_length > max_length:
            stats["too_long"] += 1
            continue
        
        # Check for poor quality indicators
        if is_poor_quality(input_text, output_text):
            stats["poor_quality"] += 1
            continue
        
        # Passed all filters
        filtered_data.append(item)
        stats["kept"] += 1
    
    print(f"📊 Data Quality Filtering Results:")
    print(f"   Total examples: {stats['total']}")
    print(f"   Too short: {stats['too_short']}")
    print(f"   Too long: {stats['too_long']}")
    print(f"   Empty content: {stats['empty_content']}")
    print(f"   Poor quality: {stats['poor_quality']}")
    print(f"   ✅ Kept: {stats['kept']} ({stats['kept']/stats['total']*100:.1f}%)")
    
    return filtered_data

def is_poor_quality(input_text: str, output_text: str) -> bool:
    """Check if a conversation pair has poor quality indicators."""
    
    # Check for repetitive patterns
    if has_repetitive_pattern(output_text):
        return True
    
    # Check for too many special characters
    if has_too_many_special_chars(output_text):
        return True
    
    # Check for very short responses to complex questions
    if len(input_text) > 100 and len(output_text) < 20:
        return True
    
    # Check for generic/template responses
    if is_generic_response(output_text):
        return True
    
    return False

def has_repetitive_pattern(text: str) -> bool:
    """Check for repetitive patterns in text."""
    words = text.split()
    if len(words) < 4:
        return False
    
    # Check for repeated phrases
    for i in range(len(words) - 3):
        phrase = " ".join(words[i:i+3])
        if phrase in " ".join(words[i+3:]):
            return True
    
    return False

def has_too_many_special_chars(text: str) -> bool:
    """Check if text has too many special characters (indicates formatting issues)."""
    special_char_ratio = len(re.findall(r'[^\w\s\.\,\?\!\:]', text)) / len(text)
    return special_char_ratio > 0.2

def is_generic_response(text: str) -> bool:
    """Check for generic template responses."""
    generic_patterns = [
        "I'm sorry, I cannot",
        "I'm unable to",
        "As an AI",
        "I don't have access",
        "I can't provide",
        "I'm not able to"
    ]
    
    text_lower = text.lower()
    return any(pattern.lower() in text_lower for pattern in generic_patterns)

def balance_dataset(data: List[Dict[str, Any]], max_similar: int = 3) -> List[Dict[str, Any]]:
    """Balance dataset to avoid too many similar examples."""
    # Simple balancing based on input length categories
    length_buckets = {
        "short": [],   # < 50 chars
        "medium": [],  # 50-200 chars  
        "long": []     # > 200 chars
    }
    
    for item in data:
        input_len = len(item.get("input", "") + item.get("instruction", ""))
        if input_len < 50:
            length_buckets["short"].append(item)
        elif input_len < 200:
            length_buckets["medium"].append(item)
        else:
            length_buckets["long"].append(item)
    
    # Balance by taking maximum from each bucket
    balanced_data = []
    for bucket_name, bucket_data in length_buckets.items():
        if len(bucket_data) > max_similar:
            # Take diverse examples (first, middle, last portions)
            step = len(bucket_data) // max_similar
            balanced_data.extend(bucket_data[::step][:max_similar])
        else:
            balanced_data.extend(bucket_data)
    
    print(f"📊 Dataset Balancing:")
    print(f"   Short examples: {len(length_buckets['short'])} -> {min(len(length_buckets['short']), max_similar)}")
    print(f"   Medium examples: {len(length_buckets['medium'])} -> {min(len(length_buckets['medium']), max_similar)}")
    print(f"   Long examples: {len(length_buckets['long'])} -> {min(len(length_buckets['long']), max_similar)}")
    print(f"   ✅ Total balanced: {len(balanced_data)} examples")
    
    return balanced_data 