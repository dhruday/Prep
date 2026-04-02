# 149. REST API Consumption Patterns
**Phase:** Data Fetching & API Design | **Sequence:** SEQ 07 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

REST API consumption patterns are the architectural decisions around how a frontend client calls, manages, and presents data from RESTful HTTP APIs. I structure API consumption in three layers: a raw fetch/axios layer with request/response interceptors for auth and error normalization; a domain service layer that owns the URL construction, method, and typed request/response contracts; and a data layer (TanStack Query) that adds caching, background refresh, and loading/error state. At SAP I refactored from raw `fetch` scattered across 40 components to this 3-layer model — duplicate requests dropped from 12 per page load to 3, and all auth token injection became centralized in one interceptor instead of repeated in 40 places.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### The Three-Layer Model

```typescript
// Layer 1: HTTP Client — raw transport, interceptors, auth, error normalization
// Layer 2: API Service — URL construction, typed contracts, endpoint definitions
// Layer 3: Data Layer — TanStack Query hooks, caching, loading/error state

// Layer 1: HTTP Client
// api/client.ts
class HttpClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor(config: { baseURL: string }) {
    this.baseURL = config.baseURL;
    this.defaultHeaders = { 'Content-Type': 'application/json' };
  }

  private async request<T>(
    method: string,
    path: string,
    options?: { body?: unknown; headers?: Record<string, string>; signal?: AbortSignal }
  ): Promise<T> {
    const token = authStore.getState().token;
    const headers = {
      ...this.defaultHeaders,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    };

    const response = await fetch(`${this.baseURL}${path}`, {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
      signal: options?.signal,
    });

    // Centralized error normalization — all 4xx/5xx become thrown ApiError
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new ApiError(response.status, errorBody.message ?? response.statusText, errorBody);
    }

    // 204 No Content
    if (response.status === 204) return undefined as T;

    return response.json() as Promise<T>;
  }

  get<T>(path: string, signal?: AbortSignal) {
    return this.request<T>('GET', path, { signal });
  }
  post<T>(path: string, body: unknown) {
    return this.request<T>('POST', path, { body });
  }
  put<T>(path: string, body: unknown) {
    return this.request<T>('PUT', path, { body });
  }
  patch<T>(path: string, body: unknown) {
    return this.request<T>('PATCH', path, { body });
  }
  delete<T>(path: string) {
    return this.request<T>('DELETE', path);
  }
}

export const apiClient = new HttpClient({ baseURL: process.env.NEXT_PUBLIC_API_URL! });

// Custom error class for structured error handling
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
```

### Layer 2: API Service (Domain Layer)

```typescript
// api/products.api.ts — owns the URL shape, request/response types
import { apiClient } from './client';

interface ProductsQuery {
  category?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sort?: 'name:asc' | 'name:desc' | 'price:asc' | 'price:desc';
}

interface ProductsResponse {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const productsApi = {
  list: (query: ProductsQuery, signal?: AbortSignal) => {
    const params = new URLSearchParams();
    if (query.category) params.set('category', query.category);
    if (query.search) params.set('search', query.search);
    if (query.page) params.set('page', String(query.page));
    if (query.pageSize) params.set('pageSize', String(query.pageSize));
    if (query.sort) params.set('sort', query.sort);

    return apiClient.get<ProductsResponse>(
      `/products?${params.toString()}`,
      signal
    );
  },

  getById: (id: string, signal?: AbortSignal) =>
    apiClient.get<Product>(`/products/${id}`, signal),

  create: (data: CreateProductRequest) =>
    apiClient.post<Product>('/products', data),

  update: (id: string, data: UpdateProductRequest) =>
    apiClient.patch<Product>(`/products/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<void>(`/products/${id}`),

  // Batch endpoint — single request for multiple IDs
  getBatch: (ids: string[], signal?: AbortSignal) =>
    apiClient.get<Product[]>(`/products/batch?ids=${ids.join(',')}`, signal),
};
```

### Layer 3: TanStack Query Hooks

```typescript
// hooks/useProducts.ts — data layer, caching, loading state
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '../api/products.api';

const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (query: ProductsQuery) => [...productKeys.lists(), query] as const,
  detail: (id: string) => [...productKeys.all, id] as const,
};

export function useProducts(query: ProductsQuery) {
  return useQuery({
    queryKey: productKeys.list(query),
    queryFn: ({ signal }) => productsApi.list(query, signal),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: ({ signal }) => productsApi.getById(id, signal),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: productsApi.create,
    onSuccess: (newProduct) => {
      // Invalidate list queries
      qc.invalidateQueries({ queryKey: productKeys.lists() });
      // Pre-populate the detail query so /products/:id loads instantly
      qc.setQueryData(productKeys.detail(newProduct.id), newProduct);
    },
  });
}
```

### REST Conventions That Matter

```typescript
// HTTP Methods — semantic correctness matters for caching and idempotency
//
// GET    — read, cacheable, idempotent, no body
// POST   — create or non-idempotent action
// PUT    — full replacement, idempotent
// PATCH  — partial update, not necessarily idempotent
// DELETE — delete, idempotent

// Status codes to handle explicitly:
// 200 OK             — success with body
// 201 Created        — POST success; include Location header with new resource URL
// 204 No Content     — DELETE / PUT success; no body
// 400 Bad Request    — validation failure; body contains field errors
// 401 Unauthorized   — not authenticated; redirect to login
// 403 Forbidden      — authenticated but not authorized; show permission error
// 404 Not Found      — resource doesn't exist; show empty state, not error page
// 409 Conflict       — optimistic update conflict; merge or prompt user
// 422 Unprocessable  — semantic validation failure (different from 400 syntax error)
// 429 Too Many Req.  — rate limited; back off exponentially
// 500 Server Error   — show generic error; log to Sentry

// Content Negotiation
fetch('/api/products', {
  headers: {
    'Accept': 'application/json',         // request JSON
    'Accept-Language': 'en-US,en;q=0.9', // locale hint
    'Accept-Encoding': 'gzip, deflate',  // compression
  }
});
```

### Axios vs Fetch — Production Decision

```typescript
// Fetch — built-in, no bundle overhead, needs polyfill for older browsers
// Axios — 13KB bundle hit, automatic JSON, request/response interceptors

// If you need interceptors without Axios:
// Wrap fetch in a class (like HttpClient above) — same capability, 0KB overhead

// Axios interceptors (if using Axios):
import axios from 'axios';

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });

// Request interceptor — inject auth
api.interceptors.request.use(config => {
  const token = authStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — handle token refresh
api.interceptors.response.use(
  response => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retried) {
      error.config._retried = true;
      const newToken = await authService.refreshToken();
      error.config.headers.Authorization = `Bearer ${newToken}`;
      return api.request(error.config);
    }
    return Promise.reject(error);
  }
);
```

### Resource Nesting & URL Design

```typescript
// Flat vs Nested URL strategy:
// Flat resources: /users/:id, /products/:id — clean, independently addressable
// Nested resources: /users/:userId/orders — implies ownership, makes sense for 1:many

// In practice: max 2 levels of nesting
GET /users/:id/orders          ✅ user's orders
GET /users/:id/orders/:orderId ✅ specific order of user
GET /users/:id/orders/:orderId/items/:itemId  ❌ too deep — use flat: /order-items/:itemId

// HATEOAS: include links in response for discoverability
interface ProductResponse {
  id: string;
  name: string;
  _links: {
    self: { href: string };
    category: { href: string };
    reviews: { href: string };
  };
}
// Benefits: client doesn't hardcode URLs; API can refactor URLs without client change
// Cost: response payload size; rarely implemented in practice (but mention in interviews)
```

### ⚠️ Anti-Patterns & Pitfalls

- **Raw `fetch` calls scattered in components** — spreads auth logic, error normalization, and URL construction across the codebase; one auth change = 40 file edits; centralize in a typed API service layer

- **Not passing `signal` to fetch** — when filter params change rapidly, multiple in-flight requests complete out of order; the stale request's response overwrites the fresh one; always pass the `signal` from `useQuery`'s `queryFn` context to `fetch`

- **Treating all HTTP errors the same** — 404 should show an empty state, 403 should show a permission message, 401 should trigger re-auth, 500 should show a generic error; a single `catch` that shows "Something went wrong" for all of these degrades UX

- **Not handling 204 No Content** — `response.json()` on a 204 response throws; always check `response.status === 204` before parsing body

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the procurement dashboard had raw `fetch` calls in 40+ components, each manually setting the `Authorization` header by reading from a Redux selector. When the auth token storage moved from Redux to an httpOnly cookie (for XSS hardening), it required updating 40 files. The 3-layer refactor — HttpClient with interceptors → typed API services → TanStack Query hooks — centralized auth in one place. Token migration became a 1-file change. Duplicate requests on the dashboard page dropped from 12 to 3 (TQ deduplication + caching).

**At FAANG scale:**
- **Microsoft:** Azure portal generates REST clients from OpenAPI specs — every API surface has a typed SDK generated automatically; the client layer is never hand-written; error handling contracts are part of the spec
- **Adobe:** Stock API has two client versions (v2 REST, v3 GraphQL); the service layer abstracts which version is called based on feature flag — UI components don't know which version they use
- **Salesforce:** Apex REST callers in LWC use `@wire` for read queries (automatic TQ-equivalent caching) and `getRecord`/`updateRecord` wires for CRM data; the service layer never appears because the Salesforce platform IS the service layer
- **Cisco:** DNA Center API clients are generated from Swagger; teams consume the generated TypeScript client; the pattern is identical to the 3-layer model but with codegen for layer 2

**How it evolves with scale:**
- Small scale (< 10K users): direct fetch per component is acceptable; overhead is manageable
- Medium scale (100K users): request deduplication via TanStack Query prevents redundant server load; typed API services prevent contract drift
- Large scale (10M+ users): API gateway handles rate limiting, throttling, auth forwarding; frontend client is a thin consumer of the gateway's contracts; typed SDK generated from OpenAPI specs

---

## 💬 4. Interview Execution

### Sample Answer

> "My REST consumption pattern has three layers: a typed HTTP client with interceptors for auth and error normalization, a domain API service that owns endpoint URLs and TypeScript contracts, and a TanStack Query data layer for caching and loading state. This layering means when auth storage changes or the base URL changes, I edit one file. When a response shape changes, TypeScript catches every consumer immediately.
>
> The HTTP client wraps `fetch` — I don't use Axios in new code because a 60-line TypeScript class gives me the same interceptor capability with zero bundle overhead. Every `fetch` call passes the `signal` from TanStack Query's `queryFn` context for automatic request cancellation when filter params change.
>
> For error handling: 401 triggers a token refresh and request retry; 403 shows a permission message; 404 shows an empty state; 500 logs to Sentry and shows a generic error. All of this lives in the HTTP client — no component ever handles `response.status` directly.
>
> At SAP this pattern brought duplicate API requests from 12 to 3 per page load, and the auth token migration became a 1-file change instead of 40."

### Likely Follow-up Questions
1. "How do you handle token refresh?" → Response interceptor catches 401, calls `refreshToken()`, retries the original request with the new token; use a lock to prevent multiple concurrent refresh calls racing
2. "Fetch vs Axios in 2025?" → Native `fetch` with a thin HttpClient wrapper is preferred for new projects — no bundle cost, same capability; Axios is acceptable in existing codebases; never mix both
3. "How do you test API services?" → Unit test the API service with `msw` (Mock Service Worker) intercepting at the network level — no mocking of `fetch`, realistic request/response cycle, type-safe
4. "How do you version API calls?" → Version in the URL path (`/api/v2/products`) or `Accept-Version` header; the HttpClient's `baseURL` or request interceptor applies the version consistently
5. "How do you handle CORS?" → CORS is a server-side concern but frontend triggers it; credentials (`withCredentials: true` / `credentials: 'include'`) require server to set `Access-Control-Allow-Credentials: true` and a non-wildcard `Access-Control-Allow-Origin`

### vs Alternatives

| Approach | Use When |
|---|---|
| 3-layer (client → service → hook) | Large codebase, team of 5+, multiple API domains |
| Direct TanStack Query + inline queryFn | Small app, solo, single API domain |
| Generated SDK (OpenAPI → codegen) | Public API, shared contract with backend team, multi-team org |
| tRPC | Full-stack TypeScript monorepo, eliminate REST entirely |

---

## 💻 5. Code Example

```typescript
// Complete: typed API client + service + hook — products domain

// types/api.ts
export interface ApiPaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body: unknown = {}
  ) {
    super(message);
    this.name = 'ApiError';
  }
  get isNotFound() { return this.status === 404; }
  get isUnauthorized() { return this.status === 401; }
  get isForbidden() { return this.status === 403; }
  get isServerError() { return this.status >= 500; }
}

// Configurable HTTP client
class HttpClient {
  constructor(private readonly baseURL: string) {}

  async request<T>(
    method: string,
    path: string,
    options?: { body?: unknown; signal?: AbortSignal; headers?: Record<string, string> }
  ): Promise<T> {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('access_token')  // in practice: use httpOnly cookie via /me endpoint
      : null;

    const res = await fetch(`${this.baseURL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
      body: options?.body != null ? JSON.stringify(options.body) : undefined,
      signal: options?.signal,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(res.status, body?.message ?? res.statusText, body);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  }

  get = <T>(path: string, signal?: AbortSignal) =>
    this.request<T>('GET', path, { signal });
  post = <T>(path: string, body: unknown) =>
    this.request<T>('POST', path, { body });
  patch = <T>(path: string, body: unknown) =>
    this.request<T>('PATCH', path, { body });
  delete = <T>(path: string) =>
    this.request<T>('DELETE', path);
}

export const http = new HttpClient(process.env.NEXT_PUBLIC_API_URL!);

// API service
type ProductSort = 'name:asc' | 'name:desc' | 'price:asc' | 'price:desc';
interface ProductQuery { category?: string; search?: string; page?: number; sort?: ProductSort; }

export const productsApi = {
  list: (q: ProductQuery, signal?: AbortSignal) => {
    const p = new URLSearchParams(
      Object.fromEntries(Object.entries(q).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]))
    );
    return http.get<ApiPaginatedResponse<Product>>(`/products?${p}`, signal);
  },
  getById: (id: string, signal?: AbortSignal) =>
    http.get<Product>(`/products/${id}`, signal),
  create: (data: Omit<Product, 'id'>) =>
    http.post<Product>('/products', data),
  update: (id: string, changes: Partial<Product>) =>
    http.patch<Product>(`/products/${id}`, changes),
  remove: (id: string) =>
    http.delete<void>(`/products/${id}`),
};

// Query hooks
export const productKeys = {
  all: ['products'] as const,
  list: (q: ProductQuery) => ['products', 'list', q] as const,
  detail: (id: string) => ['products', id] as const,
};

export function useProducts(query: ProductQuery) {
  return useQuery({
    queryKey: productKeys.list(query),
    queryFn: ({ signal }) => productsApi.list(query, signal),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    throwOnError: (error) => (error as ApiError).isServerError,
  });
}
```

---

## 🧠 6. Memory Aid

**3-layer stack — CSH:**
- **C**lient (HttpClient) — transport, auth, error normalization
- **S**ervice (productsApi) — URL construction, typed contracts
- **H**ook (useProducts) — caching, loading, invalidation

**Error status decision tree — 4-NOT:**
- **4**01 → refresh token / redirect to login
- **4**03 → show permission denied UI
- **40**4 → show empty state (not error page)
- **5**xx → show generic error + log to Sentry

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ The 3-layer model is the single most impactful architectural decision for REST consumption — it determines how maintainable the codebase is when auth changes, base URLs change, or endpoints are versioned; every deviation from this pattern shows up as duplicated fetch calls, inconsistent error handling, and manual loading state management in dozens of components
→ Always passing `signal` to `fetch` is a correctness requirement in apps with dynamic filtering — without it, rapid filter changes cause out-of-order responses to overwrite each other; this is a common senior-level behavioral interview follow-up ("how do you handle race conditions in API calls?")
→ The 404 vs 403 vs 500 distinction demonstrates UX maturity — a 404 should show an empty state (the resource simply doesn't exist yet), a 403 should explain the permission boundary, and a 500 should show a generic error with retry; conflating them all as "error" degrades UX and frustrates support teams

**How it works (2 sentences):**
The `fetch` API's `signal` parameter accepts an `AbortSignal` from an `AbortController` — when the controller's `abort()` is called, the browser cancels the in-flight network request at the OS level (not just ignores the response) and the pending `fetch` promise rejects with an `AbortError`; TanStack Query's `queryFn` context provides a `signal` that is automatically aborted when the query key changes or the component unmounts, eliminating the stale-response overwrite race condition without any manual cancellation logic in the component.
The three-layer separation enables independent testability: the HTTP client can be tested with `jest.spyOn(global, 'fetch')`, the API service can be tested with `msw` network interception (testing URL construction and response mapping), and the TanStack Query hooks can be tested with `renderHook` against an `msw` server — none of these test layers require mounting the full component tree.

---
✅ Topic 149/486 complete → Continuing to Topic 150: GraphQL in Frontend Systems
