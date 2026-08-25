# Amazon — L6 FullStack Interview Experience (2025) — #14

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Amazon |
| **Role** | SDE-3 (L6) |
| **Level** | Senior |
| **YOE** | 8 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Seattle, WA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | AWS Lambda |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Bar Raiser + 2 Technical + System Design + HM)

---

## Round 2: DSA — Design a Task Scheduler with Cooldown and Priority
**Duration:** 60 minutes

### Q1: Given N tasks with priorities and a cooldown period between same-type tasks, find the minimum time to execute all tasks. Tasks with higher priority should be scheduled first.

```java
import java.util.*;

/**
 * Task Scheduler with Cooldown and Priority:
 * 
 * Greedy approach:
 * 1. Use a max-heap ordered by (frequency DESC, priority DESC)
 * 2. Each interval: pick the most frequent task that's not in cooldown
 * 3. After execution, task goes to a "cooldown queue" for n intervals
 * 4. After cooldown expires, task returns to the heap
 * 
 * Time: O(totalTasks × log(uniqueTasks))
 * Space: O(uniqueTasks)
 */
class TaskScheduler {
    
    static class Task {
        char id;
        int count;
        int priority; // Higher = more urgent
        
        Task(char id, int count, int priority) {
            this.id = id; this.count = count; this.priority = priority;
        }
    }
    
    /**
     * @param tasks Array of task IDs ['A','A','B','B','C']
     * @param priorities Map of task ID → priority
     * @param cooldown Minimum intervals between same task type
     * @return Minimum total intervals (including idle)
     */
    int minTime(char[] tasks, Map<Character, Integer> priorities, int cooldown) {
        // Count frequencies
        Map<Character, Integer> freq = new HashMap<>();
        for (char t : tasks) freq.merge(t, 1, Integer::sum);
        
        // Max-heap: most frequent first, break ties by priority
        PriorityQueue<Task> heap = new PriorityQueue<>((a, b) -> {
            if (a.count != b.count) return b.count - a.count;
            return b.priority - a.priority;
        });
        
        for (var entry : freq.entrySet()) {
            heap.offer(new Task(entry.getKey(), entry.getValue(), 
                                priorities.getOrDefault(entry.getKey(), 0)));
        }
        
        // Cooldown queue: (task, available_at_time)
        Queue<int[]> cooldownQueue = new LinkedList<>(); // [charCode, count, priority, availableAt]
        
        int time = 0;
        
        while (!heap.isEmpty() || !cooldownQueue.isEmpty()) {
            time++;
            
            // Check if any task's cooldown has expired
            if (!cooldownQueue.isEmpty() && cooldownQueue.peek()[3] <= time) {
                int[] entry = cooldownQueue.poll();
                heap.offer(new Task((char) entry[0], entry[1], entry[2]));
            }
            
            if (!heap.isEmpty()) {
                Task task = heap.poll();
                task.count--;
                
                if (task.count > 0) {
                    cooldownQueue.offer(new int[]{task.id, task.count, task.priority, time + cooldown + 1});
                }
            }
            // else: idle interval
        }
        
        return time;
    }
    
    /**
     * Return the actual schedule (not just count).
     */
    List<String> getSchedule(char[] tasks, Map<Character, Integer> priorities, int cooldown) {
        Map<Character, Integer> freq = new HashMap<>();
        for (char t : tasks) freq.merge(t, 1, Integer::sum);
        
        PriorityQueue<Task> heap = new PriorityQueue<>((a, b) -> {
            if (a.count != b.count) return b.count - a.count;
            return b.priority - a.priority;
        });
        
        for (var entry : freq.entrySet()) {
            heap.offer(new Task(entry.getKey(), entry.getValue(),
                                priorities.getOrDefault(entry.getKey(), 0)));
        }
        
        Queue<int[]> cooldownQ = new LinkedList<>();
        List<String> schedule = new ArrayList<>();
        int time = 0;
        
        while (!heap.isEmpty() || !cooldownQ.isEmpty()) {
            time++;
            
            // Release cooled-down tasks
            while (!cooldownQ.isEmpty() && cooldownQ.peek()[3] <= time) {
                int[] entry = cooldownQ.poll();
                heap.offer(new Task((char) entry[0], entry[1], entry[2]));
            }
            
            if (!heap.isEmpty()) {
                Task task = heap.poll();
                schedule.add(String.valueOf(task.id));
                task.count--;
                if (task.count > 0) {
                    cooldownQ.offer(new int[]{task.id, task.count, task.priority, time + cooldown + 1});
                }
            } else {
                schedule.add("idle");
            }
        }
        
        return schedule;
    }
}
```

### Follow-up: What if tasks have dependencies (DAG)? Schedule respecting both dependencies and cooldown.

```java
/**
 * Task Scheduler with Dependencies + Cooldown:
 * 
 * Combine topological sort (Kahn's) with cooldown:
 * 1. Start with tasks having in-degree 0
 * 2. Among ready tasks, pick by (frequency, priority) as before
 * 3. On completion, reduce in-degrees of dependents
 * 4. New zero-in-degree tasks enter the heap
 * 5. Still respect cooldown between same-type tasks
 */
class DependencyTaskScheduler {
    
    List<String> schedule(int n, char[] taskIds, int[][] deps, 
                           Map<Character, Integer> priorities, int cooldown) {
        // Build adjacency list and in-degree
        Map<Character, List<Character>> graph = new HashMap<>();
        Map<Character, Integer> inDegree = new HashMap<>();
        Map<Character, Integer> freq = new HashMap<>();
        
        for (char t : taskIds) {
            freq.merge(t, 1, Integer::sum);
            inDegree.putIfAbsent(t, 0);
            graph.putIfAbsent(t, new ArrayList<>());
        }
        
        for (int[] dep : deps) { // [prerequisite, dependent]
            char from = (char) dep[0], to = (char) dep[1];
            graph.computeIfAbsent(from, k -> new ArrayList<>()).add(to);
            inDegree.merge(to, 1, Integer::sum);
        }
        
        // Ready tasks: in-degree == 0
        PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> {
            if (a[1] != b[1]) return b[1] - a[1]; // Frequency desc
            return b[2] - a[2]; // Priority desc
        }); // [charCode, frequency, priority]
        
        for (var entry : inDegree.entrySet()) {
            if (entry.getValue() == 0) {
                char t = entry.getKey();
                heap.offer(new int[]{t, freq.getOrDefault(t, 0), priorities.getOrDefault(t, 0)});
            }
        }
        
        Map<Character, Integer> lastExecuted = new HashMap<>(); // task → last execution time
        List<String> result = new ArrayList<>();
        int time = 0;
        
        while (!heap.isEmpty()) {
            time++;
            
            // Find a task not in cooldown
            List<int[]> skipped = new ArrayList<>();
            boolean found = false;
            
            while (!heap.isEmpty()) {
                int[] top = heap.poll();
                char taskId = (char) top[0];
                int lastTime = lastExecuted.getOrDefault(taskId, -cooldown - 1);
                
                if (time - lastTime > cooldown) {
                    // Execute this task
                    result.add(String.valueOf(taskId));
                    lastExecuted.put(taskId, time);
                    top[1]--; // Decrease remaining count
                    
                    if (top[1] > 0) {
                        heap.offer(top);
                    } else {
                        // Task fully completed → release dependents
                        for (char next : graph.getOrDefault(taskId, Collections.emptyList())) {
                            int newIn = inDegree.merge(next, -1, Integer::sum);
                            if (newIn == 0) {
                                heap.offer(new int[]{next, freq.getOrDefault(next, 0), priorities.getOrDefault(next, 0)});
                            }
                        }
                    }
                    
                    found = true;
                    break;
                } else {
                    skipped.add(top);
                }
            }
            
            // Put skipped tasks back
            for (int[] s : skipped) heap.offer(s);
            
            if (!found) {
                result.add("idle");
            }
        }
        
        return result;
    }
}
```

---

## 🎯 Key Takeaways
- Amazon L6 = **Task scheduler with cooldown + priority (heap + cooldown queue) + DAG extension**
- **Greedy + max-heap**: most frequent task first minimizes idle slots — standard LeetCode 621 approach
- **Cooldown queue**: FIFO — tasks enter with `availableAt = currentTime + cooldown + 1`
- **Priority as tiebreaker**: when frequencies equal, higher priority task goes first
- **DAG extension**: Kahn's topological sort + cooldown — release dependents only after task fully completed
- **Idle handling**: when all ready tasks are in cooldown, insert "idle" slot
- **Time complexity**: O(totalTasks × log K) where K = unique task types — heap operations
- **Real connection**: AWS Lambda = task scheduling with warm containers, cooldowns, and dependency chains

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Bar Raiser | Hard | Leadership Principles |
| Technical 1 (this) | Hard | Heap, Greedy, Topological Sort |
| Technical 2 | Hard | DP + Graphs |
| System Design | Very Hard | AWS Lambda Architecture |
| HM | Medium | Culture |
