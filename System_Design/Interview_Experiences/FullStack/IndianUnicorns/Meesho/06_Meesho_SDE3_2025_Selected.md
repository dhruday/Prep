# Meesho — SDE-3 FullStack Interview Experience (2025) — #6

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meesho |
| **Role** | SDE-3 |
| **Level** | Senior |
| **YOE** | 6 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/meesho-interview-experience/) |
| **Author** | Anonymous |
| **Team** | Catalog |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + System Design + HM)

---

## Round 2: Machine Coding — Build a Product Catalog Deduplication Engine
**Duration:** 90 minutes

### Challenge: Build an engine that detects and clusters duplicate/near-duplicate products from different sellers. Products may have slightly different titles, prices, and images but refer to the same item.

```java
import java.util.*;

/**
 * Catalog Deduplication Engine:
 * 
 * Problem: Multiple sellers upload the same product with different titles/prices/images.
 * Goal: Cluster near-duplicate products into "canonical products."
 * 
 * Approach:
 * 1. Text similarity: Jaccard on word n-grams (title)
 * 2. Attribute matching: exact match on brand + category
 * 3. Price proximity: within ±20% of median
 * 4. Composite score → threshold → Union-Find clustering
 * 
 * Time: O(N²) pairwise comparison (with blocking optimization)
 */

class Product {
    String id;
    String title;
    String brand;
    String category;
    double price;
    String sellerId;
    Map<String, String> attributes; // color, size, material, etc.
    
    Product(String id, String title, String brand, String category, double price, String sellerId) {
        this.id = id; this.title = title; this.brand = brand;
        this.category = category; this.price = price; this.sellerId = sellerId;
        this.attributes = new HashMap<>();
    }
}

class DuplicateCluster {
    String canonicalId; // Best product in cluster
    List<Product> products;
    double confidence; // 0-1
    
    DuplicateCluster(Product canonical) {
        this.canonicalId = canonical.id;
        this.products = new ArrayList<>();
        this.products.add(canonical);
    }
}

class DeduplicationEngine {
    
    // Configurable thresholds
    private double titleSimilarityThreshold = 0.6;
    private double priceProximityThreshold = 0.2; // ±20%
    private double compositeThreshold = 0.65;
    
    // Weights for composite score
    private double titleWeight = 0.5;
    private double brandWeight = 0.2;
    private double priceWeight = 0.2;
    private double attributeWeight = 0.1;
    
    /**
     * Detect duplicate clusters.
     * 
     * Optimization: blocking by (brand, category) — only compare products within same block.
     * Reduces O(N²) to O(N²/B) where B = number of blocks.
     */
    public List<DuplicateCluster> deduplicate(List<Product> products) {
        // Step 1: Block by brand + category (only compare within same block)
        Map<String, List<Product>> blocks = new HashMap<>();
        for (Product p : products) {
            String blockKey = normalize(p.brand) + "|" + normalize(p.category);
            blocks.computeIfAbsent(blockKey, k -> new ArrayList<>()).add(p);
        }
        
        // Step 2: Pairwise similarity within each block → Union-Find clustering
        UnionFind uf = new UnionFind(products.size());
        Map<String, Integer> idToIdx = new HashMap<>();
        for (int i = 0; i < products.size(); i++) {
            idToIdx.put(products.get(i).id, i);
        }
        
        for (List<Product> block : blocks.values()) {
            for (int i = 0; i < block.size(); i++) {
                for (int j = i + 1; j < block.size(); j++) {
                    double sim = compositeScore(block.get(i), block.get(j));
                    
                    if (sim >= compositeThreshold) {
                        int idx1 = idToIdx.get(block.get(i).id);
                        int idx2 = idToIdx.get(block.get(j).id);
                        uf.union(idx1, idx2);
                    }
                }
            }
        }
        
        // Step 3: Build clusters from Union-Find
        Map<Integer, List<Product>> clusters = new HashMap<>();
        for (Product p : products) {
            int root = uf.find(idToIdx.get(p.id));
            clusters.computeIfAbsent(root, k -> new ArrayList<>()).add(p);
        }
        
        // Step 4: Select canonical product per cluster (highest rating/most info)
        List<DuplicateCluster> result = new ArrayList<>();
        
        for (List<Product> cluster : clusters.values()) {
            if (cluster.size() < 2) continue; // Singletons are not duplicates
            
            // Select canonical: longest title (usually most descriptive)
            cluster.sort((a, b) -> b.title.length() - a.title.length());
            Product canonical = cluster.get(0);
            
            DuplicateCluster dc = new DuplicateCluster(canonical);
            for (int i = 1; i < cluster.size(); i++) {
                dc.products.add(cluster.get(i));
            }
            
            // Calculate average pairwise confidence
            double totalSim = 0; int pairs = 0;
            for (int i = 0; i < cluster.size(); i++) {
                for (int j = i + 1; j < cluster.size(); j++) {
                    totalSim += compositeScore(cluster.get(i), cluster.get(j));
                    pairs++;
                }
            }
            dc.confidence = pairs > 0 ? totalSim / pairs : 0;
            
            result.add(dc);
        }
        
        // Sort by cluster size descending
        result.sort((a, b) -> b.products.size() - a.products.size());
        
        return result;
    }
    
    /**
     * Composite similarity score between two products.
     */
    double compositeScore(Product a, Product b) {
        double titleSim = titleSimilarity(a.title, b.title);
        double brandSim = normalize(a.brand).equals(normalize(b.brand)) ? 1.0 : 0.0;
        double priceSim = priceSimilarity(a.price, b.price);
        double attrSim = attributeSimilarity(a.attributes, b.attributes);
        
        return titleWeight * titleSim + brandWeight * brandSim + 
               priceWeight * priceSim + attributeWeight * attrSim;
    }
    
    /**
     * Title similarity using Jaccard on word bigrams.
     * Bigrams capture word order, more robust than unigrams.
     */
    double titleSimilarity(String a, String b) {
        Set<String> bigramsA = wordBigrams(normalize(a));
        Set<String> bigramsB = wordBigrams(normalize(b));
        
        if (bigramsA.isEmpty() && bigramsB.isEmpty()) return 1.0;
        
        long intersection = bigramsA.stream().filter(bigramsB::contains).count();
        long union = bigramsA.size() + bigramsB.size() - intersection;
        
        return union > 0 ? (double) intersection / union : 0.0;
    }
    
    Set<String> wordBigrams(String text) {
        String[] words = text.split("\\s+");
        Set<String> bigrams = new HashSet<>();
        
        for (int i = 0; i < words.length - 1; i++) {
            bigrams.add(words[i] + " " + words[i + 1]);
        }
        
        // Also add unigrams for short titles
        if (words.length <= 3) {
            bigrams.addAll(Arrays.asList(words));
        }
        
        return bigrams;
    }
    
    double priceSimilarity(double a, double b) {
        if (a == 0 && b == 0) return 1.0;
        double maxPrice = Math.max(a, b);
        if (maxPrice == 0) return 0.0;
        
        double diff = Math.abs(a - b) / maxPrice;
        return diff <= priceProximityThreshold ? 1.0 - diff : 0.0;
    }
    
    double attributeSimilarity(Map<String, String> a, Map<String, String> b) {
        if (a.isEmpty() && b.isEmpty()) return 0.5; // Neutral
        
        Set<String> commonKeys = new HashSet<>(a.keySet());
        commonKeys.retainAll(b.keySet());
        
        if (commonKeys.isEmpty()) return 0.5; // No common attributes to compare
        
        long matching = commonKeys.stream()
            .filter(k -> normalize(a.get(k)).equals(normalize(b.get(k))))
            .count();
        
        return (double) matching / commonKeys.size();
    }
    
    String normalize(String text) {
        if (text == null) return "";
        return text.toLowerCase().trim()
            .replaceAll("[^a-z0-9\\s]", "")
            .replaceAll("\\s+", " ");
    }
    
    // ---- Union-Find ----
    
    static class UnionFind {
        int[] parent, rank;
        
        UnionFind(int n) {
            parent = new int[n]; rank = new int[n];
            for (int i = 0; i < n; i++) parent[i] = i;
        }
        
        int find(int x) {
            if (parent[x] != x) parent[x] = find(parent[x]);
            return parent[x];
        }
        
        void union(int x, int y) {
            int px = find(x), py = find(y);
            if (px == py) return;
            if (rank[px] < rank[py]) { int t = px; px = py; py = t; }
            parent[py] = px;
            if (rank[px] == rank[py]) rank[px]++;
        }
    }
}
```

---

## 🎯 Key Takeaways
- Meesho SDE-3 = **Product deduplication — text similarity + Union-Find clustering**
- **Blocking**: only compare products within same `(brand, category)` block — massive speedup
- **Word bigrams**: capture word order — "cotton shirt" vs "shirt cotton" score differently
- **Composite score**: title (50%) + brand (20%) + price (20%) + attributes (10%)
- **Union-Find clustering**: if A~B and B~C, then A,B,C in same cluster — transitive dedup
- **Canonical selection**: longest title = most descriptive — shown to buyers
- **Price similarity**: within ±20% — same product from different sellers at different prices
- **Normalize**: lowercase + remove special chars + trim — reduces false negatives
- Meesho = **social commerce** — millions of seller-uploaded products, dedup prevents catalog bloat

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding (this) | Very Hard | NLP, Similarity, Union-Find |
| System Design | Very Hard | Product Catalog at Scale |
| HM | Medium | Culture |
