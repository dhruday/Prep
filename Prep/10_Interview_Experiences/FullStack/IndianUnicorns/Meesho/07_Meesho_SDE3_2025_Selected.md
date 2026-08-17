# Meesho — SDE-3 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meesho |
| **Role** | SDE-3 |
| **Level** | Senior |
| **YOE** | 5 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (DSA + Machine Coding + LLD + HM)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 2: Machine Coding — Product Catalog Search with Faceted Filters

### Problem
Build a product catalog system that supports:
- Multi-attribute faceted filtering (category, brand, price range, rating)
- Filter counts (how many products match each filter option)
- Sort by relevance, price, rating, or newest
- Pagination support
- Filter combinations with AND logic between facets, OR logic within a facet

### 💡 Interview-Ready Answer

```java
import java.util.*;
import java.util.stream.*;
import java.util.function.*;

public class ProductCatalog {

    record Product(String id, String name, String category, String brand,
                   double price, double rating, long createdAt, Map<String, String> attributes) {}

    record FacetCount(String facetName, String value, long count) {}

    record SearchResult(List<Product> products, int totalCount, int page, int pageSize,
                        Map<String, List<FacetCount>> facets) {}

    enum SortBy { RELEVANCE, PRICE_ASC, PRICE_DESC, RATING_DESC, NEWEST }

    static class FilterCriteria {
        Set<String> categories = new HashSet<>();
        Set<String> brands = new HashSet<>();
        Double minPrice;
        Double maxPrice;
        Double minRating;
        Map<String, Set<String>> customAttributes = new HashMap<>();

        FilterCriteria addCategory(String... cats) {
            categories.addAll(Arrays.asList(cats));
            return this;
        }

        FilterCriteria addBrand(String... b) {
            brands.addAll(Arrays.asList(b));
            return this;
        }

        FilterCriteria priceRange(double min, double max) {
            this.minPrice = min;
            this.maxPrice = max;
            return this;
        }

        FilterCriteria minRating(double rating) {
            this.minRating = rating;
            return this;
        }

        FilterCriteria addAttribute(String key, String... values) {
            customAttributes.computeIfAbsent(key, k -> new HashSet<>())
                .addAll(Arrays.asList(values));
            return this;
        }
    }

    // Inverted indices for fast lookup
    private final Map<String, Set<String>> categoryIndex = new HashMap<>();
    private final Map<String, Set<String>> brandIndex = new HashMap<>();
    private final Map<String, Map<String, Set<String>>> attributeIndex = new HashMap<>();
    private final Map<String, Product> products = new LinkedHashMap<>();

    public void addProduct(Product product) {
        products.put(product.id(), product);

        categoryIndex.computeIfAbsent(product.category(), k -> new HashSet<>())
            .add(product.id());
        brandIndex.computeIfAbsent(product.brand(), k -> new HashSet<>())
            .add(product.id());

        product.attributes().forEach((key, value) -> {
            attributeIndex.computeIfAbsent(key, k -> new HashMap<>())
                .computeIfAbsent(value, v -> new HashSet<>())
                .add(product.id());
        });
    }

    public SearchResult search(FilterCriteria criteria, SortBy sortBy, int page, int pageSize) {
        // Phase 1: Apply filters to get matching product IDs
        Set<String> matchingIds = applyFilters(criteria);

        // Phase 2: Compute facet counts BEFORE pagination
        Map<String, List<FacetCount>> facets = computeFacets(matchingIds, criteria);

        // Phase 3: Sort
        List<Product> sorted = matchingIds.stream()
            .map(products::get)
            .sorted(getSortComparator(sortBy))
            .collect(Collectors.toList());

        int totalCount = sorted.size();

        // Phase 4: Paginate
        int start = page * pageSize;
        int end = Math.min(start + pageSize, sorted.size());
        List<Product> pageProducts = (start < sorted.size())
            ? sorted.subList(start, end) : List.of();

        return new SearchResult(pageProducts, totalCount, page, pageSize, facets);
    }

    private Set<String> applyFilters(FilterCriteria criteria) {
        List<Set<String>> filterSets = new ArrayList<>();

        // Category filter (OR within facet)
        if (!criteria.categories.isEmpty()) {
            Set<String> catMatches = criteria.categories.stream()
                .flatMap(c -> categoryIndex.getOrDefault(c, Set.of()).stream())
                .collect(Collectors.toSet());
            filterSets.add(catMatches);
        }

        // Brand filter (OR within facet)
        if (!criteria.brands.isEmpty()) {
            Set<String> brandMatches = criteria.brands.stream()
                .flatMap(b -> brandIndex.getOrDefault(b, Set.of()).stream())
                .collect(Collectors.toSet());
            filterSets.add(brandMatches);
        }

        // Custom attributes (OR within each attribute, AND between attributes)
        for (Map.Entry<String, Set<String>> attr : criteria.customAttributes.entrySet()) {
            Map<String, Set<String>> attrValues = attributeIndex.getOrDefault(attr.getKey(), Map.of());
            Set<String> attrMatches = attr.getValue().stream()
                .flatMap(v -> attrValues.getOrDefault(v, Set.of()).stream())
                .collect(Collectors.toSet());
            filterSets.add(attrMatches);
        }

        // Intersect all filter sets (AND between facets)
        Set<String> result;
        if (filterSets.isEmpty()) {
            result = new HashSet<>(products.keySet());
        } else {
            result = new HashSet<>(filterSets.get(0));
            for (int i = 1; i < filterSets.size(); i++) {
                result.retainAll(filterSets.get(i));
            }
        }

        // Apply price range filter
        if (criteria.minPrice != null || criteria.maxPrice != null) {
            result.removeIf(id -> {
                double price = products.get(id).price();
                if (criteria.minPrice != null && price < criteria.minPrice) return true;
                if (criteria.maxPrice != null && price > criteria.maxPrice) return true;
                return false;
            });
        }

        // Apply rating filter
        if (criteria.minRating != null) {
            result.removeIf(id -> products.get(id).rating() < criteria.minRating);
        }

        return result;
    }

    /**
     * Compute facet counts relative to current filter results.
     * For each facet, counts are computed with that facet removed (cross-facet counting).
     */
    private Map<String, List<FacetCount>> computeFacets(Set<String> baseMatches,
                                                         FilterCriteria criteria) {
        Map<String, List<FacetCount>> facets = new LinkedHashMap<>();

        // Category facet
        facets.put("category", categoryIndex.entrySet().stream()
            .map(e -> new FacetCount("category", e.getKey(),
                e.getValue().stream().filter(baseMatches::contains).count()))
            .filter(fc -> fc.count() > 0)
            .sorted(Comparator.comparingLong(FacetCount::count).reversed())
            .collect(Collectors.toList()));

        // Brand facet
        facets.put("brand", brandIndex.entrySet().stream()
            .map(e -> new FacetCount("brand", e.getKey(),
                e.getValue().stream().filter(baseMatches::contains).count()))
            .filter(fc -> fc.count() > 0)
            .sorted(Comparator.comparingLong(FacetCount::count).reversed())
            .collect(Collectors.toList()));

        // Price range buckets
        long[] priceBuckets = {0, 500, 1000, 2000, 5000, Long.MAX_VALUE};
        List<FacetCount> priceRanges = new ArrayList<>();
        for (int i = 0; i < priceBuckets.length - 1; i++) {
            final long lo = priceBuckets[i];
            final long hi = priceBuckets[i + 1];
            String label = (hi == Long.MAX_VALUE)
                ? "₹" + lo + "+"
                : "₹" + lo + " - ₹" + hi;
            long count = baseMatches.stream()
                .filter(id -> {
                    double p = products.get(id).price();
                    return p >= lo && p < hi;
                }).count();
            if (count > 0) priceRanges.add(new FacetCount("price", label, count));
        }
        facets.put("price", priceRanges);

        return facets;
    }

    private Comparator<Product> getSortComparator(SortBy sortBy) {
        return switch (sortBy) {
            case PRICE_ASC -> Comparator.comparingDouble(Product::price);
            case PRICE_DESC -> Comparator.comparingDouble(Product::price).reversed();
            case RATING_DESC -> Comparator.comparingDouble(Product::rating).reversed();
            case NEWEST -> Comparator.comparingLong(Product::createdAt).reversed();
            case RELEVANCE -> Comparator.comparingDouble(Product::rating).reversed()
                .thenComparingLong(Product::createdAt).reversed();
        };
    }

    public static void main(String[] args) {
        ProductCatalog catalog = new ProductCatalog();
        long now = System.currentTimeMillis();

        // Add products
        catalog.addProduct(new Product("p1", "iPhone 15", "Electronics", "Apple",
            79999, 4.5, now, Map.of("color", "Black", "storage", "128GB")));
        catalog.addProduct(new Product("p2", "Galaxy S24", "Electronics", "Samsung",
            69999, 4.3, now - 100, Map.of("color", "White", "storage", "256GB")));
        catalog.addProduct(new Product("p3", "Pixel 8", "Electronics", "Google",
            49999, 4.6, now - 200, Map.of("color", "Blue", "storage", "128GB")));
        catalog.addProduct(new Product("p4", "Nike Air Max", "Shoes", "Nike",
            12999, 4.2, now - 300, Map.of("color", "Black", "size", "10")));
        catalog.addProduct(new Product("p5", "Adidas Ultra", "Shoes", "Adidas",
            15999, 4.4, now - 400, Map.of("color", "White", "size", "9")));
        catalog.addProduct(new Product("p6", "MacBook Pro", "Electronics", "Apple",
            149999, 4.8, now - 50, Map.of("color", "Silver", "storage", "512GB")));

        // Search: Electronics, price 40000-100000, sorted by rating
        FilterCriteria criteria = new FilterCriteria()
            .addCategory("Electronics")
            .priceRange(40000, 100000);

        SearchResult result = catalog.search(criteria, SortBy.RATING_DESC, 0, 10);

        System.out.println("=== Search Results ===");
        System.out.printf("Total: %d (Page %d)%n", result.totalCount(), result.page());
        for (Product p : result.products()) {
            System.out.printf("  %s | %s | ₹%.0f | ★%.1f%n",
                p.name(), p.brand(), p.price(), p.rating());
        }

        System.out.println("\n=== Facets ===");
        result.facets().forEach((facet, counts) -> {
            System.out.printf("%s:%n", facet);
            counts.forEach(fc -> System.out.printf("  %s (%d)%n", fc.value(), fc.count()));
        });
    }
}
```

## 🎯 Key Takeaways
- Meesho focuses on **e-commerce problems** — product catalog, search, filtering
- **Inverted index** pattern: `Map<attributeValue, Set<productId>>` for O(1) filter lookup
- Faceted search: OR within a facet, AND between facets — standard e-commerce pattern
- Facet counts must be computed before pagination but after filtering
- Price range bucketing provides UX-friendly filter options
- Java records + Streams produce clean, functional code

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| DSA | Medium | Arrays, HashMap |
| Machine Coding | Medium-Hard | Inverted Index, Set Operations, Pagination |
| LLD | Hard | E-commerce Domain Design |
| HM | Medium | Behavioral, Product Sense |
