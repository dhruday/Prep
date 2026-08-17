# 150. GraphQL in Frontend Systems
**Phase:** Data Fetching & API Design | **Sequence:** SEQ 07 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

GraphQL is a query language and runtime for APIs that lets the client specify exactly the data it needs — eliminating over-fetching (getting 50 fields when you need 5) and under-fetching (needing multiple REST round trips to assemble one view). Instead of many fixed REST endpoints, GraphQL exposes a single endpoint where the client sends a typed query describing the shape of the response. The frontend benefits I care about: precise data shapes reduce JavaScript parsing and hydration cost; deeply nested relational data in one request eliminates request waterfalls; and the schema is the contract — changes are caught at compile time with TypeScript codegen. Adobe uses GraphQL to power its Creative Cloud asset library; Salesforce uses it in their GraphQL API for CRM data with cursor-based pagination.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Core Concepts

```graphql
# Query — read operation
query GetProduct($id: ID!) {
  product(id: $id) {
    id
    name
    price
    category {       # related entity — no extra HTTP round trip
      id
      name
    }
    reviews(first: 5) {
      nodes {
        id
        rating
        text
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}

# Mutation — write operation
mutation CreateProduct($input: CreateProductInput!) {
  createProduct(input: $input) {
    id
    name
    price
  }
}

# Subscription — real-time
subscription OnProductPriceChange($id: ID!) {
  productPriceChanged(id: $id) {
    id
    price
    previousPrice
  }
}

# Fragment — reusable selection set
fragment ProductCard on Product {
  id
  name
  price
  thumbnailUrl
}

query GetProductList {
  products {
    nodes { ...ProductCard }
  }
}
```

### Apollo Client — Production Setup

```typescript
// apollo/client.ts
import { ApolloClient, InMemoryCache, HttpLink, from, split } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';

// Error link — handle 401, log to Sentry
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path, extensions }) => {
      if (extensions?.code === 'UNAUTHENTICATED') {
        authService.refreshToken().then(() => forward(operation));
      }
      console.error(`GraphQL error: ${message} at ${path?.join('.')}`);
    });
  }
  if (networkError) {
    console.error('Network error:', networkError);
  }
});

// Auth link — inject token
const authLink = new ApolloLink((operation, forward) => {
  operation.setContext(({ headers = {} }) => ({
    headers: {
      ...headers,
      authorization: authStore.getState().token
        ? `Bearer ${authStore.getState().token}`
        : '',
    },
  }));
  return forward(operation);
});

const httpLink = new HttpLink({ uri: process.env.NEXT_PUBLIC_GRAPHQL_URL });

const wsLink = new GraphQLWsLink(
  createClient({
    url: process.env.NEXT_PUBLIC_GRAPHQL_WS_URL!,
    connectionParams: () => ({
      authorization: `Bearer ${authStore.getState().token}`,
    }),
  })
);

// Split: queries/mutations use HTTP; subscriptions use WebSocket
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
  },
  wsLink,
  from([errorLink, authLink, httpLink])
);

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache({
    typePolicies: {
      Product: {
        keyFields: ['id'],  // cache key — default is __typename + id
      },
      Query: {
        fields: {
          products: relayStylePagination(['filter', 'sort']),
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: { errorPolicy: 'all' },
    query: { errorPolicy: 'all' },
  },
});
```

### Queries with Hooks (Apollo)

```typescript
import { useQuery, useMutation, useSubscription, gql } from '@apollo/client';

const GET_PRODUCTS = gql`
  query GetProducts($filter: ProductFilter, $first: Int, $after: String) {
    products(filter: $filter, first: $first, after: $after) {
      nodes {
        id
        name
        price
        category { id name }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;

function ProductList({ categoryId }: { categoryId: string }) {
  const { data, loading, error, fetchMore } = useQuery(GET_PRODUCTS, {
    variables: { filter: { categoryId }, first: 20 },
    notifyOnNetworkStatusChange: true,  // loading becomes true on fetchMore too
  });

  if (loading && !data) return <ProductSkeleton />;
  if (error) return <ErrorBanner error={error} />;

  const { nodes: products, pageInfo } = data!.products;

  const loadMore = () => fetchMore({
    variables: { after: pageInfo.endCursor },
    updateQuery: (prev, { fetchMoreResult }) => {
      if (!fetchMoreResult) return prev;
      return {
        products: {
          ...fetchMoreResult.products,
          nodes: [...prev.products.nodes, ...fetchMoreResult.products.nodes],
        },
      };
    },
  });

  return (
    <>
      <ProductGrid products={products} />
      {pageInfo.hasNextPage && <button onClick={loadMore}>Load more</button>}
    </>
  );
}
```

### Cache Normalization — Apollo InMemoryCache

```typescript
// Apollo normalizes by __typename + id by default
// Every Product with id "prod_123" is stored once in the cache
// regardless of which query fetched it

// TypePolicy for custom cache behavior:
const cache = new InMemoryCache({
  typePolicies: {
    Product: {
      // Custom merge for when the same product is fetched with different fields
      fields: {
        reviews: {
          // Relay-style pagination merge
          keyArgs: ['filter'],  // same filter = merge into same cache entry
          merge(existing = { nodes: [] }, incoming, { args }) {
            return {
              ...incoming,
              nodes: args?.after
                ? [...existing.nodes, ...incoming.nodes]  // append on fetchMore
                : incoming.nodes,                          // replace on fresh query
            };
          },
        },
      },
    },
  },
});

// Manual cache write (equivalent to TanStack Query's setQueryData)
apolloClient.writeQuery({
  query: GET_PRODUCT,
  variables: { id: 'prod_123' },
  data: { product: updatedProduct },
});

// Manual cache read
const product = apolloClient.readQuery({
  query: GET_PRODUCT,
  variables: { id: 'prod_123' },
});
```

### Mutations with Optimistic UI

```typescript
const UPDATE_PRODUCT = gql`
  mutation UpdateProduct($id: ID!, $input: UpdateProductInput!) {
    updateProduct(id: $id, input: $input) {
      id
      name
      price
    }
  }
`;

function ProductPriceEditor({ product }: { product: Product }) {
  const [updateProduct] = useMutation(UPDATE_PRODUCT, {
    optimisticResponse: {
      updateProduct: {
        __typename: 'Product',
        id: product.id,
        name: product.name,
        price: pendingPrice,  // show updated price immediately
      },
    },
    // Apollo automatically reverts optimistic response if mutation fails
  });

  return (
    <input
      defaultValue={product.price}
      onBlur={e => updateProduct({
        variables: { id: product.id, input: { price: Number(e.target.value) } },
      })}
    />
  );
}
```

### TypeScript Codegen

```typescript
// Production workflow: generate TypeScript types from GraphQL schema
// npm install --save-dev @graphql-codegen/cli

// codegen.yml:
// generates:
//   src/generated/graphql.ts:
//     schema: http://localhost:4000/graphql
//     documents: src/**/*.graphql
//     plugins:
//       - typescript
//       - typescript-operations
//       - typescript-react-apollo

// After codegen, you get:
import { useGetProductsQuery, useUpdateProductMutation } from './generated/graphql';

function ProductList() {
  const { data, loading } = useGetProductsQuery({
    variables: { filter: { categoryId: 'cat_1' }, first: 20 },
    // ↑ variables are fully typed — TypeScript catches wrong variable shapes
  });
  // data.products.nodes is fully typed as Product[] — no manual typing needed
}
```

### GraphQL vs REST: When to Choose

| Dimension | GraphQL | REST |
|---|---|---|
| Over-fetching | Never (client specifies fields) | Common (fixed response shapes) |
| Multiple relations in 1 req | Yes (nested queries) | Requires multiple requests or custom endpoints |
| Caching | Complex (no native HTTP caching) | Native HTTP caching (GET is cacheable) |
| File uploads | Poor (outside spec; use multipart or REST) | Natural (multipart/form-data) |
| Learning curve | Higher (schema, resolvers, fragments) | Lower |
| Schema contract | Strict (introspection, typed) | Informal (OpenAPI optional) |
| Real-time | Built-in subscriptions | SSE or WebSocket (separate) |

### ⚠️ Anti-Patterns & Pitfalls

- **N+1 queries in GQL resolvers** — GraphQL doesn't eliminate N+1; a `products` query resolving `category` for each product still hits the DB N times without DataLoader batching; this is a backend concern but frontend engineers should know to ask "is DataLoader implemented?"

- **Overly broad fragments** — `fragment AllProductFields on Product { id name price description longDescription ... }` defeats the over-fetching benefit; keep fragments scoped to what the component actually renders, no more

- **Not using `@skip` and `@include` directives** — conditionally fetching fields in a single query based on variables is more efficient than two separate queries; `field @include(if: $condition)` lets the server skip resolving the field entirely

- **Ignoring Apollo cache normalization** — writing multiple queries that return the same entity and manually keeping them in sync; Apollo's InMemoryCache does this automatically when `__typename` and `id` are present in every query response

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the supplier profile page required 4 REST calls: GET supplier, GET supplier contacts, GET supplier certifications, GET supplier addresses. Each had its own loading state, its own error handling, and the component couldn't render until all 4 resolved, creating a 1.2-second sequential waterfall. A GraphQL migration combined these into a single query returning the exact fields needed — page data load went from 1.2s (sequential) to 280ms (single round trip). TypeScript codegen from the schema eliminated all manual interface typing for API responses.

**At FAANG scale:**
- **Microsoft:** GitHub uses GraphQL for repository data — the repo page fetches all related entities (commits, issues, PRs, file tree, contributors) in one query with exact field selection; the GitHub GraphQL API is public at `api.github.com/graphql`
- **Adobe:** Experience Manager's content delivery API is GraphQL-first — content fragments can be queried with exact field selection regardless of fragment type; editorial teams define the schema, dev teams consume it
- **Salesforce:** Salesforce GraphQL API (GA since 2023) supports cursor-based pagination for SObjects; SOQL-like filtering via GraphQL variables; used for complex CRM data joins that would require multiple REST calls
- **Cisco:** Catalyst Center (formerly DNA Center) exposes a device telemetry GraphQL API for dashboards — operators query exactly the health metrics they need without receiving full device objects

**How it evolves with scale:**
- Small scale (< 10K users): Apollo Client with basic caching; simple queries; acceptable without codegen
- Medium scale (100K users): codegen mandatory; persisted queries (hash-based, cached at CDN); query complexity limits enforced server-side
- Large scale (10M+ users): automatic persisted queries; response caching via CDN; schema federation (Apollo Federation) to compose across microservices; query depth and rate limiting by authenticated user tier

---

## 💬 4. Interview Execution

### Sample Answer

> "GraphQL solves two REST problems I've hit repeatedly in production: over-fetching and request waterfalls. Over-fetching means the server returns 50 fields but the component needs 5 — you're paying for JSON serialization, network transfer, and JavaScript parsing for data that's immediately discarded. Request waterfalls happen because REST resources model individual nouns, not views — a product detail view needs GET product, GET category, GET reviews, which in practice chains sequentially because each request's ID is needed for the next.
>
> GraphQL fixes both: the client describes exactly the shape it needs, the server returns only that. A product detail page that needed 4 REST requests becomes one GraphQL query.
>
> The production concern I always raise: GraphQL isn't automatically faster. N+1 on the server, missing DataLoader implementation, or naive caching can make it slower than REST. I look at the backend implementation before recommending GraphQL.
>
> For the frontend toolchain: Apollo Client's InMemoryCache normalizes by typename+ID, so the same product fetched by two different queries lives once in the cache — an update in one query reflects everywhere, the same guarantee normalization gives you in RTK's EntityAdapter but automatic.
>
> At SAP, replacing 4 REST calls with 1 GraphQL query took the supplier profile page from 1.2 seconds to 280ms."

### Likely Follow-up Questions
1. "How does Apollo cache normalization work?" → Every response is flattened; entities are keyed by `{__typename}:{id}`; the same product in 10 different queries is stored once; writing to one query's result auto-updates all components reading that entity
2. "What are persisted queries?" → Instead of sending the full query string on each request, the client sends a hash; server looks up the pre-registered query by hash; CDN-cacheable by hash; prevents arbitrary query injection
3. "GraphQL subscriptions vs Server-Sent Events?" → GQL subscriptions use WebSocket (persistent bidirectional); SSE is simpler (one-way, no WebSocket complexity); use subscriptions when you need the GraphQL type system on real-time data; SSE otherwise
4. "How do you handle N+1?" → Backend concern (DataLoader); frontend canspot it by looking at the network panel — seeing 50 sequential category requests means DataLoader is absent; mention it to the backend team
5. "Relay vs Apollo?" → Relay enforces Relay Cursor Connections spec and requires strict cursor-based pagination; Apollo is more flexible but requires more manual cache configuration; Relay is Facebook's internal standard; Apollo is more common in non-Meta companies

---

## 💻 5. Code Example (TypeScript)

```typescript
// GraphQL + Apollo + TypeScript codegen — complete feature

// products.query.graphql (co-located with component)
/*
query GetProductsWithCategory(
  $filter: ProductFilter
  $first: Int = 20
  $after: String
) {
  products(filter: $filter, first: $first, after: $after) {
    nodes {
      id
      name
      price
      thumbnailUrl
      category { id name }
    }
    pageInfo { hasNextPage endCursor }
    totalCount
  }
}
*/

// After codegen → generated/graphql.ts has type-safe hook:
import {
  useGetProductsWithCategoryQuery,
  Product,
  ProductFilter,
} from '../generated/graphql';

function ProductDirectory({ filter }: { filter: ProductFilter }) {
  const { data, loading, error, fetchMore } = useGetProductsWithCategoryQuery({
    variables: { filter, first: 20 },
    notifyOnNetworkStatusChange: true,
  });

  const { nodes = [], pageInfo, totalCount } = data?.products ?? { nodes: [] };

  const loadMore = useCallback(() => {
    fetchMore({
      variables: { after: pageInfo?.endCursor },
    });
  }, [fetchMore, pageInfo?.endCursor]);

  if (loading && !data) return <ProductDirectorySkeleton />;
  if (error) return <GraphQLErrorDisplay error={error} />;

  return (
    <>
      <p>{totalCount} products found</p>
      <div className="product-grid">
        {nodes.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      {pageInfo?.hasNextPage && (
        <button onClick={loadMore} disabled={loading}>
          {loading ? 'Loading…' : 'Load more'}
        </button>
      )}
    </>
  );
}

// Error display component that handles both GQL and network errors
function GraphQLErrorDisplay({ error }: { error: ApolloError }) {
  const isAuth = error.graphQLErrors.some(e => e.extensions?.code === 'UNAUTHENTICATED');
  if (isAuth) return <Navigate to="/login" />;

  const isNotFound = error.graphQLErrors.some(e => e.extensions?.code === 'NOT_FOUND');
  if (isNotFound) return <EmptyState message="No products found" />;

  return (
    <ErrorBanner message="Failed to load products. Please try again." />
  );
}
```

---

## 🧠 6. Memory Aid

**GraphQL key concepts — SQMF:**
- **S**chema — typed contract between client and server
- **Q**uery/Mutation/Subscription — the three operation types
- **M**atch — server returns exactly what client asks for (no more, no less)
- **F**ragments — reusable named selection sets

**Apollo cache — normalize automatically:**
- `__typename + id` = cache key
- Same entity in 10 queries = 1 copy in cache
- Mutation updates entity → all queries reading it update
- Equivalent to `createEntityAdapter` but fully automatic

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ The request waterfall elimination is GraphQL's most concrete production benefit — 4 REST requests that each depend on the previous response's IDs (sequential waterfall) become 1 GraphQL query; at 100ms per round trip, that's 400ms → 100ms just from the network layer, before any parsing or rendering benefit
→ TypeScript codegen from a GraphQL schema is the best type safety story in modern frontend — the schema IS the contract; codegen generates exact TypeScript types for every query's variables and response; unlike hand-written REST response interfaces that drift from the server, these types are regenerated every time the schema changes, breaking your TypeScript build when a field is renamed or removed
→ Apollo InMemoryCache normalization is a free version of `createEntityAdapter` — knowing this tells interviewers that you understand the data layer deeply rather than treating Apollo as "the library you install to do GraphQL"

**How it works (2 sentences):**
Apollo Client's InMemoryCache normalizes every query response by walking the JSON tree, identifying objects with both `__typename` and `id` fields, and storing them keyed by `{typename}:{id}` in a flat lookup table — this means when a mutation updates `Product:prod_123`, Apollo applies a cache diff and notifies every active `useQuery` hook that has a reference to `Product:prod_123` in its result set, triggering a re-render of only those components, regardless of which query originally fetched the product.
GraphQL queries are executed by sending a POST request with the query document and variables to a single endpoint, where the server's execution engine resolves each field by calling the matching resolver function — resolvers can be synchronous (field returns a scalar) or asynchronous (field fetches from a database), and resolver results are assembled into the exact response shape matching the query's selection set before being returned; this is why the N+1 problem exists (each nested object triggers its resolver independently without batching) and why DataLoader is needed to coalesce N separate DB calls into 1 batched query.

---
✅ Topic 150/486 complete → Continuing to Topic 151: tRPC & Type-Safe APIs
