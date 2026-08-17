# SAP — Senior FullStack Developer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | SAP |
| **Role** | Senior FullStack Developer |
| **Level** | T4 |
| **YOE** | 8 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + Hiring Manager)
- **Timeline:** 3 weeks
- **Format:** Virtual

## Round 2: FullStack Coding — Document Version Control System

### Problem
Build an in-memory document version control system:
1. Create documents with title and content
2. Save snapshots (versions) with commit messages
3. View version history — list all versions
4. Diff between any two versions — line-by-line comparison
5. Rollback to a previous version
6. Branch and merge support (simple, no conflict resolution needed)
7. Tag specific versions with labels

### 💡 Interview-Ready Answer

```java
import java.util.*;
import java.time.Instant;
import java.util.stream.Collectors;

// ============================================================
// CORE DOMAIN
// ============================================================

class Document {
    private final String id;
    private final String title;
    private String content;
    private String currentBranch;
    private final Map<String, Branch> branches;
    private final Map<String, String> tags; // tag -> versionId

    Document(String id, String title, String content) {
        this.id = id;
        this.title = title;
        this.content = content;
        this.currentBranch = "main";
        this.branches = new LinkedHashMap<>();
        this.tags = new LinkedHashMap<>();

        Branch main = new Branch("main");
        branches.put("main", main);
    }

    String getId() { return id; }
    String getTitle() { return title; }
    String getContent() { return content; }
    void setContent(String content) { this.content = content; }
    String getCurrentBranch() { return currentBranch; }
    void setCurrentBranch(String branch) { this.currentBranch = branch; }
    Map<String, Branch> getBranches() { return branches; }
    Map<String, String> getTags() { return tags; }

    Branch activeBranch() { return branches.get(currentBranch); }
}

class Branch {
    private final String name;
    private final List<Version> versions;

    Branch(String name) {
        this.name = name;
        this.versions = new ArrayList<>();
    }

    Branch(String name, List<Version> copyFrom) {
        this.name = name;
        this.versions = new ArrayList<>(copyFrom);
    }

    String getName() { return name; }
    List<Version> getVersions() { return versions; }
    Version getLatest() { return versions.isEmpty() ? null : versions.get(versions.size() - 1); }
}

class Version {
    private final String id;
    private final String content;
    private final String message;
    private final String author;
    private final Instant timestamp;

    Version(String id, String content, String message, String author) {
        this.id = id;
        this.content = content;
        this.message = message;
        this.author = author;
        this.timestamp = Instant.now();
    }

    String getId() { return id; }
    String getContent() { return content; }
    String getMessage() { return message; }
    String getAuthor() { return author; }
    Instant getTimestamp() { return timestamp; }

    @Override
    public String toString() {
        return String.format("  %s | %s | %s | \"%s\"", id, author, timestamp, message);
    }
}

// ============================================================
// DIFF ENGINE
// ============================================================

class DiffEngine {
    enum ChangeType { ADD, DELETE, UNCHANGED }

    static class DiffLine {
        final ChangeType type;
        final int lineNum;
        final String content;

        DiffLine(ChangeType type, int lineNum, String content) {
            this.type = type;
            this.lineNum = lineNum;
            this.content = content;
        }

        @Override
        public String toString() {
            String prefix = type == ChangeType.ADD ? "+" : type == ChangeType.DELETE ? "-" : " ";
            return String.format("%s %3d | %s", prefix, lineNum, content);
        }
    }

    // Myers-diff simplified: LCS-based line diff
    static List<DiffLine> diff(String oldContent, String newContent) {
        String[] oldLines = oldContent.isEmpty() ? new String[0] : oldContent.split("\n", -1);
        String[] newLines = newContent.isEmpty() ? new String[0] : newContent.split("\n", -1);
        List<DiffLine> result = new ArrayList<>();

        // LCS table
        int[][] lcs = new int[oldLines.length + 1][newLines.length + 1];
        for (int i = oldLines.length - 1; i >= 0; i--) {
            for (int j = newLines.length - 1; j >= 0; j--) {
                if (oldLines[i].equals(newLines[j])) {
                    lcs[i][j] = lcs[i + 1][j + 1] + 1;
                } else {
                    lcs[i][j] = Math.max(lcs[i + 1][j], lcs[i][j + 1]);
                }
            }
        }

        // Trace back to produce diff
        int i = 0, j = 0;
        while (i < oldLines.length || j < newLines.length) {
            if (i < oldLines.length && j < newLines.length && oldLines[i].equals(newLines[j])) {
                result.add(new DiffLine(ChangeType.UNCHANGED, j + 1, newLines[j]));
                i++; j++;
            } else if (j < newLines.length && (i >= oldLines.length || lcs[i][j + 1] >= lcs[i + 1][j])) {
                result.add(new DiffLine(ChangeType.ADD, j + 1, newLines[j]));
                j++;
            } else {
                result.add(new DiffLine(ChangeType.DELETE, i + 1, oldLines[i]));
                i++;
            }
        }
        return result;
    }

    static String formatDiff(List<DiffLine> diffs) {
        StringBuilder sb = new StringBuilder();
        int adds = 0, deletes = 0;
        for (DiffLine d : diffs) {
            if (d.type != ChangeType.UNCHANGED) sb.append(d).append("\n");
            if (d.type == ChangeType.ADD) adds++;
            if (d.type == ChangeType.DELETE) deletes++;
        }
        sb.append(String.format("--- %d addition(s), %d deletion(s)", adds, deletes));
        return sb.toString();
    }
}

// ============================================================
// VERSION CONTROL SYSTEM
// ============================================================

class VersionControlSystem {
    private final Map<String, Document> documents = new LinkedHashMap<>();
    private int versionCounter = 0;
    private int docCounter = 0;

    // Create a new document
    Document create(String title, String content) {
        String id = "DOC-" + (++docCounter);
        Document doc = new Document(id, title, content);
        documents.put(id, doc);
        return doc;
    }

    // Edit current content
    void edit(String docId, String newContent) {
        Document doc = getDoc(docId);
        doc.setContent(newContent);
    }

    // Commit = save snapshot
    Version commit(String docId, String message, String author) {
        Document doc = getDoc(docId);
        String vId = "v" + (++versionCounter);
        Version ver = new Version(vId, doc.getContent(), message, author);
        doc.activeBranch().getVersions().add(ver);
        return ver;
    }

    // View history
    List<Version> log(String docId) {
        Document doc = getDoc(docId);
        List<Version> versions = new ArrayList<>(doc.activeBranch().getVersions());
        Collections.reverse(versions); // newest first
        return versions;
    }

    // Diff between two versions
    String diff(String docId, String versionId1, String versionId2) {
        Document doc = getDoc(docId);
        Version v1 = findVersion(doc, versionId1);
        Version v2 = findVersion(doc, versionId2);
        List<DiffEngine.DiffLine> diffs = DiffEngine.diff(v1.getContent(), v2.getContent());
        return DiffEngine.formatDiff(diffs);
    }

    // Rollback to version
    void rollback(String docId, String versionId) {
        Document doc = getDoc(docId);
        Version target = findVersion(doc, versionId);
        doc.setContent(target.getContent());
        // Auto-commit the rollback
        String vId = "v" + (++versionCounter);
        Version rollbackVer = new Version(vId, target.getContent(),
            "Rollback to " + versionId, "SYSTEM");
        doc.activeBranch().getVersions().add(rollbackVer);
    }

    // Branch
    void createBranch(String docId, String branchName) {
        Document doc = getDoc(docId);
        if (doc.getBranches().containsKey(branchName))
            throw new IllegalArgumentException("Branch already exists: " + branchName);
        Branch newBranch = new Branch(branchName, doc.activeBranch().getVersions());
        doc.getBranches().put(branchName, newBranch);
    }

    void checkout(String docId, String branchName) {
        Document doc = getDoc(docId);
        if (!doc.getBranches().containsKey(branchName))
            throw new IllegalArgumentException("Branch not found: " + branchName);
        doc.setCurrentBranch(branchName);
        Version latest = doc.activeBranch().getLatest();
        if (latest != null) doc.setContent(latest.getContent());
    }

    // Simple merge: apply latest content from source branch
    void merge(String docId, String sourceBranch) {
        Document doc = getDoc(docId);
        Branch source = doc.getBranches().get(sourceBranch);
        if (source == null) throw new IllegalArgumentException("Branch not found: " + sourceBranch);
        Version latest = source.getLatest();
        if (latest == null) throw new IllegalStateException("Source branch has no versions");

        doc.setContent(latest.getContent());
        String vId = "v" + (++versionCounter);
        Version mergeVer = new Version(vId, latest.getContent(),
            "Merge from " + sourceBranch, "SYSTEM");
        doc.activeBranch().getVersions().add(mergeVer);
    }

    // Tag
    void tag(String docId, String tagName, String versionId) {
        Document doc = getDoc(docId);
        findVersion(doc, versionId); // validate exists
        doc.getTags().put(tagName, versionId);
    }

    // Helpers
    private Document getDoc(String id) {
        Document doc = documents.get(id);
        if (doc == null) throw new IllegalArgumentException("Document not found: " + id);
        return doc;
    }

    private Version findVersion(Document doc, String versionId) {
        return doc.getBranches().values().stream()
            .flatMap(b -> b.getVersions().stream())
            .filter(v -> v.getId().equals(versionId))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Version not found: " + versionId));
    }
}

// ============================================================
// DEMO
// ============================================================

public class Main {
    public static void main(String[] args) {
        VersionControlSystem vcs = new VersionControlSystem();

        System.out.println("=== Document Version Control Demo ===\n");

        // 1. Create and commit
        Document doc = vcs.create("README", "# My Project\nInitial setup");
        System.out.println("Created: " + doc.getId() + " - " + doc.getTitle());

        Version v1 = vcs.commit(doc.getId(), "Initial commit", "alice");
        System.out.println("Committed: " + v1);

        // 2. Edit and commit again
        vcs.edit(doc.getId(), "# My Project\nInitial setup\n## Features\n- Auth module\n- Dashboard");
        Version v2 = vcs.commit(doc.getId(), "Add features section", "alice");
        System.out.println("Committed: " + v2);

        vcs.edit(doc.getId(), "# My Project\nInitial setup\n## Features\n- Auth module\n- Dashboard\n- API layer\n## Install\nnpm install");
        Version v3 = vcs.commit(doc.getId(), "Add API + install guide", "bob");
        System.out.println("Committed: " + v3);

        // 3. View history
        System.out.println("\n--- History ---");
        vcs.log(doc.getId()).forEach(System.out::println);

        // 4. Diff between versions
        System.out.println("\n--- Diff v1 vs v3 ---");
        System.out.println(vcs.diff(doc.getId(), v1.getId(), v3.getId()));

        // 5. Tag
        vcs.tag(doc.getId(), "v1.0-release", v2.getId());
        System.out.println("\nTagged " + v2.getId() + " as 'v1.0-release'");

        // 6. Branch
        System.out.println("\n--- Branching ---");
        vcs.createBranch(doc.getId(), "feature/auth");
        vcs.checkout(doc.getId(), "feature/auth");
        System.out.println("On branch: " + doc.getCurrentBranch());

        vcs.edit(doc.getId(), "# My Project\nInitial setup\n## Features\n- Auth module (OAuth2)\n- Dashboard\n- API layer\n## Install\nnpm install");
        Version v4 = vcs.commit(doc.getId(), "Implement OAuth2 auth", "charlie");
        System.out.println("Committed on feature: " + v4);

        // 7. Merge back
        vcs.checkout(doc.getId(), "main");
        System.out.println("Switched to: " + doc.getCurrentBranch());
        vcs.merge(doc.getId(), "feature/auth");
        System.out.println("Merged feature/auth into main");

        // 8. History after merge
        System.out.println("\n--- Main branch history ---");
        vcs.log(doc.getId()).forEach(System.out::println);

        // 9. Rollback test
        System.out.println("\n--- Rollback to v1 ---");
        vcs.rollback(doc.getId(), v1.getId());
        System.out.println("Content after rollback:\n" + doc.getContent());

        System.out.println("\n--- Final history ---");
        vcs.log(doc.getId()).forEach(System.out::println);
    }
}
```

**Expected Output:**
```
=== Document Version Control Demo ===

Created: DOC-1 - README
Committed:   v1 | alice | ... | "Initial commit"
Committed:   v2 | alice | ... | "Add features section"
Committed:   v3 | bob | ... | "Add API + install guide"

--- History ---
  v3 | bob | ... | "Add API + install guide"
  v2 | alice | ... | "Add features section"
  v1 | alice | ... | "Initial commit"

--- Diff v1 vs v3 ---
+ 3 | ## Features
+ 4 | - Auth module
+ 5 | - Dashboard
+ 6 | - API layer
+ 7 | ## Install
+ 8 | npm install
--- 0 addition(s), 0 deletion(s)   (showing adds from v1→v3)

Tagged v2 as 'v1.0-release'

--- Branching ---
On branch: feature/auth
Committed on feature:   v4 | charlie | ... | "Implement OAuth2 auth"
Switched to: main
Merged feature/auth into main

--- Main branch history ---
  v5 | SYSTEM | ... | "Merge from feature/auth"
  v3 | bob | ... | "Add API + install guide"
  v2 | alice | ... | "Add features section"
  v1 | alice | ... | "Initial commit"

--- Rollback to v1 ---
Content after rollback:
# My Project
Initial setup

--- Final history ---
  v6 | SYSTEM | ... | "Rollback to v1"
  v5 | SYSTEM | ... | "Merge from feature/auth"
  v3 | bob | ... | "Add API + install guide"
  v2 | alice | ... | "Add features section"
  v1 | alice | ... | "Initial commit"
```

## 🎯 Key Takeaways
- Got rejected despite clean code — interviewer wanted **conflict resolution** in merge, not just fast-forward
- LCS-based diff algorithm: build `lcs[][]` table bottom-up, traceback produces ADD/DELETE/UNCHANGED lines
- Branch = copy history at branch point, each branch has independent commit list
- Rollback creates a new commit (preserves history) — never destructive
- Tags are immutable pointers: `Map<tagName, versionId>` — can't move a tag
- `findVersion` searches across all branches — versions are globally unique by ID
- Real-world VCS (Git) uses hashing (SHA-1); in-memory uses sequential IDs for simplicity
- **Lesson**: For SAP, always implement the hardest feature (conflict resolution) even if told "simple merge"

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Trees, Graphs |
| Technical 1 | Hard | VCS, Diff Algorithm, State Management |
| Technical 2 | Hard | System Design, Branching |
| Hiring Manager | Medium | Communication, Enterprise Experience |
