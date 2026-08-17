# Netflix — L5 Frontend Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Netflix |
| **Role** | Senior UI Engineer |
| **Level** | L5 |
| **YOE** | 6 years |
| **Date** | January 2025 |
| **Result** | ❌ Rejected |
| **Location** | Los Gatos, CA |
| **Source** | [Blind](https://www.teamblind.com/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Phone + Technical Deep Dive + System Design + Culture)
- **Timeline:** 3 weeks
- **Format:** Virtual

## Round 1: Technical — Build a Toast Notification System
**Duration:** 60 minutes

### Problem
Build a toast notification system supporting:
- Multiple toast types (success, error, warning, info)
- Auto-dismiss with countdown timer
- Pause timer on hover
- Stack management (max visible, queue)
- Swipe-to-dismiss on mobile
- Entrance/exit animations

### 💡 Interview-Ready Answer

```javascript
class ToastManager {
  static instance = null;

  static getInstance(options = {}) {
    if (!ToastManager.instance) {
      ToastManager.instance = new ToastManager(options);
    }
    return ToastManager.instance;
  }

  constructor({ maxVisible = 5, position = 'top-right', gap = 8 } = {}) {
    this.maxVisible = maxVisible;
    this.position = position;
    this.gap = gap;
    this.toasts = [];      // Currently visible
    this.queue = [];        // Waiting to display
    this.nextId = 1;

    this._createContainer();
  }

  _createContainer() {
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    this.container.setAttribute('role', 'alert');
    this.container.setAttribute('aria-live', 'polite');

    const posStyles = {
      'top-right': 'top:16px;right:16px;',
      'top-left': 'top:16px;left:16px;',
      'bottom-right': 'bottom:16px;right:16px;',
      'bottom-left': 'bottom:16px;left:16px;',
      'top-center': 'top:16px;left:50%;transform:translateX(-50%);',
    };

    this.container.style.cssText = `
      position:fixed;${posStyles[this.position] || posStyles['top-right']}
      z-index:10000;display:flex;flex-direction:column;gap:${this.gap}px;
      pointer-events:none; max-width:380px; width:100%;
    `;

    document.body.appendChild(this.container);
  }

  /**
   * Show a toast notification.
   * @returns {number} Toast ID for programmatic dismissal
   */
  show({ message, type = 'info', duration = 4000, action = null, closable = true }) {
    const toast = {
      id: this.nextId++,
      message,
      type,
      duration,
      action,      // { label, onClick }
      closable,
      remaining: duration,
      paused: false,
    };

    if (this.toasts.length >= this.maxVisible) {
      this.queue.push(toast);
      return toast.id;
    }

    this._displayToast(toast);
    return toast.id;
  }

  // Convenience methods
  success(message, opts = {}) { return this.show({ ...opts, message, type: 'success' }); }
  error(message, opts = {}) { return this.show({ ...opts, message, type: 'error', duration: opts.duration || 6000 }); }
  warning(message, opts = {}) { return this.show({ ...opts, message, type: 'warning' }); }
  info(message, opts = {}) { return this.show({ ...opts, message, type: 'info' }); }

  dismiss(id) {
    const index = this.toasts.findIndex(t => t.id === id);
    if (index !== -1) {
      this._removeToast(this.toasts[index]);
    }
  }

  dismissAll() {
    [...this.toasts].forEach(t => this._removeToast(t));
    this.queue = [];
  }

  _displayToast(toast) {
    this.toasts.push(toast);

    const el = this._createElement(toast);
    toast.element = el;

    // Entrance animation
    el.style.transform = 'translateX(100%)';
    el.style.opacity = '0';
    this.container.appendChild(el);

    // Force reflow for animation
    el.offsetHeight;
    el.style.transition = 'all 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55)';
    el.style.transform = 'translateX(0)';
    el.style.opacity = '1';

    // Auto-dismiss timer
    if (toast.duration > 0) {
      this._startTimer(toast);
    }
  }

  _createElement(toast) {
    const typeConfig = {
      success: { bg: '#d4edda', border: '#28a745', icon: '✓', color: '#155724' },
      error: { bg: '#f8d7da', border: '#dc3545', icon: '✕', color: '#721c24' },
      warning: { bg: '#fff3cd', border: '#ffc107', icon: '⚠', color: '#856404' },
      info: { bg: '#d1ecf1', border: '#17a2b8', icon: 'ℹ', color: '#0c5460' },
    };

    const config = typeConfig[toast.type] || typeConfig.info;

    const el = document.createElement('div');
    el.className = `toast toast-${toast.type}`;
    el.dataset.toastId = toast.id;
    el.style.cssText = `
      background:${config.bg}; border-left:4px solid ${config.border};
      color:${config.color}; padding:12px 16px; border-radius:6px;
      box-shadow:0 4px 12px rgba(0,0,0,0.15); pointer-events:auto;
      display:flex; align-items:flex-start; gap:10px; position:relative;
      cursor:default; user-select:none; overflow:hidden;
    `;

    // Pause on hover
    el.addEventListener('mouseenter', () => {
      toast.paused = true;
      this._clearTimer(toast);
    });

    el.addEventListener('mouseleave', () => {
      toast.paused = false;
      if (toast.remaining > 0) {
        this._startTimer(toast);
      }
    });

    // Swipe to dismiss (touch support)
    this._setupSwipe(el, toast);

    // Icon
    const icon = document.createElement('span');
    icon.textContent = config.icon;
    icon.style.cssText = 'font-size:18px;flex-shrink:0;';
    el.appendChild(icon);

    // Message content
    const content = document.createElement('div');
    content.style.cssText = 'flex:1;min-width:0;';

    const msg = document.createElement('p');
    msg.textContent = toast.message;
    msg.style.cssText = 'margin:0;font-size:14px;line-height:1.4;';
    content.appendChild(msg);

    // Action button
    if (toast.action) {
      const actionBtn = document.createElement('button');
      actionBtn.textContent = toast.action.label;
      actionBtn.style.cssText = `
        background:none;border:none;color:${config.border};
        cursor:pointer;padding:4px 0;font-weight:bold;font-size:13px;
        text-decoration:underline;margin-top:4px;
      `;
      actionBtn.addEventListener('click', () => {
        toast.action.onClick();
        this._removeToast(toast);
      });
      content.appendChild(actionBtn);
    }

    el.appendChild(content);

    // Close button
    if (toast.closable) {
      const closeBtn = document.createElement('button');
      closeBtn.textContent = '×';
      closeBtn.setAttribute('aria-label', 'Close notification');
      closeBtn.style.cssText = `
        background:none;border:none;cursor:pointer;font-size:18px;
        color:${config.color};opacity:0.6;padding:0 4px;flex-shrink:0;
        line-height:1;
      `;
      closeBtn.addEventListener('click', () => this._removeToast(toast));
      el.appendChild(closeBtn);
    }

    // Progress bar (countdown)
    if (toast.duration > 0) {
      const progressBar = document.createElement('div');
      progressBar.className = 'toast-progress';
      progressBar.style.cssText = `
        position:absolute;bottom:0;left:0;height:3px;
        background:${config.border};opacity:0.5;width:100%;
        transition:width linear;
      `;
      toast.progressBar = progressBar;
      el.appendChild(progressBar);
    }

    return el;
  }

  _setupSwipe(el, toast) {
    let startX = 0;
    let currentX = 0;
    let isDragging = false;

    el.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      isDragging = true;
      el.style.transition = 'none';
    }, { passive: true });

    el.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      currentX = e.touches[0].clientX - startX;
      el.style.transform = `translateX(${currentX}px)`;
      el.style.opacity = String(1 - Math.abs(currentX) / 200);
    }, { passive: true });

    el.addEventListener('touchend', () => {
      isDragging = false;
      el.style.transition = 'all 0.3s ease';

      if (Math.abs(currentX) > 100) {
        // Dismiss
        el.style.transform = `translateX(${currentX > 0 ? 400 : -400}px)`;
        el.style.opacity = '0';
        setTimeout(() => this._removeToast(toast), 300);
      } else {
        // Snap back
        el.style.transform = 'translateX(0)';
        el.style.opacity = '1';
      }
      currentX = 0;
    });
  }

  _startTimer(toast) {
    const startTime = Date.now();
    const duration = toast.remaining;

    // Animate progress bar
    if (toast.progressBar) {
      const startWidth = (toast.remaining / toast.duration) * 100;
      toast.progressBar.style.width = `${startWidth}%`;
      requestAnimationFrame(() => {
        toast.progressBar.style.transitionDuration = `${duration}ms`;
        toast.progressBar.style.width = '0%';
      });
    }

    toast.timerId = setTimeout(() => {
      this._removeToast(toast);
    }, duration);

    // Track remaining time for pause/resume
    toast._timerStart = startTime;
  }

  _clearTimer(toast) {
    if (toast.timerId) {
      clearTimeout(toast.timerId);
      const elapsed = Date.now() - (toast._timerStart || Date.now());
      toast.remaining = Math.max(0, toast.remaining - elapsed);
      toast.timerId = null;

      // Pause progress bar
      if (toast.progressBar) {
        const currentWidth = toast.progressBar.getBoundingClientRect().width;
        const parentWidth = toast.progressBar.parentElement.getBoundingClientRect().width;
        toast.progressBar.style.transitionDuration = '0ms';
        toast.progressBar.style.width = `${(currentWidth / parentWidth) * 100}%`;
      }
    }
  }

  _removeToast(toast) {
    this._clearTimer(toast);

    const index = this.toasts.indexOf(toast);
    if (index === -1) return;

    this.toasts.splice(index, 1);

    if (toast.element) {
      toast.element.style.transition = 'all 0.3s ease';
      toast.element.style.transform = 'translateX(100%)';
      toast.element.style.opacity = '0';
      toast.element.style.maxHeight = '0';
      toast.element.style.marginBottom = '0';
      toast.element.style.padding = '0';

      setTimeout(() => {
        if (toast.element.parentNode) {
          toast.element.parentNode.removeChild(toast.element);
        }
      }, 300);
    }

    // Show queued toast
    if (this.queue.length > 0) {
      setTimeout(() => {
        const next = this.queue.shift();
        this._displayToast(next);
      }, 100);
    }
  }
}

// === Usage ===
/*
const toast = ToastManager.getInstance({ maxVisible: 4, position: 'top-right' });

toast.success('File saved successfully!');
toast.error('Failed to connect to server', { duration: 6000 });
toast.warning('Low disk space');
toast.info('New version available', {
  action: { label: 'Update Now', onClick: () => window.location.reload() }
});

// Programmatic dismiss
const id = toast.show({ message: 'Processing...', type: 'info', duration: 0 });
setTimeout(() => toast.dismiss(id), 5000);
*/
```

## 🎯 Key Takeaways
- **Toast system** tests UI animation, timer management, and queue handling
- Pause/resume timer on hover by tracking remaining time
- CSS progress bar animated with `transition: width linear` for countdown
- Swipe-to-dismiss: track touchstart/touchmove/touchend, dismiss if swipe > threshold
- Singleton pattern (getInstance) ensures one toast container
- Queue management: show max N, queue rest, auto-show on dismiss

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Technical | Hard | Animation, Timer, Touch Events, Queue |
| System Design | Hard | Netflix Video Player Architecture |
| Culture | Medium | Netflix Culture Alignment |
