# 🎯 FAANG Interview Strategy - Senior Full Stack Developer (7+ YOE)

> **Target Role:** Senior Full Stack Developer (L5/E5/SDE-3)  
> **Companies:** Google, Meta, Amazon, Netflix, Apple  
> **Experience Level:** 7+ Years

---

## 📋 Table of Contents
1. [How FAANG Evaluates Candidates](#how-faang-evaluates-candidates)
2. [Common Rejection Reasons](#common-rejection-reasons)
3. [30-45 Day Study Roadmap](#study-roadmap)
4. [Communication Strategy](#communication-strategy)
5. [Mistakes Senior Engineers Make](#common-mistakes)
6. [Interview Loop Breakdown](#interview-loop-breakdown)

---

## 🔍 How FAANG Evaluates Candidates

### The 4 Core Pillars

#### 1. **Technical Competency (40%)**
- **What they assess:**
  - Problem-solving ability
  - Algorithm optimization
  - System design thinking
  - Code quality and production readiness
  - Understanding of trade-offs

- **What they're NOT looking for:**
  - Memorized solutions
  - Brute force without optimization
  - Surface-level explanations
  - Copy-paste coding patterns

- **Bar for Senior Engineers:**
  - Should solve medium problems in 20-25 minutes
  - Should identify optimal solution within first attempt
  - Should discuss multiple approaches before coding
  - Should consider edge cases WITHOUT prompting
  - Should write production-grade code (error handling, naming, structure)

#### 2. **System Design & Architecture (30%)**
- **What they assess:**
  - Ambiguity handling (asking clarifying questions)
  - Scalability thinking (millions → billions of users)
  - Real-world constraints (cost, latency, consistency)
  - Technology choices and justification
  - Failure handling and resilience

- **What they're NOT looking for:**
  - Generic "use load balancer, cache, CDN" answers
  - Over-engineering small problems
  - Buzzword dropping without understanding
  - Ignoring CAP theorem implications

- **Bar for Senior Engineers:**
  - Should drive the conversation (not wait for hints)
  - Should discuss 3-4 different architectures before finalizing
  - Should quantify everything (QPS, storage, bandwidth)
  - Should identify bottlenecks BEFORE interviewer asks
  - Should discuss monitoring, alerting, rollback strategies

#### 3. **Behavioral & Leadership (20%)**
- **What they assess:**
  - Ownership and accountability
  - Cross-team collaboration
  - Conflict resolution
  - Mentorship and influence
  - Learning from failures

- **Amazon Leadership Principles weight:** 40% of total evaluation
- **Google's Googleyness weight:** 25% of total evaluation
- **Meta's Cross-functional Leadership:** 30% of total evaluation

- **What they're NOT looking for:**
  - Generic stories without impact
  - Blaming others for failures
  - "I did everything" without team credit
  - Lack of metrics/data in stories

- **Bar for Senior Engineers:**
  - Should have 5-6 STAR stories prepared
  - Each story should show MEASURABLE impact
  - Should demonstrate influence WITHOUT authority
  - Should show examples of unblocking others
  - Should demonstrate technical mentorship

#### 4. **Cultural Fit & Communication (10%)**
- **What they assess:**
  - Clarity of thought
  - Structured communication
  - Receptiveness to feedback
  - Humility and collaboration
  - Growth mindset

- **Red Flags:**
  - Arrogance or ego
  - Dismissing feedback
  - Unable to admit knowledge gaps
  - Poor whiteboard/diagram skills
  - Rambling without structure

---

## ❌ Common Rejection Reasons

### For Senior Engineers (L5/E5 Level)

#### 1. **"Not Senior Enough" - Most Common Rejection**

**What it means:**
- You solved the problem but didn't demonstrate senior thinking
- You waited for hints instead of driving the conversation
- You didn't discuss trade-offs unprompted
- You didn't consider scale, cost, or operational aspects

**Example:**
```
Junior approach: "I'll use Redis for caching"
Senior approach: "I'll use Redis for caching because:
  - Our read:write ratio is 100:1
  - We need sub-10ms latency
  - Data can tolerate 5-minute staleness
  - However, this adds operational complexity
  - Alternative: In-memory cache if data < 2GB
  - Alternative: CDN if data is static
  Let's discuss the trade-offs..."
```

#### 2. **"Solved the Problem, But Poorly Architected Code"**

**What it means:**
- Code works but isn't production-ready
- No error handling
- No input validation
- Poor naming conventions
- Tight coupling
- No testability consideration

**Example of Bad Code:**
```java
public List<Integer> f(int[] a, int t) {
    for(int i=0;i<a.length;i++) {
        for(int j=i+1;j<a.length;j++) {
            if(a[i]+a[j]==t) {
                return Arrays.asList(i,j);
            }
        }
    }
    return null;
}
```

**Why it's bad:**
- Single letter variable names
- No null check on input
- Returning null (should throw exception or Optional)
- O(n²) when O(n) possible
- Method name not descriptive

#### 3. **"Couldn't Handle Follow-ups"**

**Common scenario:**
- Candidate solves the base problem
- Interviewer asks: "What if we have 1 billion users?"
- Candidate: "Umm... use more servers?"

**What interviewer wants:**
- Specific scaling strategy (sharding, partitioning)
- Database choice justification
- Caching layer details
- Rate limiting approach
- Graceful degradation plan

#### 4. **"Weak System Design - No Depth"**

**What it means:**
- Drew boxes and arrows without justification
- Didn't calculate numbers (QPS, storage)
- Didn't discuss failure scenarios
- Couldn't explain HOW components work internally
- No discussion of consistency vs availability

**Example:**
```
Weak: "We'll use Kafka for messaging"

Strong: "We'll use Kafka for messaging because:
  - We need at-least-once delivery
  - Message ordering is required per partition
  - We expect 50K messages/sec peak load
  - Kafka's log-based storage provides replay capability
  - Consumer groups allow parallel processing
  - Trade-off: Kafka adds complexity vs simple queue
  - Alternative: RabbitMQ if we need routing complexity
  - Alternative: SQS if we're AWS-only and don't need ordering"
```

#### 5. **"Behavioral Red Flags"**

- **Blaming others:** "My team didn't deliver, so project failed"
  - **Should be:** "I coordinated with team, realigned priorities, delivered MVP"

- **No metrics:** "I improved performance"
  - **Should be:** "I reduced API latency from 2s to 200ms, improving conversion by 15%"

- **No ownership:** "I was told to do X"
  - **Should be:** "I identified problem X, proposed solution Y, got buy-in, delivered Z"

#### 6. **"Couldn't Code in Time"**

**For 45-minute coding round:**
- First 5 min: Clarify problem
- Next 5 min: Discuss approaches
- Next 25 min: Code optimal solution
- Last 10 min: Test and discuss edge cases

**If you're not done by 35 minutes, you're too slow.**

#### 7. **"Lack of Depth in Current Role"**

**Interviewer asks:** "Tell me about a complex system you built"

**Weak answer:**
- "I worked on microservices using Spring Boot"

**Strong answer:**
- "I architected a payment processing system handling 10K TPS
- Designed event-driven architecture using Kafka
- Implemented saga pattern for distributed transactions
- Achieved 99.99% uptime over 2 years
- Key challenge: handling idempotency across 5 services
- Solution: unique transaction IDs + deduplication table
- Impact: Zero duplicate charges, saved $2M annually"

---

## 📅 30-45 Day Study Roadmap

### Phase 1: Foundation (Week 1-2)

#### Week 1: Data Structures & Algorithms Refresh
**Daily Schedule (3-4 hours/day):**

**Days 1-2: Arrays & Strings**
- [ ] Two pointers pattern (10 problems)
- [ ] Sliding window pattern (10 problems)
- [ ] Common patterns: prefix sum, kadane's algorithm
- [ ] FAANG problems: Longest Substring Without Repeating, Trapping Rain Water

**Days 3-4: LinkedList, Stack, Queue**
- [ ] Fast/slow pointer pattern
- [ ] Reverse LinkedList variations
- [ ] Monotonic stack problems
- [ ] FAANG problems: LRU Cache, Min Stack

**Days 5-7: Trees & Graphs**
- [ ] BFS/DFS patterns
- [ ] Binary search tree operations
- [ ] Graph traversal (topological sort, cycle detection)
- [ ] FAANG problems: Binary Tree Maximum Path Sum, Course Schedule

**Target:** Solve 70 problems this week (10/day)

#### Week 2: Advanced DSA
**Days 8-10: Dynamic Programming**
- [ ] 1D DP patterns
- [ ] 2D DP patterns
- [ ] DP on trees
- [ ] FAANG problems: Longest Increasing Subsequence, Edit Distance, House Robber

**Days 11-12: Heaps & Advanced Graphs**
- [ ] Top K problems
- [ ] Merge K sorted
- [ ] Dijkstra's, Union-Find
- [ ] FAANG problems: Merge K Sorted Lists, Network Delay Time

**Days 13-14: Practice Mixed Problems**
- [ ] Solve 5 random medium problems
- [ ] Solve 2 hard problems
- [ ] Mock interview with friend/platform
- [ ] Review mistakes

**Target:** Solve 50 more problems (Total: 120)

### Phase 2: System Design (Week 3)

**Days 15-17: System Design Fundamentals**
- [ ] Scalability basics (horizontal vs vertical)
- [ ] Load balancing (algorithms, sticky sessions)
- [ ] Caching strategies (cache-aside, write-through, write-back)
- [ ] Database sharding, replication
- [ ] CAP theorem deep dive
- [ ] Consistency patterns (strong, eventual, causal)
- [ ] Design 2 systems: URL Shortener, Pastebin

**Days 18-20: Advanced System Design**
- [ ] Message queues (Kafka, RabbitMQ)
- [ ] Microservices patterns (saga, circuit breaker)
- [ ] API Gateway, Service Discovery
- [ ] Rate limiting algorithms
- [ ] Design 2 systems: Twitter, Instagram Feed

**Day 21: Mock System Design Interview**
- [ ] Full 45-min mock with peer/mentor
- [ ] Design: Chat System or Payment Gateway
- [ ] Get feedback on:
  - Clarifying questions
  - Calculation accuracy
  - Architecture depth
  - Trade-off discussion

### Phase 3: Specialized Topics (Week 4)

**Days 22-24: Java & Backend Deep Dive**
- [ ] JVM internals (heap, stack, GC)
- [ ] Multithreading (thread pools, concurrent collections)
- [ ] Spring Boot internals (auto-configuration, bean lifecycle)
- [ ] Microservices patterns in-depth
- [ ] Practice: 20 Java output-based questions

**Days 25-27: Frontend Architecture**
- [ ] React internals (reconciliation, fiber)
- [ ] JavaScript deep dive (event loop, closures)
- [ ] Frontend system design (infinite scroll, real-time updates)
- [ ] Performance optimization patterns
- [ ] Practice: 15 JS output-based questions

**Day 28: Databases & Distributed Systems**
- [ ] SQL optimization (indexes, query plans)
- [ ] NoSQL patterns (when to use what)
- [ ] Distributed transactions (2PC, saga)
- [ ] Consensus algorithms (Raft, Paxos overview)

### Phase 4: Mock Interviews & Refinement (Week 5-6)

**Days 29-35: Full Loop Mocks**
- [ ] 2 coding mocks (45 min each)
- [ ] 2 system design mocks (45 min each)
- [ ] 1 behavioral mock (30 min)
- [ ] Review all feedback
- [ ] Identify weak areas
- [ ] Deep dive into weak topics

**Days 36-42: Behavioral Prep & Polish**
- [ ] Write 8-10 STAR stories
- [ ] Practice telling stories (record yourself)
- [ ] Prepare questions for interviewer
- [ ] Review company engineering blogs
- [ ] Company-specific prep:
  - Amazon: Leadership Principles
  - Google: Googleyness
  - Meta: Move Fast culture
  - Netflix: Context not Control

**Days 43-45: Final Prep**
- [ ] Light problem solving (keep skills sharp)
- [ ] Review your notes
- [ ] Practice whiteboard coding
- [ ] Rest and mental preparation

---

## 🗣️ Communication Strategy in Interviews

### The REACTO Framework (For Coding Interviews)

#### **R - Repeat the problem**
```
"Let me make sure I understand correctly:
- We need to find two numbers in an array that sum to a target
- The array is unsorted
- Can we assume all elements are integers?
- Can the array contain duplicates?
- Should we return indices or values?
- Is there always exactly one solution?"
```

**Why this matters:**
- Shows attention to detail
- Uncovers hidden requirements
- Prevents solving wrong problem
- Demonstrates senior-level thinking

#### **E - Examples**
```
"Let me work through some examples:

Input: [2, 7, 11, 15], target = 9
Output: [0, 1] (because 2 + 7 = 9)

Edge cases I should consider:
- Empty array → return empty or throw exception?
- Array with one element → impossible to find pair
- No solution exists → return empty or throw?
- Negative numbers → should work same way
- Target is 0 → need to handle negative numbers"
```

**Why this matters:**
- Demonstrates thoroughness
- Shows you think about edge cases
- Gives interviewer confidence

#### **A - Approach (Discuss multiple solutions)**
```
"I can think of 3 approaches:

Approach 1: Brute Force
- Nested loops, check every pair
- Time: O(n²), Space: O(1)
- Simple but inefficient for large arrays

Approach 2: Sort + Two Pointers
- Sort array first, use two pointers
- Time: O(n log n), Space: O(1) or O(n) depending on sort
- Better but sorting modifies array

Approach 3: HashMap (Optimal)
- Single pass, store complement in map
- Time: O(n), Space: O(n)
- Best for most cases, trade space for time

I recommend Approach 3 because:
- Linear time complexity
- Single pass (efficient)
- Space is acceptable for most use cases
- Doesn't modify input

Should I proceed with the HashMap approach?"
```

**Why this matters:**
- Shows you can think of multiple solutions
- Demonstrates trade-off analysis
- Proves you understand complexity
- Makes interviewer a collaborator, not interrogator

#### **C - Code**
```java
public int[] twoSum(int[] nums, int target) {
    // Validate input
    if (nums == null || nums.length < 2) {
        throw new IllegalArgumentException("Array must contain at least 2 elements");
    }
    
    // Map to store: value -> index
    Map<Integer, Integer> numToIndex = new HashMap<>();
    
    for (int i = 0; i < nums.length; i++) {
        int complement = target - nums[i];
        
        // Check if complement exists in map
        if (numToIndex.containsKey(complement)) {
            return new int[] {numToIndex.get(complement), i};
        }
        
        // Store current number and its index
        numToIndex.put(nums[i], i);
    }
    
    // No solution found
    throw new IllegalStateException("No two sum solution exists");
}
```

**Why this is production-grade:**
- Input validation
- Clear variable names
- Comments for clarity
- Proper exception handling
- No magic numbers

#### **T - Test**
```
"Let me test this with our examples:

Test 1: [2, 7, 11, 15], target = 9
- i=0: complement=7, map={}, add 2
- i=1: complement=2, found! return [0,1] ✓

Test 2: [3, 3], target = 6
- i=0: complement=3, map={}, add 3
- i=1: complement=3, found! return [0,1] ✓

Test 3: [1, 2, 3], target = 10
- Loops through all, no solution, throws exception ✓

Edge case: []
- Throws IllegalArgumentException immediately ✓
```

#### **O - Optimize**
```
"Current solution is already optimal:
- Time: O(n) - single pass
- Space: O(n) - HashMap storage

Further optimizations:
1. If array is sorted, we could use two pointers with O(1) space
2. If we can modify array, we could sort in-place
3. If multiple queries on same array, we could pre-build the map

For this problem, I believe current solution is best balance."
```

---

### System Design Communication Framework

#### **Step 1: Clarify Requirements (5 minutes)**

**Functional Requirements:**
```
"Let me clarify what we're building:
- Who are the users? (B2C, B2B, internal?)
- What are the core features? (prioritize must-have vs nice-to-have)
- What's out of scope?
- Any specific constraints (latency, consistency, cost)?"
```

**Non-Functional Requirements:**
```
"What are the scale expectations?
- How many users? (DAU, MAU)
- How many requests per second?
- How much data? (storage requirements)
- Geographic distribution? (single region vs global)
- Latency requirements? (p50, p99)
- Availability requirements? (99.9% vs 99.99%)
- Consistency vs Availability preference?"
```

**Example for "Design Twitter":**
```
Functional:
✓ Post tweet (280 chars)
✓ Follow/unfollow users
✓ View timeline (home feed)
✓ Search tweets
✗ DMs (out of scope)
✗ Notifications (out of scope)

Scale:
- 500M DAU
- 100M tweets/day = ~1200 tweets/sec (avg), 10K/sec (peak)
- 300M timeline views/day = ~3500 req/sec (avg)
- Read:Write = 300:1
- Store tweets for 5 years
- Global audience
- p99 latency < 500ms
- 99.9% availability acceptable
```

#### **Step 2: High-Level Design (10 minutes)**

```
"Here's my high-level architecture:

[Client] → [API Gateway] → [Tweet Service]
                         → [Timeline Service]
                         → [Follow Service]
                              ↓
                         [Message Queue]
                              ↓
                    [Timeline Fanout Worker]
                              ↓
                    [Redis (Timeline Cache)]
                              ↓
                    [Cassandra (Tweets DB)]
                    [PostgreSQL (User/Follow DB)]

Key decisions:
1. API Gateway: Rate limiting, authentication
2. Separate services: Scalability + team autonomy
3. Message queue: Decouple tweet posting from fanout
4. Redis: Cache hot timelines (active users)
5. Cassandra: Write-optimized for tweets
6. PostgreSQL: ACID for user/follow relationships
```

#### **Step 3: Deep Dive (20 minutes)**

**Talk through each component:**

```
"Let's discuss the Timeline Fanout strategy:

Approach 1: Fanout on Write (Push model)
- When user posts tweet, write to all followers' timelines
- Pros: Fast reads (timeline pre-computed)
- Cons: Slow writes (celebrity with 50M followers)
- Cons: Wasted storage (inactive users)

Approach 2: Fanout on Read (Pull model)
- When user requests timeline, query following list + fetch tweets
- Pros: Fast writes
- Cons: Slow reads (merge 5000 following lists)

Hybrid Approach (Recommended):
- For normal users (<10K followers): Fanout on write
- For celebrities (>10K followers): Fanout on read
- Cache aggressively on read path
- Use Redis sorted sets for timeline storage

Implementation:
1. User posts tweet → Tweet Service writes to Cassandra
2. Tweet Service publishes to Kafka topic
3. Fanout Worker consumes from Kafka
4. Worker checks follower count:
   - If <10K: Write to each follower's Redis timeline
   - If >10K: Just update celebrity's own timeline
5. On timeline read:
   - Fetch from Redis for normal users
   - Merge on-the-fly for celebrities you follow
   - Cache result for 5 minutes

Why this works:
- 99% of users have <10K followers (fast writes)
- Top 1% celebrities use on-read merge (acceptable for their scale)
- Redis sorted sets give O(log n) inserts and range queries
- Kafka provides buffering during traffic spikes
```

#### **Step 4: Bottlenecks & Scaling (10 minutes)**

```
"Potential bottlenecks and solutions:

Bottleneck 1: Database writes during peak hours
- Solution: Shard Cassandra by tweet ID
- Solution: Use SSD-backed instances
- Solution: Batch writes where possible

Bottleneck 2: Celebrity tweet fanout
- Solution: Rate limit fanout (spread over 5 minutes)
- Solution: Use multiple fanout workers
- Solution: Prioritize active users first

Bottleneck 3: Cache invalidation
- Solution: Use TTL-based expiry (5-10 minutes)
- Solution: Lazy loading (update on read if stale)

Bottleneck 4: Hot partition (trending topic)
- Solution: Use consistent hashing with virtual nodes
- Solution: Cache trending tweets separately
- Solution: Read replicas for hot data
```

---

## 🚫 Common Mistakes Senior Engineers Make

### 1. **Over-Engineering the Solution**

**Scenario:** Design a URL shortener

**Mistake:**
```
"We'll use Kubernetes, Kafka, microservices, machine learning for 
fraud detection, blockchain for audit trail, and GraphQL API..."
```

**For a service that needs:**
- 1000 URLs/day
- <10K total users
- Simple CRUD operations

**Correct approach:**
```
"Given the scale (1K URLs/day), a simple solution works:
- Single web server (Node.js/Python)
- PostgreSQL database
- Redis for caching popular URLs
- This handles 10x growth easily
- Can migrate to distributed system if we hit 100K+ URLs/day
- Cost: $50/month vs $5000/month for over-engineered solution"
```

**Why it matters:** Senior engineers should show judgment about appropriate complexity.

### 2. **Not Asking Clarifying Questions**

**Mistake:** Jump straight into solution

**Correct:**
```
Before designing, I need to clarify:
- Is this internal tool or public service?
- Do we need analytics on URL clicks?
- Custom short URLs or random generated?
- Expiration policy for URLs?
- Expected scale (URLs/day, requests/day)?
- Latency requirements?
- Regional vs global?
```

### 3. **Ignoring Non-Functional Requirements**

**Mistake:** Design works functionally but:
- No discussion of monitoring
- No failure handling
- No rollback strategy
- No cost consideration
- No operational complexity discussion

**Correct:**
```
"Let's discuss operational aspects:

Monitoring:
- Track error rates, latency (p50, p99), QPS
- Alert on >1% error rate or latency spike
- Dashboard for business metrics (URLs created, clicks)

Failure Handling:
- Database failure → Read from replica, writes fail gracefully
- Cache failure → Direct DB queries (slower but functional)
- Service failure → Health checks + auto-restart

Rollback Strategy:
- Blue-green deployment for API changes
- Database migrations → backward compatible for 1 version
- Feature flags for new features

Cost:
- Current scale: $200/month (2 servers, 1 DB, 1 cache)
- At 10x scale: $500/month (horizontal scaling)
- At 100x scale: $5K/month (sharding needed)
```

### 4. **Writing Code Without Discussing Approach**

**Mistake:** Start coding immediately

**Correct:**
```
"Let me discuss approaches before coding:

Approach 1: Brute force - O(n²)
Approach 2: Sorting - O(n log n)
Approach 3: HashMap - O(n)

Given constraints, I'll use Approach 3 because..."
```

### 5. **Not Discussing Trade-offs**

**Mistake:**
```
"We'll use microservices for this system."
```

**Correct:**
```
"Microservices vs Monolith trade-off:

Microservices Pros:
- Independent scaling
- Team autonomy
- Technology flexibility

Microservices Cons:
- Distributed system complexity
- Network latency between services
- Harder debugging
- Eventual consistency challenges

For our use case:
- If team <10 people → Start with monolith
- If need independent scaling → Use microservices
- If team >30 people → Microservices for team autonomy

Recommendation: Start monolith, split later when needed
Reason: Premature optimization costs 3-6 months of development
```

### 6. **Not Quantifying Impact in Behavioral Answers**

**Mistake:**
```
"I improved the system performance and users were happy."
```

**Correct:**
```
"I reduced API latency from 3 seconds to 300ms by:
- Adding Redis caching layer
- Optimizing N+1 queries
- Implementing pagination

Impact:
- Page load time improved from 5s to 1s
- Conversion rate increased from 2% to 3.5% (+75%)
- Revenue impact: $2M annually
- User satisfaction score: 3.2 → 4.5 (out of 5)
- Reduced server costs by 30% (fewer timeouts, retries)"
```

### 7. **Giving Up Too Quickly**

**Scenario:** Stuck on a problem

**Mistake:**
```
"I don't know how to proceed."
```

**Correct:**
```
"I'm not immediately seeing the optimal solution. 
Let me think through what I know:
- Constraint X suggests approach Y
- Similar problem is Z, which used technique W
- Let me try this approach and see if it works...

Can you give me a hint about [specific aspect]?"
```

**Why it matters:** Interviewers want to see resilience and problem-solving process.

### 8. **Not Testing Code**

**Mistake:** Write code and say "done"

**Correct:**
```
"Let me test this with a few cases:

Test 1: Normal case - [2,7,11,15], target=9 → [0,1] ✓
Test 2: No solution - [1,2,3], target=10 → exception ✓
Test 3: Duplicates - [3,3], target=6 → [0,1] ✓
Test 4: Negative numbers - [-1,2,3], target=1 → [0,1] ✓
Test 5: Edge case - [], target=5 → exception ✓

I should also add unit tests for:
- Null input handling
- Integer overflow (if sum can exceed MAX_INT)
```

### 9. **Poor Time Management**

**For 45-minute coding interview:**

**Mistake:**
- 20 min: Discussing problem
- 30 min: Coding (rushed, buggy)
- No time for testing

**Correct:**
- 5 min: Clarify + examples
- 5 min: Discuss approaches
- 25 min: Code optimal solution
- 10 min: Test + edge cases

### 10. **Not Showing Leadership in Behavioral Rounds**

**Mistake:**
```
"I was part of a team that built a microservice."
```

**Correct:**
```
"I led the initiative to break our monolith into microservices.

Situation:
- Monolith had 500K LOC, 8-hour build times
- 3 teams blocking each other on releases

Action:
- Analyzed dependencies, identified 5 bounded contexts
- Created RFC for migration strategy
- Got buy-in from 3 engineering teams + VP
- Planned phased rollout (6 months)
- Mentored 2 junior engineers on microservice patterns

Result:
- Reduced build time from 8 hours to 15 minutes
- Teams shipping independently (2-week sprints vs 3-month releases)
- Downtime reduced from 4 hours/month to 15 min/month
- Zero data loss during migration

Learning:
- Should have invested more in testing infrastructure upfront
- Would have done canary releases earlier in process"
```

---

## 🎪 Interview Loop Breakdown by Company

### Google (L5 - Senior Software Engineer)

**Interview Rounds:**
1. **Phone Screen (45 min)**
   - 1-2 coding problems (medium level)
   - Focus: Clean code, optimal solution

2. **Onsite (5 rounds × 45 min)**
   - **Coding × 2:** Medium-hard problems, deep CS fundamentals
   - **System Design × 1:** Scalable system (Twitter, YouTube)
   - **Googleyness & Leadership × 1:** Culture fit, collaboration
   - **General Cognitive Ability × 1:** Problem-solving, learning ability

**Key Points:**
- Google values **algorithm optimization** heavily
- Expect questions on graph algorithms, dynamic programming
- Must write compilable code (no pseudocode)
- Googleyness = humility + collaboration + comfort with ambiguity

**Bar for L5:**
- Should solve medium problems in <25 minutes
- Should identify optimal solution without hints
- Should discuss 2-3 approaches before coding

---

### Meta (E5 - Software Engineer)

**Interview Rounds:**
1. **Phone Screen (45 min)**
   - 1-2 coding problems
   - Live coding, focus on communication

2. **Onsite (4-5 rounds × 45 min)**
   - **Coding × 2:** Medium-hard, focus on optimization
   - **System Design × 1:** Design scalable systems
   - **Behavioral × 1:** "Jedi" round - culture + values
   - **Optional: Domain specific (Frontend/Backend)**

**Key Points:**
- Meta values **execution speed** ("Move Fast")
- Expect optimization follow-ups
- Behavioral focuses on: impact, ownership, adaptability
- Must discuss metrics and data

**Bar for E5:**
- Should write production-ready code
- Should drive system design conversation
- Should show examples of shipping large-scale features

---

### Amazon (SDE-3 / Senior SDE)

**Interview Rounds:**
1. **Phone Screen (45 min)**
   - 1-2 coding problems
   - 1 leadership principle question

2. **Onsite (5 rounds × 60 min)**
   - **Coding × 2:** Medium problems, focus on working code
   - **System Design × 1:** Design scalable AWS-based system
   - **Leadership Principles × 2:** Deep dive into past experiences
   - **Bar Raiser × 1:** Mix of coding + behavioral (hardest round)

**Key Points:**
- **16 Leadership Principles** are critical (40% of evaluation)
- Must have STAR stories for: Ownership, Bias for Action, Earn Trust, Deliver Results
- Amazon focuses on **working code** > perfect algorithm
- Bar Raiser has veto power

**Bar for SDE-3:**
- Should show ownership beyond own team
- Should have examples of mentoring
- Should demonstrate bias for action (launch vs perfect)

**Top Leadership Principles for SDE-3:**
1. Ownership
2. Deliver Results
3. Earn Trust
4. Hire and Develop the Best
5. Bias for Action

---

### Netflix (Senior Software Engineer)

**Interview Rounds:**
1. **Phone Screen (45 min)**
   - Coding + system design mix
   - Focus on practical problem-solving

2. **Onsite (4-5 rounds × 60 min)**
   - **Coding × 1-2:** Practical problems, not LeetCode-heavy
   - **System Design × 2:** Deep architectural discussions
   - **Behavioral × 1:** Culture fit ("Context, not Control")
   - **Domain specific:** Frontend/Backend/Data

**Key Points:**
- Netflix values **senior judgment** > algorithmic skills
- Less LeetCode, more system design and architecture
- Culture: "Freedom and Responsibility"
- Must show independent decision-making

**Bar for Senior:**
- Should make architectural decisions independently
- Should discuss trade-offs at business level (cost, time-to-market)
- Should show examples of operating autonomously

---

### Apple (ICT4 - Senior Software Engineer)

**Interview Rounds:**
1. **Phone Screen (45 min)**
   - Coding problem
   - Focus on clean, efficient code

2. **Onsite (6-8 rounds × 30-45 min)**
   - **Coding × 3-4:** Mix of easy-hard problems
   - **System Design × 1-2:** Design Apple-quality systems
   - **Domain specific × 2:** iOS/macOS/Backend deep dive
   - **Behavioral × 1:** Team fit, attention to detail

**Key Points:**
- Apple values **attention to detail** and **polish**
- More rounds, shorter duration
- Expect domain-specific deep dives
- Culture: Secrecy, excellence, user experience

**Bar for ICT4:**
- Should write bug-free code first time
- Should show appreciation for user experience
- Should demonstrate deep technical expertise in domain

---

## 🎯 Final Tips

### Day Before Interview
- [ ] Review your STAR stories
- [ ] Practice 2-3 medium problems (keep skills sharp, don't learn new concepts)
- [ ] Read company engineering blog
- [ ] Prepare 3-5 questions for interviewer
- [ ] Get good sleep

### During Interview
- [ ] Think out loud (interviewer can't help if they don't know where you're stuck)
- [ ] Draw diagrams (system design, algorithm visualization)
- [ ] Use the whiteboard (even for notes)
- [ ] Ask for clarification (better than solving wrong problem)
- [ ] Admit when you don't know (then explain how you'd find out)

### After Each Round
- [ ] Take notes on what was asked
- [ ] Reflect on what went well / poorly
- [ ] Adjust approach for next rounds

---

## 📚 Next Steps

1. Read through all topic-specific guides
2. Start with 30-day roadmap
3. Track progress daily
4. Do mock interviews weekly
5. Join study groups
6. Practice on platforms:
   - LeetCode (for coding)
   - Pramp/Interviewing.io (for mocks)
   - System Design Primer (for architecture)

---

**Remember:** FAANG interviews are a learnable skill. It's not about being naturally brilliant—it's about structured preparation, pattern recognition, and effective communication.

**You've got this! 🚀**
