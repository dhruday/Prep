# Atlassian — P5 Frontend Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Atlassian |
| **Role** | Senior Frontend Engineer |
| **Level** | P5 |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Sydney, Australia (Remote) |
| **Source** | [Blind](https://www.teamblind.com/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Values + 2 Technical + HM)
- **Timeline:** 3 weeks
- **Format:** Virtual

## Round 1: Coding — Build a Mention/Tag Input Component
**Duration:** 45 minutes

### Problem
Build a text input that supports @mentions and #tags:
- Trigger popup after typing @ or #
- Filter suggestions as user types
- Select via click or keyboard
- Render mentions as styled chips in the input
- Support backspace to delete chip

### 💡 Interview-Ready Answer

```javascript
class MentionInput {
  constructor(container, { users = [], tags = [], onSubmit = () => {} } = {}) {
    this.container = container;
    this.users = users;      // [{ id, name, avatar }]
    this.tags = tags;         // [{ id, name, color }]
    this.onSubmit = onSubmit;

    this.mentions = [];       // [{ type: '@'|'#', value, start, end }]
    this.popupVisible = false;
    this.triggerChar = null;
    this.searchText = '';
    this.activeIndex = 0;
    this.filteredItems = [];

    this._build();
    this._bindEvents();
  }

  _build() {
    this.container.innerHTML = '';
    this.container.style.cssText = 'position:relative;';

    // Input wrapper (looks like a text field but contains chips + text)
    this.inputWrapper = document.createElement('div');
    this.inputWrapper.style.cssText = `
      border:1px solid #ccc;border-radius:4px;padding:8px;min-height:40px;
      display:flex;flex-wrap:wrap;gap:4px;align-items:center;cursor:text;
      background:#fff;
    `;
    this.inputWrapper.addEventListener('click', () => this.input.focus());

    // Actual editable input
    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.placeholder = 'Type @ to mention, # to tag...';
    this.input.setAttribute('role', 'combobox');
    this.input.setAttribute('aria-expanded', 'false');
    this.input.setAttribute('aria-autocomplete', 'list');
    this.input.style.cssText = `
      border:none;outline:none;flex:1;min-width:120px;font-size:14px;
    `;
    this.inputWrapper.appendChild(this.input);

    this.container.appendChild(this.inputWrapper);

    // Popup dropdown
    this.popup = document.createElement('ul');
    this.popup.setAttribute('role', 'listbox');
    this.popup.style.cssText = `
      position:absolute;top:100%;left:0;right:0;
      background:#fff;border:1px solid #ddd;border-radius:4px;
      max-height:200px;overflow-y:auto;margin:4px 0;padding:0;
      list-style:none;display:none;z-index:1000;
      box-shadow:0 4px 12px rgba(0,0,0,0.1);
    `;
    this.container.appendChild(this.popup);
  }

  _bindEvents() {
    this.input.addEventListener('input', () => this._onInput());
    this.input.addEventListener('keydown', (e) => this._onKeydown(e));
    this.input.addEventListener('blur', () => {
      // Delay to allow click on popup
      setTimeout(() => this._hidePopup(), 150);
    });

    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) {
        this._hidePopup();
      }
    });
  }

  _onInput() {
    const value = this.input.value;
    const cursorPos = this.input.selectionStart;

    // Find trigger character before cursor
    let triggerIndex = -1;
    for (let i = cursorPos - 1; i >= 0; i--) {
      const ch = value[i];
      if (ch === '@' || ch === '#') {
        triggerIndex = i;
        this.triggerChar = ch;
        break;
      }
      if (ch === ' ') break; // Stop at space
    }

    if (triggerIndex >= 0) {
      this.searchText = value.substring(triggerIndex + 1, cursorPos);
      this._filterAndShow();
    } else {
      this._hidePopup();
    }
  }

  _onKeydown(e) {
    if (this.popupVisible) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          this.activeIndex = (this.activeIndex + 1) % this.filteredItems.length;
          this._updatePopupHighlight();
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.activeIndex = (this.activeIndex - 1 + this.filteredItems.length) % this.filteredItems.length;
          this._updatePopupHighlight();
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          if (this.filteredItems[this.activeIndex]) {
            this._selectItem(this.filteredItems[this.activeIndex]);
          }
          break;
        case 'Escape':
          this._hidePopup();
          break;
      }
    } else if (e.key === 'Backspace' && this.input.value === '' && this.mentions.length > 0) {
      // Remove last chip
      e.preventDefault();
      this._removeLastChip();
    } else if (e.key === 'Enter' && !this.popupVisible) {
      e.preventDefault();
      this._submit();
    }
  }

  _filterAndShow() {
    const query = this.searchText.toLowerCase();
    const source = this.triggerChar === '@' ? this.users : this.tags;

    this.filteredItems = source.filter(item =>
      item.name.toLowerCase().includes(query)
    ).slice(0, 8);

    if (this.filteredItems.length === 0) {
      this._hidePopup();
      return;
    }

    this.activeIndex = 0;
    this._renderPopup();
    this._showPopup();
  }

  _renderPopup() {
    this.popup.innerHTML = '';

    this.filteredItems.forEach((item, index) => {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', index === this.activeIndex ? 'true' : 'false');
      li.style.cssText = `
        padding:8px 12px;cursor:pointer;display:flex;align-items:center;gap:8px;
        ${index === this.activeIndex ? 'background:#f0f7ff;' : ''}
      `;

      if (this.triggerChar === '@') {
        // User mention
        const avatar = document.createElement('div');
        avatar.style.cssText = `
          width:28px;height:28px;border-radius:50%;background:#${this._hashColor(item.name)};
          display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:bold;
        `;
        avatar.textContent = item.name.charAt(0).toUpperCase();
        li.appendChild(avatar);

        const name = document.createElement('span');
        name.textContent = item.name;
        li.appendChild(name);
      } else {
        // Tag
        const dot = document.createElement('span');
        dot.style.cssText = `
          width:12px;height:12px;border-radius:50%;
          background:${item.color || '#' + this._hashColor(item.name)};
        `;
        li.appendChild(dot);

        const name = document.createElement('span');
        name.textContent = '#' + item.name;
        li.appendChild(name);
      }

      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this._selectItem(item);
      });

      li.addEventListener('mouseenter', () => {
        this.activeIndex = index;
        this._updatePopupHighlight();
      });

      this.popup.appendChild(li);
    });
  }

  _selectItem(item) {
    // Create chip
    const chip = document.createElement('span');
    chip.className = 'mention-chip';
    chip.dataset.type = this.triggerChar;
    chip.dataset.id = item.id;

    const isUser = this.triggerChar === '@';
    const bg = isUser ? '#e8f0fe' : (item.color ? item.color + '22' : '#e8f0fe');
    const color = isUser ? '#1a73e8' : (item.color || '#1a73e8');

    chip.style.cssText = `
      display:inline-flex;align-items:center;gap:4px;
      background:${bg};color:${color};padding:2px 8px;
      border-radius:12px;font-size:13px;font-weight:500;
    `;

    const label = document.createElement('span');
    label.textContent = (isUser ? '@' : '#') + item.name;
    chip.appendChild(label);

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '×';
    removeBtn.style.cssText = 'border:none;background:none;cursor:pointer;color:inherit;padding:0 2px;font-size:14px;';
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      chip.remove();
      this.mentions = this.mentions.filter(m => m.id !== item.id || m.type !== this.triggerChar);
      this.input.focus();
    });
    chip.appendChild(removeBtn);

    // Insert chip before input
    this.inputWrapper.insertBefore(chip, this.input);

    // Store mention
    this.mentions.push({
      type: this.triggerChar,
      id: item.id,
      name: item.name
    });

    // Clear input text (remove trigger + search text)
    const value = this.input.value;
    const cursor = this.input.selectionStart;
    const triggerStart = value.lastIndexOf(this.triggerChar, cursor - 1);
    this.input.value = value.substring(0, triggerStart) + value.substring(cursor);

    this._hidePopup();
    this.input.focus();
  }

  _removeLastChip() {
    const chips = this.inputWrapper.querySelectorAll('.mention-chip');
    if (chips.length > 0) {
      const last = chips[chips.length - 1];
      const id = last.dataset.id;
      const type = last.dataset.type;
      last.remove();
      this.mentions = this.mentions.filter(m => !(m.id === id && m.type === type));
    }
  }

  _submit() {
    const text = this.input.value.trim();
    this.onSubmit({
      text,
      mentions: [...this.mentions]
    });
  }

  _showPopup() {
    this.popupVisible = true;
    this.popup.style.display = 'block';
    this.input.setAttribute('aria-expanded', 'true');
  }

  _hidePopup() {
    this.popupVisible = false;
    this.popup.style.display = 'none';
    this.input.setAttribute('aria-expanded', 'false');
  }

  _updatePopupHighlight() {
    const items = this.popup.querySelectorAll('li');
    items.forEach((li, i) => {
      li.style.background = i === this.activeIndex ? '#f0f7ff' : '';
      li.setAttribute('aria-selected', i === this.activeIndex ? 'true' : 'false');
    });
  }

  _hashColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = ['4285F4', '34A853', 'EA4335', 'FBBC05', '9C27B0', 'FF5722'];
    return colors[Math.abs(hash) % colors.length];
  }
}

// === Usage ===
/*
const mention = new MentionInput(document.getElementById('comment'), {
  users: [
    { id: '1', name: 'Alice Johnson' },
    { id: '2', name: 'Bob Smith' },
    { id: '3', name: 'Charlie Brown' },
  ],
  tags: [
    { id: 't1', name: 'bug', color: '#dc3545' },
    { id: 't2', name: 'feature', color: '#28a745' },
    { id: 't3', name: 'design', color: '#6f42c1' },
  ],
  onSubmit: ({ text, mentions }) => {
    console.log('Text:', text, 'Mentions:', mentions);
  }
});
*/
```

## 🎯 Key Takeaways
- Atlassian (Jira, Confluence) **always** asks mention/tag components
- Trigger detection: scan backwards from cursor for `@` or `#`
- Chips rendered as inline elements before the `<input>` in a flex wrapper
- Backspace on empty input removes last chip
- `mousedown` + `preventDefault` on popup items prevents input blur
- Color coding: deterministic hash of name to color for consistency

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding | Hard | Mention System, Chip Input, Popup |
| Technical 2 | Medium | State Management, DOM |
| Values | Medium | Atlassian Values Alignment |
