# Meesho — SDE-2 FullStack Interview Experience (2025) — #2

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meesho |
| **Role** | SDE-2 |
| **Level** | Senior |
| **YOE** | 4 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/meesho-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + DSA + System Design + HM)
- **Timeline:** 1 week

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Product Catalog with Multi-Level Category Filtering**
   - Category tree (Fashion → Women → Kurtis → Embroidered), breadcrumb, filter by price/size/color

### 💡 Interview-Ready Answer

```java
class CategoryTree {
    String name;
    String id;
    List<CategoryTree> children;
    int productCount; // Products in this + all children
    
    // Build from flat list: [{id, name, parentId}]
    static CategoryTree buildTree(List<CategoryDTO> categories) {
        Map<String, CategoryTree> map = new HashMap<>();
        CategoryTree root = new CategoryTree("Root", "root", new ArrayList<>(), 0);
        map.put("root", root);
        
        // Create all nodes
        for (CategoryDTO cat : categories) {
            map.put(cat.id, new CategoryTree(cat.name, cat.id, new ArrayList<>(), 0));
        }
        
        // Build parent-child relationships
        for (CategoryDTO cat : categories) {
            CategoryTree parent = map.getOrDefault(cat.parentId, root);
            parent.children.add(map.get(cat.id));
        }
        
        return root;
    }
    
    // Get breadcrumb path: Root → Fashion → Women → Kurtis
    static List<String> getBreadcrumb(CategoryTree root, String targetId) {
        List<String> path = new ArrayList<>();
        findPath(root, targetId, path);
        return path;
    }
    
    private static boolean findPath(CategoryTree node, String targetId, List<String> path) {
        path.add(node.name);
        if (node.id.equals(targetId)) return true;
        
        for (CategoryTree child : node.children) {
            if (findPath(child, targetId, path)) return true;
        }
        
        path.remove(path.size() - 1);
        return false;
    }
    
    // Get all descendant category IDs (for filtering products)
    static Set<String> getAllDescendantIds(CategoryTree node) {
        Set<String> ids = new HashSet<>();
        Queue<CategoryTree> queue = new LinkedList<>();
        queue.offer(node);
        
        while (!queue.isEmpty()) {
            CategoryTree curr = queue.poll();
            ids.add(curr.id);
            queue.addAll(curr.children);
        }
        
        return ids;
    }
}

class ProductCatalog {
    private final List<Product> products;
    private final CategoryTree categoryTree;
    
    // Multi-filter search
    List<Product> search(SearchCriteria criteria) {
        Stream<Product> stream = products.stream();
        
        // Category filter (include all descendants)
        if (criteria.categoryId != null) {
            CategoryTree catNode = findCategory(categoryTree, criteria.categoryId);
            Set<String> categoryIds = CategoryTree.getAllDescendantIds(catNode);
            stream = stream.filter(p -> categoryIds.contains(p.categoryId));
        }
        
        // Price range
        if (criteria.minPrice != null) {
            stream = stream.filter(p -> p.price >= criteria.minPrice);
        }
        if (criteria.maxPrice != null) {
            stream = stream.filter(p -> p.price <= criteria.maxPrice);
        }
        
        // Size filter (multi-select)
        if (criteria.sizes != null && !criteria.sizes.isEmpty()) {
            stream = stream.filter(p -> criteria.sizes.stream().anyMatch(p.availableSizes::contains));
        }
        
        // Color filter
        if (criteria.colors != null && !criteria.colors.isEmpty()) {
            stream = stream.filter(p -> criteria.colors.contains(p.color));
        }
        
        // Rating filter
        if (criteria.minRating != null) {
            stream = stream.filter(p -> p.rating >= criteria.minRating);
        }
        
        // Sort
        Comparator<Product> comparator = switch (criteria.sortBy) {
            case PRICE_LOW_HIGH -> Comparator.comparingDouble(Product::price);
            case PRICE_HIGH_LOW -> Comparator.comparingDouble(Product::price).reversed();
            case RATING -> Comparator.comparingDouble(Product::rating).reversed();
            case NEWEST -> Comparator.comparing(Product::createdAt).reversed();
            case POPULARITY -> Comparator.comparingInt(Product::salesCount).reversed();
            default -> Comparator.comparingDouble(Product::rating).reversed();
        };
        
        return stream.sorted(comparator)
            .skip(criteria.page * criteria.pageSize)
            .limit(criteria.pageSize)
            .collect(Collectors.toList());
    }
    
    // Get facet counts (for filter sidebar)
    Map<String, Map<String, Integer>> getFacetCounts(String categoryId) {
        Set<String> catIds = CategoryTree.getAllDescendantIds(findCategory(categoryTree, categoryId));
        List<Product> filtered = products.stream()
            .filter(p -> catIds.contains(p.categoryId))
            .toList();
        
        Map<String, Map<String, Integer>> facets = new HashMap<>();
        
        // Size facet
        Map<String, Integer> sizeCounts = new HashMap<>();
        for (Product p : filtered) {
            for (String size : p.availableSizes) {
                sizeCounts.merge(size, 1, Integer::sum);
            }
        }
        facets.put("size", sizeCounts);
        
        // Color facet
        Map<String, Integer> colorCounts = new HashMap<>();
        for (Product p : filtered) {
            colorCounts.merge(p.color, 1, Integer::sum);
        }
        facets.put("color", colorCounts);
        
        // Price range facet
        Map<String, Integer> priceRanges = new TreeMap<>();
        for (Product p : filtered) {
            String range = getPriceRange(p.price);
            priceRanges.merge(range, 1, Integer::sum);
        }
        facets.put("price", priceRanges);
        
        return facets;
    }
    
    private String getPriceRange(double price) {
        if (price < 200) return "Under ₹200";
        if (price < 500) return "₹200 - ₹500";
        if (price < 1000) return "₹500 - ₹1000";
        return "Above ₹1000";
    }
    
    record Product(String id, String name, double price, String categoryId,
                   List<String> availableSizes, String color, double rating,
                   int salesCount, Instant createdAt) {}
}
```

---

## Round 2: DSA
**Duration:** 60 minutes

### Questions Asked
1. **Design a Cache with LFU Eviction** (LeetCode 460)

### 💡 LFU Cache

```java
class LFUCache {
    private final int capacity;
    private int minFreq;
    private final Map<Integer, int[]> keyMap;       // key → [value, freq]
    private final Map<Integer, LinkedHashSet<Integer>> freqMap; // freq → keys (insertion order)
    
    public LFUCache(int capacity) {
        this.capacity = capacity;
        this.minFreq = 0;
        this.keyMap = new HashMap<>();
        this.freqMap = new HashMap<>();
    }
    
    public int get(int key) {
        if (!keyMap.containsKey(key)) return -1;
        
        int[] entry = keyMap.get(key);
        int val = entry[0], freq = entry[1];
        
        // Update frequency
        freqMap.get(freq).remove(key);
        if (freqMap.get(freq).isEmpty()) {
            freqMap.remove(freq);
            if (minFreq == freq) minFreq++;
        }
        
        entry[1] = freq + 1;
        freqMap.computeIfAbsent(freq + 1, k -> new LinkedHashSet<>()).add(key);
        
        return val;
    }
    
    public void put(int key, int value) {
        if (capacity <= 0) return;
        
        if (keyMap.containsKey(key)) {
            keyMap.get(key)[0] = value;
            get(key); // Update frequency
            return;
        }
        
        if (keyMap.size() >= capacity) {
            // Evict LFU (among ties, evict LRU — LinkedHashSet gives insertion order)
            LinkedHashSet<Integer> minFreqKeys = freqMap.get(minFreq);
            int evictKey = minFreqKeys.iterator().next(); // First = oldest
            minFreqKeys.remove(evictKey);
            if (minFreqKeys.isEmpty()) freqMap.remove(minFreq);
            keyMap.remove(evictKey);
        }
        
        keyMap.put(key, new int[]{value, 1});
        freqMap.computeIfAbsent(1, k -> new LinkedHashSet<>()).add(key);
        minFreq = 1;
    }
}
// All operations O(1)
```

---

## Round 3: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Meesho's Social Commerce Platform**
   - Reseller workflow: browse catalog → share on WhatsApp → customer orders → reseller earns margin

### 💡 Interview-Ready Answer

```
Meesho Social Commerce:
┌──────────────────────────────────────────────────────────────┐
│  Unique Model: Resellers share products on WhatsApp/Instagram│
│  → Customers order via reseller's link → Meesho fulfills    │
│  → Reseller earns margin                                     │
│                                                                │
│  Catalog Service:                                             │
│  - 100M+ products from suppliers                             │
│  - Reseller sees: product + base price + their margin slider │
│  - Share generates: product page link + reseller attribution │
│  - Deep link: works in WhatsApp, Instagram, Facebook         │
│                                                                │
│  Attribution & Commission:                                    │
│  - Share link: meesho.com/p/{product_id}?ref={reseller_id}  │
│  - Cookie-based attribution (30 day window)                  │
│  - Commission = selling_price - base_price                   │
│  - Anti-fraud: detect self-ordering, fake referrals          │
│     - IP matching, device fingerprint, order patterns        │
│                                                                │
│  Order Flow:                                                  │
│  1. Customer clicks reseller's shared link                   │
│  2. Views product at reseller's set price                    │
│  3. Places order → payment (COD 70% in India)               │
│  4. Meesho sends order to supplier                           │
│  5. Supplier ships → Meesho logistics → customer             │
│  6. After delivery confirmed:                                │
│     Commission credited to reseller wallet                   │
│                                                                │
│  Architecture:                                                │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐       │
│  │ Reseller   │  │ Catalog       │  │ Order Service    │       │
│  │ App        │─▶│ Service       │─▶│                  │       │
│  │            │  │               │  │ Supplier Notif   │       │
│  │ Share →    │  │ Product CRUD  │  │ Logistics Track  │       │
│  │ WhatsApp   │  │ Price+Margin  │  │ Commission Calc  │       │
│  └──────────┘  └──────────────┘  └──────────────────┘       │
│                                                                │
│  Challenges:                                                  │
│  - COD success rate only ~60% (high returns) → ML model to  │
│    predict COD failure and show payment options accordingly  │
│  - Vernacular support: Hindi, Tamil, Telugu UI + search      │
│  - Low-end devices: PWA, aggressive code splitting,          │
│    < 1MB initial JS bundle, LQIP images                      │
│  - Supplier quality: automated image quality check,          │
│    return rate tracking → delist bad suppliers               │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Meesho = **social commerce + India-specific challenges** (COD, vernacular, low-end devices)
- **Category tree** with breadcrumb + descendant filtering — core e-commerce pattern
- **Faceted search** with counts — show available filter options with product counts
- **LFU Cache** = keyMap + freqMap with LinkedHashSet for O(1) operations
- **Social commerce attribution** via deep links + cookie-based tracking
- **COD (Cash on Delivery)** = 70% of Indian e-commerce orders — must handle non-delivery
- Meesho values **scalability for India** — PWA, offline, low-bandwidth optimization

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Medium-Hard | Category Tree, Faceted Search |
| DSA | Hard | LFU Cache, HashMap + LinkedHashSet |
| System Design | Hard | Social Commerce, Attribution, COD |
| HM | Medium | Behavioral |
