# 📗 Beginner Projects (20 Projects)

## Foundation-Building Projects for AI/ML

These projects use **clean datasets**, focus on **single models**, and teach fundamental concepts. Perfect for building your first portfolio.

---

## Project Index

| # | Project | Domain | Key Skills |
|---|---------|--------|------------|
| 1 | House Price Predictor | Classical ML | Regression, Feature Engineering |
| 2 | Customer Churn Classifier | Classical ML | Classification, Imbalanced Data |
| 3 | Spam Email Detector | NLP | Text Classification, TF-IDF |
| 4 | Handwritten Digit Recognition | Computer Vision | CNN Basics |
| 5 | Movie Review Sentiment | NLP | Embeddings, LSTM |
| 6 | Customer Segmentation | Classical ML | Clustering, PCA |
| 7 | Credit Card Fraud Detection | Classical ML | Anomaly Detection |
| 8 | Stock Price Predictor (Basic) | Time Series | ARIMA, LSTM |
| 9 | Image Classifier (Animals) | Computer Vision | Transfer Learning |
| 10 | News Category Classifier | NLP | Multi-class Classification |
| 11 | Loan Approval Predictor | Classical ML | Decision Trees, XGBoost |
| 12 | Iris Species Classifier | Classical ML | ML Fundamentals |
| 13 | Face Detection System | Computer Vision | OpenCV, Haar Cascades |
| 14 | Tweet Sentiment Analyzer | NLP | API Integration, NLP |
| 15 | Diabetes Prediction | Healthcare ML | Medical ML Basics |
| 16 | Wine Quality Predictor | Classical ML | Regression, Feature Importance |
| 17 | Fashion Item Classifier | Computer Vision | CNN, Data Augmentation |
| 18 | Simple Chatbot | NLP | Intent Classification |
| 19 | Titanic Survival Predictor | Classical ML | Complete ML Pipeline |
| 20 | Heart Disease Predictor | Healthcare ML | Binary Classification |

---

# Project 1: House Price Predictor

## 🎯 Problem Statement

**Business Context:** A real estate platform needs to provide instant price estimates to help buyers and sellers make informed decisions.

**Goal:** Predict house prices based on features like square footage, bedrooms, location, etc.

## 📊 Dataset

| Source | Name | Size |
|--------|------|------|
| Kaggle | [House Prices: Advanced Regression](https://www.kaggle.com/c/house-prices-advanced-regression-techniques) | 1,460 training samples |
| Alternative | [California Housing](https://scikit-learn.org/stable/datasets/real_world.html#california-housing-dataset) | 20,640 samples |

## 🔄 Input → Output

```
INPUT:                              OUTPUT:
┌────────────────────────┐         ┌─────────────────┐
│ • Square footage       │         │                 │
│ • Bedrooms: 3          │   ───►  │  $425,000       │
│ • Bathrooms: 2         │         │                 │
│ • Year built: 1995     │         │  (± $15,000     │
│ • Location: Suburb     │         │   confidence)   │
│ • Garage: Yes          │         │                 │
└────────────────────────┘         └─────────────────┘
```

## 🤖 Model Choices

| Model | Why | Expected R² |
|-------|-----|-------------|
| **Linear Regression** (Baseline) | Simple, interpretable | ~0.70 |
| **Ridge/Lasso** | Handles multicollinearity | ~0.75 |
| **Random Forest** | Captures non-linear patterns | ~0.85 |
| **XGBoost** | State-of-art for tabular | ~0.88 |
| **LightGBM** | Fast, accurate | ~0.88 |

**Start with:** Linear Regression → XGBoost

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    HOUSE PRICE PREDICTOR                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐   ┌─────────────┐   ┌──────────┐   ┌────────┐ │
│  │  Raw     │──►│  Feature    │──►│  Model   │──►│ Price  │ │
│  │  Data    │   │  Engineering│   │ (XGBoost)│   │ Output │ │
│  └──────────┘   └─────────────┘   └──────────┘   └────────┘ │
│       │               │                                      │
│       ▼               ▼                                      │
│  ┌──────────┐   ┌─────────────┐                             │
│  │ Missing  │   │ • Log transform │                         │
│  │ Values   │   │ • Encoding      │                         │
│  │ Handling │   │ • Scaling       │                         │
│  └──────────┘   │ • New features  │                         │
│                 └─────────────┘                             │
└─────────────────────────────────────────────────────────────┘
```

## 📏 Evaluation Metrics

| Metric | Why Use It |
|--------|------------|
| **RMSE** | Penalizes large errors (main metric) |
| **MAE** | Average error in dollars |
| **R²** | Explains variance |
| **MAPE** | Percentage error (business-friendly) |

## ⚠️ Real-World Challenges

1. **Missing Values:** Many features have NaN (strategy: median/mode, or flag)
2. **Outliers:** Luxury homes skew distribution (log transform prices)
3. **Feature Selection:** 80+ features, many correlated
4. **Location Effect:** Requires encoding strategy (target encoding works well)

## 🚀 Extensions to Enterprise-Grade

- [ ] Add confidence intervals
- [ ] Build API with FastAPI
- [ ] Create Streamlit demo
- [ ] Add comparable homes feature
- [ ] Integrate real estate API for live data

## 💻 Quick Start Code

```python
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
import xgboost as xgb

# Load data
df = pd.read_csv('train.csv')

# Quick EDA
print(f"Shape: {df.shape}")
print(f"Target distribution: mean=${df['SalePrice'].mean():,.0f}")

# Basic preprocessing
def preprocess(df):
    # Select numeric features for baseline
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    df_numeric = df[numeric_cols].copy()
    
    # Fill missing with median
    df_numeric = df_numeric.fillna(df_numeric.median())
    
    # Log transform target
    if 'SalePrice' in df_numeric.columns:
        df_numeric['SalePrice'] = np.log1p(df_numeric['SalePrice'])
    
    return df_numeric

df_processed = preprocess(df)

# Split
X = df_processed.drop('SalePrice', axis=1)
y = df_processed['SalePrice']
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Baseline: Random Forest
rf = RandomForestRegressor(n_estimators=100, random_state=42)
rf.fit(X_train, y_train)
y_pred_rf = rf.predict(X_test)

# XGBoost
xgb_model = xgb.XGBRegressor(n_estimators=100, learning_rate=0.1, random_state=42)
xgb_model.fit(X_train, y_train)
y_pred_xgb = xgb_model.predict(X_test)

# Evaluate (remember to inverse log transform for real RMSE)
def evaluate(y_true, y_pred, model_name):
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    r2 = r2_score(y_true, y_pred)
    # Convert back to dollars
    rmse_dollars = np.sqrt(mean_squared_error(np.expm1(y_true), np.expm1(y_pred)))
    print(f"{model_name}: RMSE=${rmse_dollars:,.0f}, R²={r2:.3f}")

evaluate(y_test, y_pred_rf, "Random Forest")
evaluate(y_test, y_pred_xgb, "XGBoost")
```

---

# Project 2: Customer Churn Classifier

## 🎯 Problem Statement

**Business Context:** A telecom company loses $5M annually to customer churn. Reducing churn by 10% saves $500K. Marketing needs to identify at-risk customers for retention campaigns.

**Goal:** Predict which customers will cancel their subscription in the next 30 days.

## 📊 Dataset

| Source | Name | Size |
|--------|------|------|
| Kaggle | [Telco Customer Churn](https://www.kaggle.com/datasets/blastchar/telco-customer-churn) | 7,043 customers |
| Alternative | [IBM Watson Telco](https://www.ibm.com/docs/en/cognos-analytics/12.0.0?topic=samples-telco-customer-churn) | Same data |

## 🔄 Input → Output

```
INPUT:                              OUTPUT:
┌────────────────────────┐         ┌─────────────────────────┐
│ • Tenure: 12 months    │         │                         │
│ • Monthly charges: $75 │   ───►  │  Churn Risk: 78%        │
│ • Contract: Month-to-  │         │  Status: HIGH RISK      │
│   month                │         │  Action: Send offer     │
│ • Payment: Electronic  │         │                         │
│ • Services: Internet   │         │                         │
└────────────────────────┘         └─────────────────────────┘
```

## 🤖 Model Choices

| Model | Why | Expected AUC |
|-------|-----|--------------|
| **Logistic Regression** | Baseline, interpretable | ~0.80 |
| **Random Forest** | Handles imbalance better | ~0.82 |
| **XGBoost** | Best for tabular | ~0.85 |
| **LightGBM + SMOTE** | Class imbalance handling | ~0.86 |

**Key Challenge:** Imbalanced classes (~27% churn rate)

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CHURN PREDICTION SYSTEM                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐ │
│  │ Customer │──►│ Feature  │──►│ Churn    │──►│ Risk     │ │
│  │ Data     │   │ Engineer │   │ Model    │   │ Score    │ │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘ │
│                      │                             │        │
│                      ▼                             ▼        │
│                 ┌──────────┐                 ┌──────────┐  │
│                 │ • Tenure │                 │ Marketing│  │
│                 │   bins   │                 │ Campaign │  │
│                 │ • CLV    │                 │ Trigger  │  │
│                 │ • Usage  │                 └──────────┘  │
│                 │   trends │                               │
│                 └──────────┘                               │
└─────────────────────────────────────────────────────────────┘
```

## 📏 Evaluation Metrics

| Metric | Why Use It |
|--------|------------|
| **AUC-ROC** | Overall ranking ability |
| **Precision@K** | Top K risky customers |
| **Recall** | Catch most churners |
| **F1-Score** | Balance precision/recall |

**Business Metric:** Cost-benefit analysis
- Cost of retention offer: $50
- Value of retained customer: $500
- Optimize threshold for max profit

## ⚠️ Real-World Challenges

1. **Class Imbalance:** 27% churn vs 73% retain
   - Solution: SMOTE, class weights, threshold tuning
2. **Feature Leakage:** Ensure no "future" information
3. **Actionability:** Model must explain WHY for targeting

## 💻 Quick Start Code

```python
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, roc_auc_score
from imblearn.over_sampling import SMOTE

# Load
df = pd.read_csv('WA_Fn-UseC_-Telco-Customer-Churn.csv')

# Preprocess
df['TotalCharges'] = pd.to_numeric(df['TotalCharges'], errors='coerce')
df = df.dropna()

# Encode target
df['Churn'] = (df['Churn'] == 'Yes').astype(int)

# Encode categoricals
cat_cols = df.select_dtypes(include=['object']).columns.drop('customerID')
le = LabelEncoder()
for col in cat_cols:
    df[col] = le.fit_transform(df[col].astype(str))

# Features
X = df.drop(['Churn', 'customerID'], axis=1)
y = df['Churn']

# Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y)

# Handle imbalance
smote = SMOTE(random_state=42)
X_train_sm, y_train_sm = smote.fit_resample(X_train, y_train)

# Model
clf = RandomForestClassifier(n_estimators=100, class_weight='balanced')
clf.fit(X_train_sm, y_train_sm)

# Evaluate
y_pred = clf.predict(X_test)
y_prob = clf.predict_proba(X_test)[:, 1]

print(classification_report(y_test, y_pred))
print(f"AUC-ROC: {roc_auc_score(y_test, y_prob):.3f}")
```

---

# Project 3: Spam Email Detector

## 🎯 Problem Statement

**Business Context:** Email providers need to filter 50%+ of incoming email as spam while ensuring legitimate emails aren't blocked.

**Goal:** Classify emails as spam or not spam (ham).

## 📊 Dataset

| Source | Name | Size |
|--------|------|------|
| Kaggle | [SMS Spam Collection](https://www.kaggle.com/datasets/uciml/sms-spam-collection-dataset) | 5,574 messages |
| Alternative | [SpamAssassin Public Corpus](https://spamassassin.apache.org/old/publiccorpus/) | 6,000+ emails |

## 🔄 Input → Output

```
INPUT:                                    OUTPUT:
┌────────────────────────────────┐       ┌────────────────┐
│ "Congratulations! You've won   │       │                │
│  $1,000,000! Click here to     │ ───►  │  SPAM (99.2%)  │
│  claim your prize now!!!"      │       │                │
└────────────────────────────────┘       └────────────────┘
```

## 🤖 Model Choices

| Model | Why | Expected Accuracy |
|-------|-----|-------------------|
| **Naive Bayes** | Fast, works well for text | ~97% |
| **Logistic Regression + TF-IDF** | Good baseline | ~98% |
| **SVM** | Strong for high-dimensional | ~98% |
| **BERT Fine-tuned** | State-of-art | ~99%+ |

**Start with:** Naive Bayes (surprisingly effective for spam!)

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SPAM DETECTION PIPELINE                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐ │
│  │  Email   │──►│  Text    │──►│ TF-IDF / │──►│ Classify │ │
│  │  Input   │   │  Clean   │   │ Embed    │   │ Spam/Ham │ │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘ │
│                      │                                      │
│                      ▼                                      │
│                 ┌─────────────────────────────┐             │
│                 │ • Lowercase                 │             │
│                 │ • Remove special chars      │             │
│                 │ • Remove stopwords          │             │
│                 │ • Lemmatization             │             │
│                 └─────────────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

## 📏 Evaluation Metrics

| Metric | Why | Target |
|--------|-----|--------|
| **Precision** | Minimize false positives (important emails in spam) | >99% |
| **Recall** | Catch spam | >95% |
| **F1-Score** | Balance | >97% |

**Critical:** False positives (ham marked as spam) are worse than false negatives!

## 💻 Quick Start Code

```python
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.metrics import classification_report, confusion_matrix
import re
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

# Download NLTK data
nltk.download('stopwords')
nltk.download('wordnet')

# Load
df = pd.read_csv('spam.csv', encoding='latin-1')
df = df[['v1', 'v2']].rename(columns={'v1': 'label', 'v2': 'text'})
df['label'] = (df['label'] == 'spam').astype(int)

# Text preprocessing
lemmatizer = WordNetLemmatizer()
stop_words = set(stopwords.words('english'))

def clean_text(text):
    text = text.lower()
    text = re.sub(r'[^a-zA-Z\s]', '', text)
    tokens = text.split()
    tokens = [lemmatizer.lemmatize(w) for w in tokens if w not in stop_words]
    return ' '.join(tokens)

df['clean_text'] = df['text'].apply(clean_text)

# Split
X_train, X_test, y_train, y_test = train_test_split(
    df['clean_text'], df['label'], test_size=0.2, stratify=df['label']
)

# TF-IDF
vectorizer = TfidfVectorizer(max_features=5000, ngram_range=(1, 2))
X_train_vec = vectorizer.fit_transform(X_train)
X_test_vec = vectorizer.transform(X_test)

# Naive Bayes
nb = MultinomialNB()
nb.fit(X_train_vec, y_train)

# Evaluate
y_pred = nb.predict(X_test_vec)
print(classification_report(y_test, y_pred, target_names=['ham', 'spam']))
print("\nConfusion Matrix:")
print(confusion_matrix(y_test, y_pred))
```

---

# Project 4: Handwritten Digit Recognition (MNIST)

## 🎯 Problem Statement

**Business Context:** Banks process millions of checks daily. Automating digit recognition saves labor costs and reduces errors.

**Goal:** Recognize handwritten digits (0-9) from images.

## 📊 Dataset

| Source | Name | Size |
|--------|------|------|
| Built-in | MNIST | 60K train, 10K test |
| Keras/PyTorch | Directly loadable | 28×28 grayscale |

## 🔄 Input → Output

```
INPUT:                              OUTPUT:
┌────────────────────────┐         ┌─────────────────┐
│  ▄▄▄▄▄▄▄▄             │         │                 │
│  █     █              │   ───►  │  Digit: 5       │
│  ▀▀▀▀▀▀█              │         │  Confidence: 98%│
│        █              │         │                 │
│  ▄▄▄▄▄▄█              │         │                 │
│  (28×28 image)        │         │                 │
└────────────────────────┘         └─────────────────┘
```

## 🤖 Model Choices

| Model | Why | Expected Accuracy |
|-------|-----|-------------------|
| **Logistic Regression** | Simple baseline | ~92% |
| **MLP** | Neural network intro | ~97% |
| **Simple CNN** | Spatial patterns | ~99% |
| **LeNet-5** | Classic CNN | ~99.2% |

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DIGIT RECOGNITION CNN                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Input    Conv1     Pool1    Conv2     Pool2    FC    Out   │
│ [28×28]  [26×26]   [13×13]  [11×11]   [5×5]   [128]  [10]  │
│    │        │         │        │        │       │      │    │
│    ▼        ▼         ▼        ▼        ▼       ▼      ▼    │
│ ┌─────┐ ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐ ┌─────┐ ┌─────┐ │
│ │Image│►│Conv │►│MaxPool│►│Conv │►│MaxPool│►│Dense│►│Soft │ │
│ │     │ │3×3  │  │2×2   │ │3×3  │  │2×2   │ │ReLU │ │max  │ │
│ └─────┘ │×32  │  │      │ │×64  │  │      │ │     │ │     │ │
│         └─────┘  └─────┘  └─────┘  └─────┘ └─────┘ └─────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 💻 Quick Start Code

```python
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms
from torch.utils.data import DataLoader

# Device
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# Data
transform = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize((0.1307,), (0.3081,))
])

train_data = datasets.MNIST('./data', train=True, download=True, transform=transform)
test_data = datasets.MNIST('./data', train=False, transform=transform)

train_loader = DataLoader(train_data, batch_size=64, shuffle=True)
test_loader = DataLoader(test_data, batch_size=1000)

# Simple CNN
class SimpleCNN(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv1 = nn.Conv2d(1, 32, 3, 1)
        self.conv2 = nn.Conv2d(32, 64, 3, 1)
        self.dropout1 = nn.Dropout(0.25)
        self.dropout2 = nn.Dropout(0.5)
        self.fc1 = nn.Linear(9216, 128)
        self.fc2 = nn.Linear(128, 10)
    
    def forward(self, x):
        x = torch.relu(self.conv1(x))
        x = torch.relu(self.conv2(x))
        x = torch.max_pool2d(x, 2)
        x = self.dropout1(x)
        x = torch.flatten(x, 1)
        x = torch.relu(self.fc1(x))
        x = self.dropout2(x)
        return self.fc2(x)

# Train
model = SimpleCNN().to(device)
optimizer = optim.Adam(model.parameters())
criterion = nn.CrossEntropyLoss()

for epoch in range(5):
    model.train()
    for batch_idx, (data, target) in enumerate(train_loader):
        data, target = data.to(device), target.to(device)
        optimizer.zero_grad()
        output = model(data)
        loss = criterion(output, target)
        loss.backward()
        optimizer.step()
    
    # Test
    model.eval()
    correct = 0
    with torch.no_grad():
        for data, target in test_loader:
            data, target = data.to(device), target.to(device)
            output = model(data)
            pred = output.argmax(dim=1)
            correct += pred.eq(target).sum().item()
    
    print(f'Epoch {epoch+1}: Accuracy = {100. * correct / len(test_data):.2f}%')
```

---

# Project 5: Movie Review Sentiment Analysis

## 🎯 Problem Statement

**Business Context:** Movie studios need to gauge audience reception from reviews to predict box office performance and adjust marketing.

**Goal:** Classify movie reviews as positive or negative.

## 📊 Dataset

| Source | Name | Size |
|--------|------|------|
| Stanford | [IMDB Reviews](https://ai.stanford.edu/~amaas/data/sentiment/) | 50K reviews |
| Hugging Face | `imdb` | Same, easy to load |

## 🔄 Input → Output

```
INPUT:                                       OUTPUT:
┌──────────────────────────────────────┐    ┌─────────────────┐
│ "This movie was absolutely stunning! │    │                 │
│  The acting was superb, and the      │───►│  POSITIVE       │
│  cinematography took my breath away. │    │  Score: 0.94    │
│  A must-watch for film lovers."      │    │                 │
└──────────────────────────────────────┘    └─────────────────┘
```

## 🤖 Model Choices

| Model | Why | Expected Accuracy |
|-------|-----|-------------------|
| **Bag of Words + NB** | Simple baseline | ~85% |
| **TF-IDF + SVM** | Better features | ~88% |
| **LSTM** | Sequence modeling | ~88% |
| **BERT** | State-of-art NLP | ~93% |

## 💻 Quick Start Code

```python
from transformers import pipeline

# Easy way with pretrained BERT
sentiment = pipeline('sentiment-analysis')

reviews = [
    "This movie was absolutely stunning!",
    "Waste of time. Terrible acting and boring plot."
]

for review in reviews:
    result = sentiment(review)[0]
    print(f"Review: {review[:50]}...")
    print(f"Sentiment: {result['label']}, Score: {result['score']:.2f}\n")

# For training your own, see Project 3 (Spam) pattern with IMDB data
```

---

# Project 6: Customer Segmentation

## 🎯 Problem Statement

**Business Context:** An e-commerce company wants to segment customers for targeted marketing campaigns.

**Goal:** Group customers into distinct segments based on purchasing behavior.

## 📊 Dataset

| Source | Name | Size |
|--------|------|------|
| Kaggle | [Mall Customer Segmentation](https://www.kaggle.com/datasets/vjchoudhary7/customer-segmentation-tutorial-in-python) | 200 customers |
| Alternative | [Online Retail](https://archive.ics.uci.edu/ml/datasets/online+retail) | 500K+ transactions |

## 🤖 Model Choices

| Model | Why | Use Case |
|-------|-----|----------|
| **K-Means** | Simple, fast | First pass |
| **DBSCAN** | Finds outliers | Detect unusual customers |
| **Hierarchical** | Visual dendrograms | Understand cluster hierarchy |
| **GMM** | Soft clustering | Overlapping segments |

## 💻 Quick Start Code

```python
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import matplotlib.pyplot as plt

# Load
df = pd.read_csv('Mall_Customers.csv')

# Features for clustering
X = df[['Annual Income (k$)', 'Spending Score (1-100)']]

# Scale
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Find optimal K using elbow method
inertias = []
for k in range(1, 11):
    km = KMeans(n_clusters=k, random_state=42)
    km.fit(X_scaled)
    inertias.append(km.inertia_)

# Cluster with K=5
kmeans = KMeans(n_clusters=5, random_state=42)
df['Cluster'] = kmeans.fit_predict(X_scaled)

# Visualize
plt.figure(figsize=(10, 6))
plt.scatter(df['Annual Income (k$)'], df['Spending Score (1-100)'], 
            c=df['Cluster'], cmap='viridis')
plt.xlabel('Annual Income (k$)')
plt.ylabel('Spending Score')
plt.title('Customer Segments')
plt.colorbar(label='Cluster')
plt.show()

# Describe segments
print(df.groupby('Cluster').agg({
    'Annual Income (k$)': 'mean',
    'Spending Score (1-100)': 'mean',
    'Age': 'mean'
}).round(1))
```

---

# Project 7: Credit Card Fraud Detection

## 🎯 Problem Statement

**Business Context:** Credit card fraud costs billions annually. Banks need real-time detection to block fraudulent transactions while minimizing false declines.

**Goal:** Identify fraudulent transactions in real-time.

## 📊 Dataset

| Source | Name | Size | Fraud Rate |
|--------|------|------|------------|
| Kaggle | [Credit Card Fraud Detection](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud) | 284,807 transactions | 0.17% |

## 🔄 Input → Output

```
INPUT:                              OUTPUT:
┌────────────────────────┐         ┌─────────────────────────┐
│ • Amount: $2,500       │         │                         │
│ • Time: 3:42 AM        │   ───►  │  Risk Score: 0.89       │
│ • Location: New city   │         │  Decision: BLOCK        │
│ • Merchant: Online     │         │  Send verification SMS  │
│ • V1-V28: PCA features │         │                         │
└────────────────────────┘         └─────────────────────────┘
```

## 🤖 Model Choices

| Model | Why | Note |
|-------|-----|------|
| **Isolation Forest** | Unsupervised anomaly | No labels needed |
| **Random Forest** | Good with imbalance | Use class weights |
| **XGBoost** | Best performance | Scale_pos_weight |
| **Autoencoder** | Reconstruction error | Learn normal patterns |

**Key Challenge:** Extreme class imbalance (0.17% fraud)

## 📏 Evaluation Metrics

| Metric | Why |
|--------|-----|
| **Precision-Recall AUC** | Better than ROC for imbalanced |
| **Recall** | Catch fraud (most important) |
| **Precision** | Minimize customer friction |

---

# Project 8: Stock Price Predictor (Basic)

## 🎯 Problem Statement

**Business Context:** Quantitative traders need price direction predictions for trading strategies.

**Goal:** Predict next-day closing price or direction.

## 📊 Dataset

| Source | Name |
|--------|------|
| Yahoo Finance | `yfinance` Python library |
| Kaggle | [S&P 500 Stock Data](https://www.kaggle.com/datasets/camnugent/sandp500) |

## 🤖 Model Choices

| Model | Type | Use Case |
|-------|------|----------|
| **ARIMA** | Statistical | Baseline |
| **Prophet** | Facebook's model | Easy, handles seasonality |
| **LSTM** | Deep Learning | Sequence patterns |

**Warning:** Predicting stock prices is VERY hard. Use this for learning, not trading!

## 💻 Quick Start Code

```python
import yfinance as yf
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler
import numpy as np

# Download data
ticker = 'AAPL'
df = yf.download(ticker, start='2020-01-01', end='2024-01-01')

# Feature engineering
df['Returns'] = df['Close'].pct_change()
df['MA_7'] = df['Close'].rolling(7).mean()
df['MA_21'] = df['Close'].rolling(21).mean()
df['RSI'] = calculate_rsi(df['Close'])  # You'd implement this
df = df.dropna()

# Target: Next day direction (1 = up, 0 = down)
df['Target'] = (df['Close'].shift(-1) > df['Close']).astype(int)
df = df.dropna()

# This is a starting point - see LSTM implementation for deep learning approach
```

---

# Projects 9-20: Quick Summaries

Due to space, here are concise summaries for remaining beginner projects:

---

## Project 9: Image Classifier (Animals)

| Item | Details |
|------|---------|
| **Dataset** | [Animals-10](https://www.kaggle.com/datasets/alessiocorrado99/animals10) (26K images) |
| **Task** | Classify 10 animal categories |
| **Model** | ResNet-18 with transfer learning |
| **Key Learning** | Fine-tuning pretrained CNNs |

---

## Project 10: News Category Classifier

| Item | Details |
|------|---------|
| **Dataset** | [AG News](https://huggingface.co/datasets/ag_news) (120K articles) |
| **Task** | Classify into 4 categories |
| **Model** | DistilBERT fine-tuned |
| **Key Learning** | Multi-class NLP classification |

---

## Project 11: Loan Approval Predictor

| Item | Details |
|------|---------|
| **Dataset** | [Loan Prediction](https://www.kaggle.com/datasets/altruistdelhite04/loan-prediction-problem-dataset) |
| **Task** | Binary approval prediction |
| **Model** | XGBoost with feature engineering |
| **Key Learning** | Handling categorical features, class imbalance |

---

## Project 12: Iris Species Classifier

| Item | Details |
|------|---------|
| **Dataset** | Built-in sklearn iris dataset |
| **Task** | Classify 3 iris species |
| **Model** | Decision Tree → Random Forest |
| **Key Learning** | ML fundamentals, visualization |

---

## Project 13: Face Detection System

| Item | Details |
|------|---------|
| **Dataset** | Use webcam or [WIDER Face](http://shuoyang1213.me/WIDERFACE/) |
| **Task** | Detect faces in images |
| **Model** | OpenCV Haar Cascades → MTCNN |
| **Key Learning** | Object detection basics |

---

## Project 14: Tweet Sentiment Analyzer

| Item | Details |
|------|---------|
| **Dataset** | [Sentiment140](https://www.kaggle.com/datasets/kazanova/sentiment140) (1.6M tweets) |
| **Task** | Classify tweet sentiment |
| **Model** | TF-IDF + Logistic Regression |
| **Key Learning** | Social media NLP, API integration |

---

## Project 15: Diabetes Prediction

| Item | Details |
|------|---------|
| **Dataset** | [Pima Indians Diabetes](https://www.kaggle.com/datasets/uciml/pima-indians-diabetes-database) |
| **Task** | Binary diabetes prediction |
| **Model** | Ensemble (RF + XGB + LR) |
| **Key Learning** | Healthcare ML, interpretability |

---

## Project 16: Wine Quality Predictor

| Item | Details |
|------|---------|
| **Dataset** | [Wine Quality](https://archive.ics.uci.edu/ml/datasets/wine+quality) |
| **Task** | Predict quality score (regression/classification) |
| **Model** | Random Forest, Feature importance analysis |
| **Key Learning** | Regression, multicollinearity |

---

## Project 17: Fashion Item Classifier

| Item | Details |
|------|---------|
| **Dataset** | Fashion-MNIST (70K images) |
| **Task** | Classify 10 clothing categories |
| **Model** | CNN with data augmentation |
| **Key Learning** | Image augmentation, CNN architectures |

---

## Project 18: Simple Chatbot

| Item | Details |
|------|---------|
| **Dataset** | Create your own intents JSON |
| **Task** | Intent classification + response |
| **Model** | TF-IDF + Cosine similarity |
| **Key Learning** | Chatbot fundamentals |

---

## Project 19: Titanic Survival Predictor

| Item | Details |
|------|---------|
| **Dataset** | [Titanic](https://www.kaggle.com/competitions/titanic) |
| **Task** | Predict survival |
| **Model** | Complete ML pipeline with ensemble |
| **Key Learning** | End-to-end ML workflow |

---

## Project 20: Heart Disease Predictor

| Item | Details |
|------|---------|
| **Dataset** | [Heart Disease UCI](https://archive.ics.uci.edu/ml/datasets/heart+disease) |
| **Task** | Binary classification |
| **Model** | Logistic Regression → XGBoost |
| **Key Learning** | Medical ML, feature importance |

---

## 🎯 Beginner Projects Checklist

Complete at least **10 projects** before moving to Intermediate:

- [ ] 3 Classical ML projects
- [ ] 3 NLP projects  
- [ ] 3 Computer Vision projects
- [ ] 1 Time Series project

---

**Next:** [02-Intermediate-Projects.md](./02-Intermediate-Projects.md) →
