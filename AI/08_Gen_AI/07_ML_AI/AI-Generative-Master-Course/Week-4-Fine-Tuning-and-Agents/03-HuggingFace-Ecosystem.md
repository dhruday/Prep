# 🤗 HuggingFace Ecosystem

## 📚 Table of Contents
1. [Beginner Friendly Explanation](#-beginner-friendly-explanation)
2. [The HuggingFace Platform](#-the-huggingface-platform)
3. [Transformers Library](#-transformers-library)
4. [Datasets Library](#-datasets-library)
5. [PEFT & TRL](#-peft--trl)
6. [Model Hub](#-model-hub)
7. [Code Examples](#-code-examples)
8. [Real World Use Cases](#-real-world-use-cases)
9. [Mini Project](#-mini-project)
10. [Interview Questions](#-interview-questions)
11. [Homework](#-homework)

---

## 🔰 Beginner Friendly Explanation

### What is HuggingFace? (The App Store Analogy)

```
Think of HuggingFace as the "App Store" for AI:

Regular App Store:
├── Find apps (search by category)
├── Download apps (one click)
├── Run apps (just works)
├── Rate and review
└── Share your own apps

HuggingFace Hub:
├── Find models (search by task)
├── Download models (one line of code)
├── Run models (just works)
├── Like and review
└── Share your own models

Before HuggingFace:
├── Find model on GitHub
├── Read complex setup instructions
├── Install 20 dependencies
├── Debug for 3 hours
├── Maybe get it working
└── Time: 1-2 days

With HuggingFace:
├── from transformers import pipeline
├── classifier = pipeline("sentiment-analysis")
├── result = classifier("I love this!")
└── Time: 30 seconds
```

### Why HuggingFace Matters

```
The AI Democratization Platform:

2018: Only big tech companies could use transformers
      (Complex code, no sharing, reinventing the wheel)

2019: HuggingFace launches Transformers library
      (Unified API, easy model loading)

2020: HuggingFace Hub launches
      (Share models, datasets, spaces)

2024: 500,000+ models, 100,000+ datasets
      (Anyone can use state-of-the-art AI)

Impact:
├── Researcher in small university: Same access as Google
├── Startup with 2 engineers: Can deploy BERT in an hour
├── Student learning AI: Free models, tutorials, community
└── YOU: Can build production AI today!
```

---

## 🎯 The HuggingFace Platform

### Platform Overview

```
┌───────────────────────────────────────────────────────────────┐
│                    🤗 HuggingFace Ecosystem                    │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │   Models    │  │  Datasets   │  │      Spaces         │   │
│  │   Hub       │  │    Hub      │  │   (Apps/Demos)      │   │
│  │  500K+      │  │   100K+     │  │      50K+           │   │
│  └─────────────┘  └─────────────┘  └─────────────────────┘   │
│         │               │                    │                │
│         └───────────────┼────────────────────┘                │
│                         │                                     │
│  ┌──────────────────────┴──────────────────────────────┐     │
│  │                    Python Libraries                  │     │
│  ├──────────────────────────────────────────────────────┤     │
│  │ transformers │ datasets │ peft │ trl │ accelerate   │     │
│  │ tokenizers   │ evaluate │ hub  │ gradio │ diffusers │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                │
└───────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Purpose | Example |
|-----------|---------|---------|
| **Model Hub** | Host and share models | `bert-base-uncased` |
| **Dataset Hub** | Host and share datasets | `imdb`, `squad` |
| **Spaces** | Deploy ML demos | Gradio/Streamlit apps |
| **Transformers** | Load and use models | `AutoModel.from_pretrained()` |
| **Datasets** | Load and process data | `load_dataset("imdb")` |
| **PEFT** | Efficient fine-tuning | LoRA, QLoRA |
| **TRL** | RLHF training | SFTTrainer, DPOTrainer |
| **Accelerate** | Multi-GPU training | Distributed training |

---

## 🔧 Transformers Library

### Core Concepts

```
Transformers Library Architecture:

                    Auto Classes (Recommended)
                    ┌─────────────────────────┐
                    │ AutoModel               │
                    │ AutoTokenizer           │
                    │ AutoConfig              │
                    └─────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│    Model      │   │   Tokenizer   │   │    Config     │
│ BertModel     │   │ BertTokenizer │   │  BertConfig   │
│ GPT2Model     │   │ GPT2Tokenizer │   │  GPT2Config   │
│ T5Model       │   │ T5Tokenizer   │   │  T5Config     │
│ ...           │   │ ...           │   │  ...          │
└───────────────┘   └───────────────┘   └───────────────┘
```

### Auto Classes

```python
"""
Auto Classes: The Smart Way to Load Models
Automatically detects model type and loads correct class
"""

from transformers import (
    AutoModel,
    AutoModelForSequenceClassification,
    AutoModelForCausalLM,
    AutoModelForQuestionAnswering,
    AutoTokenizer,
    AutoConfig
)

# ============================================
# LOADING DIFFERENT MODELS (SAME API!)
# ============================================

# Load BERT for classification
bert = AutoModelForSequenceClassification.from_pretrained(
    "bert-base-uncased",
    num_labels=2
)

# Load GPT-2 for text generation
gpt2 = AutoModelForCausalLM.from_pretrained(
    "gpt2"
)

# Load T5 for translation/summarization
from transformers import AutoModelForSeq2SeqLM
t5 = AutoModelForSeq2SeqLM.from_pretrained(
    "t5-small"
)

# ============================================
# TOKENIZERS
# ============================================

# Load tokenizer (matches model)
tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased")

# Tokenize text
text = "Hello, how are you?"
tokens = tokenizer(text, return_tensors="pt")

print(tokens)
# {'input_ids': tensor([[101, 7592, 1010, 2129, 2024, 2017, 1029, 102]]),
#  'attention_mask': tensor([[1, 1, 1, 1, 1, 1, 1, 1]])}

# Decode back
decoded = tokenizer.decode(tokens['input_ids'][0])
print(decoded)  # "[CLS] hello, how are you? [SEP]"
```

### Pipelines (Easiest Way!)

```python
"""
Pipelines: One-Line AI
No need to handle tokenization, model loading, post-processing
"""

from transformers import pipeline

# ============================================
# SENTIMENT ANALYSIS
# ============================================

classifier = pipeline("sentiment-analysis")
result = classifier("I love this product!")
print(result)
# [{'label': 'POSITIVE', 'score': 0.9998}]

# Batch processing
results = classifier([
    "This is amazing!",
    "This is terrible.",
    "It's okay I guess."
])

# ============================================
# TEXT GENERATION
# ============================================

generator = pipeline("text-generation", model="gpt2")
output = generator(
    "Once upon a time",
    max_length=50,
    num_return_sequences=2
)
print(output)

# ============================================
# QUESTION ANSWERING
# ============================================

qa = pipeline("question-answering")
result = qa(
    question="What is the capital of France?",
    context="France is a country in Europe. Its capital is Paris."
)
print(result)
# {'answer': 'Paris', 'score': 0.98, 'start': 52, 'end': 57}

# ============================================
# SUMMARIZATION
# ============================================

summarizer = pipeline("summarization")
article = """
    The tower is 324 metres (1,063 ft) tall, about the same height as an 81-storey building, 
    and the tallest structure in Paris. Its base is square, measuring 125 metres (410 ft) 
    on each side. During its construction, the Eiffel Tower surpassed the Washington Monument 
    to become the tallest man-made structure in the world, a title it held for 41 years.
"""
summary = summarizer(article, max_length=50, min_length=25)
print(summary)

# ============================================
# TRANSLATION
# ============================================

translator = pipeline("translation_en_to_fr")
result = translator("Hello, how are you?")
print(result)
# [{'translation_text': 'Bonjour, comment allez-vous?'}]

# ============================================
# NAMED ENTITY RECOGNITION
# ============================================

ner = pipeline("ner", grouped_entities=True)
result = ner("Apple was founded by Steve Jobs in California.")
print(result)
# [{'entity_group': 'ORG', 'word': 'Apple', 'score': 0.99},
#  {'entity_group': 'PER', 'word': 'Steve Jobs', 'score': 0.99},
#  {'entity_group': 'LOC', 'word': 'California', 'score': 0.98}]

# ============================================
# ZERO-SHOT CLASSIFICATION
# ============================================

classifier = pipeline("zero-shot-classification")
result = classifier(
    "I need to buy groceries and pick up my prescription",
    candidate_labels=["shopping", "health", "travel", "work"]
)
print(result)
# {'labels': ['shopping', 'health', 'travel', 'work'],
#  'scores': [0.72, 0.18, 0.06, 0.04]}

# ============================================
# IMAGE CLASSIFICATION
# ============================================

from PIL import Image
import requests

image_classifier = pipeline("image-classification")
url = "https://example.com/cat.jpg"
image = Image.open(requests.get(url, stream=True).raw)

result = image_classifier(image)
print(result)
# [{'label': 'tabby cat', 'score': 0.95}]
```

### Model Configuration

```python
"""
Model Configuration
Customize model architecture and behavior
"""

from transformers import AutoConfig, AutoModel

# ============================================
# LOAD AND INSPECT CONFIG
# ============================================

config = AutoConfig.from_pretrained("bert-base-uncased")

print(f"Hidden size: {config.hidden_size}")        # 768
print(f"Num layers: {config.num_hidden_layers}")   # 12
print(f"Num attention heads: {config.num_attention_heads}")  # 12
print(f"Vocab size: {config.vocab_size}")          # 30522

# ============================================
# MODIFY CONFIG
# ============================================

# Create smaller BERT
custom_config = AutoConfig.from_pretrained(
    "bert-base-uncased",
    hidden_size=256,
    num_hidden_layers=4,
    num_attention_heads=4,
    intermediate_size=1024
)

# Create model with custom config
custom_model = AutoModel.from_config(custom_config)

print(f"Original BERT: {109_000_000:,} params")
print(f"Custom BERT: {custom_model.num_parameters():,} params")

# ============================================
# SAVE AND LOAD CUSTOM CONFIG
# ============================================

# Save
custom_config.save_pretrained("./my_custom_config")

# Load
loaded_config = AutoConfig.from_pretrained("./my_custom_config")
```

### Training with Trainer

```python
"""
HuggingFace Trainer
Simplified training loop with all best practices built-in
"""

from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    TrainingArguments,
    Trainer,
    DataCollatorWithPadding
)
from datasets import load_dataset
import numpy as np
from sklearn.metrics import accuracy_score

# ============================================
# SETUP
# ============================================

model_name = "distilbert-base-uncased"

model = AutoModelForSequenceClassification.from_pretrained(
    model_name,
    num_labels=2
)
tokenizer = AutoTokenizer.from_pretrained(model_name)

# ============================================
# LOAD AND PREPARE DATA
# ============================================

dataset = load_dataset("imdb")

def tokenize(examples):
    return tokenizer(
        examples["text"],
        truncation=True,
        max_length=256
    )

tokenized = dataset.map(tokenize, batched=True)

# ============================================
# TRAINING ARGUMENTS
# ============================================

training_args = TrainingArguments(
    # Output
    output_dir="./results",
    
    # Training
    num_train_epochs=3,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=64,
    
    # Optimization
    learning_rate=5e-5,
    weight_decay=0.01,
    warmup_ratio=0.1,
    
    # Evaluation
    eval_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True,
    metric_for_best_model="accuracy",
    
    # Logging
    logging_steps=100,
    report_to="tensorboard",
    
    # Misc
    fp16=True,
    push_to_hub=False,
)

# ============================================
# METRICS
# ============================================

def compute_metrics(eval_pred):
    logits, labels = eval_pred
    predictions = np.argmax(logits, axis=-1)
    return {"accuracy": accuracy_score(labels, predictions)}

# ============================================
# TRAIN
# ============================================

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized["train"],
    eval_dataset=tokenized["test"],
    tokenizer=tokenizer,
    data_collator=DataCollatorWithPadding(tokenizer),
    compute_metrics=compute_metrics,
)

trainer.train()

# ============================================
# PUSH TO HUB (Optional)
# ============================================

# trainer.push_to_hub("my-sentiment-model")
```

---

## 📊 Datasets Library

### Loading Datasets

```python
"""
HuggingFace Datasets
Efficient dataset loading and processing
"""

from datasets import load_dataset, Dataset, DatasetDict

# ============================================
# LOAD FROM HUB
# ============================================

# Load full dataset
imdb = load_dataset("imdb")
print(imdb)
# DatasetDict({
#     train: Dataset({features: ['text', 'label'], num_rows: 25000})
#     test: Dataset({features: ['text', 'label'], num_rows: 25000})
# })

# Load specific split
train_data = load_dataset("imdb", split="train")

# Load subset
small_data = load_dataset("imdb", split="train[:1000]")

# ============================================
# POPULAR DATASETS
# ============================================

# Text classification
squad = load_dataset("squad")
glue = load_dataset("glue", "sst2")
ag_news = load_dataset("ag_news")

# Translation
wmt = load_dataset("wmt14", "de-en")

# Summarization
cnn = load_dataset("cnn_dailymail", "3.0.0")

# Code
code_search = load_dataset("code_search_net", "python")

# Instruction tuning
alpaca = load_dataset("tatsu-lab/alpaca")
dolly = load_dataset("databricks/databricks-dolly-15k")

# ============================================
# CREATE FROM LOCAL DATA
# ============================================

# From Python dict
my_data = {
    "text": ["Hello world", "AI is amazing", "Python is great"],
    "label": [0, 1, 1]
}
dataset = Dataset.from_dict(my_data)

# From pandas
import pandas as pd
df = pd.DataFrame(my_data)
dataset = Dataset.from_pandas(df)

# From JSON/CSV files
dataset = load_dataset("json", data_files="train.json")
dataset = load_dataset("csv", data_files="data.csv")

# From local folder structure
# Expects: my_data/train.json, my_data/test.json
dataset = load_dataset("json", data_dir="my_data")

# ============================================
# TRAIN/TEST SPLIT
# ============================================

# Split dataset
splits = dataset.train_test_split(test_size=0.2, seed=42)
print(splits)
# DatasetDict({
#     train: Dataset({num_rows: 2})
#     test: Dataset({num_rows: 1})
# })
```

### Processing Datasets

```python
"""
Dataset Processing
Map, filter, batch operations
"""

from datasets import load_dataset

dataset = load_dataset("imdb", split="train[:1000]")

# ============================================
# MAP (TRANSFORM)
# ============================================

# Tokenize
def tokenize(example):
    return tokenizer(example["text"], truncation=True)

tokenized = dataset.map(tokenize)

# Batched (faster for tokenization)
tokenized = dataset.map(tokenize, batched=True, batch_size=100)

# With multiple processes
tokenized = dataset.map(tokenize, batched=True, num_proc=4)

# Add new columns
def add_length(example):
    example["length"] = len(example["text"])
    return example

dataset = dataset.map(add_length)

# Remove columns
dataset = dataset.remove_columns(["unnecessary_column"])

# Rename columns
dataset = dataset.rename_column("label", "labels")

# ============================================
# FILTER
# ============================================

# Keep only long texts
long_texts = dataset.filter(lambda x: len(x["text"]) > 500)

# Keep only positive reviews
positive = dataset.filter(lambda x: x["label"] == 1)

# ============================================
# SELECT/SHUFFLE
# ============================================

# Select specific indices
subset = dataset.select(range(100))

# Shuffle
shuffled = dataset.shuffle(seed=42)

# ============================================
# FORMAT
# ============================================

# Set format for PyTorch
dataset.set_format(
    type="torch",
    columns=["input_ids", "attention_mask", "labels"]
)

# Reset format
dataset.reset_format()

# ============================================
# SAVE AND LOAD
# ============================================

# Save to disk (Arrow format - fast!)
dataset.save_to_disk("./my_dataset")

# Load from disk
from datasets import load_from_disk
loaded = load_from_disk("./my_dataset")

# Save to common formats
dataset.to_json("data.json")
dataset.to_csv("data.csv")
dataset.to_parquet("data.parquet")
```

### Streaming Datasets

```python
"""
Streaming: For Large Datasets
Don't download everything, stream on demand
"""

from datasets import load_dataset

# ============================================
# STREAM LARGE DATASET
# ============================================

# This won't download 100GB of data
dataset = load_dataset("c4", "en", split="train", streaming=True)

# Iterate without loading all into memory
for i, example in enumerate(dataset):
    print(example["text"][:100])
    if i >= 10:
        break

# ============================================
# OPERATIONS ON STREAMING
# ============================================

# Map
tokenized = dataset.map(tokenize)

# Filter
filtered = dataset.filter(lambda x: len(x["text"]) > 100)

# Take first N
first_1000 = dataset.take(1000)

# Skip first N
skipped = dataset.skip(1000)

# Shuffle (with buffer)
shuffled = dataset.shuffle(seed=42, buffer_size=10000)
```

---

## 🔧 PEFT & TRL

### PEFT (Parameter-Efficient Fine-Tuning)

```python
"""
PEFT Library
Efficient fine-tuning methods
"""

from transformers import AutoModelForCausalLM
from peft import (
    get_peft_model,
    LoraConfig,
    TaskType,
    PeftModel
)

# ============================================
# LORA SETUP
# ============================================

model = AutoModelForCausalLM.from_pretrained("gpt2")

lora_config = LoraConfig(
    task_type=TaskType.CAUSAL_LM,
    r=16,
    lora_alpha=32,
    lora_dropout=0.1,
    target_modules=["c_attn", "c_proj"]
)

peft_model = get_peft_model(model, lora_config)
peft_model.print_trainable_parameters()

# ============================================
# SAVE AND LOAD ADAPTERS
# ============================================

# Save only adapter (few MB)
peft_model.save_pretrained("./my_adapter")

# Load adapter
base_model = AutoModelForCausalLM.from_pretrained("gpt2")
peft_model = PeftModel.from_pretrained(base_model, "./my_adapter")

# ============================================
# MULTIPLE ADAPTERS
# ============================================

# Load multiple adapters
peft_model.load_adapter("./adapter_task1", adapter_name="task1")
peft_model.load_adapter("./adapter_task2", adapter_name="task2")

# Switch between adapters
peft_model.set_adapter("task1")  # Use task1 adapter
peft_model.set_adapter("task2")  # Use task2 adapter

# ============================================
# MERGE ADAPTERS
# ============================================

# Merge LoRA weights into base model
merged_model = peft_model.merge_and_unload()
merged_model.save_pretrained("./merged_model")
```

### TRL (Transformer Reinforcement Learning)

```python
"""
TRL Library
Training with human feedback
"""

from transformers import AutoModelForCausalLM, AutoTokenizer
from trl import SFTTrainer, DPOTrainer
from datasets import load_dataset

# ============================================
# SFT TRAINER (Supervised Fine-Tuning)
# ============================================

model = AutoModelForCausalLM.from_pretrained("gpt2")
tokenizer = AutoTokenizer.from_pretrained("gpt2")
tokenizer.pad_token = tokenizer.eos_token

dataset = load_dataset("imdb", split="train[:1000]")

# Simple SFT
trainer = SFTTrainer(
    model=model,
    train_dataset=dataset,
    dataset_text_field="text",
    tokenizer=tokenizer,
    max_seq_length=512,
)

trainer.train()

# ============================================
# DPO TRAINER (Direct Preference Optimization)
# ============================================

# DPO dataset format
dpo_dataset = [
    {
        "prompt": "Write a poem about AI",
        "chosen": "AI, a marvel of human thought...",  # Preferred response
        "rejected": "AI is computer stuff..."           # Rejected response
    }
]

from datasets import Dataset
dpo_data = Dataset.from_list(dpo_dataset * 100)

# DPO training
dpo_trainer = DPOTrainer(
    model=model,
    ref_model=None,  # Will create copy
    train_dataset=dpo_data,
    tokenizer=tokenizer,
    beta=0.1,  # KL penalty coefficient
)

dpo_trainer.train()
```

---

## 🌐 Model Hub

### Uploading Models

```python
"""
Uploading to HuggingFace Hub
Share your models with the world
"""

from huggingface_hub import login, HfApi
from transformers import AutoModel, AutoTokenizer

# ============================================
# LOGIN
# ============================================

# Option 1: Interactive login
login()

# Option 2: Token
login(token="hf_xxxxx")

# ============================================
# PUSH MODEL TO HUB
# ============================================

model = AutoModel.from_pretrained("bert-base-uncased")
tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased")

# Push with Trainer
# trainer.push_to_hub("my-awesome-model")

# Push directly
model.push_to_hub("my-awesome-model")
tokenizer.push_to_hub("my-awesome-model")

# ============================================
# CREATE MODEL CARD
# ============================================

# Create README.md with model card
model_card = """
---
language: en
license: mit
tags:
- text-classification
- bert
datasets:
- imdb
metrics:
- accuracy
---

# My Awesome Model

This model was fine-tuned on IMDB for sentiment analysis.

## Usage

```python
from transformers import pipeline

classifier = pipeline("sentiment-analysis", model="username/my-awesome-model")
result = classifier("I love this!")
```

## Training Details

- Base model: bert-base-uncased
- Dataset: IMDB
- Epochs: 3
- Accuracy: 93.5%
"""

# Save as README.md in model directory

# ============================================
# USING HUGGINGFACE CLI
# ============================================

# In terminal:
# huggingface-cli login
# huggingface-cli upload ./my_model username/my-awesome-model
```

### Finding Models

```python
"""
Finding and Filtering Models
Navigate the Hub programmatically
"""

from huggingface_hub import HfApi, list_models

api = HfApi()

# ============================================
# SEARCH MODELS
# ============================================

# List models by task
models = api.list_models(
    filter="text-classification",
    sort="downloads",
    direction=-1,
    limit=10
)

for model in models:
    print(f"{model.id}: {model.downloads:,} downloads")

# Search by name
models = api.list_models(search="bert")

# Filter by multiple criteria
models = api.list_models(
    filter=["text-classification", "pytorch"],
    language="en",
    library="transformers"
)

# ============================================
# MODEL INFO
# ============================================

model_info = api.model_info("bert-base-uncased")
print(f"Downloads: {model_info.downloads:,}")
print(f"Tags: {model_info.tags}")
print(f"Library: {model_info.library_name}")

# ============================================
# DOWNLOAD SPECIFIC FILES
# ============================================

from huggingface_hub import hf_hub_download

# Download specific file
file_path = hf_hub_download(
    repo_id="bert-base-uncased",
    filename="config.json"
)

# Download to specific directory
file_path = hf_hub_download(
    repo_id="bert-base-uncased",
    filename="pytorch_model.bin",
    cache_dir="./my_models"
)
```

---

## 💻 Code Examples

### Complete Text Classification Pipeline

```python
"""
Complete Text Classification Pipeline
From data to deployment
"""

from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    TrainingArguments,
    Trainer,
    DataCollatorWithPadding,
    pipeline
)
from datasets import load_dataset
from peft import LoraConfig, get_peft_model, TaskType
import numpy as np
from sklearn.metrics import classification_report

# ============================================
# 1. LOAD DATA
# ============================================

dataset = load_dataset("ag_news")  # 4-class news classification

print(f"Classes: {dataset['train'].features['label'].names}")
# ['World', 'Sports', 'Business', 'Sci/Tech']

# ============================================
# 2. LOAD MODEL AND TOKENIZER
# ============================================

model_name = "distilbert-base-uncased"

tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(
    model_name,
    num_labels=4
)

# ============================================
# 3. PREPARE DATA
# ============================================

def tokenize(examples):
    return tokenizer(
        examples["text"],
        truncation=True,
        max_length=128
    )

tokenized = dataset.map(tokenize, batched=True)
tokenized = tokenized.rename_column("label", "labels")

# ============================================
# 4. TRAINING
# ============================================

training_args = TrainingArguments(
    output_dir="./news_classifier",
    num_train_epochs=3,
    per_device_train_batch_size=32,
    per_device_eval_batch_size=64,
    learning_rate=5e-5,
    eval_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True,
    fp16=True,
)

def compute_metrics(eval_pred):
    logits, labels = eval_pred
    predictions = np.argmax(logits, axis=-1)
    accuracy = (predictions == labels).mean()
    return {"accuracy": accuracy}

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized["train"],
    eval_dataset=tokenized["test"],
    tokenizer=tokenizer,
    compute_metrics=compute_metrics,
)

trainer.train()

# ============================================
# 5. EVALUATE
# ============================================

predictions = trainer.predict(tokenized["test"])
preds = np.argmax(predictions.predictions, axis=-1)

print(classification_report(
    tokenized["test"]["labels"],
    preds,
    target_names=['World', 'Sports', 'Business', 'Sci/Tech']
))

# ============================================
# 6. INFERENCE
# ============================================

classifier = pipeline(
    "text-classification",
    model=model,
    tokenizer=tokenizer
)

# Test
news = "Apple announced new iPhone with advanced AI features"
result = classifier(news)
print(result)
# [{'label': 'LABEL_3', 'score': 0.92}]  # Sci/Tech

# ============================================
# 7. SAVE AND SHARE
# ============================================

trainer.save_model("./news_classifier_final")

# Push to Hub (optional)
# trainer.push_to_hub("my-news-classifier")
```

### Text Generation with Fine-Tuned Model

```python
"""
Fine-tune GPT-2 for Custom Text Generation
"""

from transformers import (
    GPT2LMHeadModel,
    GPT2Tokenizer,
    TrainingArguments,
    Trainer,
    DataCollatorForLanguageModeling
)
from datasets import load_dataset

# ============================================
# 1. LOAD MODEL
# ============================================

model = GPT2LMHeadModel.from_pretrained("gpt2")
tokenizer = GPT2Tokenizer.from_pretrained("gpt2")
tokenizer.pad_token = tokenizer.eos_token

# ============================================
# 2. PREPARE DATASET
# ============================================

# Example: Fine-tune on Shakespeare
dataset = load_dataset("tiny_shakespeare", split="train")

def tokenize(examples):
    return tokenizer(
        examples["text"],
        truncation=True,
        max_length=512
    )

tokenized = dataset.map(tokenize, batched=True, remove_columns=["text"])

# ============================================
# 3. DATA COLLATOR
# ============================================

# For causal LM: labels = input_ids (next token prediction)
data_collator = DataCollatorForLanguageModeling(
    tokenizer=tokenizer,
    mlm=False  # Causal LM, not masked LM
)

# ============================================
# 4. TRAIN
# ============================================

training_args = TrainingArguments(
    output_dir="./shakespeare_gpt2",
    num_train_epochs=5,
    per_device_train_batch_size=8,
    learning_rate=5e-5,
    save_strategy="epoch",
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized,
    data_collator=data_collator,
)

trainer.train()

# ============================================
# 5. GENERATE
# ============================================

model.eval()

prompt = "To be or not to be"
inputs = tokenizer(prompt, return_tensors="pt")

outputs = model.generate(
    inputs["input_ids"],
    max_length=100,
    temperature=0.8,
    top_p=0.95,
    do_sample=True,
    num_return_sequences=3
)

for i, output in enumerate(outputs):
    print(f"Generation {i+1}:")
    print(tokenizer.decode(output, skip_special_tokens=True))
    print()
```

---

## 🌍 Real World Use Cases

### 1. Multi-Language Customer Support

```python
# Load multilingual model
from transformers import pipeline

classifier = pipeline(
    "text-classification",
    model="nlptown/bert-base-multilingual-uncased-sentiment"
)

# Works for multiple languages!
texts = [
    "This product is great!",           # English
    "Ce produit est génial!",            # French
    "Dieses Produkt ist großartig!",     # German
    "このプロダクトは素晴らしい！"         # Japanese
]

for text in texts:
    print(classifier(text))
```

### 2. Document Q&A System

```python
from transformers import pipeline

# Load Q&A model
qa = pipeline("question-answering", model="deepset/roberta-base-squad2")

# Your documents
context = """
Company Policy: All employees are entitled to 20 days of paid vacation per year.
Vacation requests must be submitted at least 2 weeks in advance.
Unused vacation days can be carried over to the next year, up to a maximum of 5 days.
"""

# Answer questions
questions = [
    "How many vacation days do employees get?",
    "How far in advance should vacation be requested?",
    "Can unused vacation days be carried over?"
]

for q in questions:
    answer = qa(question=q, context=context)
    print(f"Q: {q}")
    print(f"A: {answer['answer']} (confidence: {answer['score']:.2%})\n")
```

### 3. Automated Code Review

```python
from transformers import pipeline

# Load code model
code_model = pipeline("text-generation", model="Salesforce/codegen-350M-mono")

prompt = """
# Review this Python code and suggest improvements:

def calculate_average(numbers):
    total = 0
    for n in numbers:
        total = total + n
    average = total / len(numbers)
    return average

# Code review:
"""

review = code_model(prompt, max_length=200)
print(review[0]['generated_text'])
```

---

## 🛠️ Mini Project: Build a Complete NLP API

```python
"""
Mini Project: FastAPI + HuggingFace
Production-ready NLP API
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import pipeline
import uvicorn

# ============================================
# INITIALIZE APP AND MODELS
# ============================================

app = FastAPI(title="NLP API", version="1.0")

# Load models (do this once at startup)
sentiment_analyzer = pipeline("sentiment-analysis")
summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
qa_model = pipeline("question-answering")
ner_model = pipeline("ner", grouped_entities=True)

# ============================================
# PYDANTIC MODELS
# ============================================

class SentimentRequest(BaseModel):
    text: str

class SummarizeRequest(BaseModel):
    text: str
    max_length: int = 130
    min_length: int = 30

class QARequest(BaseModel):
    question: str
    context: str

class NERRequest(BaseModel):
    text: str

# ============================================
# ENDPOINTS
# ============================================

@app.get("/")
def root():
    return {"message": "NLP API is running!"}

@app.post("/sentiment")
def analyze_sentiment(request: SentimentRequest):
    try:
        result = sentiment_analyzer(request.text)
        return {
            "text": request.text,
            "sentiment": result[0]["label"],
            "confidence": result[0]["score"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/summarize")
def summarize_text(request: SummarizeRequest):
    try:
        result = summarizer(
            request.text,
            max_length=request.max_length,
            min_length=request.min_length
        )
        return {
            "original_length": len(request.text),
            "summary": result[0]["summary_text"],
            "summary_length": len(result[0]["summary_text"])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/qa")
def answer_question(request: QARequest):
    try:
        result = qa_model(
            question=request.question,
            context=request.context
        )
        return {
            "question": request.question,
            "answer": result["answer"],
            "confidence": result["score"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ner")
def extract_entities(request: NERRequest):
    try:
        result = ner_model(request.text)
        entities = [
            {
                "entity": ent["entity_group"],
                "word": ent["word"],
                "confidence": ent["score"]
            }
            for ent in result
        ]
        return {
            "text": request.text,
            "entities": entities
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# RUN
# ============================================

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

# Test with:
# curl -X POST "http://localhost:8000/sentiment" \
#      -H "Content-Type: application/json" \
#      -d '{"text": "This is amazing!"}'
```

---

## ❓ Interview Questions

### Beginner Level

**Q1: What is HuggingFace and why is it popular?**

> **A:** HuggingFace is a platform and library ecosystem for machine learning, focused on NLP and transformers. It's popular because:
> 1. **Easy access:** One-line model loading
> 2. **Huge model hub:** 500K+ pre-trained models
> 3. **Unified API:** Same code works for BERT, GPT, T5, etc.
> 4. **Community:** Open source, active development

**Q2: What is a pipeline in HuggingFace?**

> **A:** A pipeline is a high-level abstraction that combines:
> - Tokenization
> - Model inference
> - Post-processing
>
> Into a single easy-to-use function:
> ```python
> classifier = pipeline("sentiment-analysis")
> result = classifier("I love this!")
> ```

**Q3: What's the difference between AutoModel and AutoModelForSequenceClassification?**

> **A:**
> - `AutoModel`: Returns base model (no task-specific head)
> - `AutoModelForSequenceClassification`: Adds classification head on top
>
> Use task-specific classes when you need to perform a specific task.

### Intermediate Level

**Q4: Explain the difference between map() with and without batched=True.**

> **A:**
> ```python
> # Without batched: Process one example at a time
> dataset.map(func)  # func receives single example
> 
> # With batched: Process batch of examples
> dataset.map(func, batched=True)  # func receives dict of lists
> ```
>
> Batched is faster for tokenization because tokenizers are optimized for batch processing.

**Q5: How do you handle different model architectures with the same code?**

> **A:** Use Auto classes:
> ```python
> from transformers import AutoModel, AutoTokenizer
> 
> # Works for any model!
> model = AutoModel.from_pretrained("bert-base-uncased")
> model = AutoModel.from_pretrained("gpt2")
> model = AutoModel.from_pretrained("facebook/bart-base")
> ```
>
> Auto classes automatically detect and load the correct class.

**Q6: What is the purpose of DataCollator?**

> **A:** DataCollators handle:
> 1. **Dynamic padding:** Pad sequences to max length in batch (not dataset)
> 2. **Creating labels:** For language modeling, create labels from inputs
> 3. **Special handling:** Mask tokens for MLM, etc.
>
> They're called during data loading to prepare batches.

### Advanced Level

**Q7: How would you serve multiple models efficiently?**

> **A:** Strategies:
>
> 1. **Lazy loading:** Load models on demand, cache in memory
> 2. **Model sharing:** Share base model, swap classification heads
> 3. **Quantization:** Use INT8/INT4 to reduce memory
> 4. **Batching:** Batch requests for same model
> 5. **GPU memory management:** Use device_map="auto" for large models
>
> ```python
> from functools import lru_cache
> 
> @lru_cache(maxsize=5)
> def get_model(model_name):
>     return pipeline("text-classification", model=model_name)
> ```

**Q8: Explain streaming datasets and when to use them.**

> **A:** Streaming datasets load data on-demand instead of downloading everything:
>
> ```python
> dataset = load_dataset("c4", streaming=True)
> ```
>
> Use when:
> - Dataset is too large for disk (C4 is 300GB+)
> - You only need a subset
> - Iterating once through data
>
> Limitations:
> - Can't shuffle fully (only buffer shuffle)
> - Can't index directly
> - Some operations not supported

### FAANG Level

**Q9: Design a production ML serving system using HuggingFace.**

> **A:** Architecture:
>
> ```
> Load Balancer
>      │
>      ├── API Gateway
>      │
>      ├── Model Server Pool
>      │   ├── GPU Instance 1 (sentiment)
>      │   ├── GPU Instance 2 (QA)
>      │   └── GPU Instance 3 (generation)
>      │
>      ├── Model Registry (HF Hub or internal)
>      │
>      ├── Request Queue (Redis)
>      │
>      └── Monitoring (latency, throughput)
> ```
>
> Key decisions:
> 1. **Batching:** Dynamic batching for throughput
> 2. **Caching:** Cache frequent requests
> 3. **Quantization:** FP16/INT8 for efficiency
> 4. **Auto-scaling:** Based on queue depth
> 5. **A/B testing:** Route % to new model versions

**Q10: How would you optimize inference latency for a HuggingFace model?**

> **A:** Techniques in order of impact:
>
> 1. **Quantization:** FP16 → 2x faster, INT8 → 3x faster
> 2. **TensorRT/ONNX:** Compiler optimizations
> 3. **Batching:** Amortize overhead across requests
> 4. **Model distillation:** Smaller model, similar performance
> 5. **Pruning:** Remove unnecessary weights
> 6. **Caching:** KV cache for generation
> 7. **Flash Attention:** Efficient attention implementation
>
> ```python
> # Quick wins
> model.half()  # FP16
> model.eval()  # Disable dropout
> torch.compile(model)  # PyTorch 2.0
> ```

---

## 📝 Homework

### Easy

1. Use a pipeline to analyze sentiment of 10 product reviews.
2. Load a dataset from Hub and print its structure.
3. Find 5 text classification models on the Hub and compare their download counts.

### Medium

4. Fine-tune DistilBERT on a custom text classification task.
5. Build a simple API with FastAPI that serves a HuggingFace model.
6. Compare inference speed of different model sizes (tiny, small, base).

### Hard

7. Implement a multi-model serving system with model caching.
8. Fine-tune and push a model to HuggingFace Hub with proper model card.
9. Build a streaming data pipeline for training on large datasets.

### Expert

10. Design and implement an A/B testing system for NLP models.
11. Benchmark different quantization methods on your model.
12. Build a production system with monitoring and auto-scaling.

---

## 🎯 Key Takeaways

```
HuggingFace Ecosystem:
├── Hub: 500K+ models, 100K+ datasets
├── Transformers: Unified API for all models
├── Datasets: Efficient data loading
├── PEFT: Parameter-efficient fine-tuning
├── TRL: RLHF training
└── Accelerate: Distributed training

Quick Start:
├── pipeline() for instant inference
├── AutoModel for flexibility
├── load_dataset() for data
└── Trainer for fine-tuning

Best Practices:
├── Use Auto classes
├── Enable batched tokenization
├── Use fp16 for training
├── Cache models and datasets
└── Push to Hub for sharing
```

---

**Next: [04-LangChain.md](./04-LangChain.md)** - Build powerful AI applications with chains and agents! 🔗
