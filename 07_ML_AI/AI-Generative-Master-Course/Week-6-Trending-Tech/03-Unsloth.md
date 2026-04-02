# ⚡ Unsloth: Fast & Efficient Fine-Tuning

## 📚 Table of Contents
1. [Introduction](#-introduction)
2. [Beginner Explanation](#-beginner-explanation)
3. [Deep Technical Breakdown](#-deep-technical-breakdown)
4. [Installation & Setup](#-installation--setup)
5. [Fine-Tuning with Unsloth](#-fine-tuning-with-unsloth)
6. [Advanced Techniques](#-advanced-techniques)
7. [Real-World Use Cases](#-real-world-use-cases)
8. [Hands-On Project](#-hands-on-project)
9. [Common Mistakes](#-common-mistakes)
10. [Interview Questions](#-interview-questions)
11. [Homework](#-homework)

---

## 🎯 Introduction

**Unsloth** is a revolutionary library that makes fine-tuning LLMs **2-5x faster** while using **80% less memory**. It achieves this through custom CUDA kernels and mathematical optimizations, making it possible to fine-tune 7B+ models on consumer GPUs.

### Why Unsloth?

| Traditional Fine-Tuning | Unsloth |
|------------------------|---------|
| A100 GPU required | RTX 3090 works |
| Hours of training | 30 minutes |
| 80GB+ VRAM | 16GB VRAM |
| Complex setup | pip install |
| Memory errors common | Stable training |

### Key Features

- 🚀 **2x faster** training speed
- 💾 **80% less** memory usage
- 🎯 **No accuracy loss** compared to normal training
- 📦 **Easy integration** with HuggingFace
- 🔧 **Custom kernels** for attention, RoPE, cross-entropy
- 💰 **Free & open source**

---

## 🧒 Beginner Explanation

### The "Race Car" Analogy

Imagine fine-tuning an LLM is like preparing a race car:

**Normal Fine-Tuning:**
```
Regular Car ─────► Mechanic Shop ─────► Ready to Race
                   (Full rebuild)
                   Takes: 8 hours
                   Costs: $$$$$
```

**Unsloth Fine-Tuning:**
```
Regular Car ─────► Expert Pit Crew ─────► Ready to Race
                   (Smart optimizations)
                   Takes: 30 minutes
                   Costs: $$
```

### What Makes Unsloth Fast?

```
┌────────────────────────────────────────────────────────────────┐
│                    NORMAL FINE-TUNING                           │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Input → [Generic CUDA] → [Generic Math] → [Standard Memory]  │
│                    ↓                                            │
│              SLOW + HIGH MEMORY                                 │
│                                                                 │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                    UNSLOTH FINE-TUNING                          │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Input → [Custom CUDA] → [Fused Ops] → [Optimized Memory]     │
│                    ↓                                            │
│              FAST + LOW MEMORY                                  │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Simple Example

```python
# Just 10 lines to fine-tune an LLM!
from unsloth import FastLanguageModel

# Load model with Unsloth optimizations
model, tokenizer = FastLanguageModel.from_pretrained(
    "unsloth/llama-3-8b-bnb-4bit"
)

# Add LoRA adapters
model = FastLanguageModel.get_peft_model(model)

# Train (same as normal HuggingFace)
trainer = SFTTrainer(model=model, ...)
trainer.train()

# Done! Your custom LLM is ready!
```

---

## 🔬 Deep Technical Breakdown

### How Unsloth Achieves Speed

#### 1. Custom CUDA Kernels

Unsloth writes optimized GPU code for key operations:

```
┌─────────────────────────────────────────────────────────────┐
│                 STANDARD ATTENTION                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Q ──► Matmul ──► Scale ──► Softmax ──► Matmul ──► Output  │
│  K ──►           (5 separate GPU calls)           ▲        │
│  V ────────────────────────────────────────────────┘        │
│                                                              │
│  Memory: Read/Write 5 times                                 │
│  Speed: Slow                                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 UNSLOTH FUSED ATTENTION                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Q ──┐                                                      │
│  K ──┼──► [Single Fused Kernel] ──► Output                 │
│  V ──┘                                                      │
│                                                              │
│  Memory: Read/Write 1 time                                  │
│  Speed: 2-5x faster                                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### 2. Memory Optimization

**Gradient Checkpointing + Smart Caching:**

```
Standard:
Forward Pass:  A → B → C → D → Output
               ↓   ↓   ↓   ↓
Memory:        [Save All Activations]  → 16GB+

Unsloth:
Forward Pass:  A → B → C → D → Output
               ↓       ↓
Memory:        [Save Only Key Points]  → 4GB
               (Recompute others when needed)
```

#### 3. RoPE Embeddings Optimization

**Rotary Position Embedding (RoPE)** is expensive. Unsloth precomputes:

```python
# Standard: Compute RoPE every forward pass
def rope_standard(x, seq_len):
    cos = torch.cos(positions * freqs)  # Computed each time!
    sin = torch.sin(positions * freqs)
    return apply_rope(x, cos, sin)

# Unsloth: Precompute and cache
class UnslothRoPE:
    def __init__(self, max_len):
        self.cos_cache = precompute_cos(max_len)  # One-time!
        self.sin_cache = precompute_sin(max_len)
    
    def forward(self, x, seq_len):
        return apply_rope(x, self.cos_cache[:seq_len], self.sin_cache[:seq_len])
```

### Mathematical Optimizations

#### Cross-Entropy Loss Fusion

Standard cross-entropy requires materializing full logits:

$$\mathcal{L} = -\frac{1}{N}\sum_{i=1}^{N} \log \frac{e^{z_{y_i}}}{\sum_j e^{z_j}}$$

Memory required: $O(\text{batch} \times \text{seq\_len} \times \text{vocab\_size})$

For Llama-3 (128k vocab): That's **huge**!

**Unsloth's Chunked Approach:**
- Process in chunks
- Never materialize full logits
- Compute loss on-the-fly

```python
# Chunked cross-entropy (simplified)
def unsloth_cross_entropy(logits, labels, chunk_size=1024):
    loss = 0
    for i in range(0, logits.size(-1), chunk_size):
        chunk_logits = logits[..., i:i+chunk_size]
        chunk_loss = compute_chunk_loss(chunk_logits, labels)
        loss += chunk_loss
    return loss
```

### LoRA Integration

Unsloth optimizes LoRA specifically:

```
Original Weights W: (4096 × 4096) = 16M params

LoRA Addition:
W' = W + A × B
where:
A: (4096 × r)  r=16 → 65K params
B: (r × 4096)  r=16 → 65K params

Total trainable: 130K vs 16M = 0.8%!

Unsloth further optimizes:
- Fused LoRA forward pass
- Gradient computation in single kernel
- Memory-efficient backward pass
```

---

## 🛠️ Installation & Setup

### Requirements

- Python 3.10+
- CUDA 11.8 or 12.1
- NVIDIA GPU (8GB+ VRAM recommended)

### Installation

```bash
# For CUDA 12.1
pip install unsloth

# For CUDA 11.8
pip install unsloth[cu118]

# With all dependencies
pip install "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"
pip install xformers trl peft accelerate bitsandbytes
```

### Verify Installation

```python
import torch
print(f"CUDA available: {torch.cuda.is_available()}")
print(f"GPU: {torch.cuda.get_device_name(0)}")

from unsloth import FastLanguageModel
print("Unsloth loaded successfully!")
```

### Google Colab Setup

```python
# Run this first in Colab
!pip install "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"
!pip install --no-deps xformers trl peft accelerate bitsandbytes
```

---

## 🎯 Fine-Tuning with Unsloth

### Complete Fine-Tuning Pipeline

```python
"""
Complete Unsloth Fine-Tuning Pipeline
"""

from unsloth import FastLanguageModel
from datasets import load_dataset
from trl import SFTTrainer
from transformers import TrainingArguments
import torch

# ============================================
# 1. LOAD MODEL WITH UNSLOTH
# ============================================

max_seq_length = 2048
dtype = None  # Auto-detect (float16 for older GPUs, bfloat16 for newer)
load_in_4bit = True  # Use 4-bit quantization

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="unsloth/llama-3-8b-bnb-4bit",  # Pre-quantized
    max_seq_length=max_seq_length,
    dtype=dtype,
    load_in_4bit=load_in_4bit,
)

print(f"Model loaded! Memory: {torch.cuda.memory_allocated()/1e9:.2f} GB")

# ============================================
# 2. ADD LORA ADAPTERS
# ============================================

model = FastLanguageModel.get_peft_model(
    model,
    r=16,  # LoRA rank (higher = more capacity, more memory)
    target_modules=[
        "q_proj", "k_proj", "v_proj", "o_proj",  # Attention
        "gate_proj", "up_proj", "down_proj",     # MLP
    ],
    lora_alpha=16,
    lora_dropout=0,  # 0 is optimized
    bias="none",     # "none" is optimized
    use_gradient_checkpointing="unsloth",  # 30% less memory
    random_state=42,
    use_rslora=False,  # Rank-stabilized LoRA
    loftq_config=None,
)

# Count trainable parameters
trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
total_params = sum(p.numel() for p in model.parameters())
print(f"Trainable: {trainable_params:,} / {total_params:,} ({100*trainable_params/total_params:.2f}%)")

# ============================================
# 3. PREPARE DATASET
# ============================================

# Define prompt template
def format_instruction(example):
    """Format dataset into instruction format"""
    
    prompt = f"""### Instruction:
{example['instruction']}

### Input:
{example.get('input', '')}

### Response:
{example['output']}"""
    
    return {"text": prompt}

# Load dataset
dataset = load_dataset("yahma/alpaca-cleaned", split="train")
dataset = dataset.map(format_instruction)

print(f"Dataset size: {len(dataset)}")
print(f"Sample:\n{dataset[0]['text'][:500]}")

# ============================================
# 4. CONFIGURE TRAINING
# ============================================

training_args = TrainingArguments(
    output_dir="./outputs",
    per_device_train_batch_size=2,
    gradient_accumulation_steps=4,  # Effective batch = 2 * 4 = 8
    warmup_steps=5,
    num_train_epochs=1,
    learning_rate=2e-4,
    fp16=not torch.cuda.is_bf16_supported(),
    bf16=torch.cuda.is_bf16_supported(),
    logging_steps=10,
    optim="adamw_8bit",  # Memory-efficient optimizer
    weight_decay=0.01,
    lr_scheduler_type="linear",
    seed=42,
    save_strategy="steps",
    save_steps=100,
)

# ============================================
# 5. TRAIN
# ============================================

trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    dataset_text_field="text",
    max_seq_length=max_seq_length,
    dataset_num_proc=2,
    packing=False,  # True for shorter sequences
    args=training_args,
)

# Show memory before training
print(f"Memory before training: {torch.cuda.memory_allocated()/1e9:.2f} GB")

# Train!
trainer_stats = trainer.train()

# Show stats
print(f"Training time: {trainer_stats.metrics['train_runtime']:.2f} seconds")
print(f"Memory peak: {torch.cuda.max_memory_allocated()/1e9:.2f} GB")

# ============================================
# 6. SAVE MODEL
# ============================================

# Save LoRA adapters only (small file)
model.save_pretrained("llama3-finetuned-lora")
tokenizer.save_pretrained("llama3-finetuned-lora")

# Save merged model (for inference without LoRA)
model.save_pretrained_merged(
    "llama3-finetuned-merged",
    tokenizer,
    save_method="merged_16bit"  # or "merged_4bit"
)

# Export to GGUF for Ollama
model.save_pretrained_gguf(
    "llama3-finetuned-gguf",
    tokenizer,
    quantization_method="q4_k_m"  # Good balance
)

print("Model saved successfully!")

# ============================================
# 7. INFERENCE TEST
# ============================================

# Enable inference mode
FastLanguageModel.for_inference(model)

# Test generation
inputs = tokenizer(
    """### Instruction:
Write a Python function to calculate fibonacci numbers.

### Input:

### Response:
""",
    return_tensors="pt"
).to("cuda")

outputs = model.generate(
    **inputs,
    max_new_tokens=256,
    temperature=0.7,
    do_sample=True
)

print(tokenizer.decode(outputs[0], skip_special_tokens=True))
```

### Chat Fine-Tuning

```python
"""
Fine-tune for Chat/Conversation
"""

from unsloth import FastLanguageModel
from unsloth.chat_templates import get_chat_template

# Load model
model, tokenizer = FastLanguageModel.from_pretrained(
    "unsloth/llama-3-8b-Instruct-bnb-4bit",
    max_seq_length=2048,
)

# Apply chat template
tokenizer = get_chat_template(
    tokenizer,
    chat_template="llama-3",  # or "chatml", "mistral", etc.
)

# Add LoRA
model = FastLanguageModel.get_peft_model(model, r=16)

# Format dataset for chat
def format_chat(example):
    messages = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": example["question"]},
        {"role": "assistant", "content": example["answer"]}
    ]
    
    text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=False
    )
    
    return {"text": text}

# Load and format dataset
dataset = load_dataset("your_chat_dataset", split="train")
dataset = dataset.map(format_chat)

# Train (same as before)
trainer = SFTTrainer(...)
trainer.train()
```

---

## 🔧 Advanced Techniques

### 1. DPO (Direct Preference Optimization)

```python
"""
DPO Training with Unsloth
"""

from unsloth import FastLanguageModel, PatchDPOTrainer
from trl import DPOTrainer

# Patch DPO trainer for Unsloth optimizations
PatchDPOTrainer()

# Load model (same as before)
model, tokenizer = FastLanguageModel.from_pretrained(
    "unsloth/llama-3-8b-Instruct-bnb-4bit",
    max_seq_length=2048,
)

model = FastLanguageModel.get_peft_model(model, r=16)

# DPO requires chosen/rejected pairs
# Dataset format: {"prompt": ..., "chosen": ..., "rejected": ...}
dpo_dataset = load_dataset("argilla/ultrafeedback-binarized-preferences", split="train")

# Train with DPO
dpo_trainer = DPOTrainer(
    model=model,
    ref_model=None,  # Use implicit reference
    tokenizer=tokenizer,
    train_dataset=dpo_dataset,
    beta=0.1,  # KL penalty coefficient
    max_length=1024,
    max_prompt_length=512,
)

dpo_trainer.train()
```

### 2. ORPO (Odds Ratio Preference Optimization)

```python
"""
ORPO Training - No reference model needed!
"""

from unsloth import FastLanguageModel
from trl import ORPOTrainer, ORPOConfig

model, tokenizer = FastLanguageModel.from_pretrained(
    "unsloth/llama-3-8b-bnb-4bit",
    max_seq_length=2048,
)

model = FastLanguageModel.get_peft_model(model, r=16)

# ORPO config
orpo_config = ORPOConfig(
    output_dir="./orpo_outputs",
    per_device_train_batch_size=2,
    gradient_accumulation_steps=4,
    num_train_epochs=1,
    learning_rate=5e-6,
    beta=0.1,  # ORPO beta parameter
    max_length=1024,
    max_prompt_length=512,
)

# Train
trainer = ORPOTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=preference_dataset,
    args=orpo_config,
)

trainer.train()
```

### 3. Continued Pre-Training

```python
"""
Continued Pre-Training (Domain Adaptation)
"""

from unsloth import FastLanguageModel
from transformers import TrainingArguments, Trainer
from transformers import DataCollatorForLanguageModeling

model, tokenizer = FastLanguageModel.from_pretrained(
    "unsloth/llama-3-8b-bnb-4bit",
    max_seq_length=4096,
)

# For pre-training, we might want to train more layers
model = FastLanguageModel.get_peft_model(
    model,
    r=32,  # Higher rank for more capacity
    target_modules=[
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
        "embed_tokens", "lm_head",  # Include embeddings
    ],
    lora_alpha=32,
)

# Load domain-specific text
def tokenize_function(examples):
    return tokenizer(
        examples["text"],
        truncation=True,
        max_length=4096,
        padding=False,
    )

domain_dataset = load_dataset("your_domain_corpus", split="train")
tokenized_dataset = domain_dataset.map(tokenize_function, batched=True)

# Data collator for causal LM
data_collator = DataCollatorForLanguageModeling(
    tokenizer=tokenizer,
    mlm=False,  # Causal LM, not masked
)

# Train
trainer = Trainer(
    model=model,
    train_dataset=tokenized_dataset,
    data_collator=data_collator,
    args=TrainingArguments(
        output_dir="./pretrain_outputs",
        per_device_train_batch_size=1,
        gradient_accumulation_steps=8,
        num_train_epochs=1,
        learning_rate=1e-4,
        warmup_ratio=0.03,
    ),
)

trainer.train()
```

### 4. Multi-GPU Training

```python
"""
Multi-GPU with Unsloth
"""

from unsloth import FastLanguageModel
from accelerate import Accelerator

# Initialize accelerator
accelerator = Accelerator()

model, tokenizer = FastLanguageModel.from_pretrained(
    "unsloth/llama-3-8b-bnb-4bit",
    max_seq_length=2048,
    device_map="auto",  # Distribute across GPUs
)

model = FastLanguageModel.get_peft_model(model, r=16)

# Prepare for distributed training
model = accelerator.prepare(model)

# Training loop with accelerate
for batch in train_dataloader:
    with accelerator.accumulate(model):
        outputs = model(**batch)
        loss = outputs.loss
        accelerator.backward(loss)
        optimizer.step()
        optimizer.zero_grad()
```

---

## 🌍 Real-World Use Cases

### 1. Custom Customer Support Bot

```python
"""
Fine-tune for customer support
"""

# Dataset format
support_data = [
    {
        "instruction": "Customer asks about return policy",
        "input": "How do I return an item?",
        "output": "To return an item: 1) Log into your account, 2) Go to Order History, 3) Select the item, 4) Click 'Return Item', 5) Print the shipping label. Returns are accepted within 30 days."
    },
    # ... more examples
]

# Convert to HuggingFace format and train
# Model learns your specific policies and tone
```

### 2. Code Assistant for Your Stack

```python
"""
Fine-tune for your specific codebase
"""

# Dataset from your repos
code_data = [
    {
        "instruction": "Write a function using our API client",
        "input": "Fetch user data from our backend",
        "output": """
from our_client import APIClient

def fetch_user(user_id: str):
    client = APIClient(api_key=os.environ['API_KEY'])
    response = client.users.get(user_id)
    return response.data
"""
    },
    # ... examples from your codebase
]
```

### 3. Domain-Specific Expert

```python
"""
Medical/Legal/Financial domain expert
"""

# Fine-tune on domain literature
# Model learns terminology, reasoning patterns, best practices
# WARNING: Always verify outputs in high-stakes domains!
```

---

## 🛠️ Hands-On Project

### Project: Build a Coding Assistant

Create a fine-tuned coding assistant specialized in Python.

```python
"""
Project: Python Coding Assistant
Fine-tune Llama-3 to be an expert Python tutor
"""

import torch
from unsloth import FastLanguageModel
from datasets import load_dataset, Dataset
from trl import SFTTrainer
from transformers import TrainingArguments
import json

# ============================================
# 1. PREPARE DATASET
# ============================================

# Sample training data (in practice, use thousands of examples)
python_examples = [
    {
        "instruction": "Explain this Python concept",
        "input": "What are list comprehensions?",
        "output": """List comprehensions are a concise way to create lists in Python.

**Basic Syntax:**
```python
new_list = [expression for item in iterable if condition]
```

**Examples:**
```python
# Create squares of numbers 0-9
squares = [x**2 for x in range(10)]
# [0, 1, 4, 9, 16, 25, 36, 49, 64, 81]

# Filter even numbers
evens = [x for x in range(20) if x % 2 == 0]
# [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]

# Transform strings
names = ['alice', 'bob', 'charlie']
upper_names = [name.upper() for name in names]
# ['ALICE', 'BOB', 'CHARLIE']
```

**When to use:**
- Simple transformations
- Filtering lists
- When readability is maintained

**Avoid when:**
- Logic is complex
- Multiple nested loops
- Side effects are needed"""
    },
    {
        "instruction": "Write a Python function",
        "input": "Create a function to validate email addresses",
        "output": """```python
import re
from typing import Tuple

def validate_email(email: str) -> Tuple[bool, str]:
    \"\"\"
    Validate an email address.
    
    Args:
        email: The email address to validate
        
    Returns:
        Tuple of (is_valid, message)
    
    Examples:
        >>> validate_email("user@example.com")
        (True, "Valid email")
        >>> validate_email("invalid")
        (False, "Missing @ symbol")
    \"\"\"
    # Check for empty input
    if not email or not email.strip():
        return False, "Email cannot be empty"
    
    email = email.strip().lower()
    
    # Check for @ symbol
    if '@' not in email:
        return False, "Missing @ symbol"
    
    # Check for multiple @ symbols
    if email.count('@') > 1:
        return False, "Multiple @ symbols not allowed"
    
    # Split into local and domain parts
    local, domain = email.rsplit('@', 1)
    
    # Validate local part
    if not local:
        return False, "Missing local part (before @)"
    
    if len(local) > 64:
        return False, "Local part too long (max 64 chars)"
    
    # Validate domain
    if not domain:
        return False, "Missing domain (after @)"
    
    if '.' not in domain:
        return False, "Domain must contain a dot"
    
    if domain.startswith('.') or domain.endswith('.'):
        return False, "Domain cannot start or end with dot"
    
    # Regex pattern for valid email
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    
    if re.match(pattern, email):
        return True, "Valid email"
    else:
        return False, "Invalid email format"


# Usage
if __name__ == "__main__":
    test_emails = [
        "user@example.com",
        "invalid",
        "user@",
        "@domain.com",
        "user@@domain.com",
        "user@domain",
        "user.name+tag@example.co.uk"
    ]
    
    for email in test_emails:
        valid, message = validate_email(email)
        status = "✓" if valid else "✗"
        print(f"{status} {email}: {message}")
```"""
    },
    {
        "instruction": "Debug this Python code",
        "input": """```python
def calculate_average(numbers):
    total = 0
    for num in numbers:
        total += num
    return total / len(numbers)

result = calculate_average([])
print(result)
```""",
        "output": """**Bug:** Division by zero when the list is empty.

**Fixed Code:**
```python
def calculate_average(numbers: list) -> float:
    \"\"\"
    Calculate the average of a list of numbers.
    
    Args:
        numbers: List of numbers
        
    Returns:
        The average, or 0.0 if list is empty
        
    Raises:
        TypeError: If input is not a list
    \"\"\"
    if not isinstance(numbers, list):
        raise TypeError("Input must be a list")
    
    if not numbers:  # Empty list check
        return 0.0
    
    total = sum(numbers)  # Use built-in sum()
    return total / len(numbers)


# Better alternative using statistics module
from statistics import mean, StatisticsError

def calculate_average_v2(numbers: list) -> float:
    try:
        return mean(numbers)
    except StatisticsError:
        return 0.0  # Empty list


# Test
print(calculate_average([]))      # 0.0
print(calculate_average([1,2,3])) # 2.0
```

**Key fixes:**
1. Added empty list check before division
2. Added type hints for clarity
3. Used built-in `sum()` instead of manual loop
4. Added docstring with examples"""
    },
    # Add many more examples...
]

# Convert to HuggingFace Dataset
def create_dataset(examples):
    formatted = []
    for ex in examples:
        text = f"""### Instruction:
{ex['instruction']}

### Input:
{ex['input']}

### Response:
{ex['output']}"""
        formatted.append({"text": text})
    return Dataset.from_list(formatted)

train_dataset = create_dataset(python_examples)

# ============================================
# 2. LOAD AND CONFIGURE MODEL
# ============================================

model, tokenizer = FastLanguageModel.from_pretrained(
    "unsloth/llama-3-8b-bnb-4bit",
    max_seq_length=4096,
    dtype=None,
    load_in_4bit=True,
)

model = FastLanguageModel.get_peft_model(
    model,
    r=32,  # Higher rank for code understanding
    target_modules=[
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
    ],
    lora_alpha=32,
    lora_dropout=0,
    bias="none",
    use_gradient_checkpointing="unsloth",
)

# ============================================
# 3. TRAIN
# ============================================

trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=train_dataset,
    dataset_text_field="text",
    max_seq_length=4096,
    packing=False,
    args=TrainingArguments(
        output_dir="./python_assistant",
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,
        num_train_epochs=3,
        learning_rate=2e-4,
        fp16=not torch.cuda.is_bf16_supported(),
        bf16=torch.cuda.is_bf16_supported(),
        logging_steps=1,
        save_strategy="epoch",
        warmup_ratio=0.03,
        optim="adamw_8bit",
    ),
)

trainer.train()

# ============================================
# 4. SAVE AND EXPORT
# ============================================

# Save LoRA
model.save_pretrained("python_assistant_lora")
tokenizer.save_pretrained("python_assistant_lora")

# Export to GGUF for Ollama
model.save_pretrained_gguf(
    "python_assistant_gguf",
    tokenizer,
    quantization_method="q4_k_m"
)

# ============================================
# 5. TEST INFERENCE
# ============================================

FastLanguageModel.for_inference(model)

def ask_python_assistant(question: str) -> str:
    prompt = f"""### Instruction:
Answer this Python programming question

### Input:
{question}

### Response:
"""
    
    inputs = tokenizer(prompt, return_tensors="pt").to("cuda")
    
    outputs = model.generate(
        **inputs,
        max_new_tokens=1024,
        temperature=0.3,
        do_sample=True,
        top_p=0.9,
    )
    
    response = tokenizer.decode(outputs[0], skip_special_tokens=True)
    return response.split("### Response:")[-1].strip()

# Test
print(ask_python_assistant("How do I read a JSON file in Python?"))
```

---

## ⚠️ Common Mistakes

### 1. Wrong Model Selection

```python
# ❌ Bad - Using non-optimized model
model, tokenizer = FastLanguageModel.from_pretrained(
    "meta-llama/Llama-3-8B",  # Regular model
)

# ✅ Good - Use Unsloth pre-quantized models
model, tokenizer = FastLanguageModel.from_pretrained(
    "unsloth/llama-3-8b-bnb-4bit",  # Optimized!
)
```

### 2. Gradient Checkpointing Not Set

```python
# ❌ Bad - Missing gradient checkpointing
model = FastLanguageModel.get_peft_model(
    model,
    r=16,
    # No gradient checkpointing!
)

# ✅ Good - Enable Unsloth gradient checkpointing
model = FastLanguageModel.get_peft_model(
    model,
    r=16,
    use_gradient_checkpointing="unsloth",  # 30% less memory!
)
```

### 3. Not Switching to Inference Mode

```python
# ❌ Bad - Training mode for inference
outputs = model.generate(**inputs)  # Slow!

# ✅ Good - Enable inference mode
FastLanguageModel.for_inference(model)  # Enable optimizations
outputs = model.generate(**inputs)  # Fast!
```

### 4. Wrong Learning Rate

```python
# ❌ Bad - Too high for LoRA
learning_rate=1e-3  # Will destabilize!

# ✅ Good - Typical LoRA range
learning_rate=2e-4  # Works well
# Or even lower for larger models
learning_rate=5e-5
```

---

## 🎯 Interview Questions

### Q1: What is Unsloth and how does it achieve faster training?

**Answer:**
Unsloth is a library that speeds up LLM fine-tuning 2-5x through:

1. **Custom CUDA kernels:** Fused operations reduce memory bandwidth
2. **Optimized RoPE:** Precomputed position embeddings
3. **Chunked cross-entropy:** Avoids materializing huge logit tensors
4. **Smart gradient checkpointing:** Recomputes instead of storing
5. **Memory-efficient LoRA:** Optimized backward pass

Result: Fine-tune 7B models on 16GB GPUs!

---

### Q2: Explain the memory savings in Unsloth.

**Answer:**

| Optimization | Memory Saved |
|--------------|--------------|
| 4-bit quantization | 75% |
| Gradient checkpointing | 30% |
| Chunked cross-entropy | 20% |
| Optimized activations | 20% |

**Example:**
- Standard Llama-3-8B training: ~40GB VRAM
- Unsloth Llama-3-8B training: ~8GB VRAM

Key technique: Trade compute for memory (recompute vs store).

---

### Q3: When should you use Unsloth vs standard training?

**Answer:**

**Use Unsloth when:**
- Consumer GPU (RTX 3090, 4090)
- Need fast iteration
- LoRA/QLoRA fine-tuning
- Models up to 70B

**Use standard when:**
- Full fine-tuning needed
- Research requiring custom modifications
- Unsupported model architectures
- Already have A100/H100 cluster

---

### Q4: How do you export Unsloth models?

**Answer:**

```python
# 1. LoRA adapters only (smallest)
model.save_pretrained("model_lora")

# 2. Merged model (16-bit)
model.save_pretrained_merged("model_merged", save_method="merged_16bit")

# 3. GGUF for Ollama/llama.cpp
model.save_pretrained_gguf("model_gguf", quantization_method="q4_k_m")

# Quantization options:
# - q4_k_m: Good balance (recommended)
# - q8_0: Higher quality
# - q2_k: Smallest size
```

---

### Q5: Compare LoRA rank settings and their effects.

**Answer:**

| Rank (r) | Params | Memory | Capacity | Use Case |
|----------|--------|--------|----------|----------|
| 8 | 0.4% | Low | Low | Quick experiments |
| 16 | 0.8% | Medium | Medium | Most fine-tuning |
| 32 | 1.6% | Higher | High | Complex tasks |
| 64 | 3.2% | High | Highest | Domain adaptation |

**Rule of thumb:**
- Simple task (style, format): r=8
- General fine-tuning: r=16
- Complex reasoning: r=32-64

---

## 📝 Homework

### Level 1: Basic
1. Install Unsloth and verify GPU detection
2. Fine-tune Llama-3-8B on 100 examples
3. Test generation quality before/after

### Level 2: Intermediate
1. Fine-tune on a custom dataset (1000+ examples)
2. Experiment with different LoRA ranks
3. Export to GGUF and run in Ollama

### Level 3: Advanced
1. Implement DPO training with Unsloth
2. Create a multi-task fine-tuned model
3. Benchmark against standard HuggingFace training

### Level 4: Expert
1. Fine-tune a 70B model on limited hardware
2. Implement continued pre-training on domain corpus
3. Build an evaluation pipeline for your fine-tuned model

---

## 🔗 Resources

- [Unsloth GitHub](https://github.com/unslothai/unsloth)
- [Unsloth Wiki](https://github.com/unslothai/unsloth/wiki)
- [Unsloth Notebooks](https://github.com/unslothai/unsloth/tree/main/notebooks)
- [LoRA Paper](https://arxiv.org/abs/2106.09685)
- [QLoRA Paper](https://arxiv.org/abs/2305.14314)

---

**Next:** [04-MoE.md](./04-MoE.md) - Mixture of Experts Architecture
