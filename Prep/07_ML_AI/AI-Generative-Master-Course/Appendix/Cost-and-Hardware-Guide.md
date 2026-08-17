# 💰 Cost & Hardware Guide

## 📚 Table of Contents
1. [Cost Overview](#-cost-overview)
2. [API Costs](#-api-costs)
3. [GPU/Cloud Costs](#-gpucloud-costs)
4. [Hardware Requirements](#-hardware-requirements)
5. [Memory Estimation](#-memory-estimation)
6. [Cost Optimization](#-cost-optimization)
7. [Free Resources](#-free-resources)
8. [Budget Planning](#-budget-planning)

---

## 💵 Cost Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI/ML COST CATEGORIES                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. COMPUTE COSTS (Training & Inference)                        │
│     ├── GPU cloud: $0.50 - $5.00 / hour                         │
│     ├── API calls: $0.001 - $0.10 / 1K tokens                   │
│     └── Local GPU: $500 - $3000 (one-time)                      │
│                                                                  │
│  2. STORAGE COSTS                                                │
│     ├── Model weights: Free - $0.02/GB/month                    │
│     ├── Vector databases: Free - $0.25/million vectors          │
│     └── Datasets: Usually free or minimal                       │
│                                                                  │
│  3. DEVELOPMENT COSTS                                            │
│     ├── IDEs: Free (VS Code, PyCharm Community)                 │
│     ├── Notebooks: Free (Colab) or $10-50/month (Pro)           │
│     └── Tools: Mostly free (Git, Python, PyTorch)               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📱 API Costs

### OpenAI API Pricing (as of 2024)

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Best For |
|-------|----------------------|------------------------|----------|
| GPT-4o | $5.00 | $15.00 | Complex tasks |
| GPT-4o-mini | $0.15 | $0.60 | Cost-effective |
| GPT-4 Turbo | $10.00 | $30.00 | Long context |
| GPT-3.5 Turbo | $0.50 | $1.50 | Simple tasks |
| text-embedding-ada-002 | $0.10 | - | Embeddings |
| text-embedding-3-small | $0.02 | - | Cheaper embeddings |
| text-embedding-3-large | $0.13 | - | Better embeddings |

### Token Estimation

```python
def estimate_tokens(text: str) -> int:
    """Rough estimate: ~4 characters = 1 token for English."""
    return len(text) // 4

def estimate_cost(input_text: str, output_tokens: int, model: str = "gpt-4o-mini"):
    """Estimate API cost."""
    
    pricing = {
        "gpt-4o": {"input": 5.00, "output": 15.00},
        "gpt-4o-mini": {"input": 0.15, "output": 0.60},
        "gpt-3.5-turbo": {"input": 0.50, "output": 1.50},
    }
    
    input_tokens = estimate_tokens(input_text)
    prices = pricing[model]
    
    input_cost = (input_tokens / 1_000_000) * prices["input"]
    output_cost = (output_tokens / 1_000_000) * prices["output"]
    
    return {
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_cost": input_cost + output_cost
    }

# Example usage
result = estimate_cost("What is machine learning?", 500, "gpt-4o-mini")
print(f"Estimated cost: ${result['total_cost']:.4f}")
```

### Cost Examples

```
TASK: Build a chatbot that handles 1000 queries/day

Using GPT-4o-mini:
- Average query: 100 tokens input, 200 tokens output
- Daily tokens: 100K input + 200K output = 300K tokens
- Daily cost: ~$0.045 + $0.12 = $0.165/day
- Monthly cost: ~$5/month

Using GPT-4o:
- Same tokens: 300K/day
- Daily cost: ~$0.50 + $3.00 = $3.50/day
- Monthly cost: ~$105/month

SAVINGS: GPT-4o-mini is 20x cheaper!
```

### Other API Providers

| Provider | Model | Price (per 1M tokens) |
|----------|-------|----------------------|
| Anthropic | Claude 3.5 Sonnet | $3.00 input, $15.00 output |
| Anthropic | Claude 3 Haiku | $0.25 input, $1.25 output |
| Google | Gemini 1.5 Flash | $0.075 input, $0.30 output |
| Cohere | Command R | $0.50 input, $1.50 output |
| Groq | Llama 3 70B | Free (limited) |
| Together | Various | $0.20 - $2.00 |

---

## 🖥️ GPU/Cloud Costs

### Cloud GPU Providers

| Provider | GPU | $/hour | Best For |
|----------|-----|--------|----------|
| **Google Colab** | T4 | Free | Learning, small experiments |
| **Google Colab Pro** | T4/V100 | $10/month | Longer sessions |
| **Google Colab Pro+** | A100 | $50/month | Serious training |
| **AWS EC2** | T4 | $0.53/hr | Production |
| **AWS EC2** | A10G | $1.01/hr | Medium training |
| **AWS EC2** | A100 | $4.10/hr | Large models |
| **Lambda Labs** | A100 | $1.10/hr | Good value |
| **RunPod** | A100 | $1.44/hr | Flexible |
| **Vast.ai** | Various | $0.20-3.00/hr | Cheapest |
| **Modal** | A100 | $0.001/sec | Pay per second |

### Training Time Estimates

```
APPROXIMATE TRAINING TIMES (A100 40GB)

Fine-tuning LLaMA 7B (LoRA):
├── 1000 examples: ~30 minutes
├── 10000 examples: ~3-4 hours
└── Cost: $1-5

Fine-tuning BERT-base:
├── 10000 examples: ~1 hour
└── Cost: $1-2

Training CNN from scratch (MNIST):
├── Full training: ~10 minutes
└── Cost: <$1 (use Colab free!)

Training GPT-2 from scratch:
├── Small dataset: ~10-20 hours
└── Cost: $10-50

DO NOT train large models from scratch unless you have:
├── Good reason
├── Lots of money ($1000s-$100000s)
└── Months of time
```

### Local GPU Options

| GPU | VRAM | Price (USD) | Can Run |
|-----|------|-------------|---------|
| RTX 3060 | 12 GB | ~$300 | 7B models (quantized) |
| RTX 3080 | 10 GB | ~$500 | 7B models (quantized) |
| RTX 3090 | 24 GB | ~$900 | 13B models (quantized) |
| RTX 4070 | 12 GB | ~$550 | 7B models (quantized) |
| RTX 4080 | 16 GB | ~$800 | 7B-13B models |
| RTX 4090 | 24 GB | ~$1600 | 13B-30B models |
| A100 | 40/80 GB | ~$10000 | 70B+ models |

---

## 📊 Hardware Requirements

### Per-Week Requirements

| Week | Topic | GPU Needed? | Minimum VRAM | Recommended |
|------|-------|-------------|--------------|-------------|
| 0 | Setup | No | - | CPU + Colab |
| 1 | Foundations | No | - | CPU + Colab |
| 2 | GANs/VAEs | Optional | 4 GB | Colab T4 |
| 3 | Transformers | Yes | 8 GB | Colab T4 |
| 4 | Fine-tuning | Yes | 8-16 GB | Colab T4/A100 |
| 5 | RAG | Optional | 4 GB | CPU + Colab |
| 6 | Local LLMs | Yes | 8-24 GB | Local GPU |
| 7 | Diffusion | Yes | 8-16 GB | Colab T4/A100 |
| 8 | Deployment | No | - | CPU |

### Model Memory Requirements

```
MODEL SIZE → GPU MEMORY (Approximate)

For INFERENCE:
├── 7B parameters (fp16): ~14 GB
├── 7B parameters (int8): ~7 GB
├── 7B parameters (int4): ~4 GB
├── 13B parameters (fp16): ~26 GB
├── 13B parameters (int4): ~7 GB
├── 70B parameters (int4): ~35 GB
└── BERT-base: ~0.5 GB

For TRAINING:
├── 7B full fine-tune: ~100+ GB (not practical)
├── 7B LoRA: ~16-24 GB
├── 7B QLoRA: ~8-12 GB
├── BERT fine-tune: ~4-8 GB
└── Small CNN: ~2-4 GB

RULE OF THUMB:
├── Inference: ~2 bytes per parameter (fp16)
├── Training: ~8-12 bytes per parameter
└── LoRA training: ~4 bytes per parameter
```

### Memory Estimation Formula

```python
def estimate_model_memory(
    num_parameters: int,
    precision: str = "fp16",
    mode: str = "inference"
) -> float:
    """
    Estimate GPU memory needed in GB.
    
    Args:
        num_parameters: Number of model parameters (e.g., 7e9 for 7B)
        precision: "fp32", "fp16", "int8", "int4"
        mode: "inference" or "training"
    """
    
    bytes_per_param = {
        "fp32": 4,
        "fp16": 2,
        "int8": 1,
        "int4": 0.5
    }
    
    base_memory = num_parameters * bytes_per_param[precision]
    
    if mode == "training":
        # Training needs: weights + gradients + optimizer states
        # For Adam: weights + gradients + 2x momentum = 4x
        base_memory *= 4
    
    # Add 20% overhead for activations, etc.
    total_memory = base_memory * 1.2
    
    return total_memory / 1e9  # Convert to GB

# Examples
print(f"LLaMA 7B (fp16) inference: {estimate_model_memory(7e9, 'fp16', 'inference'):.1f} GB")
print(f"LLaMA 7B (int4) inference: {estimate_model_memory(7e9, 'int4', 'inference'):.1f} GB")
print(f"BERT-base training: {estimate_model_memory(110e6, 'fp16', 'training'):.1f} GB")
```

---

## 💡 Cost Optimization

### 1. Use Smaller Models

```python
# Instead of GPT-4:
# - Use GPT-4o-mini for simple tasks
# - Use Claude Haiku for quick responses
# - Use local small models for simple generation

# Cost reduction: 10-50x
```

### 2. Use Quantization

```python
# Run 7B model in 4GB VRAM instead of 14GB

from transformers import AutoModelForCausalLM, BitsAndBytesConfig

quantization_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.float16
)

model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Llama-2-7b-hf",
    quantization_config=quantization_config,
    device_map="auto"
)

# Memory reduction: 3-4x
```

### 3. Batch Your API Calls

```python
# Instead of 100 separate API calls:
# Batch into fewer calls with multiple items

# BAD: 100 calls × $0.002 each = $0.20
for item in items:
    response = openai.chat.completions.create(...)

# GOOD: 1 call with batch = $0.01-0.05
batch_prompt = "\n---\n".join([f"Item {i}: {item}" for i, item in enumerate(items)])
response = openai.chat.completions.create(...)
```

### 4. Cache Responses

```python
import hashlib
import json
from functools import lru_cache

# Simple caching
cache = {}

def cached_llm_call(prompt):
    cache_key = hashlib.md5(prompt.encode()).hexdigest()
    
    if cache_key in cache:
        return cache[cache_key]
    
    response = make_api_call(prompt)
    cache[cache_key] = response
    return response

# Savings: Avoid duplicate API calls entirely
```

### 5. Use Local Models When Possible

```python
# For embeddings:
# Instead of OpenAI embeddings ($0.02-0.13/1M tokens)
# Use local sentence-transformers (FREE!)

from sentence_transformers import SentenceTransformer
model = SentenceTransformer('all-MiniLM-L6-v2')
embeddings = model.encode(texts)

# For generation:
# Use Ollama for local inference
# ollama run llama2
```

### 6. Optimize Token Usage

```python
# Shorter prompts = fewer tokens = less cost

# BAD: 200 tokens
prompt = """
You are a helpful AI assistant. Your task is to analyze the following 
text and provide a comprehensive summary that captures all the key 
points and important details. Please be thorough in your analysis and 
make sure to include relevant context.

Text to analyze: {text}
"""

# GOOD: 30 tokens
prompt = "Summarize in 3 bullet points:\n{text}"
```

---

## 🆓 Free Resources

### Compute

| Resource | What You Get | Limitations |
|----------|--------------|-------------|
| **Google Colab** | T4 GPU, 12 hr sessions | Queue times, disconnects |
| **Kaggle Notebooks** | T4/P100 GPU, 30 hr/week | 12 hr sessions |
| **Lightning.ai** | CPU, limited GPU | 15 hr/month GPU |
| **Paperspace Gradient** | Free notebooks | M4000 GPU, limited |
| **Hugging Face Spaces** | CPU inference | No training |

### Models

| Resource | What You Get |
|----------|--------------|
| **Hugging Face Hub** | 100K+ free models |
| **Ollama** | Local LLMs (Llama, Mistral, etc.) |
| **GGUF models** | Quantized models for CPU |

### APIs (Free Tiers)

| Provider | Free Tier |
|----------|-----------|
| **OpenAI** | $5 credit for new accounts |
| **Anthropic** | Pay-as-you-go |
| **Google AI** | Gemini API free tier |
| **Groq** | Free Llama/Mixtral API (rate limited) |
| **Together AI** | $25 credit |
| **Replicate** | Some free predictions |

### Datasets

| Resource | What You Get |
|----------|--------------|
| **Hugging Face Datasets** | 50K+ free datasets |
| **Kaggle** | 200K+ datasets |
| **Papers With Code** | Benchmark datasets |
| **Common Crawl** | Web crawl data |

---

## 📋 Budget Planning

### Student/Learner Budget (Free - $20/month)

```
RECOMMENDED SETUP:

Compute:
├── Google Colab (free tier): $0
├── Kaggle Notebooks (free): $0
└── Local CPU: $0

APIs:
├── Groq (free tier): $0
├── OpenAI: $5-10/month for experiments
└── Total APIs: $5-10/month

Storage:
├── Google Drive: Free 15GB
├── Hugging Face: Free
└── Total storage: $0

MONTHLY TOTAL: $0-10
```

### Hobbyist Budget ($20-100/month)

```
RECOMMENDED SETUP:

Compute:
├── Colab Pro: $10/month
├── Occasional cloud GPU: $20/month
└── Total compute: $30/month

APIs:
├── OpenAI (gpt-4o-mini): $20/month
├── Embeddings: $5/month
└── Total APIs: $25/month

Storage:
├── Pinecone free tier: $0
├── Google Drive: $0
└── Total storage: $0

MONTHLY TOTAL: $50-60
```

### Professional Budget ($100-500/month)

```
RECOMMENDED SETUP:

Compute:
├── Colab Pro+: $50/month
├── Cloud GPU (Lambda/RunPod): $100-200/month
└── Total compute: $150-250/month

APIs:
├── OpenAI: $50-100/month
├── Pinecone: $25-100/month
└── Total APIs: $75-200/month

Infrastructure:
├── AWS/GCP: $50-100/month
└── Domain/hosting: $20/month

MONTHLY TOTAL: $300-500
```

### Cost Tracking Template

```python
import datetime

costs = {
    "date": [],
    "category": [],
    "provider": [],
    "amount": [],
    "notes": []
}

def log_cost(category, provider, amount, notes=""):
    costs["date"].append(datetime.date.today())
    costs["category"].append(category)
    costs["provider"].append(provider)
    costs["amount"].append(amount)
    costs["notes"].append(notes)

# Usage
log_cost("API", "OpenAI", 5.23, "RAG chatbot development")
log_cost("Compute", "Colab Pro", 10.00, "Monthly subscription")
log_cost("API", "Pinecone", 0.00, "Free tier")

# Monthly summary
import pandas as pd
df = pd.DataFrame(costs)
print(df.groupby("category")["amount"].sum())
```

---

## 📊 Decision Flowchart

```
WHAT SHOULD I USE?

Task: Simple text generation/chat
├── Budget < $10/month → Groq free tier / Ollama local
├── Budget $10-50/month → GPT-4o-mini
└── Need best quality → GPT-4o / Claude 3.5 Sonnet

Task: Embeddings
├── < 100K documents → Local sentence-transformers (FREE)
├── > 100K documents → OpenAI text-embedding-3-small
└── Need best quality → OpenAI text-embedding-3-large

Task: Fine-tuning
├── Small model (BERT) → Google Colab free
├── 7B model → Colab Pro+ or Lambda Labs
└── > 13B model → A100 on cloud ($3-5/hour)

Task: Training from scratch
├── Small CNN/MLP → CPU or free Colab
├── Medium model → Rent A100 ($3-5/hour)
└── Large model → Consider if really necessary!

Task: Local inference
├── 7B model → RTX 3060+ (12GB) or Mac M1+
├── 13B model → RTX 3090+ (24GB)
└── 70B model → Multiple GPUs or cloud
```

---

## ✅ Key Takeaways

```
COST OPTIMIZATION PRINCIPLES:

1. START FREE
   - Use Colab, Kaggle, free tiers
   - Only pay when necessary

2. USE SMALLEST MODEL THAT WORKS
   - GPT-4o-mini > GPT-4o for most tasks
   - 7B quantized > 70B for many use cases

3. CACHE EVERYTHING
   - Don't pay for the same API call twice
   - Store embeddings, don't recompute

4. BATCH YOUR CALLS
   - Fewer API calls = less overhead

5. RUN LOCALLY WHEN POSSIBLE
   - Embeddings: sentence-transformers
   - Inference: Ollama

6. TRACK YOUR SPENDING
   - Set budget alerts
   - Review weekly

7. KNOW YOUR REQUIREMENTS
   - Not every task needs GPU
   - Not every task needs GPT-4

REMEMBER:
├── Learning: Should cost $0-10/month
├── Building projects: $20-50/month
├── Production: Scale as needed
└── Start small, scale up!
```
