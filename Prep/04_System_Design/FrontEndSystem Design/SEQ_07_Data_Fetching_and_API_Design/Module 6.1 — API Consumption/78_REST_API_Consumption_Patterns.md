# 78. REST API Consumption Patterns

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

**REST API Consumption Patterns** are the architectural strategies frontend engineers use to fetch, transform, cache, and handle data from RESTful backends in a scalable, maintainable way. They go beyond simple `fetch()` calls to include abstraction layers, error boundaries, retry strategies, and caching. At senior level, the question isn't *can you call an API* — it's *how do you design the data layer so it scales to multiple teams, thousands of components, and millions of requests without duplicated logic or race conditions*. In production at SAP scale, having consistent API consumption patterns meant 80% fewer inconsistency bugs and a single source of truth for every data change in the system.

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### Architecture & Component Boundaries

A well-designed REST consumption layer has clear separation:

```
UI Components
     ↓ (only use hooks/selectors, never raw fetch)
Custom Hooks / React Query / RTK Query
     ↓ (abstract transport, caching, error handling)
API Service Layer (typed fetch wrappers)
     ↓ (base URL, auth headers, interceptors)
HTTP Client (Axios / native fetch)
     ↓
Backend REST API
```

**Why this layering matters:**
- UI components should never know about HTTP status codes
- Error handling logic lives in one place (the service layer)
- Caching decisions are centralized, not duplicated per component
- Mocking for tests is done once at the service layer, not component by component

### Data Flow & State Flow

**Pattern 1: Direct fetch in useEffect (Anti-pattern at scale)**
```typescript
// ❌ Works but doesn't scale — repeated in every component
function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/products')
      .then(r => r.json())
      .then(setProducts)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);
}
// Problem: No caching, no deduplication, no retry, no cancellation
```

**Pattern 2: Custom Hook Abstraction (Intermediate)**
```typescript
// ✅ Reusable but still manual caching
function useProducts() {
  const [state, dispatch] = useReducer(fetchReducer, initialState);
  
  useEffect(() => {
    const controller = new AbortController();
    dispatch({ type: 'LOADING' });
    
    apiClient.get('/products', { signal: controller.signal })
      .then(data => dispatch({ type: 'SUCCESS', payload: data }))
      .catch(err => {
        if (!controller.signal.aborted) {
          dispatch({ type: 'ERROR', payload: err });
        }
      });
    
    return () => controller.abort();
  }, []);
  
  return state;
}
```

**Pattern 3: React Query / TanStack Query (Production standard)**
```typescript
// ✅✅ Recommended for most applications
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['products', { category, page }],
  queryFn: () => productApi.getAll({ category, page }),
  staleTime: 5 * 60 * 1000,    // Consider fresh for 5 min
  gcTime: 10 * 60 * 1000,       // Keep in cache for 10 min
  retry: 3,
  retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
});
```

**Pattern 4: RTK Query (Redux ecosystem)**
```typescript
// ✅✅ Recommended for Redux-heavy apps
const productApi = createApi({
  reducerPath: 'productApi',
  baseQuery: fetchBaseQuery({ 
    baseUrl: '/api',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  endpoints: (builder) => ({
    getProducts: builder.query<Product[], ProductFilters>({
      query: (filters) => `/products?${new URLSearchParams(filters)}`,
      providesTags: ['Products'],
    }),
    createProduct: builder.mutation<Product, CreateProductDto>({
      query: (body) => ({ url: '/products', method: 'POST', body }),
      invalidatesTags: ['Products'],
    }),
  }),
});
```

### Browser Internals

**HTTP Connection Management:**
- Modern browsers limit parallel connections to **6 per domain** (HTTP/1.1)
- HTTP/2 multiplexes multiple requests over a single connection
- Batching related API calls for HTTP/1.1 environments avoids connection exhaustion
- `keep-alive` connections are reused automatically

**Request Prioritization:**
```typescript
// Browser assigns fetch priority based on usage context
fetch('/api/critical-data', { priority: 'high' });    // Visible in viewport
fetch('/api/background-data', { priority: 'low' });   // Below fold
```

**Request Cancellation & Cleanup:**
```typescript
// AbortController prevents memory leaks on component unmount
useEffect(() => {
  const controller = new AbortController();
  
  fetch('/api/data', { signal: controller.signal })
    .then(handleResponse)
    .catch(err => {
      if (err.name === 'AbortError') return; // Normal, not an error
      handleError(err);
    });
  
  return () => controller.abort(); // Cleanup on unmount/re-render
}, [dependency]);
```

### Performance Implications

**1. Request Waterfall Problem:**
```
❌ Sequential (waterfall):
  Component mounts
    → Fetch user (300ms)
    → Fetch user's posts (200ms)
    → Fetch post comments (150ms)
  Total: 650ms

✅ Parallel:
  Component mounts
    → Fetch user + posts + comments simultaneously
  Total: 300ms (max of parallel)
```

**2. Over-fetching:**
```typescript
// ❌ Fetching entire user object for just a name
GET /api/users/123
// Returns: { id, name, email, address, preferences, history... }

// ✅ Specific endpoint or GraphQL field selection
GET /api/users/123/summary
// Returns: { id, name, avatar }
```

**3. Under-fetching (N+1 Problem):**
```typescript
// ❌ N+1 requests — 1 for list + N for each item
const posts = await fetchPosts();          // 1 request
const postDetails = await Promise.all(     // N requests
  posts.map(p => fetchPostDetails(p.id))
);

// ✅ Include related data in single request
const posts = await fetch('/api/posts?include=author,tags');
```

### Scalability Considerations

**API Client Design for Large Teams:**
```typescript
// Base API client — shared across all teams
class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  
  constructor(config: ApiConfig) {
    this.baseUrl = config.baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'X-Client-Version': APP_VERSION,
    };
  }
  
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      ...this.defaultHeaders,
      ...options.headers,
      Authorization: `Bearer ${getAuthToken()}`,
    };
    
    const response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal,
    });
    
    if (!response.ok) {
      throw new ApiError(response.status, await response.json());
    }
    
    return response.json() as Promise<T>;
  }
}

// Domain-specific API modules build on the base client
class ProductApi {
  constructor(private client: ApiClient) {}
  
  getAll(filters: ProductFilters) {
    return this.client.request<Product[]>(`/products?${toQueryString(filters)}`);
  }
  
  getById(id: string) {
    return this.client.request<Product>(`/products/${id}`);
  }
}
```

### Anti-Patterns & Pitfalls

**1. Fetching inside render (React):**
```typescript
// ❌ Infinite render loop trap
function Component({ userId }) {
  return <div>{fetch(`/api/users/${userId}`).then(...)}</div>;
  // Creates new promise every render — never use fetch directly in render
}
```

**2. Missing error boundaries:**
```typescript
// ❌ Unhandled promise rejections crash silently
useEffect(() => {
  fetchData().then(setData); // What if fetchData rejects?
}, []);

// ✅ Always handle errors
useEffect(() => {
  fetchData()
    .then(setData)
    .catch(err => setError(err.message));
}, []);
```

**3. Stale closure in useEffect:**
```typescript
// ❌ Uses stale userId from closure
useEffect(() => {
  fetchUser(userId).then(setUser);
}, []); // Missing userId in dependency array → always fetches first userId

// ✅ Include all dependencies
useEffect(() => {
  fetchUser(userId).then(setUser);
}, [userId]);
```

**4. No request deduplication:**
```typescript
// ❌ 10 components mount simultaneously → 10 identical API calls
// ✅ React Query deduplicates automatically — same queryKey = single request
```

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**SAP Fiori Apps (Your Experience):**
- OData service calls through UI5's model binding layer (equivalent to RTK Query)
- SmartTable's `fetchData` is abstracted — components never call OData directly
- `sap.ui.model.odata.v4.ODataModel` handles batching, caching, error propagation
- The abstraction let you focus on authorization fixes without touching data layer

**Microsoft Teams (1,000 → 10M users):**  
1,000 users: Direct REST calls per component, simple fetch hooks  
100,000 users: Introduced service layer + caching with stale-while-revalidate  
10M users: RTK Query for auth + presence + messages; GraphQL for complex user graphs; aggressive caching at edge

**Salesforce CRM:**
- REST + Composite API to batch multiple record operations in one request
- `@wire` service in LWC is their declarative data-fetching layer (abstracts REST)
- Server-side filtering reduces payload: never send 1000 records when 20 are visible

**Adobe Creative Cloud:**
- Asset Management API uses cursor-based pagination for large libraries
- Progressive loading: metadata first, thumbnails lazy-loaded on scroll
- Background prefetch of next page on scroll position detection

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "When designing REST API consumption in frontend systems, I take a layered approach. At the bottom is an HTTP client wrapper — typically Axios or a typed fetch utility — that handles auth headers, base URL, and transforms HTTP errors into typed application errors. Above that sits a domain API layer with typed methods per resource. Components never call fetch directly; they go through React Query or RTK Query, which give us automatic caching, deduplication, and background refetching.
>
> At SAP, this approach was critical. We had multiple micro-frontend teams all consuming the same OData services. The UI5 model layer was our shared API layer — it deduped requests, cached results, and handled auth token injection uniformly. When I needed to reduce our vulnerability surface by removing inline token storage, I only had to change one place: the HTTP client layer.
>
> For performance, the key decisions are: use parallel requests instead of sequential waterfalls, implement stale-while-revalidate caching so users see instant data while fresh data loads in background, and use AbortController for cleanup to prevent memory leaks on navigation. At scale — say, 10M users — this caching layer dramatically reduces backend load since identical requests within the stale window never leave the browser."

**Likely Follow-up Questions:**
- "How would you handle authentication token refresh during API calls?" → Interceptor in the HTTP client that queues requests when refreshing, replays after new token
- "How do you handle optimistic updates?" → Update cache immediately, roll back on error (covered in topic 86)
- "How do you test API hooks?" → Mock at MSW level (service worker), test hooks with `renderHook`
- "How do you handle different API versions?" → Version prefix in base URL, header-based versioning for gradual migration
- "What if the API team changes a response structure?" → TypeScript SDK auto-generated from OpenAPI spec catches breakage at compile time

**Comparison With Alternatives:**

| Pattern | Best For | Trade-offs |
|---------|----------|------------|
| React Query | React apps, read-heavy | No built-in write state management |
| RTK Query | Redux apps, complex mutations | Redux overhead for simple projects |
| SWR | Next.js apps, simple cases | Less feature-rich than React Query |
| Apollo Client | GraphQL APIs | Heavyweight for REST |
| Custom hooks | Full control needed | Must re-implement caching, dedup |

**How to Explain Trade-offs Verbally:**
> "The choice between React Query and RTK Query comes down to what you're already using for global state. If you're Redux-first, RTK Query's tag-based cache invalidation integrating directly with Redux DevTools is worth the overhead. If you're component-first with minimal global state, React Query's simpler API and smaller bundle are the better trade-off."

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE
────────────────────────────────────────────────────────────

**Production-Grade API Layer (TypeScript):**

```typescript
// api/types.ts
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// api/client.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL!;

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken(); // From secure storage
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      errorBody.code ?? 'UNKNOWN',
      errorBody.message ?? `HTTP ${response.status}`,
      errorBody.details
    );
  }

  return response.json();
}

// api/products.ts
export const productApi = {
  getAll: (filters: ProductFilters) =>
    apiFetch<PaginatedResponse<Product>>(
      `/products?${new URLSearchParams(filters as Record<string, string>)}`
    ),
  
  getById: (id: string) =>
    apiFetch<Product>(`/products/${id}`),
  
  create: (data: CreateProductDto) =>
    apiFetch<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: UpdateProductDto) =>
    apiFetch<Product>(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

// hooks/useProducts.ts
export function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => productApi.getAll(filters),
    staleTime: 2 * 60 * 1000,
    select: (data) => data.items, // Transform response shape
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productApi.create,
    onSuccess: () => {
      // Invalidate and refetch product lists
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: ApiError) => {
      toast.error(error.message);
    },
  });
}
```

**Why structured this way:**
- `ApiError` class gives typed error handling in components
- `apiFetch` centralizes auth, serialization, and error transformation — change once, fixed everywhere
- React Query handles deduplication, caching, and background refetch automatically
- `select` transforms server shape to component-friendly shape without storing extra data in cache

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**LACE Framework for REST API Design:**
- **L**ayer — Always layer: component → hook → service → HTTP client
- **A**bort — Always use AbortController for cleanup
- **C**ache — Use React Query or RTK Query for dedup + cache
- **E**rror — Handle at service layer, expose as typed errors to UI

If you blank: *"Components should never call fetch directly. They go through a cache layer that deduplicates, retries, and handles stale data — that's the job of React Query or RTK Query."*

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ **UX**: Instant data from cache makes apps feel instant; proper loading states prevent layout shift  
→ **Performance**: Deduplication and caching reduce server load by 60-80% for read-heavy apps  
→ **Business**: Consistent error handling reduces support tickets; maintainable code reduces dev velocity cost

**How it works:**
→ An HTTP client wrapper centralizes auth headers and error transformation. Typed service modules expose domain methods. A caching layer (React Query/RTK Query) deduplicates in-flight requests, persists data in memory, and provides declarative loading/error states to components.

**Company relevance:**
→ **Microsoft**: Expects typed API layers — TypeScript SDK codegen from OpenAPI is standard  
→ **Adobe**: Asset management APIs require cursor-based pagination and rate limiting awareness  
→ **Salesforce**: `@wire` service in LWC is their REST abstraction — know how it maps to general patterns  
→ **Cisco**: Dashboard data freshness and WebSocket vs REST decision point is common interview topic
