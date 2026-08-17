# Zomato — SDE-3 FullStack Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Zomato |
| **Role** | SDE-3 |
| **Level** | Lead |
| **YOE** | 7 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Gurugram, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/zomato-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Machine Coding + DSA + LLD + System Design + HM)
- **Timeline:** 2 weeks

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Restaurant Search with Filters (Like Zomato's Home Page)**
   - Search by name, cuisine, location
   - Filters: price range, rating, dietary (veg/non-veg/vegan), delivery time
   - Sort: rating, delivery time, cost for two, popularity
   - Debounced search with recent searches

### 💡 Interview-Ready Answer

```java
class RestaurantSearchEngine {
    private final Map<String, Restaurant> restaurants;
    private final Map<String, Set<String>> cuisineIndex; // cuisine → restaurant IDs
    private final Map<String, Set<String>> locationIndex; // area → restaurant IDs
    private final NavigableMap<Integer, Set<String>> ratingIndex; // rating bucket → IDs
    private final TrieNode searchTrie; // For prefix-based search
    
    record Restaurant(String id, String name, List<String> cuisines,
                       String area, double rating, int deliveryTimeMinutes,
                       int costForTwo, DietaryType dietary, boolean isOpen, int popularity) {}
    
    enum DietaryType { VEG, NON_VEG, VEGAN, PURE_VEG }
    
    record SearchFilters(String query, List<String> cuisines, String area,
                         int minRating, int maxCostForTwo, int maxDeliveryTime,
                         DietaryType dietary, boolean onlyOpen, SortBy sortBy) {}
    
    enum SortBy { RATING_DESC, DELIVERY_TIME_ASC, COST_LOW_TO_HIGH, COST_HIGH_TO_LOW, POPULARITY }
    
    List<Restaurant> search(SearchFilters filters) {
        Set<String> candidates = null;
        
        // 1. Text search (name prefix)
        if (filters.query != null && !filters.query.isEmpty()) {
            candidates = searchByPrefix(filters.query.toLowerCase());
        }
        
        // 2. Apply cuisine filter
        if (filters.cuisines != null && !filters.cuisines.isEmpty()) {
            Set<String> cuisineMatches = new HashSet<>();
            for (String cuisine : filters.cuisines) {
                cuisineMatches.addAll(cuisineIndex.getOrDefault(cuisine.toLowerCase(), Set.of()));
            }
            candidates = intersect(candidates, cuisineMatches);
        }
        
        // 3. Apply location filter
        if (filters.area != null) {
            Set<String> areaMatches = locationIndex.getOrDefault(filters.area.toLowerCase(), Set.of());
            candidates = intersect(candidates, areaMatches);
        }
        
        // 4. Stream-based filtering for remaining criteria
        Stream<Restaurant> stream = (candidates != null ? candidates : restaurants.keySet())
            .stream()
            .map(restaurants::get)
            .filter(Objects::nonNull);
        
        // Apply filters
        if (filters.minRating > 0) {
            stream = stream.filter(r -> r.rating >= filters.minRating);
        }
        if (filters.maxCostForTwo > 0) {
            stream = stream.filter(r -> r.costForTwo <= filters.maxCostForTwo);
        }
        if (filters.maxDeliveryTime > 0) {
            stream = stream.filter(r -> r.deliveryTimeMinutes <= filters.maxDeliveryTime);
        }
        if (filters.dietary != null) {
            stream = stream.filter(r -> r.dietary == filters.dietary || 
                (filters.dietary == DietaryType.VEG && r.dietary == DietaryType.PURE_VEG));
        }
        if (filters.onlyOpen) {
            stream = stream.filter(Restaurant::isOpen);
        }
        
        // Apply sorting
        Comparator<Restaurant> comparator = switch (filters.sortBy) {
            case RATING_DESC -> Comparator.comparingDouble(Restaurant::rating).reversed();
            case DELIVERY_TIME_ASC -> Comparator.comparingInt(Restaurant::deliveryTimeMinutes);
            case COST_LOW_TO_HIGH -> Comparator.comparingInt(Restaurant::costForTwo);
            case COST_HIGH_TO_LOW -> Comparator.comparingInt(Restaurant::costForTwo).reversed();
            case POPULARITY -> Comparator.comparingInt(Restaurant::popularity).reversed();
            case null -> Comparator.comparingInt(Restaurant::popularity).reversed();
        };
        
        return stream.sorted(comparator).limit(20).toList();
    }
    
    private Set<String> intersect(Set<String> a, Set<String> b) {
        if (a == null) return b;
        Set<String> result = new HashSet<>(a);
        result.retainAll(b);
        return result;
    }
    
    // Trie-based prefix search
    private Set<String> searchByPrefix(String prefix) {
        TrieNode node = searchTrie;
        for (char c : prefix.toCharArray()) {
            node = node.children.get(c);
            if (node == null) return Set.of();
        }
        return collectAllRestaurantIds(node);
    }
}
```

---

## Round 2: DSA
**Duration:** 60 minutes

### Questions Asked
1. **Minimum Cost to Connect All Points** (LeetCode 1584) — Kruskal's MST
2. **Follow-up: What if some points are already connected?**

### 💡 MST with Kruskal's

```java
public int minCostConnectPoints(int[][] points) {
    int n = points.length;
    
    // Build edges with Manhattan distances
    List<int[]> edges = new ArrayList<>(); // {cost, i, j}
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            int cost = Math.abs(points[i][0] - points[j][0]) + Math.abs(points[i][1] - points[j][1]);
            edges.add(new int[]{cost, i, j});
        }
    }
    
    // Sort by cost
    edges.sort(Comparator.comparingInt(e -> e[0]));
    
    // Kruskal's with Union-Find
    int[] parent = new int[n];
    int[] rank = new int[n];
    for (int i = 0; i < n; i++) parent[i] = i;
    
    int totalCost = 0;
    int edgesUsed = 0;
    
    for (int[] edge : edges) {
        if (edgesUsed == n - 1) break;
        
        int px = find(parent, edge[1]);
        int py = find(parent, edge[2]);
        
        if (px != py) {
            union(parent, rank, px, py);
            totalCost += edge[0];
            edgesUsed++;
        }
    }
    
    return totalCost;
}

private int find(int[] parent, int x) {
    if (parent[x] != x) parent[x] = find(parent, parent[x]); // Path compression
    return parent[x];
}

private void union(int[] parent, int[] rank, int x, int y) {
    if (rank[x] < rank[y]) { parent[x] = y; }
    else if (rank[x] > rank[y]) { parent[y] = x; }
    else { parent[y] = x; rank[x]++; }
}
// Time: O(n² log n) — n² edges sorted
// Space: O(n²) for edge list

// Follow-up: Some points already connected
// Pre-union the already-connected points, then run Kruskal's normally
// Skip edges that connect already-connected components
```

---

## Round 3: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Zomato's Restaurant Discovery & Recommendation System**

### 💡 Key Architecture Points

```
Zomato Discovery System:
┌──────────────────────────────────────────────────────────────┐
│  Search: Elasticsearch for restaurant catalog                │
│  - Full-text search on name, cuisine, dishes                │
│  - Geo-distance query: restaurants within X km              │
│  - Faceted aggregations for filter counts                   │
│  - Analyzer: edge_ngram for partial matching ("dom" → Dominos)│
│                                                                │
│  Recommendations:                                             │
│  1. Collaborative Filtering:                                  │
│     "Users who ordered from A also ordered from B"           │
│     Matrix factorization (ALS) on user-restaurant matrix     │
│                                                                │
│  2. Content-Based:                                            │
│     Restaurant features: cuisine, price, rating, dietary     │
│     User preferences: order history, saved, reviewed         │
│     Cosine similarity between user profile and restaurant    │
│                                                                │
│  3. Contextual:                                               │
│     Time of day: breakfast spots at 8am, bars at 9pm         │
│     Weather: hot soup on rainy days, ice cream on sunny      │
│     Zone/area popularity: trending near user's location      │
│                                                                │
│  Ranking Pipeline:                                            │
│  Candidate Gen → Filtering → Ranking → Re-ranking            │
│  1. Candidate Gen: ES query + CF + Content-based (top 200)   │
│  2. Filtering: open now, delivers to user, dietary prefs     │
│  3. Ranking: ML model (XGBoost) with features:               │
│     - Restaurant: rating, order count, preparation time      │
│     - User: past orders, cuisine preference, avg spend       │
│     - Context: time, location, weather, day of week          │
│  4. Re-ranking: boost promoted restaurants, diversity         │
│     (don't show 10 pizza places → at least 5 different       │
│     cuisines in top 10)                                       │
│                                                                │
│  Scale:                                                       │
│  - 350K+ restaurant partners                                │
│  - 20M+ monthly active users                                │
│  - Search latency: <200ms P99                                │
│  - Recommendation refresh: real-time for context, daily for CF│
│                                                                │
│  Caching:                                                     │
│  - Location-based cache: popular restaurants per zone         │
│  - User preference cache: Redis (cuisine weights, diet)      │
│  - Search result cache: query + location hash → 5 min TTL    │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Zomato SDE-3 = **food-tech domain** + search + recommendations
- **Restaurant Search**: Trie for prefix, inverted index for cuisines, Elasticsearch for full-text
- **Filter chaining**: intersect candidate sets from each index before final filtering
- **Kruskal's MST**: sort edges + Union-Find with path compression — O(E log E)
- **Recommendation pipeline**: Candidate Gen → Filter → Rank (ML) → Re-rank (diversity)
- **Diversity re-ranking**: prevent showing too many restaurants of same cuisine type
- **Contextual recommendations**: time of day, weather, location trending
- Zomato values: **food-tech domain knowledge** + ability to handle scale

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Hard | Search Engine, Trie, Inverted Index |
| DSA | Medium-Hard | MST, Kruskal's, Union-Find |
| System Design | Very Hard | Recommendation Engine, Elasticsearch, ML Ranking |
| HM | Medium | Behavioral, Leadership |
