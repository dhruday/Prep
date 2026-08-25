# LinkedIn — Senior Frontend Engineer Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | LinkedIn |
| **Role** | Staff Frontend Engineer |
| **Level** | Senior |
| **YOE** | 7 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + JavaScript + System Design + HM)
- **Rejection Reason:** System Design — didn't cover opengraph scraping and link preview generation

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a LinkedIn-Style Post Composer**
   - Rich text: bold, mentions (@user), hashtags (#topic)
   - Image/video upload with preview
   - Mention autocomplete dropdown (type @dan → show Daniel, Danielle...)
   - Character count with warning at 2800/3000
   - Post visibility: Anyone, Connections only, Only me

### 💡 Interview-Ready Answer

```jsx
function PostComposer({ currentUser, onPost }) {
  const [content, setContent] = useState('');
  const [mentions, setMentions] = useState([]);
  const [mentionQuery, setMentionQuery] = useState(null); // { query, position }
  const [mentionResults, setMentionResults] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [visibility, setVisibility] = useState('ANYONE');
  const [posting, setPosting] = useState(false);
  const editorRef = useRef(null);
  const MAX_CHARS = 3000;
  const WARNING_THRESHOLD = 2800;
  
  // Detect @mention trigger
  const handleInput = (e) => {
    const text = e.target.textContent;
    setContent(text);
    
    // Check for @mention pattern
    const selection = window.getSelection();
    const cursorPos = selection.anchorOffset;
    const textBeforeCursor = text.slice(0, cursorPos);
    
    // Look for @ followed by word characters
    const mentionMatch = textBeforeCursor.match(/@(\w+)$/);
    
    if (mentionMatch) {
      setMentionQuery({
        query: mentionMatch[1],
        position: cursorPos - mentionMatch[0].length,
      });
      // Debounced search
      searchUsers(mentionMatch[1]);
    } else {
      setMentionQuery(null);
      setMentionResults([]);
    }
  };
  
  // Search users for mention
  const searchUsers = useMemo(() => {
    let timeoutId;
    return (query) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        if (query.length < 2) return;
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&limit=5`);
        const data = await res.json();
        setMentionResults(data.users);
      }, 200);
    };
  }, []);
  
  // Insert mention
  const insertMention = (user) => {
    const editor = editorRef.current;
    const text = editor.textContent;
    
    // Replace @query with @FullName
    const before = text.slice(0, mentionQuery.position);
    const after = text.slice(mentionQuery.position + mentionQuery.query.length + 1); // +1 for @
    
    const mentionSpan = document.createElement('span');
    mentionSpan.className = 'mention';
    mentionSpan.contentEditable = false;
    mentionSpan.dataset.userId = user.id;
    mentionSpan.textContent = `@${user.name}`;
    
    // Reconstruct editor content
    editor.textContent = before;
    editor.appendChild(mentionSpan);
    editor.appendChild(document.createTextNode(' ' + after));
    
    setMentions(prev => [...prev, { userId: user.id, name: user.name }]);
    setMentionQuery(null);
    setMentionResults([]);
    
    // Move cursor after mention
    const range = document.createRange();
    const sel = window.getSelection();
    range.setStartAfter(mentionSpan.nextSibling);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    
    editor.focus();
  };
  
  // Detect hashtags for highlighting
  const highlightHashtags = (text) => {
    return text.replace(/#(\w+)/g, '<span class="hashtag">#$1</span>');
  };
  
  // File upload
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    const maxFiles = 9; // LinkedIn allows up to 9 images
    
    for (const file of files.slice(0, maxFiles - attachments.length)) {
      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        alert(`${file.name} exceeds 100MB limit`);
        continue;
      }
      
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
      setAttachments(prev => [...prev, { file, preview, type: file.type.startsWith('image/') ? 'image' : 'video' }]);
    }
    
    e.target.value = '';
  };
  
  const charCount = content.length;
  const isOverLimit = charCount > MAX_CHARS;
  const isNearLimit = charCount >= WARNING_THRESHOLD;
  
  return (
    <div className="post-composer" role="dialog" aria-label="Create a post">
      {/* User Info */}
      <div className="composer-header">
        <img src={currentUser.avatar} alt="" className="avatar" />
        <div>
          <span className="user-name">{currentUser.name}</span>
          <button className="visibility-btn" onClick={() => {/* Open visibility picker */}}>
            {visibility === 'ANYONE' ? '🌐 Anyone' : visibility === 'CONNECTIONS' ? '👥 Connections' : '🔒 Only me'}
            ▾
          </button>
        </div>
      </div>
      
      {/* Editor */}
      <div className="editor-container" style={{ position: 'relative' }}>
        <div
          ref={editorRef}
          className="post-editor"
          contentEditable
          role="textbox"
          aria-multiline="true"
          aria-label="Post content"
          aria-describedby="char-count"
          onInput={handleInput}
          data-placeholder="What do you want to talk about?"
          suppressContentEditableWarning
        />
        
        {/* Mention dropdown */}
        {mentionQuery && mentionResults.length > 0 && (
          <ul className="mention-dropdown" role="listbox" aria-label="User suggestions">
            {mentionResults.map(user => (
              <li key={user.id} role="option"
                  onClick={() => insertMention(user)}
                  className="mention-item">
                <img src={user.avatar} alt="" className="mention-avatar" />
                <div>
                  <div className="mention-name">{user.name}</div>
                  <div className="mention-headline">{user.headline}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <div className="attachment-grid" style={{ gridTemplateColumns: attachments.length > 1 ? 'repeat(2, 1fr)' : '1fr' }}>
          {attachments.map((att, i) => (
            <div key={i} className="attachment-preview">
              {att.type === 'image' ? (
                <img src={att.preview} alt="Attachment" />
              ) : (
                <video src={att.preview} controls />
              )}
              <button onClick={() => {
                if (att.preview) URL.revokeObjectURL(att.preview);
                setAttachments(prev => prev.filter((_, idx) => idx !== i));
              }} aria-label="Remove attachment">✕</button>
            </div>
          ))}
        </div>
      )}
      
      {/* Character Count */}
      <div id="char-count" className={`char-count ${isOverLimit ? 'over' : isNearLimit ? 'warning' : ''}`}
           aria-live="polite">
        {charCount}/{MAX_CHARS}
      </div>
      
      {/* Action Bar */}
      <div className="action-bar">
        <div className="attach-options">
          <label className="attach-btn" aria-label="Add image">
            📷
            <input type="file" accept="image/*" multiple onChange={handleFileSelect} hidden />
          </label>
          <label className="attach-btn" aria-label="Add video">
            🎥
            <input type="file" accept="video/*" onChange={handleFileSelect} hidden />
          </label>
          <button className="attach-btn" aria-label="Add document">📄</button>
        </div>
        
        <button
          className="post-btn"
          onClick={async () => {
            setPosting(true);
            await onPost({ content, mentions, attachments, visibility });
            setPosting(false);
          }}
          disabled={(!content.trim() && attachments.length === 0) || isOverLimit || posting}
        >
          {posting ? 'Posting...' : 'Post'}
        </button>
      </div>
    </div>
  );
}
```

---

## 🎯 Key Takeaways
- LinkedIn FE = **rich text composer + @mentions + social feed**
- **@mention detection**: regex match `/@(\w+)$/` on text before cursor
- **contentEditable with spans**: insert `<span contentEditable=false>` for mentions
- **Cursor management**: `document.createRange()` + `setStartAfter()` to position cursor after mention
- **Character count**: warning at 2800, over limit at 3000 — LinkedIn's actual limits
- **Post visibility**: Anyone / Connections / Only me — dropdown selector
- LinkedIn rejected on **OpenGraph scraping**: when posting a link, LinkedIn auto-generates preview
  - Should have discussed: server-side URL fetch → parse og:title, og:image, og:description → cache → render card
- Know LinkedIn's **Ember.js → React migration** story and **Feed ranking algorithm**

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Hard | Rich Text, @Mentions, Content-Editable |
| JavaScript | Medium-Hard | Promises, Closures, Event Loop |
| System Design | Very Hard | Feed, OpenGraph, Link Preview |
| HM | Medium | Behavioral, Career Growth |
