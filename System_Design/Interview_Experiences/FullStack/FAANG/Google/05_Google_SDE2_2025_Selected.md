# Google — SDE-2 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Google |
| **Role** | Software Developer Engineer 2 |
| **Level** | L4 |
| **YOE** | 5 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Hyderabad, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/google-interview-experience-for-sde-2/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Recruiter + 3 Coding + 1 System Design)
- **Timeline:** 3.5 weeks
- **Format:** Virtual, Google Meet + Google Docs for coding

---

## Round 1: Recruiter Screen
**Duration:** 20 minutes

Standard background check, motivation, and role fitment discussion.

---

## Round 2: Coding I
**Duration:** 45 minutes | **Interviewer:** L4 SDE

### Questions Asked
1. **Task Scheduler** (LeetCode 621)
   - Given tasks array and cooldown `n`, find minimum intervals CPU needs to complete all tasks

### 💡 Interview-Ready Answer

**Approach 1: Greedy with Max-Heap**
```java
public int leastInterval(char[] tasks, int n) {
    // Count frequency of each task
    int[] freq = new int[26];
    for (char task : tasks) freq[task - 'A']++;
    
    // Max-heap: always schedule the most frequent task first
    PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Collections.reverseOrder());
    for (int f : freq) {
        if (f > 0) maxHeap.offer(f);
    }
    
    int intervals = 0;
    
    while (!maxHeap.isEmpty()) {
        List<Integer> temp = new ArrayList<>();
        
        // Process up to (n+1) tasks in one cycle
        for (int i = 0; i <= n; i++) {
            if (!maxHeap.isEmpty()) {
                int count = maxHeap.poll();
                if (count > 1) temp.add(count - 1);
            }
        }
        
        // Add remaining tasks back to heap
        maxHeap.addAll(temp);
        
        // If heap is empty, we only worked for temp tasks; else full cycle (n+1)
        intervals += maxHeap.isEmpty() ? (n + 1 - (n + 1 - temp.size() - (n + 1 - temp.size() >= 0 ? 0 : 0))) : (n + 1);
    }
    // Simpler formula approach:
    return intervals;
}
```

**Approach 2: Math Formula (Optimal)**
```java
public int leastInterval(char[] tasks, int n) {
    int[] freq = new int[26];
    for (char task : tasks) freq[task - 'A']++;
    
    int maxFreq = 0;
    int maxCount = 0; // how many tasks have max frequency
    for (int f : freq) {
        if (f > maxFreq) {
            maxFreq = f;
            maxCount = 1;
        } else if (f == maxFreq) {
            maxCount++;
        }
    }
    
    // Formula: (maxFreq - 1) * (n + 1) + maxCount
    // The last row has maxCount tasks, no idle needed after
    int result = (maxFreq - 1) * (n + 1) + maxCount;
    
    // If tasks are many and cooldown is small, no idle needed
    return Math.max(result, tasks.length);
}
```

**Walkthrough with Example:** tasks = [A,A,A,B,B,B], n=2
```
maxFreq = 3 (A and B both appear 3 times)
maxCount = 2
result = (3-1) * (2+1) + 2 = 6 + 2 = 8
Schedule: A B _ A B _ A B → 8 intervals
```

**Complexity:** Time O(n), Space O(1) (26 chars max)

**Edge Cases:**
- n = 0 → answer = tasks.length (no cooldown)
- All tasks same → (freq - 1) * (n + 1) + 1
- All tasks different → answer = tasks.length

---

## Round 3: Coding II
**Duration:** 45 minutes | **Interviewer:** L5 SDE

### Questions Asked
1. **Meeting Rooms II** (LeetCode 253)
   - Given array of meeting intervals, find minimum number of conference rooms required

### 💡 Interview-Ready Answer

**Approach: Sort + Min-Heap (Greedy)**
```java
public int minMeetingRooms(int[][] intervals) {
    if (intervals.length == 0) return 0;
    
    // Sort by start time
    Arrays.sort(intervals, (a, b) -> a[0] - b[0]);
    
    // Min-heap tracks end times of ongoing meetings
    PriorityQueue<Integer> heap = new PriorityQueue<>();
    heap.offer(intervals[0][1]);
    
    for (int i = 1; i < intervals.length; i++) {
        // If earliest ending meeting finishes before this starts, reuse room
        if (intervals[i][0] >= heap.peek()) {
            heap.poll();
        }
        // Assign room (new or reused)
        heap.offer(intervals[i][1]);
    }
    
    return heap.size(); // heap size = rooms in use
}
```

**Alternative: Sweep Line (elegant)**
```java
public int minMeetingRooms(int[][] intervals) {
    int[] starts = new int[intervals.length];
    int[] ends = new int[intervals.length];
    
    for (int i = 0; i < intervals.length; i++) {
        starts[i] = intervals[i][0];
        ends[i] = intervals[i][1];
    }
    
    Arrays.sort(starts);
    Arrays.sort(ends);
    
    int rooms = 0, endPtr = 0;
    for (int start : starts) {
        if (start < ends[endPtr]) {
            rooms++; // need new room
        } else {
            endPtr++; // reuse room
        }
    }
    return rooms;
}
```

**Complexity:** Both O(n log n) time, O(n) space

**Follow-up:** "What if meetings can be moved to optimize room usage?" → NP-hard (interval graph coloring), use greedy as approximation.

---

## Round 4: System Design
**Duration:** 45 minutes | **Interviewer:** L6 Staff SDE

### Questions Asked
1. **Design Google Calendar**

### 💡 Interview-Ready Answer

#### Requirements
**Functional:**
- Create/update/delete events
- Recurring events support
- Invite attendees, RSVP
- Conflict detection
- Event reminders (email + push)
- View: day/week/month
- Shared calendars

**Non-Functional:**
- 500M active users
- 95% reads, 5% writes
- Read latency < 100ms
- Strong consistency for event updates
- Eventual consistency for cross-user views

#### API Design
```
POST /api/v1/events
{
    "title": "Team Standup",
    "startTime": "2025-01-15T09:00:00Z",
    "endTime": "2025-01-15T09:30:00Z",
    "recurrence": "RRULE:FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR",
    "attendees": ["user2@google.com", "user3@google.com"],
    "reminders": [{"method": "push", "minutes": 10}]
}

GET /api/v1/events?calendarId={id}&timeMin={}&timeMax={}
GET /api/v1/freebusy?users=[id1,id2]&timeMin={}&timeMax={}
PUT /api/v1/events/{eventId}
DELETE /api/v1/events/{eventId}
POST /api/v1/events/{eventId}/rsvp  { "status": "accepted" }
```

#### Architecture
```
┌──────────┐     ┌──────────────┐     ┌──────────────────┐
│  Client   │────▶│  API Gateway │────▶│  Event Service   │
│  (Web/    │     │  + Auth      │     │  (CRUD + logic)  │
│   Mobile) │     └──────────────┘     └────────┬─────────┘
└──────────┘                                     │
                              ┌──────────────────┼──────────────────┐
                              ▼                  ▼                  ▼
                    ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
                    │  Events DB   │   │  Recurrence  │   │  Notification│
                    │  (Spanner)   │   │  Engine      │   │  Service     │
                    │              │   │  (Expand     │   │  (Push/Email)│
                    │  Sharded by  │   │   RRULEs)    │   │              │
                    │  user_id     │   └──────────────┘   └──────────────┘
                    └──────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
           ┌──────────────┐    ┌──────────────┐
           │  Read Cache   │    │  Search/     │
           │  (Redis)      │    │  Free-Busy   │
           │  user→events  │    │  Index       │
           └──────────────┘    └──────────────┘
```

#### Database Schema
```sql
CREATE TABLE events (
    event_id        UUID PRIMARY KEY,
    calendar_id     UUID NOT NULL,
    owner_id        UUID NOT NULL,       -- shard key
    title           VARCHAR(500),
    start_time      TIMESTAMP NOT NULL,
    end_time        TIMESTAMP NOT NULL,
    is_recurring    BOOLEAN DEFAULT FALSE,
    recurrence_rule VARCHAR(500),         -- RRULE string
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP,
    INDEX idx_owner_time (owner_id, start_time)
);

CREATE TABLE attendees (
    event_id        UUID,
    user_id         UUID,
    rsvp_status     ENUM('pending', 'accepted', 'declined', 'tentative'),
    PRIMARY KEY (event_id, user_id),
    INDEX idx_user_events (user_id, event_id)
);

CREATE TABLE reminders (
    reminder_id     UUID PRIMARY KEY,
    event_id        UUID,
    user_id         UUID,
    trigger_time    TIMESTAMP,
    method          ENUM('push', 'email'),
    sent            BOOLEAN DEFAULT FALSE,
    INDEX idx_trigger (trigger_time, sent)
);
```

#### Deep Dive: Recurring Events
- **Storage:** Store RRULE string, NOT expanded instances. Expand on read within view window.
- **Exception handling:** "Modified instances" stored separately with `original_start_time` as key.
- **Query:** For week view Jan 13-19: expand all RRULEs for user's events, merge with single events, sort by start time. Cache expanded view per week.

#### Deep Dive: Conflict Detection
```java
// Check conflicts for new event
SELECT COUNT(*) FROM events e
JOIN attendees a ON e.event_id = a.event_id
WHERE a.user_id = :userId
  AND e.start_time < :newEndTime
  AND e.end_time > :newStartTime;
-- + expand recurring events in time range
```

#### Scale: Free/Busy Lookup
- Pre-compute free/busy bitmaps per user per day (1 bit per 15-min slot = 96 bits/day)
- Store in Redis: `freebusy:{userId}:{date}` → bitmap
- Finding mutual free time = bitwise AND across all attendee bitmaps

---

## 🎯 Key Takeaways
- Google Calendar is a **deceptively complex** system design — recurring events and conflict detection are the hard parts
- **Math formula approach** for Task Scheduler is preferred — shows you can find patterns
- **Sweep line** technique is excellent for interval problems — cleaner than heap
- Practice RRULE parsing (RFC 5545) — it comes up in calendar designs
- Know the **free/busy bitmap** technique — elegant and efficient

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Round 2 | Medium | Greedy, Math, Priority Queue |
| Round 3 | Medium | Sorting, Min-Heap, Sweep Line |
| Round 4 | Hard | Database Design, Recurring Events, Bitmaps |
