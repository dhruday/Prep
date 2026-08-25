# Cred — SDE-3 FullStack Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Cred |
| **Role** | Senior Software Engineer |
| **Level** | SDE-3 |
| **YOE** | 7 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + Machine Coding + 2 Technical + HM)

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Challenge: Design a Workflow Automation Engine (like Cred's internal campaign engine)

```java
import java.util.*;
import java.util.concurrent.*;

/**
 * Workflow Engine: Define workflows as DAGs of steps.
 * Each step: action + condition + retry policy.
 * Supports: sequential, parallel, conditional branching, retry with backoff.
 * 
 * Example: "Send reward email IF bill > 5000 AND payment on time"
 *   Step 1: Fetch bill amount (parallel with Step 2)
 *   Step 2: Check payment punctuality
 *   Step 3: Evaluate condition (bill > 5000 AND punctual)
 *   Step 4: If true → Send reward email
 *   Step 5: If false → Send reminder
 */
public class WorkflowEngine {
    
    enum StepStatus { PENDING, RUNNING, SUCCESS, FAILED, SKIPPED }
    
    static class StepResult {
        StepStatus status;
        Object output;
        String error;
        
        StepResult(StepStatus status, Object output, String error) {
            this.status = status;
            this.output = output;
            this.error = error;
        }
    }
    
    static class RetryPolicy {
        int maxRetries;
        long initialDelayMs;
        double backoffMultiplier;
        
        RetryPolicy(int maxRetries, long initialDelayMs, double backoffMultiplier) {
            this.maxRetries = maxRetries;
            this.initialDelayMs = initialDelayMs;
            this.backoffMultiplier = backoffMultiplier;
        }
    }
    
    static class Step {
        String id;
        String name;
        java.util.function.Function<Map<String, Object>, Object> action; // inputs → output
        java.util.function.Predicate<Map<String, Object>> condition;     // null = always execute
        List<String> dependsOn;   // Step IDs this depends on
        RetryPolicy retryPolicy;
        String onSuccessGoto;     // Conditional branching
        String onFailureGoto;
        
        Step(String id, String name) {
            this.id = id;
            this.name = name;
            this.dependsOn = new ArrayList<>();
        }
    }
    
    static class Workflow {
        String id;
        String name;
        Map<String, Step> steps = new LinkedHashMap<>();
        
        Workflow addStep(Step step) {
            steps.put(step.id, step);
            return this;
        }
    }
    
    static class WorkflowExecution {
        String executionId;
        String workflowId;
        Map<String, StepResult> stepResults = new ConcurrentHashMap<>();
        Map<String, Object> context = new ConcurrentHashMap<>(); // Shared data between steps
        long startTime;
        long endTime;
    }
    
    private final ExecutorService executor;
    
    public WorkflowEngine(int threadPoolSize) {
        this.executor = Executors.newFixedThreadPool(threadPoolSize);
    }
    
    public WorkflowExecution execute(Workflow workflow, Map<String, Object> initialContext) {
        WorkflowExecution execution = new WorkflowExecution();
        execution.executionId = UUID.randomUUID().toString();
        execution.workflowId = workflow.id;
        execution.context.putAll(initialContext);
        execution.startTime = System.currentTimeMillis();
        
        // Build dependency graph
        Map<String, Set<String>> dependents = new HashMap<>(); // step → set of steps that depend on it
        Map<String, Integer> inDegree = new HashMap<>();
        
        for (Step step : workflow.steps.values()) {
            inDegree.put(step.id, step.dependsOn.size());
            for (String dep : step.dependsOn) {
                dependents.computeIfAbsent(dep, k -> new HashSet<>()).add(step.id);
            }
        }
        
        // Start with steps that have no dependencies
        Queue<String> ready = new ConcurrentLinkedQueue<>();
        for (Map.Entry<String, Integer> e : inDegree.entrySet()) {
            if (e.getValue() == 0) ready.add(e.getKey());
        }
        
        CountDownLatch latch = new CountDownLatch(workflow.steps.size());
        
        processReadySteps(workflow, execution, ready, dependents, inDegree, latch);
        
        try {
            latch.await(5, TimeUnit.MINUTES); // Overall timeout
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        
        execution.endTime = System.currentTimeMillis();
        return execution;
    }
    
    private void processReadySteps(Workflow workflow, WorkflowExecution execution,
                                    Queue<String> ready, Map<String, Set<String>> dependents,
                                    Map<String, Integer> inDegree, CountDownLatch latch) {
        
        while (!ready.isEmpty()) {
            String stepId = ready.poll();
            if (stepId == null) break;
            
            Step step = workflow.steps.get(stepId);
            
            executor.submit(() -> {
                try {
                    StepResult result = executeStep(step, execution);
                    execution.stepResults.put(stepId, result);
                    
                    // Store output in context for downstream steps
                    if (result.output != null) {
                        execution.context.put(stepId + ".output", result.output);
                    }
                    
                    // Unblock dependents
                    Set<String> deps = dependents.getOrDefault(stepId, Collections.emptySet());
                    for (String dep : deps) {
                        int remaining = inDegree.compute(dep, (k, v) -> v - 1);
                        if (remaining == 0) {
                            ready.add(dep);
                            processReadySteps(workflow, execution, ready, dependents, inDegree, latch);
                        }
                    }
                } finally {
                    latch.countDown();
                }
            });
        }
    }
    
    private StepResult executeStep(Step step, WorkflowExecution execution) {
        // Check condition
        if (step.condition != null && !step.condition.test(execution.context)) {
            return new StepResult(StepStatus.SKIPPED, null, "Condition not met");
        }
        
        RetryPolicy policy = step.retryPolicy != null 
            ? step.retryPolicy 
            : new RetryPolicy(0, 0, 1);
        
        int attempt = 0;
        long delay = policy.initialDelayMs;
        
        while (attempt <= policy.maxRetries) {
            try {
                Object output = step.action.apply(execution.context);
                return new StepResult(StepStatus.SUCCESS, output, null);
            } catch (Exception e) {
                attempt++;
                if (attempt > policy.maxRetries) {
                    return new StepResult(StepStatus.FAILED, null, e.getMessage());
                }
                
                try {
                    Thread.sleep(delay);
                    delay = (long) (delay * policy.backoffMultiplier);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    return new StepResult(StepStatus.FAILED, null, "Interrupted");
                }
            }
        }
        
        return new StepResult(StepStatus.FAILED, null, "Exhausted retries");
    }
    
    public void shutdown() {
        executor.shutdown();
    }
}

// Usage: Cred reward campaign
Workflow rewardCampaign = new Workflow();
rewardCampaign.id = "reward-v1";
rewardCampaign.name = "Bill Payment Reward";

Step fetchBill = new Step("fetch-bill", "Fetch Bill Amount");
fetchBill.action = ctx -> {
    String userId = (String) ctx.get("userId");
    // Simulate DB call
    return Map.of("amount", 7500, "dueDate", "2025-04-15");
};
fetchBill.retryPolicy = new RetryPolicy(3, 100, 2.0);

Step checkPunctuality = new Step("check-punctual", "Check Payment Punctuality");
checkPunctuality.action = ctx -> {
    // Check if user pays on time historically
    return Map.of("punctual", true, "streak", 6);
};

Step evaluate = new Step("evaluate", "Evaluate Reward Eligibility");
evaluate.dependsOn = List.of("fetch-bill", "check-punctual");
evaluate.action = ctx -> {
    Map<String, Object> bill = (Map<String, Object>) ctx.get("fetch-bill.output");
    Map<String, Object> punctual = (Map<String, Object>) ctx.get("check-punctual.output");
    boolean eligible = (int) bill.get("amount") > 5000 && (boolean) punctual.get("punctual");
    return Map.of("eligible", eligible);
};

Step sendReward = new Step("send-reward", "Send Reward");
sendReward.dependsOn = List.of("evaluate");
sendReward.condition = ctx -> {
    Map<String, Object> eval = (Map<String, Object>) ctx.get("evaluate.output");
    return eval != null && (boolean) eval.get("eligible");
};
sendReward.action = ctx -> {
    // Send reward notification
    return "Reward sent: 500 CRED coins";
};

rewardCampaign.addStep(fetchBill).addStep(checkPunctuality)
              .addStep(evaluate).addStep(sendReward);
```

---

## 🎯 Key Takeaways
- Cred SDE-3 = **Workflow/DAG engine with conditions + retry + parallel execution**
- **DAG execution**: topological order via in-degree counting — steps with 0 in-degree start first
- **Parallel steps**: submit to thread pool — steps with no dependency run concurrently
- **Conditional branching**: `Predicate<Map>` on step — skip step if condition not met
- **Retry with backoff**: `delay *= backoffMultiplier` — exponential backoff on step failure
- **Shared context**: `ConcurrentHashMap<String, Object>` — each step's output stored as `stepId.output`
- **CountDownLatch for completion**: workflow completes when all steps counted down
- Cred SDE-3 = **premium fintech** — workflow engines, campaign systems, rule-based reward distributions

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding | Very Hard | Workflow Engine, DAG, Concurrency |
| Technical 1 | Hard | Java, System Design |
| Technical 2 | Hard | Distributed Systems |
| HM | Medium | Culture Fit |
