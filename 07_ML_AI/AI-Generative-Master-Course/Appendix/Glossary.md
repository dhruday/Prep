# 📖 AI/ML Glossary

A comprehensive glossary of AI/ML terms organized alphabetically, designed for developers new to AI/ML.

---

## Navigation

[A](#a) | [B](#b) | [C](#c) | [D](#d) | [E](#e) | [F](#f) | [G](#g) | [H](#h) | [I](#i) | [J](#j) | [K](#k) | [L](#l) | [M](#m) | [N](#n) | [O](#o) | [P](#p) | [Q](#q) | [R](#r) | [S](#s) | [T](#t) | [U](#u) | [V](#v) | [W](#w) | [X](#x) | [Z](#z)

---

## A

### Activation Function
A mathematical function applied to a neuron's output that introduces non-linearity, allowing neural networks to learn complex patterns. Common examples: ReLU, Sigmoid, Tanh.

```python
# ReLU: max(0, x) - most common
# Sigmoid: 1 / (1 + e^(-x)) - outputs 0-1
# Tanh: (e^x - e^(-x)) / (e^x + e^(-x)) - outputs -1 to 1
```

### Adam (Optimizer)
**Adaptive Moment Estimation** - A popular optimization algorithm that combines the benefits of RMSprop and momentum. Default choice for most deep learning tasks.

### Agent (AI Agent)
An AI system that can perceive its environment, make decisions, and take actions autonomously. In LLM context, refers to systems that can use tools, browse web, execute code, etc.

### Attention Mechanism
A technique that allows models to focus on relevant parts of input when producing output. The foundation of Transformers. "Attention is all you need."

### Autoencoder
A neural network that learns to compress data into a smaller representation (encoding) and then reconstruct it (decoding). Used for dimensionality reduction, denoising.

### Autoregressive Model
A model that generates output one token at a time, where each new token depends on all previous tokens. GPT is autoregressive.

---

## B

### Backpropagation
The algorithm used to calculate gradients in neural networks. It propagates error backward from the output layer to input layer, computing how much each weight contributed to the error.

### Batch Size
The number of training examples processed before updating model weights. Larger batches = more stable gradients but more memory.

```python
# Common batch sizes: 16, 32, 64, 128
# GPU memory limited? Use smaller batch with gradient accumulation
```

### BERT
**Bidirectional Encoder Representations from Transformers** - Google's influential model that reads text in both directions. Great for classification, NER, question answering.

### Bias (in ML)
1. **Mathematical**: A constant added to neuron output (like y = wx + b)
2. **Fairness**: Unwanted prejudices learned from training data

### BPE (Byte Pair Encoding)
A tokenization algorithm that iteratively merges the most frequent character pairs. Used by GPT models.

---

## C

### Causal Language Modeling (CLM)
Training a model to predict the next token given previous tokens. How GPT is trained. Also called autoregressive modeling.

### Chain-of-Thought (CoT)
A prompting technique where you ask the model to show its reasoning step by step. Improves performance on complex tasks.

### Checkpoint
A saved snapshot of model weights during training. Allows resuming training and selecting the best version.

### Classification
A task where the model assigns input to one of several predefined categories. Example: spam detection (spam/not spam).

### CNN (Convolutional Neural Network)
A neural network architecture designed for processing grid-like data (images). Uses convolution operations to detect patterns.

### Context Length / Context Window
The maximum number of tokens a model can process at once. GPT-4 Turbo: 128K tokens. Llama 2: 4K tokens.

### Cosine Similarity
A measure of similarity between two vectors based on the angle between them. Common for comparing embeddings.

```python
# Range: -1 (opposite) to 1 (identical)
similarity = np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))
```

### Cross-Entropy Loss
The standard loss function for classification tasks. Measures how different the predicted probability distribution is from the actual distribution.

### CUDA
NVIDIA's parallel computing platform. Required to run GPU-accelerated deep learning on NVIDIA GPUs.

---

## D

### Dataset
A collection of data used to train, validate, and test models. Common formats: CSV, JSON, Parquet, Hugging Face datasets.

### Decoder
The part of a model that generates output from a representation. In Transformers, the decoder generates text token by token.

### Dimensionality Reduction
Reducing the number of features/dimensions in data while preserving important information. Techniques: PCA, t-SNE, UMAP.

### Discriminator
In GANs, the network that tries to distinguish real data from generated fake data.

### Dropout
A regularization technique where random neurons are "dropped out" (set to zero) during training to prevent overfitting.

---

## E

### Embedding
A dense vector representation of data (words, images, etc.) that captures semantic meaning. Similar items have similar embeddings.

```python
# Word "king" might become [0.2, -0.5, 0.8, ...]
# Similar words have similar vectors
```

### Encoder
The part of a model that converts input into an internal representation. BERT is an encoder-only model.

### Encoder-Decoder
An architecture with separate encoding and decoding stages. Used for translation, summarization. T5 is encoder-decoder.

### Epoch
One complete pass through the entire training dataset. Training typically runs for multiple epochs.

### Exploding Gradients
When gradients become extremely large during training, causing weights to explode to infinity. Solutions: gradient clipping, careful initialization.

---

## F

### Few-Shot Learning
Learning from only a few examples. In LLMs, providing a few examples in the prompt to guide behavior.

### Fine-Tuning
Adapting a pre-trained model to a specific task by training it further on task-specific data. More efficient than training from scratch.

### FLOPs
**Floating Point Operations** - A measure of computational cost. Used to compare model complexity.

### Forward Pass
Computing the output of a neural network given an input. The "inference" direction.

---

## G

### GAN (Generative Adversarial Network)
A framework where two networks compete: a generator creates fake data, a discriminator tries to detect fakes. Used for image generation.

### Generator
In GANs, the network that creates fake data trying to fool the discriminator.

### GPT
**Generative Pre-trained Transformer** - OpenAI's family of autoregressive language models. GPT-4 is the latest major version.

### Gradient
The derivative of the loss function with respect to model parameters. Points in the direction of steepest increase in loss.

### Gradient Descent
An optimization algorithm that iteratively adjusts parameters in the direction that reduces loss.

### Ground Truth
The correct/actual labels in a dataset. What we want the model to predict.

---

## H

### Hallucination
When an AI model generates content that sounds plausible but is factually incorrect or made up.

### Hidden Layer
Layers between input and output in a neural network. Where the "learning" happens.

### Hugging Face
A company/platform that hosts models, datasets, and provides tools (transformers library) for ML.

### Hyperparameter
Parameters set before training that control the learning process (learning rate, batch size, epochs). Not learned from data.

---

## I

### Inference
Using a trained model to make predictions on new data. The "production" mode.

### Instruction Tuning
Fine-tuning a model to follow instructions better, typically using instruction-response pairs.

### In-Context Learning
The ability of LLMs to learn from examples provided in the prompt without updating weights.

---

## J

### JSON Lines (JSONL)
A file format where each line is a valid JSON object. Common for training data.

---

## K

### KV Cache
**Key-Value Cache** - Optimization for transformer inference that caches computed attention keys and values to avoid recomputation.

### Knowledge Distillation
Training a smaller "student" model to mimic a larger "teacher" model. Creates efficient models with similar performance.

---

## L

### Label
The correct answer/category for a training example. Used in supervised learning.

### Latent Space
The compressed representation space learned by models like autoencoders or VAEs. Where meaningful features are encoded.

### Layer Normalization
A normalization technique that normalizes across features within a single example. Common in Transformers.

### Learning Rate
How big of a step to take when updating weights. Too high = unstable, too low = slow learning. Critical hyperparameter.

```python
# Common range: 1e-5 to 1e-3
# For fine-tuning: usually 1e-5 to 5e-5
```

### LLM (Large Language Model)
A neural network trained on massive text data to understand and generate language. Examples: GPT-4, Claude, Llama.

### LoRA (Low-Rank Adaptation)
An efficient fine-tuning technique that adds small trainable matrices to frozen model weights. Reduces memory and compute needs.

### Loss Function
A function that measures how wrong the model's predictions are. Training aims to minimize loss.

### LSTM (Long Short-Term Memory)
A type of RNN designed to handle long-term dependencies. Largely replaced by Transformers for most tasks.

---

## M

### Masked Language Modeling (MLM)
Training by hiding some tokens and predicting them from context. How BERT is trained.

### Mini-Batch
A subset of training data processed together. Enables efficient GPU parallelization.

### Model Collapse
When a generative model starts producing limited, repetitive outputs. Can happen from training on AI-generated data.

### MLP (Multi-Layer Perceptron)
A fully connected neural network with multiple layers. The "vanilla" neural network.

### Multi-Head Attention
Attention mechanism with multiple parallel attention computations, allowing the model to focus on different aspects simultaneously.

---

## N

### NER (Named Entity Recognition)
The task of identifying and classifying named entities (persons, organizations, locations) in text.

### Neural Network
A computing system inspired by biological neural networks. Composed of interconnected nodes (neurons) that process information.

### NLP (Natural Language Processing)
The field of AI focused on enabling computers to understand, interpret, and generate human language.

### Normalization
Scaling data to a standard range. Types: batch normalization, layer normalization, min-max scaling.

---

## O

### One-Hot Encoding
Representing categorical variables as binary vectors. If 5 categories, each is [1,0,0,0,0], [0,1,0,0,0], etc.

### Optimizer
Algorithm that updates model weights based on gradients. Common: Adam, SGD, AdamW.

### Overfitting
When a model learns the training data too well, including noise, and fails to generalize to new data.

---

## P

### Parameter
A learnable weight in a neural network. GPT-3 has 175B parameters.

### Perplexity
A measure of how well a language model predicts text. Lower is better. Related to cross-entropy loss.

### Positional Encoding
Information added to embeddings to convey position in a sequence. Necessary because Transformers don't inherently know order.

### Pre-Training
Initial training on large amounts of data before fine-tuning. Creates general-purpose representations.

### Prompt
The input text given to a language model to guide its output.

### Prompt Engineering
The practice of crafting prompts to get desired outputs from language models.

---

## Q

### QLoRA
**Quantized LoRA** - Combining quantization (4-bit) with LoRA for extremely memory-efficient fine-tuning.

### Quantization
Reducing the precision of model weights (e.g., 32-bit to 4-bit) to reduce memory usage and increase speed. Trades accuracy for efficiency.

```
FP32: Full precision (4 bytes)
FP16: Half precision (2 bytes)
INT8: 8-bit integer (1 byte)
INT4: 4-bit integer (0.5 bytes)
```

---

## R

### RAG (Retrieval-Augmented Generation)
Combining LLMs with external knowledge retrieval. Retrieve relevant documents, add to context, then generate.

### Recall
In classification, the proportion of actual positives correctly identified. Recall = TP / (TP + FN).

### Regularization
Techniques to prevent overfitting: dropout, weight decay, early stopping, data augmentation.

### Reinforcement Learning (RL)
Learning through trial and error with rewards/penalties. Used in RLHF for aligning LLMs.

### RLHF (Reinforcement Learning from Human Feedback)
Training models using human preferences as rewards. How ChatGPT was aligned.

### RNN (Recurrent Neural Network)
Neural networks with loops allowing information to persist. Good for sequences but largely replaced by Transformers.

---

## S

### Self-Attention
Attention mechanism where a sequence attends to itself, allowing each token to consider all other tokens.

### Semantic Search
Search based on meaning rather than keywords. Uses embeddings to find semantically similar content.

### Sentiment Analysis
Classifying the emotional tone of text (positive, negative, neutral).

### Seq2Seq (Sequence-to-Sequence)
Models that transform one sequence into another. Used for translation, summarization.

### SGD (Stochastic Gradient Descent)
Basic optimization algorithm using random samples to estimate gradients.

### Softmax
Function that converts a vector of numbers into probabilities (sum to 1). Used in classification output layers.

```python
softmax(x) = exp(x) / sum(exp(x))
```

### SFT (Supervised Fine-Tuning)
Fine-tuning with labeled examples. Step before RLHF in many LLM training pipelines.

---

## T

### Temperature
A parameter controlling randomness in generation. Higher = more random, lower = more deterministic.

```
Temperature 0: Most likely token always
Temperature 0.7: Balanced (common default)
Temperature 1.5: Very creative/random
```

### Tensor
A multi-dimensional array. Scalars, vectors, and matrices are all tensors.

### TensorFlow
Google's open-source ML framework. Alternative to PyTorch.

### Token
The basic unit of text processing. Can be words, subwords, or characters depending on tokenizer.

### Tokenizer
Algorithm that converts text to tokens and back. Different models use different tokenizers.

### Top-K Sampling
Only considering the K most likely next tokens during generation. Reduces randomness.

### Top-P (Nucleus) Sampling
Sampling from the smallest set of tokens whose cumulative probability exceeds P. More dynamic than Top-K.

### Training
The process of updating model weights to minimize loss on training data.

### Transfer Learning
Using knowledge from one task/domain to improve performance on another. Pre-training + fine-tuning is transfer learning.

### Transformer
The dominant neural network architecture for NLP. Based on self-attention. Introduced in "Attention Is All You Need" (2017).

---

## U

### Underfitting
When a model is too simple to capture patterns in the data. High error on both training and test data.

---

## V

### Validation Set
Data held out from training to tune hyperparameters and monitor for overfitting. Different from test set.

### Vanishing Gradients
When gradients become extremely small during backpropagation, preventing learning. Common in deep networks.

### VAE (Variational Autoencoder)
A generative model that learns a probability distribution over the latent space. Used for generation and interpolation.

### Vector Database
A database optimized for storing and querying high-dimensional vectors (embeddings). Examples: Pinecone, Chroma, Milvus.

### Vision Transformer (ViT)
Applying Transformer architecture to images by treating image patches as tokens.

---

## W

### Weights
The learnable parameters in a neural network that are adjusted during training.

### Word Embedding
Dense vector representations of words. Word2Vec and GloVe were early approaches. Now subsumed into larger models.

---

## X

### XLA
**Accelerated Linear Algebra** - A compiler for ML that optimizes computations for different hardware.

---

## Z

### Zero-Shot Learning
Making predictions on classes/tasks never seen during training. LLMs can do this through prompt instructions.

---

## 📊 Quick Reference Formulas

```
COMMON FORMULAS:

Softmax:        σ(x)ᵢ = exp(xᵢ) / Σⱼ exp(xⱼ)

Sigmoid:        σ(x) = 1 / (1 + exp(-x))

ReLU:           f(x) = max(0, x)

Cross-Entropy:  L = -Σᵢ yᵢ log(ŷᵢ)

MSE:            L = (1/n) Σᵢ (yᵢ - ŷᵢ)²

Cosine Sim:     sim = (A · B) / (||A|| ||B||)

Attention:      Attention(Q,K,V) = softmax(QKᵀ/√d) V

Adam Update:    θₜ = θₜ₋₁ - α * m̂ₜ / (√v̂ₜ + ε)
```

---

## 📝 Abbreviations Quick Reference

| Abbreviation | Full Form |
|--------------|-----------|
| AI | Artificial Intelligence |
| API | Application Programming Interface |
| BERT | Bidirectional Encoder Representations from Transformers |
| CLM | Causal Language Modeling |
| CNN | Convolutional Neural Network |
| CoT | Chain of Thought |
| CUDA | Compute Unified Device Architecture |
| FT | Fine-Tuning |
| GAN | Generative Adversarial Network |
| GPT | Generative Pre-trained Transformer |
| GPU | Graphics Processing Unit |
| LLM | Large Language Model |
| LoRA | Low-Rank Adaptation |
| LSTM | Long Short-Term Memory |
| ML | Machine Learning |
| MLM | Masked Language Modeling |
| MLP | Multi-Layer Perceptron |
| NER | Named Entity Recognition |
| NLP | Natural Language Processing |
| QLoRA | Quantized LoRA |
| RAG | Retrieval-Augmented Generation |
| RL | Reinforcement Learning |
| RLHF | Reinforcement Learning from Human Feedback |
| RNN | Recurrent Neural Network |
| SFT | Supervised Fine-Tuning |
| SGD | Stochastic Gradient Descent |
| VAE | Variational Autoencoder |
| ViT | Vision Transformer |
| VRAM | Video Random Access Memory |
