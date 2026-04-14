# SAP Labs — SDE-2 FullStack Interview Experience (2025) — #2

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | SAP Labs |
| **Role** | SDE-2 FullStack |
| **Level** | Senior |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/sap-labs-interview-experience/) |
| **Author** | Anonymous |
| **Team** | SAP BTP (Business Technology Platform) |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Coding + LLD/HLD + Director)
- **Timeline:** 3 weeks

---

## Round 1: Online Assessment
**Duration:** 90 minutes

### Questions Asked
1. **Longest Increasing Subsequence** (LeetCode 300) — DP + Binary Search
2. **Group Anagrams** (LeetCode 49)

### 💡 LIS with Binary Search (Patience Sorting)

```java
public int lengthOfLIS(int[] nums) {
    // tails[i] = smallest tail element of all increasing subsequences of length i+1
    List<Integer> tails = new ArrayList<>();
    
    for (int num : nums) {
        int pos = Collections.binarySearch(tails, num);
        if (pos < 0) pos = -(pos + 1); // Insertion point
        
        if (pos == tails.size()) {
            tails.add(num); // Extend longest subsequence
        } else {
            tails.set(pos, num); // Replace with smaller value (greedy)
        }
    }
    
    return tails.size();
}
// Time: O(n log n) — binary search for each element
// Space: O(n)

// Follow-up: Reconstruct the actual LIS
public List<Integer> findLIS(int[] nums) {
    int n = nums.length;
    int[] dp = new int[n];    // dp[i] = length of LIS ending at i
    int[] parent = new int[n]; // parent[i] = index of previous element in LIS
    Arrays.fill(parent, -1);
    
    int maxLen = 0, maxIdx = 0;
    
    List<Integer> tails = new ArrayList<>(); // Stores indices
    int[] tailIndices = new int[n];
    
    for (int i = 0; i < n; i++) {
        int pos = lowerBound(tails, nums, nums[i]);
        
        if (pos == tails.size()) {
            tails.add(i);
        } else {
            tails.set(pos, i);
        }
        tailIndices[i] = pos;
        
        if (pos > 0) parent[i] = tails.get(pos - 1);
        
        if (pos + 1 > maxLen) {
            maxLen = pos + 1;
            maxIdx = i;
        }
    }
    
    // Reconstruct
    List<Integer> result = new ArrayList<>();
    for (int i = maxIdx; i != -1; i = parent[i]) {
        result.add(nums[i]);
    }
    Collections.reverse(result);
    return result;
}

private int lowerBound(List<Integer> indices, int[] nums, int target) {
    int lo = 0, hi = indices.size();
    while (lo < hi) {
        int mid = (lo + hi) / 2;
        if (nums[indices.get(mid)] < target) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}
```

---

## Round 2: System Design (HLD)
**Duration:** 60 minutes

### Questions Asked
1. **Design a Multi-Tenant Workflow Engine** (like SAP Workflow)
   - Define workflows visually (drag-and-drop nodes)
   - Execute workflows: sequential, parallel, conditional branching
   - Tenant isolation (data + compute)
   - Retry, timeout, compensation on failure

### 💡 Key Design

```
Architecture:
┌──────────────────────────────────────────────────────────┐
│                   API Gateway (Kong)                      │
│         Rate Limit per Tenant + JWT Auth                  │
└──────────────┬───────────────────────────┬───────────────┘
               │                           │
    ┌──────────▼──────────┐    ┌──────────▼──────────┐
    │  Workflow Designer   │    │  Workflow Runtime    │
    │  Service (CRUD)      │    │  Engine (Execution)  │
    │  - DAG validation    │    │  - Step execution    │
    │  - Version control   │    │  - State transitions │
    │  - Template library  │    │  - Retry/timeout     │
    └──────────┬──────────┘    └──────────┬──────────┘
               │                           │
        ┌──────▼──────┐           ┌───────▼────────┐
        │  PostgreSQL  │           │  Redis + Kafka │
        │  (metadata)  │           │ (state + queue)│
        └─────────────┘           └────────────────┘

Workflow Execution Model:
- workflow_instance: { id, workflow_def_id, tenant_id, status, current_step, context }
- Each step: { type: 'task'|'gateway'|'parallel'|'timer', handler, retries, timeout }
- State Machine: PENDING → RUNNING → { COMPLETED | FAILED | TIMED_OUT | COMPENSATING }

Tenant Isolation:
- Schema-per-tenant in PostgreSQL (tenant_123.workflows, tenant_123.instances)
- Kafka topic-per-tenant for workflow events
- Resource quotas: max concurrent workflows per tenant
- Noisy neighbor protection: separate worker pools for premium tenants

DAG Execution:
public class WorkflowEngine {
    void execute(WorkflowInstance instance) {
        DAG dag = instance.getDefinition().getDAG();
        TopologicalSort topo = new TopologicalSort(dag);
        
        for (Step step : topo.traverse()) {
            if (step.type == StepType.PARALLEL_GATEWAY) {
                // Fork: submit all child branches to thread pool
                CompletableFuture<Void> allBranches = CompletableFuture.allOf(
                    step.branches.stream()
                        .map(branch -> CompletableFuture.runAsync(() -> executeBranch(branch)))
                        .toArray(CompletableFuture[]::new)
                );
                allBranches.join(); // Wait for all branches
            } else if (step.type == StepType.EXCLUSIVE_GATEWAY) {
                // Evaluate condition, pick one branch
                Branch branch = evaluateCondition(step.conditions, instance.getContext());
                executeBranch(branch);
            } else {
                executeStep(step, instance);
            }
        }
    }
    
    void executeStep(Step step, WorkflowInstance instance) {
        int attempts = 0;
        while (attempts <= step.maxRetries) {
            try {
                StepResult result = step.handler.execute(instance.getContext());
                instance.getContext().merge(result.outputs);
                updateState(instance, step, StepStatus.COMPLETED);
                return;
            } catch (Exception e) {
                attempts++;
                if (attempts > step.maxRetries) {
                    updateState(instance, step, StepStatus.FAILED);
                    triggerCompensation(instance, step);
                    throw new WorkflowException("Step failed after retries", e);
                }
                backoff(attempts);
            }
        }
    }
}

Compensation (Saga Pattern):
- Each step registers a compensation action
- On failure: execute compensations in reverse order
- compensation_log: { instance_id, step_id, compensation_status, executed_at }

Scale:
- 10K tenants, 100K concurrent workflow instances
- Kafka partitioned by tenant_id for ordering
- Worker autoscaling based on pending queue depth
```

---

## 🎯 Key Takeaways
- SAP = **enterprise patterns + multi-tenancy + workflow automation**
- **LIS with binary search (Patience Sorting):** `tails` array stores smallest possible tail for each length — O(n log n) vs O(n²) DP
- **LIS reconstruction:** track parent pointers alongside the tails array
- **Workflow engine patterns:** DAG-based execution, parallel gateway (fork-join), exclusive gateway (condition)
- **Saga compensation:** reverse execution of compensating actions on failure
- **Multi-tenant isolation:** schema-per-tenant > row-level-security for enterprise SaaS
- SAP values: **enterprise reliability**, ABAP → Cloud transition, BTP platform knowledge

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium-Hard | LIS (Binary Search), Anagrams |
| Coding | Medium | Trees, Graphs |
| System Design | Hard | Workflow Engine, Multi-Tenant, Saga |
| Director | Medium | Behavioral, SAP Cloud Strategy |
