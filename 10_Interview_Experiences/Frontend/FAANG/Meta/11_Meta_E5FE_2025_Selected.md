# Meta — E5 Frontend Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meta |
| **Role** | Frontend Engineer |
| **Level** | E5 (Senior) |
| **YOE** | 7 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Menlo Park |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 On-site: 2 FE Coding + System Design + Behavioral)
- **Timeline:** 3 weeks
- **Format:** On-site

## Round 3: Frontend Coding — Real-Time Chat UI with Message Grouping

### Problem
Build a chat interface (Messenger-like) with:
1. Message input with send button and Enter key support
2. Messages grouped by sender (consecutive messages from same user collapsed)
3. Timestamp separators (show date/time headers when gap > 5 minutes)
4. Typing indicator animation
5. Scroll-to-bottom on new message, with "New messages" badge if scrolled up
6. Message status (sent, delivered, read) with checkmark icons
7. Emoji picker (basic grid)

Build with **vanilla JavaScript** only.

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Chat UI</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: #f0f2f5; display: flex; justify-content: center; align-items: center; height: 100vh; }

.chat-container { width: 400px; height: 600px; background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.12); display: flex; flex-direction: column; overflow: hidden; }

.chat-header { padding: 12px 16px; background: #0084ff; color: #fff; display: flex; align-items: center; gap: 10px; }
.avatar { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.3); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; }
.header-info { flex: 1; }
.header-name { font-weight: 600; font-size: 15px; }
.header-status { font-size: 12px; opacity: 0.85; }

.messages-area { flex: 1; overflow-y: auto; padding: 12px 16px; position: relative; scroll-behavior: smooth; }

.time-separator { text-align: center; margin: 12px 0; position: relative; }
.time-separator span { background: #fff; padding: 0 10px; font-size: 11px; color: #8e8e8e; position: relative; z-index: 1; }
.time-separator::before { content: ''; position: absolute; top: 50%; left: 0; right: 0; border-top: 1px solid #e8e8e8; }

.message-group { margin-bottom: 4px; }
.message-group.sent { display: flex; flex-direction: column; align-items: flex-end; }
.message-group.received { display: flex; flex-direction: column; align-items: flex-start; }

.msg-bubble { max-width: 70%; padding: 8px 12px; border-radius: 18px; font-size: 14px; line-height: 1.35; margin-bottom: 2px; word-wrap: break-word; position: relative; }
.sent .msg-bubble { background: #0084ff; color: #fff; border-bottom-right-radius: 4px; }
.received .msg-bubble { background: #e4e6eb; color: #050505; border-bottom-left-radius: 4px; }
.msg-bubble:first-child.sent { border-top-right-radius: 18px; }
.msg-bubble:last-child.sent { border-bottom-right-radius: 18px; }

.msg-meta { font-size: 10px; color: #8e8e8e; margin-top: 2px; padding: 0 4px; display: flex; align-items: center; gap: 4px; }
.sent .msg-meta { justify-content: flex-end; }
.status-icon { font-size: 12px; }
.status-sent { color: #8e8e8e; }
.status-delivered { color: #8e8e8e; }
.status-read { color: #0084ff; }

.typing-indicator { display: flex; gap: 4px; padding: 10px 14px; background: #e4e6eb; border-radius: 18px; width: fit-content; margin-top: 4px; }
.typing-indicator span { width: 8px; height: 8px; background: #999; border-radius: 50%; animation: typingBounce 1.4s infinite; }
.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
@keyframes typingBounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-6px); }
}

.new-msg-badge { position: absolute; bottom: 60px; left: 50%; transform: translateX(-50%); background: #0084ff; color: #fff; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.2); display: none; z-index: 10; }

.input-area { padding: 10px 12px; border-top: 1px solid #e8e8e8; display: flex; gap: 8px; align-items: flex-end; background: #fff; }
.emoji-btn { background: none; border: none; font-size: 22px; cursor: pointer; padding: 4px; }
.msg-input { flex: 1; padding: 8px 14px; border: 1px solid #e4e6eb; border-radius: 20px; font-size: 14px; outline: none; resize: none; font-family: inherit; max-height: 100px; line-height: 1.35; }
.msg-input:focus { border-color: #0084ff; }
.send-btn { background: none; border: none; cursor: pointer; font-size: 22px; padding: 4px; color: #0084ff; }
.send-btn:disabled { color: #c4c4c4; cursor: default; }

.emoji-picker { display: none; position: absolute; bottom: 60px; left: 12px; background: #fff; border: 1px solid #e4e6eb; border-radius: 10px; padding: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 100; }
.emoji-picker.open { display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px; }
.emoji-picker button { background: none; border: none; font-size: 22px; padding: 4px; cursor: pointer; border-radius: 4px; }
.emoji-picker button:hover { background: #f0f2f5; }
</style>
</head>
<body>
<div class="chat-container" id="app">
  <div class="chat-header">
    <div class="avatar">JD</div>
    <div class="header-info">
      <div class="header-name">Jane Doe</div>
      <div class="header-status" id="headerStatus">Active now</div>
    </div>
  </div>
  <div class="messages-area" id="messagesArea">
    <div class="new-msg-badge" id="newMsgBadge">↓ New messages</div>
  </div>
  <div class="input-area" style="position:relative;">
    <button class="emoji-btn" id="emojiToggle">😊</button>
    <div class="emoji-picker" id="emojiPicker"></div>
    <textarea class="msg-input" id="msgInput" rows="1" placeholder="Aa"></textarea>
    <button class="send-btn" id="sendBtn" disabled>➤</button>
  </div>
</div>

<script>
const CURRENT_USER = 'me';
const OTHER_USER = 'jane';
const TIME_GAP_MS = 5 * 60 * 1000; // 5 minutes

// ============================================================
// STATE
// ============================================================
let messages = [
  { id: 1, sender: OTHER_USER, text: 'Hey! How are you?', time: Date.now() - 3600000, status: 'read' },
  { id: 2, sender: CURRENT_USER, text: 'Hi Jane! Doing great 🙂', time: Date.now() - 3500000, status: 'read' },
  { id: 3, sender: CURRENT_USER, text: 'How about you?', time: Date.now() - 3490000, status: 'read' },
  { id: 4, sender: OTHER_USER, text: "I'm good! Just finished the sprint review", time: Date.now() - 1800000, status: 'read' },
  { id: 5, sender: OTHER_USER, text: 'Want to grab lunch?', time: Date.now() - 1790000, status: 'read' },
  { id: 6, sender: CURRENT_USER, text: 'Sure! 12:30 works?', time: Date.now() - 600000, status: 'delivered' },
];
let nextId = 7;
let isTyping = false;
let userScrolledUp = false;
let unreadCount = 0;

// ============================================================
// DOM REFS
// ============================================================
const messagesArea = document.getElementById('messagesArea');
const msgInput = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendBtn');
const newMsgBadge = document.getElementById('newMsgBadge');
const headerStatus = document.getElementById('headerStatus');
const emojiToggle = document.getElementById('emojiToggle');
const emojiPicker = document.getElementById('emojiPicker');

// ============================================================
// RENDERING
// ============================================================
function renderMessages() {
  // Preserve scroll position
  const wasAtBottom = isAtBottom();

  // Clear all except badge
  const children = [...messagesArea.children];
  children.forEach(c => { if (c !== newMsgBadge) c.remove(); });

  let lastSender = null;
  let lastTime = 0;
  let currentGroup = null;

  for (const msg of messages) {
    // Time separator
    if (msg.time - lastTime > TIME_GAP_MS) {
      if (currentGroup) messagesArea.insertBefore(currentGroup, newMsgBadge);
      currentGroup = null;
      lastSender = null;

      const sep = document.createElement('div');
      sep.className = 'time-separator';
      sep.innerHTML = '<span>' + formatTime(msg.time) + '</span>';
      messagesArea.insertBefore(sep, newMsgBadge);
    }

    // New group if sender changes
    if (msg.sender !== lastSender) {
      if (currentGroup) messagesArea.insertBefore(currentGroup, newMsgBadge);
      currentGroup = document.createElement('div');
      currentGroup.className = 'message-group ' + (msg.sender === CURRENT_USER ? 'sent' : 'received');
    }

    // Message bubble
    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.textContent = msg.text;
    currentGroup.appendChild(bubble);

    lastSender = msg.sender;
    lastTime = msg.time;
  }

  if (currentGroup) messagesArea.insertBefore(currentGroup, newMsgBadge);

  // Show last message status
  const lastSent = [...messages].reverse().find(m => m.sender === CURRENT_USER);
  if (lastSent) {
    const meta = document.createElement('div');
    meta.className = 'msg-meta';
    meta.innerHTML = formatTimeShort(lastSent.time) + ' ' + statusIcon(lastSent.status);
    const lastGroup = [...messagesArea.querySelectorAll('.message-group.sent')].pop();
    if (lastGroup) lastGroup.appendChild(meta);
  }

  // Typing indicator
  if (isTyping) {
    const ti = document.createElement('div');
    ti.className = 'typing-indicator';
    ti.innerHTML = '<span></span><span></span><span></span>';
    messagesArea.insertBefore(ti, newMsgBadge);
  }

  // Auto-scroll
  if (wasAtBottom || !userScrolledUp) {
    scrollToBottom();
  }
}

function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return isToday ? 'Today ' + timeStr : d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + timeStr;
}

function formatTimeShort(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function statusIcon(status) {
  const icons = { sent: '✓', delivered: '✓✓', read: '✓✓' };
  const cls = 'status-' + status;
  return `<span class="status-icon ${cls}">${icons[status] || ''}</span>`;
}

function isAtBottom() {
  return messagesArea.scrollHeight - messagesArea.scrollTop - messagesArea.clientHeight < 40;
}

function scrollToBottom() {
  messagesArea.scrollTop = messagesArea.scrollHeight;
  unreadCount = 0;
  newMsgBadge.style.display = 'none';
}

// ============================================================
// EVENTS
// ============================================================
// Scroll tracking
messagesArea.addEventListener('scroll', () => {
  userScrolledUp = !isAtBottom();
  if (isAtBottom()) {
    unreadCount = 0;
    newMsgBadge.style.display = 'none';
  }
});

newMsgBadge.addEventListener('click', scrollToBottom);

// Send message
function sendMessage() {
  const text = msgInput.value.trim();
  if (!text) return;

  messages.push({
    id: nextId++,
    sender: CURRENT_USER,
    text,
    time: Date.now(),
    status: 'sent'
  });

  msgInput.value = '';
  msgInput.style.height = 'auto';
  sendBtn.disabled = true;
  renderMessages();
  scrollToBottom();

  // Simulate delivery after 1s
  const msgId = nextId - 1;
  setTimeout(() => {
    const msg = messages.find(m => m.id === msgId);
    if (msg) { msg.status = 'delivered'; renderMessages(); }
  }, 1000);

  // Simulate reply after 2-4s
  simulateReply();
}

sendBtn.addEventListener('click', sendMessage);

msgInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Auto-resize textarea
msgInput.addEventListener('input', () => {
  sendBtn.disabled = !msgInput.value.trim();
  msgInput.style.height = 'auto';
  msgInput.style.height = Math.min(msgInput.scrollHeight, 100) + 'px';
});

// ============================================================
// EMOJI PICKER
// ============================================================
const EMOJIS = ['😀','😂','🥰','😎','🤔','👍','❤️','🔥','🎉','✨','😊','🙏','💪','🤝','👏','🙌','😅','🥳','💯','⭐','🚀','💡','✅','❌','📌','🎯','💬','👋','🤗','😢','😤','🤩'];

EMOJIS.forEach(emoji => {
  const btn = document.createElement('button');
  btn.textContent = emoji;
  btn.addEventListener('click', () => {
    const start = msgInput.selectionStart;
    const end = msgInput.selectionEnd;
    const text = msgInput.value;
    msgInput.value = text.slice(0, start) + emoji + text.slice(end);
    msgInput.focus();
    msgInput.selectionStart = msgInput.selectionEnd = start + emoji.length;
    sendBtn.disabled = !msgInput.value.trim();
    emojiPicker.classList.remove('open');
  });
  emojiPicker.appendChild(btn);
});

emojiToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  emojiPicker.classList.toggle('open');
});

document.addEventListener('click', (e) => {
  if (!emojiPicker.contains(e.target) && e.target !== emojiToggle) {
    emojiPicker.classList.remove('open');
  }
});

// ============================================================
// SIMULATE OTHER USER
// ============================================================
const REPLIES = [
  'Sounds good!', 'Let me check and get back to you',
  'Great idea 👍', 'I was thinking the same thing',
  "That's awesome!", 'Can we discuss this after lunch?',
  'Sure, no problem!', 'Hmm, interesting point 🤔'
];

function simulateReply() {
  // Show typing indicator
  setTimeout(() => {
    isTyping = true;
    headerStatus.textContent = 'Typing...';
    renderMessages();
  }, 1500);

  // Send reply
  const delay = 2500 + Math.random() * 2000;
  setTimeout(() => {
    isTyping = false;
    headerStatus.textContent = 'Active now';

    const reply = REPLIES[Math.floor(Math.random() * REPLIES.length)];
    messages.push({
      id: nextId++,
      sender: OTHER_USER,
      text: reply,
      time: Date.now(),
      status: 'read'
    });

    // Mark our last message as read
    const lastSent = [...messages].reverse().find(m => m.sender === CURRENT_USER);
    if (lastSent) lastSent.status = 'read';

    if (userScrolledUp) {
      unreadCount++;
      newMsgBadge.textContent = `↓ ${unreadCount} new message${unreadCount > 1 ? 's' : ''}`;
      newMsgBadge.style.display = 'block';
    }

    renderMessages();
  }, delay);
}

// Initial render
renderMessages();
scrollToBottom();
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- Meta FE E5 expects **polished UI** mimicking real products like Messenger
- Message grouping: consecutive messages from same sender share one container
- Time separators: 5-minute gap threshold — common UX pattern in chat apps
- **"New messages" badge** when user scrolled up: `scrollHeight - scrollTop - clientHeight < threshold`
- Typing indicator with CSS animation (3 bouncing dots) — no JS animation needed
- Message status lifecycle: sent → delivered → read (checkmark progression)
- Emoji picker: grid with cursor position insertion using `selectionStart/selectionEnd`
- Auto-resize textarea: reset height to auto, then set to scrollHeight

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | DOM, Events, Closure |
| FE Coding 1 | Medium | Component Architecture |
| FE Coding 2 | Hard | Chat UI, Message Grouping, Real-Time UX |
| System Design | Hard | Messaging System at Scale |
| Behavioral | Medium | Teamwork, Impact |
