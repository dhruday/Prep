# 🔢 NumPy Crash Course

## 📚 Table of Contents
1. [What is NumPy?](#-what-is-numpy)
2. [Arrays vs Lists](#-arrays-vs-lists)
3. [Creating Arrays](#-creating-arrays)
4. [Array Properties](#-array-properties)
5. [Indexing & Slicing](#-indexing--slicing)
6. [Operations](#-operations)
7. [Broadcasting](#-broadcasting)
8. [Reshaping](#-reshaping)
9. [Aggregations](#-aggregations)
10. [Common ML Patterns](#-common-ml-patterns)
11. [Mini Project](#-mini-project)
12. [Exercises](#-exercises)

---

## 🎯 What is NumPy?

```
NumPy = "Numerical Python"

Why NumPy is ESSENTIAL for AI/ML:

1. SPEED
   Python list:  [1, 2, 3, 4, 5]  → Slow (interpreted)
   NumPy array:  np.array([1,2,3,4,5]) → Fast (C code underneath)
   
   Speedup: 10x to 100x faster!

2. MATH OPERATIONS
   Python: Manually loop through elements
   NumPy:  Operations apply to entire arrays at once

3. MEMORY EFFICIENT
   Python list: Each element is a Python object
   NumPy array: Contiguous block of numbers (like C)

4. FOUNDATION
   PyTorch and TensorFlow are built on NumPy concepts
   Understanding NumPy = Understanding ML frameworks
```

### Installation

```bash
pip install numpy
```

```python
import numpy as np  # Always use 'np' alias
```

---

## 📊 Arrays vs Lists

### The Core Difference

```python
import numpy as np

# Python List - Element-wise operations don't work!
py_list = [1, 2, 3, 4, 5]
# py_list * 2 = [1, 2, 3, 4, 5, 1, 2, 3, 4, 5]  # Repeats!
# py_list + py_list = [1, 2, 3, 4, 5, 1, 2, 3, 4, 5]  # Concatenates!

# NumPy Array - Math just works!
np_array = np.array([1, 2, 3, 4, 5])
# np_array * 2 = array([2, 4, 6, 8, 10])  # Multiplies each!
# np_array + np_array = array([2, 4, 6, 8, 10])  # Adds each!
```

### Speed Comparison

```python
import numpy as np
import time

size = 1000000

# Python list
py_list = list(range(size))
start = time.time()
result = [x * 2 for x in py_list]
print(f"Python list: {time.time() - start:.4f}s")

# NumPy array
np_array = np.arange(size)
start = time.time()
result = np_array * 2
print(f"NumPy array: {time.time() - start:.4f}s")

# NumPy is typically 50-100x faster!
```

---

## 🏗️ Creating Arrays

### From Python Lists

```python
import numpy as np

# 1D array (vector)
arr1d = np.array([1, 2, 3, 4, 5])
print(arr1d)        # [1 2 3 4 5]
print(arr1d.shape)  # (5,)

# 2D array (matrix)
arr2d = np.array([
    [1, 2, 3],
    [4, 5, 6]
])
print(arr2d)
# [[1 2 3]
#  [4 5 6]]
print(arr2d.shape)  # (2, 3) = 2 rows, 3 columns

# 3D array (tensor)
arr3d = np.array([
    [[1, 2], [3, 4]],
    [[5, 6], [7, 8]]
])
print(arr3d.shape)  # (2, 2, 2)
```

### Using Generation Functions

```python
# Zeros
zeros = np.zeros((3, 4))  # 3x4 matrix of 0s
print(zeros)
# [[0. 0. 0. 0.]
#  [0. 0. 0. 0.]
#  [0. 0. 0. 0.]]

# Ones
ones = np.ones((2, 3))  # 2x3 matrix of 1s

# Full (custom value)
fives = np.full((2, 2), 5)  # 2x2 matrix of 5s

# Identity matrix
eye = np.eye(3)  # 3x3 identity
# [[1. 0. 0.]
#  [0. 1. 0.]
#  [0. 0. 1.]]

# Range
arr = np.arange(10)        # [0 1 2 3 4 5 6 7 8 9]
arr = np.arange(2, 10, 2)  # [2 4 6 8] (start, stop, step)

# Linspace (evenly spaced)
arr = np.linspace(0, 1, 5)  # [0.   0.25 0.5  0.75 1.  ]
# 5 values from 0 to 1

# Random
rand = np.random.rand(3, 3)      # Uniform [0, 1)
randn = np.random.randn(3, 3)    # Normal (mean=0, std=1)
randint = np.random.randint(0, 10, (3, 3))  # Integers
```

### Data Types

```python
# NumPy has explicit types (important for memory/precision)
arr = np.array([1, 2, 3], dtype=np.float32)
print(arr.dtype)  # float32

# Common types:
# np.int32, np.int64       - Integers
# np.float32, np.float64   - Floats (float32 for GPU!)
# np.bool_                 - Boolean

# In ML, we often use float32 for GPU efficiency
arr = np.array([1.0, 2.0, 3.0], dtype=np.float32)
```

---

## 📐 Array Properties

```python
arr = np.array([[1, 2, 3], [4, 5, 6]])

# Shape: dimensions of array
print(arr.shape)  # (2, 3) = 2 rows, 3 columns

# Ndim: number of dimensions
print(arr.ndim)   # 2

# Size: total number of elements
print(arr.size)   # 6

# Dtype: data type
print(arr.dtype)  # int64

# Memory layout visual:
"""
arr.shape = (2, 3)

     col 0   col 1   col 2
      ↓       ↓       ↓
row 0 → [  1  ,   2  ,   3  ]
row 1 → [  4  ,   5  ,   6  ]
"""
```

### Shape Terminology in ML

```
Shape Meaning:

(5,)           → 1D: 5 elements (vector)
(3, 4)         → 2D: 3 rows, 4 columns (matrix)
(32, 28, 28)   → 3D: 32 images of 28x28 pixels (batch of grayscale images)
(32, 28, 28, 3)→ 4D: 32 images of 28x28 with 3 color channels (batch of RGB)
(32, 10, 768) → 3D: 32 sequences of 10 tokens, 768-dim embeddings (NLP)

Common ML shapes:
(batch_size, features)              - Tabular data
(batch_size, height, width)         - Grayscale images
(batch_size, height, width, channels) - Color images
(batch_size, sequence_length, features) - Sequences/text
```

---

## 🔍 Indexing & Slicing

### Basic Indexing

```python
arr = np.array([10, 20, 30, 40, 50])

# Positive indexing (from start)
arr[0]   # 10 (first)
arr[2]   # 30

# Negative indexing (from end)
arr[-1]  # 50 (last)
arr[-2]  # 40

# Slicing: [start:stop:step]
arr[1:4]    # [20 30 40] (indices 1,2,3)
arr[:3]     # [10 20 30] (first 3)
arr[2:]     # [30 40 50] (from index 2)
arr[::2]    # [10 30 50] (every 2nd)
arr[::-1]   # [50 40 30 20 10] (reversed)
```

### 2D Indexing

```python
arr = np.array([
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9]
])

# Single element: [row, col]
arr[0, 0]  # 1 (top-left)
arr[1, 2]  # 6 (row 1, col 2)
arr[-1, -1] # 9 (bottom-right)

# Entire row
arr[0]     # [1 2 3]
arr[0, :]  # [1 2 3] (same)

# Entire column
arr[:, 0]  # [1 4 7]
arr[:, -1] # [3 6 9]

# Subarray
arr[0:2, 1:3]  # [[2 3]
               #  [5 6]]

# Visual:
"""
         col 0   col 1   col 2
          ↓       ↓       ↓
row 0 → [  1  ,   2  ,   3  ]
row 1 → [  4  ,   5  ,   6  ]
row 2 → [  7  ,   8  ,   9  ]

arr[1, 2] = element at row 1, col 2 = 6
arr[0:2, 1:3] = rows 0-1, cols 1-2
"""
```

### Boolean Indexing (VERY COMMON!)

```python
arr = np.array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])

# Create boolean mask
mask = arr > 5
print(mask)  # [False False False False False  True  True  True  True  True]

# Apply mask to filter
arr[mask]      # [6 7 8 9 10]
arr[arr > 5]   # Same thing, inline

# Multiple conditions
arr[(arr > 3) & (arr < 8)]  # [4 5 6 7]
arr[(arr < 3) | (arr > 8)]  # [1 2 9 10]

# Set values conditionally
arr[arr > 5] = 0
print(arr)  # [1 2 3 4 5 0 0 0 0 0]
```

### Fancy Indexing

```python
arr = np.array([10, 20, 30, 40, 50])

# Index with list of indices
indices = [0, 2, 4]
arr[indices]  # [10 30 50]

# 2D fancy indexing
arr2d = np.array([[1, 2], [3, 4], [5, 6]])
rows = [0, 2]
cols = [1, 0]
arr2d[rows, cols]  # [2, 5] (arr[0,1] and arr[2,0])
```

---

## ➕ Operations

### Element-wise Operations

```python
a = np.array([1, 2, 3])
b = np.array([4, 5, 6])

# Arithmetic
a + b    # [5 7 9]
a - b    # [-3 -3 -3]
a * b    # [4 10 18]
a / b    # [0.25 0.4 0.5]
a ** 2   # [1 4 9]
np.sqrt(a)  # [1. 1.414 1.732]

# Comparison (returns boolean array)
a > 2    # [False False True]
a == b   # [False False False]

# Universal functions (ufuncs)
np.exp(a)    # e^x for each element
np.log(a)    # natural log
np.sin(a)    # sine
np.abs(a)    # absolute value
```

### Matrix Operations

```python
A = np.array([[1, 2], [3, 4]])
B = np.array([[5, 6], [7, 8]])

# Element-wise multiplication
A * B
# [[ 5 12]
#  [21 32]]

# Matrix multiplication (dot product)
A @ B          # Python 3.5+
np.dot(A, B)   # Equivalent
np.matmul(A, B)  # Equivalent
# [[19 22]
#  [43 50]]

# Transpose
A.T
# [[1 3]
#  [2 4]]

# Vector dot product
v1 = np.array([1, 2, 3])
v2 = np.array([4, 5, 6])
np.dot(v1, v2)  # 32 (1*4 + 2*5 + 3*6)
```

---

## 📡 Broadcasting

**Broadcasting is the most important NumPy concept for ML!**

### What is Broadcasting?

```
Broadcasting = NumPy's way of handling arrays with different shapes

Instead of:
  for i in range(len(arr)):
      arr[i] = arr[i] + 5

You write:
  arr + 5  # NumPy "broadcasts" 5 to match arr's shape
```

### Broadcasting Rules

```
Rule 1: If arrays have different ndim, prepend 1s to smaller shape
Rule 2: Arrays with size 1 along a dimension act as if they had the larger size
Rule 3: If shapes don't match and neither is 1, error!

Examples:
(3,) + (1,)     → (3,) + (3,) ✅  # 1 becomes 3
(3, 4) + (4,)   → (3, 4) + (1, 4) → (3, 4) + (3, 4) ✅
(3, 4) + (3, 1) → (3, 4) + (3, 4) ✅
(3, 4) + (2, 4) → ERROR! ❌  # 3 != 2 and neither is 1
```

### Broadcasting Examples

```python
import numpy as np

# Scalar broadcast
arr = np.array([1, 2, 3])
arr + 10  # [11 12 13] - 10 is broadcast to [10 10 10]

# 1D to 2D
matrix = np.array([[1, 2, 3],
                   [4, 5, 6]])  # Shape (2, 3)
row = np.array([10, 20, 30])    # Shape (3,)

matrix + row
# [[11 22 33]
#  [14 25 36]]
# row is broadcast to:
# [[10 20 30]
#  [10 20 30]]

# Column broadcast (need to reshape!)
col = np.array([100, 200])         # Shape (2,)
col = col.reshape(-1, 1)           # Shape (2, 1)
# or: col = col[:, np.newaxis]

matrix + col
# [[101 102 103]
#  [204 205 206]]
# col is broadcast to:
# [[100 100 100]
#  [200 200 200]]
```

### Common ML Broadcasting Patterns

```python
# 1. Normalize data (subtract mean, divide by std)
data = np.random.randn(100, 5)  # 100 samples, 5 features
mean = data.mean(axis=0)  # Shape (5,)
std = data.std(axis=0)    # Shape (5,)
normalized = (data - mean) / std  # Broadcasting!

# 2. Add bias to all samples
weights = np.random.randn(10)   # 10 features
bias = 5.0
output = data @ weights.T + bias  # bias broadcasts

# 3. Apply softmax temperature
logits = np.array([[1.0, 2.0, 3.0], [1.0, 2.0, 3.0]])
temperature = 0.5
scaled = logits / temperature  # temperature broadcasts

# 4. Mask certain positions
mask = np.array([1, 0, 1, 0, 1])  # Shape (5,)
data = np.random.randn(10, 5)     # Shape (10, 5)
masked = data * mask              # mask broadcasts to (10, 5)
```

---

## 🔄 Reshaping

### Core Reshape Operations

```python
arr = np.arange(12)  # [0 1 2 3 4 5 6 7 8 9 10 11]

# Reshape to 2D
arr.reshape(3, 4)
# [[ 0  1  2  3]
#  [ 4  5  6  7]
#  [ 8  9 10 11]]

arr.reshape(4, 3)
# [[ 0  1  2]
#  [ 3  4  5]
#  [ 6  7  8]
#  [ 9 10 11]]

# Use -1 for automatic dimension
arr.reshape(3, -1)  # -1 means "figure it out" = (3, 4)
arr.reshape(-1, 6)  # (2, 6)
arr.reshape(-1)     # Flatten to 1D

# Flatten
arr.reshape(3, 4).flatten()   # Returns copy
arr.reshape(3, 4).ravel()     # Returns view (faster)
```

### Adding/Removing Dimensions

```python
arr = np.array([1, 2, 3])  # Shape (3,)

# Add dimension
arr[np.newaxis, :]  # Shape (1, 3) - row vector
arr[:, np.newaxis]  # Shape (3, 1) - column vector
np.expand_dims(arr, axis=0)  # Shape (1, 3)
np.expand_dims(arr, axis=1)  # Shape (3, 1)

# Remove dimension
arr2d = np.array([[1, 2, 3]])  # Shape (1, 3)
np.squeeze(arr2d)  # Shape (3,)

# Common ML pattern: Add batch dimension
image = np.random.rand(28, 28)  # Single image
batch = image[np.newaxis, ...]  # Shape (1, 28, 28)
# or: batch = np.expand_dims(image, axis=0)
```

### Transpose and Swapping Axes

```python
arr = np.array([[1, 2, 3], [4, 5, 6]])  # Shape (2, 3)

# Transpose
arr.T  # Shape (3, 2)

# For higher dimensions, use transpose with axes
arr3d = np.random.rand(2, 3, 4)  # Shape (2, 3, 4)
arr3d.transpose(1, 0, 2)         # Shape (3, 2, 4)

# Swap specific axes
np.swapaxes(arr3d, 0, 1)  # Swap axis 0 and 1
```

---

## 📊 Aggregations

### Basic Aggregations

```python
arr = np.array([[1, 2, 3],
                [4, 5, 6]])

# Global aggregations
np.sum(arr)     # 21
np.mean(arr)    # 3.5
np.std(arr)     # 1.707...
np.var(arr)     # 2.916...
np.min(arr)     # 1
np.max(arr)     # 6
np.prod(arr)    # 720 (product)

# Along axis
np.sum(arr, axis=0)   # [5 7 9] - sum down columns
np.sum(arr, axis=1)   # [6 15] - sum across rows
np.mean(arr, axis=0)  # [2.5 3.5 4.5]
np.mean(arr, axis=1)  # [2. 5.]

# Keep dimensions (useful for broadcasting back)
np.sum(arr, axis=1, keepdims=True)
# [[ 6]
#  [15]]  # Shape (2, 1) instead of (2,)
```

### Finding Elements

```python
arr = np.array([3, 1, 4, 1, 5, 9, 2, 6])

np.argmax(arr)   # 5 (index of max value 9)
np.argmin(arr)   # 1 (index of first min value 1)
np.argsort(arr)  # [1 3 6 0 2 4 7 5] (indices that would sort)

# 2D
arr2d = np.array([[1, 5, 2], [4, 3, 6]])
np.argmax(arr2d, axis=0)  # [1 0 1] - index of max in each column
np.argmax(arr2d, axis=1)  # [1 2] - index of max in each row

# Where (find indices)
np.where(arr > 4)  # (array([4, 5, 7]),) - indices where condition true
np.where(arr > 4, arr, 0)  # Replace values <= 4 with 0
```

---

## 🧠 Common ML Patterns

### 1. Data Normalization

```python
# Min-Max normalization: scale to [0, 1]
data = np.array([[1, 100], [2, 200], [3, 300]])
min_vals = data.min(axis=0)
max_vals = data.max(axis=0)
normalized = (data - min_vals) / (max_vals - min_vals)

# Z-score normalization: mean=0, std=1
mean = data.mean(axis=0)
std = data.std(axis=0)
standardized = (data - mean) / std
```

### 2. One-Hot Encoding

```python
# Convert labels to one-hot
labels = np.array([0, 2, 1, 0, 2])
num_classes = 3

# Method 1: Using eye
one_hot = np.eye(num_classes)[labels]
# [[1. 0. 0.]
#  [0. 0. 1.]
#  [0. 1. 0.]
#  [1. 0. 0.]
#  [0. 0. 1.]]

# Method 2: Manual
one_hot = np.zeros((len(labels), num_classes))
one_hot[np.arange(len(labels)), labels] = 1
```

### 3. Softmax Function

```python
def softmax(x):
    """Compute softmax values for array x."""
    # Subtract max for numerical stability
    e_x = np.exp(x - np.max(x, axis=-1, keepdims=True))
    return e_x / e_x.sum(axis=-1, keepdims=True)

logits = np.array([[1.0, 2.0, 3.0], [1.0, 2.0, 3.0]])
probs = softmax(logits)
print(probs.sum(axis=1))  # [1. 1.] - rows sum to 1
```

### 4. Batch Processing

```python
# Simulate batch processing
data = np.random.randn(1000, 10)  # 1000 samples, 10 features
batch_size = 32

for i in range(0, len(data), batch_size):
    batch = data[i:i + batch_size]
    # Process batch...
    print(f"Batch {i//batch_size}: shape {batch.shape}")
```

### 5. Distance Computation

```python
# Euclidean distance
def euclidean_distance(a, b):
    return np.sqrt(np.sum((a - b) ** 2, axis=-1))

# Cosine similarity
def cosine_similarity(a, b):
    dot = np.sum(a * b, axis=-1)
    norm_a = np.linalg.norm(a, axis=-1)
    norm_b = np.linalg.norm(b, axis=-1)
    return dot / (norm_a * norm_b)

v1 = np.array([1, 2, 3])
v2 = np.array([4, 5, 6])
print(f"Euclidean: {euclidean_distance(v1, v2):.4f}")
print(f"Cosine: {cosine_similarity(v1, v2):.4f}")
```

---

## 🎯 Mini Project: Image Processing

```python
import numpy as np

# ============================================
# SIMULATE AN IMAGE (since we can't load one easily)
# ============================================

# Create a 28x28 "image" (like MNIST digit)
np.random.seed(42)
image = np.random.randint(0, 256, (28, 28), dtype=np.uint8)

print("Original image:")
print(f"Shape: {image.shape}")
print(f"Dtype: {image.dtype}")
print(f"Min: {image.min()}, Max: {image.max()}")

# ============================================
# NORMALIZE TO [0, 1]
# ============================================

normalized = image.astype(np.float32) / 255.0
print(f"\nNormalized: min={normalized.min():.2f}, max={normalized.max():.2f}")

# ============================================
# FLATTEN FOR NEURAL NETWORK INPUT
# ============================================

flattened = normalized.flatten()
print(f"Flattened shape: {flattened.shape}")  # (784,)

# ============================================
# CREATE BATCH
# ============================================

# Simulate 32 images
batch = np.random.randint(0, 256, (32, 28, 28), dtype=np.uint8)
batch_normalized = batch.astype(np.float32) / 255.0
batch_flattened = batch_normalized.reshape(32, -1)
print(f"Batch shape: {batch_flattened.shape}")  # (32, 784)

# ============================================
# SIMPLE CONVOLUTION (EDGE DETECTION)
# ============================================

def simple_conv2d(image, kernel):
    """Apply simple convolution (no padding)."""
    h, w = image.shape
    kh, kw = kernel.shape
    output = np.zeros((h - kh + 1, w - kw + 1))
    
    for i in range(output.shape[0]):
        for j in range(output.shape[1]):
            output[i, j] = np.sum(image[i:i+kh, j:j+kw] * kernel)
    
    return output

# Edge detection kernel
edge_kernel = np.array([
    [-1, -1, -1],
    [-1,  8, -1],
    [-1, -1, -1]
])

edges = simple_conv2d(normalized, edge_kernel)
print(f"Edge detection output shape: {edges.shape}")  # (26, 26)

# ============================================
# POOLING (DOWNSAMPLING)
# ============================================

def max_pool2d(image, size=2):
    """Simple 2x2 max pooling."""
    h, w = image.shape
    output = np.zeros((h // size, w // size))
    
    for i in range(output.shape[0]):
        for j in range(output.shape[1]):
            output[i, j] = np.max(image[i*size:(i+1)*size, j*size:(j+1)*size])
    
    return output

pooled = max_pool2d(normalized)
print(f"After pooling: {pooled.shape}")  # (14, 14)

# ============================================
# DATA AUGMENTATION (FLIP, ROTATE)
# ============================================

# Horizontal flip
flipped = normalized[:, ::-1]

# 90 degree rotation
rotated = np.rot90(normalized)

print(f"\nData augmentation:")
print(f"Flipped shape: {flipped.shape}")
print(f"Rotated shape: {rotated.shape}")

# ============================================
# SIMPLE NEURAL NETWORK FORWARD PASS
# ============================================

# Input: 784, Hidden: 128, Output: 10
np.random.seed(42)
W1 = np.random.randn(784, 128) * 0.01
b1 = np.zeros(128)
W2 = np.random.randn(128, 10) * 0.01
b2 = np.zeros(10)

def relu(x):
    return np.maximum(0, x)

def softmax(x):
    exp_x = np.exp(x - np.max(x, axis=-1, keepdims=True))
    return exp_x / exp_x.sum(axis=-1, keepdims=True)

# Forward pass
x = batch_flattened  # (32, 784)
h = relu(x @ W1 + b1)  # (32, 128)
logits = h @ W2 + b2   # (32, 10)
probs = softmax(logits)  # (32, 10)

print(f"\nNeural network forward pass:")
print(f"Input: {x.shape}")
print(f"Hidden: {h.shape}")
print(f"Output: {probs.shape}")
print(f"Predictions (first sample): {probs[0]}")
print(f"Predicted class: {np.argmax(probs[0])}")

print("\n✅ Mini project complete!")
```

---

## 📝 Exercises

### Exercise 1: Array Creation
```python
# Create these arrays using NumPy functions:
# 1. Array of 20 evenly spaced values from 0 to 5
# 2. 4x4 identity matrix
# 3. 3x3 matrix of random integers from 1 to 10
# 4. Array of 100 values from standard normal distribution
```

### Exercise 2: Indexing
```python
arr = np.arange(25).reshape(5, 5)
# Extract:
# 1. First row
# 2. Last column
# 3. 3x3 subarray from center
# 4. Every other element (checkerboard pattern)
# 5. All elements greater than 15
```

### Exercise 3: Broadcasting
```python
# Without loops:
# 1. Add 10 to every element of a 5x5 matrix
# 2. Multiply each row by [1, 2, 3, 4, 5]
# 3. Subtract mean from each column
```

### Exercise 4: Aggregations
```python
data = np.random.randn(100, 10)
# Calculate:
# 1. Mean of each column
# 2. Std of each row
# 3. Index of max value in each row
# 4. Count of elements greater than 0 in each column
```

### Exercise 5: ML Preprocessing
```python
# Implement these functions:
# 1. min_max_normalize(data) - scale to [0, 1]
# 2. z_score_normalize(data) - mean=0, std=1
# 3. one_hot_encode(labels, num_classes)
# 4. train_test_split(data, labels, test_ratio=0.2)
```

---

## ✅ Checkpoint

Before proceeding, ensure you can:

- [ ] Create arrays using `np.array`, `np.zeros`, `np.ones`, `np.random`
- [ ] Understand shape, ndim, dtype
- [ ] Use indexing: `arr[0]`, `arr[0, 1]`, `arr[:, 0]`
- [ ] Use slicing: `arr[1:3]`, `arr[::2]`
- [ ] Use boolean indexing: `arr[arr > 5]`
- [ ] Perform element-wise operations: `+`, `-`, `*`, `/`, `**`
- [ ] Perform matrix multiplication: `@` or `np.dot()`
- [ ] Explain broadcasting
- [ ] Reshape arrays: `reshape()`, `flatten()`, `np.newaxis`
- [ ] Use aggregations with `axis` parameter

**Next:** [03-PyTorch-Fundamentals.md](./03-PyTorch-Fundamentals.md)
