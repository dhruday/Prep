# 321 – Implement Promise.all / Promise.race

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**Promise.all**: resolves when ALL promises resolve, rejects on FIRST rejection. **Promise.race**: resolves/rejects with whichever promise settles FIRST. Also know: **Promise.allSettled** (waits for all, never rejects) and **Promise.any** (resolves on first fulfillment).

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// ──── Promise.all ────
function promiseAll<T>(promises: Array<Promise<T> | T>): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const results: T[] = new Array(promises.length);
    let resolved = 0;

    if (promises.length === 0) { resolve([]); return; }

    promises.forEach((p, i) => {
      Promise.resolve(p).then(
        (value) => {
          results[i] = value;
          resolved++;
          if (resolved === promises.length) resolve(results);
        },
        (reason) => reject(reason) // reject on first failure
      );
    });
  });
}

// ──── Promise.race ────
function promiseRace<T>(promises: Array<Promise<T> | T>): Promise<T> {
  return new Promise((resolve, reject) => {
    for (const p of promises) {
      Promise.resolve(p).then(resolve, reject); // first to settle wins
    }
  });
}

// ──── Promise.allSettled ────
type SettledResult<T> =
  | { status: 'fulfilled'; value: T }
  | { status: 'rejected'; reason: unknown };

function promiseAllSettled<T>(promises: Array<Promise<T> | T>): Promise<SettledResult<T>[]> {
  return new Promise((resolve) => {
    const results: SettledResult<T>[] = new Array(promises.length);
    let settled = 0;

    if (promises.length === 0) { resolve([]); return; }

    promises.forEach((p, i) => {
      Promise.resolve(p).then(
        (value) => { results[i] = { status: 'fulfilled', value }; },
        (reason) => { results[i] = { status: 'rejected', reason }; }
      ).finally(() => { settled++; if (settled === promises.length) resolve(results); });
    });
  });
}

// ──── Promise.any ────
function promiseAny<T>(promises: Array<Promise<T> | T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const errors: unknown[] = [];
    let rejected = 0;

    if (promises.length === 0) { reject(new AggregateError([], 'All promises rejected')); return; }

    promises.forEach((p, i) => {
      Promise.resolve(p).then(
        resolve, // first fulfilled wins
        (reason) => {
          errors[i] = reason;
          rejected++;
          if (rejected === promises.length) reject(new AggregateError(errors, 'All promises rejected'));
        }
      );
    });
  });
}
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Promise.all: track resolved count, collect results by index, reject on first failure. Promise.race: pass resolve/reject to every promise — first to settle wins. Key details: handle empty array, wrap non-promises with Promise.resolve(), maintain order in results."*

## 4. 💻 FRONTEND APPLICATION
```typescript
// Frontend: Parallel data fetching with timeout
async function fetchWithTimeout<T>(urls: string[], timeoutMs: number): Promise<T[]> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), timeoutMs)
  );
  const fetches = urls.map(url => fetch(url).then(r => r.json()));
  return promiseRace([promiseAll(fetches), timeout]) as Promise<T[]>;
}
```

## 5. 🧠 MEMORY AID
**"all = all resolve OR first reject. race = first to settle. allSettled = all settle, never rejects. any = first to fulfill OR all reject."**

## 6. 🎯 COMPLEXITY
Time: O(n) setup, total time = longest/shortest promise | Space: O(n) for results array
