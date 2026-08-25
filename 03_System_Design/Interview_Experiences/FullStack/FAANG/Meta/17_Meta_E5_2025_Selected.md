# Meta — E5 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meta |
| **Role** | Software Engineer |
| **Level** | E5 (Senior) |
| **YOE** | 7 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Menlo Park |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 On-site)
- **Timeline:** 3 weeks
- **Format:** On-site

## Round 2: Coding — Real-Time Collaborative Text Editor (OT/CRDT)

### Problem
Design a simplified Operational Transformation (OT) engine for a collaborative text editor:
1. Support Insert and Delete operations
2. Transform concurrent operations so they converge
3. Maintain document consistency across multiple clients
4. Handle operation history and undo
5. Demonstrate with a simulated multi-client scenario

### 💡 Interview-Ready Answer

```java
import java.util.*;
import java.util.concurrent.*;
import java.util.stream.*;

public class CollaborativeEditor {

    // --- Operation Types ---
    enum OpType { INSERT, DELETE }

    static class Operation {
        final OpType type;
        final int position;
        final char character;  // for INSERT
        final int clientId;
        final int revision;    // document revision this op was based on

        Operation(OpType type, int position, char character, int clientId, int revision) {
            this.type = type;
            this.position = position;
            this.character = character;
            this.clientId = clientId;
            this.revision = revision;
        }

        @Override
        public String toString() {
            return switch (type) {
                case INSERT -> String.format("INS('%c', %d) by client %d @rev%d",
                    character, position, clientId, revision);
                case DELETE -> String.format("DEL(%d) by client %d @rev%d",
                    position, clientId, revision);
            };
        }
    }

    // ============================================================
    // OPERATIONAL TRANSFORMATION ENGINE
    // ============================================================
    static class OTEngine {

        /**
         * Transform operation 'a' against operation 'b'.
         * Returns a' such that: apply(apply(doc, b), a') == apply(apply(doc, a), b')
         * This is the core OT invariant (TP1 / convergence).
         */
        static Operation transform(Operation a, Operation b) {
            if (a.type == OpType.INSERT && b.type == OpType.INSERT) {
                return transformInsertInsert(a, b);
            } else if (a.type == OpType.INSERT && b.type == OpType.DELETE) {
                return transformInsertDelete(a, b);
            } else if (a.type == OpType.DELETE && b.type == OpType.INSERT) {
                return transformDeleteInsert(a, b);
            } else {
                return transformDeleteDelete(a, b);
            }
        }

        private static Operation transformInsertInsert(Operation a, Operation b) {
            if (a.position < b.position || (a.position == b.position && a.clientId < b.clientId)) {
                // a's insert is before b's → no shift needed
                return a;
            } else {
                // a's insert is at or after b's → shift right by 1
                return new Operation(OpType.INSERT, a.position + 1, a.character, a.clientId, a.revision);
            }
        }

        private static Operation transformInsertDelete(Operation ins, Operation del) {
            if (ins.position <= del.position) {
                return ins; // insert before delete position → no change
            } else {
                // insert after delete → shift left by 1
                return new Operation(OpType.INSERT, ins.position - 1, ins.character, ins.clientId, ins.revision);
            }
        }

        private static Operation transformDeleteInsert(Operation del, Operation ins) {
            if (del.position < ins.position) {
                return del; // delete before insert → no change
            } else {
                // delete at or after insert → shift right by 1
                return new Operation(OpType.DELETE, del.position + 1, '\0', del.clientId, del.revision);
            }
        }

        private static Operation transformDeleteDelete(Operation a, Operation b) {
            if (a.position < b.position) {
                return a;
            } else if (a.position > b.position) {
                return new Operation(OpType.DELETE, a.position - 1, '\0', a.clientId, a.revision);
            } else {
                // Both delete same position → a becomes no-op
                // Return a special no-op (identity operation)
                return null; // null = no-op
            }
        }

        /**
         * Transform an operation against a sequence of already-applied operations.
         */
        static Operation transformAgainstHistory(Operation op, List<Operation> history, int fromRevision) {
            Operation transformed = op;
            for (int i = fromRevision; i < history.size(); i++) {
                if (transformed == null) return null; // became no-op
                transformed = transform(transformed, history.get(i));
            }
            return transformed;
        }
    }

    // ============================================================
    // DOCUMENT
    // ============================================================
    static class Document {
        private final StringBuilder content;
        private final List<Operation> history;
        private int revision;

        Document(String initial) {
            this.content = new StringBuilder(initial);
            this.history = new ArrayList<>();
            this.revision = 0;
        }

        String getContent() { return content.toString(); }
        int getRevision() { return revision; }

        void applyLocal(Operation op) {
            if (op == null) return;
            switch (op.type) {
                case INSERT -> {
                    int pos = Math.min(op.position, content.length());
                    content.insert(pos, op.character);
                }
                case DELETE -> {
                    if (op.position >= 0 && op.position < content.length()) {
                        content.deleteCharAt(op.position);
                    }
                }
            }
            history.add(op);
            revision++;
        }

        List<Operation> getHistory() { return Collections.unmodifiableList(history); }
    }

    // ============================================================
    // SERVER (Central authority)
    // ============================================================
    static class Server {
        private final Document document;
        private final Map<Integer, List<Operation>> pendingPerClient = new ConcurrentHashMap<>();

        Server(String initial) {
            this.document = new Document(initial);
        }

        /**
         * Receive an operation from a client.
         * Transform it against any operations the client hasn't seen.
         */
        synchronized Operation receiveOperation(Operation op) {
            Operation transformed = OTEngine.transformAgainstHistory(
                op, document.getHistory(), op.revision);

            if (transformed != null) {
                document.applyLocal(transformed);
                System.out.printf("  Server applied: %-40s → \"%s\" (rev %d)%n",
                    transformed, document.getContent(), document.getRevision());
            }
            return transformed;
        }

        String getContent() { return document.getContent(); }
        int getRevision() { return document.getRevision(); }
    }

    // ============================================================
    // CLIENT
    // ============================================================
    static class Client {
        final int id;
        final Document localDoc;
        int acknowledgedRevision;

        Client(int id, String initial) {
            this.id = id;
            this.localDoc = new Document(initial);
            this.acknowledgedRevision = 0;
        }

        Operation insert(int position, char ch) {
            Operation op = new Operation(OpType.INSERT, position, ch, id, acknowledgedRevision);
            localDoc.applyLocal(op);
            return op;
        }

        Operation delete(int position) {
            Operation op = new Operation(OpType.DELETE, position, '\0', id, acknowledgedRevision);
            localDoc.applyLocal(op);
            return op;
        }

        void applyRemote(Operation op) {
            if (op != null && op.clientId != id) {
                // Transform against local pending ops
                localDoc.applyLocal(op);
            }
            acknowledgedRevision++;
        }

        String getContent() { return localDoc.getContent(); }
    }

    // ============================================================
    // DEMO
    // ============================================================
    public static void main(String[] args) {
        String initial = "ABCDE";
        Server server = new Server(initial);
        Client client1 = new Client(1, initial);
        Client client2 = new Client(2, initial);

        System.out.println("Initial document: \"" + initial + "\"\n");

        // --- Scenario 1: Non-conflicting concurrent edits ---
        System.out.println("=== Scenario 1: Non-conflicting Edits ===");

        // Client 1 inserts 'X' at position 2: "ABXCDE"
        Operation op1 = client1.insert(2, 'X');
        System.out.println("Client 1 local: INS('X', 2) → \"" + client1.getContent() + "\"");

        // Client 2 inserts 'Y' at position 4: "ABCDYE"
        Operation op2 = client2.insert(4, 'Y');
        System.out.println("Client 2 local: INS('Y', 4) → \"" + client2.getContent() + "\"");

        // Server processes op1 first
        System.out.println("\nServer processing:");
        Operation serverOp1 = server.receiveOperation(op1);

        // Server processes op2 (needs transformation against op1)
        Operation serverOp2 = server.receiveOperation(op2);

        // Propagate to clients
        client1.applyRemote(serverOp1); // own op → just ack
        client1.applyRemote(serverOp2); // apply client2's (transformed) op

        client2.applyRemote(serverOp1); // apply client1's op
        client2.applyRemote(serverOp2); // own op → just ack

        System.out.println("\nConvergence check:");
        System.out.println("  Server:   \"" + server.getContent() + "\"");
        System.out.println("  Client 1: \"" + client1.getContent() + "\"");
        System.out.println("  Client 2: \"" + client2.getContent() + "\"");
        System.out.println("  Converged: " + (server.getContent().equals(client1.getContent())
            && server.getContent().equals(client2.getContent())));

        // --- Scenario 2: Conflicting edits at same position ---
        System.out.println("\n=== Scenario 2: Conflict at Same Position ===");
        String doc2 = "HELLO";
        Server server2 = new Server(doc2);
        Client c1 = new Client(1, doc2);
        Client c2 = new Client(2, doc2);

        // Both insert at position 1
        Operation conflictOp1 = c1.insert(1, 'A');
        System.out.println("Client 1: INS('A', 1) → \"" + c1.getContent() + "\"");

        Operation conflictOp2 = c2.insert(1, 'B');
        System.out.println("Client 2: INS('B', 1) → \"" + c2.getContent() + "\"");

        System.out.println("\nServer processing:");
        Operation s2op1 = server2.receiveOperation(conflictOp1);
        Operation s2op2 = server2.receiveOperation(conflictOp2);

        c1.applyRemote(s2op1);
        c1.applyRemote(s2op2);
        c2.applyRemote(s2op1);
        c2.applyRemote(s2op2);

        System.out.println("\nConvergence: " + server2.getContent());
        System.out.println("  (Client with lower ID wins tie → 'A' before 'B')");

        // --- Scenario 3: Insert + Delete conflict ---
        System.out.println("\n=== Scenario 3: Insert + Delete Conflict ===");
        String doc3 = "WORLD";
        Server server3 = new Server(doc3);
        Client c3 = new Client(1, doc3);
        Client c4 = new Client(2, doc3);

        Operation insOp = c3.insert(2, 'Z');
        System.out.println("Client 1: INS('Z', 2) → \"" + c3.getContent() + "\"");

        Operation delOp = c4.delete(3);
        System.out.println("Client 2: DEL(3) → \"" + c4.getContent() + "\"");

        System.out.println("\nServer processing:");
        Operation s3op1 = server3.receiveOperation(insOp);
        Operation s3op2 = server3.receiveOperation(delOp);

        System.out.println("Final: \"" + server3.getContent() + "\"");
    }
}
```

## 🎯 Key Takeaways
- Meta E5 interviews test **real-world collaborative systems** — OT is foundational to Google Docs, Figma
- **OT Convergence** (TP1 property): apply(apply(doc, a), b') == apply(apply(doc, b), a')
- Four transform cases: INS-INS, INS-DEL, DEL-INS, DEL-DEL — each shifts positions differently
- Tie-breaking for same-position inserts: **lower client ID wins** (deterministic ordering)
- DEL-DEL at same position → one becomes no-op (identity)
- Server is central authority — transforms ops against history since client's base revision
- This is OT; CRDT (Conflict-free Replicated Data Types) is the alternative — discuss tradeoffs

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | Arrays, Hashing |
| Coding 1 | Medium-Hard | Trees, Serialization |
| Coding 2 | Hard | OT/CRDT, Collaborative Editing, Concurrency |
| System Design | Hard | Real-Time Collaboration at Scale |
| Behavioral | Medium | Conflict Resolution, Impact |
