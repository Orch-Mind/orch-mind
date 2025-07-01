# SPDX-License-Identifier: MIT OR Apache-2.0
# Training Evaluation Module for LoRA Training

import json
import time
from typing import List, Dict, Any
import subprocess
import urllib.request
import urllib.error

def evaluate_model_response(model_name: str, test_prompts: List[str]) -> Dict[str, Any]:
    """Evaluate model responses using basic metrics."""
    print(f"📊 Evaluating model: {model_name}")
    
    results = {
        "model_name": model_name,
        "test_prompts": len(test_prompts),
        "responses": [],
        "avg_response_length": 0,
        "avg_response_time": 0,
        "quality_score": 0
    }
    
    total_length = 0
    total_time = 0
    quality_scores = []
    
    for i, prompt in enumerate(test_prompts):
        print(f"   Testing prompt {i+1}/{len(test_prompts)}")
        
        start_time = time.time()
        response = generate_response(model_name, prompt)
        response_time = time.time() - start_time
        
        if response:
            total_length += len(response)
            total_time += response_time
            
            # Basic quality assessment
            quality = assess_response_quality(prompt, response)
            quality_scores.append(quality)
            
            results["responses"].append({
                "prompt": prompt,
                "response": response,
                "response_time": response_time,
                "response_length": len(response),
                "quality_score": quality
            })
    
    if results["responses"]:
        results["avg_response_length"] = total_length / len(results["responses"])
        results["avg_response_time"] = total_time / len(results["responses"])
        results["quality_score"] = sum(quality_scores) / len(quality_scores)
    
    print(f"✅ Evaluation completed:")
    print(f"   Average response length: {results['avg_response_length']:.1f} chars")
    print(f"   Average response time: {results['avg_response_time']:.2f}s")
    print(f"   Quality score: {results['quality_score']:.2f}/10")
    
    return results

def generate_response(model_name: str, prompt: str, timeout: int = 30) -> str:
    """Generate response from Ollama model."""
    try:
        # Use urllib for cross-platform compatibility (works on Windows too)
        # Create request payload
        payload = {
            "model": model_name,
            "prompt": prompt,
            "stream": False
        }
        
        # Convert to JSON
        data = json.dumps(payload).encode('utf-8')
        
        # Create request
        req = urllib.request.Request(
            "http://localhost:11434/api/generate",
            data=data,
            headers={'Content-Type': 'application/json'}
        )
        
        # Make request with timeout
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                result_data = response.read().decode('utf-8')
                response_json = json.loads(result_data)
                return response_json.get("response", "")
        except urllib.error.HTTPError as e:
            print(f"⚠️ HTTP Error calling Ollama: {e.code} - {e.reason}")
            return ""
        except urllib.error.URLError as e:
            print(f"⚠️ URL Error calling Ollama: {e.reason}")
            return ""
            
    except Exception as e:
        print(f"⚠️ Error generating response: {e}")
        return ""

def assess_response_quality(prompt: str, response: str) -> float:
    """Assess response quality with basic heuristics (0-10 scale)."""
    if not response or not response.strip():
        return 0.0
    
    quality_score = 5.0  # Base score
    
    # Length appropriateness
    response_len = len(response.strip())
    if 50 <= response_len <= 500:
        quality_score += 1.0
    elif response_len < 20:
        quality_score -= 2.0
    elif response_len > 1000:
        quality_score -= 1.0
    
    # Coherence indicators
    sentences = response.split('.')
    if len(sentences) >= 2:
        quality_score += 0.5
    
    # Relevance (simple keyword matching)
    prompt_words = set(prompt.lower().split())
    response_words = set(response.lower().split())
    overlap = len(prompt_words.intersection(response_words))
    if overlap > 0:
        quality_score += min(overlap * 0.2, 1.5)
    
    # Avoid generic responses
    generic_phrases = ["i'm sorry", "i cannot", "as an ai", "i don't know"]
    if any(phrase in response.lower() for phrase in generic_phrases):
        quality_score -= 1.0
    
    # Positive indicators
    positive_indicators = ["por exemplo", "specifically", "let me explain", "vou explicar"]
    if any(indicator in response.lower() for indicator in positive_indicators):
        quality_score += 0.5
    
    return max(0.0, min(10.0, quality_score))

def create_standard_test_prompts() -> List[str]:
    """Create standard test prompts for evaluation."""
    return [
        "O que é programação?",
        "Como funciona um loop for?",
        "Explique o conceito de variáveis",
        "Qual a diferença entre Python e JavaScript?",
        "Como resolver um erro de sintaxe?",
        "What is machine learning?",
        "Explain object-oriented programming",
        "How do databases work?"
    ]

def compare_models(base_model: str, trained_model: str, test_prompts: List[str] = None) -> Dict[str, Any]:
    """Compare base model vs trained model performance."""
    if test_prompts is None:
        test_prompts = create_standard_test_prompts()
    
    print("🔍 Comparing model performance...")
    
    base_results = evaluate_model_response(base_model, test_prompts)
    trained_results = evaluate_model_response(trained_model, test_prompts)
    
    comparison = {
        "base_model": base_results,
        "trained_model": trained_results,
        "improvements": {
            "quality_improvement": trained_results["quality_score"] - base_results["quality_score"],
            "length_change": trained_results["avg_response_length"] - base_results["avg_response_length"],
            "time_change": trained_results["avg_response_time"] - base_results["avg_response_time"]
        }
    }
    
    print(f"\n📊 Model Comparison Results:")
    print(f"   Quality improvement: {comparison['improvements']['quality_improvement']:+.2f} points")
    print(f"   Response length change: {comparison['improvements']['length_change']:+.1f} chars")
    print(f"   Response time change: {comparison['improvements']['time_change']:+.2f}s")
    
    return comparison

def save_evaluation_results(results: Dict[str, Any], filename: str = None):
    """Save evaluation results to file."""
    if filename is None:
        filename = f"evaluation_{int(time.time())}.json"
    
    try:
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"📄 Evaluation results saved to: {filename}")
    except Exception as e:
        print(f"⚠️ Error saving evaluation results: {e}") 