# Netflix — L5 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Netflix |
| **Role** | Senior Software Engineer |
| **Level** | L5 (Senior) |
| **YOE** | 8 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Los Gatos |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 On-site: 2 Technical + System Design + Culture Fit)
- **Timeline:** 4 weeks
- **Format:** On-site

## Round 2: Coding — Content Recommendation Engine with Collaborative Filtering

### Problem
Build a recommendation engine for a streaming platform:
1. Track user-content interactions (watch, rate, skip)
2. Find similar users using cosine similarity on rating vectors
3. Recommend content via collaborative filtering (user-based)
4. Support content-based fallback using genre tags
5. Exclude already-watched content
6. Return top-K recommendations with confidence scores

### 💡 Interview-Ready Answer

```java
import java.util.*;
import java.util.stream.*;

public class RecommendationEngine {

    enum InteractionType {
        WATCH(1.0), RATE_HIGH(1.5), RATE_LOW(-0.5), SKIP(-1.0), BOOKMARK(0.8);

        final double weight;
        InteractionType(double weight) { this.weight = weight; }
    }

    static class Content {
        final String id;
        final String title;
        final Set<String> genres;
        final double avgRating;

        Content(String id, String title, Set<String> genres, double avgRating) {
            this.id = id;
            this.title = title;
            this.genres = genres;
            this.avgRating = avgRating;
        }
    }

    static class Interaction {
        final String userId;
        final String contentId;
        final InteractionType type;
        final double rating; // 0-5 if rated, else inferred from type

        Interaction(String userId, String contentId, InteractionType type, double rating) {
            this.userId = userId;
            this.contentId = contentId;
            this.type = type;
            this.rating = rating;
        }
    }

    static class Recommendation {
        final String contentId;
        final String title;
        final double score;
        final String reason;

        Recommendation(String contentId, String title, double score, String reason) {
            this.contentId = contentId;
            this.title = title;
            this.score = score;
            this.reason = reason;
        }

        @Override
        public String toString() {
            return String.format("  %.3f  %-25s  (%s)", score, title, reason);
        }
    }

    // --- State ---
    private final Map<String, Content> contentCatalog = new HashMap<>();
    // userId -> (contentId -> aggregated score)
    private final Map<String, Map<String, Double>> userProfiles = new HashMap<>();

    // --- Content management ---
    public void addContent(Content content) {
        contentCatalog.put(content.id, content);
    }

    // --- Record interaction ---
    public void recordInteraction(Interaction interaction) {
        userProfiles.computeIfAbsent(interaction.userId, k -> new HashMap<>())
            .merge(interaction.contentId,
                   interaction.rating > 0 ? interaction.rating : interaction.type.weight,
                   Double::sum);
    }

    // --- Cosine similarity between two user rating vectors ---
    private double cosineSimilarity(Map<String, Double> u1, Map<String, Double> u2) {
        Set<String> common = new HashSet<>(u1.keySet());
        common.retainAll(u2.keySet());

        if (common.isEmpty()) return 0.0;

        double dot = 0, normA = 0, normB = 0;
        for (String contentId : common) {
            dot += u1.get(contentId) * u2.get(contentId);
        }
        for (double v : u1.values()) normA += v * v;
        for (double v : u2.values()) normB += v * v;

        double denom = Math.sqrt(normA) * Math.sqrt(normB);
        return denom == 0 ? 0 : dot / denom;
    }

    // --- Find K most similar users ---
    private List<Map.Entry<String, Double>> findSimilarUsers(String userId, int k) {
        Map<String, Double> targetProfile = userProfiles.get(userId);
        if (targetProfile == null) return List.of();

        Map<String, Double> similarities = new HashMap<>();
        for (Map.Entry<String, Map<String, Double>> entry : userProfiles.entrySet()) {
            if (entry.getKey().equals(userId)) continue;
            double sim = cosineSimilarity(targetProfile, entry.getValue());
            if (sim > 0) similarities.put(entry.getKey(), sim);
        }

        return similarities.entrySet().stream()
            .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
            .limit(k)
            .toList();
    }

    /**
     * Collaborative Filtering: recommend content liked by similar users.
     */
    public List<Recommendation> recommendCollaborative(String userId, int topK, int neighborCount) {
        Map<String, Double> myProfile = userProfiles.getOrDefault(userId, Map.of());
        List<Map.Entry<String, Double>> similarUsers = findSimilarUsers(userId, neighborCount);

        // Weighted score for each content not yet consumed by target user
        Map<String, Double> candidateScores = new HashMap<>();
        Map<String, List<String>> reasons = new HashMap<>();

        for (Map.Entry<String, Double> neighbor : similarUsers) {
            String neighborId = neighbor.getKey();
            double similarity = neighbor.getValue();
            Map<String, Double> neighborProfile = userProfiles.get(neighborId);

            for (Map.Entry<String, Double> contentEntry : neighborProfile.entrySet()) {
                String contentId = contentEntry.getKey();
                if (myProfile.containsKey(contentId)) continue; // already consumed

                double weightedScore = contentEntry.getValue() * similarity;
                candidateScores.merge(contentId, weightedScore, Double::sum);
                reasons.computeIfAbsent(contentId, k -> new ArrayList<>())
                    .add(String.format("user %s (sim=%.2f)", neighborId, similarity));
            }
        }

        return candidateScores.entrySet().stream()
            .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
            .limit(topK)
            .map(e -> {
                Content c = contentCatalog.getOrDefault(e.getKey(),
                    new Content(e.getKey(), e.getKey(), Set.of(), 0));
                String reason = "Collab: " + reasons.get(e.getKey()).stream()
                    .limit(2).collect(Collectors.joining(", "));
                return new Recommendation(e.getKey(), c.title, e.getValue(), reason);
            })
            .toList();
    }

    /**
     * Content-Based Filtering: recommend by genre overlap with user's preferences.
     */
    public List<Recommendation> recommendContentBased(String userId, int topK) {
        Map<String, Double> profile = userProfiles.getOrDefault(userId, Map.of());
        if (profile.isEmpty()) return List.of();

        // Build genre preference vector
        Map<String, Double> genreWeights = new HashMap<>();
        for (Map.Entry<String, Double> entry : profile.entrySet()) {
            Content c = contentCatalog.get(entry.getKey());
            if (c == null) continue;
            for (String genre : c.genres) {
                genreWeights.merge(genre, entry.getValue(), Double::sum);
            }
        }

        // Score unseen content by genre match
        return contentCatalog.values().stream()
            .filter(c -> !profile.containsKey(c.id))
            .map(c -> {
                double score = c.genres.stream()
                    .mapToDouble(g -> genreWeights.getOrDefault(g, 0.0))
                    .sum();
                // Boost by average rating
                score *= (0.5 + c.avgRating / 10.0);
                String matchedGenres = c.genres.stream()
                    .filter(genreWeights::containsKey)
                    .collect(Collectors.joining(", "));
                return new Recommendation(c.id, c.title, score, "Genre: " + matchedGenres);
            })
            .filter(r -> r.score > 0)
            .sorted((a, b) -> Double.compare(b.score, a.score))
            .limit(topK)
            .toList();
    }

    /**
     * Hybrid: merge collaborative + content-based with configurable weights.
     */
    public List<Recommendation> recommendHybrid(String userId, int topK,
                                                 double collabWeight, double contentWeight) {
        List<Recommendation> collabRecs = recommendCollaborative(userId, topK * 2, 5);
        List<Recommendation> contentRecs = recommendContentBased(userId, topK * 2);

        Map<String, double[]> merged = new LinkedHashMap<>();
        Map<String, Recommendation> recMap = new HashMap<>();

        for (Recommendation r : collabRecs) {
            merged.computeIfAbsent(r.contentId, k -> new double[2])[0] = r.score;
            recMap.put(r.contentId, r);
        }
        for (Recommendation r : contentRecs) {
            merged.computeIfAbsent(r.contentId, k -> new double[2])[1] = r.score;
            recMap.putIfAbsent(r.contentId, r);
        }

        // Normalize scores to [0, 1]
        double maxCollab = collabRecs.stream().mapToDouble(r -> r.score).max().orElse(1);
        double maxContent = contentRecs.stream().mapToDouble(r -> r.score).max().orElse(1);

        return merged.entrySet().stream()
            .map(e -> {
                double norm0 = maxCollab > 0 ? e.getValue()[0] / maxCollab : 0;
                double norm1 = maxContent > 0 ? e.getValue()[1] / maxContent : 0;
                double finalScore = collabWeight * norm0 + contentWeight * norm1;
                Recommendation orig = recMap.get(e.getKey());
                return new Recommendation(e.getKey(), orig.title, finalScore, "Hybrid");
            })
            .sorted((a, b) -> Double.compare(b.score, a.score))
            .limit(topK)
            .toList();
    }

    public static void main(String[] args) {
        RecommendationEngine engine = new RecommendationEngine();

        // Setup catalog
        engine.addContent(new Content("tt1", "Inception", Set.of("sci-fi", "thriller"), 4.5));
        engine.addContent(new Content("tt2", "The Matrix", Set.of("sci-fi", "action"), 4.7));
        engine.addContent(new Content("tt3", "Titanic", Set.of("romance", "drama"), 4.3));
        engine.addContent(new Content("tt4", "Interstellar", Set.of("sci-fi", "drama"), 4.6));
        engine.addContent(new Content("tt5", "The Notebook", Set.of("romance", "drama"), 4.0));
        engine.addContent(new Content("tt6", "Dark Knight", Set.of("action", "thriller"), 4.8));
        engine.addContent(new Content("tt7", "Arrival", Set.of("sci-fi", "drama"), 4.2));
        engine.addContent(new Content("tt8", "John Wick", Set.of("action", "thriller"), 4.1));

        // Simulate user interactions
        // Alice: sci-fi lover
        engine.recordInteraction(new Interaction("alice", "tt1", InteractionType.RATE_HIGH, 5.0));
        engine.recordInteraction(new Interaction("alice", "tt2", InteractionType.RATE_HIGH, 4.5));
        engine.recordInteraction(new Interaction("alice", "tt4", InteractionType.WATCH, 0));

        // Bob: similar to Alice, also likes action
        engine.recordInteraction(new Interaction("bob", "tt1", InteractionType.RATE_HIGH, 4.8));
        engine.recordInteraction(new Interaction("bob", "tt2", InteractionType.RATE_HIGH, 5.0));
        engine.recordInteraction(new Interaction("bob", "tt6", InteractionType.RATE_HIGH, 4.9));
        engine.recordInteraction(new Interaction("bob", "tt7", InteractionType.WATCH, 0));

        // Carol: romance / drama
        engine.recordInteraction(new Interaction("carol", "tt3", InteractionType.RATE_HIGH, 4.5));
        engine.recordInteraction(new Interaction("carol", "tt5", InteractionType.RATE_HIGH, 4.0));
        engine.recordInteraction(new Interaction("carol", "tt4", InteractionType.WATCH, 0));

        // Recommend for Alice
        System.out.println("=== Collaborative Recommendations for Alice ===");
        engine.recommendCollaborative("alice", 5, 3).forEach(System.out::println);

        System.out.println("\n=== Content-Based Recommendations for Alice ===");
        engine.recommendContentBased("alice", 5).forEach(System.out::println);

        System.out.println("\n=== Hybrid Recommendations for Alice (0.6 collab + 0.4 content) ===");
        engine.recommendHybrid("alice", 5, 0.6, 0.4).forEach(System.out::println);

        // Recommend for Carol (romance-oriented)
        System.out.println("\n=== Content-Based Recommendations for Carol ===");
        engine.recommendContentBased("carol", 5).forEach(System.out::println);
    }
}
```

## 🎯 Key Takeaways
- Netflix interviews deeply value **domain-relevant problems** — recommendation is core business
- **Cosine similarity** for user comparison: handles sparse, high-dimensional rating vectors
- Collaborative filtering: "users like you watched X" — leverages crowd wisdom
- Content-based: genre preference vector — handles cold start (new users)
- **Hybrid approach** normalizes and weights both strategies — production standard
- Exclusion of already-consumed content is a basic but essential detail
- Interaction weights (watch > skip, rate_high > rate_low) model user intent

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | Graphs, DFS/BFS |
| Technical 1 | Medium | DP, Memoization |
| Technical 2 | Hard | Recommendation Systems, Cosine Similarity |
| System Design | Hard | Distributed Content Recommendation Pipeline |
| Culture Fit | Medium | Netflix Culture Memo, Candor, Impact |
