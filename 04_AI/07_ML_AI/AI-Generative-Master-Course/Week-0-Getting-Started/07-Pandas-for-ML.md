# 🐼 Pandas for Machine Learning

## 📚 Table of Contents
1. [What is Pandas?](#-what-is-pandas)
2. [Why Pandas for ML?](#-why-pandas-for-ml)
3. [DataFrames vs NumPy Arrays](#-dataframes-vs-numpy-arrays)
4. [Creating DataFrames](#-creating-dataframes)
5. [Loading Data](#-loading-data)
6. [Exploring Data](#-exploring-data)
7. [Selecting Data](#-selecting-data)
8. [Filtering & Querying](#-filtering--querying)
9. [Handling Missing Data](#-handling-missing-data)
10. [Data Transformation](#-data-transformation)
11. [Grouping & Aggregation](#-grouping--aggregation)
12. [Merging & Joining](#-merging--joining)
13. [ML-Specific Operations](#-ml-specific-operations)
14. [Common ML Patterns](#-common-ml-patterns)
15. [Mini Project](#-mini-project)
16. [Exercises](#-exercises)

---

## 🎯 What is Pandas?

```
Pandas = "Panel Data" (Python Data Analysis Library)

Think of it as:
┌────────────────────────────────────────────────┐
│  Excel/SQL for Python                          │
│  + NumPy's speed                               │
│  + Python's flexibility                        │
│  = Perfect for ML data preprocessing!          │
└────────────────────────────────────────────────┘
```

**Installation:**
```bash
pip install pandas
```

**Import Convention:**
```python
import pandas as pd  # Always use 'pd' alias
import numpy as np   # Used together frequently
```

---

## 🤔 Why Pandas for ML?

### The Reality of ML Projects

```
ML Project Workflow:
┌─────────────────────────────────────────────────┐
│  1. Load data        ← Pandas (CSV, Excel, SQL) │
│  2. Clean data       ← Pandas (missing, dupes)  │
│  3. Explore data     ← Pandas (stats, viz)      │
│  4. Transform data   ← Pandas (encode, scale)   │
│  5. Split data       ← Pandas + sklearn         │
│  6. Train model      ← sklearn/PyTorch          │
│  7. Evaluate model   ← Pandas (results analysis)│
└─────────────────────────────────────────────────┘

80% of steps use Pandas!
```

**What Pandas does for ML:**
- ✅ **Load any data format**: CSV, Excel, JSON, SQL, Parquet
- ✅ **Handle messy real-world data**: Missing values, duplicates, wrong types
- ✅ **Transform features**: Encode categories, create new features, normalize
- ✅ **Explore patterns**: Group, aggregate, pivot, correlations
- ✅ **Prepare for models**: Train-test split, feature selection

---

## 📊 DataFrames vs NumPy Arrays

### Comparison

```python
import numpy as np
import pandas as pd

# NumPy Array (just numbers)
np_array = np.array([[25, 50000],
                     [30, 75000],
                     [35, 100000]])

print(np_array)
# [[   25 50000]
#  [   30 75000]
#  [   35 100000]]

# Pandas DataFrame (with labels!)
df = pd.DataFrame({
    'Age': [25, 30, 35],
    'Salary': [50000, 75000, 100000]
})

print(df)
#    Age  Salary
# 0   25   50000
# 1   30   75000
# 2   35  100000
```

### Key Differences

```
┌──────────────────────────────────────────────────────┐
│  NumPy Arrays                  Pandas DataFrames     │
│  ═══════════════               ═══════════════════   │
│  • Just numbers                • Named columns       │
│  • 2D: rows × columns          • Column names + index│
│  • No labels                   • Mixed data types    │
│  • Fast math                   • SQL-like operations │
│  • Used for: math, models      • Used for: data prep │
└──────────────────────────────────────────────────────┘
```

**When to use what:**

```python
"""
NumPy: When you have clean numeric data and need speed
  → Training neural networks
  → Matrix operations
  → Scientific computing

Pandas: When you need to work with real-world messy data
  → Loading CSVs
  → Data cleaning
  → Feature engineering
  → Exploratory data analysis
"""
```

---

## 🏗️ Creating DataFrames

### Method 1: From Dictionary

```python
import pandas as pd

# Dictionary → DataFrame
data = {
    'Name': ['Alice', 'Bob', 'Charlie'],
    'Age': [25, 30, 35],
    'City': ['NYC', 'LA', 'Chicago']
}

df = pd.DataFrame(data)
print(df)
#       Name  Age     City
# 0    Alice   25      NYC
# 1      Bob   30       LA
# 2  Charlie   35  Chicago
```

### Method 2: From List of Lists

```python
# List of lists + column names
data = [
    ['Alice', 25, 'NYC'],
    ['Bob', 30, 'LA'],
    ['Charlie', 35, 'Chicago']
]

df = pd.DataFrame(data, columns=['Name', 'Age', 'City'])
print(df)
```

### Method 3: From NumPy Array

```python
import numpy as np

# NumPy array → DataFrame
arr = np.array([[1, 2, 3],
                [4, 5, 6],
                [7, 8, 9]])

df = pd.DataFrame(arr, columns=['A', 'B', 'C'])
print(df)
#    A  B  C
# 0  1  2  3
# 1  4  5  6
# 2  7  8  9
```

### Method 4: From List of Dictionaries

```python
# List of dicts (each dict = one row)
data = [
    {'Name': 'Alice', 'Age': 25, 'City': 'NYC'},
    {'Name': 'Bob', 'Age': 30, 'City': 'LA'},
    {'Name': 'Charlie', 'Age': 35}  # Missing City → NaN
]

df = pd.DataFrame(data)
print(df)
#       Name  Age     City
# 0    Alice   25      NYC
# 1      Bob   30       LA
# 2  Charlie   35      NaN
```

---

## 📂 Loading Data

### CSV Files (Most Common)

```python
# Load CSV
df = pd.read_csv('data.csv')

# With options
df = pd.read_csv('data.csv',
                 sep=',',              # Delimiter (default: comma)
                 header=0,             # Row with column names (default: first row)
                 index_col=0,          # Column to use as index
                 na_values=['NA', '?'], # Additional missing value markers
                 parse_dates=['date'],  # Parse date columns
                 nrows=1000)           # Only load first 1000 rows

# Load from URL
url = 'https://raw.githubusercontent.com/datasciencedojo/datasets/master/titanic.csv'
df = pd.read_csv(url)
```

### Excel Files

```python
# Single sheet
df = pd.read_excel('data.xlsx')

# Specific sheet
df = pd.read_excel('data.xlsx', sheet_name='Sheet1')

# Multiple sheets
excel_file = pd.ExcelFile('data.xlsx')
df1 = excel_file.parse('Sheet1')
df2 = excel_file.parse('Sheet2')
```

### JSON Files

```python
# Load JSON
df = pd.read_json('data.json')

# With orientation
df = pd.read_json('data.json', orient='records')
# orient options: 'split', 'records', 'index', 'columns', 'values'
```

### SQL Databases

```python
import sqlite3

# Connect to database
conn = sqlite3.connect('database.db')

# Read SQL query
df = pd.read_sql_query("SELECT * FROM users", conn)

# Or read entire table
df = pd.read_sql_table('users', conn)
```

### Other Formats

```python
# Parquet (fast, compressed)
df = pd.read_parquet('data.parquet')

# HDF5 (large datasets)
df = pd.read_hdf('data.h5', key='df')

# Pickle (Python objects)
df = pd.read_pickle('data.pkl')

# Clipboard (paste from Excel)
df = pd.read_clipboard()
```

---

## 🔍 Exploring Data

### Basic Info

```python
# Load sample data
df = pd.read_csv('titanic.csv')

# Shape (rows, columns)
print(df.shape)  # (891, 12)

# First/last rows
print(df.head())      # First 5 rows (default)
print(df.head(10))    # First 10 rows
print(df.tail())      # Last 5 rows

# Column names
print(df.columns)
# Index(['PassengerId', 'Survived', 'Pclass', ...])

# Data types
print(df.dtypes)
# PassengerId      int64
# Name            object
# Age            float64
# ...

# Summary info
df.info()
# <class 'pandas.core.frame.DataFrame'>
# RangeIndex: 891 entries, 0 to 890
# Data columns (total 12 columns):
#  #   Column       Non-Null Count  Dtype  
# ---  ------       --------------  -----  
#  0   PassengerId  891 non-null    int64  
#  1   Survived     891 non-null    int64  
#  2   Pclass       891 non-null    int64  
#  3   Name         891 non-null    object 
#  4   Sex          891 non-null    object 
#  5   Age          714 non-null    float64  ← 177 missing!
# ...
```

### Statistical Summary

```python
# Numerical columns
print(df.describe())
#        PassengerId    Survived      Pclass  ...
# count   891.000000  891.000000  891.000000  ...
# mean    446.000000    0.383838    2.308642  ...
# std     257.353842    0.486592    0.836071  ...
# min       1.000000    0.000000    1.000000  ...
# 25%     223.500000    0.000000    2.000000  ...
# 50%     446.000000    0.000000    3.000000  ...
# 75%     668.500000    1.000000    3.000000  ...
# max     891.000000    1.000000    3.000000  ...

# Categorical columns
print(df.describe(include='object'))
#         Name   Sex Ticket Cabin Embarked
# count    891   891    891   204      889
# unique   891     2    681   147        3
# top     ... male  ...   ...        S
# freq       1   577    ...   ...      644

# All columns
print(df.describe(include='all'))
```

### Unique Values

```python
# Unique values in a column
print(df['Sex'].unique())
# ['male' 'female']

# Count unique values
print(df['Sex'].nunique())
# 2

# Value counts (frequency)
print(df['Sex'].value_counts())
# male      577
# female    314

# With percentages
print(df['Sex'].value_counts(normalize=True))
# male      0.647587
# female    0.352413
```

### Missing Data

```python
# Count missing values per column
print(df.isnull().sum())
# PassengerId      0
# Survived         0
# Pclass           0
# Name             0
# Sex              0
# Age            177  ← Missing!
# SibSp            0
# Parch            0
# Ticket           0
# Fare             0
# Cabin          687  ← Lots missing!
# Embarked         2

# Percentage missing
print(df.isnull().mean() * 100)
# Age       19.87%
# Cabin     77.10%
# Embarked   0.22%

# Check for any missing values
print(df.isnull().any().any())  # True if any missing
```

---

## 🎯 Selecting Data

### Selecting Columns

```python
# Single column (returns Series)
ages = df['Age']
print(type(ages))  # <class 'pandas.core.series.Series'>

# Multiple columns (returns DataFrame)
subset = df[['Name', 'Age', 'Sex']]
print(type(subset))  # <class 'pandas.core.frame.DataFrame'>

# Using dot notation (only if no spaces in name)
names = df.Name  # Same as df['Name']
```

### Selecting Rows by Index

```python
# First row
first_row = df.iloc[0]

# Multiple rows by position
first_five = df.iloc[0:5]  # Rows 0-4
last_three = df.iloc[-3:]  # Last 3 rows

# Specific rows
rows = df.iloc[[0, 5, 10]]  # Rows 0, 5, 10

# Rows and columns
subset = df.iloc[0:5, 0:3]  # First 5 rows, first 3 columns
```

### Selecting by Label

```python
# By row label (index)
row = df.loc[0]

# By row and column labels
value = df.loc[0, 'Age']

# Multiple rows and columns
subset = df.loc[0:5, ['Name', 'Age', 'Sex']]

# All rows, specific columns
subset = df.loc[:, ['Name', 'Age']]
```

---

## 🔎 Filtering & Querying

### Boolean Indexing

```python
# Single condition
adults = df[df['Age'] > 18]

# Multiple conditions (AND)
adult_males = df[(df['Age'] > 18) & (df['Sex'] == 'male')]

# Multiple conditions (OR)
young_or_old = df[(df['Age'] < 18) | (df['Age'] > 60)]

# NOT condition
non_survivors = df[~(df['Survived'] == 1)]
# Or equivalently:
non_survivors = df[df['Survived'] == 0]
```

### Query Method

```python
# Using query (cleaner syntax)
adults = df.query('Age > 18')

# Multiple conditions
adult_males = df.query('Age > 18 and Sex == "male"')

# Using variables
min_age = 18
adults = df.query('Age > @min_age')

# In/not in
first_class = df.query('Pclass in [1, 2]')
```

### isin Method

```python
# Filter by multiple values
cities = df[df['Embarked'].isin(['S', 'C'])]

# Not in
not_queenstown = df[~df['Embarked'].isin(['Q'])]
```

### String Operations

```python
# Contains
mr_passengers = df[df['Name'].str.contains('Mr.')]

# Starts with
a_names = df[df['Name'].str.startswith('A')]

# Ends with
son_names = df[df['Name'].str.endswith('son')]

# Case-insensitive
mr_passengers = df[df['Name'].str.contains('mr', case=False)]
```

---

## 🕳️ Handling Missing Data

### Detecting Missing Data

```python
# Check for missing values
print(df.isnull())  # Boolean DataFrame
print(df.notnull())  # Opposite

# Count missing per column
print(df.isnull().sum())

# Rows with any missing values
rows_with_missing = df[df.isnull().any(axis=1)]

# Rows with all missing values
rows_all_missing = df[df.isnull().all(axis=1)]
```

### Removing Missing Data

```python
# Drop rows with ANY missing values
df_clean = df.dropna()

# Drop rows where specific columns are missing
df_clean = df.dropna(subset=['Age'])

# Drop columns with ANY missing values
df_clean = df.dropna(axis=1)

# Drop rows with ALL missing values
df_clean = df.dropna(how='all')

# Drop if more than N values are missing
df_clean = df.dropna(thresh=10)  # Keep rows with at least 10 non-null values
```

### Filling Missing Data

```python
# Fill with a specific value
df['Age'].fillna(0, inplace=True)

# Fill with mean
df['Age'].fillna(df['Age'].mean(), inplace=True)

# Fill with median (better for outliers)
df['Age'].fillna(df['Age'].median(), inplace=True)

# Fill with mode (most common value)
df['Embarked'].fillna(df['Embarked'].mode()[0], inplace=True)

# Forward fill (use previous value)
df['Age'].fillna(method='ffill', inplace=True)

# Backward fill (use next value)
df['Age'].fillna(method='bfill', inplace=True)

# Different values for different columns
fill_values = {'Age': df['Age'].mean(), 
               'Embarked': 'S'}
df.fillna(fill_values, inplace=True)
```

---

## 🔄 Data Transformation

### Adding/Removing Columns

```python
# Add new column
df['AgeGroup'] = df['Age'].apply(lambda x: 'Child' if x < 18 else 'Adult')

# Add column from calculation
df['FamilySize'] = df['SibSp'] + df['Parch'] + 1

# Add constant column
df['Source'] = 'Titanic'

# Remove column
df.drop('Source', axis=1, inplace=True)

# Remove multiple columns
df.drop(['SibSp', 'Parch'], axis=1, inplace=True)

# Rename columns
df.rename(columns={'Pclass': 'PassengerClass', 'Sex': 'Gender'}, inplace=True)
```

### Apply Functions

```python
# Apply function to column
df['Age_Squared'] = df['Age'].apply(lambda x: x**2)

# Apply function to multiple columns
df['Full_Name'] = df.apply(lambda row: f"{row['Name']} ({row['Age']})", axis=1)

# Map values
sex_map = {'male': 0, 'female': 1}
df['Sex_Encoded'] = df['Sex'].map(sex_map)

# Replace values
df['Embarked'].replace({'S': 'Southampton', 'C': 'Cherbourg', 'Q': 'Queenstown'}, inplace=True)
```

### Sorting

```python
# Sort by single column
df_sorted = df.sort_values('Age')

# Sort descending
df_sorted = df.sort_values('Age', ascending=False)

# Sort by multiple columns
df_sorted = df.sort_values(['Pclass', 'Age'])

# Sort by index
df_sorted = df.sort_index()
```

### Type Conversion

```python
# Convert data types
df['PassengerId'] = df['PassengerId'].astype(str)
df['Age'] = df['Age'].astype(int)  # Will fail if NaN present!

# Safe conversion
df['Age'] = pd.to_numeric(df['Age'], errors='coerce')  # Invalid → NaN

# Convert to datetime
df['Date'] = pd.to_datetime(df['Date'])

# Convert to category (saves memory)
df['Sex'] = df['Sex'].astype('category')
```

---

## 📊 Grouping & Aggregation

### Basic Grouping

```python
# Group by single column
grouped = df.groupby('Sex')

# Calculate mean for each group
print(grouped['Age'].mean())
# Sex
# female    27.915709
# male      30.726645

# Multiple aggregations
print(grouped['Age'].agg(['mean', 'median', 'std']))
#            mean  median        std
# Sex                               
# female  27.916    27.0  14.110146
# male    30.727    29.0  14.678201
```

### Multiple Grouping

```python
# Group by multiple columns
grouped = df.groupby(['Pclass', 'Sex'])

# Calculate mean
print(grouped['Age'].mean())
# Pclass  Sex   
# 1       female    34.611765
#         male      41.281386
# 2       female    28.722973
#         male      30.740707
# 3       female    21.750000
#         male      26.507589
```

### Custom Aggregations

```python
# Multiple aggregations on different columns
agg_dict = {
    'Age': ['mean', 'min', 'max'],
    'Fare': ['mean', 'sum'],
    'Survived': 'sum'
}

result = df.groupby('Pclass').agg(agg_dict)
print(result)
```

### Transformation

```python
# Normalize within groups
df['Age_Normalized'] = df.groupby('Pclass')['Age'].transform(lambda x: (x - x.mean()) / x.std())

# Fill missing values with group mean
df['Age'] = df.groupby('Pclass')['Age'].transform(lambda x: x.fillna(x.mean()))
```

### Pivot Tables

```python
# Create pivot table
pivot = df.pivot_table(
    values='Survived',
    index='Pclass',
    columns='Sex',
    aggfunc='mean'
)

print(pivot)
# Sex       female      male
# Pclass                    
# 1       0.968085  0.368852
# 2       0.921053  0.157407
# 3       0.500000  0.135447

# With margins (totals)
pivot = df.pivot_table(
    values='Survived',
    index='Pclass',
    columns='Sex',
    aggfunc='mean',
    margins=True
)
```

---

## 🔗 Merging & Joining

### Concatenating DataFrames

```python
# Vertically (stack rows)
df1 = pd.DataFrame({'A': [1, 2], 'B': [3, 4]})
df2 = pd.DataFrame({'A': [5, 6], 'B': [7, 8]})
result = pd.concat([df1, df2], ignore_index=True)
#    A  B
# 0  1  3
# 1  2  4
# 2  5  7
# 3  6  8

# Horizontally (add columns)
df3 = pd.DataFrame({'C': [9, 10], 'D': [11, 12]})
result = pd.concat([df1, df3], axis=1)
#    A  B   C   D
# 0  1  3   9  11
# 1  2  4  10  12
```

### Merging (SQL-style Joins)

```python
# Sample data
df_users = pd.DataFrame({
    'user_id': [1, 2, 3, 4],
    'name': ['Alice', 'Bob', 'Charlie', 'David']
})

df_orders = pd.DataFrame({
    'order_id': [101, 102, 103],
    'user_id': [1, 1, 3],
    'amount': [100, 150, 200]
})

# Inner join (default)
result = pd.merge(df_users, df_orders, on='user_id')
#    user_id     name  order_id  amount
# 0        1    Alice       101     100
# 1        1    Alice       102     150
# 2        3  Charlie       103     200

# Left join (keep all from left)
result = pd.merge(df_users, df_orders, on='user_id', how='left')
#    user_id     name  order_id  amount
# 0        1    Alice     101.0   100.0
# 1        1    Alice     102.0   150.0
# 2        2      Bob       NaN     NaN  ← No orders
# 3        3  Charlie     103.0   200.0
# 4        4    David       NaN     NaN  ← No orders

# Right join
result = pd.merge(df_users, df_orders, on='user_id', how='right')

# Outer join (keep all from both)
result = pd.merge(df_users, df_orders, on='user_id', how='outer')
```

---

## 🤖 ML-Specific Operations

### Train-Test Split

```python
from sklearn.model_selection import train_test_split

# Separate features and target
X = df.drop('Survived', axis=1)
y = df['Survived']

# Split 80-20
X_train, X_test, y_train, y_test = train_test_split(
    X, y, 
    test_size=0.2, 
    random_state=42,
    stratify=y  # Preserve class distribution
)

print(f"Training set: {len(X_train)}")
print(f"Test set: {len(X_test)}")
```

### One-Hot Encoding

```python
# Get dummies (one-hot encoding)
df_encoded = pd.get_dummies(df, columns=['Sex', 'Embarked'])

print(df_encoded.columns)
# ['PassengerId', 'Survived', 'Pclass', 'Name', 'Age', 'SibSp', 'Parch',
#  'Ticket', 'Fare', 'Cabin', 'Sex_female', 'Sex_male', 
#  'Embarked_C', 'Embarked_Q', 'Embarked_S']

# Drop first category (avoid multicollinearity)
df_encoded = pd.get_dummies(df, columns=['Sex', 'Embarked'], drop_first=True)
```

### Feature Scaling

```python
from sklearn.preprocessing import StandardScaler

# Select numerical columns
numerical_cols = ['Age', 'Fare']

# Standardize
scaler = StandardScaler()
df[numerical_cols] = scaler.fit_transform(df[numerical_cols])
```

### Correlation Analysis

```python
# Correlation matrix
corr = df.corr()
print(corr)

# Correlation with target
print(df.corr()['Survived'].sort_values(ascending=False))
# Survived    1.000000
# Fare        0.257307
# Parch       0.081629
# SibSp      -0.035322
# Age        -0.077221
# Pclass     -0.338481
```

---

## 🎯 Common ML Patterns

### Pattern 1: Load and Clean

```python
import pandas as pd

# Load data
df = pd.read_csv('data.csv')

# Remove duplicates
df.drop_duplicates(inplace=True)

# Handle missing values
df.dropna(subset=['target'], inplace=True)  # Drop if target is missing
df.fillna(df.mean(), inplace=True)  # Fill others with mean

# Remove outliers (IQR method)
Q1 = df['Age'].quantile(0.25)
Q3 = df['Age'].quantile(0.75)
IQR = Q3 - Q1
df = df[(df['Age'] >= Q1 - 1.5*IQR) & (df['Age'] <= Q3 + 1.5*IQR)]
```

### Pattern 2: Feature Engineering

```python
# Extract from datetime
df['Date'] = pd.to_datetime(df['Date'])
df['Year'] = df['Date'].dt.year
df['Month'] = df['Date'].dt.month
df['DayOfWeek'] = df['Date'].dt.dayofweek
df['IsWeekend'] = df['DayOfWeek'].isin([5, 6]).astype(int)

# Create interaction features
df['Age_Fare'] = df['Age'] * df['Fare']

# Binning
df['AgeGroup'] = pd.cut(df['Age'], bins=[0, 18, 35, 60, 100], 
                         labels=['Child', 'Young', 'Middle', 'Senior'])

# Extract from text
df['Title'] = df['Name'].str.extract(' ([A-Za-z]+)\.', expand=False)
```

### Pattern 3: Encode and Scale

```python
from sklearn.preprocessing import LabelEncoder, StandardScaler

# Label encode target
le = LabelEncoder()
df['target_encoded'] = le.fit_transform(df['target'])

# One-hot encode features
df = pd.get_dummies(df, columns=['category1', 'category2'], drop_first=True)

# Scale numerical features
scaler = StandardScaler()
numerical_cols = ['age', 'income', 'score']
df[numerical_cols] = scaler.fit_transform(df[numerical_cols])
```

---

## 🚀 Mini Project: Titanic Survival Prediction

```python
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report

# ─────────────────────────────────────────────────
# 1. LOAD DATA
# ─────────────────────────────────────────────────
url = 'https://raw.githubusercontent.com/datasciencedojo/datasets/master/titanic.csv'
df = pd.read_csv(url)

print("Dataset shape:", df.shape)
print("\nFirst few rows:")
print(df.head())

# ─────────────────────────────────────────────────
# 2. EXPLORE DATA
# ─────────────────────────────────────────────────
print("\nMissing values:")
print(df.isnull().sum())

print("\nSurvival rate:")
print(df['Survived'].value_counts(normalize=True))

# ─────────────────────────────────────────────────
# 3. FEATURE ENGINEERING
# ─────────────────────────────────────────────────
# Create new features
df['FamilySize'] = df['SibSp'] + df['Parch'] + 1
df['IsAlone'] = (df['FamilySize'] == 1).astype(int)

# Extract title from name
df['Title'] = df['Name'].str.extract(' ([A-Za-z]+)\.', expand=False)

# Simplify titles
title_mapping = {
    'Mr': 'Mr', 'Miss': 'Miss', 'Mrs': 'Mrs', 'Master': 'Master',
    'Dr': 'Rare', 'Rev': 'Rare', 'Col': 'Rare', 'Major': 'Rare', 
    'Mlle': 'Miss', 'Countess': 'Rare', 'Ms': 'Miss', 'Lady': 'Rare',
    'Jonkheer': 'Rare', 'Don': 'Rare', 'Dona': 'Rare', 'Mme': 'Mrs',
    'Capt': 'Rare', 'Sir': 'Rare'
}
df['Title'] = df['Title'].map(title_mapping)

# ─────────────────────────────────────────────────
# 4. HANDLE MISSING VALUES
# ─────────────────────────────────────────────────
# Fill Age with median by Title
df['Age'] = df.groupby('Title')['Age'].transform(lambda x: x.fillna(x.median()))

# Fill Embarked with mode
df['Embarked'].fillna(df['Embarked'].mode()[0], inplace=True)

# Drop Cabin (too many missing)
df.drop('Cabin', axis=1, inplace=True)

# ─────────────────────────────────────────────────
# 5. SELECT FEATURES
# ─────────────────────────────────────────────────
features = ['Pclass', 'Sex', 'Age', 'Fare', 'Embarked', 'FamilySize', 'IsAlone', 'Title']
X = df[features].copy()
y = df['Survived']

# ─────────────────────────────────────────────────
# 6. ENCODE CATEGORICAL VARIABLES
# ─────────────────────────────────────────────────
X = pd.get_dummies(X, columns=['Sex', 'Embarked', 'Title'], drop_first=True)

print("\nFeatures after encoding:")
print(X.columns.tolist())

# ─────────────────────────────────────────────────
# 7. SPLIT DATA
# ─────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print(f"\nTraining set: {len(X_train)}")
print(f"Test set: {len(X_test)}")

# ─────────────────────────────────────────────────
# 8. SCALE FEATURES
# ─────────────────────────────────────────────────
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# ─────────────────────────────────────────────────
# 9. TRAIN MODEL
# ─────────────────────────────────────────────────
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train_scaled, y_train)

# ─────────────────────────────────────────────────
# 10. EVALUATE
# ─────────────────────────────────────────────────
y_pred = model.predict(X_test_scaled)

print("\n" + "="*50)
print("RESULTS")
print("="*50)
print(f"Accuracy: {accuracy_score(y_test, y_pred):.3f}")
print("\nClassification Report:")
print(classification_report(y_test, y_pred))

# Feature importance
feature_importance = pd.DataFrame({
    'feature': X.columns,
    'importance': model.feature_importances_
}).sort_values('importance', ascending=False)

print("\nTop 10 Important Features:")
print(feature_importance.head(10))
```

---

## 📝 Exercises

### Easy
1. Load a CSV file and display the first 10 rows
2. Find the number of missing values in each column
3. Calculate the mean, median, and standard deviation of a numerical column
4. Filter rows where a column value is greater than a threshold
5. Create a new column by combining two existing columns

### Medium
6. Group data by a category and calculate aggregate statistics
7. Handle missing values using different strategies (mean, median, mode)
8. Create a pivot table showing average values by two categories
9. Merge two DataFrames on a common column
10. Encode categorical variables using one-hot encoding

### Advanced
11. Build a complete preprocessing pipeline for a real dataset
12. Create custom features from datetime columns
13. Detect and remove outliers using the IQR method
14. Perform correlation analysis and visualize with heatmap
15. Implement stratified train-test split and verify class distribution

---

## 🎯 Key Takeaways

✅ **Pandas is essential for ML** - 80% of your time will be data preprocessing

✅ **DataFrames > NumPy arrays** - For real-world messy data with labels

✅ **Always explore first** - `.info()`, `.describe()`, `.isnull().sum()`

✅ **Handle missing data thoughtfully** - Don't just drop everything

✅ **Feature engineering matters** - Often more important than model choice

✅ **Use method chaining** - Write cleaner, more Pythonic code

✅ **Learn groupby** - Most powerful feature for analysis

---

## 🔜 Next Steps

Continue to → [08-Matplotlib-Seaborn.md](./08-Matplotlib-Seaborn.md)

Now that you can **load and manipulate data**, let's learn how to **visualize it** for better insights and debugging!

**Remember:** Good data preprocessing is 80% of ML success! 🐼✨
