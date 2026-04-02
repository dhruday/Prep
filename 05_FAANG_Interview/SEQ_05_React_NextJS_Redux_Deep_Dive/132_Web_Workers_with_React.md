# 132. Web Workers with React
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Web Workers run JavaScript in a background thread, off the main thread. The main thread handles rendering, event handling, and React reconciliation — any long computation (> 50ms) on the main thread causes visible jank (missed frames, unresponsive input). Web Workers solve this by moving heavy computation to a separate thread that communicates with the main thread via `postMessage` and `message` events. In React apps, the most common use cases are: **data processing** (CSV parsing, JSON transformation, analytics), **image/canvas processing**, **search and filtering** of large datasets, and **crypto/hashing** operations. React itself doesn't have built-in Worker support — you integrate via custom hooks + `useEffect` for lifecycle management, or use the `comlink` library to wrap Workers in a clean async function API, or `next/script` with `strategy="worker"` for third-party scripts (via Partytown).

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Worker + Main Thread Communication Model

```
Main Thread (UI, React renders)                Worker Thread
─────────────────────────────                  ─────────────
UI events, React state                         Heavy computation
DOM manipulation                               Data processing
User interaction → responsive                  Isolated scope (no DOM)
                                               Communicates via structured clone

postMessage(data)  →→→→→→→→→→→→→→→→→→→→→→→→→→  message event (receives data)
message event (receives result)  ←←←←←←←←←←←  postMessage(result)

Structured clone: automatically deep-clones transferable objects
Transferable: ArrayBuffer, ImageBitmap, MessagePort (zero-copy transfer)
NOT available in Worker: window, document, DOM APIs, React
```

### Basic Worker + React Hook

```typescript
// workers/data-processor.ts — runs in Worker context (no DOM, no React)
// This file is loaded as a Worker script

self.addEventListener('message', (event: MessageEvent) => {
  const { type, payload } = event.data as { type: string; payload: unknown };

  switch (type) {
    case 'FILTER_PRODUCTS': {
      const { products, query, priceRange } = payload as {
        products: Product[];
        query: string;
        priceRange: [number, number];
      };

      // Expensive: filter + sort 50,000 products off main thread
      const filtered = products.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) &&
        p.price >= priceRange[0] &&
        p.price <= priceRange[1]
      );
      const sorted = filtered.sort((a, b) => a.name.localeCompare(b.name));

      self.postMessage({ type: 'FILTER_RESULT', payload: sorted });
      break;
    }

    case 'PARSE_CSV': {
      const { csv } = payload as { csv: string };
      const rows = csv.split('\n').map(line => line.split(','));
      self.postMessage({ type: 'CSV_RESULT', payload: rows });
      break;
    }
  }
});

// hooks/useWorker.ts — React hook managing Worker lifecycle
import { useEffect, useRef, useState, useCallback } from 'react';

type WorkerMessage<T = unknown> = { type: string; payload: T };
type WorkerHandler<T> = (payload: T) => void;

export function useWorker<TInput, TOutput>(
  workerFactory: () => Worker,
  onMessage: WorkerHandler<TOutput>
) {
  const workerRef = useRef<Worker | null>(null);
  const onMessageRef = useRef(onMessage);

  // Keep handler ref up to date without recreating the worker
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  // Create worker once
  useEffect(() => {
    workerRef.current = workerFactory();

    workerRef.current.addEventListener('message', (event: MessageEvent<WorkerMessage<TOutput>>) => {
      onMessageRef.current(event.data.payload);
    });

    workerRef.current.addEventListener('error', (event) => {
      console.error('Worker error:', event);
    });

    // Terminate worker on unmount
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);  // empty deps: worker created once per component mount

  // Send message to worker
  const postMessage = useCallback((message: WorkerMessage<TInput>) => {
    workerRef.current?.postMessage(message);
  }, []);

  return { postMessage };
}

// Usage in component:
// app/components/ProductSearch.tsx
import { useState, useCallback } from 'react';
import { useWorker } from '@/hooks/useWorker';

export function ProductSearch({ products }: { products: Product[] }) {
  const [query, setQuery] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [filtered, setFiltered] = useState<Product[]>(products);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleWorkerMessage = useCallback((results: Product[]) => {
    setFiltered(results);
    setIsProcessing(false);
  }, []);

  const { postMessage } = useWorker<
    { products: Product[]; query: string; priceRange: [number, number] },
    Product[]
  >(
    () => new Worker(new URL('../workers/data-processor.ts', import.meta.url)),
    handleWorkerMessage
  );

  const handleSearch = useCallback((newQuery: string) => {
    setQuery(newQuery);
    setIsProcessing(true);
    postMessage({
      type: 'FILTER_PRODUCTS',
      payload: { products, query: newQuery, priceRange },
    });
  }, [products, priceRange, postMessage]);

  return (
    <>
      <input
        value={query}
        onChange={e => handleSearch(e.target.value)}
        placeholder="Search products..."
        aria-busy={isProcessing}
      />
      {isProcessing && <span aria-live="polite">Filtering...</span>}
      <ProductList items={filtered} />
    </>
  );
}

interface Product { id: string; name: string; price: number }
function ProductList({ items }: { items: Product[] }) { return null; }
```

### Comlink — Clean Async API for Workers

```typescript
// npm install comlink
// workers/calculator.ts — wrapped with Comlink
import * as Comlink from 'comlink';

// Functions exposed to main thread:
const api = {
  async processDataset(data: number[]): Promise<{
    mean: number;
    median: number;
    stdDev: number;
  }> {
    const sorted = [...data].sort((a, b) => a - b);
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const variance = data.reduce((acc, v) => acc + (v - mean) ** 2, 0) / data.length;
    return { mean, median, stdDev: Math.sqrt(variance) };
  },

  async generateHash(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  },
};

Comlink.expose(api);

// hooks/useCalculator.ts — main thread side with Comlink
import * as Comlink from 'comlink';
import { useEffect, useRef } from 'react';

type CalculatorAPI = {
  processDataset(data: number[]): Promise<{ mean: number; median: number; stdDev: number }>;
  generateHash(input: string): Promise<string>;
};

export function useCalculator() {
  const apiRef = useRef<Comlink.Remote<CalculatorAPI> | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL('../workers/calculator.ts', import.meta.url));
    apiRef.current = Comlink.wrap<CalculatorAPI>(worker);

    return () => {
      apiRef.current?.[Comlink.releaseProxy]();
      worker.terminate();
    };
  }, []);

  return apiRef;
}

// Usage: call worker functions like regular async functions!
export function StatsPanel({ data }: { data: number[] }) {
  const [stats, setStats] = useState<{ mean: number; median: number; stdDev: number } | null>(null);
  const calculator = useCalculator();

  useEffect(() => {
    // Looks like a normal async call: Comlink handles postMessage/listener
    calculator.current?.processDataset(data).then(setStats);
  }, [data]);

  if (!stats) return <Spinner />;
  return (
    <dl>
      <dt>Mean</dt><dd>{stats.mean.toFixed(2)}</dd>
      <dt>Median</dt><dd>{stats.median.toFixed(2)}</dd>
      <dt>Std Dev</dt><dd>{stats.stdDev.toFixed(2)}</dd>
    </dl>
  );
}

declare function Spinner(): JSX.Element;
```

### Transferable Objects — Zero-Copy Data Transfer

```typescript
// postMessage with transferable: ArrayBuffer transferred (not cloned)
// Cloning a 50MB ArrayBuffer: ~100ms
// Transferring a 50MB ArrayBuffer: ~0ms (pointer transfer, no copy)

// ❌ Without transfer: large buffer cloned → slow
worker.postMessage({ type: 'PROCESS_IMAGE', buffer: imageData.buffer });

// ✅ With transfer: buffer moved to worker (main thread can no longer access it)
worker.postMessage(
  { type: 'PROCESS_IMAGE', buffer: imageData.buffer },
  [imageData.buffer]  // ← transferables array: moved to worker, not copied
);

// Worker returns processed buffer:
self.postMessage(
  { type: 'RESULT', buffer: processedBuffer },
  [processedBuffer]  // ← move back to main thread
);

// OffscreenCanvas: render to canvas in Worker
// main thread:
const canvas = document.getElementById('myCanvas') as HTMLCanvasElement;
const offscreen = canvas.transferControlToOffscreen();
worker.postMessage({ type: 'INIT_CANVAS', canvas: offscreen }, [offscreen]);

// worker:
self.addEventListener('message', event => {
  if (event.data.type === 'INIT_CANVAS') {
    const ctx = event.data.canvas.getContext('2d')!;
    // Draw everything on this canvas in the worker — no main thread involvement
    renderComplexChart(ctx);
  }
});
```

### Next.js — strategy="worker" (Partytown)

```typescript
// next/script with strategy="worker" runs scripts in Web Worker via Partytown
// Use for: Google Tag Manager, analytics, ad scripts that shouldn't block main thread

import Script from 'next/script';

export default function Layout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* Runs Google Analytics in a Web Worker — completely off main thread */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXX"
          strategy="worker"
        />
        <Script id="gtag-init" strategy="worker">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-XXXXXXXX');
        `}</Script>
      </body>
    </html>
  );
}

// Measured impact: strategy="worker" for GTM
// Before: 3rd-party scripts block main thread for 200-400ms (INP impact)
// After:  3rd-party scripts run in worker (zero main thread time)
// INP improvement: typical 400ms → 80ms for interaction responsiveness
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the data export feature required client-side processing of a 50,000-row dataset (filtering, transforming, then generating CSV). On the main thread this took 2.8 seconds and froze the UI completely. Moving the processing to a Web Worker (with `comlink` for clean API) made it async — the user could continue using the app and received a "Download ready" notification when processing finished (3.1 seconds later, but non-blocking). For the CSV generation, the resulting `ArrayBuffer` was transferred (not cloned) back to the main thread for download — transfer time was < 1ms vs 180ms for cloning.

**At FAANG scale:**
- **Microsoft:** VS Code Web — language service (TypeScript IntelliSense) runs entirely in a Web Worker; main thread only receives diagnostics and completions as postMessage results, keeping the editor UI 60fps responsive during large file analysis
- **Adobe:** Photoshop Web — filter operations (blur, sharpen, color correction) run in Workers with `OffscreenCanvas`; the canvas paintwork happens in the worker while the main thread stays responsive for UI interactions
- **Salesforce:** Einstein AI — ML inference (TensorFlow.js) runs in a dedicated Worker; model loading and prediction happen off-thread; main thread receives only the inference result
- **Cisco:** Network diagram layout (force-directed graph, extremely CPU-intensive) runs in a Worker; layout computation happens continuously and posts updated node positions to main thread every 100ms for incremental rendering

---

## 💬 4. Interview Execution

### Sample Answer

> "Web Workers move heavy computation off the main thread, which is critical because React reconciliation, layout, and paint all compete for the same main thread — any computation taking more than 50ms causes dropped frames and unresponsive input.
>
> The raw API uses `postMessage` and `message` events — they serialize data via the structured clone algorithm, so anything serializable works, but there's a copy cost for large objects. For ArrayBuffers (binary data, images), use transferable transfer — the buffer's ownership moves to the worker with zero copy cost. For large image processing, `OffscreenCanvas` lets you do all the rendering in the worker without the main thread at all.
>
> I use `comlink` to wrap the Worker in a proxy — instead of manually wiring up message types, you call async functions on the proxy object and Comlink handles the postMessage/listener machinery. It makes the code look like normal async/await.
>
> The React integration is a custom hook that creates the Worker on mount and terminates it on unmount. Critical: you don't recreate the Worker on every render — create it once with an effect and a ref.
>
> In Next.js specifically, `strategy='worker'` on `<Script>` uses Partytown to run third-party scripts (analytics, tag managers) entirely in a Worker — that's an easy win for INP since those scripts often block the main thread for 200-400ms."

---

## 💻 5. Code Example

```typescript
// hooks/useDataWorker.ts — generic worker hook
import { useEffect, useRef, useCallback } from 'react';

export function useDataWorker<TIn, TOut>(
  scriptPath: string,
  handler: (result: TOut) => void
) {
  const workerRef = useRef<Worker | null>(null);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;  // always latest without recreating worker

  useEffect(() => {
    const worker = new Worker(new URL(scriptPath, import.meta.url));
    worker.onmessage = (e: MessageEvent<{ type: string; payload: TOut }>) => {
      handlerRef.current(e.data.payload);
    };
    worker.onerror = (e) => console.error('[Worker error]', e);
    workerRef.current = worker;
    return () => { worker.terminate(); workerRef.current = null; };
  }, [scriptPath]);

  const send = useCallback((type: string, payload: TIn, transferable?: Transferable[]) => {
    workerRef.current?.postMessage({ type, payload }, transferable ?? []);
  }, []);

  return send;
}

// Usage
export function CsvProcessor() {
  const [rows, setRows] = useState<string[][]>([]);
  const onResult = useCallback((r: string[][]) => setRows(r), []);

  const send = useDataWorker<{ csv: string }, string[][]>(
    '../workers/data-processor.ts',
    onResult
  );

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      send('PARSE_CSV', { csv: ev.target?.result as string });
    };
    reader.readAsText(file);
  }, [send]);

  return (
    <>
      <input type="file" accept=".csv" onChange={handleFile} />
      <p>{rows.length} rows processed</p>
    </>
  );
}
```

---

## 🧠 6. Memory Aid

**MTOS — Web Worker key facts:**
- **M**ain thread freed: any computation > 50ms blocks UI → move to Worker
- **T**ransferables: ArrayBuffer moved (not cloned) → zero-copy for binary data
- **O**ffscreenCanvas: canvas rendering in Worker → fully off main thread
- **S**tructured clone: postMessage auto-copies data — avoid for large objects

**React + Worker pattern:**
- Create Worker once in `useEffect` → terminate in cleanup
- Use `ref` to store Worker (not state — avoids re-renders)
- `comlink` = async function API over postMessage

**Next.js:** `strategy="worker"` → third-party scripts in Worker → INP wins

**Mnemonic:** **MTOS** — Main thread matters, Transferables for binary, OffscreenCanvas for graphics, Structured clone for everything else.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Web Workers directly address INP (the metric that replaced FID in 2024 Core Web Vitals) — long-running computations on the main thread block all user interactions; demonstrating you've moved computations off the main thread with Workers shows you understand the INP spec, not just its name
→ Transferable objects are a non-obvious optimization — most engineers just pass regular objects via postMessage and accept the clone cost; knowing that `ArrayBuffer` can be transfered with zero-copy shows low-level understanding of the structured clone algorithm and memory management
→ `comlink` is the production-ready pattern over raw postMessage — demonstrating it shows you choose ergonomic, maintainable abstractions over raw APIs, which is how senior engineers build systems

**How it works (2 sentences):**
Web Workers run in a separate V8 isolate (separate heap, separate event loop) — they communicate with the main thread via the structured clone algorithm, which performs a deep copy of the message object by recursively serializing primitive values, plain objects, arrays, Blobs, and other serializable types into a binary format and deserializing on the receiving side, with the exception of transferable objects (like ArrayBuffer) where ownership is transferred without copying by passing a reference in the second argument to `postMessage`.
`comlink` implements an RPC protocol over postMessage: it exposes an object from the worker by attaching a `message` listener that accepts function call messages (including arguments), executes the function, and postMessages the result back with a correlation ID; on the main thread side, `Comlink.wrap()` returns a JavaScript Proxy object where any property access returns a function that, when called, postMessages the function name + arguments to the worker and returns a Promise that resolves when the worker's response arrives — making the cross-thread call look syntactically identical to a local async function call.

---
✅ Topic 132/486 complete → Continuing to Topic 133: React Testing — Jest, RTL, MSW
