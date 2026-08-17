# 473 – Web Workers in React

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**Web Workers** run JavaScript in a background thread — heavy computations don't block the main thread (UI stays responsive). Use for: data parsing, image processing, complex calculations, search/sorting large datasets. Communication via `postMessage`. Libraries: **comlink** (RPC-like API), **workerize-loader**.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── BASIC WEB WORKER ────
// workers/heavyCalc.worker.ts
self.addEventListener('message', (event: MessageEvent) => {
  const { data, type } = event.data;
  
  switch (type) {
    case 'SORT_LARGE_DATASET': {
      const sorted = data.sort((a: any, b: any) => a.value - b.value);
      self.postMessage({ type: 'SORT_RESULT', data: sorted });
      break;
    }
    case 'PARSE_CSV': {
      const parsed = parseCSV(data); // heavy parsing
      self.postMessage({ type: 'PARSE_RESULT', data: parsed });
      break;
    }
  }
});

function parseCSV(csv: string) {
  return csv.split('\n').map(row => row.split(','));
}

// ──── REACT HOOK FOR WEB WORKER ────
function useWorker<TInput, TOutput>(
  workerFactory: () => Worker,
) {
  const workerRef = useRef<Worker | null>(null);
  const [result, setResult] = useState<TOutput | null>(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    workerRef.current = workerFactory();
    
    workerRef.current.onmessage = (event: MessageEvent<TOutput>) => {
      setResult(event.data);
      setLoading(false);
    };
    
    workerRef.current.onerror = (error) => {
      console.error('Worker error:', error);
      setLoading(false);
    };
    
    return () => workerRef.current?.terminate();
  }, []);
  
  const postMessage = useCallback((data: TInput) => {
    setLoading(true);
    workerRef.current?.postMessage(data);
  }, []);
  
  return { result, loading, postMessage };
}

// Usage
function DataProcessor() {
  const { result, loading, postMessage } = useWorker<
    { type: string; data: any },
    { type: string; data: any }
  >(() => new Worker(new URL('../workers/heavyCalc.worker.ts', import.meta.url)));
  
  const handleSort = () => {
    postMessage({ type: 'SORT_LARGE_DATASET', data: largeArray });
  };
  
  return (
    <div>
      <button onClick={handleSort} disabled={loading}>
        {loading ? 'Processing...' : 'Sort 1M Items'}
      </button>
      {result && <DataTable data={result.data} />}
    </div>
  );
}

// ──── COMLINK (simplified worker API) ────
// npm install comlink

// workers/math.worker.ts
import * as Comlink from 'comlink';

const mathWorker = {
  async fibonacci(n: number): Promise<number> {
    if (n <= 1) return n;
    // expensive recursive calculation
    let a = 0, b = 1;
    for (let i = 2; i <= n; i++) {
      [a, b] = [b, a + b];
    }
    return b;
  },
  
  async processImage(imageData: ImageData): Promise<ImageData> {
    // heavy image processing in background
    const pixels = imageData.data;
    for (let i = 0; i < pixels.length; i += 4) {
      const gray = pixels[i] * 0.3 + pixels[i+1] * 0.59 + pixels[i+2] * 0.11;
      pixels[i] = pixels[i+1] = pixels[i+2] = gray;
    }
    return imageData;
  },
};

Comlink.expose(mathWorker);

// Component using Comlink
import * as Comlink from 'comlink';

function FibCalculator() {
  const [result, setResult] = useState<number | null>(null);
  
  const calculate = async (n: number) => {
    const worker = new Worker(
      new URL('../workers/math.worker.ts', import.meta.url),
    );
    const mathApi = Comlink.wrap<typeof mathWorker>(worker);
    
    const fib = await mathApi.fibonacci(n); // looks like a normal async call!
    setResult(fib);
    worker.terminate();
  };
  
  return (
    <div>
      <button onClick={() => calculate(1000000)}>Calculate Fib(1M)</button>
      {result && <p>Result: {result}</p>}
    </div>
  );
}

// ──── TRANSFERABLE OBJECTS (zero-copy) ────
// For large ArrayBuffers — transfer ownership instead of copying
const buffer = new ArrayBuffer(1024 * 1024); // 1MB
worker.postMessage({ buffer }, [buffer]); // transferred, not copied
// buffer is now empty in main thread (ownership transferred)

// ──── SHARED ARRAY BUFFER (shared memory) ────
const shared = new SharedArrayBuffer(1024);
const view = new Int32Array(shared);
worker.postMessage({ shared });
// Both threads can read/write — use Atomics for synchronization
```

### When to Use Web Workers
| Use Case | Main Thread Impact | Worker Benefit |
|---|---|---|
| Sort 100K items | Freezes UI | Background sort |
| CSV/JSON parsing | Blocks input | Parse in background |
| Image processing | Frame drops | Smooth UI |
| Search indexing | Delayed response | Instant UI |
| Crypto operations | Blocked rendering | Non-blocking |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Web Workers run heavy JS in background threads — UI stays responsive. postMessage for communication. Comlink provides RPC-like API (async function calls). Transferable objects for zero-copy large buffers. Use for: sorting, parsing, image processing, search indexing. Custom useWorker hook for React integration."*

## 4. 🧠 MEMORY AID
**"Worker = background thread. postMessage to communicate. Comlink = async calls (like RPC). Transferable = zero-copy. Heavy: sort, parse, image, search."**
