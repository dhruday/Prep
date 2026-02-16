# 📘 Sentiment Analysis Project - End-to-End Implementation

## 🎯 Project Overview

### What We're Building

A complete **Sentiment Analysis System** that can:
- Classify text as Positive, Negative, or Neutral
- Use BERT for state-of-the-art accuracy
- Include data preprocessing, training, evaluation
- Deploy with a simple API

### Real-World Applications

```
┌─────────────────────────────────────────────────────────────────┐
│              SENTIMENT ANALYSIS USE CASES                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📱 Social Media Monitoring                                    │
│     "Tracking brand sentiment on Twitter"                      │
│                                                                 │
│  ⭐ Review Analysis                                             │
│     "Analyzing product reviews on e-commerce"                  │
│                                                                 │
│  📞 Customer Support                                            │
│     "Detecting frustrated customers in chat"                   │
│                                                                 │
│  📈 Market Research                                             │
│     "Understanding public opinion on topics"                   │
│                                                                 │
│  📰 News Analysis                                               │
│     "Determining article sentiment"                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 💻 Project Implementation

### Step 1: Setup and Imports

```python
# ============================================
# IMPORTS
# ============================================
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader, random_split
from transformers import (
    BertTokenizer, 
    BertForSequenceClassification,
    AdamW,
    get_linear_schedule_with_warmup
)
import numpy as np
import pandas as pd
from sklearn.metrics import (
    classification_report, 
    confusion_matrix, 
    accuracy_score,
    f1_score
)
import matplotlib.pyplot as plt
import seaborn as sns
from tqdm import tqdm
import warnings
warnings.filterwarnings('ignore')

# Set seeds for reproducibility
SEED = 42
torch.manual_seed(SEED)
np.random.seed(SEED)

# Device configuration
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Using device: {device}")

# Hyperparameters
MAX_LEN = 128
BATCH_SIZE = 16
EPOCHS = 4
LEARNING_RATE = 2e-5
WARMUP_RATIO = 0.1
```

### Step 2: Data Preparation

```python
# ============================================
# DATASET CLASS
# ============================================

class SentimentDataset(Dataset):
    """
    Custom dataset for sentiment analysis.
    
    Handles:
    - Text tokenization with BERT tokenizer
    - Padding and truncation
    - Attention masks for padding
    """
    
    def __init__(
        self, 
        texts: list, 
        labels: list, 
        tokenizer: BertTokenizer, 
        max_len: int = 128
    ):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_len = max_len
    
    def __len__(self):
        return len(self.texts)
    
    def __getitem__(self, idx):
        text = str(self.texts[idx])
        label = self.labels[idx]
        
        # Tokenize text
        encoding = self.tokenizer.encode_plus(
            text,
            add_special_tokens=True,      # Add [CLS] and [SEP]
            max_length=self.max_len,
            padding='max_length',          # Pad to max_length
            truncation=True,               # Truncate if longer
            return_attention_mask=True,    # Return attention mask
            return_tensors='pt'            # Return PyTorch tensors
        )
        
        return {
            'text': text,
            'input_ids': encoding['input_ids'].flatten(),
            'attention_mask': encoding['attention_mask'].flatten(),
            'labels': torch.tensor(label, dtype=torch.long)
        }


# ============================================
# SAMPLE DATA (Replace with your dataset)
# ============================================

# For demonstration, we'll create a sample dataset
# In practice, use IMDB, Yelp, SST-2, or your own data

sample_texts = [
    # Positive examples
    "I absolutely loved this movie! The acting was superb and the plot was engaging.",
    "Best purchase I've ever made. Highly recommend to everyone!",
    "The service was excellent and the food was delicious. Will definitely come back!",
    "This product exceeded my expectations. Amazing quality for the price.",
    "What a fantastic experience! The team was professional and friendly.",
    "I'm so happy with my decision. This is exactly what I needed.",
    "Outstanding performance! The battery life is incredible.",
    "Great customer support. They resolved my issue within minutes.",
    "The vacation was perfect. Beautiful scenery and great weather.",
    "Love the new features! The update made everything so much better.",
    
    # Negative examples
    "Terrible experience. Would not recommend to anyone.",
    "Complete waste of money. The product broke after one day.",
    "The worst customer service I've ever encountered.",
    "Very disappointed with the quality. It looked nothing like the pictures.",
    "Horrible taste. I couldn't even finish my meal.",
    "The movie was boring and predictable. Don't waste your time.",
    "I regret buying this. It doesn't work as advertised.",
    "Staff was rude and unhelpful. Never going back.",
    "The app crashes constantly. Extremely frustrating.",
    "Poor quality materials. Started falling apart immediately.",
    
    # Neutral examples
    "The product arrived on time. It works as expected.",
    "It's okay. Nothing special but gets the job done.",
    "Average experience. Some good points, some bad.",
    "The movie was decent. Not great, not terrible.",
    "Standard service. Nothing to complain about.",
    "It's fine for the price. You get what you pay for.",
    "The hotel was clean but the location wasn't ideal.",
    "Mixed feelings about this purchase. Has pros and cons.",
    "It's acceptable. I've seen better but also worse.",
    "Regular quality. Met my basic expectations."
]

sample_labels = [
    # 0 = Negative, 1 = Neutral, 2 = Positive
    2, 2, 2, 2, 2, 2, 2, 2, 2, 2,  # Positive
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  # Negative
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1   # Neutral
]

# Label mapping
label_names = ['Negative', 'Neutral', 'Positive']
num_classes = len(label_names)

print(f"Dataset size: {len(sample_texts)}")
print(f"Number of classes: {num_classes}")
print(f"Labels: {label_names}")


# ============================================
# CREATE DATA LOADERS
# ============================================

# Load BERT tokenizer
MODEL_NAME = 'bert-base-uncased'
tokenizer = BertTokenizer.from_pretrained(MODEL_NAME)

# Create dataset
dataset = SentimentDataset(sample_texts, sample_labels, tokenizer, MAX_LEN)

# Split into train/validation/test (70/15/15)
total_size = len(dataset)
train_size = int(0.7 * total_size)
val_size = int(0.15 * total_size)
test_size = total_size - train_size - val_size

train_dataset, val_dataset, test_dataset = random_split(
    dataset, [train_size, val_size, test_size],
    generator=torch.Generator().manual_seed(SEED)
)

print(f"\nTrain size: {len(train_dataset)}")
print(f"Validation size: {len(val_dataset)}")
print(f"Test size: {len(test_dataset)}")

# Create data loaders
train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE)
test_loader = DataLoader(test_dataset, batch_size=BATCH_SIZE)
```

### Step 3: Model Definition

```python
# ============================================
# BERT SENTIMENT CLASSIFIER
# ============================================

class BertSentimentClassifier(nn.Module):
    """
    BERT-based sentiment classifier.
    
    Architecture:
    - Pre-trained BERT encoder
    - Dropout for regularization
    - Linear classification head
    
    The [CLS] token embedding is used for classification.
    """
    
    def __init__(
        self, 
        model_name: str = 'bert-base-uncased', 
        num_classes: int = 3,
        dropout: float = 0.3
    ):
        super().__init__()
        
        # Load pre-trained BERT
        self.bert = BertForSequenceClassification.from_pretrained(
            model_name,
            num_labels=num_classes,
            output_attentions=True,      # For visualization
            output_hidden_states=False
        )
        
    def forward(self, input_ids, attention_mask, labels=None):
        """
        Forward pass.
        
        Args:
            input_ids: Token indices (batch, seq_len)
            attention_mask: Attention mask (batch, seq_len)
            labels: Optional labels for computing loss
        
        Returns:
            outputs: BertForSequenceClassification output
        """
        outputs = self.bert(
            input_ids=input_ids,
            attention_mask=attention_mask,
            labels=labels
        )
        
        return outputs


# Alternative: Custom BERT classifier with more control
class CustomBertClassifier(nn.Module):
    """
    Custom BERT classifier with additional layers.
    
    Useful when you want:
    - Different pooling strategies
    - Additional hidden layers
    - Custom architectures
    """
    
    def __init__(
        self,
        model_name: str = 'bert-base-uncased',
        num_classes: int = 3,
        dropout: float = 0.3,
        hidden_size: int = 768
    ):
        super().__init__()
        
        from transformers import BertModel
        
        self.bert = BertModel.from_pretrained(model_name)
        
        # Classification head
        self.classifier = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(hidden_size, 256),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(256, num_classes)
        )
    
    def forward(self, input_ids, attention_mask):
        # Get BERT outputs
        outputs = self.bert(
            input_ids=input_ids,
            attention_mask=attention_mask
        )
        
        # Use [CLS] token embedding (first token)
        cls_embedding = outputs.last_hidden_state[:, 0, :]
        
        # Classify
        logits = self.classifier(cls_embedding)
        
        return logits


# ============================================
# INITIALIZE MODEL
# ============================================

# Using HuggingFace's built-in classifier
model = BertSentimentClassifier(MODEL_NAME, num_classes).to(device)

# Count parameters
total_params = sum(p.numel() for p in model.parameters())
trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
print(f"\nTotal parameters: {total_params:,}")
print(f"Trainable parameters: {trainable_params:,}")
```

### Step 4: Training Setup

```python
# ============================================
# TRAINING CONFIGURATION
# ============================================

# Optimizer
optimizer = AdamW(
    model.parameters(),
    lr=LEARNING_RATE,
    eps=1e-8,
    weight_decay=0.01
)

# Total training steps
total_steps = len(train_loader) * EPOCHS

# Learning rate scheduler with warmup
warmup_steps = int(total_steps * WARMUP_RATIO)
scheduler = get_linear_schedule_with_warmup(
    optimizer,
    num_warmup_steps=warmup_steps,
    num_training_steps=total_steps
)

# Loss function
criterion = nn.CrossEntropyLoss()

print(f"\nTraining Configuration:")
print(f"  Epochs: {EPOCHS}")
print(f"  Total steps: {total_steps}")
print(f"  Warmup steps: {warmup_steps}")
print(f"  Learning rate: {LEARNING_RATE}")


# ============================================
# TRAINING FUNCTIONS
# ============================================

def train_epoch(model, data_loader, optimizer, scheduler, device):
    """Train for one epoch"""
    model.train()
    total_loss = 0
    predictions = []
    actual_labels = []
    
    progress_bar = tqdm(data_loader, desc="Training")
    
    for batch in progress_bar:
        # Move to device
        input_ids = batch['input_ids'].to(device)
        attention_mask = batch['attention_mask'].to(device)
        labels = batch['labels'].to(device)
        
        # Zero gradients
        optimizer.zero_grad()
        
        # Forward pass
        outputs = model(input_ids, attention_mask, labels)
        loss = outputs.loss
        
        # Backward pass
        loss.backward()
        
        # Gradient clipping
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        
        # Update weights
        optimizer.step()
        scheduler.step()
        
        # Track metrics
        total_loss += loss.item()
        
        logits = outputs.logits
        preds = torch.argmax(logits, dim=1)
        predictions.extend(preds.cpu().numpy())
        actual_labels.extend(labels.cpu().numpy())
        
        # Update progress bar
        progress_bar.set_postfix({'loss': loss.item()})
    
    avg_loss = total_loss / len(data_loader)
    accuracy = accuracy_score(actual_labels, predictions)
    
    return avg_loss, accuracy


def evaluate(model, data_loader, device):
    """Evaluate model on validation/test set"""
    model.eval()
    total_loss = 0
    predictions = []
    actual_labels = []
    
    with torch.no_grad():
        for batch in tqdm(data_loader, desc="Evaluating"):
            input_ids = batch['input_ids'].to(device)
            attention_mask = batch['attention_mask'].to(device)
            labels = batch['labels'].to(device)
            
            outputs = model(input_ids, attention_mask, labels)
            loss = outputs.loss
            
            total_loss += loss.item()
            
            logits = outputs.logits
            preds = torch.argmax(logits, dim=1)
            predictions.extend(preds.cpu().numpy())
            actual_labels.extend(labels.cpu().numpy())
    
    avg_loss = total_loss / len(data_loader)
    accuracy = accuracy_score(actual_labels, predictions)
    f1 = f1_score(actual_labels, predictions, average='weighted')
    
    return avg_loss, accuracy, f1, predictions, actual_labels
```

### Step 5: Training Loop

```python
# ============================================
# MAIN TRAINING LOOP
# ============================================

print("\n" + "=" * 50)
print("Starting Training")
print("=" * 50)

history = {
    'train_loss': [],
    'train_acc': [],
    'val_loss': [],
    'val_acc': [],
    'val_f1': []
}

best_val_acc = 0
best_model_state = None

for epoch in range(EPOCHS):
    print(f"\nEpoch {epoch + 1}/{EPOCHS}")
    print("-" * 30)
    
    # Train
    train_loss, train_acc = train_epoch(
        model, train_loader, optimizer, scheduler, device
    )
    
    # Validate
    val_loss, val_acc, val_f1, _, _ = evaluate(model, val_loader, device)
    
    # Log metrics
    history['train_loss'].append(train_loss)
    history['train_acc'].append(train_acc)
    history['val_loss'].append(val_loss)
    history['val_acc'].append(val_acc)
    history['val_f1'].append(val_f1)
    
    print(f"\nTrain Loss: {train_loss:.4f}, Train Acc: {train_acc:.4f}")
    print(f"Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.4f}, Val F1: {val_f1:.4f}")
    
    # Save best model
    if val_acc > best_val_acc:
        best_val_acc = val_acc
        best_model_state = model.state_dict().copy()
        print(f"New best model! Val Accuracy: {val_acc:.4f}")

# Load best model
if best_model_state:
    model.load_state_dict(best_model_state)
    print(f"\nLoaded best model with Val Accuracy: {best_val_acc:.4f}")
```

### Step 6: Evaluation and Visualization

```python
# ============================================
# EVALUATION ON TEST SET
# ============================================

print("\n" + "=" * 50)
print("Evaluating on Test Set")
print("=" * 50)

test_loss, test_acc, test_f1, test_preds, test_labels = evaluate(
    model, test_loader, device
)

print(f"\nTest Results:")
print(f"  Loss: {test_loss:.4f}")
print(f"  Accuracy: {test_acc:.4f}")
print(f"  F1 Score: {test_f1:.4f}")

# Classification Report
print("\nClassification Report:")
print(classification_report(test_labels, test_preds, target_names=label_names))


# ============================================
# VISUALIZATIONS
# ============================================

def plot_training_history(history):
    """Plot training and validation metrics"""
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    
    # Loss
    axes[0].plot(history['train_loss'], label='Train Loss', marker='o')
    axes[0].plot(history['val_loss'], label='Val Loss', marker='o')
    axes[0].set_xlabel('Epoch')
    axes[0].set_ylabel('Loss')
    axes[0].set_title('Training and Validation Loss')
    axes[0].legend()
    axes[0].grid(True)
    
    # Accuracy
    axes[1].plot(history['train_acc'], label='Train Accuracy', marker='o')
    axes[1].plot(history['val_acc'], label='Val Accuracy', marker='o')
    axes[1].set_xlabel('Epoch')
    axes[1].set_ylabel('Accuracy')
    axes[1].set_title('Training and Validation Accuracy')
    axes[1].legend()
    axes[1].grid(True)
    
    plt.tight_layout()
    plt.savefig('training_history.png', dpi=150)
    plt.close()
    print("Saved training_history.png")


def plot_confusion_matrix(y_true, y_pred, labels):
    """Plot confusion matrix"""
    cm = confusion_matrix(y_true, y_pred)
    
    plt.figure(figsize=(8, 6))
    sns.heatmap(
        cm, 
        annot=True, 
        fmt='d', 
        cmap='Blues',
        xticklabels=labels,
        yticklabels=labels
    )
    plt.xlabel('Predicted')
    plt.ylabel('Actual')
    plt.title('Confusion Matrix')
    plt.tight_layout()
    plt.savefig('confusion_matrix.png', dpi=150)
    plt.close()
    print("Saved confusion_matrix.png")


# Generate plots
plot_training_history(history)
plot_confusion_matrix(test_labels, test_preds, label_names)
```

### Step 7: Inference Pipeline

```python
# ============================================
# INFERENCE PIPELINE
# ============================================

class SentimentPredictor:
    """
    Production-ready sentiment prediction pipeline.
    
    Features:
    - Text preprocessing
    - Batch prediction support
    - Confidence scores
    - Attention visualization
    """
    
    def __init__(self, model, tokenizer, device, label_names, max_len=128):
        self.model = model
        self.tokenizer = tokenizer
        self.device = device
        self.label_names = label_names
        self.max_len = max_len
        
        # Set model to evaluation mode
        self.model.eval()
    
    def preprocess(self, text):
        """Preprocess text for prediction"""
        # Basic text cleaning
        text = str(text).strip()
        
        # Tokenize
        encoding = self.tokenizer.encode_plus(
            text,
            add_special_tokens=True,
            max_length=self.max_len,
            padding='max_length',
            truncation=True,
            return_attention_mask=True,
            return_tensors='pt'
        )
        
        return encoding
    
    def predict(self, text):
        """
        Predict sentiment for a single text.
        
        Args:
            text: Input text string
        
        Returns:
            dict: {
                'text': original text,
                'sentiment': predicted label,
                'confidence': prediction confidence,
                'probabilities': all class probabilities
            }
        """
        encoding = self.preprocess(text)
        
        input_ids = encoding['input_ids'].to(self.device)
        attention_mask = encoding['attention_mask'].to(self.device)
        
        with torch.no_grad():
            outputs = self.model(input_ids, attention_mask)
            logits = outputs.logits
            probs = torch.softmax(logits, dim=1)
            
            confidence, pred_idx = torch.max(probs, dim=1)
        
        return {
            'text': text,
            'sentiment': self.label_names[pred_idx.item()],
            'confidence': confidence.item(),
            'probabilities': {
                name: prob.item() 
                for name, prob in zip(self.label_names, probs[0])
            }
        }
    
    def predict_batch(self, texts):
        """Predict sentiment for multiple texts"""
        results = []
        for text in texts:
            result = self.predict(text)
            results.append(result)
        return results
    
    def get_attention_weights(self, text):
        """
        Get attention weights for visualization.
        
        Returns attention from last layer, averaged across heads.
        """
        encoding = self.preprocess(text)
        
        input_ids = encoding['input_ids'].to(self.device)
        attention_mask = encoding['attention_mask'].to(self.device)
        
        with torch.no_grad():
            outputs = self.model(input_ids, attention_mask)
            
            # Get attention from last layer
            # Shape: (batch, num_heads, seq_len, seq_len)
            attention = outputs.attentions[-1]
            
            # Average across heads
            attention = attention.mean(dim=1).squeeze(0)
            
            # Get attention to [CLS] token (first row)
            cls_attention = attention[0].cpu().numpy()
        
        # Get tokens
        tokens = self.tokenizer.convert_ids_to_tokens(input_ids[0])
        
        # Filter out padding
        num_tokens = attention_mask.sum().item()
        tokens = tokens[:num_tokens]
        cls_attention = cls_attention[:num_tokens]
        
        return tokens, cls_attention


# ============================================
# TEST INFERENCE
# ============================================

# Create predictor
predictor = SentimentPredictor(model, tokenizer, device, label_names)

# Test predictions
test_texts = [
    "This product is absolutely amazing! Best purchase ever!",
    "Terrible service, completely disappointed.",
    "It's okay, nothing special but works fine.",
    "I can't believe how good this is! Exceeded all expectations!",
    "Worst experience of my life. Never again."
]

print("\n" + "=" * 50)
print("Testing Inference Pipeline")
print("=" * 50)

for text in test_texts:
    result = predictor.predict(text)
    
    print(f"\nText: {result['text'][:50]}...")
    print(f"Sentiment: {result['sentiment']}")
    print(f"Confidence: {result['confidence']:.2%}")
    print(f"Probabilities: {result['probabilities']}")


# ============================================
# ATTENTION VISUALIZATION
# ============================================

def visualize_attention(tokens, attention_weights, title="Attention Visualization"):
    """Visualize attention weights for tokens"""
    
    # Normalize attention
    attention = attention_weights / attention_weights.sum()
    
    # Create figure
    fig, ax = plt.subplots(figsize=(12, 3))
    
    # Create heatmap
    im = ax.imshow(attention.reshape(1, -1), cmap='YlOrRd', aspect='auto')
    
    # Set labels
    ax.set_xticks(range(len(tokens)))
    ax.set_xticklabels(tokens, rotation=45, ha='right')
    ax.set_yticks([])
    
    # Add colorbar
    plt.colorbar(im, ax=ax, orientation='vertical', label='Attention Weight')
    
    plt.title(title)
    plt.tight_layout()
    plt.savefig('attention_visualization.png', dpi=150)
    plt.close()
    print("Saved attention_visualization.png")


# Visualize attention for a sample
sample_text = "This product is absolutely amazing! I love it!"
tokens, attention = predictor.get_attention_weights(sample_text)
visualize_attention(tokens, attention, f"Attention for: '{sample_text}'")
```

### Step 8: Model Saving and Loading

```python
# ============================================
# SAVE AND LOAD MODEL
# ============================================

def save_model(model, tokenizer, path='sentiment_model'):
    """Save model and tokenizer"""
    import os
    os.makedirs(path, exist_ok=True)
    
    # Save model
    model.bert.save_pretrained(path)
    
    # Save tokenizer
    tokenizer.save_pretrained(path)
    
    # Save config
    config = {
        'label_names': label_names,
        'max_len': MAX_LEN
    }
    torch.save(config, f'{path}/config.pt')
    
    print(f"Model saved to {path}/")


def load_model(path='sentiment_model', device='cpu'):
    """Load model and tokenizer"""
    # Load tokenizer
    tokenizer = BertTokenizer.from_pretrained(path)
    
    # Load config
    config = torch.load(f'{path}/config.pt')
    
    # Load model
    model = BertForSequenceClassification.from_pretrained(path)
    model.to(device)
    
    return model, tokenizer, config


# Save the trained model
save_model(model, tokenizer)

# Example of loading
# loaded_model, loaded_tokenizer, loaded_config = load_model('sentiment_model', device)
```

### Step 9: Simple API (Flask)

```python
# ============================================
# SIMPLE FLASK API
# ============================================

# Save this as app.py and run with: python app.py

"""
from flask import Flask, request, jsonify
from transformers import BertTokenizer, BertForSequenceClassification
import torch

app = Flask(__name__)

# Load model
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model_path = 'sentiment_model'

tokenizer = BertTokenizer.from_pretrained(model_path)
model = BertForSequenceClassification.from_pretrained(model_path)
model.to(device)
model.eval()

config = torch.load(f'{model_path}/config.pt')
label_names = config['label_names']
max_len = config['max_len']


def predict_sentiment(text):
    encoding = tokenizer.encode_plus(
        text,
        add_special_tokens=True,
        max_length=max_len,
        padding='max_length',
        truncation=True,
        return_attention_mask=True,
        return_tensors='pt'
    )
    
    input_ids = encoding['input_ids'].to(device)
    attention_mask = encoding['attention_mask'].to(device)
    
    with torch.no_grad():
        outputs = model(input_ids, attention_mask)
        probs = torch.softmax(outputs.logits, dim=1)
        confidence, pred_idx = torch.max(probs, dim=1)
    
    return {
        'sentiment': label_names[pred_idx.item()],
        'confidence': round(confidence.item(), 4),
        'probabilities': {
            name: round(prob.item(), 4)
            for name, prob in zip(label_names, probs[0])
        }
    }


@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    
    if 'text' not in data:
        return jsonify({'error': 'Missing text field'}), 400
    
    text = data['text']
    result = predict_sentiment(text)
    
    return jsonify(result)


@app.route('/predict_batch', methods=['POST'])
def predict_batch():
    data = request.get_json()
    
    if 'texts' not in data:
        return jsonify({'error': 'Missing texts field'}), 400
    
    texts = data['texts']
    results = [predict_sentiment(text) for text in texts]
    
    return jsonify({'results': results})


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
"""

print("\n" + "=" * 50)
print("Flask API code saved in comments above")
print("=" * 50)
print("\nTo use the API:")
print("1. Save the code as app.py")
print("2. Run: python app.py")
print("3. Make requests:")
print('   curl -X POST http://localhost:5000/predict \\')
print('     -H "Content-Type: application/json" \\')
print('     -d \'{"text": "This product is amazing!"}\'')
```

---

## 📊 Using Real Datasets

### IMDB Dataset Example

```python
# ============================================
# USING REAL DATASETS
# ============================================

# Option 1: HuggingFace Datasets
from datasets import load_dataset

# Load IMDB dataset
imdb = load_dataset('imdb')

print(f"Train size: {len(imdb['train'])}")
print(f"Test size: {len(imdb['test'])}")
print(f"Sample: {imdb['train'][0]}")

# Convert to our format
train_texts = imdb['train']['text']
train_labels = imdb['train']['label']  # 0 = negative, 1 = positive


# Option 2: SST-2 (Stanford Sentiment Treebank)
sst2 = load_dataset('glue', 'sst2')

print(f"\nSST-2 Train size: {len(sst2['train'])}")
print(f"Sample: {sst2['train'][0]}")


# Option 3: Custom CSV
"""
df = pd.read_csv('your_data.csv')
texts = df['text'].tolist()
labels = df['label'].tolist()
"""


# Option 4: Yelp Reviews
yelp = load_dataset('yelp_review_full')

print(f"\nYelp Train size: {len(yelp['train'])}")
print(f"Sample: {yelp['train'][0]}")
# Labels: 0-4 (1-5 stars)
```

---

## 📝 Homework

### Easy:
1. **Experiment:** Try different learning rates and compare results
2. **Visualize:** Create attention heatmaps for 10 different sentences
3. **Evaluate:** Calculate precision, recall, F1 for each class

### Intermediate:
4. **Data Augmentation:** Implement synonym replacement and back-translation
5. **Multi-task:** Add a second task (e.g., spam detection)
6. **Compare Models:** Try DistilBERT, RoBERTa, ALBERT

### Advanced:
7. **Deploy:** Create a Docker container with the Flask API
8. **Optimize:** Implement ONNX export for faster inference
9. **Multi-lingual:** Train on multiple languages using XLM-RoBERTa

---

## ⚠️ Common Mistakes

### 1. **Not Freezing Layers When Limited Data**
```python
# ❌ Wrong - overfitting with small dataset
model = BertForSequenceClassification.from_pretrained(MODEL_NAME)

# ✅ Correct - freeze BERT, only train classifier
for param in model.bert.base_model.parameters():
    param.requires_grad = False
```

### 2. **Wrong Learning Rate**
```python
# ❌ Wrong - too high for pre-trained models
lr = 1e-3

# ✅ Correct - much lower for fine-tuning
lr = 2e-5  # 2e-5 to 5e-5 typical
```

### 3. **Forgetting Gradient Clipping**
```python
# ❌ Wrong - gradients can explode
loss.backward()
optimizer.step()

# ✅ Correct - clip gradients
loss.backward()
torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
optimizer.step()
```

### 4. **Not Using Attention Mask**
```python
# ❌ Wrong - padding affects output
outputs = model(input_ids)

# ✅ Correct - mask padding tokens
outputs = model(input_ids, attention_mask=attention_mask)
```

---

## 🎤 Interview Questions

**Q1: Why use BERT for sentiment analysis instead of simpler models?**

**A:** BERT provides contextual embeddings that understand word meaning based on surrounding context. For example, "bank" in "river bank" vs "bank account" gets different representations. This leads to better accuracy, especially for nuanced sentiment.

**Q2: How would you handle imbalanced classes?**

**A:**
1. **Weighted Loss:** `CrossEntropyLoss(weight=class_weights)`
2. **Oversampling:** Duplicate minority class samples
3. **Undersampling:** Reduce majority class samples
4. **SMOTE:** Generate synthetic samples
5. **Focal Loss:** Focus on hard examples

**Q3: How would you deploy this model in production?**

**A:**
1. **Model Optimization:** Quantization, ONNX, TorchScript
2. **Serving:** FastAPI/Flask with async support
3. **Scaling:** Kubernetes, load balancing
4. **Monitoring:** Latency, accuracy drift, data distribution
5. **Caching:** Cache repeated predictions

---

## 🚀 Next Steps

Congratulations! You've built a complete sentiment analysis system. Continue with:
1. **Fine-tuning Techniques** - LoRA, QLoRA for efficient training
2. **Vector Databases & RAG** - Build retrieval-augmented systems
3. **Agentic AI** - Create AI agents that can take actions

**Key Takeaway:** This project combines everything you've learned - Transformers, BERT, training loops, evaluation, and deployment. These skills transfer directly to any NLP task!

---

## 📚 Additional Resources

**Datasets:**
- IMDB Movie Reviews
- SST-2 (Stanford Sentiment Treebank)
- Yelp Reviews
- Amazon Product Reviews
- Twitter Sentiment

**Papers:**
- "BERT: Pre-training of Deep Bidirectional Transformers"
- "A Comparison of Pre-trained Language Models for Sentiment Analysis"

**Tools:**
- HuggingFace Transformers
- HuggingFace Datasets
- Weights & Biases (experiment tracking)
- MLflow (model management)

---

**Remember:** Sentiment analysis is a foundational NLP task. Mastering it opens doors to more complex applications like aspect-based sentiment, emotion detection, and opinion mining!
