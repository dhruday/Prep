# 174. Prototype Pollution ★★★

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

**Prototype pollution** is a JavaScript-specific vulnerability where an attacker can modify `Object.prototype` — the base prototype that all JavaScript objects inherit from — by exploiting code that recursively merges, clones, or sets properties on objects using user-controlled property names like `__proto__`, `constructor`, or `prototype`. Once `Object.prototype` is polluted, every object in the application inherits the attacker-injected properties, which can bypass security checks (e.g., `if (user.isAdmin)` becomes true for all users), cause application crashes (due to unexpected property values), or enable **Remote Code Execution** in server-side Node.js applications that execute polluted properties. According to the Snyk vulnerability database, prototype pollution was rated in the OWASP Top 10 for JavaScript applications and has affected lodash (4+ billion weekly downloads), jQuery, `merge`, `deep-extend`, and dozens of other widely-used libraries. As a senior engineer at SAP or Cisco building data-heavy applications that merge API responses with defaults, this is not theoretical — it's a class of bug that appears in real codebases.

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### How Prototype Pollution Works

```typescript
// THE ATTACK — A naive deep merge function
function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  for (const key in source) {
    // ❌ VULNERABLE: iterates all enumerable properties including __proto__
    if (typeof source[key] === 'object' && source[key] !== null) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key] as Record<string, unknown>, source[key] as Record<string, unknown>);
    } else {
      // ❌ VULNERABLE: assigns to target[key] including __proto__
      target[key] = source[key];
    }
  }
  return target;
}

// Attacker-controlled JSON from API/user input:
const maliciousPayload = JSON.parse('{"__proto__": {"isAdmin": true, "polluted": "yes"}}');

const victim = {};
deepMerge(victim, maliciousPayload);

// IMPACT: Every object now has isAdmin = true
const normalUser = {};
console.log(normalUser.isAdmin);      // → true  (POLLUTED!)
console.log(({} as any).polluted);    // → "yes" (POLLUTED!)

// This bypasses: if (!user.isAdmin) throw new UnauthorizedError()
```

### Pollution via Different Attack Vectors

```typescript
// Vector 1: __proto__ property (most common)
const obj = {};
(obj as any).__proto__.injected = 'polluted';
console.log(({} as any).injected);  // → "polluted"

// Vector 2: constructor.prototype
const obj2 = {};
(obj2 as any).constructor.prototype.injected2 = 'polluted2';
console.log(({} as any).injected2);  // → "polluted2"

// Vector 3: Path traversal in property setter
function setProperty(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let current: Record<string, unknown> = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    // ❌ VULNERABLE: if path is "__proto__.isAdmin", this traverses prototype chain
    if (!current[parts[i]]) current[parts[i]] = {};
    current = current[parts[i]] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;  // ❌ Sets on prototype!
}

setProperty({}, '__proto__.isAdmin', true);
console.log(({} as any).isAdmin);  // → true
```

### Prevention Techniques

```typescript
// ─────── TECHNIQUE 1: Use hasOwnProperty check ───────
function safeMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  for (const key in source) {
    // ✅ Only merge own properties, skip prototype chain
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
    
    // ✅ Block known pollution vectors
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    
    if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
      const targetChild = (target[key] && typeof target[key] === 'object')
        ? target[key] as Record<string, unknown>
        : {};
      target[key] = safeMerge(targetChild, source[key] as Record<string, unknown>);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

// ─────── TECHNIQUE 2: Object.create(null) — Null prototype objects ───────
// Objects with null prototype have no __proto__ to pollute
const safeMap = Object.create(null) as Record<string, unknown>;
safeMap['data'] = 'safe';
console.log(safeMap.__proto__);  // → undefined (no prototype chain)
// ✅ Cannot be pollution target since it has no prototype to inherit from

// Use for: lookup tables, configuration maps, anywhere keys come from user input
function parseQueryParams(search: string): Record<string, string> {
  const params = Object.create(null) as Record<string, string>;  // ✅ Null prototype
  new URLSearchParams(search).forEach((value, key) => {
    // Even if key is "__proto__", there's no prototype to pollute
    params[key] = value;
  });
  return params;
}

// ─────── TECHNIQUE 3: Object.freeze(Object.prototype) ───────
// Prevents any modification to Object.prototype at startup
// Best for libraries/utilities — too strict for applications that need runtime extension
if (process.env.NODE_ENV !== 'production') {
  // Freeze in development to catch pollution attempts during testing
  Object.freeze(Object.prototype);
  Object.freeze(Object.constructor);
}

// ─────── TECHNIQUE 4: JSON schema validation before merging ───────
import Ajv from 'ajv';
const ajv = new Ajv();

const configSchema = {
  type: 'object',
  additionalProperties: false,  // ✅ Rejects __proto__ since it's not in schema
  properties: {
    theme: { type: 'string', enum: ['light', 'dark'] },
    language: { type: 'string', pattern: '^[a-z]{2}-[A-Z]{2}$' },
  },
};

function mergeUserConfig(
  defaults: Record<string, unknown>,
  userInput: unknown
): Record<string, unknown> {
  // ✅ Validate BEFORE merge — unknown properties including __proto__ are rejected
  if (!ajv.validate(configSchema, userInput)) {
    throw new Error(`Invalid config: ${ajv.errorsText()}`);
  }
  return { ...defaults, ...(userInput as Record<string, unknown>) };
}

// ─────── TECHNIQUE 5: structuredClone() for deep copy ───────
// structuredClone does NOT preserve __proto__ modifications
// Safe for cloning objects before merge
const untrustedData = JSON.parse('{"__proto__":{"evil":true},"data":"value"}');
const safeClone = structuredClone(untrustedData);
// safeClone.__proto__.evil is NOT set — structuredClone ignores prototype chain
```

### Detecting Pollution in Your Codebase

```typescript
// Security audit: scan for vulnerable patterns

// PATTERNS TO GREP FOR in your codebase:
// 1. for...in loops on objects from external sources
// 2. target[key] = source[key] pattern without hasOwnProperty check
// 3. merge(), deepMerge(), extend(), assign() called with user-controlled data
// 4. lodash.merge() with user data (lodash < 4.17.11)
// 5. jQuery.extend() with deep=true (jQuery < 3.4.0)

// Runtime detection (development/staging only)
function installPollutionDetector(): void {
  const originalDefineProperty = Object.defineProperty;
  
  Object.defineProperty = function(obj, prop, descriptor) {
    if (obj === Object.prototype) {
      console.error(`Prototype pollution attempt detected: Object.prototype.${String(prop)}`);
      console.trace();
      // Don't throw in production — log and alert
    }
    return originalDefineProperty.call(Object, obj, prop, descriptor);
  };
}
```

### Safe Libraries for Deep Merge

```typescript
// ✅ Lodash 4.17.11+ (patched) — still use with caution
import { merge } from 'lodash-es';  // Patched version

// ✅ Immer — immutable updates, no prototype pollution risk
import { produce } from 'immer';

const updated = produce(originalState, (draft) => {
  draft.user.preferences.theme = 'dark';
  // Immer uses Proxy — cannot pollute Object.prototype
});

// ✅ Spread operator with structuredClone for deep copy
function safeDeepMerge<T extends object>(target: T, source: Partial<T>): T {
  const clean = structuredClone(source);  // Strip prototype chain
  return { ...target, ...clean };         // Shallow merge is safe
}

// ✅ For genuinely deep merge needs, use recursion with null-proto accumulator
function deepMergeSecure<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = Object.create(null) as T;  // Null proto accumulator
  Object.assign(result, target);
  
  for (const key of Object.keys(source)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    
    const sourceVal = source[key as keyof T];
    const targetVal = result[key as keyof T];
    
    if (isPlainObject(sourceVal) && isPlainObject(targetVal)) {
      (result as Record<string, unknown>)[key] = deepMergeSecure(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>,
      );
    } else {
      (result as Record<string, unknown>)[key] = sourceVal;
    }
  }
  
  return result;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
```

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**Lodash CVE-2019-10744:**
Lodash `_.merge()` was vulnerable to prototype pollution until v4.17.11. Millions of applications using lodash < 4.17.11 were vulnerable. A malicious API response containing `{"__proto__": {"isAdmin": true}}` could elevate any user to admin if the response was merged into a user object.

**jQuery CVE-2019-11358:**
jQuery's `$.extend(true, {}, userPayload)` was vulnerable to prototype pollution when `deep=true`. Fixed in jQuery 3.4.0. Any application using `$.extend` with user-controlled data was affected.

**Node.js Server-Side RCE:**
In server-side Express applications, prototype pollution can lead to Remote Code Execution if the polluted property reaches a `child_process.spawn()` call or is used as a file path. `{__proto__: {env: {NODE_OPTIONS: "--require /tmp/evil.js"}}}` could execute arbitrary code when spawning processes.

**HackerOne Bug Bounties:**
Multiple $10,000+ bug bounties have been paid for prototype pollution vulnerabilities in major production systems. It's one of the most commonly found critical vulnerabilities in JavaScript security audits.

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "Prototype pollution is a JavaScript-specific vulnerability where attacker-controlled input containing `__proto__` or `constructor.prototype` as a key can modify `Object.prototype` — the ultimate base for all JavaScript objects. Once polluted, every `{}` in the application inherits the injected properties, which can bypass security checks or cause crashes. It typically exploits naive deep merge or recursive property assignment code. My prevention approach is layered: first, validate untrusted input against a strict schema with `additionalProperties: false` before any merge — this rejects `__proto__` outright. Second, any custom merge function must explicitly skip `__proto__`, `constructor`, and `prototype` keys AND use `Object.prototype.hasOwnProperty.call()` to avoid iterating inherited properties. Third, for high-security config objects, use `Object.create(null)` which has no prototype to pollute. Fourth, keep lodash at 4.17.11+ and jQuery at 3.4.0+ — the prior versions are known-vulnerable."

**Follow-up Questions:**
1. *What's the difference between prototype pollution and prototype chain manipulation?* → Prototype chain manipulation is intentional and controlled (e.g., setting up inheritance). Prototype pollution is unintentional modification through user-controlled input reaching property assignment.
2. *How does `Object.freeze(Object.prototype)` protect against pollution?* → Makes `Object.prototype` non-writable and non-configurable — any attempt to add properties throws in strict mode, silently fails in non-strict. Good for libraries; too restrictive for apps that legitimately extend prototypes.
3. *Can prototype pollution affect JSON.parse?* → No — `JSON.parse` correctly handles `{"__proto__": {...}}` by creating a regular key named `__proto__` on the OBJECT (not the prototype). The vulnerability is in code that subsequently processes this parsed object with `target[key] = source[key]` style loops.

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE
────────────────────────────────────────────────────────────

```typescript
// Complete safe merge utility with all protections
export function safeMergeDeep<T extends Record<string, unknown>>(
  target: T,
  ...sources: Partial<T>[]
): T {
  const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
  
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    
    for (const key of Object.keys(source)) {
      if (BLOCKED_KEYS.has(key)) continue;  // ❌ Block pollution vectors
      
      const sourceVal = source[key as keyof T];
      const targetVal = target[key as keyof T];
      
      if (
        sourceVal !== null &&
        typeof sourceVal === 'object' &&
        !Array.isArray(sourceVal) &&
        targetVal !== null &&
        typeof targetVal === 'object' &&
        !Array.isArray(targetVal)
      ) {
        // Recursively merge plain objects only
        (target as Record<string, unknown>)[key] = safeMergeDeep(
          { ...(targetVal as Record<string, unknown>) },
          sourceVal as Record<string, unknown>,
        );
      } else {
        (target as Record<string, unknown>)[key] = sourceVal;
      }
    }
  }
  
  return target;
}

// Test it's safe:
const result = safeMergeDeep({}, JSON.parse('{"__proto__":{"evil":true},"name":"user"}'));
console.log(result.name);              // → "user"   ✅ safe property works
console.log(({} as any).evil);         // → undefined ✅ NOT polluted
```

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**Attack vectors:** `__proto__`, `constructor`, `prototype` as object keys
**Impact:** Every `{}` inherits attacker-injected properties → security bypass, crashes, RCE (Node.js)
**Four defenses:**
1. Block keys: skip `__proto__`, `constructor`, `prototype` in merge loops
2. Schema validation: `additionalProperties: false` rejects unknown keys before merge
3. `Object.create(null)`: null prototype maps can't be polluted
4. `structuredClone()`: strips prototype modifications during deep copy

**Known-vulnerable versions:** lodash < 4.17.11, jQuery < 3.4.0

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ JavaScript's prototype inheritance means ONE polluted `Object.prototype` affects ALL objects in the process
→ Enables privilege escalation (bypassing `isAdmin` checks), Denial of Service (throwing on unexpected property types), and RCE in Node.js
→ Widely exploitable: deep merge is extremely common in frontend config handling, theme merging, user preference merging

**How it works:**
→ `obj['__proto__']['key'] = val` is equivalent to `Object.prototype['key'] = val`
→ All JavaScript objects prototype-chain back to `Object.prototype`
→ `for...in` loops iterate the entire prototype chain — naive `target[key] = source[key]` copies everything including `__proto__`
→ Blocked by: key filtering, `Object.keys()` (own only) instead of `for...in`, schema validation, null-prototype objects

**Company relevance:**
→ **Microsoft**: TypeScript compiler and VS Code extension host run in Node.js — both have had security reviews specifically for this class of vulnerability
→ **Adobe**: Adobe I/O (Firefly, Creative SDK) uses deep object merging for API configuration — requires this specifically guarded
→ **Salesforce**: LWC (Lightning Web Components) framework processes user-provided component properties — OWASP prototype pollution is in their AppExchange security review checklist
→ **Cisco**: NSO (Network Services Orchestrator) JavaScript YANG model processing involves merging network config objects — prototype pollution is a concern in network automation contexts
