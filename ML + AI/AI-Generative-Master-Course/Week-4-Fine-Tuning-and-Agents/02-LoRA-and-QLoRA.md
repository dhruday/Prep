# 🔧 LoRA and QLoRA: Parameter-Efficient Fine-Tuning

## 📚 Table of Contents
1. [Beginner Friendly Explanation](#-beginner-friendly-explanation)
2. [Deep Technical Breakdown](#-deep-technical-breakdown)
3. [LoRA Mathematics](#-lora-mathematics)
4. [QLoRA: Quantized LoRA](#-qlora-quantized-lora)
5. [Code Implementation](#-code-implementation)
6. [Real World Use Cases](#-real-world-use-cases)
7. [Mini Project](#-mini-project)
8. [Common Mistakes](#-common-mistakes)
9. [Interview Questions](#-interview-questions)
10. [Homework](#-homework)

---

## 🔰 Beginner Friendly Explanation

### The Problem: Models Are HUGE

```
Model Sizes:
├── GPT-2:       1.5 billion parameters
├── LLaMA-7B:    7 billion parameters
├── LLaMA-70B:   70 billion parameters
├── GPT-3:       175 billion parameters
└── GPT-4:       ~1.8 trillion parameters (estimated)

Memory Requirements (Full Fine-Tuning):
├── 7B model:    28 GB (FP32) or 14 GB (FP16)
├── 13B model:   52 GB (FP32) or 26 GB (FP16)
├── 70B model:   280 GB (FP32) or 140 GB (FP16)
└── Your GPU:    8-24 GB (typical)

Problem: YOU CAN'T FINE-TUNE THESE ON YOUR GPU!
```

### LoRA: The Elegant Solution

**Analogy: The Adjustment Knobs**

```
Imagine a huge mixing board (audio console):

Full Fine-Tuning:
├── Replace ENTIRE mixing board
├── Cost: $1,000,000
├── Time: Months
└── Space: Need huge studio

LoRA Approach:
├── Add SMALL adjustment knobs
├── Keep original board intact
├── Cost: $100
├── Time: Hours
└── Space: Fits anywhere

The small knobs can achieve 95% of what
replacing the whole board would do!
```

### Visual Intuition

```
Original Model (7B parameters):
┌─────────────────────────────────────────┐
│  ████████████████████████████████████  │
│  ████████████████████████████████████  │
│  ████████████████████████████████████  │
│  ████████████████████████████████████  │
│  (7,000,000,000 parameters - FROZEN)   │
└─────────────────────────────────────────┘

LoRA Adapters (few million parameters):
┌─────┐     ┌─────┐
│ ▓▓▓ │     │ ▓▓▓ │
│ ▓▓▓ │     │ ▓▓▓ │  ← Only these are trained!
└─────┘     └─────┘
  (4-8 million parameters)

Result: Train 0.1% of parameters, get 95%+ of performance!
```

### Why Does This Work?

```
Key Insight from Research:
┌─────────────────────────────────────────────────┐
│  "The weight changes during fine-tuning have   │
│   LOW INTRINSIC RANK"                          │
│                                                 │
│  Meaning: You don't need to change EVERYTHING  │
│  to adapt to a new task.                       │
│                                                 │
│  Most adaptation can be captured in a          │
│  low-dimensional subspace!                     │
└─────────────────────────────────────────────────┘

Translation:
Pre-trained model = Expert chef knowing everything
Fine-tuning = Teaching them YOUR recipes

You don't re-teach cooking basics!
You just add small adjustments!
```

---

## 🎯 Deep Technical Breakdown

### The Core LoRA Idea

```
Standard Neural Network Layer:
┌─────────────────────────────────────┐
│  Input x                            │
│    ↓                                │
│  W (weight matrix, d×d)             │
│    ↓                                │
│  Output: y = Wx                     │
└─────────────────────────────────────┘

Full Fine-Tuning:
├── Train W directly
├── W_new = W_old + ΔW
├── ΔW has FULL rank (d×d parameters)
└── Memory: Store entire ΔW

LoRA Fine-Tuning:
├── Keep W FROZEN
├── Add: ΔW = B × A  (low-rank decomposition)
├── A: d×r matrix, B: r×d matrix (r << d)
├── Train ONLY A and B
└── Memory: Store only A and B
```

### Low-Rank Decomposition Visual

```
Original ΔW (if full fine-tuning):
┌─────────────────────────────┐
│                             │
│     4096 × 4096 matrix      │  16.7 million parameters!
│     (16,777,216 params)     │
│                             │
└─────────────────────────────┘

LoRA Decomposition (rank r=16):
┌─────────┐   ┌─────────────────────────────┐
│         │   │                             │
│  4096   │   │           4096              │
│    ×    │ × │             ×               │
│   16    │   │            16               │
│         │   │                             │
└─────────┘   └─────────────────────────────┘
    A              B

A: 4096 × 16 = 65,536 params
B: 16 × 4096 = 65,536 params
Total: 131,072 params

Reduction: 16.7M → 0.13M = 128x fewer parameters!
```

### Architecture Diagram

```
┌────────────────────────────────────────────────────────────┐
│                     LoRA Architecture                       │
├────────────────────────────────────────────────────────────┤
│                                                             │
│   Input x                                                   │
│      │                                                      │
│      ├─────────────────┬─────────────────┐                 │
│      │                 │                 │                 │
│      ↓                 ↓                 │                 │
│  ┌────────┐       ┌─────────┐            │                 │
│  │   W    │       │    A    │  (down-project)              │
│  │(frozen)│       │  d → r  │            │                 │
│  └────────┘       └─────────┘            │                 │
│      │                 │                 │                 │
│      │                 ↓                 │                 │
│      │            ┌─────────┐            │                 │
│      │            │    B    │  (up-project)                │
│      │            │  r → d  │            │                 │
│      │            └─────────┘            │                 │
│      │                 │                 │                 │
│      │                 │ × α/r (scaling) │                 │
│      │                 │                 │                 │
│      ↓                 ↓                 │                 │
│      └────────┬────────┘                 │                 │
│               │                          │                 │
│               ↓                          │                 │
│        y = Wx + (α/r)BAx                │                 │
│                                          │                 │
└────────────────────────────────────────────────────────────┘
```

---

## 📐 LoRA Mathematics

### The LoRA Forward Pass

**Original forward pass:**
$$h = W_0 x$$

**LoRA forward pass:**
$$h = W_0 x + \frac{\alpha}{r} B A x$$

Where:
- $W_0 \in \mathbb{R}^{d \times k}$ = frozen pre-trained weights
- $A \in \mathbb{R}^{r \times k}$ = down-projection matrix
- $B \in \mathbb{R}^{d \times r}$ = up-projection matrix
- $r$ = rank (typically 4, 8, 16, 32)
- $\alpha$ = scaling factor (typically = r)

### Initialization

**Matrix A (Gaussian):**
$$A \sim \mathcal{N}(0, \sigma^2)$$

**Matrix B (Zero):**
$$B = 0$$

**Why zero-initialize B?**
- At start: $BA = 0$
- Output = original model output
- Training starts from pretrained state
- No "jump" in loss at initialization

### The Scaling Factor

**Scaling formula:**
$$\Delta W = \frac{\alpha}{r} BA$$

**Why scale by α/r?**

```
Problem: Different ranks have different magnitudes
├── rank 4:  BA contributes X
├── rank 16: BA contributes 4X (larger matrices)
├── rank 64: BA contributes 16X

Solution: Scale by α/r
├── When r changes, contribution stays similar
├── α is a hyperparameter (often α = r)
├── Makes tuning r easier

Intuition:
α controls "how much" LoRA modifies the output
r controls "expressiveness" of the modification
```

### Parameter Count Comparison

**Full fine-tuning:**
$$P_{full} = d \times k$$

**LoRA:**
$$P_{LoRA} = r \times (d + k)$$

**Ratio:**
$$\frac{P_{LoRA}}{P_{full}} = \frac{r(d + k)}{dk} \approx \frac{2r}{d} \text{ (when } d = k)$$

**Example:**
- $d = 4096$, $r = 16$
- Ratio = $\frac{2 \times 16}{4096} = 0.78\%$
- **128x reduction!**

### Where to Apply LoRA

```
Transformer Layer:
├── Self-Attention
│   ├── W_q (Query)      ← Apply LoRA ✓
│   ├── W_k (Key)        ← Apply LoRA ✓
│   ├── W_v (Value)      ← Apply LoRA ✓
│   └── W_o (Output)     ← Apply LoRA ✓
│
├── Feed-Forward Network
│   ├── W_up             ← Apply LoRA ✓
│   └── W_down           ← Apply LoRA ✓
│
└── LayerNorm            ← Usually NOT applied
    └── (very few parameters, negligible impact)

Best Practice:
Apply LoRA to Q, K, V, O matrices in attention
(This captures most of the adaptation)
```

---

## 🔥 QLoRA: Quantized LoRA

### The Memory Problem

```
Even with LoRA, you still need to load the full model!

7B Model Memory Requirements:
├── Model weights (FP16):     14 GB
├── LoRA adapters:            0.1 GB
├── Optimizer states:         8 GB (for LoRA params)
├── Gradients:                0.1 GB
├── Activations:              ~4 GB
└── Total:                    ~26 GB

Still too much for consumer GPUs!
```

### QLoRA: The Breakthrough

```
QLoRA = Quantization + LoRA

Key Innovations:
├── 4-bit NormalFloat (NF4) quantization
├── Double quantization
├── Paged optimizers
└── Result: Train 65B model on single 48GB GPU!

Memory Comparison (7B model):
┌─────────────────────────────────────┐
│ Full Fine-Tuning:    28 GB         │
│ LoRA (FP16):         14 GB         │
│ QLoRA (4-bit):       4-6 GB        │ ← Game changer!
└─────────────────────────────────────┘
```

### How 4-bit Quantization Works

```
Standard FP16 (16 bits per parameter):
┌─────────────────────────────────────────┐
│ Sign │ Exponent │    Mantissa           │
│  1   │    5     │        10             │
└─────────────────────────────────────────┘
Values: -65504 to +65504 (continuous)

4-bit Quantization (4 bits per parameter):
┌─────────────────┐
│  0-15 (16 levels)│
└─────────────────┘

Memory: 16 bits → 4 bits = 4x reduction!
```

### NormalFloat (NF4) Quantization

```
Standard 4-bit: Evenly spaced values
├── 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15

Problem: Neural network weights follow NORMAL distribution!
Most weights are near zero, few are extreme.

NF4: Values spaced for normal distribution
├── More values near 0 (where most weights are)
├── Fewer values at extremes

Result: Better precision where it matters!
```

### Double Quantization

```
Regular Quantization:
├── 4-bit weights
├── 32-bit quantization constants (per block)
├── Constants add up!

Double Quantization:
├── 4-bit weights
├── 8-bit quantization constants (quantize the constants!)
├── Further memory reduction

Memory Savings:
├── Block size: 64 weights
├── Regular: 64 × 4 bits + 32 bits = 288 bits
├── Double:  64 × 4 bits + 8 bits = 264 bits
├── Savings: ~8% additional
```

### Paged Optimizers

```
Problem: GPU memory spikes during training

Solution: Paged Optimizers
├── Store optimizer states in CPU memory
├── Page to GPU when needed
├── Like virtual memory for GPUs

Benefit:
├── Handles memory spikes gracefully
├── No OOM errors during long sequences
├── Enables larger batch sizes
```

### QLoRA Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                       QLoRA Architecture                      │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Base Model Weights (4-bit NF4 Quantized)               │ │
│  │  ┌─────────────────────────────────────────────────────┐│ │
│  │  │ W_quantized (4-bit) ←── Frozen, never updated       ││ │
│  │  └─────────────────────────────────────────────────────┘│ │
│  └─────────────────────────────────────────────────────────┘ │
│                          │                                    │
│                          ↓ Dequantize to BF16 for compute    │
│                          │                                    │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  LoRA Adapters (BF16)                                   │ │
│  │  ┌───────────┐    ┌───────────┐                         │ │
│  │  │  A (r×d)  │ ── │  B (d×r)  │ ←── These are trained  │ │
│  │  │  BF16     │    │   BF16    │                         │ │
│  │  └───────────┘    └───────────┘                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                          │                                    │
│                          ↓                                    │
│                    Forward Pass:                              │
│                    h = Dequant(W_q) × x + (α/r) × B × A × x  │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 💻 Code Implementation

### LoRA from Scratch

```python
"""
LoRA Implementation from Scratch
Understanding the core concepts
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import math

class LoRALayer(nn.Module):
    """
    LoRA (Low-Rank Adaptation) layer
    
    Modifies a linear layer by adding trainable low-rank matrices.
    Original weights are frozen, only A and B are trained.
    """
    
    def __init__(
        self,
        original_layer: nn.Linear,
        rank: int = 8,
        alpha: float = 16,
        dropout: float = 0.1
    ):
        super().__init__()
        
        self.original_layer = original_layer
        self.rank = rank
        self.alpha = alpha
        self.scaling = alpha / rank
        
        # Freeze original weights
        for param in self.original_layer.parameters():
            param.requires_grad = False
        
        # Get dimensions
        in_features = original_layer.in_features
        out_features = original_layer.out_features
        
        # Initialize LoRA matrices
        # A: down-projection (in_features → rank)
        self.lora_A = nn.Parameter(torch.zeros(rank, in_features))
        
        # B: up-projection (rank → out_features)
        self.lora_B = nn.Parameter(torch.zeros(out_features, rank))
        
        # Dropout for regularization
        self.dropout = nn.Dropout(dropout)
        
        # Initialize A with Kaiming (He) initialization
        nn.init.kaiming_uniform_(self.lora_A, a=math.sqrt(5))
        
        # Initialize B with zeros (so ΔW = 0 at start)
        nn.init.zeros_(self.lora_B)
        
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward pass: original output + scaled LoRA output
        """
        # Original forward pass (frozen)
        original_output = self.original_layer(x)
        
        # LoRA forward pass
        # x: (batch, seq_len, in_features)
        # A: (rank, in_features)
        # B: (out_features, rank)
        
        # Step 1: Apply dropout
        x_dropped = self.dropout(x)
        
        # Step 2: Down-project: x @ A.T → (batch, seq_len, rank)
        down_projected = F.linear(x_dropped, self.lora_A)
        
        # Step 3: Up-project: down_projected @ B.T → (batch, seq_len, out_features)
        up_projected = F.linear(down_projected, self.lora_B)
        
        # Step 4: Scale by alpha/rank
        lora_output = up_projected * self.scaling
        
        # Combine outputs
        return original_output + lora_output
    
    def merge_weights(self):
        """
        Merge LoRA weights into original layer for inference
        No additional computation during inference!
        """
        with torch.no_grad():
            # ΔW = (B @ A) * scaling
            delta_W = (self.lora_B @ self.lora_A) * self.scaling
            
            # W_new = W_original + ΔW
            self.original_layer.weight.data += delta_W
            
        print("LoRA weights merged into original layer!")
        
    def get_trainable_params(self):
        """Count trainable parameters"""
        return sum(p.numel() for p in [self.lora_A, self.lora_B])
    
    def get_total_params(self):
        """Count total parameters including frozen"""
        return sum(p.numel() for p in self.original_layer.parameters())


class LoRAModel(nn.Module):
    """
    Wraps a model and applies LoRA to specified layers
    """
    
    def __init__(
        self,
        model: nn.Module,
        target_modules: list = ['q_proj', 'v_proj'],
        rank: int = 8,
        alpha: float = 16,
        dropout: float = 0.1
    ):
        super().__init__()
        
        self.model = model
        self.lora_layers = nn.ModuleDict()
        
        # Find and wrap target modules
        for name, module in model.named_modules():
            if any(target in name for target in target_modules):
                if isinstance(module, nn.Linear):
                    # Create LoRA layer
                    lora_layer = LoRALayer(
                        original_layer=module,
                        rank=rank,
                        alpha=alpha,
                        dropout=dropout
                    )
                    
                    # Replace in model
                    self._replace_module(name, lora_layer)
                    self.lora_layers[name] = lora_layer
                    
                    print(f"Applied LoRA to: {name}")
        
        # Freeze all non-LoRA parameters
        self._freeze_non_lora()
        
    def _replace_module(self, name: str, new_module: nn.Module):
        """Replace a module in the model by name"""
        parts = name.split('.')
        parent = self.model
        
        for part in parts[:-1]:
            parent = getattr(parent, part)
        
        setattr(parent, parts[-1], new_module)
        
    def _freeze_non_lora(self):
        """Freeze all parameters except LoRA"""
        for name, param in self.model.named_parameters():
            if 'lora_' not in name:
                param.requires_grad = False
                
    def forward(self, **kwargs):
        return self.model(**kwargs)
    
    def print_trainable_params(self):
        """Print trainable vs total parameters"""
        trainable = sum(p.numel() for p in self.parameters() if p.requires_grad)
        total = sum(p.numel() for p in self.parameters())
        
        print(f"Trainable parameters: {trainable:,}")
        print(f"Total parameters: {total:,}")
        print(f"Trainable %: {100 * trainable / total:.4f}%")
        
    def merge_and_save(self, path: str):
        """Merge LoRA weights and save"""
        for name, lora_layer in self.lora_layers.items():
            lora_layer.merge_weights()
        
        torch.save(self.model.state_dict(), path)
        print(f"Merged model saved to: {path}")


# ============================================
# USAGE EXAMPLE
# ============================================

if __name__ == "__main__":
    # Create a simple model for demonstration
    class SimpleTransformer(nn.Module):
        def __init__(self, d_model=512):
            super().__init__()
            self.q_proj = nn.Linear(d_model, d_model)
            self.k_proj = nn.Linear(d_model, d_model)
            self.v_proj = nn.Linear(d_model, d_model)
            self.out_proj = nn.Linear(d_model, d_model)
            
        def forward(self, x):
            q = self.q_proj(x)
            k = self.k_proj(x)
            v = self.v_proj(x)
            attn = F.softmax(q @ k.transpose(-2, -1) / math.sqrt(q.size(-1)), dim=-1)
            return self.out_proj(attn @ v)
    
    # Create model
    model = SimpleTransformer(d_model=512)
    
    # Apply LoRA to Q and V projections
    lora_model = LoRAModel(
        model=model,
        target_modules=['q_proj', 'v_proj'],
        rank=8,
        alpha=16
    )
    
    # Print stats
    lora_model.print_trainable_params()
    
    # Output:
    # Applied LoRA to: q_proj
    # Applied LoRA to: v_proj
    # Trainable parameters: 16,384
    # Total parameters: 1,064,960
    # Trainable %: 1.5385%
```

### Using PEFT Library (Production Ready)

```python
"""
Using HuggingFace PEFT Library
Production-ready LoRA implementation
"""

from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import (
    LoraConfig,
    get_peft_model,
    prepare_model_for_kbit_training,
    TaskType
)
import torch

# ============================================
# 1. LOAD BASE MODEL
# ============================================

model_name = "meta-llama/Llama-2-7b-hf"  # Or any HuggingFace model

# Load tokenizer
tokenizer = AutoTokenizer.from_pretrained(model_name)
tokenizer.pad_token = tokenizer.eos_token

# Load model
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.float16,
    device_map="auto"
)

print(f"Original model parameters: {model.num_parameters():,}")

# ============================================
# 2. CONFIGURE LoRA
# ============================================

lora_config = LoraConfig(
    # Core LoRA parameters
    r=16,                          # Rank of the update matrices
    lora_alpha=32,                 # Scaling factor
    lora_dropout=0.1,              # Dropout for regularization
    
    # Target modules (layer names to apply LoRA)
    target_modules=[
        "q_proj",    # Query projection
        "k_proj",    # Key projection
        "v_proj",    # Value projection
        "o_proj",    # Output projection
        "gate_proj", # FFN gate
        "up_proj",   # FFN up projection
        "down_proj", # FFN down projection
    ],
    
    # Task type
    task_type=TaskType.CAUSAL_LM,
    
    # Bias handling
    bias="none",  # Don't train biases
)

# ============================================
# 3. CREATE PEFT MODEL
# ============================================

# Wrap model with LoRA
peft_model = get_peft_model(model, lora_config)

# Print trainable parameters
peft_model.print_trainable_parameters()
# Output: trainable params: 4,194,304 || all params: 6,742,609,920 || trainable%: 0.0622

# ============================================
# 4. TRAINING
# ============================================

from transformers import TrainingArguments, Trainer
from datasets import load_dataset

# Load dataset
dataset = load_dataset("tatsu-lab/alpaca", split="train[:1000]")

# Tokenize
def tokenize(example):
    result = tokenizer(
        example["text"],
        truncation=True,
        max_length=512,
        padding="max_length"
    )
    result["labels"] = result["input_ids"].copy()
    return result

tokenized_dataset = dataset.map(tokenize, remove_columns=dataset.column_names)

# Training arguments
training_args = TrainingArguments(
    output_dir="./lora_output",
    num_train_epochs=3,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,
    learning_rate=2e-4,
    fp16=True,
    logging_steps=10,
    save_strategy="epoch",
)

# Create trainer
trainer = Trainer(
    model=peft_model,
    args=training_args,
    train_dataset=tokenized_dataset,
)

# Train
trainer.train()

# ============================================
# 5. SAVE AND LOAD LoRA ADAPTER
# ============================================

# Save only the LoRA adapter (few MB)
peft_model.save_pretrained("./my_lora_adapter")

# Load adapter onto base model later
from peft import PeftModel

base_model = AutoModelForCausalLM.from_pretrained(model_name)
peft_model = PeftModel.from_pretrained(base_model, "./my_lora_adapter")

# ============================================
# 6. MERGE FOR INFERENCE (Optional)
# ============================================

# Merge LoRA weights into base model
merged_model = peft_model.merge_and_unload()

# Save merged model
merged_model.save_pretrained("./merged_model")
```

### QLoRA Implementation

```python
"""
QLoRA: 4-bit Quantization + LoRA
Train 7B+ models on consumer GPUs
"""

from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments
)
from peft import (
    LoraConfig,
    get_peft_model,
    prepare_model_for_kbit_training
)
from trl import SFTTrainer
from datasets import load_dataset
import torch

# ============================================
# 1. QUANTIZATION CONFIG (4-bit NF4)
# ============================================

bnb_config = BitsAndBytesConfig(
    # Enable 4-bit quantization
    load_in_4bit=True,
    
    # Use NormalFloat 4-bit (better than standard 4-bit)
    bnb_4bit_quant_type="nf4",
    
    # Use bfloat16 for computation
    bnb_4bit_compute_dtype=torch.bfloat16,
    
    # Enable double quantization (quantize the quantization constants)
    bnb_4bit_use_double_quant=True,
)

# ============================================
# 2. LOAD QUANTIZED MODEL
# ============================================

model_name = "meta-llama/Llama-2-7b-hf"

# Load model in 4-bit
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    quantization_config=bnb_config,
    device_map="auto",
    trust_remote_code=True,
)

# Load tokenizer
tokenizer = AutoTokenizer.from_pretrained(model_name)
tokenizer.pad_token = tokenizer.eos_token
tokenizer.padding_side = "right"

# Prepare model for training (handles gradient checkpointing, etc.)
model = prepare_model_for_kbit_training(model)

print(f"Model loaded in 4-bit!")
print(f"Memory usage: ~{torch.cuda.memory_allocated() / 1e9:.2f} GB")

# ============================================
# 3. LoRA CONFIG
# ============================================

lora_config = LoraConfig(
    r=64,                    # Higher rank for QLoRA (compensates for quantization)
    lora_alpha=16,
    lora_dropout=0.1,
    target_modules=[
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj"
    ],
    bias="none",
    task_type="CAUSAL_LM",
)

# Apply LoRA
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()

# ============================================
# 4. DATASET
# ============================================

dataset = load_dataset("tatsu-lab/alpaca", split="train")

# Format for instruction tuning
def format_instruction(example):
    if example.get("input", ""):
        text = f"""### Instruction:
{example['instruction']}

### Input:
{example['input']}

### Response:
{example['output']}"""
    else:
        text = f"""### Instruction:
{example['instruction']}

### Response:
{example['output']}"""
    
    return {"text": text}

dataset = dataset.map(format_instruction)

# ============================================
# 5. TRAINING ARGUMENTS
# ============================================

training_args = TrainingArguments(
    output_dir="./qlora_output",
    
    # Batch size and accumulation
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,
    
    # Training duration
    num_train_epochs=3,
    
    # Learning rate (higher for QLoRA)
    learning_rate=2e-4,
    
    # Optimizations
    fp16=False,              # Don't use with 4-bit
    bf16=True,               # Use bfloat16 instead
    optim="paged_adamw_32bit",  # Paged optimizer for memory
    
    # Gradient checkpointing (saves memory)
    gradient_checkpointing=True,
    
    # Logging
    logging_steps=10,
    
    # Saving
    save_strategy="epoch",
    
    # Max gradient norm
    max_grad_norm=0.3,
    
    # Warmup
    warmup_ratio=0.03,
    
    # Learning rate schedule
    lr_scheduler_type="cosine",
)

# ============================================
# 6. SUPERVISED FINE-TUNING TRAINER
# ============================================

trainer = SFTTrainer(
    model=model,
    train_dataset=dataset,
    tokenizer=tokenizer,
    args=training_args,
    dataset_text_field="text",
    max_seq_length=512,
    packing=True,  # Pack multiple short examples into one sequence
)

# Train!
print("Starting QLoRA training...")
trainer.train()

# ============================================
# 7. SAVE ADAPTER
# ============================================

# Save LoRA adapter
trainer.save_model("./qlora_adapter")

print("QLoRA training complete!")
print(f"Adapter saved to: ./qlora_adapter")

# ============================================
# 8. INFERENCE WITH QLORA
# ============================================

def generate_response(prompt, max_length=256):
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    
    outputs = model.generate(
        **inputs,
        max_length=max_length,
        temperature=0.7,
        top_p=0.9,
        do_sample=True,
    )
    
    return tokenizer.decode(outputs[0], skip_special_tokens=True)

# Test
prompt = """### Instruction:
Write a Python function to reverse a string.

### Response:"""

print(generate_response(prompt))
```

---

## 🌍 Real World Use Cases

### 1. Custom Chatbot (Customer Service)

```python
# Fine-tune on company's FAQ and support tickets
# Result: Bot knows your products, policies, tone

# Example data format:
{
    "instruction": "How do I return a product?",
    "response": "You can return any item within 30 days. 
                 Visit our Returns Portal at returns.company.com..."
}
```

### 2. Code Assistant for Internal APIs

```python
# Fine-tune on your codebase
# Result: Suggests code using YOUR libraries and patterns

# Data:
{
    "instruction": "Create a database connection",
    "response": "from internal_libs.db import DBConnection\n
                 conn = DBConnection.create(config='prod')"
}
```

### 3. Domain-Specific Writing

```python
# Fine-tune on legal/medical/technical documents
# Result: Writes in professional domain style

# Legal example:
{
    "instruction": "Draft a non-compete clause",
    "response": "WHEREAS, Employee agrees that during the term..."
}
```

### 4. Multi-Language Support

```python
# Fine-tune on low-resource languages
# Result: Better performance in specific languages

# Data:
{
    "instruction": "Translate to Hindi",
    "input": "Hello, how are you?",
    "output": "नमस्ते, आप कैसे हैं?"
}
```

---

## 🛠️ Mini Project: Fine-tune LLaMA-2 for SQL Generation

```python
"""
Mini Project: QLoRA Fine-tuning for Text-to-SQL
Convert natural language to SQL queries
"""

from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import SFTTrainer
from datasets import Dataset
import torch

# ============================================
# STEP 1: PREPARE SQL DATASET
# ============================================

# Sample training data
sql_data = [
    {
        "question": "Show all customers from New York",
        "sql": "SELECT * FROM customers WHERE city = 'New York';",
        "schema": "customers(id, name, city, email)"
    },
    {
        "question": "Count orders placed in 2023",
        "sql": "SELECT COUNT(*) FROM orders WHERE YEAR(order_date) = 2023;",
        "schema": "orders(id, customer_id, order_date, total)"
    },
    {
        "question": "Find top 5 products by sales",
        "sql": "SELECT product_name, SUM(quantity) as total_sales FROM order_items GROUP BY product_name ORDER BY total_sales DESC LIMIT 5;",
        "schema": "order_items(id, product_name, quantity, price)"
    },
    # Add more examples...
] * 100  # Expand for training

# Format for training
def format_sql_example(example):
    return {
        "text": f"""### Schema:
{example['schema']}

### Question:
{example['question']}

### SQL:
{example['sql']}"""
    }

dataset = Dataset.from_list(sql_data).map(format_sql_example)

# ============================================
# STEP 2: LOAD MODEL WITH QLORA
# ============================================

model_name = "meta-llama/Llama-2-7b-hf"

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True,
)

model = AutoModelForCausalLM.from_pretrained(
    model_name,
    quantization_config=bnb_config,
    device_map="auto",
)

tokenizer = AutoTokenizer.from_pretrained(model_name)
tokenizer.pad_token = tokenizer.eos_token

model = prepare_model_for_kbit_training(model)

# ============================================
# STEP 3: APPLY LORA
# ============================================

lora_config = LoraConfig(
    r=32,
    lora_alpha=64,
    target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM",
)

model = get_peft_model(model, lora_config)
model.print_trainable_parameters()

# ============================================
# STEP 4: TRAIN
# ============================================

from transformers import TrainingArguments

training_args = TrainingArguments(
    output_dir="./sql_qlora",
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,
    num_train_epochs=3,
    learning_rate=2e-4,
    bf16=True,
    logging_steps=10,
    save_strategy="epoch",
)

trainer = SFTTrainer(
    model=model,
    train_dataset=dataset,
    tokenizer=tokenizer,
    args=training_args,
    dataset_text_field="text",
    max_seq_length=512,
)

trainer.train()
trainer.save_model("./sql_generator")

# ============================================
# STEP 5: INFERENCE
# ============================================

def text_to_sql(question, schema):
    prompt = f"""### Schema:
{schema}

### Question:
{question}

### SQL:"""
    
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    outputs = model.generate(**inputs, max_length=200, temperature=0.1)
    
    response = tokenizer.decode(outputs[0], skip_special_tokens=True)
    sql = response.split("### SQL:")[-1].strip()
    
    return sql

# Test
schema = "employees(id, name, department, salary)"
question = "Find the average salary by department"

print(text_to_sql(question, schema))
# Output: SELECT department, AVG(salary) FROM employees GROUP BY department;
```

---

## ⚠️ Common Mistakes

### 1. Wrong Rank Selection

```python
# ❌ WRONG: Rank too low (underfitting)
lora_config = LoraConfig(r=1, ...)  # Not enough capacity

# ❌ WRONG: Rank too high (defeats the purpose)
lora_config = LoraConfig(r=256, ...)  # Might as well do full fine-tuning

# ✅ CORRECT: Start with moderate rank
lora_config = LoraConfig(r=16, ...)  # Good starting point

# Guideline:
# r=8:   Simple tasks (sentiment)
# r=16:  Medium complexity
# r=32+: Complex tasks (code, reasoning)
```

### 2. Forgetting Target Modules

```python
# ❌ WRONG: Only targeting q_proj
target_modules=["q_proj"]  # Missing other projections

# ✅ CORRECT: Target all relevant modules
target_modules=[
    "q_proj", "k_proj", "v_proj", "o_proj",  # Attention
    "gate_proj", "up_proj", "down_proj"       # FFN
]
```

### 3. Using FP16 with 4-bit

```python
# ❌ WRONG: FP16 with 4-bit quantization
training_args = TrainingArguments(
    fp16=True,  # Conflicts with 4-bit!
)

# ✅ CORRECT: Use BF16 with 4-bit
training_args = TrainingArguments(
    fp16=False,
    bf16=True,  # Works well with 4-bit
)
```

### 4. Not Using Gradient Checkpointing

```python
# ❌ WRONG: No gradient checkpointing (OOM errors)
model = get_peft_model(model, config)

# ✅ CORRECT: Enable gradient checkpointing
model = prepare_model_for_kbit_training(model)  # Enables gradient checkpointing
model = get_peft_model(model, config)
```

### 5. Learning Rate Too Low

```python
# ❌ WRONG: Using full fine-tuning LR
learning_rate = 2e-5  # Too low for LoRA

# ✅ CORRECT: Higher LR for LoRA
learning_rate = 2e-4  # LoRA can handle higher LR
# Note: LoRA trains fewer parameters, can use 10x higher LR
```

---

## ❓ Interview Questions

### Beginner Level

**Q1: What is LoRA and why is it useful?**

> **A:** LoRA (Low-Rank Adaptation) is a parameter-efficient fine-tuning technique. Instead of training all model weights, it adds small trainable "adapter" matrices. Benefits:
> - 10-100x fewer trainable parameters
> - 4-10x less GPU memory
> - Faster training
> - Easy to swap adapters for different tasks

**Q2: What does "rank" mean in LoRA?**

> **A:** Rank (r) is the dimensionality of the LoRA matrices A and B. Lower rank = fewer parameters but less expressiveness. Higher rank = more parameters but more capacity to adapt. Typical values: 8, 16, 32.

**Q3: What is the difference between LoRA and QLoRA?**

> **A:** 
> - **LoRA:** Adds low-rank adapters, but base model is in FP16 (14GB for 7B model)
> - **QLoRA:** Same adapters, but base model is in 4-bit quantization (4GB for 7B model)
> 
> QLoRA enables training larger models on consumer GPUs.

### Intermediate Level

**Q4: Explain the mathematical formulation of LoRA.**

> **A:** Original layer: $h = Wx$
>
> LoRA modifies this to: $h = Wx + \frac{\alpha}{r}BAx$
>
> Where:
> - $W$ (frozen) = original pretrained weights
> - $A$ (trainable) = down-projection matrix (d → r)
> - $B$ (trainable) = up-projection matrix (r → d)
> - $\alpha$ = scaling factor
> - $r$ = rank
>
> The product BA forms a low-rank approximation of the weight update.

**Q5: Why is B initialized to zero and A with random values?**

> **A:** So that at initialization, $BA = 0$, meaning:
> - The model starts exactly as the pretrained model
> - No "jump" in loss at the beginning of training
> - Gradients flow properly from the start
>
> If both were random, the initial output would be different from pretrained, causing training instability.

**Q6: Which layers should LoRA be applied to?**

> **A:** Research shows attention projections (Q, K, V, O) are most important. For better results, also include FFN layers (up, down, gate projections).
>
> Rule of thumb:
> - Minimum: Q, V projections
> - Better: Q, K, V, O projections
> - Best: All attention + FFN projections

### Advanced Level

**Q7: How does NF4 quantization work in QLoRA?**

> **A:** NF4 (NormalFloat 4-bit) is designed for normally-distributed weights:
>
> 1. Divide weights into blocks (e.g., 64 weights)
> 2. Find the range in each block
> 3. Map weights to 16 values (4 bits)
> 4. Unlike uniform quantization, NF4 places more values near zero (where most weights are)
>
> This preserves more information than standard 4-bit quantization.

**Q8: Explain double quantization in QLoRA.**

> **A:** In standard quantization, each block of 64 weights needs a 32-bit scaling constant. With billions of weights, these constants add up!
>
> Double quantization:
> 1. Quantize weights to 4-bit (with FP32 constants)
> 2. Quantize the constants themselves to 8-bit
>
> This reduces memory overhead from the quantization constants by ~4x.

### FAANG Level

**Q9: Design a production system for serving multiple LoRA adapters.**

> **A:** Architecture:
>
> ```
> User Request → Router → Select Adapter → Base Model + Adapter → Response
> ```
>
> Key components:
> 1. **Adapter Registry:** Store LoRA weights for each task/customer
> 2. **Hot Loading:** Load adapters on-demand, cache popular ones
> 3. **Batching:** Batch requests by adapter for efficiency
> 4. **Merging Strategy:** For latency-critical: merge into model weights
>
> Implementation:
> - Use PEFT library's adapter switching
> - Or merge adapters into separate model copies
> - Load balance across GPU instances with different adapters

**Q10: Compare LoRA with other PEFT methods (Prefix Tuning, Adapters, Prompt Tuning).**

> **A:** 
>
> | Method | Params Added | Where | Inference Overhead | Quality |
> |--------|--------------|-------|-------------------|---------|
> | LoRA | 0.1-1% | Linear layers | None (merge) | High |
> | Prefix Tuning | <0.1% | Before attention | Small | Medium |
> | Adapters | 1-5% | Between layers | Medium | High |
> | Prompt Tuning | <0.01% | Input embeddings | None | Lower |
>
> LoRA is preferred because:
> - No inference overhead (can merge)
> - Good quality
> - Works across architectures

---

## 📝 Homework

### Easy

1. Explain in your own words why LoRA works.
2. Calculate the parameter reduction for LoRA with r=16 on a 4096×4096 layer.
3. What's the memory difference between FP16 and 4-bit for a 7B model?

### Medium

4. Implement LoRA from scratch for a simple linear layer.
5. Fine-tune DistilBERT with LoRA for sentiment analysis. Compare:
   - Training time
   - Memory usage
   - Final accuracy

### Hard

6. Train a QLoRA model on a custom dataset. Document:
   - Hardware requirements
   - Training time
   - Memory usage
   - Final performance

7. Experiment with different ranks (4, 8, 16, 32, 64). Plot:
   - Parameters vs. accuracy
   - Memory vs. accuracy
   - Training time vs. accuracy

### Expert

8. Build a multi-adapter serving system:
   - Load multiple LoRA adapters
   - Route requests to correct adapter
   - Measure latency impact

9. Compare LoRA vs Prefix Tuning vs Adapters:
   - Same model, same dataset
   - Compare all metrics
   - Write analysis report

---

## 🎯 Key Takeaways

```
LoRA in a Nutshell:
├── Freeze pretrained weights
├── Add small trainable matrices (A, B)
├── Train only A and B
├── Merge for inference (no overhead!)
└── 100x fewer parameters, 95%+ performance

QLoRA:
├── 4-bit quantization of base model
├── LoRA adapters in BF16
├── Paged optimizers for memory
└── Train 65B models on consumer GPUs

When to Use:
├── Limited GPU memory → QLoRA
├── Multiple tasks → Separate LoRA adapters
├── Production → Merge and deploy
└── Research → Full fine-tuning baseline, LoRA experiment
```

---

**Next: [03-HuggingFace-Ecosystem.md](./03-HuggingFace-Ecosystem.md)** - The platform that makes all of this easy! 🤗
