# Grab/Gojek — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Grab/Gojek |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-3 |
| **YOE** | 6 years |
| **Date** | May 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 2 Technical + HM + Bar Raiser)
- **Timeline:** 3 weeks
- **Format:** Virtual

## Round 2: Frontend Machine Coding — In-App Chat Support Widget

### Problem
Build an **in-app customer support chat widget** (45 min):
1. Floating chat bubble → expands to chat window on click
2. Message list with user/agent avatars and timestamps
3. Typing indicator (animated dots) when agent is "typing"
4. Quick reply buttons (predefined response options)
5. File attachment button with preview (image thumbnail)
6. Auto-scroll to latest message, but pause if user scrolls up
7. Minimize/close with unread badge counter
8. Pure HTML/CSS/JS — no frameworks

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Chat Support Widget</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
         background:#f0f2f5; min-height:100vh; }

  /* Floating bubble */
  .chat-bubble { position:fixed; bottom:24px; right:24px; width:60px; height:60px;
    border-radius:50%; background:#00b14f; cursor:pointer; display:flex;
    align-items:center; justify-content:center; box-shadow:0 4px 16px rgba(0,0,0,0.3);
    transition:transform 0.2s; z-index:1000; }
  .chat-bubble:hover { transform:scale(1.1); }
  .chat-bubble svg { width:28px; height:28px; fill:#fff; }
  .unread-badge { position:absolute; top:-4px; right:-4px; background:#ff3b30;
    color:#fff; font-size:0.7rem; font-weight:700; width:22px; height:22px;
    border-radius:50%; display:flex; align-items:center; justify-content:center;
    border:2px solid #f0f2f5; }

  /* Chat window */
  .chat-window { position:fixed; bottom:96px; right:24px; width:380px; height:500px;
    background:#fff; border-radius:16px; box-shadow:0 8px 32px rgba(0,0,0,0.15);
    display:none; flex-direction:column; z-index:1000; overflow:hidden;
    animation:slideUp 0.3s ease; }
  .chat-window.open { display:flex; }
  @keyframes slideUp { from { opacity:0; transform:translateY(20px); }
                        to { opacity:1; transform:translateY(0); } }

  /* Header */
  .chat-header { background:#00b14f; color:#fff; padding:14px 16px;
    display:flex; align-items:center; justify-content:space-between; }
  .chat-header-info { display:flex; align-items:center; gap:10px; }
  .agent-avatar { width:36px; height:36px; border-radius:50%; background:#fff;
    display:flex; align-items:center; justify-content:center; font-size:1rem; }
  .agent-name { font-weight:600; font-size:0.95rem; }
  .agent-status { font-size:0.75rem; opacity:0.8; }
  .header-actions button { background:none; border:none; color:#fff;
    cursor:pointer; font-size:1.2rem; padding:4px 8px; }

  /* Messages */
  .messages { flex:1; overflow-y:auto; padding:16px; display:flex;
    flex-direction:column; gap:8px; background:#f7f8fa; }
  .msg { max-width:80%; padding:10px 14px; border-radius:16px;
    font-size:0.9rem; line-height:1.4; position:relative; }
  .msg-user { align-self:flex-end; background:#00b14f; color:#fff;
    border-bottom-right-radius:4px; }
  .msg-agent { align-self:flex-start; background:#fff; color:#333;
    border-bottom-left-radius:4px; box-shadow:0 1px 3px rgba(0,0,0,0.08); }
  .msg-time { font-size:0.65rem; opacity:0.6; margin-top:4px; }
  .msg-user .msg-time { text-align:right; }

  /* Typing indicator */
  .typing { align-self:flex-start; background:#fff; padding:12px 18px;
    border-radius:16px; display:none; align-items:center; gap:4px;
    box-shadow:0 1px 3px rgba(0,0,0,0.08); }
  .typing.visible { display:flex; }
  .typing-dot { width:8px; height:8px; border-radius:50%; background:#aaa;
    animation:typingBounce 1.4s infinite ease-in-out; }
  .typing-dot:nth-child(2) { animation-delay:0.2s; }
  .typing-dot:nth-child(3) { animation-delay:0.4s; }
  @keyframes typingBounce { 0%,60%,100% { transform:translateY(0); }
                            30% { transform:translateY(-6px); } }

  /* Quick replies */
  .quick-replies { padding:8px 16px; display:flex; gap:6px; flex-wrap:wrap;
    background:#f7f8fa; border-top:1px solid #eee; }
  .quick-replies:empty { display:none; }
  .qr-btn { padding:6px 14px; border:1px solid #00b14f; border-radius:20px;
    background:#fff; color:#00b14f; font-size:0.8rem; cursor:pointer;
    transition:all 0.2s; }
  .qr-btn:hover { background:#00b14f; color:#fff; }

  /* Input */
  .chat-input { display:flex; align-items:center; gap:8px; padding:12px 16px;
    border-top:1px solid #eee; background:#fff; }
  .chat-input input { flex:1; border:none; outline:none; font-size:0.9rem; padding:8px; }
  .chat-input button { background:none; border:none; cursor:pointer; font-size:1.2rem; }
  .send-btn { background:#00b14f !important; color:#fff; width:36px; height:36px;
    border-radius:50%; display:flex; align-items:center; justify-content:center; }

  /* Image preview */
  .img-preview { max-width:200px; border-radius:8px; margin-top:6px; cursor:pointer; }
  .attachment-preview { padding:8px 16px; background:#f0f2f5; display:none;
    align-items:center; gap:8px; border-top:1px solid #eee; }
  .attachment-preview.visible { display:flex; }
  .attachment-preview img { width:40px; height:40px; object-fit:cover; border-radius:6px; }
  .attachment-preview .remove { cursor:pointer; color:#ff3b30; font-size:0.8rem; }
</style>
</head>
<body>

<div style="padding:40px; text-align:center; color:#666;">
  <h2>Grab/Gojek App</h2>
  <p>Click the chat bubble to open support →</p>
</div>

<!-- Floating Bubble -->
<div class="chat-bubble" id="bubble" onclick="toggleChat()">
  <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
  <div class="unread-badge" id="unreadBadge" style="display:none">0</div>
</div>

<!-- Chat Window -->
<div class="chat-window" id="chatWindow">
  <div class="chat-header">
    <div class="chat-header-info">
      <div class="agent-avatar">🤖</div>
      <div>
        <div class="agent-name">Grab Support</div>
        <div class="agent-status">Online</div>
      </div>
    </div>
    <div class="header-actions">
      <button onclick="minimizeChat()">−</button>
      <button onclick="closeChat()">×</button>
    </div>
  </div>

  <div class="messages" id="messages"></div>

  <div class="typing" id="typingIndicator">
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
  </div>

  <div class="quick-replies" id="quickReplies"></div>

  <div class="attachment-preview" id="attachPreview">
    <img id="attachThumb" src="" alt="preview">
    <span id="attachName">file.png</span>
    <span class="remove" onclick="removeAttachment()">✕ Remove</span>
  </div>

  <div class="chat-input">
    <button onclick="document.getElementById('fileInput').click()">📎</button>
    <input type="file" id="fileInput" accept="image/*" style="display:none" onchange="handleFile(event)">
    <input type="text" id="msgInput" placeholder="Type a message..."
           onkeydown="if(event.key==='Enter')sendMessage()">
    <button class="send-btn" onclick="sendMessage()">➤</button>
  </div>
</div>

<script>
// ═══════════════════════════════════════
// STATE
// ═══════════════════════════════════════
let isOpen = false;
let unreadCount = 0;
let userScrolledUp = false;
let pendingAttachment = null;

const messagesEl = document.getElementById('messages');
const typingEl = document.getElementById('typingIndicator');
const quickRepliesEl = document.getElementById('quickReplies');

// Auto-scroll detection
messagesEl.addEventListener('scroll', () => {
  const { scrollTop, scrollHeight, clientHeight } = messagesEl;
  userScrolledUp = scrollHeight - scrollTop - clientHeight > 60;
});

// ═══════════════════════════════════════
// CHAT TOGGLE
// ═══════════════════════════════════════
function toggleChat() {
  isOpen = !isOpen;
  document.getElementById('chatWindow').classList.toggle('open', isOpen);
  if (isOpen) {
    unreadCount = 0;
    updateBadge();
    scrollToBottom();
  }
}

function minimizeChat() {
  isOpen = false;
  document.getElementById('chatWindow').classList.remove('open');
}

function closeChat() {
  minimizeChat();
}

function updateBadge() {
  const badge = document.getElementById('unreadBadge');
  if (unreadCount > 0 && !isOpen) {
    badge.style.display = 'flex';
    badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
  } else {
    badge.style.display = 'none';
  }
}

// ═══════════════════════════════════════
// MESSAGES
// ═══════════════════════════════════════
function addMessage(text, sender, imageUrl) {
  const div = document.createElement('div');
  div.className = 'msg msg-' + sender;

  const now = new Date();
  const time = now.getHours().toString().padStart(2, '0') + ':' +
               now.getMinutes().toString().padStart(2, '0');

  let content = `<div>${text}</div>`;
  if (imageUrl) {
    content += `<img class="img-preview" src="${imageUrl}" alt="attachment" onclick="window.open(this.src)">`;
  }
  content += `<div class="msg-time">${time}</div>`;
  div.innerHTML = content;

  messagesEl.appendChild(div);

  if (!userScrolledUp || sender === 'user') {
    scrollToBottom();
  }

  if (sender === 'agent' && !isOpen) {
    unreadCount++;
    updateBadge();
  }
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });
}

// ═══════════════════════════════════════
// SEND MESSAGE
// ═══════════════════════════════════════
function sendMessage(text) {
  const input = document.getElementById('msgInput');
  const msg = text || input.value.trim();
  if (!msg && !pendingAttachment) return;

  addMessage(msg || '📷 Image', 'user', pendingAttachment);
  input.value = '';
  removeAttachment();
  clearQuickReplies();

  // Simulate agent response
  showTyping();
  setTimeout(() => {
    hideTyping();
    const response = getAgentResponse(msg);
    addMessage(response.text, 'agent');
    if (response.quickReplies) showQuickReplies(response.quickReplies);
  }, 1200 + Math.random() * 800);
}

// ═══════════════════════════════════════
// TYPING INDICATOR
// ═══════════════════════════════════════
function showTyping() { typingEl.classList.add('visible'); scrollToBottom(); }
function hideTyping() { typingEl.classList.remove('visible'); }

// ═══════════════════════════════════════
// QUICK REPLIES
// ═══════════════════════════════════════
function showQuickReplies(options) {
  quickRepliesEl.innerHTML = '';
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'qr-btn';
    btn.textContent = opt;
    btn.onclick = () => sendMessage(opt);
    quickRepliesEl.appendChild(btn);
  });
}

function clearQuickReplies() { quickRepliesEl.innerHTML = ''; }

// ═══════════════════════════════════════
// FILE ATTACHMENT
// ═══════════════════════════════════════
function handleFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    pendingAttachment = e.target.result;
    document.getElementById('attachThumb').src = pendingAttachment;
    document.getElementById('attachName').textContent = file.name;
    document.getElementById('attachPreview').classList.add('visible');
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

function removeAttachment() {
  pendingAttachment = null;
  document.getElementById('attachPreview').classList.remove('visible');
}

// ═══════════════════════════════════════
// BOT RESPONSES (SIMULATED)
// ═══════════════════════════════════════
function getAgentResponse(msg) {
  const lower = (msg || '').toLowerCase();

  if (lower.includes('refund') || lower.includes('money')) {
    return { text: "I understand you'd like help with a refund. Could you share your order ID?",
             quickReplies: ['Recent order', 'Older order', 'Talk to human'] };
  }
  if (lower.includes('driver') || lower.includes('ride')) {
    return { text: "I can help with ride issues. What happened?",
             quickReplies: ['Wrong route', 'Driver no-show', 'Safety concern', 'Overcharged'] };
  }
  if (lower.includes('order') || lower.includes('food')) {
    return { text: "Let me look into your food order. Is the issue with a current or past order?",
             quickReplies: ['Current order', 'Past order'] };
  }
  if (lower.includes('recent order') || lower.includes('current order')) {
    return { text: "I found order #GRB-8842 (₹459, Biryani House). Looks like it was delivered 10 min late. I've added ₹50 credit to your account as compensation. Anything else?",
             quickReplies: ['That works, thanks!', 'Need more help'] };
  }
  if (lower.includes('thanks') || lower.includes('that works')) {
    return { text: "Happy to help! 😊 Have a great day!", quickReplies: null };
  }
  return { text: "Thanks for reaching out! How can I assist you today?",
           quickReplies: ['Ride issue', 'Food order', 'Refund', 'Account help'] };
}

// ═══════════════════════════════════════
// INITIAL MESSAGE
// ═══════════════════════════════════════
setTimeout(() => {
  if (!isOpen) { unreadCount++; updateBadge(); }
  // Pre-load welcome message
  addMessage("Hi! 👋 Welcome to Grab Support. How can I help you?", 'agent');
  showQuickReplies(['Ride issue', 'Food order', 'Refund', 'Account help']);
}, 2000);
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- **Floating bubble → window**: `position:fixed` with slide-up animation on toggle
- **Auto-scroll with pause**: track `scrollTop + clientHeight < scrollHeight - 60` to detect user scrolled up
- **Typing indicator**: CSS keyframe bounce animation on 3 dots with staggered delays
- **Quick replies**: dynamic buttons that call `sendMessage(text)` and clear themselves
- **File attachment**: `FileReader.readAsDataURL()` for instant thumbnail preview
- **Unread badge**: increments when window closed, resets on open

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Algorithms |
| Technical 1 | Hard | Chat Widget, Real-Time UX |
| Technical 2 | Medium | State Machine, Animations |
| Hiring Manager | Medium | Customer Experience |
| Bar Raiser | Hard | Architecture, Scale |
