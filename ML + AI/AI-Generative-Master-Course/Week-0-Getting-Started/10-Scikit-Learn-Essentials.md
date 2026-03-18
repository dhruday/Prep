# 🛠️ Scikit-Learn Essentials

## 📚 Table of Contents
1. [What is Scikit-Learn?](#-what-is-scikit-learn)
2. [Installation & Setup](#-installation--setup)
3. [The Scikit-Learn API](#-the-scikit-learn-api)
4. [Dataset Utilities](#-dataset-utilities)
5. [Train-Test Split](#-train-test-split)
6. [Model Selection & Hyperparameter Tuning](#-model-selection--hyperparameter-tuning)
7. [Pipelines](#-pipelines)
8. [Model Evaluation Metrics](#-model-evaluation-metrics)
9. [Model Persistence](#-model-persistence)
10. [Common Algorithms Quick Reference](#-common-algorithms-quick-reference)
11. [Complete ML Workflow](#-complete-ml-workflow)
12. [Exercises](#-exercises)

---

## 🤔 What is Scikit-Learn?

### The Swiss Army Knife of ML

```
┌─────────────────────────────────────────────────┐
│  SCIKIT-LEARN = Everything you need for ML:     │
│                                                 │
│  ✅ Data preprocessing                          │
│  ✅ Train-test splitting                        │
│  ✅ 100+ ML algorithms                          │
│  ✅ Model evaluation                            │
│  ✅ Hyperparameter tuning                       │
│  ✅ Pipelines                                   │
│  ✅ Consistent API                              │
│                                                 │
│  → The go-to library for classical ML!         │
└─────────────────────────────────────────────────┘
```

### Why Use Scikit-Learn?

```python
# WITHOUT scikit-learn:
# - Write train-test split from scratch
# - Implement gradient descent manually
# - Code cross-validation logic
# - Build evaluation metrics
# → Hundreds of lines of code!

# WITH scikit-learn:
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score

X_train, X_test, y_train, y_test = train_test_split(X, y)
model = LogisticRegression()
model.fit(X_train, y_train)
accuracy = model.score(X_test, y_test)

# → 5 lines of code! ✨
```

---

## 📦 Installation & Setup

```bash
# Install
pip install scikit-learn

# Or with conda
conda install scikit-learn

# Check installation
python -c "import sklearn; print(sklearn.__version__)"
```

### Common Imports

```python
# Core
from sklearn import datasets
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.preprocessing import StandardScaler, MinMaxScaler, LabelEncoder
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer

# Models
from sklearn.linear_model import LogisticRegression, LinearRegression, Ridge, Lasso
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.svm import SVC, SVR
from sklearn.neighbors import KNeighborsClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.cluster import KMeans

# Metrics
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report,
    mean_squared_error, r2_score
)
```

---

## 🧩 The Scikit-Learn API

### Universal Pattern: fit, predict, transform

```
ALL scikit-learn follows this pattern:

Estimators (Models):
  .fit(X, y)         → Learn from data
  .predict(X)        → Make predictions
  .score(X, y)       → Evaluate model

Transformers (Preprocessing):
  .fit(X)            → Learn parameters
  .transform(X)      → Apply transformation
  .fit_transform(X)  → Fit + transform in one step
```

### Example: Classification

```python
from sklearn.linear_model import LogisticRegression
from sklearn.datasets import make_classification

# Create sample data
X, y = make_classification(n_samples=1000, n_features=20, random_state=42)

# 1. Create model
model = LogisticRegression()

# 2. Train (fit)
model.fit(X, y)

# 3. Predict
y_pred = model.predict(X)

# 4. Evaluate
accuracy = model.score(X, y)
print(f"Accuracy: {accuracy:.3f}")

# Get prediction probabilities
y_proba = model.predict_proba(X)
print(f"First prediction probabilities: {y_proba[0]}")
```

### Example: Regression

```python
from sklearn.linear_model import LinearRegression
from sklearn.datasets import make_regression

# Create sample data
X, y = make_regression(n_samples=1000, n_features=10, random_state=42)

# Same API!
model = LinearRegression()
model.fit(X, y)
y_pred = model.predict(X)
r2 = model.score(X, y)

print(f"R² score: {r2:.3f}")
print(f"Coefficients: {model.coef_}")
print(f"Intercept: {model.intercept_}")
```

---

## 📊 Dataset Utilities

### Built-in Toy Datasets

```python
from sklearn import datasets

# Classification datasets
iris = datasets.load_iris()
digits = datasets.load_digits()
wine = datasets.load_wine()
breast_cancer = datasets.load_breast_cancer()

# Regression datasets
diabetes = datasets.load_diabetes()
boston = datasets.load_boston()  # Deprecated

# Exploring a dataset
print("Features:", iris.feature_names)
print("Target names:", iris.target_names)
print("Data shape:", iris.data.shape)
print("Target shape:", iris.target.shape)

# As DataFrame
import pandas as pd
df = pd.DataFrame(iris.data, columns=iris.feature_names)
df['target'] = iris.target
print(df.head())
```

### Generate Synthetic Datasets

```python
from sklearn.datasets import make_classification, make_regression, make_blobs

# Classification dataset
X, y = make_classification(
    n_samples=1000,       # Number of samples
    n_features=20,        # Number of features
    n_informative=15,     # Number of useful features
    n_redundant=5,        # Number of redundant features
    n_classes=2,          # Number of classes
    random_state=42
)

# Regression dataset
X, y = make_regression(
    n_samples=1000,
    n_features=10,
    noise=0.1,            # Add noise
    random_state=42
)

# Clustering dataset
X, y = make_blobs(
    n_samples=1000,
    n_features=2,
    centers=3,            # Number of clusters
    random_state=42
)
```

---

## 🔀 Train-Test Split

### Basic Splitting

```python
from sklearn.model_selection import train_test_split

# Simple split: 80-20
X_train, X_test, y_train, y_test = train_test_split(
    X, y, 
    test_size=0.2,        # 20% for testing
    random_state=42       # Reproducibility
)

print(f"Training set: {len(X_train)} samples")
print(f"Test set: {len(X_test)} samples")
```

### Stratified Splitting (Preserve Class Distribution)

```python
# For imbalanced datasets
X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,
    stratify=y,           # Preserve class proportions
    random_state=42
)

# Check class distribution
import numpy as np
print("Train class distribution:", np.bincount(y_train))
print("Test class distribution:", np.bincount(y_test))
```

### Train-Validation-Test Split

```python
# Step 1: Split off test set
X_temp, X_test, y_temp, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Step 2: Split remaining into train and validation
X_train, X_val, y_train, y_val = train_test_split(
    X_temp, y_temp, test_size=0.25, random_state=42  # 0.25 * 0.8 = 0.2
)

print(f"Train: {len(X_train)} ({len(X_train)/len(X)*100:.0f}%)")
print(f"Validation: {len(X_val)} ({len(X_val)/len(X)*100:.0f}%)")
print(f"Test: {len(X_test)} ({len(X_test)/len(X)*100:.0f}%)")
```

---

## 🎯 Model Selection & Hyperparameter Tuning

### Cross-Validation

```python
from sklearn.model_selection import cross_val_score
from sklearn.linear_model import LogisticRegression

model = LogisticRegression()

# 5-fold cross-validation
scores = cross_val_score(model, X, y, cv=5, scoring='accuracy')

print("Cross-validation scores:", scores)
print(f"Mean accuracy: {scores.mean():.3f} (+/- {scores.std():.3f})")

# Different scoring metrics
scores_f1 = cross_val_score(model, X, y, cv=5, scoring='f1')
scores_roc = cross_val_score(model, X, y, cv=5, scoring='roc_auc')
```

### Grid Search (Exhaustive Hyperparameter Search)

```python
from sklearn.model_selection import GridSearchCV
from sklearn.ensemble import RandomForestClassifier

# Define model
model = RandomForestClassifier(random_state=42)

# Define hyperparameter grid
param_grid = {
    'n_estimators': [10, 50, 100],
    'max_depth': [5, 10, 20, None],
    'min_samples_split': [2, 5, 10]
}

# Grid search with cross-validation
grid_search = GridSearchCV(
    model,
    param_grid,
    cv=5,                 # 5-fold CV
    scoring='accuracy',
    n_jobs=-1,            # Use all CPU cores
    verbose=1
)

# Fit
grid_search.fit(X_train, y_train)

# Best parameters and score
print("Best parameters:", grid_search.best_params_)
print("Best cross-validation score:", grid_search.best_score_)

# Use best model
best_model = grid_search.best_estimator_
y_pred = best_model.predict(X_test)
```

### Randomized Search (Faster Alternative)

```python
from sklearn.model_selection import RandomizedSearchCV
from scipy.stats import randint, uniform

# Random distributions for parameters
param_distributions = {
    'n_estimators': randint(10, 200),
    'max_depth': randint(5, 50),
    'min_samples_split': randint(2, 20),
    'min_samples_leaf': randint(1, 10)
}

# Randomized search
random_search = RandomizedSearchCV(
    model,
    param_distributions,
    n_iter=50,            # Number of random combinations
    cv=5,
    scoring='accuracy',
    random_state=42,
    n_jobs=-1
)

random_search.fit(X_train, y_train)

print("Best parameters:", random_search.best_params_)
print("Best score:", random_search.best_score_)
```

---

## 🔧 Pipelines

### Why Pipelines?

```
WITHOUT Pipeline:
  1. Scale training data
  2. Train model
  3. Scale test data (EASY TO FORGET!)
  4. Predict
  → Error-prone!

WITH Pipeline:
  1. Create pipeline (scale → model)
  2. Fit pipeline
  3. Predict (scaling happens automatically!)
  → Safe and clean! ✅
```

### Basic Pipeline

```python
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression

# Create pipeline
pipeline = Pipeline([
    ('scaler', StandardScaler()),
    ('classifier', LogisticRegression())
])

# Fit (scales AND trains)
pipeline.fit(X_train, y_train)

# Predict (scales AND predicts)
y_pred = pipeline.predict(X_test)

# Score
accuracy = pipeline.score(X_test, y_test)
print(f"Accuracy: {accuracy:.3f}")
```

### Pipeline with Multiple Steps

```python
from sklearn.decomposition import PCA
from sklearn.ensemble import RandomForestClassifier

pipeline = Pipeline([
    ('scaler', StandardScaler()),
    ('pca', PCA(n_components=10)),
    ('classifier', RandomForestClassifier(random_state=42))
])

pipeline.fit(X_train, y_train)
print(f"Test accuracy: {pipeline.score(X_test, y_test):.3f}")

# Access pipeline steps
print("Scaler:", pipeline.named_steps['scaler'])
print("PCA components:", pipeline.named_steps['pca'].n_components_)
```

### ColumnTransformer (Different Preprocessing for Different Columns)

```python
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
import pandas as pd

# Sample data
df = pd.DataFrame({
    'age': [25, 30, 35, 40],
    'salary': [50000, 60000, 70000, 80000],
    'city': ['NYC', 'LA', 'Chicago', 'Boston']
})

# Define transformers
numeric_features = ['age', 'salary']
categorical_features = ['city']

preprocessor = ColumnTransformer([
    ('num', StandardScaler(), numeric_features),
    ('cat', OneHotEncoder(), categorical_features)
])

# Fit and transform
X_transformed = preprocessor.fit_transform(df)
print(X_transformed)

# Combine with model
full_pipeline = Pipeline([
    ('preprocessor', preprocessor),
    ('classifier', LogisticRegression())
])
```

### Pipeline + Grid Search

```python
pipeline = Pipeline([
    ('scaler', StandardScaler()),
    ('classifier', LogisticRegression())
])

# Hyperparameter grid (use step__parameter notation)
param_grid = {
    'classifier__C': [0.1, 1, 10],
    'classifier__penalty': ['l1', 'l2'],
    'classifier__solver': ['liblinear', 'saga']
}

grid_search = GridSearchCV(pipeline, param_grid, cv=5)
grid_search.fit(X_train, y_train)

print("Best parameters:", grid_search.best_params_)
```

---

## 📊 Model Evaluation Metrics

### Classification Metrics

```python
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report, roc_auc_score, roc_curve
)
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression

# Load data
X, y = load_breast_cancer(return_X_y=True)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

# Train model
model = LogisticRegression(max_iter=5000)
model.fit(X_train, y_train)
y_pred = model.predict(X_test)

# Metrics
print(f"Accuracy: {accuracy_score(y_test, y_pred):.3f}")
print(f"Precision: {precision_score(y_test, y_pred):.3f}")
print(f"Recall: {recall_score(y_test, y_pred):.3f}")
print(f"F1-score: {f1_score(y_test, y_pred):.3f}")

# Confusion matrix
cm = confusion_matrix(y_test, y_pred)
print("\nConfusion Matrix:")
print(cm)

# Classification report (all metrics)
print("\nClassification Report:")
print(classification_report(y_test, y_pred))

# ROC AUC
y_proba = model.predict_proba(X_test)[:, 1]
roc_auc = roc_auc_score(y_test, y_proba)
print(f"\nROC AUC: {roc_auc:.3f}")
```

### Regression Metrics

```python
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.datasets import load_diabetes
from sklearn.linear_model import LinearRegression

# Load data
X, y = load_diabetes(return_X_y=True)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

# Train model
model = LinearRegression()
model.fit(X_train, y_train)
y_pred = model.predict(X_test)

# Metrics
mse = mean_squared_error(y_test, y_pred)
rmse = np.sqrt(mse)
mae = mean_absolute_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print(f"MSE: {mse:.3f}")
print(f"RMSE: {rmse:.3f}")
print(f"MAE: {mae:.3f}")
print(f"R² score: {r2:.3f}")
```

### Visualize Results

```python
import matplotlib.pyplot as plt
import seaborn as sns

# Confusion Matrix Heatmap
plt.figure(figsize=(8, 6))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
plt.xlabel('Predicted')
plt.ylabel('Actual')
plt.title('Confusion Matrix')
plt.show()

# ROC Curve
fpr, tpr, thresholds = roc_curve(y_test, y_proba)
plt.figure(figsize=(8, 6))
plt.plot(fpr, tpr, label=f'ROC curve (AUC = {roc_auc:.3f})')
plt.plot([0, 1], [0, 1], 'k--', label='Random')
plt.xlabel('False Positive Rate')
plt.ylabel('True Positive Rate')
plt.title('ROC Curve')
plt.legend()
plt.show()
```

---

## 💾 Model Persistence

### Save and Load Models

```python
import joblib
from sklearn.ensemble import RandomForestClassifier

# Train model
model = RandomForestClassifier()
model.fit(X_train, y_train)

# Save model
joblib.dump(model, 'random_forest_model.pkl')

# Load model
loaded_model = joblib.load('random_forest_model.pkl')

# Use loaded model
predictions = loaded_model.predict(X_test)
```

### Save Pipeline

```python
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression

# Create and train pipeline
pipeline = Pipeline([
    ('scaler', StandardScaler()),
    ('classifier', LogisticRegression())
])
pipeline.fit(X_train, y_train)

# Save entire pipeline
joblib.dump(pipeline, 'full_pipeline.pkl')

# Load and use
loaded_pipeline = joblib.load('full_pipeline.pkl')
predictions = loaded_pipeline.predict(X_test)
```

### Alternative: Pickle

```python
import pickle

# Save
with open('model.pkl', 'wb') as f:
    pickle.dump(model, f)

# Load
with open('model.pkl', 'rb') as f:
    loaded_model = pickle.load(f)
```

---

## 🧠 Common Algorithms Quick Reference

### Classification Algorithms

```python
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from sklearn.naive_bayes import GaussianNB

# Logistic Regression (Linear, fast, interpretable)
lr = LogisticRegression()

# Decision Tree (Non-linear, interpretable, prone to overfitting)
dt = DecisionTreeClassifier(max_depth=5)

# Random Forest (Ensemble of trees, robust, slow)
rf = RandomForestClassifier(n_estimators=100)

# Gradient Boosting (Sequential ensemble, powerful, slow)
gb = GradientBoostingClassifier(n_estimators=100)

# Support Vector Machine (Powerful for small datasets, slow)
svm = SVC(kernel='rbf')

# K-Nearest Neighbors (Simple, non-parametric, slow prediction)
knn = KNeighborsClassifier(n_neighbors=5)

# Naive Bayes (Fast, works well with text, assumes independence)
nb = GaussianNB()
```

### Regression Algorithms

```python
from sklearn.linear_model import LinearRegression, Ridge, Lasso, ElasticNet
from sklearn.tree import DecisionTreeRegressor
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.svm import SVR

# Linear Regression (Baseline)
lr = LinearRegression()

# Ridge Regression (L2 regularization)
ridge = Ridge(alpha=1.0)

# Lasso Regression (L1 regularization, feature selection)
lasso = Lasso(alpha=1.0)

# Elastic Net (L1 + L2 regularization)
elastic = ElasticNet(alpha=1.0, l1_ratio=0.5)

# Decision Tree Regressor
dt = DecisionTreeRegressor(max_depth=5)

# Random Forest Regressor
rf = RandomForestRegressor(n_estimators=100)

# Gradient Boosting Regressor
gb = GradientBoostingRegressor(n_estimators=100)

# Support Vector Regressor
svr = SVR(kernel='rbf')
```

### Clustering Algorithms

```python
from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering

# K-Means (Fast, requires k)
kmeans = KMeans(n_clusters=3)

# DBSCAN (Density-based, finds arbitrary shapes)
dbscan = DBSCAN(eps=0.5, min_samples=5)

# Hierarchical Clustering
hierarchical = AgglomerativeClustering(n_clusters=3)
```

---

## 🚀 Complete ML Workflow

### End-to-End Example

```python
import pandas as pd
import numpy as np
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import joblib

# ==================== 1. LOAD DATA ====================
data = load_breast_cancer()
X = pd.DataFrame(data.data, columns=data.feature_names)
y = pd.Series(data.target, name='target')

print("Dataset shape:", X.shape)
print("Class distribution:", y.value_counts())

# ==================== 2. SPLIT DATA ====================
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# ==================== 3. CREATE PIPELINE ====================
pipeline = Pipeline([
    ('scaler', StandardScaler()),
    ('classifier', RandomForestClassifier(random_state=42))
])

# ==================== 4. HYPERPARAMETER TUNING ====================
param_grid = {
    'classifier__n_estimators': [50, 100, 200],
    'classifier__max_depth': [5, 10, None],
    'classifier__min_samples_split': [2, 5, 10]
}

grid_search = GridSearchCV(
    pipeline,
    param_grid,
    cv=5,
    scoring='accuracy',
    n_jobs=-1,
    verbose=1
)

# ==================== 5. TRAIN ====================
print("\nTraining model...")
grid_search.fit(X_train, y_train)

print(f"\nBest parameters: {grid_search.best_params_}")
print(f"Best CV score: {grid_search.best_score_:.3f}")

# ==================== 6. EVALUATE ====================
best_model = grid_search.best_estimator_

# Training performance
train_pred = best_model.predict(X_train)
train_accuracy = accuracy_score(y_train, train_pred)

# Test performance
y_pred = best_model.predict(X_test)
test_accuracy = accuracy_score(y_test, y_pred)

print(f"\nTraining accuracy: {train_accuracy:.3f}")
print(f"Test accuracy: {test_accuracy:.3f}")

print("\nClassification Report:")
print(classification_report(y_test, y_pred, target_names=data.target_names))

print("\nConfusion Matrix:")
print(confusion_matrix(y_test, y_pred))

# ==================== 7. SAVE MODEL ====================
joblib.dump(best_model, 'breast_cancer_model.pkl')
print("\nModel saved as 'breast_cancer_model.pkl'")

# ==================== 8. LOAD & USE ====================
loaded_model = joblib.load('breast_cancer_model.pkl')
new_predictions = loaded_model.predict(X_test[:5])
print(f"\nPredictions on new data: {new_predictions}")
```

---

## 📝 Exercises

### Easy
1. Load the iris dataset and split it into train (80%) and test (20%)
2. Train a Logistic Regression model and evaluate accuracy
3. Create a pipeline with StandardScaler and LogisticRegression
4. Save and load a trained model

### Medium
5. Perform 5-fold cross-validation on the wine dataset
6. Use GridSearchCV to tune hyperparameters for RandomForestClassifier
7. Create a ColumnTransformer to handle numerical and categorical features
8. Compare 3 different algorithms (Logistic Regression, Random Forest, SVM)

### Advanced
9. Build a complete ML pipeline with preprocessing, feature engineering, and model training
10. Implement nested cross-validation (CV for hyperparameter tuning + CV for model evaluation)
11. Create a custom transformer and integrate it into a pipeline
12. Build an ensemble of models and average their predictions

---

## 🎯 Key Takeaways

✅ **Scikit-learn = Consistent API** - Learn once, use everywhere (fit, predict, transform)

✅ **Use Pipelines** - Prevent data leakage, ensure reproducibility

✅ **Cross-validation** - Get reliable performance estimates

✅ **GridSearch/RandomizedSearch** - Find best hyperparameters automatically

✅ **Save models with joblib** - Reuse trained models without retraining

✅ **Right metric for the job** - Accuracy ≠ always the best metric

---

## 🔜 Next Steps

Continue to → [Week 1 - Introduction to AI](../Week-1-Introduction-to-AI-ML-DL/01-Introduction-to-AI.md)

Congratulations! 🎉 You now have all the **foundational tools** for machine learning. Time to dive into **AI concepts and deep learning**!

**Remember:** Scikit-learn is your best friend for classical ML! 🤝
