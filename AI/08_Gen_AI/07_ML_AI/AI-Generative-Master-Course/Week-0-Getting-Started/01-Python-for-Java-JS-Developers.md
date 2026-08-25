# 🐍 Python for Java/JavaScript Developers

## 📚 Table of Contents
1. [Why Python for AI/ML?](#-why-python-for-aiml)
2. [Syntax Mapping](#-syntax-mapping)
3. [Python Fundamentals](#-python-fundamentals)
4. [Collections](#-collections)
5. [Functions](#-functions)
6. [Object-Oriented Python](#-object-oriented-python)
7. [Pythonic Patterns](#-pythonic-patterns)
8. [Type Hints](#-type-hints)
9. [Common Gotchas](#-common-gotchas)
10. [Mini Project](#-mini-project)
11. [Exercises](#-exercises)

---

## 🎯 Why Python for AI/ML?

```
Why not Java or JavaScript for AI?

Java:
├── Verbose (too much boilerplate)
├── Limited ML libraries
├── JVM overhead for numeric computation
└── Not the industry standard

JavaScript:
├── Single-threaded
├── No native numeric support
├── Limited ML ecosystem
└── Browser-focused

Python:
├── Clean, readable syntax
├── NumPy (C-speed arrays)
├── PyTorch, TensorFlow (industry standard)
├── Hugging Face, LangChain, etc.
├── Jupyter notebooks
└── EVERYONE uses it for AI/ML

You don't have a choice – Python IS the language of AI.
```

---

## 🔄 Syntax Mapping

### Variables & Types

```java
// JAVA
int x = 5;
double y = 3.14;
String name = "Alice";
boolean flag = true;
int[] arr = {1, 2, 3};
final int CONST = 100;
```

```javascript
// JAVASCRIPT
let x = 5;
const y = 3.14;
let name = "Alice";
let flag = true;
let arr = [1, 2, 3];
const CONST = 100;
```

```python
# PYTHON
x = 5           # No type declaration needed
y = 3.14
name = "Alice"
flag = True     # Capital T/F!
arr = [1, 2, 3]
CONST = 100     # Convention only (not enforced)

# With type hints (recommended for AI code):
x: int = 5
y: float = 3.14
name: str = "Alice"
flag: bool = True
```

### Print Statements

```java
// JAVA
System.out.println("Hello " + name);
System.out.printf("Value: %d", x);
```

```javascript
// JAVASCRIPT
console.log("Hello " + name);
console.log(`Value: ${x}`);  // Template literal
```

```python
# PYTHON
print("Hello " + name)
print(f"Value: {x}")  # f-string (USE THIS!)
print("Value:", x)    # Automatic spacing
```

### Conditionals

```java
// JAVA
if (x > 0) {
    System.out.println("Positive");
} else if (x < 0) {
    System.out.println("Negative");
} else {
    System.out.println("Zero");
}

int result = (x > 0) ? 1 : 0;
```

```javascript
// JAVASCRIPT
if (x > 0) {
    console.log("Positive");
} else if (x < 0) {
    console.log("Negative");
} else {
    console.log("Zero");
}

const result = x > 0 ? 1 : 0;
```

```python
# PYTHON - NO BRACES! Indentation matters!
if x > 0:
    print("Positive")
elif x < 0:    # elif, not else if!
    print("Negative")
else:
    print("Zero")

result = 1 if x > 0 else 0  # Ternary (different order!)
```

### Loops

```java
// JAVA
for (int i = 0; i < 10; i++) {
    System.out.println(i);
}

for (String item : items) {
    System.out.println(item);
}

int i = 0;
while (i < 10) {
    i++;
}
```

```javascript
// JAVASCRIPT
for (let i = 0; i < 10; i++) {
    console.log(i);
}

for (const item of items) {
    console.log(item);
}

items.forEach(item => console.log(item));
```

```python
# PYTHON
for i in range(10):  # 0 to 9
    print(i)

for item in items:
    print(item)

# With index:
for i, item in enumerate(items):
    print(f"{i}: {item}")

i = 0
while i < 10:
    i += 1  # No ++ in Python!
```

### Null / None

```java
// JAVA
String s = null;
if (s == null) { ... }
```

```javascript
// JAVASCRIPT
let s = null;
let u = undefined;
if (s === null) { ... }
if (!s) { ... }  // Falsy check
```

```python
# PYTHON
s = None  # Capital N!
if s is None:    # Use 'is', not ==
    pass
if not s:        # Falsy check
    pass
```

---

## 🧱 Python Fundamentals

### Indentation is SYNTAX

```python
# WRONG - IndentationError!
if True:
print("Hello")

# CORRECT
if True:
    print("Hello")  # 4 spaces (convention)

# Nested
if True:
    if True:
        print("Nested")  # 8 spaces
```

### Multiple Assignment

```python
# Swap variables (no temp needed!)
a, b = 1, 2
a, b = b, a  # Now a=2, b=1

# Unpack
x, y, z = [1, 2, 3]
first, *rest = [1, 2, 3, 4]  # first=1, rest=[2,3,4]
```

### String Operations

```python
# f-strings (Python 3.6+) - USE THESE!
name = "Alice"
age = 30
print(f"Name: {name}, Age: {age}")
print(f"Next year: {age + 1}")
print(f"Pi: {3.14159:.2f}")  # Formatting: "3.14"

# Multi-line strings
text = """
This is a
multi-line string
"""

# String methods
s = "hello world"
s.upper()      # "HELLO WORLD"
s.split()      # ["hello", "world"]
s.replace("hello", "hi")  # "hi world"
"_".join(["a", "b", "c"])  # "a_b_c"
```

---

## 📦 Collections

### Lists (like ArrayList / Array)

```python
# Creation
nums = [1, 2, 3, 4, 5]
mixed = [1, "hello", 3.14, True]  # Any types!

# Access
nums[0]      # 1 (first)
nums[-1]     # 5 (last!) - Negative indexing!
nums[1:3]    # [2, 3] (slice: start:end)
nums[::2]    # [1, 3, 5] (every 2nd)
nums[::-1]   # [5, 4, 3, 2, 1] (reversed)

# Modify
nums.append(6)       # Add to end
nums.insert(0, 0)    # Insert at index
nums.extend([7, 8])  # Add multiple
nums.pop()           # Remove last
nums.remove(3)       # Remove first occurrence

# Check
3 in nums    # True
len(nums)    # Length

# List comprehension (VERY IMPORTANT FOR ML!)
squares = [x**2 for x in range(10)]
# Same as:
squares = []
for x in range(10):
    squares.append(x**2)

# With condition
evens = [x for x in range(10) if x % 2 == 0]
```

### Dictionaries (like HashMap / Object)

```python
# Creation
person = {
    "name": "Alice",
    "age": 30,
    "city": "NYC"
}

# Access
person["name"]           # "Alice"
person.get("name")       # "Alice" (safer)
person.get("job", "N/A") # Default if missing

# Modify
person["age"] = 31
person["job"] = "Engineer"  # Add new key
del person["city"]          # Delete

# Iterate
for key in person:
    print(key, person[key])

for key, value in person.items():
    print(f"{key}: {value}")

# Dict comprehension
squares = {x: x**2 for x in range(5)}
# {0: 0, 1: 1, 2: 4, 3: 9, 4: 16}
```

### Sets & Tuples

```python
# Set (unique values, unordered)
s = {1, 2, 3, 3, 3}  # {1, 2, 3}
s.add(4)
s.remove(1)
1 in s  # Fast lookup!

# Tuple (immutable list)
t = (1, 2, 3)
x, y, z = t  # Unpacking
# t[0] = 5  # ERROR! Can't modify

# Common use: return multiple values
def get_stats(data):
    return min(data), max(data), sum(data)/len(data)

minimum, maximum, average = get_stats([1, 2, 3, 4, 5])
```

---

## 🔧 Functions

### Basic Functions

```java
// JAVA
public static int add(int a, int b) {
    return a + b;
}
```

```javascript
// JAVASCRIPT
function add(a, b) {
    return a + b;
}

const add = (a, b) => a + b;  // Arrow
```

```python
# PYTHON
def add(a, b):
    return a + b

# With type hints (recommended!)
def add(a: int, b: int) -> int:
    return a + b

# Default arguments
def greet(name: str, greeting: str = "Hello") -> str:
    return f"{greeting}, {name}!"

greet("Alice")           # "Hello, Alice!"
greet("Alice", "Hi")     # "Hi, Alice!"

# Keyword arguments
greet(greeting="Hey", name="Bob")  # Order doesn't matter

# *args and **kwargs
def flexible(*args, **kwargs):
    print(f"Args: {args}")      # Tuple
    print(f"Kwargs: {kwargs}")  # Dict

flexible(1, 2, 3, name="Alice", age=30)
# Args: (1, 2, 3)
# Kwargs: {'name': 'Alice', 'age': 30}
```

### Lambda Functions

```java
// JAVA
Function<Integer, Integer> square = x -> x * x;
```

```javascript
// JAVASCRIPT
const square = x => x * x;
```

```python
# PYTHON
square = lambda x: x * x

# Common use: sorting
people = [{"name": "Bob", "age": 30}, {"name": "Alice", "age": 25}]
sorted_people = sorted(people, key=lambda p: p["age"])

# Map and filter
nums = [1, 2, 3, 4, 5]
squares = list(map(lambda x: x**2, nums))
evens = list(filter(lambda x: x % 2 == 0, nums))

# But prefer list comprehensions!
squares = [x**2 for x in nums]
evens = [x for x in nums if x % 2 == 0]
```

---

## 🏗️ Object-Oriented Python

### Classes

```java
// JAVA
public class Person {
    private String name;
    private int age;
    
    public Person(String name, int age) {
        this.name = name;
        this.age = age;
    }
    
    public void greet() {
        System.out.println("Hello, " + this.name);
    }
}

Person p = new Person("Alice", 30);
p.greet();
```

```python
# PYTHON
class Person:
    def __init__(self, name: str, age: int):
        self.name = name  # 'self' = 'this'
        self.age = age
    
    def greet(self):  # Methods need 'self' parameter
        print(f"Hello, {self.name}")

p = Person("Alice", 30)  # No 'new' keyword!
p.greet()

# With type hints
from typing import Optional

class Person:
    def __init__(self, name: str, age: int, email: Optional[str] = None):
        self.name = name
        self.age = age
        self.email = email
```

### Inheritance

```python
class Animal:
    def __init__(self, name: str):
        self.name = name
    
    def speak(self):
        raise NotImplementedError

class Dog(Animal):  # Inherits from Animal
    def speak(self):
        return f"{self.name} says Woof!"

class Cat(Animal):
    def speak(self):
        return f"{self.name} says Meow!"

dog = Dog("Rex")
print(dog.speak())  # "Rex says Woof!"
```

### Dataclasses (Modern Python)

```python
from dataclasses import dataclass
from typing import Optional

# Instead of writing __init__, __repr__, __eq__ manually:
@dataclass
class Person:
    name: str
    age: int
    email: Optional[str] = None

p = Person("Alice", 30)
print(p)  # Person(name='Alice', age=30, email=None)
```

---

## 🎨 Pythonic Patterns

### List Comprehensions (CRITICAL for ML!)

```python
# These are EVERYWHERE in ML code!

# Basic
squares = [x**2 for x in range(10)]

# With condition
evens = [x for x in range(10) if x % 2 == 0]

# Nested
matrix = [[i*j for j in range(3)] for i in range(3)]

# Multiple variables
pairs = [(x, y) for x in range(3) for y in range(3)]

# Dictionary comprehension
square_dict = {x: x**2 for x in range(5)}

# Set comprehension
unique_lengths = {len(word) for word in ["hello", "world", "hi"]}
```

### Context Managers (with statement)

```python
# File handling (auto-closes file)
with open("file.txt", "r") as f:
    content = f.read()
# File automatically closed here!

# In PyTorch:
with torch.no_grad():  # Disable gradient computation
    predictions = model(inputs)
```

### Generator Expressions

```python
# Memory efficient for large data
# Generator (lazy evaluation)
gen = (x**2 for x in range(1000000))

# List (creates all in memory)
lst = [x**2 for x in range(1000000)]

# Use generator when you don't need all at once
for value in gen:
    if value > 100:
        break
```

### Enumerate and Zip

```python
# enumerate: get index AND value
for i, item in enumerate(["a", "b", "c"]):
    print(f"{i}: {item}")
# 0: a
# 1: b
# 2: c

# zip: iterate multiple lists together
names = ["Alice", "Bob"]
ages = [30, 25]
for name, age in zip(names, ages):
    print(f"{name} is {age}")
# Alice is 30
# Bob is 25
```

---

## 🏷️ Type Hints

```python
from typing import List, Dict, Tuple, Optional, Union, Callable

# Basic types
def process(name: str, count: int, rate: float) -> bool:
    return True

# Collections
def sum_list(numbers: List[int]) -> int:
    return sum(numbers)

def get_user(data: Dict[str, str]) -> str:
    return data["name"]

def get_coords() -> Tuple[float, float]:
    return (0.0, 0.0)

# Optional (can be None)
def find_user(id: int) -> Optional[str]:
    return None  # or a string

# Union (multiple possible types)
def process(value: Union[int, str]) -> str:
    return str(value)

# Callable (function type)
def apply(func: Callable[[int], int], value: int) -> int:
    return func(value)

# Modern Python 3.10+ syntax
def process(items: list[int] | None) -> dict[str, int]:
    return {}
```

---

## ⚠️ Common Gotchas

### Gotcha 1: Mutable Default Arguments

```python
# WRONG!
def add_item(item, items=[]):  # Default list is shared!
    items.append(item)
    return items

add_item(1)  # [1]
add_item(2)  # [1, 2] - Not [2]!

# CORRECT
def add_item(item, items=None):
    if items is None:
        items = []
    items.append(item)
    return items
```

### Gotcha 2: Integer Division

```python
# Python 3
5 / 2   # 2.5 (float division)
5 // 2  # 2 (integer division)

# This is different from Java/JS!
```

### Gotcha 3: Reference vs Copy

```python
# Lists are references!
a = [1, 2, 3]
b = a        # b points to SAME list
b.append(4)
print(a)     # [1, 2, 3, 4] - a changed too!

# To copy:
b = a.copy()      # Shallow copy
b = list(a)       # Shallow copy
import copy
b = copy.deepcopy(a)  # Deep copy (nested structures)
```

### Gotcha 4: Global Variables

```python
x = 10

def change():
    global x  # Must declare global to modify
    x = 20

def read():
    print(x)  # Can read without global

change()
print(x)  # 20
```

### Gotcha 5: Boolean Gotchas

```python
# Empty collections are falsy
if []:      # False
if {}:      # False
if "":      # False
if 0:       # False
if None:    # False

# Non-empty are truthy
if [1, 2]:  # True
if {"a": 1}: # True
if "hello": # True
```

---

## 🎯 Mini Project: Data Processing Pipeline

Build a simple data processing system (similar to ML preprocessing):

```python
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
import random

# ============================================
# STEP 1: Define Data Structure
# ============================================

@dataclass
class DataPoint:
    features: List[float]
    label: int

# ============================================
# STEP 2: Generate Synthetic Data
# ============================================

def generate_data(n_samples: int, n_features: int) -> List[DataPoint]:
    """Generate random data points."""
    data = []
    for _ in range(n_samples):
        features = [random.gauss(0, 1) for _ in range(n_features)]
        label = 1 if sum(features) > 0 else 0
        data.append(DataPoint(features=features, label=label))
    return data

# ============================================
# STEP 3: Data Processing Functions
# ============================================

def normalize(data: List[DataPoint]) -> List[DataPoint]:
    """Normalize features to [0, 1] range."""
    if not data:
        return []
    
    n_features = len(data[0].features)
    
    # Find min/max for each feature
    mins = [min(d.features[i] for d in data) for i in range(n_features)]
    maxs = [max(d.features[i] for d in data) for i in range(n_features)]
    
    # Normalize
    normalized = []
    for d in data:
        new_features = [
            (d.features[i] - mins[i]) / (maxs[i] - mins[i] + 1e-8)
            for i in range(n_features)
        ]
        normalized.append(DataPoint(features=new_features, label=d.label))
    
    return normalized

def split_data(
    data: List[DataPoint],
    train_ratio: float = 0.8
) -> Tuple[List[DataPoint], List[DataPoint]]:
    """Split data into train and test sets."""
    random.shuffle(data)
    split_idx = int(len(data) * train_ratio)
    return data[:split_idx], data[split_idx:]

def calculate_stats(data: List[DataPoint]) -> Dict[str, float]:
    """Calculate dataset statistics."""
    labels = [d.label for d in data]
    return {
        "total_samples": len(data),
        "positive_ratio": sum(labels) / len(labels),
        "negative_ratio": 1 - sum(labels) / len(labels)
    }

# ============================================
# STEP 4: Main Pipeline
# ============================================

def main():
    print("🚀 Data Processing Pipeline\n")
    
    # Generate data
    print("1. Generating data...")
    data = generate_data(n_samples=100, n_features=5)
    print(f"   Generated {len(data)} samples")
    
    # Show sample
    print(f"\n2. Sample data point:")
    print(f"   Features: {data[0].features[:3]}... (truncated)")
    print(f"   Label: {data[0].label}")
    
    # Normalize
    print("\n3. Normalizing features...")
    data = normalize(data)
    print(f"   Normalized features: {data[0].features[:3]}... (truncated)")
    
    # Split
    print("\n4. Splitting data...")
    train, test = split_data(data, train_ratio=0.8)
    print(f"   Train: {len(train)} samples")
    print(f"   Test: {len(test)} samples")
    
    # Stats
    print("\n5. Dataset statistics:")
    stats = calculate_stats(train)
    for key, value in stats.items():
        print(f"   {key}: {value:.2f}")
    
    print("\n✅ Pipeline complete!")

if __name__ == "__main__":
    main()
```

**Run it:**
```bash
python data_pipeline.py
```

---

## 📝 Exercises

### Exercise 1: List Comprehensions
```python
# Convert these loops to list comprehensions:

# 1. Get all even numbers from 0-100
evens = []
for i in range(100):
    if i % 2 == 0:
        evens.append(i)

# 2. Get lengths of all words
words = ["hello", "world", "python"]
lengths = []
for word in words:
    lengths.append(len(word))

# 3. Flatten nested list
nested = [[1, 2], [3, 4], [5, 6]]
flat = []
for sublist in nested:
    for item in sublist:
        flat.append(item)
```

### Exercise 2: Dictionary Operations
```python
# Given a list of tuples (name, score), create a dict
# with only passing students (score >= 60)
students = [
    ("Alice", 85),
    ("Bob", 45),
    ("Charlie", 72),
    ("Diana", 58),
]
# Expected: {"Alice": 85, "Charlie": 72}
```

### Exercise 3: Class Design
```python
# Create a Matrix class with:
# - __init__(self, data: List[List[float]])
# - shape property returning (rows, cols)
# - __add__ method for matrix addition
# - __str__ method for printing
```

---

## ✅ Checkpoint

Before proceeding, ensure you can:

- [ ] Write functions with type hints
- [ ] Use list/dict comprehensions
- [ ] Create classes with `__init__` and methods
- [ ] Use f-strings for formatting
- [ ] Understand `self` = `this`
- [ ] Use `enumerate()` and `zip()`
- [ ] Avoid mutable default arguments
- [ ] Write `with` statements for files

**Next:** [02-NumPy-Crash-Course.md](./02-NumPy-Crash-Course.md)
