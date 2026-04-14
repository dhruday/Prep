# Apple — ICT3 FullStack Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Apple |
| **Role** | ICT3 Software Engineer |
| **Level** | ICT3 |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Cupertino, CA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Rejection Reason** | System design: insufficient detail on offline conflict resolution |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone + Code + System Design + Behavioral + Team Match)

---

## Round 1: Coding
**Duration:** 60 minutes

### Questions Asked
1. **Design an Iterator that flattens a nested structure** (like NestedIterator — LeetCode 341)
2. **Follow-up: Make it truly lazy (don't flatten everything upfront)**

### 💡 Lazy Nested Iterator

```java
class NestedIterator implements Iterator<Integer> {
    private final Deque<Iterator<NestedInteger>> stack = new ArrayDeque<>();
    private Integer nextVal = null;
    
    NestedIterator(List<NestedInteger> nestedList) {
        stack.push(nestedList.iterator());
        advance(); // Prepare first value
    }
    
    @Override
    public boolean hasNext() {
        return nextVal != null;
    }
    
    @Override
    public Integer next() {
        if (nextVal == null) throw new NoSuchElementException();
        Integer result = nextVal;
        advance();
        return result;
    }
    
    // Lazy: only drills down as needed
    private void advance() {
        nextVal = null;
        
        while (!stack.isEmpty()) {
            Iterator<NestedInteger> current = stack.peek();
            
            if (!current.hasNext()) {
                stack.pop();
                continue;
            }
            
            NestedInteger item = current.next();
            
            if (item.isInteger()) {
                nextVal = item.getInteger();
                return; // Found next integer — stop
            } else {
                // Push nested list's iterator onto stack (lazy — don't flatten)
                stack.push(item.getList().iterator());
            }
        }
    }
}
// Time: amortized O(1) per next() call
// Space: O(D) where D = maximum nesting depth
// Truly lazy: only processes elements when next()/hasNext() is called
```

---

## Round 2: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Apple Notes Sync** (offline-first, cross-device, conflict resolution)
   - Create/edit/delete notes across iPhone, iPad, Mac, iCloud.com
   - Offline editing: full functionality without internet
   - Sync: eventual consistency across devices
   - Conflict resolution: two devices edit the same note offline
   - Attachments: images, drawings, scanned documents
   - Sharing: share notes/folders with other users

### 💡 Key Design

```
Architecture:
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   iPhone    │  │    iPad     │  │    Mac      │
│  (SQLite    │  │  (SQLite    │  │  (SQLite    │
│   + Core    │  │   + Core    │  │   + Core    │
│   Data)     │  │   Data)     │  │   Data)     │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       │    Push Notifications           │
       │    (notify device to sync)      │
       └────────────┬───────────────────┘
                    │ HTTPS (certificate pinning)
           ┌────────▼─────────┐
           │  CloudKit Server  │
           │  (Apple's BaaS)   │
           │                   │
           │  ┌─────────────┐  │
           │  │ Change Token │  │  Track per-device sync position
           │  │ System       │  │
           │  └─────────────┘  │
           │                   │
           │  ┌─────────────┐  │
           │  │ Conflict     │  │  Server detects conflicting changes
           │  │ Detection    │  │
           │  └─────────────┘  │
           │                   │
           │  ┌─────────────┐  │
           │  │ Asset Store  │  │  Images, attachments (S3-like)
           │  │ (separate)   │  │
           │  └─────────────┘  │
           └───────────────────┘

Offline-First Architecture:
class NoteSyncEngine {
    // Each device maintains:
    // 1. Local SQLite DB (source of truth for that device)
    // 2. Change log (operations since last sync)
    // 3. Server change token (bookmark for server-side changes)
    
    // Record every local change
    void recordLocalChange(NoteChange change) {
        changeLog.append(ChangeEntry.builder()
            .noteId(change.noteId)
            .operation(change.operation) // CREATE, UPDATE, DELETE
            .field(change.field)         // title, body, attachment
            .oldValue(change.oldValue)
            .newValue(change.newValue)
            .timestamp(DeviceClock.now()) // Hybrid Logical Clock
            .deviceId(thisDeviceId)
            .changeId(UUID.randomUUID())
            .build()
        );
    }
    
    // Sync: push local changes, pull remote changes
    SyncResult sync() {
        // 1. Push local changes to server
        List<ChangeEntry> localChanges = changeLog.getUnsynced();
        PushResult pushResult = cloudKit.pushChanges(localChanges, serverChangeToken);
        
        if (pushResult.hasConflicts()) {
            // Server detected conflicts → resolve
            for (Conflict conflict : pushResult.getConflicts()) {
                resolveConflict(conflict);
            }
        }
        
        // 2. Pull remote changes since our last sync
        FetchResult fetchResult = cloudKit.fetchChanges(serverChangeToken);
        
        for (ChangeEntry remoteChange : fetchResult.getChanges()) {
            applyRemoteChange(remoteChange);
        }
        
        // 3. Update server change token
        serverChangeToken = fetchResult.getNewChangeToken();
        
        // 4. Clear synced local changes
        changeLog.markSynced(localChanges);
        
        return new SyncResult(pushResult, fetchResult);
    }
}

Conflict Resolution Strategy:
class ConflictResolver {
    // Apple Notes uses "last writer wins" for simple fields
    // and "merge" for text body (CRDT-like approach)
    
    Note resolveConflict(Conflict conflict) {
        Note serverVersion = conflict.getServerRecord();
        Note clientVersion = conflict.getClientRecord();
        Note ancestorVersion = conflict.getAncestorRecord(); // Common ancestor
        
        Note merged = new Note(serverVersion.getId());
        
        // Title: Last Writer Wins (by timestamp)
        if (!eq(serverVersion.getTitle(), clientVersion.getTitle())) {
            merged.setTitle(
                serverVersion.getTitleModifiedAt().isAfter(clientVersion.getTitleModifiedAt())
                    ? serverVersion.getTitle()
                    : clientVersion.getTitle()
            );
        }
        
        // Body: Three-way merge
        if (!eq(serverVersion.getBody(), clientVersion.getBody())) {
            String mergedBody = threeWayMerge(
                ancestorVersion.getBody(),  // Common ancestor
                serverVersion.getBody(),    // Server's version
                clientVersion.getBody()     // Client's version
            );
            
            if (mergedBody == null) {
                // Cannot auto-merge → create conflict copy
                Note conflictCopy = clientVersion.clone();
                conflictCopy.setTitle(clientVersion.getTitle() + " (Conflict Copy)");
                localDB.insert(conflictCopy);
                merged.setBody(serverVersion.getBody()); // Keep server version
            } else {
                merged.setBody(mergedBody);
            }
        }
        
        // Attachments: union (keep all, remove duplicates by hash)
        Set<String> attachmentHashes = new HashSet<>();
        for (Attachment att : concat(serverVersion.getAttachments(), clientVersion.getAttachments())) {
            if (attachmentHashes.add(att.getContentHash())) {
                merged.addAttachment(att);
            }
        }
        
        // Checklist items: positional merge using unique item IDs
        merged.setChecklist(mergeChecklistItems(
            ancestorVersion.getChecklist(),
            serverVersion.getChecklist(),
            clientVersion.getChecklist()
        ));
        
        return merged;
    }
    
    // Three-way merge algorithm (diff3)
    String threeWayMerge(String ancestor, String server, String client) {
        // 1. Compute diff(ancestor, server) → server changes
        // 2. Compute diff(ancestor, client) → client changes
        // 3. If changes don't overlap: apply both → merged result
        // 4. If changes overlap at same location: CONFLICT → return null
        
        List<DiffHunk> serverDiffs = diff(ancestor, server);
        List<DiffHunk> clientDiffs = diff(ancestor, client);
        
        if (hunksOverlap(serverDiffs, clientDiffs)) {
            return null; // Conflict
        }
        
        return applyBothDiffs(ancestor, serverDiffs, clientDiffs);
    }
}

Attachment Sync:
- Attachments stored separately from note metadata (for size)
- Upload: chunk large attachments (5MB chunks), resume on failure
- Download: lazy — only download thumbnail initially, full image on tap
- Deduplication: content-addressed (SHA-256 hash) → same image in 2 notes = 1 copy

Hybrid Logical Clock (HLC):
- Physical clock + logical counter
- Handles clock skew between devices
- Ensures causal ordering: if A happened-before B, then HLC(A) < HLC(B)
- Used for Last Writer Wins comparison instead of wall clock
```

---

## 🎯 Key Takeaways
- Apple = **offline-first + conflict resolution + privacy + polished UX**
- **Nested Iterator**: stack of iterators, lazy evaluation — only process on `next()`/`hasNext()`
- **Offline-first**: local SQLite is source of truth, change log tracks unsynced operations
- **CloudKit change tokens**: bookmark per device → pull only what's new since last sync
- **Conflict resolution**: title/simple fields → LWW with HLC; body → three-way merge (diff3); attachments → union
- **Three-way merge**: needs common ancestor; if hunks overlap → create "Conflict Copy" note
- **Hybrid Logical Clock**: handles device clock skew, ensures causal ordering
- **Apple rejects** if offline conflict resolution isn't thorough — they're obsessive about offline-first

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone | Medium | JS/Swift Coding |
| Coding | Medium-Hard | Nested Iterator, Lazy Evaluation |
| System Design | Hard | Offline-First Sync, Conflict Resolution |
| Behavioral | Medium | Cross-Functional, Design Thinking |
| Team Match | Medium | Team Fit |
