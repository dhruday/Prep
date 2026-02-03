# 📘 Unsloth - Fast & Memory-Efficient Fine-Tuning

## 🎯 Purpose (Why Unsloth Exists)

Imagine you want to fine-tune a large language model. The **traditional approach (2023)**:

```javascript
// Traditional fine-tuning is SLOW and EXPENSIVE
const finetuningStats = {
  model: 'Llama 3 8B',
  dataset: '10,000 examples',
  hardware: 'NVIDIA A100 (80GB)',
  
  // Traditional approach
  traditional: {
    time: '24 hours',
    cost: '$48 (24h × $2/hour)',
    memory: '72GB VRAM',
    speed: '100 tokens/sec'
  },
  
  // With Unsloth
  unsloth: {
    time: '6 hours',           // 4x faster ✅
    cost: '$12 (6h × $2/hour)', // 4x cheaper ✅
    memory: '32GB VRAM',        // 2x less memory ✅
    speed: '400 tokens/sec'     // 4x faster ✅
  }
};

// Unsloth saves: $36 and 18 hours per training run
```

**The Problems Unsloth Solves:**

### 1. **Slow Training Speed**
```python
# Without Unsloth
from transformers import Trainer

trainer = Trainer(...)
trainer.train()  # 24 hours for 10K examples

# With Unsloth
from unsloth import FastLanguageModel

model = FastLanguageModel.from_pretrained(...)
trainer = Trainer(model=model, ...)
trainer.train()  # 6 hours for same 10K examples (4x faster!)
```

### 2. **Massive Memory Usage**
```python
# Without Unsloth: OOM (Out of Memory)
model = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-3-8B")
# RuntimeError: CUDA out of memory. Tried to allocate 72GB > Available 40GB

# With Unsloth: Fits easily
model = FastLanguageModel.from_pretrained("unsloth/llama-3-8b")
# Uses only 32GB VRAM ✅
```

### 3. **Expensive Cloud Costs**
```javascript
// Cost comparison for fine-tuning Llama 3 8B
const costs = {
  dataset: '10,000 examples',
  epochs: 3,
  
  huggingFace: {
    gpu: 'A100 80GB',
    time: '24 hours',
    hourlyRate: 2.00,
    totalCost: 48.00
  },
  
  unsloth: {
    gpu: 'A100 40GB',  // Can use smaller GPU!
    time: '6 hours',
    hourlyRate: 1.50,   // Cheaper GPU
    totalCost: 9.00
  },
  
  savings: '$39 per training run',
  annualSavings: '$39 × 100 runs = $3,900'
};
```

**Real-World Impact:**
- Unsloth enables fine-tuning on consumer GPUs (RTX 3090, 4090)
- Startups can iterate faster with 4x speed improvements
- Researchers can experiment more with lower costs
- Supports all major architectures (Llama, Mistral, Gemma, Qwen, Phi)

---

## 📚 What Unsloth Actually Is

**Definition:**
Unsloth is a **highly optimized library** that makes fine-tuning LLMs **2-5x faster** and uses **50-70% less memory** through:

1. **Custom CUDA kernels** (optimized GPU operations)
2. **Memory-efficient attention** (Flash Attention 2)
3. **Gradient checkpointing** (trade compute for memory)
4. **4-bit quantization** (QLoRA without quality loss)
5. **Optimized LoRA implementation** (faster parameter updates)

**Core Innovation: Manual Kernel Fusion**

```javascript
// Traditional PyTorch (2023)
// Each operation is separate, causes memory overhead

function traditionalAttention(Q, K, V) {
  // Step 1: Matrix multiply (separate kernel)
  const scores = matmul(Q, transpose(K));
  
  // Step 2: Scale (separate kernel)
  const scaledScores = divide(scores, Math.sqrt(d_k));
  
  // Step 3: Softmax (separate kernel)
  const weights = softmax(scaledScores);
  
  // Step 4: Dropout (separate kernel)
  const droppedWeights = dropout(weights);
  
  // Step 5: Matrix multiply (separate kernel)
  const output = matmul(droppedWeights, V);
  
  // Total: 5 GPU kernel launches
  // Problem: Each launch has overhead + memory copies
  return output;
}

// Unsloth's Optimized Approach
function unslothAttention(Q, K, V) {
  // All operations fused into ONE GPU kernel
  // No intermediate memory allocation
  // No kernel launch overhead
  
  const output = fusedAttentionKernel(Q, K, V);
  
  // Total: 1 GPU kernel launch
  // Result: 3-5x faster, 50% less memory
  return output;
}
```

**What Makes Unsloth Special:**

### 1. **Drop-in Replacement**
```python
# Traditional Hugging Face (slow)
from transformers import AutoModelForCausalLM
model = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-3-8B")

# Unsloth (fast) - Just change 2 lines!
from unsloth import FastLanguageModel
model = FastLanguageModel.from_pretrained("unsloth/llama-3-8b")

# Everything else stays the same
# Your training code, dataset, etc. - no changes needed ✅
```

### 2. **Pre-Optimized Models**
```
Unsloth provides pre-patched models:
• unsloth/llama-3-8b
• unsloth/llama-3-70b
• unsloth/mistral-7b
• unsloth/gemma-7b
• unsloth/qwen-2-7b
• unsloth/phi-3-mini

All models include:
• Flash Attention 2
• RMS Norm optimization
• Cross Entropy optimization
• Rope Embedding optimization
```

### 3. **Automatic Optimizations**
```python
# Unsloth automatically applies:
# ✅ Flash Attention 2
# ✅ Gradient checkpointing
# ✅ Mixed precision training
# ✅ Memory-efficient backward pass
# ✅ Fused optimizer steps
# ✅ Efficient LoRA operations

# You just call:
model = FastLanguageModel.from_pretrained(...)

# All optimizations applied automatically!
```

---

## 🔧 How Unsloth Works (Intuition)

**Think of Traditional Training Like Commuting:**

```
Traditional PyTorch (Separate Trips):
┌────────────┐      ┌────────────┐      ┌────────────┐
│ Get Coffee │ ────►│  Gym       │ ────►│ Office     │
│ (kernel 1) │      │ (kernel 2) │      │ (kernel 3) │
└────────────┘      └────────────┘      └────────────┘
    10 min              20 min              15 min
    + 5 min drive       + 5 min drive       
                        
Total time: 55 minutes (lots of overhead from driving)

Unsloth (Batch Errands):
┌────────────────────────────────────────────────┐
│ Coffee → Gym → Office (all in one trip)       │
│ (single fused kernel)                          │
└────────────────────────────────────────────────┘
Total time: 35 minutes (no driving overhead)

Savings: 20 minutes = 36% faster ✅
```

**Technical Breakdown:**

### 1. **Kernel Fusion**

```python
# Traditional: 5 separate GPU operations
def slow_attention_backward(dOutput, Q, K, V):
    # Each line launches a separate GPU kernel
    dV = matmul(attention_weights.T, dOutput)      # Kernel 1
    dWeights = matmul(dOutput, V.T)                # Kernel 2
    dScores = dWeights * softmax_derivative        # Kernel 3
    dQ = matmul(dScores, K)                        # Kernel 4
    dK = matmul(dScores.T, Q)                      # Kernel 5
    return dQ, dK, dV

# Unsloth: 1 fused GPU operation
def fast_attention_backward(dOutput, Q, K, V):
    # All operations combined into single kernel
    dQ, dK, dV = fused_attention_backward_kernel(dOutput, Q, K, V)
    return dQ, dK, dV
```

### 2. **Flash Attention 2**

```javascript
// Traditional attention: O(N²) memory
function traditionalAttention(Q, K, V) {
  // Problem: Store full NxN attention matrix
  const scores = matmul(Q, K.T);  // Shape: [N, N]
  // For N=4096 (context length), this is 16M floats = 64MB per layer
  
  const weights = softmax(scores);
  const output = matmul(weights, V);
  
  // Memory: O(N²) - explodes with long sequences
  return output;
}

// Flash Attention: O(N) memory
function flashAttention(Q, K, V) {
  // Split sequence into blocks
  // Process block-by-block
  // Never materialize full NxN matrix
  
  let output = zeros(N, d);
  
  for (let block of blocks) {
    // Process small chunk (e.g., 128 tokens)
    const blockScores = matmul(Q[block], K[block].T);
    const blockWeights = softmax(blockScores);
    output[block] = matmul(blockWeights, V[block]);
  }
  
  // Memory: O(N) - linear scaling ✅
  return output;
}
```

### 3. **Gradient Checkpointing**

```javascript
// Without checkpointing: Store all activations
function forwardPass(x, layers) {
  const activations = [];
  
  for (let layer of layers) {
    x = layer.forward(x);
    activations.push(x);  // Store for backward pass
  }
  
  // Memory: O(number_of_layers × batch_size × sequence_length)
  // For Llama 3 8B: ~72GB VRAM
  return { output: x, activations };
}

// With checkpointing: Only store some activations
function forwardPassWithCheckpointing(x, layers) {
  const checkpoints = [];
  
  for (let i = 0; i < layers.length; i++) {
    x = layers[i].forward(x);
    
    // Only save every 4th layer
    if (i % 4 === 0) {
      checkpoints.push(x);
    }
    // Other activations discarded
  }
  
  // During backward:
  // Recompute the discarded activations on-the-fly
  
  // Memory: O(number_of_layers / 4)
  // For Llama 3 8B: ~32GB VRAM ✅
  // Trade-off: 20% slower, but 2x less memory
  return { output: x, checkpoints };
}
```

---

## 🧮 How Unsloth Works (Technical Details)

### Python Production Implementation

**1. Basic Unsloth Fine-Tuning:**

```python
# install: pip install unsloth
from unsloth import FastLanguageModel
from datasets import load_dataset
from trl import SFTTrainer
from transformers import TrainingArguments
import torch

# Step 1: Load optimized model
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="unsloth/llama-3-8b",
    max_seq_length=2048,
    dtype=None,  # Auto-detect (fp16 for T4, bf16 for Ampere+)
    load_in_4bit=True,  # 4-bit quantization for memory efficiency
)

# Step 2: Configure LoRA (efficient fine-tuning)
model = FastLanguageModel.get_peft_model(
    model,
    r=16,  # LoRA rank
    target_modules=[
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj"
    ],
    lora_alpha=16,
    lora_dropout=0,  # Unsloth supports 0 dropout for 2x speed
    bias="none",
    use_gradient_checkpointing="unsloth",  # Unsloth's optimized checkpointing
    random_state=42,
)

# Step 3: Prepare dataset
dataset = load_dataset("tatsu-lab/alpaca", split="train")

def format_prompts(examples):
    """Format data for instruction tuning"""
    texts = []
    for instruction, input_text, output in zip(
        examples["instruction"],
        examples["input"],
        examples["output"]
    ):
        text = f"""Below is an instruction that describes a task.

### Instruction:
{instruction}

### Input:
{input_text}

### Response:
{output}"""
        texts.append(text)
    return {"text": texts}

dataset = dataset.map(format_prompts, batched=True)

# Step 4: Configure training
training_args = TrainingArguments(
    output_dir="./outputs",
    per_device_train_batch_size=2,
    gradient_accumulation_steps=4,
    warmup_steps=10,
    max_steps=100,
    learning_rate=2e-4,
    fp16=not torch.cuda.is_bf16_supported(),
    bf16=torch.cuda.is_bf16_supported(),
    logging_steps=1,
    optim="adamw_8bit",  # 8-bit optimizer for memory efficiency
    weight_decay=0.01,
    lr_scheduler_type="linear",
    seed=42,
)

# Step 5: Train with Unsloth optimizations
trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    dataset_text_field="text",
    max_seq_length=2048,
    args=training_args,
)

# Training is now 2-5x faster!
trainer.train()

# Step 6: Save model
model.save_pretrained("./finetuned_model")
tokenizer.save_pretrained("./finetuned_model")

print("✅ Fine-tuning complete!")
```

**2. Advanced: Multi-GPU Training:**

```python
from unsloth import FastLanguageModel
from accelerate import Accelerator
import torch.distributed as dist

# Initialize distributed training
accelerator = Accelerator()

# Load model (automatically distributed across GPUs)
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="unsloth/llama-3-70b",  # Larger model
    max_seq_length=4096,
    dtype=torch.bfloat16,
    load_in_4bit=True,
)

# Unsloth automatically handles:
# • Model sharding across GPUs
# • Gradient synchronization
# • Efficient all-reduce operations

model = FastLanguageModel.get_peft_model(model, r=32)

# Prepare for distributed training
model, optimizer, dataloader = accelerator.prepare(
    model, optimizer, dataloader
)

# Train (Unsloth optimizes communication between GPUs)
for batch in dataloader:
    outputs = model(**batch)
    loss = outputs.loss
    
    # Backward pass (optimized by Unsloth)
    accelerator.backward(loss)
    
    optimizer.step()
    optimizer.zero_grad()

# Result: Near-linear scaling across GPUs
# 2 GPUs = ~1.9x faster
# 4 GPUs = ~3.7x faster
# 8 GPUs = ~7.2x faster
```

**3. Exporting Models:**

```python
from unsloth import FastLanguageModel

# Load fine-tuned model
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="./finetuned_model",
    max_seq_length=2048,
    dtype=None,
    load_in_4bit=True,
)

# Export to various formats

# 1. Hugging Face format (standard)
model.save_pretrained_merged(
    "./hf_model",
    tokenizer,
    save_method="merged_16bit"  # or "merged_4bit", "lora"
)

# 2. GGUF format (for llama.cpp / Ollama)
model.save_pretrained_gguf(
    "./gguf_model",
    tokenizer,
    quantization_method="q4_k_m"  # or "q5_k_m", "q8_0"
)

# 3. vLLM format (for fast inference)
model.save_pretrained_merged(
    "./vllm_model",
    tokenizer,
    save_method="merged_16bit"
)

print("✅ Model exported in multiple formats")
```

**4. Benchmarking:**

```python
import time
from unsloth import FastLanguageModel
from transformers import AutoModelForCausalLM

def benchmark_speed():
    """Compare Unsloth vs standard training speed"""
    
    # Standard Hugging Face
    print("Loading standard model...")
    standard_model = AutoModelForCausalLM.from_pretrained(
        "meta-llama/Llama-3-8B"
    )
    
    # Unsloth
    print("Loading Unsloth model...")
    fast_model, _ = FastLanguageModel.from_pretrained(
        "unsloth/llama-3-8b"
    )
    
    # Dummy data
    batch = {
        "input_ids": torch.randint(0, 32000, (4, 512)).cuda(),
        "attention_mask": torch.ones(4, 512).cuda(),
        "labels": torch.randint(0, 32000, (4, 512)).cuda()
    }
    
    # Benchmark standard model
    standard_model.cuda()
    start = time.time()
    for _ in range(100):
        outputs = standard_model(**batch)
        loss = outputs.loss
        loss.backward()
    standard_time = time.time() - start
    
    # Benchmark Unsloth
    start = time.time()
    for _ in range(100):
        outputs = fast_model(**batch)
        loss = outputs.loss
        loss.backward()
    unsloth_time = time.time() - start
    
    speedup = standard_time / unsloth_time
    
    print(f"Standard: {standard_time:.2f}s")
    print(f"Unsloth:  {unsloth_time:.2f}s")
    print(f"Speedup:  {speedup:.2f}x faster ✅")

benchmark_speed()

# Typical results:
# Standard: 45.32s
# Unsloth:  11.84s
# Speedup:  3.83x faster ✅
```

**5. Memory Profiling:**

```python
import torch
from unsloth import FastLanguageModel

def profile_memory():
    """Compare memory usage"""
    
    # Clear cache
    torch.cuda.empty_cache()
    
    # Measure Unsloth memory
    torch.cuda.reset_peak_memory_stats()
    
    model, tokenizer = FastLanguageModel.from_pretrained(
        "unsloth/llama-3-8b",
        max_seq_length=2048,
        load_in_4bit=True
    )
    
    # Dummy forward pass
    inputs = tokenizer("Hello world", return_tensors="pt").to("cuda")
    outputs = model(**inputs)
    loss = outputs.logits.sum()
    loss.backward()
    
    unsloth_memory = torch.cuda.max_memory_allocated() / 1e9  # GB
    
    # Clear for standard model
    del model
    torch.cuda.empty_cache()
    torch.cuda.reset_peak_memory_stats()
    
    # Measure standard memory
    from transformers import AutoModelForCausalLM
    
    standard_model = AutoModelForCausalLM.from_pretrained(
        "meta-llama/Llama-3-8B",
        torch_dtype=torch.float16
    ).cuda()
    
    outputs = standard_model(**inputs)
    loss = outputs.logits.sum()
    loss.backward()
    
    standard_memory = torch.cuda.max_memory_allocated() / 1e9  # GB
    
    reduction = (1 - unsloth_memory / standard_memory) * 100
    
    print(f"Standard memory: {standard_memory:.2f} GB")
    print(f"Unsloth memory:  {unsloth_memory:.2f} GB")
    print(f"Reduction:       {reduction:.1f}% less memory ✅")

profile_memory()

# Typical results:
# Standard memory: 68.45 GB
# Unsloth memory:  28.32 GB
# Reduction:       58.6% less memory ✅
```

---

## 🎨 Visual Explanation

**Training Speed Comparison:**

```
Training Llama 3 8B (10K examples, 3 epochs):

Standard Transformers:
[████████████████████████] 24 hours
Cost: $48

Unsloth:
[██████] 6 hours
Cost: $12

Speedup: 4x faster, 75% cost savings
```

**Memory Usage:**

```
VRAM Usage (Llama 3 8B training):

Standard:
[████████████████████████████████] 72GB VRAM
Requires: A100 80GB

Unsloth:
[████████████████] 32GB VRAM
Runs on: RTX 4090 24GB + CPU offload

Memory Reduction: 56%
```

**Where Speedup Comes From:**

```
Component                Standard    Unsloth    Speedup
────────────────────────────────────────────────────────
Attention (forward)      100 ms      30 ms      3.3x
Attention (backward)     150 ms      40 ms      3.8x
RMS Norm                 20 ms       5 ms       4.0x
Cross Entropy Loss       80 ms       20 ms      4.0x
LoRA Updates             60 ms       20 ms      3.0x
────────────────────────────────────────────────────────
Total per step           410 ms      115 ms     3.6x
```

---

## 💡 Simple Example

**Fine-Tune Llama 3 in 10 Minutes:**

```python
# quickstart.py
from unsloth import FastLanguageModel
from datasets import load_dataset
from trl import SFTTrainer
from transformers import TrainingArguments

# 1. Load model (2 minutes)
model, tokenizer = FastLanguageModel.from_pretrained(
    "unsloth/llama-3-8b",
    max_seq_length=512,
    load_in_4bit=True
)

# 2. Add LoRA adapters (30 seconds)
model = FastLanguageModel.get_peft_model(model, r=16)

# 3. Load tiny dataset (30 seconds)
dataset = load_dataset("tatsu-lab/alpaca", split="train[:100]")  # Just 100 examples

# 4. Train (6 minutes)
trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    dataset_text_field="text",
    max_seq_length=512,
    args=TrainingArguments(
        output_dir="./output",
        per_device_train_batch_size=4,
        max_steps=20,
        learning_rate=2e-4
    )
)

trainer.train()

# 5. Save (1 minute)
model.save_pretrained("./my_model")

print("✅ Done! You just fine-tuned Llama 3 in ~10 minutes")
```

---

## 🌍 Real-World Applications

### 1. **Rapid Prototyping**
```python
# Iterate on custom models quickly
models_to_try = [
    ("unsloth/llama-3-8b", "general purpose"),
    ("unsloth/mistral-7b", "fast inference"),
    ("unsloth/phi-3-mini", "small size"),
]

for model_name, description in models_to_try:
    print(f"Training {description}...")
    
    model, tokenizer = FastLanguageModel.from_pretrained(model_name)
    # ... train for 1 hour instead of 4 hours
    
    # Test performance
    score = evaluate(model)
    print(f"{description}: {score}")

# Result: Test 3 models in same time as 1 traditional model
```

### 2. **Domain Adaptation**
```python
# Adapt LLM to specific domain (medical, legal, etc.)
class DomainAdapter:
    def __init__(self, base_model="unsloth/llama-3-8b"):
        self.model, self.tokenizer = FastLanguageModel.from_pretrained(base_model)
        self.model = FastLanguageModel.get_peft_model(self.model, r=32)
    
    def adapt_to_domain(self, domain_dataset):
        """Fine-tune on domain-specific data"""
        trainer = SFTTrainer(...)
        trainer.train()
        
        # With Unsloth: Complete in hours instead of days
        return self.model

# Medical domain
medical_adapter = DomainAdapter()
medical_model = medical_adapter.adapt_to_domain(medical_papers_dataset)

# Legal domain
legal_adapter = DomainAdapter()
legal_model = legal_adapter.adapt_to_domain(legal_documents_dataset)
```

### 3. **Personal AI Assistants**
```python
# Fine-tune on your personal data
personal_conversations = [
    "My favorite food is pizza",
    "I work as a software engineer",
    "I prefer Python over JavaScript",
    # ... your personal preferences
]

model, tokenizer = FastLanguageModel.from_pretrained("unsloth/llama-3-8b")
model = FastLanguageModel.get_peft_model(model, r=8)

# Train on personal data (completes in minutes with Unsloth)
trainer = SFTTrainer(...)
trainer.train()

# Now model knows your preferences
response = generate(model, "What's my favorite food?")
# "Based on what you've told me, your favorite food is pizza!"
```

### 4. **Multi-Task Learning**
```python
# Train one model on multiple tasks efficiently
tasks = {
    "translation": translation_dataset,
    "summarization": summary_dataset,
    "qa": qa_dataset,
    "code": code_dataset
}

model, tokenizer = FastLanguageModel.from_pretrained("unsloth/llama-3-8b")

for task_name, dataset in tasks.items():
    print(f"Training on {task_name}...")
    
    # Add task-specific LoRA
    model = FastLanguageModel.get_peft_model(
        model,
        r=16,
        task_name=task_name  # Separate adapters per task
    )
    
    trainer = SFTTrainer(model=model, train_dataset=dataset)
    trainer.train()  # Fast with Unsloth!

# Result: One model handles multiple tasks
```

---

## ❌ Common Misconceptions

### ❌ "Unsloth sacrifices quality for speed"
**Reality:** Unsloth maintains quality while speeding up:

```python
# Benchmark on standard datasets
results = {
    "Standard Llama 3": {
        "MMLU": 68.5,
        "HellaSwag": 82.3,
        "TruthfulQA": 51.2,
        "training_time": "24h"
    },
    "Unsloth Llama 3": {
        "MMLU": 68.3,  # -0.2% (within noise)
        "HellaSwag": 82.1,  # -0.2% (within noise)
        "TruthfulQA": 51.4,  # +0.2% (within noise)
        "training_time": "6h"  # 4x faster
    }
}

# Quality is effectively identical
# Speed improvements come from optimized operations, not shortcuts
```

### ❌ "You need to rewrite your code for Unsloth"
**Reality:** Just change model loading:

```python
# Before (2 lines)
from transformers import AutoModelForCausalLM
model = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-3-8B")

# After (2 lines) - everything else stays the same!
from unsloth import FastLanguageModel
model, tokenizer = FastLanguageModel.from_pretrained("unsloth/llama-3-8b")

# Your training code doesn't change
trainer = Trainer(...)  # Same code
trainer.train()  # Same code
```

### ❌ "Unsloth only works with specific models"
**Reality:** Supports all major architectures:

```python
supported_models = [
    "Llama (1, 2, 3, 3.1)",
    "Mistral",
    "Mixtral",
    "Gemma",
    "Phi-3",
    "Qwen2",
    "CodeLlama",
    "TinyLlama",
    # And more - anything with similar architecture
]

# If model uses standard transformer architecture, Unsloth likely supports it
```

### ❌ "Faster training means less stable"
**Reality:** Unsloth improves numerical stability:

```python
# Standard training can have gradient issues
standard_gradients = [0.001, 0.002, float('inf'), 0.003]  # ❌ Exploding gradient

# Unsloth uses:
# • Better precision handling
# • Gradient clipping by default
# • Stable attention computations

unsloth_gradients = [0.001, 0.002, 0.0025, 0.003]  # ✅ Stable
```

---

## ✅ Best Practices

### 1. **Choosing Hyperparameters**

```python
# Recommended settings for Unsloth
from unsloth import FastLanguageModel

model, tokenizer = FastLanguageModel.from_pretrained(
    "unsloth/llama-3-8b",
    max_seq_length=2048,  # Use 2048-4096 for most tasks
    dtype=None,  # Auto-detect best precision
    load_in_4bit=True,  # Always use for memory efficiency
)

model = FastLanguageModel.get_peft_model(
    model,
    r=16,  # Good default (8-64 depending on task complexity)
    lora_alpha=16,  # Usually same as r
    lora_dropout=0,  # Unsloth supports 0 for extra speed
    target_modules=[  # All linear layers for best results
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj"
    ],
    use_gradient_checkpointing="unsloth",  # Unsloth's optimized version
)

training_args = TrainingArguments(
    per_device_train_batch_size=2,  # Adjust based on VRAM
    gradient_accumulation_steps=4,   # Effective batch_size = 2 * 4 = 8
    warmup_ratio=0.1,  # 10% warmup
    num_train_epochs=3,
    learning_rate=2e-4,  # Good default for LoRA
    fp16=not torch.cuda.is_bf16_supported(),
    bf16=torch.cuda.is_bf16_supported(),  # Use bf16 if available
    optim="adamw_8bit",  # Memory-efficient optimizer
    logging_steps=10,
    save_steps=100,
)
```

### 2. **Memory Optimization**

```python
# If you're running out of memory:

# Strategy 1: Reduce batch size
per_device_train_batch_size=1  # Minimum
gradient_accumulation_steps=8   # Maintain effective batch size

# Strategy 2: Reduce sequence length
max_seq_length=1024  # Instead of 2048

# Strategy 3: Use more aggressive checkpointing
use_gradient_checkpointing="unsloth"  # Already optimal

# Strategy 4: Reduce LoRA rank
r=8  # Instead of 16 (trades quality for memory)

# Strategy 5: Use smaller model
model = "unsloth/llama-3-8b"  # Instead of 70b

# Strategy 6: Enable CPU offloading
load_in_4bit=True
device_map="auto"  # Automatically offload to CPU when needed
```

### 3. **Speed Optimization**

```python
# Maximize training speed:

# 1. Use Unsloth's optimized checkpointing
use_gradient_checkpointing="unsloth"  # Not True

# 2. Disable dropout for LoRA (2x faster)
lora_dropout=0

# 3. Use largest batch size that fits
per_device_train_batch_size=4  # Max your VRAM allows

# 4. Use bf16 if available (faster than fp16 on Ampere+ GPUs)
bf16=torch.cuda.is_bf16_supported()

# 5. Use 8-bit optimizer
optim="adamw_8bit"

# 6. Disable unnecessary logging
logging_steps=100  # Not every step

# 7. Compile model (PyTorch 2.0+)
torch.compile(model)  # Extra 10-20% speedup
```

### 4. **Quality Optimization**

```python
# Maximize fine-tuning quality:

# 1. Use higher LoRA rank
r=32  # Or 64 for complex tasks (default 16)

# 2. Target more modules
target_modules=[
    "q_proj", "k_proj", "v_proj", "o_proj",
    "gate_proj", "up_proj", "down_proj",
    "embed_tokens", "lm_head"  # Include embeddings
]

# 3. Use more training steps
num_train_epochs=5  # Instead of 3

# 4. Better learning rate schedule
lr_scheduler_type="cosine"  # Instead of linear
warmup_ratio=0.1

# 5. Higher quality data
# Filter/clean dataset before training
dataset = dataset.filter(lambda x: len(x["text"]) > 100)

# 6. Use validation set for early stopping
evaluation_strategy="steps"
eval_steps=100
load_best_model_at_end=True
```

---

## 🎯 Key Takeaways

1. **Unsloth = 2-5x Faster Fine-Tuning**
   - Custom CUDA kernels
   - Flash Attention 2
   - Memory optimizations

2. **50-70% Less Memory**
   - Gradient checkpointing
   - 4-bit quantization
   - Efficient backward pass

3. **Zero Quality Loss**
   - Optimizations are mathematical equivalents
   - Maintains model accuracy
   - Sometimes more stable than standard training

4. **Drop-In Replacement**
   - Change 2 lines of code
   - Works with existing training pipelines
   - Compatible with Hugging Face ecosystem

5. **Cost Savings**
   - Smaller GPUs needed
   - Faster training = lower cloud costs
   - Enables consumer GPU fine-tuning

---

## ✅ Review Questions

1. What are the three main sources of speedup in Unsloth?
2. How does kernel fusion reduce training time?
3. What is the trade-off of gradient checkpointing?
4. Why can Unsloth use 0 dropout for LoRA?
5. How does Flash Attention 2 reduce memory usage?

---

## 🧩 Practice Problems

### Beginner
1. Install Unsloth and fine-tune Llama 3 on a small dataset
2. Compare training time between standard transformers and Unsloth
3. Export your fine-tuned model to GGUF format

### Intermediate
4. Fine-tune a model on your own custom dataset
5. Implement multi-GPU training with Unsloth
6. Profile memory usage and optimize for your GPU

### Advanced
7. Fine-tune Llama 3 70B on a consumer GPU using Unsloth
8. Implement curriculum learning with progressive fine-tuning
9. Create a model merging pipeline combining multiple LoRA adapters
10. Benchmark Unsloth against other optimization libraries

---

## 🚀 Mini Project: Build a Personal Coding Assistant

**Goal:** Fine-tune a model on your own code to create a personalized coding assistant.

**Steps:**

1. **Collect Data:**
   - Extract code from your GitHub repos
   - Format as instruction-response pairs
   - "Instruction: Write a function to... Response: [your code]"

2. **Fine-Tune with Unsloth:**
   - Use CodeLlama as base model
   - Fine-tune on your coding style
   - Should complete in <2 hours with Unsloth

3. **Deploy:**
   - Export to GGUF
   - Run locally with Ollama
   - Create VSCode extension or CLI tool

4. **Test:**
   - "Write a function like I would write it"
   - Should match your style, naming conventions, comments

**Bonus:**
- Add multi-language support
- Fine-tune on git commit messages for auto-generated commits
- Create PR description generator

---

**Next Topic:** Mixture of Experts - Sparse models for efficiency! 🚀
