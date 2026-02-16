# 🎨 Streamlit Frontend for AI Apps

## 📚 Table of Contents
1. [Beginner Friendly Explanation](#-beginner-friendly-explanation)
2. [Streamlit Fundamentals](#-streamlit-fundamentals)
3. [Building Chat Interfaces](#-building-chat-interfaces)
4. [File Upload & Processing](#-file-upload--processing)
5. [Session State & Memory](#-session-state--memory)
6. [Styling & Layout](#-styling--layout)
7. [Integration with RAG](#-integration-with-rag)
8. [Deployment](#-deployment)
9. [Complete RAG Chat App](#-complete-rag-chat-app)
10. [Interview Questions](#-interview-questions)
11. [Homework](#-homework)

---

## 🔰 Beginner Friendly Explanation

### What is Streamlit?

```
Streamlit = Python → Web App in Minutes!

TRADITIONAL WAY:
┌──────────────────────────────────────────────────────────┐
│ To build a web app, you need:                            │
│ ├── HTML (structure)                                     │
│ ├── CSS (styling)                                        │
│ ├── JavaScript (interactivity)                          │
│ ├── Backend framework (Flask, FastAPI)                   │
│ ├── API endpoints                                        │
│ └── Frontend framework (React, Vue)                      │
│                                                          │
│ Time: Days to weeks                                      │
└──────────────────────────────────────────────────────────┘

STREAMLIT WAY:
┌──────────────────────────────────────────────────────────┐
│ Just Python!                                             │
│                                                          │
│   import streamlit as st                                │
│   st.title("My App")                                    │
│   name = st.text_input("Your name")                     │
│   st.write(f"Hello, {name}!")                           │
│                                                          │
│ Time: Minutes!                                          │
└──────────────────────────────────────────────────────────┘
```

### Why Streamlit for AI?

```
┌──────────────────────────────────────────────────────────┐
│             WHY STREAMLIT FOR AI APPS?                    │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ✅ PYTHON NATIVE                                         │
│     - Your ML code works directly                        │
│     - No translation to JavaScript                       │
│     - Import your models directly                        │
│                                                           │
│  ✅ BUILT-IN COMPONENTS                                   │
│     - Chat interface (st.chat_message)                   │
│     - File upload (st.file_uploader)                     │
│     - Progress bars, spinners                            │
│     - Data visualization                                 │
│                                                           │
│  ✅ FAST ITERATION                                        │
│     - Hot reload on save                                 │
│     - See changes instantly                              │
│     - Perfect for prototyping                            │
│                                                           │
│  ✅ FREE DEPLOYMENT                                       │
│     - Streamlit Cloud (free tier)                        │
│     - One-click deploy                                   │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

### How Streamlit Works

```
STREAMLIT EXECUTION MODEL:

┌─────────────────────────────────────────────────────────┐
│                                                          │
│  1. User visits app                                     │
│           │                                              │
│           ▼                                              │
│  2. Script runs TOP to BOTTOM                           │
│           │                                              │
│           ▼                                              │
│  3. UI renders in browser                               │
│           │                                              │
│           ▼                                              │
│  4. User interacts (button, input)                      │
│           │                                              │
│           ▼                                              │
│  5. Script RERUNS from top!                             │
│           │                                              │
│           ▼                                              │
│  6. State preserved via st.session_state                │
│                                                          │
└─────────────────────────────────────────────────────────┘

KEY INSIGHT: Every interaction reruns the script!
Use session_state to remember things between reruns.
```

---

## 🛠️ Streamlit Fundamentals

### Installation & Setup

```bash
# Install
pip install streamlit

# Run app
streamlit run app.py

# With custom port
streamlit run app.py --server.port 8080
```

### Basic Elements

```python
"""
Streamlit Basic Elements
"""

import streamlit as st

# ============================================
# TEXT ELEMENTS
# ============================================

st.title("My AI App")
st.header("Welcome")
st.subheader("Getting Started")
st.text("Plain text")
st.markdown("**Bold** and *italic*")
st.write("Write anything - auto-formatted!")

# Code
st.code("print('Hello')", language="python")

# Math (LaTeX)
st.latex(r"E = mc^2")

# ============================================
# INPUT ELEMENTS
# ============================================

# Text input
name = st.text_input("Your name", placeholder="Enter name...")

# Text area
description = st.text_area("Description", height=100)

# Number input
age = st.number_input("Age", min_value=0, max_value=120, value=25)

# Slider
rating = st.slider("Rating", 1, 10, 5)

# Select box
option = st.selectbox("Choose", ["Option A", "Option B", "Option C"])

# Multi-select
options = st.multiselect("Select multiple", ["A", "B", "C"])

# Checkbox
agree = st.checkbox("I agree")

# Radio
choice = st.radio("Pick one", ["Yes", "No", "Maybe"])

# Button
if st.button("Click me"):
    st.write("Clicked!")

# ============================================
# DISPLAY DATA
# ============================================

import pandas as pd

# DataFrame
df = pd.DataFrame({"A": [1, 2, 3], "B": [4, 5, 6]})
st.dataframe(df)

# Static table
st.table(df)

# Metrics
st.metric("Temperature", "70°F", "+2°F")

# JSON
st.json({"name": "John", "age": 30})

# ============================================
# MEDIA
# ============================================

# Image
st.image("image.png", caption="My image", width=300)

# Video
st.video("video.mp4")

# Audio
st.audio("audio.mp3")
```

### Layout

```python
"""
Streamlit Layout Options
"""

import streamlit as st

# ============================================
# COLUMNS
# ============================================

col1, col2, col3 = st.columns(3)

with col1:
    st.header("Column 1")
    st.write("Content here")

with col2:
    st.header("Column 2")
    st.button("Button in col 2")

with col3:
    st.header("Column 3")
    st.image("image.png")

# Unequal columns
left, right = st.columns([2, 1])  # 2:1 ratio

# ============================================
# SIDEBAR
# ============================================

with st.sidebar:
    st.title("Settings")
    option = st.selectbox("Choose", ["A", "B"])
    st.slider("Value", 0, 100)

# Or use st.sidebar.element()
st.sidebar.text_input("Search")

# ============================================
# EXPANDER
# ============================================

with st.expander("Click to expand"):
    st.write("Hidden content here!")
    st.code("secret_code = 42")

# ============================================
# TABS
# ============================================

tab1, tab2, tab3 = st.tabs(["Home", "Settings", "About"])

with tab1:
    st.write("Home content")

with tab2:
    st.write("Settings content")

with tab3:
    st.write("About content")

# ============================================
# CONTAINER
# ============================================

container = st.container()

# Add content out of order
container.write("This appears first")
st.write("This appears second")
container.write("This appears first too!")

# ============================================
# EMPTY (for dynamic content)
# ============================================

placeholder = st.empty()

# Update later
placeholder.text("Loading...")
# ... do something ...
placeholder.text("Done!")
```

---

## 💬 Building Chat Interfaces

### Basic Chat UI

```python
"""
Streamlit Chat Interface
"""

import streamlit as st

st.title("💬 Chat App")

# ============================================
# CHAT MESSAGE DISPLAY
# ============================================

# User message
with st.chat_message("user"):
    st.write("Hello, how are you?")

# Assistant message
with st.chat_message("assistant"):
    st.write("I'm doing great! How can I help?")

# Custom avatar
with st.chat_message("user", avatar="🧑"):
    st.write("Custom avatar!")

with st.chat_message("assistant", avatar="🤖"):
    st.write("Robot avatar!")

# ============================================
# CHAT INPUT
# ============================================

# Fixed at bottom of screen
user_input = st.chat_input("Type a message...")

if user_input:
    st.write(f"You said: {user_input}")
```

### Interactive Chat with History

```python
"""
Chat with History (Session State)
"""

import streamlit as st

st.title("💬 Interactive Chat")

# Initialize chat history
if "messages" not in st.session_state:
    st.session_state.messages = []

# Display chat history
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# Handle new input
if prompt := st.chat_input("Your message"):
    # Add user message to history
    st.session_state.messages.append({"role": "user", "content": prompt})
    
    # Display user message
    with st.chat_message("user"):
        st.markdown(prompt)
    
    # Generate response (replace with actual AI)
    response = f"You said: {prompt}"
    
    # Display assistant response
    with st.chat_message("assistant"):
        st.markdown(response)
    
    # Add to history
    st.session_state.messages.append({"role": "assistant", "content": response})
```

### Streaming Chat

```python
"""
Streaming Chat Response
"""

import streamlit as st
import time

st.title("💬 Streaming Chat")

if "messages" not in st.session_state:
    st.session_state.messages = []

# Display history
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# Chat input
if prompt := st.chat_input("Ask something..."):
    # Add user message
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)
    
    # Stream response
    with st.chat_message("assistant"):
        message_placeholder = st.empty()
        full_response = ""
        
        # Simulate streaming (replace with actual LLM)
        response_text = "This is a streaming response that appears word by word."
        
        for word in response_text.split():
            full_response += word + " "
            message_placeholder.markdown(full_response + "▌")
            time.sleep(0.1)
        
        message_placeholder.markdown(full_response)
    
    st.session_state.messages.append({
        "role": "assistant", 
        "content": full_response
    })
```

### Chat with OpenAI

```python
"""
Chat with OpenAI Integration
"""

import streamlit as st
from openai import OpenAI

st.title("🤖 ChatGPT Clone")

# API key input
if "openai_api_key" not in st.session_state:
    st.session_state.openai_api_key = ""

with st.sidebar:
    api_key = st.text_input("OpenAI API Key", type="password")
    if api_key:
        st.session_state.openai_api_key = api_key

# Check for API key
if not st.session_state.openai_api_key:
    st.info("Please enter your OpenAI API key in the sidebar.")
    st.stop()

# Initialize client
client = OpenAI(api_key=st.session_state.openai_api_key)

# Initialize messages
if "messages" not in st.session_state:
    st.session_state.messages = [
        {"role": "system", "content": "You are a helpful assistant."}
    ]

# Display chat (skip system message)
for message in st.session_state.messages[1:]:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# Handle input
if prompt := st.chat_input("Ask anything..."):
    # Add user message
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)
    
    # Stream response
    with st.chat_message("assistant"):
        message_placeholder = st.empty()
        full_response = ""
        
        stream = client.chat.completions.create(
            model="gpt-4",
            messages=st.session_state.messages,
            stream=True
        )
        
        for chunk in stream:
            if chunk.choices[0].delta.content:
                full_response += chunk.choices[0].delta.content
                message_placeholder.markdown(full_response + "▌")
        
        message_placeholder.markdown(full_response)
    
    st.session_state.messages.append({
        "role": "assistant",
        "content": full_response
    })
```

---

## 📁 File Upload & Processing

### Basic File Upload

```python
"""
File Upload Handling
"""

import streamlit as st

st.title("📁 File Upload")

# ============================================
# SINGLE FILE
# ============================================

uploaded_file = st.file_uploader("Choose a file")

if uploaded_file is not None:
    # File details
    st.write("**File details:**")
    st.write(f"- Name: {uploaded_file.name}")
    st.write(f"- Type: {uploaded_file.type}")
    st.write(f"- Size: {uploaded_file.size} bytes")
    
    # Read content
    if uploaded_file.type == "text/plain":
        content = uploaded_file.read().decode("utf-8")
        st.text_area("Content", content, height=200)

# ============================================
# MULTIPLE FILES
# ============================================

uploaded_files = st.file_uploader(
    "Choose multiple files",
    accept_multiple_files=True
)

for file in uploaded_files:
    st.write(f"Uploaded: {file.name}")

# ============================================
# SPECIFIC TYPES
# ============================================

pdf_file = st.file_uploader("Upload PDF", type=["pdf"])
image_file = st.file_uploader("Upload Image", type=["png", "jpg", "jpeg"])

if image_file:
    st.image(image_file, caption="Uploaded image")
```

### Document Processing for RAG

```python
"""
Document Processing for RAG Apps
"""

import streamlit as st
import tempfile
import os

st.title("📄 Document Q&A")

# Sidebar for uploads
with st.sidebar:
    st.header("📁 Upload Documents")
    
    uploaded_files = st.file_uploader(
        "Choose files",
        type=["pdf", "txt", "md"],
        accept_multiple_files=True
    )
    
    if uploaded_files and st.button("Process Documents"):
        with st.spinner("Processing..."):
            for file in uploaded_files:
                # Save to temp file
                with tempfile.NamedTemporaryFile(
                    delete=False, 
                    suffix=os.path.splitext(file.name)[1]
                ) as tmp:
                    tmp.write(file.getvalue())
                    tmp_path = tmp.name
                
                # Process (your RAG logic here)
                st.success(f"✅ Processed: {file.name}")
                
                # Cleanup
                os.unlink(tmp_path)
            
            st.session_state.documents_loaded = True

# Main area
if st.session_state.get("documents_loaded"):
    st.success("Documents loaded! Ask questions below.")
else:
    st.info("👈 Upload documents in the sidebar to get started")
```

---

## 🧠 Session State & Memory

### Understanding Session State

```python
"""
Session State - Persist Data Across Reruns
"""

import streamlit as st

# ============================================
# WITHOUT SESSION STATE (DON'T DO THIS)
# ============================================

# This resets every time!
# counter = 0  
# if st.button("Increment"):
#     counter += 1  # Always shows 1!
# st.write(counter)

# ============================================
# WITH SESSION STATE (CORRECT)
# ============================================

# Initialize
if "counter" not in st.session_state:
    st.session_state.counter = 0

# Update
if st.button("Increment"):
    st.session_state.counter += 1

# Display
st.write(f"Count: {st.session_state.counter}")

# ============================================
# DIFFERENT WAYS TO ACCESS
# ============================================

# Dictionary style
st.session_state["my_key"] = "value"

# Attribute style
st.session_state.my_key = "value"

# Check existence
if "my_key" in st.session_state:
    pass

# Delete
del st.session_state.my_key

# ============================================
# COMMON PATTERNS
# ============================================

# Initialize multiple values
defaults = {
    "messages": [],
    "user_name": "",
    "settings": {"theme": "dark"}
}

for key, value in defaults.items():
    if key not in st.session_state:
        st.session_state[key] = value

# Reset functionality
if st.button("Reset All"):
    for key in list(st.session_state.keys()):
        del st.session_state[key]
    st.rerun()
```

### Callbacks

```python
"""
Callbacks for State Updates
"""

import streamlit as st

# ============================================
# BUTTON CALLBACK
# ============================================

def increment():
    st.session_state.count += 1

if "count" not in st.session_state:
    st.session_state.count = 0

st.button("Increment", on_click=increment)
st.write(f"Count: {st.session_state.count}")

# ============================================
# INPUT CALLBACK WITH ARGS
# ============================================

def update_name(prefix):
    st.session_state.full_name = f"{prefix} {st.session_state.name_input}"

st.text_input(
    "Enter name",
    key="name_input",
    on_change=update_name,
    args=("Mr.",)
)

if "full_name" in st.session_state:
    st.write(f"Full name: {st.session_state.full_name}")

# ============================================
# FORM WITH CALLBACK
# ============================================

def submit_form():
    st.session_state.submitted = True
    st.session_state.form_data = {
        "name": st.session_state.form_name,
        "email": st.session_state.form_email
    }

with st.form("my_form"):
    st.text_input("Name", key="form_name")
    st.text_input("Email", key="form_email")
    st.form_submit_button("Submit", on_click=submit_form)

if st.session_state.get("submitted"):
    st.success(f"Submitted: {st.session_state.form_data}")
```

---

## 🎨 Styling & Layout

### Custom Styling

```python
"""
Streamlit Styling
"""

import streamlit as st

# ============================================
# PAGE CONFIG (Must be first!)
# ============================================

st.set_page_config(
    page_title="My AI App",
    page_icon="🤖",
    layout="wide",  # or "centered"
    initial_sidebar_state="expanded",  # or "collapsed"
    menu_items={
        "Get Help": "https://help.example.com",
        "Report a bug": "https://bugs.example.com",
        "About": "My awesome AI app!"
    }
)

# ============================================
# CUSTOM CSS
# ============================================

st.markdown("""
<style>
    /* Hide Streamlit branding */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    
    /* Custom button */
    .stButton > button {
        background-color: #4CAF50;
        color: white;
        border-radius: 10px;
        padding: 10px 20px;
    }
    
    /* Chat message styling */
    .stChatMessage {
        border-radius: 15px;
        padding: 10px;
    }
    
    /* Custom header */
    .custom-header {
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        padding: 20px;
        border-radius: 10px;
        color: white;
        text-align: center;
    }
</style>
""", unsafe_allow_html=True)

# Use custom CSS class
st.markdown('<div class="custom-header"><h1>Welcome!</h1></div>', unsafe_allow_html=True)

# ============================================
# COLORED ELEMENTS
# ============================================

# Colored text (limited colors)
st.markdown(":red[Red text]")
st.markdown(":blue[Blue text]")
st.markdown(":green[Green text]")
st.markdown(":orange[Orange text]")

# Colored backgrounds
st.success("Success message")  # Green
st.info("Info message")        # Blue
st.warning("Warning message")  # Yellow
st.error("Error message")      # Red
```

### Progress & Status

```python
"""
Progress Indicators
"""

import streamlit as st
import time

# ============================================
# SPINNER
# ============================================

with st.spinner("Loading..."):
    time.sleep(2)  # Simulate work
st.success("Done!")

# ============================================
# PROGRESS BAR
# ============================================

progress_bar = st.progress(0)

for i in range(100):
    time.sleep(0.01)
    progress_bar.progress(i + 1)

# ============================================
# STATUS
# ============================================

with st.status("Downloading data...", expanded=True) as status:
    st.write("Searching for data...")
    time.sleep(1)
    st.write("Found data!")
    time.sleep(1)
    st.write("Downloading...")
    time.sleep(1)
    status.update(label="Download complete!", state="complete", expanded=False)

# ============================================
# TOAST (Temporary notification)
# ============================================

st.toast("This is a toast!", icon="🎉")

# ============================================
# BALLOONS & SNOW
# ============================================

if st.button("Celebrate"):
    st.balloons()

if st.button("Winter"):
    st.snow()
```

---

## 🔗 Integration with RAG

### RAG Chat Interface

```python
"""
Complete RAG Chat Interface
"""

import streamlit as st
import requests

# Config
API_URL = "http://localhost:8000"

# Page setup
st.set_page_config(
    page_title="Document Q&A",
    page_icon="📚",
    layout="wide"
)

# ============================================
# SIDEBAR - Document Management
# ============================================

with st.sidebar:
    st.title("📄 Document Manager")
    st.markdown("---")
    
    # File upload
    uploaded_files = st.file_uploader(
        "Upload Documents",
        type=["pdf", "txt", "md"],
        accept_multiple_files=True
    )
    
    col1, col2 = st.columns(2)
    
    with col1:
        if st.button("📤 Upload", use_container_width=True):
            if uploaded_files:
                with st.spinner("Processing..."):
                    for file in uploaded_files:
                        files = {"file": (file.name, file.getvalue())}
                        response = requests.post(f"{API_URL}/upload", files=files)
                        
                        if response.status_code == 200:
                            st.success(f"✅ {file.name}")
                        else:
                            st.error(f"❌ {file.name}")
    
    with col2:
        if st.button("🗑️ Clear", use_container_width=True):
            requests.delete(f"{API_URL}/documents")
            st.session_state.messages = []
            st.rerun()
    
    st.markdown("---")
    
    # Settings
    st.subheader("⚙️ Settings")
    
    st.session_state.num_results = st.slider(
        "Results to retrieve",
        min_value=1,
        max_value=10,
        value=4
    )
    
    st.session_state.show_sources = st.checkbox(
        "Show sources",
        value=True
    )

# ============================================
# MAIN CHAT AREA
# ============================================

st.title("💬 Document Q&A")
st.caption("Ask questions about your uploaded documents")

# Initialize messages
if "messages" not in st.session_state:
    st.session_state.messages = []

# Display chat history
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])
        
        # Show sources if available
        if message.get("sources") and st.session_state.show_sources:
            with st.expander("📚 Sources"):
                for i, source in enumerate(message["sources"], 1):
                    st.markdown(f"**Source {i}:**")
                    st.markdown(f"> {source['content']}")
                    st.caption(f"File: {source.get('metadata', {}).get('source', 'Unknown')}")

# Chat input
if question := st.chat_input("Ask a question about your documents..."):
    # Add user message
    st.session_state.messages.append({
        "role": "user",
        "content": question
    })
    
    with st.chat_message("user"):
        st.markdown(question)
    
    # Get response
    with st.chat_message("assistant"):
        with st.spinner("Thinking..."):
            try:
                response = requests.post(
                    f"{API_URL}/ask",
                    json={
                        "question": question,
                        "k": st.session_state.num_results
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    answer = result["answer"]
                    sources = result.get("sources", [])
                    
                    st.markdown(answer)
                    
                    if sources and st.session_state.show_sources:
                        with st.expander("📚 Sources"):
                            for i, source in enumerate(sources, 1):
                                st.markdown(f"**Source {i}:**")
                                st.markdown(f"> {source['content']}")
                    
                    # Save to history
                    st.session_state.messages.append({
                        "role": "assistant",
                        "content": answer,
                        "sources": sources
                    })
                else:
                    st.error(f"Error: {response.json().get('detail', 'Unknown error')}")
            
            except requests.exceptions.ConnectionError:
                st.error("Cannot connect to API. Is the server running?")
```

---

## 🚀 Deployment

### Streamlit Cloud

```python
"""
Preparing for Streamlit Cloud Deployment
"""

# 1. Create requirements.txt
"""
streamlit==1.32.0
openai==1.12.0
langchain==0.1.0
chromadb==0.4.22
python-dotenv==1.0.0
"""

# 2. Create .streamlit/config.toml
"""
[theme]
primaryColor = "#4CAF50"
backgroundColor = "#FFFFFF"
secondaryBackgroundColor = "#F0F2F6"
textColor = "#262730"
font = "sans serif"

[server]
maxUploadSize = 50
"""

# 3. Create .streamlit/secrets.toml (for local testing)
"""
OPENAI_API_KEY = "sk-..."
"""

# 4. Access secrets in code
import streamlit as st

api_key = st.secrets["OPENAI_API_KEY"]

# 5. Push to GitHub, connect to Streamlit Cloud
# https://streamlit.io/cloud
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY . .

# Expose port
EXPOSE 8501

# Run
CMD ["streamlit", "run", "app.py", "--server.port=8501", "--server.address=0.0.0.0"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  streamlit:
    build: .
    ports:
      - "8501:8501"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./data:/app/data
```

---

## 🎯 Complete RAG Chat App

```python
"""
Complete RAG Chat Application
All-in-one Streamlit app with embedded RAG
"""

import streamlit as st
import os
import tempfile
from typing import List

# LangChain imports
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# ============================================
# PAGE CONFIG
# ============================================

st.set_page_config(
    page_title="📚 DocChat",
    page_icon="📚",
    layout="wide"
)

# ============================================
# INITIALIZATION
# ============================================

@st.cache_resource
def init_embeddings():
    return OpenAIEmbeddings()

@st.cache_resource
def init_llm():
    return ChatOpenAI(model="gpt-4", temperature=0)

def init_session_state():
    defaults = {
        "messages": [],
        "vectorstore": None,
        "documents_loaded": False
    }
    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value

init_session_state()

# ============================================
# DOCUMENT PROCESSING
# ============================================

def process_documents(files) -> int:
    """Process uploaded documents and create vector store"""
    
    all_docs = []
    
    for file in files:
        # Save to temp
        ext = os.path.splitext(file.name)[1].lower()
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp.write(file.getvalue())
            tmp_path = tmp.name
        
        try:
            # Load
            if ext == ".pdf":
                loader = PyPDFLoader(tmp_path)
            else:
                loader = TextLoader(tmp_path)
            
            docs = loader.load()
            
            # Add source metadata
            for doc in docs:
                doc.metadata["source"] = file.name
            
            all_docs.extend(docs)
        finally:
            os.unlink(tmp_path)
    
    # Split
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )
    chunks = splitter.split_documents(all_docs)
    
    # Create vector store
    st.session_state.vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=init_embeddings()
    )
    
    st.session_state.documents_loaded = True
    
    return len(chunks)

# ============================================
# RAG CHAIN
# ============================================

def get_answer(question: str) -> dict:
    """Get answer using RAG"""
    
    if not st.session_state.vectorstore:
        return {"answer": "Please upload documents first.", "sources": []}
    
    # Retrieve
    retriever = st.session_state.vectorstore.as_retriever(
        search_kwargs={"k": 4}
    )
    docs = retriever.invoke(question)
    
    if not docs:
        return {"answer": "I couldn't find relevant information.", "sources": []}
    
    # Format context
    context = "\n\n".join(doc.page_content for doc in docs)
    
    # Generate
    prompt = ChatPromptTemplate.from_template("""
Answer based on the context below. If unsure, say so.

Context:
{context}

Question: {question}

Answer:
""")
    
    chain = prompt | init_llm() | StrOutputParser()
    answer = chain.invoke({"context": context, "question": question})
    
    sources = [
        {
            "content": doc.page_content[:200] + "...",
            "source": doc.metadata.get("source", "Unknown")
        }
        for doc in docs
    ]
    
    return {"answer": answer, "sources": sources}

# ============================================
# SIDEBAR
# ============================================

with st.sidebar:
    st.title("📚 DocChat")
    st.markdown("Chat with your documents!")
    st.markdown("---")
    
    # API Key
    api_key = st.text_input("OpenAI API Key", type="password")
    if api_key:
        os.environ["OPENAI_API_KEY"] = api_key
    
    st.markdown("---")
    
    # File upload
    st.subheader("📄 Upload Documents")
    
    uploaded_files = st.file_uploader(
        "Choose files",
        type=["pdf", "txt"],
        accept_multiple_files=True,
        label_visibility="collapsed"
    )
    
    if uploaded_files:
        if st.button("🚀 Process Documents", use_container_width=True):
            if not api_key:
                st.error("Please enter API key first!")
            else:
                with st.spinner("Processing..."):
                    chunks = process_documents(uploaded_files)
                    st.success(f"✅ Created {chunks} chunks!")
    
    if st.session_state.documents_loaded:
        st.success("📚 Documents loaded!")
        
        if st.button("🗑️ Clear All", use_container_width=True):
            st.session_state.vectorstore = None
            st.session_state.documents_loaded = False
            st.session_state.messages = []
            st.rerun()
    
    st.markdown("---")
    st.caption("Built with Streamlit + LangChain")

# ============================================
# MAIN CHAT AREA
# ============================================

st.title("💬 Chat with Documents")

if not api_key:
    st.warning("👈 Please enter your OpenAI API key in the sidebar")
    st.stop()

if not st.session_state.documents_loaded:
    st.info("👈 Upload documents to get started!")
    st.stop()

# Display messages
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])
        
        if message.get("sources"):
            with st.expander("📚 Sources"):
                for source in message["sources"]:
                    st.markdown(f"**{source['source']}**")
                    st.markdown(f"> {source['content']}")

# Chat input
if question := st.chat_input("Ask about your documents..."):
    # User message
    st.session_state.messages.append({"role": "user", "content": question})
    with st.chat_message("user"):
        st.markdown(question)
    
    # Assistant response
    with st.chat_message("assistant"):
        with st.spinner("Thinking..."):
            result = get_answer(question)
            
            st.markdown(result["answer"])
            
            if result["sources"]:
                with st.expander("📚 Sources"):
                    for source in result["sources"]:
                        st.markdown(f"**{source['source']}**")
                        st.markdown(f"> {source['content']}")
            
            st.session_state.messages.append({
                "role": "assistant",
                "content": result["answer"],
                "sources": result["sources"]
            })
```

---

## ❓ Interview Questions

### Beginner Level

**Q1: What is Streamlit and why use it?**

> **A:** Streamlit is a Python framework for building web apps quickly. Benefits:
> - Pure Python (no HTML/CSS/JS needed)
> - Built-in components for AI apps
> - Hot reload for fast development
> - Easy deployment

**Q2: What is session_state and why is it needed?**

> **A:** session_state persists data between reruns. Streamlit reruns the entire script on every interaction, so without session_state, variables reset. Use it for chat history, user settings, loaded data, etc.

### Intermediate Level

**Q3: How do you handle file uploads in Streamlit?**

> **A:** Use `st.file_uploader()`. For processing:
> 1. Save to temp file
> 2. Process with appropriate loader
> 3. Clean up temp file
> 
> For multiple files, use `accept_multiple_files=True`.

**Q4: How do you implement streaming chat responses?**

> **A:** Use `st.empty()` placeholder:
> 1. Create placeholder with `st.empty()`
> 2. Update progressively with `placeholder.markdown()`
> 3. For LLMs, iterate over streaming response
> 4. Add cursor character during streaming

### Advanced Level

**Q5: How do you optimize Streamlit for production?**

> **A:** Optimizations:
> - Use `@st.cache_resource` for heavy objects (models, DB connections)
> - Use `@st.cache_data` for data transformations
> - Minimize reruns with callbacks
> - Use separate backend API for heavy processing
> - Configure resource limits in deployment

---

## 📝 Homework

### Easy
1. Create a basic chat interface
2. Add file upload functionality
3. Implement session state for chat history

### Medium
4. Build a multi-page Streamlit app
5. Add custom CSS styling
6. Integrate with OpenAI API

### Hard
7. Build complete RAG chat with sources
8. Add document management sidebar
9. Deploy to Streamlit Cloud

---

## 🎯 Key Takeaways

```
Streamlit Essentials:
├── Python-native web framework
├── Script reruns on every interaction
├── session_state for persistence
└── Built-in chat components

Best Practices:
├── Use session_state for all persistent data
├── Cache expensive operations
├── Separate UI from logic
├── Handle errors gracefully
└── Test locally before deploying

For RAG Apps:
├── Sidebar for document management
├── Chat interface for Q&A
├── Show sources with expanders
├── Stream responses for UX
└── Clear error messages
```

---

**Next:** [05-End-to-End-Chatbot.md](./05-End-to-End-Chatbot.md) - Build a complete production chatbot! 🤖
