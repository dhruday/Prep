# 📊 Matplotlib & Seaborn for ML Visualization

## 📚 Table of Contents
1. [What is Matplotlib?](#-what-is-matplotlib)
2. [What is Seaborn?](#-what-is-seaborn)
3. [Why Visualization for ML?](#-why-visualization-for-ml)
4. [Setup & Imports](#-setup--imports)
5. [Matplotlib Basics](#-matplotlib-basics)
6. [Common Plot Types](#-common-plot-types)
7. [Seaborn for Statistical Plots](#-seaborn-for-statistical-plots)
8. [ML-Specific Visualizations](#-ml-specific-visualizations)
9. [Customization & Styling](#-customization--styling)
10. [Subplots & Multiple Figures](#-subplots--multiple-figures)
11. [Saving Figures](#-saving-figures)
12. [Common ML Visualization Patterns](#-common-ml-visualization-patterns)
13. [Mini Project](#-mini-project)
14. [Exercises](#-exercises)

---

## 🎯 What is Matplotlib?

```
Matplotlib = "MATLAB-style plotting for Python"

Think of it as:
┌────────────────────────────────────────────────┐
│  The foundation of Python plotting             │
│  + Low-level control (like CSS for charts)     │
│  + Highly customizable                         │
│  = Power but verbosity                         │
└────────────────────────────────────────────────┘
```

**What it does:**
- Creates static, animated, and interactive visualizations
- Foundation for Seaborn, Pandas plotting, and others
- Publication-quality figures

---

## 🎨 What is Seaborn?

```
Seaborn = "Beautiful statistical graphics built on Matplotlib"

Think of it as:
┌────────────────────────────────────────────────┐
│  Matplotlib with beautiful defaults            │
│  + Statistical functions built-in              │
│  + Less code for complex plots                 │
│  = Prettier, easier, perfect for ML            │
└────────────────────────────────────────────────┘
```

**When to use what:**

```python
Matplotlib:
✅ Full control needed
✅ Custom visualizations
✅ Low-level adjustments

Seaborn:
✅ Statistical plots
✅ Quick beautiful plots
✅ Data exploration
✅ ML model analysis
```

---

## 🤔 Why Visualization for ML?

### The Reality of ML Development

```
ML Without Visualization:
┌────────────────────────────────────────────┐
│  Train model → 85% accuracy                │
│  "Is this good? Why? What's wrong?"        │
│  → BLIND! Can't debug or improve           │
└────────────────────────────────────────────┘

ML With Visualization:
┌────────────────────────────────────────────┐
│  Plot data distribution                    │
│  → "Ah! Class imbalance problem"           │
│                                            │
│  Plot training curves                      │
│  → "Model is overfitting after epoch 5"    │
│                                            │
│  Plot confusion matrix                     │
│  → "Confusing cats with dogs"              │
│                                            │
│  → Can fix problems systematically!        │
└────────────────────────────────────────────┘
```

**You WILL use visualization for:**
- ✅ Data exploration (distributions, outliers, correlations)
- ✅ Feature understanding (relationships, patterns)
- ✅ Model debugging (training curves, loss plots)
- ✅ Results presentation (confusion matrix, ROC curves)
- ✅ Communication (explain to stakeholders)

---

## 🛠️ Setup & Imports

### Installation

```bash
pip install matplotlib seaborn
```

### Standard Imports

```python
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
import pandas as pd

# Set style (optional but recommended)
sns.set_style('whitegrid')  # Options: white, dark, whitegrid, darkgrid, ticks

# High-resolution plots (for Jupyter)
%matplotlib inline  # In Jupyter notebooks
%config InlineBackend.figure_format = 'retina'
```

---

## 📈 Matplotlib Basics

### Anatomy of a Plot

```
┌────────────────────────────────────────────┐
│  Title                                     │
│  ┌──────────────────────────────────────┐  │
│  │ Y                                    │  │
│  │ -axis  [  DATA  ]                    │  │
│  │ label                                │  │
│  │                                      │  │
│  └──────────────────────────────────────┘  │
│           X-axis label                     │
│           Legend                           │
└────────────────────────────────────────────┘
```

### Basic Line Plot

```python
import matplotlib.pyplot as plt
import numpy as np

# Data
x = np.linspace(0, 10, 100)  # 100 points from 0 to 10
y = np.sin(x)

# Create plot
plt.figure(figsize=(10, 6))  # Width, height in inches
plt.plot(x, y)
plt.xlabel('X values')
plt.ylabel('Y values')
plt.title('Simple Sine Wave')
plt.grid(True)
plt.show()
```

### Multiple Lines

```python
x = np.linspace(0, 10, 100)
y1 = np.sin(x)
y2 = np.cos(x)

plt.figure(figsize=(10, 6))
plt.plot(x, y1, label='sin(x)', color='blue', linewidth=2)
plt.plot(x, y2, label='cos(x)', color='red', linewidth=2, linestyle='--')
plt.xlabel('X')
plt.ylabel('Y')
plt.title('Sine and Cosine')
plt.legend()
plt.grid(True)
plt.show()
```

### Scatter Plot

```python
# Random data
x = np.random.randn(50)
y = np.random.randn(50)
colors = np.random.rand(50)
sizes = 1000 * np.random.rand(50)

plt.figure(figsize=(10, 6))
plt.scatter(x, y, c=colors, s=sizes, alpha=0.5, cmap='viridis')
plt.colorbar()  # Show color scale
plt.xlabel('X')
plt.ylabel('Y')
plt.title('Scatter Plot')
plt.show()
```

---

## 📊 Common Plot Types

### 1. Histogram

```python
# Distribution of data
data = np.random.randn(1000)

plt.figure(figsize=(10, 6))
plt.hist(data, bins=30, alpha=0.7, color='skyblue', edgecolor='black')
plt.xlabel('Value')
plt.ylabel('Frequency')
plt.title('Distribution (Histogram)')
plt.axvline(data.mean(), color='red', linestyle='--', label=f'Mean: {data.mean():.2f}')
plt.legend()
plt.show()
```

### 2. Bar Chart

```python
categories = ['A', 'B', 'C', 'D']
values = [25, 40, 30, 55]

plt.figure(figsize=(8, 6))
plt.bar(categories, values, color=['red', 'green', 'blue', 'orange'])
plt.xlabel('Category')
plt.ylabel('Value')
plt.title('Bar Chart')
plt.show()

# Horizontal bar chart
plt.barh(categories, values)
plt.show()
```

### 3. Box Plot

```python
# Show distribution with quartiles
data = [np.random.normal(0, std, 100) for std in range(1, 4)]

plt.figure(figsize=(10, 6))
plt.boxplot(data, labels=['Group 1', 'Group 2', 'Group 3'])
plt.ylabel('Value')
plt.title('Box Plot - Distribution Comparison')
plt.grid(True)
plt.show()
```

### 4. Pie Chart

```python
sizes = [30, 25, 20, 25]
labels = ['Category A', 'Category B', 'Category C', 'Category D']
colors = ['gold', 'lightblue', 'lightgreen', 'pink']
explode = (0.1, 0, 0, 0)  # Explode 1st slice

plt.figure(figsize=(8, 8))
plt.pie(sizes, explode=explode, labels=labels, colors=colors,
        autopct='%1.1f%%', shadow=True, startangle=90)
plt.title('Pie Chart')
plt.show()
```

### 5. Heatmap (Correlation Matrix)

```python
import seaborn as sns
import pandas as pd

# Sample data
df = pd.DataFrame(np.random.randn(10, 5), columns=['A', 'B', 'C', 'D', 'E'])
corr = df.corr()

plt.figure(figsize=(10, 8))
sns.heatmap(corr, annot=True, cmap='coolwarm', center=0,
            square=True, linewidths=1, cbar_kws={"shrink": 0.8})
plt.title('Correlation Heatmap')
plt.show()
```

---

## 🎨 Seaborn for Statistical Plots

### 1. Distribution Plot

```python
import seaborn as sns

# Sample data
data = np.random.randn(1000)

plt.figure(figsize=(10, 6))
sns.histplot(data, kde=True, bins=30)  # KDE = Kernel Density Estimate
plt.title('Distribution with KDE')
plt.show()
```

### 2. Count Plot (Categorical)

```python
# Titanic dataset example
titanic = sns.load_dataset('titanic')

plt.figure(figsize=(10, 6))
sns.countplot(data=titanic, x='class', hue='survived')
plt.title('Survival Count by Class')
plt.show()
```

### 3. Violin Plot

```python
plt.figure(figsize=(10, 6))
sns.violinplot(data=titanic, x='class', y='age', hue='survived', split=True)
plt.title('Age Distribution by Class and Survival')
plt.show()
```

### 4. Pairplot (Multiple Variables)

```python
# Iris dataset
iris = sns.load_dataset('iris')

# Scatter matrix for all features
sns.pairplot(iris, hue='species', diag_kind='kde')
plt.suptitle('Iris Dataset Pairplot', y=1.02)
plt.show()
```

### 5. Joint Plot

```python
plt.figure(figsize=(10, 8))
sns.jointplot(data=iris, x='sepal_length', y='sepal_width', 
              hue='species', kind='scatter')
plt.show()

# With KDE
sns.jointplot(data=iris, x='sepal_length', y='sepal_width', kind='kde')
plt.show()
```

---

## 🤖 ML-Specific Visualizations

### 1. Training Curves

```python
# Simulated training history
epochs = range(1, 51)
train_loss = [0.9 - 0.01*e + 0.05*np.random.rand() for e in epochs]
val_loss = [0.95 - 0.008*e + 0.08*np.random.rand() for e in epochs]

plt.figure(figsize=(12, 5))

# Loss plot
plt.subplot(1, 2, 1)
plt.plot(epochs, train_loss, label='Training Loss', linewidth=2)
plt.plot(epochs, val_loss, label='Validation Loss', linewidth=2)
plt.xlabel('Epoch')
plt.ylabel('Loss')
plt.title('Model Loss Over Time')
plt.legend()
plt.grid(True)

# Accuracy plot
train_acc = [0.5 + 0.008*e - 0.02*np.random.rand() for e in epochs]
val_acc = [0.48 + 0.007*e - 0.03*np.random.rand() for e in epochs]

plt.subplot(1, 2, 2)
plt.plot(epochs, train_acc, label='Training Accuracy', linewidth=2)
plt.plot(epochs, val_acc, label='Validation Accuracy', linewidth=2)
plt.xlabel('Epoch')
plt.ylabel('Accuracy')
plt.title('Model Accuracy Over Time')
plt.legend()
plt.grid(True)

plt.tight_layout()
plt.show()
```

### 2. Confusion Matrix

```python
from sklearn.metrics import confusion_matrix, ConfusionMatrixDisplay

# True labels and predictions
y_true = [0, 1, 0, 1, 0, 1, 0, 1, 1, 1]
y_pred = [0, 1, 0, 0, 0, 1, 1, 1, 1, 0]

cm = confusion_matrix(y_true, y_pred)

plt.figure(figsize=(8, 6))
disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=['Class 0', 'Class 1'])
disp.plot(cmap='Blues', values_format='d')
plt.title('Confusion Matrix')
plt.show()

# Using Seaborn (prettier)
plt.figure(figsize=(8, 6))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
            xticklabels=['Class 0', 'Class 1'],
            yticklabels=['Class 0', 'Class 1'])
plt.ylabel('True Label')
plt.xlabel('Predicted Label')
plt.title('Confusion Matrix')
plt.show()
```

### 3. ROC Curve

```python
from sklearn.metrics import roc_curve, auc

# Simulated probabilities and labels
y_true = np.array([0, 0, 1, 1, 0, 1, 1, 0, 1, 1])
y_scores = np.array([0.1, 0.4, 0.35, 0.8, 0.2, 0.7, 0.9, 0.3, 0.85, 0.95])

fpr, tpr, thresholds = roc_curve(y_true, y_scores)
roc_auc = auc(fpr, tpr)

plt.figure(figsize=(8, 6))
plt.plot(fpr, tpr, color='darkorange', lw=2, label=f'ROC curve (AUC = {roc_auc:.2f})')
plt.plot([0, 1], [0, 1], color='navy', lw=2, linestyle='--', label='Random Classifier')
plt.xlim([0.0, 1.0])
plt.ylim([0.0, 1.05])
plt.xlabel('False Positive Rate')
plt.ylabel('True Positive Rate')
plt.title('Receiver Operating Characteristic (ROC) Curve')
plt.legend(loc="lower right")
plt.grid(True)
plt.show()
```

### 4. Feature Importance

```python
features = ['Feature A', 'Feature B', 'Feature C', 'Feature D', 'Feature E']
importance = [0.35, 0.25, 0.20, 0.12, 0.08]

# Sort by importance
sorted_idx = np.argsort(importance)
features_sorted = [features[i] for i in sorted_idx]
importance_sorted = [importance[i] for i in sorted_idx]

plt.figure(figsize=(10, 6))
plt.barh(features_sorted, importance_sorted, color='skyblue')
plt.xlabel('Importance')
plt.title('Feature Importance')
plt.grid(axis='x')
plt.show()
```

### 5. Learning Rate Finder

```python
learning_rates = np.logspace(-6, 0, 100)
losses = [10 * lr**0.5 + 0.1 * np.random.rand() if lr < 0.01 
          else 0.5 + 100*(lr - 0.01)**2 + 0.1*np.random.rand() 
          for lr in learning_rates]

plt.figure(figsize=(10, 6))
plt.plot(learning_rates, losses, linewidth=2)
plt.xscale('log')
plt.xlabel('Learning Rate (log scale)')
plt.ylabel('Loss')
plt.title('Learning Rate Finder')
plt.axvline(x=0.01, color='r', linestyle='--', label='Suggested LR')
plt.legend()
plt.grid(True)
plt.show()
```

---

## 🎨 Customization & Styling

### Colors

```python
# Named colors
plt.plot(x, y, color='red')
plt.plot(x, y, color='green')

# Hex colors
plt.plot(x, y, color='#FF5733')

# RGB tuples
plt.plot(x, y, color=(0.2, 0.4, 0.6))

# Colormaps
plt.scatter(x, y, c=values, cmap='viridis')  # Options: viridis, plasma, inferno, magma, jet, rainbow
```

### Line Styles

```python
plt.plot(x, y, linestyle='-')   # Solid (default)
plt.plot(x, y, linestyle='--')  # Dashed
plt.plot(x, y, linestyle='-.')  # Dash-dot
plt.plot(x, y, linestyle=':')   # Dotted

# Shorthand
plt.plot(x, y, 'r--')  # Red dashed line
plt.plot(x, y, 'go-')  # Green circles with line
plt.plot(x, y, 'b^')   # Blue triangles
```

### Markers

```python
plt.plot(x, y, marker='o')   # Circles
plt.plot(x, y, marker='s')   # Squares
plt.plot(x, y, marker='^')   # Triangles
plt.plot(x, y, marker='*')   # Stars
plt.plot(x, y, marker='D')   # Diamonds
```

### Figure Size & DPI

```python
plt.figure(figsize=(12, 8))  # Width, height in inches
plt.figure(dpi=100)          # Dots per inch (resolution)

# High-quality figure
fig = plt.figure(figsize=(10, 6), dpi=150)
```

### Themes/Styles

```python
# Matplotlib styles
plt.style.use('ggplot')  # Options: ggplot, seaborn, bmh, fivethirtyeight, etc.

# Seaborn styles
sns.set_style('darkgrid')  # Options: white, dark, whitegrid, darkgrid, ticks

# Context (size scaling)
sns.set_context('talk')  # Options: paper, notebook, talk, poster

# Color palette
sns.set_palette('husl')  # Options: deep, muted, pastel, bright, dark, colorblind
```

---

## 📐 Subplots & Multiple Figures

### Basic Subplots

```python
fig, axes = plt.subplots(2, 2, figsize=(12, 10))

# Access individual axes
axes[0, 0].plot(x, np.sin(x))
axes[0, 0].set_title('Sine')

axes[0, 1].plot(x, np.cos(x))
axes[0, 1].set_title('Cosine')

axes[1, 0].plot(x, np.tan(x))
axes[1, 0].set_title('Tangent')

axes[1, 1].plot(x, x**2)
axes[1, 1].set_title('Quadratic')

plt.tight_layout()
plt.show()
```

### GridSpec (Advanced Layouts)

```python
import matplotlib.gridspec as gridspec

fig = plt.figure(figsize=(12, 8))
gs = gridspec.GridSpec(3, 3)

# Large plot spanning multiple cells
ax1 = fig.add_subplot(gs[0:2, :])  # Top 2 rows, all columns
ax1.plot(x, np.sin(x))
ax1.set_title('Main Plot')

# Smaller plots
ax2 = fig.add_subplot(gs[2, 0])
ax2.plot(x, np.cos(x))

ax3 = fig.add_subplot(gs[2, 1:])
ax3.plot(x, np.tan(x))

plt.tight_layout()
plt.show()
```

---

## 💾 Saving Figures

```python
# Save as PNG (raster)
plt.savefig('plot.png', dpi=300, bbox_inches='tight')

# Save as PDF (vector - best for papers)
plt.savefig('plot.pdf', bbox_inches='tight')

# Save as SVG (vector - best for web)
plt.savefig('plot.svg', bbox_inches='tight')

# With transparent background
plt.savefig('plot.png', dpi=300, bbox_inches='tight', transparent=True)

# Multiple formats
formats = ['png', 'pdf', 'svg']
for fmt in formats:
    plt.savefig(f'plot.{fmt}', dpi=300, bbox_inches='tight')
```

---

## 🎯 Common ML Visualization Patterns

### Pattern 1: Data Exploration Dashboard

```python
import pandas as pd
import seaborn as sns

# Load data
df = sns.load_dataset('iris')

fig, axes = plt.subplots(2, 2, figsize=(15, 12))

# Distribution of target
axes[0, 0].pie(df['species'].value_counts(), labels=df['species'].unique(), autopct='%1.1f%%')
axes[0, 0].set_title('Species Distribution')

# Feature distributions
df['sepal_length'].hist(ax=axes[0, 1], bins=20, edgecolor='black')
axes[0, 1].set_title('Sepal Length Distribution')
axes[0, 1].set_xlabel('Sepal Length')

# Boxplot
df.boxplot(column='petal_length', by='species', ax=axes[1, 0])
axes[1, 0].set_title('Petal Length by Species')

# Correlation heatmap
numeric_df = df.select_dtypes(include=[np.number])
sns.heatmap(numeric_df.corr(), annot=True, ax=axes[1, 1], cmap='coolwarm')
axes[1, 1].set_title('Feature Correlations')

plt.tight_layout()
plt.show()
```

### Pattern 2: Model Training Visualization

```python
def plot_training_history(history):
    """Plot training and validation metrics."""
    fig, axes = plt.subplots(1, 2, figsize=(15, 5))
    
    # Loss
    axes[0].plot(history['train_loss'], label='Train Loss', linewidth=2)
    axes[0].plot(history['val_loss'], label='Val Loss', linewidth=2)
    axes[0].set_xlabel('Epoch')
    axes[0].set_ylabel('Loss')
    axes[0].set_title('Training and Validation Loss')
    axes[0].legend()
    axes[0].grid(True)
    
    # Accuracy
    axes[1].plot(history['train_acc'], label='Train Accuracy', linewidth=2)
    axes[1].plot(history['val_acc'], label='Val Accuracy', linewidth=2)
    axes[1].set_xlabel('Epoch')
    axes[1].set_ylabel('Accuracy')
    axes[1].set_title('Training and Validation Accuracy')
    axes[1].legend()
    axes[1].grid(True)
    
    plt.tight_layout()
    plt.show()

# Usage
history = {
    'train_loss': [0.9, 0.7, 0.5, 0.4, 0.3],
    'val_loss': [0.95, 0.75, 0.6, 0.55, 0.5],
    'train_acc': [0.6, 0.75, 0.85, 0.9, 0.95],
    'val_acc': [0.58, 0.72, 0.8, 0.85, 0.87]
}
plot_training_history(history)
```

### Pattern 3: Model Evaluation Dashboard

```python
from sklearn.metrics import confusion_matrix, classification_report

def plot_evaluation_dashboard(y_true, y_pred, y_scores, class_names):
    """Comprehensive evaluation dashboard."""
    fig = plt.figure(figsize=(15, 10))
    gs = gridspec.GridSpec(2, 2)
    
    # Confusion Matrix
    ax1 = fig.add_subplot(gs[0, 0])
    cm = confusion_matrix(y_true, y_pred)
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', ax=ax1,
                xticklabels=class_names, yticklabels=class_names)
    ax1.set_ylabel('True Label')
    ax1.set_xlabel('Predicted Label')
    ax1.set_title('Confusion Matrix')
    
    # ROC Curve
    ax2 = fig.add_subplot(gs[0, 1])
    fpr, tpr, _ = roc_curve(y_true, y_scores)
    roc_auc = auc(fpr, tpr)
    ax2.plot(fpr, tpr, lw=2, label=f'AUC = {roc_auc:.2f}')
    ax2.plot([0, 1], [0, 1], 'k--', lw=2)
    ax2.set_xlabel('False Positive Rate')
    ax2.set_ylabel('True Positive Rate')
    ax2.set_title('ROC Curve')
    ax2.legend()
    ax2.grid(True)
    
    # Class distribution
    ax3 = fig.add_subplot(gs[1, :])
    unique, counts = np.unique(y_true, return_counts=True)
    ax3.bar(class_names, counts, alpha=0.7, label='True')
    unique_pred, counts_pred = np.unique(y_pred, return_counts=True)
    ax3.bar(class_names, counts_pred, alpha=0.7, label='Predicted')
    ax3.set_ylabel('Count')
    ax3.set_title('Class Distribution')
    ax3.legend()
    ax3.grid(axis='y')
    
    plt.tight_layout()
    plt.show()
```

---

## 🚀 Mini Project: Iris Dataset Visualization

```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import confusion_matrix, classification_report

# Load data
iris = load_iris()
X, y = iris.data, iris.target
feature_names = iris.feature_names
target_names = iris.target_names

# Create DataFrame
df = pd.DataFrame(X, columns=feature_names)
df['species'] = [target_names[i] for i in y]

# 1. Data Exploration
fig, axes = plt.subplots(2, 2, figsize=(15, 12))

# Pairplot
sns.pairplot(df, hue='species', diag_kind='kde')
plt.suptitle('Iris Dataset Pairplot', y=1.02)
plt.show()

# 2. Feature Distributions
fig, axes = plt.subplots(2, 2, figsize=(15, 10))
for idx, col in enumerate(feature_names):
    ax = axes[idx // 2, idx % 2]
    for species in target_names:
        data = df[df['species'] == species][col]
        ax.hist(data, alpha=0.5, label=species, bins=15)
    ax.set_xlabel(col)
    ax.set_ylabel('Frequency')
    ax.set_title(f'Distribution of {col}')
    ax.legend()
    ax.grid(True)
plt.tight_layout()
plt.show()

# 3. Train a model
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)
model = LogisticRegression(max_iter=200)
model.fit(X_train, y_train)
y_pred = model.predict(X_test)

# 4. Model Evaluation Visualizations
# Confusion Matrix
cm = confusion_matrix(y_test, y_pred)
plt.figure(figsize=(8, 6))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
            xticklabels=target_names, yticklabels=target_names)
plt.ylabel('True Label')
plt.xlabel('Predicted Label')
plt.title('Confusion Matrix - Iris Classification')
plt.show()

# Classification Report
print("Classification Report:")
print(classification_report(y_test, y_pred, target_names=target_names))

# Feature Importance
coefficients = np.abs(model.coef_).mean(axis=0)
feature_importance = pd.DataFrame({
    'feature': feature_names,
    'importance': coefficients
}).sort_values('importance', ascending=True)

plt.figure(figsize=(10, 6))
plt.barh(feature_importance['feature'], feature_importance['importance'])
plt.xlabel('Importance (Average Absolute Coefficient)')
plt.title('Feature Importance')
plt.grid(axis='x')
plt.show()
```

---

## 📝 Exercises

### Easy

1. Create a line plot of y = x² for x from -10 to 10
2. Make a bar chart showing the frequency of each letter in "HELLO WORLD"
3. Plot a histogram of 1000 random numbers from a normal distribution
4. Create a scatter plot with 100 random points, colored by their y-value

### Medium

5. Create a 2×2 subplot showing sin, cos, tan, and x²
6. Load the Titanic dataset and create a count plot of survival by passenger class
7. Make a correlation heatmap for the Titanic numeric features
8. Plot the distribution of ages for survivors vs non-survivors using violin plots

### Advanced

9. Create a complete data exploration dashboard for any dataset (4+ plots)
10. Implement a function that plots training curves with overfitting detection
11. Build a confusion matrix visualization function that works for multi-class problems
12. Create an animated plot showing gradient descent optimization

---

## 🎯 Key Takeaways

✅ **Visualization is essential for ML** - You can't debug what you can't see

✅ **Matplotlib = control, Seaborn = beauty** - Use both!

✅ **Always plot training curves** - Catch overfitting early

✅ **Confusion matrices reveal model weaknesses** - Which classes are confused?

✅ **Data exploration first** - Understand data before modeling

✅ **Save publication-quality figures** - Use high DPI and vector formats

---

## 🔜 Next Steps

Continue to → [09-Data-Preprocessing-Patterns.md](./09-Data-Preprocessing-Patterns.md)

Now that you can **load**, **manipulate**, and **visualize** data, let's learn the **complete preprocessing pipeline** for real ML projects!

**Remember:** A picture is worth a thousand debugging sessions! 📊
