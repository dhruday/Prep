# Amazon — L6 (Senior SDE) Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Amazon |
| **Role** | Senior SDE |
| **Level** | L6 |
| **YOE** | 7 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Seattle, WA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 Onsite — 2 Coding + System Design + Bar Raiser)
- **Timeline:** 3 weeks
- **Format:** Virtual Onsite

## Round 1: Coding — Design a Min-Cost Task Scheduler
**Duration:** 45 minutes

### Problem
Given N tasks with deadlines and penalties, and K identical workers, schedule all tasks to minimize total penalty. Each task takes 1 unit of time. Penalty is incurred for each unit of time a task finishes after its deadline.

### 💡 Interview-Ready Answer

```java
import java.util.*;

public class MinCostTaskScheduler {

    static class Task {
        int id;
        int deadline;
        int penalty;  // penalty per unit time late

        Task(int id, int deadline, int penalty) {
            this.id = id;
            this.deadline = deadline;
            this.penalty = penalty;
        }
    }

    /**
     * Greedy approach: Schedule tasks with highest penalty rate first.
     * Use K parallel workers — track when each worker becomes free.
     * 
     * Algorithm:
     * 1. Sort tasks by penalty (descending) — prioritize expensive tasks
     * 2. Use a min-heap for worker availability times
     * 3. For each task, assign to earliest available worker
     * 4. Calculate lateness penalty if finish time > deadline
     * 
     * Time: O(N log N + N log K)
     * Space: O(K)
     */
    public static int schedule(List<Task> tasks, int k) {
        // Sort by penalty rate descending (highest penalty first)
        tasks.sort((a, b) -> {
            if (b.penalty != a.penalty) return b.penalty - a.penalty;
            return a.deadline - b.deadline; // Earlier deadline first for ties
        });

        // Min-heap: each entry is a worker's next available time
        PriorityQueue<Integer> workerAvailability = new PriorityQueue<>();
        for (int i = 0; i < k; i++) {
            workerAvailability.offer(0); // All workers start at time 0
        }

        int totalPenalty = 0;
        int[] schedule = new int[tasks.size()]; // task index -> start time

        for (int i = 0; i < tasks.size(); i++) {
            Task task = tasks.get(i);

            // Assign to earliest available worker
            int earliestFree = workerAvailability.poll();
            int startTime = earliestFree;
            int finishTime = startTime + 1; // Each task takes 1 unit

            // Calculate penalty
            int lateness = Math.max(0, finishTime - task.deadline);
            totalPenalty += lateness * task.penalty;

            schedule[i] = startTime;

            // Worker is now busy until finishTime
            workerAvailability.offer(finishTime);
        }

        return totalPenalty;
    }

    /**
     * Alternative: DP approach for small N with exact optimal solution.
     * Used when greedy doesn't guarantee optimality (complex constraints).
     * 
     * State: dp[time][bitmask of completed tasks] = min penalty
     * Only feasible for N <= 20 due to bitmask.
     */
    public static int scheduleDP(List<Task> tasks, int k) {
        int n = tasks.size();
        if (n > 20) throw new IllegalArgumentException("DP only for N <= 20");

        int maxTime = 0;
        for (Task t : tasks) maxTime = Math.max(maxTime, t.deadline + n);

        // dp[mask] = {min penalty, max time used}
        Map<Integer, int[]> dp = new HashMap<>();
        dp.put(0, new int[]{0, 0}); // {penalty, time_slots_used}

        int bestPenalty = Integer.MAX_VALUE;

        for (int mask = 0; mask < (1 << n); mask++) {
            if (!dp.containsKey(mask)) continue;
            int[] state = dp.get(mask);
            int penalty = state[0];
            int timeUsed = state[1];

            if (mask == (1 << n) - 1) {
                bestPenalty = Math.min(bestPenalty, penalty);
                continue;
            }

            // With K workers, at any time slot, up to K tasks can run
            // Simplified: assign next task to next available slot
            int currentTime = timeUsed / k; // Each time unit handles K tasks

            for (int i = 0; i < n; i++) {
                if ((mask & (1 << i)) != 0) continue; // Already scheduled

                int newMask = mask | (1 << i);
                int finishTime = currentTime + 1;
                int lateness = Math.max(0, finishTime - tasks.get(i).deadline);
                int newPenalty = penalty + lateness * tasks.get(i).penalty;

                if (!dp.containsKey(newMask) || dp.get(newMask)[0] > newPenalty) {
                    dp.put(newMask, new int[]{newPenalty, timeUsed + 1});
                }
            }
        }

        return bestPenalty;
    }

    public static void main(String[] args) {
        List<Task> tasks = new ArrayList<>();
        tasks.add(new Task(1, 2, 10)); // High penalty — schedule first
        tasks.add(new Task(2, 1, 5));
        tasks.add(new Task(3, 3, 8));
        tasks.add(new Task(4, 2, 3));
        tasks.add(new Task(5, 1, 7));

        // With 2 workers
        int penalty = schedule(new ArrayList<>(tasks), 2);
        System.out.println("Greedy penalty (K=2): " + penalty);

        // With 1 worker
        penalty = schedule(new ArrayList<>(tasks), 1);
        System.out.println("Greedy penalty (K=1): " + penalty);

        // DP exact solution
        penalty = scheduleDP(tasks, 2);
        System.out.println("DP penalty (K=2): " + penalty);
    }
}
```

## Round 2: Coding — LRU Cache with Get/Put/GetMostRecent
**Duration:** 45 minutes

Standard LRU with extra `getMostRecent()` method that returns the most recently accessed key without updating access order.

## Round 3: System Design — Design Amazon's Order Tracking System
**Duration:** 60 minutes

Key points discussed:
- Event-driven architecture with Kafka for order state changes
- DynamoDB for order state, ElastiCache for real-time tracking
- Push notifications via SNS/SQS for customer updates
- Handling millions of concurrent order lookups

## 🎯 Key Takeaways
- Amazon loves **scheduling/assignment optimization** problems — directly relates to warehouse ops
- Greedy by penalty rate is a strong heuristic but not always optimal
- DP with bitmask gives exact solution for small N
- Priority queue for K workers is the standard pattern for parallel scheduling
- Bar Raiser focuses heavily on **Leadership Principles** (Ownership, Dive Deep)

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding 1 | Medium-Hard | Greedy, Priority Queue, Scheduling |
| Coding 2 | Medium | LRU Cache, Doubly Linked List |
| System Design | Hard | Event-Driven, DynamoDB, Kafka |
| Bar Raiser | Medium-Hard | LP-heavy Behavioral |
