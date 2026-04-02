# 🎲 Probability & Statistics for AI

> **Prerequisite:** [02a-Linear-Algebra.md](./02a-Linear-Algebra.md), Basic arithmetic
> **Time:** 2-3 hours
> **Difficulty:** ⭐⭐ (Beginner-friendly)

---

## 📚 Table of Contents

1. [Learning Objectives](#-learning-objectives)
2. [Why Probability for AI?](#-why-probability-for-ai)
3. [Part 1: Basic Probability](#-part-1-basic-probability)
4. [Part 2: Bayes' Theorem](#-part-2-bayes-theorem)
5. [Part 3: Probability Distributions](#-part-3-probability-distributions)
6. [Part 4: Softmax (Scores → Probabilities)](#-part-4-softmax-scores--probabilities)
7. [Part 5: Cross-Entropy Loss](#-part-5-cross-entropy-loss)
8. [Part 6: Expected Value and Variance](#-part-6-expected-value-and-variance)
9. [Part 7: Maximum Likelihood Estimation](#-part-7-maximum-likelihood-estimation)
10. [Hands-On Project: Naive Bayes Classifier](#️-hands-on-project-naive-bayes-classifier)
11. [Quick Reference Card](#-quick-reference-card)
12. [Common Mistakes](#️-common-mistakes)
13. [Interview Questions](#-interview-questions)
14. [Key Takeaways](#-key-takeaways)
15. [Next Up](#-next-up)

---

## 🎯 Learning Objectives

By the end of this module, you will:
- [ ] Understand basic probability concepts
- [ ] Know conditional probability and Bayes' theorem
- [ ] Understand common probability distributions
- [ ] Master softmax (turning scores into probabilities)
- [ ] Understand cross-entropy loss

---

## 🤔 Why Probability for AI?

AI models don't just say "cat" - they say "**80% cat, 15% dog, 5% bird**".

```
┌─────────────────────────────────────────────────────────┐
│                WHY PROBABILITY MATTERS                   │
│                                                          │
│  1. Predictions are probabilistic                       │
│     "This email is 95% likely spam"                     │
│                                                          │
│  2. Loss functions are based on probability             │
│     Cross-entropy = "how surprised are we by the truth?"│
│                                                          │
│  3. Generative AI samples from distributions            │
│     "What's a likely next word?"                        │
│                                                          │
│  4. Uncertainty quantification                          │
│     "How confident is the model?"                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🎰 Part 1: Basic Probability

### 1.1 What is Probability?

**Probability** measures how likely an event is to happen.

```
P(A) = (favorable outcomes) / (total possible outcomes)

Range: 0 ≤ P(A) ≤ 1

P(A) = 0    → Impossible
P(A) = 0.5  → 50/50 chance
P(A) = 1    → Certain
```

#### Examples

```
Rolling a die:
P(6) = 1/6 = 0.167 = 16.7%

Flipping a fair coin:
P(heads) = 1/2 = 0.5 = 50%

Drawing an ace from a deck:
P(ace) = 4/52 = 0.077 = 7.7%
```

#### Python

```python
import numpy as np

# Simulate coin flips
flips = np.random.choice(['heads', 'tails'], size=10000)
prob_heads = (flips == 'heads').mean()
print(f"P(heads) from simulation: {prob_heads:.4f}")  # ~0.5000
```

---

### 1.2 Multiple Events

#### AND (Intersection)

Both events happen:

```
P(A AND B) = P(A ∩ B)

If A and B are INDEPENDENT:
P(A AND B) = P(A) × P(B)

Example: Two coin flips
P(heads AND heads) = 0.5 × 0.5 = 0.25
```

#### OR (Union)

At least one event happens:

```
P(A OR B) = P(A) + P(B) - P(A AND B)

Example: Rolling 1 OR 2 on a die
P(1 OR 2) = 1/6 + 1/6 - 0 = 2/6 = 1/3
```

#### NOT (Complement)

Event doesn't happen:

```
P(NOT A) = 1 - P(A)

Example: Not rolling a 6
P(NOT 6) = 1 - 1/6 = 5/6
```

---

### 1.3 Conditional Probability

**P(A|B)** = Probability of A **given that** B happened

```
P(A|B) = P(A AND B) / P(B)

"Of all cases where B happened, how often did A also happen?"
```

#### Example

```
Weather data:
- 30% of days are cloudy
- 20% of days have both clouds AND rain
- What's P(rain | cloudy)?

P(rain | cloudy) = P(rain AND cloudy) / P(cloudy)
                 = 0.20 / 0.30
                 = 0.67 = 67%

"Given it's cloudy, there's a 67% chance of rain"
```

#### Visual: Venn Diagram

```
         ┌────────────────────────────────────┐
         │          All days                  │
         │                                    │
         │    ┌───────────────┐              │
         │    │   Cloudy      │              │
         │    │   ┌─────┐     │              │
         │    │   │Rain │     │              │
         │    │   │AND  │     │              │
         │    │   │Cloud│     │              │
         │    │   └─────┘     │              │
         │    └───────────────┘              │
         │                                    │
         └────────────────────────────────────┘

P(Rain | Cloudy) = (Rain AND Cloud area) / (Cloudy area)
```

---

### 🧪 Checkpoint 1: Basic Probability

```python
# Exercise 1: A bag has 3 red and 2 blue balls.
# What's P(red)?

# Exercise 2: Two dice are rolled.
# What's P(both show 6)? (assuming independent)

# Exercise 3: 60% of emails are spam. Of spam, 80% contain "free".
# What's P(spam AND contains "free")?
```

<details>
<summary>Click for answers</summary>

```python
# Exercise 1
# P(red) = 3/5 = 0.6 = 60%

# Exercise 2
# P(both 6) = P(die1=6) × P(die2=6) = 1/6 × 1/6 = 1/36 ≈ 2.8%

# Exercise 3
# P(spam AND "free") = P("free" | spam) × P(spam) = 0.80 × 0.60 = 0.48 = 48%
```

</details>

---

## 🔄 Part 2: Bayes' Theorem

### 2.1 The Formula

**Bayes' Theorem** lets us "flip" conditional probabilities:

```
P(A|B) = P(B|A) × P(A) / P(B)

Or in words:
posterior = likelihood × prior / evidence
```

```
┌─────────────────────────────────────────────────────────┐
│                   BAYES' THEOREM                         │
│                                                          │
│   P(A|B) = P(B|A) × P(A)                                │
│            ─────────────                                 │
│               P(B)                                       │
│                                                          │
│   posterior = likelihood × prior / evidence             │
│                                                          │
│   "Update beliefs based on new evidence"                │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 2.2 AI Example: Spam Detection

```
Question: Given an email contains "free money", what's P(spam)?

Known:
- P("free money" | spam) = 0.8    (80% of spam has these words)
- P(spam) = 0.3                    (30% of all emails are spam)
- P("free money") = 0.1            (10% of ALL emails have this)

Applying Bayes:
P(spam | "free money") = P("free money" | spam) × P(spam)
                         ───────────────────────────────────
                                P("free money")
                       
                       = (0.8 × 0.3) / 0.1
                       = 0.24 / 0.1
                       = 0.24 / 0.1
                       = 2.4

Wait, > 1? We need to normalize or use proper formula...
```

#### Proper Calculation with Normalization

```python
# Complete Bayes calculation
p_spam = 0.3
p_not_spam = 0.7
p_free_given_spam = 0.8
p_free_given_not_spam = 0.05

# P("free") = P("free"|spam)P(spam) + P("free"|not_spam)P(not_spam)
p_free = p_free_given_spam * p_spam + p_free_given_not_spam * p_not_spam
# p_free = 0.8 * 0.3 + 0.05 * 0.7 = 0.24 + 0.035 = 0.275

# Bayes
p_spam_given_free = (p_free_given_spam * p_spam) / p_free
# = (0.8 * 0.3) / 0.275 = 0.24 / 0.275 ≈ 0.87

print(f"P(spam | 'free money') = {p_spam_given_free:.2%}")  # 87%
```

### 2.3 Why Bayes Matters for AI

```
1. Naive Bayes Classifier
   - Classic ML algorithm for text classification
   - Uses Bayes to compute P(class | features)

2. Probabilistic Reasoning
   - Update beliefs as new evidence arrives
   - Medical diagnosis, fraud detection

3. Foundation of Inference
   - Understanding uncertainty in predictions
   - Bayesian neural networks
```

---

## 📊 Part 3: Probability Distributions

### 3.1 What is a Distribution?

A **probability distribution** describes all possible values and their probabilities.

```
Discrete:                      Continuous:
                              
P(X) │                        p(x) │
  1.0│                             │     ___
     │                             │   _/   \_
  0.5│ ▓                           │  /       \
     │ ▓ ▓                         │ /         \
  0.2│ ▓ ▓ ▓                       │/           \
     └──────────               ────┴──────────────
      1 2 3 4 5 (dice)               -2  0  2 (continuous)
```

---

### 3.2 Normal (Gaussian) Distribution

The **bell curve** - most common in nature and AI.

```
                 ┌───────────────────┐
                 │     ╭─────╮       │
                 │   ╱         ╲     │   68% within 1σ
                 │  ╱           ╲    │   95% within 2σ
                 │ ╱             ╲   │   99.7% within 3σ
                 │╱               ╲  │
                 ├─────────────────────┤
                      μ-σ  μ  μ+σ
                          mean
```

#### Parameters

- **μ (mu)** = mean (center)
- **σ (sigma)** = standard deviation (spread)

```python
import numpy as np
import matplotlib.pyplot as plt

# Generate normal distribution
mu, sigma = 0, 1  # Standard normal
samples = np.random.normal(mu, sigma, 10000)

plt.hist(samples, bins=50, density=True, alpha=0.7)
plt.xlabel('Value')
plt.ylabel('Density')
plt.title(f'Normal Distribution (μ={mu}, σ={sigma})')
plt.show()

print(f"Mean: {samples.mean():.4f}")
print(f"Std: {samples.std():.4f}")
```

#### Why It Matters for AI

```python
# 1. Weight Initialization
weights = np.random.randn(100, 50) * 0.01  # Small random weights

# 2. Noise in GANs
noise = np.random.randn(batch_size, latent_dim)

# 3. Many natural phenomena are normal
# Heights, test scores, measurement errors
```

---

### 3.3 Uniform Distribution

All values equally likely:

```python
# Uniform between 0 and 1
samples = np.random.uniform(0, 1, 1000)

# Uniform integers (e.g., dice)
dice = np.random.randint(1, 7, 1000)  # 1 to 6
```

**AI Use:** Random initialization, random sampling.

---

### 3.4 Bernoulli and Binomial

**Bernoulli:** Single yes/no event with probability p

```python
# Single coin flip (p=0.5)
result = np.random.binomial(1, 0.5)  # 0 or 1
```

**Binomial:** Number of successes in n trials

```python
# Flip 10 coins, count heads
heads = np.random.binomial(10, 0.5)  # 0 to 10
```

**AI Use:** Classification (spam/not spam), dropout.

---

## 🎯 Part 4: Softmax (Scores → Probabilities)

### 4.1 The Problem

Neural networks output **raw scores** (logits), not probabilities:

```
Network output for "cat vs dog vs bird":
scores = [2.0, 1.0, 0.1]

These could be anything! We need probabilities that:
1. Are between 0 and 1
2. Sum to 1
```

### 4.2 The Softmax Function

```
softmax(zᵢ) = eᶻⁱ / Σⱼ eᶻʲ

"Exponentiate each score, then normalize"
```

#### Step-by-Step

```
scores = [2.0, 1.0, 0.1]

Step 1: Exponentiate
e^2.0 = 7.39
e^1.0 = 2.72
e^0.1 = 1.11
       ──────
sum  = 11.22

Step 2: Normalize (divide by sum)
7.39/11.22 = 0.66  → 66% cat
2.72/11.22 = 0.24  → 24% dog
1.11/11.22 = 0.10  → 10% bird
             ─────
             1.00  ✓ sums to 1!
```

### 4.3 Python Implementation

```python
import numpy as np

def softmax(z):
    """
    Convert raw scores to probabilities.
    
    Subtracting max for numerical stability:
    e^(large number) can overflow to infinity!
    """
    z = z - np.max(z)  # Stability trick
    exp_z = np.exp(z)
    return exp_z / exp_z.sum()

# Test
scores = np.array([2.0, 1.0, 0.1])
probs = softmax(scores)

print(f"Scores: {scores}")
print(f"Probabilities: {probs}")
print(f"Sum: {probs.sum()}")  # 1.0

# Class prediction
classes = ['cat', 'dog', 'bird']
predicted = classes[probs.argmax()]
print(f"Prediction: {predicted} ({probs.max():.1%})")
```

### 4.4 Softmax Properties

```
1. Output is always 0-1 ✓
2. Outputs sum to 1 ✓
3. Higher scores → higher probabilities ✓
4. Differences are preserved but exaggerated

Example of exaggeration:
scores = [3, 2, 1] → probs ≈ [0.67, 0.24, 0.09]
scores = [6, 4, 2] → probs ≈ [0.84, 0.11, 0.04]  (more confident!)
```

### 4.5 Temperature

Control how "confident" softmax is:

```python
def softmax_with_temperature(z, temperature=1.0):
    """
    temperature < 1: More confident (sharper distribution)
    temperature > 1: Less confident (flatter distribution)
    """
    z = z / temperature
    z = z - np.max(z)
    exp_z = np.exp(z)
    return exp_z / exp_z.sum()

scores = np.array([2.0, 1.0, 0.5])

print("Temperature effects:")
for temp in [0.5, 1.0, 2.0]:
    probs = softmax_with_temperature(scores, temp)
    print(f"  T={temp}: {probs.round(3)}")

# T=0.5: [0.804 0.152 0.044]  ← More confident
# T=1.0: [0.659 0.242 0.099]  ← Normal
# T=2.0: [0.506 0.307 0.186]  ← Less confident
```

**AI Use:** Temperature in LLM generation controls creativity!

---

### 🧪 Checkpoint 2: Softmax

```python
import numpy as np

# Exercise 1: Compute softmax manually for [1, 2, 3]
# Show your work

# Exercise 2: Which temperature makes predictions more "random"?
# A) temperature = 0.1
# B) temperature = 1.0
# C) temperature = 10.0

# Exercise 3: Why do we subtract max(z) before computing softmax?
```

<details>
<summary>Click for answers</summary>

```python
# Exercise 1
scores = [1, 2, 3]
# e^1 = 2.72, e^2 = 7.39, e^3 = 20.09
# sum = 30.20
# probs = [2.72/30.20, 7.39/30.20, 20.09/30.20]
#       = [0.09, 0.24, 0.67]

# Exercise 2
# C) temperature = 10.0
# Higher temperature → flatter distribution → more random

# Exercise 3
# To prevent numerical overflow!
# e^(large number) like e^1000 = infinity
# But e^(1000-1000) = e^0 = 1 (manageable)
```

</details>

---

## 📉 Part 5: Cross-Entropy Loss

### 5.1 The Problem

How do we measure how wrong our probability predictions are?

```
True label: cat (100% cat, 0% dog, 0% bird)
Prediction: [0.7, 0.2, 0.1]

How "bad" is this prediction?
```

### 5.2 The Cross-Entropy Formula

```
Cross-Entropy = -Σ yᵢ × log(ŷᵢ)

Where:
- y = true distribution (one-hot: [1, 0, 0])
- ŷ = predicted distribution ([0.7, 0.2, 0.1])
```

#### Why -log?

```
If prediction is CORRECT (ŷ close to 1):
    -log(0.9) ≈ 0.1  (low loss ✓)
    -log(0.99) ≈ 0.01 (very low loss ✓)

If prediction is WRONG (ŷ close to 0):
    -log(0.1) ≈ 2.3  (high loss ✗)
    -log(0.01) ≈ 4.6  (very high loss ✗)

This severely penalizes confident wrong predictions!
```

#### Visual

```
  Loss │
       │╲
     4 │ ╲
       │  ╲
     2 │   ╲
       │    ╲___
     0 │        ╲___________
       └────────────────────
       0   0.2  0.4  0.6  0.8  1.0
              Predicted probability
              
Higher probability → Lower loss (good!)
```

### 5.3 Python Implementation

```python
import numpy as np

def cross_entropy(y_true, y_pred):
    """
    Calculate cross-entropy loss.
    
    y_true: one-hot encoded true labels
    y_pred: predicted probabilities
    """
    # Clip to avoid log(0) = -infinity
    y_pred = np.clip(y_pred, 1e-15, 1 - 1e-15)
    
    # Cross-entropy formula
    return -np.sum(y_true * np.log(y_pred))

# Example: True class is "cat" (index 0)
y_true = np.array([1, 0, 0])  # One-hot: cat

# Good prediction
y_pred_good = np.array([0.9, 0.05, 0.05])
loss_good = cross_entropy(y_true, y_pred_good)
print(f"Good prediction: {y_pred_good}")
print(f"Loss: {loss_good:.4f}")  # Low loss

# Bad prediction
y_pred_bad = np.array([0.1, 0.6, 0.3])
loss_bad = cross_entropy(y_true, y_pred_bad)
print(f"\nBad prediction: {y_pred_bad}")
print(f"Loss: {loss_bad:.4f}")  # High loss
```

### 5.4 Cross-Entropy for Binary Classification

When there are only 2 classes (e.g., spam/not spam):

```
Binary Cross-Entropy = -[y × log(ŷ) + (1-y) × log(1-ŷ)]

Where:
- y = true label (0 or 1)
- ŷ = predicted probability of class 1
```

```python
def binary_cross_entropy(y_true, y_pred):
    y_pred = np.clip(y_pred, 1e-15, 1 - 1e-15)
    return -np.mean(
        y_true * np.log(y_pred) + 
        (1 - y_true) * np.log(1 - y_pred)
    )

# Example
y_true = np.array([1, 0, 1, 1])  # True labels
y_pred = np.array([0.9, 0.2, 0.8, 0.7])  # Predictions

loss = binary_cross_entropy(y_true, y_pred)
print(f"Binary cross-entropy: {loss:.4f}")
```

---

## 📊 Part 6: Expected Value and Variance

### 6.1 Expected Value (Mean)

The "average" outcome if you repeated an experiment many times:

```
E[X] = Σ xᵢ × P(xᵢ)

Example: Expected value of a fair die
E[X] = 1×(1/6) + 2×(1/6) + 3×(1/6) + 4×(1/6) + 5×(1/6) + 6×(1/6)
     = 21/6 = 3.5
```

### 6.2 Variance

How "spread out" the values are:

```
Var(X) = E[(X - μ)²] = E[X²] - E[X]²

Standard Deviation: σ = √Var(X)
```

```python
import numpy as np

# Simulating dice rolls
rolls = np.random.randint(1, 7, 10000)

print(f"Mean: {rolls.mean():.4f}")  # ~3.5
print(f"Variance: {rolls.var():.4f}")  # ~2.92
print(f"Std: {rolls.std():.4f}")  # ~1.71
```

### 6.3 Why It Matters for AI

```python
# Batch Normalization uses mean and variance!
def batch_norm(x, epsilon=1e-5):
    mean = x.mean(axis=0)
    var = x.var(axis=0)
    x_norm = (x - mean) / np.sqrt(var + epsilon)
    return x_norm

# Normalize a batch
batch = np.random.randn(32, 100)  # 32 samples, 100 features
normalized = batch_norm(batch)

print(f"Before: mean={batch.mean():.4f}, std={batch.std():.4f}")
print(f"After: mean={normalized.mean():.4f}, std={normalized.std():.4f}")
```

---

## 🔗 Part 7: Maximum Likelihood Estimation

### 7.1 The Idea

**Goal:** Find parameters that make the observed data most likely.

```
We have data: D = [x₁, x₂, ..., xₙ]
Model has parameters: θ

Question: What θ makes P(D|θ) highest?

Likelihood: L(θ) = P(D|θ) = P(x₁|θ) × P(x₂|θ) × ... × P(xₙ|θ)

We want to maximize L(θ)
```

### 7.2 Log-Likelihood (Easier to Work With)

```
Products are hard. Sums are easy.
log(a × b) = log(a) + log(b)

Log-likelihood: log L(θ) = Σ log P(xᵢ|θ)

Maximizing log L(θ) = Same as maximizing L(θ)
```

### 7.3 Connection to Cross-Entropy

```
Minimizing negative log-likelihood = Minimizing cross-entropy!

This is why we use cross-entropy loss in neural networks:
Training = Maximum likelihood estimation
```

---

## 🛠️ Hands-On Project: Naive Bayes Classifier

```python
import numpy as np

class NaiveBayesClassifier:
    """
    Simple Naive Bayes for spam detection.
    Uses Bayes' theorem to classify text.
    """
    
    def __init__(self):
        self.word_probs_spam = {}
        self.word_probs_ham = {}
        self.p_spam = 0.5
    
    def fit(self, texts, labels):
        """Train on labeled text data."""
        spam_texts = [t for t, l in zip(texts, labels) if l == 1]
        ham_texts = [t for t, l in zip(texts, labels) if l == 0]
        
        # Prior probability
        self.p_spam = len(spam_texts) / len(texts)
        
        # Word probabilities (with Laplace smoothing)
        all_words = set()
        for text in texts:
            all_words.update(text.lower().split())
        
        vocab_size = len(all_words)
        
        # Count words in spam
        spam_word_count = {}
        total_spam_words = 0
        for text in spam_texts:
            for word in text.lower().split():
                spam_word_count[word] = spam_word_count.get(word, 0) + 1
                total_spam_words += 1
        
        # Count words in ham
        ham_word_count = {}
        total_ham_words = 0
        for text in ham_texts:
            for word in text.lower().split():
                ham_word_count[word] = ham_word_count.get(word, 0) + 1
                total_ham_words += 1
        
        # Compute probabilities with Laplace smoothing
        for word in all_words:
            self.word_probs_spam[word] = (spam_word_count.get(word, 0) + 1) / (total_spam_words + vocab_size)
            self.word_probs_ham[word] = (ham_word_count.get(word, 0) + 1) / (total_ham_words + vocab_size)
    
    def predict_proba(self, text):
        """Predict probability of spam."""
        words = text.lower().split()
        
        # Log probabilities (to avoid underflow)
        log_p_spam = np.log(self.p_spam)
        log_p_ham = np.log(1 - self.p_spam)
        
        for word in words:
            if word in self.word_probs_spam:
                log_p_spam += np.log(self.word_probs_spam[word])
                log_p_ham += np.log(self.word_probs_ham[word])
        
        # Convert back to probabilities
        max_log = max(log_p_spam, log_p_ham)
        p_spam = np.exp(log_p_spam - max_log)
        p_ham = np.exp(log_p_ham - max_log)
        
        total = p_spam + p_ham
        return p_spam / total
    
    def predict(self, text):
        """Predict class (0=ham, 1=spam)."""
        return 1 if self.predict_proba(text) > 0.5 else 0

# Example usage
texts = [
    "free money click now",
    "free lottery winner",
    "hi how are you doing",
    "meeting tomorrow at noon",
    "free gift for you",
    "project deadline reminder",
]
labels = [1, 1, 0, 0, 1, 0]  # 1=spam, 0=ham

clf = NaiveBayesClassifier()
clf.fit(texts, labels)

# Test
test_emails = [
    "free money now",
    "project meeting tomorrow"
]

for email in test_emails:
    prob = clf.predict_proba(email)
    pred = clf.predict(email)
    print(f"'{email}'")
    print(f"  P(spam) = {prob:.2%}, Prediction: {'SPAM' if pred else 'HAM'}\n")
```

---

## 📋 Quick Reference Card

| Concept | Formula | Use |
|---------|---------|-----|
| Probability | P(A) = favorable/total | Basic likelihood |
| Conditional | P(A\|B) = P(A∩B)/P(B) | Given condition |
| Bayes | P(A\|B) = P(B\|A)P(A)/P(B) | Flip conditionals |
| Softmax | eᶻⁱ/Σeᶻʲ | Scores → probabilities |
| Cross-Entropy | -Σy log(ŷ) | Classification loss |
| Expected Value | E[X] = Σxᵢ P(xᵢ) | Average outcome |
| Variance | Var(X) = E[(X-μ)²] | Spread |

---

## ⚠️ Common Mistakes

| Mistake | Problem | Fix |
|---------|---------|-----|
| Forgetting to normalize | Probabilities don't sum to 1 | Always divide by sum |
| log(0) | Undefined, returns -∞ | Clip predictions: max(pred, 1e-15) |
| Ignoring numerical stability | Overflow in exp() | Subtract max before softmax |
| Confusing P(A\|B) with P(B\|A) | Completely different! | Draw Venn diagrams |

---

## 🎤 Interview Questions

### Beginner

**Q1: What does softmax do and why is it used?**
> Softmax converts raw scores (logits) to probabilities between 0-1 that sum to 1. It's used as the final layer for multi-class classification so outputs can be interpreted as class probabilities.

**Q2: What is cross-entropy loss?**
> Cross-entropy measures how different the predicted probability distribution is from the true distribution. It's -Σy log(ŷ). It heavily penalizes confident wrong predictions.

### Intermediate

**Q3: Why use log in cross-entropy instead of just squared error?**
> Log provides stronger gradients when predictions are very wrong. With squared error, if true=1 and pred=0.01, gradient is small. With cross-entropy, -log(0.01)=4.6 provides strong learning signal.

**Q4: Explain the temperature parameter in softmax.**
> Temperature T scales logits before softmax. T<1 makes distribution sharper (more confident), T>1 makes it flatter (more random). Used in LLM generation to control creativity.

### Advanced

**Q5: How does maximum likelihood connect to cross-entropy?**
> Minimizing cross-entropy is equivalent to maximizing log-likelihood. Cross-entropy loss is the negative log-likelihood of the correct class. Training neural networks is essentially maximum likelihood estimation.

---

## ✅ Key Takeaways

1. **Probability** = likelihood of events (0 to 1)
2. **Bayes** = updating beliefs with evidence
3. **Softmax** = convert scores to probabilities
4. **Cross-Entropy** = loss for classification
5. **Training** = maximum likelihood estimation

---

## 🔜 Next Up

You've completed the math foundations! Now continue to:
→ [03-Neural-Networks.md](./03-Neural-Networks.md)

Time to build actual neural networks using everything you've learned!

*Vectors ✓ → Calculus ✓ → Probability ✓ → Next: Neural Networks!* 🧠
