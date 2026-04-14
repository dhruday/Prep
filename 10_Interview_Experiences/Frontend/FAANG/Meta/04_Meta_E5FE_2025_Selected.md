# Meta — Senior Frontend Engineer Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meta |
| **Role** | E5 Frontend |
| **Level** | Senior |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Remote (London) |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Instagram Web |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 2 Coding + Product Sense + Behavioral)
- **Timeline:** 4 weeks

---

## Round 1: Coding (React)
**Duration:** 35 minutes

### Questions Asked
1. **Build a Messenger Chat Input** (like Facebook Messenger)
   - Text input with @ mention autocomplete
   - Emoji picker trigger (`:` prefix)
   - Send on Enter, newline on Shift+Enter
   - File attachment with drag-and-drop
   - Typing indicator ("John is typing...")

### 💡 Chat Input with Mentions

```jsx
function ChatInput({ onSend, users, onTyping }) {
  const [text, setText] = useState('');
  const [mentionQuery, setMentionQuery] = useState(null); // null = no popup
  const [mentionIndex, setMentionIndex] = useState(0);
  const [attachments, setAttachments] = useState([]);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  // Detect @mention trigger
  const handleChange = (e) => {
    const value = e.target.value;
    setText(value);
    
    // Emit typing indicator (debounced)
    clearTimeout(typingTimeoutRef.current);
    onTyping?.(true);
    typingTimeoutRef.current = setTimeout(() => onTyping?.(false), 2000);
    
    // Detect @mention
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  };
  
  const filteredUsers = useMemo(() => {
    if (mentionQuery === null) return [];
    return users.filter(u =>
      u.name.toLowerCase().includes(mentionQuery.toLowerCase())
    ).slice(0, 5);
  }, [mentionQuery, users]);
  
  const insertMention = (user) => {
    const cursorPos = inputRef.current.selectionStart;
    const textBefore = text.slice(0, cursorPos);
    const textAfter = text.slice(cursorPos);
    const beforeMention = textBefore.replace(/@\w*$/, '');
    
    setText(`${beforeMention}@${user.name} ${textAfter}`);
    setMentionQuery(null);
    
    // Restore focus
    requestAnimationFrame(() => {
      const newPos = beforeMention.length + user.name.length + 2; // +2 for @ and space
      inputRef.current.setSelectionRange(newPos, newPos);
      inputRef.current.focus();
    });
  };
  
  const handleKeyDown = (e) => {
    // Mention navigation
    if (mentionQuery !== null && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => (prev + 1) % filteredUsers.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => (prev - 1 + filteredUsers.length) % filteredUsers.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredUsers[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setMentionQuery(null);
        return;
      }
    }
    
    // Send message
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (text.trim() || attachments.length > 0) {
        onSend({ text: text.trim(), attachments });
        setText('');
        setAttachments([]);
        onTyping?.(false);
        clearTimeout(typingTimeoutRef.current);
      }
    }
    // Shift+Enter = newline (default textarea behavior)
  };
  
  // Drag and drop files
  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).slice(0, 10); // Max 10
    
    const validFiles = files.filter(f => {
      if (f.size > 25 * 1024 * 1024) return false; // 25MB limit
      return true;
    });
    
    setAttachments(prev => [...prev, ...validFiles.map(file => ({
      file,
      id: crypto.randomUUID(),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    }))]);
  };
  
  const removeAttachment = (id) => {
    setAttachments(prev => {
      const removed = prev.find(a => a.id === id);
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter(a => a.id !== id);
    });
  };
  
  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      attachments.forEach(a => {
        if (a.preview) URL.revokeObjectURL(a.preview);
      });
    };
  }, []); // eslint-disable-line -- cleanup only on unmount
  
  return (
    <div className="chat-input"
         onDrop={handleDrop}
         onDragOver={e => e.preventDefault()}>
      
      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="attachments-bar" role="list" aria-label="Attached files">
          {attachments.map(att => (
            <div key={att.id} className="attachment-preview" role="listitem">
              {att.preview ? (
                <img src={att.preview} alt={att.file.name} />
              ) : (
                <span className="file-icon">📎 {att.file.name}</span>
              )}
              <button onClick={() => removeAttachment(att.id)} aria-label={`Remove ${att.file.name}`}>✕</button>
            </div>
          ))}
        </div>
      )}
      
      {/* Mention autocomplete popup */}
      {mentionQuery !== null && filteredUsers.length > 0 && (
        <ul className="mention-popup" role="listbox">
          {filteredUsers.map((user, idx) => (
            <li key={user.id} role="option"
                aria-selected={idx === mentionIndex}
                className={idx === mentionIndex ? 'highlighted' : ''}
                onClick={() => insertMention(user)}
                onMouseEnter={() => setMentionIndex(idx)}>
              <img src={user.avatar} alt="" width={24} height={24} />
              <span>{user.name}</span>
            </li>
          ))}
        </ul>
      )}
      
      <textarea
        ref={inputRef}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Type a message... (@ to mention)"
        rows={1}
        aria-label="Message input"
        aria-autocomplete="list"
        aria-controls={mentionQuery !== null ? 'mention-popup' : undefined}
      />
      
      <button onClick={() => {
        if (text.trim() || attachments.length > 0) {
          onSend({ text: text.trim(), attachments });
          setText('');
          setAttachments([]);
        }
      }} aria-label="Send message">
        ➤
      </button>
    </div>
  );
}
```

---

## Round 2: Coding (JavaScript)
**Duration:** 35 minutes

### Questions Asked
1. **Implement a function to flatten a nested object with dot notation**
2. **Follow-up: Handle arrays, circular references**

### 💡 Flatten with Circular Reference Detection

```javascript
function flatten(obj, prefix = '', result = {}, seen = new WeakSet()) {
  if (seen.has(obj)) return result; // Circular reference — skip
  if (typeof obj === 'object' && obj !== null) seen.add(obj);
  
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        const arrKey = `${fullKey}[${index}]`;
        if (typeof item === 'object' && item !== null) {
          flatten(item, arrKey, result, seen);
        } else {
          result[arrKey] = item;
        }
      });
    } else if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
      flatten(value, fullKey, result, seen);
    } else {
      result[fullKey] = value;
    }
  }
  
  return result;
}

// Example:
flatten({
  a: { b: { c: 1 } },
  d: [1, { e: 2 }],
  f: new Date('2025-01-01')
});
// → { 'a.b.c': 1, 'd[0]': 1, 'd[1].e': 2, 'f': Date('2025-01-01') }
```

---

## 🎯 Key Takeaways
- Meta FE = **product-focused coding** — build features users actually use
- **Chat input patterns**: @mention with regex detection, cursor position management
- **Typing indicator**: debounced — emit `true` on change, `false` after 2s inactivity
- **Drag-and-drop files**: onDrop + e.dataTransfer.files + URL.createObjectURL for previews
- **Memory leak prevention**: URL.revokeObjectURL on remove + unmount cleanup
- **Object flattening**: handle arrays with `[index]` notation, WeakSet for circular detection
- **Meta interviews**: 35-min rounds are SHORT — practice speed + correctness
- Focus on **product sense**: why this feature? How to measure success? A/B test metrics?

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding (React) | Hard | Chat Input, Mentions, Drag-Drop |
| Coding (JS) | Medium | Object Flatten, Circular Refs |
| Product Sense | Hard | Feature Prioritization, Metrics |
| Behavioral | Medium | Meta Values |
