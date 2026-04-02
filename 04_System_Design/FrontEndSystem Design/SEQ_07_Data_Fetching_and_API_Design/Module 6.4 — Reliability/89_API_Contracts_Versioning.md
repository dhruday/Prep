# 89. API Contracts & Versioning

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

**API contracts** define the formal agreement between frontend and backend about what data is exchanged — field names, types, required/optional, and error shapes. **API versioning** is the strategy for evolving these contracts without breaking existing clients. In large organizations, frontend and backend evolve independently, and a backend team changing a response field from `user_name` to `userName` can silently break production UIs. The architectural discipline of contract management — using OpenAPI specs, TypeScript SDKs, consumer-driven contract testing, or schema registries — prevents this class of integration bug. At senior level, the question isn't just how versioning works, but how to design an API evolution strategy that allows backends to innovate without holding clients hostage to old behavior.

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### API Contract Mechanisms

**Option 1: OpenAPI (Swagger) Specification:**
```yaml
# openapi.yaml — the contract
openapi: 3.0.0
info:
  title: Products API
  version: v2.1.0

paths:
  /products/{id}:
    get:
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Product'
        '404':
          $ref: '#/components/responses/NotFound'

components:
  schemas:
    Product:
      type: object
      required: [id, name, price]  # Frontend can rely on these
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
          maxLength: 100
        price:
          type: number
          minimum: 0
        description:
          type: string  # Optional — frontend must handle undefined
```

**Frontend TypeScript generation from OpenAPI:**
```bash
# Generate TypeScript client from OpenAPI spec at build time
npx openapi-typescript ./api/openapi.yaml --output ./src/api/types.ts

# Or use orval for React Query hooks + types
npx orval --config orval.config.ts
```

```typescript
// Generated types — CI fails if backend changes break these
import type { Product, CreateProductDto } from './api/types';

// If backend removes 'price' from Product:
// → TypeScript compilation fails
// → CI catches it before deployment
// → Frontend team is immediately notified

function formatPrice(product: Product) {
  return product.price.toFixed(2); // TypeScript error if price removed
}
```

**Option 2: Zod Schemas as Contract Validators:**
```typescript
// Runtime validation at the API boundary
// Catches contract violations in production too (not just at build time)

const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  price: z.number().nonnegative(),
  // Use .optional() for fields that may not exist in older API versions
  description: z.string().optional(),
  // Use .transform() for field renames backwards compatibility
  imageUrl: z.string().optional(),
});

type Product = z.infer<typeof ProductSchema>;

async function fetchProduct(id: string): Promise<Product> {
  const response = await fetch(`/api/products/${id}`);
  const raw = await response.json();
  
  // Validate against schema — throws ZodError if contract violated
  const result = ProductSchema.safeParse(raw);
  
  if (!result.success) {
    // Log contract violation to monitoring (Sentry, Datadog)
    reportContractViolation({
      endpoint: `/api/products/${id}`,
      errors: result.error.flatten(),
      rawResponse: raw,
    });
    // Return partial data or throw — depends on severity
    throw new Error('API contract violation');
  }
  
  return result.data;
}
```

### Versioning Strategies

**Strategy 1: URL Versioning (Most Common)**
```
GET /api/v1/products
GET /api/v2/products

Pros: Explicit, caching-friendly, easy to route
Cons: Version leaks into URLs everywhere; old versions must be maintained

Usage: GitHub API (/v3, /v4), Stripe (/v1), Twitter API
```

**Strategy 2: Header-Based Versioning**
```http
GET /api/products
Accept: application/vnd.myapi.v2+json
-- or --
API-Version: 2024-01-01
```
```typescript
// Frontend sends version in header
const response = await fetch('/api/products', {
  headers: {
    'API-Version': '2024-01-01',  // Pin to specific date-based version
    'Accept': 'application/vnd.myapi.v2+json',
  },
});
```
```
Pros: Clean URLs, versioning is transport detail
Cons: Not cacheable at CDN without Vary header; less visible
Usage: Stripe uses date-based (2023-10-16), GitHub GraphQL
```

**Strategy 3: Query Parameter Versioning**
```
GET /api/products?version=2
```
```
Pros: Simple, explicit in requests
Cons: Easy to forget; looks messy
Usage: Some internal APIs; generally not recommended for public APIs
```

**Strategy 4: Content Negotiation (API Evolution Best Practice)**
```typescript
// Rather than breaking versions, evolve the schema non-breaking:

// ✅ Additive changes (NEVER break clients):
// - Add optional fields
// - Add new endpoints
// - Add new enum values
// - Widen types (string|null → string)

// ❌ Breaking changes (REQUIRE versioning):
// - Remove fields
// - Rename fields
// - Change field types (number → string)
// - Change required/optional status
// - Remove enum values
// - Change error response shape
```

### Backwards Compatibility Patterns

**Field Aliasing for Renames:**
```typescript
// Backend wants to rename 'UserName' → 'userName' (camelCase standardization)
// Approach: Return both during transition period

// Backend response (v1 being deprecated, v2 being promoted):
{
  "UserName": "john_doe",       // Old field — v1 clients read this
  "userName": "john_doe",       // New field — v2 clients read this
}

// Frontend transformation layer:
function normalizeUser(raw: unknown): User {
  const obj = raw as Record<string, unknown>;
  return {
    userName: (obj.userName ?? obj.UserName) as string, // Accept both
    // ... other fields
  };
}
```

**Deprecation Signaling:**
```typescript
// Backend adds deprecation header on old fields/endpoints
// Frontend logs to monitoring for tracking migration progress

async function fetchLegacyEndpoint(id: string) {
  const response = await fetch(`/api/v1/products/${id}`);
  
  // Watch for deprecation headers
  const deprecationHeader = response.headers.get('Deprecation');
  const sunsetHeader = response.headers.get('Sunset');
  
  if (deprecationHeader) {
    console.warn(`API Deprecation: /api/v1/products — Sunset: ${sunsetHeader}`);
    // Log to monitoring dashboard to track usage
    analytics.track('deprecated_api_call', {
      endpoint: '/api/v1/products',
      sunset: sunsetHeader,
    });
  }
  
  return response.json();
}
```

### Consumer-Driven Contract Testing (Pact)

```typescript
// Frontend defines what it expects; Pact generates test for backend to verify

// Frontend contract (Pact consumer test)
const productContract = {
  state: 'product 123 exists',
  uponReceiving: 'a request for product 123',
  withRequest: {
    method: 'GET',
    path: '/api/products/123',
  },
  willRespondWith: {
    status: 200,
    body: {
      id: like('123'),                        // String, any value
      name: like('Product Name'),             // String type required
      price: like(49.99),                     // Number type required
      // Don't specify optional fields the frontend doesn't use
    },
  },
};

// This generates a Pact file → backend runs against it
// If backend violates the contract → test fails → PR blocked
// Approach used at: Netflix, Atlassian, many enterprise teams
```

### API Versioning in the Frontend Architecture

```typescript
// API client with version configuration
class ApiClient {
  constructor(
    private baseUrl: string,
    private version: 'v1' | 'v2' = 'v2'
  ) {}
  
  private url(endpoint: string): string {
    return `${this.baseUrl}/${this.version}${endpoint}`;
  }
  
  // Allow per-request version override during migration
  async request<T>(
    endpoint: string,
    options: RequestInit & { version?: 'v1' | 'v2' } = {}
  ): Promise<T> {
    const { version = this.version, ...fetchOptions } = options;
    const url = `${this.baseUrl}/${version}${endpoint}`;
    // ...
  }
}

// Feature flag controlled migration
const productApi = new ApiClient(
  '/api',
  featureFlags.useV2ProductsApi ? 'v2' : 'v1'
);
```

### Anti-Patterns & Pitfalls

**1. Parsing `any` from API responses:**
```typescript
// ❌ Completely bypass TypeScript contract enforcement
const data: any = await fetch('/api/products').then(r => r.json());
data.prlce; // Typo silently accepted — runtime bug

// ✅ Type the response
const data = await apiFetch<Product[]>('/api/products');
data[0].prlce; // TypeScript error immediately
```

**2. Tight coupling to specific API version:**
```typescript
// ❌ v1 endpoint hardcoded everywhere — migration is a massive refactor
fetch('/api/v1/products/...')  // Scattered through codebase

// ✅ Version configured once in API client
const apiClient = new ApiClient('/api', 'v1');
// When migrating: change 'v1' to 'v2' in one place
```

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**Stripe API Versioning:**
- Date-based versions (2023-10-16 format)
- Account pinned to a version — never gets unexpected breaking changes
- Changelog documents every version's changes
- Frontend systems pin their SDK to a specific Stripe version

**GitHub API:**
- v3 (REST): URL versioning
- v4 (GraphQL): Schema evolution without versioning (additive only)
- Deprecation warnings in response headers 6+ months before removal

**SAP OData (Your Experience):**
- OData v2, v4 — both active simultaneously
- V2 services maintained for Fiori apps; v4 for new developments
- `$metadata` endpoint describes contract at runtime
- Breaking changes require new service name (namespace-based versioning)

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "API versioning solves the problem of independently-evolving frontend and backend teams — the backend can't remove a field without knowing every client that depends on it.
>
> My preferred approach is a TypeScript SDK generated from the OpenAPI spec. At build time, the codegen runs and TypeScript compilation enforces the contract. When the backend team changes a response shape, the CI pipeline fails on the frontend repo's next build — we catch the mismatch before any deployment.
>
> For versioning strategy, I prefer URL versioning for public APIs because it's explicit, CDN-cacheable, and easy to route at the load balancer. For internal APIs where frontend and backend are in the same repo or organization, I prefer API evolution without versioning — the backend only makes additive changes (new optional fields), and breaking changes go through a deprecation cycle with a specific sunset date.
>
> The highest-value practice I've seen is Pact consumer-driven contract testing. The frontend writes tests describing its expectations; Pact converts them to a contract file; the backend's CI runs against the contract. If the backend violates what the frontend expects, it fails before the PR merges — not in production."

**Likely Follow-up Questions:**
- "What if the frontend is on v1 and the backend removes v1 support?" → Have sunset dates; notify clients in advance; use header deprecation warnings
- "How do you handle gradual migration from v1 to v2?" → Feature flags control which version the API client uses; canary deploy to 5% of traffic on v2 first
- "What's additive vs breaking change?" → Additive: new optional fields, new endpoints, new enum options. Breaking: remove/rename fields, change types, remove enum options, change required fields.

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE (see deep-dive above)

OpenAPI generation, Zod runtime validation, versioned client, backwards-compatible field aliasing all covered.

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**CODA Model:**
- **C**ontract — OpenAPI spec or shared Zod schemas define the agreement
- **O**nly additive — non-breaking changes don't need versioning
- **D**eprecation cycle — signal, sunset header, then remove
- **A**utomation — codegen + Pact tests enforce contract at CI time

If you blank: *"API contracts are enforced by generating TypeScript types from OpenAPI specs. Breaking changes require versioning; additive changes (new optional fields) don't."*

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ **UX**: A renamed field causes silent data display failures — contracts catch before production  
→ **Performance**: Running old and new versions simultaneously costs server resources  
→ **Business**: A broken checkout caused by unexpected API change = direct revenue loss

**How it works:**
→ OpenAPI specs define field names, types, and required status as the authoritative contract. TypeScript codegen converts them to client types; CI compilation enforces the contract at build time. URL or header versioning routes requests to different server implementations. Consumer-driven tests (Pact) let the frontend declare its expectations formally, and the backend verifies them in CI before merging changes.

**Company relevance:**
→ **Microsoft**: Azure API versioning uses date-based headers; Azure SDK is generated from OpenAPI specs  
→ **Adobe**: Creative Cloud APIs follow strict additive-only evolution policy  
→ **Salesforce**: Salesforce API has maintained backwards compatibility since API version 1.0 in 2004 — they're the gold standard for API contract discipline  
→ **Cisco**: Network device APIs require extreme contract stability — firmware updates happen rarely, clients must work across multi-year API versions
