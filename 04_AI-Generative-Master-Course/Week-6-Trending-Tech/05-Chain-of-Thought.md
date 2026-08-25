# 🧠 Chain of Thought (CoT) Prompting

## 📚 Table of Contents
1. [Introduction](#-introduction)
2. [Beginner Explanation](#-beginner-explanation)
3. [Deep Technical Breakdown](#-deep-technical-breakdown)
4. [Types of CoT](#-types-of-cot)
5. [Advanced Techniques](#-advanced-techniques)
6. [Implementation](#-implementation)
7. [Real-World Use Cases](#-real-world-use-cases)
8. [Hands-On Project](#-hands-on-project)
9. [Common Mistakes](#-common-mistakes)
10. [Interview Questions](#-interview-questions)
11. [Homework](#-homework)

---

## 🎯 Introduction

**Chain of Thought (CoT)** prompting is a technique that dramatically improves LLM reasoning by encouraging models to "think step by step" before giving a final answer. It was introduced by Google in 2022 and has become fundamental to modern AI applications.

### Why CoT Matters

| Without CoT | With CoT |
|-------------|----------|
| Direct answer (often wrong) | Step-by-step reasoning |
| Black box thinking | Transparent process |
| Fails on complex problems | Handles multi-step reasoning |
| GSM8K: ~20% accuracy | GSM8K: ~60% accuracy |

### The Magic Words

Simply adding **"Let's think step by step"** can significantly improve performance:

```
Question: If John has 5 apples and gives 2 to Mary, then buys 3 more, 
how many apples does John have?

❌ Without CoT: "6 apples" (just guessing)

✅ With CoT: 
"Let's think step by step:
1. John starts with 5 apples
2. He gives 2 to Mary: 5 - 2 = 3 apples
3. He buys 3 more: 3 + 3 = 6 apples
Therefore, John has 6 apples."
```

---

## 🧒 Beginner Explanation

### The "Math Test" Analogy

Remember how teachers always said "show your work"?

**Student who doesn't show work:**
```
Problem: 23 × 47 = ?
Answer: 1081 ← (Wrong! No way to check where error occurred)
```

**Student who shows work:**
```
Problem: 23 × 47 = ?

Work:
  23 × 7 = 161
  23 × 40 = 920
  161 + 920 = 1081 ← (We can verify each step!)

Answer: 1081
```

**Chain of Thought = Making the LLM "show its work"**

### Visual Representation

```
┌─────────────────────────────────────────────────────────────┐
│                WITHOUT CHAIN OF THOUGHT                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Question ──────────────────────────────────► Answer        │
│                    (black box)                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 WITH CHAIN OF THOUGHT                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Question ──► Step 1 ──► Step 2 ──► Step 3 ──► Answer       │
│                                                              │
│  "I need to find X"                                         │
│         └──► "First, I calculate Y"                         │
│                    └──► "Then, I apply Z"                   │
│                               └──► "Therefore, answer is W" │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔬 Deep Technical Breakdown

### Why Does CoT Work?

#### 1. **Extended Computation**
Each token generated adds computation:

```
Without CoT:
Input tokens → [Transformer] → 1 output token (answer)

With CoT:
Input tokens → [Transformer] → N intermediate tokens → Answer
                              └─ More "thinking" happens here
```

**Mathematical Intuition:**
- Transformers are constant-depth circuits
- Some problems require variable depth
- CoT effectively adds "recurrence" through autoregressive generation

#### 2. **Decomposition**
Complex problems are broken into simpler subproblems:

```
Hard Problem → [Subproblem 1] + [Subproblem 2] + [Subproblem 3]
                    ↓                ↓                ↓
               Easy Answer 1    Easy Answer 2    Easy Answer 3
                    ↓                ↓                ↓
                    └────────► Combine ◄─────────────┘
                                  ↓
                            Final Answer
```

#### 3. **In-Context Learning Signal**
The reasoning chain provides additional training signal:

$$P(\text{answer} | \text{question}, \text{reasoning}) > P(\text{answer} | \text{question})$$

### Formal Framework

Let's denote:
- $Q$ = Question
- $A$ = Answer
- $R = (r_1, r_2, ..., r_n)$ = Reasoning chain

**Standard prompting:**
$$P(A|Q) = \text{Model}(Q)$$

**Chain of Thought:**
$$P(A|Q) = \sum_R P(R|Q) \cdot P(A|Q,R)$$

The reasoning chain $R$ acts as a **latent variable** that improves prediction.

### Emergence of CoT Ability

CoT only works well with large models:

| Model Size | GSM8K (Standard) | GSM8K (CoT) | CoT Boost |
|------------|------------------|-------------|-----------|
| 350M | 2% | 2% | 0% |
| 7B | 10% | 15% | +5% |
| 70B | 20% | 58% | +38% |
| 175B+ | 25% | 70%+ | +45% |

**Emergence:** CoT ability appears suddenly at ~10B parameters.

---

## 📊 Types of CoT

### 1. Zero-Shot CoT

Add "Let's think step by step" without examples:

```python
prompt = """
Q: A store has 156 items. If 49 items are sold and 23 new items arrive, 
how many items does the store have?

Let's think step by step:
"""
```

### 2. Few-Shot CoT

Provide examples with reasoning:

```python
prompt = """
Q: Roger has 5 tennis balls. He buys 2 cans of 3 tennis balls each. 
How many tennis balls does he have now?
A: Roger starts with 5 balls. He buys 2 cans × 3 balls = 6 balls. 
   Total: 5 + 6 = 11 tennis balls.

Q: A restaurant has 19 tables. They add 7 new tables and remove 4 old ones.
How many tables do they have?
A: The restaurant starts with 19 tables. Adding 7: 19 + 7 = 26 tables.
   Removing 4: 26 - 4 = 22 tables.

Q: A store has 156 items. If 49 items are sold and 23 new items arrive, 
how many items does the store have?
A:
"""
```

### 3. Self-Consistency CoT

Generate multiple reasoning paths, vote on final answer:

```
┌─────────────────────────────────────────────────────────────┐
│                 SELF-CONSISTENCY CoT                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Question ──┬──► Path 1: Step A → B → C → Answer: 42        │
│             │                                                │
│             ├──► Path 2: Step X → Y → Z → Answer: 42        │
│             │                                                │
│             ├──► Path 3: Step P → Q → R → Answer: 37        │
│             │                                                │
│             └──► Path 4: Step M → N → O → Answer: 42        │
│                                                              │
│  Voting: 42 (3 votes) vs 37 (1 vote)                        │
│  Final Answer: 42                                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4. Tree of Thoughts (ToT)

Explore multiple reasoning branches with backtracking:

```
                    Question
                       │
           ┌───────────┼───────────┐
           ▼           ▼           ▼
        Thought 1   Thought 2   Thought 3
           │           │           │
        Score: 0.8  Score: 0.3  Score: 0.9 ◄─ Best
           │                       │
           ▼                       ▼
        Thought 1.1             Thought 3.1
           │                       │
        Score: 0.4              Score: 0.95 ◄─ Final
                                   │
                                   ▼
                                Answer
```

### 5. Program of Thoughts (PoT)

Generate code instead of natural language reasoning:

```python
prompt = """
Q: If a train travels at 60 mph for 2.5 hours, then at 80 mph for 1.5 hours,
what is the total distance traveled?

# Let me solve this with Python:
"""

response = """
# Speed and time for first segment
speed1 = 60  # mph
time1 = 2.5  # hours
distance1 = speed1 * time1  # 150 miles

# Speed and time for second segment
speed2 = 80  # mph
time2 = 1.5  # hours
distance2 = speed2 * time2  # 120 miles

# Total distance
total_distance = distance1 + distance2
print(f"Total distance: {total_distance} miles")  # 270 miles
"""
```

---

## 🚀 Advanced Techniques

### 1. Least-to-Most Prompting

Break down problem, solve from simplest to complex:

```python
prompt = """
Problem: Calculate the total cost of 3 shirts at $25 each with 8% tax, 
plus a $15 discount.

Step 1 - Identify subproblems:
- Calculate shirt total
- Calculate tax
- Apply discount
- Find final total

Step 2 - Solve from simplest:

Subproblem 1: Shirt total
3 shirts × $25 = $75

Subproblem 2: Calculate tax (uses result from 1)
$75 × 0.08 = $6 tax

Subproblem 3: Total before discount (uses 1 + 2)
$75 + $6 = $81

Subproblem 4: Apply discount (uses 3)
$81 - $15 = $66

Final answer: $66
"""
```

### 2. Plan-and-Solve

First generate a plan, then execute:

```python
prompt = """
Question: A farmer has 3 fields. The first field produces 120 bushels 
per acre and is 5 acres. The second produces 95 bushels per acre and is 
8 acres. The third produces 150 bushels per acre and is 3 acres. 
What is the average bushels per acre across all fields?

PLAN:
1. Calculate total bushels for each field
2. Sum all bushels
3. Sum all acres
4. Divide total bushels by total acres

EXECUTION:
Step 1: Calculate bushels per field
- Field 1: 120 × 5 = 600 bushels
- Field 2: 95 × 8 = 760 bushels
- Field 3: 150 × 3 = 450 bushels

Step 2: Sum all bushels
600 + 760 + 450 = 1,810 bushels

Step 3: Sum all acres
5 + 8 + 3 = 16 acres

Step 4: Calculate average
1,810 ÷ 16 = 113.125 bushels per acre

Answer: 113.125 bushels per acre
"""
```

### 3. Reflection and Refinement

Have the model check its own work:

```python
prompt = """
Question: What is 17 × 24?

First attempt:
17 × 24 = 17 × 20 + 17 × 4 = 340 + 68 = 408

Reflection:
Let me verify: 17 × 24
- 17 × 20 = 340 ✓
- 17 × 4 = 68 ✓
- 340 + 68 = 408 ✓

The answer 408 is correct.
"""
```

### 4. Contrastive CoT

Show correct AND incorrect reasoning:

```python
prompt = """
Q: A bat and ball cost $1.10 in total. The bat costs $1.00 more than the ball. 
How much does the ball cost?

❌ INCORRECT reasoning:
"The bat costs $1.00, so the ball costs $0.10"
Why wrong: If ball = $0.10 and bat = $1.00, then bat is only $0.90 more.

✅ CORRECT reasoning:
Let ball = x
Then bat = x + $1.00
Total: x + (x + $1.00) = $1.10
2x + $1.00 = $1.10
2x = $0.10
x = $0.05

The ball costs $0.05.
Verification: Ball $0.05 + Bat $1.05 = $1.10 ✓ and $1.05 - $0.05 = $1.00 ✓
"""
```

---

## 💻 Implementation

### Basic CoT Implementation

```python
"""
Chain of Thought Implementation
"""

from openai import OpenAI
from typing import List, Dict
import re

client = OpenAI()

# ============================================
# ZERO-SHOT CoT
# ============================================

def zero_shot_cot(question: str, model: str = "gpt-4") -> Dict:
    """Apply zero-shot Chain of Thought"""
    
    prompt = f"""
{question}

Let's think step by step:
"""
    
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "user", "content": prompt}
        ],
        temperature=0.3
    )
    
    return {
        "question": question,
        "reasoning": response.choices[0].message.content,
        "prompt_type": "zero-shot-cot"
    }


# ============================================
# FEW-SHOT CoT
# ============================================

def few_shot_cot(
    question: str,
    examples: List[Dict],
    model: str = "gpt-4"
) -> Dict:
    """Apply few-shot Chain of Thought"""
    
    # Build prompt with examples
    prompt = ""
    for ex in examples:
        prompt += f"Q: {ex['question']}\n"
        prompt += f"A: {ex['reasoning']}\n"
        prompt += f"Final Answer: {ex['answer']}\n\n"
    
    prompt += f"Q: {question}\nA:"
    
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "user", "content": prompt}
        ],
        temperature=0.3
    )
    
    return {
        "question": question,
        "reasoning": response.choices[0].message.content,
        "prompt_type": "few-shot-cot",
        "num_examples": len(examples)
    }


# ============================================
# SELF-CONSISTENCY CoT
# ============================================

def self_consistency_cot(
    question: str,
    n_samples: int = 5,
    model: str = "gpt-4"
) -> Dict:
    """Apply self-consistency with multiple reasoning paths"""
    
    prompt = f"""
{question}

Let's solve this step by step. Show your reasoning, then give the final answer 
in the format: "Final Answer: <answer>"
"""
    
    # Generate multiple reasoning paths
    responses = []
    answers = []
    
    for _ in range(n_samples):
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0.7  # Higher temperature for diversity
        )
        
        content = response.choices[0].message.content
        responses.append(content)
        
        # Extract answer
        answer_match = re.search(r"Final Answer:\s*(.+?)(?:\n|$)", content)
        if answer_match:
            answers.append(answer_match.group(1).strip())
    
    # Vote on most common answer
    from collections import Counter
    answer_counts = Counter(answers)
    final_answer = answer_counts.most_common(1)[0][0] if answer_counts else "Unknown"
    
    return {
        "question": question,
        "reasoning_paths": responses,
        "answers": answers,
        "final_answer": final_answer,
        "confidence": answer_counts[final_answer] / n_samples if answers else 0,
        "prompt_type": "self-consistency-cot"
    }


# ============================================
# TREE OF THOUGHTS
# ============================================

def tree_of_thoughts(
    question: str,
    max_depth: int = 3,
    branch_factor: int = 3,
    model: str = "gpt-4"
) -> Dict:
    """Apply Tree of Thoughts reasoning"""
    
    def generate_thoughts(context: str, n: int) -> List[str]:
        """Generate n possible next thoughts"""
        prompt = f"""
{context}

Generate {n} different possible next steps or thoughts to continue solving this problem.
Format each thought on a new line starting with "Thought:"
"""
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8
        )
        
        thoughts = re.findall(r"Thought:\s*(.+?)(?=Thought:|$)", 
                             response.choices[0].message.content, re.DOTALL)
        return [t.strip() for t in thoughts[:n]]
    
    def evaluate_thought(context: str, thought: str) -> float:
        """Score a thought's promise (0-1)"""
        prompt = f"""
Context: {context}
Thought: {thought}

Rate how promising this thought is for solving the problem.
Score from 0.0 (not useful) to 1.0 (very useful).
Respond with just the number.
"""
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0
        )
        
        try:
            return float(response.choices[0].message.content.strip())
        except:
            return 0.5
    
    def is_solution(context: str) -> bool:
        """Check if context contains a final solution"""
        return "Final Answer:" in context or "Therefore, the answer is" in context
    
    # BFS with pruning
    initial_context = f"Question: {question}\n\nLet's solve this step by step.\n"
    
    best_path = None
    best_score = 0
    queue = [(initial_context, 0, [])]  # (context, depth, path)
    
    while queue:
        context, depth, path = queue.pop(0)
        
        if is_solution(context) or depth >= max_depth:
            # Evaluate final solution
            if is_solution(context):
                score = evaluate_thought(question, context)
                if score > best_score:
                    best_score = score
                    best_path = path + [context]
            continue
        
        # Generate and evaluate thoughts
        thoughts = generate_thoughts(context, branch_factor)
        thought_scores = [(t, evaluate_thought(context, t)) for t in thoughts]
        thought_scores.sort(key=lambda x: x[1], reverse=True)
        
        # Add top thoughts to queue
        for thought, score in thought_scores[:2]:  # Top 2
            new_context = context + f"\n{thought}"
            queue.append((new_context, depth + 1, path + [thought]))
    
    return {
        "question": question,
        "reasoning_path": best_path,
        "confidence": best_score,
        "prompt_type": "tree-of-thoughts"
    }


# ============================================
# PROGRAM OF THOUGHTS
# ============================================

def program_of_thoughts(
    question: str,
    model: str = "gpt-4"
) -> Dict:
    """Generate code to solve the problem"""
    
    prompt = f"""
Question: {question}

Solve this problem by writing Python code. 
Think step by step, write the code, then execute it mentally to get the answer.

```python
"""
    
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0
    )
    
    code = response.choices[0].message.content
    
    # Extract code
    code_match = re.search(r"```python\n?(.*?)```", code, re.DOTALL)
    if code_match:
        code = code_match.group(1)
    
    # Execute code safely (in production, use sandbox)
    result = None
    try:
        local_vars = {}
        exec(code, {"__builtins__": {}}, local_vars)
        result = local_vars.get("answer") or local_vars.get("result")
    except Exception as e:
        result = f"Execution error: {str(e)}"
    
    return {
        "question": question,
        "code": code,
        "result": result,
        "prompt_type": "program-of-thoughts"
    }


# ============================================
# USAGE EXAMPLES
# ============================================

if __name__ == "__main__":
    question = """
A farmer has chickens and cows. There are 35 heads and 94 legs total.
How many chickens and how many cows are there?
"""
    
    # Zero-shot CoT
    result = zero_shot_cot(question)
    print("=== Zero-Shot CoT ===")
    print(result["reasoning"])
    
    # Few-shot CoT
    examples = [
        {
            "question": "There are 15 trees. 6 are cut down. 4 new ones are planted. How many trees?",
            "reasoning": "Start: 15 trees. Cut 6: 15-6=9. Plant 4: 9+4=13 trees.",
            "answer": "13 trees"
        }
    ]
    result = few_shot_cot(question, examples)
    print("\n=== Few-Shot CoT ===")
    print(result["reasoning"])
    
    # Self-consistency
    result = self_consistency_cot(question, n_samples=3)
    print("\n=== Self-Consistency CoT ===")
    print(f"Final answer: {result['final_answer']}")
    print(f"Confidence: {result['confidence']:.0%}")
    
    # Program of Thoughts
    result = program_of_thoughts(question)
    print("\n=== Program of Thoughts ===")
    print(result["code"])
    print(f"Result: {result['result']}")
```

---

## 🌍 Real-World Use Cases

### 1. Complex Math Problems

```python
cot_prompt = """
Problem: A train leaves Station A at 9:00 AM traveling at 60 mph toward Station B. 
Another train leaves Station B at 10:00 AM traveling at 80 mph toward Station A.
The stations are 280 miles apart. At what time do the trains meet?

Let me solve this step by step:

Step 1: Understand the setup
- Train 1: leaves at 9:00 AM, speed = 60 mph
- Train 2: leaves at 10:00 AM, speed = 80 mph
- Distance between stations = 280 miles
- Train 1 has a 1-hour head start

Step 2: Calculate Train 1's position at 10:00 AM
- In 1 hour at 60 mph: 60 miles
- Remaining distance: 280 - 60 = 220 miles

Step 3: Set up equation for meeting point
- After 10:00 AM, let t = hours until they meet
- Train 1 travels: 60t miles
- Train 2 travels: 80t miles
- Together they cover: 60t + 80t = 140t miles
- This equals remaining distance: 140t = 220

Step 4: Solve for t
- t = 220/140 = 1.57 hours ≈ 1 hour 34 minutes

Step 5: Calculate meeting time
- 10:00 AM + 1 hour 34 minutes = 11:34 AM

The trains meet at 11:34 AM.
"""
```

### 2. Code Debugging

```python
debug_prompt = """
The following code has a bug. Find and fix it.

```python
def find_average(numbers):
    total = 0
    for num in numbers:
        total += num
    return total / len(numbers)

result = find_average([])
print(result)
```

Let me analyze step by step:

Step 1: Trace the execution
- Input: empty list []
- total = 0
- for loop doesn't execute (empty list)
- return 0 / len([]) = 0 / 0

Step 2: Identify the bug
- Division by zero when the list is empty
- This will raise a ZeroDivisionError

Step 3: Fix the code
```python
def find_average(numbers):
    if not numbers:  # Check for empty list
        return 0  # or raise ValueError("Cannot average empty list")
    total = 0
    for num in numbers:
        total += num
    return total / len(numbers)
```

Step 4: Verify the fix
- find_average([]) → returns 0 (no error)
- find_average([1,2,3]) → returns 2.0 ✓
"""
```

### 3. Legal/Medical Reasoning

```python
legal_prompt = """
Question: Can a 17-year-old sign a contract to buy a car?

Let me reason through this step by step:

Step 1: Identify the key legal concept
- This involves contract law and capacity to contract
- Age of majority is relevant

Step 2: Apply the rule
- In most jurisdictions, the age of majority is 18
- Minors (under 18) have limited capacity to contract
- Contracts made by minors are generally "voidable"

Step 3: Understand "voidable"
- The contract is valid unless the minor chooses to void it
- The minor can "disaffirm" the contract before turning 18
  or within a reasonable time after
- The other party cannot void it

Step 4: Consider exceptions
- Contracts for "necessities" (food, shelter, clothing) are enforceable
- A car might be considered a necessity if needed for work/school
- Emancipated minors have full contractual capacity

Step 5: Conclusion
A 17-year-old CAN sign the contract, but it will be voidable at 
the minor's option. The dealer cannot enforce it if the minor 
chooses to disaffirm. If the car is deemed a "necessity," 
the minor may owe reasonable value.

Answer: Yes, they can sign, but the contract is voidable by the minor.
"""
```

---

## 🛠️ Hands-On Project

### Project: Build a Math Tutor with CoT

```python
"""
Project: Chain of Thought Math Tutor
Features:
- Step-by-step problem solving
- Multiple solution strategies
- Error checking and verification
- Difficulty adaptation
"""

from openai import OpenAI
from typing import Dict, List, Optional
import re
import json

client = OpenAI()

class MathTutor:
    def __init__(self, model: str = "gpt-4"):
        self.model = model
        self.history = []
        
        self.system_prompt = """You are an expert math tutor who explains 
problems step by step. You:
1. Break down every problem into clear steps
2. Explain WHY each step is taken
3. Check your work at the end
4. Use simple language appropriate for the student level

Always format your solution as:
UNDERSTAND: What is the problem asking?
PLAN: How will we solve it?
SOLVE: Step-by-step solution
VERIFY: Check the answer
ANSWER: Final answer"""
    
    def solve(
        self, 
        problem: str, 
        difficulty: str = "intermediate"
    ) -> Dict:
        """Solve a math problem with CoT"""
        
        difficulty_instructions = {
            "beginner": "Use very simple language, explain every tiny step.",
            "intermediate": "Explain clearly with standard mathematical notation.",
            "advanced": "Be concise, use formal mathematical reasoning."
        }
        
        prompt = f"""
{self.system_prompt}

Student level: {difficulty}
{difficulty_instructions.get(difficulty, "")}

Problem: {problem}
"""
        
        response = client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": f"Level: {difficulty}\n\nProblem: {problem}"}
            ],
            temperature=0.3
        )
        
        solution = response.choices[0].message.content
        
        # Parse sections
        sections = {
            "understand": self._extract_section(solution, "UNDERSTAND"),
            "plan": self._extract_section(solution, "PLAN"),
            "solve": self._extract_section(solution, "SOLVE"),
            "verify": self._extract_section(solution, "VERIFY"),
            "answer": self._extract_section(solution, "ANSWER")
        }
        
        result = {
            "problem": problem,
            "difficulty": difficulty,
            "full_solution": solution,
            "sections": sections
        }
        
        self.history.append(result)
        return result
    
    def _extract_section(self, text: str, section: str) -> str:
        """Extract a section from the solution"""
        pattern = rf"{section}:\s*(.*?)(?=(?:UNDERSTAND|PLAN|SOLVE|VERIFY|ANSWER):|$)"
        match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
        return match.group(1).strip() if match else ""
    
    def explain_step(
        self, 
        step_number: int,
        question: str = None
    ) -> str:
        """Explain a specific step in more detail"""
        
        if not self.history:
            return "No problem has been solved yet."
        
        last_solution = self.history[-1]
        
        prompt = f"""
Previous problem: {last_solution['problem']}
Solution: {last_solution['full_solution']}

The student wants more explanation about step {step_number}.
{f"Specific question: {question}" if question else ""}

Please explain this step in more detail, using simpler language 
and perhaps a different approach or analogy.
"""
        
        response = client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0.5
        )
        
        return response.choices[0].message.content
    
    def alternative_solution(self) -> str:
        """Show a different way to solve the last problem"""
        
        if not self.history:
            return "No problem has been solved yet."
        
        last_solution = self.history[-1]
        
        prompt = f"""
Problem: {last_solution['problem']}

Previous solution approach:
{last_solution['sections']['plan']}

Please solve this problem using a DIFFERENT approach.
Show complete step-by-step reasoning with the alternative method.
"""
        
        response = client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )
        
        return response.choices[0].message.content
    
    def generate_similar(self, n: int = 3) -> List[str]:
        """Generate similar practice problems"""
        
        if not self.history:
            return []
        
        last_problem = self.history[-1]['problem']
        
        prompt = f"""
Original problem: {last_problem}

Generate {n} similar practice problems with the same concept 
but different numbers/scenarios. Make them progressively harder.

Format each problem on a new line starting with "Problem:"
"""
        
        response = client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0.8
        )
        
        problems = re.findall(r"Problem:\s*(.+?)(?=Problem:|$)", 
                             response.choices[0].message.content, re.DOTALL)
        return [p.strip() for p in problems[:n]]
    
    def check_student_work(
        self, 
        problem: str, 
        student_solution: str
    ) -> Dict:
        """Check and provide feedback on student's work"""
        
        prompt = f"""
Problem: {problem}

Student's solution:
{student_solution}

Please evaluate this solution:
1. Is the final answer correct?
2. Is the reasoning valid?
3. Are there any errors in the steps?
4. What could be improved?

Provide constructive, encouraging feedback.
"""
        
        response = client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0.3
        )
        
        return {
            "problem": problem,
            "student_solution": student_solution,
            "feedback": response.choices[0].message.content
        }


# ============================================
# INTERACTIVE DEMO
# ============================================

def run_demo():
    tutor = MathTutor()
    
    # Solve a problem
    print("=" * 60)
    print("MATH TUTOR WITH CHAIN OF THOUGHT")
    print("=" * 60)
    
    problem = """
    A store has a 20% off sale. If a jacket originally costs $85 and 
    there's an additional $10 coupon, what is the final price after 
    applying both discounts?
    """
    
    result = tutor.solve(problem, difficulty="intermediate")
    
    print("\n📝 PROBLEM:")
    print(problem)
    
    print("\n🤔 UNDERSTANDING:")
    print(result['sections']['understand'])
    
    print("\n📋 PLAN:")
    print(result['sections']['plan'])
    
    print("\n✏️ SOLUTION:")
    print(result['sections']['solve'])
    
    print("\n✅ VERIFICATION:")
    print(result['sections']['verify'])
    
    print("\n🎯 FINAL ANSWER:")
    print(result['sections']['answer'])
    
    # Generate practice problems
    print("\n" + "=" * 60)
    print("📚 PRACTICE PROBLEMS:")
    print("=" * 60)
    
    similar = tutor.generate_similar(3)
    for i, p in enumerate(similar, 1):
        print(f"\n{i}. {p}")
    
    # Show alternative solution
    print("\n" + "=" * 60)
    print("🔄 ALTERNATIVE APPROACH:")
    print("=" * 60)
    
    alt = tutor.alternative_solution()
    print(alt)


if __name__ == "__main__":
    run_demo()
```

---

## ⚠️ Common Mistakes

### 1. Over-Prompting

```python
# ❌ Bad - Too many instructions confuse the model
prompt = """
Think step by step. Be careful. Double check. Use math. 
Show work. Be precise. Verify. Don't make mistakes.
Let's think step by step and be careful about each step.

Question: 2 + 2 = ?
"""

# ✅ Good - Clear and simple
prompt = """
Question: 2 + 2 = ?

Let's solve this step by step:
"""
```

### 2. Wrong Examples in Few-Shot

```python
# ❌ Bad - Examples don't match problem type
examples = [
    {"q": "What is the capital of France?", "a": "Paris"}  # Factual, not math!
]
question = "What is 15% of 80?"

# ✅ Good - Matching examples
examples = [
    {"q": "What is 10% of 50?", "a": "10% means 10/100 = 0.1. 0.1 × 50 = 5"}
]
```

### 3. Not Using Temperature Appropriately

```python
# ❌ Bad - High temperature for math
response = client.chat.completions.create(
    messages=[...],
    temperature=1.0  # Too creative for math!
)

# ✅ Good - Low temperature for reasoning
response = client.chat.completions.create(
    messages=[...],
    temperature=0.3  # More deterministic
)
```

### 4. Ignoring Model Limitations

```python
# ❌ Bad - Expecting perfect math from LLMs
result = ask_llm("Calculate: 123456789 × 987654321")  # Will likely be wrong!

# ✅ Good - Use code for precise calculation
result = ask_llm("""
Calculate 123456789 × 987654321

Write Python code to compute this precisely:
```python
result = 123456789 * 987654321
print(result)
```
""")
```

---

## 🎯 Interview Questions

### Q1: What is Chain of Thought prompting and why does it work?

**Answer:**
CoT prompting encourages LLMs to generate intermediate reasoning steps before the final answer.

**Why it works:**
1. **Extended computation:** More tokens = more "thinking"
2. **Decomposition:** Breaks complex into simple subproblems
3. **Error correction:** Intermediate steps can be checked
4. **In-context learning:** Reasoning provides additional signal

**Emergence:** Only works well with models >10B parameters.

---

### Q2: Compare Zero-Shot vs Few-Shot CoT.

**Answer:**

| Aspect | Zero-Shot CoT | Few-Shot CoT |
|--------|---------------|--------------|
| **Examples** | None | 2-8 examples |
| **Prompt** | "Let's think step by step" | Examples + question |
| **Performance** | Good | Better |
| **Token cost** | Lower | Higher |
| **Flexibility** | More flexible | Task-specific |

**Use Zero-Shot when:** Quick experiments, unknown problem types
**Use Few-Shot when:** Maximum accuracy needed, known format

---

### Q3: Explain Self-Consistency and when to use it.

**Answer:**
Self-Consistency generates multiple reasoning paths and votes on the answer.

**Process:**
1. Sample N responses (temperature > 0)
2. Extract final answer from each
3. Take majority vote
4. Confidence = vote fraction

**When to use:**
- High-stakes decisions
- Complex reasoning
- When single path might have errors
- When you can afford extra API calls

**Trade-off:** Higher accuracy vs. N× cost

---

### Q4: What is Tree of Thoughts and how is it different from CoT?

**Answer:**

| CoT | Tree of Thoughts |
|-----|------------------|
| Linear path | Branching exploration |
| One reasoning chain | Multiple paths explored |
| No backtracking | Can backtrack |
| Fast | Slower, more thorough |

**ToT Process:**
1. Generate multiple "thoughts" at each step
2. Evaluate promise of each thought
3. Expand most promising
4. Prune unpromising branches
5. Find best complete path

**Use ToT for:** Complex problems with many solution paths, puzzles, planning.

---

### Q5: How would you implement CoT in a production system?

**Answer:**

```python
class ProductionCoT:
    def __init__(self):
        self.cache = {}
        self.metrics = MetricsCollector()
    
    def solve(self, problem):
        # 1. Check cache
        if problem in self.cache:
            return self.cache[problem]
        
        # 2. Try zero-shot first (cheaper)
        result = self.zero_shot_cot(problem)
        
        # 3. Verify with self-consistency if important
        if self.is_high_stakes(problem):
            result = self.self_consistency(problem, n=5)
        
        # 4. Log metrics
        self.metrics.log(problem, result)
        
        # 5. Cache result
        self.cache[problem] = result
        
        return result
```

**Key considerations:**
- Cost vs accuracy trade-offs
- Caching for repeated queries
- Fallback strategies
- Monitoring and logging

---

## 📝 Homework

### Level 1: Basic
1. Compare direct prompting vs "Let's think step by step"
2. Write 3 few-shot examples for word problems
3. Explain CoT to a non-technical person

### Level 2: Intermediate
1. Implement zero-shot and few-shot CoT
2. Compare performance on GSM8K problems
3. Build a self-consistency wrapper

### Level 3: Advanced
1. Implement Tree of Thoughts
2. Create a math tutoring chatbot with CoT
3. Benchmark different CoT strategies

### Level 4: Expert
1. Implement Program of Thoughts with safe code execution
2. Build a multi-strategy reasoning system
3. Research: When does CoT fail?

---

## 🔗 Resources

- [Chain of Thought Paper](https://arxiv.org/abs/2201.11903)
- [Self-Consistency Paper](https://arxiv.org/abs/2203.11171)
- [Tree of Thoughts Paper](https://arxiv.org/abs/2305.10601)
- [Program of Thoughts Paper](https://arxiv.org/abs/2211.12588)
- [Least-to-Most Prompting](https://arxiv.org/abs/2205.10625)

---

**Next:** [06-DeepSeek-Architecture.md](./06-DeepSeek-Architecture.md) - DeepSeek Model Architecture
