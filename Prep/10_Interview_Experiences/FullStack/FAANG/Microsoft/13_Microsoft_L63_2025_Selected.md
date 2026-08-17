# Microsoft — L63 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Microsoft |
| **Role** | Senior Software Engineer |
| **Level** | L63 (Senior) |
| **YOE** | 8 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Redmond |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 On-site: 2 Coding + System Design + As-Appropriate)
- **Timeline:** 3 weeks
- **Format:** On-site

## Round 2: Coding — In-Memory File System with Permissions

### Problem
Design an in-memory file system that supports:
1. `mkdir(path)` — create directory (and intermediate dirs)
2. `createFile(path, content)` — create file with content
3. `readFile(path)` — return file's content
4. `ls(path)` — list directory contents (sorted)
5. `chmod(path, permission)` — set permissions (rwx for owner/group/other)
6. `checkPermission(path, user, action)` — check if user can perform action

Handle edge cases: path validation, directory vs file distinction, permission inheritance.

### 💡 Interview-Ready Answer

```java
import java.util.*;
import java.util.stream.*;

public class InMemoryFileSystem {

    enum NodeType { FILE, DIRECTORY }
    enum Permission { READ, WRITE, EXECUTE }
    enum PermScope { OWNER, GROUP, OTHER }

    static class FSNode {
        String name;
        NodeType type;
        String content;       // only for files
        String owner;
        String group;
        Map<String, FSNode> children; // only for directories
        // Permissions: 3-digit octal like Unix (e.g., 755)
        int permissions;

        FSNode(String name, NodeType type, String owner, String group) {
            this.name = name;
            this.type = type;
            this.owner = owner;
            this.group = group;
            this.content = "";
            this.children = (type == NodeType.DIRECTORY) ? new TreeMap<>() : null;
            this.permissions = (type == NodeType.DIRECTORY) ? 0755 : 0644;
        }
    }

    private final FSNode root;
    // user -> set of groups
    private final Map<String, Set<String>> userGroups = new HashMap<>();

    public InMemoryFileSystem() {
        root = new FSNode("/", NodeType.DIRECTORY, "root", "root");
        userGroups.put("root", Set.of("root"));
    }

    // --- User management ---
    public void addUser(String user, String... groups) {
        userGroups.put(user, new HashSet<>(Arrays.asList(groups)));
    }

    // --- Path helpers ---
    private String[] parsePath(String path) {
        if (path == null || path.isEmpty() || !path.startsWith("/"))
            throw new IllegalArgumentException("Invalid path: " + path);
        if (path.equals("/")) return new String[0];
        String cleaned = path.endsWith("/") ? path.substring(0, path.length() - 1) : path;
        return cleaned.substring(1).split("/");
    }

    private FSNode traverse(String[] parts, boolean createDirs, String user, String group) {
        FSNode current = root;
        for (int i = 0; i < parts.length; i++) {
            if (parts[i].isEmpty() || parts[i].contains(".."))
                throw new IllegalArgumentException("Invalid path component: " + parts[i]);

            if (current.type != NodeType.DIRECTORY)
                throw new IllegalStateException(current.name + " is not a directory");

            FSNode child = current.children.get(parts[i]);
            if (child == null) {
                if (!createDirs || i == parts.length - 1) {
                    return null;  // not found (last segment handled by caller)
                }
                child = new FSNode(parts[i], NodeType.DIRECTORY, user, group);
                current.children.put(parts[i], child);
            }
            current = child;
        }
        return current;
    }

    private FSNode getParent(String[] parts, boolean createDirs, String user, String group) {
        if (parts.length == 0) return root;
        String[] parentParts = Arrays.copyOfRange(parts, 0, parts.length - 1);
        FSNode parent = (parentParts.length == 0) ? root : traverse(parentParts, createDirs, user, group);
        if (parent == null) throw new IllegalStateException("Parent directory does not exist");
        if (parent.type != NodeType.DIRECTORY) throw new IllegalStateException("Parent is not a directory");
        return parent;
    }

    // --- mkdir ---
    public void mkdir(String path, String user) {
        String group = userGroups.containsKey(user) ? user : "users";
        String[] parts = parsePath(path);
        FSNode current = root;
        for (String part : parts) {
            FSNode child = current.children.get(part);
            if (child == null) {
                child = new FSNode(part, NodeType.DIRECTORY, user, group);
                current.children.put(part, child);
            } else if (child.type != NodeType.DIRECTORY) {
                throw new IllegalStateException("Path component " + part + " exists as a file");
            }
            current = child;
        }
    }

    // --- createFile ---
    public void createFile(String path, String content, String user) {
        String group = userGroups.containsKey(user) ? user : "users";
        String[] parts = parsePath(path);
        FSNode parent = getParent(parts, true, user, group);
        String fileName = parts[parts.length - 1];

        if (parent.children.containsKey(fileName)) {
            FSNode existing = parent.children.get(fileName);
            if (existing.type == NodeType.DIRECTORY)
                throw new IllegalStateException(fileName + " is a directory");
            existing.content = content; // overwrite
        } else {
            FSNode file = new FSNode(fileName, NodeType.FILE, user, group);
            file.content = content;
            parent.children.put(fileName, file);
        }
    }

    // --- readFile ---
    public String readFile(String path) {
        String[] parts = parsePath(path);
        FSNode node = traverse(parts, false, null, null);
        if (node == null) throw new IllegalStateException("File not found: " + path);
        if (node.type != NodeType.FILE) throw new IllegalStateException(path + " is a directory");
        return node.content;
    }

    // --- ls ---
    public List<String> ls(String path) {
        String[] parts = parsePath(path);
        FSNode node = (parts.length == 0) ? root : traverse(parts, false, null, null);
        if (node == null) throw new IllegalStateException("Path not found: " + path);
        if (node.type == NodeType.FILE) return List.of(node.name);
        return new ArrayList<>(node.children.keySet()); // TreeMap → sorted
    }

    // --- chmod (octal, e.g., 0755) ---
    public void chmod(String path, int permissions) {
        String[] parts = parsePath(path);
        FSNode node = traverse(parts, false, null, null);
        if (node == null) throw new IllegalStateException("Path not found: " + path);
        node.permissions = permissions;
    }

    // --- Permission check ---
    public boolean checkPermission(String path, String user, Permission action) {
        String[] parts = parsePath(path);
        FSNode node = traverse(parts, false, null, null);
        if (node == null) return false;

        // root user has all permissions
        if ("root".equals(user)) return true;

        PermScope scope;
        if (user.equals(node.owner)) {
            scope = PermScope.OWNER;
        } else if (userGroups.getOrDefault(user, Set.of()).contains(node.group)) {
            scope = PermScope.GROUP;
        } else {
            scope = PermScope.OTHER;
        }

        int relevantBits = switch (scope) {
            case OWNER -> (node.permissions >> 6) & 7;
            case GROUP -> (node.permissions >> 3) & 7;
            case OTHER -> node.permissions & 7;
        };

        int requiredBit = switch (action) {
            case READ -> 4;
            case WRITE -> 2;
            case EXECUTE -> 1;
        };

        return (relevantBits & requiredBit) != 0;
    }

    // --- Pretty print tree ---
    public void printTree(String path, String indent) {
        String[] parts = parsePath(path);
        FSNode node = (parts.length == 0) ? root : traverse(parts, false, null, null);
        if (node == null) return;
        printNode(node, indent);
    }

    private void printNode(FSNode node, String indent) {
        String perm = formatPermissions(node.permissions, node.type == NodeType.DIRECTORY);
        String sizeInfo = (node.type == NodeType.FILE) ? " (" + node.content.length() + " bytes)" : "";
        System.out.printf("%s%s %s %s:%s%s%n", indent, perm, node.name, node.owner, node.group, sizeInfo);
        if (node.children != null) {
            for (FSNode child : node.children.values()) {
                printNode(child, indent + "  ");
            }
        }
    }

    private String formatPermissions(int perms, boolean isDir) {
        char[] result = new char[10];
        result[0] = isDir ? 'd' : '-';
        for (int i = 0; i < 3; i++) {
            int bits = (perms >> (6 - i * 3)) & 7;
            result[1 + i * 3] = (bits & 4) != 0 ? 'r' : '-';
            result[2 + i * 3] = (bits & 2) != 0 ? 'w' : '-';
            result[3 + i * 3] = (bits & 1) != 0 ? 'x' : '-';
        }
        return new String(result);
    }

    public static void main(String[] args) {
        InMemoryFileSystem fs = new InMemoryFileSystem();

        // Setup users
        fs.addUser("alice", "devs", "alice");
        fs.addUser("bob", "devs", "bob");
        fs.addUser("charlie", "ops", "charlie");

        // Create directory structure
        fs.mkdir("/home/alice/projects", "alice");
        fs.mkdir("/home/bob", "bob");
        fs.mkdir("/var/log", "root");

        // Create files
        fs.createFile("/home/alice/projects/App.java", "public class App {}", "alice");
        fs.createFile("/home/alice/readme.md", "# Alice's Home", "alice");
        fs.createFile("/var/log/system.log", "2025-01-01 Boot OK", "root");

        // List
        System.out.println("=== ls / ===");
        fs.ls("/").forEach(e -> System.out.println("  " + e));

        System.out.println("\n=== ls /home/alice ===");
        fs.ls("/home/alice").forEach(e -> System.out.println("  " + e));

        // Read
        System.out.println("\n=== Read /home/alice/readme.md ===");
        System.out.println("  " + fs.readFile("/home/alice/readme.md"));

        // Permissions
        fs.chmod("/var/log/system.log", 0640); // rw-r-----

        System.out.println("\n=== Permission Checks ===");
        System.out.printf("  root READ /var/log/system.log: %b%n",
            fs.checkPermission("/var/log/system.log", "root", Permission.READ));
        System.out.printf("  charlie READ /var/log/system.log: %b%n",
            fs.checkPermission("/var/log/system.log", "charlie", Permission.READ));
        System.out.printf("  alice WRITE /home/alice/readme.md: %b%n",
            fs.checkPermission("/home/alice/readme.md", "alice", Permission.WRITE));

        // Tree
        System.out.println("\n=== File System Tree ===");
        fs.printTree("/", "");
    }
}
```

## 🎯 Key Takeaways
- Microsoft loves **object-oriented design** problems with real-world modeling
- Unix permission model: 3 octal digits × 3 bits (rwx for owner/group/other)
- TreeMap for sorted directory listing is a clean detail interviewers appreciate
- Path traversal defense (`..` rejection) is a **security must-mention**
- `mkdir -p` behavior (create intermediate dirs) shows practical awareness
- Bit manipulation for permission checks: `(perms >> shift) & 7` then `& requiredBit`
- Recursive tree printing demonstrates the hierarchical structure visually

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | Arrays, Sliding Window |
| Coding 1 | Medium | Binary Trees, BFS |
| Coding 2 | Hard | OOP Design, Tree Traversal, Permissions |
| System Design | Hard | Distributed File System |
| As-Appropriate | Medium | Growth Mindset, Collaboration |
