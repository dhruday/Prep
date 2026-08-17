# LinkedIn — Senior FE Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | LinkedIn |
| **Role** | Senior Frontend Engineer |
| **Level** | Senior |
| **YOE** | 6 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Phone + 2 Technical + HM)
- **Timeline:** 3 weeks
- **Format:** Virtual

## Round 1: Coding — Build an Infinite Scroll Feed with Virtualization
**Duration:** 45 minutes

### Problem
Build a social media feed with infinite scroll and:
- Load more posts when user scrolls near bottom
- Virtualize off-screen posts for performance
- Show loading skeleton while fetching
- Handle scroll position restoration on back navigation

### 💡 Interview-Ready Answer

```javascript
class InfiniteScrollFeed {
  constructor(container, { fetchPosts, renderPost, pageSize = 20, threshold = 300 }) {
    this.container = container;
    this.fetchPosts = fetchPosts;
    this.renderPost = renderPost;
    this.pageSize = pageSize;
    this.threshold = threshold; // px from bottom to trigger load

    this.posts = [];
    this.page = 0;
    this.loading = false;
    this.hasMore = true;
    this.observer = null;

    // Virtualization
    this.visiblePosts = new Map(); // postId -> element
    this.postHeights = new Map(); // postId -> measured height
    this.estimatedHeight = 200;

    this._setup();
    this._loadMore();
  }

  _setup() {
    this.container.style.cssText = 'overflow-y:auto;height:100%;position:relative;';

    // Scroll content container
    this.content = document.createElement('div');
    this.content.style.position = 'relative';
    this.container.appendChild(this.content);

    // Sentinel element at bottom (IntersectionObserver target)
    this.sentinel = document.createElement('div');
    this.sentinel.style.height = '1px';
    this.sentinel.setAttribute('aria-hidden', 'true');
    this.container.appendChild(this.sentinel);

    // Loading skeleton container
    this.skeletonContainer = document.createElement('div');
    this.skeletonContainer.style.display = 'none';
    this._buildSkeletons();
    this.container.appendChild(this.skeletonContainer);

    // Use IntersectionObserver for infinite scroll trigger
    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !this.loading && this.hasMore) {
          this._loadMore();
        }
      },
      { root: this.container, rootMargin: `${this.threshold}px` }
    );
    this.observer.observe(this.sentinel);

    // Virtualization observer — track visible post cards
    this.visibilityObserver = new IntersectionObserver(
      (entries) => this._onVisibilityChange(entries),
      { root: this.container, rootMargin: '200px 0px' }
    );

    // Save scroll position for back navigation
    this._restoreScrollPosition();
    this.container.addEventListener('scroll', this._debounce(() => {
      sessionStorage.setItem('feed_scroll_pos', String(this.container.scrollTop));
    }, 200));
  }

  _buildSkeletons() {
    for (let i = 0; i < 3; i++) {
      const skeleton = document.createElement('div');
      skeleton.className = 'skeleton-post';
      skeleton.style.cssText = `
        padding:16px;margin:8px 0;background:#f5f5f5;border-radius:8px;
        animation:pulse 1.5s ease-in-out infinite;
      `;
      skeleton.innerHTML = `
        <div style="display:flex;gap:12px;margin-bottom:12px;">
          <div style="width:48px;height:48px;border-radius:50%;background:#e0e0e0;"></div>
          <div style="flex:1;">
            <div style="width:40%;height:14px;background:#e0e0e0;border-radius:4px;margin-bottom:8px;"></div>
            <div style="width:25%;height:12px;background:#e0e0e0;border-radius:4px;"></div>
          </div>
        </div>
        <div style="width:100%;height:12px;background:#e0e0e0;border-radius:4px;margin-bottom:6px;"></div>
        <div style="width:80%;height:12px;background:#e0e0e0;border-radius:4px;margin-bottom:6px;"></div>
        <div style="width:60%;height:12px;background:#e0e0e0;border-radius:4px;"></div>
      `;
      this.skeletonContainer.appendChild(skeleton);
    }

    // Add CSS animation
    if (!document.getElementById('skeleton-styles')) {
      const style = document.createElement('style');
      style.id = 'skeleton-styles';
      style.textContent = `
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  async _loadMore() {
    if (this.loading || !this.hasMore) return;

    this.loading = true;
    this.skeletonContainer.style.display = 'block';

    try {
      const newPosts = await this.fetchPosts({
        page: this.page,
        pageSize: this.pageSize
      });

      if (newPosts.length < this.pageSize) {
        this.hasMore = false;
      }

      this.page++;
      this.posts.push(...newPosts);
      this._appendPosts(newPosts);
    } catch (error) {
      console.error('Failed to load posts:', error);
      this._showError();
    } finally {
      this.loading = false;
      this.skeletonContainer.style.display = 'none';
    }
  }

  _appendPosts(posts) {
    posts.forEach(post => {
      const wrapper = document.createElement('div');
      wrapper.className = 'feed-post';
      wrapper.dataset.postId = post.id;
      wrapper.style.cssText = 'margin-bottom:8px;';

      // Render post content
      this.renderPost(wrapper, post);
      this.content.appendChild(wrapper);

      // Observe for virtualization
      this.visibilityObserver.observe(wrapper);
      this.visiblePosts.set(post.id, wrapper);
    });

    // Update spacer height
    this._updateTotalHeight();
  }

  /**
   * Virtualization: replace off-screen posts with placeholders.
   * Keeps DOM node count manageable for very long feeds.
   */
  _onVisibilityChange(entries) {
    entries.forEach(entry => {
      const postId = entry.target.dataset.postId;
      const wrapper = entry.target;

      if (!entry.isIntersecting) {
        // Save measured height before virtualizing
        const height = wrapper.getBoundingClientRect().height;
        this.postHeights.set(postId, height);

        // Replace content with empty placeholder of same height
        if (wrapper.children.length > 0 && !wrapper.dataset.virtualized) {
          wrapper._savedHTML = wrapper.innerHTML;
          wrapper.innerHTML = '';
          wrapper.style.height = `${height}px`;
          wrapper.dataset.virtualized = 'true';
        }
      } else {
        // Restore content when scrolling back into view
        if (wrapper.dataset.virtualized === 'true' && wrapper._savedHTML) {
          wrapper.innerHTML = wrapper._savedHTML;
          wrapper.style.height = '';
          delete wrapper.dataset.virtualized;
          delete wrapper._savedHTML;
        }
      }
    });
  }

  _updateTotalHeight() {
    let totalHeight = 0;
    this.content.querySelectorAll('.feed-post').forEach(el => {
      totalHeight += el.getBoundingClientRect().height || this.estimatedHeight;
    });
    this.content.style.minHeight = `${totalHeight}px`;
  }

  _restoreScrollPosition() {
    const saved = sessionStorage.getItem('feed_scroll_pos');
    if (saved) {
      requestAnimationFrame(() => {
        this.container.scrollTop = parseInt(saved);
      });
    }
  }

  _showError() {
    const errorEl = document.createElement('div');
    errorEl.style.cssText = 'text-align:center;padding:20px;color:#dc3545;';
    errorEl.innerHTML = `
      <p>Failed to load posts</p>
      <button onclick="this.parentElement.remove()" 
              style="padding:8px 16px;border:1px solid #dc3545;border-radius:4px;background:none;color:#dc3545;cursor:pointer;">
        Retry
      </button>
    `;
    errorEl.querySelector('button').addEventListener('click', () => {
      errorEl.remove();
      this._loadMore();
    });
    this.container.appendChild(errorEl);
  }

  _debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  destroy() {
    if (this.observer) this.observer.disconnect();
    if (this.visibilityObserver) this.visibilityObserver.disconnect();
    this.container.innerHTML = '';
  }
}

// === Usage ===
/*
const feed = new InfiniteScrollFeed(document.getElementById('feed'), {
  pageSize: 20,
  threshold: 300,

  fetchPosts: async ({ page, pageSize }) => {
    const res = await fetch(`/api/feed?page=${page}&size=${pageSize}`);
    return res.json();
  },

  renderPost: (el, post) => {
    el.innerHTML = `
      <div style="padding:16px;background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          <img src="${post.avatar}" style="width:48px;height:48px;border-radius:50%;" alt="" />
          <div>
            <strong>${post.author}</strong>
            <div style="font-size:12px;color:#666;">${post.title}</div>
          </div>
        </div>
        <p style="margin:0;line-height:1.5;">${post.content}</p>
      </div>
    `;
  }
});
*/
```

## 🎯 Key Takeaways
- LinkedIn always tests **feed/infinite scroll** — their core product UX
- **IntersectionObserver** for both infinite scroll trigger AND virtualization
- Skeleton loading provides better perceived performance than spinners
- Virtualization: save innerHTML, replace with fixed-height placeholder
- Scroll position restoration via sessionStorage for back navigation
- Debounce scroll position save to avoid performance issues

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding | Hard | IntersectionObserver, Virtualization, Skeleton |
| Technical 2 | Medium | DOM, Event Handling |
| HM | Medium | Behavioral |
