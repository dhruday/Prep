# Microsoft — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Microsoft |
| **Role** | Senior Frontend Engineer |
| **Level** | L63 |
| **YOE** | 6 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Noida, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/microsoft-interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Phone + 2 Frontend Technical + Hiring Manager)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 1: Phone Screen
**Duration:** 60 minutes

### Questions Asked
1. **Build an Accessible Modal Dialog System**
   - Open/close with keyboard (Escape → close)
   - Focus trap: Tab/Shift+Tab should cycle within modal
   - Restore focus on close
   - Stack multiple modals (nested modal support)
   - Screen reader announcements with ARIA live regions

### 💡 Interview-Ready Answer

```javascript
class ModalManager {
  constructor() {
    this.modalStack = [];
    this.focusBefore = []; // track focus before each modal
    this.overlay = null;
  }

  // ============================
  // Create Overlay (shared)
  // ============================
  getOrCreateOverlay() {
    if (!this.overlay) {
      this.overlay = document.createElement('div');
      this.overlay.id = 'modal-overlay';
      this.overlay.style.cssText = `
        position: fixed; inset: 0; background: rgba(0,0,0,0.5);
        z-index: 1000; display: flex; align-items: center;
        justify-content: center; opacity: 0;
        transition: opacity 0.2s ease;
      `;
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) this.closeTop();
      });
      document.body.appendChild(this.overlay);
      // Trigger reflow for animation
      requestAnimationFrame(() => this.overlay.style.opacity = '1');
    }
    return this.overlay;
  }

  // ============================
  // Open Modal
  // ============================
  open(options = {}) {
    const {
      title = 'Dialog',
      content = '',
      actions = [],
      onClose = () => {},
      closeOnEscape = true,
      closeOnOverlay = true,
      width = '480px',
    } = options;

    // Save current focus
    this.focusBefore.push(document.activeElement);

    const overlay = this.getOrCreateOverlay();

    // Create modal element
    const modal = document.createElement('div');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', `modal-title-${this.modalStack.length}`);
    modal.style.cssText = `
      background: #fff; border-radius: 12px; padding: 0;
      max-width: ${width}; width: 90vw; max-height: 80vh;
      overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      transform: translateY(20px); opacity: 0;
      transition: transform 0.2s ease, opacity 0.2s ease;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex; justify-content: space-between; align-items: center;
      padding: 16px 20px; border-bottom: 1px solid #E0E0E0;
    `;

    const titleEl = document.createElement('h2');
    titleEl.id = `modal-title-${this.modalStack.length}`;
    titleEl.textContent = title;
    titleEl.style.cssText = 'margin: 0; font-size: 18px; font-weight: 600;';

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.setAttribute('aria-label', 'Close dialog');
    closeBtn.style.cssText = `
      background: none; border: none; font-size: 20px;
      cursor: pointer; padding: 4px 8px; border-radius: 4px;
      color: #666;
    `;
    closeBtn.addEventListener('click', () => this.closeTop());

    header.appendChild(titleEl);
    header.appendChild(closeBtn);

    // Body
    const body = document.createElement('div');
    body.style.cssText = 'padding: 20px;';
    if (typeof content === 'string') {
      body.textContent = content;
    } else if (content instanceof HTMLElement) {
      body.appendChild(content);
    }

    // Footer with actions
    const footer = document.createElement('div');
    footer.style.cssText = `
      display: flex; justify-content: flex-end; gap: 8px;
      padding: 12px 20px; border-top: 1px solid #E0E0E0;
    `;

    actions.forEach(({ label, onClick, primary }) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.style.cssText = `
        padding: 8px 16px; border-radius: 6px; cursor: pointer;
        font-size: 14px; font-weight: 500;
        ${primary
          ? 'background: #0078D4; color: white; border: none;'
          : 'background: white; color: #333; border: 1px solid #CCC;'}
      `;
      btn.addEventListener('click', () => {
        if (onClick) onClick();
      });
      footer.appendChild(btn);
    });

    modal.appendChild(header);
    modal.appendChild(body);
    if (actions.length > 0) modal.appendChild(footer);

    // Store metadata
    modal._modalData = { onClose, closeOnEscape };
    this.modalStack.push(modal);
    overlay.appendChild(modal);

    // Animate in
    requestAnimationFrame(() => {
      modal.style.transform = 'translateY(0)';
      modal.style.opacity = '1';
    });

    // Setup focus trap
    this.setupFocusTrap(modal);

    // Focus first focusable element
    requestAnimationFrame(() => {
      const firstFocusable = this.getFocusableElements(modal)[0];
      if (firstFocusable) firstFocusable.focus();
    });

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Announce to screen readers
    this.announce(`${title} dialog opened`);

    return modal;
  }

  // ============================
  // Focus Trap
  // ============================
  getFocusableElements(container) {
    const selector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');
    return [...container.querySelectorAll(selector)];
  }

  setupFocusTrap(modal) {
    modal._trapHandler = (e) => {
      if (e.key === 'Tab') {
        const focusable = this.getFocusableElements(modal);
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }

      if (e.key === 'Escape' && modal._modalData.closeOnEscape) {
        e.stopPropagation();
        this.closeTop();
      }
    };

    modal.addEventListener('keydown', modal._trapHandler);
  }

  // ============================
  // Close Modal
  // ============================
  closeTop() {
    if (this.modalStack.length === 0) return;

    const modal = this.modalStack.pop();
    const { onClose } = modal._modalData;

    // Animate out
    modal.style.transform = 'translateY(20px)';
    modal.style.opacity = '0';

    setTimeout(() => {
      modal.removeEventListener('keydown', modal._trapHandler);
      modal.remove();

      if (this.modalStack.length === 0) {
        this.overlay.style.opacity = '0';
        setTimeout(() => {
          this.overlay.remove();
          this.overlay = null;
        }, 200);
        document.body.style.overflow = '';
      }
    }, 200);

    // Restore focus
    const previousFocus = this.focusBefore.pop();
    if (previousFocus && previousFocus.focus) {
      previousFocus.focus();
    }

    if (onClose) onClose();
    this.announce('Dialog closed');
  }

  // ============================
  // Screen Reader Announcements
  // ============================
  announce(message) {
    let liveRegion = document.getElementById('modal-live-region');
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'modal-live-region';
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.style.cssText = `
        position: absolute; width: 1px; height: 1px;
        overflow: hidden; clip: rect(0,0,0,0);
      `;
      document.body.appendChild(liveRegion);
    }
    liveRegion.textContent = message;
  }

  closeAll() {
    while (this.modalStack.length > 0) {
      this.closeTop();
    }
  }
}

// Usage
const manager = new ModalManager();

document.getElementById('open-btn').addEventListener('click', () => {
  manager.open({
    title: 'Confirm Delete',
    content: 'Are you sure you want to delete this item? This cannot be undone.',
    actions: [
      { label: 'Cancel', onClick: () => manager.closeTop() },
      { label: 'Delete', primary: true, onClick: () => {
        console.log('Deleted!');
        manager.closeTop();
      }},
    ],
  });
});
```

**Accessibility Features:**
- **Focus trap:** Tab cycles within modal, Shift+Tab reverses
- **Focus restoration:** Previous focus is restored on close
- **ARIA:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- **Escape key:** Closes modal
- **Screen reader:** `aria-live="polite"` announces open/close
- **Nested modals:** Stack-based management with proper focus chain

## Round 2: Technical 2 — CSS Architecture
**Duration:** 60 minutes

### Questions Asked
1. **Build a Responsive Dashboard Layout with CSS Grid**
   - Sidebar, header, main content, widget grid
   - Collapsible sidebar on mobile
   - Animated transitions between layouts

## Round 3: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design the Frontend for Microsoft Teams**
   - Chat, channels, file sharing, video call integration
   - Offline capability with IndexedDB
   - Notification management across tabs (SharedWorker)

## Round 4: Hiring Manager
**Duration:** 45 minutes

## 🎯 Key Takeaways
- Microsoft cares deeply about **accessibility** — modal focus trap is a litmus test
- WAI-ARIA patterns for dialogs are non-negotiable at Microsoft
- **Nested modal stacking** is a common follow-up — use a stack-based approach
- Screen reader announcements with `aria-live` show production a11y awareness
- CSS Grid for dashboard layouts is expected knowledge at senior level

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium-Hard | Modal, Focus Trap, ARIA, A11y |
| Technical 2 | Medium | CSS Grid, Responsive, Animation |
| System Design | Hard | Teams Architecture, Offline, Notifications |
| Hiring Manager | Easy | Behavioral |
