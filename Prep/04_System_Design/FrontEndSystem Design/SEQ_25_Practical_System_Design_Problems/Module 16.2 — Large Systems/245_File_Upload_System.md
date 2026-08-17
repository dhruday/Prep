# 245 – File Upload System with Progress & Resume

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

A File Upload System with progress tracking and resume capability handles large file transfers reliably. It uses **chunked uploads** (splitting files into parts for resumability), **progress tracking** (XHR `onprogress` or `fetch` with ReadableStream), **drag-and-drop** (HTML5 DnD API), **client-side validation** (type, size, dimensions), **concurrent uploads** (parallel chunks with a concurrency limit), and **resume on failure** (tracking which chunks succeeded). This tests networking knowledge, user experience design, and error handling depth.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Architecture

```
┌─────────────────────────────────────────────┐
│              File Upload System              │
│                                              │
│  ┌──────────────────────┐                   │
│  │    Drop Zone          │                   │
│  │  📁 Drag files here   │                   │
│  │  or [Browse]          │                   │
│  └──────────────────────┘                   │
│                                              │
│  Upload Queue:                               │
│  ┌──────────────────────────────────────┐   │
│  │ photo.jpg    [████████░░]  80%  ⏸ ✕ │   │
│  │ video.mp4    [██░░░░░░░░]  20%  ⏸ ✕ │   │
│  │ doc.pdf      [██████████] 100%  ✓   │   │
│  │ report.xlsx  Queued...         ✕    │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### Chunked Upload Protocol

```typescript
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

async function uploadFile(file: File, onProgress: (pct: number) => void) {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const uploadId = await initUpload(file.name, file.size, totalChunks);
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    
    await uploadChunk(uploadId, i, chunk);
    onProgress(((i + 1) / totalChunks) * 100);
  }
  
  await completeUpload(uploadId); // server assembles chunks
}
```

### Resume Capability

```typescript
async function resumeUpload(uploadId: string, file: File) {
  // Ask server which chunks were received
  const { completedChunks } = await fetch(`/api/uploads/${uploadId}/status`).then(r => r.json());
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  
  for (let i = 0; i < totalChunks; i++) {
    if (completedChunks.includes(i)) continue; // skip completed chunks
    const chunk = file.slice(i * CHUNK_SIZE, Math.min((i + 1) * CHUNK_SIZE, file.size));
    await uploadChunk(uploadId, i, chunk);
  }
  
  await completeUpload(uploadId);
}
```

### Progress Tracking

**XMLHttpRequest (supports upload progress natively):**
```typescript
function uploadWithProgress(url: string, data: FormData, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress((e.loaded / e.total) * 100);
    };
    xhr.onload = () => xhr.status === 200 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`));
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.open('POST', url);
    xhr.send(data);
  });
}
```

### Drag and Drop

```typescript
function DropZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const files = Array.from(e.dataTransfer.files);
        onFiles(files);
      }}
      role="button" tabIndex={0} aria-label="Drop zone. Drag files here or press Enter to browse."
      className={isDragOver ? 'dropzone active' : 'dropzone'}
    >
      <p>Drag files here or <button onClick={() => fileInputRef.current?.click()}>Browse</button></p>
    </div>
  );
}
```

### Client-Side Validation

```typescript
function validateFile(file: File): string | null {
  const MAX_SIZE = 100 * 1024 * 1024; // 100MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf', 'video/mp4'];
  
  if (!ALLOWED_TYPES.includes(file.type)) return `File type ${file.type} not allowed`;
  if (file.size > MAX_SIZE) return `File size exceeds ${MAX_SIZE / 1024 / 1024}MB limit`;
  return null; // valid
}
```

### Anti-Patterns

- ❌ Uploading entire file in one request — times out for large files, no resume
- ❌ No client-side validation — wasting bandwidth uploading invalid files
- ❌ Using `fetch` for progress tracking — `fetch` doesn't support upload progress natively (use XHR or ReadableStream workaround)
- ❌ No retry logic — a single network glitch fails the entire upload
- ❌ Unlimited concurrent uploads — can overwhelm the server; use a queue with concurrency limit (3-5)

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### FAANG: Google Drive
Google Drive uses chunked resumable uploads. The flow: initiate (get upload URI) → upload chunks with byte ranges → complete. If interrupted, client queries the server for the last received byte and resumes from there.

### Hruday @ SAP Labs
At SAP, Fiori apps handle document uploads for business processes. The `sap.m.UploadCollection` control manages multiple uploads with progress indicators. Large document uploads to DMS (Document Management Service) use chunked protocols similar to this design.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer

*"I'd build a chunked upload system with three phases: initiate, upload chunks, and complete. Files are split into 5MB chunks. Each chunk is uploaded independently with retry logic (3 retries with exponential backoff).*

*Progress: I use XHR's `upload.onprogress` for per-chunk progress, and track overall progress as `completedChunks / totalChunks`. The UI shows a progress bar per file.*

*Resume: If upload fails, the client queries the server for which chunks were received. On resume, it skips completed chunks and uploads only the missing ones. The upload state (uploadId, completedChunks) is persisted in sessionStorage so it survives page refreshes.*

*Concurrency: I use an upload queue with a max of 3 concurrent uploads. New files are queued and start when a slot opens.*

*Drag-and-drop: HTML5 DnD API with a visual drop zone. Files are validated client-side (type, size) before queuing. The drop zone is accessible — keyboard users can press Enter to open a file browser. At SAP, we built similar upload flows for document management services."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Upload Manager with Queue and Concurrency Control
class UploadManager {
  private queue: UploadTask[] = [];
  private active = 0;
  private maxConcurrent = 3;
  private subscribers = new Map<string, (status: UploadStatus) => void>();

  async addFile(file: File) {
    const error = validateFile(file);
    if (error) { this.notify(file.name, { status: 'error', error }); return; }

    const task: UploadTask = { file, id: crypto.randomUUID(), status: 'queued', progress: 0 };
    this.queue.push(task);
    this.notify(task.id, { status: 'queued', progress: 0 });
    this.processQueue();
  }

  private async processQueue() {
    while (this.active < this.maxConcurrent && this.queue.length > 0) {
      const task = this.queue.shift()!;
      this.active++;
      this.uploadWithRetry(task)
        .then(() => this.notify(task.id, { status: 'complete', progress: 100 }))
        .catch(e => this.notify(task.id, { status: 'error', error: e.message }))
        .finally(() => { this.active--; this.processQueue(); });
    }
  }

  private async uploadWithRetry(task: UploadTask, retries = 3) {
    const totalChunks = Math.ceil(task.file.size / CHUNK_SIZE);
    const uploadId = await initUpload(task.file.name, task.file.size, totalChunks);

    for (let i = 0; i < totalChunks; i++) {
      let attempt = 0;
      while (attempt < retries) {
        try {
          const chunk = task.file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
          await uploadChunk(uploadId, i, chunk);
          task.progress = ((i + 1) / totalChunks) * 100;
          this.notify(task.id, { status: 'uploading', progress: task.progress });
          break;
        } catch {
          attempt++;
          if (attempt >= retries) throw new Error(`Chunk ${i} failed after ${retries} retries`);
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        }
      }
    }
    await completeUpload(uploadId);
  }
}
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"File Upload = Chunk (5MB) + Resume (skip completed) + XHR Progress + Queue (max 3)."** Three phases: initiate → upload chunks → complete. Resume: query server for received chunks, skip them. Progress via XHR `upload.onprogress`. Queue with concurrency limit (3). DnD: HTML5 drag events + file browser fallback. Client-side validate: type + size. Retry: exponential backoff per chunk.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Tests networking knowledge, error handling, UX for long-running operations, and system resilience — critical for any file-heavy application.
**How:** Chunked uploads (5MB per chunk). Resume via server query for completed chunks. XHR for progress tracking. Upload queue with concurrency control. Drag-and-drop + file browser. Client-side validation. Retry with exponential backoff.
**Companies:** Microsoft (OneDrive, SharePoint), Adobe (Creative Cloud assets), Salesforce (document uploads), Cisco (Webex file sharing).
