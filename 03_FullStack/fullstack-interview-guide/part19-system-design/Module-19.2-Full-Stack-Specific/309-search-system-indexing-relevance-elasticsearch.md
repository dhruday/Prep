# Search System — Indexing, Relevance, Elasticsearch Basics
> Part 19 — System Design Case Studies · High Frequency
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Why not SQL LIKE for search**: `LIKE '%keyword%'` does a full table scan — no index can help a leading wildcard; at 10M rows it's seconds, not milliseconds; doesn't understand synonyms, typos, relevance ranking
- **Inverted index**: the foundation of search engines; maps each word (token) to a list of documents containing it; searching "laptop" takes nanoseconds because you just look up the "laptop" entry in the index; reverse of a document-based table  
- **Elasticsearch**: distributed, open-source search engine built on top of Lucene; stores documents as JSON; searches via inverted index; handles distributed indexing across shards + replicas automatically
- **Indexing pipeline**: source events → Kafka → Indexer Service → Elasticsearch; never index synchronously during write — a slow ES response would degrade your write path; index asynchronously; accept 1-5 second indexing lag
- **Analysis**: text goes through analyzer before indexing: tokenize ("iPhone 14 Pro" → ["iphone", "14", "pro"]); filter (lowercase, remove stop words, stemming: "running" → "run"); same analysis on query side enables matching
- **BM25 scoring**: Elasticsearch defaults to BM25 (Best Match 25) for relevance; higher score for term frequency (more occurrences in doc) and inverse document frequency (rarer term = more signal); TF-IDF's modern successor
- **Fuzzy matching**: handles 1-2 character typos (Levenshtein distance); "laptpo" matches "laptop"; configured with `fuzziness: "AUTO"` — adds latency but essential for product search quality
- **Filters vs queries**: filters are yes/no (is this product in stock? is price < 1000?) — cached by Elasticsearch, fast; queries score documents by relevance; combine both: filter narrows candidates, query ranks them
- **Faceted search**: aggregations on filtered fields (how many products per category? price range distribution?); Elasticsearch `aggs` on keyword fields; shown as sidebar filters in e-commerce
- **Write path vs read path**: source DB is source of truth; Elasticsearch is a read replica for search; sync changes via Change Data Capture (Debezium) → Kafka → Elasticsearch; if ES is down, writes keep going to source DB

---

## 1. One-Line Definition
A search system builds and maintains an inverted index (via Elasticsearch) that maps terms to documents, asynchronously populated from source systems via Kafka CDC, and serves full-text queries with relevance ranking, typo tolerance, and faceted filtering at sub-100ms latency.

---

## 2. The Problem It Solves

An e-commerce site has 5 million products in PostgreSQL. When a user searches "wireless headphones under 2000", the developer runs:

```sql
SELECT * FROM products 
WHERE name ILIKE '%wireless headphones%' 
  AND price < 2000 
ORDER BY created_at DESC;
```

The ILIKE with a leading wildcard can't use an index — full table scan, 8 seconds. It doesn't handle "wireless headphone" (singular) matching "wireless headphones" (plural). "wirless" typo returns 0 results. And it returns products chronologically, not by relevance — a 5-year-old bestseller ranks below a new product with zero sales.

Elasticsearch solves all of this: indexed at millisecond speed, stemming matches singular/plural, fuzzy search handles typos, BM25 ranks by how well the document matches, and faceted aggregations power the sidebar filters.

---

## 3. How It Works Internally

### Index Lifecycle

```
Data Source (PostgreSQL)
       │
       │ Change Data Capture (Debezium)
       │ Captures INSERT / UPDATE / DELETE
       ▼
    Kafka topic: db.products
       │
       ▼
  Indexer Service
  ┌──────────────────────────────────────┐
  │ Consume event                        │
  │ Transform to ES document format      │
  │ Enrich (add computed fields)         │
  │ PUT /products/_doc/{id}              │
  └──────────────────┬───────────────────┘
                     │
                     ▼
              Elasticsearch
              ┌────────────────────────────┐
              │ Analyze text:              │
              │   tokenize → lowercase     │
              │   → remove stop words     │
              │   → stem ("running"→"run") │
              │                            │
              │ Write to inverted index:   │
              │   "wireless" → [doc1,doc5] │
              │   "headphone" → [doc1,doc3]│
              │   "sony"      → [doc1,doc8]│
              │                            │
              │ Shard to nodes             │
              └────────────────────────────┘

Search Query:
  Request: "wirless headphones sony"
  ↓ Query phase
  ES tokenizes query → ["wireless", "headphones", "sony"]  (fuzzy match fixed typo)
  Lookup each token in inverted index
  Score documents by BM25 (term frequency × inverse document frequency)
  ↓ Fetch phase  
  Return top N documents with score
```

### Elasticsearch Index Mapping

```json
{
  "mappings": {
    "properties": {
      "id":          { "type": "keyword" },
      "name":        { "type": "text", "analyzer": "english" },
      "description": { "type": "text", "analyzer": "english" },
      "brand":       { "type": "keyword" },
      "category":    { "type": "keyword" },
      "price":       { "type": "float" },
      "inStock":     { "type": "boolean" },
      "rating":      { "type": "float" },
      "tags":        { "type": "keyword" },
      "createdAt":   { "type": "date" }
    }
  },
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1
  }
}
```

---

## 4. The Code

### Wrong Way — SQL LIKE Search

```java
// ❌ Full table scan with ILIKE — no index, no relevance, no typo tolerance

@GetMapping("/search")
public Page<Product> search(@RequestParam String q,
                            @RequestParam(required = false) Double maxPrice) {
    
    // ❌ ILIKE '%q%' — leading wildcard prevents index use, full table scan
    // ❌ At 5M products: 8s query time
    // ❌ No stemming: "headphone" won't match "headphones"
    // ❌ No typo tolerance: "wirless" returns 0 results
    // ❌ No relevance ranking: ORDER BY created_at has no correlation to match quality
    return productRepository.searchByNameContainingIgnoreCase(q, 
        maxPrice != null ? maxPrice : Double.MAX_VALUE,
        PageRequest.of(0, 20, Sort.by("createdAt").descending()));
}
```

```java
// ✅ Elasticsearch-backed search with relevance, fuzzy, and facets

@RestController
@RequestMapping("/search")
public class SearchController {
    private final ProductSearchService searchService;
    
    @GetMapping("/products")
    public ResponseEntity<SearchResponse> searchProducts(
            @RequestParam String q,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice,
            @RequestParam(defaultValue = "relevance") String sortBy,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        SearchQuery searchQuery = SearchQuery.builder()
            .query(q)
            .category(category)
            .priceRange(minPrice, maxPrice)
            .sort(sortBy)
            .page(page)
            .size(size)
            .build();
        
        return ResponseEntity.ok(searchService.search(searchQuery));
    }
}

@Service
public class ProductSearchService {
    private final ElasticsearchClient esClient;
    
    public SearchResponse search(SearchQuery req) {
        
        // ✅ Build the combined query
        Query esQuery = buildQuery(req);
        
        SearchRequest.Builder srBuilder = new SearchRequest.Builder()
            .index("products")
            .query(esQuery)
            .from(req.getPage() * req.getSize())
            .size(req.getSize())
            // ✅ Faceted aggregations — for sidebar filters
            .aggregations("categories", a -> a
                .terms(t -> t.field("category").size(20)))
            .aggregations("price_ranges", a -> a
                .histogram(h -> h.field("price").interval(500.0)));
        
        // ✅ Sorting: relevance (default) or price asc/desc or rating
        switch (req.getSortBy()) {
            case "price_asc"  -> srBuilder.sort(s -> s.field(f -> f.field("price").order(SortOrder.Asc)));
            case "price_desc" -> srBuilder.sort(s -> s.field(f -> f.field("price").order(SortOrder.Desc)));
            case "rating"     -> srBuilder.sort(s -> s.field(f -> f.field("rating").order(SortOrder.Desc)));
            // default "relevance" uses ES BM25 score — no explicit sort needed
        }
        
        co.elastic.clients.elasticsearch.core.SearchResponse<ProductDocument> esResponse =
            esClient.search(srBuilder.build(), ProductDocument.class);
        
        List<ProductSearchResult> hits = esResponse.hits().hits().stream()
            .map(hit -> new ProductSearchResult(hit.source(), hit.score()))
            .collect(toList());
        
        Map<String, List<FacetBucket>> facets = extractFacets(esResponse.aggregations());
        
        return new SearchResponse(
            hits,
            esResponse.hits().total().value(),
            facets,
            req.getPage(),
            req.getSize()
        );
    }
    
    private Query buildQuery(SearchQuery req) {
        List<Query> mustQueries   = new ArrayList<>();
        List<Query> filterQueries = new ArrayList<>();
        
        // ✅ Multi-match: search across name, description, brand with different boosts
        // name match is 3x more important than description match
        mustQueries.add(Query.of(q -> q
            .multiMatch(m -> m
                .query(req.getQuery())
                .fields("name^3", "brand^2", "description", "tags")
                .fuzziness("AUTO")                // ✅ typo tolerance: 1-2 char edits
                .type(TextQueryType.BestFields)
            )
        ));
        
        // ✅ Filters: exact match, cached by ES, much faster than scored queries
        if (req.getCategory() != null) {
            filterQueries.add(Query.of(q -> q
                .term(t -> t.field("category").value(req.getCategory()))
            ));
        }
        
        filterQueries.add(Query.of(q -> q
            .term(t -> t.field("inStock").value(true))  // ✅ only show in-stock by default
        ));
        
        if (req.getMinPrice() != null || req.getMaxPrice() != null) {
            filterQueries.add(Query.of(q -> q
                .range(r -> {
                    r.field("price");
                    if (req.getMinPrice() != null) r.gte(JsonData.of(req.getMinPrice()));
                    if (req.getMaxPrice() != null) r.lte(JsonData.of(req.getMaxPrice()));
                    return r;
                })
            ));
        }
        
        // ✅ Bool query: must (scored) + filter (unscored, cached)
        return Query.of(q -> q
            .bool(b -> b
                .must(mustQueries)
                .filter(filterQueries)
            )
        );
    }
}

// ✅ Async indexer: consumes from Kafka CDC events and indexes to ES
@KafkaListener(topics = "db.products", groupId = "search-indexer")
@Service
public class ProductIndexer {
    private final ElasticsearchClient esClient;
    
    @KafkaHandler
    public void indexProduct(CdcEvent<Product> event) {
        switch (event.getOperation()) {
            case INSERT, UPDATE -> esClient.index(i -> i
                .index("products")
                .id(event.getPayload().getId().toString())
                .document(toDocument(event.getPayload()))
            );
            case DELETE -> esClient.delete(d -> d
                .index("products")
                .id(event.getPayload().getId().toString())
            );
        }
    }
    
    private ProductDocument toDocument(Product p) {
        return ProductDocument.builder()
            .id(p.getId().toString())
            .name(p.getName())
            .description(p.getDescription())
            .brand(p.getBrand())
            .category(p.getCategory())
            .price(p.getPrice().doubleValue())
            .inStock(p.getStockCount() > 0)
            .rating(p.getAverageRating())
            .tags(p.getTags())
            .createdAt(p.getCreatedAt())
            .build();
    }
}
```

```typescript
// ✅ Frontend: React search with debounce + facets

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDebouncedValue } from './hooks/useDebouncedValue';

interface SearchState {
    results: ProductSearchResult[];
    total: number;
    facets: Record<string, FacetBucket[]>;
    loading: boolean;
}

function useProductSearch() {
    const [query, setQuery]               = useState('');
    const [filters, setFilters]           = useState<SearchFilters>({});
    const [sortBy, setSortBy]             = useState('relevance');
    const [searchState, setSearchState]   = useState<SearchState>({ results: [], total: 0, facets: {}, loading: false });
    const abortControllerRef              = useRef<AbortController | null>(null);
    
    // ✅ Debounce: don't send request on every keystroke — wait 300ms of inactivity
    const debouncedQuery = useDebouncedValue(query, 300);
    
    useEffect(() => {
        if (!debouncedQuery.trim()) {
            setSearchState(prev => ({ ...prev, results: [], total: 0 }));
            return;
        }
        
        // ✅ Abort previous in-flight request if user types faster than responses arrive
        abortControllerRef.current?.abort();
        abortControllerRef.current = new AbortController();
        
        setSearchState(prev => ({ ...prev, loading: true }));
        
        const params = new URLSearchParams({
            q:       debouncedQuery,
            sortBy,
            page:    '0',
            size:    '20',
            ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v != null))
        });
        
        fetch(`/api/search/products?${params}`, { signal: abortControllerRef.current.signal })
            .then(r => r.json())
            .then((data: SearchApiResponse) => {
                setSearchState({ results: data.hits, total: data.total, facets: data.facets, loading: false });
            })
            .catch(err => {
                if (err.name === 'AbortError') return;   // ✅ Expected — ignore aborted requests
                setSearchState(prev => ({ ...prev, loading: false }));
            });
    }, [debouncedQuery, filters, sortBy]);
    
    return { query, setQuery, filters, setFilters, sortBy, setSortBy, searchState };
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is an inverted index and why is it fast?"

**Hruday's answer:**
> A normal database index organises data by document: "Document 1 contains words A, B, C. Document 2 contains words B, D, E." To find which documents contain word B, you scan all documents.
>
> An inverted index flips this: "Word A appears in [Doc 1]. Word B appears in [Doc 1, Doc 2]. Word C appears in [Doc 1]." Now to find documents containing word B, you just look up the "B" entry — O(1) lookup, no scanning.
>
> The lookup returns a posting list — an ordered list of document IDs. For a query with multiple terms ("wireless headphones"), Elasticsearch looks up "wireless" (posting list L1) and "headphones" (posting list L2) and intersects them to find documents containing both. Posting lists are sorted by document ID, so intersection is O(n + m) via merge — very fast.
>
> The key insight: search is fundamentally about looking up terms, not scanning documents. The inverted index inverts the structure to make term lookup instant. This is why Elasticsearch can search 5 million products in 50ms while SQL LIKE '%keyword%' scans every row.

---

### Q2 — Deep Dive
**Interviewer asks:** "How do you keep Elasticsearch in sync with your primary database without missing updates?"

**Hruday's answer:**
> Change Data Capture (CDC) via Debezium is the production approach. Debezium connects to PostgreSQL's WAL (Write-Ahead Log) — the same log used for replication. Every INSERT, UPDATE, DELETE appears in the WAL. Debezium reads the WAL stream and publishes those changes to Kafka topics.
>
> My Kafka consumer reads these CDC events and updates Elasticsearch accordingly. This approach captures every change: even updates made by background jobs, migrations, or direct database fixes — not just API calls. The WAL doesn't miss anything.
>
> Why not use application-level events? Application-level Kafka publishing from the service works for normal path but misses: database migrations that update records in bulk, manual patches via SQL, and crashes where the app writes to DB but dies before publishing the Kafka event (dual-write inconsistency).
>
> The lag is typically 1-5 seconds from DB write to ES indexed — acceptable for search. If a product goes out of stock, it disappears from search results within seconds, not minutes.
>
> Reindexing on schema changes: when I change the mapping, I create a new index (`products_v2`), run a full reindex from PostgreSQL (not from ES), then switch the alias `products` from `products_v1` to `products_v2` atomically. Blue-green index swap — zero downtime.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When would you choose Elasticsearch over a PostgreSQL full-text search?"

**Hruday's answer:**
> PostgreSQL full-text search with `tsvector` and GIN index works well up to about 1-5 million rows, depending on query complexity. It handles stemming, ranking (ts_rank), and phrase search. If your product catalogue has 100,000 items and you need basic search, PostgreSQL full-text is completely fine — one fewer infrastructure component.
>
> I'd choose Elasticsearch when: the dataset grows beyond a few million documents and search latency becomes the bottleneck; you need faceted aggregations (sidebar filters with counts) — PostgreSQL can do this but it's slow on large datasets; you need relevance tuning (boost certain fields, penalise old items); or you have multi-language analysis needs (different stemmers per language in the same index).
>
> Elasticsearch operational overhead is real: cluster management, shard sizing, index lifecycle management, monitoring. For a startup with under 500K products, I'd start with PostgreSQL full-text and migrate to Elasticsearch when the pain justifies the complexity. The CDC pipeline from PostgreSQL to Elasticsearch can be added later with minimal app changes — the search service just changes its data source.

---

### Q4 — System Design Angle
**Interviewer asks:** "Design a search system for a job board with 10 million job postings."

**Hruday's answer:**
> Job search has interesting characteristics: high read volume (millions of job seekers), write volume moderate (thousands of postings/day), and temporal relevance (new jobs should rank higher than 3-month-old jobs).
>
> Index design: one ES index, 5 shards (2M docs/shard is comfortable), 1 replica. Index includes: title, description, company name (text fields for search), location (geo_point for radius search), skills (keyword array, filterable), job type (keyword), salary range (float range), posted date (date).
>
> Query: multi-match on title (boosted 3x), skills (2x), description. Filters: location radius (geo_distance), job type, salary range, date range. Boost function: `gauss` decay on posted_date — jobs posted today score highest; decay to 50% at 30 days. This promotes freshness without excluding older listings.
>
> Autocomplete for the search box: a separate `jobs_suggest` index with `completion` field type — ES's prefix completion is built for this, returns results in < 5ms.
>
> CDC from PostgreSQL (or MongoDB if NoSQL) via Debezium → Kafka → ES indexer. Job postings expire after 90 days — Elasticsearch `index.lifecycle.management` policy deletes expired documents automatically.
>
> Personalisation: track which skills the user's profile lists; at query time, boost jobs matching the user's skills using a `terms` query with `boost`. Simple but effective for relevance.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Indexing synchronously in write path | "When a product is saved, I'll immediately PUT it to Elasticsearch in the same request" | Two problems: dual-write inconsistency (DB write succeeds, ES write fails → data diverges), and ES latency (typically 50-100ms) added to every write; correct approach is async: write to DB, publish Kafka event, ES indexer consumes asynchronously; accept 1-5s search lag; if ES is down, writes still succeed and ES catches up when it recovers; the source DB is always the source of truth |
| Using text field for filtering | "I'll define category as a text field since it's a string, and filter on it" | Text fields are analyzed (tokenized, lowercased, stemmed) — not suitable for exact-match filters; a category of "Electronics" gets stored as ["electronics"]; filtering for "Electronics" works, but the field is full-text, not keyword; filtering on text fields uses a term query but misses edge cases with whitespace and special chars; keyword fields store exact values, are not analyzed, are faster for filters, and support aggregations (counts per category in facets); use text for search, keyword for filter/aggregate |
| Not handling stale results | "Once a document is indexed it stays accurate" | Products go out of stock, prices change, listings expire; without CDC these changes don't propagate to Elasticsearch; users search for a product, see it listed, click it on the site and find it's unavailable; this is the classic search-results-stale problem; CDC ensures changes propagate in seconds; additionally, the "in-stock" filter at query time (not just at indexing time) provides a fast and accurate last line of defence |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, we built a document search feature for SAP's knowledge base — 2 million technical documents, support notes, and SAPNotes. The initial version used PostgreSQL `ILIKE '%keyword%'` queries. With 10+ words in a search phrase, the query planner fell back to a seq scan — 6-12 seconds. Some searches never returned at all due to query timeouts.
>
> We migrated to Elasticsearch. The full reindex of 2M documents took 45 minutes (one-time). Post-migration, search latency went from 6-12s to 40-80ms. We added a CDC pipeline using Debezium so new documents appeared in search within 3 seconds of creation. We also added synonym expansion — SAP has many abbreviations (SD = Sales & Distribution, MM = Materials Management) — and configured a custom analyzer with these synonyms so searching 'SD module' also matched documents about 'Sales and Distribution'."

---

## 8. Scale Evolution

**1,000 users / 100,000 products →** PostgreSQL full-text search with `tsvector` + GIN index. Single query handles search, filter, and basic ranking with `ts_rank`. No Elasticsearch overhead. Fast enough.

**100,000 users / 5 million products →** Elasticsearch single-node (or 3-node cluster for HA). CDC via Debezium + Kafka. Multi-match query with field boosting. BM25 relevance. Faceted aggregations for category/price filters. 40-80ms search latency.

**10 million users / 100 million products →** Elasticsearch cluster: 20+ data nodes, dedicated master nodes, coordinating nodes. Index lifecycle management (ILM): hot tier (recent) → warm tier → cold tier. Shard splitting for growing index. Separate suggestion index for autocomplete. Learning-to-rank (LTR) plugin for ML-based relevance. Query cache for popular search terms. Read-only mirrors in secondary regions.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Merchant dashboard search (find a transaction by order ID, amount, customer email); searching through millions of payment records; dispute search | Full-text + filter combination; temporal relevance |
| Swiggy / Meesho | Meesho product search across 100M+ SKUs; restaurant search on Swiggy with location + cuisine filter; delivery partner availability search | Geo-point distance filters; multi-language; high write volume |
| Adobe / Microsoft | Adobe Stock search (100M+ assets with visual + keyword search); Microsoft Search (cross-product search across SharePoint, Teams, Outlook); Bing | Multimodal search; semantic search; enterprise knowledge base |
| SAP Labs | Knowledge base search story above; SAPNote search; SAP product documentation search; 2M docs, synonym expansion, Debezium CDC | Real incident; SAP knowledge base specific context |

---

## 10. Related Topics — What to Study Next

- **Topic 311 — Autocomplete Search (Frontend)** — the search box typeahead uses Elasticsearch's `completion` suggester or prefix queries; this topic covers the backend index design; the autocomplete frontend topic covers debounce, caching, and which characters to trigger search on
- **Topic 306 — E-commerce Platform** — search is a major subsystem of e-commerce; the product catalog section there is the write side; this topic is the read side for product search
- **Topic 99 — Kafka Fundamentals** — the CDC pipeline connecting PostgreSQL to Elasticsearch runs on Kafka; understanding consumer groups, partitioning, and lag monitoring is essential for reliable search sync
- **Topic 101 — Redis Data Structures** — search result caching: for a popular search term ("iPhone 14") that returns the same top 20 results, cache the full result in Redis with a 5-minute TTL; reduces ES load by 80% for the most common queries

---

*Part 19 · Search System — Indexing, Relevance, Elasticsearch Basics · Full Stack Interview Guide · Hruday D · 2026*
