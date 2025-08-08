# Required packages for LoRA training
required_packages = [
    "torch>=2.0.0",
    "transformers>=4.36.0", 
    "peft>=0.7.0",
    "datasets>=2.15.0",
    "accelerate>=0.25.0",
    "bitsandbytes>=0.41.0",

    "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git",
    "psutil>=5.9.0",  # For memory monitoring
]