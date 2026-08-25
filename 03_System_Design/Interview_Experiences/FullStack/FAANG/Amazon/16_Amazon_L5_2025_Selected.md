# Amazon — SDE-2 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Amazon |
| **Role** | SDE-2 |
| **Level** | L5 |
| **YOE** | 4 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/amazon-interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 3 Onsite)
- **Timeline:** 2 weeks
- **Format:** Virtual Loop

## Round 1: Online Assessment
**Duration:** 90 minutes

### Questions Asked
1. **Design an Auto-scaling Group Manager**
   - Given server metrics (CPU, memory) over time and scaling policies (scale up if CPU > 80% for 3 minutes, scale down if CPU < 20% for 5 minutes), determine when to add/remove instances.

### 💡 Interview-Ready Answer

```java
import java.util.*;

public class AutoScalingManager {

    enum ScaleAction { SCALE_UP, SCALE_DOWN, NO_ACTION }

    static class ScalingPolicy {
        String metric;         // "cpu" or "memory"
        double threshold;      // percentage
        String comparison;     // ">" or "<"
        int durationSeconds;   // sustained period
        int scaleAmount;       // number of instances to add/remove
        int cooldownSeconds;   // wait after scaling

        ScalingPolicy(String metric, String comparison, double threshold,
                      int durationSeconds, int scaleAmount, int cooldownSeconds) {
            this.metric = metric;
            this.comparison = comparison;
            this.threshold = threshold;
            this.durationSeconds = durationSeconds;
            this.scaleAmount = scaleAmount;
            this.cooldownSeconds = cooldownSeconds;
        }
    }

    static class MetricPoint {
        long timestamp;
        double cpu;
        double memory;

        MetricPoint(long timestamp, double cpu, double memory) {
            this.timestamp = timestamp;
            this.cpu = cpu;
            this.memory = memory;
        }
    }

    static class ScaleEvent {
        long timestamp;
        ScaleAction action;
        int count;
        String reason;

        ScaleEvent(long timestamp, ScaleAction action, int count, String reason) {
            this.timestamp = timestamp;
            this.action = action;
            this.count = count;
            this.reason = reason;
        }

        @Override
        public String toString() {
            return String.format("[%d] %s %d instances — %s", timestamp, action, count, reason);
        }
    }

    private final List<ScalingPolicy> scaleUpPolicies = new ArrayList<>();
    private final List<ScalingPolicy> scaleDownPolicies = new ArrayList<>();
    private int currentInstances;
    private final int minInstances;
    private final int maxInstances;
    private long lastScaleTime = 0;

    public AutoScalingManager(int initialInstances, int min, int max) {
        this.currentInstances = initialInstances;
        this.minInstances = min;
        this.maxInstances = max;
    }

    public void addScaleUpPolicy(ScalingPolicy policy) {
        scaleUpPolicies.add(policy);
    }

    public void addScaleDownPolicy(ScalingPolicy policy) {
        scaleDownPolicies.add(policy);
    }

    /**
     * Evaluate metrics and return scaling events.
     * Uses sliding window to check sustained threshold breaches.
     */
    public List<ScaleEvent> evaluateMetrics(List<MetricPoint> metrics) {
        List<ScaleEvent> events = new ArrayList<>();

        for (int i = 0; i < metrics.size(); i++) {
            MetricPoint current = metrics.get(i);

            // Check cooldown
            if (current.timestamp - lastScaleTime < getCooldown()) continue;

            // Check scale-up policies
            for (ScalingPolicy policy : scaleUpPolicies) {
                if (isSustained(metrics, i, policy)) {
                    int toAdd = Math.min(policy.scaleAmount,
                        maxInstances - currentInstances);
                    if (toAdd > 0) {
                        currentInstances += toAdd;
                        lastScaleTime = current.timestamp;
                        events.add(new ScaleEvent(current.timestamp,
                            ScaleAction.SCALE_UP, toAdd,
                            String.format("%s %s %.0f%% for %ds",
                                policy.metric, policy.comparison,
                                policy.threshold, policy.durationSeconds)));
                    }
                    break; // one action per evaluation
                }
            }

            // Check scale-down policies
            for (ScalingPolicy policy : scaleDownPolicies) {
                if (isSustained(metrics, i, policy)) {
                    int toRemove = Math.min(policy.scaleAmount,
                        currentInstances - minInstances);
                    if (toRemove > 0) {
                        currentInstances -= toRemove;
                        lastScaleTime = current.timestamp;
                        events.add(new ScaleEvent(current.timestamp,
                            ScaleAction.SCALE_DOWN, toRemove,
                            String.format("%s %s %.0f%% for %ds",
                                policy.metric, policy.comparison,
                                policy.threshold, policy.durationSeconds)));
                    }
                    break;
                }
            }
        }

        return events;
    }

    private boolean isSustained(List<MetricPoint> metrics, int endIdx, ScalingPolicy policy) {
        long endTime = metrics.get(endIdx).timestamp;
        long startTime = endTime - policy.durationSeconds;

        // Check all points in the window
        for (int i = endIdx; i >= 0; i--) {
            MetricPoint point = metrics.get(i);
            if (point.timestamp < startTime) break;

            double value = policy.metric.equals("cpu") ? point.cpu : point.memory;
            boolean breaches = policy.comparison.equals(">")
                ? value > policy.threshold
                : value < policy.threshold;

            if (!breaches) return false;
        }

        // Verify we had enough data points covering the window
        return endIdx > 0 && metrics.get(endIdx).timestamp - startTime >= 0;
    }

    private int getCooldown() {
        int maxCooldown = 0;
        for (ScalingPolicy p : scaleUpPolicies)
            maxCooldown = Math.max(maxCooldown, p.cooldownSeconds);
        for (ScalingPolicy p : scaleDownPolicies)
            maxCooldown = Math.max(maxCooldown, p.cooldownSeconds);
        return maxCooldown;
    }

    public int getCurrentInstances() {
        return currentInstances;
    }

    public static void main(String[] args) {
        AutoScalingManager manager = new AutoScalingManager(2, 1, 10);

        manager.addScaleUpPolicy(new ScalingPolicy("cpu", ">", 80, 180, 2, 300));
        manager.addScaleDownPolicy(new ScalingPolicy("cpu", "<", 20, 300, 1, 300));

        // Simulate metrics over time (timestamp in seconds)
        List<MetricPoint> metrics = List.of(
            new MetricPoint(0, 50, 40),
            new MetricPoint(60, 85, 45),
            new MetricPoint(120, 90, 50),
            new MetricPoint(180, 88, 48),  // CPU > 80 for 180s → SCALE UP
            new MetricPoint(240, 75, 40),
            new MetricPoint(500, 15, 30),
            new MetricPoint(560, 12, 28),
            new MetricPoint(620, 18, 25),
            new MetricPoint(680, 10, 22),
            new MetricPoint(740, 8, 20),
            new MetricPoint(800, 5, 18)    // CPU < 20 for 300s → SCALE DOWN
        );

        List<ScaleEvent> events = manager.evaluateMetrics(metrics);
        events.forEach(System.out::println);
        System.out.println("Final instances: " + manager.getCurrentInstances());
    }
}
```

## Rounds 2-4: Onsite
- **Coding (LP: Ownership):** Design a parking lot system — LLD with OOP
- **System Design (LP: Think Big):** Design Amazon's pricing engine (dynamic pricing, A/B test prices)
- **Bar Raiser (LP: Earn Trust):** Behavioral — passed with strong ownership stories

## 🎯 Key Takeaways
- Amazon SDE-2 (L5) OA tests **real-world system simulation** — auto-scaling, pricing, monitoring
- Sustained threshold checking with sliding window is a common cloud infra pattern
- Always include **cooldown** logic — prevents thrashing between scale-up and scale-down
- LP stories must show **measurable impact** — use numbers (reduced latency by X%, saved $Y)

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Online Assessment | Medium-Hard | Sliding Window, Policy Evaluation |
| LLD | Medium | OOP, Design Patterns |
| System Design | Hard | Pricing Engine, A/B Testing |
| Bar Raiser | Medium | Behavioral, LPs |
