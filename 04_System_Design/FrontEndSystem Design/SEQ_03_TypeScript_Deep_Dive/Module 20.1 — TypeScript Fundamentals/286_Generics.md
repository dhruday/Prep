# 286 – Generics — Functions, Classes, Constraints

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Generics let you write **reusable, type-safe code** that works with any type while preserving type information. Instead of using `any` (loses type safety) or duplicating code for each type, generics parameterize types: `function identity<T>(value: T): T`. Think of `<T>` as a "type variable" — it's filled in when the function is called. Generics are essential for: reusable components (`Select<T>`), utility functions (`map<T>`), hooks (`useState<T>`), and data structures (`Map<K, V>`).

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Generic Functions

```typescript
// Basic generic function
function first<T>(items: T[]): T | undefined {
  return items[0];
}
const num = first([1, 2, 3]);     // inferred: number | undefined
const str = first(['a', 'b']);     // inferred: string | undefined

// Multiple type parameters
function pair<A, B>(a: A, b: B): [A, B] {
  return [a, b];
}
const result = pair('hello', 42); // [string, number]
```

### Generic Constraints

```typescript
// Constrain T to objects with a 'length' property
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}
longest('abc', 'de');     // ✅ string has length
longest([1, 2], [1]);     // ✅ array has length
// longest(10, 20);       // ❌ number has no length

// Constrain with keyof
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
const user = { name: 'Hruday', age: 28 };
getProperty(user, 'name'); // string
// getProperty(user, 'foo'); // ❌ 'foo' is not a key of user
```

### Generic Interfaces & Classes

```typescript
// Generic interface
interface Repository<T> {
  findById(id: string): Promise<T>;
  findAll(): Promise<T[]>;
  create(item: Omit<T, 'id'>): Promise<T>;
  update(id: string, item: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

// Generic class
class InMemoryRepository<T extends { id: string }> implements Repository<T> {
  private items: Map<string, T> = new Map();
  
  async findById(id: string): Promise<T> {
    const item = this.items.get(id);
    if (!item) throw new Error(`Item ${id} not found`);
    return item;
  }
  async findAll(): Promise<T[]> { return Array.from(this.items.values()); }
  async create(item: Omit<T, 'id'>): Promise<T> {
    const newItem = { ...item, id: crypto.randomUUID() } as T;
    this.items.set(newItem.id, newItem);
    return newItem;
  }
  async update(id: string, item: Partial<T>): Promise<T> {
    const existing = await this.findById(id);
    const updated = { ...existing, ...item };
    this.items.set(id, updated);
    return updated;
  }
  async delete(id: string): Promise<void> { this.items.delete(id); }
}
```

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs
At SAP, we used generic components extensively: a generic `DataTable<T>` component that could display any entity type with type-safe column definitions, and generic service layers (`ODataService<T>`) that provided type-safe CRUD operations for any OData entity.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"Generics let me write reusable, type-safe code. I use them for: generic hooks (useAsync<T>), generic components (DataTable<T>), and generic service layers (Repository<T>). I constrain generics with extends to enforce required properties. At SAP, our generic DataTable<T> component worked with any OData entity type while keeping column definitions fully typed."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Generic React hook
function useAsync<T>(asyncFn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'idle' });
  useEffect(() => {
    setState({ status: 'loading' });
    asyncFn()
      .then(data => setState({ status: 'success', data }))
      .catch(error => setState({ status: 'error', error: error.message }));
  }, deps);
  return state;
}

// Usage — T is inferred
const { status, data } = useAsync(() => fetchUsers(), []);
// data is User[] | undefined — fully typed!

// Generic component with constraints
interface Column<T> { key: keyof T; header: string; render?: (value: T[keyof T], row: T) => React.ReactNode; }

function DataTable<T extends { id: string }>({ data, columns }: { data: T[]; columns: Column<T>[] }) {
  return (
    <table>
      <thead><tr>{columns.map(col => <th key={String(col.key)}>{col.header}</th>)}</tr></thead>
      <tbody>{data.map(row => <tr key={row.id}>{columns.map(col => <td key={String(col.key)}>{col.render ? col.render(row[col.key], row) : String(row[col.key])}</td>)}</tr>)}</tbody>
    </table>
  );
}
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Generics = type variables that preserve type info. Constraints with `extends`. Inferred at call site."** Use for: hooks, components, services, utility functions. Never use `any` when generics can preserve type safety. Constrain with `extends { id: string }` to ensure required shape.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Generics are the foundation of type-safe reusable code. Expected in senior TS interviews.
**How:** `<T>` type parameters, `extends` constraints, `keyof` for property access, inference at call site.
**Companies:** Microsoft (TS creators — deep generic questions), all four test generic component/hook design.
