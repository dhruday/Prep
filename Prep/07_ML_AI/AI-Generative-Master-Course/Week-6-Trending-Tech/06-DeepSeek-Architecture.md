# 🔬 DeepSeek Architecture

## 📚 Table of Contents
1. [Introduction](#-introduction)
2. [Beginner Explanation](#-beginner-explanation)
3. [DeepSeek Evolution](#-deepseek-evolution)
4. [Core Architecture](#-core-architecture)
5. [DeepSeek-V2 Innovations](#-deepseek-v2-innovations)
6. [DeepSeek-V3 Architecture](#-deepseek-v3-architecture)
7. [Training Strategies](#-training-strategies)
8. [Implementation](#-implementation)
9. [Hands-On Project](#-hands-on-project)
10. [Common Mistakes](#-common-mistakes)
11. [Interview Questions](#-interview-questions)
12. [Homework](#-homework)

---

## 🎯 Introduction

**DeepSeek** is a series of open-source Large Language Models developed by DeepSeek AI (a Chinese AI lab backed by High-Flyer quant fund). They've made waves by achieving GPT-4 level performance at a fraction of the training cost.

### Why DeepSeek Matters

| Feature | Traditional LLMs | DeepSeek |
|---------|------------------|----------|
| Training Cost | $100M+ (GPT-4) | ~$5.6M (V3) |
| Parameters | Dense (all active) | Sparse MoE |
| Attention | Standard MHA | MLA (Multi-head Latent Attention) |
| KV Cache | Large | Compressed |
| Open Source | Often closed | Fully open |

### Key Innovations

```
┌─────────────────────────────────────────────────────────────┐
│              DEEPSEEK KEY INNOVATIONS                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Multi-head Latent Attention (MLA)                       │
│     └─ Compresses KV cache by 90%+                          │
│                                                              │
│  2. DeepSeekMoE                                              │
│     └─ Fine-grained expert routing                          │
│     └─ Shared + routed experts                              │
│                                                              │
│  3. Auxiliary-loss-free Load Balancing                      │
│     └─ No quality degradation                               │
│                                                              │
│  4. Multi-Token Prediction (MTP)                            │
│     └─ Predicts multiple tokens simultaneously              │
│                                                              │
│  5. FP8 Mixed Precision Training                            │
│     └─ First production model trained in FP8               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧒 Beginner Explanation

### The "Restaurant Kitchen" Analogy

Imagine a huge restaurant with many specialized chefs:

**Traditional Restaurant (Dense Model):**
```
Every order → ALL 100 chefs work on it
Problem: Expensive, slow, most chefs waste their skills
```

**DeepSeek Restaurant (MoE):**
```
Order comes in → Router decides which 6 chefs are best
- Sushi order → Japanese chefs
- Pizza order → Italian chefs
- Dessert → Pastry chefs

Result: Same quality, 10% of the cost!
```

### Visual: Dense vs Sparse

```
┌─────────────────────────────────────────────────────────────┐
│                    DENSE MODEL                               │
│                   (Traditional)                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Input ──► [■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■] ──► Output     │
│             All 100B parameters activated                    │
│             100B FLOPs per token                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    SPARSE MoE MODEL                          │
│                    (DeepSeek)                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Input ──► Router ──► [■■□□□□■□□□□□■■□□□□□□□□□□] ──► Output  │
│                        Only 20B active (of 671B total)       │
│                        20B FLOPs per token                   │
│                                                              │
│  ■ = Active expert    □ = Inactive expert                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📈 DeepSeek Evolution

### Timeline

```
┌──────────────────────────────────────────────────────────────┐
│                    DEEPSEEK TIMELINE                          │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  2023 Nov    DeepSeek-67B (Dense)                            │
│              └─ First model, competitive with LLaMA-2 70B    │
│                                                               │
│  2024 Jan    DeepSeek-MoE 16B                                │
│              └─ 2B active params, MoE architecture           │
│              └─ Matched LLaMA-2 7B with 40% compute          │
│                                                               │
│  2024 May    DeepSeek-V2 236B                                │
│              └─ 21B active params                            │
│              └─ MLA introduced (game-changer)                │
│              └─ Matched GPT-4 on many benchmarks             │
│                                                               │
│  2024 Dec    DeepSeek-V3 671B                                │
│              └─ 37B active params                            │
│              └─ State-of-the-art open model                  │
│              └─ Trained for only $5.6M                       │
│              └─ GPT-4o level performance                     │
│                                                               │
│  2025 Jan    DeepSeek-R1                                     │
│              └─ Reasoning model (like o1)                    │
│              └─ Extended thinking chains                     │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Model Comparison

| Model | Total Params | Active Params | Training Tokens | Cost |
|-------|--------------|---------------|-----------------|------|
| GPT-4 | ~1.8T (rumored) | All | - | $100M+ |
| LLaMA-3 70B | 70B | 70B | 15T | - |
| DeepSeek-V2 | 236B | 21B | 8.1T | - |
| DeepSeek-V3 | 671B | 37B | 14.8T | $5.6M |
| Mixtral 8x22B | 141B | 39B | - | - |

---

## 🏗️ Core Architecture

### DeepSeek-MoE Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   DEEPSEEK-MoE LAYER                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Input (hidden states)                                       │
│      │                                                       │
│      ▼                                                       │
│  ┌────────────────────┐                                      │
│  │   Multi-Head       │  ← Standard or MLA                   │
│  │   Attention        │                                      │
│  └────────────────────┘                                      │
│      │                                                       │
│      ▼                                                       │
│  ┌────────────────────┐                                      │
│  │   Add & Norm       │                                      │
│  └────────────────────┘                                      │
│      │                                                       │
│      ├───────────────────────────────────────┐               │
│      ▼                                       ▼               │
│  ┌──────────┐    ┌───────────────────────────────────┐       │
│  │  Shared  │    │         Routed Experts            │       │
│  │  Expert  │    │  ┌───┐ ┌───┐ ┌───┐ ... ┌───┐     │       │
│  │          │    │  │E1 │ │E2 │ │E3 │     │E_N│     │       │
│  └──────────┘    │  └───┘ └───┘ └───┘     └───┘     │       │
│      │           │        ▲                          │       │
│      │           │        │ Router selects Top-K     │       │
│      │           └───────────────────────────────────┘       │
│      │                    │                                  │
│      └──────────┬─────────┘                                  │
│                 ▼                                            │
│            Combine outputs                                   │
│                 │                                            │
│                 ▼                                            │
│  ┌────────────────────┐                                      │
│  │   Add & Norm       │                                      │
│  └────────────────────┘                                      │
│                 │                                            │
│                 ▼                                            │
│            Output                                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Shared + Routed Experts

DeepSeek uses **shared experts** (always active) + **routed experts** (conditionally active):

```python
# Conceptual implementation
class DeepSeekMoE(nn.Module):
    def __init__(
        self,
        hidden_size: int,
        num_shared_experts: int = 2,
        num_routed_experts: int = 160,
        num_experts_per_tok: int = 6,
        intermediate_size: int = 1536
    ):
        super().__init__()
        
        # Shared experts - always active
        self.shared_experts = nn.ModuleList([
            FFN(hidden_size, intermediate_size)
            for _ in range(num_shared_experts)
        ])
        
        # Routed experts - selectively active
        self.routed_experts = nn.ModuleList([
            FFN(hidden_size, intermediate_size)
            for _ in range(num_routed_experts)
        ])
        
        # Router (gating network)
        self.router = nn.Linear(hidden_size, num_routed_experts)
        
        self.num_experts_per_tok = num_experts_per_tok
    
    def forward(self, x):
        batch_size, seq_len, hidden_size = x.shape
        
        # Shared experts output
        shared_out = sum(expert(x) for expert in self.shared_experts)
        
        # Router logits
        router_logits = self.router(x)  # [B, S, num_experts]
        
        # Top-K routing
        topk_weights, topk_indices = torch.topk(
            F.softmax(router_logits, dim=-1),
            k=self.num_experts_per_tok
        )
        
        # Routed experts output
        routed_out = self._compute_routed_output(x, topk_weights, topk_indices)
        
        # Combine
        return shared_out + routed_out
```

### Fine-Grained Expert Segmentation

DeepSeek uses **more but smaller** experts:

```
Traditional MoE (Mixtral):
┌─────────────────────────────────────────────────────────────┐
│  8 experts × 7B params each = 56B total                     │
│  Activate 2 experts = 14B active                            │
│                                                              │
│  [████████] [████████] [████████] [████████]                │
│  [████████] [████████] [████████] [████████]                │
│   Expert 1   Expert 2   Expert 3  ... Expert 8              │
└─────────────────────────────────────────────────────────────┘

DeepSeek MoE:
┌─────────────────────────────────────────────────────────────┐
│  160 experts × 0.1B params each = 16B total                 │
│  Activate 6 experts = 0.6B active                           │
│                                                              │
│  [█] [█] [█] [█] [█] [█] [█] [█] [█] [█] [█] [█] [█] [█]... │
│  E1  E2  E3  E4  E5  E6  E7  E8  E9 E10 E11 E12 E13 E14     │
│                                                              │
│  More fine-grained specialization!                          │
└─────────────────────────────────────────────────────────────┘
```

**Benefits:**
- More flexible routing
- Better expert specialization
- Lower activated parameters

---

## 🚀 DeepSeek-V2 Innovations

### Multi-head Latent Attention (MLA)

The biggest innovation in DeepSeek-V2. Traditional attention has huge KV cache:

```
Standard Multi-Head Attention (MHA):
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  KV Cache per layer = 2 × n_heads × head_dim × seq_len     │
│                                                              │
│  For 128 heads, 128 dim, 32K context:                       │
│  = 2 × 128 × 128 × 32768 = 1GB per layer!                   │
│                                                              │
│  60 layers = 60GB just for KV cache!                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**MLA Solution:** Compress KV into a low-rank latent space:

```
Multi-head Latent Attention (MLA):
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  Instead of storing full K, V:                              │
│                                                              │
│  h_t (hidden) ──► W_DKV ──► c_t (compressed latent)         │
│                              │                               │
│                              ├──► W_UK ──► K (reconstructed)│
│                              └──► W_UV ──► V (reconstructed)│
│                                                              │
│  Compression ratio: d_c / (n_h × d_h) ≈ 1/12               │
│                                                              │
│  KV Cache now: 5GB instead of 60GB!                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### MLA Mathematical Formulation

Standard MHA:
$$Q = W_Q h, \quad K = W_K h, \quad V = W_V h$$
$$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$

MLA with low-rank compression:
$$c^{KV} = W^{DKV} h \quad \text{(compress to latent)}$$
$$K = W^{UK} c^{KV}, \quad V = W^{UV} c^{KV} \quad \text{(reconstruct)}$$

Where:
- $W^{DKV} \in \mathbb{R}^{d_c \times d}$ compresses hidden state
- $c^{KV} \in \mathbb{R}^{d_c}$ is the compressed latent (much smaller!)
- $W^{UK}, W^{UV}$ reconstruct K and V

**Key insight:** We only cache $c^{KV}$, not full K, V!

### Decoupled RoPE

Problem: RoPE (Rotary Position Embedding) doesn't work directly with MLA.

Solution: Use separate positional queries/keys:

```python
class MLAWithRoPE(nn.Module):
    def __init__(self, d_model, n_heads, d_c, d_rope):
        super().__init__()
        # Compression
        self.W_DKV = nn.Linear(d_model, d_c)
        self.W_UK = nn.Linear(d_c, n_heads * d_head)
        self.W_UV = nn.Linear(d_c, n_heads * d_head)
        
        # Decoupled RoPE projections
        self.W_KR = nn.Linear(d_model, d_rope)  # For position keys
        self.W_QR = nn.Linear(d_model, d_rope)  # For position queries
        
        self.rope = RotaryPositionEmbedding(d_rope)
    
    def forward(self, h, position_ids):
        # Compressed KV
        c_kv = self.W_DKV(h)  # Cache this!
        
        # Content-based K, V
        K_content = self.W_UK(c_kv)
        V = self.W_UV(c_kv)
        
        # Position-based K, Q (with RoPE)
        K_rope = self.rope(self.W_KR(h), position_ids)
        Q_rope = self.rope(self.W_QR(h), position_ids)
        
        # Combine for attention
        K = torch.cat([K_content, K_rope], dim=-1)
        Q = torch.cat([Q_content, Q_rope], dim=-1)
        
        return attention(Q, K, V)
```

---

## 🔥 DeepSeek-V3 Architecture

### Overview

DeepSeek-V3 pushes boundaries further:

| Component | DeepSeek-V2 | DeepSeek-V3 |
|-----------|-------------|-------------|
| Total Params | 236B | 671B |
| Active Params | 21B | 37B |
| Routed Experts | 160 | 256 |
| Active Experts | 6 | 8 |
| Shared Experts | 2 | 1 |
| Training Tokens | 8.1T | 14.8T |
| Context | 128K | 128K |

### Auxiliary-Loss-Free Load Balancing

Traditional MoE uses auxiliary loss to balance expert usage:

```python
# Traditional approach (hurts quality)
total_loss = language_model_loss + α * load_balance_loss

# Load balance loss penalizes uneven expert usage
# But this can hurt model quality!
```

DeepSeek-V3 uses **auxiliary-loss-free** approach:

```python
class AuxFreeMoE(nn.Module):
    """
    Auxiliary-loss-free load balancing via bias adjustment
    """
    def __init__(self, num_experts, num_active):
        super().__init__()
        self.router = nn.Linear(hidden_size, num_experts)
        
        # Learnable bias for load balancing (not part of loss)
        self.expert_bias = nn.Parameter(torch.zeros(num_experts))
        
        # Running statistics
        self.register_buffer('expert_counts', torch.zeros(num_experts))
    
    def forward(self, x):
        # Router logits with bias
        logits = self.router(x) + self.expert_bias
        
        # Top-K selection
        weights, indices = torch.topk(F.softmax(logits, dim=-1), k=self.num_active)
        
        # Update running counts (for bias adjustment)
        self._update_counts(indices)
        
        return self._dispatch(x, weights, indices)
    
    def _update_counts(self, indices):
        """Update expert usage statistics"""
        counts = torch.bincount(indices.flatten(), minlength=self.num_experts)
        self.expert_counts = 0.99 * self.expert_counts + 0.01 * counts.float()
    
    def adjust_bias(self):
        """Adjust bias to balance usage (called periodically during training)"""
        target = self.expert_counts.mean()
        
        # Increase bias for underused experts
        # Decrease bias for overused experts
        adjustment = 0.001 * (target - self.expert_counts)
        self.expert_bias.data += adjustment
```

**Key insight:** Balance through bias adjustment, not loss penalty!

### Multi-Token Prediction (MTP)

Instead of predicting 1 token at a time, predict multiple:

```
Standard autoregressive:
┌─────────────────────────────────────────────────────────────┐
│  "The cat" → predict → "sat"                                │
│  "The cat sat" → predict → "on"                             │
│  "The cat sat on" → predict → "the"                         │
│  ...                                                         │
└─────────────────────────────────────────────────────────────┘

Multi-Token Prediction:
┌─────────────────────────────────────────────────────────────┐
│  "The cat" → predict → ["sat", "on", "the"]                 │
│  "The cat sat on the" → predict → ["mat", ".", "<eos>"]     │
│                                                              │
│  Faster training, better representation learning!           │
└─────────────────────────────────────────────────────────────┘
```

```python
class MultiTokenPrediction(nn.Module):
    def __init__(self, hidden_size, vocab_size, num_future_tokens=4):
        super().__init__()
        self.num_future = num_future_tokens
        
        # Separate prediction heads for each future position
        self.prediction_heads = nn.ModuleList([
            nn.Linear(hidden_size, vocab_size)
            for _ in range(num_future_tokens)
        ])
    
    def forward(self, hidden_states, labels=None):
        """
        hidden_states: [batch, seq_len, hidden]
        labels: [batch, seq_len]
        """
        losses = []
        
        for i, head in enumerate(self.prediction_heads):
            # Predict token at position t+i+1 from hidden state at t
            logits = head(hidden_states)
            
            if labels is not None:
                # Shift labels for each prediction head
                shifted_labels = labels[:, i+1:]
                logits = logits[:, :-(i+1)]
                
                loss = F.cross_entropy(
                    logits.reshape(-1, logits.size(-1)),
                    shifted_labels.reshape(-1)
                )
                losses.append(loss)
        
        return sum(losses) / len(losses) if losses else None
```

### FP8 Training

DeepSeek-V3 was the first major model trained with FP8:

```
┌─────────────────────────────────────────────────────────────┐
│                 FP8 vs FP16 COMPARISON                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  FP16 (16-bit):                                             │
│  ┌────────────────────────────────────────┐                 │
│  │ 1 sign │ 5 exponent │ 10 mantissa      │                 │
│  └────────────────────────────────────────┘                 │
│  Range: ~6.1e-5 to ~65504                                   │
│  Memory: 2 bytes per value                                  │
│                                                              │
│  FP8 (8-bit):                                               │
│  ┌────────────────────────────────────────┐                 │
│  │ 1 sign │ 4 exp │ 3 mantissa (E4M3)     │                 │
│  └────────────────────────────────────────┘                 │
│  Range: ~1.95e-3 to 448                                     │
│  Memory: 1 byte per value (50% reduction!)                  │
│                                                              │
│  DeepSeek-V3: Uses block-wise quantization + scaling       │
│  to maintain accuracy with FP8                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

```python
# Simplified FP8 training approach
class FP8Linear(nn.Module):
    def __init__(self, in_features, out_features):
        super().__init__()
        self.weight = nn.Parameter(torch.randn(out_features, in_features))
        self.register_buffer('weight_scale', torch.tensor(1.0))
        self.register_buffer('input_scale', torch.tensor(1.0))
    
    def forward(self, x):
        # Dynamic scaling
        input_scale = x.abs().max() / 448  # FP8 E4M3 max
        weight_scale = self.weight.abs().max() / 448
        
        # Quantize to FP8
        x_fp8 = (x / input_scale).to(torch.float8_e4m3fn)
        w_fp8 = (self.weight / weight_scale).to(torch.float8_e4m3fn)
        
        # Compute in FP8 (hardware accelerated on H100)
        out = torch.mm(x_fp8.float(), w_fp8.float().T)
        
        # Rescale
        return out * input_scale * weight_scale
```

---

## 🎓 Training Strategies

### DeepSeek Training Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                 DEEPSEEK TRAINING PIPELINE                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Stage 1: Pre-training (14.8T tokens)                       │
│  ├─ 4K context initially                                    │
│  ├─ Gradually extend to 128K                                │
│  └─ FP8 mixed precision                                     │
│                                                              │
│  Stage 2: Context Extension                                  │
│  ├─ YaRN position interpolation                             │
│  └─ Long context fine-tuning                                │
│                                                              │
│  Stage 3: Supervised Fine-Tuning (SFT)                      │
│  ├─ 1.5M instruction samples                                │
│  └─ Multi-turn conversations                                │
│                                                              │
│  Stage 4: Reinforcement Learning (RL)                       │
│  ├─ Group Relative Policy Optimization (GRPO)               │
│  └─ Rule-based + Model-based rewards                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### GRPO (Group Relative Policy Optimization)

DeepSeek uses GRPO instead of PPO:

```python
def grpo_loss(
    policy_model,
    reference_model,
    prompts,
    group_size=8
):
    """
    Group Relative Policy Optimization
    - Sample multiple responses per prompt
    - Rank within group
    - Optimize relative to group average
    """
    total_loss = 0
    
    for prompt in prompts:
        # Sample multiple responses
        responses = []
        for _ in range(group_size):
            response = policy_model.generate(prompt)
            reward = reward_model(prompt, response)
            responses.append((response, reward))
        
        # Compute group statistics
        rewards = [r[1] for r in responses]
        mean_reward = sum(rewards) / len(rewards)
        std_reward = torch.std(torch.tensor(rewards))
        
        # Normalized advantage
        advantages = [(r - mean_reward) / (std_reward + 1e-8) for r in rewards]
        
        # Policy gradient with KL constraint
        for (response, _), advantage in zip(responses, advantages):
            log_prob = policy_model.log_prob(prompt, response)
            ref_log_prob = reference_model.log_prob(prompt, response)
            
            # Clipped objective with KL penalty
            ratio = (log_prob - ref_log_prob).exp()
            clipped = torch.clamp(ratio, 0.8, 1.2)
            
            loss = -torch.min(ratio * advantage, clipped * advantage)
            loss += 0.01 * (log_prob - ref_log_prob)  # KL penalty
            
            total_loss += loss
    
    return total_loss
```

---

## 💻 Implementation

### Minimal DeepSeek-Style MoE

```python
"""
Minimal DeepSeek-style MoE Implementation
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Tuple, Optional

# ============================================
# EXPERT FEED-FORWARD NETWORK
# ============================================

class ExpertFFN(nn.Module):
    """Single expert FFN with SiLU activation"""
    def __init__(self, hidden_size: int, intermediate_size: int):
        super().__init__()
        self.gate_proj = nn.Linear(hidden_size, intermediate_size, bias=False)
        self.up_proj = nn.Linear(hidden_size, intermediate_size, bias=False)
        self.down_proj = nn.Linear(intermediate_size, hidden_size, bias=False)
    
    def forward(self, x):
        return self.down_proj(F.silu(self.gate_proj(x)) * self.up_proj(x))


# ============================================
# DEEPSEEK-STYLE MOE LAYER
# ============================================

class DeepSeekMoE(nn.Module):
    """
    DeepSeek-style MoE with:
    - Shared + routed experts
    - Fine-grained expert segmentation
    - Auxiliary-loss-free load balancing
    """
    def __init__(
        self,
        hidden_size: int = 4096,
        intermediate_size: int = 1536,
        num_shared_experts: int = 2,
        num_routed_experts: int = 64,
        num_experts_per_tok: int = 6,
    ):
        super().__init__()
        
        self.num_routed_experts = num_routed_experts
        self.num_experts_per_tok = num_experts_per_tok
        
        # Shared experts (always active)
        self.shared_experts = nn.ModuleList([
            ExpertFFN(hidden_size, intermediate_size * 2)  # Larger shared
            for _ in range(num_shared_experts)
        ])
        
        # Routed experts (selectively active)
        self.routed_experts = nn.ModuleList([
            ExpertFFN(hidden_size, intermediate_size)
            for _ in range(num_routed_experts)
        ])
        
        # Router
        self.router = nn.Linear(hidden_size, num_routed_experts, bias=False)
        
        # Aux-loss-free bias
        self.expert_bias = nn.Parameter(
            torch.zeros(num_routed_experts),
            requires_grad=False
        )
        
        # Running counts for bias adjustment
        self.register_buffer(
            'expert_counts',
            torch.zeros(num_routed_experts)
        )
        self.register_buffer('total_tokens', torch.tensor(0))
    
    def forward(
        self,
        hidden_states: torch.Tensor
    ) -> Tuple[torch.Tensor, dict]:
        batch_size, seq_len, hidden_size = hidden_states.shape
        
        # Shared experts (always computed)
        shared_output = sum(
            expert(hidden_states)
            for expert in self.shared_experts
        )
        
        # Flatten for routing
        flat_hidden = hidden_states.view(-1, hidden_size)
        num_tokens = flat_hidden.shape[0]
        
        # Router scores with bias
        router_logits = self.router(flat_hidden) + self.expert_bias
        routing_weights = F.softmax(router_logits, dim=-1)
        
        # Top-K selection
        topk_weights, topk_indices = torch.topk(
            routing_weights,
            k=self.num_experts_per_tok,
            dim=-1
        )
        
        # Normalize selected weights
        topk_weights = topk_weights / topk_weights.sum(dim=-1, keepdim=True)
        
        # Compute routed output
        routed_output = torch.zeros_like(flat_hidden)
        
        for i, expert in enumerate(self.routed_experts):
            # Find tokens routed to this expert
            expert_mask = (topk_indices == i).any(dim=-1)
            
            if expert_mask.any():
                expert_tokens = flat_hidden[expert_mask]
                expert_out = expert(expert_tokens)
                
                # Weight by routing score
                token_indices = expert_mask.nonzero().squeeze(-1)
                for idx in token_indices:
                    weight_idx = (topk_indices[idx] == i).nonzero().item()
                    weight = topk_weights[idx, weight_idx]
                    routed_output[idx] += weight * expert_out[
                        (token_indices == idx).nonzero().item()
                    ]
        
        # Update statistics (for bias adjustment)
        if self.training:
            self._update_counts(topk_indices)
        
        # Combine
        routed_output = routed_output.view(batch_size, seq_len, hidden_size)
        output = shared_output + routed_output
        
        # Metrics for logging
        metrics = {
            'router_entropy': -(routing_weights * routing_weights.log()).sum(-1).mean(),
            'expert_usage': (self.expert_counts / self.total_tokens).tolist()
        }
        
        return output, metrics
    
    def _update_counts(self, indices: torch.Tensor):
        """Update expert usage counts"""
        flat_indices = indices.flatten()
        counts = torch.bincount(
            flat_indices,
            minlength=self.num_routed_experts
        ).float()
        
        self.expert_counts += counts
        self.total_tokens += flat_indices.shape[0]
    
    def update_bias(self, gamma: float = 0.001):
        """Adjust bias for load balancing (call periodically)"""
        if self.total_tokens > 0:
            usage = self.expert_counts / self.total_tokens
            target = 1.0 / self.num_routed_experts
            
            # Push toward uniform usage
            self.expert_bias.data += gamma * (target - usage)
            
            # Reset counters
            self.expert_counts.zero_()
            self.total_tokens.zero_()


# ============================================
# MULTI-HEAD LATENT ATTENTION (MLA)
# ============================================

class MultiHeadLatentAttention(nn.Module):
    """
    Simplified MLA implementation
    Compresses KV cache using low-rank projection
    """
    def __init__(
        self,
        hidden_size: int = 4096,
        num_heads: int = 32,
        head_dim: int = 128,
        kv_lora_rank: int = 512,  # Compressed dimension
        rope_dim: int = 64,
    ):
        super().__init__()
        
        self.num_heads = num_heads
        self.head_dim = head_dim
        self.kv_lora_rank = kv_lora_rank
        
        # Query projection
        self.q_proj = nn.Linear(hidden_size, num_heads * head_dim, bias=False)
        
        # KV compression (down-projection)
        self.kv_down_proj = nn.Linear(hidden_size, kv_lora_rank, bias=False)
        
        # KV reconstruction (up-projection)
        self.k_up_proj = nn.Linear(kv_lora_rank, num_heads * head_dim, bias=False)
        self.v_up_proj = nn.Linear(kv_lora_rank, num_heads * head_dim, bias=False)
        
        # Decoupled RoPE projections
        self.q_rope_proj = nn.Linear(hidden_size, rope_dim, bias=False)
        self.k_rope_proj = nn.Linear(hidden_size, rope_dim, bias=False)
        
        # Output projection
        self.o_proj = nn.Linear(num_heads * head_dim, hidden_size, bias=False)
        
        self.scale = head_dim ** -0.5
    
    def forward(
        self,
        hidden_states: torch.Tensor,
        attention_mask: Optional[torch.Tensor] = None,
        kv_cache: Optional[torch.Tensor] = None,
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        batch_size, seq_len, _ = hidden_states.shape
        
        # Query
        q = self.q_proj(hidden_states)
        q = q.view(batch_size, seq_len, self.num_heads, self.head_dim)
        q = q.transpose(1, 2)  # [B, H, S, D]
        
        # Compress KV (THIS is what we cache!)
        kv_compressed = self.kv_down_proj(hidden_states)  # [B, S, kv_lora_rank]
        
        # Handle caching
        if kv_cache is not None:
            kv_compressed = torch.cat([kv_cache, kv_compressed], dim=1)
        
        # Reconstruct K and V from compressed representation
        k = self.k_up_proj(kv_compressed)
        v = self.v_up_proj(kv_compressed)
        
        k = k.view(batch_size, -1, self.num_heads, self.head_dim).transpose(1, 2)
        v = v.view(batch_size, -1, self.num_heads, self.head_dim).transpose(1, 2)
        
        # Attention
        attn_weights = torch.matmul(q, k.transpose(-2, -1)) * self.scale
        
        if attention_mask is not None:
            attn_weights = attn_weights + attention_mask
        
        attn_weights = F.softmax(attn_weights, dim=-1)
        attn_output = torch.matmul(attn_weights, v)
        
        # Reshape and project
        attn_output = attn_output.transpose(1, 2).reshape(
            batch_size, seq_len, self.num_heads * self.head_dim
        )
        output = self.o_proj(attn_output)
        
        return output, kv_compressed  # Return compressed cache


# ============================================
# DEEPSEEK DECODER LAYER
# ============================================

class DeepSeekDecoderLayer(nn.Module):
    def __init__(
        self,
        hidden_size: int = 4096,
        num_heads: int = 32,
        num_routed_experts: int = 64,
        is_moe_layer: bool = True,
    ):
        super().__init__()
        
        self.attention = MultiHeadLatentAttention(hidden_size, num_heads)
        self.attention_norm = nn.RMSNorm(hidden_size)
        
        if is_moe_layer:
            self.ffn = DeepSeekMoE(hidden_size, num_routed_experts=num_routed_experts)
        else:
            self.ffn = ExpertFFN(hidden_size, hidden_size * 4)
        
        self.ffn_norm = nn.RMSNorm(hidden_size)
        self.is_moe_layer = is_moe_layer
    
    def forward(
        self,
        hidden_states: torch.Tensor,
        attention_mask: Optional[torch.Tensor] = None,
        kv_cache: Optional[torch.Tensor] = None,
    ):
        # Attention with residual
        residual = hidden_states
        hidden_states = self.attention_norm(hidden_states)
        hidden_states, new_cache = self.attention(
            hidden_states, attention_mask, kv_cache
        )
        hidden_states = residual + hidden_states
        
        # FFN with residual
        residual = hidden_states
        hidden_states = self.ffn_norm(hidden_states)
        
        if self.is_moe_layer:
            hidden_states, moe_metrics = self.ffn(hidden_states)
        else:
            hidden_states = self.ffn(hidden_states)
            moe_metrics = {}
        
        hidden_states = residual + hidden_states
        
        return hidden_states, new_cache, moe_metrics


# ============================================
# USAGE EXAMPLE
# ============================================

if __name__ == "__main__":
    # Create a single layer
    layer = DeepSeekDecoderLayer(
        hidden_size=4096,
        num_heads=32,
        num_routed_experts=64,
        is_moe_layer=True
    )
    
    # Sample input
    x = torch.randn(2, 128, 4096)  # [batch, seq_len, hidden]
    
    # Forward pass
    output, kv_cache, metrics = layer(x)
    
    print(f"Input shape: {x.shape}")
    print(f"Output shape: {output.shape}")
    print(f"KV cache shape: {kv_cache.shape}")
    print(f"Router entropy: {metrics.get('router_entropy', 'N/A')}")
    
    # Compare KV cache size
    standard_kv_size = 2 * 32 * 128 * 128  # 2 * heads * head_dim * seq
    mla_kv_size = 512 * 128  # kv_lora_rank * seq
    
    print(f"\nKV Cache Compression:")
    print(f"Standard MHA: {standard_kv_size:,} values")
    print(f"MLA: {mla_kv_size:,} values")
    print(f"Compression ratio: {standard_kv_size / mla_kv_size:.1f}x")
```

---

## 🛠️ Hands-On Project

### Project: Build a Mini DeepSeek

```python
"""
Project: Mini DeepSeek Language Model
A simplified but complete implementation
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader
from typing import Optional, Tuple

# ============================================
# CONFIGURATION
# ============================================

class MiniDeepSeekConfig:
    # Model architecture
    hidden_size: int = 1024
    num_layers: int = 12
    num_heads: int = 16
    head_dim: int = 64
    
    # MoE configuration
    num_shared_experts: int = 1
    num_routed_experts: int = 8
    num_experts_per_tok: int = 2
    expert_intermediate_size: int = 512
    
    # MLA configuration
    kv_lora_rank: int = 128
    
    # Training
    vocab_size: int = 32000
    max_seq_len: int = 2048
    
    # Which layers use MoE (every 2nd layer)
    moe_layer_freq: int = 2


# ============================================
# MINI DEEPSEEK MODEL
# ============================================

class MiniDeepSeek(nn.Module):
    def __init__(self, config: MiniDeepSeekConfig):
        super().__init__()
        self.config = config
        
        # Embeddings
        self.embed_tokens = nn.Embedding(config.vocab_size, config.hidden_size)
        
        # Decoder layers
        self.layers = nn.ModuleList([
            DeepSeekDecoderLayer(
                hidden_size=config.hidden_size,
                num_heads=config.num_heads,
                num_routed_experts=config.num_routed_experts,
                is_moe_layer=(i % config.moe_layer_freq == 0)
            )
            for i in range(config.num_layers)
        ])
        
        # Final norm and head
        self.norm = nn.RMSNorm(config.hidden_size)
        self.lm_head = nn.Linear(config.hidden_size, config.vocab_size, bias=False)
        
        # Tie embeddings
        self.lm_head.weight = self.embed_tokens.weight
        
        # Initialize
        self.apply(self._init_weights)
    
    def _init_weights(self, module):
        if isinstance(module, nn.Linear):
            torch.nn.init.normal_(module.weight, mean=0.0, std=0.02)
            if module.bias is not None:
                torch.nn.init.zeros_(module.bias)
        elif isinstance(module, nn.Embedding):
            torch.nn.init.normal_(module.weight, mean=0.0, std=0.02)
    
    def forward(
        self,
        input_ids: torch.Tensor,
        attention_mask: Optional[torch.Tensor] = None,
        labels: Optional[torch.Tensor] = None,
    ):
        batch_size, seq_len = input_ids.shape
        
        # Embeddings
        hidden_states = self.embed_tokens(input_ids)
        
        # Create causal mask
        if attention_mask is None:
            attention_mask = torch.triu(
                torch.full((seq_len, seq_len), float('-inf')),
                diagonal=1
            ).to(hidden_states.device)
        
        # Forward through layers
        all_moe_metrics = []
        
        for layer in self.layers:
            hidden_states, _, moe_metrics = layer(
                hidden_states,
                attention_mask=attention_mask
            )
            if moe_metrics:
                all_moe_metrics.append(moe_metrics)
        
        # Final norm
        hidden_states = self.norm(hidden_states)
        
        # Language modeling head
        logits = self.lm_head(hidden_states)
        
        # Compute loss if labels provided
        loss = None
        if labels is not None:
            shift_logits = logits[:, :-1, :].contiguous()
            shift_labels = labels[:, 1:].contiguous()
            loss = F.cross_entropy(
                shift_logits.view(-1, self.config.vocab_size),
                shift_labels.view(-1)
            )
        
        return {
            'loss': loss,
            'logits': logits,
            'moe_metrics': all_moe_metrics
        }
    
    @torch.no_grad()
    def generate(
        self,
        input_ids: torch.Tensor,
        max_new_tokens: int = 100,
        temperature: float = 1.0,
        top_p: float = 0.9,
    ):
        """Simple generation with nucleus sampling"""
        
        for _ in range(max_new_tokens):
            # Forward pass
            outputs = self.forward(input_ids)
            
            # Get next token logits
            next_token_logits = outputs['logits'][:, -1, :] / temperature
            
            # Top-p sampling
            sorted_logits, sorted_indices = torch.sort(
                next_token_logits, descending=True
            )
            cumulative_probs = torch.cumsum(
                F.softmax(sorted_logits, dim=-1), dim=-1
            )
            
            # Remove tokens with cumulative probability above threshold
            sorted_indices_to_remove = cumulative_probs > top_p
            sorted_indices_to_remove[:, 1:] = sorted_indices_to_remove[:, :-1].clone()
            sorted_indices_to_remove[:, 0] = False
            
            indices_to_remove = sorted_indices_to_remove.scatter(
                1, sorted_indices, sorted_indices_to_remove
            )
            next_token_logits[indices_to_remove] = float('-inf')
            
            # Sample
            probs = F.softmax(next_token_logits, dim=-1)
            next_token = torch.multinomial(probs, num_samples=1)
            
            # Append
            input_ids = torch.cat([input_ids, next_token], dim=-1)
            
            # Stop at EOS (assuming 2 is EOS)
            if next_token.item() == 2:
                break
        
        return input_ids
    
    def count_parameters(self):
        """Count total and active parameters"""
        total = sum(p.numel() for p in self.parameters())
        
        # Estimate active params (simplified)
        moe_layers = sum(1 for l in self.layers if l.is_moe_layer)
        dense_layers = len(self.layers) - moe_layers
        
        # Active = dense layers + shared experts + selected routed experts
        active_ratio = (
            dense_layers + 
            moe_layers * (
                self.config.num_shared_experts + 
                self.config.num_experts_per_tok
            ) / (
                self.config.num_shared_experts + 
                self.config.num_routed_experts
            )
        ) / len(self.layers)
        
        active = int(total * active_ratio)
        
        return {
            'total': total,
            'active': active,
            'ratio': active / total
        }


# ============================================
# TRAINING LOOP
# ============================================

def train_mini_deepseek():
    """Simple training loop"""
    
    config = MiniDeepSeekConfig()
    model = MiniDeepSeek(config)
    
    # Print model stats
    params = model.count_parameters()
    print(f"Model Statistics:")
    print(f"  Total parameters: {params['total']:,}")
    print(f"  Active parameters: {params['active']:,}")
    print(f"  Active ratio: {params['ratio']:.1%}")
    
    # Optimizer
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4)
    
    # Simple training with random data
    model.train()
    
    for step in range(100):
        # Random batch
        input_ids = torch.randint(0, config.vocab_size, (4, 512))
        labels = input_ids.clone()
        
        # Forward
        outputs = model(input_ids, labels=labels)
        loss = outputs['loss']
        
        # Backward
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        
        # Update MoE biases periodically
        if step % 10 == 0:
            for layer in model.layers:
                if layer.is_moe_layer:
                    layer.ffn.update_bias()
        
        if step % 10 == 0:
            print(f"Step {step}: Loss = {loss.item():.4f}")
    
    print("\nTraining complete!")
    
    # Test generation
    test_input = torch.tensor([[1, 100, 200, 300]])  # Some tokens
    generated = model.generate(test_input, max_new_tokens=20)
    print(f"\nGenerated tokens: {generated[0].tolist()}")


if __name__ == "__main__":
    train_mini_deepseek()
```

---

## ⚠️ Common Mistakes

### 1. Ignoring Load Balancing

```python
# ❌ Bad - No load balancing
class NaiveMoE(nn.Module):
    def forward(self, x):
        # All tokens might go to same expert!
        scores = self.router(x)
        top_idx = scores.argmax(dim=-1)
        # Expert 0 overloaded, others idle

# ✅ Good - With load balancing
class BalancedMoE(nn.Module):
    def forward(self, x):
        scores = self.router(x) + self.expert_bias  # Bias helps balance
        # Periodically adjust bias based on usage
```

### 2. Wrong KV Cache Implementation

```python
# ❌ Bad - Caching full K, V (defeats purpose of MLA)
def attention_forward(self, x, kv_cache):
    k = self.k_proj(x)
    v = self.v_proj(x)
    if kv_cache is not None:
        k = torch.cat([kv_cache['k'], k], dim=1)  # Full K
        v = torch.cat([kv_cache['v'], v], dim=1)  # Full V
    return output, {'k': k, 'v': v}  # Huge cache!

# ✅ Good - Cache only compressed latent
def mla_forward(self, x, kv_cache):
    c_kv = self.compress(x)  # Small!
    if kv_cache is not None:
        c_kv = torch.cat([kv_cache, c_kv], dim=1)
    k = self.expand_k(c_kv)
    v = self.expand_v(c_kv)
    return output, c_kv  # Only cache compressed
```

### 3. FP8 Without Scaling

```python
# ❌ Bad - Direct FP8 conversion (overflow/underflow)
x_fp8 = x.to(torch.float8_e4m3fn)  # Values might be out of range!

# ✅ Good - Proper scaling
scale = x.abs().max() / 448  # FP8 E4M3 max value
x_scaled = x / scale
x_fp8 = x_scaled.to(torch.float8_e4m3fn)
# Remember to rescale output!
```

---

## 🎯 Interview Questions

### Q1: What makes DeepSeek-V3 training so cost-effective?

**Answer:**

| Factor | Contribution |
|--------|--------------|
| **MoE Architecture** | 37B/671B active = 94% compute savings |
| **MLA** | 90%+ KV cache reduction |
| **FP8 Training** | 2x memory efficiency |
| **Auxiliary-free balancing** | No quality loss from aux losses |
| **Efficient infrastructure** | Optimized for H800 clusters |

Total cost: ~$5.6M for 14.8T tokens (vs $100M+ for GPT-4)

---

### Q2: Explain Multi-head Latent Attention (MLA).

**Answer:**
MLA compresses Key-Value cache using low-rank projection:

**Standard MHA:**
- Cache: K and V matrices per layer
- Size: O(n_heads × head_dim × seq_len)

**MLA:**
- Compress h → c (small latent)
- Cache only c
- Reconstruct K, V from c when needed
- Size: O(latent_dim × seq_len)

**Compression ratio:** ~12x smaller cache

**Trade-off:** Slight compute for compression vs huge memory savings

---

### Q3: How does DeepSeek handle expert load balancing without auxiliary losses?

**Answer:**

Traditional approach:
$$L_{total} = L_{LM} + \alpha \cdot L_{balance}$$
Problem: Balance loss hurts quality

DeepSeek approach:
1. Track expert usage statistics
2. Maintain learnable bias per expert
3. Periodically adjust bias to encourage uniform usage
4. No gradient through balance mechanism

```python
# Pseudo-code
usage = expert_counts / total_tokens
target = 1 / num_experts
bias += learning_rate * (target - usage)
```

Benefit: Full focus on language modeling quality.

---

### Q4: Compare DeepSeek-MoE to Mixtral.

**Answer:**

| Aspect | Mixtral 8x22B | DeepSeek-V3 |
|--------|---------------|-------------|
| **Experts** | 8 large | 256 small + 1 shared |
| **Active** | 2 of 8 (25%) | 8 of 256 (3%) |
| **Expert Size** | ~22B each | ~0.5B each |
| **Routing** | Token-wise | Fine-grained token-wise |
| **Specialization** | Coarse | Fine-grained |

DeepSeek's approach:
- More flexible routing
- Better specialization
- Lower activation cost

---

### Q5: What is Multi-Token Prediction (MTP) and why use it?

**Answer:**
MTP predicts multiple future tokens simultaneously:

```
Standard: h_t → predict → token_{t+1}
MTP: h_t → predict → [token_{t+1}, token_{t+2}, token_{t+3}, token_{t+4}]
```

**Benefits:**
1. Richer training signal per example
2. Forces model to plan ahead
3. Better representation learning
4. Can enable speculative decoding

**Implementation:**
- Separate prediction head per future position
- Each head predicts from same hidden state
- Loss = average over all heads

---

## 📝 Homework

### Level 1: Basic
1. Explain MoE vs dense models to a friend
2. Calculate KV cache savings with MLA
3. List 3 DeepSeek innovations

### Level 2: Intermediate
1. Implement a simple router with top-K selection
2. Compare inference FLOPs: dense 70B vs MoE 70B (10B active)
3. Explain why shared experts are useful

### Level 3: Advanced
1. Implement simplified MLA
2. Build auxiliary-loss-free load balancing
3. Train a mini MoE on a small dataset

### Level 4: Expert
1. Implement full DeepSeek decoder layer
2. Add FP8 quantization
3. Benchmark against dense model of same active params

---

## 🔗 Resources

- [DeepSeek-V2 Paper](https://arxiv.org/abs/2405.04434)
- [DeepSeek-V3 Technical Report](https://github.com/deepseek-ai/DeepSeek-V3/blob/main/DeepSeek_V3.pdf)
- [DeepSeek GitHub](https://github.com/deepseek-ai)
- [DeepSeek-MoE Paper](https://arxiv.org/abs/2401.06066)
- [MLA Original Paper](https://arxiv.org/abs/2405.04434)

---

**Congratulations!** You've completed Week 6 - Trending Tech! 🎉

**Next:** [Week 7 - Advanced Topics](../Week-7-Advanced-Topics/README.md)
