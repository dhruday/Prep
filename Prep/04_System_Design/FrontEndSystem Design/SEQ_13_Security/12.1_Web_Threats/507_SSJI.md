# 507. SSJI (Server-Side JavaScript Injection)

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**What it is:**
Server-Side JavaScript Injection (SSJI) is a security vulnerability where an attacker injects malicious JavaScript code that executes on the server — not in the browser. Unlike XSS (which targets client-side execution), SSJI targets Node.js/Deno/Bun servers, server-side rendering engines, or any backend that evaluates JavaScript dynamically. The attacker gains full server-side code execution, which can lead to data exfiltration, remote code execution (RCE), and complete infrastructure compromise.

**Why it exists:**
SSJI vulnerabilities arise when server-side code uses dynamic evaluation functions — `eval()`, `Function()`, `vm.runInNewContext()`, `setTimeout(string)`, `setInterval(string)`, or template engines with unescaped interpolation — on user-controlled input. With the rise of Node.js as a backend runtime (used by Netflix, PayPal, LinkedIn, Walmart), SSJI has become a critical OWASP-class vulnerability.

**When and where it's used (exploited):**
- Node.js APIs that use `eval()` on query parameters or body fields
- Server-side template engines (EJS, Pug, Handlebars) with unescaped interpolation
- JSON deserialization with `eval()` instead of `JSON.parse()`
- MongoDB queries using `$where` with user input (NoSQL injection variant)
- Server-side rendering (SSR) in Next.js/Nuxt/Angular Universal where user input reaches `eval()`
- Serverless functions (AWS Lambda, Cloud Functions) parsing user payloads dynamically
- GraphQL resolvers that dynamically construct queries from user input

**Role in large-scale applications:**
In enterprise frontends, the blast radius of SSJI is catastrophic. Unlike XSS (which compromises one user's session), SSJI compromises the server itself — all users' data, environment variables (API keys, DB credentials), file system access, and network access to internal services. At FAANG scale, a single SSJI vulnerability in a Node.js BFF (Backend-for-Frontend) layer can expose millions of user records and lateral-move into internal microservices.

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### **A. Attack Surface — Where SSJI Lives**

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                             │
│  User input: form fields, URL params, headers, cookies          │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP Request
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NODE.JS SERVER                                │
│                                                                  │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────────────┐ │
│  │ eval(input) │   │ Function()   │   │ vm.runInNewContext()  │ │
│  │             │   │  constructor │   │                      │ │
│  └──────┬──────┘   └──────┬───────┘   └──────────┬───────────┘ │
│         │                 │                       │              │
│         ▼                 ▼                       ▼              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              SERVER-SIDE CODE EXECUTION                    │ │
│  │  → Access process.env (API keys, secrets)                 │ │
│  │  → Read/write file system (require('fs'))                 │ │
│  │  → Execute shell commands (require('child_process'))      │ │
│  │  → Access database connections                            │ │
│  │  → Make HTTP requests to internal services                │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### **B. Vulnerable Patterns — The Dangerous Functions**

#### 1. `eval()` — The Most Obvious

```typescript
// ❌ VULNERABLE: User input reaches eval()
app.get('/calculate', (req: Request, res: Response) => {
  const expression = req.query.expr; // User input: "2+2" or "process.exit()"
  const result = eval(expression);   // SSJI! Attacker has full server access
  res.json({ result });
});

// Attack payload: ?expr=require('child_process').execSync('cat /etc/passwd').toString()
// Result: Server returns contents of /etc/passwd
```

#### 2. `Function()` Constructor

```typescript
// ❌ VULNERABLE: Dynamic function creation from user input
app.post('/transform', (req: Request, res: Response) => {
  const transformFn = new Function('data', req.body.code); // SSJI!
  const result = transformFn(req.body.data);
  res.json({ result });
});

// Attack: { "code": "return require('fs').readFileSync('/etc/passwd', 'utf-8')", "data": {} }
```

#### 3. `vm` Module (False Sense of Security)

```typescript
// ❌ STILL VULNERABLE: vm module is NOT a security sandbox
import * as vm from 'vm';

app.post('/execute', (req: Request, res: Response) => {
  const sandbox = { result: null };
  vm.createContext(sandbox);
  vm.runInContext(req.body.code, sandbox); // SSJI! vm is escapable
  res.json({ result: sandbox.result });
});

// Attack: this.constructor.constructor('return process')().exit()
// The vm module is designed for different V8 contexts, NOT security isolation
```

#### 4. Template Injection (SSTI → SSJI)

```typescript
// ❌ VULNERABLE: Server-side template injection in EJS
import ejs from 'ejs';

app.get('/greet', (req: Request, res: Response) => {
  const template = `Hello, ${req.query.name}!`; // User input in template
  const html = ejs.render(template);             // If name contains EJS tags: SSJI
  res.send(html);
});

// Attack: ?name=<%= global.process.mainModule.require('child_process').execSync('id') %>
```

#### 5. MongoDB `$where` Injection

```typescript
// ❌ VULNERABLE: User input in MongoDB $where clause
app.get('/users', async (req: Request, res: Response) => {
  const users = await db.collection('users').find({
    $where: `this.role === '${req.query.role}'`  // SSJI via MongoDB!
  }).toArray();
  res.json(users);
});

// Attack: ?role=' || true || '   → returns all users
// Attack: ?role='; sleep(5000); ' → timing attack to confirm injection
```

#### 6. `setTimeout` / `setInterval` with String Argument

```typescript
// ❌ VULNERABLE: String argument to setTimeout
app.post('/schedule', (req: Request, res: Response) => {
  setTimeout(req.body.callback, req.body.delay); // SSJI if callback is a string!
  res.json({ status: 'scheduled' });
});

// In Node.js, setTimeout('code-string', ms) evaluates the string — just like eval()
```

### **C. Comparison: SSJI vs. Related Vulnerabilities**

| Aspect | SSJI | XSS | SQL Injection | Command Injection | Prototype Pollution |
|--------|------|-----|---------------|-------------------|---------------------|
| **Execution context** | Server (Node.js) | Client (browser) | Database engine | OS shell | JS prototype chain |
| **Target** | Server runtime | User's browser | Database | Operating system | Application logic |
| **Blast radius** | All users + infra | Single user session | Database contents | Server OS | Varies (server or client) |
| **Input vector** | eval(), Function(), vm | innerHTML, document.write | SQL queries | exec(), spawn() | Object.assign, merge |
| **Encryption bypass** | Yes (server has keys) | No (client-side) | Yes (DB credentials) | Yes (OS access) | Indirect |
| **Detection difficulty** | Hard (server-side) | Medium (CSP reports) | Medium (WAF logs) | Medium (audit logs) | Hard (no direct errors) |
| **OWASP category** | A03:2021 Injection | A03:2021 Injection | A03:2021 Injection | A03:2021 Injection | A08:2021 Software Integrity |
| **Impact severity** | Critical (RCE) | High (session hijack) | Critical (data breach) | Critical (RCE) | Medium-High |
| **Fix complexity** | Moderate | Moderate | Low (parameterized) | Low (avoid shell) | Hard (deep auditing) |
| **Node.js specific** | Yes | No | No | Partially | Yes |

### **D. Detection Techniques**

**Static Analysis (SAST):**

```
Tools that catch SSJI patterns:
──────────────────────────────
1. ESLint + security plugins
   - eslint-plugin-security: Flags eval(), Function(), setTimeout(string)
   - eslint-plugin-no-unsanitized: Catches DOM sinks + server sinks

2. Semgrep rules
   - javascript.lang.security.audit.eval-injection
   - javascript.express.security.audit.eval-in-route

3. SonarQube / SonarCloud
   - Rule S1523: eval() usage
   - Rule S5334: Server-side injection

4. CodeQL (GitHub Advanced Security)
   - javascript/ql/src/Security/CWE-094/CodeInjection.ql
```

**Dynamic Analysis (DAST):**

| Tool | Detection Method | SSJI Coverage |
|------|-----------------|---------------|
| Burp Suite | Payload injection + response analysis | Good |
| OWASP ZAP | Active scanning with injection payloads | Moderate |
| Snyk | Dependency vulnerability scanning | Indirect (known CVEs) |
| npm audit | Known vulnerable packages | Indirect |

**Runtime Detection:**

```typescript
// Monkey-patch eval to detect runtime SSJI attempts
const originalEval = global.eval;
global.eval = function(code: string) {
  console.error('⚠️ eval() called with:', code.substring(0, 100));
  // In production: log to SIEM, block execution, alert
  throw new Error('eval() is disabled in production');
};
```

### **E. Prevention & Mitigation (Defense in Depth)**

#### Layer 1: Eliminate Dangerous Functions

```typescript
// ✅ SAFE: Use JSON.parse() instead of eval() for JSON
const data = JSON.parse(req.body.payload); // Never eval(req.body.payload)

// ✅ SAFE: Use parameterized MongoDB queries
const users = await db.collection('users').find({
  role: { $eq: req.query.role }  // Parameterized, not $where
}).toArray();

// ✅ SAFE: Use static template data, not user input in template strings
const html = ejs.render(template, { name: sanitize(req.query.name) });

// ✅ SAFE: Use function references, not strings, for setTimeout
setTimeout(() => processTask(taskId), delay); // Never setTimeout(userString, delay)
```

#### Layer 2: Content Security Policy (Server Headers)

```typescript
// Express middleware for security headers
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],  // No 'unsafe-eval' — blocks client-side eval too
    },
  },
}));
```

#### Layer 3: Sandboxing (When Dynamic Execution Is Required)

```typescript
// ✅ Use isolated-vm instead of vm module for sandboxing
import ivm from 'isolated-vm';

async function safeSandbox(code: string, timeout: number = 1000): Promise<unknown> {
  const isolate = new ivm.Isolate({ memoryLimit: 128 }); // 128 MB limit
  const context = await isolate.createContext();

  // No access to require, process, fs, etc.
  const script = await isolate.compileScript(code);
  const result = await script.run(context, { timeout });

  isolate.dispose();
  return result;
}

// Even better: Use WebAssembly sandboxing or separate process
```

#### Layer 4: ESLint Rules (Shift Left)

```json
{
  "plugins": ["security"],
  "rules": {
    "security/detect-eval-with-expression": "error",
    "security/detect-new-buffer": "error",
    "security/detect-non-literal-fs-filename": "warn",
    "security/detect-non-literal-require": "warn",
    "security/detect-child-process": "warn",
    "security/detect-unsafe-regex": "error",
    "no-eval": "error",
    "no-implied-eval": "error",
    "no-new-func": "error"
  }
}
```

#### Layer 5: Runtime Protection

```typescript
// Freeze critical globals to prevent prototype pollution chains
Object.freeze(Object.prototype);
Object.freeze(Array.prototype);
Object.freeze(Function.prototype);

// Disable require() in user-facing code paths
// Use --experimental-permission flag (Node.js 20+)
// node --experimental-permission --allow-fs-read=/app/public server.js
```

### **F. SSJI in SSR Frameworks (Next.js, Nuxt, Angular Universal)**

```
┌───────────────────────────────────────────────────────────┐
│                    SSR SSJI Attack Surface                  │
├───────────────────────────────────────────────────────────┤
│                                                            │
│  User Request → Next.js getServerSideProps() → DB/API     │
│                       ↓                                    │
│              If user input is in:                          │
│              • dangerouslySetInnerHTML (XSS, not SSJI)    │
│              • eval() in API routes (SSJI!)               │
│              • Dynamic import() with user path (SSJI!)    │
│              • Template literal in SQL (SQLi, not SSJI)   │
│                                                            │
│  Next.js API Routes:                                      │
│  /api/compute?expr=... → if eval(expr) → SSJI            │
│                                                            │
│  Angular Universal:                                       │
│  TransferState with unsanitized data → template injection │
│                                                            │
└───────────────────────────────────────────────────────────┘
```

**Next.js specific SSJI vectors:**

```typescript
// ❌ VULNERABLE: eval in API route
// pages/api/compute.ts
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const result = eval(req.query.expression as string); // SSJI!
  res.json({ result });
}

// ❌ VULNERABLE: Dynamic require with user input
export async function getServerSideProps(context: GetServerSidePropsContext) {
  const module = require(`./data/${context.query.file}`); // Path traversal + SSJI
  return { props: { data: module.default } };
}

// ✅ SAFE: Whitelist approach
const ALLOWED_MODULES = new Map([
  ['users', () => import('./data/users')],
  ['products', () => import('./data/products')],
]);

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const loader = ALLOWED_MODULES.get(context.query.file as string);
  if (!loader) return { notFound: true };
  const module = await loader();
  return { props: { data: module.default } };
}
```

### **G. Anti-Patterns & Pitfalls**

1. **"We use TypeScript so we're safe"** — TypeScript is compile-time only. At runtime, it's JavaScript. `eval()` in TypeScript is just as dangerous as in JavaScript.

2. **"We use the `vm` module for sandboxing"** — The `vm` module is NOT a security boundary. It creates a different V8 context but the same process. Attackers can escape via `this.constructor.constructor('return process')()`.

3. **"We sanitize HTML so SSJI is covered"** — HTML sanitization (DOMPurify, sanitize-html) prevents XSS, not SSJI. Server-side injection requires server-side controls: no eval(), parameterized queries, input validation.

4. **"Our WAF blocks injection"** — WAFs catch known patterns but SSJI payloads are endlessly polymorphic. `eval(atob('base64payload'))`, Unicode escapes, and template literal tricks bypass most WAFs.

5. **"It's an internal API so it's fine"** — Internal APIs are reachable after initial compromise. SSJI in an internal Node.js service is a privilege escalation vector.

6. **Confusing SSJI with XSS** — XSS executes in the user's browser; SSJI executes on your server. The fix for XSS (CSP, output encoding) does NOT fix SSJI. You must eliminate eval-family functions.

7. **Using `JSON.stringify()` as sanitization** — `JSON.stringify(input)` does NOT prevent SSJI if the stringified result is then passed to `eval()`. The fix is to never call `eval()`, period.

────────────────────────────────────
## 3. Real-World Examples
────────────────────────────────────

### CVE Examples

| CVE | Package | Impact | CVSS |
|-----|---------|--------|------|
| CVE-2017-5941 | node-serialize | `eval()` during deserialization — RCE | 9.8 Critical |
| CVE-2021-21315 | systeminformation | Command injection via SSJI in `si.inetLatency()` | 7.8 High |
| CVE-2022-29078 | EJS ≤3.1.6 | Template injection via settings options | 9.8 Critical |
| CVE-2019-10744 | lodash `merge()` | Prototype pollution → SSJI chain | 9.1 Critical |

### Hruday's Experience Mapping

- **SAP Security (80% vuln reduction):** At SAP, the OWASP remediation effort likely included scanning Node.js BFF layers for `eval()` usage — this directly maps to SSJI prevention. The shift-left approach with ESLint security rules is exactly what a Staff engineer implements in CI/CD pipelines.

- **Oracle (Angular + Spring Boot):** While Spring Boot is Java (not vulnerable to SSJI), the Angular Universal SSR layer running on Node.js IS a potential SSJI surface — an important cross-stack awareness point.

### Scale Evolution

| Scale | SSJI Risk | Mitigation Strategy |
|-------|-----------|---------------------|
| Startup | Single Node.js server, manual code review | ESLint no-eval rule, code review |
| 100K users | Multiple services, BFF layers | SAST in CI, dependency scanning, helmet |
| 10M users | Microservices mesh, SSR farms | WAF + runtime agent (Snyk/Sqreen), sandboxing |
| 100M+ users | Multi-region, polyglot backends | Zero-trust: isolated-vm, container sandboxing, eBPF monitoring, red team exercises |

────────────────────────────────────
## 4. Interview-Oriented Answer
────────────────────────────────────

**Sample Answer (7+ years level):**

> "Server-Side JavaScript Injection is when attacker-controlled input reaches a dynamic code evaluation function — eval(), new Function(), or vm.runInContext() — on a Node.js server. Unlike XSS which runs in the victim's browser, SSJI gives the attacker full server-side code execution: access to process.env, the file system, child_process, and database connections.
>
> The attack surface includes eval() on user input, MongoDB $where clauses with string injection, server-side template injection in EJS or Pug, and even setTimeout() with string arguments. The vm module is commonly misused as a sandbox but is trivially escapable via constructor chains.
>
> At SAP, our OWASP vulnerability reduction initiative specifically targeted these patterns. We added eslint-plugin-security with no-eval rules to CI, replaced all eval() usages with JSON.parse() or whitelisted alternatives, and implemented runtime monitoring for unexpected code evaluation. For cases where dynamic execution was genuinely needed (user-defined formulas in analytics), we used isolated-vm with memory limits and timeouts.
>
> The key defense is defense-in-depth: eliminate eval-family functions (Layer 1), add SAST to CI (Layer 2), use isolated-vm for genuine sandboxing needs (Layer 3), and deploy runtime protection agents (Layer 4)."

**Likely Follow-up Questions:**

1. **"How is SSJI different from XSS?"** → XSS is client-side (browser), SSJI is server-side (Node.js). XSS steals sessions; SSJI compromises the entire server. Different fixes: CSP/encoding for XSS, eliminate eval() for SSJI.
2. **"Can TypeScript prevent SSJI?"** → No. TypeScript is compile-time only. At runtime it's JavaScript. eval() in TypeScript is equally dangerous.
3. **"How do you secure a code sandbox?"** → Use `isolated-vm` (separate V8 isolate, not just separate context), set memory limits and timeouts, block all Node.js APIs (no require, no process, no fs).
4. **"What about prototype pollution leading to SSJI?"** → Prototype pollution in lodash.merge or Object.assign can overwrite Object.prototype._constructor to inject code that later executes — it's an indirect SSJI vector. Fix: Object.create(null) for dictionaries, freeze prototypes.
5. **"How would you detect SSJI in a running application?"** → Runtime monitoring: monkey-patch eval/Function to log and alert, use Node.js --experimental-permission flags, deploy Snyk Runtime Protection or Datadog ASM.

**Comparison With Alternatives (Security Controls):**

| Control | Prevents SSJI? | Prevents XSS? | Prevents SQLi? | Effort |
|---------|---------------|---------------|-----------------|--------|
| No eval() policy | ✅ Yes | No | No | Low |
| CSP headers | No (server-side) | ✅ Yes | No | Low |
| Input validation | Partial | Partial | Partial | Medium |
| Parameterized queries | No | No | ✅ Yes | Low |
| ESLint security rules | ✅ Yes (static) | Partial | No | Low |
| WAF | Partial | Partial | Partial | High |
| isolated-vm | ✅ Yes (runtime) | No | No | Medium |
| Runtime agents (Snyk) | ✅ Yes | ✅ Yes | ✅ Yes | High |

────────────────────────────────────
## 5. Code Example (TypeScript)
────────────────────────────────────

### Safe Expression Evaluator (Replacing eval())

```typescript
// ─── Types ────────────────────────────────────────
type Operator = '+' | '-' | '*' | '/' | '%' | '**';
type TokenType = 'number' | 'operator' | 'paren_open' | 'paren_close';

interface Token {
  type: TokenType;
  value: string;
}

interface ASTNode {
  type: 'BinaryExpression' | 'NumberLiteral';
  operator?: Operator;
  left?: ASTNode;
  right?: ASTNode;
  value?: number;
}

// ─── Safe Math Expression Parser ──────────────────
// Replaces eval() for user-provided math expressions
class SafeExpressionEvaluator {
  private static readonly ALLOWED_CHARS = /^[0-9+\-*/%().^ \t]+$/;
  private static readonly MAX_LENGTH = 1000;

  static evaluate(expression: string): number {
    // Layer 1: Input validation
    if (expression.length > this.MAX_LENGTH) {
      throw new Error('Expression exceeds maximum length');
    }
    if (!this.ALLOWED_CHARS.test(expression)) {
      throw new Error('Expression contains invalid characters');
    }

    // Layer 2: Tokenize
    const tokens = this.tokenize(expression);

    // Layer 3: Parse to AST
    const ast = this.parse(tokens);

    // Layer 4: Evaluate AST (no eval!)
    return this.evaluateAST(ast);
  }

  private static tokenize(expr: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    const input = expr.replace(/\s+/g, '');

    while (i < input.length) {
      const char = input[i];

      if (/[0-9.]/.test(char)) {
        let num = '';
        while (i < input.length && /[0-9.]/.test(input[i])) {
          num += input[i++];
        }
        tokens.push({ type: 'number', value: num });
        continue;
      }

      if ('+-*/%'.includes(char)) {
        tokens.push({ type: 'operator', value: char });
      } else if (char === '(') {
        tokens.push({ type: 'paren_open', value: '(' });
      } else if (char === ')') {
        tokens.push({ type: 'paren_close', value: ')' });
      } else if (char === '^') {
        tokens.push({ type: 'operator', value: '**' });
      }
      i++;
    }
    return tokens;
  }

  private static parse(tokens: Token[]): ASTNode {
    let pos = 0;

    function parseExpression(): ASTNode {
      let left = parseTerm();
      while (pos < tokens.length && (tokens[pos].value === '+' || tokens[pos].value === '-')) {
        const op = tokens[pos++].value as Operator;
        const right = parseTerm();
        left = { type: 'BinaryExpression', operator: op, left, right };
      }
      return left;
    }

    function parseTerm(): ASTNode {
      let left = parseFactor();
      while (pos < tokens.length && (tokens[pos].value === '*' || tokens[pos].value === '/' || tokens[pos].value === '%')) {
        const op = tokens[pos++].value as Operator;
        const right = parseFactor();
        left = { type: 'BinaryExpression', operator: op, left, right };
      }
      return left;
    }

    function parseFactor(): ASTNode {
      if (tokens[pos].type === 'paren_open') {
        pos++; // skip (
        const node = parseExpression();
        pos++; // skip )
        return node;
      }
      const value = parseFloat(tokens[pos++].value);
      return { type: 'NumberLiteral', value };
    }

    return parseExpression();
  }

  private static evaluateAST(node: ASTNode): number {
    if (node.type === 'NumberLiteral') {
      return node.value!;
    }

    const left = this.evaluateAST(node.left!);
    const right = this.evaluateAST(node.right!);

    switch (node.operator) {
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/':
        if (right === 0) throw new Error('Division by zero');
        return left / right;
      case '%': return left % right;
      case '**': return Math.pow(left, right);
      default: throw new Error(`Unknown operator: ${node.operator}`);
    }
  }
}

// ─── Express Route (Safe) ─────────────────────────
import { Router, Request, Response } from 'express';

const router = Router();

router.get('/calculate', (req: Request, res: Response) => {
  try {
    const expr = req.query.expr as string;
    if (!expr) {
      res.status(400).json({ error: 'Expression required' });
      return;
    }
    const result = SafeExpressionEvaluator.evaluate(expr);
    res.json({ expression: expr, result });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Usage: GET /calculate?expr=2*(3+4)  → { expression: "2*(3+4)", result: 14 }
// Attack: GET /calculate?expr=process.exit() → "Expression contains invalid characters"
```

### isolated-vm Sandbox for Complex Cases

```typescript
import ivm from 'isolated-vm';

interface SandboxResult {
  success: boolean;
  result?: unknown;
  error?: string;
  executionTimeMs: number;
}

async function executeSandboxed(
  code: string,
  context: Record<string, unknown> = {},
  options = { timeout: 1000, memoryLimitMB: 64 }
): Promise<SandboxResult> {
  const startTime = performance.now();
  const isolate = new ivm.Isolate({ memoryLimit: options.memoryLimitMB });

  try {
    const ivmContext = await isolate.createContext();
    const jail = ivmContext.global;

    // Expose allowed globals (read-only copies)
    for (const [key, value] of Object.entries(context)) {
      await jail.set(key, new ivm.ExternalCopy(value).copyInto());
    }

    // NO access to: require, process, fs, child_process, fetch, etc.
    const script = await isolate.compileScript(code);
    const result = await script.run(ivmContext, { timeout: options.timeout });

    return {
      success: true,
      result,
      executionTimeMs: performance.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
      executionTimeMs: performance.now() - startTime,
    };
  } finally {
    isolate.dispose();
  }
}

// Usage:
// await executeSandboxed('x + y', { x: 10, y: 20 }) → { success: true, result: 30 }
// await executeSandboxed('process.exit()') → { success: false, error: "process is not defined" }
// await executeSandboxed('while(true){}') → { success: false, error: "Script execution timed out" }
```

────────────────────────────────────
## 6. Memory Aid (Quick Recall)
────────────────────────────────────

**The SSJI mantra:** "If user input touches eval(), Function(), vm, setTimeout(string), or $where — it's game over."

**Decision framework: Do I need eval()?**
- Math expressions → Build a parser (see code above)
- JSON parsing → `JSON.parse()`
- Dynamic module loading → Whitelist with Map
- User-defined logic → `isolated-vm` with memory limits
- Template rendering → Parameterized templates, never interpolate user input into template source

**If you go blank:** "SSJI is code injection on the server. XSS runs in the browser and steals sessions; SSJI runs on Node.js and steals everything — env vars, file system, database. The fix is: never eval user input, use isolated-vm for sandboxing, and add eslint-plugin-security to CI."

────────────────────────────────────
## 7. Why & How Summary
────────────────────────────────────

**Why it matters:**
→ SSJI is the most critical vulnerability class for Node.js applications. A single eval() on user input gives attackers full server access — all user data, API keys, and lateral movement into internal services. At FAANG scale, this means millions of compromised accounts.

**How it works:**
→ Attacker sends crafted input (query param, body field, header) that reaches a dynamic code evaluation function (eval, Function, vm) on the Node.js server. The malicious code executes with the server's full permissions — process.env, fs, child_process — bypassing all client-side security controls.

**Company relevance:**
→ **Google:** Node.js is used in Cloud Functions and internal BFFs. Google's security team (Project Zero) actively researches SSJI in npm ecosystem. L5+ security interviews test knowledge of server-side injection vs. client-side XSS.
→ **Microsoft:** Azure Functions on Node.js and VS Code Server (code-server) are SSJI surfaces. Microsoft's SDL requires SAST scanning for eval() patterns.
→ **SAP (Hruday's current):** The 80% security vulnerability reduction at SAP directly maps to SSJI prevention — removing eval() from BFF layers, adding ESLint security rules to CI, and implementing runtime protection.
