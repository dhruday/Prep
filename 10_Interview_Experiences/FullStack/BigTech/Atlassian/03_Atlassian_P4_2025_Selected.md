# Atlassian — SDE-2 FullStack Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Atlassian |
| **Role** | P4 FullStack |
| **Level** | Senior |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/Interview/Atlassian-Interview-Questions-E115699.htm) |
| **Author** | Anonymous |
| **Team** | Jira Cloud |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Values + Coding + System Design + HM)
- **Atlassian's Values Interview is FIRST and is a hard blocker**

---

## Round 1: Values Interview
**Duration:** 45 minutes

### What They Look For
1. **"Don't #@!% the customer"** — customer empathy + quality
2. **"Play as a team"** — collaboration, no hero syndrome
3. **"Be the change you seek"** — ownership, proactive improvement
4. **"Open company, no bullshit"** — transparency, honest communication
5. **"Build with heart and balance"** — sustainable pace, wellbeing

### 💡 Key Tips
- Prepare 2-3 STAR stories for EACH value
- They want specific examples, not hypotheticals
- Failure stories are GOOD — show what you learned
- Every answer should show impact on team or customer
- Don't badmouth previous companies/managers

---

## Round 2: Coding
**Duration:** 60 minutes

### Questions Asked
1. **Design a Rate Limiter** (Token Bucket + Sliding Window)
2. **Follow-up: Distributed rate limiter across multiple servers**

### 💡 Rate Limiter (Token Bucket + Redis)

```java
// Token Bucket Algorithm (single machine)
class TokenBucketRateLimiter {
    private final int maxTokens;
    private final double refillRate; // tokens per second
    private double tokens;
    private long lastRefillTimestamp;
    
    TokenBucketRateLimiter(int maxTokens, double refillRate) {
        this.maxTokens = maxTokens;
        this.refillRate = refillRate;
        this.tokens = maxTokens;
        this.lastRefillTimestamp = System.nanoTime();
    }
    
    synchronized boolean tryAcquire(int numTokens) {
        refill();
        
        if (tokens >= numTokens) {
            tokens -= numTokens;
            return true;
        }
        return false;
    }
    
    private void refill() {
        long now = System.nanoTime();
        double elapsed = (now - lastRefillTimestamp) / 1e9; // seconds
        tokens = Math.min(maxTokens, tokens + elapsed * refillRate);
        lastRefillTimestamp = now;
    }
}

// Distributed Rate Limiter (Redis Lua Script)
// Atomic operation: check + decrement in single Lua script
class DistributedRateLimiter {
    private final RedisTemplate<String, String> redis;
    
    private static final String LUA_SCRIPT = """
        local key = KEYS[1]
        local max_tokens = tonumber(ARGV[1])
        local refill_rate = tonumber(ARGV[2])
        local requested = tonumber(ARGV[3])
        local now = tonumber(ARGV[4])
        
        local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
        local tokens = tonumber(bucket[1])
        local last_refill = tonumber(bucket[2])
        
        if tokens == nil then
            -- Initialize new bucket
            tokens = max_tokens
            last_refill = now
        end
        
        -- Refill tokens
        local elapsed = (now - last_refill) / 1000 -- milliseconds to seconds
        tokens = math.min(max_tokens, tokens + elapsed * refill_rate)
        
        local allowed = 0
        if tokens >= requested then
            tokens = tokens - requested
            allowed = 1
        end
        
        -- Update bucket
        redis.call('HMSET', key, 'tokens', tostring(tokens), 'last_refill', tostring(now))
        redis.call('EXPIRE', key, 3600) -- 1 hour TTL for cleanup
        
        return allowed
        """;
    
    boolean isAllowed(String clientId, int maxTokens, double refillRate, int requested) {
        Long result = redis.execute(
            RedisScript.of(LUA_SCRIPT, Long.class),
            List.of("ratelimit:" + clientId),
            String.valueOf(maxTokens),
            String.valueOf(refillRate),
            String.valueOf(requested),
            String.valueOf(System.currentTimeMillis())
        );
        return result != null && result == 1;
    }
}

// Sliding Window Counter (alternative approach)
class SlidingWindowRateLimiter {
    boolean isAllowed(String clientId, int maxRequests, int windowSeconds) {
        String key = "swrl:" + clientId;
        long now = System.currentTimeMillis();
        long windowStart = now - (windowSeconds * 1000L);
        
        // Atomic pipeline
        redis.execute(connection -> {
            connection.multi(); // Transaction
            connection.zRemRangeByScore(key.getBytes(), 0, windowStart);
            connection.zCard(key.getBytes());
            connection.zAdd(key.getBytes(), now, String.valueOf(now).getBytes());
            connection.expire(key.getBytes(), windowSeconds);
            return connection.exec();
        });
        
        // If count > max, last zAdd was unnecessary but it's cleaned next call
        long count = redis.opsForZSet().zCard(key);
        return count <= maxRequests;
    }
}
```

---

## Round 3: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Jira Workflow Engine**
   - Custom statuses: To Do → In Progress → Code Review → Testing → Done
   - Transitions: rules (e.g., only assignee can move to "In Progress")
   - Validators: field required (e.g., must have PR link for "Code Review")
   - Post-functions: auto-assign reviewer, send notification
   - Workflow schemes: different workflows for different issue types

### 💡 Key Points

```
Workflow Definition (Graph-Based):
Workflow = directed graph where:
  - Nodes = Statuses
  - Edges = Transitions (with conditions, validators, post-functions)

class WorkflowDefinition {
    UUID id;
    String name;
    List<Status> statuses;
    List<Transition> transitions;
    Status initialStatus;
}

class Transition {
    UUID id;
    String name;
    Status fromStatus;
    Status toStatus;
    List<Condition> conditions;     // Who CAN perform this transition
    List<Validator> validators;      // What must be true BEFORE transition
    List<PostFunction> postFunctions; // What happens AFTER transition
}

Condition examples:
- OnlyAssignee: user == issue.assignee
- OnlyRole("developer"): user.hasRole("developer")
- SubtasksComplete: issue.subtasks.all(s -> s.status == "Done")

Validator examples:
- FieldRequired("pr_link"): issue.getField("pr_link") != null
- FixVersionSet: issue.fixVersion != null
- EstimateProvided: issue.estimate > 0

PostFunction examples:
- AssignToReviewer: issue.reviewer = nextAvailableReviewer()
- SendNotification: notify(issue.watchers, "Issue moved to " + toStatus)
- UpdateParentStatus: if all subtasks done, move parent to "Ready for Release"

Execution:
class WorkflowEngine {
    Issue performTransition(Issue issue, Transition transition, User user) {
        // 1. Check conditions (authorization)
        for (Condition c : transition.conditions) {
            if (!c.evaluate(issue, user)) {
                throw new ForbiddenException("You cannot perform this transition: " + c.getMessage());
            }
        }
        
        // 2. Run validators (data integrity)
        for (Validator v : transition.validators) {
            if (!v.validate(issue)) {
                throw new ValidationException("Validation failed: " + v.getMessage());
            }
        }
        
        // 3. Perform transition
        issue.setStatus(transition.toStatus);
        issue.addHistoryEntry(user, transition);
        issueRepo.save(issue);
        
        // 4. Execute post-functions
        for (PostFunction pf : transition.postFunctions) {
            pf.execute(issue, user, transition);
        }
        
        // 5. Publish event for webhooks, automation, etc.
        eventBus.publish(new IssueTransitionEvent(issue, transition, user));
        
        return issue;
    }
    
    // Get available transitions for current user
    List<Transition> getAvailableTransitions(Issue issue, User user) {
        return issue.getWorkflow().getTransitions().stream()
            .filter(t -> t.fromStatus.equals(issue.getStatus()))
            .filter(t -> t.conditions.stream().allMatch(c -> c.evaluate(issue, user)))
            .toList();
    }
}
```

---

## 🎯 Key Takeaways
- Atlassian = **Values interview is MOST important** — prepare 10+ STAR stories mapped to 5 values
- **Token bucket**: refill based on elapsed time, check available tokens before consuming
- **Distributed rate limiter**: Redis Lua script for atomic check-and-decrement — no race condition
- **Sliding window**: Redis Sorted Set with timestamp as score — ZREMRANGEBYSCORE for cleanup
- **Jira workflows**: graph-based state machine with Conditions + Validators + PostFunctions
- **Key pattern**: separate authorization (conditions) from validation (validators) from side effects (post-functions)
- **Workflow schemes**: map issue type → workflow (Bug → Simple Workflow, Story → Full Agile Workflow)
- Atlassian interview tips: be genuine about failures, show team player mentality, no ego

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Values | Hard | Behavioral, Atlassian-Specific Values |
| Coding | Medium-Hard | Rate Limiter, Token Bucket, Redis |
| System Design | Hard | Workflow Engine, State Machine |
| HM | Medium | Team Collaboration, Growth |
