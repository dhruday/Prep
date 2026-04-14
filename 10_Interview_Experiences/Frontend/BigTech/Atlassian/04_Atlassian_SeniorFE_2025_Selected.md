# Atlassian — Senior Frontend Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Atlassian |
| **Role** | Senior Frontend Engineer |
| **Level** | P5 |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Sydney, Australia (Remote) |
| **Source** | [Glassdoor](https://www.glassdoor.com/Interview/Atlassian-Interview-Questions-E115699.htm) |
| **Author** | Anonymous |
| **Team** | Jira Cloud |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Values + 2 Technical + Machine Coding + HM)

---

## Round 1: Values Interview
**Duration:** 45 minutes

### Key Q&A:

**Q: Tell me about a time you made a decision without having all the data.**
> Migrated our team from Redux to React Query for server state. Didn't have exact performance metrics for the new approach. Used a spike: converted one feature, measured bundle size (-18KB), render count (-40%), and loading states complexity (60% less boilerplate). Presented findings to team, got buy-in, completed migration in 3 sprints. Final result: 35% less client-side code, 50% fewer data-related bugs.

**Q: Describe a time you gave someone difficult feedback.**
> Junior engineer was over-engineering solutions—adding abstraction layers that made code harder to follow. Instead of rejecting PRs, I paired with them for 2 weeks. Showed them the YAGNI principle using real examples from our codebase. Created a "complexity budget" guideline: if your abstraction doesn't have 3+ consumers, inline it. They became one of our most pragmatic engineers within 2 months.

---

## Round 2: Machine Coding — Build a Jira-like Issue Comment System
**Duration:** 90 minutes

### Challenge: Rich comment thread with:
- Nested replies (2 levels deep)
- Markdown-like formatting (bold, italic, links, code, lists)
- @mention with autocomplete dropdown
- Edit/delete with history
- Optimistic updates (show immediately, reconcile with server)
- Relative timestamps (5 min ago, 2 hours ago)

```javascript
/**
 * Jira Comment System:
 * - Nested threads (max 2 levels)
 * - Markdown rendering (safe subset)
 * - @mention autocomplete with keyboard navigation
 * - Optimistic create/edit/delete
 * - Relative time display with auto-refresh
 */
class CommentSystem {
  constructor(container, options = {}) {
    this.container = container;
    this.issueId = options.issueId;
    this.currentUser = options.currentUser;
    this.comments = [];       // Flat list, threaded by parentId
    this.teamMembers = options.teamMembers || []; // [{ id, name, avatar }]
    this.editingId = null;
    this.replyingTo = null;
    this.mentionState = null; // { input, query, filteredUsers, selectedIndex, startPos }
    
    this.render();
    this.startTimestampRefresh();
  }
  
  // Thread comments into tree structure
  get threadedComments() {
    const map = new Map();
    const roots = [];
    
    for (const comment of this.comments) {
      map.set(comment.id, { ...comment, replies: [] });
    }
    
    for (const comment of this.comments) {
      const node = map.get(comment.id);
      if (comment.parentId && map.has(comment.parentId)) {
        map.get(comment.parentId).replies.push(node);
      } else {
        roots.push(node);
      }
    }
    
    return roots;
  }
  
  renderComment(comment, depth = 0) {
    const isEditing = this.editingId === comment.id;
    const isReplying = this.replyingTo === comment.id;
    const isOwn = comment.authorId === this.currentUser.id;
    const isPending = comment._pending;
    
    return `
      <article class="comment ${isPending ? 'pending' : ''}" 
               data-id="${comment.id}" style="margin-left:${depth * 40}px"
               role="article" aria-label="Comment by ${this.sanitize(comment.authorName)}">
        <div class="comment-header">
          <img class="avatar" src="${this.sanitize(comment.authorAvatar)}" alt="" width="32" height="32">
          <strong>${this.sanitize(comment.authorName)}</strong>
          <time class="relative-time" data-ts="${comment.createdAt}" datetime="${new Date(comment.createdAt).toISOString()}">
            ${this.relativeTime(comment.createdAt)}
          </time>
          ${comment.editedAt ? '<span class="edited">(edited)</span>' : ''}
          ${isPending ? '<span class="saving">Saving...</span>' : ''}
        </div>
        
        <div class="comment-body">
          ${isEditing 
            ? this.renderEditor(comment.body, 'edit', comment.id)
            : `<div class="comment-text">${this.renderMarkdown(comment.body)}</div>`
          }
        </div>
        
        <div class="comment-actions">
          ${depth < 2 ? `<button class="btn-reply" data-id="${comment.id}">Reply</button>` : ''}
          ${isOwn ? `
            <button class="btn-edit" data-id="${comment.id}">Edit</button>
            <button class="btn-delete" data-id="${comment.id}">Delete</button>
          ` : ''}
        </div>
        
        ${isReplying ? `
          <div class="reply-editor" style="margin-left:40px">
            ${this.renderEditor('', 'reply', comment.id)}
          </div>
        ` : ''}
        
        ${comment.replies.map(reply => this.renderComment(reply, depth + 1)).join('')}
      </article>
    `;
  }
  
  renderEditor(value, mode, targetId) {
    return `
      <div class="editor-wrapper" data-mode="${mode}" data-target="${targetId}">
        <div class="editor-toolbar">
          <button class="fmt-btn" data-fmt="bold" title="Bold"><b>B</b></button>
          <button class="fmt-btn" data-fmt="italic" title="Italic"><i>I</i></button>
          <button class="fmt-btn" data-fmt="code" title="Code"><code>&lt;/&gt;</code></button>
          <button class="fmt-btn" data-fmt="link" title="Link">🔗</button>
        </div>
        <textarea class="comment-input" 
                  rows="3"
                  placeholder="Add a comment... Use @ to mention someone"
                  aria-label="Comment text">${this.sanitize(value)}</textarea>
        <div class="mention-dropdown" hidden role="listbox" aria-label="Mention suggestions"></div>
        <div class="editor-actions">
          <button class="btn-cancel">Cancel</button>
          <button class="btn-submit">${mode === 'edit' ? 'Save' : 'Comment'}</button>
        </div>
      </div>
    `;
  }
  
  /**
   * Safe Markdown rendering (subset):
   * **bold**, *italic*, `code`, [text](url), \n → <br>
   * Lists: lines starting with - or *
   * No arbitrary HTML allowed (XSS prevention)
   */
  renderMarkdown(text) {
    if (!text) return '';
    
    let html = this.sanitize(text);
    
    // Bold: **text** or __text__
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
    
    // Italic: *text* or _text_
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');
    
    // Inline code: `code`
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');
    
    // Links: [text](url) — validate URL scheme
    html = html.replace(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g, 
      '<a href="$2" rel="noopener noreferrer" target="_blank">$1</a>');
    
    // @mentions: @username
    html = html.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
    
    // Lists: lines starting with - or *
    html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    
    return html;
  }
  
  /**
   * @mention autocomplete:
   * - Triggered by @ character in textarea
   * - Filters team members by typed query
   * - Keyboard: ↑↓ to navigate, Enter to select, Esc to close
   * - Mouse: click to select
   */
  handleMentionInput(textarea) {
    const value = textarea.value;
    const cursorPos = textarea.selectionStart;
    
    // Find @ before cursor
    const textBeforeCursor = value.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    
    const dropdown = textarea.parentElement.querySelector('.mention-dropdown');
    
    if (atMatch) {
      const query = atMatch[1].toLowerCase();
      const startPos = cursorPos - atMatch[0].length;
      
      const filtered = this.teamMembers.filter(m => 
        m.name.toLowerCase().includes(query)
      ).slice(0, 5);
      
      if (filtered.length > 0) {
        this.mentionState = { textarea, query, filtered, selectedIndex: 0, startPos };
        
        dropdown.hidden = false;
        dropdown.innerHTML = filtered.map((user, i) => `
          <div class="mention-option ${i === 0 ? 'selected' : ''}" 
               data-index="${i}" data-name="${this.sanitize(user.name)}" role="option">
            <img src="${this.sanitize(user.avatar)}" alt="" width="24" height="24">
            <span>${this.sanitize(user.name)}</span>
          </div>
        `).join('');
        
        return;
      }
    }
    
    dropdown.hidden = true;
    this.mentionState = null;
  }
  
  insertMention(user) {
    if (!this.mentionState) return;
    const { textarea, startPos } = this.mentionState;
    const cursorPos = textarea.selectionStart;
    
    const before = textarea.value.slice(0, startPos);
    const after = textarea.value.slice(cursorPos);
    textarea.value = `${before}@${user.name} ${after}`;
    
    const newPos = startPos + user.name.length + 2; // @name + space
    textarea.setSelectionRange(newPos, newPos);
    textarea.focus();
    
    this.mentionState = null;
    textarea.parentElement.querySelector('.mention-dropdown').hidden = true;
  }
  
  /**
   * Optimistic create: 
   * Show comment immediately with _pending flag, then replace with server response.
   */
  async addComment(body, parentId = null) {
    const tempId = `temp_${Date.now()}`;
    const optimistic = {
      id: tempId,
      body,
      parentId,
      authorId: this.currentUser.id,
      authorName: this.currentUser.name,
      authorAvatar: this.currentUser.avatar,
      createdAt: Date.now(),
      editedAt: null,
      _pending: true
    };
    
    this.comments.push(optimistic);
    this.replyingTo = null;
    this.render();
    
    try {
      const response = await fetch(`/api/issues/${this.issueId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, parentId })
      });
      const serverComment = await response.json();
      
      // Replace optimistic with server response
      const idx = this.comments.findIndex(c => c.id === tempId);
      if (idx !== -1) {
        this.comments[idx] = { ...serverComment, _pending: false };
        this.render();
      }
    } catch (err) {
      // Remove optimistic on failure, show error
      this.comments = this.comments.filter(c => c.id !== tempId);
      this.render();
      this.showError('Failed to post comment. Please try again.');
    }
  }
  
  relativeTime(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(timestamp).toLocaleDateString();
  }
  
  startTimestampRefresh() {
    this._timerInterval = setInterval(() => {
      this.container.querySelectorAll('.relative-time').forEach(el => {
        el.textContent = this.relativeTime(Number(el.dataset.ts));
      });
    }, 60000); // Update every minute
  }
  
  sanitize(str) {
    const div = document.createElement('div');
    div.textContent = String(str ?? '');
    return div.innerHTML;
  }
  
  showError(message) {
    const errorEl = document.createElement('div');
    errorEl.className = 'comment-error';
    errorEl.setAttribute('role', 'alert');
    errorEl.textContent = message;
    this.container.prepend(errorEl);
    setTimeout(() => errorEl.remove(), 5000);
  }
  
  render() { /* Full render combining threadedComments + renderComment */ }
}
```

---

## 🎯 Key Takeaways
- Atlassian FE = **Comment system with @mentions, threading, markdown, optimistic updates**
- **Threading**: flat comments with `parentId` → tree structure via map-based grouping — limit depth to 2
- **@mention autocomplete**: detect `@query` before cursor → filter users → keyboard navigation → insert
- **Optimistic updates**: add with `_pending` flag immediately → replace with server response → rollback on error
- **Safe Markdown**: sanitize FIRST → then apply markdown regex — prevents XSS via markdown injection
- **Link validation**: only allow `https?://` URLs in markdown links — prevent `javascript:` XSS
- **Relative time**: update every 60s via setInterval — avoid unnecessary re-renders
- Atlassian FE = **values interview is critical** — prepare STAR stories for open company, no BS, play as a team, build with heart and balance

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Values | Medium | STAR Stories |
| Machine Coding | Very Hard | Comments, @Mentions, Markdown |
| Technical 1 | Hard | React, Performance |
| Technical 2 | Hard | System Design |
| HM | Medium | Team Fit |
