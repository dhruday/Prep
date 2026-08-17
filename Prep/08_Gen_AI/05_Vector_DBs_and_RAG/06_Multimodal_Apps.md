# 📘 Multimodal AI Applications - Beyond Text



## 📑 Table of Contents

- [**Purpose (Why this exists):**](#purpose-why-this-exists)
- [**What it is:**](#what-it-is)
- [**How it works (Intuition):**](#how-it-works-intuition)
- [**How it works (Math – simplified):**](#how-it-works-math-simplified)
- [**Visual Explanation (described):**](#visual-explanation-described)
- [**Complete Implementation:**](#complete-implementation)
- [**Real-World Applications:**](#real-world-applications)
- [**Key Takeaways:**](#key-takeaways)

---

---

## **Purpose (Why this exists):**

### **The Limitation of Text-Only AI:**

```javascript
const text_only_limitations = {
  current_chatgpt_clone: {
    capabilities: [
      'Answer questions from documents',
      'Generate text responses',
      'Chat conversations'
    ],
    
    input: 'Text only',
    output: 'Text only',
    
    missing: {
      images: 'Cannot understand photos, diagrams, charts',
      audio: 'Cannot listen to voice, music, podcasts',
      video: 'Cannot analyze videos, extract information',
      
      real_world: 'Humans experience world through multiple senses!'
    }
  },
  
  real_world_needs: {
    e_commerce: {
      user_wants: 'Search products by uploading photo',
      text_only: 'Must describe in words (awkward!)',
      multimodal: 'Upload image → Find similar products'
    },
    
    accessibility: {
      user_wants: 'Describe images for visually impaired',
      text_only: 'Cannot help',
      multimodal: 'Image → Text description'
    },
    
    education: {
      user_wants: 'Ask about diagram or chart',
      text_only: 'Cannot see the diagram',
      multimodal: 'Upload diagram → Answer questions'
    },
    
    content_creation: {
      user_wants: 'Generate images from text',
      text_only: 'Cannot create images',
      multimodal: 'Text → Image generation'
    },
    
    video_analysis: {
      user_wants: 'Search through video content',
      text_only: 'Need manual transcription',
      multimodal: 'Video → Automatic understanding'
    }
  },
  
  the_breakthrough: {
    multimodal_ai: 'Models that understand images, audio, video, and text together',
    
    examples: [
      'GPT-4 Vision (text + images)',
      'CLIP (connect images and text)',
      'Whisper (audio → text)',
      'DALL-E (text → images)',
      'Gemini (text, image, audio, video)'
    ],
    
    revolution: 'AI can now see, hear, and create like humans!'
  }
};
```

---

## **What it is:**

### **Multimodal AI Landscape:**

```javascript
const multimodal_ai = {
  definition: 'AI systems that process multiple types of data (text, images, audio, video)',
  
  modalities: {
    text: {
      traditional: 'What we\'ve been doing',
      models: ['GPT-4', 'Claude', 'Llama']
    },
    
    vision: {
      understanding: 'Analyze images/videos',
      generation: 'Create images from text',
      models: ['GPT-4V', 'CLIP', 'DALL-E', 'Stable Diffusion']
    },
    
    audio: {
      understanding: 'Speech-to-text, audio analysis',
      generation: 'Text-to-speech, music generation',
      models: ['Whisper', 'Bark', 'AudioLM']
    },
    
    video: {
      understanding: 'Video analysis, action recognition',
      generation: 'Video generation',
      models: ['VideoGPT', 'Gemini', 'Sora']
    }
  },
  
  key_models: {
    clip: {
      what: 'Connect images and text',
      use: 'Image search, zero-shot classification',
      by: 'OpenAI',
      breakthrough: 'Understands image-text relationships'
    },
    
    gpt4_vision: {
      what: 'GPT-4 that can see images',
      use: 'Answer questions about images',
      by: 'OpenAI',
      breakthrough: 'Chat about images naturally'
    },
    
    whisper: {
      what: 'Speech recognition',
      use: 'Transcribe audio accurately',
      by: 'OpenAI',
      breakthrough: 'Near-human accuracy, multilingual'
    },
    
    dall_e: {
      what: 'Text to image generation',
      use: 'Create images from descriptions',
      by: 'OpenAI',
      breakthrough: 'High-quality, creative images'
    },
    
    gemini: {
      what: 'True multimodal (text, image, audio, video)',
      use: 'Universal understanding',
      by: 'Google',
      breakthrough: 'Native multimodal reasoning'
    }
  }
};

const multimodal_applications = {
  vision: {
    image_qa: 'Ask questions about images',
    image_search: 'Find images by description or similarity',
    object_detection: 'Identify objects in images',
    ocr: 'Extract text from images',
    image_generation: 'Create images from text'
  },
  
  audio: {
    transcription: 'Convert speech to text',
    translation: 'Translate audio between languages',
    voice_cloning: 'Generate speech in specific voice',
    music_generation: 'Create music from text'
  },
  
  video: {
    video_qa: 'Ask questions about video content',
    video_search: 'Search within videos',
    video_summarization: 'Summarize long videos',
    action_recognition: 'Identify activities in video'
  },
  
  combined: {
    accessibility: 'Describe images for blind users',
    content_moderation: 'Detect inappropriate content',
    virtual_assistants: 'See, hear, and respond',
    education: 'Interactive learning with visuals',
    healthcare: 'Analyze medical images'
  }
};
```

---

## **How it works (Intuition):**

### **CLIP: Connecting Images and Text:**

```javascript
const clip_intuition = {
  problem: {
    traditional_cv: 'Train model for specific task (cats vs dogs)',
    limitation: 'Cannot recognize new categories',
    
    example: {
      trained_on: ['cat', 'dog'],
      fails_on: ['tiger', 'wolf'],
      reason: 'Never seen these classes'
    }
  },
  
  clip_solution: {
    training: {
      data: '400M image-text pairs from internet',
      learns: 'How images and text relate',
      
      example_pairs: [
        '(image of cat, "a photo of a cat")',
        '(image of sunset, "beautiful sunset over ocean")',
        '(image of pizza, "delicious pepperoni pizza")'
      ]
    },
    
    how_it_works: {
      step1: 'Embed image → vector',
      step2: 'Embed text → vector',
      step3: 'Push matching pairs close together',
      step4: 'Push non-matching pairs apart',
      
      result: 'Shared space where similar images and text are close'
    },
    
    magic: {
      zero_shot: 'Can recognize concepts never explicitly trained on',
      
      example: {
        query: 'image of a tiger',
        clip: 'Knows "tiger" is similar to "cat", "striped animal", etc.',
        works: 'Even if never trained on "tiger" label!'
      }
    }
  },
  
  visual: `
    Image Space:        Text Space:         CLIP Space:
    
    🐈 cat             "cat"              🐈 cat, "cat"
    🐕 dog             "dog"                 near each other
                                          🐕 dog, "dog"
                                             near each other
    ❌ Separate        ❌ Separate         ✅ Connected!
  `,
  
  use_cases: {
    image_search: 'Search images with text descriptions',
    zero_shot_classification: 'Classify without training',
    content_moderation: 'Detect specific content types',
    recommendation: 'Find similar images/products'
  }
};

const gpt4_vision_intuition = {
  concept: 'GPT-4 that can see',
  
  how_it_works: {
    input: 'Image + text prompt',
    processing: {
      step1: 'Encode image into tokens (like text)',
      step2: 'Combine image tokens + text tokens',
      step3: 'Process through GPT-4 transformer',
      step4: 'Generate text response'
    },
    output: 'Text answer about the image'
  },
  
  capabilities: {
    describe: 'Describe what\'s in the image',
    analyze: 'Analyze charts, diagrams',
    ocr: 'Read text from images',
    reason: 'Answer complex questions about images',
    compare: 'Compare multiple images'
  },
  
  example: {
    image: '[Photo of restaurant menu]',
    user: 'What vegetarian options are available?',
    gpt4v: 'Reads menu, identifies vegetarian items, lists them'
  }
};
```

---

## **How it works (Math – simplified):**

### **CLIP Training:**

```python
# CLIP: Contrastive Language-Image Pre-training

import torch
import torch.nn as nn

class CLIPModel:
    """
    Simplified CLIP architecture
    """
    
    def __init__(self, image_encoder, text_encoder, embed_dim=512):
        self.image_encoder = image_encoder  # Vision Transformer or ResNet
        self.text_encoder = text_encoder    # Transformer
        self.embed_dim = embed_dim
        
        # Projection heads
        self.image_projection = nn.Linear(image_features, embed_dim)
        self.text_projection = nn.Linear(text_features, embed_dim)
    
    def forward(self, images, texts):
        """
        Forward pass
        
        Input:
          images: [B, C, H, W]  (batch of images)
          texts: [B, L]         (batch of text tokens)
        
        Output:
          image_embeds: [B, D]  (normalized image embeddings)
          text_embeds: [B, D]   (normalized text embeddings)
        
        Where:
          B = batch size
          D = embedding dimension
        """
        # Encode
        image_features = self.image_encoder(images)  # [B, image_dim]
        text_features = self.text_encoder(texts)     # [B, text_dim]
        
        # Project to shared space
        image_embeds = self.image_projection(image_features)  # [B, D]
        text_embeds = self.text_projection(text_features)     # [B, D]
        
        # Normalize (important!)
        image_embeds = image_embeds / image_embeds.norm(dim=-1, keepdim=True)
        text_embeds = text_embeds / text_embeds.norm(dim=-1, keepdim=True)
        
        return image_embeds, text_embeds
    
    def contrastive_loss(self, image_embeds, text_embeds, temperature=0.07):
        """
        Contrastive loss (InfoNCE)
        
        Goal: Maximize similarity between matching pairs,
              minimize similarity between non-matching pairs
        
        Math:
          logits = image_embeds @ text_embeds.T / temperature
          
          For each image:
            - Should match its corresponding text (diagonal)
            - Should not match other texts (off-diagonal)
        
        Loss:
          L = -log(exp(sim_positive) / sum(exp(sim_all)))
        """
        # Compute similarity matrix
        # logits[i,j] = similarity between image i and text j
        logits = image_embeds @ text_embeds.T / temperature  # [B, B]
        
        # Labels: diagonal elements are positive pairs
        labels = torch.arange(len(logits))  # [0, 1, 2, ..., B-1]
        
        # Cross-entropy loss
        loss_i = nn.CrossEntropyLoss()(logits, labels)      # Image → Text
        loss_t = nn.CrossEntropyLoss()(logits.T, labels)    # Text → Image
        
        loss = (loss_i + loss_t) / 2
        
        return loss


# Example: Zero-shot image classification

def zero_shot_classify(image, candidate_texts, clip_model):
    """
    Classify image without training on specific classes
    
    Example:
      image: [photo of a cat]
      candidate_texts: ["a cat", "a dog", "a bird"]
      
      Returns: "a cat" (highest similarity)
    """
    # Encode image
    image_embed = clip_model.encode_image(image)  # [1, D]
    
    # Encode all candidate texts
    text_embeds = clip_model.encode_text(candidate_texts)  # [N, D]
    
    # Compute similarities
    similarities = image_embed @ text_embeds.T  # [1, N]
    
    # Get highest similarity
    best_idx = similarities.argmax()
    
    return candidate_texts[best_idx]


# Whisper: Speech Recognition

def whisper_architecture():
    """
    Whisper is an encoder-decoder transformer
    
    Encoder:
      Audio → Log-Mel Spectrogram → Conv → Transformer Blocks → Audio Embeddings
    
    Decoder:
      Audio Embeddings → Transformer Blocks → Text Tokens
    
    Training:
      680,000 hours of multilingual audio
      Weakly supervised (scraped from internet)
    
    Math:
      Spectrogram: audio waveform → frequency representation
        S[t, f] = |STFT(audio)[t, f]|^2
      
      Where:
        t = time
        f = frequency
        STFT = Short-Time Fourier Transform
    """
    pass
```

---

## **Visual Explanation (described):**

### **CLIP Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIP TRAINING                            │
└─────────────────────────────────────────────────────────────┘

Input: Batch of (image, text) pairs

IMAGE PATH:                      TEXT PATH:
┌─────────────┐                 ┌─────────────┐
│   Image     │                 │    Text     │
│   [256x256] │                 │  "a cat"    │
└──────┬──────┘                 └──────┬──────┘
       │                               │
       ↓                               ↓
┌─────────────┐                 ┌─────────────┐
│   Vision    │                 │    Text     │
│ Transformer │                 │ Transformer │
│  (Encoder)  │                 │  (Encoder)  │
└──────┬──────┘                 └──────┬──────┘
       │                               │
       ↓                               ↓
┌─────────────┐                 ┌─────────────┐
│ Projection  │                 │ Projection  │
│   Layer     │                 │   Layer     │
└──────┬──────┘                 └──────┬──────┘
       │                               │
       ↓                               ↓
┌─────────────┐                 ┌─────────────┐
│  Normalize  │                 │  Normalize  │
└──────┬──────┘                 └──────┬──────┘
       │                               │
       ↓                               ↓
    [v_img]                         [v_text]
    (512-d)                         (512-d)
       │                               │
       └───────────┬───────────────────┘
                   ↓
            ┌─────────────┐
            │  Similarity │
            │   Matrix    │
            │  [B × B]    │
            └──────┬──────┘
                   ↓
            ┌─────────────┐
            │ Contrastive │
            │    Loss     │
            └─────────────┘

Goal: Matching pairs close, non-matching pairs far
```

### **Multimodal RAG Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│              MULTIMODAL RAG SYSTEM                          │
└─────────────────────────────────────────────────────────────┘

USER INPUTS:
┌──────────┐  ┌──────────┐  ┌──────────┐
│   Text   │  │  Image   │  │  Audio   │
│  Query   │  │  Upload  │  │   File   │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │              │
     └─────────────┴──────────────┘
                   ↓
          ┌────────────────┐
          │  Input Fusion  │
          └───────┬────────┘
                  ↓
     ┌────────────────────────────┐
     │  MULTIMODAL UNDERSTANDING  │
     │                            │
     │  • CLIP (images)           │
     │  • Whisper (audio)         │
     │  • Text embedding          │
     └────────────┬───────────────┘
                  ↓
     ┌────────────────────────────┐
     │     VECTOR DATABASE        │
     │  (Text + Image + Audio)    │
     │                            │
     │  [🔤] Text chunks           │
     │  [🖼️] Image embeddings      │
     │  [🔊] Audio transcripts     │
     └────────────┬───────────────┘
                  ↓
     ┌────────────────────────────┐
     │  MULTIMODAL RETRIEVAL      │
     │  • Semantic search         │
     │  • Cross-modal matching    │
     └────────────┬───────────────┘
                  ↓
     ┌────────────────────────────┐
     │   CONTEXT BUILDING         │
     │  • Retrieved texts         │
     │  • Relevant images         │
     │  • Transcribed audio       │
     └────────────┬───────────────┘
                  ↓
     ┌────────────────────────────┐
     │    MULTIMODAL LLM          │
     │    (GPT-4V / Gemini)       │
     │  • Understands context     │
     │  • Generates response      │
     └────────────┬───────────────┘
                  ↓
     ┌────────────────────────────┐
     │     OUTPUT                 │
     │  • Text answer             │
     │  • Generated images        │
     │  • Source citations        │
     └────────────────────────────┘
```

---

## **Complete Implementation:**

```python
# ============================================
# 1. Multimodal Document Processor
# ============================================

import clip
import torch
from PIL import Image
import whisper
from typing import List, Dict

class MultimodalProcessor:
    """
    Process text, images, and audio for multimodal RAG
    """
    
    def __init__(self):
        # Load models
        self.clip_model, self.preprocess = clip.load("ViT-B/32")
        self.whisper_model = whisper.load_model("base")
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
    
    def process_image(self, image_path: str) -> Dict:
        """
        Process image with CLIP
        
        Returns:
          embedding: Image embedding
          caption: Optional generated caption
        """
        # Load and preprocess image
        image = Image.open(image_path)
        image_input = self.preprocess(image).unsqueeze(0).to(self.device)
        
        # Generate embedding
        with torch.no_grad():
            embedding = self.clip_model.encode_image(image_input)
            embedding = embedding / embedding.norm(dim=-1, keepdim=True)
        
        # Optional: Generate caption using zero-shot
        candidate_captions = [
            "a photo of a person",
            "a photo of an animal",
            "a photo of a landscape",
            "a photo of food",
            "a document or screenshot",
            "a diagram or chart"
        ]
        
        caption = self.zero_shot_caption(image_input, candidate_captions)
        
        return {
            'embedding': embedding.cpu().numpy(),
            'caption': caption,
            'type': 'image',
            'path': image_path
        }
    
    def zero_shot_caption(self, image_input, candidate_captions):
        """Generate caption using CLIP zero-shot"""
        text_inputs = clip.tokenize(candidate_captions).to(self.device)
        
        with torch.no_grad():
            text_features = self.clip_model.encode_text(text_inputs)
            image_features = self.clip_model.encode_image(image_input)
            
            # Normalize
            text_features = text_features / text_features.norm(dim=-1, keepdim=True)
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)
            
            # Compute similarities
            similarities = (image_features @ text_features.T).squeeze(0)
            
            # Get best match
            best_idx = similarities.argmax().item()
            
        return candidate_captions[best_idx]
    
    def process_audio(self, audio_path: str) -> Dict:
        """
        Process audio with Whisper
        
        Returns:
          transcript: Transcribed text
          language: Detected language
        """
        # Transcribe
        result = self.whisper_model.transcribe(audio_path)
        
        return {
            'transcript': result['text'],
            'language': result['language'],
            'type': 'audio',
            'path': audio_path
        }
    
    def process_text(self, text: str) -> Dict:
        """Process plain text"""
        return {
            'text': text,
            'type': 'text'
        }


# ============================================
# 2. Multimodal Vector Store
# ============================================

import chromadb
import numpy as np

class MultimodalVectorStore:
    """
    Store and search multimodal content
    """
    
    def __init__(self):
        self.client = chromadb.PersistentClient(path="./multimodal_db")
        
        # Separate collections for different modalities
        self.text_collection = self.client.get_or_create_collection("text")
        self.image_collection = self.client.get_or_create_collection("images")
        self.audio_collection = self.client.get_or_create_collection("audio")
    
    def add_text(self, texts: List[str], metadatas: List[Dict]):
        """Add text documents"""
        ids = [f"text_{i}" for i in range(len(texts))]
        self.text_collection.add(
            documents=texts,
            metadatas=metadatas,
            ids=ids
        )
    
    def add_images(self, embeddings: List[np.ndarray], metadatas: List[Dict]):
        """Add image embeddings"""
        ids = [f"image_{i}" for i in range(len(embeddings))]
        
        # Convert to list of floats
        embeddings_list = [emb.flatten().tolist() for emb in embeddings]
        
        # Create dummy documents (CLIP embeddings)
        documents = [meta.get('caption', 'image') for meta in metadatas]
        
        self.image_collection.add(
            documents=documents,
            embeddings=embeddings_list,
            metadatas=metadatas,
            ids=ids
        )
    
    def add_audio(self, transcripts: List[str], metadatas: List[Dict]):
        """Add audio transcripts"""
        ids = [f"audio_{i}" for i in range(len(transcripts))]
        self.audio_collection.add(
            documents=transcripts,
            metadatas=metadatas,
            ids=ids
        )
    
    def search_text(self, query: str, top_k: int = 3) -> List[Dict]:
        """Search text documents"""
        results = self.text_collection.query(
            query_texts=[query],
            n_results=top_k
        )
        return self._format_results(results, 'text')
    
    def search_images(self, query_embedding: np.ndarray, top_k: int = 3) -> List[Dict]:
        """Search images by embedding"""
        results = self.image_collection.query(
            query_embeddings=[query_embedding.flatten().tolist()],
            n_results=top_k
        )
        return self._format_results(results, 'image')
    
    def search_audio(self, query: str, top_k: int = 3) -> List[Dict]:
        """Search audio transcripts"""
        results = self.audio_collection.query(
            query_texts=[query],
            n_results=top_k
        )
        return self._format_results(results, 'audio')
    
    def _format_results(self, results, modality: str) -> List[Dict]:
        """Format search results"""
        formatted = []
        for i in range(len(results['documents'][0])):
            formatted.append({
                'content': results['documents'][0][i],
                'metadata': results['metadatas'][0][i],
                'distance': results['distances'][0][i],
                'modality': modality
            })
        return formatted


# ============================================
# 3. Multimodal RAG System
# ============================================

from openai import OpenAI
import base64

class MultimodalRAG:
    """
    Complete multimodal RAG system
    """
    
    def __init__(self):
        self.processor = MultimodalProcessor()
        self.vector_store = MultimodalVectorStore()
        self.llm = OpenAI()
    
    def index_document(self, file_path: str):
        """
        Index document (text, image, or audio)
        """
        if file_path.endswith(('.jpg', '.jpeg', '.png')):
            # Process image
            result = self.processor.process_image(file_path)
            self.vector_store.add_images(
                [result['embedding']],
                [{'path': file_path, 'caption': result['caption']}]
            )
        
        elif file_path.endswith(('.mp3', '.wav', '.m4a')):
            # Process audio
            result = self.processor.process_audio(file_path)
            self.vector_store.add_audio(
                [result['transcript']],
                [{'path': file_path, 'language': result['language']}]
            )
        
        elif file_path.endswith(('.txt', '.md')):
            # Process text
            with open(file_path, 'r') as f:
                text = f.read()
            self.vector_store.add_text(
                [text],
                [{'path': file_path}]
            )
    
    def query(
        self,
        text_query: str = None,
        image_query: str = None,
        top_k: int = 3
    ) -> Dict:
        """
        Multimodal query
        """
        # Retrieve from all modalities
        results = {
            'text': [],
            'images': [],
            'audio': []
        }
        
        if text_query:
            results['text'] = self.vector_store.search_text(text_query, top_k)
            results['audio'] = self.vector_store.search_audio(text_query, top_k)
        
        if image_query:
            # Process query image
            query_result = self.processor.process_image(image_query)
            results['images'] = self.vector_store.search_images(
                query_result['embedding'],
                top_k
            )
        
        # Build multimodal context
        context = self._build_multimodal_context(results)
        
        # Generate response
        response = self._generate_response(text_query, context, results['images'])
        
        return {
            'answer': response,
            'sources': results
        }
    
    def _build_multimodal_context(self, results: Dict) -> str:
        """Build context from multimodal results"""
        context_parts = []
        
        # Text sources
        if results['text']:
            context_parts.append("Text Sources:")
            for i, result in enumerate(results['text']):
                context_parts.append(f"[{i+1}] {result['content'][:200]}...")
        
        # Audio sources
        if results['audio']:
            context_parts.append("\nAudio Transcripts:")
            for i, result in enumerate(results['audio']):
                context_parts.append(f"[{i+1}] {result['content'][:200]}...")
        
        # Image sources
        if results['images']:
            context_parts.append("\nImages:")
            for i, result in enumerate(results['images']):
                caption = result['metadata'].get('caption', 'image')
                context_parts.append(f"[{i+1}] {caption}")
        
        return "\n".join(context_parts)
    
    def _generate_response(
        self,
        query: str,
        context: str,
        image_results: List[Dict]
    ) -> str:
        """
        Generate response using GPT-4V if images available
        """
        messages = [
            {
                "role": "system",
                "content": "You are a helpful assistant that answers questions based on multimodal context (text, images, audio)."
            }
        ]
        
        # Add context
        messages.append({
            "role": "user",
            "content": f"Context:\n{context}\n\nQuestion: {query}\n\nAnswer:"
        })
        
        # If images available, use GPT-4V
        if image_results:
            # Add image to message (GPT-4V)
            for result in image_results[:1]:  # First image
                image_path = result['metadata'].get('path')
                if image_path:
                    # Read and encode image
                    with open(image_path, 'rb') as f:
                        image_data = base64.b64encode(f.read()).decode()
                    
                    messages.append({
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{image_data}"
                                }
                            }
                        ]
                    })
            
            model = "gpt-4-vision-preview"
        else:
            model = "gpt-3.5-turbo"
        
        # Generate
        response = self.llm.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=500
        )
        
        return response.choices[0].message.content


# ============================================
# 4. Streamlit Multimodal App
# ============================================

import streamlit as st
from multimodal_rag import MultimodalRAG

st.set_page_config(page_title="Multimodal AI", layout="wide")

# Initialize
@st.cache_resource
def init_system():
    return MultimodalRAG()

rag = init_system()

st.title("🎨 Multimodal AI Assistant")
st.caption("Upload images, audio, or text and ask questions")

# Sidebar
with st.sidebar:
    st.header("📁 Upload Files")
    
    uploaded_files = st.file_uploader(
        "Choose files",
        type=['jpg', 'jpeg', 'png', 'mp3', 'wav', 'txt', 'md'],
        accept_multiple_files=True
    )
    
    if uploaded_files and st.button("Index Files"):
        for file in uploaded_files:
            # Save temp file
            with open(f"temp_{file.name}", 'wb') as f:
                f.write(file.getbuffer())
            
            # Index
            with st.spinner(f"Processing {file.name}..."):
                rag.index_document(f"temp_{file.name}")
        
        st.success("Files indexed!")

# Main area
col1, col2 = st.columns([2, 1])

with col1:
    st.subheader("💬 Ask Questions")
    
    query = st.text_input("Your question")
    
    if st.button("Search") and query:
        with st.spinner("Searching..."):
            result = rag.query(text_query=query)
            
            st.markdown("### Answer:")
            st.write(result['answer'])
            
            st.markdown("### Sources:")
            
            # Show text sources
            if result['sources']['text']:
                with st.expander("📝 Text Sources"):
                    for source in result['sources']['text']:
                        st.text(source['content'][:200])
            
            # Show images
            if result['sources']['images']:
                with st.expander("🖼️ Images"):
                    for source in result['sources']['images']:
                        st.image(source['metadata']['path'])
                        st.caption(source['metadata'].get('caption', ''))
            
            # Show audio
            if result['sources']['audio']:
                with st.expander("🔊 Audio Transcripts"):
                    for source in result['sources']['audio']:
                        st.text(source['content'][:200])

with col2:
    st.subheader("🖼️ Image Search")
    
    uploaded_image = st.file_uploader("Upload image to search", type=['jpg', 'jpeg', 'png'])
    
    if uploaded_image:
        st.image(uploaded_image)
        
        if st.button("Find Similar"):
            # Save temp
            with open("temp_query.jpg", 'wb') as f:
                f.write(uploaded_image.getbuffer())
            
            with st.spinner("Searching..."):
                result = rag.query(image_query="temp_query.jpg")
                
                st.markdown("### Similar Images:")
                for source in result['sources']['images']:
                    st.image(source['metadata']['path'])
                    st.caption(f"Similarity: {1 - source['distance']:.2%}")
```

---

## **Real-World Applications:**

### **1. Visual Q&A:**

```python
# Ask questions about images

query = "What's in this image?"
image = "photo.jpg"

response = rag.query(
    text_query=query,
    image_query=image
)

# Example output:
# "The image shows a dog playing in a park with trees in the background."
```

### **2. Video Analysis:**

```python
# Extract frames, analyze, and answer questions

def analyze_video(video_path, query):
    # Extract frames
    frames = extract_frames(video_path, fps=1)
    
    # Index frames
    for frame in frames:
        rag.index_document(frame)
    
    # Query
    return rag.query(text_query=query)

# Example:
analyze_video("meeting.mp4", "What was discussed?")
```

### **3. Accessibility Tool:**

```python
# Describe images for visually impaired users

def describe_image(image_path):
    return rag.query(
        text_query="Describe this image in detail",
        image_query=image_path
    )
```

---

## **Key Takeaways:**

```javascript
const multimodal_mastery = {
  core_concept: 'AI that understands multiple types of content',
  
  key_models: {
    clip: 'Connect images and text',
    whisper: 'Speech recognition',
    gpt4v: 'Vision-language model',
    dalle: 'Text-to-image generation'
  },
  
  applications: [
    'Visual Q&A',
    'Image search',
    'Video analysis',
    'Audio transcription',
    'Accessibility',
    'Content moderation'
  ],
  
  future: 'Unified models (Gemini) handle all modalities natively'
};
```

---

**🎉 Week 5 Complete!**

You've built:
1. Vector database understanding
2. ChromaDB mastery
3. RAG architecture
4. Streamlit apps
5. ChatGPT clone
6. Multimodal AI

**Next:** **Week 6: Trending Topics** - MCP, Ollama, DeepSeek! 🚀