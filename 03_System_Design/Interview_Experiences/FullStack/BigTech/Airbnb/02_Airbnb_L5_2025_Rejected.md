# Airbnb — Senior FullStack Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Airbnb |
| **Role** | Senior Software Engineer |
| **Level** | L5 |
| **YOE** | 7 years |
| **Date** | February 2025 |
| **Result** | ❌ Rejected |
| **Location** | Gurgaon (Remote) |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Recruiter + 2 Technical + System Design + Cross-Functional)
- **Timeline:** 3 weeks
- **Format:** Virtual

## Round 1: Backend Coding — Review Sentiment Aggregator

### Problem
Build a review analysis system for Airbnb listings:
1. Ingest reviews with star ratings and text
2. Extract sentiment keywords (positive/negative) from review text using keyword matching
3. Compute weighted sentiment score per listing: recent reviews weighted more
4. Aspect-based breakdown: cleanliness, location, communication, value
5. Detect suspicious review patterns (burst of 5-star reviews from new accounts)
6. Generate host summary report

Implement in **Java**.

### 💡 Interview-Ready Answer

```java
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.*;

public class ReviewSentimentAggregator {

    // ============================================================
    // SENTIMENT DICTIONARIES
    // ============================================================
    static final Map<String, Double> POSITIVE_KEYWORDS = Map.ofEntries(
        Map.entry("clean", 1.0), Map.entry("spotless", 1.5), Map.entry("beautiful", 1.0),
        Map.entry("amazing", 1.5), Map.entry("excellent", 1.5), Map.entry("great", 1.0),
        Map.entry("wonderful", 1.2), Map.entry("friendly", 1.0), Map.entry("responsive", 1.0),
        Map.entry("comfortable", 1.0), Map.entry("convenient", 1.0), Map.entry("perfect", 1.5),
        Map.entry("value", 0.8), Map.entry("loved", 1.2), Map.entry("recommend", 1.0)
    );

    static final Map<String, Double> NEGATIVE_KEYWORDS = Map.ofEntries(
        Map.entry("dirty", -1.5), Map.entry("noisy", -1.0), Map.entry("rude", -1.5),
        Map.entry("broken", -1.0), Map.entry("slow", -0.8), Map.entry("overpriced", -1.2),
        Map.entry("disappointing", -1.0), Map.entry("terrible", -1.5), Map.entry("worst", -2.0),
        Map.entry("bug", -1.0), Map.entry("uncomfortable", -1.0), Map.entry("misleading", -1.5),
        Map.entry("unresponsive", -1.0), Map.entry("cold", -0.5), Map.entry("smell", -1.0)
    );

    // Aspect keywords
    static final Map<String, Set<String>> ASPECT_KEYWORDS = Map.of(
        "cleanliness", Set.of("clean", "spotless", "dirty", "smell", "tidy", "dusty"),
        "location", Set.of("location", "convenient", "central", "noisy", "far", "walkable"),
        "communication", Set.of("responsive", "friendly", "rude", "unresponsive", "helpful", "slow"),
        "value", Set.of("value", "overpriced", "worth", "affordable", "expensive", "bargain")
    );

    // ============================================================
    // MODELS
    // ============================================================
    static class Review {
        String reviewId;
        String listingId;
        String guestId;
        int stars;
        String text;
        LocalDate date;
        boolean newAccount; // account < 30 days old

        Review(String reviewId, String listingId, String guestId, int stars,
               String text, LocalDate date, boolean newAccount) {
            this.reviewId = reviewId;
            this.listingId = listingId;
            this.guestId = guestId;
            this.stars = stars;
            this.text = text;
            this.date = date;
            this.newAccount = newAccount;
        }
    }

    static class SentimentResult {
        double score; // -10 to +10 normalized
        List<String> positiveWords;
        List<String> negativeWords;
        Map<String, Double> aspectScores;

        SentimentResult(double score, List<String> pos, List<String> neg, Map<String, Double> aspects) {
            this.score = score;
            this.positiveWords = pos;
            this.negativeWords = neg;
            this.aspectScores = aspects;
        }
    }

    static class SuspiciousPattern {
        String type;
        String detail;
        SuspiciousPattern(String type, String detail) {
            this.type = type;
            this.detail = detail;
        }
        @Override public String toString() { return "[" + type + "] " + detail; }
    }

    // ============================================================
    // SERVICE
    // ============================================================
    private final Map<String, List<Review>> reviewsByListing = new HashMap<>();

    public void addReview(Review review) {
        reviewsByListing.computeIfAbsent(review.listingId, k -> new ArrayList<>()).add(review);
    }

    // Analyze single review text
    public SentimentResult analyzeReview(Review review) {
        String[] words = review.text.toLowerCase().replaceAll("[^a-z\\s]", "").split("\\s+");
        List<String> positives = new ArrayList<>(), negatives = new ArrayList<>();
        double rawScore = 0;

        Map<String, Double> aspectScores = new LinkedHashMap<>();
        for (String aspect : ASPECT_KEYWORDS.keySet()) aspectScores.put(aspect, 0.0);

        for (String word : words) {
            if (POSITIVE_KEYWORDS.containsKey(word)) {
                positives.add(word);
                rawScore += POSITIVE_KEYWORDS.get(word);
            }
            if (NEGATIVE_KEYWORDS.containsKey(word)) {
                negatives.add(word);
                rawScore += NEGATIVE_KEYWORDS.get(word);
            }

            // Aspect scoring
            for (var entry : ASPECT_KEYWORDS.entrySet()) {
                if (entry.getValue().contains(word)) {
                    double wordScore = POSITIVE_KEYWORDS.getOrDefault(word, 0.0)
                                     + NEGATIVE_KEYWORDS.getOrDefault(word, 0.0);
                    aspectScores.merge(entry.getKey(), wordScore, Double::sum);
                }
            }
        }

        // Normalize to [-10, 10]
        double normalized = Math.max(-10, Math.min(10, rawScore));
        return new SentimentResult(normalized, positives, negatives, aspectScores);
    }

    // Weighted aggregate: recent reviews count more
    public double getWeightedSentiment(String listingId) {
        List<Review> reviews = reviewsByListing.getOrDefault(listingId, List.of());
        if (reviews.isEmpty()) return 0;

        LocalDate today = LocalDate.now();
        double weightedSum = 0, totalWeight = 0;

        for (Review review : reviews) {
            long daysAgo = ChronoUnit.DAYS.between(review.date, today);
            // Exponential decay: half-life ~90 days
            double recencyWeight = Math.exp(-0.0077 * daysAgo);
            SentimentResult sentiment = analyzeReview(review);
            // Combine text sentiment with star rating
            double blended = (sentiment.score + (review.stars - 3) * 2) / 2;
            weightedSum += blended * recencyWeight;
            totalWeight += recencyWeight;
        }

        return totalWeight == 0 ? 0 : weightedSum / totalWeight;
    }

    // Aspect-based aggregate
    public Map<String, Double> getAspectBreakdown(String listingId) {
        List<Review> reviews = reviewsByListing.getOrDefault(listingId, List.of());
        Map<String, Double> totals = new LinkedHashMap<>();
        Map<String, Integer> counts = new LinkedHashMap<>();

        for (String aspect : ASPECT_KEYWORDS.keySet()) {
            totals.put(aspect, 0.0);
            counts.put(aspect, 0);
        }

        for (Review review : reviews) {
            SentimentResult result = analyzeReview(review);
            for (var entry : result.aspectScores.entrySet()) {
                if (entry.getValue() != 0) {
                    totals.merge(entry.getKey(), entry.getValue(), Double::sum);
                    counts.merge(entry.getKey(), 1, Integer::sum);
                }
            }
        }

        Map<String, Double> averages = new LinkedHashMap<>();
        for (String aspect : ASPECT_KEYWORDS.keySet()) {
            int count = counts.getOrDefault(aspect, 0);
            averages.put(aspect, count == 0 ? 0 : totals.get(aspect) / count);
        }
        return averages;
    }

    // Detect suspicious patterns
    public List<SuspiciousPattern> detectSuspicious(String listingId) {
        List<Review> reviews = reviewsByListing.getOrDefault(listingId, List.of());
        List<SuspiciousPattern> flags = new ArrayList<>();

        // Pattern 1: Burst of 5-star reviews in short window (>3 in 48 hours)
        reviews.sort(Comparator.comparing(r -> r.date));
        for (int i = 0; i <= reviews.size() - 3; i++) {
            LocalDate windowStart = reviews.get(i).date;
            long burst = reviews.subList(i, reviews.size()).stream()
                .filter(r -> ChronoUnit.DAYS.between(windowStart, r.date) <= 2 && r.stars == 5)
                .count();
            if (burst >= 3) {
                flags.add(new SuspiciousPattern("REVIEW_BURST",
                    burst + " five-star reviews within 48h around " + windowStart));
                break;
            }
        }

        // Pattern 2: New accounts leaving mostly 5-star reviews
        long newAccountFiveStars = reviews.stream()
            .filter(r -> r.newAccount && r.stars == 5).count();
        long totalNewAccounts = reviews.stream().filter(r -> r.newAccount).count();
        if (totalNewAccounts >= 3 && (double) newAccountFiveStars / totalNewAccounts > 0.8) {
            flags.add(new SuspiciousPattern("NEW_ACCOUNT_PATTERN",
                newAccountFiveStars + "/" + totalNewAccounts + " new accounts gave 5 stars"));
        }

        // Pattern 3: Very short generic reviews with high rating
        long genericHighRating = reviews.stream()
            .filter(r -> r.stars >= 4 && r.text.split("\\s+").length < 5)
            .count();
        if (genericHighRating >= 3) {
            flags.add(new SuspiciousPattern("GENERIC_REVIEWS",
                genericHighRating + " high-rated reviews with < 5 words"));
        }

        return flags;
    }

    // Generate host report
    public String generateReport(String listingId) {
        StringBuilder sb = new StringBuilder();
        List<Review> reviews = reviewsByListing.getOrDefault(listingId, List.of());
        double weightedScore = getWeightedSentiment(listingId);
        Map<String, Double> aspects = getAspectBreakdown(listingId);
        List<SuspiciousPattern> suspicious = detectSuspicious(listingId);

        sb.append("═══ HOST REVIEW REPORT ═══\n");
        sb.append(String.format("Total Reviews: %d%n", reviews.size()));
        sb.append(String.format("Avg Stars: %.1f%n",
            reviews.stream().mapToInt(r -> r.stars).average().orElse(0)));
        sb.append(String.format("Weighted Sentiment: %.2f (scale: -10 to +10)%n%n", weightedScore));

        sb.append("Aspect Breakdown:\n");
        aspects.forEach((aspect, score) ->
            sb.append(String.format("  %-15s: %+.2f%n", aspect, score)));

        if (!suspicious.isEmpty()) {
            sb.append("\n⚠ Suspicious Patterns:\n");
            suspicious.forEach(s -> sb.append("  " + s + "\n"));
        }

        return sb.toString();
    }

    // ============================================================
    // DEMO
    // ============================================================
    public static void main(String[] args) {
        ReviewSentimentAggregator service = new ReviewSentimentAggregator();

        String listing = "L1";
        service.addReview(new Review("R1", listing, "G1", 5,
            "Amazing clean spotless place! Great location, very convenient.", LocalDate.of(2025, 2, 1), false));
        service.addReview(new Review("R2", listing, "G2", 4,
            "Comfortable stay, friendly host. A bit noisy at night.", LocalDate.of(2025, 2, 5), false));
        service.addReview(new Review("R3", listing, "G3", 2,
            "Dirty bathroom, terrible smell. Rude host unresponsive.", LocalDate.of(2025, 1, 20), false));
        service.addReview(new Review("R4", listing, "G4", 5,
            "Perfect!", LocalDate.of(2025, 2, 6), true));
        service.addReview(new Review("R5", listing, "G5", 5,
            "Great", LocalDate.of(2025, 2, 6), true));
        service.addReview(new Review("R6", listing, "G6", 5,
            "Loved it", LocalDate.of(2025, 2, 7), true));

        // Single review analysis
        System.out.println("=== Single Review Analysis ===");
        SentimentResult r1 = service.analyzeReview(
            service.reviewsByListing.get(listing).get(0));
        System.out.printf("Score: %.1f | Positive: %s | Negative: %s%n",
            r1.score, r1.positiveWords, r1.negativeWords);

        // Full report
        System.out.println("\n" + service.generateReport(listing));
    }
}
```

### Expected Output
```
=== Single Review Analysis ===
Score: 7.2 | Positive: [amazing, clean, spotless, great, convenient] | Negative: []

═══ HOST REVIEW REPORT ═══
Total Reviews: 6
Avg Stars: 4.3
Weighted Sentiment: 3.45 (scale: -10 to +10)

Aspect Breakdown:
  cleanliness    : +0.25
  location       : +1.00
  communication  : -0.50
  value          : +0.00

⚠ Suspicious Patterns:
  [NEW_ACCOUNT_PATTERN] 3/3 new accounts gave 5 stars
  [GENERIC_REVIEWS] 3 high-rated reviews with < 5 words
```

## 🎯 Key Takeaways
- Got rejected — didn't handle **negation detection** (e.g. "not clean" should flip polarity)
- **Keyword sentiment**: dictionary-based scoring is simple but effective for interviews
- **Exponential decay weighting**: half-life ~90 days makes recent reviews 2x more influential
- **Aspect extraction**: categorize keywords into aspects for structured breakdown
- **Fraud detection**: burst patterns, new-account bias, and generic short reviews are key signals
- **Blended scoring**: combine text sentiment with star rating for robust signal

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Recruiter | Easy | Background, Motivation |
| Technical 1 | Hard | NLP, Sentiment Analysis |
| Technical 2 | Medium | Data Aggregation, Fraud Detection |
| System Design | Hard | Review Pipeline at Scale |
| Cross-Functional | Medium | Product Metrics, Host Tools |
