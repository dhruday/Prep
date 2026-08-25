# 🚀 Model Context Protocol (MCP)

## 📚 Table of Contents
1. [Introduction](#-introduction)
2. [Beginner Explanation](#-beginner-explanation)
3. [Deep Technical Breakdown](#-deep-technical-breakdown)
4. [Architecture & Components](#-architecture--components)
5. [Implementation Guide](#-implementation-guide)
6. [Real-World Use Cases](#-real-world-use-cases)
7. [Hands-On Project](#-hands-on-project)
8. [Common Mistakes](#-common-mistakes)
9. [Interview Questions](#-interview-questions)
10. [Homework](#-homework)

---

## 🎯 Introduction

**Model Context Protocol (MCP)** is a standardized protocol introduced by Anthropic that enables AI models to securely connect with external data sources, tools, and services. It's the "USB-C for AI" – a universal connector that lets LLMs interact with the outside world.

### Why MCP Matters

| Before MCP | After MCP |
|------------|-----------|
| Custom integrations for each tool | Standardized protocol |
| Tight coupling between LLM and tools | Loose coupling, plug-and-play |
| Security concerns with direct access | Controlled, permissioned access |
| Fragmented ecosystem | Unified ecosystem |

---

## 🧒 Beginner Explanation

### The "Restaurant Kitchen" Analogy

Imagine you're a head chef (the LLM) who needs ingredients from various suppliers.

**Without MCP:**
```
Chef → Calls each supplier individually
     → Different phone numbers
     → Different ordering formats
     → Different delivery methods
     → Chaos!
```

**With MCP:**
```
Chef → Uses ONE ordering system
     → All suppliers connected to same system
     → Standardized order format
     → Consistent delivery
     → Simple and organized!
```

### What MCP Actually Does

```
┌─────────────────────────────────────────────────────────────┐
│                         YOUR AI APP                          │
│                           (Host)                             │
└─────────────────────────┬───────────────────────────────────┘
                          │ MCP Protocol
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │  GitHub  │    │  Slack   │    │ Database │
    │  Server  │    │  Server  │    │  Server  │
    └──────────┘    └──────────┘    └──────────┘
```

**Key Concept:** MCP Servers are like "plugins" that expose capabilities (tools, resources, prompts) that AI models can use.

---

## 🔬 Deep Technical Breakdown

### MCP Architecture

MCP follows a **client-server architecture** with three main components:

```
┌─────────────────────────────────────────────────────────────────┐
│                        MCP ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                         HOST                                │ │
│  │  (Claude Desktop, VS Code, Custom App)                     │ │
│  │                                                             │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │ │
│  │  │   CLIENT    │  │   CLIENT    │  │   CLIENT    │        │ │
│  │  │   (MCP)     │  │   (MCP)     │  │   (MCP)     │        │ │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │ │
│  └─────────┼────────────────┼────────────────┼────────────────┘ │
│            │                │                │                   │
│  ┌─────────▼──────┐ ┌──────▼───────┐ ┌──────▼───────┐          │
│  │    SERVER A    │ │   SERVER B   │ │   SERVER C   │          │
│  │                │ │              │ │              │          │
│  │ • Tools        │ │ • Resources  │ │ • Prompts    │          │
│  │ • Resources    │ │ • Tools      │ │ • Tools      │          │
│  │ • Prompts      │ │              │ │ • Resources  │          │
│  └────────────────┘ └──────────────┘ └──────────────┘          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Core Concepts

#### 1. Hosts
The application that contains the LLM (e.g., Claude Desktop, IDEs, custom apps)

#### 2. Clients  
Protocol clients that maintain 1:1 connections with servers

#### 3. Servers
Programs that expose capabilities through MCP:
- **Tools:** Functions the LLM can call
- **Resources:** Data the LLM can read
- **Prompts:** Pre-defined prompt templates

### Protocol Layers

```
┌─────────────────────────────────────────┐
│           APPLICATION LAYER             │
│     Tools, Resources, Prompts           │
├─────────────────────────────────────────┤
│            MESSAGE LAYER                │
│     JSON-RPC 2.0 Messages               │
├─────────────────────────────────────────┤
│           TRANSPORT LAYER               │
│     stdio, HTTP+SSE, WebSocket          │
└─────────────────────────────────────────┘
```

### Message Types

| Type | Direction | Purpose |
|------|-----------|---------|
| `request` | Bidirectional | Expects response |
| `response` | Reply | Answer to request |
| `notification` | Bidirectional | No response needed |

### JSON-RPC Format

```json
// Request
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_weather",
    "arguments": {
      "city": "San Francisco"
    }
  }
}

// Response
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "72°F, Sunny"
      }
    ]
  }
}
```

---

## 🏗️ Architecture & Components

### Server Capabilities

#### Tools
Functions that the LLM can execute:

```python
@server.tool()
async def search_database(query: str, limit: int = 10) -> list:
    """Search the database for matching records"""
    results = await db.search(query, limit=limit)
    return results
```

#### Resources
Data that the LLM can read:

```python
@server.resource("config://app/settings")
async def get_settings() -> str:
    """Application configuration settings"""
    return json.dumps(app_config)
```

#### Prompts
Pre-defined prompt templates:

```python
@server.prompt()
async def code_review_prompt(code: str, language: str) -> str:
    """Generate a code review prompt"""
    return f"""
    Please review the following {language} code:
    
    ```{language}
    {code}
    ```
    
    Focus on:
    1. Code quality
    2. Potential bugs
    3. Performance improvements
    """
```

### Transport Mechanisms

| Transport | Use Case | Pros | Cons |
|-----------|----------|------|------|
| **stdio** | Local processes | Simple, secure | Same machine only |
| **HTTP+SSE** | Remote servers | Network accessible | More complex |
| **WebSocket** | Real-time | Bidirectional | Connection overhead |

---

## 💻 Implementation Guide

### Setting Up an MCP Server (Python)

#### Installation

```bash
pip install mcp
```

#### Basic Server Structure

```python
"""
Basic MCP Server Implementation
"""

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent
import asyncio

# Create server instance
server = Server("my-mcp-server")

# ============================================
# DEFINE TOOLS
# ============================================

@server.tool()
async def calculate(operation: str, a: float, b: float) -> str:
    """
    Perform basic arithmetic operations.
    
    Args:
        operation: One of 'add', 'subtract', 'multiply', 'divide'
        a: First number
        b: Second number
    """
    operations = {
        "add": lambda x, y: x + y,
        "subtract": lambda x, y: x - y,
        "multiply": lambda x, y: x * y,
        "divide": lambda x, y: x / y if y != 0 else "Error: Division by zero"
    }
    
    if operation not in operations:
        return f"Unknown operation: {operation}"
    
    result = operations[operation](a, b)
    return f"{a} {operation} {b} = {result}"


@server.tool()
async def get_current_time(timezone: str = "UTC") -> str:
    """
    Get the current time in a specified timezone.
    
    Args:
        timezone: Timezone name (e.g., 'UTC', 'US/Pacific')
    """
    from datetime import datetime
    import pytz
    
    try:
        tz = pytz.timezone(timezone)
        current_time = datetime.now(tz)
        return current_time.strftime("%Y-%m-%d %H:%M:%S %Z")
    except Exception as e:
        return f"Error: {str(e)}"


@server.tool()
async def search_files(
    directory: str,
    pattern: str,
    max_results: int = 10
) -> list:
    """
    Search for files matching a pattern.
    
    Args:
        directory: Directory to search in
        pattern: Glob pattern to match
        max_results: Maximum number of results
    """
    import glob
    import os
    
    search_path = os.path.join(directory, "**", pattern)
    files = glob.glob(search_path, recursive=True)
    
    return files[:max_results]

# ============================================
# DEFINE RESOURCES
# ============================================

@server.resource("file://{path}")
async def read_file(path: str) -> str:
    """Read a file from the filesystem"""
    try:
        with open(path, 'r') as f:
            return f.read()
    except Exception as e:
        return f"Error reading file: {str(e)}"


@server.resource("config://settings")
async def get_config() -> str:
    """Get server configuration"""
    import json
    
    config = {
        "server_name": "my-mcp-server",
        "version": "1.0.0",
        "capabilities": ["tools", "resources", "prompts"]
    }
    return json.dumps(config, indent=2)

# ============================================
# DEFINE PROMPTS
# ============================================

@server.prompt()
async def summarize_prompt(text: str, style: str = "concise") -> str:
    """Generate a summarization prompt"""
    
    style_instructions = {
        "concise": "Provide a brief 2-3 sentence summary.",
        "detailed": "Provide a comprehensive summary with key points.",
        "bullet": "Provide a bullet-point summary."
    }
    
    instruction = style_instructions.get(style, style_instructions["concise"])
    
    return f"""
Please summarize the following text.

{instruction}

Text:
{text}

Summary:
"""

# ============================================
# RUN SERVER
# ============================================

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream)

if __name__ == "__main__":
    asyncio.run(main())
```

### Server with HTTP Transport

```python
"""
MCP Server with HTTP/SSE Transport
"""

from mcp.server import Server
from mcp.server.sse import SseServerTransport
from starlette.applications import Starlette
from starlette.routing import Route
import uvicorn

server = Server("http-mcp-server")

# Define tools...
@server.tool()
async def hello(name: str) -> str:
    """Say hello to someone"""
    return f"Hello, {name}!"

# Create SSE transport
sse = SseServerTransport("/messages")

# Create Starlette app
async def handle_sse(request):
    async with sse.connect_sse(
        request.scope, 
        request.receive, 
        request._send
    ) as streams:
        await server.run(
            streams[0], 
            streams[1], 
            server.create_initialization_options()
        )

app = Starlette(
    routes=[
        Route("/sse", endpoint=handle_sse),
        Route("/messages", endpoint=sse.handle_post_message, methods=["POST"]),
    ]
)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### MCP Client Implementation

```python
"""
MCP Client Implementation
"""

from mcp import ClientSession
from mcp.client.stdio import stdio_client
import asyncio

async def main():
    # Connect to MCP server
    async with stdio_client(
        command="python",
        args=["my_server.py"]
    ) as (read, write):
        async with ClientSession(read, write) as session:
            # Initialize connection
            await session.initialize()
            
            # List available tools
            tools = await session.list_tools()
            print("Available tools:")
            for tool in tools.tools:
                print(f"  - {tool.name}: {tool.description}")
            
            # Call a tool
            result = await session.call_tool(
                "calculate",
                arguments={
                    "operation": "multiply",
                    "a": 7,
                    "b": 6
                }
            )
            print(f"\nResult: {result.content[0].text}")
            
            # List resources
            resources = await session.list_resources()
            print("\nAvailable resources:")
            for resource in resources.resources:
                print(f"  - {resource.uri}")
            
            # Read a resource
            resource = await session.read_resource("config://settings")
            print(f"\nConfig: {resource.contents[0].text}")

if __name__ == "__main__":
    asyncio.run(main())
```

---

## 🌍 Real-World Use Cases

### 1. Code Assistant Integration

```python
"""
GitHub MCP Server - Access repositories, PRs, issues
"""

@server.tool()
async def get_pull_requests(
    repo: str,
    state: str = "open"
) -> list:
    """Get pull requests from a repository"""
    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"https://api.github.com/repos/{repo}/pulls",
            params={"state": state},
            headers={"Authorization": f"token {GITHUB_TOKEN}"}
        ) as resp:
            prs = await resp.json()
            return [
                {
                    "number": pr["number"],
                    "title": pr["title"],
                    "author": pr["user"]["login"],
                    "url": pr["html_url"]
                }
                for pr in prs
            ]
```

### 2. Database Access

```python
"""
Database MCP Server - Query databases safely
"""

@server.tool()
async def query_database(
    sql: str,
    params: dict = None
) -> list:
    """
    Execute a read-only SQL query.
    Only SELECT statements are allowed.
    """
    # Security: Only allow SELECT
    if not sql.strip().upper().startswith("SELECT"):
        raise ValueError("Only SELECT queries are allowed")
    
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(sql, *(params or {}).values())
        return [dict(row) for row in rows]
```

### 3. Document Search (RAG)

```python
"""
RAG MCP Server - Search documents semantically
"""

@server.tool()
async def search_documents(
    query: str,
    top_k: int = 5,
    filter_type: str = None
) -> list:
    """Search documents using semantic similarity"""
    
    # Embed query
    query_embedding = await embed(query)
    
    # Search vector store
    results = vectorstore.similarity_search(
        query_embedding,
        k=top_k,
        filter={"type": filter_type} if filter_type else None
    )
    
    return [
        {
            "content": doc.page_content,
            "source": doc.metadata["source"],
            "score": doc.score
        }
        for doc in results
    ]
```

### 4. Calendar Integration

```python
"""
Calendar MCP Server - Manage calendar events
"""

@server.tool()
async def create_event(
    title: str,
    start_time: str,
    end_time: str,
    attendees: list = None
) -> dict:
    """Create a calendar event"""
    
    event = {
        "summary": title,
        "start": {"dateTime": start_time},
        "end": {"dateTime": end_time},
        "attendees": [{"email": a} for a in (attendees or [])]
    }
    
    result = calendar_service.events().insert(
        calendarId="primary",
        body=event
    ).execute()
    
    return {
        "id": result["id"],
        "link": result["htmlLink"]
    }
```

---

## 🛠️ Hands-On Project

### Project: Build a File System MCP Server

Create an MCP server that allows LLMs to safely interact with the file system.

```python
"""
File System MCP Server
Allows controlled file system access for LLMs
"""

import os
import json
from pathlib import Path
from datetime import datetime
from mcp.server import Server
from mcp.server.stdio import stdio_server
import asyncio

# Configuration
ALLOWED_DIRECTORIES = [
    os.path.expanduser("~/Documents"),
    os.path.expanduser("~/Projects")
]

MAX_FILE_SIZE = 1024 * 1024  # 1MB

server = Server("filesystem-mcp")

# ============================================
# SECURITY HELPERS
# ============================================

def is_path_allowed(path: str) -> bool:
    """Check if path is within allowed directories"""
    abs_path = os.path.abspath(path)
    return any(
        abs_path.startswith(allowed) 
        for allowed in ALLOWED_DIRECTORIES
    )

def validate_path(path: str) -> str:
    """Validate and normalize path"""
    abs_path = os.path.abspath(path)
    
    if not is_path_allowed(abs_path):
        raise PermissionError(f"Access denied: {path}")
    
    return abs_path

# ============================================
# TOOLS
# ============================================

@server.tool()
async def list_directory(
    path: str,
    include_hidden: bool = False
) -> dict:
    """
    List contents of a directory.
    
    Args:
        path: Directory path to list
        include_hidden: Whether to include hidden files
    """
    validated_path = validate_path(path)
    
    if not os.path.isdir(validated_path):
        return {"error": f"Not a directory: {path}"}
    
    entries = []
    for entry in os.scandir(validated_path):
        if not include_hidden and entry.name.startswith('.'):
            continue
        
        stat = entry.stat()
        entries.append({
            "name": entry.name,
            "type": "directory" if entry.is_dir() else "file",
            "size": stat.st_size if entry.is_file() else None,
            "modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
        })
    
    return {
        "path": path,
        "entries": sorted(entries, key=lambda x: (x["type"] != "directory", x["name"]))
    }


@server.tool()
async def read_file(
    path: str,
    encoding: str = "utf-8"
) -> dict:
    """
    Read contents of a file.
    
    Args:
        path: File path to read
        encoding: File encoding (default: utf-8)
    """
    validated_path = validate_path(path)
    
    if not os.path.isfile(validated_path):
        return {"error": f"Not a file: {path}"}
    
    # Check file size
    size = os.path.getsize(validated_path)
    if size > MAX_FILE_SIZE:
        return {"error": f"File too large: {size} bytes (max: {MAX_FILE_SIZE})"}
    
    try:
        with open(validated_path, 'r', encoding=encoding) as f:
            content = f.read()
        
        return {
            "path": path,
            "size": size,
            "content": content
        }
    except UnicodeDecodeError:
        return {"error": f"Cannot decode file as {encoding}"}


@server.tool()
async def write_file(
    path: str,
    content: str,
    create_dirs: bool = False
) -> dict:
    """
    Write content to a file.
    
    Args:
        path: File path to write
        content: Content to write
        create_dirs: Create parent directories if needed
    """
    validated_path = validate_path(path)
    
    if create_dirs:
        os.makedirs(os.path.dirname(validated_path), exist_ok=True)
    
    with open(validated_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return {
        "path": path,
        "size": len(content),
        "message": "File written successfully"
    }


@server.tool()
async def search_files(
    directory: str,
    pattern: str = "*",
    content_search: str = None,
    max_results: int = 50
) -> dict:
    """
    Search for files in a directory.
    
    Args:
        directory: Directory to search
        pattern: Glob pattern (e.g., "*.py", "*.md")
        content_search: Optional string to search within files
        max_results: Maximum results to return
    """
    validated_path = validate_path(directory)
    
    matches = []
    path = Path(validated_path)
    
    for file_path in path.rglob(pattern):
        if len(matches) >= max_results:
            break
        
        if not file_path.is_file():
            continue
        
        # Check if within allowed directories
        if not is_path_allowed(str(file_path)):
            continue
        
        match_info = {
            "path": str(file_path),
            "name": file_path.name,
            "size": file_path.stat().st_size
        }
        
        # Content search if specified
        if content_search:
            try:
                content = file_path.read_text(encoding='utf-8')
                if content_search.lower() in content.lower():
                    # Find line numbers with matches
                    lines = []
                    for i, line in enumerate(content.split('\n'), 1):
                        if content_search.lower() in line.lower():
                            lines.append(i)
                    match_info["matching_lines"] = lines[:10]
                    matches.append(match_info)
            except:
                pass  # Skip binary/unreadable files
        else:
            matches.append(match_info)
    
    return {
        "directory": directory,
        "pattern": pattern,
        "content_search": content_search,
        "matches": matches,
        "total_found": len(matches)
    }


@server.tool()
async def get_file_info(path: str) -> dict:
    """
    Get detailed information about a file or directory.
    
    Args:
        path: Path to get info about
    """
    validated_path = validate_path(path)
    
    if not os.path.exists(validated_path):
        return {"error": f"Path does not exist: {path}"}
    
    stat = os.stat(validated_path)
    
    info = {
        "path": path,
        "name": os.path.basename(validated_path),
        "type": "directory" if os.path.isdir(validated_path) else "file",
        "size": stat.st_size,
        "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
        "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        "accessed": datetime.fromtimestamp(stat.st_atime).isoformat()
    }
    
    if os.path.isfile(validated_path):
        # Detect file type
        ext = os.path.splitext(validated_path)[1].lower()
        info["extension"] = ext
        
        mime_types = {
            ".py": "text/x-python",
            ".js": "text/javascript",
            ".json": "application/json",
            ".md": "text/markdown",
            ".txt": "text/plain",
            ".html": "text/html",
            ".css": "text/css"
        }
        info["mime_type"] = mime_types.get(ext, "application/octet-stream")
    
    return info

# ============================================
# RESOURCES
# ============================================

@server.resource("fs://allowed-paths")
async def get_allowed_paths() -> str:
    """Get list of allowed directory paths"""
    return json.dumps({
        "allowed_directories": ALLOWED_DIRECTORIES,
        "max_file_size": MAX_FILE_SIZE
    }, indent=2)

# ============================================
# RUN SERVER
# ============================================

async def main():
    print("Starting File System MCP Server...")
    print(f"Allowed directories: {ALLOWED_DIRECTORIES}")
    
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream)

if __name__ == "__main__":
    asyncio.run(main())
```

### Configuration for Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "python",
      "args": ["/path/to/filesystem_mcp.py"]
    }
  }
}
```

---

## ⚠️ Common Mistakes

### 1. Missing Error Handling

```python
# ❌ Bad - No error handling
@server.tool()
async def read_file(path: str) -> str:
    with open(path) as f:
        return f.read()

# ✅ Good - Proper error handling
@server.tool()
async def read_file(path: str) -> dict:
    try:
        with open(path) as f:
            return {"content": f.read(), "success": True}
    except FileNotFoundError:
        return {"error": "File not found", "success": False}
    except PermissionError:
        return {"error": "Permission denied", "success": False}
```

### 2. Security Vulnerabilities

```python
# ❌ Bad - Path traversal vulnerability
@server.tool()
async def read_file(path: str) -> str:
    return open(path).read()  # Can access ANY file!

# ✅ Good - Validate paths
@server.tool()
async def read_file(path: str) -> str:
    if not is_path_allowed(path):
        raise PermissionError("Access denied")
    return open(path).read()
```

### 3. Poor Tool Descriptions

```python
# ❌ Bad - Unclear description
@server.tool()
async def process(data: str) -> str:
    """Process data"""  # What kind of data? What processing?
    ...

# ✅ Good - Clear, detailed description
@server.tool()
async def analyze_sentiment(
    text: str,
    language: str = "en"
) -> dict:
    """
    Analyze the sentiment of text.
    
    Args:
        text: The text to analyze (max 5000 characters)
        language: Language code (en, es, fr, de)
    
    Returns:
        Dict with 'sentiment' (positive/negative/neutral),
        'confidence' (0-1), and 'keywords'
    """
    ...
```

### 4. Blocking Operations

```python
# ❌ Bad - Blocking I/O in async context
@server.tool()
async def fetch_data(url: str) -> str:
    import requests
    return requests.get(url).text  # Blocks!

# ✅ Good - Use async operations
@server.tool()
async def fetch_data(url: str) -> str:
    import aiohttp
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as resp:
            return await resp.text()
```

---

## 🎯 Interview Questions

### Q1: What is MCP and why was it created?

**Answer:**
MCP (Model Context Protocol) is a standardized, open protocol developed by Anthropic that enables AI models to securely connect with external data sources, tools, and services. 

It was created to solve:
1. **Fragmentation:** Every AI app had custom integrations
2. **Security concerns:** Uncontrolled tool access
3. **Scalability:** Hard to add new capabilities
4. **Interoperability:** Tools couldn't be shared across apps

MCP provides a "USB-C for AI" – one standard protocol for all integrations.

---

### Q2: Explain the MCP architecture components.

**Answer:**

| Component | Role | Example |
|-----------|------|---------|
| **Host** | Application containing LLM | Claude Desktop, VS Code |
| **Client** | Protocol handler (1:1 with server) | MCP Client library |
| **Server** | Exposes capabilities | GitHub server, DB server |

**Capabilities exposed by servers:**
- **Tools:** Functions LLM can call
- **Resources:** Data LLM can read
- **Prompts:** Pre-defined templates

---

### Q3: How does MCP handle security?

**Answer:**

MCP implements multiple security layers:

1. **Controlled Access:** Servers define exactly what's exposed
2. **Permission System:** Users approve tool usage
3. **Input Validation:** Servers validate all inputs
4. **Path Restrictions:** File access limited to allowed dirs
5. **Read-only Options:** Resources can be read-only
6. **Audit Logging:** All operations can be logged

```python
# Security pattern
def is_allowed(operation, resource):
    return (
        resource in ALLOWED_RESOURCES and
        operation in ALLOWED_OPERATIONS and
        user_has_permission(current_user, operation)
    )
```

---

### Q4: Compare MCP to function calling.

**Answer:**

| Aspect | Function Calling | MCP |
|--------|------------------|-----|
| **Scope** | Single LLM provider | Universal standard |
| **Discovery** | Static definitions | Dynamic discovery |
| **Security** | Provider-dependent | Built-in protocol |
| **State** | Stateless | Can maintain state |
| **Resources** | Functions only | Functions + data + prompts |
| **Ecosystem** | Closed | Open, interoperable |

MCP is a superset – it can wrap function calling but provides more structure.

---

### Q5: How would you design an MCP server for a production system?

**Answer:**

```
Production MCP Server Design
============================

1. SECURITY LAYER
   ├── Authentication (API keys, OAuth)
   ├── Authorization (role-based access)
   ├── Input validation
   └── Rate limiting

2. RESILIENCE
   ├── Error handling
   ├── Retries with backoff
   ├── Circuit breakers
   └── Graceful degradation

3. OBSERVABILITY
   ├── Structured logging
   ├── Metrics (Prometheus)
   ├── Tracing (OpenTelemetry)
   └── Alerting

4. SCALABILITY
   ├── Stateless design
   ├── Connection pooling
   ├── Caching layer
   └── Horizontal scaling

5. DEPLOYMENT
   ├── Container (Docker)
   ├── Health checks
   ├── Graceful shutdown
   └── Configuration management
```

---

## 📝 Homework

### Level 1: Basic
1. Install the MCP SDK and run a "hello world" server
2. Create a server with 3 different tools
3. Test your server with the MCP inspector

### Level 2: Intermediate
1. Build a weather MCP server that fetches real data
2. Add resources that expose configuration
3. Implement proper error handling

### Level 3: Advanced
1. Create a database MCP server with read-only access
2. Implement authentication for your server
3. Add logging and metrics

### Level 4: Expert
1. Build an MCP server that integrates with your company's APIs
2. Implement a caching layer for expensive operations
3. Deploy your server and connect it to Claude Desktop

---

## 🔗 Resources

- [MCP Official Documentation](https://modelcontextprotocol.io/)
- [MCP GitHub Repository](https://github.com/modelcontextprotocol)
- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Example MCP Servers](https://github.com/modelcontextprotocol/servers)

---

**Next:** [02-Ollama.md](./02-Ollama.md) - Running LLMs locally
