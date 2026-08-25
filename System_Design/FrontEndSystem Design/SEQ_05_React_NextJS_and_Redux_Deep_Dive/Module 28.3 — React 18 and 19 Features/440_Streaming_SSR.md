# 440 – Streaming SSR with renderToPipeableStream

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
React 18's **renderToPipeableStream** progressively streams HTML to the browser. Suspense boundaries define streaming chunks — fast parts render immediately, slow parts stream in later. Enables **selective hydration** — interactive parts hydrate independently. Replaces `renderToString` (blocking, all-or-nothing).

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── STREAMING SSR SETUP ────
import { renderToPipeableStream } from 'react-dom/server';
import express from 'express';

const app = express();

app.get('*', (req, res) => {
  const { pipe, abort } = renderToPipeableStream(
    <html>
      <head><title>App</title></head>
      <body>
        <div id="root">
          {/* Fast shell — renders immediately */}
          <Header />
          <Nav />
          
          {/* Slow data — streams in when ready */}
          <Suspense fallback={<Spinner />}>
            <MainContent />
          </Suspense>
          
          <Suspense fallback={<CommentsSkeleton />}>
            <Comments />
          </Suspense>
        </div>
        <script src="/main.js" />
      </body>
    </html>,
    {
      // Called when shell (everything outside Suspense) is ready
      onShellReady() {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html');
        pipe(res); // start streaming
      },
      
      // Called when shell fails (critical error)
      onShellError(error) {
        res.statusCode = 500;
        res.send('<h1>Server Error</h1>');
      },
      
      // Called when all content is ready
      onAllReady() {
        // For crawlers/bots: wait for everything
        // res.statusCode = 200;
        // pipe(res);
      },
      
      onError(error) {
        console.error('SSR error:', error);
      },
    },
  );
  
  // Abort if client disconnects
  setTimeout(abort, 10000);
});

// ──── SELECTIVE HYDRATION ────
// Each Suspense boundary hydrates independently
// React prioritizes hydration based on user interaction

// Example: User clicks <Comments> area before it's hydrated
// React will prioritize hydrating <Comments> first!
function App() {
  return (
    <>
      <Suspense fallback={<NavSkeleton />}>
        <Nav /> {/* hydrates independently */}
      </Suspense>
      <Suspense fallback={<MainSkeleton />}>
        <Main /> {/* hydrates independently */}
      </Suspense>
      <Suspense fallback={<SidebarSkeleton />}>
        <Sidebar /> {/* hydrates independently */}
      </Suspense>
    </>
  );
}

// ──── COMPARISON ────
// renderToString (React 17) — blocking, all-or-nothing
// renderToPipeableStream (React 18) — streaming, progressive
// renderToReadableStream (React 18) — for Edge/Web Streams
```

### Streaming Timeline
```
Time 0:   Shell HTML sent (Header, Nav, Skeletons)
Time 200ms: MainContent data ready → HTML chunk streamed in
Time 800ms: Comments data ready → HTML chunk streamed in
Time 1s:   Hydration — each Suspense boundary hydrates independently
User clicks Comments → Comments hydration prioritized
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"renderToPipeableStream streams HTML progressively via Suspense boundaries. Shell renders instantly, slow data streams later. Selective hydration prioritizes components the user interacts with. onShellReady starts streaming, onAllReady waits for everything (bots). Replaces blocking renderToString."*

## 4. 🧠 MEMORY AID
**"Streaming SSR = Pipe + Suspense boundaries. Shell first → slow chunks stream in → selective hydration (interact = prioritize)."**
