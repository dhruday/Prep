# 🧠 Mixture of Experts (MoE)

## 📚 Table of Contents
1. [Introduction](#-introduction)
2. [Beginner Explanation](#-beginner-explanation)
3. [Deep Technical Breakdown](#-deep-technical-breakdown)
4. [Mathematical Foundations](#-mathematical-foundations)
5. [MoE Architectures](#-moe-architectures)
6. [Implementation](#-implementation)
7. [Real-World Models](#-real-world-models)
8. [Hands-On Project](#-hands-on-project)
9. [Common Mistakes](#-common-mistakes)
10. [Interview Questions](#-interview-questions)
11. [Homework](#-homework)

---

## 🎯 Introduction

**Mixture of Experts (MoE)** is an architecture that enables models to have massive total parameters while only activating a fraction of them per input. This creates models that are both powerful AND efficient.

### The Key Insight

| Dense Model | MoE Model |
|-------------|-----------|
| All parameters used per token | Only subset used per token |
| 7B params → 7B active | 56B params → 7B active |
| Limited capacity | Massive capacity |
| Fixed compute | Dynamic compute |

### Why MoE Matters

```
┌─────────────────────────────────────────────────────────────┐
│                    MODEL EFFICIENCY                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Dense 70B:   ████████████████████████████████  70B compute │
│  MoE 8x7B:    ████████░░░░░░░░░░░░░░░░░░░░░░░░  14B compute │
│                                                              │
│  Same quality, 5x less compute!                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧒 Beginner Explanation

### The "Hospital" Analogy

Imagine a hospital with specialists:

**Dense Model (General Hospital):**
```
Patient ──► One doctor handles EVERYTHING
            (overwhelmed, less specialized)
```

**MoE Model (Specialist Hospital):**
```
Patient ──► Receptionist (Router)
            ├── Heart problem? ──► Cardiologist (Expert 1)
            ├── Brain issue? ──► Neurologist (Expert 2)
            ├── Bone injury? ──► Orthopedist (Expert 3)
            └── Skin condition? ──► Dermatologist (Expert 4)
```

**Key idea:** Don't use ALL doctors for every patient – route to the RIGHT specialists!

### How MoE Works

```
┌─────────────────────────────────────────────────────────────┐
│                    MoE LAYER                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Input Token: "Python"                                       │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────────┐                                            │
│  │   ROUTER    │  "Which experts should handle this?"       │
│  │  (Gating)   │                                            │
│  └──────┬──────┘                                            │
│         │                                                    │
│         ├─────────────────────────┐                         │
│         │ Top-2 Selection         │                         │
│         ▼                         ▼                         │
│  ┌────────────┐           ┌────────────┐                   │
│  │  Expert 3  │  0.7      │  Expert 7  │  0.3              │
│  │  (Code)    │           │  (Tech)    │                   │
│  └──────┬─────┘           └──────┬─────┘                   │
│         │                        │                          │
│         └────────┬───────────────┘                          │
│                  ▼                                          │
│         Weighted Combination                                │
│         Output = 0.7 × E3 + 0.3 × E7                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔬 Deep Technical Breakdown

### MoE Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TRANSFORMER + MoE                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    STANDARD TRANSFORMER                        │  │
│  │                                                                │  │
│  │  Input ──► Attention ──► FFN ──► Output                       │  │
│  │                          ▲                                     │  │
│  │                          │                                     │  │
│  │                    [Dense FFN]                                 │  │
│  │                                                                │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    MOE TRANSFORMER                             │  │
│  │                                                                │  │
│  │  Input ──► Attention ──► MoE Layer ──► Output                 │  │
│  │                          ▲                                     │  │
│  │                          │                                     │  │
│  │                    ┌─────┴─────┐                               │  │
│  │                    │   Router  │                               │  │
│  │                    └─────┬─────┘                               │  │
│  │            ┌───────┬─────┼─────┬───────┐                       │  │
│  │            ▼       ▼     ▼     ▼       ▼                       │  │
│  │          [E1]    [E2]  [E3]  [E4]    [E8]                     │  │
│  │          FFN     FFN   FFN   FFN     FFN                      │  │
│  │                                                                │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Components

#### 1. Router (Gating Network)
Determines which experts to use:

```python
class Router(nn.Module):
    def __init__(self, input_dim, num_experts, top_k=2):
        super().__init__()
        self.gate = nn.Linear(input_dim, num_experts)
        self.top_k = top_k
    
    def forward(self, x):
        # Compute routing scores
        logits = self.gate(x)  # [batch, seq, num_experts]
        
        # Get top-k experts
        top_k_logits, top_k_indices = torch.topk(logits, self.top_k, dim=-1)
        
        # Convert to probabilities
        top_k_probs = F.softmax(top_k_logits, dim=-1)
        
        return top_k_probs, top_k_indices
```

#### 2. Experts
Each expert is typically a FFN (Feed-Forward Network):

```python
class Expert(nn.Module):
    def __init__(self, input_dim, hidden_dim):
        super().__init__()
        self.fc1 = nn.Linear(input_dim, hidden_dim)
        self.fc2 = nn.Linear(hidden_dim, input_dim)
        self.activation = nn.SiLU()
    
    def forward(self, x):
        return self.fc2(self.activation(self.fc1(x)))
```

#### 3. MoE Layer
Combines router and experts:

```python
class MoELayer(nn.Module):
    def __init__(self, input_dim, hidden_dim, num_experts, top_k=2):
        super().__init__()
        self.router = Router(input_dim, num_experts, top_k)
        self.experts = nn.ModuleList([
            Expert(input_dim, hidden_dim) 
            for _ in range(num_experts)
        ])
        self.top_k = top_k
    
    def forward(self, x):
        # Route tokens
        probs, indices = self.router(x)  # probs: [B, S, K], indices: [B, S, K]
        
        # Process through selected experts
        batch_size, seq_len, dim = x.shape
        output = torch.zeros_like(x)
        
        for k in range(self.top_k):
            expert_idx = indices[:, :, k]  # [B, S]
            expert_prob = probs[:, :, k:k+1]  # [B, S, 1]
            
            for e in range(len(self.experts)):
                mask = (expert_idx == e)
                if mask.any():
                    expert_input = x[mask]
                    expert_output = self.experts[e](expert_input)
                    output[mask] += expert_prob[mask] * expert_output
        
        return output
```

---

## 📐 Mathematical Foundations

### Router Function

The router computes probabilities for each expert:

$$G(x) = \text{Softmax}(W_g \cdot x + \epsilon)$$

Where:
- $W_g$ is the gating weights
- $x$ is the input token
- $\epsilon$ is optional noise for exploration

### Top-K Selection

Select top-k experts:

$$\text{TopK}(G(x), k) = \{i : G(x)_i \text{ is among top } k\}$$

### Expert Output

The MoE layer output:

$$y = \sum_{i \in \text{TopK}} G(x)_i \cdot E_i(x)$$

Where:
- $G(x)_i$ is the routing probability for expert $i$
- $E_i(x)$ is the output of expert $i$

### Load Balancing Loss

To ensure experts are used evenly:

$$\mathcal{L}_{balance} = \alpha \cdot N \cdot \sum_{i=1}^{N} f_i \cdot P_i$$

Where:
- $N$ = number of experts
- $f_i$ = fraction of tokens routed to expert $i$
- $P_i$ = average routing probability for expert $i$
- $\alpha$ = balancing coefficient (typically 0.01)

**Intuition:** Penalize experts that get too many tokens.

### Capacity Factor

Limit tokens per expert to prevent bottlenecks:

$$\text{Capacity} = \frac{\text{tokens}}{N} \times \text{capacity\_factor}$$

Typical capacity factors: 1.0 - 2.0

---

## 🏗️ MoE Architectures

### 1. Switch Transformer (Google, 2021)

**Key Innovation:** Top-1 routing (only one expert per token)

```
┌─────────────────────────────────────────────────────────────┐
│                 SWITCH TRANSFORMER                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Token ──► Router ──► SINGLE Expert ──► Output              │
│                                                              │
│  Benefits:                                                   │
│  • Simpler routing                                          │
│  • Lower communication                                       │
│  • Faster training                                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2. Mixtral (Mistral AI, 2023)

**Architecture:** 8 experts, top-2 routing per token

```
┌─────────────────────────────────────────────────────────────┐
│                     MIXTRAL 8x7B                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Total Parameters: 46.7B                                     │
│  Active Parameters: 12.9B (per token)                        │
│                                                              │
│  Architecture:                                               │
│  • 32 layers                                                 │
│  • 8 experts per layer                                       │
│  • Top-2 routing                                             │
│  • 4096 hidden dimension                                     │
│                                                              │
│  Performance: Matches/beats Llama-2 70B                      │
│  Compute: ~2x Mistral 7B                                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3. DeepSeek-MoE

**Innovation:** Fine-grained experts + shared experts

```
┌─────────────────────────────────────────────────────────────┐
│                   DEEPSEEK-MOE                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │               SHARED EXPERTS                         │   │
│  │    (Always activated for common knowledge)          │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              ROUTED EXPERTS                          │   │
│  │  [E1] [E2] [E3] [E4] ... [E64]                      │   │
│  │   (Smaller, more specialized)                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  Benefits:                                                   │
│  • Better knowledge sharing                                 │
│  • More efficient                                           │
│  • Less redundancy                                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4. Comparison Table

| Model | Experts | Top-K | Total Params | Active Params |
|-------|---------|-------|--------------|---------------|
| Switch-Base | 128 | 1 | 7.4B | 0.3B |
| Mixtral 8x7B | 8 | 2 | 46.7B | 12.9B |
| DeepSeek-MoE 16B | 64 | 6 | 16.4B | 2.8B |
| Grok-1 | 8 | 2 | 314B | ~80B |

---

## 💻 Implementation

### Simple MoE from Scratch

```python
"""
Complete MoE Implementation in PyTorch
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Tuple

class Expert(nn.Module):
    """Single FFN Expert"""
    
    def __init__(self, d_model: int, d_ff: int, dropout: float = 0.1):
        super().__init__()
        self.w1 = nn.Linear(d_model, d_ff)
        self.w2 = nn.Linear(d_ff, d_model)
        self.dropout = nn.Dropout(dropout)
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.w2(self.dropout(F.silu(self.w1(x))))


class Router(nn.Module):
    """Top-K Router with Load Balancing"""
    
    def __init__(
        self, 
        d_model: int, 
        num_experts: int, 
        top_k: int = 2,
        noise_std: float = 0.1
    ):
        super().__init__()
        self.num_experts = num_experts
        self.top_k = top_k
        self.noise_std = noise_std
        
        self.gate = nn.Linear(d_model, num_experts, bias=False)
    
    def forward(
        self, 
        x: torch.Tensor
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """
        Args:
            x: [batch, seq_len, d_model]
        
        Returns:
            weights: [batch, seq_len, top_k] - routing weights
            indices: [batch, seq_len, top_k] - expert indices
            load_balance_loss: scalar - auxiliary loss
        """
        batch_size, seq_len, _ = x.shape
        
        # Compute gate logits
        logits = self.gate(x)  # [B, S, E]
        
        # Add noise during training for exploration
        if self.training:
            noise = torch.randn_like(logits) * self.noise_std
            logits = logits + noise
        
        # Get top-k experts
        weights, indices = torch.topk(logits, self.top_k, dim=-1)
        weights = F.softmax(weights, dim=-1)  # Normalize top-k
        
        # Compute load balancing loss
        # f_i: fraction of tokens routed to expert i
        # P_i: average probability for expert i
        router_probs = F.softmax(logits, dim=-1)  # [B, S, E]
        
        # Average over batch and sequence
        avg_probs = router_probs.mean(dim=[0, 1])  # [E]
        
        # Count tokens per expert
        expert_counts = torch.zeros(self.num_experts, device=x.device)
        for k in range(self.top_k):
            expert_counts.scatter_add_(
                0, 
                indices[:, :, k].reshape(-1), 
                torch.ones(batch_size * seq_len, device=x.device)
            )
        expert_fracs = expert_counts / (batch_size * seq_len * self.top_k)
        
        # Load balance loss: minimize variance in expert usage
        load_balance_loss = self.num_experts * (expert_fracs * avg_probs).sum()
        
        return weights, indices, load_balance_loss


class MoELayer(nn.Module):
    """Mixture of Experts Layer"""
    
    def __init__(
        self,
        d_model: int,
        d_ff: int,
        num_experts: int,
        top_k: int = 2,
        dropout: float = 0.1,
        capacity_factor: float = 1.25
    ):
        super().__init__()
        self.d_model = d_model
        self.num_experts = num_experts
        self.top_k = top_k
        self.capacity_factor = capacity_factor
        
        self.router = Router(d_model, num_experts, top_k)
        self.experts = nn.ModuleList([
            Expert(d_model, d_ff, dropout) 
            for _ in range(num_experts)
        ])
    
    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Args:
            x: [batch, seq_len, d_model]
        
        Returns:
            output: [batch, seq_len, d_model]
            aux_loss: load balancing loss
        """
        batch_size, seq_len, d_model = x.shape
        
        # Get routing decisions
        weights, indices, aux_loss = self.router(x)
        
        # Initialize output
        output = torch.zeros_like(x)
        
        # Process each expert
        # This is a simple implementation; production uses parallel dispatch
        for expert_idx in range(self.num_experts):
            # Find tokens routed to this expert
            for k in range(self.top_k):
                mask = (indices[:, :, k] == expert_idx)  # [B, S]
                
                if not mask.any():
                    continue
                
                # Get tokens for this expert
                expert_input = x[mask]  # [num_tokens, d_model]
                
                # Process through expert
                expert_output = self.experts[expert_idx](expert_input)
                
                # Weight by routing probability
                token_weights = weights[:, :, k][mask].unsqueeze(-1)  # [num_tokens, 1]
                
                # Accumulate weighted output
                output[mask] += token_weights * expert_output
        
        return output, aux_loss


class MoETransformerBlock(nn.Module):
    """Transformer block with MoE FFN"""
    
    def __init__(
        self,
        d_model: int,
        num_heads: int,
        d_ff: int,
        num_experts: int,
        top_k: int = 2,
        dropout: float = 0.1
    ):
        super().__init__()
        
        # Attention
        self.attention = nn.MultiheadAttention(
            d_model, num_heads, dropout=dropout, batch_first=True
        )
        self.norm1 = nn.LayerNorm(d_model)
        
        # MoE FFN
        self.moe = MoELayer(d_model, d_ff, num_experts, top_k, dropout)
        self.norm2 = nn.LayerNorm(d_model)
        
        self.dropout = nn.Dropout(dropout)
    
    def forward(
        self, 
        x: torch.Tensor, 
        mask: torch.Tensor = None
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        # Self-attention
        attn_out, _ = self.attention(x, x, x, attn_mask=mask)
        x = self.norm1(x + self.dropout(attn_out))
        
        # MoE FFN
        moe_out, aux_loss = self.moe(x)
        x = self.norm2(x + self.dropout(moe_out))
        
        return x, aux_loss


class MoETransformer(nn.Module):
    """Full MoE Transformer"""
    
    def __init__(
        self,
        vocab_size: int,
        d_model: int = 512,
        num_heads: int = 8,
        d_ff: int = 2048,
        num_layers: int = 6,
        num_experts: int = 8,
        top_k: int = 2,
        max_seq_len: int = 512,
        dropout: float = 0.1
    ):
        super().__init__()
        
        self.embedding = nn.Embedding(vocab_size, d_model)
        self.pos_encoding = nn.Embedding(max_seq_len, d_model)
        
        self.layers = nn.ModuleList([
            MoETransformerBlock(d_model, num_heads, d_ff, num_experts, top_k, dropout)
            for _ in range(num_layers)
        ])
        
        self.norm = nn.LayerNorm(d_model)
        self.output = nn.Linear(d_model, vocab_size)
    
    def forward(
        self, 
        input_ids: torch.Tensor, 
        mask: torch.Tensor = None
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        seq_len = input_ids.size(1)
        positions = torch.arange(seq_len, device=input_ids.device)
        
        x = self.embedding(input_ids) + self.pos_encoding(positions)
        
        total_aux_loss = 0
        for layer in self.layers:
            x, aux_loss = layer(x, mask)
            total_aux_loss += aux_loss
        
        x = self.norm(x)
        logits = self.output(x)
        
        return logits, total_aux_loss / len(self.layers)


# ============================================
# TRAINING LOOP
# ============================================

def train_moe_model():
    """Example training loop with load balancing"""
    
    # Create model
    model = MoETransformer(
        vocab_size=50000,
        d_model=512,
        num_heads=8,
        d_ff=2048,
        num_layers=6,
        num_experts=8,
        top_k=2
    ).cuda()
    
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4)
    aux_loss_weight = 0.01  # Weight for load balancing loss
    
    # Training loop
    for batch in train_dataloader:
        input_ids = batch['input_ids'].cuda()
        labels = batch['labels'].cuda()
        
        # Forward pass
        logits, aux_loss = model(input_ids)
        
        # Compute language modeling loss
        lm_loss = F.cross_entropy(
            logits.view(-1, logits.size(-1)),
            labels.view(-1)
        )
        
        # Total loss = LM loss + auxiliary load balancing loss
        total_loss = lm_loss + aux_loss_weight * aux_loss
        
        # Backward pass
        optimizer.zero_grad()
        total_loss.backward()
        optimizer.step()
        
        print(f"LM Loss: {lm_loss:.4f}, Aux Loss: {aux_loss:.4f}")
```

---

## 🌍 Real-World Models

### Mixtral 8x7B

```python
"""
Using Mixtral with HuggingFace
"""

from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

# Load model
model_name = "mistralai/Mixtral-8x7B-Instruct-v0.1"

tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.float16,
    device_map="auto"  # Distribute across GPUs
)

# Generate
messages = [
    {"role": "user", "content": "Explain quantum computing in simple terms"}
]

inputs = tokenizer.apply_chat_template(messages, return_tensors="pt").to("cuda")

outputs = model.generate(
    inputs,
    max_new_tokens=500,
    temperature=0.7,
    do_sample=True
)

print(tokenizer.decode(outputs[0], skip_special_tokens=True))
```

### DeepSeek-MoE

```python
"""
DeepSeek-MoE Usage
"""

from transformers import AutoModelForCausalLM, AutoTokenizer

model = AutoModelForCausalLM.from_pretrained(
    "deepseek-ai/deepseek-moe-16b-chat",
    torch_dtype=torch.bfloat16,
    device_map="auto",
    trust_remote_code=True  # Required for custom architecture
)

tokenizer = AutoTokenizer.from_pretrained(
    "deepseek-ai/deepseek-moe-16b-chat",
    trust_remote_code=True
)

# Chat format
prompt = """User: What is the difference between MoE and dense models?
Assistant:"""

inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
outputs = model.generate(**inputs, max_new_tokens=300)
print(tokenizer.decode(outputs[0]))
```

---

## 🛠️ Hands-On Project

### Project: Build a Mini MoE Language Model

```python
"""
Project: Train a small MoE language model
"""

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset
from transformers import GPT2Tokenizer
import numpy as np

# ============================================
# 1. DATASET
# ============================================

class TextDataset(Dataset):
    def __init__(self, texts, tokenizer, max_length=128):
        self.tokenizer = tokenizer
        self.max_length = max_length
        self.examples = []
        
        for text in texts:
            tokens = tokenizer.encode(text, truncation=True, max_length=max_length)
            if len(tokens) > 10:  # Skip very short
                self.examples.append(tokens)
    
    def __len__(self):
        return len(self.examples)
    
    def __getitem__(self, idx):
        tokens = self.examples[idx]
        # Pad to max_length
        padded = tokens + [self.tokenizer.pad_token_id] * (self.max_length - len(tokens))
        input_ids = torch.tensor(padded[:-1])
        labels = torch.tensor(padded[1:])
        return {"input_ids": input_ids, "labels": labels}


# ============================================
# 2. MINI MOE MODEL
# ============================================

class MiniMoE(nn.Module):
    """Small MoE model for demonstration"""
    
    def __init__(
        self,
        vocab_size: int,
        d_model: int = 256,
        num_heads: int = 4,
        num_layers: int = 4,
        num_experts: int = 4,
        top_k: int = 2,
        max_seq_len: int = 128
    ):
        super().__init__()
        
        self.d_model = d_model
        self.embedding = nn.Embedding(vocab_size, d_model)
        self.pos_embedding = nn.Embedding(max_seq_len, d_model)
        
        self.layers = nn.ModuleList()
        for i in range(num_layers):
            # Alternate between dense and MoE layers
            if i % 2 == 0:
                self.layers.append(
                    DenseBlock(d_model, num_heads, d_model * 4)
                )
            else:
                self.layers.append(
                    MoEBlock(d_model, num_heads, d_model * 4, num_experts, top_k)
                )
        
        self.norm = nn.LayerNorm(d_model)
        self.lm_head = nn.Linear(d_model, vocab_size, bias=False)
        
        # Tie weights
        self.lm_head.weight = self.embedding.weight
    
    def forward(self, input_ids):
        B, S = input_ids.shape
        
        positions = torch.arange(S, device=input_ids.device)
        x = self.embedding(input_ids) + self.pos_embedding(positions)
        
        total_aux_loss = 0
        for layer in self.layers:
            if isinstance(layer, MoEBlock):
                x, aux_loss = layer(x)
                total_aux_loss += aux_loss
            else:
                x = layer(x)
        
        x = self.norm(x)
        logits = self.lm_head(x)
        
        return logits, total_aux_loss


class DenseBlock(nn.Module):
    """Standard transformer block"""
    def __init__(self, d_model, num_heads, d_ff):
        super().__init__()
        self.attn = nn.MultiheadAttention(d_model, num_heads, batch_first=True)
        self.ffn = nn.Sequential(
            nn.Linear(d_model, d_ff),
            nn.GELU(),
            nn.Linear(d_ff, d_model)
        )
        self.norm1 = nn.LayerNorm(d_model)
        self.norm2 = nn.LayerNorm(d_model)
    
    def forward(self, x):
        # Causal mask
        S = x.size(1)
        mask = torch.triu(torch.ones(S, S, device=x.device), diagonal=1).bool()
        
        attn_out, _ = self.attn(x, x, x, attn_mask=mask)
        x = self.norm1(x + attn_out)
        x = self.norm2(x + self.ffn(x))
        return x


class MoEBlock(nn.Module):
    """MoE transformer block"""
    def __init__(self, d_model, num_heads, d_ff, num_experts, top_k):
        super().__init__()
        self.attn = nn.MultiheadAttention(d_model, num_heads, batch_first=True)
        self.moe = MoELayer(d_model, d_ff, num_experts, top_k)
        self.norm1 = nn.LayerNorm(d_model)
        self.norm2 = nn.LayerNorm(d_model)
    
    def forward(self, x):
        S = x.size(1)
        mask = torch.triu(torch.ones(S, S, device=x.device), diagonal=1).bool()
        
        attn_out, _ = self.attn(x, x, x, attn_mask=mask)
        x = self.norm1(x + attn_out)
        
        moe_out, aux_loss = self.moe(x)
        x = self.norm2(x + moe_out)
        
        return x, aux_loss


# ============================================
# 3. TRAINING
# ============================================

def train():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    # Tokenizer
    tokenizer = GPT2Tokenizer.from_pretrained("gpt2")
    tokenizer.pad_token = tokenizer.eos_token
    
    # Sample data (use real dataset in practice)
    texts = [
        "The quick brown fox jumps over the lazy dog.",
        "Machine learning is a subset of artificial intelligence.",
        "Python is a popular programming language.",
        # Add more...
    ] * 1000
    
    dataset = TextDataset(texts, tokenizer)
    dataloader = DataLoader(dataset, batch_size=32, shuffle=True)
    
    # Model
    model = MiniMoE(
        vocab_size=tokenizer.vocab_size,
        d_model=256,
        num_heads=4,
        num_layers=4,
        num_experts=4,
        top_k=2
    ).to(device)
    
    optimizer = torch.optim.AdamW(model.parameters(), lr=3e-4)
    aux_weight = 0.01
    
    # Training loop
    model.train()
    for epoch in range(3):
        total_loss = 0
        for batch in dataloader:
            input_ids = batch["input_ids"].to(device)
            labels = batch["labels"].to(device)
            
            logits, aux_loss = model(input_ids)
            
            lm_loss = nn.functional.cross_entropy(
                logits.view(-1, logits.size(-1)),
                labels.view(-1),
                ignore_index=tokenizer.pad_token_id
            )
            
            loss = lm_loss + aux_weight * aux_loss
            
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item()
        
        print(f"Epoch {epoch+1}, Loss: {total_loss/len(dataloader):.4f}")
    
    return model, tokenizer


# ============================================
# 4. INFERENCE
# ============================================

def generate(model, tokenizer, prompt, max_tokens=50):
    model.eval()
    device = next(model.parameters()).device
    
    input_ids = tokenizer.encode(prompt, return_tensors="pt").to(device)
    
    for _ in range(max_tokens):
        with torch.no_grad():
            logits, _ = model(input_ids)
        
        next_token = logits[:, -1, :].argmax(dim=-1, keepdim=True)
        input_ids = torch.cat([input_ids, next_token], dim=1)
        
        if next_token.item() == tokenizer.eos_token_id:
            break
    
    return tokenizer.decode(input_ids[0])


if __name__ == "__main__":
    model, tokenizer = train()
    
    result = generate(model, tokenizer, "Machine learning is")
    print(result)
```

---

## ⚠️ Common Mistakes

### 1. Ignoring Load Balancing

```python
# ❌ Bad - No load balancing loss
loss = lm_loss  # All tokens go to same expert!

# ✅ Good - Include auxiliary loss
loss = lm_loss + 0.01 * aux_loss
```

### 2. Wrong Capacity Factor

```python
# ❌ Bad - Too low capacity
capacity_factor = 0.5  # Tokens get dropped!

# ✅ Good - Reasonable capacity
capacity_factor = 1.25  # 25% buffer
```

### 3. Not Handling Dropped Tokens

```python
# ❌ Bad - Tokens silently dropped
def forward(self, x):
    # If expert is full, token is lost!

# ✅ Good - Handle overflow
def forward(self, x):
    overflow_mask = get_overflow_mask(x)
    if overflow_mask.any():
        # Route to another expert or use skip connection
        x[overflow_mask] = self.skip_connection(x[overflow_mask])
```

---

## 🎯 Interview Questions

### Q1: What is Mixture of Experts and why is it useful?

**Answer:**
MoE is an architecture where multiple "expert" sub-networks exist, but only a subset are activated per input. 

**Benefits:**
1. **Capacity:** Total parameters can be huge (100B+)
2. **Efficiency:** Only use 10-20% of params per token
3. **Specialization:** Different experts learn different skills

**Example:** Mixtral 8x7B has 46.7B params but only uses 12.9B per token.

---

### Q2: Explain the router/gating mechanism in MoE.

**Answer:**
The router decides which experts process each token:

```python
# Simplified router
logits = W @ x      # [num_experts]
probs = softmax(logits)
top_k = select_top_k(probs, k=2)

output = sum(prob[i] * expert[i](x) for i in top_k)
```

**Key components:**
- Linear projection to expert scores
- Top-K selection
- Weighted combination of expert outputs

---

### Q3: What is load balancing loss and why is it needed?

**Answer:**
Without load balancing, the router might send all tokens to one "favorite" expert, wasting other experts.

**Load balance loss:**
$$\mathcal{L}_{aux} = \alpha \cdot N \cdot \sum_i f_i \cdot P_i$$

Where $f_i$ is usage fraction and $P_i$ is average probability.

**Effect:** Encourages even distribution across experts.

---

### Q4: Compare MoE advantages and disadvantages.

**Answer:**

| Advantages | Disadvantages |
|------------|---------------|
| Higher capacity | Memory for all experts |
| Lower compute per token | Complex training |
| Specialization | Load balancing needed |
| Scales efficiently | Communication overhead |
| Better at diverse tasks | Harder to deploy |

---

### Q5: How does Mixtral differ from other MoE models?

**Answer:**
Mixtral's innovations:
1. **Top-2 routing:** Always uses exactly 2 experts
2. **Shared FFN size:** Each expert is full 7B FFN
3. **No auxiliary loss in inference:** Simplifies deployment
4. **Sliding window attention:** 4096 token window

Performance: Matches Llama-2 70B with 3x less compute.

---

## 📝 Homework

### Level 1: Basic
1. Explain MoE in your own words with an analogy
2. Calculate active params for 8x7B with top-2 routing
3. List 3 MoE models and their configurations

### Level 2: Intermediate
1. Implement a simple router in PyTorch
2. Run Mixtral and analyze which experts activate
3. Explain load balancing loss mathematically

### Level 3: Advanced
1. Implement full MoE layer with capacity constraints
2. Train a small MoE on text data
3. Compare training dynamics with dense model

### Level 4: Expert
1. Implement efficient parallel expert dispatch
2. Build MoE with shared + routed experts (DeepSeek style)
3. Analyze expert specialization after training

---

## 🔗 Resources

- [Switch Transformer Paper](https://arxiv.org/abs/2101.03961)
- [Mixtral Paper](https://arxiv.org/abs/2401.04088)
- [DeepSeek-MoE Paper](https://arxiv.org/abs/2401.06066)
- [MoE Survey](https://arxiv.org/abs/2209.01667)

---

**Next:** [05-Chain-of-Thought.md](./05-Chain-of-Thought.md) - Reasoning with Chain of Thought
