# 🛠️ Project: Build Transformer from Scratch

---

## **Project Overview:**

### **What You'll Build:**

A **complete Transformer model** from scratch, trained on a real dataset, with:
- Multi-head self-attention mechanism
- Positional encoding
- Encoder and decoder stacks
- Training pipeline
- Inference with beam search
- Visualization tools

**No libraries** except PyTorch primitives (no `transformers` library).

```javascript
const project_goals = {
  understanding: 'Deep internals of Transformer architecture',
  implementation: 'Every component from scratch',
  training: 'Real dataset with actual training loop',
  evaluation: 'Metrics and visualization',
  
  outcome: 'Production-ready Transformer implementation!'
};
```

---

## **Part 1: Architecture Components**

### **1.1: Scaled Dot-Product Attention**

```python
import torch
import torch.nn as nn
import torch.nn.functional as F
import math

class ScaledDotProductAttention(nn.Module):
    """
    Attention(Q, K, V) = softmax(QK^T / √d_k) V
    """
    def __init__(self, temperature):
        super().__init__()
        self.temperature = temperature
        self.softmax = nn.Softmax(dim=-1)
    
    def forward(self, q, k, v, mask=None):
        """
        Args:
            q: [batch, n_heads, seq_len, d_k]
            k: [batch, n_heads, seq_len, d_k]
            v: [batch, n_heads, seq_len, d_v]
            mask: [batch, 1, seq_len, seq_len] or [batch, 1, 1, seq_len]
        
        Returns:
            output: [batch, n_heads, seq_len, d_v]
            attention: [batch, n_heads, seq_len, seq_len]
        """
        # Compute attention scores
        # QK^T / √d_k
        attn = torch.matmul(q, k.transpose(-2, -1)) / self.temperature  # [B, H, L, L]
        
        # Apply mask (if provided)
        if mask is not None:
            attn = attn.masked_fill(mask == 0, -1e9)
        
        # Softmax to get attention weights
        attn = self.softmax(attn)  # [B, H, L, L]
        
        # Weighted sum of values
        output = torch.matmul(attn, v)  # [B, H, L, d_v]
        
        return output, attn


# Test
attention = ScaledDotProductAttention(temperature=math.sqrt(64))
q = torch.randn(2, 8, 10, 64)  # [batch=2, heads=8, seq=10, d_k=64]
k = torch.randn(2, 8, 10, 64)
v = torch.randn(2, 8, 10, 64)

output, attn_weights = attention(q, k, v)
print(f"Output shape: {output.shape}")        # [2, 8, 10, 64]
print(f"Attention shape: {attn_weights.shape}")  # [2, 8, 10, 10]
```

### **1.2: Multi-Head Attention**

```python
class MultiHeadAttention(nn.Module):
    """
    Multi-Head Attention module
    """
    def __init__(self, n_heads, d_model, d_k, d_v, dropout=0.1):
        super().__init__()
        
        self.n_heads = n_heads
        self.d_k = d_k
        self.d_v = d_v
        
        # Linear projections for Q, K, V
        self.w_q = nn.Linear(d_model, n_heads * d_k, bias=False)
        self.w_k = nn.Linear(d_model, n_heads * d_k, bias=False)
        self.w_v = nn.Linear(d_model, n_heads * d_v, bias=False)
        
        # Attention mechanism
        self.attention = ScaledDotProductAttention(temperature=math.sqrt(d_k))
        
        # Output projection
        self.fc = nn.Linear(n_heads * d_v, d_model, bias=False)
        
        self.dropout = nn.Dropout(dropout)
        self.layer_norm = nn.LayerNorm(d_model, eps=1e-6)
    
    def forward(self, q, k, v, mask=None):
        """
        Args:
            q, k, v: [batch, seq_len, d_model]
            mask: [batch, 1, seq_len, seq_len]
        
        Returns:
            output: [batch, seq_len, d_model]
            attention: [batch, n_heads, seq_len, seq_len]
        """
        batch_size, len_q, d_model = q.size()
        batch_size, len_k, d_model = k.size()
        batch_size, len_v, d_model = v.size()
        
        # Residual connection
        residual = q
        
        # Linear projections and split into multiple heads
        # [batch, seq_len, n_heads * d_k] -> [batch, seq_len, n_heads, d_k]
        # -> [batch, n_heads, seq_len, d_k]
        q = self.w_q(q).view(batch_size, len_q, self.n_heads, self.d_k).transpose(1, 2)
        k = self.w_k(k).view(batch_size, len_k, self.n_heads, self.d_k).transpose(1, 2)
        v = self.w_v(v).view(batch_size, len_v, self.n_heads, self.d_v).transpose(1, 2)
        
        # Apply attention
        output, attn = self.attention(q, k, v, mask=mask)
        # output: [batch, n_heads, seq_len, d_v]
        
        # Concatenate heads
        # [batch, n_heads, seq_len, d_v] -> [batch, seq_len, n_heads, d_v]
        # -> [batch, seq_len, n_heads * d_v]
        output = output.transpose(1, 2).contiguous().view(batch_size, len_q, -1)
        
        # Final linear projection
        output = self.fc(output)
        output = self.dropout(output)
        
        # Residual connection and layer norm
        output = self.layer_norm(output + residual)
        
        return output, attn


# Test
mha = MultiHeadAttention(n_heads=8, d_model=512, d_k=64, d_v=64)
x = torch.randn(2, 10, 512)  # [batch, seq_len, d_model]

output, attn = mha(x, x, x)
print(f"Output shape: {output.shape}")  # [2, 10, 512]
print(f"Attention shape: {attn.shape}")  # [2, 8, 10, 10]
```

### **1.3: Position-wise Feed-Forward Network**

```python
class PositionwiseFeedForward(nn.Module):
    """
    FFN(x) = max(0, xW1 + b1)W2 + b2
    """
    def __init__(self, d_model, d_ff, dropout=0.1):
        super().__init__()
        
        self.w_1 = nn.Linear(d_model, d_ff)
        self.w_2 = nn.Linear(d_ff, d_model)
        
        self.dropout = nn.Dropout(dropout)
        self.layer_norm = nn.LayerNorm(d_model, eps=1e-6)
    
    def forward(self, x):
        """
        Args:
            x: [batch, seq_len, d_model]
        
        Returns:
            output: [batch, seq_len, d_model]
        """
        residual = x
        
        # Two linear transformations with ReLU
        x = self.w_1(x)
        x = F.relu(x)
        x = self.dropout(x)
        x = self.w_2(x)
        x = self.dropout(x)
        
        # Residual connection and layer norm
        output = self.layer_norm(x + residual)
        
        return output


# Test
ffn = PositionwiseFeedForward(d_model=512, d_ff=2048)
x = torch.randn(2, 10, 512)

output = ffn(x)
print(f"Output shape: {output.shape}")  # [2, 10, 512]
```

### **1.4: Positional Encoding**

```python
class PositionalEncoding(nn.Module):
    """
    PE(pos, 2i) = sin(pos / 10000^(2i/d_model))
    PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))
    """
    def __init__(self, d_model, max_len=5000):
        super().__init__()
        
        # Create positional encoding matrix
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * 
                             (-math.log(10000.0) / d_model))
        
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        
        pe = pe.unsqueeze(0)  # [1, max_len, d_model]
        
        # Register as buffer (not a parameter)
        self.register_buffer('pe', pe)
    
    def forward(self, x):
        """
        Args:
            x: [batch, seq_len, d_model]
        
        Returns:
            output: [batch, seq_len, d_model]
        """
        x = x + self.pe[:, :x.size(1), :]
        return x


# Test and visualize
pe = PositionalEncoding(d_model=512, max_len=100)

# Visualize (conceptually)
import matplotlib.pyplot as plt
import numpy as np

pos_enc = pe.pe[0].numpy()  # [100, 512]

plt.figure(figsize=(15, 5))
plt.pcolormesh(pos_enc, cmap='RdBu')
plt.xlabel('Embedding Dimension')
plt.ylabel('Position')
plt.colorbar()
plt.title('Positional Encoding Pattern')
# plt.show()

print(f"Positional encoding shape: {pe.pe.shape}")  # [1, 100, 512]
```

---

## **Part 2: Encoder and Decoder Layers**

### **2.1: Encoder Layer**

```python
class EncoderLayer(nn.Module):
    """
    Single encoder layer:
    1. Multi-head self-attention
    2. Feed-forward network
    """
    def __init__(self, d_model, d_ff, n_heads, d_k, d_v, dropout=0.1):
        super().__init__()
        
        self.self_attn = MultiHeadAttention(n_heads, d_model, d_k, d_v, dropout)
        self.ffn = PositionwiseFeedForward(d_model, d_ff, dropout)
    
    def forward(self, enc_input, self_attn_mask=None):
        """
        Args:
            enc_input: [batch, seq_len, d_model]
            self_attn_mask: [batch, 1, seq_len, seq_len]
        
        Returns:
            enc_output: [batch, seq_len, d_model]
            enc_self_attn: [batch, n_heads, seq_len, seq_len]
        """
        # Self-attention
        enc_output, enc_self_attn = self.self_attn(
            enc_input, enc_input, enc_input, mask=self_attn_mask
        )
        
        # Feed-forward
        enc_output = self.ffn(enc_output)
        
        return enc_output, enc_self_attn


# Test
encoder_layer = EncoderLayer(d_model=512, d_ff=2048, n_heads=8, d_k=64, d_v=64)
x = torch.randn(2, 10, 512)

output, attn = encoder_layer(x)
print(f"Encoder output shape: {output.shape}")  # [2, 10, 512]
```

### **2.2: Decoder Layer**

```python
class DecoderLayer(nn.Module):
    """
    Single decoder layer:
    1. Masked multi-head self-attention
    2. Multi-head cross-attention (with encoder)
    3. Feed-forward network
    """
    def __init__(self, d_model, d_ff, n_heads, d_k, d_v, dropout=0.1):
        super().__init__()
        
        self.self_attn = MultiHeadAttention(n_heads, d_model, d_k, d_v, dropout)
        self.cross_attn = MultiHeadAttention(n_heads, d_model, d_k, d_v, dropout)
        self.ffn = PositionwiseFeedForward(d_model, d_ff, dropout)
    
    def forward(self, dec_input, enc_output, self_attn_mask=None, cross_attn_mask=None):
        """
        Args:
            dec_input: [batch, tgt_len, d_model]
            enc_output: [batch, src_len, d_model]
            self_attn_mask: [batch, 1, tgt_len, tgt_len]  (causal mask)
            cross_attn_mask: [batch, 1, tgt_len, src_len]
        
        Returns:
            dec_output: [batch, tgt_len, d_model]
            dec_self_attn: [batch, n_heads, tgt_len, tgt_len]
            dec_cross_attn: [batch, n_heads, tgt_len, src_len]
        """
        # Masked self-attention
        dec_output, dec_self_attn = self.self_attn(
            dec_input, dec_input, dec_input, mask=self_attn_mask
        )
        
        # Cross-attention with encoder output
        dec_output, dec_cross_attn = self.cross_attn(
            dec_output, enc_output, enc_output, mask=cross_attn_mask
        )
        
        # Feed-forward
        dec_output = self.ffn(dec_output)
        
        return dec_output, dec_self_attn, dec_cross_attn


# Test
decoder_layer = DecoderLayer(d_model=512, d_ff=2048, n_heads=8, d_k=64, d_v=64)
dec_input = torch.randn(2, 8, 512)
enc_output = torch.randn(2, 10, 512)

output, self_attn, cross_attn = decoder_layer(dec_input, enc_output)
print(f"Decoder output shape: {output.shape}")        # [2, 8, 512]
print(f"Self-attention shape: {self_attn.shape}")     # [2, 8, 8, 8]
print(f"Cross-attention shape: {cross_attn.shape}")   # [2, 8, 8, 10]
```

---

## **Part 3: Complete Transformer Model**

### **3.1: Encoder Stack**

```python
class Encoder(nn.Module):
    """
    Stack of N encoder layers
    """
    def __init__(self, n_layers, d_model, d_ff, n_heads, d_k, d_v,
                 vocab_size, max_len=5000, dropout=0.1):
        super().__init__()
        
        # Token embedding
        self.token_emb = nn.Embedding(vocab_size, d_model)
        
        # Positional encoding
        self.pos_enc = PositionalEncoding(d_model, max_len)
        
        self.dropout = nn.Dropout(dropout)
        
        # Stack of encoder layers
        self.layers = nn.ModuleList([
            EncoderLayer(d_model, d_ff, n_heads, d_k, d_v, dropout)
            for _ in range(n_layers)
        ])
        
        self.layer_norm = nn.LayerNorm(d_model, eps=1e-6)
    
    def forward(self, src_seq, src_mask=None):
        """
        Args:
            src_seq: [batch, src_len] (token indices)
            src_mask: [batch, 1, src_len, src_len]
        
        Returns:
            enc_output: [batch, src_len, d_model]
            enc_self_attns: List of attention weights
        """
        enc_self_attns = []
        
        # Embedding + positional encoding
        enc_output = self.token_emb(src_seq)
        enc_output = self.pos_enc(enc_output)
        enc_output = self.dropout(enc_output)
        enc_output = self.layer_norm(enc_output)
        
        # Pass through encoder layers
        for layer in self.layers:
            enc_output, enc_self_attn = layer(enc_output, self_attn_mask=src_mask)
            enc_self_attns.append(enc_self_attn)
        
        return enc_output, enc_self_attns
```

### **3.2: Decoder Stack**

```python
class Decoder(nn.Module):
    """
    Stack of N decoder layers
    """
    def __init__(self, n_layers, d_model, d_ff, n_heads, d_k, d_v,
                 vocab_size, max_len=5000, dropout=0.1):
        super().__init__()
        
        # Token embedding
        self.token_emb = nn.Embedding(vocab_size, d_model)
        
        # Positional encoding
        self.pos_enc = PositionalEncoding(d_model, max_len)
        
        self.dropout = nn.Dropout(dropout)
        
        # Stack of decoder layers
        self.layers = nn.ModuleList([
            DecoderLayer(d_model, d_ff, n_heads, d_k, d_v, dropout)
            for _ in range(n_layers)
        ])
        
        self.layer_norm = nn.LayerNorm(d_model, eps=1e-6)
    
    def forward(self, tgt_seq, enc_output, tgt_mask=None, src_mask=None):
        """
        Args:
            tgt_seq: [batch, tgt_len] (token indices)
            enc_output: [batch, src_len, d_model]
            tgt_mask: [batch, 1, tgt_len, tgt_len] (causal mask)
            src_mask: [batch, 1, tgt_len, src_len]
        
        Returns:
            dec_output: [batch, tgt_len, d_model]
            dec_self_attns: List of self-attention weights
            dec_cross_attns: List of cross-attention weights
        """
        dec_self_attns = []
        dec_cross_attns = []
        
        # Embedding + positional encoding
        dec_output = self.token_emb(tgt_seq)
        dec_output = self.pos_enc(dec_output)
        dec_output = self.dropout(dec_output)
        dec_output = self.layer_norm(dec_output)
        
        # Pass through decoder layers
        for layer in self.layers:
            dec_output, dec_self_attn, dec_cross_attn = layer(
                dec_output, enc_output,
                self_attn_mask=tgt_mask,
                cross_attn_mask=src_mask
            )
            dec_self_attns.append(dec_self_attn)
            dec_cross_attns.append(dec_cross_attn)
        
        return dec_output, dec_self_attns, dec_cross_attns
```

### **3.3: Full Transformer**

```python
class Transformer(nn.Module):
    """
    Complete Transformer model
    """
    def __init__(self, n_layers=6, d_model=512, d_ff=2048, n_heads=8,
                 d_k=64, d_v=64, src_vocab_size=10000, tgt_vocab_size=10000,
                 max_len=5000, dropout=0.1, pad_idx=0):
        super().__init__()
        
        self.pad_idx = pad_idx
        
        # Encoder
        self.encoder = Encoder(
            n_layers, d_model, d_ff, n_heads, d_k, d_v,
            src_vocab_size, max_len, dropout
        )
        
        # Decoder
        self.decoder = Decoder(
            n_layers, d_model, d_ff, n_heads, d_k, d_v,
            tgt_vocab_size, max_len, dropout
        )
        
        # Output projection
        self.tgt_proj = nn.Linear(d_model, tgt_vocab_size, bias=False)
        
        # Initialize weights
        self._init_weights()
    
    def _init_weights(self):
        """Initialize weights"""
        for p in self.parameters():
            if p.dim() > 1:
                nn.init.xavier_uniform_(p)
    
    def forward(self, src_seq, tgt_seq):
        """
        Args:
            src_seq: [batch, src_len]
            tgt_seq: [batch, tgt_len]
        
        Returns:
            output: [batch, tgt_len, tgt_vocab_size]
        """
        # Create masks
        src_mask = self.get_pad_mask(src_seq, src_seq)
        tgt_mask = self.get_pad_mask(tgt_seq, tgt_seq) & self.get_subsequent_mask(tgt_seq)
        
        # Encoder
        enc_output, enc_self_attns = self.encoder(src_seq, src_mask)
        
        # Decoder
        dec_output, dec_self_attns, dec_cross_attns = self.decoder(
            tgt_seq, enc_output, tgt_mask, src_mask
        )
        
        # Project to vocabulary
        output = self.tgt_proj(dec_output)
        
        return output
    
    def get_pad_mask(self, seq_q, seq_k):
        """
        Mask padding tokens
        
        Args:
            seq_q: [batch, len_q]
            seq_k: [batch, len_k]
        
        Returns:
            mask: [batch, 1, len_q, len_k]
        """
        batch_size, len_q = seq_q.size()
        batch_size, len_k = seq_k.size()
        
        pad_mask = seq_k.ne(self.pad_idx).unsqueeze(1).unsqueeze(2)  # [B, 1, 1, len_k]
        pad_mask = pad_mask.expand(batch_size, 1, len_q, len_k)      # [B, 1, len_q, len_k]
        
        return pad_mask
    
    def get_subsequent_mask(self, seq):
        """
        Causal mask (for decoder)
        
        Args:
            seq: [batch, len]
        
        Returns:
            mask: [batch, 1, len, len]
        """
        batch_size, len_s = seq.size()
        
        subsequent_mask = torch.triu(
            torch.ones((len_s, len_s), device=seq.device, dtype=torch.uint8), diagonal=1
        )
        subsequent_mask = 1 - subsequent_mask  # Invert
        subsequent_mask = subsequent_mask.unsqueeze(0).unsqueeze(1)  # [1, 1, len, len]
        subsequent_mask = subsequent_mask.expand(batch_size, 1, len_s, len_s)
        
        return subsequent_mask.bool()


# Test
model = Transformer(
    n_layers=6,
    d_model=512,
    d_ff=2048,
    n_heads=8,
    src_vocab_size=10000,
    tgt_vocab_size=10000
)

src = torch.randint(0, 10000, (2, 20))  # [batch, src_len]
tgt = torch.randint(0, 10000, (2, 15))  # [batch, tgt_len]

output = model(src, tgt)
print(f"Output shape: {output.shape}")  # [2, 15, 10000]

# Count parameters
total_params = sum(p.numel() for p in model.parameters())
print(f"Total parameters: {total_params:,}")  # ~44M parameters
```

---

## **Part 4: Training Pipeline**

### **4.1: Dataset and DataLoader**

```python
import torch
from torch.utils.data import Dataset, DataLoader
from collections import Counter
import re

class TranslationDataset(Dataset):
    """
    Simple translation dataset (English -> French)
    """
    def __init__(self, data_path, max_len=50):
        self.max_len = max_len
        
        # Load data
        self.pairs = self._load_data(data_path)
        
        # Build vocabularies
        self.src_vocab, self.tgt_vocab = self._build_vocab()
        
        # Special tokens
        self.PAD_IDX = self.src_vocab['<pad>']
        self.BOS_IDX = self.src_vocab['<bos>']
        self.EOS_IDX = self.src_vocab['<eos>']
    
    def _load_data(self, path):
        """Load sentence pairs"""
        pairs = []
        with open(path, 'r', encoding='utf-8') as f:
            for line in f:
                src, tgt = line.strip().split('\t')
                pairs.append((src.lower(), tgt.lower()))
        return pairs
    
    def _build_vocab(self):
        """Build vocabularies"""
        src_words = []
        tgt_words = []
        
        for src, tgt in self.pairs:
            src_words.extend(self._tokenize(src))
            tgt_words.extend(self._tokenize(tgt))
        
        # Create vocab
        src_vocab = self._create_vocab(src_words)
        tgt_vocab = self._create_vocab(tgt_words)
        
        return src_vocab, tgt_vocab
    
    def _tokenize(self, text):
        """Simple tokenization"""
        return re.findall(r'\w+|[^\w\s]', text)
    
    def _create_vocab(self, words):
        """Create vocabulary from word list"""
        counter = Counter(words)
        vocab = {'<pad>': 0, '<bos>': 1, '<eos>': 2, '<unk>': 3}
        
        for word, _ in counter.most_common():
            if word not in vocab:
                vocab[word] = len(vocab)
        
        return vocab
    
    def _encode(self, text, vocab):
        """Encode text to indices"""
        tokens = self._tokenize(text)
        indices = [vocab.get(token, vocab['<unk>']) for token in tokens]
        return indices
    
    def __len__(self):
        return len(self.pairs)
    
    def __getitem__(self, idx):
        src, tgt = self.pairs[idx]
        
        # Encode
        src_indices = self._encode(src, self.src_vocab)
        tgt_indices = self._encode(tgt, self.tgt_vocab)
        
        # Add BOS/EOS
        tgt_indices = [self.BOS_IDX] + tgt_indices + [self.EOS_IDX]
        
        # Truncate
        src_indices = src_indices[:self.max_len]
        tgt_indices = tgt_indices[:self.max_len]
        
        return torch.tensor(src_indices), torch.tensor(tgt_indices)


def collate_fn(batch):
    """Collate function with padding"""
    src_batch, tgt_batch = zip(*batch)
    
    # Pad sequences
    src_batch = nn.utils.rnn.pad_sequence(src_batch, batch_first=True, padding_value=0)
    tgt_batch = nn.utils.rnn.pad_sequence(tgt_batch, batch_first=True, padding_value=0)
    
    return src_batch, tgt_batch


# Usage
# dataset = TranslationDataset('data/en-fr.txt')
# dataloader = DataLoader(dataset, batch_size=32, shuffle=True, collate_fn=collate_fn)
```

### **4.2: Training Loop**

```python
class TransformerTrainer:
    """
    Trainer for Transformer model
    """
    def __init__(self, model, train_loader, val_loader, device='cuda'):
        self.model = model.to(device)
        self.train_loader = train_loader
        self.val_loader = val_loader
        self.device = device
        
        # Loss function (ignore padding)
        self.criterion = nn.CrossEntropyLoss(ignore_index=0)
        
        # Optimizer with custom learning rate schedule
        self.optimizer = torch.optim.Adam(
            model.parameters(),
            lr=0.0001,
            betas=(0.9, 0.98),
            eps=1e-9
        )
        
        # Learning rate scheduler
        self.scheduler = NoamLR(self.optimizer, d_model=512, warmup_steps=4000)
        
        # Metrics
        self.train_losses = []
        self.val_losses = []
    
    def train_epoch(self):
        """Train one epoch"""
        self.model.train()
        total_loss = 0
        
        for batch_idx, (src, tgt) in enumerate(self.train_loader):
            src = src.to(self.device)
            tgt = tgt.to(self.device)
            
            # Split target into input and expected output
            tgt_input = tgt[:, :-1]
            tgt_output = tgt[:, 1:]
            
            # Forward pass
            output = self.model(src, tgt_input)  # [batch, tgt_len-1, vocab_size]
            
            # Calculate loss
            output = output.contiguous().view(-1, output.size(-1))
            tgt_output = tgt_output.contiguous().view(-1)
            loss = self.criterion(output, tgt_output)
            
            # Backward pass
            self.optimizer.zero_grad()
            loss.backward()
            
            # Gradient clipping
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=1.0)
            
            self.optimizer.step()
            self.scheduler.step()
            
            total_loss += loss.item()
            
            if batch_idx % 100 == 0:
                print(f"Batch {batch_idx}/{len(self.train_loader)}, Loss: {loss.item():.4f}")
        
        avg_loss = total_loss / len(self.train_loader)
        return avg_loss
    
    def validate(self):
        """Validate model"""
        self.model.eval()
        total_loss = 0
        
        with torch.no_grad():
            for src, tgt in self.val_loader:
                src = src.to(self.device)
                tgt = tgt.to(self.device)
                
                tgt_input = tgt[:, :-1]
                tgt_output = tgt[:, 1:]
                
                output = self.model(src, tgt_input)
                
                output = output.contiguous().view(-1, output.size(-1))
                tgt_output = tgt_output.contiguous().view(-1)
                loss = self.criterion(output, tgt_output)
                
                total_loss += loss.item()
        
        avg_loss = total_loss / len(self.val_loader)
        return avg_loss
    
    def train(self, num_epochs):
        """Train for multiple epochs"""
        for epoch in range(num_epochs):
            print(f"\nEpoch {epoch+1}/{num_epochs}")
            
            train_loss = self.train_epoch()
            val_loss = self.validate()
            
            self.train_losses.append(train_loss)
            self.val_losses.append(val_loss)
            
            print(f"Train Loss: {train_loss:.4f}, Val Loss: {val_loss:.4f}")
            
            # Save checkpoint
            self.save_checkpoint(f'checkpoint_epoch_{epoch+1}.pt')
    
    def save_checkpoint(self, path):
        """Save model checkpoint"""
        torch.save({
            'model_state_dict': self.model.state_dict(),
            'optimizer_state_dict': self.optimizer.state_dict(),
            'train_losses': self.train_losses,
            'val_losses': self.val_losses
        }, path)


class NoamLR:
    """
    Learning rate schedule from "Attention is All You Need"
    
    lr = d_model^(-0.5) * min(step^(-0.5), step * warmup_steps^(-1.5))
    """
    def __init__(self, optimizer, d_model, warmup_steps):
        self.optimizer = optimizer
        self.d_model = d_model
        self.warmup_steps = warmup_steps
        self.step_num = 0
    
    def step(self):
        self.step_num += 1
        lr = self._get_lr()
        for param_group in self.optimizer.param_groups:
            param_group['lr'] = lr
    
    def _get_lr(self):
        return self.d_model ** (-0.5) * min(
            self.step_num ** (-0.5),
            self.step_num * self.warmup_steps ** (-1.5)
        )


# Usage
# trainer = TransformerTrainer(model, train_loader, val_loader, device='cuda')
# trainer.train(num_epochs=10)
```

---

## **Part 5: Inference with Beam Search**

```python
class BeamSearchDecoder:
    """
    Beam search for Transformer decoding
    """
    def __init__(self, model, beam_size=5, max_len=50, device='cuda'):
        self.model = model
        self.beam_size = beam_size
        self.max_len = max_len
        self.device = device
    
    def decode(self, src_seq, bos_idx, eos_idx):
        """
        Decode using beam search
        
        Args:
            src_seq: [1, src_len] (single sentence)
            bos_idx: Beginning of sentence token
            eos_idx: End of sentence token
        
        Returns:
            best_sequence: [tgt_len] (best translation)
        """
        self.model.eval()
        
        with torch.no_grad():
            # Encode source
            src_seq = src_seq.to(self.device)
            src_mask = self.model.get_pad_mask(src_seq, src_seq)
            enc_output, _ = self.model.encoder(src_seq, src_mask)
            
            # Initialize beams
            # Each beam: (sequence, score)
            beams = [(torch.tensor([[bos_idx]], device=self.device), 0.0)]
            completed = []
            
            for step in range(self.max_len):
                candidates = []
                
                for seq, score in beams:
                    # Skip if already completed
                    if seq[0, -1].item() == eos_idx:
                        completed.append((seq, score))
                        continue
                    
                    # Decode one step
                    tgt_mask = self.model.get_pad_mask(seq, seq) & \
                               self.model.get_subsequent_mask(seq)
                    dec_output, _, _ = self.model.decoder(seq, enc_output, tgt_mask, src_mask)
                    
                    # Get next token logits
                    logits = self.model.tgt_proj(dec_output[:, -1, :])  # [1, vocab_size]
                    log_probs = F.log_softmax(logits, dim=-1)
                    
                    # Get top-k candidates
                    topk_log_probs, topk_indices = torch.topk(log_probs, self.beam_size)
                    
                    # Add to candidates
                    for i in range(self.beam_size):
                        new_seq = torch.cat([seq, topk_indices[:, i:i+1]], dim=1)
                        new_score = score + topk_log_probs[0, i].item()
                        candidates.append((new_seq, new_score))
                
                # Select top beams
                candidates.sort(key=lambda x: x[1], reverse=True)
                beams = candidates[:self.beam_size]
                
                # Early stopping
                if len(completed) >= self.beam_size:
                    break
            
            # Add remaining beams to completed
            completed.extend(beams)
            
            # Select best sequence
            completed.sort(key=lambda x: x[1], reverse=True)
            best_seq = completed[0][0]
            
            return best_seq[0, 1:]  # Remove BOS token


# Usage
def translate(sentence, src_vocab, tgt_vocab, model, device='cuda'):
    """Translate a sentence"""
    # Tokenize and encode
    tokens = re.findall(r'\w+|[^\w\s]', sentence.lower())
    src_indices = [src_vocab.get(token, src_vocab['<unk>']) for token in tokens]
    src_tensor = torch.tensor([src_indices])
    
    # Decode
    decoder = BeamSearchDecoder(model, beam_size=5, device=device)
    output_indices = decoder.decode(
        src_tensor,
        bos_idx=tgt_vocab['<bos>'],
        eos_idx=tgt_vocab['<eos>']
    )
    
    # Decode to text
    idx_to_word = {v: k for k, v in tgt_vocab.items()}
    output_tokens = [idx_to_word[idx.item()] for idx in output_indices if idx.item() != tgt_vocab['<eos>']]
    
    return ' '.join(output_tokens)


# Example
# translation = translate("Hello, how are you?", src_vocab, tgt_vocab, model)
# print(f"Translation: {translation}")
```

---

## **Part 6: Visualization and Analysis**

```python
import matplotlib.pyplot as plt
import seaborn as sns

class AttentionVisualizer:
    """Visualize attention weights"""
    
    @staticmethod
    def plot_attention(attention, src_tokens, tgt_tokens, layer=0, head=0):
        """
        Plot attention heatmap
        
        Args:
            attention: [batch, n_heads, tgt_len, src_len]
            src_tokens: List of source tokens
            tgt_tokens: List of target tokens
        """
        attn_weights = attention[0, head].cpu().numpy()  # [tgt_len, src_len]
        
        plt.figure(figsize=(10, 8))
        sns.heatmap(
            attn_weights,
            xticklabels=src_tokens,
            yticklabels=tgt_tokens,
            cmap='viridis',
            cbar_kws={'label': 'Attention Weight'}
        )
        plt.xlabel('Source Tokens')
        plt.ylabel('Target Tokens')
        plt.title(f'Attention Weights (Layer {layer}, Head {head})')
        plt.tight_layout()
        # plt.show()
    
    @staticmethod
    def plot_multi_head_attention(attention, src_tokens, tgt_tokens, layer=0):
        """Plot all attention heads"""
        n_heads = attention.size(1)
        
        fig, axes = plt.subplots(2, 4, figsize=(20, 10))
        
        for head in range(n_heads):
            ax = axes[head // 4, head % 4]
            attn_weights = attention[0, head].cpu().numpy()
            
            sns.heatmap(
                attn_weights,
                xticklabels=src_tokens if head >= 4 else [],
                yticklabels=tgt_tokens if head % 4 == 0 else [],
                cmap='viridis',
                ax=ax,
                cbar=False
            )
            ax.set_title(f'Head {head}')
        
        plt.suptitle(f'All Attention Heads (Layer {layer})')
        plt.tight_layout()
        # plt.show()
    
    @staticmethod
    def plot_training_curves(train_losses, val_losses):
        """Plot training and validation loss"""
        plt.figure(figsize=(10, 5))
        plt.plot(train_losses, label='Train Loss')
        plt.plot(val_losses, label='Val Loss')
        plt.xlabel('Epoch')
        plt.ylabel('Loss')
        plt.title('Training Progress')
        plt.legend()
        plt.grid(True)
        # plt.show()


# Usage
# visualizer = AttentionVisualizer()
# visualizer.plot_attention(cross_attn, src_tokens, tgt_tokens)
```

---

## **Part 7: Evaluation Metrics**

```python
from nltk.translate.bleu_score import corpus_bleu, sentence_bleu
from collections import Counter

class Evaluator:
    """Evaluate translation quality"""
    
    @staticmethod
    def calculate_bleu(references, hypotheses):
        """
        Calculate BLEU score
        
        Args:
            references: List of reference translations (tokenized)
            hypotheses: List of hypothesis translations (tokenized)
        
        Returns:
            bleu_score: BLEU score
        """
        # Format for corpus_bleu: references = [[[ref1], [ref2], ...]]
        references = [[ref] for ref in references]
        bleu = corpus_bleu(references, hypotheses)
        return bleu
    
    @staticmethod
    def calculate_perplexity(model, dataloader, device='cuda'):
        """Calculate perplexity"""
        model.eval()
        total_loss = 0
        total_tokens = 0
        criterion = nn.CrossEntropyLoss(ignore_index=0, reduction='sum')
        
        with torch.no_grad():
            for src, tgt in dataloader:
                src = src.to(device)
                tgt = tgt.to(device)
                
                tgt_input = tgt[:, :-1]
                tgt_output = tgt[:, 1:]
                
                output = model(src, tgt_input)
                
                output = output.contiguous().view(-1, output.size(-1))
                tgt_output = tgt_output.contiguous().view(-1)
                
                loss = criterion(output, tgt_output)
                
                # Count non-padding tokens
                non_pad_mask = tgt_output.ne(0)
                n_tokens = non_pad_mask.sum().item()
                
                total_loss += loss.item()
                total_tokens += n_tokens
        
        perplexity = math.exp(total_loss / total_tokens)
        return perplexity
    
    @staticmethod
    def evaluate_translations(model, test_data, src_vocab, tgt_vocab, device='cuda'):
        """Evaluate model on test data"""
        decoder = BeamSearchDecoder(model, beam_size=5, device=device)
        
        references = []
        hypotheses = []
        
        for src_text, tgt_text in test_data:
            # Get reference
            ref_tokens = re.findall(r'\w+|[^\w\s]', tgt_text.lower())
            references.append(ref_tokens)
            
            # Get hypothesis
            translation = translate(src_text, src_vocab, tgt_vocab, model, device)
            hyp_tokens = translation.split()
            hypotheses.append(hyp_tokens)
        
        # Calculate BLEU
        bleu = Evaluator.calculate_bleu(references, hypotheses)
        
        return bleu, references, hypotheses


# Usage
# bleu_score = evaluator.calculate_bleu(references, hypotheses)
# print(f"BLEU Score: {bleu_score:.4f}")
```

---

## **Part 8: Complete Example**

```python
# Main training script
def main():
    # Hyperparameters
    config = {
        'n_layers': 6,
        'd_model': 512,
        'd_ff': 2048,
        'n_heads': 8,
        'd_k': 64,
        'd_v': 64,
        'max_len': 100,
        'dropout': 0.1,
        'batch_size': 64,
        'num_epochs': 20,
        'device': 'cuda' if torch.cuda.is_available() else 'cpu'
    }
    
    print(f"Using device: {config['device']}")
    
    # Load dataset
    print("Loading dataset...")
    dataset = TranslationDataset('data/en-fr.txt', max_len=config['max_len'])
    
    # Split train/val/test
    train_size = int(0.8 * len(dataset))
    val_size = int(0.1 * len(dataset))
    test_size = len(dataset) - train_size - val_size
    
    train_dataset, val_dataset, test_dataset = torch.utils.data.random_split(
        dataset, [train_size, val_size, test_size]
    )
    
    # Create dataloaders
    train_loader = DataLoader(
        train_dataset,
        batch_size=config['batch_size'],
        shuffle=True,
        collate_fn=collate_fn
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=config['batch_size'],
        collate_fn=collate_fn
    )
    test_loader = DataLoader(
        test_dataset,
        batch_size=config['batch_size'],
        collate_fn=collate_fn
    )
    
    # Create model
    print("Creating model...")
    model = Transformer(
        n_layers=config['n_layers'],
        d_model=config['d_model'],
        d_ff=config['d_ff'],
        n_heads=config['n_heads'],
        d_k=config['d_k'],
        d_v=config['d_v'],
        src_vocab_size=len(dataset.src_vocab),
        tgt_vocab_size=len(dataset.tgt_vocab),
        max_len=config['max_len'],
        dropout=config['dropout']
    )
    
    print(f"Model has {sum(p.numel() for p in model.parameters()):,} parameters")
    
    # Train
    print("\nTraining...")
    trainer = TransformerTrainer(model, train_loader, val_loader, config['device'])
    trainer.train(num_epochs=config['num_epochs'])
    
    # Plot training curves
    visualizer = AttentionVisualizer()
    visualizer.plot_training_curves(trainer.train_losses, trainer.val_losses)
    
    # Evaluate
    print("\nEvaluating...")
    evaluator = Evaluator()
    perplexity = evaluator.calculate_perplexity(model, test_loader, config['device'])
    print(f"Test Perplexity: {perplexity:.2f}")
    
    # Test translations
    test_sentences = [
        "Hello, how are you?",
        "I love programming.",
        "The weather is nice today."
    ]
    
    print("\nSample Translations:")
    for sent in test_sentences:
        translation = translate(sent, dataset.src_vocab, dataset.tgt_vocab, model, config['device'])
        print(f"Source: {sent}")
        print(f"Translation: {translation}\n")


if __name__ == '__main__':
    main()
```

---

## **Extensions and Improvements:**

### **1. Add Relative Positional Encoding:**

```python
# More effective than absolute positional encoding
class RelativePositionalEncoding(nn.Module):
    def __init__(self, d_model, max_len=512):
        super().__init__()
        self.max_len = max_len
        self.d_model = d_model
        
        # Learnable relative position embeddings
        self.pos_emb = nn.Embedding(2 * max_len - 1, d_model)
    
    def forward(self, q, k):
        seq_len = q.size(1)
        
        # Compute relative positions
        pos = torch.arange(seq_len, device=q.device).unsqueeze(0)
        rel_pos = pos - pos.transpose(0, 1)
        rel_pos = rel_pos + self.max_len - 1  # Shift to positive
        
        # Get embeddings
        rel_pos_emb = self.pos_emb(rel_pos)
        
        return rel_pos_emb
```

### **2. Add Label Smoothing:**

```python
class LabelSmoothingLoss(nn.Module):
    """Label smoothing regularization"""
    def __init__(self, smoothing=0.1, pad_idx=0):
        super().__init__()
        self.confidence = 1.0 - smoothing
        self.smoothing = smoothing
        self.pad_idx = pad_idx
    
    def forward(self, pred, target):
        # pred: [batch * seq_len, vocab_size]
        # target: [batch * seq_len]
        
        true_dist = torch.zeros_like(pred)
        true_dist.fill_(self.smoothing / (pred.size(-1) - 2))
        true_dist.scatter_(1, target.unsqueeze(1), self.confidence)
        true_dist[:, self.pad_idx] = 0
        
        mask = target == self.pad_idx
        if mask.any():
            true_dist.masked_fill_(mask.unsqueeze(1), 0)
        
        return F.kl_div(F.log_softmax(pred, dim=-1), true_dist, reduction='sum')
```

### **3. Add Mixed Precision Training:**

```python
from torch.cuda.amp import autocast, GradScaler

# In training loop
scaler = GradScaler()

for src, tgt in train_loader:
    with autocast():
        output = model(src, tgt_input)
        loss = criterion(output, tgt_output)
    
    scaler.scale(loss).backward()
    scaler.unscale_(optimizer)
    torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
    scaler.step(optimizer)
    scaler.update()
    optimizer.zero_grad()
```

---

## **🎉 Project Complete!**

You've built a **complete Transformer from scratch**:
- ✅ Every component implemented
- ✅ Full training pipeline
- ✅ Beam search decoding
- ✅ Visualization tools
- ✅ Evaluation metrics
- ✅ Production-ready code

**What you learned:**
- Deep understanding of Transformer internals
- How attention mechanism really works
- Training best practices
- Inference optimization

**Next:** Fine-tune your model or try the **Sentiment Analysis mini-project**! 🚀
