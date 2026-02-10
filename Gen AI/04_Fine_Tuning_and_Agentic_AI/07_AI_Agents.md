# 📘 AI Agents - Autonomous Intelligent Systems


## 📑 Table of Contents

- [**Purpose (Why this exists):**](#purpose-why-this-exists)
- [**What it is:**](#what-it-is)
- [**How it works (Intuition):**](#how-it-works-intuition)
- [**How it works (Math – simplified):**](#how-it-works-math-simplified)
- [**Visual Explanation (described):**](#visual-explanation-described)
- [**Simple Example:**](#simple-example)
- [**Real-World Applications:**](#real-world-applications)
- [**Common Misconceptions:**](#common-misconceptions)
- [**Key Takeaways:**](#key-takeaways)
- [✅ **Review Questions:**](#review-questions)
- [🧩 **Practice Problems:**](#practice-problems)
- [🚀 **Mini Project:**](#mini-project)

---

---

## **Purpose (Why this exists):**

### **The Limits of Direct LLM Use:**

```javascript
const llm_without_agents = {
  limitation: {
    static: 'LLM only knows training data (up to cutoff date)',
    no_tools: 'Cannot search web, calculate, access databases',
    single_shot: 'One input → one output, no iterative problem-solving',
    no_memory: 'Each call is independent',
    
    example_failure: {
      question: 'What is Tesla stock price today?',
      llm_response: 'I cannot access real-time information',
      user: '😞 Not helpful!'
    }
  },
  
  what_we_really_want: {
    dynamic: 'Access real-time data',
    tools: 'Use calculator, search, APIs',
    reasoning: 'Break down complex problems',
    memory: 'Remember context across interactions',
    autonomy: 'Act independently to achieve goals',
    
    dream: 'Give LLM the power to think, plan, and act!'
  }
};

const ai_agents_solution = {
  vision: 'LLM + Tools + Memory + Reasoning = Autonomous Agent',
  
  capabilities: {
    perception: 'Understand user goals',
    reasoning: 'Plan steps to achieve goal',
    action: 'Use tools (search, calculate, code)',
    learning: 'Improve from feedback',
    autonomy: 'Make decisions independently'
  },
  
  breakthrough: 'From static Q&A to dynamic problem-solving!'
};
```

---

## **What it is:**

### **AI Agent Architecture:**

```javascript
const ai_agent = {
  definition: 'Autonomous system that perceives environment, reasons about goals, and takes actions using tools',
  
  core_components: {
    brain: {
      llm: 'GPT-4, Claude, Llama',
      role: 'Reasoning engine',
      task: 'Decide what to do next'
    },
    
    tools: {
      examples: ['Web search', 'Calculator', 'Database', 'Code executor', 'APIs'],
      role: 'Capabilities',
      task: 'Execute actions in world'
    },
    
    memory: {
      short_term: 'Current conversation',
      long_term: 'Past experiences, learned patterns',
      role: 'Context',
      task: 'Remember what happened'
    },
    
    planning: {
      strategy: 'Break goals into steps',
      role: 'Orchestration',
      task: 'Organize actions to achieve goal'
    }
  },
  
  agent_loop: `
    1. Perceive: Understand current state and goal
    2. Think: Reason about what to do
    3. Act: Use tool or give answer
    4. Observe: See result of action
    5. Repeat until goal achieved
  `
};
```

### **Agent Types:**

```javascript
const agent_types = {
  react_agent: {
    pattern: 'Reasoning + Acting',
    flow: 'Think → Act → Observe → Think → ...',
    best_for: 'General purpose tasks',
    example: 'Answer questions using web search'
  },
  
  plan_execute_agent: {
    pattern: 'Plan ahead, then execute',
    flow: 'Create plan → Execute step 1 → Execute step 2 → ...',
    best_for: 'Complex multi-step tasks',
    example: 'Write research report on topic'
  },
  
  reflexion_agent: {
    pattern: 'Self-reflection and improvement',
    flow: 'Attempt → Evaluate → Reflect → Retry',
    best_for: 'Tasks requiring quality',
    example: 'Generate code and debug until works'
  },
  
  multi_agent_system: {
    pattern: 'Multiple specialized agents collaborate',
    flow: 'Supervisor → Route to expert agent → Aggregate',
    best_for: 'Complex domains',
    example: 'Research team (researcher + writer + reviewer)'
  }
};
```

---

## **How it works (Intuition):**

### **Human vs AI Agent Analogy:**

```javascript
// How you would research a topic

const human_research_process = {
  task: 'Write report on quantum computing',
  
  steps: [
    {
      think: 'I need to understand basics first',
      act: 'Search Google for "quantum computing basics"',
      observe: 'Found good intro article'
    },
    {
      think: 'Need specific examples',
      act: 'Search for "quantum computing applications"',
      observe: 'Found cryptography, drug discovery uses'
    },
    {
      think: 'Need latest developments',
      act: 'Search for "quantum computing 2024 news"',
      observe: 'Found recent breakthroughs'
    },
    {
      think: 'Have enough info, time to write',
      act: 'Compile information into report',
      observe: 'Report complete'
    }
  ],
  
  pattern: 'Iterative thinking and acting based on observations'
};

// AI Agent does the SAME thing!

const ai_agent_process = {
  task: 'Write report on quantum computing',
  
  loop: [
    {
      llm_thinks: 'I should search for basics',
      llm_chooses: 'Tool: web_search("quantum computing basics")',
      tool_returns: '[Article content...]',
      llm_observes: 'Good, now I know basics'
    },
    {
      llm_thinks: 'Need applications',
      llm_chooses: 'Tool: web_search("quantum applications")',
      tool_returns: '[Application examples...]',
      llm_observes: 'Great, have use cases'
    },
    // ... more iterations ...
    {
      llm_thinks: 'Have enough info',
      llm_chooses: 'Action: Finish with report',
      done: true
    }
  ],
  
  magic: 'LLM autonomously decides what to do at each step!'
};
```

### **ReAct Pattern Intuition:**

```javascript
const react_pattern = {
  name: 'Reasoning + Acting',
  
  example_task: 'What is the population of Paris?',
  
  execution: [
    {
      thought: 'I need current population data. I should search.',
      action: 'search("population of Paris")',
      observation: 'Paris has a population of 2.2 million (city proper)'
    },
    {
      thought: 'I have the answer from the search.',
      action: 'Finish[The population of Paris is 2.2 million]',
      result: 'Done!'
    }
  ],
  
  key_insight: 'Interleaving thoughts and actions allows step-by-step reasoning',
  
  vs_direct_llm: {
    direct: 'LLM would say "I don\'t have real-time data"',
    react: 'Agent searches and finds current data!'
  }
};
```

---

## **How it works (Math – simplified):**

### **Agent Decision Making:**

```python
# Mathematical formulation of agent

def agent_loop(goal, tools, max_iterations=10):
    """
    Agent loop: Markov Decision Process (MDP)
    
    At each timestep t:
      s_t = current state
      a_t = agent action (chosen by LLM)
      r_t = reward (task progress)
      s_{t+1} = next state
    
    Goal: Maximize cumulative reward
    """
    state = {
        'goal': goal,
        'history': [],
        'completed': False
    }
    
    for t in range(max_iterations):
        # Agent policy: π(s_t) → a_t
        # LLM decides action based on current state
        action = llm_policy(state)
        
        # Action types:
        # 1. Use tool: action = ("tool_name", args)
        # 2. Finish: action = ("finish", answer)
        
        if action[0] == "finish":
            return action[1]  # Return answer
        
        # Execute tool
        tool_name, args = action
        observation = tools[tool_name](**args)
        
        # Update state: s_{t+1} = T(s_t, a_t, o_t)
        state['history'].append({
            'action': action,
            'observation': observation
        })
    
    return "Max iterations reached"


def llm_policy(state):
    """
    LLM as policy function: π(s) → a
    
    Given state s, LLM generates action a
    Using prompt:
      - Goal: {goal}
      - History: {past actions and observations}
      - Available tools: {tool descriptions}
      - What should I do next?
    
    LLM outputs:
      Thought: [reasoning]
      Action: [tool_name] [args]
    """
    prompt = f"""
    Goal: {state['goal']}
    
    History:
    {format_history(state['history'])}
    
    Available tools:
    - search(query): Search the web
    - calculate(expression): Calculate math
    - finish(answer): Give final answer
    
    What is your next step?
    
    Think step by step:
    Thought: [your reasoning]
    Action: [tool_name] [arguments]
    """
    
    llm_response = llm.generate(prompt)
    action = parse_action(llm_response)
    return action


# Reinforcement Learning formulation:
"""
MDP = (S, A, T, R, γ)

S = State space
  - Goal
  - Conversation history
  - Tool outputs

A = Action space
  - Use tool_1
  - Use tool_2
  - ...
  - Finish

T(s' | s, a) = Transition function
  - Deterministic for tools
  - s' = s + observation

R(s, a) = Reward function
  - +1 if goal achieved
  - 0 otherwise
  - Can add intermediate rewards

Agent learns policy π*(s) that maximizes:
  E[Σ_{t=0}^T γ^t R(s_t, a_t)]

In practice:
  - π = LLM (few-shot prompted or fine-tuned)
  - Training: Imitation learning or RLHF
"""
```

### **Tool Selection Mathematics:**

```python
# How agent chooses which tool to use

def tool_selection(state, available_tools):
    """
    Agent scores each tool for relevance
    
    Score(tool | state) = P(tool useful | current_situation)
    
    Choose: tool* = argmax_tool Score(tool | state)
    """
    
    # Method 1: LLM-based selection
    # LLM directly chooses based on descriptions
    tool_descriptions = "\n".join([
        f"{name}: {tool.description}" 
        for name, tool in available_tools.items()
    ])
    
    prompt = f"""
    Current situation: {state['goal']}
    
    Available tools:
    {tool_descriptions}
    
    Which tool should I use? Choose one.
    """
    
    chosen_tool = llm.generate(prompt)
    
    return chosen_tool


    # Method 2: Embedding-based selection
    # Find tool with description most similar to goal
    
    goal_embedding = embed(state['goal'])  # [768]
    
    tool_scores = []
    for tool in available_tools:
        tool_emb = embed(tool.description)  # [768]
        
        # Cosine similarity
        score = cosine_similarity(goal_embedding, tool_emb)
        # score = (v1 · v2) / (||v1|| × ||v2||)
        
        tool_scores.append((tool, score))
    
    # Choose highest scoring tool
    best_tool = max(tool_scores, key=lambda x: x[1])[0]
    
    return best_tool
```

---

## **Visual Explanation (described):**

### **Agent Architecture Diagram:**

```
┌────────────────────────────────────────────┐
│            USER GOAL                       │
│   "What's the weather in Paris?"          │
└────────────────┬───────────────────────────┘
                 ↓
┌────────────────────────────────────────────┐
│         AGENT (LLM Brain)                  │
│                                            │
│  Current State:                            │
│  - Goal: Get weather                       │
│  - Location: Paris                         │
│  - Tools used: None yet                    │
│                                            │
│  Reasoning:                                │
│  "I need real-time weather data.           │
│   I should use the weather API tool."      │
└────────────────┬───────────────────────────┘
                 ↓
         [Choose Action]
                 ↓
┌────────────────────────────────────────────┐
│          TOOL EXECUTOR                     │
│                                            │
│  Selected: weather_api("Paris")            │
│  Executing...                              │
└────────────────┬───────────────────────────┘
                 ↓
         [API Call to Weather Service]
                 ↓
┌────────────────────────────────────────────┐
│         OBSERVATION                        │
│                                            │
│  Result: "Paris: 18°C, Cloudy, 60% humid" │
└────────────────┬───────────────────────────┘
                 ↓
        [Update State, Back to Agent]
                 ↓
┌────────────────────────────────────────────┐
│         AGENT (Reasoning Again)            │
│                                            │
│  State now includes:                       │
│  - Goal: Get weather ✓                     │
│  - Tool used: weather_api                  │
│  - Result: 18°C, Cloudy                    │
│                                            │
│  Reasoning:                                │
│  "I have the answer. I should finish."     │
└────────────────┬───────────────────────────┘
                 ↓
         [Finish Action]
                 ↓
┌────────────────────────────────────────────┐
│         FINAL RESPONSE                     │
│                                            │
│  "The weather in Paris is currently        │
│   18°C and cloudy."                        │
└────────────────────────────────────────────┘
```

### **Multi-Agent System:**

```
                    ┌──────────────┐
                    │  SUPERVISOR  │
                    │    Agent     │
                    └──────┬───────┘
                           ↓
                [Route to appropriate agent]
              /            |            \
             ↓             ↓             ↓
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │   RESEARCH   │ │     CODE     │ │   WRITING    │
    │    Agent     │ │    Agent     │ │    Agent     │
    │              │ │              │ │              │
    │ Tools:       │ │ Tools:       │ │ Tools:       │
    │ - Web search │ │ - Python     │ │ - Grammar    │
    │ - Wikipedia  │ │ - Terminal   │ │ - Style      │
    └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
           ↓                ↓                ↓
           └────────────────┴────────────────┘
                           ↓
                  ┌────────────────┐
                  │  AGGREGATOR    │
                  │ Combine results│
                  └────────┬───────┘
                           ↓
                     [Final Output]
```

---

## **Simple Example:**

### **JavaScript Conceptual Implementation:**

```javascript
// Simple AI Agent Implementation

class AIAgent {
  constructor(llm, tools) {
    this.llm = llm;
    this.tools = tools;
    this.max_iterations = 10;
  }
  
  async run(goal) {
    const state = {
      goal,
      history: [],
      iteration: 0
    };
    
    console.log(`🎯 Goal: ${goal}\n`);
    
    while (state.iteration < this.max_iterations) {
      console.log(`\n--- Iteration ${state.iteration + 1} ---`);
      
      // Agent thinks and decides action
      const action = await this.think(state);
      
      console.log(`💭 Thought: ${action.thought}`);
      console.log(`🎬 Action: ${action.type}(${JSON.stringify(action.args)})`);
      
      // Check if agent wants to finish
      if (action.type === 'finish') {
        console.log(`\n✅ Final Answer: ${action.args.answer}`);
        return action.args.answer;
      }
      
      // Execute tool
      const observation = await this.executeAction(action);
      console.log(`👁️ Observation: ${observation}`);
      
      // Update state
      state.history.push({ action, observation });
      state.iteration++;
    }
    
    return 'Max iterations reached';
  }
  
  async think(state) {
    // Build prompt for LLM
    const prompt = this.buildPrompt(state);
    
    // LLM decides next action
    const response = await this.llm.generate(prompt);
    
    // Parse response
    return this.parseResponse(response);
  }
  
  buildPrompt(state) {
    const toolDescriptions = Object.entries(this.tools)
      .map(([name, tool]) => `${name}: ${tool.description}`)
      .join('\n');
    
    const history = state.history
      .map(h => `Action: ${h.action.type}\nObservation: ${h.observation}`)
      .join('\n\n');
    
    return `
You are an AI agent. Your goal is: ${state.goal}

Available tools:
${toolDescriptions}
- finish: Give final answer when goal is achieved

History so far:
${history || 'None yet'}

Think about what to do next:

Thought: [Your reasoning here]
Action: [tool_name]
Args: [arguments as JSON]

If you have achieved the goal, use:
Action: finish
Args: {"answer": "your final answer"}
`;
  }
  
  parseResponse(response) {
    // Simple parsing (in production, use structured output)
    const thoughtMatch = response.match(/Thought: (.+)/);
    const actionMatch = response.match(/Action: (\w+)/);
    const argsMatch = response.match(/Args: ({.+})/);
    
    return {
      thought: thoughtMatch ? thoughtMatch[1] : '',
      type: actionMatch ? actionMatch[1] : 'finish',
      args: argsMatch ? JSON.parse(argsMatch[1]) : {}
    };
  }
  
  async executeAction(action) {
    if (action.type === 'finish') {
      return action.args.answer;
    }
    
    const tool = this.tools[action.type];
    if (!tool) {
      return `Error: Tool ${action.type} not found`;
    }
    
    try {
      return await tool.execute(action.args);
    } catch (error) {
      return `Error: ${error.message}`;
    }
  }
}

// Define tools
class Tool {
  constructor(name, description, fn) {
    this.name = name;
    this.description = description;
    this.fn = fn;
  }
  
  async execute(args) {
    return await this.fn(args);
  }
}

// Example tools
const tools = {
  search: new Tool(
    'search',
    'Search the web for information',
    async ({ query }) => {
      // Simulate web search
      return `Search results for "${query}": [Relevant information found...]`;
    }
  ),
  
  calculate: new Tool(
    'calculate',
    'Calculate mathematical expression',
    async ({ expression }) => {
      try {
        return `Result: ${eval(expression)}`;
      } catch {
        return 'Error in calculation';
      }
    }
  ),
  
  weather: new Tool(
    'weather',
    'Get current weather for a city',
    async ({ city }) => {
      // Simulate weather API
      return `Weather in ${city}: 18°C, Cloudy`;
    }
  )
};

// Mock LLM
class MockLLM {
  async generate(prompt) {
    // In real implementation, call GPT-4/Claude
    // Here we simulate intelligent responses
    
    if (prompt.includes('weather')) {
      return `
Thought: I need to get weather data for the specified city.
Action: weather
Args: {"city": "Paris"}
`;
    }
    
    return `
Thought: I have the information needed to answer.
Action: finish
Args: {"answer": "Based on the information gathered, here is my answer."}
`;
  }
}

// Usage
async function main() {
  const llm = new MockLLM();
  const agent = new AIAgent(llm, tools);
  
  const answer = await agent.run("What's the weather in Paris?");
  console.log(`\n🎉 Task complete: ${answer}`);
}

main();
```

### **Python Real Implementation:**

```python
# ============================================
# 1. Basic ReAct Agent with LangChain
# ============================================

from langchain.agents import Tool, AgentExecutor, create_react_agent
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate

# Define tools
def search_tool(query: str) -> str:
    """Search the web"""
    # In production, use actual search API
    return f"Search results for '{query}': [Relevant information...]"

def calculator_tool(expression: str) -> str:
    """Calculate mathematical expression"""
    try:
        return str(eval(expression))
    except:
        return "Error in calculation"

tools = [
    Tool(
        name="Search",
        func=search_tool,
        description="Useful for finding information on the internet"
    ),
    Tool(
        name="Calculator",
        func=calculator_tool,
        description="Useful for mathematical calculations"
    )
]

# Create agent
llm = ChatOpenAI(temperature=0)

prompt = PromptTemplate.from_template("""
Answer the following question as best you can. You have access to these tools:

{tools}

Use this format:

Question: the input question
Thought: think about what to do
Action: the action to take (one of [{tool_names}])
Action Input: the input to the action
Observation: the result of the action
... (repeat Thought/Action/Observation as needed)
Thought: I now know the final answer
Final Answer: the final answer

Question: {input}
{agent_scratchpad}
""")

agent = create_react_agent(llm, tools, prompt)
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

# Run
result = agent_executor.invoke({
    "input": "What is 25 * 17 + 100?"
})
print(result["output"])


# ============================================
# 2. Custom Agent from Scratch
# ============================================

from typing import List, Dict, Callable
import re

class SimpleAgent:
    def __init__(self, llm, tools: Dict[str, Callable], max_iterations: int = 10):
        self.llm = llm
        self.tools = tools
        self.max_iterations = max_iterations
    
    def run(self, goal: str) -> str:
        state = {
            "goal": goal,
            "history": [],
            "iteration": 0
        }
        
        print(f"🎯 Goal: {goal}\n")
        
        while state["iteration"] < self.max_iterations:
            print(f"\n--- Iteration {state['iteration'] + 1} ---")
            
            # Agent thinks
            action = self._think(state)
            
            print(f"💭 Thought: {action['thought']}")
            print(f"🎬 Action: {action['tool']}({action['args']})")
            
            # Check if done
            if action["tool"] == "Finish":
                print(f"\n✅ Final Answer: {action['args']}")
                return action["args"]
            
            # Execute action
            observation = self._execute_action(action)
            print(f"👁️ Observation: {observation}")
            
            # Update state
            state["history"].append({
                "action": action,
                "observation": observation
            })
            state["iteration"] += 1
        
        return "Max iterations reached"
    
    def _think(self, state: Dict) -> Dict:
        prompt = self._build_prompt(state)
        response = self.llm.invoke(prompt).content
        return self._parse_response(response)
    
    def _build_prompt(self, state: Dict) -> str:
        tool_desc = "\n".join([f"- {name}: {tool.__doc__}" for name, tool in self.tools.items()])
        history = "\n".join([
            f"Action: {h['action']['tool']}({h['action']['args']})\nObservation: {h['observation']}"
            for h in state["history"]
        ])
        
        return f"""
You are an AI agent. Goal: {state['goal']}

Available tools:
{tool_desc}
- Finish: Give final answer

History:
{history if history else 'None'}

Think step by step:
Thought: [reasoning]
Action: [tool_name]
Action Input: [input]
"""
    
    def _parse_response(self, response: str) -> Dict:
        thought = re.search(r"Thought: (.+)", response)
        action = re.search(r"Action: (\w+)", response)
        args = re.search(r"Action Input: (.+)", response)
        
        return {
            "thought": thought.group(1) if thought else "",
            "tool": action.group(1) if action else "Finish",
            "args": args.group(1) if args else ""
        }
    
    def _execute_action(self, action: Dict) -> str:
        if action["tool"] == "Finish":
            return action["args"]
        
        tool = self.tools.get(action["tool"])
        if not tool:
            return f"Error: Tool {action['tool']} not found"
        
        try:
            return tool(action["args"])
        except Exception as e:
            return f"Error: {str(e)}"

# Usage
def search(query: str) -> str:
    """Search the web"""
    return f"Results for '{query}': [Information found]"

def calculator(expr: str) -> str:
    """Calculate math expression"""
    return str(eval(expr))

tools = {
    "Search": search,
    "Calculator": calculator
}

llm = ChatOpenAI(temperature=0)
agent = SimpleAgent(llm, tools)
result = agent.run("What is the population of Paris?")


# ============================================
# 3. Plan-and-Execute Agent
# ============================================

class PlanExecuteAgent:
    def __init__(self, llm):
        self.llm = llm
    
    def run(self, goal: str) -> str:
        # Step 1: Create plan
        plan = self._create_plan(goal)
        print(f"📋 Plan:\n{chr(10).join(f'{i+1}. {step}' for i, step in enumerate(plan))}\n")
        
        # Step 2: Execute each step
        results = []
        for i, step in enumerate(plan):
            print(f"\n▶️ Executing: {step}")
            result = self._execute_step(step, results)
            print(f"✓ Result: {result}")
            results.append(result)
        
        # Step 3: Synthesize final answer
        answer = self._synthesize_answer(goal, results)
        return answer
    
    def _create_plan(self, goal: str) -> List[str]:
        prompt = f"""
Create a step-by-step plan to achieve this goal: {goal}

List the steps:
1.
2.
3.
...
"""
        response = self.llm.invoke(prompt).content
        steps = re.findall(r'\d+\. (.+)', response)
        return steps
    
    def _execute_step(self, step: str, previous_results: List[str]) -> str:
        context = "\n".join(previous_results) if previous_results else "None"
        prompt = f"""
Previous results:
{context}

Execute this step: {step}

Result:
"""
        return self.llm.invoke(prompt).content
    
    def _synthesize_answer(self, goal: str, results: List[str]) -> str:
        all_results = "\n".join(f"{i+1}. {r}" for i, r in enumerate(results))
        prompt = f"""
Goal: {goal}

Results from execution:
{all_results}

Provide final answer:
"""
        return self.llm.invoke(prompt).content

# Usage
agent = PlanExecuteAgent(ChatOpenAI())
answer = agent.run("Research quantum computing and write summary")


# ============================================
# 4. Reflexion Agent (Self-Improving)
# ============================================

class ReflexionAgent:
    def __init__(self, llm, max_attempts: int = 3):
        self.llm = llm
        self.max_attempts = max_attempts
    
    def run(self, task: str) -> str:
        attempt = 0
        feedback_history = []
        
        while attempt < self.max_attempts:
            print(f"\n🔄 Attempt {attempt + 1}/{self.max_attempts}")
            
            # Generate solution
            solution = self._generate_solution(task, feedback_history)
            print(f"💡 Solution: {solution[:100]}...")
            
            # Self-evaluate
            evaluation = self._evaluate(task, solution)
            print(f"📊 Evaluation: {evaluation}")
            
            # Check if good enough
            if self._is_acceptable(evaluation):
                print("✅ Solution accepted!")
                return solution
            
            # Reflect on failure
            reflection = self._reflect(task, solution, evaluation)
            print(f"🤔 Reflection: {reflection}")
            feedback_history.append(reflection)
            
            attempt += 1
        
        return solution  # Return best attempt
    
    def _generate_solution(self, task: str, feedback: List[str]) -> str:
        feedback_text = "\n".join(feedback) if feedback else "None"
        prompt = f"""
Task: {task}

Previous feedback:
{feedback_text}

Generate improved solution:
"""
        return self.llm.invoke(prompt).content
    
    def _evaluate(self, task: str, solution: str) -> str:
        prompt = f"""
Task: {task}
Solution: {solution}

Evaluate this solution (rate 1-10 and explain):
"""
        return self.llm.invoke(prompt).content
    
    def _reflect(self, task: str, solution: str, evaluation: str) -> str:
        prompt = f"""
Task: {task}
Solution: {solution}
Evaluation: {evaluation}

Reflect on what went wrong and how to improve:
"""
        return self.llm.invoke(prompt).content
    
    def _is_acceptable(self, evaluation: str) -> bool:
        # Simple check: look for high rating
        return any(str(i) in evaluation for i in range(8, 11))

# Usage
agent = ReflexionAgent(ChatOpenAI())
result = agent.run("Write a Python function to calculate fibonacci numbers")


# ============================================
# 5. Multi-Agent System
# ============================================

class MultiAgentSystem:
    def __init__(self, llm):
        self.llm = llm
        self.agents = {
            "researcher": self._create_researcher(),
            "coder": self._create_coder(),
            "writer": self._create_writer()
        }
    
    def _create_researcher(self):
        def research(topic: str) -> str:
            # Researcher agent with search tools
            return f"Research findings on {topic}: [Detailed information...]"
        return research
    
    def _create_coder(self):
        def code(task: str) -> str:
            # Coder agent with code execution
            return f"Code for {task}: [Implementation...]"
        return code
    
    def _create_writer(self):
        def write(content: str) -> str:
            # Writer agent for documentation
            return f"Written documentation: [Polished content...]"
        return content
    
    def run(self, task: str) -> str:
        # Supervisor routes to appropriate agent
        agent_name = self._route_task(task)
        print(f"🔀 Routing to: {agent_name}")
        
        # Execute with chosen agent
        agent = self.agents[agent_name]
        result = agent(task)
        
        return result
    
    def _route_task(self, task: str) -> str:
        prompt = f"""
Task: {task}

Which agent should handle this?
- researcher: For finding information
- coder: For programming tasks
- writer: For documentation

Answer with agent name only:
"""
        response = self.llm.invoke(prompt).content.strip().lower()
        return response if response in self.agents else "researcher"

# Usage
system = MultiAgentSystem(ChatOpenAI())
result = system.run("Find information about quantum computing")


# ============================================
# 6. Production-Ready Agent
# ============================================

from langchain.agents import initialize_agent, AgentType
from langchain.tools import Tool
from langchain.memory import ConversationBufferMemory

# Define comprehensive toolset
tools = [
    Tool(
        name="WebSearch",
        func=lambda q: f"Search: {q}",
        description="Search internet for information"
    ),
    Tool(
        name="Calculator",
        func=lambda e: str(eval(e)),
        description="Calculate mathematical expressions"
    ),
    Tool(
        name="CodeExecutor",
        func=lambda c: f"Executed: {c}",
        description="Execute Python code"
    )
]

# Memory for context
memory = ConversationBufferMemory(
    memory_key="chat_history",
    return_messages=True
)

# Initialize agent
llm = ChatOpenAI(temperature=0)
agent = initialize_agent(
    tools=tools,
    llm=llm,
    agent=AgentType.CHAT_CONVERSATIONAL_REACT_DESCRIPTION,
    memory=memory,
    verbose=True,
    max_iterations=10,
    early_stopping_method="generate"
)

# Run
result = agent.run("What's 15% of 240? Then search for 'AI agents'")
print(result)
```

---

## **Real-World Applications:**

### **1. Customer Support Agent:**

```python
class CustomerSupportAgent:
    def __init__(self):
        self.tools = {
            "search_kb": self.search_knowledge_base,
            "check_order": self.check_order_status,
            "create_ticket": self.create_support_ticket
        }
    
    def search_knowledge_base(self, query):
        # Search internal docs
        return "KB article: [Solution...]"
    
    def check_order_status(self, order_id):
        # Query database
        return f"Order {order_id}: Shipped"
    
    def create_support_ticket(self, issue):
        # Create ticket in system
        return f"Ticket #{id} created"
    
    # Agent autonomously uses these tools to help customers!
```

### **2. Data Analysis Agent:**

```python
class DataAnalysisAgent:
    def __init__(self):
        self.tools = {
            "sql_query": self.execute_sql,
            "plot": self.create_visualization,
            "statistics": self.calculate_stats
        }
    
    # Agent can:
    # - Query database
    # - Analyze results
    # - Create charts
    # - Provide insights
    # All autonomously!
```

---

## **Common Misconceptions:**

### ❌ **Misconception 1: "Agents are always better than chains"**

**Reality:**
```python
when_to_use = {
    'agents': [
        'Unknown tool sequence needed',
        'Need dynamic decision-making',
        'Multiple possible paths',
        'Need to handle failures and retry'
    ],
    
    'chains': [
        'Fixed, known workflow',
        'Simpler and faster',
        'Deterministic behavior needed',
        'Lower cost (fewer LLM calls)'
    ]
}
```

### ❌ **Misconception 2: "Agents always work perfectly"**

**Reality:**
```python
agent_limitations = {
    'can_fail': 'May choose wrong tools',
    'can_loop': 'May get stuck in loops',
    'expensive': 'Multiple LLM calls = high cost',
    'unpredictable': 'Non-deterministic behavior',
    
    'mitigations': [
        'Set max iterations',
        'Add validation steps',
        'Monitor and log',
        'Human oversight for critical tasks'
    ]
}
```

---

## **Key Takeaways:**

```javascript
const ai_agents_mastery = {
  core_concept: 'LLM + Tools + Reasoning = Autonomous Agent',
  
  key_patterns: {
    react: 'Think → Act → Observe → Repeat',
    plan_execute: 'Plan → Execute steps → Done',
    reflexion: 'Attempt → Evaluate → Reflect → Retry',
    multi_agent: 'Specialize and collaborate'
  },
  
  when_to_use: [
    'Need real-time data access',
    'Require external tools',
    'Complex multi-step problems',
    'Unknown solution path',
    'Need autonomous operation'
  ],
  
  future: 'Agents will become primary way to interact with AI'
};
```

---

## ✅ **Review Questions:**

1. **Conceptual:**
   - What makes an AI agent different from a regular LLM?
   - What is the ReAct pattern?
   - Why are tools important for agents?

2. **Technical:**
   - How does an agent decide which tool to use?
   - What's the difference between plan-execute and ReAct?
   - How to prevent infinite loops?

3. **Practical:**
   - When to use agent vs chain?
   - How to design good tools?
   - How to handle agent failures?

---

## 🧩 **Practice Problems:**

### **Problem 1: Research Agent**

```python
# Build agent that:
# - Searches web for topic
# - Extracts key points
# - Searches for related topics
# - Synthesizes findings into report
```

### **Problem 2: Debugging Agent**

```python
# Build agent that:
# - Reads code
# - Identifies bugs
# - Searches for solutions
# - Suggests fixes
# - Tests fixes
```

---

## 🚀 **Mini Project:**

**Build Personal AI Assistant:**

```python
class PersonalAssistant:
    """
    Multi-function agent with tools:
    - Calendar (check/add events)
    - Email (search/send)
    - Web search
    - Calculator
    - File operations
    
    User: "Schedule meeting with John tomorrow at 2pm"
    Agent: Checks calendar → Finds slot → Adds event → Confirms
    
    User: "What's 15% tip on $87.50?"
    Agent: Uses calculator → Returns "$13.13"
    
    User: "Find and email John the Q4 report"
    Agent: Searches files → Finds report → Gets email → Sends → Confirms
    
    Implement full autonomous assistant!
    """
```

---

**🎉 AI Agents Complete!**

You now understand:
- Agent architecture
- ReAct pattern
- Tool use
- Multi-agent systems
- Production deployment

**Next:** **Q&A App Mini Project** - Build complete application! 🚀
