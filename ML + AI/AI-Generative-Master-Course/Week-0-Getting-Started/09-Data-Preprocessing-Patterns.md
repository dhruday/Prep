# 🔧 Data Preprocessing Patterns for ML

## 📚 Table of Contents
1. [Why Preprocessing Matters](#-why-preprocessing-matters)
2. [The 80/20 Rule of ML](#-the-8020-rule-of-ml)
3. [Train-Test-Validation Split](#-train-test-validation-split)
4. [Handling Missing Data](#-handling-missing-data)
5. [Feature Scaling](#-feature-scaling)
6. [Encoding Categorical Variables](#-encoding-categorical-variables)
7. [Feature Engineering Basics](#-feature-engineering-basics)
8. [Handling Imbalanced Data](#-handling-imbalanced-data)
9. [Cross-Validation](#-cross-validation)
10. [Complete Preprocessing Pipeline](#-complete-preprocessing-pipeline)
11. [Common Pitfalls & Best Practices](#-common-pitfalls--best-practices)
12. [Mini Project](#-mini-project)
13. [Exercises](#-exercises)

---

## 💡 Why Preprocessing Matters

### The Harsh Reality

```
Raw Data → ML Model → GARBAGE RESULTS ❌

Raw Data → Preprocessing → ML Model → GOOD RESULTS ✅
```

**Real-World Truth:**
```
┌─────────────────────────────────────────────────┐
│  ML Project Time Distribution:                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Data Collection & Cleaning:        40%        │
│  Preprocessing & Feature Eng:       40%        │
│  Model Training & Tuning:            15%        │
│  Deployment:                          5%        │
│                                                 │
│  → 80% of work is BEFORE modeling! ←           │
└─────────────────────────────────────────────────┘
```

### What Can Go Wrong Without Preprocessing?

```python
# Example: Age prediction model

# Scenario 1: Without scaling
Feature 1: Age (range: 0-100)
Feature 2: Salary (range: 20,000-200,000)
→ Model ignores age completely! (Salary dominates)

# Scenario 2: With scaling
Feature 1: Age (scaled: 0-1)
Feature 2: Salary (scaled: 0-1)
→ Model learns from both features ✅

# Scenario 3: Missing data
Age: [25, 30, NaN, 40, NaN]
→ Model crashes or learns wrong patterns ❌

# Scenario 4: Categorical without encoding
City: ['NYC', 'LA', 'Chicago']
→ Model can't process strings ❌
```

---

## 📊 The 80/20 Rule of ML

### What Matters Most

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Impact on Model Performance:

80% ← Data Quality & Preprocessing
15% ← Model Choice (Neural Net vs Random Forest)
 5% ← Hyperparameter Tuning
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Translation: Spend MORE time on data, LESS on fancy models!
```

---

## 🎯 Train-Test-Validation Split

### Why Split Data?

```
┌─────────────────────────────────────────────────┐
│  WITHOUT SPLITTING:                             │
│  Train on all data → Test on same data         │
│  → 99% accuracy!                                │
│  → Real world: 60% accuracy (DISASTER!)        │
│                                                 │
│  Problem: Model memorized, didn't learn!       │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  WITH PROPER SPLITTING:                         │
│  Train: 70% → Test: 30%                        │
│  → Training: 85% | Test: 82% (Realistic!)      │
│  → Real world: ~80% (Success!)                 │
└─────────────────────────────────────────────────┘
```

### Basic Train-Test Split

```python
from sklearn.model_selection import train_test_split
import pandas as pd
import numpy as np

# Sample data
X = np.array([[1, 2], [3, 4], [5, 6], [7, 8], [9, 10]])
y = np.array([0, 1, 0, 1, 0])

# Split: 80% train, 20% test
X_train, X_test, y_train, y_test = train_test_split(
    X, y, 
    test_size=0.2,        # 20% for testing
    random_state=42,      # Reproducibility
    stratify=y            # Preserve class distribution
)

print(f"Training set size: {len(X_train)}")
print(f"Test set size: {len(X_test)}")
print(f"Training labels: {y_train}")
print(f"Test labels: {y_test}")
```

### Train-Validation-Test Split

```python
# First split: Separate test set
X_temp, X_test, y_temp, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Second split: Separate validation from training
X_train, X_val, y_train, y_val = train_test_split(
    X_temp, y_temp, test_size=0.25, random_state=42  # 0.25 * 0.8 = 0.2
)

print(f"Train: {len(X_train)} ({len(X_train)/len(X)*100:.0f}%)")
print(f"Validation: {len(X_val)} ({len(X_val)/len(X)*100:.0f}%)")
print(f"Test: {len(X_test)} ({len(X_test)/len(X)*100:.0f}%)")

# Result: 60% train, 20% val, 20% test
```

### Best Practices

```python
def smart_split(X, y, test_size=0.2, val_size=0.2, random_state=42):
    """
    Split data into train, validation, and test sets.
    
    Args:
        X: Features
        y: Labels
        test_size: Proportion for test (default: 0.2)
        val_size: Proportion for validation (default: 0.2)
        random_state: Random seed for reproducibility
    
    Returns:
        X_train, X_val, X_test, y_train, y_val, y_test
    """
    # Separate test set first
    X_temp, X_test, y_temp, y_test = train_test_split(
        X, y, 
        test_size=test_size, 
        random_state=random_state,
        stratify=y  # Preserve class balance
    )
    
    # Calculate validation size from remaining data
    val_size_adjusted = val_size / (1 - test_size)
    
    # Separate validation set
    X_train, X_val, y_train, y_val = train_test_split(
        X_temp, y_temp,
        test_size=val_size_adjusted,
        random_state=random_state,
        stratify=y_temp
    )
    
    return X_train, X_val, X_test, y_train, y_val, y_test

# Usage
X_train, X_val, X_test, y_train, y_val, y_test = smart_split(X, y)
```

---

## 🕳️ Handling Missing Data

### Identifying Missing Data

```python
import pandas as pd
import numpy as np

# Sample data with missing values
df = pd.DataFrame({
    'Age': [25, 30, np.nan, 40, np.nan, 50],
    'Salary': [50000, np.nan, 70000, np.nan, 90000, 100000],
    'City': ['NYC', 'LA', np.nan, 'Chicago', 'Boston', 'NYC']
})

# Check for missing values
print("Missing values per column:")
print(df.isnull().sum())

print("\nPercentage missing:")
print(df.isnull().mean() * 100)

# Visualize missing data
import matplotlib.pyplot as plt
import seaborn as sns

plt.figure(figsize=(10, 6))
sns.heatmap(df.isnull(), cbar=False, cmap='viridis')
plt.title('Missing Data Heatmap')
plt.show()
```

### Strategy 1: Remove Missing Data

```python
# Remove rows with ANY missing values
df_clean = df.dropna()

# Remove rows with missing values in SPECIFIC columns
df_clean = df.dropna(subset=['Age', 'Salary'])

# Remove columns with too many missing values (>50%)
threshold = len(df) * 0.5
df_clean = df.dropna(thresh=threshold, axis=1)

# ⚠️ CAUTION: Only remove if you have lots of data!
```

### Strategy 2: Impute (Fill) Missing Values

```python
from sklearn.impute import SimpleImputer

# 1. Mean imputation (for numerical)
imputer_mean = SimpleImputer(strategy='mean')
df['Age_filled'] = imputer_mean.fit_transform(df[['Age']])

# 2. Median imputation (better for outliers)
imputer_median = SimpleImputer(strategy='median')
df['Salary_filled'] = imputer_median.fit_transform(df[['Salary']])

# 3. Most frequent (for categorical)
imputer_mode = SimpleImputer(strategy='most_frequent')
df['City_filled'] = imputer_mode.fit_transform(df[['City']])

# 4. Constant value
imputer_constant = SimpleImputer(strategy='constant', fill_value=0)
df['Age_zero'] = imputer_constant.fit_transform(df[['Age']])

print("Before imputation:")
print(df[['Age', 'Salary', 'City']].head())

print("\nAfter imputation:")
print(df[['Age_filled', 'Salary_filled', 'City_filled']].head())
```

### Strategy 3: Advanced Imputation

```python
from sklearn.experimental import enable_iterative_imputer
from sklearn.impute import IterativeImputer

# KNN Imputer (uses similar rows)
from sklearn.impute import KNNImputer
knn_imputer = KNNImputer(n_neighbors=3)
df_filled = pd.DataFrame(
    knn_imputer.fit_transform(df[['Age', 'Salary']]),
    columns=['Age', 'Salary']
)

# Iterative Imputer (predicts missing values)
iter_imputer = IterativeImputer(random_state=42)
df_filled = pd.DataFrame(
    iter_imputer.fit_transform(df[['Age', 'Salary']]),
    columns=['Age', 'Salary']
)
```

### When to Use What?

```python
"""
┌──────────────────────────────────────────────────────┐
│  MISSING DATA DECISION TREE:                         │
│                                                      │
│  < 5% missing?                                       │
│    → Drop rows (minimal impact)                      │
│                                                      │
│  5-20% missing?                                      │
│    → Numerical: Mean/Median imputation               │
│    → Categorical: Mode imputation                    │
│                                                      │
│  > 20% missing?                                      │
│    → Consider dropping the feature                   │
│    → OR use advanced imputation (KNN, Iterative)     │
│                                                      │
│  MCAR (Missing Completely At Random)?                │
│    → Safe to drop or impute                          │
│                                                      │
│  MAR/MNAR (Pattern in missingness)?                  │
│    → Create "is_missing" indicator feature           │
│    → Use advanced imputation                         │
└──────────────────────────────────────────────────────┘
"""

# Example: Create missing indicator
df['Age_missing'] = df['Age'].isnull().astype(int)
```

---

## ⚖️ Feature Scaling

### Why Scale Features?

```python
# Example: Without scaling
X = [[25, 50000],      # Age: 0-100, Salary: 20k-200k
     [30, 75000],
     [35, 100000]]

# Distance between point 1 and 2:
# √[(30-25)² + (75000-50000)²] ≈ 25000
# → Salary dominates! Age is ignored!

# With scaling to [0, 1]:
X_scaled = [[0.2, 0.25],
            [0.3, 0.375],
            [0.4, 0.5]]

# Distance now:
# √[(0.3-0.2)² + (0.375-0.25)²] ≈ 0.158
# → Both features contribute equally ✅
```

### Method 1: Standardization (Z-score Normalization)

```python
from sklearn.preprocessing import StandardScaler
import numpy as np

# Sample data
X = np.array([[1, 2],
              [3, 4],
              [5, 6],
              [7, 8]])

# Standardize: mean=0, std=1
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

print("Original data:")
print(X)
print(f"\nMean: {X.mean(axis=0)}")
print(f"Std: {X.std(axis=0)}")

print("\nScaled data:")
print(X_scaled)
print(f"\nMean: {X_scaled.mean(axis=0)}")
print(f"Std: {X_scaled.std(axis=0)}")

# Formula: (x - mean) / std
```

### Method 2: Min-Max Normalization

```python
from sklearn.preprocessing import MinMaxScaler

# Scale to [0, 1]
scaler = MinMaxScaler()
X_normalized = scaler.fit_transform(X)

print("Min-Max scaled (0-1):")
print(X_normalized)

# Custom range [-1, 1]
scaler = MinMaxScaler(feature_range=(-1, 1))
X_normalized = scaler.fit_transform(X)

print("\nMin-Max scaled (-1, 1):")
print(X_normalized)

# Formula: (x - min) / (max - min)
```

### Method 3: Robust Scaling (for outliers)

```python
from sklearn.preprocessing import RobustScaler

# Robust to outliers (uses median and IQR)
scaler = RobustScaler()
X_robust = scaler.fit_transform(X)

print("Robust scaled:")
print(X_robust)

# Formula: (x - median) / IQR
```

### When to Use What?

```python
"""
┌────────────────────────────────────────────────────┐
│  SCALING DECISION TREE:                            │
│                                                    │
│  Features have different scales?                  │
│    YES → Must scale!                              │
│                                                    │
│  Using distance-based algorithms?                 │
│  (KNN, SVM, K-Means, Neural Networks)             │
│    → YES, scale! Use StandardScaler               │
│                                                    │
│  Tree-based algorithms?                           │
│  (Decision Tree, Random Forest, XGBoost)          │
│    → NO scaling needed (invariant to scale)       │
│                                                    │
│  Have outliers?                                   │
│    → Use RobustScaler                             │
│                                                    │
│  Need interpretable ranges (0-1)?                 │
│    → Use MinMaxScaler                             │
│                                                    │
│  Gaussian-like distribution?                      │
│    → Use StandardScaler                           │
└────────────────────────────────────────────────────┘
"""
```

### ⚠️ CRITICAL: Fit on Train, Transform on Test

```python
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

# Split data first
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

# ❌ WRONG: Fit on all data (data leakage!)
scaler = StandardScaler()
scaler.fit(X)  # Seeing test data!
X_train_scaled = scaler.transform(X_train)
X_test_scaled = scaler.transform(X_test)

# ✅ CORRECT: Fit on train only
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)  # Learn from train
X_test_scaled = scaler.transform(X_test)        # Apply to test

# Why? Test data should simulate "unseen" data!
```

---

## 🏷️ Encoding Categorical Variables

### Types of Categorical Data

```python
"""
Nominal (No order):
  - Colors: ['red', 'blue', 'green']
  - Cities: ['NYC', 'LA', 'Chicago']
  → Use One-Hot Encoding

Ordinal (Has order):
  - Education: ['High School', 'Bachelor', 'Master', 'PhD']
  - Rating: ['Bad', 'Okay', 'Good', 'Excellent']
  → Use Ordinal Encoding
"""
```

### Method 1: Label Encoding (Ordinal)

```python
from sklearn.preprocessing import LabelEncoder

# Ordinal data with order
education = ['High School', 'Bachelor', 'Master', 'PhD', 'Bachelor']

encoder = LabelEncoder()
education_encoded = encoder.fit_transform(education)

print("Original:", education)
print("Encoded:", education_encoded)
# Output: [0, 1, 2, 3, 1]

# Decode back
print("Decoded:", encoder.inverse_transform(education_encoded))

# Get classes
print("Classes:", encoder.classes_)

# ⚠️ WARNING: Don't use for nominal data!
# Model will think: LA(1) + Chicago(2) = 3 → Nonsense!
```

### Method 2: One-Hot Encoding (Nominal)

```python
from sklearn.preprocessing import OneHotEncoder
import pandas as pd

# Nominal data (no order)
cities = [['NYC'], ['LA'], ['Chicago'], ['NYC'], ['Boston']]

encoder = OneHotEncoder(sparse_output=False)
cities_encoded = encoder.fit_transform(cities)

print("One-Hot Encoded:")
print(cities_encoded)
#       Boston  Chicago  LA  NYC
# [[0.   0.   0.   1.]  ← NYC
#  [0.   0.   1.   0.]  ← LA
#  [0.   1.   0.   0.]  ← Chicago
#  [0.   0.   0.   1.]  ← NYC
#  [1.   0.   0.   0.]] ← Boston

# Get feature names
print("Features:", encoder.get_feature_names_out())
```

### Method 3: Pandas get_dummies

```python
import pandas as pd

df = pd.DataFrame({
    'City': ['NYC', 'LA', 'Chicago', 'NYC'],
    'Color': ['Red', 'Blue', 'Red', 'Green']
})

# One-hot encoding
df_encoded = pd.get_dummies(df, columns=['City', 'Color'])

print(df_encoded)
#    City_Chicago  City_LA  City_NYC  Color_Blue  Color_Green  Color_Red
# 0             0        0         1           0            0          1
# 1             0        1         0           1            0          0
# 2             1        0         0           0            0          1
# 3             0        0         1           0            1          0

# Drop first category (avoid multicollinearity)
df_encoded = pd.get_dummies(df, columns=['City', 'Color'], drop_first=True)
```

### Method 4: Ordinal Encoding (Custom Order)

```python
from sklearn.preprocessing import OrdinalEncoder

# Custom order
education = [['High School'], ['Bachelor'], ['Master'], ['PhD']]

encoder = OrdinalEncoder(categories=[['High School', 'Bachelor', 'Master', 'PhD']])
education_encoded = encoder.fit_transform(education)

print(education_encoded)
# [[0.]   ← High School
#  [1.]   ← Bachelor
#  [2.]   ← Master
#  [3.]]  ← PhD
```

### Handling High Cardinality

```python
"""
High Cardinality = Many unique values (e.g., 1000 cities)

Problem with One-Hot:
  1000 cities → 1000 columns → Memory explosion! 💥

Solutions:
"""

# 1. Group rare categories
df = pd.DataFrame({'City': ['NYC', 'LA', 'Smalltown', 'Tinyville', 'NYC']})

# Keep top N, group rest as "Other"
top_cities = df['City'].value_counts().head(2).index
df['City_grouped'] = df['City'].apply(lambda x: x if x in top_cities else 'Other')

# 2. Target encoding (use target mean)
city_means = df.groupby('City')['target'].mean()
df['City_encoded'] = df['City'].map(city_means)

# 3. Frequency encoding
city_counts = df['City'].value_counts()
df['City_freq'] = df['City'].map(city_counts)
```

---

## 🔨 Feature Engineering Basics

### What is Feature Engineering?

```
Raw Features → Feature Engineering → Better Features → Better Model

Example:
  Raw: Date = '2024-01-15'
  Engineered:
    - Day of week = Monday
    - Is weekend? = No
    - Month = January
    - Season = Winter
    → More predictive power!
```

### Common Patterns

#### 1. Date/Time Features

```python
import pandas as pd

df = pd.DataFrame({
    'date': pd.to_datetime(['2024-01-15', '2024-06-20', '2024-12-25'])
})

# Extract features
df['year'] = df['date'].dt.year
df['month'] = df['date'].dt.month
df['day'] = df['date'].dt.day
df['day_of_week'] = df['date'].dt.dayofweek  # 0=Monday
df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
df['quarter'] = df['date'].dt.quarter
df['is_month_start'] = df['date'].dt.is_month_start.astype(int)
df['is_month_end'] = df['date'].dt.is_month_end.astype(int)

print(df)
```

#### 2. Numerical Combinations

```python
df = pd.DataFrame({
    'length': [10, 20, 30],
    'width': [5, 10, 15]
})

# Create interaction features
df['area'] = df['length'] * df['width']
df['perimeter'] = 2 * (df['length'] + df['width'])
df['ratio'] = df['length'] / df['width']

print(df)
```

#### 3. Binning (Discretization)

```python
import pandas as pd

df = pd.DataFrame({'age': [15, 25, 35, 45, 55, 65, 75]})

# Create age groups
df['age_group'] = pd.cut(df['age'], 
                          bins=[0, 18, 30, 50, 100],
                          labels=['Teen', 'Young Adult', 'Adult', 'Senior'])

print(df)

# Quantile binning (equal-sized groups)
df['age_quartile'] = pd.qcut(df['age'], q=4, labels=['Q1', 'Q2', 'Q3', 'Q4'])
```

#### 4. Polynomial Features

```python
from sklearn.preprocessing import PolynomialFeatures
import numpy as np

X = np.array([[2, 3],
              [3, 4]])

# Create polynomial features (degree=2)
poly = PolynomialFeatures(degree=2, include_bias=False)
X_poly = poly.fit_transform(X)

print("Original:", X)
print("\nPolynomial features:")
print(X_poly)
# [[2, 3, 4, 6, 9]]  ← [x1, x2, x1², x1*x2, x2²]

print("Feature names:", poly.get_feature_names_out())
```

#### 5. Text Features

```python
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer

texts = ['I love ML', 'ML is great', 'I love programming']

# Bag of Words
vectorizer = CountVectorizer()
X_bow = vectorizer.fit_transform(texts).toarray()

print("Vocabulary:", vectorizer.get_feature_names_out())
print("Bag of Words:")
print(X_bow)

# TF-IDF (Term Frequency-Inverse Document Frequency)
tfidf = TfidfVectorizer()
X_tfidf = tfidf.fit_transform(texts).toarray()

print("\nTF-IDF:")
print(X_tfidf)
```

---

## ⚖️ Handling Imbalanced Data

### What is Imbalanced Data?

```
Balanced Dataset:
  Class 0: 500 samples (50%)
  Class 1: 500 samples (50%)
  → Easy for model to learn

Imbalanced Dataset:
  Class 0: 950 samples (95%)
  Class 1: 50 samples (5%)
  → Model predicts everything as Class 0 → 95% accuracy but useless!
```

### Detection

```python
import pandas as pd

y = pd.Series([0]*950 + [1]*50)

print("Class distribution:")
print(y.value_counts())
print("\nClass proportions:")
print(y.value_counts(normalize=True))

# Imbalance ratio
print(f"\nImbalance ratio: {y.value_counts()[0] / y.value_counts()[1]:.1f}:1")
```

### Solution 1: Resampling

```python
from sklearn.utils import resample

# Separate classes
df = pd.DataFrame({'feature': range(1000), 'label': y})
df_majority = df[df['label'] == 0]
df_minority = df[df['label'] == 1]

# Upsample minority class
df_minority_upsampled = resample(df_minority,
                                  replace=True,     # Sample with replacement
                                  n_samples=len(df_majority),
                                  random_state=42)

# Combine
df_balanced = pd.concat([df_majority, df_minority_upsampled])

print("After upsampling:")
print(df_balanced['label'].value_counts())

# Downsample majority class
df_majority_downsampled = resample(df_majority,
                                    replace=False,
                                    n_samples=len(df_minority),
                                    random_state=42)

df_balanced = pd.concat([df_majority_downsampled, df_minority])
```

### Solution 2: SMOTE (Synthetic Minority Over-sampling)

```python
from imblearn.over_sampling import SMOTE
from sklearn.datasets import make_classification

# Create imbalanced dataset
X, y = make_classification(n_samples=1000, n_features=20,
                            n_informative=15, n_redundant=5,
                            n_classes=2, weights=[0.95, 0.05],
                            random_state=42)

print("Before SMOTE:")
print(pd.Series(y).value_counts())

# Apply SMOTE
smote = SMOTE(random_state=42)
X_resampled, y_resampled = smote.fit_resample(X, y)

print("\nAfter SMOTE:")
print(pd.Series(y_resampled).value_counts())
```

### Solution 3: Class Weights

```python
from sklearn.linear_model import LogisticRegression

# Automatically adjust weights inversely proportional to class frequencies
model = LogisticRegression(class_weight='balanced')
model.fit(X_train, y_train)

# Manual class weights
from sklearn.utils.class_weight import compute_class_weight

class_weights = compute_class_weight('balanced', classes=np.unique(y), y=y)
print("Class weights:", dict(enumerate(class_weights)))

model = LogisticRegression(class_weight={0: class_weights[0], 1: class_weights[1]})
```

---

## 🔀 Cross-Validation

### Why Cross-Validation?

```
Single Train-Test Split:
  Train: 80% → Test: 20%
  → What if test set is easy/hard by chance?
  → Unreliable estimate!

Cross-Validation:
  Fold 1: [Train Train Train Train | Test]
  Fold 2: [Train Train Train Test | Train]
  Fold 3: [Train Train Test Train | Train]
  Fold 4: [Train Test Train Train | Train]
  Fold 5: [Test Train Train Train | Train]
  → Average performance → More reliable!
```

### K-Fold Cross-Validation

```python
from sklearn.model_selection import cross_val_score
from sklearn.linear_model import LogisticRegression
from sklearn.datasets import make_classification

# Sample data
X, y = make_classification(n_samples=1000, n_features=20, n_classes=2, random_state=42)

# Model
model = LogisticRegression()

# 5-fold cross-validation
scores = cross_val_score(model, X, y, cv=5, scoring='accuracy')

print("Cross-validation scores:", scores)
print(f"Mean accuracy: {scores.mean():.3f} (+/- {scores.std():.3f})")
```

### Stratified K-Fold (Preserves Class Distribution)

```python
from sklearn.model_selection import StratifiedKFold

skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

for fold, (train_idx, val_idx) in enumerate(skf.split(X, y), 1):
    X_train_fold, X_val_fold = X[train_idx], X[val_idx]
    y_train_fold, y_val_fold = y[train_idx], y[val_idx]
    
    print(f"Fold {fold}:")
    print(f"  Train: {len(train_idx)}, Class distribution: {np.bincount(y_train_fold)}")
    print(f"  Val: {len(val_idx)}, Class distribution: {np.bincount(y_val_fold)}")
```

---

## 🔧 Complete Preprocessing Pipeline

### Full Example

```python
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split
import pandas as pd
import numpy as np

# Sample dataset
df = pd.DataFrame({
    'age': [25, 30, np.nan, 40, 50],
    'salary': [50000, np.nan, 70000, 80000, 90000],
    'city': ['NYC', 'LA', 'Chicago', np.nan, 'Boston'],
    'education': ['Bachelor', 'Master', 'PhD', 'Bachelor', 'Master'],
    'target': [0, 1, 1, 0, 1]
})

# Separate features and target
X = df.drop('target', axis=1)
y = df['target']

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Define preprocessing for numerical features
numeric_features = ['age', 'salary']
numeric_transformer = Pipeline(steps=[
    ('imputer', SimpleImputer(strategy='median')),
    ('scaler', StandardScaler())
])

# Define preprocessing for categorical features
categorical_features = ['city', 'education']
categorical_transformer = Pipeline(steps=[
    ('imputer', SimpleImputer(strategy='constant', fill_value='missing')),
    ('onehot', OneHotEncoder(handle_unknown='ignore'))
])

# Combine preprocessing steps
preprocessor = ColumnTransformer(
    transformers=[
        ('num', numeric_transformer, numeric_features),
        ('cat', categorical_transformer, categorical_features)
    ])

# Fit and transform
X_train_processed = preprocessor.fit_transform(X_train)
X_test_processed = preprocessor.transform(X_test)

print("Processed training data shape:", X_train_processed.shape)
print("Processed test data shape:", X_test_processed.shape)
```

### Complete ML Pipeline

```python
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression

# Full pipeline: Preprocessing + Model
full_pipeline = Pipeline(steps=[
    ('preprocessor', preprocessor),
    ('classifier', LogisticRegression())
])

# Train
full_pipeline.fit(X_train, y_train)

# Predict
y_pred = full_pipeline.predict(X_test)

# Score
score = full_pipeline.score(X_test, y_test)
print(f"Test accuracy: {score:.3f}")

# Save pipeline
import joblib
joblib.dump(full_pipeline, 'model_pipeline.pkl')

# Load and use
loaded_pipeline = joblib.load('model_pipeline.pkl')
predictions = loaded_pipeline.predict(X_test)
```

---

## ⚠️ Common Pitfalls & Best Practices

### Pitfall 1: Data Leakage

```python
# ❌ WRONG: Scale before splitting
scaler = StandardScaler()
X_scaled = scaler.fit(X)  # Seeing ALL data including test!
X_train, X_test = train_test_split(X_scaled)

# ✅ CORRECT: Split first, then scale
X_train, X_test = train_test_split(X)
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)
```

### Pitfall 2: Not Handling Unseen Categories

```python
# ❌ WRONG: Will crash on new categories
encoder = OneHotEncoder()
X_train_encoded = encoder.fit_transform(train_cities)
X_test_encoded = encoder.transform(test_cities)  # Crashes if new city!

# ✅ CORRECT: Handle unknown categories
encoder = OneHotEncoder(handle_unknown='ignore')
X_train_encoded = encoder.fit_transform(train_cities)
X_test_encoded = encoder.transform(test_cities)  # Ignores new cities
```

### Pitfall 3: Target Leakage

```python
# ❌ WRONG: Feature derived from target
df['avg_price'] = df.groupby('product')['price'].transform('mean')  # Includes test data!

# ✅ CORRECT: Calculate only from training data
train_means = X_train.groupby('product')['price'].mean()
X_train['avg_price'] = X_train['product'].map(train_means)
X_test['avg_price'] = X_test['product'].map(train_means)
```

### Best Practices Checklist

```python
"""
✅ Split data FIRST, preprocess SECOND
✅ Fit transformers on training data only
✅ Use pipelines to avoid mistakes
✅ Handle missing values explicitly
✅ Scale features for distance-based algorithms
✅ Encode categorical variables appropriately
✅ Use cross-validation for model evaluation
✅ Check for data leakage
✅ Document preprocessing steps
✅ Save preprocessing objects with model
"""
```

---

## 🚀 Mini Project: Titanic Survival Prediction

```python
# Complete preprocessing workflow
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier

# Load data
url = 'https://raw.githubusercontent.com/datasciencedojo/datasets/master/titanic.csv'
df = pd.read_csv(url)

# Feature engineering
df['FamilySize'] = df['SibSp'] + df['Parch'] + 1
df['IsAlone'] = (df['FamilySize'] == 1).astype(int)
df['Title'] = df['Name'].str.extract(' ([A-Za-z]+)\.', expand=False)

# Select features
features = ['Pclass', 'Sex', 'Age', 'Fare', 'Embarked', 'FamilySize', 'IsAlone', 'Title']
X = df[features].copy()
y = df['Survived']

# Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Preprocessing pipeline
numeric_features = ['Age', 'Fare', 'FamilySize']
categorical_features = ['Pclass', 'Sex', 'Embarked', 'Title']

preprocessor = ColumnTransformer(
    transformers=[
        ('num', Pipeline([
            ('imputer', SimpleImputer(strategy='median')),
            ('scaler', StandardScaler())
        ]), numeric_features),
        ('cat', Pipeline([
            ('imputer', SimpleImputer(strategy='constant', fill_value='missing')),
            ('onehot', OneHotEncoder(handle_unknown='ignore'))
        ]), categorical_features)
    ])

# Full pipeline
model = Pipeline([
    ('preprocessor', preprocessor),
    ('classifier', RandomForestClassifier(random_state=42))
])

# Train
model.fit(X_train, y_train)

# Evaluate
train_score = model.score(X_train, y_train)
test_score = model.score(X_test, y_test)

print(f"Training accuracy: {train_score:.3f}")
print(f"Test accuracy: {test_score:.3f}")
```

---

## 📝 Exercises

### Easy
1. Split a dataset into 70% train, 30% test with stratification
2. Impute missing values in a numerical column using mean
3. Scale features using StandardScaler
4. One-hot encode a categorical variable with 3 categories

### Medium
5. Create a preprocessing pipeline for mixed data (numerical + categorical)
6. Handle imbalanced dataset using SMOTE
7. Perform 5-fold cross-validation on a classification model
8. Create new features from datetime column (day, month, is_weekend)

### Advanced
9. Build a complete preprocessing pipeline with error handling
10. Implement custom transformer for feature engineering
11. Handle high-cardinality categorical features (>100 unique values)
12. Detect and fix data leakage in a given pipeline

---

## 🎯 Key Takeaways

✅ **80% of ML work is preprocessing** - Master this first!

✅ **Always split BEFORE preprocessing** - Avoid data leakage

✅ **Handle missing data thoughtfully** - Don't just drop everything

✅ **Scale features for distance-based models** - Critical for KNN, SVM, Neural Nets

✅ **Encode categorical variables correctly** - One-hot for nominal, ordinal for ordered

✅ **Use pipelines** - Prevent mistakes, ensure reproducibility

✅ **Cross-validate** - Get reliable performance estimates

---

## 🔜 Next Steps

Continue to → [10-Scikit-Learn-Essentials.md](./10-Scikit-Learn-Essentials.md)

Now that you know **how to preprocess data**, let's learn the **essential scikit-learn utilities** every ML practitioner needs!

**Remember:** Clean data beats fancy algorithms every time! 🧹✨
