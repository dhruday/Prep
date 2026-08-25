# Airbnb — Staff FullStack Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Airbnb |
| **Role** | Staff FullStack Engineer |
| **Level** | L5 |
| **YOE** | 7 years |
| **Date** | April 2025 |
| **Result** | ❌ Rejected |
| **Location** | Remote (US) |
| **Source** | [Blind](https://www.teamblind.com/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 2 Technical + System Design + Cross-Functional)
- **Timeline:** 2.5 weeks
- **Format:** Virtual

## Round 3: FullStack Coding — Review & Rating Aggregation System

### Problem
Build a review and rating system:
1. Users submit reviews with star rating (1-5), text, and optional photos
2. Aggregate ratings: average, distribution (1-star count, 2-star, etc.)
3. Sort reviews by: most recent, most helpful, highest/lowest rated
4. Helpful/Not helpful voting on reviews
5. Detect and flag suspicious reviews (spam patterns)
6. Review response by property owner
7. Paginated listing with cursor-based pagination

### 💡 Interview-Ready Answer

```java
import java.util.*;
import java.util.stream.*;
import java.time.Instant;
import java.time.Duration;

// ============================================================
// DOMAIN MODELS
// ============================================================

class Review {
    private final String id;
    private final String propertyId;
    private final String userId;
    private int rating;       // 1-5
    private String text;
    private final List<String> photoUrls;
    private final Instant createdAt;
    private int helpfulCount;
    private int notHelpfulCount;
    private final Set<String> helpfulVoters;
    private final Set<String> notHelpfulVoters;
    private String ownerResponse;
    private Instant ownerResponseAt;
    private boolean flagged;
    private String flagReason;

    Review(String id, String propertyId, String userId, int rating, String text) {
        if (rating < 1 || rating > 5) throw new IllegalArgumentException("Rating must be 1-5");
        this.id = id;
        this.propertyId = propertyId;
        this.userId = userId;
        this.rating = rating;
        this.text = text;
        this.photoUrls = new ArrayList<>();
        this.createdAt = Instant.now();
        this.helpfulCount = 0;
        this.notHelpfulCount = 0;
        this.helpfulVoters = new HashSet<>();
        this.notHelpfulVoters = new HashSet<>();
        this.flagged = false;
    }

    void addPhoto(String url) { photoUrls.add(url); }

    boolean voteHelpful(String voterId) {
        if (voterId.equals(userId)) return false; // can't vote own
        if (helpfulVoters.contains(voterId)) return false; // already voted
        notHelpfulVoters.remove(voterId); // switch vote
        if (notHelpfulCount > 0 && notHelpfulVoters.size() < notHelpfulCount) notHelpfulCount--;
        helpfulVoters.add(voterId);
        helpfulCount++;
        return true;
    }

    boolean voteNotHelpful(String voterId) {
        if (voterId.equals(userId)) return false;
        if (notHelpfulVoters.contains(voterId)) return false;
        helpfulVoters.remove(voterId);
        if (helpfulCount > 0 && helpfulVoters.size() < helpfulCount) helpfulCount--;
        notHelpfulVoters.add(voterId);
        notHelpfulCount++;
        return true;
    }

    void setOwnerResponse(String response) {
        this.ownerResponse = response;
        this.ownerResponseAt = Instant.now();
    }

    void flag(String reason) { this.flagged = true; this.flagReason = reason; }
    void unflag() { this.flagged = false; this.flagReason = null; }

    // Wilson score for ranking (lower bound of confidence interval)
    double wilsonScore() {
        int n = helpfulCount + notHelpfulCount;
        if (n == 0) return 0;
        double p = (double) helpfulCount / n;
        double z = 1.96; // 95% confidence
        return (p + z * z / (2 * n) - z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n)) / (1 + z * z / n);
    }

    // Getters
    String getId() { return id; }
    String getPropertyId() { return propertyId; }
    String getUserId() { return userId; }
    int getRating() { return rating; }
    String getText() { return text; }
    Instant getCreatedAt() { return createdAt; }
    int getHelpfulCount() { return helpfulCount; }
    int getNotHelpfulCount() { return notHelpfulCount; }
    boolean isFlagged() { return flagged; }
    String getOwnerResponse() { return ownerResponse; }

    @Override public String toString() {
        return String.format("  [%s] ★%d by %s | helpful:%d | %s%s",
            id, rating, userId, helpfulCount,
            text.length() > 50 ? text.substring(0, 50) + "..." : text,
            flagged ? " ⚠FLAGGED" : "");
    }
}

class RatingAggregation {
    double average;
    int totalReviews;
    int[] distribution; // index 0=unused, 1-5 = star counts

    @Override public String toString() {
        StringBuilder sb = new StringBuilder();
        sb.append(String.format("Average: %.1f/5 (%d reviews)\n", average, totalReviews));
        for (int i = 5; i >= 1; i--) {
            int count = distribution[i];
            int barLen = totalReviews > 0 ? (count * 20) / totalReviews : 0;
            sb.append(String.format("  %d★ %s %d (%.0f%%)\n", i,
                "█".repeat(barLen) + "░".repeat(20 - barLen),
                count, totalReviews > 0 ? (count * 100.0 / totalReviews) : 0));
        }
        return sb.toString();
    }
}

// ============================================================
// REVIEW SERVICE
// ============================================================

class ReviewService {
    private final Map<String, Review> reviews = new LinkedHashMap<>();
    private final Map<String, List<String>> propertyReviews = new HashMap<>(); // propertyId -> reviewIds
    private final Map<String, Set<String>> userReviewedProps = new HashMap<>(); // userId -> propertyIds
    private int idCounter = 0;

    // Submit review
    Review submit(String propertyId, String userId, int rating, String text) {
        // One review per user per property
        Set<String> reviewed = userReviewedProps.computeIfAbsent(userId, k -> new HashSet<>());
        if (reviewed.contains(propertyId))
            throw new IllegalStateException("User already reviewed this property");

        String id = "R-" + (++idCounter);
        Review review = new Review(id, propertyId, userId, rating, text);

        // Spam detection
        detectSpam(review);

        reviews.put(id, review);
        propertyReviews.computeIfAbsent(propertyId, k -> new ArrayList<>()).add(id);
        reviewed.add(propertyId);
        return review;
    }

    // Spam detection heuristics
    private void detectSpam(Review review) {
        String text = review.getText().toLowerCase();

        // Pattern 1: Very short text with extreme rating
        if (text.length() < 10 && (review.getRating() == 1 || review.getRating() == 5)) {
            review.flag("Suspiciously short review with extreme rating");
            return;
        }

        // Pattern 2: Excessive caps
        long capsCount = review.getText().chars().filter(Character::isUpperCase).count();
        if (review.getText().length() > 20 && capsCount > review.getText().length() * 0.7) {
            review.flag("Excessive capitalization");
            return;
        }

        // Pattern 3: Repeated characters
        if (text.matches(".*(.)(\\1){5,}.*")) {
            review.flag("Repeated character pattern");
            return;
        }

        // Pattern 4: URL/link spam
        if (text.contains("http://") || text.contains("https://") || text.contains("www.")) {
            review.flag("Contains URLs");
        }
    }

    // Aggregate ratings
    RatingAggregation aggregate(String propertyId) {
        List<Review> propReviews = getReviewsForProperty(propertyId);
        RatingAggregation agg = new RatingAggregation();
        agg.distribution = new int[6]; // 0-5
        agg.totalReviews = 0;
        double sum = 0;

        for (Review r : propReviews) {
            if (r.isFlagged()) continue; // exclude flagged
            agg.distribution[r.getRating()]++;
            sum += r.getRating();
            agg.totalReviews++;
        }

        agg.average = agg.totalReviews > 0 ? sum / agg.totalReviews : 0;
        return agg;
    }

    // Sort reviews
    enum SortBy { MOST_RECENT, MOST_HELPFUL, HIGHEST_RATED, LOWEST_RATED }

    List<Review> listReviews(String propertyId, SortBy sort, String cursor, int limit) {
        List<Review> propReviews = getReviewsForProperty(propertyId).stream()
            .filter(r -> !r.isFlagged())
            .collect(Collectors.toList());

        // Sort
        switch (sort) {
            case MOST_RECENT: propReviews.sort(Comparator.comparing(Review::getCreatedAt).reversed()); break;
            case MOST_HELPFUL: propReviews.sort(Comparator.comparingDouble(Review::wilsonScore).reversed()); break;
            case HIGHEST_RATED: propReviews.sort(Comparator.comparingInt(Review::getRating).reversed()
                .thenComparing(Comparator.comparing(Review::getCreatedAt).reversed())); break;
            case LOWEST_RATED: propReviews.sort(Comparator.comparingInt(Review::getRating)
                .thenComparing(Comparator.comparing(Review::getCreatedAt).reversed())); break;
        }

        // Cursor-based pagination
        int startIdx = 0;
        if (cursor != null) {
            for (int i = 0; i < propReviews.size(); i++) {
                if (propReviews.get(i).getId().equals(cursor)) { startIdx = i + 1; break; }
            }
        }

        return propReviews.subList(startIdx, Math.min(startIdx + limit, propReviews.size()));
    }

    // Vote
    void voteHelpful(String reviewId, String voterId) {
        getReview(reviewId).voteHelpful(voterId);
    }

    void voteNotHelpful(String reviewId, String voterId) {
        getReview(reviewId).voteNotHelpful(voterId);
    }

    // Owner response
    void addOwnerResponse(String reviewId, String response) {
        getReview(reviewId).setOwnerResponse(response);
    }

    private Review getReview(String id) {
        Review r = reviews.get(id);
        if (r == null) throw new IllegalArgumentException("Review not found: " + id);
        return r;
    }

    private List<Review> getReviewsForProperty(String propertyId) {
        List<String> ids = propertyReviews.getOrDefault(propertyId, Collections.emptyList());
        return ids.stream().map(reviews::get).filter(Objects::nonNull).collect(Collectors.toList());
    }
}

// ============================================================
// DEMO
// ============================================================

public class Main {
    public static void main(String[] args) {
        ReviewService service = new ReviewService();
        String propId = "PROP-101";

        System.out.println("=== Review & Rating System ===\n");

        // Submit reviews
        Review r1 = service.submit(propId, "user_1", 5, "Amazing beachfront property! The sunset views were incredible. Highly recommend.");
        Review r2 = service.submit(propId, "user_2", 4, "Great location, clean rooms. Slightly noisy at night but overall good.");
        Review r3 = service.submit(propId, "user_3", 5, "Perfect getaway. The host was very responsive and accommodating.");
        Review r4 = service.submit(propId, "user_4", 3, "Decent stay. The amenities were as described but nothing special.");
        Review r5 = service.submit(propId, "user_5", 2, "Disappointing. The photos were misleading and the neighborhood felt unsafe.");
        Review r6 = service.submit(propId, "user_6", 1, "Bad"); // should be flagged (short + extreme)
        Review r7 = service.submit(propId, "user_7", 4, "Lovely place with great vibes. Kitchen was well stocked.");

        System.out.println("Submitted 7 reviews (1 flagged for spam):");
        System.out.println(r6 + " <- flagged\n");

        // Aggregate
        System.out.println("--- Rating Aggregation ---");
        System.out.println(service.aggregate(propId));

        // Voting
        service.voteHelpful(r1.getId(), "user_2");
        service.voteHelpful(r1.getId(), "user_3");
        service.voteHelpful(r1.getId(), "user_4");
        service.voteHelpful(r5.getId(), "user_2");
        service.voteHelpful(r5.getId(), "user_3");
        service.voteNotHelpful(r4.getId(), "user_1");

        // Owner response
        service.addOwnerResponse(r5.getId(), "We're sorry about your experience. We've addressed the photo accuracy. Please give us another chance!");

        // List by most helpful (Wilson score)
        System.out.println("--- Most Helpful Reviews (page 1, limit 3) ---");
        List<Review> page1 = service.listReviews(propId, ReviewService.SortBy.MOST_HELPFUL, null, 3);
        page1.forEach(System.out::println);

        // Page 2
        String lastId = page1.get(page1.size() - 1).getId();
        System.out.println("\n--- Page 2 (cursor=" + lastId + ") ---");
        List<Review> page2 = service.listReviews(propId, ReviewService.SortBy.MOST_HELPFUL, lastId, 3);
        page2.forEach(System.out::println);

        // Lowest rated
        System.out.println("\n--- Lowest Rated ---");
        service.listReviews(propId, ReviewService.SortBy.LOWEST_RATED, null, 3).forEach(System.out::println);

        // Duplicate review prevention
        System.out.println("\n--- Duplicate review ---");
        try {
            service.submit(propId, "user_1", 4, "Another review");
        } catch (IllegalStateException e) {
            System.out.println("Error: " + e.getMessage());
        }
    }
}
```

**Expected Output:**
```
=== Review & Rating System ===

Submitted 7 reviews (1 flagged for spam):
  [R-6] ★1 by user_6 | helpful:0 | Bad ⚠FLAGGED <- flagged

--- Rating Aggregation ---
Average: 3.8/5 (6 reviews)
  5★ ████████████░░░░░░░░ 2 (33%)
  4★ ████████████░░░░░░░░ 2 (33%)
  3★ ██████░░░░░░░░░░░░░░ 1 (17%)
  2★ ██████░░░░░░░░░░░░░░ 1 (17%)
  1★ ░░░░░░░░░░░░░░░░░░░░ 0 (0%)

--- Most Helpful Reviews (page 1, limit 3) ---
  [R-1] ★5 by user_1 | helpful:3 | Amazing beachfront property! The sunset views were i...
  [R-5] ★2 by user_5 | helpful:2 | Disappointing. The photos were misleading and the ne...
  [R-2] ★4 by user_2 | helpful:0 | Great location, clean rooms. Slightly noisy at night...

--- Page 2 (cursor=R-2) ---
  [R-3] ★5 by user_3 | helpful:0 | Perfect getaway. The host was very responsive and ac...
  [R-4] ★3 by user_4 | helpful:0 | Decent stay. The amenities were as described but not...
  [R-7] ★4 by user_7 | helpful:0 | Lovely place with great vibes. Kitchen was well stoc...

--- Lowest Rated ---
  [R-5] ★2 by user_5 | helpful:2 | Disappointing. The photos were misleading and the ne...
  [R-4] ★3 by user_4 | helpful:0 | Decent stay. The amenities were as described but not...
  [R-2] ★4 by user_2 | helpful:0 | Great location, clean rooms. Slightly noisy at night...

--- Duplicate review ---
Error: User already reviewed this property
```

## 🎯 Key Takeaways
- Got rejected in system design round — struggled with **distributed rating consistency** at scale
- **Wilson score** for "most helpful" ranking: lower bound of binomial confidence interval, avoids small sample bias
- Spam detection heuristics: short+extreme, excessive caps, repeated chars, URL patterns
- Cursor-based pagination: find cursor position → slice from cursor+1 — scalable vs offset
- Vote switching: remove from opposite set before adding — prevents double-counting
- One review per user per property: `Map<userId, Set<propertyId>>` — enforced at write time
- Flagged reviews excluded from aggregation but kept in DB — can be appealed
- Owner responses stored as part of review — single entity, not separate table

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | JavaScript, Algorithms |
| Technical 1 | Medium-Hard | Review System, Aggregation |
| Technical 2 | Hard | Spam Detection, Ranking |
| System Design | Hard | Distributed Reviews at Scale |
| Cross-Functional | Medium | Product Sense, Metrics |
