# 🖼️ Multimodal Applications

## 📚 Table of Contents
1. [Beginner Friendly Explanation](#-beginner-friendly-explanation)
2. [Multimodal AI Overview](#-multimodal-ai-overview)
3. [Vision + Language Models](#-vision--language-models)
4. [Image Understanding](#-image-understanding)
5. [Audio Processing](#-audio-processing)
6. [Video Analysis](#-video-analysis)
7. [Building Multimodal RAG](#-building-multimodal-rag)
8. [Complete Multimodal App](#-complete-multimodal-app)
9. [Interview Questions](#-interview-questions)
10. [Homework](#-homework)

---

## 🔰 Beginner Friendly Explanation

### What is Multimodal AI?

```
UNIMODAL AI (One type of data):
┌──────────────────────────────────────────────────────────┐
│                                                           │
│  TEXT ONLY:     "What is in the image?" → "I can't see"  │
│                                                           │
│  IMAGE ONLY:    [Image] → "Object detected: car"         │
│                                                           │
│  AUDIO ONLY:    [Audio] → "Speech: Hello world"          │
│                                                           │
└──────────────────────────────────────────────────────────┘

MULTIMODAL AI (Multiple types together):
┌──────────────────────────────────────────────────────────┐
│                                                           │
│  IMAGE + TEXT:                                           │
│  ┌─────────┐                                             │
│  │  [Dog   │  +  "What breed is this?" →                │
│  │  photo] │     "This is a Golden Retriever,           │
│  └─────────┘      approximately 3 years old"            │
│                                                           │
│  AUDIO + TEXT:                                           │
│  [Meeting audio] + "Summarize" → "Key decisions were..." │
│                                                           │
│  VIDEO + TEXT:                                           │
│  [Product video] + "Extract features" → "Features: ..."  │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

### Real-World Analogy

```
Think of how HUMANS understand the world:

We don't just SEE or just HEAR...
We combine everything!

WATCHING A MOVIE:
├── See the actors (vision)
├── Hear dialogue (audio)
├── Read subtitles (text)
└── Understand the story (combined reasoning)

MULTIMODAL AI does the same:
├── Process images
├── Process audio
├── Process text
└── Reason across ALL inputs together!
```

### Types of Multimodal Tasks

| Task | Inputs | Output |
|------|--------|--------|
| **Visual QA** | Image + Question | Text answer |
| **Image Captioning** | Image | Text description |
| **Image Generation** | Text prompt | Image |
| **Speech-to-Text** | Audio | Text transcript |
| **Text-to-Speech** | Text | Audio |
| **Video Understanding** | Video + Question | Text answer |
| **Document AI** | Document image | Structured data |

---

## 🎯 Multimodal AI Overview

### Architecture Patterns

```
MULTIMODAL ARCHITECTURE PATTERNS:

1. FUSION MODEL (Single model, multiple inputs)
┌──────────────────────────────────────────────────────┐
│                                                       │
│  Image ──┐                                           │
│          │    ┌────────────────┐                     │
│  Text ───┼───►│ FUSION MODEL   │───► Output         │
│          │    │ (GPT-4V, etc.) │                     │
│  Audio ──┘    └────────────────┘                     │
│                                                       │
└──────────────────────────────────────────────────────┘

2. PIPELINE (Multiple specialized models)
┌──────────────────────────────────────────────────────┐
│                                                       │
│  Image ──► [Vision Model] ──► Description ──┐        │
│                                              │        │
│  Audio ──► [Speech Model] ──► Transcript ───┼──► LLM │
│                                              │        │
│  Text ──────────────────────────────────────┘        │
│                                                       │
└──────────────────────────────────────────────────────┘

3. EMBEDDING SPACE (CLIP-style)
┌──────────────────────────────────────────────────────┐
│                                                       │
│  Image ──► [Image Encoder] ──► Embedding ──┐         │
│                                             │         │
│                              Shared Space ──┼──► Match│
│                                             │         │
│  Text ───► [Text Encoder] ───► Embedding ──┘         │
│                                                       │
└──────────────────────────────────────────────────────┘
```

### Key Models

| Model | Company | Capabilities |
|-------|---------|--------------|
| **GPT-4V** | OpenAI | Image understanding, text |
| **GPT-4o** | OpenAI | Vision, audio, text (omni) |
| **Claude 3** | Anthropic | Image understanding, text |
| **Gemini** | Google | Native multimodal |
| **CLIP** | OpenAI | Image-text matching |
| **Whisper** | OpenAI | Speech-to-text |
| **LLaVA** | Open Source | Vision-language |

---

## 👁️ Vision + Language Models

### Using GPT-4 Vision

```python
"""
GPT-4 Vision (GPT-4V) for Image Understanding
"""

from openai import OpenAI
import base64

client = OpenAI()

# ============================================
# METHOD 1: URL-based image
# ============================================

def analyze_image_url(image_url: str, question: str) -> str:
    """Analyze image from URL"""
    
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": question},
                    {
                        "type": "image_url",
                        "image_url": {"url": image_url}
                    }
                ]
            }
        ],
        max_tokens=500
    )
    
    return response.choices[0].message.content

# Example
result = analyze_image_url(
    "https://example.com/cat.jpg",
    "What breed of cat is this? Describe its features."
)
print(result)

# ============================================
# METHOD 2: Base64 encoded image
# ============================================

def encode_image(image_path: str) -> str:
    """Encode image to base64"""
    with open(image_path, "rb") as f:
        return base64.standard_b64encode(f.read()).decode("utf-8")

def analyze_image_file(image_path: str, question: str) -> str:
    """Analyze local image file"""
    
    base64_image = encode_image(image_path)
    
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": question},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64_image}"
                        }
                    }
                ]
            }
        ],
        max_tokens=500
    )
    
    return response.choices[0].message.content

# ============================================
# METHOD 3: Multiple images
# ============================================

def compare_images(image_urls: list, question: str) -> str:
    """Compare multiple images"""
    
    content = [{"type": "text", "text": question}]
    
    for url in image_urls:
        content.append({
            "type": "image_url",
            "image_url": {"url": url}
        })
    
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": content}],
        max_tokens=500
    )
    
    return response.choices[0].message.content

# Example: Compare products
result = compare_images(
    [
        "https://example.com/product1.jpg",
        "https://example.com/product2.jpg"
    ],
    "Compare these two products. Which one appears higher quality?"
)
```

### Using Claude Vision

```python
"""
Claude 3 Vision for Image Understanding
"""

import anthropic
import base64

client = anthropic.Anthropic()

def analyze_with_claude(image_path: str, question: str) -> str:
    """Analyze image with Claude 3"""
    
    # Read and encode image
    with open(image_path, "rb") as f:
        image_data = base64.standard_b64encode(f.read()).decode("utf-8")
    
    # Determine media type
    if image_path.endswith(".png"):
        media_type = "image/png"
    elif image_path.endswith(".gif"):
        media_type = "image/gif"
    else:
        media_type = "image/jpeg"
    
    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": image_data
                        }
                    },
                    {
                        "type": "text",
                        "text": question
                    }
                ]
            }
        ]
    )
    
    return message.content[0].text
```

---

## 🖼️ Image Understanding

### Document Analysis

```python
"""
Document AI - Extract information from documents
"""

from openai import OpenAI
import base64

client = OpenAI()

def extract_from_document(image_path: str) -> dict:
    """Extract structured data from document image"""
    
    base64_image = encode_image(image_path)
    
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": """Extract all text and structured information from this document.
                        
Return as JSON with:
- document_type: (invoice, receipt, form, etc.)
- extracted_text: full text content
- key_fields: important fields like dates, amounts, names
- tables: any tabular data"""
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64_image}"
                        }
                    }
                ]
            }
        ],
        response_format={"type": "json_object"},
        max_tokens=2000
    )
    
    import json
    return json.loads(response.choices[0].message.content)

# ============================================
# INVOICE EXTRACTION
# ============================================

def extract_invoice(image_path: str) -> dict:
    """Extract invoice information"""
    
    base64_image = encode_image(image_path)
    
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": "You are an invoice data extraction expert."
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": """Extract from this invoice:
- invoice_number
- date
- vendor_name
- vendor_address
- customer_name
- line_items (list of items with description, quantity, unit_price, total)
- subtotal
- tax
- total

Return as JSON."""
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64_image}"
                        }
                    }
                ]
            }
        ],
        response_format={"type": "json_object"},
        max_tokens=1500
    )
    
    import json
    return json.loads(response.choices[0].message.content)
```

### CLIP for Image Search

```python
"""
CLIP - Image-Text Matching for Search
"""

import torch
from PIL import Image
from transformers import CLIPProcessor, CLIPModel
import numpy as np

# Load model
model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

# ============================================
# TEXT-TO-IMAGE SEARCH
# ============================================

def get_text_embedding(text: str) -> np.ndarray:
    """Get CLIP embedding for text"""
    
    inputs = processor(text=[text], return_tensors="pt", padding=True)
    
    with torch.no_grad():
        text_features = model.get_text_features(**inputs)
    
    # Normalize
    text_features = text_features / text_features.norm(dim=-1, keepdim=True)
    
    return text_features.numpy()[0]

def get_image_embedding(image_path: str) -> np.ndarray:
    """Get CLIP embedding for image"""
    
    image = Image.open(image_path)
    inputs = processor(images=image, return_tensors="pt")
    
    with torch.no_grad():
        image_features = model.get_image_features(**inputs)
    
    # Normalize
    image_features = image_features / image_features.norm(dim=-1, keepdim=True)
    
    return image_features.numpy()[0]

def search_images(query: str, image_embeddings: list, image_paths: list, top_k: int = 5):
    """Search images by text query"""
    
    # Get query embedding
    query_embedding = get_text_embedding(query)
    
    # Calculate similarities
    similarities = []
    for img_emb in image_embeddings:
        sim = np.dot(query_embedding, img_emb)
        similarities.append(sim)
    
    # Sort by similarity
    indices = np.argsort(similarities)[::-1][:top_k]
    
    results = []
    for idx in indices:
        results.append({
            "path": image_paths[idx],
            "similarity": similarities[idx]
        })
    
    return results

# ============================================
# USAGE
# ============================================

# Index images
image_paths = ["cat.jpg", "dog.jpg", "car.jpg", "beach.jpg"]
image_embeddings = [get_image_embedding(p) for p in image_paths]

# Search
results = search_images("a cute pet", image_embeddings, image_paths)
print(results)
# [{"path": "cat.jpg", "similarity": 0.89}, {"path": "dog.jpg", "similarity": 0.85}]
```

---

## 🎤 Audio Processing

### Speech-to-Text with Whisper

```python
"""
Whisper - Speech Recognition
"""

from openai import OpenAI

client = OpenAI()

# ============================================
# BASIC TRANSCRIPTION
# ============================================

def transcribe_audio(audio_path: str) -> str:
    """Transcribe audio file"""
    
    with open(audio_path, "rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file
        )
    
    return transcript.text

# ============================================
# WITH TIMESTAMPS
# ============================================

def transcribe_with_timestamps(audio_path: str) -> dict:
    """Transcribe with word-level timestamps"""
    
    with open(audio_path, "rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="verbose_json",
            timestamp_granularities=["word"]
        )
    
    return transcript

# ============================================
# TRANSLATION (Other languages to English)
# ============================================

def translate_audio(audio_path: str) -> str:
    """Translate audio to English"""
    
    with open(audio_path, "rb") as audio_file:
        translation = client.audio.translations.create(
            model="whisper-1",
            file=audio_file
        )
    
    return translation.text

# ============================================
# LOCAL WHISPER (No API)
# ============================================

import whisper

def local_transcribe(audio_path: str, model_size: str = "base") -> dict:
    """Transcribe using local Whisper model"""
    
    model = whisper.load_model(model_size)  # tiny, base, small, medium, large
    
    result = model.transcribe(audio_path)
    
    return {
        "text": result["text"],
        "segments": result["segments"],
        "language": result["language"]
    }
```

### Text-to-Speech

```python
"""
Text-to-Speech with OpenAI
"""

from openai import OpenAI
from pathlib import Path

client = OpenAI()

# ============================================
# BASIC TTS
# ============================================

def text_to_speech(text: str, output_path: str, voice: str = "alloy") -> str:
    """Convert text to speech"""
    
    # Voices: alloy, echo, fable, onyx, nova, shimmer
    
    response = client.audio.speech.create(
        model="tts-1",  # or tts-1-hd for higher quality
        voice=voice,
        input=text
    )
    
    response.stream_to_file(output_path)
    return output_path

# ============================================
# STREAMING TTS
# ============================================

def stream_speech(text: str):
    """Stream speech audio"""
    
    response = client.audio.speech.create(
        model="tts-1",
        voice="nova",
        input=text
    )
    
    # Stream to audio player
    for chunk in response.iter_bytes():
        yield chunk

# ============================================
# USAGE
# ============================================

# Generate speech
text_to_speech(
    "Hello! Welcome to our AI assistant.",
    "welcome.mp3",
    voice="nova"
)
```

### Audio Q&A Pipeline

```python
"""
Audio Question Answering Pipeline
"""

from openai import OpenAI
import tempfile

client = OpenAI()

class AudioQA:
    """Answer questions from audio content"""
    
    def __init__(self):
        self.transcripts = {}
    
    def process_audio(self, audio_path: str, audio_id: str) -> str:
        """Transcribe and store audio"""
        
        with open(audio_path, "rb") as f:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=f
            )
        
        self.transcripts[audio_id] = transcript.text
        return transcript.text
    
    def ask(self, audio_id: str, question: str) -> str:
        """Ask question about audio content"""
        
        if audio_id not in self.transcripts:
            return "Audio not found. Please process the audio first."
        
        transcript = self.transcripts[audio_id]
        
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {
                    "role": "system",
                    "content": "Answer questions based on the audio transcript provided."
                },
                {
                    "role": "user",
                    "content": f"""Transcript:
{transcript}

Question: {question}

Answer:"""
                }
            ]
        )
        
        return response.choices[0].message.content
    
    def summarize(self, audio_id: str) -> str:
        """Summarize audio content"""
        
        return self.ask(audio_id, "Provide a concise summary of the main points discussed.")

# Usage
qa = AudioQA()
qa.process_audio("meeting.mp3", "meeting-001")
summary = qa.summarize("meeting-001")
answer = qa.ask("meeting-001", "What action items were discussed?")
```

---

## 🎬 Video Analysis

### Frame Extraction

```python
"""
Video Analysis - Extract and analyze frames
"""

import cv2
import base64
from openai import OpenAI
import tempfile

client = OpenAI()

# ============================================
# FRAME EXTRACTION
# ============================================

def extract_frames(video_path: str, interval_seconds: int = 5) -> list:
    """Extract frames at regular intervals"""
    
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_interval = int(fps * interval_seconds)
    
    frames = []
    frame_count = 0
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        
        if frame_count % frame_interval == 0:
            # Convert to RGB
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Encode to base64
            _, buffer = cv2.imencode('.jpg', frame)
            base64_frame = base64.standard_b64encode(buffer).decode('utf-8')
            
            frames.append({
                "timestamp": frame_count / fps,
                "base64": base64_frame
            })
        
        frame_count += 1
    
    cap.release()
    return frames

# ============================================
# VIDEO UNDERSTANDING
# ============================================

def analyze_video(video_path: str, question: str, max_frames: int = 10) -> str:
    """Analyze video content"""
    
    # Extract frames
    frames = extract_frames(video_path, interval_seconds=5)[:max_frames]
    
    # Build content with frames
    content = [{"type": "text", "text": question}]
    
    for frame in frames:
        content.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:image/jpeg;base64,{frame['base64']}",
                "detail": "low"  # Use low detail for efficiency
            }
        })
    
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": "You are analyzing frames from a video. Consider the temporal sequence."
            },
            {"role": "user", "content": content}
        ],
        max_tokens=1000
    )
    
    return response.choices[0].message.content

# ============================================
# VIDEO SUMMARIZATION
# ============================================

def summarize_video(video_path: str) -> str:
    """Generate video summary"""
    
    return analyze_video(
        video_path,
        """Analyze these video frames and provide:
1. Brief description of what's happening
2. Key events or changes over time
3. Main subjects/objects in the video
4. Overall summary"""
    )

# ============================================
# VIDEO + AUDIO ANALYSIS
# ============================================

def full_video_analysis(video_path: str) -> dict:
    """Analyze both video and audio"""
    
    import subprocess
    
    # Extract audio
    audio_path = tempfile.NamedTemporaryFile(suffix='.mp3', delete=False).name
    subprocess.run([
        'ffmpeg', '-i', video_path,
        '-vn', '-acodec', 'libmp3lame',
        audio_path, '-y'
    ], capture_output=True)
    
    # Transcribe audio
    with open(audio_path, 'rb') as f:
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=f
        )
    
    # Analyze video frames
    visual_analysis = analyze_video(
        video_path,
        "Describe what's happening visually in this video."
    )
    
    # Combine analysis
    combined = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {
                "role": "system",
                "content": "Combine visual and audio analysis into a coherent summary."
            },
            {
                "role": "user",
                "content": f"""
Visual Analysis:
{visual_analysis}

Audio Transcript:
{transcript.text}

Provide a comprehensive summary combining both visual and audio information."""
            }
        ]
    )
    
    return {
        "visual": visual_analysis,
        "transcript": transcript.text,
        "combined_summary": combined.choices[0].message.content
    }
```

---

## 🔗 Building Multimodal RAG

### Architecture

```
MULTIMODAL RAG ARCHITECTURE:

┌──────────────────────────────────────────────────────────────┐
│                    MULTIMODAL RAG SYSTEM                      │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    INDEXING                              │ │
│  │                                                          │ │
│  │  Documents ──► [Text Chunks] ──► Text Embeddings ──┐    │ │
│  │                                                     │    │ │
│  │  Images ──────► [CLIP Encoder] ──► Image Embeddings┼──► │ │
│  │                                                     │ DB │ │
│  │  Audio ───────► [Whisper] ───────► Text Embeddings─┘    │ │
│  │                                                          │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    RETRIEVAL                             │ │
│  │                                                          │ │
│  │  Query ──► Text Search ────────────────┐                │ │
│  │       │                                 │                │ │
│  │       └► Image Search (if image) ──────┼──► Re-rank    │ │
│  │                                         │                │ │
│  │       └► Metadata Filter ──────────────┘                │ │
│  │                                                          │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                   GENERATION                             │ │
│  │                                                          │ │
│  │  Context (text + images) ──► Multimodal LLM ──► Answer  │ │
│  │                                                          │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Implementation

```python
"""
Multimodal RAG System
"""

from typing import List, Optional, Union
from dataclasses import dataclass
import base64
import os

from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document
import chromadb

from openai import OpenAI

# ============================================
# DATA MODELS
# ============================================

@dataclass
class MultimodalDocument:
    id: str
    content_type: str  # text, image, audio
    text_content: str
    image_path: Optional[str] = None
    audio_path: Optional[str] = None
    metadata: dict = None

# ============================================
# MULTIMODAL RAG SERVICE
# ============================================

class MultimodalRAG:
    """RAG system that handles text, images, and audio"""
    
    def __init__(self, persist_dir: str = "./multimodal_db"):
        self.client = OpenAI()
        self.embeddings = OpenAIEmbeddings()
        self.persist_dir = persist_dir
        
        # Separate collections for different modalities
        self.text_store = None
        self.image_store = None
        
        self.llm = ChatOpenAI(model="gpt-4o", temperature=0)
    
    def _init_stores(self):
        """Initialize vector stores"""
        
        self.text_store = Chroma(
            collection_name="text_docs",
            persist_directory=f"{self.persist_dir}/text",
            embedding_function=self.embeddings
        )
    
    def encode_image(self, image_path: str) -> str:
        """Encode image to base64"""
        with open(image_path, "rb") as f:
            return base64.standard_b64encode(f.read()).decode("utf-8")
    
    def describe_image(self, image_path: str) -> str:
        """Generate text description of image"""
        
        base64_image = self.encode_image(image_path)
        
        response = self.client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Describe this image in detail for indexing purposes. Include all visible text, objects, people, actions, and context."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=500
        )
        
        return response.choices[0].message.content
    
    def transcribe_audio(self, audio_path: str) -> str:
        """Transcribe audio to text"""
        
        with open(audio_path, "rb") as f:
            transcript = self.client.audio.transcriptions.create(
                model="whisper-1",
                file=f
            )
        
        return transcript.text
    
    def add_document(self, doc: MultimodalDocument):
        """Add document to appropriate store"""
        
        text_content = doc.text_content
        
        # Process image
        if doc.image_path and os.path.exists(doc.image_path):
            image_description = self.describe_image(doc.image_path)
            text_content += f"\n\n[Image Description: {image_description}]"
        
        # Process audio
        if doc.audio_path and os.path.exists(doc.audio_path):
            transcript = self.transcribe_audio(doc.audio_path)
            text_content += f"\n\n[Audio Transcript: {transcript}]"
        
        # Create document
        langchain_doc = Document(
            page_content=text_content,
            metadata={
                "id": doc.id,
                "content_type": doc.content_type,
                "image_path": doc.image_path,
                "audio_path": doc.audio_path,
                **(doc.metadata or {})
            }
        )
        
        # Add to store
        if self.text_store is None:
            self._init_stores()
        
        self.text_store.add_documents([langchain_doc])
    
    def retrieve(self, query: str, k: int = 4) -> List[Document]:
        """Retrieve relevant documents"""
        
        if self.text_store is None:
            return []
        
        return self.text_store.similarity_search(query, k=k)
    
    def query(
        self, 
        question: str, 
        query_image: Optional[str] = None
    ) -> dict:
        """Query the multimodal RAG system"""
        
        # Retrieve text context
        docs = self.retrieve(question)
        
        if not docs:
            return {
                "answer": "I don't have information about that.",
                "sources": []
            }
        
        # Build context
        context_parts = []
        images_to_include = []
        
        for doc in docs:
            context_parts.append(doc.page_content)
            
            # Collect images for visual context
            if doc.metadata.get("image_path"):
                images_to_include.append(doc.metadata["image_path"])
        
        context = "\n\n".join(context_parts)
        
        # Build message content
        content = [
            {
                "type": "text",
                "text": f"""Based on the following context, answer the question.

Context:
{context}

Question: {question}

Provide a detailed answer based on the context. If referencing images, describe what's relevant."""
            }
        ]
        
        # Add images to context (limit to 3)
        for img_path in images_to_include[:3]:
            if os.path.exists(img_path):
                content.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{self.encode_image(img_path)}"
                    }
                })
        
        # Add query image if provided
        if query_image and os.path.exists(query_image):
            content.insert(1, {
                "type": "text",
                "text": "The user has also provided this image as part of their query:"
            })
            content.insert(2, {
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/jpeg;base64,{self.encode_image(query_image)}"
                }
            })
        
        # Generate answer
        response = self.client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": content}],
            max_tokens=1000
        )
        
        return {
            "answer": response.choices[0].message.content,
            "sources": [
                {
                    "content": doc.page_content[:200],
                    "metadata": doc.metadata
                }
                for doc in docs
            ]
        }

# ============================================
# USAGE
# ============================================

rag = MultimodalRAG()

# Add text document
rag.add_document(MultimodalDocument(
    id="doc-001",
    content_type="text",
    text_content="Our company policy states that remote work is allowed 3 days per week."
))

# Add image document
rag.add_document(MultimodalDocument(
    id="doc-002",
    content_type="image",
    text_content="Product catalog image",
    image_path="product.jpg",
    metadata={"category": "products"}
))

# Add audio document
rag.add_document(MultimodalDocument(
    id="doc-003",
    content_type="audio",
    text_content="Meeting recording from Q4 planning",
    audio_path="meeting.mp3",
    metadata={"type": "meeting"}
))

# Query
result = rag.query("What is the remote work policy?")
print(result["answer"])

# Query with image
result = rag.query(
    "Is this product in our catalog?",
    query_image="user_product.jpg"
)
```

---

## 🎯 Complete Multimodal App

```python
"""
Complete Multimodal Chat Application
Streamlit frontend with image, audio, and text support
"""

import streamlit as st
from openai import OpenAI
import base64
import tempfile
import os

# ============================================
# CONFIG
# ============================================

st.set_page_config(
    page_title="Multimodal AI Assistant",
    page_icon="🤖",
    layout="wide"
)

client = OpenAI()

# ============================================
# SESSION STATE
# ============================================

if "messages" not in st.session_state:
    st.session_state.messages = []

# ============================================
# HELPER FUNCTIONS
# ============================================

def encode_image(image_file):
    return base64.standard_b64encode(image_file.read()).decode("utf-8")

def transcribe_audio(audio_file):
    transcript = client.audio.transcriptions.create(
        model="whisper-1",
        file=audio_file
    )
    return transcript.text

def generate_response(messages, images=None):
    """Generate response with optional images"""
    
    # Build the last message with images if present
    if images:
        content = [{"type": "text", "text": messages[-1]["content"]}]
        for img in images:
            content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{img}"}
            })
        messages[-1]["content"] = content
    
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        max_tokens=1000,
        stream=True
    )
    
    return response

# ============================================
# SIDEBAR
# ============================================

with st.sidebar:
    st.title("🤖 Multimodal AI")
    st.markdown("---")
    
    st.subheader("📎 Attachments")
    
    # Image upload
    uploaded_images = st.file_uploader(
        "Upload images",
        type=["jpg", "jpeg", "png", "gif"],
        accept_multiple_files=True,
        key="images"
    )
    
    # Audio upload
    uploaded_audio = st.file_uploader(
        "Upload audio",
        type=["mp3", "wav", "m4a", "webm"],
        key="audio"
    )
    
    # Show previews
    if uploaded_images:
        st.subheader("Image Previews")
        for img in uploaded_images:
            st.image(img, width=150)
    
    if uploaded_audio:
        st.subheader("Audio Preview")
        st.audio(uploaded_audio)
    
    st.markdown("---")
    
    # Clear conversation
    if st.button("Clear Conversation", use_container_width=True):
        st.session_state.messages = []
        st.rerun()
    
    # Settings
    with st.expander("Settings"):
        temperature = st.slider("Temperature", 0.0, 1.0, 0.7)
        max_tokens = st.slider("Max tokens", 100, 2000, 1000)

# ============================================
# MAIN CHAT AREA
# ============================================

st.title("💬 Multimodal Chat")
st.caption("Chat with text, images, and audio!")

# Display chat history
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        if isinstance(message["content"], str):
            st.markdown(message["content"])
        else:
            # Multimodal content
            for item in message["content"]:
                if item["type"] == "text":
                    st.markdown(item["text"])
                elif item["type"] == "image":
                    st.image(item["image"], width=300)
                elif item["type"] == "audio_transcript":
                    st.info(f"🎤 Audio transcript: {item['text']}")

# Chat input
if prompt := st.chat_input("Type your message..."):
    # Process attachments
    images_base64 = []
    audio_transcript = None
    
    # Process images
    if uploaded_images:
        for img in uploaded_images:
            images_base64.append(encode_image(img))
    
    # Process audio
    if uploaded_audio:
        audio_transcript = transcribe_audio(uploaded_audio)
    
    # Build user message content for display
    display_content = [{"type": "text", "text": prompt}]
    
    if uploaded_images:
        for img in uploaded_images:
            display_content.append({"type": "image", "image": img})
    
    if audio_transcript:
        display_content.append({"type": "audio_transcript", "text": audio_transcript})
        prompt += f"\n\n[Audio transcript: {audio_transcript}]"
    
    # Add to state
    st.session_state.messages.append({
        "role": "user",
        "content": display_content
    })
    
    # Display user message
    with st.chat_message("user"):
        st.markdown(prompt)
        if uploaded_images:
            cols = st.columns(min(len(uploaded_images), 3))
            for i, img in enumerate(uploaded_images):
                with cols[i % 3]:
                    st.image(img, width=200)
        if audio_transcript:
            st.info(f"🎤 {audio_transcript}")
    
    # Generate response
    with st.chat_message("assistant"):
        message_placeholder = st.empty()
        full_response = ""
        
        # Build messages for API
        api_messages = [
            {"role": "system", "content": "You are a helpful multimodal AI assistant."}
        ]
        
        for msg in st.session_state.messages:
            if isinstance(msg["content"], str):
                api_messages.append({"role": msg["role"], "content": msg["content"]})
            else:
                text = " ".join([
                    item.get("text", "") 
                    for item in msg["content"] 
                    if item["type"] in ["text", "audio_transcript"]
                ])
                api_messages.append({"role": msg["role"], "content": text})
        
        # Stream response
        try:
            stream = generate_response(api_messages, images_base64)
            
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    full_response += chunk.choices[0].delta.content
                    message_placeholder.markdown(full_response + "▌")
            
            message_placeholder.markdown(full_response)
        
        except Exception as e:
            st.error(f"Error: {e}")
            full_response = "Sorry, I encountered an error."
        
        # Save response
        st.session_state.messages.append({
            "role": "assistant",
            "content": full_response
        })
```

---

## ❓ Interview Questions

### Beginner Level

**Q1: What is multimodal AI?**

> **A:** Multimodal AI processes multiple types of data (text, images, audio, video) together. Unlike unimodal AI that handles one type, multimodal AI can understand relationships across modalities - like describing what's in an image or transcribing speech.

**Q2: What is CLIP and how is it used?**

> **A:** CLIP (Contrastive Language-Image Pre-training) maps images and text to a shared embedding space. Images and their descriptions have similar embeddings. Uses:
> - Image search by text
> - Zero-shot image classification
> - Image-text similarity scoring

### Intermediate Level

**Q3: How do you build a multimodal RAG system?**

> **A:** Architecture:
> 1. **Index images:** Generate descriptions with vision model, embed text
> 2. **Index audio:** Transcribe with Whisper, embed text
> 3. **Index text:** Standard text embedding
> 4. **Retrieve:** Search across all modalities
> 5. **Generate:** Pass text + images to multimodal LLM

**Q4: How do you handle video in multimodal systems?**

> **A:** Approaches:
> - Extract frames at intervals
> - Extract audio track separately
> - Process frames with vision model
> - Transcribe audio with Whisper
> - Combine visual + audio analysis

### Advanced Level

**Q5: Design a multimodal search system for e-commerce.**

> **A:** Architecture:
> - **Product indexing:** Image embeddings (CLIP), text embeddings, metadata
> - **Query processing:** Support text, image, or combined queries
> - **Retrieval:** Hybrid search (visual + semantic)
> - **Ranking:** Re-rank by relevance across modalities
> - **Features:** "Find similar products," visual search, natural language

---

## 📝 Homework

### Easy
1. Build image Q&A with GPT-4V
2. Create audio transcription app
3. Implement text-to-speech

### Medium
4. Build multimodal RAG with images
5. Create video summarization pipeline
6. Implement visual search with CLIP

### Hard
7. Build production multimodal chatbot
8. Create document AI system (invoices, receipts)
9. Build video Q&A with audio + visual analysis

---

## 🎯 Key Takeaways

```
Multimodal AI:
├── Combines text, images, audio, video
├── Vision-language models (GPT-4V, Claude)
├── CLIP for image-text matching
├── Whisper for speech recognition
└── Multimodal RAG for knowledge systems

Implementation Patterns:
├── Fusion: Single model, multiple inputs
├── Pipeline: Specialized models chained
├── Embedding: Shared vector space
└── Hybrid: Combine approaches

Best Practices:
├── Convert all modalities to text for indexing
├── Store original media for retrieval
├── Use appropriate models per modality
├── Consider cost vs quality trade-offs
└── Handle failures gracefully
```

---

**Congratulations! You've completed Week 5: Vector DB & RAG!** 🎉

**Key Skills Learned:**
- ✅ Vector database fundamentals
- ✅ ChromaDB mastery
- ✅ Complete RAG pipelines
- ✅ Streamlit frontends
- ✅ End-to-end chatbots
- ✅ Multimodal applications

**Next:** [Week-6: Trending Topics](../Week-6-Trending-Topics/) - MCP, Ollama, Unsloth & more! 🚀
