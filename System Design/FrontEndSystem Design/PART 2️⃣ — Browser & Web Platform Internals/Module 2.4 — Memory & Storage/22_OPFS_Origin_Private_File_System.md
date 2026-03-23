# Topic 27: OPFS — Origin Private File System

---

## 1. High-Level Explanation

The **Origin Private File System (OPFS)** is a new browser storage API (part of the File System Access API) that gives web apps a private, high-performance filesystem — invisible to the user and accessible only by the origin that created it. Unlike IndexedDB (key-value), OPFS provides a true hierarchical filesystem with files and directories, making it ideal for apps that need to manage large binary files, implement SQLite in the browser, or run complex file operations in a Web Worker.

---

## 2. Deep-Dive

### Why OPFS Exists

Before OPFS, storing binary data in the browser meant:
- **IndexedDB**: Good for structured data, but binary blobs are inefficient and slow for large files
- **Cache API**: Designed for HTTP responses, not arbitrary file storage
- **`<input type="file">`**: Read-only, no write-back to disk

OPFS fills the gap: a real filesystem for large binary files (SQLite databases, WebAssembly files, large assets) with origin isolation.

### API Overview

```
navigator.storage.getDirectory()
  → FileSystemDirectoryHandle (root)
    → getDirectoryHandle('subdir', { create: true })
      → FileSystemDirectoryHandle
    → getFileHandle('data.db', { create: true })
      → FileSystemFileHandle
        → createSyncAccessHandle() (only in Web Workers!)
        → createWritable()
```

### Two Access Modes

**1. Async API (main thread or worker):**
```javascript
const root = await navigator.storage.getDirectory();
const fileHandle = await root.getFileHandle('data.json', { create: true });
const writable = await fileHandle.createWritable();
await writable.write(JSON.stringify({ key: 'value' }));
await writable.close();
```

**2. Synchronous Access Handle (ONLY in Web Workers — high performance):**
```javascript
// Inside a Web Worker only
const root = await navigator.storage.getDirectory();
const fileHandle = await root.getFileHandle('sqlite.db', { create: true });
const syncHandle = await fileHandle.createSyncAccessHandle(); // sync!

const buffer = new Uint8Array(1024);
const bytesRead = syncHandle.read(buffer, { at: 0 }); // sync read
syncHandle.write(buffer, { at: 0 });                   // sync write
syncHandle.flush();                                     // flush to disk
syncHandle.close();
```

The synchronous API is critical for running **SQLite in WebAssembly** — the SQLite WASM build uses OPFS sync access handles as its VFS (Virtual File System layer).

### Key Characteristics

- **Origin-isolated**: No other origin or app can access it. Not visible in the OS file picker.
- **Quota-counted**: Counts against the same quota as IndexedDB/Cache API
- **No user permission needed**: Unlike the public File System Access API (which shows OS file picker)
- **Persistent by default**: Part of origin's storage (still evictable unless persist() requested)
- **Streaming-friendly**: Can read/write at specific byte offsets — ideal for random-access files

### OPFS vs IndexedDB vs Cache API

| Feature | OPFS | IndexedDB | Cache API |
|---|---|---|---|
| Data model | Files/dirs | Key-value | HTTP request/response |
| Binary performance | Excellent | Good | Good |
| Random access | ✅ byte-level | ❌ | ❌ |
| Sync API (Worker) | ✅ | ❌ | ❌ |
| Use case | SQLite, WASM, large files | Structured app data | Network cache |

---

## 3. Real-World Examples

### SQLite in the Browser (Hruday's Research Context)

Adobe Acrobat Web uses OPFS to store the PDF document's SQLite-based index in the browser for fast search. The SQLite WASM build (`@sqlite.org/sqlite-wasm`) uses OPFS sync access handles as the VFS:
- PDF loaded into OPFS as binary file
- SQLite full-text search index lives in OPFS
- Queries run at near-native speed in a Web Worker

### Offline Document Editor

Notion-like editor storing document revisions:
- Active document: IndexedDB (structured, keyed by revision ID)
- Exported `.docx`/`.pdf` files: OPFS (binary files, large, write-once)
- Temporary import files: OPFS async write → parse → delete

---

## 4. Interview-Oriented Answer

**Q: "What would you use to store a 50MB SQLite database file in the browser for offline use with fast random reads?"**

> **OPFS with synchronous access handles in a Web Worker.** 
>
> IndexedDB stores blobs but lacks byte-offset random access — every read deserialises the entire blob. The Cache API is designed for HTTP responses, not arbitrary binary files. 
>
> OPFS provides a real filesystem with `createSyncAccessHandle()` in Web Workers, which gives synchronous reads and writes at specific byte offsets. The SQLite WASM build (`@sqlite.org/sqlite-wasm`) uses exactly this — the OPFS sync handle becomes its VFS layer, allowing SQLite to function at near-native speed entirely in the browser.
>
> The implementation: open OPFS root directory → get/create the sqlite.db file handle → pass the sync handle to the WASM SQLite module → run queries in the worker → postMessage results back to the main thread.

---

## 5. Code Example

```typescript
// OPFS Document Storage Manager (runs in Web Worker)
// Demonstrates: file creation, sync read/write, cleanup

// ---- Web Worker (opfs-worker.ts) ----
interface OPFSMessage {
  type: 'WRITE' | 'READ' | 'DELETE' | 'LIST';
  filename?: string;
  data?: ArrayBuffer;
  offset?: number;
}

self.onmessage = async (event: MessageEvent<OPFSMessage>) => {
  const { type, filename, data, offset = 0 } = event.data;
  const root = await navigator.storage.getDirectory();

  switch (type) {
    case 'WRITE': {
      const fileHandle = await root.getFileHandle(filename!, { create: true });
      const syncHandle = await fileHandle.createSyncAccessHandle();
      const written = syncHandle.write(new Uint8Array(data!), { at: offset });
      syncHandle.flush();
      syncHandle.close();
      self.postMessage({ type: 'WRITE_DONE', filename, bytes: written });
      break;
    }
    case 'READ': {
      const fileHandle = await root.getFileHandle(filename!);
      const syncHandle = await fileHandle.createSyncAccessHandle();
      const size = syncHandle.getSize();
      const buffer = new Uint8Array(size);
      syncHandle.read(buffer, { at: offset });
      syncHandle.close();
      self.postMessage({ type: 'READ_DONE', data: buffer.buffer }, [buffer.buffer]);
      break;
    }
    case 'DELETE': {
      await root.removeEntry(filename!);
      self.postMessage({ type: 'DELETE_DONE', filename });
      break;
    }
    case 'LIST': {
      const entries: string[] = [];
      for await (const [name] of root.entries()) entries.push(name);
      self.postMessage({ type: 'LIST_DONE', entries });
      break;
    }
  }
};

// ---- Main Thread ----
const worker = new Worker('opfs-worker.js');

async function writeToOPFS(filename: string, content: string): Promise<void> {
  return new Promise((resolve) => {
    const data = new TextEncoder().encode(content).buffer;
    worker.postMessage({ type: 'WRITE', filename, data }, [data]);
    worker.onmessage = (e) => { if (e.data.type === 'WRITE_DONE') resolve(); };
  });
}

// Check OPFS availability
async function isOPFSAvailable(): Promise<boolean> {
  if (!('storage' in navigator)) return false;
  try {
    await navigator.storage.getDirectory();
    return true;
  } catch {
    return false; // Safari < 15.2, older Firefox
  }
}
```

---

## 6. Memory Aid

**"OPFS = Private USB drive in the browser"**

- **Private**: Only your origin can see it (no OS file picker)
- **USB drive**: Real files and folders, not just key-value pairs
- **Sync in Worker**: Think of it as direct disk access — fast, no serialisation overhead

**Use case equation:**
- Large binary files + random access + no user permission → OPFS
- Structured data + queries + indexes → IndexedDB  
- HTTP response caching → Cache API

---

## 7. Why & How Summary

**Why OPFS was created:**
- Web apps (Figma, Adobe, VSCode Web) need performance for large file handling
- IndexedDB is too slow for large binary random-access patterns
- WASM runtimes (SQLite, FFmpeg, WASI) need a real VFS to operate efficiently

**How it works:**
1. `navigator.storage.getDirectory()` → origin's private root directory
2. Navigate directory tree to get `FileSystemFileHandle`
3. In Web Worker: `createSyncAccessHandle()` → synchronous read/write at byte offsets
4. On main thread: `createWritable()` → async streaming writes

**Browser support (2024):** Chrome 86+, Edge 86+, Firefox 111+, Safari 15.2+
