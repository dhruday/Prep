# 📘 Sentiment Analysis Project - End-to-End with BERT

## 📚 Table of Contents

1. [Project Overview](#-project-overview)
2. [Project Setup](#️-project-setup)
3. [Part 1: Data Preparation](#-part-1-data-preparation)
4. [Part 2: Dataset Class](#-part-2-dataset-class)
5. [Part 3: Model Definition](#-part-3-model-definition)
6. [Part 4: Training](#-part-4-training)
7. [Part 5: Inference](#-part-5-inference)
8. [Part 6: API Deployment (FastAPI)](#-part-6-api-deployment-fastapi)
9. [Homework](#-homework)
10. [Common Mistakes](#️-common-mistakes)
11. [Interview Questions](#-interview-questions)
12. [Next Steps](#-next-steps)

---

## 🎯 Project Overview

### What We're Building

A **production-ready sentiment analysis system** that:
- Classifies text as Positive, Negative, or Neutral
- Uses BERT for state-of-the-art accuracy
- Includes data preprocessing, training, evaluation, and inference
- Can be deployed as an API

```
┌─────────────────────────────────────────────────────────────────┐
│                 SENTIMENT ANALYSIS PIPELINE                      │
│                                                                  │
│   Raw Text                                                       │
│      │                                                           │
│      ▼                                                           │
│   ┌─────────────────┐                                           │
│   │ Preprocessing   │ ← Clean, normalize                        │
│   └────────┬────────┘                                           │
│            │                                                     │
│            ▼                                                     │
│   ┌─────────────────┐                                           │
│   │ BERT Tokenizer  │ ← Tokenize, add special tokens            │
│   └────────┬────────┘                                           │
│            │                                                     │
│            ▼                                                     │
│   ┌─────────────────┐                                           │
│   │ BERT Model      │ ← Extract features                        │
│   └────────┬────────┘                                           │
│            │                                                     │
│            ▼                                                     │
│   ┌─────────────────┐                                           │
│   │ Classification  │ ← Predict sentiment                       │
│   │ Head            │                                           │
│   └────────┬────────┘                                           │
│            │                                                     │
│            ▼                                                     │
│   Sentiment: Positive (92%), Negative (5%), Neutral (3%)        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Real-World Applications

- 📱 **Social Media Monitoring:** Track brand sentiment on Twitter/X
- ⭐ **Review Analysis:** Analyze product reviews for insights
- 📞 **Customer Support:** Route angry customers to senior agents
- 📰 **News Analysis:** Understand public reaction to events
- 💼 **Employee Feedback:** Analyze survey responses

---

## 🛠️ Project Setup

### Install Dependencies

```bash
pip install torch transformers datasets
pip install scikit-learn pandas numpy
pip install matplotlib seaborn
pip install accelerate  # For faster training
```

### Project Structure

```
sentiment-analysis/
├── data/
│   ├── raw/
│   │   └── reviews.csv
│   └── processed/
│       ├── train.csv
│       └── test.csv
├── models/
│   └── bert-sentiment/
│       ├── config.json
│       ├── model.pt
│       └── tokenizer/
├── src/
│   ├── data/
│   │   ├── __init__.py
│   │   ├── dataset.py
│   │   └── preprocessing.py
│   ├── model/
│   │   ├── __init__.py
│   │   └── classifier.py
│   ├── train.py
│   └── inference.py
├── notebooks/
│   └── exploration.ipynb
├── requirements.txt
└── README.md
```

---

## 📦 Part 1: Data Preparation

### Using the IMDB Dataset

```python
"""
Data preparation for sentiment analysis.
We'll use the IMDB movie reviews dataset.
"""

import pandas as pd
import numpy as np
from datasets import load_dataset
from sklearn.model_selection import train_test_split
import re

# ============================================
# LOAD DATASET
# ============================================

def load_imdb_dataset():
    """
    Load IMDB dataset from Hugging Face.
    
    Returns:
        train_df, test_df: DataFrames with 'text' and 'label' columns
    """
    print("Loading IMDB dataset...")
    dataset = load_dataset("imdb")
    
    # Convert to DataFrames
    train_df = pd.DataFrame({
        'text': dataset['train']['text'],
        'label': dataset['train']['label']
    })
    
    test_df = pd.DataFrame({
        'text': dataset['test']['text'],
        'label': dataset['test']['label']
    })
    
    print(f"Training samples: {len(train_df)}")
    print(f"Test samples: {len(test_df)}")
    print(f"Labels: 0 = Negative, 1 = Positive")
    
    return train_df, test_df


# ============================================
# TEXT PREPROCESSING
# ============================================

def clean_text(text: str) -> str:
    """
    Clean and normalize text.
    
    Steps:
    1. Remove HTML tags
    2. Remove URLs
    3. Handle special characters
    4. Normalize whitespace
    """
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    
    # Remove URLs
    text = re.sub(r'http\S+|www\S+', '', text)
    
    # Remove multiple spaces
    text = re.sub(r'\s+', ' ', text)
    
    # Strip leading/trailing whitespace
    text = text.strip()
    
    return text


def preprocess_dataset(df: pd.DataFrame) -> pd.DataFrame:
    """Preprocess entire dataset."""
    df = df.copy()
    df['text'] = df['text'].apply(clean_text)
    
    # Remove empty texts
    df = df[df['text'].str.len() > 0]
    
    return df


# ============================================
# DATA ANALYSIS
# ============================================

def analyze_dataset(df: pd.DataFrame, name: str = "Dataset"):
    """Print dataset statistics."""
    print(f"\n{'='*50}")
    print(f"{name} Statistics")
    print('='*50)
    
    print(f"\nTotal samples: {len(df)}")
    print(f"\nLabel distribution:")
    print(df['label'].value_counts())
    print(f"\nLabel percentages:")
    print(df['label'].value_counts(normalize=True) * 100)
    
    print(f"\nText length statistics:")
    lengths = df['text'].str.split().str.len()
    print(f"  Min words:  {lengths.min()}")
    print(f"  Max words:  {lengths.max()}")
    print(f"  Mean words: {lengths.mean():.1f}")
    print(f"  Median:     {lengths.median():.1f}")
    
    print(f"\nSample texts:")
    for label in df['label'].unique():
        sample = df[df['label'] == label].iloc[0]['text']
        sentiment = "Positive" if label == 1 else "Negative"
        print(f"\n  {sentiment}:")
        print(f"  {sample[:200]}...")


# Run data preparation
if __name__ == "__main__":
    # Load data
    train_df, test_df = load_imdb_dataset()
    
    # Preprocess
    train_df = preprocess_dataset(train_df)
    test_df = preprocess_dataset(test_df)
    
    # Analyze
    analyze_dataset(train_df, "Training Data")
    analyze_dataset(test_df, "Test Data")
    
    # Save processed data
    train_df.to_csv('data/processed/train.csv', index=False)
    test_df.to_csv('data/processed/test.csv', index=False)
    print("\nData saved to data/processed/")
```

---

## 📦 Part 2: Dataset Class

```python
"""
PyTorch Dataset for sentiment analysis.
"""

import torch
from torch.utils.data import Dataset, DataLoader
from transformers import BertTokenizer
import pandas as pd
from typing import Dict, List, Optional

class SentimentDataset(Dataset):
    """
    Custom Dataset for sentiment analysis with BERT.
    
    Handles:
    - Tokenization with BERT tokenizer
    - Padding and truncation
    - Attention mask creation
    """
    
    def __init__(
        self,
        texts: List[str],
        labels: Optional[List[int]],
        tokenizer: BertTokenizer,
        max_length: int = 256
    ):
        """
        Args:
            texts: List of text strings
            labels: List of labels (0 or 1), None for inference
            tokenizer: BERT tokenizer
            max_length: Maximum sequence length
        """
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_length = max_length
    
    def __len__(self) -> int:
        return len(self.texts)
    
    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        text = str(self.texts[idx])
        
        # Tokenize
        encoding = self.tokenizer(
            text,
            add_special_tokens=True,        # Add [CLS] and [SEP]
            max_length=self.max_length,
            padding='max_length',           # Pad to max_length
            truncation=True,                # Truncate if too long
            return_attention_mask=True,
            return_tensors='pt'
        )
        
        result = {
            'input_ids': encoding['input_ids'].flatten(),
            'attention_mask': encoding['attention_mask'].flatten(),
        }
        
        if self.labels is not None:
            result['labels'] = torch.tensor(self.labels[idx], dtype=torch.long)
        
        return result


def create_data_loaders(
    train_df: pd.DataFrame,
    test_df: pd.DataFrame,
    tokenizer: BertTokenizer,
    batch_size: int = 16,
    max_length: int = 256
) -> tuple:
    """
    Create train and test DataLoaders.
    
    Returns:
        train_loader, test_loader
    """
    train_dataset = SentimentDataset(
        texts=train_df['text'].tolist(),
        labels=train_df['label'].tolist(),
        tokenizer=tokenizer,
        max_length=max_length
    )
    
    test_dataset = SentimentDataset(
        texts=test_df['text'].tolist(),
        labels=test_df['label'].tolist(),
        tokenizer=tokenizer,
        max_length=max_length
    )
    
    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=2
    )
    
    test_loader = DataLoader(
        test_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=2
    )
    
    print(f"Train batches: {len(train_loader)}")
    print(f"Test batches: {len(test_loader)}")
    
    return train_loader, test_loader
```

---

## 📦 Part 3: Model Definition

```python
"""
BERT-based sentiment classifier.
"""

import torch
import torch.nn as nn
from transformers import BertModel, BertConfig

class BertSentimentClassifier(nn.Module):
    """
    BERT with classification head for sentiment analysis.
    
    Architecture:
        BERT → [CLS] embedding → Dropout → Linear → Softmax
    
    Why [CLS]?
        The [CLS] token is designed to aggregate sequence-level information.
        After passing through BERT, it contains a summary of the entire text.
    """
    
    def __init__(
        self,
        num_classes: int = 2,
        bert_model_name: str = 'bert-base-uncased',
        dropout_prob: float = 0.1,
        freeze_bert: bool = False
    ):
        """
        Args:
            num_classes: Number of sentiment classes
            bert_model_name: Pre-trained BERT model name
            dropout_prob: Dropout probability
            freeze_bert: Whether to freeze BERT weights
        """
        super().__init__()
        
        # Load pre-trained BERT
        self.bert = BertModel.from_pretrained(bert_model_name)
        
        # Optionally freeze BERT (for faster training or limited data)
        if freeze_bert:
            for param in self.bert.parameters():
                param.requires_grad = False
        
        # Classification head
        self.dropout = nn.Dropout(dropout_prob)
        self.classifier = nn.Linear(self.bert.config.hidden_size, num_classes)
    
    def forward(
        self,
        input_ids: torch.Tensor,
        attention_mask: torch.Tensor
    ) -> torch.Tensor:
        """
        Forward pass.
        
        Args:
            input_ids: Token IDs (batch, seq_len)
            attention_mask: Attention mask (batch, seq_len)
        
        Returns:
            logits: Classification logits (batch, num_classes)
        """
        # Get BERT outputs
        outputs = self.bert(
            input_ids=input_ids,
            attention_mask=attention_mask
        )
        
        # Use [CLS] token embedding (first token)
        cls_embedding = outputs.last_hidden_state[:, 0, :]
        
        # Classification
        cls_embedding = self.dropout(cls_embedding)
        logits = self.classifier(cls_embedding)
        
        return logits
    
    def predict_proba(
        self,
        input_ids: torch.Tensor,
        attention_mask: torch.Tensor
    ) -> torch.Tensor:
        """Get prediction probabilities."""
        logits = self.forward(input_ids, attention_mask)
        return torch.softmax(logits, dim=-1)


class BertSentimentClassifierWithPooling(nn.Module):
    """
    Alternative: Use mean pooling instead of [CLS].
    
    Sometimes mean pooling works better than [CLS] for certain tasks.
    """
    
    def __init__(
        self,
        num_classes: int = 2,
        bert_model_name: str = 'bert-base-uncased',
        dropout_prob: float = 0.1
    ):
        super().__init__()
        
        self.bert = BertModel.from_pretrained(bert_model_name)
        self.dropout = nn.Dropout(dropout_prob)
        self.classifier = nn.Linear(self.bert.config.hidden_size, num_classes)
    
    def mean_pooling(
        self,
        token_embeddings: torch.Tensor,
        attention_mask: torch.Tensor
    ) -> torch.Tensor:
        """
        Mean pooling of token embeddings (excluding padding).
        """
        # Expand attention mask to match embedding dimensions
        mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size())
        
        # Sum embeddings for non-padded tokens
        sum_embeddings = torch.sum(token_embeddings * mask_expanded, dim=1)
        
        # Count non-padded tokens
        sum_mask = mask_expanded.sum(dim=1).clamp(min=1e-9)
        
        return sum_embeddings / sum_mask
    
    def forward(
        self,
        input_ids: torch.Tensor,
        attention_mask: torch.Tensor
    ) -> torch.Tensor:
        outputs = self.bert(
            input_ids=input_ids,
            attention_mask=attention_mask
        )
        
        # Mean pooling instead of [CLS]
        pooled = self.mean_pooling(outputs.last_hidden_state, attention_mask)
        
        pooled = self.dropout(pooled)
        logits = self.classifier(pooled)
        
        return logits
```

---

## 📦 Part 4: Training

```python
"""
Complete training script for sentiment analysis.
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from transformers import BertTokenizer, get_linear_schedule_with_warmup
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix
import numpy as np
from tqdm import tqdm
import matplotlib.pyplot as plt
import seaborn as sns
from typing import Dict, List
import time

# ============================================
# TRAINING FUNCTIONS
# ============================================

def train_epoch(
    model: nn.Module,
    data_loader: DataLoader,
    optimizer: optim.Optimizer,
    scheduler,
    device: torch.device,
    criterion: nn.Module
) -> Dict[str, float]:
    """
    Train for one epoch.
    
    Returns:
        Dictionary with 'loss' and 'accuracy'
    """
    model.train()
    total_loss = 0
    all_preds = []
    all_labels = []
    
    progress_bar = tqdm(data_loader, desc="Training")
    
    for batch in progress_bar:
        # Move to device
        input_ids = batch['input_ids'].to(device)
        attention_mask = batch['attention_mask'].to(device)
        labels = batch['labels'].to(device)
        
        # Forward pass
        optimizer.zero_grad()
        logits = model(input_ids, attention_mask)
        loss = criterion(logits, labels)
        
        # Backward pass
        loss.backward()
        
        # Gradient clipping
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        
        # Update weights
        optimizer.step()
        scheduler.step()
        
        # Track metrics
        total_loss += loss.item()
        preds = torch.argmax(logits, dim=1)
        all_preds.extend(preds.cpu().numpy())
        all_labels.extend(labels.cpu().numpy())
        
        # Update progress bar
        progress_bar.set_postfix({'loss': loss.item()})
    
    avg_loss = total_loss / len(data_loader)
    accuracy = accuracy_score(all_labels, all_preds)
    
    return {'loss': avg_loss, 'accuracy': accuracy}


def evaluate(
    model: nn.Module,
    data_loader: DataLoader,
    device: torch.device,
    criterion: nn.Module
) -> Dict[str, float]:
    """
    Evaluate the model.
    
    Returns:
        Dictionary with loss, accuracy, precision, recall, f1
    """
    model.eval()
    total_loss = 0
    all_preds = []
    all_labels = []
    
    with torch.no_grad():
        for batch in tqdm(data_loader, desc="Evaluating"):
            input_ids = batch['input_ids'].to(device)
            attention_mask = batch['attention_mask'].to(device)
            labels = batch['labels'].to(device)
            
            logits = model(input_ids, attention_mask)
            loss = criterion(logits, labels)
            
            total_loss += loss.item()
            preds = torch.argmax(logits, dim=1)
            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())
    
    avg_loss = total_loss / len(data_loader)
    accuracy = accuracy_score(all_labels, all_preds)
    precision, recall, f1, _ = precision_recall_fscore_support(
        all_labels, all_preds, average='weighted'
    )
    
    return {
        'loss': avg_loss,
        'accuracy': accuracy,
        'precision': precision,
        'recall': recall,
        'f1': f1,
        'predictions': all_preds,
        'labels': all_labels
    }


# ============================================
# MAIN TRAINING FUNCTION
# ============================================

def train_model(
    train_loader: DataLoader,
    test_loader: DataLoader,
    config: Dict
) -> tuple:
    """
    Complete training pipeline.
    
    Args:
        train_loader: Training DataLoader
        test_loader: Test DataLoader
        config: Training configuration dictionary
    
    Returns:
        model, history
    """
    print("\n" + "="*60)
    print("TRAINING BERT SENTIMENT CLASSIFIER")
    print("="*60)
    
    # Device
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"\nUsing device: {device}")
    
    # Model
    model = BertSentimentClassifier(
        num_classes=config['num_classes'],
        bert_model_name=config['bert_model'],
        dropout_prob=config['dropout'],
        freeze_bert=config.get('freeze_bert', False)
    ).to(device)
    
    # Count parameters
    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"Total parameters: {total_params:,}")
    print(f"Trainable parameters: {trainable_params:,}")
    
    # Loss function
    criterion = nn.CrossEntropyLoss()
    
    # Optimizer (AdamW with weight decay)
    optimizer = optim.AdamW(
        model.parameters(),
        lr=config['learning_rate'],
        eps=1e-8,
        weight_decay=0.01
    )
    
    # Learning rate scheduler with warmup
    total_steps = len(train_loader) * config['epochs']
    warmup_steps = int(total_steps * 0.1)
    
    scheduler = get_linear_schedule_with_warmup(
        optimizer,
        num_warmup_steps=warmup_steps,
        num_training_steps=total_steps
    )
    
    # Training history
    history = {
        'train_loss': [],
        'train_acc': [],
        'val_loss': [],
        'val_acc': []
    }
    
    best_val_acc = 0
    start_time = time.time()
    
    # Training loop
    for epoch in range(config['epochs']):
        print(f"\n{'='*60}")
        print(f"Epoch {epoch + 1}/{config['epochs']}")
        print('='*60)
        
        # Train
        train_metrics = train_epoch(
            model, train_loader, optimizer, scheduler, device, criterion
        )
        
        # Evaluate
        val_metrics = evaluate(model, test_loader, device, criterion)
        
        # Record history
        history['train_loss'].append(train_metrics['loss'])
        history['train_acc'].append(train_metrics['accuracy'])
        history['val_loss'].append(val_metrics['loss'])
        history['val_acc'].append(val_metrics['accuracy'])
        
        # Print metrics
        print(f"\nTrain Loss: {train_metrics['loss']:.4f} | Train Acc: {train_metrics['accuracy']:.4f}")
        print(f"Val Loss:   {val_metrics['loss']:.4f} | Val Acc:   {val_metrics['accuracy']:.4f}")
        print(f"Val F1:     {val_metrics['f1']:.4f}")
        
        # Save best model
        if val_metrics['accuracy'] > best_val_acc:
            best_val_acc = val_metrics['accuracy']
            torch.save(model.state_dict(), 'models/best_model.pt')
            print("✓ Saved best model!")
    
    # Training summary
    elapsed_time = time.time() - start_time
    print(f"\n{'='*60}")
    print("TRAINING COMPLETE")
    print('='*60)
    print(f"Time elapsed: {elapsed_time/60:.2f} minutes")
    print(f"Best validation accuracy: {best_val_acc:.4f}")
    
    return model, history


# ============================================
# VISUALIZATION
# ============================================

def plot_training_history(history: Dict):
    """Plot training curves."""
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    
    # Loss
    axes[0].plot(history['train_loss'], label='Train', marker='o')
    axes[0].plot(history['val_loss'], label='Validation', marker='o')
    axes[0].set_xlabel('Epoch')
    axes[0].set_ylabel('Loss')
    axes[0].set_title('Training and Validation Loss')
    axes[0].legend()
    axes[0].grid(True)
    
    # Accuracy
    axes[1].plot(history['train_acc'], label='Train', marker='o')
    axes[1].plot(history['val_acc'], label='Validation', marker='o')
    axes[1].set_xlabel('Epoch')
    axes[1].set_ylabel('Accuracy')
    axes[1].set_title('Training and Validation Accuracy')
    axes[1].legend()
    axes[1].grid(True)
    
    plt.tight_layout()
    plt.savefig('training_history.png', dpi=150)
    plt.show()


def plot_confusion_matrix(labels: List, predictions: List, class_names: List[str]):
    """Plot confusion matrix."""
    cm = confusion_matrix(labels, predictions)
    
    plt.figure(figsize=(8, 6))
    sns.heatmap(
        cm,
        annot=True,
        fmt='d',
        cmap='Blues',
        xticklabels=class_names,
        yticklabels=class_names
    )
    plt.xlabel('Predicted')
    plt.ylabel('Actual')
    plt.title('Confusion Matrix')
    plt.tight_layout()
    plt.savefig('confusion_matrix.png', dpi=150)
    plt.show()


# ============================================
# MAIN EXECUTION
# ============================================

def main():
    """Run complete training pipeline."""
    
    # Configuration
    config = {
        'bert_model': 'bert-base-uncased',
        'num_classes': 2,
        'max_length': 256,
        'batch_size': 16,
        'epochs': 3,
        'learning_rate': 2e-5,
        'dropout': 0.1,
        'freeze_bert': False
    }
    
    print("Configuration:")
    for key, value in config.items():
        print(f"  {key}: {value}")
    
    # Load tokenizer
    print("\nLoading tokenizer...")
    tokenizer = BertTokenizer.from_pretrained(config['bert_model'])
    
    # Load data
    print("\nLoading data...")
    train_df, test_df = load_imdb_dataset()
    train_df = preprocess_dataset(train_df)
    test_df = preprocess_dataset(test_df)
    
    # For faster experimentation, use subset
    # Remove these lines for full training
    train_df = train_df.sample(n=5000, random_state=42)
    test_df = test_df.sample(n=1000, random_state=42)
    
    # Create data loaders
    train_loader, test_loader = create_data_loaders(
        train_df, test_df, tokenizer,
        batch_size=config['batch_size'],
        max_length=config['max_length']
    )
    
    # Train
    model, history = train_model(train_loader, test_loader, config)
    
    # Visualize
    plot_training_history(history)
    
    # Final evaluation
    print("\nFinal Evaluation...")
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    criterion = nn.CrossEntropyLoss()
    final_metrics = evaluate(model, test_loader, device, criterion)
    
    print(f"\nFinal Results:")
    print(f"  Accuracy:  {final_metrics['accuracy']:.4f}")
    print(f"  Precision: {final_metrics['precision']:.4f}")
    print(f"  Recall:    {final_metrics['recall']:.4f}")
    print(f"  F1 Score:  {final_metrics['f1']:.4f}")
    
    # Confusion matrix
    plot_confusion_matrix(
        final_metrics['labels'],
        final_metrics['predictions'],
        ['Negative', 'Positive']
    )
    
    return model


if __name__ == "__main__":
    model = main()
```

---

## 📦 Part 5: Inference

```python
"""
Inference script for sentiment analysis.
"""

import torch
from transformers import BertTokenizer
from typing import List, Dict

class SentimentPredictor:
    """
    Production-ready sentiment predictor.
    
    Usage:
        predictor = SentimentPredictor('models/best_model.pt')
        result = predictor.predict("This movie was amazing!")
        print(result)
        # {'sentiment': 'Positive', 'confidence': 0.95, 'probabilities': {...}}
    """
    
    def __init__(
        self,
        model_path: str,
        bert_model_name: str = 'bert-base-uncased',
        device: str = None
    ):
        """
        Initialize predictor.
        
        Args:
            model_path: Path to saved model weights
            bert_model_name: BERT model name
            device: 'cuda' or 'cpu'
        """
        # Device
        if device:
            self.device = torch.device(device)
        else:
            self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Tokenizer
        self.tokenizer = BertTokenizer.from_pretrained(bert_model_name)
        
        # Model
        self.model = BertSentimentClassifier(
            num_classes=2,
            bert_model_name=bert_model_name
        )
        self.model.load_state_dict(torch.load(model_path, map_location=self.device))
        self.model.to(self.device)
        self.model.eval()
        
        # Class names
        self.class_names = ['Negative', 'Positive']
        
        print(f"Model loaded on {self.device}")
    
    def predict(self, text: str, max_length: int = 256) -> Dict:
        """
        Predict sentiment for a single text.
        
        Args:
            text: Input text
            max_length: Maximum sequence length
        
        Returns:
            Dictionary with sentiment, confidence, and probabilities
        """
        # Tokenize
        encoding = self.tokenizer(
            text,
            add_special_tokens=True,
            max_length=max_length,
            padding='max_length',
            truncation=True,
            return_tensors='pt'
        )
        
        input_ids = encoding['input_ids'].to(self.device)
        attention_mask = encoding['attention_mask'].to(self.device)
        
        # Predict
        with torch.no_grad():
            logits = self.model(input_ids, attention_mask)
            probs = torch.softmax(logits, dim=-1)
            pred_idx = torch.argmax(probs, dim=-1).item()
            confidence = probs[0, pred_idx].item()
        
        return {
            'text': text[:100] + '...' if len(text) > 100 else text,
            'sentiment': self.class_names[pred_idx],
            'confidence': round(confidence, 4),
            'probabilities': {
                name: round(probs[0, i].item(), 4)
                for i, name in enumerate(self.class_names)
            }
        }
    
    def predict_batch(self, texts: List[str], max_length: int = 256) -> List[Dict]:
        """
        Predict sentiment for multiple texts.
        """
        return [self.predict(text, max_length) for text in texts]


# ============================================
# DEMO INFERENCE
# ============================================

def demo_inference():
    """Demonstrate inference on sample texts."""
    
    # Sample texts
    test_texts = [
        "This movie was absolutely fantastic! The acting was superb and the story was gripping.",
        "Terrible film. I want my two hours back. Complete waste of time.",
        "It was okay. Not great, not terrible. Just average.",
        "I loved every minute of this masterpiece! A must-watch for everyone!",
        "Boring, predictable, and poorly acted. One of the worst movies I've seen.",
        "The cinematography was beautiful, but the plot was confusing.",
        "An instant classic! This will be remembered for generations.",
        "I fell asleep halfway through. That's how exciting it was. Not."
    ]
    
    print("="*60)
    print("SENTIMENT ANALYSIS DEMO")
    print("="*60)
    
    # Load predictor
    try:
        predictor = SentimentPredictor('models/best_model.pt')
    except:
        print("Model not found. Using mock predictions for demo.")
        # Mock predictions if model doesn't exist
        for text in test_texts:
            print(f"\nText: {text[:60]}...")
            print("Sentiment: [Model not loaded - run training first]")
        return
    
    # Predict
    for text in test_texts:
        result = predictor.predict(text)
        
        print(f"\nText: {result['text']}")
        print(f"Sentiment: {result['sentiment']} (confidence: {result['confidence']:.2%})")
        print(f"Probabilities: Negative={result['probabilities']['Negative']:.2%}, "
              f"Positive={result['probabilities']['Positive']:.2%}")


if __name__ == "__main__":
    demo_inference()
```

---

## 📦 Part 6: API Deployment (FastAPI)

```python
"""
FastAPI deployment for sentiment analysis.
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import uvicorn

app = FastAPI(
    title="Sentiment Analysis API",
    description="BERT-based sentiment analysis service",
    version="1.0.0"
)

# Load model on startup
predictor = None

@app.on_event("startup")
async def load_model():
    global predictor
    try:
        predictor = SentimentPredictor('models/best_model.pt')
    except Exception as e:
        print(f"Warning: Could not load model: {e}")


# Request/Response models
class TextRequest(BaseModel):
    text: str
    
    class Config:
        json_schema_extra = {
            "example": {"text": "This movie was amazing!"}
        }

class BatchRequest(BaseModel):
    texts: List[str]

class SentimentResponse(BaseModel):
    text: str
    sentiment: str
    confidence: float
    probabilities: dict


# Endpoints
@app.get("/")
async def root():
    return {"message": "Sentiment Analysis API", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "healthy", "model_loaded": predictor is not None}


@app.post("/predict", response_model=SentimentResponse)
async def predict_sentiment(request: TextRequest):
    """Predict sentiment for a single text."""
    if predictor is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    result = predictor.predict(request.text)
    return result


@app.post("/predict/batch")
async def predict_batch(request: BatchRequest):
    """Predict sentiment for multiple texts."""
    if predictor is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    results = predictor.predict_batch(request.texts)
    return {"predictions": results}


# Run the API
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

# Usage:
# curl -X POST "http://localhost:8000/predict" \
#      -H "Content-Type: application/json" \
#      -d '{"text": "This movie was fantastic!"}'
```

---

## 📝 Homework

### Easy
1. **Run the training script** and observe the training curves
2. **Test inference** on your own example texts
3. **Experiment with different max_length** values

### Medium
4. **Add neutral class:** Convert to 3-class classification
5. **Implement error analysis:** Find examples where model fails and analyze why
6. **Add model checkpointing** to save best model during training

### Hard
7. **Implement cross-validation** for more robust evaluation
8. **Build Streamlit demo app** for interactive testing
9. **Deploy on AWS/GCP** with auto-scaling

---

## ⚠️ Common Mistakes

### 1. Not Using Gradient Clipping
```python
# Without clipping, gradients can explode
optimizer.step()

# With clipping (recommended)
torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
optimizer.step()
```

### 2. Wrong Learning Rate
```python
# Too high - training diverges
lr = 1e-3

# Good for BERT fine-tuning
lr = 2e-5 to 5e-5
```

### 3. Not Using Warmup
```python
# Without warmup - unstable early training
scheduler = LinearLR(optimizer)

# With warmup - stable training
scheduler = get_linear_schedule_with_warmup(
    optimizer,
    num_warmup_steps=warmup_steps,  # ~10% of total
    num_training_steps=total_steps
)
```

---

## 🎤 Interview Questions

**Q: Why use [CLS] token for classification?**
A: The [CLS] token is specifically designed during BERT pre-training (NSP task) to capture sentence-level information. After passing through BERT layers, it aggregates information from all tokens via self-attention.

**Q: How would you handle class imbalance in sentiment data?**
A: Options include:
1. Weighted loss function (higher weight for minority class)
2. Oversampling minority class
3. Undersampling majority class
4. Data augmentation for minority class
5. Focal loss to focus on hard examples

**Q: How would you improve the model further?**
A: 
1. Use RoBERTa or DeBERTa (better than BERT)
2. Ensemble multiple models
3. Domain-specific pre-training
4. Data augmentation (back-translation, synonym replacement)
5. Add features like sentiment lexicons

---

## 🔗 Next Steps

**➡️ 07-Interview-QA.md** - Complete interview preparation with 50+ questions covering all Week 3 topics!
