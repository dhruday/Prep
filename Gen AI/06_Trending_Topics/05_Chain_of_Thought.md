# 📘 Chain of Thought (CoT) - Teaching AI to Think Step-by-Step

## 🎯 Purpose (Why Chain of Thought Exists)

Imagine asking an AI a math problem. The **traditional approach (pre-2022)**:

```javascript
// Direct answer (often wrong for complex problems)
const traditionalPrompting = {
  input: "Roger has 5 tennis balls. He buys 2 more cans of tennis balls. Each can has 3 tennis balls. How many tennis balls does he have now?",
  
  llmThinking: "Ummm... 5 + 2 + 3 = 10?",  // ❌ Wrong logic
  
  output: "Roger has 10 tennis balls.",
  
  accuracy: "~35% on complex problems"
};

// The problem: LLM jumps to conclusion without reasoning
```

**The Problems with Direct Answering:**

```javascript
// Problem 1: No intermediate steps
const multiStepProblem = {
  question: "A restaurant had 23 customers. 14 more came in, then 8 left. How many customers are there?",
  
  withoutCoT: {
    thinking: "[hidden black box]",
    answer: "45",  // ❌ Wrong (23+14+8)
    accuracy: "42%"
  },
  
  withCoT: {
    thinking: `
      Step 1: Started with 23 customers
      Step 2: 14 more came in: 23 + 14 = 37
      Step 3: 8 left: 37 - 8 = 29
      Therefore, there are 29 customers.
    `,
    answer: "29",  // ✅ Correct
    accuracy: "89%"
  }
};

// Chain of Thought improvement: +47% accuracy!
```

**Real-World Impact of CoT (2022-2024):**

```javascript
const cotRevolution = {
  discovery: "Wei et al., 2022 (Google Brain)",
  
  improvements: {
    'Math word problems': {
      before: '35% accuracy',
      after: '89% accuracy',
      improvement: '+154%'
    },
    'Commonsense reasoning': {
      before: '54% accuracy',
      after: '78% accuracy',
      improvement: '+44%'
    },
    'Symbolic reasoning': {
      before: '41% accuracy',
      after: '82% accuracy',
      improvement: '+100%'
    }
  },
  
  adoption: {
    chatgpt: 'Uses CoT internally',
    claude: 'Trained with CoT examples',
    gemini: 'CoT in reasoning mode',
    o1: 'Explicit multi-step reasoning (extended CoT)'
  }
};

// CoT transformed LLMs from "answering machines" to "reasoning engines"
```

**The Breakthrough:**

```javascript
// The magic prompt pattern (2022)
const chainOfThoughtPrompt = `
Q: Roger has 5 tennis balls. He buys 2 more cans of tennis balls. 
   Each can has 3 tennis balls. How many tennis balls does he have now?

A: Let's think step by step.
   - Roger started with 5 balls
   - He buys 2 cans, and each can has 3 balls
   - So he bought 2 × 3 = 6 balls
   - Total: 5 + 6 = 11 balls
   
   Roger has 11 tennis balls.
`;

// Just adding "Let's think step by step" increases accuracy by 40-50%!
// Why? Forces LLM to generate intermediate reasoning before final answer
```

---

## 📚 What Chain of Thought Actually Is

**Definition:**
Chain of Thought (CoT) is a **prompting technique** that elicits step-by-step reasoning from language models, making them show their work before arriving at an answer.

**Core Principle:**

```
Traditional:
Question → [Black Box] → Answer

Chain of Thought:
Question → Step 1 → Step 2 → Step 3 → Answer
           ↑        ↑        ↑
        Visible intermediate reasoning
```

**Types of Chain of Thought:**

### 1. **Few-Shot CoT (Original, 2022)**
Provide examples with reasoning steps:

```javascript
// Few-shot CoT prompt
const fewShotCoT = `
Q: Betty has 3 apples and buys 2 more. How many does she have?
A: Let's solve this step by step:
   - Betty started with 3 apples
   - She bought 2 more apples
   - Total: 3 + 2 = 5 apples
   Betty has 5 apples.

Q: Tom had 7 marbles. He gave 3 to his friend. How many does he have now?
A: Let's solve this step by step:
   - Tom started with 7 marbles
   - He gave away 3 marbles
   - Remaining: 7 - 3 = 4 marbles
   Tom has 4 marbles.

Q: ${userQuestion}
A: Let's solve this step by step:
`;

// LLM learns the pattern from examples
```

### 2. **Zero-Shot CoT (2022)**
Just add "Let's think step by step":

```javascript
// Zero-shot CoT (no examples needed!)
const zeroShotCoT = `
Q: ${userQuestion}
A: Let's think step by step.
`;

// Surprisingly, this simple phrase triggers reasoning!
// Works because LLMs were trained on text containing step-by-step solutions
```

### 3. **Self-Consistency CoT (2023)**
Generate multiple reasoning paths, pick most common answer:

```javascript
const selfConsistencyCoT = async (question) => {
  const reasoningPaths = [];
  
  // Generate 5 different reasoning paths
  for (let i = 0; i < 5; i++) {
    const response = await llm.generate({
      prompt: `${question}\nLet's think step by step.`,
      temperature: 0.7  // Allow variation
    });
    
    reasoningPaths.push(extractAnswer(response));
  }
  
  // Reasoning paths might be:
  // Path 1: "29" ✓
  // Path 2: "29" ✓
  // Path 3: "37" ✗
  // Path 4: "29" ✓
  // Path 5: "29" ✓
  
  // Majority vote: "29" appears 4/5 times
  const finalAnswer = mostCommon(reasoningPaths);
  
  return finalAnswer;  // More reliable than single path
};

// Improves accuracy by another 10-15%
```

### 4. **Tree of Thoughts (ToT, 2023)**
Explore multiple reasoning branches:

```javascript
// Tree of Thoughts: Branch and evaluate
const treeOfThoughts = {
  problem: "Solve: 24 using 4 numbers (4, 6, 8, 9) with +, -, ×, ÷",
  
  thinkingTree: {
    root: "Start",
    branches: [
      {
        step1: "Try 4 + 6 = 10",
        branches: [
          { step2: "10 + 8 = 18", branches: [{ step3: "18 + 9 = 27 ❌" }] },
          { step2: "10 × 8 = 80", branches: [{ step3: "80 - 9 = 71 ❌" }] }
        ]
      },
      {
        step1: "Try 6 - 4 = 2",
        branches: [
          { step2: "9 × 2 = 18", branches: [{ step3: "18 + 8 = 26 ❌" }] },
          { step2: "8 × 2 = 16", branches: [{ step3: "16 + 9 = 25 ❌" }] }
        ]
      },
      {
        step1: "Try 8 - 4 = 4",
        branches: [
          { step2: "4 × 6 = 24", branches: [{ step3: "24 + 9 = 33 ❌" }] },
          { step2: "6 × 4 = 24", branches: [{ step3: "24 - 9 = 15 ❌" }] },
          { step2: "6 × 4 = 24", branches: [{ step3: "24 + 9 - 9 = 24 ✓" }] }
        ]
      }
    ]
  },
  
  // Evaluate each branch, prune bad ones, explore promising ones
  solution: "(8 - 4) × 6 = 24"
};

// ToT can solve problems that require exploration and backtracking
```

### 5. **Program-Aided Language Models (PAL, 2023)**
Generate code to solve problems:

```javascript
// Instead of arithmetic in text, generate Python code
const programAidedLM = {
  question: "If a train travels 60 mph for 2.5 hours, then 80 mph for 1.75 hours, how far does it travel?",
  
  cotResponse: `
    Step 1: First segment: 60 mph × 2.5 hours = 150 miles
    Step 2: Second segment: 80 mph × 1.75 hours = 140 miles
    Step 3: Total: 150 + 140 = 290 miles
    Answer: 290 miles
  `,
  
  palResponse: `
    # Let's solve this with code:
    segment1_speed = 60  # mph
    segment1_time = 2.5  # hours
    segment1_distance = segment1_speed * segment1_time
    
    segment2_speed = 80  # mph
    segment2_time = 1.75  # hours
    segment2_distance = segment2_speed * segment2_time
    
    total_distance = segment1_distance + segment2_distance
    print(total_distance)  # 290.0
  `,
  
  advantage: "Code execution is 100% accurate (no arithmetic errors)"
};

// PAL: LLM generates code → Python executes → Perfect math!
```

---

## 🔧 How Chain of Thought Works (Intuition)

**Think of CoT Like Showing Your Work in School:**

```
Without CoT (Student A):
Teacher: "What's 137 + 286?"
Student: "423!"
Teacher: "How did you get that?"
Student: "I just... know?"
Result: ❌ Wrong (correct answer is 423... wait, that's right!)

With CoT (Student B):
Teacher: "What's 137 + 286?"
Student: "Let me show my work:
         137
       + 286
       -----
         First, 7 + 6 = 13, write 3, carry 1
         Then, 3 + 8 + 1 = 12, write 2, carry 1
         Finally, 1 + 2 + 1 = 4
         Answer: 423"
Teacher: "Perfect! I can see your reasoning."
Result: ✅ Correct with visible steps
```

**Why CoT Improves LLM Performance:**

### 1. **Working Memory Effect**
```javascript
// Without CoT: LLM must hold everything in "head"
const withoutCoT = {
  task: "Calculate 23 × 47 - 18 + 6 ÷ 2",
  llmProcess: `
    [Thinks: Okay, 23 times 47... that's... um... around 1000?
     Then subtract 18... wait, what was the product again?
     Oh and add... something with 6... divided by 2...
     My answer: 975]  // ❌ Wrong (correct: 1066)
  `
};

// With CoT: LLM can use its output as "external memory"
const withCoT = {
  task: "Calculate 23 × 47 - 18 + 6 ÷ 2",
  llmProcess: `
    Step 1: 23 × 47 = 1081
    Step 2: 1081 - 18 = 1063  ← Can refer back to step 1
    Step 3: 6 ÷ 2 = 3
    Step 4: 1063 + 3 = 1066  ← Can refer to steps 2 and 3
    Answer: 1066  // ✅ Correct
  `
};

// CoT effectively extends the LLM's "working memory"
```

### 2. **Error Correction**
```javascript
// Without CoT: Error compounds
const errorWithoutCoT = {
  problem: "Sarah has 15 cookies. She gives 1/3 to Tom. How many does she have left?",
  llmThinking: "[15 - 3 = 12]",  // ❌ Misunderstood "1/3 to Tom"
  answer: "12 cookies"
};

// With CoT: Error visible and correctable
const errorWithCoT = {
  problem: "Sarah has 15 cookies. She gives 1/3 to Tom. How many does she have left?",
  llmThinking: `
    Step 1: Sarah has 15 cookies
    Step 2: She gives 1/3 to Tom
    Step 3: 1/3 of 15 = 15 ÷ 3 = 5
    Step 4: Sarah has 15 - 5 = 10 cookies left
  `,
  answer: "10 cookies"  // ✅ Correct
};

// Intermediate steps make errors visible and self-correctable
```

### 3. **Compositional Reasoning**
```javascript
// Complex problems decompose naturally
const compositionalReasoning = {
  problem: "A store has 100 items. 40% are sold Monday, 25% of the remaining are sold Tuesday. How many are left?",
  
  directAnswer: "35 items",  // ❌ Wrong (guessed)
  
  cotDecomposition: `
    Let's break this down:
    
    [Sub-problem 1: Monday sales]
    - Start: 100 items
    - Monday: 40% sold = 0.40 × 100 = 40 items sold
    - Remaining after Monday: 100 - 40 = 60 items
    
    [Sub-problem 2: Tuesday sales]
    - Start Tuesday with: 60 items (from previous step)
    - Tuesday: 25% of 60 = 0.25 × 60 = 15 items sold
    - Remaining after Tuesday: 60 - 15 = 45 items
    
    Answer: 45 items  // ✅ Correct
  `
};

// CoT naturally handles nested sub-problems
```

---

## 🧮 How Chain of Thought Works (Technical Details)

### Theoretical Foundation

**Attention Mechanism Enables CoT:**

```
Without CoT:
Token: "Answer:"
Attention: [Question tokens] → [Direct answer]
Path: Question → Answer (1 step)

With CoT:
Token: "Step 1:"
Attention: [Question tokens] → [First reasoning step]

Token: "Step 2:"
Attention: [Question tokens + Step 1] → [Second reasoning step]

Token: "Answer:"
Attention: [Question + All steps] → [Final answer]

Path: Question → Steps → Answer (multi-step)
```

**Probability Distribution Shift:**

```python
# Conceptual probability distributions

# Without CoT: Direct answer
P("42" | question) = 0.15  # Low confidence
P("100" | question) = 0.20  # Wrong but higher probability
P("37" | question) = 0.12

# With CoT: Conditional on reasoning
P("42" | question + step1 + step2) = 0.78  # Much higher confidence!
P("100" | question + step1 + step2) = 0.05  # Correctly lower
P("37" | question + step1 + step2) = 0.03

# CoT constrains the probability space through intermediate steps
```

### Python Production Implementation

**1. Basic Zero-Shot CoT:**

```python
from openai import OpenAI
import anthropic

class ChainOfThoughtEngine:
    """Simple CoT implementation"""
    
    def __init__(self, provider="openai"):
        if provider == "openai":
            self.client = OpenAI()
            self.model = "gpt-4"
        elif provider == "anthropic":
            self.client = anthropic.Anthropic()
            self.model = "claude-3-5-sonnet-20241022"
    
    def zero_shot_cot(self, question: str) -> dict:
        """Zero-shot CoT: Just add 'Let's think step by step'"""
        
        prompt = f"""Question: {question}

Answer: Let's think step by step."""
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0  # Deterministic for reasoning
        )
        
        full_response = response.choices[0].message.content
        
        # Extract steps and final answer
        steps = self._extract_steps(full_response)
        answer = self._extract_answer(full_response)
        
        return {
            "question": question,
            "reasoning": full_response,
            "steps": steps,
            "answer": answer
        }
    
    def _extract_steps(self, text: str) -> list[str]:
        """Extract individual reasoning steps"""
        # Simple heuristic: lines starting with numbers or bullets
        lines = text.split('\n')
        steps = []
        
        for line in lines:
            line = line.strip()
            # Match "Step 1:", "1.", "- ", etc.
            if any(line.startswith(prefix) for prefix in ["Step", "1", "2", "3", "-", "•"]):
                steps.append(line)
        
        return steps
    
    def _extract_answer(self, text: str) -> str:
        """Extract final answer"""
        # Look for "Answer:", "Therefore:", "Final answer:", etc.
        lines = text.split('\n')
        
        for i, line in enumerate(lines):
            if any(keyword in line.lower() for keyword in ["answer:", "therefore:", "final"]):
                # Return this line and potentially next line
                answer = line
                if i + 1 < len(lines):
                    answer += " " + lines[i + 1]
                return answer.strip()
        
        # Fallback: return last non-empty line
        for line in reversed(lines):
            if line.strip():
                return line.strip()
        
        return text

# Usage
cot = ChainOfThoughtEngine()

question = "Roger has 5 tennis balls. He buys 2 more cans of tennis balls. Each can has 3 tennis balls. How many tennis balls does he have now?"

result = cot.zero_shot_cot(question)

print(f"Question: {result['question']}")
print(f"\nReasoning:")
for step in result['steps']:
    print(f"  {step}")
print(f"\nFinal Answer: {result['answer']}")

# Output:
# Question: Roger has 5 tennis balls. He buys 2 more cans...
#
# Reasoning:
#   Step 1: Roger starts with 5 tennis balls
#   Step 2: He buys 2 cans of tennis balls
#   Step 3: Each can has 3 tennis balls
#   Step 4: 2 cans × 3 balls per can = 6 balls
#   Step 5: Total = 5 + 6 = 11 balls
#
# Final Answer: Roger has 11 tennis balls.
```

**2. Self-Consistency CoT:**

```python
from collections import Counter
import asyncio

class SelfConsistencyCoT:
    """Generate multiple reasoning paths and vote"""
    
    def __init__(self, client, model="gpt-4"):
        self.client = client
        self.model = model
    
    async def generate_reasoning_path(self, question: str, temperature: float = 0.7) -> str:
        """Generate one reasoning path"""
        prompt = f"{question}\n\nLet's think step by step."
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature  # Allow variation
        )
        
        return response.choices[0].message.content
    
    async def self_consistency_cot(
        self,
        question: str,
        num_paths: int = 5,
        temperature: float = 0.7
    ) -> dict:
        """Generate multiple paths and take majority vote"""
        
        # Generate multiple reasoning paths in parallel
        tasks = [
            self.generate_reasoning_path(question, temperature)
            for _ in range(num_paths)
        ]
        
        reasoning_paths = await asyncio.gather(*tasks)
        
        # Extract answer from each path
        answers = [self._extract_answer(path) for path in reasoning_paths]
        
        # Majority vote
        answer_counts = Counter(answers)
        most_common_answer, count = answer_counts.most_common(1)[0]
        confidence = count / num_paths
        
        return {
            "question": question,
            "reasoning_paths": reasoning_paths,
            "all_answers": answers,
            "final_answer": most_common_answer,
            "confidence": confidence,
            "vote_distribution": dict(answer_counts)
        }
    
    def _extract_answer(self, text: str) -> str:
        """Extract numeric answer or final conclusion"""
        # Look for numbers in last few lines
        lines = text.strip().split('\n')
        
        for line in reversed(lines[-3:]):  # Check last 3 lines
            # Extract numbers
            import re
            numbers = re.findall(r'\d+', line)
            if numbers:
                return numbers[-1]  # Return last number found
        
        return lines[-1]  # Fallback to last line

# Usage
sc_cot = SelfConsistencyCoT(client=OpenAI())

question = "Janet's ducks lay 16 eggs per day. She eats three for breakfast every morning and bakes muffins for her friends every day with four. She sells the remainder at the farmers' market daily for $2 per fresh duck egg. How much does she make every day?"

result = await sc_cot.self_consistency_cot(question, num_paths=5)

print(f"Question: {result['question']}\n")
print("Generated Answers:")
for i, ans in enumerate(result['all_answers'], 1):
    print(f"  Path {i}: {ans}")

print(f"\nVote Distribution: {result['vote_distribution']}")
print(f"Final Answer: {result['final_answer']}")
print(f"Confidence: {result['confidence']*100:.0f}%")

# Output:
# Question: Janet's ducks lay 16 eggs per day...
#
# Generated Answers:
#   Path 1: 18
#   Path 2: 18
#   Path 3: 18
#   Path 4: 18
#   Path 5: 18
#
# Vote Distribution: {'18': 5}
# Final Answer: 18
# Confidence: 100%
```

**3. Program-Aided Language Model (PAL):**

```python
import re
from typing import Any

class ProgramAidedLM:
    """Generate Python code to solve problems"""
    
    def __init__(self, client, model="gpt-4"):
        self.client = client
        self.model = model
    
    def solve_with_code(self, question: str) -> dict:
        """Generate and execute Python code to solve problem"""
        
        # Prompt LLM to generate code
        prompt = f"""Question: {question}

Write Python code to solve this problem. Follow this format:
1. Parse the problem
2. Define variables
3. Perform calculations
4. Print the answer

```python
# Your code here
```"""
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0
        )
        
        full_response = response.choices[0].message.content
        
        # Extract Python code
        code = self._extract_code(full_response)
        
        # Execute code safely
        result = self._execute_code(code)
        
        return {
            "question": question,
            "generated_code": code,
            "execution_result": result,
            "answer": result["output"]
        }
    
    def _extract_code(self, text: str) -> str:
        """Extract code from markdown code blocks"""
        # Match ```python ... ``` or ``` ... ```
        pattern = r'```(?:python)?\n(.*?)```'
        matches = re.findall(pattern, text, re.DOTALL)
        
        if matches:
            return matches[0].strip()
        
        # Fallback: return text between first and last line with code
        lines = text.split('\n')
        code_lines = [line for line in lines if line.strip() and not line.startswith('#')]
        return '\n'.join(code_lines)
    
    def _execute_code(self, code: str) -> dict:
        """Execute code in sandboxed environment"""
        import io
        import sys
        
        # Capture stdout
        old_stdout = sys.stdout
        sys.stdout = captured_output = io.StringIO()
        
        try:
            # Execute code
            exec_globals = {}
            exec(code, exec_globals)
            
            # Get output
            output = captured_output.getvalue()
            
            return {
                "success": True,
                "output": output.strip(),
                "error": None
            }
        
        except Exception as e:
            return {
                "success": False,
                "output": None,
                "error": str(e)
            }
        
        finally:
            # Restore stdout
            sys.stdout = old_stdout

# Usage
pal = ProgramAidedLM(client=OpenAI())

question = "A rectangle has length 12.5 and width 7.3. What is its area? What is its perimeter?"

result = pal.solve_with_code(question)

print(f"Question: {result['question']}\n")
print("Generated Code:")
print(result['generated_code'])
print(f"\nExecution Result:")
print(result['execution_result']['output'])

# Output:
# Question: A rectangle has length 12.5 and width 7.3...
#
# Generated Code:
# length = 12.5
# width = 7.3
# area = length * width
# perimeter = 2 * (length + width)
# print(f"Area: {area}")
# print(f"Perimeter: {perimeter}")
#
# Execution Result:
# Area: 91.25
# Perimeter: 39.6
```

**4. Tree of Thoughts:**

```python
from typing import List, Tuple
import numpy as np

class TreeOfThoughts:
    """Explore multiple reasoning branches"""
    
    def __init__(self, client, model="gpt-4"):
        self.client = client
        self.model = model
    
    def generate_thoughts(self, state: str, num_thoughts: int = 3) -> List[str]:
        """Generate possible next thoughts from current state"""
        prompt = f"""Current thinking: {state}

Generate {num_thoughts} different ways to continue this reasoning.
Each should be a distinct approach or next step.

Format:
1. [First approach]
2. [Second approach]
3. [Third approach]"""
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8  # Encourage diversity
        )
        
        thoughts = self._parse_numbered_list(response.choices[0].message.content)
        return thoughts[:num_thoughts]
    
    def evaluate_thought(self, thought: str, goal: str) -> float:
        """Evaluate how promising a thought is (0-1 score)"""
        prompt = f"""Goal: {goal}

Current thought: {thought}

Rate how promising this line of thinking is for reaching the goal.
Consider:
- Does it make progress toward the goal?
- Is it logically sound?
- Does it avoid dead ends?

Provide a score from 0 (not promising) to 10 (very promising).
Just respond with the number."""
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0
        )
        
        try:
            score = float(response.choices[0].message.content.strip())
            return min(max(score / 10.0, 0.0), 1.0)  # Normalize to [0, 1]
        except:
            return 0.5  # Default middle score
    
    def solve_with_tree_of_thoughts(
        self,
        problem: str,
        max_depth: int = 3,
        beam_width: int = 2
    ) -> dict:
        """Solve problem using tree search"""
        
        # Initialize search
        initial_state = f"Problem: {problem}\nLet's approach this systematically."
        
        # Beam search through thought space
        current_beam = [(initial_state, 0.0, [])]  # (state, score, path)
        
        for depth in range(max_depth):
            next_beam = []
            
            for state, cumulative_score, path in current_beam:
                # Generate possible next thoughts
                thoughts = self.generate_thoughts(state, num_thoughts=3)
                
                for thought in thoughts:
                    # Evaluate this thought
                    score = self.evaluate_thought(thought, problem)
                    
                    new_state = f"{state}\n\nStep {depth + 1}: {thought}"
                    new_score = cumulative_score + score
                    new_path = path + [thought]
                    
                    next_beam.append((new_state, new_score, new_path))
            
            # Keep top beam_width candidates
            next_beam.sort(key=lambda x: x[1], reverse=True)
            current_beam = next_beam[:beam_width]
        
        # Return best path
        best_state, best_score, best_path = current_beam[0]
        
        # Generate final answer from best path
        final_prompt = f"{best_state}\n\nBased on this reasoning, what is the final answer?"
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": final_prompt}],
            temperature=0.0
        )
        
        return {
            "problem": problem,
            "reasoning_path": best_path,
            "full_reasoning": best_state,
            "final_answer": response.choices[0].message.content,
            "confidence_score": best_score
        }
    
    def _parse_numbered_list(self, text: str) -> List[str]:
        """Parse numbered list from text"""
        lines = text.split('\n')
        items = []
        
        for line in lines:
            line = line.strip()
            # Match "1.", "2.", etc.
            if re.match(r'^\d+\.', line):
                # Remove number prefix
                item = re.sub(r'^\d+\.\s*', '', line)
                items.append(item)
        
        return items

# Usage
tot = TreeOfThoughts(client=OpenAI())

problem = "Use the numbers 2, 3, 5, 7 exactly once with operations +, -, ×, ÷ to make 24."

result = tot.solve_with_tree_of_thoughts(problem, max_depth=3, beam_width=2)

print(f"Problem: {result['problem']}\n")
print("Reasoning Path:")
for i, step in enumerate(result['reasoning_path'], 1):
    print(f"  Step {i}: {step}")

print(f"\nFinal Answer: {result['final_answer']}")
print(f"Confidence: {result['confidence_score']:.2f}")

# Output:
# Problem: Use the numbers 2, 3, 5, 7 exactly once...
#
# Reasoning Path:
#   Step 1: Try creating 24 by multiplication first
#   Step 2: 3 × 7 = 21, then need to make 3 from 2 and 5
#   Step 3: 5 - 2 = 3, so (3 × 7) + (5 - 2) = 21 + 3 = 24
#
# Final Answer: (3 × 7) + (5 - 2) = 24
# Confidence: 0.87
```

---

## 🎨 Visual Explanation

**Reasoning Path Comparison:**

```
Direct Answer (No CoT):
Question ──────────────────────► Answer
         [Black box reasoning]
         
Accuracy: 35-60%

Chain of Thought:
Question ──► Step 1 ──► Step 2 ──► Step 3 ──► Answer
         Identify   Calculate  Calculate   Combine
         variables  part 1     part 2      results
         
Accuracy: 70-95%

Tree of Thoughts:
                    ┌─► Approach A1 ──► A2 ──► A3 ──► Answer A
Question ──► Try ───┤
                    ├─► Approach B1 ──► B2 ──► Answer B (dead end)
                    └─► Approach C1 ──► C2 ──► C3 ──► Answer C (best)
                    
Explore multiple paths, pick best

Accuracy: 75-98%
```

---

## 💡 Simple Example

**Implementing Zero-Shot CoT in 10 Lines:**

```python
# simplest_cot.py
from openai import OpenAI

client = OpenAI()

def simple_cot(question):
    """Add 'Let's think step by step' - that's it!"""
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[{
            "role": "user",
            "content": f"{question}\n\nLet's think step by step."
        }]
    )
    return response.choices[0].message.content

# Test
question = "If I have 12 apples and give away 1/3, then buy 8 more, how many do I have?"
answer = simple_cot(question)
print(answer)

# Output includes reasoning:
# "Step 1: You start with 12 apples
#  Step 2: 1/3 of 12 is 4 apples
#  Step 3: 12 - 4 = 8 apples remaining
#  Step 4: You buy 8 more: 8 + 8 = 16
#  Answer: You have 16 apples"
```

---

## 🌍 Real-World Applications

### 1. **Math Problem Solving**
```python
# GSM8K (Grade School Math) benchmark
# Without CoT: 35% accuracy
# With CoT: 89% accuracy

question = "Josh had 20 pencils. He gave 1/4 to Sarah and 3 to Tom. How many does he have left?"

cot_answer = cot_engine.solve(question)
# Step 1: Josh starts with 20 pencils
# Step 2: 1/4 of 20 = 5 pencils given to Sarah
# Step 3: 3 pencils given to Tom
# Step 4: 20 - 5 - 3 = 12 pencils left
# Answer: 12 pencils
```

### 2. **Code Debugging**
```python
# Use CoT to debug code step-by-step
buggy_code = """
def calculate_average(numbers):
    total = 0
    for num in numbers:
        total += num
    return total / len(numbers)
    
result = calculate_average([])  # Bug: division by zero
"""

cot_debug = cot_engine.debug(buggy_code)
# Step 1: Function calculates average by summing and dividing
# Step 2: Problem: Empty list passed to function
# Step 3: len(numbers) = 0, causing division by zero
# Step 4: Fix: Add check for empty list
# Solution:
#   if not numbers:
#       return 0  # or raise ValueError
```

### 3. **Medical Diagnosis (Reasoning)**
```python
# IMPORTANT: Not for actual medical use!
# Demonstrates reasoning pattern

symptoms = "Patient has: fever (102°F), cough, fatigue, loss of taste"

cot_diagnosis = cot_engine.reason(symptoms)
# Step 1: Fever + cough suggests infection
# Step 2: Loss of taste is distinctive symptom
# Step 3: Loss of taste + fever + cough associated with COVID-19
# Step 4: Recommend: COVID test, isolation, monitor symptoms
# Note: Multiple conditions possible, needs professional evaluation
```

### 4. **OpenAI o1 Model (2024)**
```
OpenAI's o1 model is essentially "CoT on steroids":
• Trained specifically for multi-step reasoning
• Generates extensive internal thoughts (not shown to user)
• Can reason for minutes before answering
• Achieves PhD-level performance on complex problems

Example o1 reasoning (simplified):
User: "Prove that √2 is irrational"

o1 internal thoughts (10,000+ tokens):
- Recall definition of rational number
- Consider proof by contradiction
- Assume √2 = p/q in lowest terms
- Square both sides: 2 = p²/q²
- Therefore p² = 2q²
- This means p² is even
- If p² is even, then p is even
- Let p = 2k for some integer k
- Substituting: (2k)² = 2q²
- Simplifying: 4k² = 2q²
- Therefore: 2k² = q²
- This means q² is even
- If q² is even, then q is even
- But if both p and q are even, they share factor 2
- This contradicts our assumption of lowest terms
- Therefore √2 cannot be rational ∎

User sees: [Clean, well-structured proof]
```

---

## ❌ Common Misconceptions

### ❌ "CoT only works for math problems"
**Reality:** CoT improves reasoning across domains:

```python
domains_improved_by_cot = {
    'Math': '+154% accuracy',
    'Logic puzzles': '+89% accuracy',
    'Commonsense reasoning': '+44% accuracy',
    'Reading comprehension': '+31% accuracy',
    'Code generation': '+27% accuracy',
    'Scientific reasoning': '+52% accuracy',
    'Planning tasks': '+67% accuracy'
}

# CoT helps whenever multi-step reasoning is needed
```

### ❌ "'Let's think step by step' is magic"
**Reality:** It works because of training data:

```python
# Why this phrase works:
training_data_contains = """
Many examples like:
"Let's think step by step:
 Step 1: ...
 Step 2: ...
 Therefore: ..."
 
From:
- Tutorial websites
- Educational content
- Stack Overflow explanations
- Textbook solutions
"""

# LLM learned this pattern during pretraining
# The phrase triggers this learned behavior
# Not magic - just learned association
```

### ❌ "More steps = better reasoning"
**Reality:** Quality > quantity:

```python
# Bad CoT (verbose but unhelpful):
bad_cot = """
Step 1: Let me read the question
Step 2: The question mentions apples
Step 3: Apples are fruits
Step 4: Fruits are healthy
Step 5: Okay, so there are 5 apples
Step 6: Wait, let me re-read...
"""
# Just adds noise

# Good CoT (concise and logical):
good_cot = """
Step 1: Starting apples: 5
Step 2: Apples bought: 3
Step 3: Total: 5 + 3 = 8 apples
"""
# Direct and clear
```

### ❌ "CoT is foolproof"
**Reality:** CoT can still fail:

```python
# CoT failure modes:
failures = {
    'Confidently wrong': """
        Step 1: 2 + 2 = 5  # Wrong from the start
        Step 2: 5 + 1 = 6
        Therefore: 7       # Confidently incorrect
    """,
    
    'Circular reasoning': """
        Step 1: A is true because B is true
        Step 2: B is true because A is true
        Therefore: Both are true  # Circular logic
    """,
    
    'Hallucinated facts': """
        Step 1: Paris is the capital of Germany  # Factually wrong
        Step 2: Therefore...
    """
}

# CoT improves reasoning but doesn't guarantee correctness
# Still need verification, especially for critical applications
```

---

## ✅ Best Practices

### 1. **Choose Right CoT Variant**

```python
# Decision tree for CoT variant:
def choose_cot_method(problem_type, time_budget, accuracy_needed):
    if time_budget == 'instant' and accuracy_needed == 'medium':
        return 'zero_shot_cot'  # "Let's think step by step"
    
    elif time_budget == 'medium' and accuracy_needed == 'high':
        return 'self_consistency'  # Generate 5-10 paths, vote
    
    elif problem_type == 'math' and accuracy_needed == 'very_high':
        return 'program_aided'  # Generate and execute code
    
    elif problem_type == 'creative' or 'planning':
        return 'tree_of_thoughts'  # Explore multiple approaches
    
    elif time_budget == 'low' and need_examples:
        return 'few_shot_cot'  # Provide 2-3 examples
    
    return 'zero_shot_cot'  # Default
```

### 2. **Prompt Engineering for CoT**

```python
# Good CoT prompts:
good_prompts = {
    'explicit_instruction': """
        Solve this problem step by step.
        Show your work for each step.
        Question: {question}
    """,
    
    'structured_format': """
        Question: {question}
        
        Let's break this down:
        1) What do we know?
        2) What do we need to find?
        3) What steps do we need?
        4) Let's calculate:
    """,
    
    'verification': """
        Question: {question}
        
        First, let's think step by step to find the answer.
        Then, let's verify our answer makes sense.
    """
}

# Bad CoT prompts:
bad_prompts = {
    'too_vague': "Think about this question.",  # Not specific enough
    'discouraging': "Answer directly without thinking.",  # Blocks CoT
    'confusing': "Step think by answer step.",  # Garbled instruction
}
```

### 3. **Answer Extraction**

```python
class CoTAnswerExtractor:
    """Extract final answer from CoT response"""
    
    def extract_answer(self, cot_text: str) -> str:
        """Robust answer extraction"""
        
        # Strategy 1: Look for explicit "Answer:" marker
        if "answer:" in cot_text.lower():
            parts = re.split(r'answer:\s*', cot_text, flags=re.IGNORECASE)
            if len(parts) > 1:
                return parts[-1].strip()
        
        # Strategy 2: Look for "Therefore" marker
        if "therefore" in cot_text.lower():
            parts = re.split(r'therefore[,:]?\s*', cot_text, flags=re.IGNORECASE)
            if len(parts) > 1:
                return parts[-1].strip()
        
        # Strategy 3: Extract last number (for math problems)
        numbers = re.findall(r'\d+\.?\d*', cot_text)
        if numbers:
            return numbers[-1]
        
        # Strategy 4: Last sentence
        sentences = cot_text.strip().split('.')
        return sentences[-1].strip()
    
    def validate_answer(self, answer: str, question: str) -> bool:
        """Check if answer makes sense"""
        # Check answer is not empty
        if not answer or len(answer) < 2:
            return False
        
        # Check answer doesn't just repeat question
        if question.lower() in answer.lower():
            return False
        
        # Check answer has content (not just punctuation)
        if not any(c.isalnum() for c in answer):
            return False
        
        return True
```

### 4. **Cost Optimization**

```python
# CoT increases token usage → increases cost
# Optimize based on problem importance

class AdaptiveCoT:
    """Use CoT selectively based on problem complexity"""
    
    def __init__(self, client):
        self.client = client
    
    def should_use_cot(self, question: str) -> bool:
        """Decide if CoT is needed"""
        
        # Simple questions don't need CoT
        simple_indicators = [
            len(question.split()) < 15,  # Short question
            '?' not in question,  # Not a question
            any(simple in question.lower() for simple in ['define', 'what is', 'who is'])
        ]
        
        if any(simple_indicators):
            return False  # Skip CoT for simple lookups
        
        # Complex questions benefit from CoT
        complex_indicators = [
            any(math in question for math in ['+', '-', '×', '÷', 'calculate']),
            'step' in question.lower(),
            len(question.split()) > 30,  # Long problem
            any(logic in question.lower() for logic in ['if', 'then', 'because', 'therefore'])
        ]
        
        return any(complex_indicators)
    
    def solve(self, question: str) -> str:
        """Adaptively use CoT"""
        
        if self.should_use_cot(question):
            # Use CoT for complex problems
            prompt = f"{question}\n\nLet's think step by step."
            # Cost: ~3x tokens
        else:
            # Direct answer for simple questions
            prompt = question
            # Cost: ~1x tokens
        
        response = self.client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}]
        )
        
        return response.choices[0].message.content
```

---

## 🎯 Key Takeaways

1. **CoT = Intermediate Reasoning Steps**
   - Show work before final answer
   - Makes reasoning visible and verifiable

2. **Massive Accuracy Improvements:**
   - Math: +154% accuracy
   - Logic: +89% accuracy
   - Reasoning: +44% accuracy

3. **Multiple Variants:**
   - Zero-shot: "Let's think step by step"
   - Few-shot: Provide examples
   - Self-consistency: Multiple paths + vote
   - Tree of Thoughts: Explore branches
   - PAL: Generate and execute code

4. **Why It Works:**
   - Extends working memory
   - Enables error correction
   - Decomposes complex problems
   - Constrains probability space

5. **Production Considerations:**
   - Increases token usage (3-5x)
   - Requires answer extraction
   - Not foolproof (still can fail)
   - Use adaptively based on problem complexity

---

## ✅ Review Questions

1. What is the core principle behind Chain of Thought prompting?
2. How does zero-shot CoT differ from few-shot CoT?
3. What is self-consistency and why does it improve accuracy?
4. When should you use Program-Aided Language Models instead of regular CoT?
5. What are the trade-offs of using CoT (benefits vs costs)?

---

## 🧩 Practice Problems

### Beginner
1. Implement zero-shot CoT with OpenAI API
2. Compare accuracy with/without CoT on 10 math problems
3. Build an answer extractor that handles different CoT formats

### Intermediate
4. Implement self-consistency CoT with majority voting
5. Create a program-aided LM that generates and executes Python
6. Build adaptive CoT that decides when to use reasoning steps

### Advanced
7. Implement Tree of Thoughts with beam search
8. Create a CoT verification system that checks reasoning steps
9. Build multi-agent CoT where agents debate and refine answers
10. Optimize CoT for cost while maintaining accuracy

---

## 🚀 Mini Project: CoT Math Tutor

**Goal:** Build an AI math tutor that explains step-by-step solutions.

**Features:**

1. **Problem Input:** Accept math word problems

2. **Step-by-Step Solution:**
   - Generate detailed reasoning
   - Show each calculation
   - Explain the logic

3. **Multiple Approaches:**
   - Use self-consistency to show different methods
   - Explain which method is simplest

4. **Interactive Learning:**
   - Ask user if they understand each step
   - Provide additional explanation if needed
   - Generate similar practice problems

5. **Verification:**
   - Use PAL to verify arithmetic is correct
   - Check final answer makes logical sense

**Tech Stack:**
- OpenAI API / Anthropic Claude
- Streamlit for UI
- Python for PAL execution
- Storage for user progress

**Bonus Features:**
- Visual diagrams (describe with words, render with matplotlib)
- Difficulty progression (start easy, increase complexity)
- Track which problem types user struggles with
- Generate personalized practice sets

---

**Last Topic of Week 6:** DeepSeek Architecture - China's answer to GPT! 🚀
