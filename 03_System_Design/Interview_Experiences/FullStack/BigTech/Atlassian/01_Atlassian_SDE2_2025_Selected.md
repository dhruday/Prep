# Atlassian — SDE-2 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Atlassian |
| **Role** | Software Engineer P2 |
| **Level** | P2 (SDE-2 equivalent) |
| **YOE** | 4 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [Medium](https://medium.com/tag/atlassian-interview) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Values Interview + Coding + System Design + Manager)
- **Timeline:** 3 weeks
- **Format:** Virtual
- **Note:** Atlassian has a unique **Values Interview** round. It's not behavioral — it tests Atlassian's specific values.

---

## Round 1: Values Interview
**Duration:** 45 minutes | **Interviewer:** P3 Engineer

### Questions Asked (Atlassian's 5 Values)
1. **"Open Company, No Bullshit"** — "Tell me about a time you gave difficult feedback"
2. **"Build with Heart and Balance"** — "How do you maintain work-life balance while shipping features?"
3. **"Don't F*** the Customer"** — "Tell me about a time a customer found a bug. What did you do?"
4. **"Play as a Team"** — "How do you handle disagreements in code reviews?"
5. **"Be the Change You Seek"** — "What's something you improved that wasn't your responsibility?"

### 💡 Interview-Ready Answers

**"Open Company, No Bullshit" — Giving Difficult Feedback:**

**Situation:** A senior developer (10 YOE) consistently wrote undocumented, complex code. PRs had 500+ line changes with no comments. Team velocity was suffering because everyone spent 2+ hours understanding his PRs.

**Task:** Give feedback without damaging the relationship or making it a personal attack.

**Action:**
1. **Private 1:1**, not in a public code review: "I noticed our PR review times have increased. I want to talk about how we can improve that."
2. **Specific, not personal:** "In this PR (linked specific example), I spent 2 hours understanding the data flow. Could we add docstrings at function level and break 500-line PRs into smaller chunks?"
3. **Collaborative:** "What's your comfort level with PR size limits? I'm thinking 200 lines max."
4. **Followed up:** Set up a team guideline together (not imposed unilaterally).

**Result:** PR review time dropped 60%. He later told me: "I appreciate that you were direct. I didn't realize it was causing issues."

---

## Round 2: Coding
**Duration:** 60 minutes | **Interviewer:** P3 Engineer

### Questions Asked
1. **Text Justification** (LeetCode 68) — Hard
2. **Design a Task Board (Kanban) data structure** — support move, search, priority

### 💡 Interview-Ready Answer — Text Justification

```java
public List<String> fullJustify(String[] words, int maxWidth) {
    List<String> result = new ArrayList<>();
    int i = 0;
    
    while (i < words.length) {
        // Determine how many words fit in this line
        int lineLength = words[i].length();
        int j = i + 1;
        
        while (j < words.length && lineLength + 1 + words[j].length() <= maxWidth) {
            lineLength += 1 + words[j].length();
            j++;
        }
        
        int numWords = j - i;
        int totalSpaces = maxWidth - lineLength + (numWords - 1); // total space chars needed
        
        StringBuilder line = new StringBuilder();
        
        if (j == words.length || numWords == 1) {
            // Last line or single word: left justify
            for (int k = i; k < j; k++) {
                if (k > i) line.append(' ');
                line.append(words[k]);
            }
            while (line.length() < maxWidth) line.append(' '); // pad right
        } else {
            // Middle lines: distribute spaces evenly
            int gaps = numWords - 1;
            int spacesPerGap = totalSpaces / gaps;
            int extraSpaces = totalSpaces % gaps; // distribute extra to left gaps
            
            for (int k = i; k < j; k++) {
                line.append(words[k]);
                if (k < j - 1) {
                    int spaces = spacesPerGap + (k - i < extraSpaces ? 1 : 0);
                    for (int s = 0; s < spaces; s++) line.append(' ');
                }
            }
        }
        
        result.add(line.toString());
        i = j;
    }
    
    return result;
}
```

### 💡 Interview-Ready Answer — Task Board (Kanban)

```java
enum TaskStatus { TODO, IN_PROGRESS, IN_REVIEW, DONE }
enum Priority { LOW, MEDIUM, HIGH, CRITICAL }

class Task {
    String taskId;
    String title;
    String assignee;
    TaskStatus status;
    Priority priority;
    long createdAt;
    
    Task(String title, String assignee, Priority priority) {
        this.taskId = "TASK-" + UUID.randomUUID().toString().substring(0, 6);
        this.title = title;
        this.assignee = assignee;
        this.status = TaskStatus.TODO;
        this.priority = priority;
        this.createdAt = System.currentTimeMillis();
    }
}

class KanbanBoard {
    // Primary storage
    Map<String, Task> tasksById = new HashMap<>();
    
    // Column structure: status → sorted tasks (by priority DESC, then createdAt ASC)
    Map<TaskStatus, TreeSet<Task>> columns = new EnumMap<>(TaskStatus.class);
    
    // Indexes for fast search
    Map<String, Set<String>> assigneeIndex = new HashMap<>(); // assignee → taskIds
    
    KanbanBoard() {
        for (TaskStatus status : TaskStatus.values()) {
            columns.put(status, new TreeSet<>((a, b) -> {
                if (a.priority != b.priority) return b.priority.ordinal() - a.priority.ordinal();
                return Long.compare(a.createdAt, b.createdAt);
            }));
        }
    }
    
    Task createTask(String title, String assignee, Priority priority) {
        Task task = new Task(title, assignee, priority);
        tasksById.put(task.taskId, task);
        columns.get(task.status).add(task);
        assigneeIndex.computeIfAbsent(assignee, k -> new HashSet<>()).add(task.taskId);
        return task;
    }
    
    void moveTask(String taskId, TaskStatus newStatus) {
        Task task = tasksById.get(taskId);
        if (task == null) throw new IllegalArgumentException("Task not found");
        
        // Validate transition
        if (!isValidTransition(task.status, newStatus)) {
            throw new IllegalStateException("Invalid: " + task.status + " → " + newStatus);
        }
        
        columns.get(task.status).remove(task);
        task.status = newStatus;
        columns.get(newStatus).add(task);
    }
    
    List<Task> getColumn(TaskStatus status) {
        return new ArrayList<>(columns.get(status));
    }
    
    List<Task> getTasksByAssignee(String assignee) {
        return assigneeIndex.getOrDefault(assignee, Collections.emptySet())
            .stream()
            .map(tasksById::get)
            .sorted(Comparator.comparing(t -> t.priority, Comparator.reverseOrder()))
            .collect(Collectors.toList());
    }
    
    List<Task> searchTasks(String query) {
        String lowerQuery = query.toLowerCase();
        return tasksById.values().stream()
            .filter(t -> t.title.toLowerCase().contains(lowerQuery) || t.taskId.contains(lowerQuery))
            .collect(Collectors.toList());
    }
    
    private boolean isValidTransition(TaskStatus from, TaskStatus to) {
        return switch (from) {
            case TODO -> to == TaskStatus.IN_PROGRESS;
            case IN_PROGRESS -> to == TaskStatus.IN_REVIEW || to == TaskStatus.TODO;
            case IN_REVIEW -> to == TaskStatus.DONE || to == TaskStatus.IN_PROGRESS;
            case DONE -> to == TaskStatus.TODO; // reopen
        };
    }
}
```

---

## Round 3: System Design
**Duration:** 60 minutes | **Interviewer:** Principal Engineer

### Questions Asked
1. **Design Jira — Issue Tracking System**

### 💡 Interview-Ready Answer

```
┌────────────────────────────────────────────────────────────────┐
│                         Client Layer                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                    │
│  │ Web SPA  │  │ Mobile   │  │ CLI/API  │                    │
│  │ (React)  │  │ App      │  │ Clients  │                    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                    │
└───────┼──────────────┼──────────────┼─────────────────────────┘
        │              │              │
        ▼              ▼              ▼
┌────────────────────────────────────────────────────────────────┐
│  API Gateway (Auth, Rate Limiting, Routing)                     │
└──────────────────────────┬─────────────────────────────────────┘
                           │
         ┌─────────────────┼──────────────────┐
         ▼                 ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Issue       │  │  Board       │  │  Search      │
│  Service     │  │  Service     │  │  Service     │
│              │  │              │  │              │
│  - CRUD      │  │  - Kanban    │  │  - Full-text │
│  - Workflow  │  │  - Scrum     │  │  - JQL       │
│  - Comments  │  │  - Swimlanes │  │  - Filters   │
│  - Watchers  │  │  - WIP limits│  │              │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                  │
       ▼                 ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  PostgreSQL  │  │  Redis       │  │  Elasticsearch│
│  (Issues,    │  │  (Sessions,  │  │  (Full-text   │
│   Projects,  │  │   Board      │  │   search,     │
│   Workflows) │  │   state)     │  │   JQL engine) │
└──────────────┘  └──────────────┘  └──────────────┘
       │
       ▼
┌──────────────┐
│  Kafka       │  → Real-time updates → WebSocket push
│  (Events)    │  → Webhook triggers
│              │  → Activity feed
└──────────────┘
```

#### Data Model
```sql
CREATE TABLE projects (
    project_id    VARCHAR(10) PRIMARY KEY,  -- e.g., "JIRA"
    name          VARCHAR(255) NOT NULL,
    lead_user_id  VARCHAR(36),
    workflow_id   VARCHAR(36),
    created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE issues (
    issue_id      VARCHAR(20) PRIMARY KEY,  -- e.g., "JIRA-1234"
    project_id    VARCHAR(10) REFERENCES projects(project_id),
    issue_type    VARCHAR(20) NOT NULL,     -- Bug, Story, Task, Epic
    summary       VARCHAR(500) NOT NULL,
    description   TEXT,
    status        VARCHAR(50) NOT NULL,     -- To Do, In Progress, Done
    priority      VARCHAR(10),              -- P1, P2, P3, P4
    assignee_id   VARCHAR(36),
    reporter_id   VARCHAR(36) NOT NULL,
    parent_id     VARCHAR(20),              -- for sub-tasks, linked to epic
    sprint_id     VARCHAR(36),
    story_points  INT,
    labels        TEXT[],                   -- PostgreSQL array
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_project_status (project_id, status),
    INDEX idx_assignee (assignee_id),
    INDEX idx_sprint (sprint_id)
);

CREATE TABLE issue_history (
    history_id    BIGSERIAL PRIMARY KEY,
    issue_id      VARCHAR(20) REFERENCES issues(issue_id),
    field_changed VARCHAR(50),
    old_value     TEXT,
    new_value     TEXT,
    changed_by    VARCHAR(36),
    changed_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE comments (
    comment_id    BIGSERIAL PRIMARY KEY,
    issue_id      VARCHAR(20) REFERENCES issues(issue_id),
    author_id     VARCHAR(36) NOT NULL,
    body          TEXT NOT NULL,
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW()
);
```

#### JQL (Jira Query Language) Engine
```
JQL: "project = TEAM AND status = 'In Progress' AND assignee = currentUser() ORDER BY priority DESC"

Implementation:
1. Parse JQL → AST (Abstract Syntax Tree)
2. Simple queries → translate to SQL WHERE clauses (fast)
3. Complex queries (full-text, fuzzy) → translate to Elasticsearch DSL
4. Results merged and ranked

Example translation:
  JQL: assignee = "john" AND priority in (P1, P2) AND labels = "backend"
  
  SQL: SELECT * FROM issues 
       WHERE assignee_id = 'john_id' 
         AND priority IN ('P1', 'P2') 
         AND 'backend' = ANY(labels)
       ORDER BY priority ASC;
```

---

## Round 4: Hiring Manager
**Duration:** 45 minutes

### Questions Asked
1. **"What do you know about Atlassian's products?"**
2. **"How do you handle technical debt in a fast-paced environment?"**
3. **"Tell me about a time you simplified a complex system"**

### 💡 Interview-Ready Answer — Simplifying a Complex System

**Situation:** Inherited a notification system with 15 different notification types, each implemented as a separate class with copy-pasted code. Adding a new type took 3 days of boilerplate. 4000 lines of notification code.

**Task:** Reduce complexity without breaking existing notifications.

**Action:**
1. **Identified the pattern:** All 15 types followed the same flow: build message → check preferences → route to channel → send
2. **Extracted a template:** Created a `NotificationTemplate` with hooks for customization points. Each type only needs to define: title, body, recipients, channel.
3. **Config-driven:** Moved notification definitions to YAML config instead of Java classes
4. **Migration:** Migrated 15 types one by one (over 2 sprints), keeping old code as fallback until verified
5. **Result:** 4000 lines → 800 lines. Adding a new notification type: 3 days → 30 minutes (just add YAML config).

---

## 🎯 Key Takeaways
- Atlassian's **Values Interview** is unique — practice all 5 values with STAR stories
- **Text Justification** is a hard string problem — handle last line and single-word lines as edge cases
- **Kanban Board** LLD is very relevant for Atlassian — use TreeSet for ordered tasks
- **Jira design** is Atlassian's signature system design question — know JQL, workflows, and data model
- **"Open Company, No Bullshit"** means: show you give direct, constructive feedback
- **"Don't F*** the Customer"** means: show you prioritize customer impact over engineering elegance

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Values | Medium | Behavioral (Atlassian-specific) |
| Coding | Hard | String Manipulation, OOP, Data Structures |
| System Design | Hard | Issue Tracking, Search, Workflows |
| Manager | Medium | Simplification, Technical Debt |
