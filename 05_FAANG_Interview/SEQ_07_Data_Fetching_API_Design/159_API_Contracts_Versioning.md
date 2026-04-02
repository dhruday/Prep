# 159. API Contracts & Versioning
**Phase:** Data Fetching & API Design | **Sequence:** SEQ 07 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

An API contract is a formal specification of how a frontend and backend communicate — the request shape, response shape, error codes, and authentication requirements. Contracts enable parallel development (frontend and backend teams can work simultaneously against the agreed spec), prevent integration bugs, and enable consumer-driven testing. The main contract formats are OpenAPI (REST), GraphQL Schema (SDL), and tRPC AppRouter (TypeScript-native). API versioning handles the reality that contracts evolve — adding new fields is non-breaking, removing or renaming fields breaks existing clients. The standard versioning strategies are URL path versioning (`/v2/products`), request headers (`API-Version: 2024-01-01`), and Accept header versioning (`Accept: application/vnd.api+json;version=2`). The principle I follow is Postel's Law: be conservative in what you send, generous in what you accept — this enables gradual deprecation and backward compatibility.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### API Contract Formats

```typescript
// ===== 1. OpenAPI 3.1 (REST) =====
// Machine-readable REST API spec — generates docs, mocks, and typed clients

// openapi.yaml
/*
openapi: 3.1.0
info:
  title: Products API
  version: 2.0.0
paths:
  /v2/products/{id}:
    get:
      operationId: getProduct
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "200":
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Product"
        "404":
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/NotFoundError"
components:
  schemas:
    Product:
      type: object
      required: [id, name, price, currency]
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        price:
          type: number
          format: float
        currency:
          type: string
          enum: [USD, EUR, GBP]
        description:
          type: string  # Optional field — adding this is non-breaking
*/

// Generate TypeScript client from OpenAPI spec:
// npx openapi-typescript openapi.yaml --output src/api/types.ts
// OR: npx @hey-api/openapi-ts -i openapi.yaml -o src/api/client --client fetch

// ===== 2. GraphQL SDL =====
// GraphQL schema is itself the contract — shared between client and server

/*
type Product {
  id: ID!
  name: String!
  price: Float!
  currency: Currency!
  description: String   # Optional — adding is non-breaking
}

enum Currency {
  USD
  EUR
  GBP
}

type Query {
  product(id: ID!): Product
  products(filter: ProductFilter, first: Int, after: String): ProductConnection!
}

type Mutation {
  updateProduct(id: ID!, input: UpdateProductInput!): Product!
}
*/

// ===== 3. tRPC (TypeScript monorepo) =====
// The TypeScript type system IS the contract — no separate schema language

// server/router/product.ts
export const productRouter = router({
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(ProductSchema)    // Validated output schema
    .query(({ input }) => db.product.findUniqueOrThrow({ where: { id: input.id } })),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid(), data: UpdateProductSchema }))
    .output(ProductSchema)
    .mutation(({ input, ctx }) => {
      ensureOwnership(ctx.user, input.id);
      return db.product.update({ where: { id: input.id }, data: input.data });
    }),
});

export type AppRouter = typeof appRouter;
// Client imports AppRouter (type only) → full TypeScript inference
```

### Breaking vs Non-Breaking Changes

```typescript
// NON-BREAKING changes (safe to deploy without versioning):
// ✅ Adding new optional fields to response
// ✅ Adding new endpoints
// ✅ Adding new optional request parameters
// ✅ Loosening constraints (max length 50 → 100, required → optional)
// ✅ Adding new enum values (if clients use exhaustive switch, this can break — see below)

// BREAKING changes (require versioning or deprecation period):
// ❌ Removing fields from response
// ❌ Renaming fields (id → productId)
// ❌ Changing field types (price: string → price: number)
// ❌ Making optional fields required
// ❌ Changing URL paths
// ❌ Removing endpoints
// ❌ Changing authentication requirements

// SUBTLE BREAKING: adding enum values
// If the client has an exhaustive switch and treats unexpected values as errors:
type OldCurrency = 'USD' | 'EUR';  // Client-side type
// Server adds 'AUD' → client's exhaustive switch breaks on 'AUD'
// Solution: clients should always handle unknown enum values gracefully

// Client defensive pattern for enum unknown values:
function formatCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$', EUR: '€', GBP: '£',
  };
  return symbols[currency] ?? currency;  // ← Fallback: show as-is; never throw
}
```

### URL Path Versioning (Most Common)

```typescript
// URL path versioning: /v1/products → /v2/products
// Advantages: visible in logs, easy to test, cacheable by CDN at different paths
// Disadvantages: stateful clients (mobile apps) may be stuck on /v1 for months

// API gateway routing (Next.js):
// /v1/** → legacy handler
// /v2/** → current handler

// Version negotiation middleware:
function versionMiddleware(req: NextRequest) {
  const url = req.nextUrl;

  if (url.pathname.startsWith('/api/v1/')) {
    url.pathname = url.pathname.replace('/api/v1/', '/api/v1-handler/');
    return NextResponse.rewrite(url);
  }
  if (url.pathname.startsWith('/api/v2/')) {
    return NextResponse.next();
  }

  // Default to latest version
  return NextResponse.next();
}
```

### Header-Based Versioning

```typescript
// API-Version header: cleaner URLs, harder to test manually, less cacheable
// Used by Stripe: Stripe-Version: 2024-06-20
// Used by GitHub: X-GitHub-Api-Version: 2022-11-28

// Server: read version from header and route accordingly
async function handler(request: NextRequest) {
  const apiVersion = request.headers.get('API-Version') ?? 'latest';

  const supportedVersions = ['2024-01-01', '2023-06-01'] as const;
  type SupportedVersion = typeof supportedVersions[number];

  if (!supportedVersions.includes(apiVersion as SupportedVersion)) {
    return NextResponse.json(
      { error: `Unsupported API version: ${apiVersion}. Supported: ${supportedVersions.join(', ')}` },
      { status: 400 }
    );
  }

  if (apiVersion === '2024-01-01') {
    return await handleV2(request);
  }
  return await handleV1(request);
}

// Client: always send version header
class HttpClient {
  private readonly apiVersion = '2024-01-01';

  async get<T>(url: string, signal?: AbortSignal): Promise<T> {
    const response = await fetch(url, {
      signal,
      headers: {
        'API-Version': this.apiVersion,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new ApiError(response.status, response.statusText);
    return response.json();
  }
}
```

### Consumer-Driven Contract Testing

```typescript
// Pact — consumer-driven contract testing
// Consumer defines the contract (what it expects from the provider)
// Provider verifies it can satisfy the consumer's expectations
// This prevents "contract drift" where changes to the provider break consumers silently

// Consumer test (frontend — Jest + @pact-foundation/pact):
describe('Products API consumer', () => {
  const provider = new Pact({
    consumer: 'FrontendApp',
    provider: 'ProductsAPI',
  });

  beforeAll(() => provider.setup());
  afterAll(() => provider.finalize());

  it('returns a product by id', async () => {
    await provider.addInteraction({
      state: 'product 123 exists',
      uponReceiving: 'a request for product 123',
      withRequest: {
        method: 'GET',
        path: '/v2/products/123',
        headers: { 'API-Version': '2024-01-01' },
      },
      willRespondWith: {
        status: 200,
        body: {
          id: '123',
          name: like('MacBook Pro'),           // Any string
          price: like(1299.99),                 // Any number
          currency: term({ generate: 'USD', matcher: 'USD|EUR|GBP' }),
        },
      },
    });

    const product = await apiService.getProductById('123');
    expect(product.id).toBe('123');
  });
});

// Provider verification (backend):
// npm run pact:verify → verifies all consumer contracts against the current provider implementation
// Run in CI before deploying provider changes
```

### Deprecation Strategy

```typescript
// Gradual deprecation: run v1 and v2 in parallel with deprecation warnings

// Option 1: Deprecation header (non-standard but widely used)
// Server adds to v1 responses:
response.headers.set('Deprecation', 'true');
response.headers.set('Sunset', 'Sat, 31 Dec 2024 23:59:59 GMT');  // RFC 8594
response.headers.set('Link', '<https://api.example.com/v2/products>; rel="successor-version"');

// Client reads deprecation header and logs warning:
class HttpClient {
  async get<T>(url: string, signal?: AbortSignal): Promise<T> {
    const response = await fetch(url, { signal });
    if (response.headers.get('Deprecation')) {
      const sunset = response.headers.get('Sunset');
      console.warn(
        `[API] Endpoint ${url} is deprecated.${sunset ? ` Sunset: ${sunset}` : ''}`
      );
    }
    return response.json();
  }
}

// Option 2: Versioned SDK — publish new package version with v2 client
// @company/api-client@1.x → uses v1 API
// @company/api-client@2.x → uses v2 API
// Teams migrate at their own pace; v1 SDK maintained until sunset date
```

### ⚠️ Anti-Patterns

- **Versioning at field level instead of API level** — `field_v2` or `new_price` alongside `price` in the same response; clutters the response indefinitely; version the API at route level

- **Semantic versioning for APIs without deprecation windows** — bumping to v2 and switching off v1 the same day; mobile app users on v1 (often can't force update) have a broken app; always run versions in parallel for a defined deprecation window (minimum 3 months for mobile clients)

- **Not documenting the contract** — "the frontend will just look at what the network tab returns"; no machine-readable spec; every change is implicit; no generated types; no contract tests; teams discover breakages in production

- **GraphQL: exposing every field from the ORM** — the database schema becomes the API contract by accident; removing a DB column breaks the API; define explicit GQL types that map to domain concepts, not table columns

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the SAP UI5 components consumed a custom JSON API with no documented contract. When the backend team refactored field names (`purchaseOrderNumber` → `poNumber`), 23 frontend components broke in production simultaneously because there were no contract tests or TypeScript types generated from a spec. Post-incident: introduced OpenAPI 3.1 spec as the source of truth, `openapi-typescript` to generate types on pre-commit hook, and a Pact consumer test for the 5 most critical endpoints. Zero field-rename breakages since.

**At FAANG scale:**
- **Microsoft:** Azure REST API — strict versioning policy: every endpoint must accept a `api-version` query param; old versions supported for minimum 3 years after deprecation announcement; `azure-sdk-for-js` generates typed clients from all Azure's OpenAPI specs
- **Adobe:** Creative Cloud APIs — GraphQL + persisted queries; schema-versioned with `@deprecated` annotations on fields; deprecated fields remain for 12 months post-annotation with usage analytics to identify which consumers still use them
- **Salesforce:** Salesforce API — versioned by year/season (`/services/data/v60.0/sobjects/`); maintains 3 years of backward compatibility; each customer org has a `minimumApiVersion` setting that prevents accidentally consuming too-new API features
- **Cisco:** NX-OS RESTCONF — RFC 8040 compliance with strict versioning; Yang model revisions tracked; consumer contract tests verified by Cisco TAC before major OS releases

---

## 💬 4. Interview Execution

### Sample Answer

> "An API contract is the formal agreement between frontend and backend on request/response shapes, authentication, and error codes. The format depends on the architecture: OpenAPI for REST, GraphQL SDL for GraphQL, tRPC's AppRouter type for TypeScript monorepos.
>
> The practical value of a contract is what it enables: parallel development (frontend can mock against the spec before the backend is built), type generation (openapi-typescript turns the spec into TypeScript types automatically — no manual interface writing), and consumer-driven contract tests (Pact verifies the backend can satisfy what the frontend expects, running in CI against every backend change).
>
> For versioning, I distinguish breaking from non-breaking changes. Adding optional response fields is non-breaking — existing clients ignore unknown fields using tolerant reader pattern. Removing fields, renaming them, or changing types is breaking and requires a versioning strategy. URL path versioning (/v2/) is the most common — visible, easy to test, CDN-cacheable. Header versioning is cleaner but harder to test interactively.
>
> The most important operational principle is the deprecation window: never remove v1 the day you ship v2. Mobile clients can't force users to update immediately. Run versions in parallel with a Deprecation header, give a public sunset date (at least 3 months, 6+ for mobile), and monitor which clients are still hitting the deprecated version."

### Likely Follow-up Questions
1. "What is tolerant reader pattern?" → The client ignores response fields it doesn't recognize rather than throwing an error; `const { id, name } = apiResponse` (destructuring only needed fields) vs `if (Object.keys(apiResponse).includes('unexpectedField')) throw Error()`. Tolerant reader enables non-breaking additions: the server can add `estimatedDelivery` to the order response — old clients ignore it, new clients use it
2. "What is consumer-driven contract testing vs provider-side testing?" → Provider-side: backend team writes tests that say "this endpoint returns this shape"; doesn't capture what consumers actually use. Consumer-driven: frontend defines what it expects from each endpoint it consumes; provider verifies it can satisfy all consumer contracts; if the provider changes a field that a consumer uses, the consumer's contract test fails in CI
3. "How do you handle multiple API versions in TanStack Query?" → Version is typically embedded in the `queryKey` implicitly via the URL (`/v2/products/123`) which is part of the endpoint the API service function calls; if versions coexist in the same app (migration in progress), include version in the queryKey explicitly: `['products', 'v2', id]` vs `['products', 'v1', id]` to prevent cache conflicts

---

## 💻 5. Code Example (TypeScript)

```typescript
// OpenAPI spec → TypeScript type workflow
// types generated by openapi-typescript from openapi.yaml

// Auto-generated types (never edit manually):
// src/api/generated/types.ts
export interface ProductV2 {
  id: string;
  name: string;
  price: number;
  currency: 'USD' | 'EUR' | 'GBP';
  description?: string;  // Optional field — non-breaking addition
}

// Typed API service using generated types:
export const productsApiV2 = {
  getById: async (id: string, signal?: AbortSignal): Promise<ProductV2> => {
    const response = await fetch(`/api/v2/products/${encodeURIComponent(id)}`, {
      signal,
      headers: { 'API-Version': '2024-01-01' },
    });
    if (!response.ok) throw new ApiError(response.status, response.statusText);
    return response.json() as Promise<ProductV2>;  // Type assertion: generated type matches spec
  },
};

// Contract-breaking change detection in TypeScript:
// When backend removes a field, the generated type changes:
// ❌ currency removed from spec → generated type no longer has currency
// → TypeScript compile error in apiService where currency is read
// → Breaking change caught at compile time, not runtime
```

---

## 🧠 6. Memory Aid

**SAND contract types:**
- **S**chema (OpenAPI for REST)
- **A**ppRouter (tRPC TypeScript-native)
- **N**ative SDL (GraphQL schema)
- **D**ocumented AsyncAPI (event-driven)

**Breaking change rule — FORD:**
- **F**ields removed = breaking
- **O**ptional fields added = safe
- **R**ename = breaking
- **D**ata type changed = breaking

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Without a machine-readable contract, every backend change is a potential silent runtime breakage — the developer who renames `purchaseOrderNumber` to `poNumber` has no mechanism to know which of 23 frontend files reads that field; with OpenAPI + generated types, the rename causes TypeScript compile errors in all affected files immediately
→ Consumer-driven contract tests (Pact) solve the dual-blindness problem: the backend team doesn't know which consumers use which fields, and the frontend team doesn't know the backend is changing; Pact creates a direct specification link between what the consumer expects and what the provider can deliver, verified in CI
→ Deprecation windows are a customer contractual obligation, not just good practice — enterprise clients (SAP, Cisco customers) build integrations against specific API versions; abrupt version removal breaks their production systems and creates support liability; Stripe's public commitment to support API versions from the customer's first use date indefinitely is a competitive advantage

**How it works (2 sentences):**
OpenAPI specification (YAML/JSON) describes every endpoint, parameter, request body schema, and response schema as a machine-readable document — tools like `openapi-typescript` parse this document and generate TypeScript interface definitions that match exactly what the API sends and receives, so any contract change in the spec propagates to a TypeScript type change which triggers compile errors in all callers without requiring any manual auditing.
Consumer-driven contract testing (Pact) works in two phases: in the consumer test, the frontend defines interactions (given this request, expect this response shape) and publishes a pact file to a broker; in provider verification, the backend CI pipeline downloads all pact files from the broker and replays each interaction against the running provider, failing if the provider's actual response doesn't match the consumer's contract — this gives backends a "who depends on this field" registry without requiring manual cross-team communication.

---
✅ Topic 159/486 complete → Continuing to Topic 160: Request Deduplication
