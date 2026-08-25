# 374 – switchMap vs mergeMap vs concatMap vs exhaustMap

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Four **higher-order mapping operators** that map outer values to inner Observables. **switchMap** — cancels previous inner. **mergeMap** — runs all inner concurrently. **concatMap** — queues, one at a time in order. **exhaustMap** — ignores new outer while inner is active.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// ──── switchMap ────
// Cancel previous inner observable when new outer value arrives
// USE: search autocomplete, route params, latest-wins scenarios
this.searchInput.valueChanges.pipe(
  debounceTime(300),
  switchMap(term => this.api.search(term)), // cancels previous HTTP
).subscribe(results => this.results = results);

// Route params — switch to new user on navigation
this.route.params.pipe(
  switchMap(params => this.userService.getUser(params['id'])),
).subscribe(user => this.user = user);

// ──── mergeMap (flatMap) ────
// Run all inner observables concurrently (no cancellation)
// USE: fire-and-forget, parallel operations, logging
this.fileList$.pipe(
  mergeMap(file => this.uploadService.upload(file), 3), // concurrency limit: 3
).subscribe(result => console.log('uploaded:', result));

// ──── concatMap ────
// Queue inner observables, execute one at a time in order
// USE: sequential writes, ordered operations, dependent requests
this.saveActions$.pipe(
  concatMap(action => this.api.save(action)), // wait for each to complete
).subscribe(() => console.log('saved in order'));

// Form auto-save — preserve order
this.form.valueChanges.pipe(
  debounceTime(1000),
  concatMap(formValue => this.api.autoSave(formValue)), // sequential saves
).subscribe();

// ──── exhaustMap ────
// Ignore new outer values while inner is active
// USE: login/submit buttons — prevent double-submit
this.loginButton$.pipe(
  exhaustMap(credentials => this.authService.login(credentials)),
  // If user clicks again while login is pending → ignored
).subscribe(user => this.router.navigate(['/dashboard']));

// Refresh button — ignore rapid clicks
this.refreshClick$.pipe(
  exhaustMap(() => this.api.loadData()),
).subscribe(data => this.data = data);
```

### Decision Matrix
```
"Which flattening operator do I use?"

Is order important?
├── Yes → Is only the latest relevant?
│         ├── Yes → switchMap (cancel old)
│         └── No  → concatMap (queue, sequential)
└── No  → Should I ignore while busy?
          ├── Yes → exhaustMap (ignore new)
          └── No  → mergeMap (all concurrent)
```

| Operator | Inner Subs | Cancel? | Order? | Use Case |
|---|---|---|---|---|
| `switchMap` | 1 (latest) | Yes | Latest | Search, route params |
| `mergeMap` | Unlimited | No | No | Parallel uploads |
| `concatMap` | 1 (queued) | No | Yes | Sequential saves |
| `exhaustMap` | 1 (active) | Ignores new | N/A | Login, refresh |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"switchMap for search (cancel previous), concatMap for ordered saves, exhaustMap for login/submit (prevent double-click), mergeMap for parallel operations with optional concurrency limit. At SAP, search autocomplete used switchMap+debounceTime, form auto-save used concatMap to preserve write order."*

## 4. 🧠 MEMORY AID
**"Switch = cancel old. Merge = run all. Concat = queue in order. Exhaust = ignore while busy. Mnemonic: 'SMCE — Search, Multiple, Careful-order, Exclude-duplicates'."**
