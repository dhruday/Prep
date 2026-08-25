# 📘 Intermediate Projects (20 Projects)

## Pipeline-Focused Projects with Real-World Data

These projects involve **multiple models**, **real messy data**, **API development**, and **system thinking**. You'll build end-to-end pipelines.

---

## Project Index

| # | Project | Domain | Key Skills |
|---|---------|--------|------------|
| 1 | Product Recommendation Engine | RecSys | Collaborative Filtering, Embeddings |
| 2 | Named Entity Recognition System | NLP | Sequence Labeling, spaCy/HuggingFace |
| 3 | Object Detection for Retail | CV | YOLO, Real-time Detection |
| 4 | Text Summarization API | NLP | Seq2Seq, T5/BART |
| 5 | Customer Support Ticket Router | NLP | Multi-class, Priority Prediction |
| 6 | Image Similarity Search | CV | Embeddings, Vector Search |
| 7 | Sales Forecasting System | Time Series | Prophet, LightGBM |
| 8 | Resume Parser & Ranker | NLP | NER, Matching Algorithms |
| 9 | Medical Image Classification | CV | Transfer Learning, Grad-CAM |
| 10 | Multi-language Sentiment API | NLP | Multilingual Models |
| 11 | Document OCR Pipeline | CV + NLP | Tesseract, Layout Analysis |
| 12 | Music Recommendation System | RecSys | Content + Collaborative |
| 13 | Real-time Emotion Detection | CV | Video Analysis, CNN |
| 14 | Question Answering System | NLP | BERT QA, Extractive |
| 15 | Inventory Demand Forecasting | Time Series | Ensemble Methods |
| 16 | Social Media Analytics Dashboard | NLP | Topic Modeling, Trends |
| 17 | License Plate Recognition | CV | OCR, Detection |
| 18 | Email Auto-Response Generator | NLP | Classification + Generation |
| 19 | Price Optimization Engine | ML | Causal Inference, A/B Testing |
| 20 | Audio Classification System | Audio | Spectrograms, CNNs |

---

# Project 1: Product Recommendation Engine

## 🎯 Problem Statement

**Business Context:** An e-commerce platform with 1M+ products needs to personalize recommendations. Good recommendations increase conversion by 10-30%.

**Goal:** Build a recommendation system that suggests products based on user behavior and preferences.

## 📊 Dataset

| Source | Name | Size |
|--------|------|------|
| Kaggle | [Amazon Product Reviews](https://www.kaggle.com/datasets/saurav9786/amazon-product-reviews) | 7.8M reviews |
| Alternative | [MovieLens 25M](https://grouplens.org/datasets/movielens/25m/) | 25M ratings |
| Retail | [Instacart Market Basket](https://www.kaggle.com/c/instacart-market-basket-analysis) | 3M orders |

## 🔄 Input → Output

```
INPUT:                                    OUTPUT:
┌────────────────────────────────────┐   ┌──────────────────────────────┐
│ User History:                      │   │ Recommended Products:        │
│ • Bought: Running shoes            │   │                              │
│ • Viewed: Fitness tracker          │──►│ 1. Wireless earbuds (0.92)  │
│ • Searched: "workout gear"         │   │ 2. Yoga mat (0.88)          │
│                                    │   │ 3. Water bottle (0.85)      │
│ Context: Mobile, Evening           │   │ 4. Gym bag (0.82)           │
└────────────────────────────────────┘   └──────────────────────────────┘
```

## 🤖 Model Choices

| Model | Type | Pros | Cons |
|-------|------|------|------|
| **Popularity** | Baseline | Simple | Not personalized |
| **Collaborative Filtering** | User-based | Captures preferences | Cold start |
| **Matrix Factorization** | SVD/ALS | Scalable | Sparse data issues |
| **Neural CF** | Deep Learning | Rich representations | Needs lots of data |
| **Two-Tower** | Embedding | Production-ready | Complex training |

**Production Choice:** Two-Tower model with ANN (Approximate Nearest Neighbors)

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     RECOMMENDATION SYSTEM                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  OFFLINE PIPELINE (Daily)                                               │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────┐         │
│  │ User     │──►│ Feature  │──►│ Train    │──►│ Generate     │         │
│  │ Events   │   │ Engineer │   │ Model    │   │ Embeddings   │         │
│  └──────────┘   └──────────┘   └──────────┘   └──────────────┘         │
│                                                       │                 │
│                                                       ▼                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    FAISS / Pinecone Index                       │   │
│  │              (Product Embeddings + Metadata)                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                       ▲                 │
│  ONLINE PIPELINE (Real-time)                          │                 │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────┴─────┐          │
│  │ API      │──►│ User     │──►│ ANN      │──►│ Re-rank &  │          │
│  │ Request  │   │ Embedding│   │ Search   │   │ Filter     │          │
│  └──────────┘   └──────────┘   └──────────┘   └────────────┘          │
│                                                       │                 │
│                                               ┌───────▼───────┐        │
│                                               │ Top-K Products│        │
│                                               └───────────────┘        │
└─────────────────────────────────────────────────────────────────────────┘
```

## 📏 Evaluation Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| **Precision@K** | Relevant items in top K | >0.15 |
| **Recall@K** | Coverage of relevant items | >0.25 |
| **NDCG@K** | Ranking quality | >0.35 |
| **Hit Rate** | User clicks recommendation | >10% |
| **Diversity** | Variety in recommendations | Monitor |

## ⚠️ Real-World Challenges

1. **Cold Start:** New users/products have no history
   - Solution: Content-based fallback, demographic clustering
2. **Scalability:** 1M products × 10M users
   - Solution: ANN indexes (FAISS, ScaNN)
3. **Freshness:** Trends change quickly
   - Solution: Real-time event ingestion, model updates
4. **Bias:** Popular items dominate
   - Solution: Exploration/exploitation, diversity constraints

## 💻 Implementation Code

```python
"""
Two-Tower Recommendation Model
"""
import torch
import torch.nn as nn
import numpy as np
from sklearn.model_selection import train_test_split
import faiss

class TwoTowerModel(nn.Module):
    """
    Separate towers for user and item embeddings
    """
    def __init__(self, num_users, num_items, embedding_dim=64):
        super().__init__()
        
        # User tower
        self.user_embedding = nn.Embedding(num_users, embedding_dim)
        self.user_mlp = nn.Sequential(
            nn.Linear(embedding_dim, 128),
            nn.ReLU(),
            nn.Linear(128, embedding_dim)
        )
        
        # Item tower  
        self.item_embedding = nn.Embedding(num_items, embedding_dim)
        self.item_mlp = nn.Sequential(
            nn.Linear(embedding_dim, 128),
            nn.ReLU(),
            nn.Linear(128, embedding_dim)
        )
    
    def get_user_embedding(self, user_ids):
        x = self.user_embedding(user_ids)
        x = self.user_mlp(x)
        return nn.functional.normalize(x, p=2, dim=1)
    
    def get_item_embedding(self, item_ids):
        x = self.item_embedding(item_ids)
        x = self.item_mlp(x)
        return nn.functional.normalize(x, p=2, dim=1)
    
    def forward(self, user_ids, item_ids):
        user_emb = self.get_user_embedding(user_ids)
        item_emb = self.get_item_embedding(item_ids)
        # Dot product similarity
        return (user_emb * item_emb).sum(dim=1)


def train_model(model, train_data, epochs=10, batch_size=1024):
    """Train with negative sampling"""
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
    criterion = nn.BCEWithLogitsLoss()
    
    num_items = model.item_embedding.num_embeddings
    
    for epoch in range(epochs):
        model.train()
        total_loss = 0
        
        for i in range(0, len(train_data), batch_size):
            batch = train_data[i:i+batch_size]
            user_ids = torch.tensor(batch['user_id'].values)
            pos_items = torch.tensor(batch['item_id'].values)
            
            # Negative sampling
            neg_items = torch.randint(0, num_items, (len(batch),))
            
            # Positive pairs
            pos_scores = model(user_ids, pos_items)
            neg_scores = model(user_ids, neg_items)
            
            # BPR-style loss
            loss = -torch.log(torch.sigmoid(pos_scores - neg_scores)).mean()
            
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item()
        
        print(f"Epoch {epoch+1}: Loss = {total_loss:.4f}")


class RecommendationService:
    """Production-ready recommendation service"""
    
    def __init__(self, model, num_items):
        self.model = model
        self.model.eval()
        
        # Pre-compute item embeddings
        with torch.no_grad():
            item_ids = torch.arange(num_items)
            self.item_embeddings = model.get_item_embedding(item_ids).numpy()
        
        # Build FAISS index
        dim = self.item_embeddings.shape[1]
        self.index = faiss.IndexFlatIP(dim)  # Inner product
        self.index.add(self.item_embeddings.astype('float32'))
    
    def recommend(self, user_id, top_k=10, exclude_items=None):
        """Get top-K recommendations for user"""
        with torch.no_grad():
            user_emb = self.model.get_user_embedding(
                torch.tensor([user_id])
            ).numpy().astype('float32')
        
        # Search
        scores, indices = self.index.search(user_emb, top_k + len(exclude_items or []))
        
        # Filter excluded
        results = []
        for idx, score in zip(indices[0], scores[0]):
            if exclude_items and idx in exclude_items:
                continue
            results.append({'item_id': int(idx), 'score': float(score)})
            if len(results) >= top_k:
                break
        
        return results


# FastAPI endpoint
from fastapi import FastAPI
app = FastAPI()

@app.get("/recommend/{user_id}")
def get_recommendations(user_id: int, top_k: int = 10):
    recommendations = service.recommend(user_id, top_k)
    return {"user_id": user_id, "recommendations": recommendations}
```

## 🚀 Extensions

- [ ] Add content features (product descriptions, images)
- [ ] Implement real-time event processing (Kafka)
- [ ] A/B testing framework
- [ ] Multi-objective optimization (relevance + diversity + business goals)

---

# Project 2: Named Entity Recognition System

## 🎯 Problem Statement

**Business Context:** Legal firms process thousands of contracts. Extracting entities (names, dates, amounts, organizations) manually takes hours per document.

**Goal:** Build NER system to extract key entities from legal/business documents.

## 📊 Dataset

| Source | Name | Entities |
|--------|------|----------|
| Hugging Face | [CoNLL-2003](https://huggingface.co/datasets/conll2003) | PER, ORG, LOC, MISC |
| Kaggle | [Legal NER](https://www.kaggle.com/datasets) | Contract-specific |
| Custom | Annotate with Label Studio | Domain-specific |

## 🔄 Input → Output

```
INPUT:
"Apple Inc. signed a $500M contract with Microsoft Corporation 
 on January 15, 2024 at their headquarters in Cupertino."

OUTPUT:
┌────────────────────────────────────────────────────────────┐
│  Entity           │  Type          │  Position            │
├───────────────────┼────────────────┼──────────────────────┤
│  Apple Inc.       │  ORGANIZATION  │  0-10               │
│  $500M            │  MONEY         │  22-27              │
│  Microsoft Corp.  │  ORGANIZATION  │  42-63              │
│  January 15, 2024 │  DATE          │  67-83              │
│  Cupertino        │  LOCATION      │  111-120            │
└────────────────────────────────────────────────────────────┘
```

## 🤖 Model Choices

| Model | Accuracy (F1) | Speed | When to Use |
|-------|---------------|-------|-------------|
| **spaCy** | ~85% | Very Fast | Production, general |
| **BERT-NER** | ~92% | Medium | High accuracy needed |
| **RoBERTa-NER** | ~93% | Medium | Best accuracy |
| **Flair** | ~93% | Slow | Research, ensemble |

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    NER EXTRACTION PIPELINE                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐ │
│  │ Document │──►│ Sentence │──►│   NER    │──►│ Entity   │ │
│  │   PDF    │   │ Segment  │   │  Model   │   │ Linking  │ │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘ │
│       │                             │               │       │
│       ▼                             ▼               ▼       │
│  ┌──────────┐                  ┌──────────┐   ┌──────────┐ │
│  │   OCR    │                  │  Token   │   │ Database │ │
│  │ (if scan)│                  │  Labels  │   │  Lookup  │ │
│  └──────────┘                  │ B-I-O    │   └──────────┘ │
│                                └──────────┘                 │
│                                                              │
│  Output: Structured JSON with entities + confidence         │
└─────────────────────────────────────────────────────────────┘
```

## 💻 Implementation Code

```python
"""
Fine-tune BERT for NER
"""
from transformers import (
    AutoTokenizer, 
    AutoModelForTokenClassification,
    TrainingArguments,
    Trainer,
    DataCollatorForTokenClassification
)
from datasets import load_dataset
import numpy as np
from seqeval.metrics import f1_score, classification_report

# Load dataset
dataset = load_dataset("conll2003")
label_names = dataset["train"].features["ner_tags"].feature.names

# Load model
model_name = "bert-base-cased"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForTokenClassification.from_pretrained(
    model_name, 
    num_labels=len(label_names)
)

def tokenize_and_align_labels(examples):
    tokenized = tokenizer(
        examples["tokens"],
        truncation=True,
        is_split_into_words=True
    )
    
    labels = []
    for i, label in enumerate(examples["ner_tags"]):
        word_ids = tokenized.word_ids(batch_index=i)
        label_ids = []
        previous_word_idx = None
        
        for word_idx in word_ids:
            if word_idx is None:
                label_ids.append(-100)
            elif word_idx != previous_word_idx:
                label_ids.append(label[word_idx])
            else:
                label_ids.append(-100)  # Ignore subwords
            previous_word_idx = word_idx
        
        labels.append(label_ids)
    
    tokenized["labels"] = labels
    return tokenized

# Tokenize
tokenized_datasets = dataset.map(tokenize_and_align_labels, batched=True)

# Training
training_args = TrainingArguments(
    output_dir="./ner-model",
    evaluation_strategy="epoch",
    learning_rate=2e-5,
    per_device_train_batch_size=16,
    num_train_epochs=3,
    weight_decay=0.01,
)

data_collator = DataCollatorForTokenClassification(tokenizer)

def compute_metrics(eval_pred):
    predictions, labels = eval_pred
    predictions = np.argmax(predictions, axis=2)
    
    true_labels = [[label_names[l] for l in label if l != -100] 
                   for label in labels]
    true_preds = [[label_names[p] for p, l in zip(pred, label) if l != -100]
                  for pred, label in zip(predictions, labels)]
    
    return {"f1": f1_score(true_labels, true_preds)}

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_datasets["train"],
    eval_dataset=tokenized_datasets["validation"],
    tokenizer=tokenizer,
    data_collator=data_collator,
    compute_metrics=compute_metrics,
)

trainer.train()


# Inference service
class NERService:
    def __init__(self, model_path):
        self.tokenizer = AutoTokenizer.from_pretrained(model_path)
        self.model = AutoModelForTokenClassification.from_pretrained(model_path)
        self.model.eval()
        
        self.id2label = self.model.config.id2label
    
    def extract_entities(self, text):
        inputs = self.tokenizer(text, return_tensors="pt", truncation=True)
        
        with torch.no_grad():
            outputs = self.model(**inputs)
        
        predictions = torch.argmax(outputs.logits, dim=2)
        tokens = self.tokenizer.convert_ids_to_tokens(inputs["input_ids"][0])
        
        entities = []
        current_entity = None
        
        for token, pred in zip(tokens, predictions[0]):
            label = self.id2label[pred.item()]
            
            if label.startswith("B-"):
                if current_entity:
                    entities.append(current_entity)
                current_entity = {
                    "text": token.replace("##", ""),
                    "type": label[2:],
                    "tokens": [token]
                }
            elif label.startswith("I-") and current_entity:
                current_entity["text"] += token.replace("##", "")
                current_entity["tokens"].append(token)
            else:
                if current_entity:
                    entities.append(current_entity)
                    current_entity = None
        
        return entities
```

---

# Project 3: Object Detection for Retail

## 🎯 Problem Statement

**Business Context:** Retail stores want automated checkout (like Amazon Go). Cameras need to detect and count products in real-time.

**Goal:** Build real-time product detection system for retail environments.

## 📊 Dataset

| Source | Name | Size |
|--------|------|------|
| Roboflow | [Retail Products](https://universe.roboflow.com/retail) | Various |
| Custom | Collect & annotate store images | Domain-specific |
| Kaggle | [SKU-110K](https://www.kaggle.com/datasets/thedatasith/sku110k) | 110K products |

## 🤖 Model Choices

| Model | FPS | mAP | Use Case |
|-------|-----|-----|----------|
| **YOLOv8n** | 100+ | ~35% | Edge devices |
| **YOLOv8m** | 50+ | ~45% | Balanced |
| **YOLOv8l** | 30+ | ~50% | Accuracy priority |
| **RT-DETR** | 40+ | ~50% | New SOTA |

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 RETAIL DETECTION SYSTEM                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐ │
│  │ Camera   │──►│  Frame   │──►│  YOLO    │──►│  Track   │ │
│  │ Stream   │   │ Process  │   │ Detect   │   │  Objects │ │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘ │
│       │                                             │       │
│       │                                             ▼       │
│  ┌────┴─────────────────────────────────────────────────┐  │
│  │                   Object Tracker                      │  │
│  │              (DeepSORT / ByteTrack)                  │  │
│  └─────────────────────────────────────────────────────┘  │
│                              │                              │
│                              ▼                              │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐ │
│  │ Product  │   │  Count   │   │  POS     │   │ Analytics│ │
│  │ Lookup   │   │  Items   │   │ Integrate│   │ Dashboard│ │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 💻 Implementation Code

```python
"""
YOLOv8 for Retail Product Detection
"""
from ultralytics import YOLO
import cv2

# Load pretrained model
model = YOLO('yolov8m.pt')

# Fine-tune on custom retail data
results = model.train(
    data='retail_dataset.yaml',  # Your dataset config
    epochs=100,
    imgsz=640,
    batch=16,
    name='retail_detector'
)

# Real-time detection
class RetailDetector:
    def __init__(self, model_path, confidence=0.5):
        self.model = YOLO(model_path)
        self.confidence = confidence
        self.class_names = self.model.names
    
    def detect_frame(self, frame):
        results = self.model(frame, conf=self.confidence)[0]
        
        detections = []
        for box in results.boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            conf = box.conf[0].item()
            cls_id = int(box.cls[0].item())
            
            detections.append({
                'bbox': [x1, y1, x2, y2],
                'confidence': conf,
                'class_id': cls_id,
                'class_name': self.class_names[cls_id]
            })
        
        return detections
    
    def process_video(self, video_path, output_path=None):
        cap = cv2.VideoCapture(video_path)
        
        if output_path:
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            fps = cap.get(cv2.CAP_PROP_FPS)
            w, h = int(cap.get(3)), int(cap.get(4))
            out = cv2.VideoWriter(output_path, fourcc, fps, (w, h))
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            detections = self.detect_frame(frame)
            
            # Draw boxes
            for det in detections:
                x1, y1, x2, y2 = map(int, det['bbox'])
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                label = f"{det['class_name']}: {det['confidence']:.2f}"
                cv2.putText(frame, label, (x1, y1-10), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
            
            if output_path:
                out.write(frame)
            else:
                cv2.imshow('Detection', frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
        
        cap.release()
        if output_path:
            out.release()


# Usage
detector = RetailDetector('retail_detector/best.pt')
detector.process_video('store_camera.mp4', 'output.mp4')
```

---

# Project 4: Text Summarization API

## 🎯 Problem Statement

**Business Context:** News agencies process thousands of articles daily. Automatic summarization helps editors and readers quickly understand content.

**Goal:** Build API that summarizes long documents into concise versions.

## 📊 Dataset

| Source | Name | Size |
|--------|------|------|
| Hugging Face | [CNN/DailyMail](https://huggingface.co/datasets/cnn_dailymail) | 300K articles |
| Hugging Face | [XSum](https://huggingface.co/datasets/xsum) | 227K articles |
| Academic | [arXiv](https://huggingface.co/datasets/scientific_papers) | Scientific papers |

## 🤖 Model Choices

| Model | Type | Quality | Speed |
|-------|------|---------|-------|
| **BART** | Extractive+Abstractive | Good | Medium |
| **T5** | Seq2Seq | Very Good | Medium |
| **Pegasus** | Specialized for summarization | Best | Slow |
| **DistilBART** | Distilled | Good | Fast |

## 💻 Implementation Code

```python
"""
Summarization API with FastAPI
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import pipeline, AutoTokenizer, AutoModelForSeq2SeqLM

app = FastAPI(title="Text Summarization API")

# Load model
model_name = "facebook/bart-large-cnn"
summarizer = pipeline("summarization", model=model_name)

# Or load manually for more control
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSeq2SeqLM.from_pretrained(model_name)


class SummarizationRequest(BaseModel):
    text: str
    max_length: int = 150
    min_length: int = 50
    style: str = "default"  # "bullet", "abstract", "default"


class SummarizationResponse(BaseModel):
    summary: str
    original_length: int
    summary_length: int
    compression_ratio: float


@app.post("/summarize", response_model=SummarizationResponse)
def summarize(request: SummarizationRequest):
    if len(request.text) < 100:
        raise HTTPException(400, "Text too short to summarize")
    
    # Summarize
    result = summarizer(
        request.text,
        max_length=request.max_length,
        min_length=request.min_length,
        do_sample=False
    )[0]
    
    summary = result['summary_text']
    
    return SummarizationResponse(
        summary=summary,
        original_length=len(request.text),
        summary_length=len(summary),
        compression_ratio=len(summary) / len(request.text)
    )


@app.post("/summarize/batch")
def summarize_batch(texts: list[str]):
    """Batch summarization for efficiency"""
    results = summarizer(texts, max_length=150, batch_size=8)
    return [r['summary_text'] for r in results]


# Run: uvicorn main:app --host 0.0.0.0 --port 8000
```

---

# Projects 5-20: Quick Reference

## Project 5: Customer Support Ticket Router

| Item | Details |
|------|---------|
| **Dataset** | [Customer Support on Twitter](https://www.kaggle.com/datasets/thoughtvector/customer-support-on-twitter) |
| **Task** | Route tickets to correct department + predict priority |
| **Model** | Multi-task BERT (classification heads) |
| **Architecture** | API → Classifier → Queue assignment → Agent notification |

---

## Project 6: Image Similarity Search

| Item | Details |
|------|---------|
| **Dataset** | [DeepFashion](http://mmlab.ie.cuhk.edu.hk/projects/DeepFashion.html) |
| **Task** | Find visually similar products |
| **Model** | ResNet/CLIP embeddings + FAISS |
| **Architecture** | Image → Embed → Vector DB → Similar images |

---

## Project 7: Sales Forecasting System

| Item | Details |
|------|---------|
| **Dataset** | [Walmart Sales](https://www.kaggle.com/c/m5-forecasting-accuracy) |
| **Task** | Predict next 28 days of sales |
| **Model** | Prophet + LightGBM ensemble |
| **Challenge** | Multiple hierarchies, promotions, holidays |

---

## Project 8: Resume Parser & Ranker

| Item | Details |
|------|---------|
| **Dataset** | [Resume Dataset](https://www.kaggle.com/datasets/gauravduttakiit/resume-dataset) |
| **Task** | Extract skills, experience → rank against job description |
| **Model** | NER + Sentence-BERT similarity |
| **Output** | Structured JSON + match score |

---

## Project 9: Medical Image Classification

| Item | Details |
|------|---------|
| **Dataset** | [ChestX-ray14](https://nihcc.app.box.com/v/ChestXray-NIHCC) |
| **Task** | Detect pneumonia/COVID from X-rays |
| **Model** | DenseNet + Grad-CAM visualization |
| **Critical** | Handle class imbalance, explain predictions |

---

## Project 10: Multi-language Sentiment API

| Item | Details |
|------|---------|
| **Dataset** | [Amazon Reviews Multi](https://huggingface.co/datasets/amazon_reviews_multi) |
| **Task** | Sentiment in 6+ languages |
| **Model** | XLM-RoBERTa |
| **Feature** | Language detection → unified sentiment |

---

## Project 11: Document OCR Pipeline

| Item | Details |
|------|---------|
| **Dataset** | [FUNSD](https://guillaumejaume.github.io/FUNSD/) |
| **Task** | Extract text + layout from scanned documents |
| **Model** | Tesseract + LayoutLM |
| **Pipeline** | Scan → OCR → Layout → Structured output |

---

## Project 12: Music Recommendation System

| Item | Details |
|------|---------|
| **Dataset** | [Million Song Dataset](http://millionsongdataset.com/) |
| **Task** | Personalized playlist generation |
| **Model** | Hybrid: Collaborative + Audio features |
| **Special** | Handle cold-start with audio analysis |

---

## Project 13: Real-time Emotion Detection

| Item | Details |
|------|---------|
| **Dataset** | [FER2013](https://www.kaggle.com/c/challenges-in-representation-learning-facial-expression-recognition-challenge) |
| **Task** | Detect emotions from webcam |
| **Model** | EfficientNet + face detection |
| **Challenge** | Real-time processing, lighting variations |

---

## Project 14: Question Answering System

| Item | Details |
|------|---------|
| **Dataset** | [SQuAD 2.0](https://rajpurkar.github.io/SQuAD-explorer/) |
| **Task** | Extract answers from context |
| **Model** | BERT-QA fine-tuned |
| **Feature** | Handle unanswerable questions |

---

## Project 15: Inventory Demand Forecasting

| Item | Details |
|------|---------|
| **Dataset** | [Store Item Demand](https://www.kaggle.com/c/demand-forecasting-kernels-only) |
| **Task** | Predict demand per SKU per store |
| **Model** | LightGBM + Neural Prophet |
| **Challenge** | Intermittent demand, new products |

---

## Project 16: Social Media Analytics Dashboard

| Item | Details |
|------|---------|
| **Dataset** | Twitter/Reddit API data |
| **Task** | Topic modeling, trend detection, sentiment |
| **Model** | BERTopic + Sentiment classifier |
| **Output** | Interactive Streamlit dashboard |

---

## Project 17: License Plate Recognition

| Item | Details |
|------|---------|
| **Dataset** | [CCPD](https://github.com/detectRecog/CCPD) |
| **Task** | Detect plate → OCR characters |
| **Model** | YOLO → CRNN/TrOCR |
| **Challenge** | Angle, blur, different plate formats |

---

## Project 18: Email Auto-Response Generator

| Item | Details |
|------|---------|
| **Dataset** | [Enron Emails](https://www.cs.cmu.edu/~enron/) |
| **Task** | Classify email → generate appropriate response |
| **Model** | Classification + Fine-tuned GPT-2/T5 |
| **Safety** | Human review for sensitive responses |

---

## Project 19: Price Optimization Engine

| Item | Details |
|------|---------|
| **Dataset** | [Mercari Price Suggestion](https://www.kaggle.com/c/mercari-price-suggestion-challenge) |
| **Task** | Dynamic pricing based on demand |
| **Model** | Causal ML + Demand elasticity |
| **Technique** | A/B testing, uplift modeling |

---

## Project 20: Audio Classification System

| Item | Details |
|------|---------|
| **Dataset** | [UrbanSound8K](https://urbansounddataset.weebly.com/urbansound8k.html) |
| **Task** | Classify environmental sounds |
| **Model** | Mel spectrograms + CNN |
| **Extension** | Keyword spotting, speaker ID |

---

## 🎯 Intermediate Projects Checklist

Complete at least **8 projects** before moving to Advanced:

- [ ] 2 Full pipeline projects (end-to-end)
- [ ] 2 API-based projects
- [ ] 2 Deep Learning projects
- [ ] 2 Business-focused projects

---

**Next:** [03-Advanced-Projects.md](./03-Advanced-Projects.md) →
