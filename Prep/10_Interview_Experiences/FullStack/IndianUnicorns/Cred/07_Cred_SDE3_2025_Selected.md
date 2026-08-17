# CRED — SDE-3 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | CRED |
| **Role** | SDE-3 |
| **Level** | Senior |
| **YOE** | 6 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (DSA + Machine Coding + LLD + HM)
- **Timeline:** 2 weeks
- **Format:** On-site

## Round 2: Machine Coding — Credit Score Change Tracker with Alerts

### Problem
Build a system that:
- Tracks credit score changes for users over time
- Detects significant changes (positive/negative) and triggers alerts
- Computes trends (improving, declining, stable) over configurable windows
- Supports subscriptions — users/admins subscribe to score events

### 💡 Interview-Ready Answer

```java
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.*;
import java.util.stream.*;

public class CreditScoreTracker {

    enum Trend { IMPROVING, DECLINING, STABLE, INSUFFICIENT_DATA }
    enum AlertSeverity { INFO, WARNING, CRITICAL }

    record ScoreEntry(int score, LocalDateTime timestamp, String source) {}

    record Alert(String userId, AlertSeverity severity, String message,
                 LocalDateTime timestamp, int scoreDelta) {}

    interface AlertSubscriber {
        void onAlert(Alert alert);
    }

    static class UserScoreProfile {
        final String userId;
        final Deque<ScoreEntry> history = new ConcurrentLinkedDeque<>();
        int currentScore;

        UserScoreProfile(String userId) {
            this.userId = userId;
        }

        void addEntry(ScoreEntry entry) {
            history.addLast(entry);
            currentScore = entry.score();
        }

        List<ScoreEntry> getEntriesSince(LocalDateTime since) {
            return history.stream()
                .filter(e -> e.timestamp().isAfter(since))
                .collect(Collectors.toList());
        }
    }

    // Configuration
    private int significantDropThreshold = 30;    // Points
    private int significantGainThreshold = 50;
    private int criticalScoreFloor = 550;
    private int trendWindowDays = 90;
    private int minEntriesForTrend = 3;

    private final ConcurrentHashMap<String, UserScoreProfile> profiles = new ConcurrentHashMap<>();
    private final List<AlertSubscriber> subscribers = new CopyOnWriteArrayList<>();
    private final List<Alert> alertLog = new CopyOnWriteArrayList<>();

    public void subscribe(AlertSubscriber subscriber) {
        subscribers.add(subscriber);
    }

    /**
     * Record a new score for a user and evaluate alerts.
     */
    public List<Alert> recordScore(String userId, int newScore, String source) {
        if (newScore < 300 || newScore > 900) {
            throw new IllegalArgumentException("Score must be between 300 and 900");
        }

        UserScoreProfile profile = profiles.computeIfAbsent(userId, UserScoreProfile::new);
        ScoreEntry previous = profile.history.peekLast();
        ScoreEntry entry = new ScoreEntry(newScore, LocalDateTime.now(), source);
        profile.addEntry(entry);

        List<Alert> alerts = new ArrayList<>();

        if (previous != null) {
            int delta = newScore - previous.score();
            alerts.addAll(evaluateChange(userId, newScore, delta));
        }

        // Check absolute thresholds
        if (newScore <= criticalScoreFloor) {
            alerts.add(new Alert(userId, AlertSeverity.CRITICAL,
                String.format("Credit score at critical level: %d", newScore),
                LocalDateTime.now(), 0));
        }

        // Dispatch alerts
        for (Alert alert : alerts) {
            alertLog.add(alert);
            for (AlertSubscriber sub : subscribers) {
                sub.onAlert(alert);
            }
        }

        return alerts;
    }

    private List<Alert> evaluateChange(String userId, int newScore, int delta) {
        List<Alert> alerts = new ArrayList<>();

        if (delta <= -significantDropThreshold) {
            AlertSeverity severity = delta <= -60 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING;
            alerts.add(new Alert(userId, severity,
                String.format("Score dropped by %d points to %d", Math.abs(delta), newScore),
                LocalDateTime.now(), delta));
        }

        if (delta >= significantGainThreshold) {
            alerts.add(new Alert(userId, AlertSeverity.INFO,
                String.format("Score improved by %d points to %d", delta, newScore),
                LocalDateTime.now(), delta));
        }

        return alerts;
    }

    /**
     * Compute trend over the configured window.
     * Uses linear regression slope on score entries.
     */
    public Trend computeTrend(String userId) {
        UserScoreProfile profile = profiles.get(userId);
        if (profile == null) return Trend.INSUFFICIENT_DATA;

        LocalDateTime since = LocalDateTime.now().minusDays(trendWindowDays);
        List<ScoreEntry> recent = profile.getEntriesSince(since);

        if (recent.size() < minEntriesForTrend) return Trend.INSUFFICIENT_DATA;

        // Linear regression on (index, score) pairs
        double n = recent.size();
        double sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

        for (int i = 0; i < recent.size(); i++) {
            sumX += i;
            sumY += recent.get(i).score();
            sumXY += i * recent.get(i).score();
            sumX2 += i * i;
        }

        double slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

        if (slope > 2.0) return Trend.IMPROVING;
        if (slope < -2.0) return Trend.DECLINING;
        return Trend.STABLE;
    }

    /**
     * Get score statistics for a user.
     */
    public Map<String, Object> getStatistics(String userId) {
        UserScoreProfile profile = profiles.get(userId);
        if (profile == null) return Map.of("error", "User not found");

        IntSummaryStatistics stats = profile.history.stream()
            .mapToInt(ScoreEntry::score)
            .summaryStatistics();

        int current = profile.currentScore;
        ScoreEntry first = profile.history.peekFirst();
        int totalChange = current - (first != null ? first.score() : current);

        return Map.of(
            "userId", userId,
            "currentScore", current,
            "min", stats.getMin(),
            "max", stats.getMax(),
            "average", String.format("%.1f", stats.getAverage()),
            "totalEntries", stats.getCount(),
            "totalChange", totalChange,
            "trend", computeTrend(userId).name()
        );
    }

    /**
     * Get all alerts for a user, optionally filtered by severity.
     */
    public List<Alert> getAlerts(String userId, AlertSeverity minSeverity) {
        return alertLog.stream()
            .filter(a -> a.userId().equals(userId))
            .filter(a -> a.severity().ordinal() >= minSeverity.ordinal())
            .collect(Collectors.toList());
    }

    public static void main(String[] args) {
        CreditScoreTracker tracker = new CreditScoreTracker();

        // Subscribe to alerts
        tracker.subscribe(alert ->
            System.out.printf("[%s] %s: %s%n",
                alert.severity(), alert.userId(), alert.message()));

        String userId = "user_cred_42";

        // Simulate score changes over time
        System.out.println("=== Recording Score Changes ===");
        tracker.recordScore(userId, 720, "Experian");
        tracker.recordScore(userId, 735, "Experian");  // +15: no alert
        tracker.recordScore(userId, 780, "CIBIL");     // +45: no alert (below 50)
        tracker.recordScore(userId, 690, "Experian");  // -90: CRITICAL drop
        tracker.recordScore(userId, 710, "CIBIL");     // +20: no alert
        tracker.recordScore(userId, 540, "Experian");  // -170: CRITICAL drop + floor

        // Check trend
        System.out.println("\n=== Trend Analysis ===");
        System.out.println("Trend: " + tracker.computeTrend(userId));

        // Get statistics
        System.out.println("\n=== Statistics ===");
        tracker.getStatistics(userId).forEach((k, v) ->
            System.out.printf("  %s: %s%n", k, v));

        // Get critical alerts
        System.out.println("\n=== Critical Alerts ===");
        tracker.getAlerts(userId, AlertSeverity.CRITICAL).forEach(a ->
            System.out.printf("  %s (Δ%d)%n", a.message(), a.scoreDelta()));
    }
}
```

## 🎯 Key Takeaways
- CRED focuses on **fintech domain problems** — credit scores, payments, rewards
- Linear regression slope for trend computation is a simple but effective approach
- Observer pattern (subscribers) demonstrates clean event-driven architecture
- Use Java records for immutable data carriers — interviewers appreciate modern Java
- Threshold-based alerting with severity levels shows production thinking

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| DSA | Medium | Arrays, Sliding Window |
| Machine Coding | Medium-Hard | Domain Modeling, Observer Pattern, Statistics |
| LLD | Hard | Payment Gateway Design |
| HM | Medium | Product Sense, Culture |
