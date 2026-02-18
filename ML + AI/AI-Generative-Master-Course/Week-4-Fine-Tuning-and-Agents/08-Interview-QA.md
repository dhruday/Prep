# 🎯 Week 4 Interview Questions & Answers

## 📚 Table of Contents

1. [Overview](#-overview)
2. [Section 1: Fine-Tuning Fundamentals (10 Questions)](#-section-1-fine-tuning-fundamentals-10-questions)
3. [Section 2: LoRA & QLoRA (10 Questions)](#-section-2-lora--qlora-10-questions)
4. [Section 3: HuggingFace Ecosystem (8 Questions)](#-section-3-huggingface-ecosystem-8-questions)
5. [Section 4: LangChain & LangGraph (10 Questions)](#-section-4-langchain--langgraph-10-questions)
6. [Section 5: AI Agents (10 Questions)](#-section-5-ai-agents-10-questions)
7. [Quick Reference Card](#-quick-reference-card)
8. [Week 4 Complete!](#-week-4-complete)

---

## 🎯 Overview

This comprehensive guide covers **48 interview questions** from beginner to FAANG level for all Week 4 topics:

- Fine-Tuning Fundamentals
- LoRA & QLoRA (Parameter-Efficient Fine-Tuning)
- HuggingFace Ecosystem
- LangChain & LangGraph
- AI Agents

Difficulty levels: 🟢 Beginner | 🟡 Intermediate | 🔴 Advanced | ⚫ FAANG

---

## 📘 Section 1: Fine-Tuning Fundamentals (10 Questions)

### 🟢 Q1: What is the difference between pre-training and fine-tuning?

**A**: 
- **Pre-training**: Training a model from scratch on massive datasets to learn general patterns (e.g., GPT learning language from internet text)
- **Fine-tuning**: Taking a pre-trained model and training it further on a smaller, task-specific dataset

```
Pre-training:  Random weights → Train on billions of tokens → General model
Fine-tuning:   Pre-trained model → Train on your data → Specialized model
```

**Key insight**: Pre-training is expensive ($1M+), fine-tuning is cheap ($100-1000).

---

### 🟢 Q2: Why do we fine-tune instead of training from scratch?

**A**: Several critical reasons:

1. **Cost**: Pre-training GPT-3 costs ~$4.6M. Fine-tuning costs ~$100
2. **Data**: You may only have 1000 examples; pre-training needs billions
3. **Knowledge Transfer**: Pre-trained models already understand language
4. **Time**: Fine-tuning takes hours, pre-training takes months

```python
# Fine-tuning is like teaching a doctor to specialize
# They already know medicine (pre-training)
# You just teach them your specific field (fine-tuning)
```

---

### 🟡 Q3: What is catastrophic forgetting and how do you prevent it?

**A**: Catastrophic forgetting occurs when a model forgets its pre-trained knowledge while learning new tasks.

**Prevention strategies**:
1. **Low learning rate**: Use 1e-5 to 5e-5 instead of 1e-3
2. **Freeze early layers**: Only train top layers
3. **Regularization**: L2 penalty toward original weights
4. **Replay**: Mix pre-training data with fine-tuning data

```python
# Example: Learning rate scheduling
optimizer = AdamW(model.parameters(), lr=2e-5, weight_decay=0.01)
scheduler = get_linear_schedule_with_warmup(
    optimizer, 
    num_warmup_steps=100,
    num_training_steps=1000
)
```

---

### 🟡 Q4: What is full fine-tuning vs parameter-efficient fine-tuning?

**A**:

| Method | Parameters Updated | Memory | Use Case |
|--------|-------------------|--------|----------|
| **Full Fine-Tuning** | 100% | Very High | When you have resources |
| **PEFT (LoRA, etc.)** | 0.1-1% | Low | Consumer GPUs |

```
Full Fine-Tuning:
- Llama-7B = 7 billion parameters updated
- Needs 28GB+ GPU RAM

PEFT (LoRA):
- Llama-7B = Only 4-8 million parameters updated
- Works on 8-16GB GPU
```

---

### 🟡 Q5: What is the difference between instruction tuning and supervised fine-tuning?

**A**:

**Supervised Fine-Tuning (SFT)**:
- Train on input-output pairs
- Task-specific (e.g., sentiment classification)
- Output format is fixed

**Instruction Tuning**:
- Train on instruction-response pairs
- General-purpose ("Follow any instruction")
- Enables zero-shot task performance

```
SFT Example:
Input: "The movie was great"
Output: "Positive"

Instruction Tuning Example:
Input: "Classify the sentiment: The movie was great"
Output: "The sentiment is positive because..."
```

---

### 🔴 Q6: Explain RLHF (Reinforcement Learning from Human Feedback).

**A**: RLHF is a three-stage process to align models with human preferences:

```
Stage 1: Supervised Fine-Tuning
├── Train on human-written responses
└── Creates initial instruction-following model

Stage 2: Reward Model Training
├── Humans rank model outputs (A > B > C)
├── Train a model to predict human preferences
└── Output: Scalar reward for any response

Stage 3: PPO Fine-Tuning
├── Generate responses with SFT model
├── Score with reward model
├── Update policy to maximize reward
└── KL penalty to prevent drift from SFT model
```

**Formula**: 
```
objective = E[reward(response)] - β * KL(π_new || π_sft)
```

---

### 🔴 Q7: What is DPO (Direct Preference Optimization)?

**A**: DPO is a simpler alternative to RLHF that eliminates the reward model.

**Key insight**: You can derive the optimal policy directly from preference data!

```python
# DPO Loss
loss = -log(sigmoid(β * (log π(y_w|x) - log π(y_l|x) - 
                         log π_ref(y_w|x) + log π_ref(y_l|x))))

# Where:
# y_w = preferred response (winner)
# y_l = dispreferred response (loser)
# π_ref = reference (SFT) model
# β = temperature
```

**Advantages over RLHF**:
- No reward model needed
- Simpler training (just classification loss)
- More stable training

---

### ⚫ Q8: How would you fine-tune a model for multiple tasks without interference?

**A**: Several approaches:

1. **Multi-Task Learning**:
   - Mix all task data
   - Task-specific heads or prefixes
   
2. **Sequential with Replay**:
   - Train task 1, then task 2 with task 1 replay
   
3. **Adapter Fusion**:
   - Train separate adapters per task
   - Fuse at inference

4. **Mixture of LoRAs**:
```python
# Load multiple LoRA adapters
model.load_adapter("lora_task1", "task1")
model.load_adapter("lora_task2", "task2")

# Use routing based on input
if task == "summarization":
    model.set_active_adapters("task1")
else:
    model.set_active_adapters("task2")
```

---

### ⚫ Q9: Explain the trade-off between model size and fine-tuning dataset size.

**A**: The relationship follows scaling laws:

```
Larger models need LESS fine-tuning data for good performance.

Model Size    | Min Fine-tune Data | Notes
------------- | ------------------ | -----
125M (GPT-2)  | 50K+ examples      | Needs lots of data
1.3B          | 10K-20K examples   | Moderate
7B (Llama)    | 1K-5K examples     | Few-shot capable
70B           | 100-500 examples   | Very few-shot
```

**Research insight**: "Chinchilla scaling laws" suggest compute-optimal training. For fine-tuning, the "quality vs quantity" trade-off favors high-quality, smaller datasets for large models.

---

### ⚫ Q10: How do you evaluate if fine-tuning was successful without overfitting?

**A**: Multi-pronged evaluation:

1. **Held-out Test Set**: Primary metric on unseen data
2. **Perplexity Comparison**: Should decrease but not too much
3. **Benchmark Retention**: Check general capabilities (MMLU, etc.)
4. **Human Evaluation**: For open-ended tasks
5. **A/B Testing**: Production performance

```python
# Warning signs of overfitting:
train_loss: 0.1  # Very low
val_loss: 2.5    # Much higher
test_acc: 60%    # Below expectations

# Signs of catastrophic forgetting:
MMLU_before: 65%
MMLU_after: 45%  # Dropped significantly!
```

---

## 📗 Section 2: LoRA & QLoRA (10 Questions)

### 🟢 Q11: What is LoRA and why is it important?

**A**: LoRA (Low-Rank Adaptation) is a parameter-efficient fine-tuning method that:

1. **Freezes** the pre-trained weights
2. **Adds** small trainable matrices (A, B) to each layer
3. **Reduces** trainable parameters by 100-1000x

```
Original: W (d × d matrix, frozen)
LoRA adds: W + BA where B (d × r), A (r × d), r << d

Example: d=4096, r=8
Original params: 4096 × 4096 = 16.7M
LoRA params: 4096×8 + 8×4096 = 65K (0.4% of original!)
```

---

### 🟢 Q12: What is the rank (r) in LoRA and how do you choose it?

**A**: Rank determines the capacity of LoRA adapters.

| Rank | Parameters | Expressiveness | Use Case |
|------|-----------|----------------|----------|
| 4-8 | Very low | Limited | Simple tasks |
| 16-32 | Low | Moderate | Most tasks |
| 64-128 | Moderate | High | Complex tasks |
| 256+ | Higher | Very high | Near full fine-tuning |

```python
# Typical configuration
peft_config = LoraConfig(
    r=16,                # Rank
    lora_alpha=32,       # Scaling factor (usually 2*r)
    target_modules=["q_proj", "v_proj"],  # Which layers
    lora_dropout=0.05,
)
```

**Rule of thumb**: Start with r=8 or r=16, increase if underfitting.

---

### 🟡 Q13: What is QLoRA and how does it differ from LoRA?

**A**: QLoRA = Quantized LoRA. Combines:

1. **4-bit Quantization**: Base model in 4-bit (NF4 format)
2. **Double Quantization**: Quantize the quantization constants
3. **Paged Optimizers**: Handle memory spikes

```
Memory Comparison (7B model):
Full FP16: 14GB
LoRA FP16: 14GB (base frozen) + ~100MB (LoRA)
QLoRA 4-bit: 3.5GB (base) + ~100MB (LoRA) = 3.6GB
```

```python
# QLoRA configuration
from transformers import BitsAndBytesConfig

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True,
)
```

---

### 🟡 Q14: Which layers should you apply LoRA to?

**A**: Depends on the task and model:

**Common choices**:
```python
# Attention layers (most common)
target_modules = ["q_proj", "k_proj", "v_proj", "o_proj"]

# All linear layers (more capacity)
target_modules = ["q_proj", "k_proj", "v_proj", "o_proj", 
                  "gate_proj", "up_proj", "down_proj"]

# Just query and value (minimal, still effective)
target_modules = ["q_proj", "v_proj"]
```

**Research findings**:
- Attention layers are most important
- Adding MLP layers helps for complex tasks
- Query and Value contribute most

---

### 🟡 Q15: What is lora_alpha and how does it affect training?

**A**: `lora_alpha` is a scaling factor that controls the magnitude of LoRA updates.

```python
# The actual update is scaled:
Δh = (lora_alpha / r) * BA * x

# Example:
r = 16, lora_alpha = 32
scaling = 32/16 = 2.0

# Higher alpha = larger initial updates
# Lower alpha = more stable but slower convergence
```

**Best practices**:
- Set `lora_alpha = 2 * r` as a starting point
- Increase for faster convergence
- Decrease if training is unstable

---

### 🔴 Q16: Explain how LoRA relates to the intrinsic dimensionality of tasks.

**A**: The key insight: Fine-tuning happens in a low-dimensional subspace.

**Research finding**: Pre-trained models have learned features so general that adapting them requires changing only a small subspace of the weight space.

```
Full Weight Space:     [d × d] = 16 million dimensions
Intrinsic Subspace:    [r × r] = 256 dimensions (r=16)

Despite 99.99% fewer parameters, LoRA achieves 90-100%
of full fine-tuning performance!
```

This is why low-rank updates work: The "intrinsic rank" of the weight updates is naturally low.

---

### 🔴 Q17: How do you merge LoRA weights back into the base model?

**A**: LoRA weights can be merged for faster inference:

```python
# During training:
output = base_model(x) + (lora_alpha/r) * B @ A @ x

# Merge for inference:
W_merged = W_base + (lora_alpha/r) * B @ A

# Code:
model = model.merge_and_unload()  # Merges LoRA into base weights

# Or keep separate for flexibility:
model.save_pretrained("adapter_only")  # Just saves the small adapter
```

**Trade-off**:
- **Merged**: Faster inference, larger model file
- **Separate**: Flexibility to swap adapters, slightly slower

---

### 🔴 Q18: Compare LoRA to other PEFT methods (Adapters, Prefix Tuning, IA3).

**A**:

| Method | Params | Where | How |
|--------|--------|-------|-----|
| **LoRA** | 0.1-1% | All linear layers | Low-rank decomposition |
| **Adapters** | 1-3% | After each layer | Small feedforward |
| **Prefix Tuning** | 0.1% | Input embeddings | Learnable prefix tokens |
| **IA3** | 0.01% | Attention scales | Element-wise rescaling |

```python
# IA3: Even more efficient than LoRA
# Learns scaling vectors instead of matrices
l_q = nn.Parameter(torch.ones(d_model))  # Query scaling
output_q = l_q * W_q(x)  # Just element-wise multiplication
```

---

### ⚫ Q19: How would you fine-tune multiple LoRAs and combine them?

**A**: Several approaches for multi-adapter systems:

**1. LoRA Merging (simple)**:
```python
# Merge multiple adapters by averaging
merged_A = (alpha1 * A1 + alpha2 * A2) / (alpha1 + alpha2)
merged_B = (alpha1 * B1 + alpha2 * B2) / (alpha1 + alpha2)
```

**2. LoRA Switching (dynamic)**:
```python
model.load_adapter("coding_lora", "coding")
model.load_adapter("writing_lora", "writing")

# Switch based on task
model.set_active_adapters("coding" if is_code else "writing")
```

**3. LoRA Composition (advanced)**:
```python
# Stack adapters
model.add_weighted_adapter(
    adapters=["coding", "writing"],
    weights=[0.7, 0.3],
    adapter_name="combined"
)
```

---

### ⚫ Q20: What are the limitations of LoRA?

**A**:

1. **Capacity ceiling**: Very complex tasks may need higher rank
2. **Not all tasks**: Some tasks require full weight updates
3. **Hyperparameter sensitivity**: Rank, alpha, target modules matter
4. **Inference overhead**: Without merging, adds latency

```
When LoRA may underperform:
- Domain shift (medical → legal)
- New language acquisition  
- Significantly different output format
- Tasks requiring new world knowledge

Solution: Use higher rank or full fine-tuning
```

---

## 📙 Section 3: HuggingFace Ecosystem (8 Questions)

### 🟢 Q21: What are the main components of the HuggingFace ecosystem?

**A**:

```
HuggingFace Ecosystem:

🤗 Hub                  # Model & dataset hosting (like GitHub for ML)
├── 400K+ models
├── 100K+ datasets
└── Spaces (demos)

📦 transformers         # Model library
├── AutoModel, AutoTokenizer
├── Trainer, TrainingArguments
└── Pipeline (easy inference)

📊 datasets             # Dataset library
├── load_dataset()
├── Streaming support
└── Preprocessing tools

🔧 peft                 # Parameter-efficient fine-tuning
├── LoRA, QLoRA
├── Prefix Tuning
└── Adapters

⚡ accelerate           # Multi-GPU, mixed precision
🎯 evaluate             # Metrics library
🔥 trl                  # RLHF training
```

---

### 🟡 Q22: How do you load and use a pre-trained model from HuggingFace?

**A**:

```python
from transformers import AutoModelForCausalLM, AutoTokenizer

# Load model and tokenizer
model_name = "meta-llama/Llama-2-7b-hf"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.float16,
    device_map="auto"  # Automatic GPU placement
)

# Generate text
inputs = tokenizer("Hello, how are", return_tensors="pt").to("cuda")
outputs = model.generate(**inputs, max_new_tokens=50)
print(tokenizer.decode(outputs[0]))
```

---

### 🟡 Q23: What is the Trainer API and when should you use it?

**A**: `Trainer` handles the training loop, logging, checkpointing, and evaluation.

```python
from transformers import Trainer, TrainingArguments

training_args = TrainingArguments(
    output_dir="./results",
    num_train_epochs=3,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,
    learning_rate=2e-5,
    warmup_steps=100,
    logging_steps=10,
    save_strategy="epoch",
    evaluation_strategy="epoch",
    fp16=True,
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,
    tokenizer=tokenizer,
)

trainer.train()
```

**Use Trainer when**: Standard training, want logging/checkpointing automatically

**Use custom loop when**: Complex training logic, RL, custom losses

---

### 🟡 Q24: How do you prepare a dataset for fine-tuning?

**A**:

```python
from datasets import load_dataset

# Load dataset
dataset = load_dataset("your_dataset")

# Preprocessing function
def preprocess(examples):
    # Tokenize
    result = tokenizer(
        examples["text"],
        truncation=True,
        max_length=512,
        padding="max_length"
    )
    # For causal LM, labels = input_ids
    result["labels"] = result["input_ids"].copy()
    return result

# Apply to dataset
tokenized_dataset = dataset.map(
    preprocess,
    batched=True,
    remove_columns=dataset["train"].column_names
)
```

---

### 🔴 Q25: How do you push a fine-tuned model to the HuggingFace Hub?

**A**:

```python
# Login first
from huggingface_hub import login
login(token="hf_xxx")  # Or use CLI: huggingface-cli login

# Push model
model.push_to_hub("username/my-fine-tuned-model")
tokenizer.push_to_hub("username/my-fine-tuned-model")

# Or save locally first
model.save_pretrained("./my_model")
tokenizer.save_pretrained("./my_model")

# Then push
from huggingface_hub import HfApi
api = HfApi()
api.upload_folder(
    folder_path="./my_model",
    repo_id="username/my-fine-tuned-model",
    repo_type="model"
)
```

---

### 🔴 Q26: How does `device_map="auto"` work for large models?

**A**: It automatically distributes model layers across available devices:

```python
model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Llama-2-70b-hf",
    device_map="auto",  # Key parameter
    torch_dtype=torch.float16
)

# What happens:
# 1. Calculates memory per GPU
# 2. Estimates memory per layer
# 3. Places layers to balance memory
# 4. Can use CPU/disk offloading if needed

# Manual control:
device_map = {
    "model.embed_tokens": 0,
    "model.layers.0": 0,
    "model.layers.1": 1,
    # ...
}
```

---

### 🔴 Q27: Explain SFTTrainer from the TRL library.

**A**: `SFTTrainer` is specialized for Supervised Fine-Tuning:

```python
from trl import SFTTrainer

trainer = SFTTrainer(
    model=model,
    train_dataset=dataset,
    dataset_text_field="text",      # Column with text
    max_seq_length=512,
    peft_config=lora_config,        # LoRA integration
    formatting_func=format_prompts, # Custom formatting
    args=training_args,
)

trainer.train()
```

**Advantages over Trainer**:
- Built-in PEFT support
- Handles prompt formatting
- Packing for efficient batching
- Integrated with RLHF pipeline

---

### ⚫ Q28: How do you handle long sequences with HuggingFace models?

**A**: Several strategies:

```python
# 1. Truncation (simple but loses info)
tokenizer(text, truncation=True, max_length=2048)

# 2. Chunking with overlap
def chunk_text(text, chunk_size=1024, overlap=128):
    tokens = tokenizer(text)["input_ids"]
    chunks = []
    for i in range(0, len(tokens), chunk_size - overlap):
        chunks.append(tokens[i:i + chunk_size])
    return chunks

# 3. Use long-context models
model = AutoModel.from_pretrained("THUDM/longchat-7b-32k")

# 4. Sliding window attention (built into some models)
# Longformer, BigBird use sparse attention

# 5. RoPE scaling for extended context
from transformers import LlamaConfig
config = LlamaConfig.from_pretrained("meta-llama/Llama-2-7b-hf")
config.rope_scaling = {"type": "dynamic", "factor": 2.0}
```

---

## 📕 Section 4: LangChain & LangGraph (10 Questions)

### 🟢 Q29: What is LangChain and what problems does it solve?

**A**: LangChain is a framework for building LLM applications.

**Core abstractions**:
```python
# 1. Prompts - Template management
from langchain.prompts import ChatPromptTemplate
prompt = ChatPromptTemplate.from_template("Translate to French: {text}")

# 2. Chains - Sequential operations
chain = prompt | llm | output_parser

# 3. Memory - Conversation state
memory = ConversationBufferMemory()

# 4. Tools - External capabilities
tools = [SearchTool(), CalculatorTool()]

# 5. Agents - Autonomous decision-making
agent = create_react_agent(llm, tools)
```

**Problems solved**: Prompt management, chaining, memory, tool use, agents

---

### 🟢 Q30: Explain LCEL (LangChain Expression Language).

**A**: LCEL is a declarative way to compose chains using the `|` operator.

```python
from langchain_core.runnables import RunnablePassthrough
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# LCEL chain
chain = (
    {"context": retriever, "question": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)

# Invoke
result = chain.invoke("What is RAG?")

# Benefits:
# - Streaming built-in
# - Async built-in
# - Parallel execution
# - Easy debugging
```

---

### 🟡 Q31: What is LangGraph and how does it differ from LangChain?

**A**: LangGraph is for building **stateful, multi-agent** applications with cycles.

```
LangChain: Linear chains (A → B → C)
LangGraph: Graphs with cycles (A → B → C → A or D)
```

```python
from langgraph.graph import StateGraph, END

# Define state
class State(TypedDict):
    messages: list
    next_step: str

# Define graph
graph = StateGraph(State)
graph.add_node("agent", agent_node)
graph.add_node("tools", tool_node)

# Add edges with conditions
graph.add_conditional_edges(
    "agent",
    should_continue,
    {"continue": "tools", "end": END}
)
graph.add_edge("tools", "agent")

# Compile and run
app = graph.compile()
result = app.invoke({"messages": [user_input]})
```

---

### 🟡 Q32: Explain different types of memory in LangChain.

**A**:

| Memory Type | What it Stores | Use Case |
|-------------|---------------|----------|
| `ConversationBufferMemory` | Full history | Short conversations |
| `ConversationSummaryMemory` | Summary of history | Long conversations |
| `ConversationTokenBufferMemory` | Last N tokens | Token limits |
| `VectorStoreMemory` | Embedded memories | Semantic recall |

```python
# Buffer Memory
memory = ConversationBufferMemory()
memory.save_context({"input": "Hi"}, {"output": "Hello!"})

# Summary Memory (for long conversations)
memory = ConversationSummaryMemory(llm=llm)

# Vector Memory (for semantic search over history)
memory = VectorStoreRetrieverMemory(retriever=retriever)
```

---

### 🟡 Q33: How do you implement tool use with LangChain?

**A**:

```python
from langchain.tools import tool
from langchain.agents import AgentExecutor, create_react_agent

# Define custom tool
@tool
def search_database(query: str) -> str:
    """Search the customer database."""
    return f"Results for: {query}"

@tool  
def calculate(expression: str) -> str:
    """Calculate mathematical expressions."""
    return str(eval(expression))

# Create tools list
tools = [search_database, calculate]

# Create agent
agent = create_react_agent(llm, tools, prompt)
agent_executor = AgentExecutor(agent=agent, tools=tools)

# Run
result = agent_executor.invoke({
    "input": "Find customer John and calculate 20% of his $500 order"
})
```

---

### 🔴 Q34: What is the ReAct pattern for agents?

**A**: ReAct (Reasoning + Acting) is a prompting pattern for agents:

```
Thought: I need to find the customer first
Action: search_database
Action Input: "customer John"
Observation: John Smith, ID: 123, Orders: $500

Thought: Now I need to calculate 20% of $500
Action: calculate  
Action Input: "500 * 0.20"
Observation: 100

Thought: I have all the information
Final Answer: Customer John's 20% discount is $100
```

**Implementation**:
```python
from langchain import hub
from langchain.agents import create_react_agent

# Use pre-made ReAct prompt
prompt = hub.pull("hwchase17/react")

# Create agent
agent = create_react_agent(llm, tools, prompt)
```

---

### 🔴 Q35: How do you handle errors and retries in LangChain?

**A**:

```python
from langchain_core.runnables import RunnableWithFallbacks
from langchain.callbacks import get_openai_callback

# Fallback chains
chain_with_fallback = primary_llm.with_fallbacks([backup_llm])

# Retry logic
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
def call_with_retry(chain, input):
    return chain.invoke(input)

# Error handling in agents
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    handle_parsing_errors=True,  # Auto-handle parsing errors
    max_iterations=10,           # Prevent infinite loops
    early_stopping_method="generate"  # How to stop
)
```

---

### 🔴 Q36: Explain streaming in LangChain.

**A**: Streaming allows token-by-token output for better UX:

```python
# Basic streaming
for chunk in llm.stream("Tell me a story"):
    print(chunk.content, end="", flush=True)

# Streaming with chains (LCEL)
chain = prompt | llm | StrOutputParser()
for chunk in chain.stream({"topic": "AI"}):
    print(chunk, end="")

# Async streaming
async for chunk in chain.astream({"topic": "AI"}):
    await send_to_client(chunk)

# Stream events (detailed)
async for event in chain.astream_events(input, version="v1"):
    if event["event"] == "on_llm_stream":
        print(event["data"]["chunk"])
```

---

### ⚫ Q37: How would you build a multi-agent system with LangGraph?

**A**:

```python
from langgraph.graph import StateGraph, END

# Define agents as nodes
def researcher(state):
    """Research agent gathers information"""
    research = research_chain.invoke(state["query"])
    return {"research": research}

def writer(state):
    """Writer agent creates content"""
    draft = writing_chain.invoke(state["research"])
    return {"draft": draft}

def critic(state):
    """Critic agent reviews and decides"""
    review = critic_chain.invoke(state["draft"])
    return {"review": review, "approved": "good" in review.lower()}

def router(state):
    """Route based on approval"""
    return "end" if state["approved"] else "writer"

# Build graph
workflow = StateGraph(State)
workflow.add_node("researcher", researcher)
workflow.add_node("writer", writer)
workflow.add_node("critic", critic)

# Add edges
workflow.add_edge("researcher", "writer")
workflow.add_edge("writer", "critic")
workflow.add_conditional_edges("critic", router, {"end": END, "writer": "writer"})

# Compile
app = workflow.compile()
```

---

### ⚫ Q38: What are the limitations of LangChain?

**A**:

1. **Abstraction overhead**: Can be slow, hard to debug
2. **Version instability**: Frequent breaking changes
3. **Learning curve**: Many concepts to learn
4. **Lock-in**: Tight coupling to LangChain patterns
5. **Performance**: Not optimized for production at scale

**Alternatives**:
- **LlamaIndex**: Better for RAG-focused applications
- **Direct API calls**: For simple use cases
- **Custom code**: For production systems

**Best practice**: Use LangChain for prototyping, consider alternatives for production.

---

## 📗 Section 5: AI Agents (10 Questions)

### 🟢 Q39: What is an AI agent?

**A**: An AI agent is a system that can:

1. **Perceive** its environment (receive input)
2. **Reason** about what to do (use LLM)
3. **Act** using tools (search, calculate, etc.)
4. **Learn** from feedback (improve over time)

```
Simple Chatbot vs Agent:

Chatbot:
User → LLM → Response (direct, no tools)

Agent:
User → LLM → Think → Use Tool → Observe → Think → Use Tool → ... → Response
```

---

### 🟡 Q40: Explain the difference between function calling and agents.

**A**:

**Function Calling**:
- Model outputs structured JSON
- Single tool call per turn
- Deterministic routing

```python
# Function calling
response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Weather in NYC?"}],
    functions=[weather_function],
    function_call="auto"
)
# Returns: {"name": "get_weather", "arguments": {"city": "NYC"}}
```

**Agents**:
- Autonomous multi-step reasoning
- Multiple tool calls per task
- Dynamic decision making

```python
# Agent loop
while not done:
    thought = llm.think(observation)
    action = llm.decide_action(thought)
    observation = execute_tool(action)
    done = llm.check_if_done(observation)
```

---

### 🟡 Q41: What is tool use in LLMs and how does it work?

**A**: Tool use extends LLM capabilities with external functions:

```python
# Define tools with schemas
tools = [
    {
        "type": "function",
        "function": {
            "name": "search_web",
            "description": "Search the web for information",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"}
                },
                "required": ["query"]
            }
        }
    }
]

# LLM decides when to use tools
response = client.chat.completions.create(
    model="gpt-4-turbo",
    messages=messages,
    tools=tools,
    tool_choice="auto"
)

# Execute tool if called
if response.choices[0].message.tool_calls:
    tool_call = response.choices[0].message.tool_calls[0]
    result = execute_tool(tool_call.function.name, tool_call.function.arguments)
```

---

### 🔴 Q42: What is MCP (Model Context Protocol)?

**A**: MCP is Anthropic's protocol for connecting LLMs to external tools/data:

```
Traditional:
App ←→ LLM ←→ Tool 1
         ←→ Tool 2  (Each tool needs custom integration)

MCP:
App ←→ LLM ←→ MCP Protocol ←→ MCP Server 1 (Tool 1)
                            ←→ MCP Server 2 (Tool 2)
                            ←→ MCP Server N (Tool N)
```

**Benefits**:
- Standardized tool interface
- Reusable across different LLMs
- Local or remote tools
- Secure by design

---

### 🔴 Q43: Compare different agent architectures (ReAct, Plan-and-Execute, LATS).

**A**:

| Architecture | Process | Best For |
|--------------|---------|----------|
| **ReAct** | Think → Act → Observe → Repeat | Simple tasks |
| **Plan-and-Execute** | Plan all steps → Execute sequentially | Complex tasks |
| **LATS** | Tree search over action space | Difficult reasoning |

```python
# ReAct: Interleaved thinking and acting
Thought → Action → Observation → Thought → Action → Done

# Plan-and-Execute: Plan first, then execute
Plan: [Step1, Step2, Step3] → Execute(Step1) → Execute(Step2) → ...

# LATS: Tree search
        Root
       /    \
   Action1  Action2
    /   \      |
 Good  Bad   Medium
```

---

### 🔴 Q44: How do you handle agent failures and ensure reliability?

**A**:

```python
class RobustAgent:
    def __init__(self, max_retries=3, max_iterations=10):
        self.max_retries = max_retries
        self.max_iterations = max_iterations
    
    def run(self, task):
        iterations = 0
        while iterations < self.max_iterations:
            try:
                thought = self.think()
                action = self.decide_action(thought)
                
                # Validate action before execution
                if not self.validate_action(action):
                    continue
                
                result = self.execute_with_retry(action)
                
                if self.is_done(result):
                    return result
                    
            except ToolError as e:
                self.handle_error(e)
                
            iterations += 1
        
        return self.graceful_fallback()
    
    def execute_with_retry(self, action):
        for attempt in range(self.max_retries):
            try:
                return self.tools[action.name](action.args)
            except TransientError:
                time.sleep(2 ** attempt)  # Exponential backoff
        raise MaxRetriesExceeded()
```

---

### ⚫ Q45: What are the safety considerations for deploying AI agents?

**A**:

1. **Sandboxing**: Limit what tools can do
```python
# Restricted shell execution
ALLOWED_COMMANDS = ["ls", "cat", "grep"]
def safe_shell(cmd):
    if cmd.split()[0] not in ALLOWED_COMMANDS:
        raise SecurityError("Command not allowed")
```

2. **Rate limiting**: Prevent runaway agents
3. **Human-in-the-loop**: Require approval for sensitive actions
4. **Audit logging**: Track all agent actions
5. **Kill switch**: Ability to stop agents immediately

```python
class SafeAgent:
    def execute(self, action):
        # Log everything
        self.audit_log.record(action)
        
        # Check if human approval needed
        if action.risk_level > THRESHOLD:
            approval = self.request_human_approval(action)
            if not approval:
                return "Action blocked by human"
        
        # Execute with limits
        with resource_limits(cpu=10, memory="1GB", time=30):
            return self.tools.execute(action)
```

---

### ⚫ Q46: How would you evaluate an AI agent's performance?

**A**:

**Metrics**:
```python
class AgentEvaluation:
    def evaluate(self, agent, test_cases):
        results = {
            "task_success_rate": 0,
            "avg_steps": 0,
            "tool_accuracy": 0,
            "cost": 0,
            "latency": 0
        }
        
        for task, expected in test_cases:
            start = time.time()
            
            response, trajectory = agent.run(task, return_trajectory=True)
            
            # Success rate
            results["task_success_rate"] += self.judge_success(response, expected)
            
            # Efficiency
            results["avg_steps"] += len(trajectory)
            
            # Tool use accuracy
            results["tool_accuracy"] += self.check_tool_calls(trajectory)
            
            # Cost and latency
            results["cost"] += sum(step.tokens * COST_PER_TOKEN for step in trajectory)
            results["latency"] += time.time() - start
        
        return self.normalize(results, len(test_cases))
```

**Benchmarks**: WebArena, SWE-bench, AgentBench

---

### ⚫ Q47: Explain agent memory systems (short-term, long-term, episodic).

**A**:

```python
class AgentMemory:
    def __init__(self):
        # Short-term: Current conversation
        self.short_term = ConversationBuffer(max_tokens=4096)
        
        # Working memory: Current task context
        self.working = {"goal": None, "plan": [], "current_step": 0}
        
        # Episodic: Past experiences
        self.episodic = VectorStore()  # (situation, action, outcome)
        
        # Semantic: General knowledge
        self.semantic = VectorStore()  # Facts and concepts
    
    def recall(self, query):
        # Combine relevant memories
        short = self.short_term.get_recent()
        episodic = self.episodic.similarity_search(query, k=3)
        semantic = self.semantic.similarity_search(query, k=3)
        
        return {
            "recent_context": short,
            "similar_experiences": episodic,
            "relevant_knowledge": semantic
        }
    
    def consolidate(self):
        # Move important short-term to long-term
        important = self.identify_important(self.short_term)
        self.episodic.add(important)
```

---

### ⚫ Q48: What is the future of AI agents?

**A**:

**Current limitations**:
- Reliability issues (fail on complex tasks)
- High cost (many LLM calls)
- Limited context (can't remember everything)
- Safety concerns (uncontrolled actions)

**Future directions**:
1. **Better planning**: More sophisticated reasoning
2. **Efficient execution**: Fewer LLM calls needed
3. **Persistent memory**: Learn from experience
4. **Multi-agent collaboration**: Specialist agents working together
5. **Grounded in reality**: Better world models

```
Evolution:
2023: ReAct agents (simple tool use)
2024: Plan-and-Execute, Multi-agent
2025: Autonomous coding agents, Research agents
Future: General-purpose AI assistants
```

---

## 🎯 Quick Reference Card

### Fine-Tuning Checklist
```
□ Choose base model (size vs capability)
□ Prepare dataset (clean, format, split)
□ Select PEFT method (LoRA for most cases)
□ Set hyperparameters (lr=2e-5, r=16, alpha=32)
□ Train with validation monitoring
□ Evaluate on held-out test set
□ Check for catastrophic forgetting
□ Deploy or merge weights
```

### LoRA Quick Settings
```python
LoraConfig(
    r=16,                    # Start here
    lora_alpha=32,           # Usually 2*r
    target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM"
)
```

### Agent Design Pattern
```
1. Define clear goal
2. Provide relevant tools
3. Use ReAct for simple, Plan-Execute for complex
4. Add safety guardrails
5. Log everything
6. Have human oversight
7. Set iteration limits
```

---

## ✅ Week 4 Complete!

You've mastered:
- ✅ Fine-tuning fundamentals and best practices
- ✅ LoRA and QLoRA for efficient training
- ✅ HuggingFace ecosystem
- ✅ LangChain and LangGraph for LLM apps
- ✅ Building AI agents with tool use

**Next:** [Week 5 - Vector DBs & RAG](../Week-5-Vector-DB-and-RAG/README.md)
