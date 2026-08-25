# Atlassian — SDE-2 FullStack Interview Experience (2025) — #2

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Atlassian |
| **Role** | Software Engineer P4 |
| **Level** | Mid-Senior |
| **YOE** | 5 years |
| **Date** | February 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Values + Coding + System Design + Manager)
- **Rejection Reason:** Values round — didn't demonstrate "Don't #@!% the customer" well enough
- **Timeline:** 2 weeks

---

## Round 1: Values Interview
**Duration:** 45 minutes

**Atlassian's 5 Values:**
1. Open company, no bullshit
2. Build with heart and balance
3. Don't #@!% the customer
4. Play, as a team
5. Be the change you seek

### Questions Asked
1. **Tell me about a time you had to push back on a decision that would negatively impact users**
2. **Describe a situation where you balanced speed of delivery with quality**
3. **How do you handle disagreements with teammates?**

### 💡 STAR Answers

**Q1 — Don't #@!% the customer:**
- **Situation:** PM wanted to remove the manual retry button from payment failures to push users toward auto-retry, which increased conversion but left users helpless when auto-retry also failed.
- **Task:** Convince PM that removing user control was bad UX, propose alternative.
- **Action:** Gathered data: 15% of failed payments succeeded on manual retry with different UPI app. Built a quick A/B test: auto-retry first → show manual retry after 10s.
- **Result:** Conversion improved 8% (auto-retry benefit) while maintaining 99.2% user satisfaction (manual retry as fallback). PM agreed to hybrid approach.

**Q2 — Build with heart and balance:**
- **Situation:** Sprint deadline for Black Friday feature, team velocity indicated we'd miss by 2 days.
- **Task:** Deliver core functionality on time without burning out the team.
- **Action:** Identified 3 features: must-have (cart persistence), nice-to-have (animations), can-defer (analytics dashboard). Proposed phased release: core for Black Friday, rest in the following sprint.
- **Result:** Delivered on time, zero prod incidents during Black Friday (50x traffic). Team morale stayed high — no weekend work. Deferred features shipped 1 week later.

---

## Round 2: Coding
**Duration:** 60 minutes

### Questions Asked
1. **Implement a Simplified Jira Board — In-Memory Task Management**
   - Create/update/move tasks, sprints, priorities, search

### 💡 Interview-Ready Answer

```java
public class JiraBoard {
    private final Map<String, Task> tasks = new ConcurrentHashMap<>();
    private final Map<String, Sprint> sprints = new ConcurrentHashMap<>();
    private final AtomicInteger taskCounter = new AtomicInteger(0);
    
    enum Status { TODO, IN_PROGRESS, IN_REVIEW, DONE }
    enum Priority { CRITICAL, HIGH, MEDIUM, LOW }
    
    record Task(String id, String title, String description, Status status,
                Priority priority, String assignee, String sprintId,
                List<String> labels, Instant createdAt, Instant updatedAt) {}
    
    record Sprint(String id, String name, Instant startDate, Instant endDate,
                  List<String> taskIds, boolean active) {}
    
    // Create task
    String createTask(String title, String description, Priority priority, String assignee) {
        String id = "PROJ-" + taskCounter.incrementAndGet();
        
        Task task = new Task(id, title, description, Status.TODO, priority,
            assignee, null, new ArrayList<>(), Instant.now(), Instant.now());
        tasks.put(id, task);
        return id;
    }
    
    // Move task to different status (with validation)
    void moveTask(String taskId, Status newStatus) {
        Task task = tasks.get(taskId);
        if (task == null) throw new IllegalArgumentException("Task not found: " + taskId);
        
        // Validate transitions
        if (!isValidTransition(task.status, newStatus)) {
            throw new IllegalStateException(
                String.format("Cannot move from %s to %s", task.status, newStatus));
        }
        
        Task updated = new Task(task.id, task.title, task.description, newStatus,
            task.priority, task.assignee, task.sprintId, task.labels, 
            task.createdAt, Instant.now());
        tasks.put(taskId, updated);
    }
    
    private boolean isValidTransition(Status from, Status to) {
        return switch (from) {
            case TODO -> to == Status.IN_PROGRESS;
            case IN_PROGRESS -> to == Status.IN_REVIEW || to == Status.TODO; // Can move back
            case IN_REVIEW -> to == Status.DONE || to == Status.IN_PROGRESS; // Reject review
            case DONE -> to == Status.TODO; // Reopen
        };
    }
    
    // Assign to sprint
    void addToSprint(String taskId, String sprintId) {
        Task task = tasks.get(taskId);
        Sprint sprint = sprints.get(sprintId);
        if (task == null || sprint == null) throw new IllegalArgumentException("Not found");
        
        Task updated = new Task(task.id, task.title, task.description, task.status,
            task.priority, task.assignee, sprintId, task.labels,
            task.createdAt, Instant.now());
        tasks.put(taskId, updated);
        sprint.taskIds().add(taskId);
    }
    
    // Search with filters
    List<Task> search(String query, Status status, Priority priority, String assignee) {
        return tasks.values().stream()
            .filter(t -> query == null || 
                t.title.toLowerCase().contains(query.toLowerCase()) ||
                t.description.toLowerCase().contains(query.toLowerCase()))
            .filter(t -> status == null || t.status == status)
            .filter(t -> priority == null || t.priority == priority)
            .filter(t -> assignee == null || assignee.equals(t.assignee))
            .sorted(Comparator.comparing(Task::priority)
                .thenComparing(Comparator.comparing(Task::createdAt).reversed()))
            .collect(Collectors.toList());
    }
    
    // Sprint board view
    Map<Status, List<Task>> getBoardView(String sprintId) {
        Sprint sprint = sprints.get(sprintId);
        if (sprint == null) throw new IllegalArgumentException("Sprint not found");
        
        return sprint.taskIds().stream()
            .map(tasks::get)
            .filter(Objects::nonNull)
            .collect(Collectors.groupingBy(Task::status));
    }
    
    // Sprint velocity (story points completed)
    // Sprint burndown chart data
    Map<String, Integer> getSprintStats(String sprintId) {
        Sprint sprint = sprints.get(sprintId);
        Map<String, Integer> stats = new HashMap<>();
        
        List<Task> sprintTasks = sprint.taskIds().stream()
            .map(tasks::get).filter(Objects::nonNull).toList();
        
        stats.put("total", sprintTasks.size());
        stats.put("done", (int) sprintTasks.stream().filter(t -> t.status == Status.DONE).count());
        stats.put("inProgress", (int) sprintTasks.stream().filter(t -> t.status == Status.IN_PROGRESS).count());
        stats.put("todo", (int) sprintTasks.stream().filter(t -> t.status == Status.TODO).count());
        
        return stats;
    }
}
```

---

## Round 3: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Confluence — Collaborative Wiki**

### 💡 Interview-Ready Answer

```
Confluence Architecture:
┌──────────────────────────────────────────────────────────────┐
│  Core Features:                                               │
│  - Page tree (hierarchical pages + spaces)                   │
│  - Rich text editing with real-time collaboration            │
│  - Macros (code blocks, tables, Jira integrations)           │
│  - Version history + diff                                    │
│  - Comments (inline + page-level)                            │
│  - Permissions (space, page, user, group levels)             │
│                                                                │
│  Collaborative Editing:                                       │
│  - Use OT (Operational Transformation) — Atlassian actually  │
│    uses this in Confluence Cloud via Prosemirror              │
│  - Document = ProseMirror schema (JSON tree, not HTML)       │
│  - Each keystroke → operation → send to server → broadcast   │
│  - Server: single authority, transforms concurrent ops       │
│                                                                │
│  Architecture:                                                │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐       │
│  │ Client    │─▶│ Collab Service│─▶│ Doc Store        │       │
│  │ Editor    │  │ (WebSocket)  │  │ (PostgreSQL)     │       │
│  │ ProseMirror│  │              │  │                  │       │
│  │           │◀─│ OT Engine    │  │ page_versions    │       │
│  └──────────┘  └──────────────┘  └──────────────────┘       │
│                       │                                      │
│               ┌───────▼────────┐                             │
│               │ Search (ES)     │                             │
│               │ Full-text index │                             │
│               └────────────────┘                              │
│                                                                │
│  Page Storage Schema:                                         │
│  spaces: space_id, name, key, permissions                    │
│  pages:                                                       │
│    page_id UUID PK                                           │
│    space_id UUID FK                                          │
│    parent_page_id UUID FK (nullable — root pages)            │
│    title VARCHAR(255)                                        │
│    content_json JSONB -- ProseMirror document tree           │
│    version INT                                               │
│    created_by UUID                                           │
│    last_modified_by UUID                                     │
│    status ENUM('current', 'draft', 'archived')               │
│    position INT -- ordering within parent                    │
│                                                                │
│  Permissions Model:                                           │
│  - Space level: admin, edit, view                            │
│  - Page level: override space perms (restrict or extend)     │
│  - Inheritance: child pages inherit parent page permissions  │
│  - Groups: assign perms to groups, not just users            │
│  - Check: traverse up page tree, check each level            │
│    (with caching — invalidate on permission change)          │
│                                                                │
│  Search:                                                      │
│  - Elasticsearch for full-text search                        │
│  - Index: title, body text (extracted from JSON), labels     │
│  - Filter by: space, author, last modified date              │
│  - Highlighted excerpts in results                           │
│  - Real-time indexing via Kafka (page update → reindex)      │
│                                                                │
│  Version History:                                             │
│  - Every save creates new version (page_versions table)      │
│  - Diff: compare JSON trees → show added/removed/modified    │
│  - Restore: copy old version's content to current            │
│  - Retention: keep all versions (Confluence does this)       │
│  - Storage optimization: Delta compression between versions  │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Atlassian = **values first** — prepare STAR stories mapped to all 5 values
- I **got rejected on values** — "Don't #@!% the customer" requires concrete user-impact metrics
- **Jira Board coding** = state machine transitions + search + immutable records
- **Confluence design** = ProseMirror + OT + hierarchical permissions + search
- Atlassian values **balance** — don't brag about working weekends
- **isValidTransition** pattern for status moves — always validate state transitions
- Atlassian coding rounds are **less intense** than FAANG — focus on clean design

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Values | Hard | STAR, Atlassian Values, Metrics |
| Coding | Medium-Hard | State Machine, In-Memory Store, Search |
| System Design | Hard | Confluence, OT, Permissions, Search |
| Manager | Medium | Career Growth, Collaboration |
