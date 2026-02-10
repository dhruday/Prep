# 📘 Model Context Protocol (MCP)


## 📑 Table of Contents

- [🎯 Purpose (Why MCP Exists)](#purpose-why-mcp-exists)
- [📚 What MCP Actually Is](#what-mcp-actually-is)
- [🔧 How MCP Works (Intuition)](#how-mcp-works-intuition)
- [🧮 How MCP Works (Technical Details)](#how-mcp-works-technical-details)
- [🎨 Visual Explanation](#visual-explanation)
- [💡 Simple Example](#simple-example)
- [🌍 Real-World Applications](#real-world-applications)
- [❌ Common Misconceptions](#common-misconceptions)
- [✅ Best Practices](#best-practices)
- [🎯 Key Takeaways](#key-takeaways)
- [✅ Review Questions](#review-questions)
- [🧩 Practice Problems](#practice-problems)
- [🚀 Mini Project: Personal Knowledge Base with MCP](#mini-project-personal-knowledge-base-with-mcp)

---

## 🎯 Purpose (Why MCP Exists)

Imagine you're building a ChatGPT-like app. Your LLM needs to:
- Read files from your computer
- Query databases
- Fetch data from APIs
- Execute code
- Access web browsers

**The Old Way (2023):**
```javascript
// Every AI app reinvented the wheel
class MyCustomToolSystem {
  async readFile(path) { /* custom implementation */ }
  async queryDB(sql) { /* custom implementation */ }
  async callAPI(url) { /* custom implementation */ }
}

// Next developer builds their own version
class AnotherToolSystem {
  async readDocument(filepath) { /* different implementation */ }
  async executeQuery(query) { /* different implementation */ }
}

// No standardization = chaos
```

**The Problem:**
- Every AI framework (LangChain, LlamaIndex, AutoGPT) had different tool integration methods
- Tools written for one framework didn't work with others
- Developers wasted time building the same integrations repeatedly
- No security standards for tool access
- Hard to share tools across projects

**MCP Solution (2024+):**
Like USB standardized how devices connect to computers, **MCP standardizes how LLMs connect to data sources and tools**.

```javascript
// Conceptual: MCP standardizes the interface
const mcpServer = new MCPServer({
  tools: {
    'read_file': FileSystemTool,
    'query_database': DatabaseTool,
    'fetch_url': WebTool
  }
});

// ANY LLM client can now use these tools
const claude = new ClaudeClient({ mcpServer });
const gpt4 = new GPT4Client({ mcpServer });
const localLlama = new LlamaClient({ mcpServer });

// All use the SAME tools through standard protocol
```

**Real-World Impact:**
- Anthropic (Claude) introduced MCP in November 2024
- Think "HTTP for AI tool communication"
- Write tool once → works everywhere
- Security, permissions, and logging built-in

---

## 📚 What MCP Actually Is

**Definition:**
Model Context Protocol is an **open standard** that defines how AI applications communicate with external data sources and tools through a **client-server architecture**.

**Core Components:**

### 1. MCP Servers (Tool Providers)
Expose capabilities to LLMs:

```javascript
// JavaScript Conceptual Example
class FileSystemMCPServer {
  // Declares what it can do
  listCapabilities() {
    return {
      tools: [
        {
          name: 'read_file',
          description: 'Read contents of a file',
          parameters: {
            path: { type: 'string', required: true }
          }
        },
        {
          name: 'list_directory',
          description: 'List files in directory',
          parameters: {
            path: { type: 'string', required: true }
          }
        }
      ],
      resources: [
        {
          uri: 'file:///',
          description: 'Access to local filesystem'
        }
      ]
    };
  }

  // Handles tool execution
  async executeTool(name, params) {
    if (name === 'read_file') {
      const content = await fs.readFile(params.path, 'utf-8');
      return { content, mimeType: 'text/plain' };
    }
    if (name === 'list_directory') {
      const files = await fs.readdir(params.path);
      return { files };
    }
  }
}
```

### 2. MCP Clients (LLM Applications)
Request capabilities from servers:

```javascript
// LLM app connects to MCP server
class AIAssistant {
  constructor() {
    this.mcpClient = new MCPClient();
  }

  async initialize() {
    // Connect to filesystem server
    await this.mcpClient.connect('filesystem-server');
    
    // Discover available tools
    const capabilities = await this.mcpClient.listTools();
    console.log('Available tools:', capabilities.tools);
  }

  async answerQuestion(userQuery) {
    // LLM decides it needs to read a file
    const llmResponse = await this.callLLM(userQuery);
    
    if (llmResponse.toolCall) {
      // Execute tool through MCP
      const result = await this.mcpClient.callTool(
        llmResponse.toolCall.name,
        llmResponse.toolCall.params
      );
      
      // Send result back to LLM
      const finalAnswer = await this.callLLM(
        userQuery,
        { toolResult: result }
      );
      
      return finalAnswer;
    }
  }
}
```

### 3. Protocol Transport
MCP uses **JSON-RPC 2.0** over multiple transports:
- **stdio** (stdin/stdout) - for local processes
- **HTTP/SSE** (Server-Sent Events) - for remote servers
- **WebSocket** - for bidirectional communication

---

## 🔧 How MCP Works (Intuition)

**Think of MCP like a Restaurant:**

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Customer  │         │   Waiter     │         │   Kitchen   │
│   (LLM)     │ ◄─────► │ (MCP Client) │ ◄─────► │(MCP Server) │
└─────────────┘         └──────────────┘         └─────────────┘
```

**Step-by-Step Flow:**

1. **Initialization (Restaurant Opens):**
   ```javascript
   // Server announces menu (capabilities)
   Server: "I can provide: read_file, write_file, list_directory"
   
   // Client connects
   Client: "I'd like to use your file services"
   Server: "Connected. Here are my capabilities..."
   ```

2. **Tool Discovery (Reading the Menu):**
   ```javascript
   // Client asks what's available
   Client → Server: "List all tools"
   
   Server → Client: {
     tools: [
       { name: 'read_file', params: { path: string } },
       { name: 'write_file', params: { path: string, content: string } }
     ]
   }
   ```

3. **Tool Execution (Ordering Food):**
   ```javascript
   // User asks LLM a question
   User: "What's in my config.json file?"
   
   // LLM decides to use tool
   LLM → MCP Client: "I need to call read_file with path='/config.json'"
   
   // Client sends request to server
   MCP Client → MCP Server: {
     method: 'tools/call',
     params: {
       name: 'read_file',
       arguments: { path: '/config.json' }
     }
   }
   
   // Server executes and returns
   MCP Server → MCP Client: {
     content: '{ "api_key": "...", "model": "gpt-4" }'
   }
   
   // Client sends to LLM
   MCP Client → LLM: "Here's the file content..."
   
   // LLM generates answer
   LLM → User: "Your config file contains API settings for GPT-4..."
   ```

4. **Resource Management:**
   ```javascript
   // MCP handles permissions, logging, rate limiting
   Server logs: "Tool 'read_file' called at 2024-11-15 10:30:45"
   Server checks: "Does client have permission to read /config.json?"
   Server enforces: "Rate limit: 100 calls per minute"
   ```

---

## 🧮 How MCP Works (Technical Details)

### Message Format (JSON-RPC 2.0)

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "read_file",
    "arguments": {
      "path": "/home/user/document.txt"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "File contents here..."
      }
    ]
  }
}
```

### Python Production Implementation

**1. Building an MCP Server:**

```python
# file_server.py
from mcp.server import Server
from mcp.types import Tool, TextContent
import asyncio
import os

class FileSystemServer:
    def __init__(self):
        self.server = Server("filesystem-server")
        self.setup_handlers()
    
    def setup_handlers(self):
        @self.server.list_tools()
        async def list_tools() -> list[Tool]:
            """Declare available tools"""
            return [
                Tool(
                    name="read_file",
                    description="Read contents of a file",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "path": {
                                "type": "string",
                                "description": "File path to read"
                            }
                        },
                        "required": ["path"]
                    }
                ),
                Tool(
                    name="write_file",
                    description="Write content to a file",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "path": {"type": "string"},
                            "content": {"type": "string"}
                        },
                        "required": ["path", "content"]
                    }
                ),
                Tool(
                    name="list_directory",
                    description="List files in directory",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "path": {"type": "string"}
                        },
                        "required": ["path"]
                    }
                )
            ]
        
        @self.server.call_tool()
        async def call_tool(name: str, arguments: dict) -> list[TextContent]:
            """Execute tool based on name"""
            if name == "read_file":
                return await self.read_file(arguments["path"])
            elif name == "write_file":
                return await self.write_file(
                    arguments["path"],
                    arguments["content"]
                )
            elif name == "list_directory":
                return await self.list_directory(arguments["path"])
            else:
                raise ValueError(f"Unknown tool: {name}")
    
    async def read_file(self, path: str) -> list[TextContent]:
        """Read file implementation"""
        try:
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            return [
                TextContent(
                    type="text",
                    text=content
                )
            ]
        except FileNotFoundError:
            return [TextContent(type="text", text=f"Error: File not found: {path}")]
        except Exception as e:
            return [TextContent(type="text", text=f"Error reading file: {str(e)}")]
    
    async def write_file(self, path: str, content: str) -> list[TextContent]:
        """Write file implementation"""
        try:
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
            return [TextContent(type="text", text=f"Successfully wrote to {path}")]
        except Exception as e:
            return [TextContent(type="text", text=f"Error writing file: {str(e)}")]
    
    async def list_directory(self, path: str) -> list[TextContent]:
        """List directory implementation"""
        try:
            files = os.listdir(path)
            files_list = "\n".join(files)
            return [TextContent(type="text", text=f"Files in {path}:\n{files_list}")]
        except Exception as e:
            return [TextContent(type="text", text=f"Error listing directory: {str(e)}")]
    
    async def run(self):
        """Run server on stdio"""
        from mcp.server.stdio import stdio_server
        
        async with stdio_server() as (read_stream, write_stream):
            await self.server.run(
                read_stream,
                write_stream,
                self.server.create_initialization_options()
            )

# Run server
if __name__ == "__main__":
    server = FileSystemServer()
    asyncio.run(server.run())
```

**2. Building an MCP Client:**

```python
# ai_assistant.py
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from anthropic import Anthropic
import asyncio

class AIAssistant:
    def __init__(self):
        self.anthropic = Anthropic()
        self.session = None
        self.available_tools = []
    
    async def initialize(self):
        """Connect to MCP server"""
        server_params = StdioServerParameters(
            command="python",
            args=["file_server.py"]
        )
        
        # Create client connection
        self.stdio_transport = await stdio_client(server_params)
        self.read_stream, self.write_stream = self.stdio_transport
        
        # Initialize session
        self.session = ClientSession(self.read_stream, self.write_stream)
        await self.session.initialize()
        
        # Discover available tools
        response = await self.session.list_tools()
        self.available_tools = response.tools
        
        print(f"Connected to MCP server")
        print(f"Available tools: {[tool.name for tool in self.available_tools]}")
    
    def convert_tools_for_claude(self):
        """Convert MCP tools to Claude API format"""
        claude_tools = []
        for tool in self.available_tools:
            claude_tools.append({
                "name": tool.name,
                "description": tool.description,
                "input_schema": tool.inputSchema
            })
        return claude_tools
    
    async def execute_tool(self, tool_name: str, tool_input: dict):
        """Execute MCP tool"""
        result = await self.session.call_tool(tool_name, tool_input)
        
        # Extract text content
        content_text = ""
        for content in result.content:
            if hasattr(content, 'text'):
                content_text += content.text
        
        return content_text
    
    async def chat(self, user_message: str):
        """Chat with LLM using MCP tools"""
        messages = [{"role": "user", "content": user_message}]
        
        # Convert MCP tools to Claude format
        claude_tools = self.convert_tools_for_claude()
        
        while True:
            # Call Claude
            response = self.anthropic.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=4096,
                tools=claude_tools,
                messages=messages
            )
            
            # Check if Claude wants to use a tool
            if response.stop_reason == "tool_use":
                # Extract tool call
                tool_use_block = next(
                    block for block in response.content
                    if block.type == "tool_use"
                )
                
                tool_name = tool_use_block.name
                tool_input = tool_use_block.input
                
                print(f"\n🔧 Claude is using tool: {tool_name}")
                print(f"   Parameters: {tool_input}")
                
                # Execute tool via MCP
                tool_result = await self.execute_tool(tool_name, tool_input)
                
                print(f"   Result: {tool_result[:100]}...")
                
                # Add Claude's response and tool result to messages
                messages.append({
                    "role": "assistant",
                    "content": response.content
                })
                messages.append({
                    "role": "user",
                    "content": [
                        {
                            "type": "tool_result",
                            "tool_use_id": tool_use_block.id,
                            "content": tool_result
                        }
                    ]
                })
                
                # Continue loop to get final answer
            else:
                # No more tool calls, return final answer
                final_text = next(
                    block.text for block in response.content
                    if hasattr(block, "text")
                )
                return final_text
    
    async def close(self):
        """Close MCP connection"""
        if self.session:
            await self.session.__aexit__(None, None, None)

# Usage Example
async def main():
    assistant = AIAssistant()
    
    try:
        await assistant.initialize()
        
        # Example queries
        queries = [
            "List all files in the current directory",
            "Read the contents of README.md",
            "Create a new file called test.txt with the content 'Hello MCP!'"
        ]
        
        for query in queries:
            print(f"\n📝 User: {query}")
            response = await assistant.chat(query)
            print(f"🤖 Assistant: {response}")
    
    finally:
        await assistant.close()

if __name__ == "__main__":
    asyncio.run(main())
```

**3. Database MCP Server (More Complex Example):**

```python
# database_server.py
from mcp.server import Server
from mcp.types import Tool, TextContent
import sqlite3
import json

class DatabaseServer:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.server = Server("database-server")
        self.setup_handlers()
    
    def setup_handlers(self):
        @self.server.list_tools()
        async def list_tools() -> list[Tool]:
            return [
                Tool(
                    name="query_database",
                    description="Execute SQL query and return results",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "SQL query to execute"
                            }
                        },
                        "required": ["query"]
                    }
                ),
                Tool(
                    name="get_schema",
                    description="Get database schema information",
                    inputSchema={
                        "type": "object",
                        "properties": {}
                    }
                )
            ]
        
        @self.server.call_tool()
        async def call_tool(name: str, arguments: dict) -> list[TextContent]:
            if name == "query_database":
                return await self.query_database(arguments["query"])
            elif name == "get_schema":
                return await self.get_schema()
            else:
                raise ValueError(f"Unknown tool: {name}")
    
    async def query_database(self, query: str) -> list[TextContent]:
        """Execute SQL query"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute(query)
            
            # For SELECT queries
            if query.strip().upper().startswith("SELECT"):
                columns = [description[0] for description in cursor.description]
                rows = cursor.fetchall()
                
                # Format as JSON
                results = [dict(zip(columns, row)) for row in rows]
                result_text = json.dumps(results, indent=2)
            else:
                # For INSERT/UPDATE/DELETE
                conn.commit()
                result_text = f"Query executed successfully. Rows affected: {cursor.rowcount}"
            
            conn.close()
            return [TextContent(type="text", text=result_text)]
        
        except Exception as e:
            return [TextContent(type="text", text=f"Database error: {str(e)}")]
    
    async def get_schema(self) -> list[TextContent]:
        """Get database schema"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get all tables
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = cursor.fetchall()
            
            schema_info = {}
            for (table_name,) in tables:
                cursor.execute(f"PRAGMA table_info({table_name})")
                columns = cursor.fetchall()
                schema_info[table_name] = [
                    {"name": col[1], "type": col[2], "nullable": not col[3]}
                    for col in columns
                ]
            
            conn.close()
            return [TextContent(type="text", text=json.dumps(schema_info, indent=2))]
        
        except Exception as e:
            return [TextContent(type="text", text=f"Schema error: {str(e)}")]
    
    async def run(self):
        """Run server"""
        from mcp.server.stdio import stdio_server
        
        async with stdio_server() as (read_stream, write_stream):
            await self.server.run(
                read_stream,
                write_stream,
                self.server.create_initialization_options()
            )
```

---

## 🎨 Visual Explanation

**MCP Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│                      LLM Application                        │
│                     (MCP Client)                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 1. User asks: "What files are in my documents?"     │  │
│  │ 2. LLM decides to use 'list_directory' tool        │  │
│  │ 3. Send tool call to MCP Server                    │  │
│  │ 4. Receive results                                 │  │
│  │ 5. Generate natural language response              │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────┬─────────────────────────────────────────┘
                    │ JSON-RPC over stdio/HTTP/WebSocket
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                      MCP Server                             │
│                  (Tool Provider)                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Available Tools:                                     │  │
│  │  • read_file(path: string)                          │  │
│  │  • write_file(path: string, content: string)        │  │
│  │  • list_directory(path: string)                     │  │
│  │  • query_database(sql: string)                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Security & Permissions:                              │  │
│  │  • Rate limiting                                     │  │
│  │  • Access control                                    │  │
│  │  • Audit logging                                     │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
              Actual Resources
         (Files, Databases, APIs)
```

**Message Flow:**

```
Client                           Server
  │                                 │
  │──── Initialize Connection ────►│
  │                                 │
  │◄─── Capabilities Response ─────│
  │     (list of tools)             │
  │                                 │
  │──── Tool Call Request ────────►│
  │     { name: "read_file",        │
  │       args: { path: "..." } }   │
  │                                 │
  │                                 │── Execute Tool
  │                                 │   (read actual file)
  │                                 │
  │◄─── Tool Result ───────────────│
  │     { content: "..." }          │
  │                                 │
```

---

## 💡 Simple Example

**Building a Code Analysis Assistant:**

```python
# code_assistant.py
import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from anthropic import Anthropic

class CodeAssistant:
    """AI assistant that can read and analyze code files"""
    
    def __init__(self):
        self.anthropic = Anthropic()
        self.session = None
    
    async def setup(self):
        """Connect to filesystem MCP server"""
        server_params = StdioServerParameters(
            command="python",
            args=["file_server.py"]
        )
        
        transport = await stdio_client(server_params)
        self.session = ClientSession(*transport)
        await self.session.initialize()
        
        print("✅ Connected to MCP filesystem server")
    
    async def analyze_codebase(self, directory: str):
        """Analyze all Python files in directory"""
        # List files using MCP tool
        list_result = await self.session.call_tool(
            "list_directory",
            {"path": directory}
        )
        
        files_text = list_result.content[0].text
        print(f"\n📁 Files found:\n{files_text}")
        
        # Ask Claude to analyze
        response = self.anthropic.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2048,
            messages=[{
                "role": "user",
                "content": f"Analyze this file list and identify Python files:\n{files_text}"
            }]
        )
        
        analysis = response.content[0].text
        print(f"\n🤖 Claude's analysis:\n{analysis}")
        
        return analysis
    
    async def close(self):
        if self.session:
            await self.session.__aexit__(None, None, None)

# Usage
async def main():
    assistant = CodeAssistant()
    try:
        await assistant.setup()
        await assistant.analyze_codebase("./src")
    finally:
        await assistant.close()

asyncio.run(main())
```

**Output:**
```
✅ Connected to MCP filesystem server

📁 Files found:
Files in ./src:
main.py
utils.py
config.json
tests/

🤖 Claude's analysis:
I found 2 Python files in the directory:
1. main.py - likely the entry point
2. utils.py - utility functions
There's also a config.json and a tests subdirectory.
Would you like me to read and analyze any of these files?
```

---

## 🌍 Real-World Applications

### 1. **Claude Desktop App (Anthropic)**
```
Uses MCP to connect Claude to:
• Local filesystem
• Git repositories
• Databases (PostgreSQL, SQLite)
• Web browsers (Puppeteer)
• Google Drive, Slack, etc.

User: "Analyze my project's test coverage"
Claude: Reads files via MCP → Analyzes → Reports
```

### 2. **Development Tools**
```python
# AI coding assistant with MCP
class DevAssistant:
    async def refactor_code(self, file_path):
        # Read code via MCP
        code = await mcp.read_file(file_path)
        
        # LLM suggests improvements
        suggestions = await llm.analyze(code)
        
        # Write back via MCP
        await mcp.write_file(file_path, improved_code)
```

### 3. **Data Analysis**
```python
# AI analyst with database access
class DataAnalyst:
    async def answer_business_question(self, question):
        # Get schema via MCP
        schema = await mcp.get_database_schema()
        
        # LLM generates SQL
        sql = await llm.generate_sql(question, schema)
        
        # Execute via MCP
        results = await mcp.query_database(sql)
        
        # LLM explains results
        explanation = await llm.explain(results)
        return explanation
```

### 4. **Customer Support Bot**
```python
# Bot with access to knowledge base and CRM
class SupportBot:
    async def handle_ticket(self, ticket):
        # Search knowledge base via MCP
        articles = await mcp.search_kb(ticket.question)
        
        # Check customer history via MCP
        history = await mcp.get_customer_history(ticket.customer_id)
        
        # Generate response
        response = await llm.generate_response(
            ticket, articles, history
        )
        
        # Log via MCP
        await mcp.log_interaction(ticket.id, response)
```

### 5. **Research Assistant**
```python
# Academic research tool
class ResearchAssistant:
    async def literature_review(self, topic):
        # Search papers via MCP (connected to arXiv API)
        papers = await mcp.search_papers(topic)
        
        # Download PDFs via MCP
        for paper in papers[:10]:
            pdf = await mcp.download_pdf(paper.url)
            
            # Extract text via MCP (PDF tool)
            text = await mcp.extract_text(pdf)
            
            # Summarize with LLM
            summary = await llm.summarize(text)
            
            # Save to knowledge base via MCP
            await mcp.save_summary(paper.id, summary)
```

---

## ❌ Common Misconceptions

### ❌ "MCP is just another LangChain"
**Reality:** MCP is a **protocol** (like HTTP), not a framework. LangChain is a framework that can *use* MCP.

```javascript
// Wrong mental model
MCP = LangChain competitor

// Correct mental model
MCP = Standard protocol (like USB)
LangChain = Framework that can use MCP (like a USB device)
```

### ❌ "I need to rewrite all my tools for MCP"
**Reality:** Wrap existing tools with MCP interface:

```python
# Your existing tool
def my_custom_function(param1, param2):
    return some_result

# MCP wrapper (5 minutes)
@server.call_tool()
async def call_tool(name: str, arguments: dict):
    if name == "my_custom_function":
        result = my_custom_function(
            arguments["param1"],
            arguments["param2"]
        )
        return [TextContent(type="text", text=str(result))]
```

### ❌ "MCP is only for Anthropic/Claude"
**Reality:** MCP is **open standard**. Any LLM can use it:

```python
# Works with Claude
claude_client = ClaudeClient(mcp_server)

# Works with GPT-4
gpt_client = GPT4Client(mcp_server)

# Works with local Llama
llama_client = LlamaClient(mcp_server)
```

### ❌ "MCP replaces function calling"
**Reality:** MCP is a **transport layer** for function calling:

```
Traditional:
LLM → Function Call (custom format) → Your code

With MCP:
LLM → Function Call (standard format) → MCP Client → MCP Server → Your code

Benefit: Standardization, reusability, security
```

### ❌ "MCP is production-ready everywhere"
**Reality:** As of early 2025, MCP is:
- ✅ Stable for Python (mcp package)
- ✅ Used in Claude Desktop
- ⚠️ TypeScript support improving
- ⚠️ Ecosystem still growing
- ⚠️ Some rough edges in production

---

## ✅ Best Practices

### 1. **Server Design**

```python
class ProductionMCPServer:
    """Well-designed MCP server"""
    
    def __init__(self):
        self.server = Server("my-server")
        
        # Best Practice: Clear naming
        self.server_name = "my-company-data-server"
        
        # Best Practice: Version your tools
        self.version = "1.0.0"
        
        # Best Practice: Implement health checks
        self.setup_health_check()
        
        # Best Practice: Add logging
        self.logger = logging.getLogger(__name__)
    
    @server.list_tools()
    async def list_tools():
        return [
            Tool(
                name="query_data",
                description="Query company database. Use for customer info, orders, inventory.",
                # Best Practice: Detailed descriptions
                inputSchema={
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "SQL query. Use SELECT only. No DELETE/UPDATE allowed."
                        }
                    },
                    "required": ["query"]
                }
            )
        ]
    
    @server.call_tool()
    async def call_tool(name: str, arguments: dict):
        # Best Practice: Input validation
        if name == "query_data":
            query = arguments["query"].strip().upper()
            if any(kw in query for kw in ["DELETE", "UPDATE", "DROP"]):
                raise ValueError("Only SELECT queries allowed")
        
        # Best Practice: Error handling
        try:
            result = await self.execute_query(arguments["query"])
            
            # Best Practice: Structured responses
            return [TextContent(
                type="text",
                text=json.dumps({
                    "status": "success",
                    "data": result,
                    "timestamp": datetime.now().isoformat()
                })
            )]
        
        except Exception as e:
            # Best Practice: Detailed error messages
            self.logger.error(f"Query failed: {str(e)}")
            return [TextContent(
                type="text",
                text=json.dumps({
                    "status": "error",
                    "message": str(e),
                    "timestamp": datetime.now().isoformat()
                })
            )]
    
    async def execute_query(self, query: str):
        # Best Practice: Timeouts
        async with timeout(30):  # 30 second timeout
            # Best Practice: Connection pooling
            async with self.db_pool.acquire() as conn:
                result = await conn.fetch(query)
                return result
```

### 2. **Security**

```python
class SecureMCPServer:
    """Security-focused MCP server"""
    
    def __init__(self):
        self.server = Server("secure-server")
        
        # Best Practice: Authentication
        self.api_key = os.environ.get("MCP_API_KEY")
        
        # Best Practice: Rate limiting
        self.rate_limiter = RateLimiter(max_calls=100, per_seconds=60)
        
        # Best Practice: Audit logging
        self.audit_logger = AuditLogger("mcp_audit.log")
    
    async def authenticate(self, request):
        """Verify client credentials"""
        provided_key = request.headers.get("Authorization")
        if provided_key != f"Bearer {self.api_key}":
            raise PermissionError("Invalid API key")
    
    @server.call_tool()
    async def call_tool(name: str, arguments: dict):
        # Best Practice: Check rate limits
        if not await self.rate_limiter.check():
            raise Exception("Rate limit exceeded")
        
        # Best Practice: Log all tool calls
        self.audit_logger.log({
            "timestamp": datetime.now(),
            "tool": name,
            "arguments": arguments,
            "client_id": self.current_client_id
        })
        
        # Best Practice: Principle of least privilege
        allowed_tools = self.get_allowed_tools(self.current_client_id)
        if name not in allowed_tools:
            raise PermissionError(f"Client not authorized for tool: {name}")
        
        # Execute tool
        result = await self.execute_tool(name, arguments)
        
        # Best Practice: Sanitize output
        sanitized_result = self.sanitize(result)
        return sanitized_result
    
    def sanitize(self, data):
        """Remove sensitive information"""
        # Remove API keys, passwords, etc.
        sensitive_keys = ["api_key", "password", "secret", "token"]
        if isinstance(data, dict):
            return {
                k: v for k, v in data.items()
                if k.lower() not in sensitive_keys
            }
        return data
```

### 3. **Client Best Practices**

```python
class RobustMCPClient:
    """Production-ready MCP client"""
    
    async def call_tool_with_retry(
        self,
        tool_name: str,
        arguments: dict,
        max_retries: int = 3
    ):
        """Best Practice: Implement retries"""
        for attempt in range(max_retries):
            try:
                result = await self.session.call_tool(tool_name, arguments)
                return result
            
            except Exception as e:
                if attempt == max_retries - 1:
                    raise
                
                # Exponential backoff
                wait_time = 2 ** attempt
                await asyncio.sleep(wait_time)
    
    async def call_tool_with_timeout(
        self,
        tool_name: str,
        arguments: dict,
        timeout_seconds: int = 30
    ):
        """Best Practice: Set timeouts"""
        try:
            async with asyncio.timeout(timeout_seconds):
                return await self.session.call_tool(tool_name, arguments)
        except asyncio.TimeoutError:
            raise Exception(f"Tool call timed out after {timeout_seconds}s")
    
    async def discover_and_cache_tools(self):
        """Best Practice: Cache tool definitions"""
        if not hasattr(self, '_tool_cache'):
            response = await self.session.list_tools()
            self._tool_cache = {tool.name: tool for tool in response.tools}
        return self._tool_cache
    
    async def validate_arguments(self, tool_name: str, arguments: dict):
        """Best Practice: Validate before sending"""
        tools = await self.discover_and_cache_tools()
        tool = tools.get(tool_name)
        
        if not tool:
            raise ValueError(f"Unknown tool: {tool_name}")
        
        # Validate against JSON schema
        schema = tool.inputSchema
        # ... perform validation ...
```

### 4. **Deployment**

```python
# Best Practice: Environment-based configuration
# config.py
import os
from dataclasses import dataclass

@dataclass
class MCPConfig:
    server_name: str
    host: str
    port: int
    log_level: str
    max_connections: int
    
    @classmethod
    def from_env(cls):
        return cls(
            server_name=os.getenv("MCP_SERVER_NAME", "my-server"),
            host=os.getenv("MCP_HOST", "0.0.0.0"),
            port=int(os.getenv("MCP_PORT", "8080")),
            log_level=os.getenv("LOG_LEVEL", "INFO"),
            max_connections=int(os.getenv("MAX_CONNECTIONS", "100"))
        )

# Best Practice: Docker deployment
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Best Practice: Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8080/health')"

CMD ["python", "server.py"]
```

---

## 🎯 Key Takeaways

1. **MCP is a Protocol, Not a Framework**
   - Think HTTP for AI tools
   - Enables standardization and reusability

2. **Client-Server Architecture**
   - Servers expose tools
   - Clients (LLM apps) consume tools
   - JSON-RPC communication

3. **Benefits:**
   - Write tool once, use everywhere
   - Security and permissions built-in
   - Easier maintenance
   - Growing ecosystem

4. **Use Cases:**
   - File system access
   - Database queries
   - API integrations
   - Browser automation
   - Custom business logic

5. **Production Considerations:**
   - Security (auth, rate limiting, audit logs)
   - Error handling and retries
   - Timeouts and resource limits
   - Monitoring and observability

---

## ✅ Review Questions

1. What problem does MCP solve that didn't exist with traditional function calling?
2. Explain the difference between an MCP Server and an MCP Client.
3. What transport protocols does MCP support?
4. Why is MCP considered a "protocol" rather than a "library"?
5. How does MCP improve security compared to direct tool access?

---

## 🧩 Practice Problems

### Beginner
1. Build an MCP server that exposes a simple calculator (add, subtract, multiply, divide)
2. Create an MCP client that connects to the calculator server and performs operations

### Intermediate
3. Build an MCP server for a TODO list (create, read, update, delete tasks)
4. Add authentication and rate limiting to your TODO server
5. Create a client that uses the TODO server with a simple CLI interface

### Advanced
6. Build an MCP server that integrates with GitHub API (list repos, create issues, etc.)
7. Implement retry logic and exponential backoff in an MCP client
8. Create a monitoring dashboard that tracks MCP server usage and performance

---

## 🚀 Mini Project: Personal Knowledge Base with MCP

**Goal:** Build an AI assistant that can manage your personal notes using MCP.

**Requirements:**
1. **MCP Server** that provides:
   - `create_note(title, content, tags)` - Create a note
   - `search_notes(query)` - Search notes by content/tags
   - `update_note(id, content)` - Update existing note
   - `delete_note(id)` - Delete a note
   - `list_tags()` - List all tags

2. **MCP Client** with CLI:
   ```
   $ python notes_assistant.py "Create a note about MCP protocol"
   $ python notes_assistant.py "What notes do I have about Python?"
   $ python notes_assistant.py "Show all notes tagged with 'AI'"
   ```

3. **Storage:** Use SQLite for persistence

4. **LLM Integration:** Use Claude or GPT-4 to:
   - Understand user intent
   - Decide which MCP tool to call
   - Format results nicely

**Bonus Features:**
- Add markdown support for notes
- Implement note versioning
- Add export to PDF functionality
- Build a simple web UI with Streamlit

**Learning Outcomes:**
- Hands-on MCP server development
- Client-server communication patterns
- LLM tool orchestration
- Production deployment practices

---

**Next Steps:**
- Try the official MCP Python SDK: `pip install mcp`
- Explore MCP servers on GitHub
- Check Anthropic's MCP documentation
- Join MCP community discussions

MCP is rapidly evolving - expect many more tools and integrations in 2025! 🚀
