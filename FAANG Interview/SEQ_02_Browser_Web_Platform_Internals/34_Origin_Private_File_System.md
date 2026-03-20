# 34. Origin Private File System (OPFS)
**Phase:** Foundations | **Sequence:** SEQ 2 — Browser & Web Platform Internals | **Company:** Microsoft, Adobe, Salesforce

---

## 🎯 1. Interview Opening Answer
> What to say in the first 60 seconds. Crisp. Confident. Numbers included where relevant.

The Origin Private File System is a browser storage API that gives web applications a private, sandboxed filesystem scoped to their origin. Unlike the regular filesystem a user sees in their OS, OPFS files are invisible to the user and managed entirely by the browser. It exposes synchronous file access via `FileSystemSyncAccessHandle` when used from a Web Worker, which is critical for performance-sensitive use cases like SQLite-in-WASM running in-browser. At SAP, I can directly apply OPFS for large dataset buffering in analytics tools where IndexedDB's asynchronous overhead was a bottleneck. OPFS is the highest-performance, highest-capacity storage primitive in the browser today — it's the foundation that SQLite WASM, OPFS-backed databases, and offline-first enterprise apps rely on.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

The Origin Private File System (OPFS) is part of the **File System Access API** specification. It provides a virtual filesystem that is:
- **Private to the origin** — not visible to the user via OS file explorers
- **Persistent** — survives page reloads and browser restarts
- **High-performance** — especially when accessed via `FileSystemSyncAccessHandle` in a Worker
- **Sandboxed** — no access to real OS directories by default

It was designed to solve a critical gap: IndexedDB and Cache API are key-value stores optimised for blobs and structured data, not for random-access file I/O. OPFS fills this gap, enabling use cases like browser-native databases (SQLite WASM), video editors, CAD tools, and large file processing without round-trips to a server.

**Key APIs:**
```
navigator.storage.getDirectory()         → get root OPFS directory handle
directoryHandle.getFileHandle(name)      → get/create a file
directoryHandle.getDirectoryHandle(name) → get/create subdirectory
fileHandle.createSyncAccessHandle()      → synchronous R/W (Worker only)
fileHandle.createWritable()              → async writable stream (main thread)
```

### How It Works Internally

**Browser-side:**
1. `navigator.storage.getDirectory()` returns a `FileSystemDirectoryHandle` pointing to an in-browser VFS rooted at the origin's private storage space.
2. Each file maps to either an in-memory buffer or a backing file on disk managed by the browser's storage subsystem (varies by browser — Chrome uses SQLite or LevelDB internally).
3. `FileSystemSyncAccessHandle` bypasses the JS event loop entirely when called from a Worker thread. It uses `read()`, `write()`, `truncate()`, `flush()` — all **synchronous** — which is unique among browser storage APIs.
4. The sync handle holds an exclusive lock. Only one sync handle per file at a time.
5. On the main thread, `createWritable()` returns a `FileSystemWritableFileStream` which is async and uses internal double-buffering: writes go to a temp file, then atomically rename-swap on `close()`.

**Isolation model:**
- Completely separate from the user-facing File System Access API (which requires a picker and user permission)
- No user prompt required for OPFS reads/writes
- Cannot access files outside OPFS

### Architecture & Component Boundaries

```
Main Thread                          Worker Thread
-----------                          -------------
navigator.storage                    navigator.storage
  .getDirectory()          ←same root→  .getDirectory()
    |                                       |
    ↓                                       ↓
FileSystemDirectoryHandle          FileSystemDirectoryHandle
    |                                       |
    ↓ (async only)                          ↓
FileSystemWritableFileStream       FileSystemSyncAccessHandle
    |                                 (synchronous R/W, exclusive lock)
    ↓
Committed to disk on .close()
```

**Critical rule:** `FileSystemSyncAccessHandle` is ONLY available in Workers (including Shared/Service Workers). It CANNOT be created on the main thread — this is intentional to prevent blocking the UI thread.

### Data Flow & State Flow

```
1. App boots → navigator.storage.getDirectory() → root handle
2. root.getFileHandle('data.sqlite', { create: true }) → fileHandle
3. Worker receives fileHandle via postMessage (handles are transferable)
4. Worker: fileHandle.createSyncAccessHandle() → syncHandle (exclusive lock acquired)
5. Worker: syncHandle.read(buffer, { at: offset }) → synchronous read
6. Worker: syncHandle.write(buffer, { at: offset }) → synchronous write
7. Worker: syncHandle.flush() → ensure data persists
8. Worker: syncHandle.close() → releases lock
9. Main thread can now re-acquire
```

### Performance Implications

| Operation | IndexedDB | OPFS Async | OPFS Sync (Worker) |
|---|---|---|---|
| Sequential write 10MB | ~200ms | ~50ms | ~5ms |
| Random read 4KB block | ~2ms | ~1ms | <0.1ms |
| Main thread blocking | No | No | No (Worker) |
| Lock overhead | Per-transaction | Per-write | Per-handle-lifetime |

- `FileSystemSyncAccessHandle` achieves near-native disk I/O speeds because it bypasses the event loop entirely
- This is why **SQLite WASM** uses OPFS as its VFS backend — it needs synchronous byte-level I/O
- On the main thread, always use async APIs → never blocks rendering
- OPFS writes do NOT count against memory — they go to disk, controlled by the browser's storage quota

### Scalability Considerations

- **< 10K users:** Simple single-file OPFS (e.g., one SQLite DB per user session). No contention issues.
- **100K users:** Need to think about quota limits — browsers typically grant 60% of available disk space for persistent storage. Must use `navigator.storage.persist()` to request persistence and avoid eviction.
- **10M+ users:** OPFS per-origin, per-browser-profile — no server-side scaling needed. But large files need chunking; browsers have per-file size limits in practice. For offline-first enterprise (SAP, Salesforce), OPFS + background sync becomes critical infrastructure.

### Trade-offs

| Approach | Alternative | When to Choose |
|---|---|---|
| OPFS SyncAccessHandle in Worker | IndexedDB | When you need byte-level random access (SQLite, file editors) |
| OPFS async on main thread | Cache API | When storing large mutable files, not just request/response pairs |
| OPFS + SQLite WASM | Server DB + API | When true offline capability is required with relational queries |
| OPFS writable streams | Blob + URL.createObjectURL | When file is large and must survive sessions (temp blobs are session-only) |

### ⚠️ Anti-Patterns & Pitfalls

- **Creating SyncAccessHandle on the main thread** — the browser will throw `DOMException: InvalidStateError`. Always offload to a Worker.
- **Not calling `flush()` before `close()`** — data may not persist to disk. Flush is a fsync equivalent; don't skip it on critical writes.
- **Assuming OPFS data survives a clear-site-data header** — OPFS is cleared by `Clear-Site-Data: "storage"` just like IndexedDB. At SAP, if an auth logout triggers this header, OPFS data is wiped.
- **Multiple handles on same file** — only one `FileSystemSyncAccessHandle` per file at a time. Trying to create a second throws. Design around single-writer or use a queue.
- **Treating OPFS as public** — OPFS is private but not encrypted. Device-level attackers can potentially access the backing files. Encrypt sensitive data before writing.
- **Not requesting persistent storage** — by default OPFS can be evicted under storage pressure. Call `navigator.storage.persist()` and handle the `false` case gracefully.

---

## 🏭 3. Real-World Examples

**At Hruday's level (SAP):**
SAP Analytics Cloud or SAP BI tools that need to cache large datasets (multi-MB OData responses) for offline pivot table calculations. Instead of holding everything in IndexedDB as blobs, store them as columnar binary files in OPFS, accessed via a Worker running column-store logic. Result: 10x faster filter operations vs IndexedDB blob reads. Similarly, the SAP Fiori offline capability can use OPFS to persist the OData delta token and cache response files across sessions.

**At FAANG scale:**
- **Adobe:** Photoshop on the Web uses OPFS + WebAssembly for storing the full PSD canvas buffer. The entire 500MB file lives in OPFS, manipulated by C++ compiled to WASM via a sync handle in a Worker. This is production-deployed at Adobe today.
- **Google:** Google Docs' local-undo history and offline edit queue use OPFS-backed storage for high-frequency write operations that IndexedDB's transaction model would throttle.
- **Microsoft:** VS Code for the Web (vscode.dev) uses OPFS to persist workspace state, extension state, and file buffers without requiring GitHub authentication for every read.

**How it evolves with scale:**
- Small scale (< 10K users): Single OPFS file, no quota concerns. Simple read/write.
- Medium scale (100K users): Need quota monitoring (`navigator.storage.estimate()`), user-facing storage usage indicators, and graceful degradation when storage denied.
- Large scale (10M+ users): Partition OPFS data per logical workspace; implement versioned schemas (like SQLite migrations); background cleanup of stale OPFS entries; telemetry for storage errors.

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)
> "OPFS is the browser's private sandboxed filesystem, scoped to the origin and invisible to the user. What makes it uniquely powerful is `FileSystemSyncAccessHandle` — you use it from a Web Worker and it gives you synchronous, byte-level random access to files. That's what Adobe Photoshop on the Web uses to manipulate PSD files in WASM without async overhead. At SAP, the use case I'd immediately reach for is caching multi-megabyte OData analytical datasets for offline filtering — IndexedDB's async transaction model adds hundreds of milliseconds of overhead per access that OPFS eliminates. The key trade-off is that sync access is Worker-only — deliberately so to protect the main thread. You also must call `flush()` before closing or risk data loss, and you need to explicitly request persistent storage to avoid eviction under device pressure. For enterprise apps where offline reliability is a contractual SLA, OPFS is the right foundation."

### Likely Follow-up Questions
1. **How does OPFS differ from IndexedDB?** → OPFS = file-based, byte-level, sync access possible; IndexedDB = key-value transactions, always async, better for structured data
2. **Can a Service Worker access OPFS?** → Yes, Service Workers can use async OPFS APIs and even `FileSystemSyncAccessHandle` (they're Worker contexts)
3. **What happens if the user clears browser data?** → OPFS is wiped. `navigator.storage.persist()` only prevents quota-based eviction, not manual clear
4. **How do you handle concurrent Worker access to the same file?** → `SyncAccessHandle` is exclusive — enforce single-writer via a message queue or use separate files per Worker
5. **How does SQLite WASM use OPFS?** → It implements a custom VFS (Virtual File System) that maps SQLite's synchronous I/O calls to `SyncAccessHandle.read/write` in a Worker

### vs Alternatives
| OPFS | IndexedDB | Cache API |
|---|---|---|
| File-level byte access | Key-value blob/structured | Request/Response pairs |
| Sync access in Workers | Always async | Always async |
| Best for large mutable files | Best for app data, settings | Best for HTTP response caching |
| No user prompt needed | No user prompt needed | No user prompt needed |

### How to Signal Senior Thinking
> "The thing I emphasise to my team is: IndexedDB is not a file system — it's a database. OPFS is not a database — it's a file system. When you need byte-addressable, seekable storage — think OPFS. When you need indexed queries over structured records — think IndexedDB. Mixing them up leads to architectures where you're serialising entire records to bytes for every random access, and that's where the 200ms latency comes from in production."

---

## 💻 5. Code Example
> FileSystemSyncAccessHandle in a Worker — the critical performance path

```typescript
// worker.ts — OPFS sync file access (Worker context only)
// Demonstrates: open file, write binary data, read it back, flush to disk
// What an interviewer looks for: correct Worker isolation, flush before close, error handling

async function initOPFS(): Promise<FileSystemSyncAccessHandle> {
  const root: FileSystemDirectoryHandle = await navigator.storage.getDirectory();
  const fileHandle: FileSystemFileHandle = await root.getFileHandle('cache.bin', { create: true });
  // SyncAccessHandle is exclusive — only one per file at a time
  return await fileHandle.createSyncAccessHandle();
}

// Called from Worker — all sync, no await needed after handle is created
function writeChunk(handle: FileSystemSyncAccessHandle, data: Uint8Array, offset: number): void {
  const bytesWritten = handle.write(data, { at: offset });
  if (bytesWritten !== data.byteLength) {
    throw new Error(`Partial write: expected ${data.byteLength}, wrote ${bytesWritten}`);
  }
}

function readChunk(handle: FileSystemSyncAccessHandle, offset: number, length: number): Uint8Array {
  const buffer = new Uint8Array(length);
  const bytesRead = handle.read(buffer, { at: offset });
  return buffer.subarray(0, bytesRead);
}

// Main Worker entrypoint
let syncHandle: FileSystemSyncAccessHandle | null = null;

self.onmessage = async (event: MessageEvent) => {
  const { type, payload } = event.data;

  if (type === 'INIT') {
    syncHandle = await initOPFS();
    self.postMessage({ type: 'READY' });
  }

  if (type === 'WRITE' && syncHandle) {
    const { data, offset } = payload as { data: Uint8Array; offset: number };
    writeChunk(syncHandle, data, offset);
    syncHandle.flush(); // ← Critical: ensures data is persisted to disk
    self.postMessage({ type: 'WRITE_DONE' });
  }

  if (type === 'READ' && syncHandle) {
    const { offset, length } = payload as { offset: number; length: number };
    const result = readChunk(syncHandle, offset, length);
    self.postMessage({ type: 'READ_RESULT', data: result }, [result.buffer]); // transferable
  }

  if (type === 'CLOSE' && syncHandle) {
    syncHandle.flush();
    syncHandle.close(); // releases exclusive lock
    syncHandle = null;
    self.postMessage({ type: 'CLOSED' });
  }
};

// main.ts — spawning the worker and requesting persistent storage
async function setupStorage(): Promise<void> {
  const persisted = await navigator.storage.persist();
  if (!persisted) {
    console.warn('Storage persistence denied — OPFS may be evicted under pressure');
  }

  const { usage, quota } = await navigator.storage.estimate();
  console.log(`Storage used: ${(usage! / 1e6).toFixed(1)}MB / ${(quota! / 1e9).toFixed(1)}GB`);
}
```

**Interview vs Production difference:**
In an interview, omit `navigator.storage.persist()` and `estimate()` — focus on the SyncAccessHandle pattern and the flush/close lifecycle. In production, always add quota monitoring, a write queue to prevent concurrent handle conflicts, and structured logging for storage errors (Sentry integration at SAP level).

---

## 🧠 6. Memory Aid
> The single thing to remember under pressure

**Mental Model:** OPFS is the browser's private hard drive for your origin. SyncAccessHandle is the only truly synchronous storage API in the browser — but only in Workers.

**If you go blank:** "OPFS gives origins a private file system. The key differentiator is synchronous byte-level access via SyncAccessHandle in a Worker — that's what makes SQLite WASM and Photoshop on the Web possible."

**Mnemonic:** **OPFS = Origin's Private Filing System** — Private (sandboxed), Filing (file-level, not key-value), System (not just blobs — actual seekable files)

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: Enables offline-first experiences with full relational query support (SQLite WASM) and large asset editing directly in browser
→ Performance: Synchronous byte I/O in Workers eliminates event-loop latency — 10–50x faster than IndexedDB for file-like access patterns
→ Business: Opens up desktop-class applications in the browser — Adobe Photoshop, VS Code, SAP offline analytics — without native app install

**How it works (3 sentences):**
OPFS provides a hierarchical filesystem rooted at `navigator.storage.getDirectory()`, scoped to the origin and invisible to users. Files are accessed asynchronously from the main thread via writable streams, or synchronously from Worker threads via `FileSystemSyncAccessHandle.read/write()`. The sync handle holds an exclusive lock per file and must be explicitly flushed and closed to guarantee data persistence.

**Company relevance:**
- **Microsoft:** VS Code for the Web (vscode.dev) uses OPFS to persist workspace and extension state; Azure Portal can use it for large data export buffering — expect questions about quota management and eviction handling
- **Adobe:** Photoshop on the Web is the canonical OPFS production case — interviewing at Adobe without OPFS knowledge is a gap; they'll ask how you'd architect large binary asset handling in the browser
- **Salesforce:** Offline Lightning Experience uses browser storage for CRM record caching — OPFS + SQLite WASM is the evolution beyond IndexedDB for complex offline query support
- **Cisco:** Network monitoring dashboards (similar to Hruday's Bosch work) can use OPFS to buffer large telemetry streams from WebSocket before batch-processing in a Worker

---
**✅ Topic 34/486 complete.**
**→ Continuing to Topic 35: Network Stack Basics**
