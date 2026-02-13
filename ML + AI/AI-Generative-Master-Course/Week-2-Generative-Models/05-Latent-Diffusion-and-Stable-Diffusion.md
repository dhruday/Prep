# 05 - Latent Diffusion & Stable Diffusion

---

## Table of Contents

1. [Beginner Explanation](#beginner-explanation)
2. [Why Latent Space?](#why-latent-space)
3. [Architecture Deep Dive](#architecture-deep-dive)
   - [VAE (Autoencoder)](#vae-autoencoder)
   - [U-Net with Cross-Attention](#u-net-with-cross-attention)
   - [Text Encoder (CLIP)](#text-encoder-clip)
   - [Noise Scheduler](#noise-scheduler)
4. [Conditioning Mechanisms](#conditioning-mechanisms)
   - [Cross-Attention](#cross-attention)
   - [Classifier-Free Guidance](#classifier-free-guidance)
   - [ControlNet](#controlnet)
5. [Stable Diffusion Versions](#stable-diffusion-versions)
6. [Key Formulas](#key-formulas)
7. [Complete Implementation](#complete-implementation)
8. [Using Diffusers Library](#using-diffusers-library)
9. [Mini Project: Custom Image Generation](#mini-project-custom-image-generation)
10. [Homework](#homework)
11. [Common Mistakes](#common-mistakes)
12. [Interview Questions & Answers](#interview-questions--answers)

---

## Beginner Explanation

### The Compressed Workspace Analogy

Imagine you're an artist working on a **giant mural** (4096×4096 pixels):

```
┌─────────────────────────────────────────────────────────────────────┐
│              THE LATENT DIFFUSION STORY                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   PROBLEM: Working on a huge canvas is SLOW                         │
│                                                                      │
│   ┌───────────────────────────────────────────┐                     │
│   │                                           │                     │
│   │           512 × 512 × 3                   │                     │
│   │         = 786,432 values                  │  Too big!           │
│   │                                           │  Each diffusion     │
│   │           🎨 Full Image                   │  step is slow       │
│   │                                           │                     │
│   │                                           │                     │
│   └───────────────────────────────────────────┘                     │
│                                                                      │
│   SOLUTION: Work on a small sketch, then enlarge!                   │
│                                                                      │
│   ┌───────┐      ┌─────────────────────────────────────────┐        │
│   │ 64×64 │ ───▶ │           512 × 512                     │        │
│   │  ×4   │      │                                         │        │
│   │       │      │         Decoded Image                   │        │
│   │Sketch │      │                                         │        │
│   └───────┘      └─────────────────────────────────────────┘        │
│   16,384 values              786,432 values                         │
│   (48× smaller!)                                                    │
│                                                                      │
│   Do all the diffusion work in the small space                      │
│   Then decode to full size at the end                               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### The Complete Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│              STABLE DIFFUSION PIPELINE                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   INPUT                                                              │
│   ─────                                                              │
│   "A cat wearing a wizard hat, digital art"                         │
│                    │                                                 │
│                    ▼                                                 │
│   ┌────────────────────────────┐                                    │
│   │      TEXT ENCODER          │                                    │
│   │        (CLIP)              │                                    │
│   └────────────┬───────────────┘                                    │
│                │                                                     │
│                ▼                                                     │
│   Text Embeddings [77, 768]                                         │
│                │                                                     │
│                │         ┌─────────────────┐                        │
│                │         │  Random Noise   │                        │
│                │         │   z_T ~ N(0,I)  │                        │
│                │         │   [64, 64, 4]   │                        │
│                │         └────────┬────────┘                        │
│                │                  │                                  │
│                │                  ▼                                  │
│                └────────▶┌────────────────┐                         │
│                          │                │                         │
│                          │    U-NET       │◀─── Time embedding      │
│                          │  (Denoiser)    │                         │
│                          │                │                         │
│                          └───────┬────────┘                         │
│                                  │                                  │
│                                  │ (repeat 50 steps)                │
│                                  ▼                                  │
│                          ┌────────────────┐                         │
│                          │  Clean Latent  │                         │
│                          │     z_0        │                         │
│                          │  [64, 64, 4]   │                         │
│                          └───────┬────────┘                         │
│                                  │                                  │
│                                  ▼                                  │
│                          ┌────────────────┐                         │
│                          │  VAE DECODER   │                         │
│                          │   (Upscale)    │                         │
│                          └───────┬────────┘                         │
│                                  │                                  │
│                                  ▼                                  │
│                          ┌────────────────┐                         │
│                          │  Final Image   │                         │
│                          │ [512, 512, 3]  │                         │
│                          │      🎨        │                         │
│                          └────────────────┘                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Why Latent Space?

### Computational Efficiency

```
┌─────────────────────────────────────────────────────────────────────┐
│              PIXEL SPACE vs LATENT SPACE                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   PIXEL-SPACE DIFFUSION:                                            │
│   ─────────────────────                                             │
│   Image: 512 × 512 × 3 = 786,432 dimensions                         │
│                                                                      │
│   U-Net processes: 786,432 values per forward pass                  │
│   Memory: ~24 GB GPU for training                                   │
│   Speed: ~60 seconds per image                                      │
│                                                                      │
│   ┌────────────────────────────────────────────────────────┐        │
│   │████████████████████████████████████████████████████████│ Memory │
│   └────────────────────────────────────────────────────────┘        │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   LATENT-SPACE DIFFUSION:                                           │
│   ──────────────────────                                            │
│   Latent: 64 × 64 × 4 = 16,384 dimensions                           │
│                                                                      │
│   U-Net processes: 16,384 values per forward pass                   │
│   Memory: ~8 GB GPU for training                                    │
│   Speed: ~2 seconds per image                                       │
│                                                                      │
│   ┌──────────┐                                                      │
│   │██████████│ Memory (48× less!)                                   │
│   └──────────┘                                                      │
│                                                                      │
│   Compression ratio: 48× (with 8× spatial, 3→4 channels)           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Perceptual vs Semantic Compression

```
┌─────────────────────────────────────────────────────────────────────┐
│              WHAT THE VAE LEARNS                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   The VAE is trained to preserve PERCEPTUAL quality                 │
│   Not just pixel-wise reconstruction!                               │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────┐       │
│   │                                                         │       │
│   │   Original Image         Latent Space       Decoded    │       │
│   │                                                         │       │
│   │   ┌─────────┐           ┌───┐              ┌─────────┐ │       │
│   │   │  🐱     │  Encode   │   │    Decode    │  🐱     │ │       │
│   │   │  Cat    │ ────────▶ │ z │ ────────────▶│  Cat    │ │       │
│   │   │         │   8×      │   │      8×      │         │ │       │
│   │   │ 512×512 │  smaller  │64 │    larger    │ 512×512 │ │       │
│   │   └─────────┘           └───┘              └─────────┘ │       │
│   │                                                         │       │
│   │   The latent z captures:                                │       │
│   │   ✓ Object shapes and structures                       │       │
│   │   ✓ Textures and patterns                              │       │
│   │   ✓ Colors and lighting                                │       │
│   │   ✓ Semantic content                                    │       │
│   │                                                         │       │
│   │   Throws away:                                          │       │
│   │   ✗ Imperceptible high-frequency details               │       │
│   │   ✗ Noise                                               │       │
│   │                                                         │       │
│   └─────────────────────────────────────────────────────────┘       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Architecture Deep Dive

### VAE (Autoencoder)

The VAE compresses images to latent space and back:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    VAE ARCHITECTURE                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ENCODER (E):                                                       │
│   ────────────                                                       │
│   Image [H, W, 3] ──▶ Latent [H/8, W/8, 4]                          │
│                                                                      │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐         │
│   │512×512×3│───▶│256×256  │───▶│128×128  │───▶│64×64×8  │         │
│   │  Input  │    │  ↓2     │    │  ↓2     │    │(μ, σ²)  │         │
│   └─────────┘    └─────────┘    └─────────┘    └────┬────┘         │
│                                                      │              │
│                                              Sample z│              │
│                                                      ▼              │
│                                                ┌─────────┐          │
│                                                │64×64×4  │          │
│                                                │ Latent  │          │
│                                                └─────────┘          │
│                                                                      │
│   DECODER (D):                                                       │
│   ────────────                                                       │
│   Latent [H/8, W/8, 4] ──▶ Image [H, W, 3]                          │
│                                                                      │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐         │
│   │64×64×4  │───▶│128×128  │───▶│256×256  │───▶│512×512×3│         │
│   │ Latent  │    │  ↑2     │    │  ↑2     │    │ Output  │         │
│   └─────────┘    └─────────┘    └─────────┘    └─────────┘         │
│                                                                      │
│   KEY PROPERTIES:                                                    │
│   - Trained separately (frozen during diffusion)                    │
│   - Uses perceptual + adversarial loss                              │
│   - KL regularization (but small weight)                            │
│   - 4 latent channels (not 3 like RGB)                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### U-Net with Cross-Attention

The U-Net is the core denoiser, modified with attention:

```
┌─────────────────────────────────────────────────────────────────────┐
│                U-NET WITH CROSS-ATTENTION                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                        Text Embeddings                               │
│                             │                                        │
│                             ▼                                        │
│   ┌─────┐              ┌─────────┐              ┌─────┐             │
│   │     │──────────────│         │──────────────│     │             │
│   │     │   Skip       │ Cross-  │    Skip      │     │             │
│   │ E   │   Connect    │Attention│   Connect    │ D   │             │
│   │ N   │──────────────│ Block   │──────────────│ E   │             │
│   │ C   │              │         │              │ C   │             │
│   │ O   │              └─────────┘              │ O   │             │
│   │ D   │                                       │ D   │             │
│   │ E   │──────────────────────────────────────│ E   │             │
│   │ R   │              ┌─────────┐              │ R   │             │
│   │     │──────────────│ Middle  │──────────────│     │             │
│   │     │              │ Block   │              │     │             │
│   └──┬──┘              └─────────┘              └──┬──┘             │
│      │                                             │                │
│      │                                             │                │
│   Noisy                                         Predicted           │
│   Latent                                         Noise              │
│   z_t                                            ε_θ                │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   EACH BLOCK CONTAINS:                                               │
│                                                                      │
│   ┌────────────────────────────────────────────┐                    │
│   │                                            │                    │
│   │   ┌──────────────┐                         │                    │
│   │   │  ResNet      │ ◀── + Time Embedding   │                    │
│   │   │  Block       │                         │                    │
│   │   └──────┬───────┘                         │                    │
│   │          │                                 │                    │
│   │          ▼                                 │                    │
│   │   ┌──────────────┐                         │                    │
│   │   │   Self-      │                         │                    │
│   │   │  Attention   │                         │                    │
│   │   └──────┬───────┘                         │                    │
│   │          │                                 │                    │
│   │          ▼                                 │                    │
│   │   ┌──────────────┐                         │                    │
│   │   │   Cross-     │ ◀── Text Embeddings    │                    │
│   │   │  Attention   │                         │                    │
│   │   └──────┬───────┘                         │                    │
│   │          │                                 │                    │
│   │          ▼                                 │                    │
│   │   ┌──────────────┐                         │                    │
│   │   │  Feed-       │                         │                    │
│   │   │  Forward     │                         │                    │
│   │   └──────────────┘                         │                    │
│   │                                            │                    │
│   └────────────────────────────────────────────┘                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Text Encoder (CLIP)

CLIP converts text to embeddings:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CLIP TEXT ENCODER                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   "A majestic lion in a sunset savanna"                             │
│                    │                                                 │
│                    ▼                                                 │
│   ┌────────────────────────────────┐                                │
│   │         TOKENIZER              │                                │
│   │   BPE (Byte-Pair Encoding)     │                                │
│   └────────────────┬───────────────┘                                │
│                    │                                                 │
│                    ▼                                                 │
│   [49406, 320, 11263, 5567, 530, 320, 15996, 30429, 49407, ...]    │
│   <start> a  majestic lion  in  a  sunset  savanna <end> <pad>...  │
│                    │                                                 │
│                    │ (max 77 tokens)                                │
│                    ▼                                                 │
│   ┌────────────────────────────────┐                                │
│   │    CLIP TEXT TRANSFORMER       │                                │
│   │    - 12 layers (SD 1.x)        │                                │
│   │    - 77 max tokens             │                                │
│   │    - 768 dim per token         │                                │
│   └────────────────┬───────────────┘                                │
│                    │                                                 │
│                    ▼                                                 │
│   ┌────────────────────────────────┐                                │
│   │     Text Embeddings            │                                │
│   │     [77, 768]                  │                                │
│   │                                │                                │
│   │  Each token → 768-dim vector   │                                │
│   │  Captures meaning & context    │                                │
│   └────────────────────────────────┘                                │
│                                                                      │
│   SD 2.x uses OpenCLIP (ViT-H): 77 × 1024                          │
│   SDXL uses CLIP + OpenCLIP: 77 × 2048                             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Noise Scheduler

```
┌─────────────────────────────────────────────────────────────────────┐
│                    NOISE SCHEDULER                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Stable Diffusion uses various schedulers:                         │
│                                                                      │
│   ┌──────────────────────────────────────────────────────────┐      │
│   │                                                          │      │
│   │   DDPM:      1000 steps, slow, high quality             │      │
│   │   DDIM:      50 steps, deterministic, good quality       │      │
│   │   PNDM:      50 steps, fast, good quality               │      │
│   │   Euler:     20-30 steps, fast                          │      │
│   │   DPM++:     15-25 steps, very fast, great quality      │      │
│   │   LCM:       4-8 steps, ultra fast                      │      │
│   │                                                          │      │
│   └──────────────────────────────────────────────────────────┘      │
│                                                                      │
│   Example: DPM++ 2M Karras (popular choice)                         │
│                                                                      │
│   Steps: 20                                                          │
│   CFG Scale: 7.5                                                    │
│   ──────────────────────────────────────────────────────────        │
│   t=1000 ──▶ t=800 ──▶ t=600 ──▶ ... ──▶ t=50 ──▶ t=0             │
│   (pure     (mostly   (half     ...     (almost  (clean            │
│    noise)    noise)   noise)            clean)   image)            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Conditioning Mechanisms

### Cross-Attention

Cross-attention is how text guides the image generation:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CROSS-ATTENTION                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Image Features (from U-Net)      Text Embeddings (from CLIP)      │
│         │                                    │                      │
│         ▼                                    ▼                      │
│   ┌───────────┐                       ┌───────────┐                 │
│   │   Query   │                       │  Key (K)  │                 │
│   │    (Q)    │                       │  Value(V) │                 │
│   │ [HW, dim] │                       │ [77, dim] │                 │
│   └─────┬─────┘                       └─────┬─────┘                 │
│         │                                   │                       │
│         └───────────────┬───────────────────┘                       │
│                         │                                           │
│                         ▼                                           │
│              ┌──────────────────────┐                               │
│              │   Attention Weights  │                               │
│              │   = softmax(QK^T/√d) │                               │
│              │     [HW, 77]         │                               │
│              └──────────┬───────────┘                               │
│                         │                                           │
│                         ▼                                           │
│              ┌──────────────────────┐                               │
│              │   Output = Attn × V  │                               │
│              │     [HW, dim]        │                               │
│              └──────────────────────┘                               │
│                                                                      │
│   INTUITION:                                                         │
│   ──────────                                                        │
│   Each image pixel "looks at" all text tokens                       │
│   Decides which words are relevant for that pixel                   │
│                                                                      │
│   Example: "A RED car on a BLUE road"                               │
│   - Car pixels attend strongly to "red" and "car"                   │
│   - Road pixels attend strongly to "blue" and "road"                │
│                                                                      │
│   Attention Map (for word "car"):                                   │
│   ┌────────────────────┐                                            │
│   │ ░░░░░░░░░░░░░░░░░░ │                                            │
│   │ ░░░░████████░░░░░░ │  High attention                           │
│   │ ░░░░████████░░░░░░ │  on car region                            │
│   │ ░░░░░░░░░░░░░░░░░░ │                                            │
│   └────────────────────┘                                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Classifier-Free Guidance

CFG amplifies the text conditioning:

```
┌─────────────────────────────────────────────────────────────────────┐
│              CLASSIFIER-FREE GUIDANCE (CFG)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   TRAINING:                                                          │
│   ──────────                                                        │
│   - Randomly drop text condition 10% of the time                    │
│   - Model learns both conditional and unconditional generation      │
│                                                                      │
│   INFERENCE:                                                         │
│   ───────────                                                        │
│   Run model TWICE per step:                                          │
│                                                                      │
│   1. Unconditional: ε_uncond = ε_θ(z_t, t, ∅)                       │
│      "What would any random image look like?"                       │
│                                                                      │
│   2. Conditional:   ε_cond = ε_θ(z_t, t, text)                      │
│      "What would THIS text describe?"                               │
│                                                                      │
│   3. Guided:        ε̃ = ε_uncond + w × (ε_cond - ε_uncond)          │
│      "Amplify the difference!"                                      │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                                                             │   │
│   │   w = 1:   Normal conditioning (no amplification)           │   │
│   │   w = 7:   Standard SD setting (good balance)               │   │
│   │   w = 15:  Strong guidance (very literal, may be distorted) │   │
│   │   w = 20+: Extreme (artifacts, oversaturated)               │   │
│   │                                                             │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   VISUAL EXAMPLE:                                                    │
│   ───────────────                                                   │
│   Prompt: "A red sports car"                                        │
│                                                                      │
│   w=1:  🚗 (might be any car, any color)                           │
│   w=7:  🏎️ (clearly red sports car)                                │
│   w=20: 🔴🏎️🔴 (VERY red, maybe too much)                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### ControlNet

ControlNet adds spatial conditioning:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CONTROLNET                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   PROBLEM: Text alone can't specify exact poses/layouts             │
│   SOLUTION: Add image-based control signals                         │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                                                             │   │
│   │   Control Input          Control Types:                     │   │
│   │   ┌─────────┐           - Canny edges                       │   │
│   │   │ Stick   │           - Depth maps                        │   │
│   │   │ Figure  │           - Pose (OpenPose)                   │   │
│   │   │    /\   │           - Segmentation                      │   │
│   │   │   /  \  │           - Scribbles                         │   │
│   │   │   |  |  │           - Normal maps                       │   │
│   │   └─────────┘                                               │   │
│   │                                                             │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   ARCHITECTURE:                                                      │
│   ──────────────                                                    │
│                                                                      │
│   Control Image ──▶ ControlNet (copy of U-Net encoder)             │
│                              │                                      │
│                              │ Zero-initialized connections        │
│                              ▼                                      │
│   Noisy Latent ───▶ Original U-Net ◀─── Text                       │
│                              │                                      │
│                              ▼                                      │
│                       Predicted Noise                               │
│                                                                      │
│   The ControlNet adds its features to the main U-Net               │
│   Trained separately, frozen SD weights                            │
│                                                                      │
│   EXAMPLE:                                                           │
│   ─────────                                                         │
│   Control: Pose skeleton       Prompt: "Iron Man"                   │
│   ┌─────────┐                  ┌─────────┐                          │
│   │    O    │                  │   🦸   │                          │
│   │   /|\   │  + "Iron Man" =  │  🦾🦿  │                          │
│   │   / \   │                  │ (posed) │                          │
│   └─────────┘                  └─────────┘                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Stable Diffusion Versions

```
┌─────────────────────────────────────────────────────────────────────┐
│              STABLE DIFFUSION VERSIONS                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   VERSION      RESOLUTION   TEXT ENCODER    U-NET SIZE    NOTES    │
│   ─────────────────────────────────────────────────────────────────│
│   SD 1.4       512×512      CLIP ViT-L      860M          Original  │
│   SD 1.5       512×512      CLIP ViT-L      860M          Most used │
│   SD 2.0       512/768      OpenCLIP ViT-H  865M          Diff style│
│   SD 2.1       512/768      OpenCLIP ViT-H  865M          Improved  │
│   SDXL 1.0     1024×1024    CLIP+OpenCLIP   2.6B          Best qual │
│   SD 3.0       Variable     T5 + CLIP       2B+           MM-DiT    │
│   SD 3.5       Variable     T5 + CLIP       2.5B+         Latest    │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   SDXL ARCHITECTURE:                                                 │
│   ──────────────────                                                │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────┐       │
│   │                                                         │       │
│   │   Text ──▶ CLIP ViT-L ──┬──▶ Concat ──▶ Cross-Attn     │       │
│   │        ──▶ OpenCLIP G ──┘                               │       │
│   │                                                         │       │
│   │   Two text encoders for richer understanding           │       │
│   │                                                         │       │
│   │   U-Net: 2.6B params (3× larger than SD 1.5)           │       │
│   │   - More attention layers                               │       │
│   │   - Larger hidden dimensions                            │       │
│   │                                                         │       │
│   │   Two-stage refinement:                                 │       │
│   │   1. Base model: 1024×1024 generation                  │       │
│   │   2. Refiner: Detail enhancement                        │       │
│   │                                                         │       │
│   └─────────────────────────────────────────────────────────┘       │
│                                                                      │
│   SD 3.0 ARCHITECTURE (MM-DiT):                                     │
│   ─────────────────────────────                                     │
│   - Uses Transformer (DiT) instead of U-Net                        │
│   - Multimodal: text and image tokens together                     │
│   - T5-XXL for text encoding                                       │
│   - Flow matching instead of DDPM                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Key Formulas

### Latent Diffusion Core

| Formula | Description |
|---------|-------------|
| $z = E(x)$ | Encode image to latent |
| $\hat{x} = D(z)$ | Decode latent to image |
| $z_t = \sqrt{\bar{\alpha}_t} z_0 + \sqrt{1-\bar{\alpha}_t} \epsilon$ | Forward diffusion in latent space |
| $\mathcal{L} = \mathbb{E}[\|\|\epsilon - \epsilon_\theta(z_t, t, c)\|\|^2]$ | Training loss with conditioning |

### Classifier-Free Guidance

$$\tilde{\epsilon}_\theta = \epsilon_\theta(z_t, t, \emptyset) + w \cdot (\epsilon_\theta(z_t, t, c) - \epsilon_\theta(z_t, t, \emptyset))$$

Where:
- $w$ = guidance scale (typically 7-15)
- $c$ = conditioning (text embeddings)
- $\emptyset$ = null/empty conditioning

### Cross-Attention

$$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right) V$$

Where:
- $Q = W_Q \cdot z$ (image features as query)
- $K = W_K \cdot c$ (text embeddings as key)
- $V = W_V \cdot c$ (text embeddings as value)

---

## Complete Implementation

### Minimal Latent Diffusion

```python
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader
import numpy as np
from tqdm import tqdm


# ============ VAE ============

class Encoder(nn.Module):
    """Simple VAE encoder for latent diffusion"""
    
    def __init__(self, in_channels=3, latent_channels=4, hidden_dims=[64, 128, 256, 512]):
        super().__init__()
        
        modules = []
        
        for h_dim in hidden_dims:
            modules.append(
                nn.Sequential(
                    nn.Conv2d(in_channels, h_dim, 3, stride=2, padding=1),
                    nn.BatchNorm2d(h_dim),
                    nn.LeakyReLU()
                )
            )
            in_channels = h_dim
        
        self.encoder = nn.Sequential(*modules)
        self.fc_mu = nn.Conv2d(hidden_dims[-1], latent_channels, 1)
        self.fc_var = nn.Conv2d(hidden_dims[-1], latent_channels, 1)
    
    def forward(self, x):
        h = self.encoder(x)
        mu = self.fc_mu(h)
        log_var = self.fc_var(h)
        return mu, log_var
    
    def sample(self, mu, log_var):
        std = torch.exp(0.5 * log_var)
        eps = torch.randn_like(std)
        return mu + eps * std


class Decoder(nn.Module):
    """Simple VAE decoder for latent diffusion"""
    
    def __init__(self, latent_channels=4, out_channels=3, hidden_dims=[512, 256, 128, 64]):
        super().__init__()
        
        self.decoder_input = nn.Conv2d(latent_channels, hidden_dims[0], 1)
        
        modules = []
        
        for i in range(len(hidden_dims) - 1):
            modules.append(
                nn.Sequential(
                    nn.ConvTranspose2d(hidden_dims[i], hidden_dims[i+1], 3, stride=2, padding=1, output_padding=1),
                    nn.BatchNorm2d(hidden_dims[i+1]),
                    nn.LeakyReLU()
                )
            )
        
        self.decoder = nn.Sequential(*modules)
        self.final = nn.Sequential(
            nn.ConvTranspose2d(hidden_dims[-1], out_channels, 3, stride=2, padding=1, output_padding=1),
            nn.Tanh()
        )
    
    def forward(self, z):
        h = self.decoder_input(z)
        h = self.decoder(h)
        return self.final(h)


class VAE(nn.Module):
    """Complete VAE for latent space compression"""
    
    def __init__(self, in_channels=3, latent_channels=4):
        super().__init__()
        self.encoder = Encoder(in_channels, latent_channels)
        self.decoder = Decoder(latent_channels, in_channels)
        self.scale_factor = 0.18215  # SD uses this scaling
    
    def encode(self, x):
        mu, log_var = self.encoder(x)
        z = self.encoder.sample(mu, log_var)
        return z * self.scale_factor
    
    def decode(self, z):
        z = z / self.scale_factor
        return self.decoder(z)
    
    def forward(self, x):
        mu, log_var = self.encoder(x)
        z = self.encoder.sample(mu, log_var)
        recon = self.decoder(z)
        return recon, mu, log_var


# ============ Time Embedding ============

class SinusoidalPositionEmbeddings(nn.Module):
    def __init__(self, dim):
        super().__init__()
        self.dim = dim
    
    def forward(self, t):
        device = t.device
        half_dim = self.dim // 2
        embeddings = np.log(10000) / (half_dim - 1)
        embeddings = torch.exp(torch.arange(half_dim, device=device) * -embeddings)
        embeddings = t[:, None] * embeddings[None, :]
        return torch.cat((embeddings.sin(), embeddings.cos()), dim=-1)


# ============ Cross-Attention ============

class CrossAttention(nn.Module):
    """Cross-attention for text conditioning"""
    
    def __init__(self, query_dim, context_dim, heads=8, dim_head=64):
        super().__init__()
        inner_dim = dim_head * heads
        
        self.heads = heads
        self.scale = dim_head ** -0.5
        
        self.to_q = nn.Linear(query_dim, inner_dim, bias=False)
        self.to_k = nn.Linear(context_dim, inner_dim, bias=False)
        self.to_v = nn.Linear(context_dim, inner_dim, bias=False)
        self.to_out = nn.Linear(inner_dim, query_dim)
    
    def forward(self, x, context=None):
        if context is None:
            context = x
        
        b, n, _ = x.shape
        h = self.heads
        
        q = self.to_q(x)
        k = self.to_k(context)
        v = self.to_v(context)
        
        # Reshape for multi-head
        q = q.view(b, n, h, -1).transpose(1, 2)
        k = k.view(b, -1, h, -1).transpose(1, 2)
        v = v.view(b, -1, h, -1).transpose(1, 2)
        
        # Attention
        attn = torch.matmul(q, k.transpose(-1, -2)) * self.scale
        attn = F.softmax(attn, dim=-1)
        
        out = torch.matmul(attn, v)
        out = out.transpose(1, 2).contiguous().view(b, n, -1)
        
        return self.to_out(out)


# ============ Transformer Block ============

class TransformerBlock(nn.Module):
    """Transformer block with self-attention and cross-attention"""
    
    def __init__(self, dim, context_dim, heads=8):
        super().__init__()
        
        self.norm1 = nn.LayerNorm(dim)
        self.self_attn = CrossAttention(dim, dim, heads)
        
        self.norm2 = nn.LayerNorm(dim)
        self.cross_attn = CrossAttention(dim, context_dim, heads)
        
        self.norm3 = nn.LayerNorm(dim)
        self.ff = nn.Sequential(
            nn.Linear(dim, dim * 4),
            nn.GELU(),
            nn.Linear(dim * 4, dim)
        )
    
    def forward(self, x, context=None):
        x = x + self.self_attn(self.norm1(x))
        x = x + self.cross_attn(self.norm2(x), context)
        x = x + self.ff(self.norm3(x))
        return x


# ============ U-Net ============

class ResBlock(nn.Module):
    """Residual block with time embedding"""
    
    def __init__(self, in_ch, out_ch, time_dim):
        super().__init__()
        
        self.conv1 = nn.Sequential(
            nn.GroupNorm(32, in_ch),
            nn.SiLU(),
            nn.Conv2d(in_ch, out_ch, 3, padding=1)
        )
        self.time_emb = nn.Sequential(
            nn.SiLU(),
            nn.Linear(time_dim, out_ch)
        )
        self.conv2 = nn.Sequential(
            nn.GroupNorm(32, out_ch),
            nn.SiLU(),
            nn.Conv2d(out_ch, out_ch, 3, padding=1)
        )
        
        self.skip = nn.Conv2d(in_ch, out_ch, 1) if in_ch != out_ch else nn.Identity()
    
    def forward(self, x, t):
        h = self.conv1(x)
        h = h + self.time_emb(t)[:, :, None, None]
        h = self.conv2(h)
        return h + self.skip(x)


class SpatialTransformer(nn.Module):
    """Spatial transformer for cross-attention"""
    
    def __init__(self, channels, context_dim, heads=8):
        super().__init__()
        self.norm = nn.GroupNorm(32, channels)
        self.proj_in = nn.Conv2d(channels, channels, 1)
        self.transformer = TransformerBlock(channels, context_dim, heads)
        self.proj_out = nn.Conv2d(channels, channels, 1)
    
    def forward(self, x, context=None):
        b, c, h, w = x.shape
        x_in = x
        x = self.norm(x)
        x = self.proj_in(x)
        x = x.view(b, c, h*w).transpose(1, 2)  # [b, h*w, c]
        x = self.transformer(x, context)
        x = x.transpose(1, 2).view(b, c, h, w)
        x = self.proj_out(x)
        return x + x_in


class LatentUNet(nn.Module):
    """U-Net for latent diffusion with cross-attention"""
    
    def __init__(self, in_channels=4, out_channels=4, model_channels=256, 
                 context_dim=768, num_heads=8, time_dim=1024):
        super().__init__()
        
        # Time embedding
        self.time_embed = nn.Sequential(
            SinusoidalPositionEmbeddings(model_channels),
            nn.Linear(model_channels, time_dim),
            nn.SiLU(),
            nn.Linear(time_dim, time_dim)
        )
        
        # Input
        self.conv_in = nn.Conv2d(in_channels, model_channels, 3, padding=1)
        
        # Encoder
        self.down1 = nn.ModuleList([
            ResBlock(model_channels, model_channels, time_dim),
            SpatialTransformer(model_channels, context_dim, num_heads),
            nn.Conv2d(model_channels, model_channels, 3, stride=2, padding=1)  # Downsample
        ])
        
        self.down2 = nn.ModuleList([
            ResBlock(model_channels, model_channels * 2, time_dim),
            SpatialTransformer(model_channels * 2, context_dim, num_heads),
            nn.Conv2d(model_channels * 2, model_channels * 2, 3, stride=2, padding=1)
        ])
        
        self.down3 = nn.ModuleList([
            ResBlock(model_channels * 2, model_channels * 4, time_dim),
            SpatialTransformer(model_channels * 4, context_dim, num_heads),
        ])
        
        # Middle
        self.mid = nn.ModuleList([
            ResBlock(model_channels * 4, model_channels * 4, time_dim),
            SpatialTransformer(model_channels * 4, context_dim, num_heads),
            ResBlock(model_channels * 4, model_channels * 4, time_dim),
        ])
        
        # Decoder
        self.up1 = nn.ModuleList([
            ResBlock(model_channels * 8, model_channels * 4, time_dim),
            SpatialTransformer(model_channels * 4, context_dim, num_heads),
        ])
        
        self.up2 = nn.ModuleList([
            nn.ConvTranspose2d(model_channels * 4, model_channels * 4, 4, stride=2, padding=1),
            ResBlock(model_channels * 6, model_channels * 2, time_dim),
            SpatialTransformer(model_channels * 2, context_dim, num_heads),
        ])
        
        self.up3 = nn.ModuleList([
            nn.ConvTranspose2d(model_channels * 2, model_channels * 2, 4, stride=2, padding=1),
            ResBlock(model_channels * 3, model_channels, time_dim),
            SpatialTransformer(model_channels, context_dim, num_heads),
        ])
        
        # Output
        self.conv_out = nn.Sequential(
            nn.GroupNorm(32, model_channels),
            nn.SiLU(),
            nn.Conv2d(model_channels, out_channels, 3, padding=1)
        )
    
    def forward(self, x, t, context=None):
        # Time embedding
        t_emb = self.time_embed(t)
        
        # Input
        h = self.conv_in(x)
        
        # Encoder
        h1 = self.down1[0](h, t_emb)
        h1 = self.down1[1](h1, context)
        h1_down = self.down1[2](h1)
        
        h2 = self.down2[0](h1_down, t_emb)
        h2 = self.down2[1](h2, context)
        h2_down = self.down2[2](h2)
        
        h3 = self.down3[0](h2_down, t_emb)
        h3 = self.down3[1](h3, context)
        
        # Middle
        h = self.mid[0](h3, t_emb)
        h = self.mid[1](h, context)
        h = self.mid[2](h, t_emb)
        
        # Decoder with skip connections
        h = torch.cat([h, h3], dim=1)
        h = self.up1[0](h, t_emb)
        h = self.up1[1](h, context)
        
        h = self.up2[0](h)
        h = torch.cat([h, h2], dim=1)
        h = self.up2[1](h, t_emb)
        h = self.up2[2](h, context)
        
        h = self.up3[0](h)
        h = torch.cat([h, h1], dim=1)
        h = self.up3[1](h, t_emb)
        h = self.up3[2](h, context)
        
        return self.conv_out(h)


# ============ Latent Diffusion Model ============

class LatentDiffusion(nn.Module):
    """Complete Latent Diffusion Model"""
    
    def __init__(self, vae, unet, text_encoder=None, num_timesteps=1000):
        super().__init__()
        
        self.vae = vae
        self.unet = unet
        self.text_encoder = text_encoder
        self.num_timesteps = num_timesteps
        
        # Noise schedule
        self.register_buffer('betas', torch.linspace(1e-4, 0.02, num_timesteps))
        self.register_buffer('alphas', 1 - self.betas)
        self.register_buffer('alpha_bars', torch.cumprod(self.alphas, dim=0))
    
    def encode(self, x):
        """Encode images to latent space"""
        return self.vae.encode(x)
    
    def decode(self, z):
        """Decode latents to images"""
        return self.vae.decode(z)
    
    def q_sample(self, z_0, t, noise=None):
        """Forward process"""
        if noise is None:
            noise = torch.randn_like(z_0)
        
        sqrt_alpha_bar = self.alpha_bars[t].sqrt()[:, None, None, None]
        sqrt_one_minus = (1 - self.alpha_bars[t]).sqrt()[:, None, None, None]
        
        return sqrt_alpha_bar * z_0 + sqrt_one_minus * noise, noise
    
    def p_sample(self, z_t, t, context=None, cfg_scale=7.5):
        """Reverse process with CFG"""
        b = z_t.shape[0]
        
        if cfg_scale > 1.0 and context is not None:
            # Classifier-free guidance
            z_in = torch.cat([z_t, z_t])
            t_in = torch.cat([t, t])
            
            # Null context for unconditional
            null_context = torch.zeros_like(context)
            context_in = torch.cat([null_context, context])
            
            noise_pred = self.unet(z_in, t_in, context_in)
            noise_uncond, noise_cond = noise_pred.chunk(2)
            noise_pred = noise_uncond + cfg_scale * (noise_cond - noise_uncond)
        else:
            noise_pred = self.unet(z_t, t, context)
        
        # Reverse step
        alpha = self.alphas[t][:, None, None, None]
        alpha_bar = self.alpha_bars[t][:, None, None, None]
        beta = self.betas[t][:, None, None, None]
        
        mean = (1 / alpha.sqrt()) * (z_t - (beta / (1 - alpha_bar).sqrt()) * noise_pred)
        
        if t[0] > 0:
            noise = torch.randn_like(z_t)
            sigma = beta.sqrt()
            return mean + sigma * noise
        else:
            return mean
    
    @torch.no_grad()
    def sample(self, batch_size, context=None, cfg_scale=7.5, device='cpu'):
        """Generate samples"""
        self.eval()
        
        # Get latent shape from VAE
        z = torch.randn(batch_size, 4, 64, 64).to(device)
        
        for t in tqdm(reversed(range(self.num_timesteps)), desc='Sampling'):
            t_batch = torch.full((batch_size,), t, device=device, dtype=torch.long)
            z = self.p_sample(z, t_batch, context, cfg_scale)
        
        # Decode to images
        images = self.decode(z)
        self.train()
        return images
    
    def training_step(self, images, context=None):
        """Single training step"""
        # Encode to latent
        z = self.encode(images)
        
        # Sample timesteps
        t = torch.randint(0, self.num_timesteps, (z.shape[0],), device=z.device)
        
        # Add noise
        z_noisy, noise = self.q_sample(z, t)
        
        # Predict noise
        noise_pred = self.unet(z_noisy, t, context)
        
        # Loss
        loss = F.mse_loss(noise_pred, noise)
        
        return loss


# ============ Simple Text Encoder (Mock) ============

class SimpleTextEncoder(nn.Module):
    """Simple text encoder for demonstration"""
    
    def __init__(self, vocab_size=10000, embed_dim=768, max_len=77):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embed_dim)
        self.pos_embedding = nn.Parameter(torch.randn(1, max_len, embed_dim))
        self.transformer = nn.TransformerEncoder(
            nn.TransformerEncoderLayer(embed_dim, 8, 2048, batch_first=True),
            num_layers=6
        )
    
    def forward(self, tokens):
        x = self.embedding(tokens) + self.pos_embedding[:, :tokens.shape[1]]
        return self.transformer(x)


# ============ Training Example ============

def train_latent_diffusion():
    """Example training loop"""
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    
    # Create models
    vae = VAE(in_channels=3, latent_channels=4).to(device)
    unet = LatentUNet(in_channels=4, out_channels=4, context_dim=768).to(device)
    text_encoder = SimpleTextEncoder().to(device)
    
    model = LatentDiffusion(vae, unet, text_encoder).to(device)
    
    # Optimizer
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-4)
    
    # Training loop (pseudo)
    print(f"Model parameters: {sum(p.numel() for p in model.parameters()):,}")
    
    # Dummy data for demonstration
    batch_size = 4
    images = torch.randn(batch_size, 3, 512, 512).to(device)
    tokens = torch.randint(0, 10000, (batch_size, 77)).to(device)
    
    for epoch in range(10):
        optimizer.zero_grad()
        
        # Get text embeddings
        context = text_encoder(tokens)
        
        # Training step
        loss = model.training_step(images, context)
        
        loss.backward()
        optimizer.step()
        
        print(f"Epoch {epoch+1} | Loss: {loss.item():.4f}")
    
    return model


if __name__ == "__main__":
    print("Latent Diffusion Model Demo")
    model = train_latent_diffusion()
```

---

## Using Diffusers Library

### Basic Text-to-Image

```python
"""
Using HuggingFace Diffusers for Stable Diffusion
"""

from diffusers import StableDiffusionPipeline, DPMSolverMultistepScheduler
import torch


# ============ Basic Usage ============

def basic_generation():
    """Basic text-to-image generation"""
    
    # Load model
    pipe = StableDiffusionPipeline.from_pretrained(
        "runwayml/stable-diffusion-v1-5",
        torch_dtype=torch.float16
    )
    pipe = pipe.to("cuda")
    
    # Generate
    prompt = "A majestic lion in a sunset savanna, digital art, highly detailed"
    
    image = pipe(
        prompt,
        num_inference_steps=50,
        guidance_scale=7.5
    ).images[0]
    
    image.save("lion.png")
    return image


# ============ With Different Schedulers ============

def fast_generation():
    """Faster generation with DPM++ scheduler"""
    
    pipe = StableDiffusionPipeline.from_pretrained(
        "runwayml/stable-diffusion-v1-5",
        torch_dtype=torch.float16
    )
    
    # Use faster scheduler
    pipe.scheduler = DPMSolverMultistepScheduler.from_config(
        pipe.scheduler.config
    )
    
    pipe = pipe.to("cuda")
    
    # Only 20 steps needed!
    image = pipe(
        "A beautiful sunset over mountains",
        num_inference_steps=20,
        guidance_scale=7.5
    ).images[0]
    
    return image


# ============ Image-to-Image ============

def image_to_image():
    """Transform existing images"""
    from diffusers import StableDiffusionImg2ImgPipeline
    from PIL import Image
    
    pipe = StableDiffusionImg2ImgPipeline.from_pretrained(
        "runwayml/stable-diffusion-v1-5",
        torch_dtype=torch.float16
    )
    pipe = pipe.to("cuda")
    
    # Load input image
    init_image = Image.open("input.png").convert("RGB")
    init_image = init_image.resize((512, 512))
    
    # Transform
    image = pipe(
        prompt="A watercolor painting of the scene",
        image=init_image,
        strength=0.75,  # How much to change (0-1)
        guidance_scale=7.5
    ).images[0]
    
    return image


# ============ Inpainting ============

def inpainting():
    """Fill in masked regions"""
    from diffusers import StableDiffusionInpaintPipeline
    from PIL import Image
    
    pipe = StableDiffusionInpaintPipeline.from_pretrained(
        "runwayml/stable-diffusion-inpainting",
        torch_dtype=torch.float16
    )
    pipe = pipe.to("cuda")
    
    # Load images
    image = Image.open("photo.png").convert("RGB")
    mask = Image.open("mask.png").convert("RGB")  # White = inpaint area
    
    # Inpaint
    result = pipe(
        prompt="A cute dog",
        image=image,
        mask_image=mask,
        guidance_scale=7.5
    ).images[0]
    
    return result


# ============ SDXL ============

def sdxl_generation():
    """Use SDXL for higher quality"""
    from diffusers import StableDiffusionXLPipeline
    
    pipe = StableDiffusionXLPipeline.from_pretrained(
        "stabilityai/stable-diffusion-xl-base-1.0",
        torch_dtype=torch.float16,
        variant="fp16"
    )
    pipe = pipe.to("cuda")
    
    # SDXL generates at 1024x1024
    image = pipe(
        prompt="A photorealistic portrait of an astronaut on Mars",
        negative_prompt="blurry, low quality",
        num_inference_steps=30,
        guidance_scale=7.5
    ).images[0]
    
    return image


# ============ ControlNet ============

def controlnet_generation():
    """Use ControlNet for structure control"""
    from diffusers import StableDiffusionControlNetPipeline, ControlNetModel
    from diffusers.utils import load_image
    import cv2
    import numpy as np
    from PIL import Image
    
    # Load ControlNet
    controlnet = ControlNetModel.from_pretrained(
        "lllyasviel/sd-controlnet-canny",
        torch_dtype=torch.float16
    )
    
    pipe = StableDiffusionControlNetPipeline.from_pretrained(
        "runwayml/stable-diffusion-v1-5",
        controlnet=controlnet,
        torch_dtype=torch.float16
    )
    pipe = pipe.to("cuda")
    
    # Create canny edge image
    image = load_image("input.png")
    image = np.array(image)
    
    low_threshold = 100
    high_threshold = 200
    canny = cv2.Canny(image, low_threshold, high_threshold)
    canny = np.stack([canny, canny, canny], axis=2)
    canny_image = Image.fromarray(canny)
    
    # Generate with control
    result = pipe(
        prompt="A detailed drawing of a building, architecture",
        image=canny_image,
        num_inference_steps=30
    ).images[0]
    
    return result


# ============ LoRA Loading ============

def lora_generation():
    """Load custom LoRA weights"""
    from diffusers import StableDiffusionPipeline
    
    pipe = StableDiffusionPipeline.from_pretrained(
        "runwayml/stable-diffusion-v1-5",
        torch_dtype=torch.float16
    )
    
    # Load LoRA weights
    pipe.load_lora_weights("path/to/lora/weights")
    
    pipe = pipe.to("cuda")
    
    # Generate with LoRA style
    image = pipe(
        prompt="A portrait in the style of <lora_trigger>",
        num_inference_steps=30
    ).images[0]
    
    return image


# ============ Memory Optimization ============

def memory_efficient_generation():
    """Optimize for low VRAM"""
    
    pipe = StableDiffusionPipeline.from_pretrained(
        "runwayml/stable-diffusion-v1-5",
        torch_dtype=torch.float16
    )
    
    # Enable memory optimizations
    pipe.enable_attention_slicing()  # Slice attention computation
    pipe.enable_vae_slicing()        # Slice VAE computation
    
    # Or use xformers for efficiency
    # pipe.enable_xformers_memory_efficient_attention()
    
    # Or offload to CPU
    # pipe.enable_model_cpu_offload()
    
    pipe = pipe.to("cuda")
    
    image = pipe("A beautiful landscape").images[0]
    return image


# ============ Batch Generation ============

def batch_generation():
    """Generate multiple images"""
    
    pipe = StableDiffusionPipeline.from_pretrained(
        "runwayml/stable-diffusion-v1-5",
        torch_dtype=torch.float16
    )
    pipe = pipe.to("cuda")
    
    prompts = [
        "A red apple",
        "A blue car",
        "A green forest",
        "A yellow sun"
    ]
    
    images = pipe(
        prompts,
        num_inference_steps=30,
        guidance_scale=7.5
    ).images
    
    for i, img in enumerate(images):
        img.save(f"output_{i}.png")
    
    return images


if __name__ == "__main__":
    print("Run the individual functions to test")
```

---

## Mini Project: Custom Image Generation

```python
"""
Mini Project: Custom Stable Diffusion Application
==================================================
Build a complete image generation app with various features
"""

import torch
from diffusers import (
    StableDiffusionPipeline,
    StableDiffusionImg2ImgPipeline,
    DPMSolverMultistepScheduler,
    EulerAncestralDiscreteScheduler
)
from PIL import Image
import gradio as gr
import numpy as np


class StableDiffusionApp:
    """Complete Stable Diffusion application"""
    
    def __init__(self, model_id="runwayml/stable-diffusion-v1-5"):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.dtype = torch.float16 if self.device == "cuda" else torch.float32
        
        print(f"Loading model on {self.device}...")
        
        # Text-to-Image pipeline
        self.txt2img = StableDiffusionPipeline.from_pretrained(
            model_id,
            torch_dtype=self.dtype
        ).to(self.device)
        
        # Image-to-Image shares components
        self.img2img = StableDiffusionImg2ImgPipeline(
            vae=self.txt2img.vae,
            text_encoder=self.txt2img.text_encoder,
            tokenizer=self.txt2img.tokenizer,
            unet=self.txt2img.unet,
            scheduler=self.txt2img.scheduler,
            safety_checker=self.txt2img.safety_checker,
            feature_extractor=self.txt2img.feature_extractor
        )
        
        # Available schedulers
        self.schedulers = {
            "DPM++ 2M": DPMSolverMultistepScheduler,
            "Euler a": EulerAncestralDiscreteScheduler,
        }
        
        # Enable memory optimization
        self.txt2img.enable_attention_slicing()
        
        print("Model loaded!")
    
    def set_scheduler(self, scheduler_name):
        """Change the noise scheduler"""
        scheduler_class = self.schedulers.get(scheduler_name)
        if scheduler_class:
            self.txt2img.scheduler = scheduler_class.from_config(
                self.txt2img.scheduler.config
            )
            self.img2img.scheduler = self.txt2img.scheduler
    
    def text_to_image(
        self,
        prompt: str,
        negative_prompt: str = "",
        width: int = 512,
        height: int = 512,
        num_steps: int = 30,
        guidance_scale: float = 7.5,
        seed: int = -1,
        num_images: int = 1
    ):
        """Generate images from text"""
        
        # Set seed
        if seed == -1:
            seed = np.random.randint(0, 2**32)
        generator = torch.Generator(device=self.device).manual_seed(seed)
        
        # Generate
        result = self.txt2img(
            prompt=prompt,
            negative_prompt=negative_prompt if negative_prompt else None,
            width=width,
            height=height,
            num_inference_steps=num_steps,
            guidance_scale=guidance_scale,
            generator=generator,
            num_images_per_prompt=num_images
        )
        
        return result.images, seed
    
    def image_to_image(
        self,
        image: Image.Image,
        prompt: str,
        negative_prompt: str = "",
        strength: float = 0.75,
        num_steps: int = 30,
        guidance_scale: float = 7.5,
        seed: int = -1
    ):
        """Transform an existing image"""
        
        # Resize to 512
        image = image.convert("RGB")
        image = image.resize((512, 512))
        
        # Set seed
        if seed == -1:
            seed = np.random.randint(0, 2**32)
        generator = torch.Generator(device=self.device).manual_seed(seed)
        
        # Generate
        result = self.img2img(
            prompt=prompt,
            image=image,
            negative_prompt=negative_prompt if negative_prompt else None,
            strength=strength,
            num_inference_steps=num_steps,
            guidance_scale=guidance_scale,
            generator=generator
        )
        
        return result.images[0], seed
    
    def prompt_enhancement(self, simple_prompt: str) -> str:
        """Enhance a simple prompt with quality terms"""
        quality_terms = [
            "highly detailed",
            "professional",
            "sharp focus",
            "8k resolution",
            "masterpiece"
        ]
        return f"{simple_prompt}, {', '.join(quality_terms)}"


def create_gradio_interface(app: StableDiffusionApp):
    """Create a Gradio web interface"""
    
    with gr.Blocks(title="Stable Diffusion") as demo:
        gr.Markdown("# 🎨 Stable Diffusion Image Generator")
        
        with gr.Tab("Text to Image"):
            with gr.Row():
                with gr.Column():
                    prompt = gr.Textbox(label="Prompt", placeholder="A beautiful sunset...")
                    negative_prompt = gr.Textbox(label="Negative Prompt", placeholder="blurry, ugly...")
                    
                    with gr.Row():
                        width = gr.Slider(256, 768, value=512, step=64, label="Width")
                        height = gr.Slider(256, 768, value=512, step=64, label="Height")
                    
                    steps = gr.Slider(10, 50, value=30, step=1, label="Steps")
                    cfg = gr.Slider(1, 20, value=7.5, step=0.5, label="CFG Scale")
                    seed = gr.Number(value=-1, label="Seed (-1 for random)")
                    
                    generate_btn = gr.Button("Generate", variant="primary")
                
                with gr.Column():
                    output_image = gr.Image(label="Generated Image")
                    output_seed = gr.Number(label="Used Seed")
            
            generate_btn.click(
                fn=lambda *args: app.text_to_image(*args)[0][0],
                inputs=[prompt, negative_prompt, width, height, steps, cfg, seed],
                outputs=[output_image]
            )
        
        with gr.Tab("Image to Image"):
            with gr.Row():
                with gr.Column():
                    input_image = gr.Image(type="pil", label="Input Image")
                    i2i_prompt = gr.Textbox(label="Prompt")
                    i2i_strength = gr.Slider(0.1, 1.0, value=0.75, label="Strength")
                    
                    i2i_btn = gr.Button("Transform", variant="primary")
                
                with gr.Column():
                    i2i_output = gr.Image(label="Output")
            
            i2i_btn.click(
                fn=lambda img, p, s: app.image_to_image(img, p, strength=s)[0],
                inputs=[input_image, i2i_prompt, i2i_strength],
                outputs=[i2i_output]
            )
    
    return demo


# ============ Run Application ============

if __name__ == "__main__":
    # Initialize app
    app = StableDiffusionApp()
    
    # Option 1: Direct generation
    images, seed = app.text_to_image(
        prompt="A cyberpunk city at night, neon lights, rain, highly detailed",
        negative_prompt="blurry, low quality",
        num_steps=30,
        guidance_scale=7.5
    )
    images[0].save("cyberpunk_city.png")
    print(f"Generated with seed: {seed}")
    
    # Option 2: Launch Gradio interface
    # demo = create_gradio_interface(app)
    # demo.launch()
```

---

## Homework

### Level 1: Fundamentals (Beginner)

1. **Explain why latent diffusion is faster than pixel-space diffusion**
   - Calculate the compression ratio for 512×512 → 64×64×4

2. **What is the role of each component?**
   - VAE Encoder
   - VAE Decoder
   - U-Net
   - Text Encoder (CLIP)

3. **Implement CFG formula manually**
   - Given ε_cond and ε_uncond, compute guided prediction

### Level 2: Intermediate Implementation

4. **Use Diffusers library to generate images**
   - Text-to-image with different prompts
   - Try different schedulers (DDIM, DPM++, Euler)
   - Compare quality and speed

5. **Implement image-to-image transformation**
   - Load an image, transform with a prompt
   - Experiment with different strength values

6. **Visualize cross-attention maps**
   - Show which image regions attend to which words
   - Use DAAM or similar library

### Level 3: Advanced Challenges

7. **Fine-tune SD on a custom dataset using LoRA**
   - Collect 20-50 images
   - Train LoRA weights
   - Generate with your custom style

8. **Implement a simple ControlNet from scratch**
   - Copy U-Net encoder
   - Add zero-initialized connections
   - Train on edge → image pairs

9. **Build an inpainting pipeline**
   - Mask selection
   - Noise scheduling for masked regions

### Level 4: Research-Level

10. **Compare SD 1.5, SD 2.1, and SDXL**
    - Architecture differences
    - Quality metrics (FID, CLIP score)

11. **Implement consistency distillation**
    - Train student to match teacher in fewer steps
    - Achieve 4-step generation

12. **Build a multi-ControlNet setup**
    - Combine pose + depth control
    - Weight balancing between controls

---

## Common Mistakes

### ❌ Mistake 1: Wrong Image Normalization

```python
# BAD: SD expects [-1, 1], not [0, 1]
image = load_image() / 255.0
z = vae.encode(image)

# GOOD: Normalize to [-1, 1]
image = (load_image() / 127.5) - 1.0
z = vae.encode(image)
```

### ❌ Mistake 2: Forgetting VAE Scaling

```python
# BAD: VAE outputs unscaled latents
z = vae.encode(image).latent_dist.sample()

# GOOD: Apply scaling factor
z = vae.encode(image).latent_dist.sample() * 0.18215
```

### ❌ Mistake 3: Wrong Text Padding

```python
# BAD: Different length text embeddings
text1 = encode("cat")       # length 3
text2 = encode("dog")       # length 3
# But SD expects length 77!

# GOOD: Pad to max_length
tokens = tokenizer(text, padding="max_length", max_length=77)
```

### ❌ Mistake 4: CFG Without Null Conditioning

```python
# BAD: Only running conditional
noise_pred = unet(z_t, t, text_emb)
guided = noise_pred * cfg_scale  # Wrong!

# GOOD: Need both conditional and unconditional
noise_uncond = unet(z_t, t, null_emb)
noise_cond = unet(z_t, t, text_emb)
guided = noise_uncond + cfg_scale * (noise_cond - noise_uncond)
```

### ❌ Mistake 5: Memory Issues

```python
# BAD: Full precision on GPU
pipe = StableDiffusionPipeline.from_pretrained(model_id)  # float32

# GOOD: Use fp16 and optimizations
pipe = StableDiffusionPipeline.from_pretrained(
    model_id,
    torch_dtype=torch.float16
)
pipe.enable_attention_slicing()
```

### ❌ Mistake 6: Wrong Scheduler Steps

```python
# BAD: Using wrong step count for scheduler
pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config)
image = pipe(prompt, num_inference_steps=1000)  # DPM++ only needs 20-30!

# GOOD: Match steps to scheduler
image = pipe(prompt, num_inference_steps=25)  # Optimal for DPM++
```

---

## Interview Questions & Answers

### Q1: What is Latent Diffusion and why is it used? (Beginner)

**Answer:**

**Latent Diffusion** runs the diffusion process in a compressed latent space instead of pixel space.

**Why use it:**
1. **Efficiency**: 512×512×3 (786K) → 64×64×4 (16K) = 48× less compute
2. **Quality**: VAE removes perceptually irrelevant details
3. **Speed**: Faster training and inference
4. **Memory**: Fits on consumer GPUs (8GB+)

**Process:**
```
Image → VAE Encoder → Latent → Diffusion → Clean Latent → VAE Decoder → Image
```

The VAE is trained separately to compress/decompress images. The U-Net only works in the small latent space.

---

### Q2: Explain the complete Stable Diffusion pipeline. (Intermediate)

**Answer:**

**Components:**
1. **Text Encoder (CLIP)**: Text → embeddings [77, 768]
2. **VAE**: Image ↔ Latent compression
3. **U-Net**: Noise prediction with cross-attention
4. **Scheduler**: Controls denoising steps

**Generation flow:**
```
1. Encode text: "A cat" → CLIP → [77, 768] embeddings
2. Start noise: z_T ~ N(0, I) [64, 64, 4]
3. Denoise loop (50 steps):
   - Predict noise: ε = UNet(z_t, t, text_emb)
   - Apply CFG: ε̃ = ε_uncond + 7.5 × (ε_cond - ε_uncond)
   - Update: z_{t-1} = scheduler_step(z_t, ε̃, t)
4. Decode: image = VAE.decode(z_0)
5. Output: 512×512×3 image
```

---

### Q3: How does cross-attention enable text-to-image? (Intermediate)

**Answer:**

Cross-attention allows image features to "query" text features:

```
Query (Q): Image features [HW, dim]
Key (K):   Text embeddings [77, dim]
Value (V): Text embeddings [77, dim]

Attention = softmax(QK^T / √d) × V
```

**How it works:**
- Each spatial position in the image attends to all text tokens
- Learns which words are relevant for which image regions
- "cat" tokens activate on cat regions
- "sitting" tokens activate on pose-related regions

**Result:** Text semantics guide the generation at every spatial location.

---

### Q4: Explain Classifier-Free Guidance (CFG). (Advanced)

**Answer:**

**Problem:** Conditional generation may not follow the prompt strongly enough.

**Solution:** Amplify the conditional signal.

**Training:**
- Drop conditioning 10% of time (unconditional training)
- Model learns both p(x|c) and p(x)

**Inference:**
```
ε_uncond = model(z_t, t, null)      # What would any image be?
ε_cond = model(z_t, t, text)        # What would THIS text be?
ε_guided = ε_uncond + w × (ε_cond - ε_uncond)
```

**Guidance scale w:**
- w = 1: Normal conditioning
- w = 7-12: Good balance (standard)
- w > 15: Very literal, may have artifacts

**Intuition:** The difference (ε_cond - ε_uncond) points toward the condition. Scaling amplifies this direction.

---

### Q5: What is ControlNet and how does it work? (Advanced)

**Answer:**

**ControlNet** adds spatial conditioning (poses, edges, depth) to Stable Diffusion.

**Architecture:**
```
Control Image → ControlNet (copy of U-Net encoder)
                     │
                     │ Zero-initialized connections
                     ▼
Noisy Latent ───▶ Original U-Net ───▶ Noise prediction
```

**Key design:**
1. Copy the U-Net encoder weights
2. Add "zero convolutions" (initialized to 0)
3. Freeze original SD weights
4. Only train the copy + zero convs

**Why zero initialization:**
- At start, ControlNet output = 0
- Original SD works normally
- Gradually learns control signal

**Control types:**
- Canny edges: Structure
- OpenPose: Human poses
- Depth: 3D layout
- Scribble: User sketches

---

### Q6: Compare SD 1.5, SD 2.1, and SDXL. (Senior)

**Answer:**

| Feature | SD 1.5 | SD 2.1 | SDXL |
|---------|--------|--------|------|
| Resolution | 512×512 | 512/768 | 1024×1024 |
| U-Net size | 860M | 865M | 2.6B |
| Text encoder | CLIP ViT-L (768d) | OpenCLIP ViT-H (1024d) | CLIP + OpenCLIP (2048d) |
| Training data | LAION 512 | LAION 768 (filtered) | LAION (more filtered) |
| Negative prompt | Works well | Often needed | Less needed |
| Community models | Most | Some | Growing |

**Key differences:**
- **SD 2.x**: Different text encoder, different style, needs different prompting
- **SDXL**: Dual text encoders, much larger U-Net, native high-res, two-stage refinement

**When to use:**
- SD 1.5: Maximum community support, most LoRAs/embeddings
- SDXL: Best quality, official support

---

### Q7: How would you optimize Stable Diffusion for production? (Senior)

**Answer:**

**1. Model Optimization:**
```python
# FP16
pipe = pipe.to(torch.float16)

# Attention optimization
pipe.enable_xformers_memory_efficient_attention()

# Compile (PyTorch 2.0)
pipe.unet = torch.compile(pipe.unet, mode="reduce-overhead")
```

**2. Faster Schedulers:**
- DPM++ 2M Karras: 20 steps
- LCM/Lightning: 4-8 steps

**3. Batching:**
- Process multiple prompts together
- Dynamic batching for varying loads

**4. Caching:**
- Cache text embeddings
- Pre-compute common prompts

**5. Hardware:**
- TensorRT conversion
- Multiple GPUs with load balancing
- Spot instances for cost

**6. Architecture:**
- Queue-based async processing
- CDN for generated images
- Rate limiting

**Typical production setup:**
- 8× A10G GPUs
- Queue (Redis/SQS)
- Auto-scaling group
- ~0.5-2 sec per image

---

### Q8: Debug this SD code. What's wrong? (Senior/Debugging)

```python
pipe = StableDiffusionPipeline.from_pretrained("sd-v1-5")
pipe = pipe.to("cuda")

image = pipe("A cat", num_inference_steps=20).images[0]
image.save("output.png")  # Gets OOM error
```

**Answer:**

**Issues:**

1. **Missing dtype**: Default is float32, uses 2× memory
2. **No memory optimization**: Large attention matrices
3. **Model ID might be wrong**: Need full HF path

**Fixed:**
```python
pipe = StableDiffusionPipeline.from_pretrained(
    "runwayml/stable-diffusion-v1-5",  # Full path
    torch_dtype=torch.float16           # Half precision
)
pipe = pipe.to("cuda")

# Memory optimizations
pipe.enable_attention_slicing()
# Or: pipe.enable_xformers_memory_efficient_attention()

# Clear cache before generation
torch.cuda.empty_cache()

image = pipe("A cat", num_inference_steps=20).images[0]
image.save("output.png")
```

**Additional fixes for very low VRAM:**
```python
pipe.enable_model_cpu_offload()  # Move parts to CPU
pipe.enable_sequential_cpu_offload()  # More aggressive
```

---

### Q9: How would you add a new conditioning modality to SD? (Senior)

**Answer:**

**Approach 1: ControlNet style**
```python
# Copy encoder, add zero convolutions
class NewControlNet(nn.Module):
    def __init__(self, original_unet):
        # Copy encoder weights
        self.encoder = copy.deepcopy(original_unet.encoder)
        
        # Zero convolutions
        self.zero_convs = nn.ModuleList([
            ZeroConv2d(ch, ch) for ch in channels
        ])
    
    def forward(self, control_input, timestep):
        features = []
        h = self.input_conv(control_input)
        for block, zero_conv in zip(self.encoder, self.zero_convs):
            h = block(h, timestep)
            features.append(zero_conv(h))
        return features

# In main U-Net, add features
for i, feature in enumerate(control_features):
    unet_hidden[i] = unet_hidden[i] + feature
```

**Approach 2: Cross-attention**
```python
# Add new cross-attention layers
class MultiModalCrossAttention(nn.Module):
    def __init__(self, dim, context_dims):
        self.text_attn = CrossAttention(dim, context_dims['text'])
        self.audio_attn = CrossAttention(dim, context_dims['audio'])
    
    def forward(self, x, contexts):
        x = x + self.text_attn(x, contexts['text'])
        x = x + self.audio_attn(x, contexts['audio'])
        return x
```

**Training:**
- Freeze original SD weights
- Train only new components
- Use paired data (image + new modality)

---

### Q10: Design a real-time image generation system. (FAANG System Design)

**Answer:**

**Requirements:**
- < 2 second latency
- 1000 requests/minute peak
- High availability

**Architecture:**
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Users ──▶ CDN ──▶ API Gateway ──▶ Load Balancer              │
│                                          │                     │
│                    ┌─────────────────────┼─────────────────┐   │
│                    │                     │                 │   │
│                    ▼                     ▼                 ▼   │
│              ┌──────────┐         ┌──────────┐      ┌──────────┐│
│              │ Worker 1 │         │ Worker 2 │ ...  │ Worker N ││
│              │ (A100)   │         │ (A100)   │      │ (A100)   ││
│              └────┬─────┘         └────┬─────┘      └────┬─────┘│
│                   │                    │                 │     │
│                   └────────────────────┼─────────────────┘     │
│                                        │                       │
│                                        ▼                       │
│                              ┌─────────────────┐               │
│                              │  Object Storage │               │
│                              │   (S3/GCS)      │               │
│                              └─────────────────┘               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key components:**

1. **Request Queue**: Redis/SQS
   - Priority queue for paid users
   - Deduplication for same prompts

2. **GPU Workers**: A100/H100
   - TensorRT optimized models
   - Batch processing (4-8 images)
   - LCM for 4-step generation

3. **Caching**:
   - Prompt hash → cached images
   - Text embeddings cache
   - Pre-generated popular prompts

4. **Storage**:
   - Generated images in S3
   - CDN for delivery
   - Expiration policies

5. **Scaling**:
   - Kubernetes auto-scaling
   - Spot instances for cost
   - Multi-region deployment

**Optimizations for < 2s:**
- LCM-LoRA: 4 steps instead of 30
- TensorRT: 2× speedup
- Warm workers: Models pre-loaded
- Edge caching: Popular prompts

**Cost estimate:**
- A100: ~$3/hour
- 1000 req/min × 60 min = 60K images/hour
- Cost per image: ~$0.00005

---

## Summary

### Key Takeaways

1. **Latent Diffusion = Diffusion in Compressed Space**
   - VAE compresses 512×512×3 → 64×64×4 (48×)
   - Much faster training and inference

2. **Key Components:**
   - VAE: Image ↔ Latent
   - U-Net: Denoiser with cross-attention
   - CLIP: Text → embeddings
   - Scheduler: Controls denoising

3. **Cross-Attention enables text control**
   - Image queries text tokens
   - Each pixel attends to relevant words

4. **CFG amplifies conditioning**
   - Run twice: conditional + unconditional
   - Scale the difference

5. **ControlNet adds spatial control**
   - Poses, edges, depth maps
   - Zero-initialized additions

### Quick Reference

| Component | Input | Output | Purpose |
|-----------|-------|--------|---------|
| CLIP | Text | [77, 768] | Text understanding |
| VAE Encoder | [512, 512, 3] | [64, 64, 4] | Compress |
| U-Net | Latent + t + text | Noise | Denoise |
| VAE Decoder | [64, 64, 4] | [512, 512, 3] | Decompress |

---

**Next Up**: `06-Conditioning-and-Guidance.md` - Deep dive into conditioning mechanisms, prompt engineering, and guidance techniques.

Type `CONTINUE` to proceed.
