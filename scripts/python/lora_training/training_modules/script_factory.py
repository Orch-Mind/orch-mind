# SPDX-License-Identifier: MIT OR Apache-2.0
# Training Script Creation Module

def create_peft_training_script(data_path, base_model, output_name, max_steps=10, adapter_path="./lora_adapter"):
    """Strategy 1: Create script for PEFT-only training (xformers-free)."""
    hf_model_name = get_ollama_model_base_name(base_model)
    # Use models without quantization for CPU
    if "bnb-4bit" in hf_model_name:
        hf_model_name = hf_model_name.replace("-bnb-4bit", "")
        hf_model_name = hf_model_name.replace("unsloth/", "")
        
    return f'''
import torch
import json
import warnings
import os
import sys
import time

warnings.filterwarnings("ignore")
os.environ["TOKENIZERS_PARALLELISM"] = "false"

print("🚀 Strategy 1: FAST PEFT-only training (xformers-free)")

try:
    from transformers import AutoTokenizer, AutoModelForCausalLM, TrainingArguments
    from peft import LoraConfig, get_peft_model, TaskType
    from datasets import Dataset
    from trl import SFTTrainer
except ImportError as e:
    print(f"❌ Import error: {{e}}")
    sys.exit(1)

try:
    with open("{data_path}", "r") as f:
        raw_data = [json.loads(line) for line in f if line.strip()]
    
    # Apply data quality filtering
    from training_modules.data_quality import filter_quality_data, balance_dataset
    print("📊 Applying data quality filters...")
    filtered_data = filter_quality_data(raw_data, min_length=15, max_length=800)
    data = balance_dataset(filtered_data, max_similar=5)
    
    if len(data) == 0:
        print("❌ No quality data remaining after filtering!")
        sys.exit(1)
        
except Exception as e:
    print(f"❌ Error loading/filtering data: {{e}}")
    sys.exit(1)

print("🔄 Loading model and tokenizer...")
try:
    # Detect if CUDA is available
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"🖥️  Using device: {{device}}")
    
    tokenizer = AutoTokenizer.from_pretrained("{hf_model_name}")
    
    # Load model with appropriate settings for device
    if device == "cuda":
        model = AutoModelForCausalLM.from_pretrained(
            "{hf_model_name}",
            torch_dtype=torch.float16,
            device_map="auto",
            trust_remote_code=True
        )
    else:
        # For CPU, use float32 and no device_map
        model = AutoModelForCausalLM.from_pretrained(
            "{hf_model_name}",
            torch_dtype=torch.float32,
            low_cpu_mem_usage=True,
            trust_remote_code=True
        )
        
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
        tokenizer.pad_token_id = tokenizer.eos_token_id
except Exception as e:
    print(f"❌ Error loading model: {{e}}")
    sys.exit(1)

print("🔄 Configuring LoRA...")
try:
    lora_config = LoraConfig(
        r=32, lora_alpha=64,  # Increased for better learning capacity
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],  # More target modules
        lora_dropout=0.05,  # Reduced dropout for better learning
        bias="none",
        use_rslora=True,
        task_type=TaskType.CAUSAL_LM
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()
except Exception as e:
    print(f"❌ Error configuring LoRA: {{e}}")
    sys.exit(1)

# Prepare dataset
formatted_data = []
for item in data:
    text = f"### Instruction:\\n{{item.get('instruction', '')}}\\n\\n### Input:\\n{{item.get('input', '')}}\\n\\n### Response:\\n{{item.get('output', '')}}"
    formatted_data.append({{"text": text}})

dataset = Dataset.from_list(formatted_data)

# Training arguments optimized for CPU/GPU compatibility
training_args = TrainingArguments(
    output_dir="{adapter_path}",
    per_device_train_batch_size=2,  # Increased batch size
    gradient_accumulation_steps=4,
    warmup_steps=5,  # More warmup for stability
    max_steps={max_steps},
    learning_rate=3e-4,  # Slightly lower, more stable
    fp16=(device == "cuda"),  # Only use fp16 on CUDA
    logging_steps=5,  # Less frequent logging
    optim="adamw_torch",
    weight_decay=0.01,  # Add weight decay for regularization
    lr_scheduler_type="cosine",  # Cosine learning rate schedule
    save_total_limit=1,
    save_steps={max_steps//2},  # Save checkpoint halfway
    report_to=None,
    disable_tqdm=False,
)

trainer = SFTTrainer(
    model=model, tokenizer=tokenizer,
    train_dataset=dataset,
    dataset_text_field="text",
    max_seq_length=512,
    args=training_args,
    packing=False
)

print("🚀 Starting LoRA training...")
trainer.train()

print("💾 Saving LoRA adapter...")
os.makedirs("{adapter_path}", exist_ok=True)
model.save_pretrained("{adapter_path}")
tokenizer.save_pretrained("{adapter_path}")

print("✅ LoRA adapter saved successfully!")
'''

def create_instant_adapter_script(data_path, base_model, output_name):
    """Strategy 2: Create script for instant adapter creation."""
    hf_model_name = get_ollama_model_base_name(base_model)
    return f'''
import json
import os
import time
import sys

print("🚀 Strategy 2: INSTANT adapter creation")

output_name = "{output_name}"

try:
    with open("{data_path}", "r", encoding="utf-8") as f:
        data = [json.loads(line) for line in f if line.strip()]
except Exception as e:
    print(f"❌ Error loading data: {{e}}")
    sys.exit(1)

adapter_dir = f"./lora_adapter/{{output_name}}"
os.makedirs(adapter_dir, exist_ok=True)

adapter_config = {{
    "base_model_name_or_path": "{hf_model_name}",
    "peft_type": "LORA",
    "r": 16, "lora_alpha": 32, "lora_dropout": 0.05,
    "target_modules": ["q_proj", "k_proj", "v_proj", "o_proj"]
}}

with open(os.path.join(adapter_dir, "adapter_config.json"), 'w') as f:
    json.dump(adapter_config, f, indent=2)

print("✅ Instant LoRA adapter created!")
'''

def create_incremental_training_script(data_path, base_model, adapter_path, max_steps=10):
    """Create script for incremental training on existing adapter."""
    hf_model_name = get_ollama_model_base_name(base_model)
    
    return f'''
import torch
import json
import warnings
import os
import sys
import time

warnings.filterwarnings("ignore")
os.environ["TOKENIZERS_PARALLELISM"] = "false"

print("🔄 INCREMENTAL TRAINING: Loading existing adapter...")

try:
    from transformers import AutoTokenizer, AutoModelForCausalLM, TrainingArguments
    from peft import PeftModel, LoraConfig, get_peft_model, TaskType
    from datasets import Dataset
    from trl import SFTTrainer
except ImportError as e:
    print(f"❌ Import error: {{e}}")
    sys.exit(1)

try:
    with open("{data_path}", "r") as f:
        raw_data = [json.loads(line) for line in f if line.strip()]
    
    # Apply data quality filtering for incremental training
    from training_modules.data_quality import filter_quality_data, balance_dataset
    print("📊 Applying data quality filters for incremental training...")
    filtered_data = filter_quality_data(raw_data, min_length=15, max_length=800)
    data = balance_dataset(filtered_data, max_similar=3)  # Less similar examples for incremental
    
    if len(data) == 0:
        print("❌ No quality data remaining after filtering!")
        sys.exit(1)
        
except Exception as e:
    print(f"❌ Error loading/filtering data: {{e}}")
    sys.exit(1)

print("🔄 Loading base model and existing adapter...")
try:
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"🖥️  Using device: {{device}}")
    
    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained("{hf_model_name}")
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
        tokenizer.pad_token_id = tokenizer.eos_token_id
    
    # Load base model
    if device == "cuda":
        base_model = AutoModelForCausalLM.from_pretrained(
            "{hf_model_name}",
            torch_dtype=torch.float16,
            device_map="auto",
            trust_remote_code=True
        )
    else:
        base_model = AutoModelForCausalLM.from_pretrained(
            "{hf_model_name}",
            torch_dtype=torch.float32,
            low_cpu_mem_usage=True,
            trust_remote_code=True
        )
    
    # Load existing adapter
    print(f"🔄 Loading adapter from {{'{adapter_path}'}}")
    model = PeftModel.from_pretrained(base_model, "{adapter_path}")
    print("✅ Existing adapter loaded successfully")
    
except Exception as e:
    print(f"❌ Error loading model/adapter: {{e}}")
    sys.exit(1)

# Prepare dataset
formatted_data = []
for item in data:
    text = f"### Instruction:\\n{{item.get('instruction', '')}}\\n\\n### Input:\\n{{item.get('input', '')}}\\n\\n### Response:\\n{{item.get('output', '')}}"
    formatted_data.append({{"text": text}})

dataset = Dataset.from_list(formatted_data)
print(f"📚 Loaded {{len(formatted_data)}} new training examples")

# Training arguments for incremental learning (more conservative)
training_args = TrainingArguments(
    output_dir="{adapter_path}",
    per_device_train_batch_size=1,
    gradient_accumulation_steps=4,
    warmup_steps=1,  # Less warmup for incremental
    max_steps={max_steps},
    learning_rate=2e-4,  # Lower learning rate to preserve existing knowledge
    fp16=(device == "cuda"),
    logging_steps=1,
    optim="adamw_torch",
    save_total_limit=1,
    report_to=None,
    disable_tqdm=False,
    overwrite_output_dir=True,
)

trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    dataset_text_field="text",
    max_seq_length=512,
    args=training_args,
    packing=False
)

print("🔄 Starting incremental training...")
trainer.train()

print("💾 Saving updated adapter...")
model.save_pretrained("{adapter_path}")
tokenizer.save_pretrained("{adapter_path}")

print("✅ Incremental training completed!")
print(f"📈 Adapter updated with {{len(formatted_data)}} new examples")
'''

def get_ollama_model_base_name(model_name):
    """Map Ollama models to HuggingFace equivalents."""
    model_mapping = {
        # Modelos quantizados para GPU
        "llama3.1:latest": "unsloth/Meta-Llama-3.1-8B-bnb-4bit",
        "mistral:latest": "unsloth/mistral-7b-v0.1-bnb-4bit",
        "qwen3:latest": "Qwen/Qwen2.5-7B",
        # Modelos base não quantizados (fallback para CPU)
        "llama3.1:latest-cpu": "meta-llama/Meta-Llama-3.1-8B",
        "mistral:latest-cpu": "mistralai/Mistral-7B-v0.1",
    }
    
    # Check if we're on CPU and use non-quantized models
    base_name = model_mapping.get(model_name, "meta-llama/Meta-Llama-3.1-8B")
    
    # For unknown models, default to a reasonable base
    if model_name not in model_mapping:
        print(f"⚠️  Unknown model {model_name}, using default base model")
        
    return base_name