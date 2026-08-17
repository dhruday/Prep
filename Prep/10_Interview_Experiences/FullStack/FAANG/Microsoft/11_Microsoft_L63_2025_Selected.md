# Microsoft — Senior SDE Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Microsoft |
| **Role** | Senior Software Development Engineer |
| **Level** | L63 (Senior) |
| **YOE** | 7 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Hyderabad, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/microsoft-interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone + 3 Technical + AA/Hiring Manager)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 1: Phone Screen
**Duration:** 60 minutes

### Questions Asked
1. **Design and Implement a Text Editor with Undo/Redo**
   - Support: insert, delete, cursor movement, select, undo, redo
   - Efficient memory usage with rope data structure or gap buffer

### 💡 Interview-Ready Answer

```java
import java.util.*;

public class TextEditor {

    // Gap buffer: efficient for cursor-local edits
    private char[] buffer;
    private int gapStart;
    private int gapEnd;
    private int totalSize;

    // Undo/Redo stacks using Command Pattern
    private Deque<Command> undoStack = new ArrayDeque<>();
    private Deque<Command> redoStack = new ArrayDeque<>();

    // Selection
    private int selectionStart = -1;
    private int selectionEnd = -1;

    interface Command {
        void execute();
        void undo();
    }

    class InsertCommand implements Command {
        int position;
        String text;

        InsertCommand(int position, String text) {
            this.position = position;
            this.text = text;
        }

        public void execute() {
            moveCursorTo(position);
            for (char c : text.toCharArray()) {
                insertChar(c);
            }
        }

        public void undo() {
            moveCursorTo(position);
            for (int i = 0; i < text.length(); i++) {
                deleteForward();
            }
        }
    }

    class DeleteCommand implements Command {
        int position;
        String deletedText;

        DeleteCommand(int position, String deletedText) {
            this.position = position;
            this.deletedText = deletedText;
        }

        public void execute() {
            moveCursorTo(position);
            for (int i = 0; i < deletedText.length(); i++) {
                deleteForward();
            }
        }

        public void undo() {
            moveCursorTo(position);
            for (char c : deletedText.toCharArray()) {
                insertChar(c);
            }
        }
    }

    public TextEditor(int initialCapacity) {
        this.buffer = new char[initialCapacity];
        this.gapStart = 0;
        this.gapEnd = initialCapacity;
        this.totalSize = initialCapacity;
    }

    // ================================================
    // Core gap buffer operations — O(1) amortized
    // ================================================
    private void ensureCapacity(int needed) {
        int gapSize = gapEnd - gapStart;
        if (gapSize >= needed) return;

        int newSize = Math.max(totalSize * 2, totalSize + needed);
        char[] newBuffer = new char[newSize];

        // Copy before gap
        System.arraycopy(buffer, 0, newBuffer, 0, gapStart);
        // Copy after gap to the end
        int afterGapLen = totalSize - gapEnd;
        System.arraycopy(buffer, gapEnd, newBuffer, newSize - afterGapLen, afterGapLen);

        gapEnd = newSize - afterGapLen;
        totalSize = newSize;
        buffer = newBuffer;
    }

    private void moveCursorTo(int position) {
        if (position < gapStart) {
            int moveLen = gapStart - position;
            System.arraycopy(buffer, position, buffer, gapEnd - moveLen, moveLen);
            gapStart = position;
            gapEnd -= moveLen;
        } else if (position > gapStart) {
            int moveLen = position - gapStart;
            System.arraycopy(buffer, gapEnd, buffer, gapStart, moveLen);
            gapStart += moveLen;
            gapEnd += moveLen;
        }
    }

    private void insertChar(char c) {
        ensureCapacity(1);
        buffer[gapStart++] = c;
    }

    private char deleteForward() {
        if (gapEnd >= totalSize) return '\0';
        return buffer[gapEnd++];
    }

    private char deleteBackward() {
        if (gapStart <= 0) return '\0';
        return buffer[--gapStart];
    }

    // ================================================
    // Public API
    // ================================================
    public void insert(String text) {
        InsertCommand cmd = new InsertCommand(gapStart, text);
        cmd.execute();
        undoStack.push(cmd);
        redoStack.clear(); // new action clears redo history
    }

    public String delete(int count) {
        StringBuilder deleted = new StringBuilder();
        int pos = gapStart;

        // Peek at characters that will be deleted (after gap)
        for (int i = 0; i < count && gapEnd + i < totalSize; i++) {
            deleted.append(buffer[gapEnd + i]);
        }

        DeleteCommand cmd = new DeleteCommand(pos, deleted.toString());
        cmd.execute();
        undoStack.push(cmd);
        redoStack.clear();
        return deleted.toString();
    }

    public String backspace(int count) {
        StringBuilder deleted = new StringBuilder();
        int actualCount = Math.min(count, gapStart);

        for (int i = 1; i <= actualCount; i++) {
            deleted.append(buffer[gapStart - i]);
        }
        deleted.reverse();

        int pos = gapStart - actualCount;
        moveCursorTo(pos);

        DeleteCommand cmd = new DeleteCommand(pos, deleted.toString());
        // Already moved cursor to correct position — just delete forward
        for (int i = 0; i < actualCount; i++) deleteForward();

        undoStack.push(cmd);
        redoStack.clear();
        return deleted.toString();
    }

    public void moveCursor(int position) {
        int contentLen = getLength();
        int safePos = Math.max(0, Math.min(position, contentLen));
        moveCursorTo(safePos);
    }

    public void undo() {
        if (undoStack.isEmpty()) return;
        Command cmd = undoStack.pop();
        cmd.undo();
        redoStack.push(cmd);
    }

    public void redo() {
        if (redoStack.isEmpty()) return;
        Command cmd = redoStack.pop();
        cmd.execute();
        undoStack.push(cmd);
    }

    public int getCursorPosition() {
        return gapStart;
    }

    public int getLength() {
        return totalSize - (gapEnd - gapStart);
    }

    public String getText() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < gapStart; i++) sb.append(buffer[i]);
        for (int i = gapEnd; i < totalSize; i++) sb.append(buffer[i]);
        return sb.toString();
    }

    @Override
    public String toString() {
        String text = getText();
        int cursor = getCursorPosition();
        return text.substring(0, cursor) + "|" + text.substring(cursor);
    }

    public static void main(String[] args) {
        TextEditor editor = new TextEditor(16);

        editor.insert("Hello World");
        System.out.println(editor); // Hello World|

        editor.moveCursor(5);
        System.out.println(editor); // Hello| World

        editor.insert(",");
        System.out.println(editor); // Hello,| World

        editor.undo();
        System.out.println(editor); // Hello| World

        editor.redo();
        System.out.println(editor); // Hello,| World

        editor.moveCursor(0);
        editor.insert("=> ");
        System.out.println(editor); // => |Hello, World

        editor.undo();
        System.out.println(editor); // |Hello, World

        System.out.println("Length: " + editor.getLength());
    }
}
```

**Key Design Decisions:**
- **Gap Buffer** over Rope for simplicity and cache-friendliness (O(1) local edits, O(N) cursor jumps)
- **Command Pattern** for undo/redo — each operation is a reversible command object
- **Amortized O(1)** insertion at cursor position

| Operation | Gap Buffer | Rope | Array |
|-----------|-----------|------|-------|
| Insert at cursor | O(1)* | O(log N) | O(N) |
| Delete at cursor | O(1) | O(log N) | O(N) |
| Move cursor | O(N) | O(log N) | O(1) |
| Get text | O(N) | O(N) | O(N) |

## Round 2-3: Technical Onsite
**Duration:** 60 min each

### Questions Asked
- Round 2: Clone Graph (BFS/DFS with visited map)
- Round 3: Design a thread-safe singleton with lazy initialization in Java

## Round 4: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Microsoft Teams Chat Backend**
   - 1:1, group, and channel messaging
   - Read receipts, typing indicators
   - Message search and retention policies

## Round 5: AA (As Appropriate) / Hiring Manager
**Duration:** 45 minutes

## 🎯 Key Takeaways
- Microsoft loves **editor/document problems** — gap buffer, rope, CRDT for collaborative editing
- Command pattern for undo/redo is the expected design for any editor question
- L63 system design expects **deep dive into message delivery guarantees** — at-least-once, exactly-once
- AA round is the final decision-maker — preparation for "why Microsoft" is essential

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Hard | Gap Buffer, Command Pattern |
| Technical 2 | Medium | BFS/DFS, Graph Cloning |
| Technical 3 | Medium | Singleton, Concurrency |
| System Design | Hard | Chat, WebSocket, Message Queue |
| AA Round | Medium | Behavioral, Culture Fit |
