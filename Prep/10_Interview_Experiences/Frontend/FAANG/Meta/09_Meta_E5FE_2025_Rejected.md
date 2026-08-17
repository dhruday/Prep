# Meta — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meta |
| **Role** | Frontend Engineer |
| **Level** | E5 (Senior) |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | London, UK |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 Onsite: 2 Coding + Frontend Design + Behavioral)
- **Timeline:** 3 weeks
- **Format:** Virtual

## Round 1: Phone Screen — Frontend Coding
**Duration:** 45 minutes

### Questions Asked
1. **Build a Promise.all Polyfill and its Variants**
   - Implement `Promise.all`, `Promise.allSettled`, `Promise.race`, `Promise.any`
   - Handle edge cases: empty array, non-promise values, rejection propagation

### 💡 Interview-Ready Answer

```javascript
// ============================================
// Promise.all — rejects on first rejection
// ============================================
function promiseAll(promises) {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(promises)) {
      return reject(new TypeError('Argument must be an array'));
    }

    const results = new Array(promises.length);
    let remaining = promises.length;

    if (remaining === 0) return resolve(results);

    promises.forEach((promise, index) => {
      // Handle non-promise values (auto-wrap)
      Promise.resolve(promise).then(
        (value) => {
          results[index] = value;
          remaining--;
          if (remaining === 0) resolve(results);
        },
        (reason) => {
          reject(reason); // First rejection wins
        }
      );
    });
  });
}

// ============================================
// Promise.allSettled — always resolves with status
// ============================================
function promiseAllSettled(promises) {
  return new Promise((resolve) => {
    if (!Array.isArray(promises)) {
      return resolve([]);
    }

    const results = new Array(promises.length);
    let remaining = promises.length;

    if (remaining === 0) return resolve(results);

    promises.forEach((promise, index) => {
      Promise.resolve(promise).then(
        (value) => {
          results[index] = { status: 'fulfilled', value };
          remaining--;
          if (remaining === 0) resolve(results);
        },
        (reason) => {
          results[index] = { status: 'rejected', reason };
          remaining--;
          if (remaining === 0) resolve(results);
        }
      );
    });
  });
}

// ============================================
// Promise.race — first to settle wins
// ============================================
function promiseRace(promises) {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(promises)) {
      return reject(new TypeError('Argument must be an array'));
    }

    // Empty array: promise never settles (per spec)
    promises.forEach((promise) => {
      Promise.resolve(promise).then(resolve, reject);
    });
  });
}

// ============================================
// Promise.any — first fulfillment wins; rejects
// only if ALL reject (AggregateError)
// ============================================
function promiseAny(promises) {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(promises)) {
      return reject(new TypeError('Argument must be an array'));
    }

    if (promises.length === 0) {
      return reject(new AggregateError([], 'All promises were rejected'));
    }

    const errors = new Array(promises.length);
    let rejectedCount = 0;

    promises.forEach((promise, index) => {
      Promise.resolve(promise).then(
        (value) => {
          resolve(value); // First fulfillment wins
        },
        (reason) => {
          errors[index] = reason;
          rejectedCount++;
          if (rejectedCount === promises.length) {
            reject(new AggregateError(errors, 'All promises were rejected'));
          }
        }
      );
    });
  });
}

// ============================================
// Bonus: Promise.map with concurrency limit
// ============================================
function promiseMap(items, mapper, concurrency = Infinity) {
  return new Promise((resolve, reject) => {
    const results = new Array(items.length);
    let nextIndex = 0;
    let activeCount = 0;
    let completedCount = 0;
    let hasRejected = false;

    function runNext() {
      while (activeCount < concurrency && nextIndex < items.length) {
        const index = nextIndex++;
        activeCount++;

        Promise.resolve(mapper(items[index], index))
          .then((value) => {
            if (hasRejected) return;
            results[index] = value;
            activeCount--;
            completedCount++;
            if (completedCount === items.length) {
              resolve(results);
            } else {
              runNext();
            }
          })
          .catch((err) => {
            if (!hasRejected) {
              hasRejected = true;
              reject(err);
            }
          });
      }
    }

    if (items.length === 0) return resolve([]);
    runNext();
  });
}

// ============================================
// Tests
// ============================================
async function test() {
  // Promise.all
  console.log('=== Promise.all ===');
  const r1 = await promiseAll([
    Promise.resolve(1),
    Promise.resolve(2),
    3, // non-promise
  ]);
  console.log(r1); // [1, 2, 3]

  try {
    await promiseAll([
      Promise.resolve(1),
      Promise.reject('error'),
      Promise.resolve(3),
    ]);
  } catch (e) {
    console.log('Rejected:', e); // Rejected: error
  }

  // Promise.allSettled
  console.log('\n=== Promise.allSettled ===');
  const r2 = await promiseAllSettled([
    Promise.resolve(1),
    Promise.reject('error'),
    Promise.resolve(3),
  ]);
  console.log(r2);
  // [{status:'fulfilled',value:1}, {status:'rejected',reason:'error'}, {status:'fulfilled',value:3}]

  // Promise.any
  console.log('\n=== Promise.any ===');
  const r3 = await promiseAny([
    Promise.reject('e1'),
    Promise.resolve('first success'),
    Promise.resolve('second'),
  ]);
  console.log(r3); // 'first success'

  // Promise.map with concurrency
  console.log('\n=== Promise.map ===');
  const r4 = await promiseMap(
    [1, 2, 3, 4, 5],
    (n) => new Promise(res => setTimeout(() => res(n * 2), 100)),
    2 // max 2 concurrent
  );
  console.log(r4); // [2, 4, 6, 8, 10]
}

test();
```

**Key Implementation Details:**
| Method | Resolves When | Rejects When |
|--------|-------------|-------------|
| `Promise.all` | All fulfill | Any rejects |
| `Promise.allSettled` | All settle | Never |
| `Promise.race` | Any settles | Any rejects (first) |
| `Promise.any` | Any fulfills | All reject |

**Common Pitfalls:**
- Forgetting to handle non-promise values with `Promise.resolve()`
- Not preserving order in results (must use index, not push)
- Empty array edge cases differ per method
- `Promise.race([])` never settles (per spec)

## Round 2: Frontend Coding Onsite 1
**Duration:** 45 minutes

### Questions Asked
1. **Implement a Throttle and Debounce with Cancel Support**
   - `throttle(fn, delay, {leading, trailing})`
   - `debounce(fn, delay, {immediate})`
   - Both must support `.cancel()` and `.flush()`

## Round 3: Frontend Coding Onsite 2
**Duration:** 45 minutes

### Questions Asked
1. **Build an Event Emitter with Wildcard Support**
   - `on('user.*', handler)` matches `user.login`, `user.logout`
   - `once()` for one-time listeners
   - Proper cleanup and memory leak prevention

## Round 4: Frontend System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design the Facebook Messenger Frontend**
   - Real-time messaging with WebSocket
   - Optimistic message sending with retry
   - Thread list with last message preview and unread counts
   - Offline message queue

### Result
- Rejected — feedback noted the system design discussion lacked depth on WebSocket reconnection strategy and message ordering guarantees with optimistic updates

## Round 5: Behavioral
**Duration:** 45 minutes

## 🎯 Key Takeaways
- Meta frontend E5 tests **JavaScript fundamentals deeply** — Promise internals, closures, event systems
- Promise polyfills are the most common Meta frontend question — know all 4 variants + concurrency control
- `Promise.map` with concurrency is a strong differentiator
- System design at E5 requires **deep knowledge of WebSocket lifecycle** — reconnection, heartbeat, offline queue
- Order preservation and index-based result collection is a key correctness detail

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | Promise Polyfills, Async |
| Frontend Coding 1 | Medium | Throttle, Debounce, Timer |
| Frontend Coding 2 | Medium-Hard | Event Emitter, Wildcard Matching |
| Frontend Design | Hard | Messenger, WebSocket, Offline |
| Behavioral | Medium | Conflict, Impact |
