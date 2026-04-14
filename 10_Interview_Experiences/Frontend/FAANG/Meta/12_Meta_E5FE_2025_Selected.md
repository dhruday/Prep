# Meta — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meta |
| **Role** | Senior Frontend Engineer |
| **Level** | E5 |
| **YOE** | 7 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 2 Coding + System Design + Behavioral)
- **Timeline:** 4 weeks
- **Format:** Virtual

## Round 3: Frontend Machine Coding — Social Feed with Reactions & Comments

### Problem
Build a social media feed:
1. Post cards with author name, avatar, timestamp, content text, and image
2. Reaction bar with emoji reactions (Like, Love, Haha, Wow, Sad, Angry) with long-press to show picker
3. Comment section: add comments, nested replies (1 level), expandable
4. Relative time display (2 min ago, 3 hours ago, etc.)
5. "See more" for long text (truncate after 3 lines)
6. Optimistic Like: toggle immediately, batch API call debounce
7. Infinite scroll to load more posts

Build with **vanilla JavaScript** only.

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Social Feed</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, 'Segoe UI', sans-serif; background: #f0f2f5; }
.feed { max-width: 580px; margin: 0 auto; padding: 16px; }

/* Post Card */
.post-card { background: #fff; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,.1); margin-bottom: 16px; }

/* Post Header */
.post-header { display: flex; align-items: center; gap: 8px; padding: 12px 16px; }
.avatar { width: 40px; height: 40px; border-radius: 50%; background: #e4e6eb; display: flex; align-items: center; justify-content: center; font-size: 18px; }
.post-author { font-size: 14px; font-weight: 600; color: #050505; }
.post-time { font-size: 12px; color: #65676b; }

/* Post Content */
.post-body { padding: 0 16px 12px; }
.post-text { font-size: 14px; color: #050505; line-height: 1.4; }
.post-text.truncated { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.see-more { color: #0064d1; cursor: pointer; font-size: 13px; font-weight: 500; }
.post-image { width: 100%; margin-top: 8px; border-radius: 4px; background: #e4e6eb; height: 300px; display: flex; align-items: center; justify-content: center; font-size: 48px; }

/* Reaction Summary */
.reaction-summary { display: flex; align-items: center; gap: 4px; padding: 8px 16px; font-size: 13px; color: #65676b; border-bottom: 1px solid #e4e6eb; }
.reaction-emoji-group { display: flex; }
.reaction-emoji-group span { margin-left: -2px; font-size: 16px; }

/* Action Bar */
.action-bar { display: flex; border-bottom: 1px solid #e4e6eb; padding: 4px 8px; }
.action-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px; border: none; background: none; border-radius: 4px; cursor: pointer; font-size: 13px; color: #65676b; font-weight: 600; position: relative; }
.action-btn:hover { background: #f0f2f5; }
.action-btn.liked { color: #0866ff; }
.action-btn.reacted { color: #ed4956; }

/* Reaction Picker */
.reaction-picker { display: none; position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); background: #fff; border-radius: 24px; box-shadow: 0 4px 12px rgba(0,0,0,.15); padding: 4px 8px; white-space: nowrap; z-index: 100; }
.reaction-picker.visible { display: flex; gap: 2px; }
.reaction-option { font-size: 24px; padding: 4px; cursor: pointer; transition: transform 0.15s; border-radius: 50%; }
.reaction-option:hover { transform: scale(1.3); background: #f0f2f5; }

/* Comments */
.comments-section { padding: 8px 16px 12px; }
.comment-input-row { display: flex; gap: 8px; margin-bottom: 8px; }
.comment-avatar { width: 32px; height: 32px; border-radius: 50%; background: #e4e6eb; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
.comment-input { flex: 1; padding: 8px 12px; background: #f0f2f5; border: none; border-radius: 20px; font-size: 13px; outline: none; }
.comment-input:focus { background: #fff; box-shadow: 0 0 0 2px #0866ff; }

.comment { display: flex; gap: 8px; margin-bottom: 8px; }
.comment-body { max-width: 80%; }
.comment-bubble { background: #f0f2f5; border-radius: 18px; padding: 8px 12px; }
.comment-author { font-size: 12px; font-weight: 600; }
.comment-text { font-size: 13px; color: #050505; }
.comment-actions { display: flex; gap: 12px; padding-left: 4px; font-size: 11px; color: #65676b; margin-top: 2px; }
.comment-action { cursor: pointer; font-weight: 600; }
.comment-action:hover { text-decoration: underline; }

.replies { margin-left: 40px; }
.reply-input-row { display: flex; gap: 6px; margin: 4px 0 8px 40px; }
.reply-input { flex: 1; padding: 6px 10px; background: #f0f2f5; border: none; border-radius: 16px; font-size: 12px; outline: none; }
.view-replies { font-size: 12px; color: #65676b; cursor: pointer; font-weight: 600; margin-left: 40px; margin-bottom: 4px; }
.view-replies:hover { text-decoration: underline; }

.loading-sentinel { text-align: center; padding: 20px; font-size: 13px; color: #65676b; }
</style>
</head>
<body>

<div class="feed" id="feed"></div>
<div class="loading-sentinel" id="sentinel">Loading more posts...</div>

<script>
// ============================================================
// DATA
// ============================================================
const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];
const REACTION_NAMES = ['Like', 'Love', 'Haha', 'Wow', 'Sad', 'Angry'];

const authors = [
  { name: 'Rahul Sharma', avatar: '👨‍💻' },
  { name: 'Priya Patel', avatar: '👩‍🎨' },
  { name: 'Arjun Mehta', avatar: '🧔' },
  { name: 'Sneha Kapoor', avatar: '👩‍💼' },
  { name: 'Vikram Singh', avatar: '👨‍🔬' }
];

const sampleTexts = [
  'Just shipped a major feature at work! The team collaborated amazingly and we managed to deliver ahead of schedule. So proud of everyone involved. This is what great engineering culture looks like. 🚀',
  'Beautiful sunrise from my morning run today. Nature never fails to amaze me. Sometimes you need to slow down and appreciate the little things in life.',
  'Hot take: The best code is the code you never write. Over-engineering is real and we all need to fight the urge to add unnecessary abstractions.',
  'Had an amazing interview experience today. The interviewers were really supportive and the questions were challenging but fair. Fingers crossed! 🤞',
  'Exploring new coffee shops in Bangalore. This city has such an amazing café culture. Any recommendations for hidden gems?'
];

const imageEmojis = ['🌅', '💻', '🎨', '☕', '🏔️', '🎵', '📚', '🎮'];

let postPage = 0;
let allPosts = [];
let pendingReactions = {};

function generatePosts(page) {
  return Array.from({ length: 5 }, (_, i) => {
    const idx = page * 5 + i;
    const author = authors[idx % authors.length];
    const minsAgo = idx * 15 + Math.floor(Math.random() * 30);
    return {
      id: 'post_' + idx,
      author,
      text: sampleTexts[idx % sampleTexts.length],
      image: Math.random() > 0.4 ? imageEmojis[idx % imageEmojis.length] : null,
      timestamp: Date.now() - minsAgo * 60000,
      reactions: { '👍': Math.floor(Math.random() * 50), '❤️': Math.floor(Math.random() * 20) },
      userReaction: null,
      comments: idx < 3 ? [
        { id: 'c_' + idx + '_1', author: authors[(idx + 1) % authors.length], text: 'Great post!', time: Date.now() - (minsAgo - 5) * 60000, replies: [], showReplies: false }
      ] : [],
      expanded: false,
      showComments: idx < 2
    };
  });
}

// ============================================================
// RELATIVE TIME
// ============================================================
function relativeTime(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h';
  return Math.floor(diff / 86400) + 'd';
}

// ============================================================
// RENDER POST
// ============================================================
function renderPost(post) {
  const totalReactions = Object.values(post.reactions).reduce((s, v) => s + v, 0);
  const topEmojis = Object.entries(post.reactions).sort((a, b) => b[1] - a[1]).slice(0, 3).filter(([, v]) => v > 0);
  const isLong = post.text.length > 200;
  const reactionBtnLabel = post.userReaction ? REACTIONS[REACTION_NAMES.indexOf(post.userReaction)] + ' ' + post.userReaction : '👍 Like';
  const reactionClass = post.userReaction === 'Like' ? 'liked' : post.userReaction ? 'reacted' : '';

  let html = `<div class="post-card" data-post="${post.id}">`;

  // Header
  html += `<div class="post-header"><div class="avatar">${post.author.avatar}</div><div><div class="post-author">${post.author.name}</div><div class="post-time">${relativeTime(post.timestamp)}</div></div></div>`;

  // Body
  html += `<div class="post-body"><div class="post-text ${isLong && !post.expanded ? 'truncated' : ''}">${post.text}</div>${isLong && !post.expanded ? '<span class="see-more" data-post="' + post.id + '">See more</span>' : ''}</div>`;

  if (post.image) {
    html += `<div class="post-image">${post.image}</div>`;
  }

  // Reaction Summary
  if (totalReactions > 0) {
    html += `<div class="reaction-summary"><span class="reaction-emoji-group">${topEmojis.map(([e]) => `<span>${e}</span>`).join('')}</span> ${totalReactions}</div>`;
  }

  // Actions
  html += `<div class="action-bar">
    <button class="action-btn ${reactionClass}" data-post="${post.id}" data-action="react">
      ${reactionBtnLabel}
      <div class="reaction-picker" data-post="${post.id}">${REACTIONS.map((r, i) => `<span class="reaction-option" data-reaction="${REACTION_NAMES[i]}" data-emoji="${r}" title="${REACTION_NAMES[i]}">${r}</span>`).join('')}</div>
    </button>
    <button class="action-btn" data-post="${post.id}" data-action="comment">💬 Comment</button>
    <button class="action-btn" data-post="${post.id}" data-action="share">↗️ Share</button>
  </div>`;

  // Comments
  if (post.showComments) {
    html += `<div class="comments-section">`;
    html += `<div class="comment-input-row"><div class="comment-avatar">👤</div><input class="comment-input" data-post="${post.id}" placeholder="Write a comment..."></div>`;

    post.comments.forEach(c => {
      html += `<div class="comment"><div class="comment-avatar" style="width:28px;height:28px;font-size:12px;">${c.author.avatar}</div><div class="comment-body"><div class="comment-bubble"><div class="comment-author">${c.author.name}</div><div class="comment-text">${c.text}</div></div><div class="comment-actions"><span class="comment-action">Like</span><span class="comment-action" data-reply-to="${c.id}" data-post="${post.id}">Reply</span><span>${relativeTime(c.time)}</span></div>`;

      // Replies
      if (c.replies.length > 0) {
        if (!c.showReplies) {
          html += `<div class="view-replies" data-comment="${c.id}" data-post="${post.id}">View ${c.replies.length} ${c.replies.length === 1 ? 'reply' : 'replies'}</div>`;
        } else {
          html += `<div class="replies">${c.replies.map(r => `<div class="comment"><div class="comment-avatar" style="width:24px;height:24px;font-size:10px;">${r.author.avatar}</div><div class="comment-body"><div class="comment-bubble"><div class="comment-author">${r.author.name}</div><div class="comment-text">${r.text}</div></div><div class="comment-actions"><span class="comment-action">Like</span><span>${relativeTime(r.time)}</span></div></div></div>`).join('')}</div>`;
        }
      }

      html += `</div></div>`;
    });

    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

// ============================================================
// RENDER FEED
// ============================================================
function renderFeed() {
  document.getElementById('feed').innerHTML = allPosts.map(renderPost).join('');
  attachEvents();
}

function attachEvents() {
  // See more
  document.querySelectorAll('.see-more').forEach(el => {
    el.addEventListener('click', () => {
      const post = findPost(el.dataset.post);
      post.expanded = true;
      renderFeed();
    });
  });

  // Reaction: click = toggle Like, long press = show picker
  document.querySelectorAll('[data-action="react"]').forEach(btn => {
    let pressTimer;

    btn.addEventListener('mousedown', () => {
      pressTimer = setTimeout(() => {
        btn.querySelector('.reaction-picker').classList.add('visible');
      }, 500);
    });

    btn.addEventListener('mouseup', () => {
      clearTimeout(pressTimer);
      const picker = btn.querySelector('.reaction-picker');
      if (!picker.classList.contains('visible')) {
        // Quick click = toggle Like
        toggleReaction(btn.dataset.post, 'Like');
      }
    });

    btn.addEventListener('mouseleave', () => {
      clearTimeout(pressTimer);
      setTimeout(() => btn.querySelector('.reaction-picker')?.classList.remove('visible'), 300);
    });
  });

  // Reaction picker options
  document.querySelectorAll('.reaction-option').forEach(opt => {
    opt.addEventListener('click', e => {
      e.stopPropagation();
      const postId = opt.parentElement.dataset.post;
      const reaction = opt.dataset.reaction;
      toggleReaction(postId, reaction);
    });
  });

  // Comment toggle
  document.querySelectorAll('[data-action="comment"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const post = findPost(btn.dataset.post);
      post.showComments = !post.showComments;
      renderFeed();
    });
  });

  // Add comment
  document.querySelectorAll('.comment-input').forEach(input => {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && input.value.trim()) {
        const post = findPost(input.dataset.post);
        post.comments.push({
          id: 'c_' + Date.now(),
          author: { name: 'You', avatar: '👤' },
          text: input.value.trim(),
          time: Date.now(),
          replies: [],
          showReplies: false
        });
        renderFeed();
      }
    });
  });

  // Reply toggle
  document.querySelectorAll('[data-reply-to]').forEach(btn => {
    btn.addEventListener('click', () => {
      const postId = btn.dataset.post;
      const commentId = btn.dataset.replyTo;
      const text = prompt('Your reply:');
      if (text?.trim()) {
        const post = findPost(postId);
        const comment = post.comments.find(c => c.id === commentId);
        if (comment) {
          comment.replies.push({ author: { name: 'You', avatar: '👤' }, text: text.trim(), time: Date.now() });
          comment.showReplies = true;
          renderFeed();
        }
      }
    });
  });

  // View replies
  document.querySelectorAll('.view-replies').forEach(el => {
    el.addEventListener('click', () => {
      const post = findPost(el.dataset.post);
      const comment = post.comments.find(c => c.id === el.dataset.comment);
      if (comment) { comment.showReplies = true; renderFeed(); }
    });
  });
}

// ============================================================
// REACTIONS (OPTIMISTIC)
// ============================================================
function toggleReaction(postId, reactionName) {
  const post = findPost(postId);
  const emoji = REACTIONS[REACTION_NAMES.indexOf(reactionName)];

  if (post.userReaction === reactionName) {
    // Remove reaction
    post.reactions[emoji] = Math.max(0, (post.reactions[emoji] || 0) - 1);
    post.userReaction = null;
  } else {
    // Remove old reaction
    if (post.userReaction) {
      const oldEmoji = REACTIONS[REACTION_NAMES.indexOf(post.userReaction)];
      post.reactions[oldEmoji] = Math.max(0, (post.reactions[oldEmoji] || 0) - 1);
    }
    // Add new
    post.reactions[emoji] = (post.reactions[emoji] || 0) + 1;
    post.userReaction = reactionName;
  }

  // Debounced batch API call
  pendingReactions[postId] = post.userReaction;
  clearTimeout(window._reactionTimer);
  window._reactionTimer = setTimeout(() => {
    console.log('Batch reaction API call:', JSON.stringify(pendingReactions));
    pendingReactions = {};
  }, 2000);

  renderFeed();
}

function findPost(id) { return allPosts.find(p => p.id === id); }

// ============================================================
// INFINITE SCROLL
// ============================================================
const observer = new IntersectionObserver(entries => {
  if (entries[0].isIntersecting) {
    const newPosts = generatePosts(postPage);
    allPosts.push(...newPosts);
    postPage++;
    renderFeed();
  }
}, { rootMargin: '200px' });

// INIT
allPosts = generatePosts(0);
postPage = 1;
renderFeed();
observer.observe(document.getElementById('sentinel'));
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- **Optimistic reactions**: immediately update count + userReaction state, debounced batch API call with 2s timer
- **Reaction picker**: long-press (500ms mousedown timeout) shows picker, quick click toggles Like
- **Relative time**: `Math.floor(diff / 60)` for minutes, `/ 3600` for hours, `/ 86400` for days
- **Text truncation**: `-webkit-line-clamp: 3` + `overflow: hidden`, "See more" flips `expanded` flag
- **Nested comments**: 1 level of replies per comment, `showReplies` toggle with "View X replies" link
- **Infinite scroll**: `IntersectionObserver` on sentinel div, generates 5 posts per page

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | JS Fundamentals |
| Coding 1 | Medium | DOM, Events, CSS |
| Coding 2 | Hard | Social Feed, Reactions, Comments |
| System Design | Hard | News Feed Architecture |
| Behavioral | Medium | Meta Values |
