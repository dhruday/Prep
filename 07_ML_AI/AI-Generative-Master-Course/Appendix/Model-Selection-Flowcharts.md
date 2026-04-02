# 🧭 Model Selection Flowcharts

## 📚 Table of Contents
1. [Quick Reference Matrix](#-quick-reference-matrix)
2. [Task-Based Selection](#-task-based-selection)
3. [Resource-Based Selection](#-resource-based-selection)
4. [Fine-Tuning Decisions](#-fine-tuning-decisions)
5. [Embedding Models](#-embedding-models)
6. [Local vs Cloud](#-local-vs-cloud)
7. [Production Checklist](#-production-checklist)

---

## 📊 Quick Reference Matrix

```
┌────────────────────┬──────────────────┬─────────────┬──────────────┬────────────┐
│ Task               │ Best Model       │ Alternative │ VRAM Needed  │ Cost       │
├────────────────────┼──────────────────┼─────────────┼──────────────┼────────────┤
│ Text Generation    │ GPT-4o           │ Claude 3.5  │ API          │ $$$$       │
│ Chat (Simple)      │ GPT-4o-mini      │ Llama 3 8B  │ API/8GB      │ $          │
│ Code Generation    │ GPT-4o           │ CodeLlama   │ API/16GB     │ $$$$       │
│ Summarization      │ Claude 3.5       │ GPT-4o-mini │ API          │ $$$        │
│ Classification     │ BERT fine-tuned  │ GPT-4o-mini │ 4GB          │ $          │
│ Embeddings         │ text-emb-3-small │ E5/BGE      │ API/2GB      │ $          │
│ RAG                │ text-emb-3-large │ BGE-large   │ API/4GB      │ $$         │
│ Image Generation   │ DALL-E 3         │ SD XL       │ API/12GB     │ $$-$$$     │
│ Image Editing      │ DALL-E 3         │ SD Inpaint  │ API/12GB     │ $$-$$$     │
│ Object Detection   │ YOLOv8           │ Detectron2  │ 4GB          │ Free       │
│ Speech-to-Text     │ Whisper          │ Whisper.cpp │ 4GB/CPU      │ Free       │
│ Translation        │ GPT-4o           │ mBART       │ API/8GB      │ $$         │
│ Sentiment          │ BERT fine-tuned  │ DistilBERT  │ 2GB          │ Free       │
│ Q&A                │ GPT-4o           │ Llama 3     │ API/8GB      │ $-$$$$     │
│ Local LLM          │ Llama 3 8B       │ Mistral 7B  │ 6-8GB        │ Free       │
└────────────────────┴──────────────────┴─────────────┴──────────────┴────────────┘

Cost Legend: $ = <$10/month, $$ = $10-50/month, $$$ = $50-200/month, $$$$ = $200+/month
```

---

## 🎯 Task-Based Selection

### Text Generation / Chat

```
                    ┌─────────────────────────┐
                    │ What's your priority?   │
                    └───────────┬─────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            ▼                   ▼                   ▼
      ┌─────────┐         ┌─────────┐         ┌─────────┐
      │ Quality │         │ Cost    │         │ Privacy │
      └────┬────┘         └────┬────┘         └────┬────┘
           │                   │                   │
           ▼                   ▼                   ▼
    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
    │ GPT-4o or    │    │ GPT-4o-mini  │    │ Local LLM    │
    │ Claude 3.5   │    │ or Groq API  │    │ (Llama/Mistral)
    └──────────────┘    └──────────────┘    └──────────────┘
```

### Text Classification

```
                    ┌─────────────────────────┐
                    │ How much training data? │
                    └───────────┬─────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            ▼                   ▼                   ▼
      ┌─────────┐         ┌───────────┐       ┌───────────┐
      │ < 100   │         │ 100-10K   │       │ > 10K     │
      └────┬────┘         └─────┬─────┘       └─────┬─────┘
           │                    │                   │
           ▼                    ▼                   ▼
    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
    │ GPT-4o-mini  │    │ Fine-tune    │    │ Fine-tune    │
    │ (few-shot)   │    │ BERT-base    │    │ DistilBERT   │
    └──────────────┘    └──────────────┘    └──────────────┘
                               │
                               ▼
                        Need speed?
                        ├── Yes → DistilBERT
                        └── No → BERT-base/large
```

### Question Answering / RAG

```
                    ┌─────────────────────────┐
                    │ What type of QA?        │
                    └───────────┬─────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
  ┌───────────┐           ┌───────────┐           ┌───────────┐
  │ Open      │           │ Domain    │           │ Document  │
  │ Domain    │           │ Specific  │           │ Based     │
  └─────┬─────┘           └─────┬─────┘           └─────┬─────┘
        │                       │                       │
        ▼                       ▼                       ▼
  ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
  │ GPT-4o /     │       │ Fine-tuned   │       │ RAG with     │
  │ Claude 3.5   │       │ LLM + RAG    │       │ GPT-4o-mini  │
  └──────────────┘       └──────────────┘       └──────────────┘
```

### Code Generation

```
                    ┌─────────────────────────┐
                    │ Code complexity?        │
                    └───────────┬─────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            ▼                   ▼                   ▼
      ┌─────────┐         ┌───────────┐       ┌───────────┐
      │ Simple  │         │ Medium    │       │ Complex   │
      │ Scripts │         │ Functions │       │ Systems   │
      └────┬────┘         └─────┬─────┘       └─────┬─────┘
           │                    │                   │
           ▼                    ▼                   ▼
    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
    │ GPT-4o-mini  │    │ GPT-4o /     │    │ GPT-4o with  │
    │ CodeLlama    │    │ Claude 3.5   │    │ full context │
    └──────────────┘    └──────────────┘    └──────────────┘
    
    Local Alternative: DeepSeek Coder or CodeLlama
```

### Summarization

```
                    ┌─────────────────────────┐
                    │ Document length?        │
                    └───────────┬─────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            ▼                   ▼                   ▼
      ┌─────────┐         ┌───────────┐       ┌───────────┐
      │ Short   │         │ Medium    │       │ Long      │
      │ < 1 page│         │ 1-10 pages│       │ 10+ pages │
      └────┬────┘         └─────┬─────┘       └─────┬─────┘
           │                    │                   │
           ▼                    ▼                   ▼
    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
    │ GPT-4o-mini  │    │ Claude 3.5   │    │ Chunk +      │
    │              │    │ (100K ctx)   │    │ Map-reduce   │
    └──────────────┘    └──────────────┘    └──────────────┘
```

### Image Tasks

```
                    ┌─────────────────────────┐
                    │ What image task?        │
                    └───────────┬─────────────┘
                                │
    ┌───────────┬───────────────┼───────────────┬───────────┐
    ▼           ▼               ▼               ▼           ▼
┌────────┐ ┌─────────┐    ┌─────────┐    ┌─────────┐ ┌─────────┐
│Generate│ │ Edit    │    │ Classify│    │ Detect  │ │ Segment │
└───┬────┘ └────┬────┘    └────┬────┘    └────┬────┘ └────┬────┘
    │           │              │              │           │
    ▼           ▼              ▼              ▼           ▼
┌────────┐ ┌─────────┐   ┌─────────┐   ┌─────────┐ ┌─────────┐
│DALL-E 3│ │SD Inpaint│  │ViT /    │   │ YOLOv8  │ │ SAM     │
│SD XL   │ │DALL-E 3  │  │CLIP     │   │Detectron│ │SegFormer│
└────────┘ └─────────┘   └─────────┘   └─────────┘ └─────────┘
```

---

## 💻 Resource-Based Selection

### Based on Available VRAM

```
                    ┌─────────────────────────┐
                    │ Available GPU VRAM?     │
                    └───────────┬─────────────┘
                                │
    ┌───────────┬───────────────┼───────────────┬───────────┐
    ▼           ▼               ▼               ▼           ▼
┌────────┐ ┌─────────┐    ┌─────────┐    ┌─────────┐ ┌─────────┐
│ No GPU │ │ 4-6 GB  │    │ 8-12 GB │    │ 16-24GB │ │ 40GB+   │
└───┬────┘ └────┬────┘    └────┬────┘    └────┬────┘ └────┬────┘
    │           │              │              │           │
    ▼           ▼              ▼              ▼           ▼
┌────────┐ ┌─────────┐   ┌─────────┐   ┌─────────┐ ┌─────────┐
│ API    │ │Phi-3    │   │ Llama3  │   │ Llama3  │ │ 70B+    │
│ GGUF   │ │Gemma 2B │   │ 8B-Q4   │   │ 8B-FP16 │ │ models  │
│ CPU    │ │Llama 1B │   │Mistral  │   │ 13B-Q4  │ │         │
└────────┘ └─────────┘   └─────────┘   └─────────┘ └─────────┘
```

### Model Size Guidelines

```python
# Quick reference: What fits in your VRAM?

VRAM_GUIDE = {
    "4GB": [
        "Phi-3 Mini (3.8B) - Q4",
        "Gemma 2B - FP16",
        "DistilBERT",
        "BERT-base",
        "Whisper small",
    ],
    "6GB": [
        "Llama 3 8B - Q4",
        "Mistral 7B - Q4", 
        "Phi-3 Mini - Q8",
        "BERT-large",
        "Whisper medium",
    ],
    "8GB": [
        "Llama 3 8B - Q5",
        "Mistral 7B - Q5",
        "CodeLlama 7B - Q4",
        "Whisper large",
        "Stable Diffusion 1.5",
    ],
    "12GB": [
        "Llama 3 8B - Q8",
        "Mistral 7B - FP16",
        "Llama 2 13B - Q4",
        "SD XL (with optimizations)",
    ],
    "16GB": [
        "Llama 3 8B - FP16",
        "Llama 2 13B - Q5",
        "CodeLlama 13B - Q4",
        "SD XL",
    ],
    "24GB": [
        "Llama 2 13B - FP16",
        "Llama 2 70B - Q2",
        "Mixtral 8x7B - Q4",
        "Any SD model",
    ],
    "48GB+": [
        "Llama 2 70B - Q4",
        "Mixtral 8x7B - FP16",
        "Large vision models",
    ]
}
```

---

## 🔧 Fine-Tuning Decisions

### Should You Fine-Tune?

```
                    ┌─────────────────────────┐
                    │ Is prompt engineering   │
                    │ working well enough?    │
                    └───────────┬─────────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
              ┌─────────┐             ┌─────────┐
              │   Yes   │             │   No    │
              └────┬────┘             └────┬────┘
                   │                       │
                   ▼                       ▼
            ┌──────────────┐        ┌──────────────┐
            │ Keep using   │        │ Do you have  │
            │ prompting!   │        │ training data?│
            └──────────────┘        └───────┬──────┘
                                            │
                                ┌───────────┴───────────┐
                                ▼                       ▼
                          ┌─────────┐             ┌─────────┐
                          │  < 100  │             │  > 100  │
                          │ examples│             │ examples│
                          └────┬────┘             └────┬────┘
                               │                       │
                               ▼                       ▼
                        ┌──────────────┐        ┌──────────────┐
                        │ Few-shot     │        │ Consider     │
                        │ prompting    │        │ fine-tuning  │
                        └──────────────┘        └───────┬──────┘
                                                        │
                                                        ▼
                                                ┌──────────────┐
                                                │ What base    │
                                                │ model size?  │
                                                └───────┬──────┘
                                                        │
                                    ┌───────────────────┴───────────────────┐
                                    ▼                                       ▼
                              ┌─────────┐                             ┌─────────┐
                              │ Small   │                             │ Large   │
                              │(BERT etc)│                            │ (7B+)   │
                              └────┬────┘                             └────┬────┘
                                   │                                       │
                                   ▼                                       ▼
                            ┌──────────────┐                        ┌──────────────┐
                            │ Full         │                        │ Use LoRA or  │
                            │ fine-tuning  │                        │ QLoRA        │
                            └──────────────┘                        └──────────────┘
```

### Fine-Tuning Method Selection

```
METHOD SELECTION:

Full Fine-Tuning
├── When: Small models (BERT, DistilBERT)
├── Data needed: 1K-100K examples
├── VRAM: 4-16 GB
└── Time: Hours

LoRA (Low-Rank Adaptation)
├── When: Large models (7B+), good GPU
├── Data needed: 100-10K examples  
├── VRAM: 16-24 GB
└── Time: Hours

QLoRA (Quantized LoRA)
├── When: Large models, limited GPU
├── Data needed: 100-10K examples
├── VRAM: 8-12 GB (4-bit quantized)
└── Time: Hours

API Fine-Tuning (OpenAI)
├── When: No GPU, need quality
├── Data needed: 50-10K examples
├── VRAM: N/A
└── Time: Minutes to hours
```

### Fine-Tuning Decision Matrix

| Scenario | Method | Base Model | Data Needed |
|----------|--------|------------|-------------|
| Text classification | Full FT | BERT-base | 1K-10K |
| Sentiment analysis | Full FT | DistilBERT | 500-5K |
| Custom chatbot style | QLoRA | Llama 3 8B | 1K-10K |
| Domain-specific QA | LoRA | Mistral 7B | 5K-50K |
| Code assistance | QLoRA | CodeLlama | 10K-100K |
| Quick prototype | API FT | GPT-3.5 | 100-1K |

---

## 🔤 Embedding Models

### Embedding Selection Guide

```
                    ┌─────────────────────────┐
                    │ What's your priority?   │
                    └───────────┬─────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
  ┌───────────┐           ┌───────────┐           ┌───────────┐
  │ Quality   │           │ Cost      │           │ Speed     │
  └─────┬─────┘           └─────┬─────┘           └─────┬─────┘
        │                       │                       │
        ▼                       ▼                       ▼
  ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
  │ OpenAI       │       │ Local        │       │ Local        │
  │ text-emb-3   │       │ all-MiniLM   │       │ all-MiniLM   │
  │ -large       │       │ -L6-v2       │       │ -L6-v2       │
  └──────────────┘       └──────────────┘       └──────────────┘
```

### Embedding Models Comparison

| Model | Dimensions | Quality | Speed | Cost |
|-------|------------|---------|-------|------|
| text-embedding-3-large | 3072 | ⭐⭐⭐⭐⭐ | Fast (API) | $0.13/1M |
| text-embedding-3-small | 1536 | ⭐⭐⭐⭐ | Fast (API) | $0.02/1M |
| text-embedding-ada-002 | 1536 | ⭐⭐⭐⭐ | Fast (API) | $0.10/1M |
| BGE-large-en | 1024 | ⭐⭐⭐⭐ | Medium | Free |
| BGE-base-en | 768 | ⭐⭐⭐ | Fast | Free |
| E5-large-v2 | 1024 | ⭐⭐⭐⭐ | Medium | Free |
| all-MiniLM-L6-v2 | 384 | ⭐⭐⭐ | Very Fast | Free |
| all-mpnet-base-v2 | 768 | ⭐⭐⭐⭐ | Fast | Free |

### When to Use What

```python
# Use Case -> Recommended Embedding

USE_CASES = {
    "RAG Production (high quality)": "text-embedding-3-large",
    "RAG Production (cost-effective)": "text-embedding-3-small",
    "RAG Prototype / Learning": "all-MiniLM-L6-v2",
    "Semantic search (sensitive data)": "BGE-large-en (local)",
    "Real-time similarity": "all-MiniLM-L6-v2",
    "Multi-lingual": "multilingual-e5-large",
    "Code embeddings": "CodeBERT or StarEncoder",
}
```

---

## 🏠 Local vs Cloud

### Decision Framework

```
                    ┌─────────────────────────┐
                    │ What matters most?      │
                    └───────────┬─────────────┘
                                │
    ┌───────────┬───────────────┼───────────────┬───────────┐
    ▼           ▼               ▼               ▼           ▼
┌────────┐ ┌─────────┐    ┌─────────┐    ┌─────────┐ ┌─────────┐
│Privacy │ │ Cost    │    │ Quality │    │Simplicity│ │ Scale   │
└───┬────┘ └────┬────┘    └────┬────┘    └────┬────┘ └────┬────┘
    │           │              │              │           │
    ▼           ▼              ▼              ▼           ▼
┌────────┐ ┌─────────┐   ┌─────────┐   ┌─────────┐ ┌─────────┐
│ Local  │ │Local for│   │ Cloud   │   │ Cloud   │ │ Cloud   │
│ Always │ │inference│   │ API     │   │ API     │ │ API     │
└────────┘ └─────────┘   └─────────┘   └─────────┘ └─────────┘
```

### Comparison Table

| Factor | Local | Cloud API |
|--------|-------|-----------|
| **Privacy** | ✅ Complete control | ❌ Data leaves your system |
| **Latency** | ⚡ Very low | 🔄 Network dependent |
| **Initial Cost** | 💰 Hardware purchase | ✅ No upfront cost |
| **Running Cost** | ✅ Electricity only | 💰 Per-token/call |
| **Quality** | ⭐⭐⭐⭐ Good | ⭐⭐⭐⭐⭐ Best models |
| **Setup** | 🔧 More complex | ✅ Simple API key |
| **Scaling** | ❌ Limited by hardware | ✅ Unlimited |
| **Reliability** | ✅ No downtime | ❌ Service outages |
| **Updates** | 🔧 Manual | ✅ Automatic |

### When to Go Local

```
GO LOCAL WHEN:
├── Handling sensitive/private data
├── Need offline capability
├── High volume (cost savings)
├── Low latency required
├── Predictable workload
└── Have good GPU hardware

GO CLOUD WHEN:
├── Need best quality models
├── Variable/unpredictable load
├── No GPU hardware
├── Quick prototyping
├── Need to scale rapidly
└── Want latest models immediately
```

### Hybrid Approach (Recommended)

```
HYBRID STRATEGY:

1. Local for embeddings
   └── sentence-transformers (free, fast, private)

2. Local for simple generation
   └── Ollama with Llama 3 8B

3. Cloud for complex tasks
   └── GPT-4o for reasoning/coding

4. Cache everything
   └── Don't repeat API calls

Cost optimization: 80% local, 20% cloud
```

---

## ✅ Production Checklist

### Pre-Deployment

```
□ Model Selection
  ├── □ Benchmarked alternatives
  ├── □ Tested on representative data
  ├── □ Verified quality acceptable
  └── □ Estimated costs calculated

□ Performance Testing
  ├── □ Measured latency (P50, P95, P99)
  ├── □ Tested concurrent users
  ├── □ Verified memory usage stable
  └── □ Checked for memory leaks

□ Safety & Guardrails
  ├── □ Content filtering in place
  ├── □ Rate limiting configured
  ├── □ Input validation implemented
  └── □ Output sanitization done

□ Fallback Strategy
  ├── □ Backup model configured
  ├── □ Graceful degradation planned
  ├── □ Error handling comprehensive
  └── □ Retry logic implemented
```

### Model-Specific Checklist

```
FOR LLM APIs:
□ API key secured (env var, not code)
□ Billing alerts set
□ Rate limits understood
□ Retry with exponential backoff
□ Timeout configured
□ Response validation

FOR LOCAL MODELS:
□ VRAM requirements verified
□ Model loaded at startup (not per-request)
□ Quantization chosen appropriately
□ Batch processing enabled if applicable
□ GPU memory monitoring in place

FOR EMBEDDINGS:
□ Consistent model version
□ Dimension verified
□ Normalization applied if needed
□ Caching implemented
□ Batch processing for bulk
```

---

## 📋 Quick Decision Cards

### Card 1: "I need a chatbot"

```
Simple chatbot (customer FAQ):
└── GPT-4o-mini API ($5-20/month)

Advanced chatbot (reasoning):
└── GPT-4o API ($50-200/month)

Private chatbot (sensitive data):
└── Local Llama 3 8B + Ollama (free)
```

### Card 2: "I need RAG"

```
Prototype RAG:
├── Embeddings: all-MiniLM-L6-v2 (free)
├── Vector DB: Chroma (free)
└── LLM: GPT-4o-mini ($10/month)

Production RAG:
├── Embeddings: text-embedding-3-small ($2/month)
├── Vector DB: Pinecone ($25/month)
└── LLM: GPT-4o-mini ($50/month)
```

### Card 3: "I need classification"

```
Quick classification (< 100 examples):
└── GPT-4o-mini few-shot (cheap)

Proper classification (> 100 examples):
└── Fine-tuned BERT (free after training)

Real-time classification:
└── DistilBERT (fast, free)
```

### Card 4: "I need to generate images"

```
Best quality:
└── DALL-E 3 API ($0.04/image)

Cost-effective:
└── Stable Diffusion XL (local, free)

Fast iteration:
└── Stable Diffusion 1.5 (local, free)
```

---

## 🎯 Final Summary

```
GENERAL PRINCIPLES:

1. START WITH APIs
   - Faster to prototype
   - No infrastructure hassle
   - Switch to local if needed

2. SIZE APPROPRIATELY
   - Don't use 70B if 7B works
   - Don't use GPT-4 if GPT-4o-mini works
   - Test smaller first

3. MEASURE EVERYTHING
   - Quality metrics
   - Latency
   - Cost per request

4. PLAN FOR SCALE
   - What if 10x users?
   - What if 100x requests?
   - Have fallback ready

5. STAY CURRENT
   - New models released monthly
   - Prices drop regularly
   - Better options appear

Remember: The best model is the one that solves your 
problem at acceptable quality and cost!
```
