# Zomato — SDE-3 FullStack Interview Experience (2025) — #6

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Zomato |
| **Role** | SDE-3 |
| **Level** | Senior |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Gurugram, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/zomato-interview-experience/) |
| **Author** | Anonymous |
| **Team** | Hyperpure |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + System Design + HM)

---

## Round 2: Machine Coding — Build a Restaurant Recommendation Engine
**Duration:** 90 minutes

### Challenge: Build a restaurant recommendation engine supporting: collaborative filtering (users who liked this also liked...), content-based filtering (similar cuisine/price/rating), hybrid scoring, and popularity decay.

```java
import java.util.*;
import java.util.stream.Collectors;

/**
 * Restaurant Recommendation Engine:
 * 
 * Hybrid approach:
 * 1. Collaborative Filtering (CF): Jaccard similarity on user-restaurant interactions
 * 2. Content-Based Filtering (CB): cosine similarity on restaurant feature vectors
 * 3. Popularity Score: decaying by age (newer ratings weigh more)
 * 4. Final Score = α × CF + β × CB + γ × Popularity (configurable weights)
 */

class Restaurant {
    String id;
    String name;
    List<String> cuisines;
    double avgRating;
    int priceLevel; // 1-4 ($-$$$$)
    double latitude, longitude;
    int totalRatings;
    long lastRatedTimestamp;
    
    // Feature vector for content-based similarity
    Map<String, Double> features; // cuisine:1.0, priceLevel:0.5, rating:0.8, etc.
    
    Restaurant(String id, String name, List<String> cuisines, double avgRating, int priceLevel) {
        this.id = id; this.name = name; this.cuisines = cuisines;
        this.avgRating = avgRating; this.priceLevel = priceLevel;
        this.features = buildFeatureVector();
    }
    
    Map<String, Double> buildFeatureVector() {
        Map<String, Double> vec = new HashMap<>();
        
        // One-hot encode cuisines
        for (String cuisine : cuisines) {
            vec.put("cuisine:" + cuisine.toLowerCase(), 1.0);
        }
        
        // Normalized price level (0-1)
        vec.put("price", priceLevel / 4.0);
        
        // Normalized rating (0-1)
        vec.put("rating", avgRating / 5.0);
        
        return vec;
    }
}

class UserInteraction {
    String userId;
    String restaurantId;
    double rating; // 1-5
    long timestamp;
    
    UserInteraction(String userId, String restaurantId, double rating, long timestamp) {
        this.userId = userId; this.restaurantId = restaurantId;
        this.rating = rating; this.timestamp = timestamp;
    }
}

class RecommendationResult {
    String restaurantId;
    String restaurantName;
    double score;
    double cfScore;
    double cbScore;
    double popularityScore;
    
    RecommendationResult(Restaurant r, double score, double cf, double cb, double pop) {
        this.restaurantId = r.id; this.restaurantName = r.name;
        this.score = score; this.cfScore = cf; this.cbScore = cb; this.popularityScore = pop;
    }
}

class RecommendationEngine {
    
    private final Map<String, Restaurant> restaurants = new HashMap<>();
    private final List<UserInteraction> interactions = new ArrayList<>();
    
    // User → set of positively rated restaurant IDs (rating >= 3.5)
    private final Map<String, Set<String>> userLiked = new HashMap<>();
    
    // Restaurant → set of users who liked it
    private final Map<String, Set<String>> restaurantLikedBy = new HashMap<>();
    
    // Weights for hybrid scoring
    private double cfWeight = 0.4;
    private double cbWeight = 0.35;
    private double popularityWeight = 0.25;
    
    // Popularity decay half-life (30 days in ms)
    private static final long HALF_LIFE_MS = 30L * 24 * 60 * 60 * 1000;
    
    public void addRestaurant(Restaurant r) {
        restaurants.put(r.id, r);
    }
    
    public void addInteraction(UserInteraction interaction) {
        interactions.add(interaction);
        
        if (interaction.rating >= 3.5) {
            userLiked.computeIfAbsent(interaction.userId, k -> new HashSet<>()).add(interaction.restaurantId);
            restaurantLikedBy.computeIfAbsent(interaction.restaurantId, k -> new HashSet<>()).add(interaction.userId);
        }
    }
    
    /**
     * Get recommendations for a user.
     * 
     * @param userId Target user
     * @param limit Number of recommendations
     * @param lat User's latitude (for distance filtering)
     * @param lon User's longitude  
     * @param maxDistKm Maximum distance
     */
    public List<RecommendationResult> recommend(String userId, int limit, 
                                                  double lat, double lon, double maxDistKm) {
        Set<String> liked = userLiked.getOrDefault(userId, Collections.emptySet());
        
        // Candidate restaurants: not already rated by user, within distance
        Set<String> rated = interactions.stream()
            .filter(i -> i.userId.equals(userId))
            .map(i -> i.restaurantId)
            .collect(Collectors.toSet());
        
        List<Restaurant> candidates = restaurants.values().stream()
            .filter(r -> !rated.contains(r.id))
            .filter(r -> haversineKm(lat, lon, r.latitude, r.longitude) <= maxDistKm)
            .collect(Collectors.toList());
        
        // Score each candidate
        List<RecommendationResult> results = new ArrayList<>();
        
        for (Restaurant candidate : candidates) {
            double cfScore = collaborativeScore(userId, candidate.id, liked);
            double cbScore = contentBasedScore(liked, candidate);
            double popScore = popularityScore(candidate);
            
            double finalScore = cfWeight * cfScore + cbWeight * cbScore + popularityWeight * popScore;
            
            results.add(new RecommendationResult(candidate, finalScore, cfScore, cbScore, popScore));
        }
        
        // Sort by score descending
        results.sort((a, b) -> Double.compare(b.score, a.score));
        
        return results.subList(0, Math.min(limit, results.size()));
    }
    
    /**
     * Collaborative Filtering: Jaccard similarity between user's liked set
     * and users who liked the candidate restaurant.
     * 
     * Score = average Jaccard similarity with users who liked the candidate.
     */
    double collaborativeScore(String userId, String restaurantId, Set<String> userLikedSet) {
        Set<String> candidateLikedBy = restaurantLikedBy.getOrDefault(restaurantId, Collections.emptySet());
        
        if (candidateLikedBy.isEmpty() || userLikedSet.isEmpty()) return 0.0;
        
        double totalSim = 0;
        int count = 0;
        
        for (String otherUserId : candidateLikedBy) {
            if (otherUserId.equals(userId)) continue;
            
            Set<String> otherLiked = userLiked.getOrDefault(otherUserId, Collections.emptySet());
            double sim = jaccardSimilarity(userLikedSet, otherLiked);
            
            if (sim > 0) {
                totalSim += sim;
                count++;
            }
        }
        
        return count > 0 ? totalSim / count : 0.0;
    }
    
    /**
     * Content-Based: cosine similarity between the user's preference vector
     * (average of liked restaurant features) and the candidate.
     */
    double contentBasedScore(Set<String> likedIds, Restaurant candidate) {
        if (likedIds.isEmpty()) return 0.0;
        
        // Build user preference vector (average of liked restaurant features)
        Map<String, Double> userProfile = new HashMap<>();
        
        for (String likedId : likedIds) {
            Restaurant r = restaurants.get(likedId);
            if (r == null) continue;
            
            for (var entry : r.features.entrySet()) {
                userProfile.merge(entry.getKey(), entry.getValue(), Double::sum);
            }
        }
        
        // Normalize by count
        for (String key : userProfile.keySet()) {
            userProfile.put(key, userProfile.get(key) / likedIds.size());
        }
        
        return cosineSimilarity(userProfile, candidate.features);
    }
    
    /**
     * Popularity Score with exponential decay.
     * score = (avgRating * log(totalRatings + 1)) * decay
     * decay = 0.5^(age / halfLife)
     */
    double popularityScore(Restaurant r) {
        double baseScore = r.avgRating * Math.log(r.totalRatings + 1) / Math.log(1000);
        
        // Time decay
        long age = System.currentTimeMillis() - r.lastRatedTimestamp;
        double decay = Math.pow(0.5, (double) age / HALF_LIFE_MS);
        
        return Math.min(1.0, baseScore * decay);
    }
    
    // ---- Utility Methods ----
    
    double jaccardSimilarity(Set<String> a, Set<String> b) {
        if (a.isEmpty() && b.isEmpty()) return 0.0;
        
        long intersection = a.stream().filter(b::contains).count();
        long union = a.size() + b.size() - intersection;
        
        return union > 0 ? (double) intersection / union : 0.0;
    }
    
    double cosineSimilarity(Map<String, Double> a, Map<String, Double> b) {
        double dotProduct = 0, normA = 0, normB = 0;
        
        Set<String> allKeys = new HashSet<>(a.keySet());
        allKeys.addAll(b.keySet());
        
        for (String key : allKeys) {
            double va = a.getOrDefault(key, 0.0);
            double vb = b.getOrDefault(key, 0.0);
            dotProduct += va * vb;
            normA += va * va;
            normB += vb * vb;
        }
        
        double denom = Math.sqrt(normA) * Math.sqrt(normB);
        return denom > 0 ? dotProduct / denom : 0.0;
    }
    
    double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371; // Earth radius in km
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
```

---

## 🎯 Key Takeaways
- Zomato SDE-3 = **Hybrid restaurant recommendation — CF + content-based + popularity decay**
- **Collaborative filtering**: Jaccard similarity on liked-restaurant sets — `|A∩B|/|A∪B|`
- **Content-based**: cosine similarity on feature vectors — one-hot cuisine + normalized price/rating
- **User profile**: average feature vector of liked restaurants — represents taste preferences
- **Popularity decay**: `0.5^(age/halfLife)` — recently rated restaurants weighted higher (30-day half-life)
- **Hybrid formula**: `αCF + βCB + γPopularity` — configurable weights, default 40/35/25
- **Distance filtering**: Haversine formula — filter candidates within maxDistKm before scoring
- **Rejection reason**: system design round on food delivery logistics didn't cover batching and live tracking depth

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding (this) | Very Hard | Recommendation Engine, Similarity, Decay |
| System Design | Very Hard | Food Delivery Logistics |
| HM | Medium | Culture |
