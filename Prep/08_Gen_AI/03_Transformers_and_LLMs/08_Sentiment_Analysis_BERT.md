# 🎯 Mini Project: Sentiment Analysis using BERT



## 📑 Table of Contents

- [**Project Overview:**](#project-overview)
- [**Part 1: Setup and Data Preparation**](#part-1-setup-and-data-preparation)
- [**Part 2: Build and Fine-Tune BERT**](#part-2-build-and-fine-tune-bert)
- [**Part 3: Evaluation and Analysis**](#part-3-evaluation-and-analysis)
- [**Part 4: Attention Visualization**](#part-4-attention-visualization)
- [**Part 5: Inference API**](#part-5-inference-api)
- [**Part 6: Production Deployment**](#part-6-production-deployment)
- [**Part 7: Final Analysis**](#part-7-final-analysis)
- [**🎉 Project Complete!**](#project-complete)

---

---

## **Project Overview:**

### **What You'll Build:**

A **production-ready sentiment classifier** using BERT:
- Fine-tune BERT on movie reviews (IMDB dataset)
- Achieve state-of-the-art accuracy
- Deploy as REST API
- Add real-time inference
- Visualize attention patterns

```javascript
const project_scope = {
  dataset: 'IMDB Movie Reviews (50k reviews)',
  task: 'Binary classification (Positive/Negative)',
  model: 'BERT-base-uncased (110M parameters)',
  goal: '>90% accuracy on test set',
  
  deliverables: [
    'Fine-tuned BERT model',
    'REST API for inference',
    'Attention visualization',
    'Performance analysis'
  ]
};
```

---

## **Part 1: Setup and Data Preparation**

### **1.1: Install Dependencies**

```bash
# Install required packages
pip install torch transformers datasets scikit-learn matplotlib seaborn flask
```

### **1.2: Load and Explore Dataset**

```python
import torch
from torch.utils.data import Dataset, DataLoader
from transformers import BertTokenizer, BertForSequenceClassification, AdamW
from datasets import load_dataset
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix

# Load IMDB dataset
print("Loading IMDB dataset...")
dataset = load_dataset('imdb')

print(f"Train samples: {len(dataset['train'])}")
print(f"Test samples: {len(dataset['test'])}")

# Explore data
print("\nSample positive review:")
print(dataset['train'][0]['text'][:200])
print(f"Label: {dataset['train'][0]['label']}")  # 1 = positive

print("\nSample negative review:")
neg_idx = [i for i, label in enumerate(dataset['train']['label']) if label == 0][0]
print(dataset['train'][neg_idx]['text'][:200])
print(f"Label: {dataset['train'][neg_idx]['label']}")  # 0 = negative

# Label distribution
labels = dataset['train']['label']
unique, counts = np.unique(labels, return_counts=True)
print(f"\nLabel distribution: {dict(zip(unique, counts))}")
# Output: {0: 12500, 1: 12500} - perfectly balanced!
```

### **1.3: Create Custom Dataset**

```python
class IMDbDataset(Dataset):
    """
    Custom Dataset for IMDB reviews
    """
    def __init__(self, texts, labels, tokenizer, max_len=512):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_len = max_len
    
    def __len__(self):
        return len(self.texts)
    
    def __getitem__(self, idx):
        text = str(self.texts[idx])
        label = self.labels[idx]
        
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
        
        return {
            'input_ids': encoding['input_ids'].flatten(),
            'attention_mask': encoding['attention_mask'].flatten(),
            'label': torch.tensor(label, dtype=torch.long)
        }


# Initialize tokenizer
tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')

# Prepare datasets
train_texts = dataset['train']['text']
train_labels = dataset['train']['label']
test_texts = dataset['test']['text']
test_labels = dataset['test']['label']

# Create validation split (10% of training data)
val_size = int(0.1 * len(train_texts))
train_texts, val_texts = train_texts[val_size:], train_texts[:val_size]
train_labels, val_labels = train_labels[val_size:], train_labels[:val_size]

print(f"\nDataset sizes:")
print(f"Train: {len(train_texts)}")
print(f"Val: {len(val_texts)}")
print(f"Test: {len(test_texts)}")

# Create datasets
train_dataset = IMDbDataset(train_texts, train_labels, tokenizer, max_len=256)
val_dataset = IMDbDataset(val_texts, val_labels, tokenizer, max_len=256)
test_dataset = IMDbDataset(test_texts, test_labels, tokenizer, max_len=256)

# Create dataloaders
batch_size = 16

train_loader = DataLoader(
    train_dataset,
    batch_size=batch_size,
    shuffle=True,
    num_workers=2
)

val_loader = DataLoader(
    val_dataset,
    batch_size=batch_size,
    num_workers=2
)

test_loader = DataLoader(
    test_dataset,
    batch_size=batch_size,
    num_workers=2
)

print(f"\nBatches per epoch: {len(train_loader)}")
```

---

## **Part 2: Build and Fine-Tune BERT**

### **2.1: Create BERT Classifier**

```python
class BERTSentimentClassifier(torch.nn.Module):
    """
    BERT-based sentiment classifier
    """
    def __init__(self, n_classes=2, dropout=0.3):
        super(BERTSentimentClassifier, self).__init__()
        
        # Load pre-trained BERT
        self.bert = BertForSequenceClassification.from_pretrained(
            'bert-base-uncased',
            num_labels=n_classes,
            output_attentions=True,  # For visualization
            output_hidden_states=False
        )
        
        # Optional: Add dropout for regularization
        self.dropout = torch.nn.Dropout(dropout)
    
    def forward(self, input_ids, attention_mask):
        """
        Forward pass
        
        Args:
            input_ids: [batch, seq_len]
            attention_mask: [batch, seq_len]
        
        Returns:
            logits: [batch, n_classes]
            attentions: Tuple of attention weights
        """
        outputs = self.bert(
            input_ids=input_ids,
            attention_mask=attention_mask
        )
        
        return outputs.logits, outputs.attentions


# Initialize model
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Using device: {device}")

model = BERTSentimentClassifier(n_classes=2)
model = model.to(device)

# Count parameters
total_params = sum(p.numel() for p in model.parameters())
trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)

print(f"\nTotal parameters: {total_params:,}")
print(f"Trainable parameters: {trainable_params:,}")
```

### **2.2: Training Configuration**

```python
from transformers import get_linear_schedule_with_warmup

# Training hyperparameters
config = {
    'epochs': 3,
    'learning_rate': 2e-5,
    'warmup_steps': 500,
    'max_grad_norm': 1.0,
    'weight_decay': 0.01
}

# Loss function
criterion = torch.nn.CrossEntropyLoss()

# Optimizer
optimizer = AdamW(
    model.parameters(),
    lr=config['learning_rate'],
    eps=1e-8,
    weight_decay=config['weight_decay']
)

# Learning rate scheduler
total_steps = len(train_loader) * config['epochs']
scheduler = get_linear_schedule_with_warmup(
    optimizer,
    num_warmup_steps=config['warmup_steps'],
    num_training_steps=total_steps
)

print(f"Total training steps: {total_steps}")
print(f"Warmup steps: {config['warmup_steps']}")
```

### **2.3: Training Loop**

```python
def train_epoch(model, dataloader, criterion, optimizer, scheduler, device):
    """Train for one epoch"""
    model.train()
    total_loss = 0
    predictions = []
    true_labels = []
    
    for batch_idx, batch in enumerate(dataloader):
        # Move to device
        input_ids = batch['input_ids'].to(device)
        attention_mask = batch['attention_mask'].to(device)
        labels = batch['label'].to(device)
        
        # Forward pass
        logits, _ = model(input_ids, attention_mask)
        loss = criterion(logits, labels)
        
        # Backward pass
        optimizer.zero_grad()
        loss.backward()
        
        # Gradient clipping
        torch.nn.utils.clip_grad_norm_(model.parameters(), config['max_grad_norm'])
        
        optimizer.step()
        scheduler.step()
        
        # Track metrics
        total_loss += loss.item()
        preds = torch.argmax(logits, dim=1).cpu().numpy()
        predictions.extend(preds)
        true_labels.extend(labels.cpu().numpy())
        
        if batch_idx % 100 == 0:
            print(f"Batch {batch_idx}/{len(dataloader)}, Loss: {loss.item():.4f}")
    
    avg_loss = total_loss / len(dataloader)
    accuracy = accuracy_score(true_labels, predictions)
    
    return avg_loss, accuracy


def evaluate(model, dataloader, criterion, device):
    """Evaluate model"""
    model.eval()
    total_loss = 0
    predictions = []
    true_labels = []
    
    with torch.no_grad():
        for batch in dataloader:
            input_ids = batch['input_ids'].to(device)
            attention_mask = batch['attention_mask'].to(device)
            labels = batch['label'].to(device)
            
            logits, _ = model(input_ids, attention_mask)
            loss = criterion(logits, labels)
            
            total_loss += loss.item()
            preds = torch.argmax(logits, dim=1).cpu().numpy()
            predictions.extend(preds)
            true_labels.extend(labels.cpu().numpy())
    
    avg_loss = total_loss / len(dataloader)
    accuracy = accuracy_score(true_labels, predictions)
    precision, recall, f1, _ = precision_recall_fscore_support(
        true_labels, predictions, average='binary'
    )
    
    return avg_loss, accuracy, precision, recall, f1, predictions, true_labels


# Training loop
print("\nStarting training...")
history = {
    'train_loss': [],
    'train_acc': [],
    'val_loss': [],
    'val_acc': []
}

best_val_acc = 0

for epoch in range(config['epochs']):
    print(f"\n{'='*50}")
    print(f"Epoch {epoch + 1}/{config['epochs']}")
    print(f"{'='*50}")
    
    # Train
    train_loss, train_acc = train_epoch(
        model, train_loader, criterion, optimizer, scheduler, device
    )
    
    # Validate
    val_loss, val_acc, val_precision, val_recall, val_f1, _, _ = evaluate(
        model, val_loader, criterion, device
    )
    
    # Save history
    history['train_loss'].append(train_loss)
    history['train_acc'].append(train_acc)
    history['val_loss'].append(val_loss)
    history['val_acc'].append(val_acc)
    
    print(f"\nTrain Loss: {train_loss:.4f}, Train Acc: {train_acc:.4f}")
    print(f"Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.4f}")
    print(f"Val Precision: {val_precision:.4f}, Val Recall: {val_recall:.4f}, Val F1: {val_f1:.4f}")
    
    # Save best model
    if val_acc > best_val_acc:
        best_val_acc = val_acc
        torch.save({
            'epoch': epoch,
            'model_state_dict': model.state_dict(),
            'optimizer_state_dict': optimizer.state_dict(),
            'val_acc': val_acc,
        }, 'best_bert_sentiment.pt')
        print(f"✓ Saved best model (val_acc: {val_acc:.4f})")

print("\n" + "="*50)
print("Training complete!")
print(f"Best validation accuracy: {best_val_acc:.4f}")
```

---

## **Part 3: Evaluation and Analysis**

### **3.1: Test Set Evaluation**

```python
# Load best model
checkpoint = torch.load('best_bert_sentiment.pt')
model.load_state_dict(checkpoint['model_state_dict'])

print("Evaluating on test set...")
test_loss, test_acc, test_precision, test_recall, test_f1, predictions, true_labels = evaluate(
    model, test_loader, criterion, device
)

print(f"\n{'='*50}")
print("Test Set Results:")
print(f"{'='*50}")
print(f"Accuracy: {test_acc:.4f}")
print(f"Precision: {test_precision:.4f}")
print(f"Recall: {test_recall:.4f}")
print(f"F1 Score: {test_f1:.4f}")
print(f"{'='*50}")
```

### **3.2: Confusion Matrix**

```python
def plot_confusion_matrix(y_true, y_pred, labels=['Negative', 'Positive']):
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
    plt.title('Confusion Matrix')
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    plt.tight_layout()
    plt.savefig('confusion_matrix.png')
    # plt.show()
    
    print("\nConfusion Matrix:")
    print(cm)
    print(f"\nTrue Negatives: {cm[0, 0]}")
    print(f"False Positives: {cm[0, 1]}")
    print(f"False Negatives: {cm[1, 0]}")
    print(f"True Positives: {cm[1, 1]}")


plot_confusion_matrix(true_labels, predictions)
```

### **3.3: Training Curves**

```python
def plot_training_history(history):
    """Plot training curves"""
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 5))
    
    # Loss
    ax1.plot(history['train_loss'], label='Train Loss', marker='o')
    ax1.plot(history['val_loss'], label='Val Loss', marker='o')
    ax1.set_xlabel('Epoch')
    ax1.set_ylabel('Loss')
    ax1.set_title('Training and Validation Loss')
    ax1.legend()
    ax1.grid(True)
    
    # Accuracy
    ax2.plot(history['train_acc'], label='Train Acc', marker='o')
    ax2.plot(history['val_acc'], label='Val Acc', marker='o')
    ax2.set_xlabel('Epoch')
    ax2.set_ylabel('Accuracy')
    ax2.set_title('Training and Validation Accuracy')
    ax2.legend()
    ax2.grid(True)
    
    plt.tight_layout()
    plt.savefig('training_curves.png')
    # plt.show()


plot_training_history(history)
```

### **3.4: Error Analysis**

```python
def analyze_errors(model, dataloader, tokenizer, device, num_examples=5):
    """Analyze misclassified examples"""
    model.eval()
    errors = []
    
    with torch.no_grad():
        for batch in dataloader:
            input_ids = batch['input_ids'].to(device)
            attention_mask = batch['attention_mask'].to(device)
            labels = batch['label'].to(device)
            
            logits, _ = model(input_ids, attention_mask)
            preds = torch.argmax(logits, dim=1)
            
            # Find errors
            for i in range(len(labels)):
                if preds[i] != labels[i]:
                    text = tokenizer.decode(input_ids[i], skip_special_tokens=True)
                    errors.append({
                        'text': text,
                        'true_label': labels[i].item(),
                        'pred_label': preds[i].item(),
                        'confidence': torch.softmax(logits[i], dim=0).max().item()
                    })
            
            if len(errors) >= num_examples:
                break
    
    print("\n" + "="*50)
    print("Error Analysis - Misclassified Examples:")
    print("="*50)
    
    for i, error in enumerate(errors[:num_examples]):
        print(f"\nExample {i+1}:")
        print(f"Text: {error['text'][:200]}...")
        print(f"True Label: {'Positive' if error['true_label'] == 1 else 'Negative'}")
        print(f"Predicted: {'Positive' if error['pred_label'] == 1 else 'Negative'}")
        print(f"Confidence: {error['confidence']:.4f}")
        print("-"*50)


analyze_errors(model, test_loader, tokenizer, device, num_examples=5)
```

---

## **Part 4: Attention Visualization**

### **4.1: Extract and Visualize Attention**

```python
def get_attention_weights(model, text, tokenizer, device):
    """Get attention weights for a text"""
    model.eval()
    
    # Tokenize
    encoding = tokenizer.encode_plus(
        text,
        add_special_tokens=True,
        max_length=128,
        padding='max_length',
        truncation=True,
        return_attention_mask=True,
        return_tensors='pt'
    )
    
    input_ids = encoding['input_ids'].to(device)
    attention_mask = encoding['attention_mask'].to(device)
    
    with torch.no_grad():
        logits, attentions = model(input_ids, attention_mask)
    
    # Get tokens
    tokens = tokenizer.convert_ids_to_tokens(input_ids[0])
    
    # attentions: tuple of (batch, n_heads, seq_len, seq_len) for each layer
    return tokens, attentions, logits


def plot_attention_heatmap(tokens, attention, layer=11, head=0):
    """Plot attention heatmap"""
    # Get attention for specific layer and head
    attn = attention[layer][0, head].cpu().numpy()
    
    # Filter out padding tokens
    valid_tokens = [t for t in tokens if t != '[PAD]']
    seq_len = len(valid_tokens)
    attn = attn[:seq_len, :seq_len]
    
    # Plot
    plt.figure(figsize=(12, 10))
    sns.heatmap(
        attn,
        xticklabels=valid_tokens,
        yticklabels=valid_tokens,
        cmap='viridis',
        cbar_kws={'label': 'Attention Weight'}
    )
    plt.title(f'Attention Weights (Layer {layer}, Head {head})')
    plt.xlabel('Key Tokens')
    plt.ylabel('Query Tokens')
    plt.xticks(rotation=45, ha='right')
    plt.yticks(rotation=0)
    plt.tight_layout()
    plt.savefig(f'attention_layer{layer}_head{head}.png')
    # plt.show()


def plot_attention_all_heads(tokens, attention, layer=11):
    """Plot attention for all heads in a layer"""
    n_heads = attention[layer].shape[1]
    
    fig, axes = plt.subplots(3, 4, figsize=(20, 15))
    
    valid_tokens = [t for t in tokens if t != '[PAD]']
    seq_len = len(valid_tokens)
    
    for head in range(n_heads):
        ax = axes[head // 4, head % 4]
        attn = attention[layer][0, head, :seq_len, :seq_len].cpu().numpy()
        
        sns.heatmap(
            attn,
            xticklabels=valid_tokens if head >= 8 else [],
            yticklabels=valid_tokens if head % 4 == 0 else [],
            cmap='viridis',
            ax=ax,
            cbar=False
        )
        ax.set_title(f'Head {head}')
        
        if head >= 8:
            ax.set_xlabel('Key Tokens')
            plt.setp(ax.get_xticklabels(), rotation=45, ha='right', fontsize=8)
        if head % 4 == 0:
            ax.set_ylabel('Query Tokens')
    
    plt.suptitle(f'All Attention Heads (Layer {layer})', fontsize=16)
    plt.tight_layout()
    plt.savefig(f'attention_all_heads_layer{layer}.png')
    # plt.show()


# Example usage
test_text = "I absolutely loved this movie! The acting was superb and the plot was engaging."
tokens, attentions, logits = get_attention_weights(model, test_text, tokenizer, device)

# Prediction
pred = torch.argmax(logits, dim=1).item()
confidence = torch.softmax(logits, dim=1)[0, pred].item()

print(f"\nText: {test_text}")
print(f"Prediction: {'Positive' if pred == 1 else 'Negative'}")
print(f"Confidence: {confidence:.4f}")

# Visualize
plot_attention_heatmap(tokens, attentions, layer=11, head=0)
plot_attention_all_heads(tokens, attentions, layer=11)
```

### **4.2: Attention Flow Analysis**

```python
def analyze_attention_flow(tokens, attention):
    """Analyze which words get most attention"""
    # Average attention across all heads and layers
    all_attentions = torch.stack([attn[0] for attn in attention])  # [layers, heads, seq, seq]
    avg_attention = all_attentions.mean(dim=(0, 1))  # [seq, seq]
    
    # Get attention received by each token (column sum)
    attention_received = avg_attention.sum(dim=0).cpu().numpy()
    
    # Filter padding
    valid_tokens = [(i, t) for i, t in enumerate(tokens) if t != '[PAD]']
    indices, valid_tokens = zip(*valid_tokens)
    attention_received = attention_received[list(indices)]
    
    # Plot
    plt.figure(figsize=(14, 6))
    plt.bar(range(len(valid_tokens)), attention_received)
    plt.xticks(range(len(valid_tokens)), valid_tokens, rotation=45, ha='right')
    plt.ylabel('Total Attention Received')
    plt.title('Attention Distribution Across Tokens')
    plt.tight_layout()
    plt.savefig('attention_distribution.png')
    # plt.show()
    
    # Print top attended tokens
    print("\nTop 5 Most Attended Tokens:")
    top_indices = np.argsort(attention_received)[-5:][::-1]
    for i in top_indices:
        print(f"  {valid_tokens[i]}: {attention_received[i]:.4f}")


analyze_attention_flow(tokens, attentions)
```

---

## **Part 5: Inference API**

### **5.1: Create Prediction Function**

```python
class SentimentPredictor:
    """Sentiment prediction wrapper"""
    
    def __init__(self, model, tokenizer, device):
        self.model = model
        self.tokenizer = tokenizer
        self.device = device
        self.model.eval()
        
        self.label_map = {0: 'Negative', 1: 'Positive'}
    
    def predict(self, text, return_attention=False):
        """
        Predict sentiment
        
        Args:
            text: Input text
            return_attention: Whether to return attention weights
        
        Returns:
            result: Dictionary with prediction, confidence, etc.
        """
        # Tokenize
        encoding = self.tokenizer.encode_plus(
            text,
            add_special_tokens=True,
            max_length=256,
            padding='max_length',
            truncation=True,
            return_attention_mask=True,
            return_tensors='pt'
        )
        
        input_ids = encoding['input_ids'].to(self.device)
        attention_mask = encoding['attention_mask'].to(self.device)
        
        # Predict
        with torch.no_grad():
            logits, attentions = self.model(input_ids, attention_mask)
        
        # Process output
        probs = torch.softmax(logits, dim=1)[0]
        pred = torch.argmax(probs).item()
        confidence = probs[pred].item()
        
        result = {
            'text': text,
            'prediction': self.label_map[pred],
            'confidence': confidence,
            'probabilities': {
                'Negative': probs[0].item(),
                'Positive': probs[1].item()
            }
        }
        
        if return_attention:
            tokens = self.tokenizer.convert_ids_to_tokens(input_ids[0])
            result['tokens'] = tokens
            result['attentions'] = attentions
        
        return result
    
    def predict_batch(self, texts):
        """Predict sentiment for multiple texts"""
        results = []
        for text in texts:
            result = self.predict(text)
            results.append(result)
        return results


# Initialize predictor
predictor = SentimentPredictor(model, tokenizer, device)

# Test predictions
test_reviews = [
    "This movie was absolutely amazing! Best film I've seen this year.",
    "Terrible waste of time. The plot was nonsensical and acting was poor.",
    "It was okay, nothing special but not terrible either.",
    "Brilliant performances and stunning cinematography. Highly recommended!",
    "Boring and predictable. Would not watch again."
]

print("\n" + "="*50)
print("Sample Predictions:")
print("="*50)

for review in test_reviews:
    result = predictor.predict(review)
    print(f"\nReview: {review}")
    print(f"Prediction: {result['prediction']} ({result['confidence']:.4f})")
    print(f"Probabilities: Neg={result['probabilities']['Negative']:.4f}, "
          f"Pos={result['probabilities']['Positive']:.4f}")
```

### **5.2: Flask REST API**

```python
from flask import Flask, request, jsonify
import json

app = Flask(__name__)

# Load model (do this once at startup)
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')
model = BERTSentimentClassifier(n_classes=2)
checkpoint = torch.load('best_bert_sentiment.pt', map_location=device)
model.load_state_dict(checkpoint['model_state_dict'])
model = model.to(device)
predictor = SentimentPredictor(model, tokenizer, device)


@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict sentiment endpoint
    
    Example request:
    {
        "text": "I loved this movie!"
    }
    """
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        result = predictor.predict(text)
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/predict_batch', methods=['POST'])
def predict_batch():
    """
    Batch prediction endpoint
    
    Example request:
    {
        "texts": ["Review 1", "Review 2", "Review 3"]
    }
    """
    try:
        data = request.get_json()
        texts = data.get('texts', [])
        
        if not texts:
            return jsonify({'error': 'No texts provided'}), 400
        
        results = predictor.predict_batch(texts)
        return jsonify({'results': results})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'device': str(device)})


if __name__ == '__main__':
    print("Starting Sentiment Analysis API...")
    print(f"Model loaded on {device}")
    app.run(host='0.0.0.0', port=5000, debug=True)
```

### **5.3: API Client Example**

```python
import requests

# API endpoint
API_URL = "http://localhost:5000"

def test_api():
    """Test the API"""
    
    # Single prediction
    print("Testing single prediction...")
    response = requests.post(
        f"{API_URL}/predict",
        json={"text": "I absolutely loved this movie!"}
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    # Batch prediction
    print("\nTesting batch prediction...")
    response = requests.post(
        f"{API_URL}/predict_batch",
        json={
            "texts": [
                "Great movie!",
                "Terrible experience.",
                "It was okay."
            ]
        }
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    # Health check
    print("\nTesting health check...")
    response = requests.get(f"{API_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")


# Run tests
# test_api()
```

---

## **Part 6: Production Deployment**

### **6.1: Model Export (ONNX)**

```python
import torch.onnx

def export_to_onnx(model, tokenizer, output_path='bert_sentiment.onnx'):
    """Export model to ONNX format"""
    model.eval()
    
    # Dummy input
    dummy_text = "This is a sample text."
    encoding = tokenizer.encode_plus(
        dummy_text,
        add_special_tokens=True,
        max_length=256,
        padding='max_length',
        truncation=True,
        return_tensors='pt'
    )
    
    dummy_input = (
        encoding['input_ids'].to(device),
        encoding['attention_mask'].to(device)
    )
    
    # Export
    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        export_params=True,
        opset_version=11,
        do_constant_folding=True,
        input_names=['input_ids', 'attention_mask'],
        output_names=['logits', 'attentions'],
        dynamic_axes={
            'input_ids': {0: 'batch_size', 1: 'sequence'},
            'attention_mask': {0: 'batch_size', 1: 'sequence'},
            'logits': {0: 'batch_size'}
        }
    )
    
    print(f"Model exported to {output_path}")


# Export
# export_to_onnx(model, tokenizer)
```

### **6.2: Docker Deployment**

```dockerfile
# Dockerfile
FROM python:3.9-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Download model (or copy pre-trained)
RUN python -c "from transformers import BertTokenizer; BertTokenizer.from_pretrained('bert-base-uncased')"

# Expose port
EXPOSE 5000

# Run application
CMD ["python", "api.py"]
```

```bash
# Build and run
docker build -t bert-sentiment-api .
docker run -p 5000:5000 bert-sentiment-api
```

### **6.3: Performance Optimization**

```python
# Quantization for faster inference
import torch.quantization

def quantize_model(model):
    """Quantize model to INT8"""
    model.eval()
    quantized_model = torch.quantization.quantize_dynamic(
        model,
        {torch.nn.Linear},
        dtype=torch.qint8
    )
    return quantized_model


# Apply quantization
quantized_model = quantize_model(model)

# Compare sizes
original_size = sum(p.numel() * p.element_size() for p in model.parameters()) / 1024**2
quantized_size = sum(p.numel() * p.element_size() for p in quantized_model.parameters()) / 1024**2

print(f"Original model size: {original_size:.2f} MB")
print(f"Quantized model size: {quantized_size:.2f} MB")
print(f"Reduction: {(1 - quantized_size/original_size)*100:.1f}%")
```

---

## **Part 7: Final Analysis**

### **7.1: Model Comparison**

```python
# Compare with baseline
baseline_results = {
    'Logistic Regression': 0.885,
    'Random Forest': 0.847,
    'LSTM': 0.892,
    'BERT (ours)': test_acc
}

print("\n" + "="*50)
print("Model Comparison:")
print("="*50)
for model_name, acc in baseline_results.items():
    print(f"{model_name:25} {acc:.4f}")
```

### **7.2: Key Insights**

```python
insights = {
    'strengths': [
        'High accuracy (>90%) on sentiment classification',
        'Contextual understanding captures nuanced sentiment',
        'Transfer learning enables training with limited data',
        'Attention visualization provides interpretability'
    ],
    
    'limitations': [
        'Large model size (~110M parameters)',
        'Slower inference compared to lightweight models',
        'Requires GPU for real-time predictions',
        'Limited to 256 tokens (truncates long reviews)'
    ],
    
    'improvements': [
        'Use DistilBERT for faster inference (40% smaller)',
        'Implement caching for common queries',
        'Batch predictions for higher throughput',
        'Fine-tune on domain-specific data'
    ]
}

print("\n" + "="*50)
print("Project Insights:")
print("="*50)

for category, points in insights.items():
    print(f"\n{category.upper()}:")
    for point in points:
        print(f"  • {point}")
```

---

## **🎉 Project Complete!**

### **What You Built:**
- ✅ Fine-tuned BERT for sentiment analysis
- ✅ Achieved >90% accuracy on IMDB dataset
- ✅ Implemented comprehensive evaluation
- ✅ Visualized attention patterns
- ✅ Created REST API for inference
- ✅ Deployed production-ready model

### **What You Learned:**
- Fine-tuning pre-trained transformers
- BERT architecture and behavior
- Attention mechanism interpretation
- Production deployment strategies
- Model optimization techniques

### **Next Steps:**
1. Try multi-class classification (3+ classes)
2. Fine-tune on your own dataset
3. Experiment with other BERT variants (RoBERTa, ALBERT)
4. Build a web interface
5. Deploy to cloud (AWS, GCP, Azure)

**Congratulations on completing Week 3!** 🚀
