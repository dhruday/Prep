# 377 – Custom RxJS Operators

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Custom RxJS operators encapsulate reusable Observable logic. Two types: **pipeable** (function returning `OperatorFunction`, used in `.pipe()`) and **creation** (function returning Observable). Build custom operators to DRY up common patterns like error handling, polling, and caching.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// ──── BASIC CUSTOM OPERATOR ────
// Pipeable operator: function that returns OperatorFunction
function filterNil<T>(): OperatorFunction<T | null | undefined, T> {
  return (source$) => source$.pipe(
    filter((value): value is T => value != null),
  );
}

// Usage
this.user$.pipe(filterNil()).subscribe(user => {
  // user is guaranteed non-null
  console.log(user.name);
});

// ──── RETRY WITH EXPONENTIAL BACKOFF ────
function retryWithBackoff<T>(maxRetries = 3, delayMs = 1000): OperatorFunction<T, T> {
  return (source$) => source$.pipe(
    retry({
      count: maxRetries,
      delay: (error, retryCount) => {
        const backoff = delayMs * Math.pow(2, retryCount - 1);
        console.warn(`Retry ${retryCount}/${maxRetries} in ${backoff}ms`);
        return timer(backoff);
      },
    }),
  );
}

// Usage
this.http.get('/api/data').pipe(
  retryWithBackoff(3, 500), // 500ms, 1000ms, 2000ms
).subscribe();

// ──── POLLING OPERATOR ────
function poll<T>(intervalMs: number): OperatorFunction<T, T> {
  return (source$) => timer(0, intervalMs).pipe(
    switchMap(() => source$),
  );
}

// Usage
this.http.get<Status>('/api/status').pipe(
  poll(5000), // poll every 5 seconds
  takeUntil(this.destroy$),
).subscribe(status => this.status = status);

// ──── DEBUG / LOG OPERATOR ────
function debug<T>(label: string): OperatorFunction<T, T> {
  return (source$) => source$.pipe(
    tap({
      next: (value) => console.log(`[${label}] next:`, value),
      error: (err) => console.error(`[${label}] error:`, err),
      complete: () => console.log(`[${label}] complete`),
    }),
  );
}

this.dataService.getData().pipe(
  debug('user-data'),
  map(data => transform(data)),
  debug('transformed'),
).subscribe();

// ──── CACHE OPERATOR WITH TTL ────
function cacheFor<T>(ttlMs: number): OperatorFunction<T, T> {
  let cache: { value: T; timestamp: number } | null = null;
  
  return (source$) => new Observable<T>(subscriber => {
    if (cache && Date.now() - cache.timestamp < ttlMs) {
      subscriber.next(cache.value);
      subscriber.complete();
    } else {
      source$.pipe(
        tap(value => { cache = { value, timestamp: Date.now() }; }),
      ).subscribe(subscriber);
    }
  });
}

// ──── CREATION OPERATOR ────
function fromIntersectionObserver(
  element: Element,
  options?: IntersectionObserverInit,
): Observable<IntersectionObserverEntry[]> {
  return new Observable(subscriber => {
    const observer = new IntersectionObserver(
      (entries) => subscriber.next(entries),
      options,
    );
    observer.observe(element);
    return () => observer.disconnect(); // cleanup on unsubscribe
  });
}

// Usage
fromIntersectionObserver(this.lazyElement.nativeElement, { threshold: 0.5 })
  .pipe(
    filter(entries => entries[0].isIntersecting),
    take(1),
  )
  .subscribe(() => this.loadContent());
```

### Operator Signature Pattern
```typescript
// Template for any custom pipeable operator:
function myOperator<T>(config: Config): OperatorFunction<T, T> {
  return (source$: Observable<T>) => source$.pipe(
    // compose existing operators
  );
}
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Custom operators DRY up reusable stream logic. I've built retryWithBackoff for resilient HTTP calls, debug for development logging, and filterNil to eliminate null checks. They compose naturally in .pipe(). At SAP, a polling operator simplified our real-time dashboard data refresh pattern across 12+ widgets."*

## 4. 🧠 MEMORY AID
**"Custom operator = function returning (source$) => source$.pipe(...). Always return OperatorFunction<In, Out>. Common: retry, poll, cache, debug, filterNil."**
