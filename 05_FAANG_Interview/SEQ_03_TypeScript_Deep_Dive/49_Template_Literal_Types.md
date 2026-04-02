# 49. Template Literal Types
**Phase:** Foundations | **Sequence:** SEQ 3 — TypeScript Deep Dive | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Template literal types (TS 4.1+) let you construct new string types by combining existing string literals — the same template literal syntax from JavaScript, but used at the type level. They're how TypeScript can know that `'user:login'` is a valid event name but `'user:missing'` is not, or that `getPropName` is valid but `getpropname` isn't. I use them at SAP to type-safely derive CSS class names, OData filter strings, and event name schemas from source types.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

Before template literal types, string-based APIs were typed as `string` — no specificity. You could pass any string to an event emitter and TypeScript wouldn't catch typos. Template literal types give precision over string shapes, enabling strongly-typed string-based APIs.

### How It Works Internally

**Basic template literal type:**
```typescript
type EventName = `on${string}`;
// Any string starting with "on"

const onClick: EventName = 'onClick';   // ✅
const onChange: EventName = 'onChange'; // ✅
const click: EventName = 'click';       // ❌ doesn't start with "on"
```

**Combining string literal unions — cross-product:**
```typescript
type Color = 'red' | 'blue' | 'green';
type Size  = 'sm' | 'md' | 'lg';

type ColorSizeClass = `${Color}-${Size}`;
// 'red-sm' | 'red-md' | 'red-lg' | 'blue-sm' | 'blue-md' | 'blue-lg' | 'green-sm' | 'green-md' | 'green-lg'
// TypeScript generates the full cross-product — 9 members
```

**Intrinsic string manipulation types (built-in since TS 4.1):**
```typescript
type A = Uppercase<'hello'>;          // 'HELLO'
type B = Lowercase<'HELLO'>;          // 'hello'
type C = Capitalize<'hello world'>;   // 'Hello world'
type D = Uncapitalize<'HelloWorld'>;  // 'helloWorld'
```

**Event emitter pattern — typed event names and payloads:**
```typescript
type EventMap = {
  'user:login':  { userId: string; timestamp: number };
  'user:logout': { userId: string };
  'cart:add':    { productId: string; qty: number };
  'cart:remove': { productId: string };
};

type EventName = keyof EventMap; // 'user:login' | 'user:logout' | 'cart:add' | 'cart:remove'

class TypedEventEmitter {
  emit<K extends EventName>(event: K, payload: EventMap[K]): void { /* ... */ }
  on<K extends EventName>(event: K, handler: (payload: EventMap[K]) => void): void { /* ... */ }
}

const emitter = new TypedEventEmitter();
emitter.emit('user:login', { userId: '123', timestamp: Date.now() }); // ✅
emitter.emit('user:login', { userId: '123' });  // ❌ missing timestamp
emitter.emit('user:typo', { userId: '123' });   // ❌ 'user:typo' not in EventName
```

**Getter/Setter generation with template literals + `Capitalize`:**
```typescript
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K]
};

type User = { name: string; age: number };
type UserGetters = Getters<User>;
// { getName: () => string; getAge: () => number }
```

**CSS class name typing — design system pattern:**
```typescript
type Variant = 'primary' | 'secondary' | 'danger';
type State   = 'default' | 'hover' | 'active' | 'disabled';

type ButtonClass = `btn-${Variant}` | `btn-${Variant}--${State}`;
// 'btn-primary' | 'btn-secondary' | 'btn-danger'
// | 'btn-primary--default' | 'btn-primary--hover' | ... (12 state variants)

function applyClass(cls: ButtonClass): void { /* ... */ }
applyClass('btn-primary');            // ✅
applyClass('btn-primary--hover');     // ✅
applyClass('btn-warning');            // ❌ compile error
```

**Extracting namespace from event names:**
```typescript
type EventNamespace<T extends string> = T extends `${infer NS}:${string}` ? NS : never;

type NS = EventNamespace<'user:login' | 'cart:add' | 'error'>; // 'user' | 'cart'
// 'error' doesn't match the pattern → never → filtered out
```

**Route parameter extraction:**
```typescript
type ExtractRouteParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractRouteParams<`/${Rest}`>
    : T extends `${string}:${infer Param}`
      ? Param
      : never;

type Params = ExtractRouteParams<'/users/:userId/posts/:postId'>;
// 'userId' | 'postId'
```

### Architecture & Component Boundaries

```
Template Literal Type Applications:
  ├── Event systems: EventName = `${Entity}:${Action}`
  ├── CSS/class names: `btn-${Variant}--${State}`
  ├── API endpoints: `/api/${Resource}/${string}`
  ├── Store action types: `${Feature}/${ActionName}`
  ├── Getter/Setter derivation: `get${Capitalize<K>}`
  └── i18n key typing: `${Namespace}.${Key}`
```

### Performance Implications

- Large cross-product unions (many members × many members) can cause TypeScript to generate thousands of string literal types — intentionally or accidentally
- `Color × Size × State × Variant` with 4 members each = 4⁴ = 256 types — manageable
- But `HttpMethod × Resource × Id × Action` with 10 members each = 10,000 types — TypeScript will warn: `Expression produces a union type that is too complex to represent`
- Limit cross-product templates to ≤ 3 dimensions or ≤ ~50 total members

### ⚠️ Anti-Patterns & Pitfalls

- **Cross-product explosion** — combining 5+ string unions with template literals produces combinatorially large union types that TypeScript refuses to represent. Keep template literal unions small.
- **Overly broad string templates** — `type Endpoint = \`/api/${string}\`` is essentially `string` with a prefix — nearly all TypeScript specificity is lost. Type specific endpoints individually.
- **Not using `infer` to extract parts** — just typing the full string without being able to operate on its parts is weaker. Use `infer` in conditional types to extract namespace, parameter, or action portions.
- **Case sensitivity mismatch** — `Capitalize` only capitalizes the first letter; `Uppercase` uppercases all. Wrong choice when generating getter names causes compile errors downstream.

---

## 🏭 3. Real-World Examples

**At Hruday's level (SAP):**
SAP Fiori event bus uses namespaced event names like `sap.m.Button:press`, `sap.ui.core.Item:select`. Typing this as `${string}:${string}` prevented typos; narrowing further to `\`sap.${ComponentName}:${EventName}\`` gave full autocomplete. At SAP, i18n translation keys follow a `namespace.key` pattern — template literal types `\`${TranslationNamespace}.${TranslationKey}\`` gave compile-time safety: passing a non-existent key to the i18n function caused a compile error, not a runtime empty string.

**At FAANG scale:**
- **Microsoft:** VS Code extension API events use string-typed event names — Microsoft's TypeScript interviewers know this is a pain point and ask how template literal types solve it
- **Adobe:** React Spectrum CSS module class names are template literal typed — the design token system uses `token-${category}-${name}` patterns
- **Salesforce:** Lightning Design System uses BEM notation class names — template literal types enforce `slds-${block}__${element}--${modifier}` patterns
- **Cisco:** API event topics in the Webex SDK follow namespaced patterns — `webex:${EventType}` is now template-literal typed in their TypeScript SDK

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)
> "Template literal types use the same backtick syntax as JavaScript string interpolation, but at the type level. When you interpolate a union, TypeScript generates the full cross-product — `\`${'a' | 'b'}-${'x' | 'y'}\`` produces all 4 combinations. The power comes from combining them with mapped types and `infer`: you can generate getter method names from property names, extract route parameters from URL patterns, or enforce that all event names follow a `namespace:action` schema. The one trap is cross-product explosion — multiplying several string literal unions together produces a combinatorially large union that TypeScript will refuse to represent."

### Likely Follow-up Questions
1. **What are intrinsic string utility types?** → `Uppercase<T>`, `Lowercase<T>`, `Capitalize<T>`, `Uncapitalize<T>` — operate on string literal types to transform their casing
2. **How many members does `\`${'a'|'b'}-${'x'|'y'|'z'}\`` produce?** → 6 — 2 × 3 cross-product
3. **Can you combine template literal types with `infer`?** → Yes: `T extends \`${infer NS}:${infer Action}\`` — extracts the namespace and action portions from a namespaced string type
4. **What error indicates the union is too large?** → `Expression produces a union type that is too complex to represent` — reduce dimensions or number of members

### How to Signal Senior Thinking
> "The most underrated combination is template literal types with mapped types for deriving typed accessor methods: `as \`get${Capitalize<string & K>}\`\`` turns every property into a getter method name in one expression. Combined with `infer` for extraction, you can build bidirectional mappings: generate event names from a registry type and also extract which registry entry a given event name refers to — without any runtime code."

---

## 💻 5. Code Example

```typescript
// ─── Typed event bus with namespace:action pattern ───────────────────

type EventRegistry = {
  'user:login':   { userId: string; role: string };
  'user:logout':  { userId: string };
  'order:create': { orderId: string; amount: number };
  'order:cancel': { orderId: string; reason: string };
};

type EventName = keyof EventRegistry;
// 'user:login' | 'user:logout' | 'order:create' | 'order:cancel'

// Extract namespace from event name
type EventNamespace<T extends EventName> =
  T extends `${infer NS}:${string}` ? NS : never;

type Namespaces = EventNamespace<EventName>; // 'user' | 'order'

// Filter events by namespace
type EventsByNamespace<NS extends Namespaces> = {
  [K in EventName as K extends `${NS}:${string}` ? K : never]: EventRegistry[K]
};

type UserEvents = EventsByNamespace<'user'>;
// { 'user:login': {...}; 'user:logout': {...} }

// Typed event emitter
class TypedEmitter {
  private handlers = new Map<EventName, Array<(payload: any) => void>>();

  on<K extends EventName>(
    event: K,
    handler: (payload: EventRegistry[K]) => void
  ): void {
    const existing = this.handlers.get(event) ?? [];
    this.handlers.set(event, [...existing, handler]);
  }

  emit<K extends EventName>(event: K, payload: EventRegistry[K]): void {
    this.handlers.get(event)?.forEach(h => h(payload));
  }
}

const bus = new TypedEmitter();
bus.on('user:login', ({ userId, role }) => {      // ✅ fully typed payload
  console.log(`${userId} logged in as ${role}`);
});
bus.emit('user:login', { userId: '1', role: 'admin' }); // ✅
bus.emit('user:login', { userId: '1' });                // ❌ missing role

// ─── CSS class name typing — design system ───────────────────────────

type Intent  = 'primary' | 'danger' | 'warning' | 'success';
type UISize  = 'sm' | 'md' | 'lg';
type UIState = 'default' | 'hover' | 'disabled';

type ButtonClass =
  | `btn-${Intent}`
  | `btn-${Intent}--${UISize}`
  | `btn-${Intent}--${UIState}`;

function classBtn(cls: ButtonClass): string { return cls; }
classBtn('btn-primary');            // ✅
classBtn('btn-danger--lg');         // ✅
classBtn('btn-primary--disabled');  // ✅
classBtn('btn-unknown');            // ❌ compile error

// ─── Getter generation — combined with mapped type ───────────────────

type WithGetters<T> = T & {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K]
};

type User = { name: string; age: number; role: string };
type UserWithGetters = WithGetters<User>;
// Has: name, age, role (original fields)
// Plus: getName(), getAge(), getRole() (generated getters)
```

---

## 🧠 6. Memory Aid

**Mental Model:** Template literal type = type-level string interpolation. Unions inside = cross-product. `infer` inside = pattern extraction.

**If you go blank:** "Template literal types use backticks at the type level. Union inside = all combinations. `Capitalize<T>` capitalizes first letter. `infer` extracts parts. Watch out for combinatorial explosion."

**Mnemonic:** **"Template types = T² = Type-level Text = combine + constrain + extract"**

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: Zero runtime cost — pure type-level; prevents runtime typo bugs in string-based APIs  
→ Performance: No impact on bundle; prevents entire classes of bugs (event name typos, wrong CSS class names, bad i18n keys) that would otherwise surface in production  
→ Business: Design system class names, i18n key strings, and event bus APIs are the most likely places for typo-induced bugs — template literal types eliminate them entirely

**How it works (3 sentences):**
Template literal types use the JavaScript template literal syntax (`\`prefix${X}\``) at the type level — when interpolated types are string literal unions, TypeScript generates the full cross-product of all combinations. Intrinsic utilities `Capitalize`, `Uppercase`, `Lowercase`, `Uncapitalize` transform string literal case within template expressions. Combined with `infer`, they can extract typed substrings from string patterns — enabling namespace extraction, route parameter typing, and event category filtering.

**Company relevance:**
- Microsoft: VS Code API event names are string-based — template literal types are the solution TypeScript team built for this; expected to know in TypeScript-focused interviews
- Adobe: React Spectrum tokens and class names follow naming conventions; template literal types enforce them at compile time (Adobe's TypeScript stack uses this extensively)
- Salesforce: SLDS BEM class names follow `slds-block__element--modifier` — template literal types enforce SLDS conventions
- Cisco: Webex SDK event names are namespaced strings; TypeScript SDK uses template literal types for type-safe event subscription

---
**✅ Topic 49/486 complete.**
**→ Continuing to Topic 50: Discriminated Unions**
