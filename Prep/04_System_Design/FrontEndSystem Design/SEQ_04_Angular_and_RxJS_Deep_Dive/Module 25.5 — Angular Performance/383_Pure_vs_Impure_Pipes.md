# 383 – Pure Pipes vs Impure Pipes

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**Pure pipes** (default) only re-execute when input REFERENCE changes — memoized, performant. **Impure pipes** (`pure: false`) run on EVERY change detection cycle — like calling a function in template. Always prefer pure pipes. Use impure only when you need to react to internal mutations.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// ──── PURE PIPE (default) ────
// Only re-executes when input reference changes
@Pipe({ name: 'filterActive', standalone: true, pure: true }) // pure: true is default
export class FilterActivePipe implements PipeTransform {
  transform(items: User[]): User[] {
    console.log('pure pipe executed'); // runs only on NEW array reference
    return items.filter(item => item.active);
  }
}

// Template:
// {{ users | filterActive }}
// Only re-runs when `users` is a NEW array reference
// ✅ users = [...users, newUser]  → pipe runs
// ❌ users.push(newUser)          → pipe does NOT run (same reference)

// ──── IMPURE PIPE ────
// Runs on EVERY change detection cycle
@Pipe({ name: 'filterActive', standalone: true, pure: false })
export class FilterActiveImpurePipe implements PipeTransform {
  transform(items: User[]): User[] {
    console.log('impure pipe executed'); // runs EVERY CD cycle!
    return items.filter(item => item.active);
  }
}
// ⚠️ Performance killer on large lists or frequent CD

// ──── BUILT-IN PIPES (all pure except) ────
// Pure: date, uppercase, lowercase, number, currency, percent, json, slice
// Impure: async (subscribes/unsubscribes), keyvalue (Angular 6+)

// ──── WHEN TO USE EACH ────
// Pure: formatting, filtering (with immutable data), calculations
// Impure: almost never — use computed() or async pipe instead

// ──── PURE PIPE EXAMPLES ────
@Pipe({ name: 'timeAgo', standalone: true })
export class TimeAgoPipe implements PipeTransform {
  transform(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }
}

@Pipe({ name: 'truncate', standalone: true })
export class TruncatePipe implements PipeTransform {
  transform(value: string, limit = 50): string {
    return value.length > limit ? value.substring(0, limit) + '...' : value;
  }
}

// ──── BETTER ALTERNATIVES TO IMPURE PIPES ────

// Instead of impure pipe for filtering:
// ❌ {{ users | filterActive }}  (impure, runs every CD)

// ✅ Use computed signal:
activeUsers = computed(() => this.users().filter(u => u.active));
// Template: {{ activeUsers() }} — memoized, only when users change

// ✅ Or use OnPush + immutable:
// Reassign array reference on changes → pure pipe re-runs
```

### Comparison
| Aspect | Pure Pipe | Impure Pipe |
|---|---|---|
| **Execution** | On input ref change | Every CD cycle |
| **Performance** | Excellent (memoized) | Poor |
| **Use with** | Immutable data | Mutable data (avoid) |
| **Examples** | date, currency, custom | async, keyvalue |
| **Recommendation** | Always prefer | Avoid (use computed) |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Pure pipes are memoized — only recalculate when input reference changes, great for performance. Impure pipes run every CD cycle — almost never needed. I use pure pipes for formatting (date, currency, truncate) and computed() signals for derived data. The async pipe is the one exception — it's impure by necessity."*

## 4. 🧠 MEMORY AID
**"Pure = input ref changes only (fast). Impure = every CD cycle (slow). Default is pure. async pipe = useful exception. Prefer computed() over impure pipes."**
