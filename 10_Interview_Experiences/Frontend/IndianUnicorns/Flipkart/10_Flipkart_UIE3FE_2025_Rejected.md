# Flipkart — Senior FE Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Flipkart |
| **Role** | UI Engineer 3 |
| **Level** | Senior |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (JS Deep Dive + Machine Coding + FE System Design + HM)
- **Timeline:** 3 weeks
- **Format:** Virtual

## Round 2: Machine Coding — Multi-Select Dropdown with Search & Tags

### Problem
Build a multi-select dropdown component:
- Search/filter options with highlight matching text
- Selected items shown as removable tags
- Keyboard navigation (arrow keys to move, Enter to select, Esc to close)
- Group options by category
- Select all / deselect all per group
- Maximum selection limit with visual feedback

### 💡 Interview-Ready Answer

```javascript
class MultiSelectDropdown {
  constructor(container, options, config = {}) {
    this.container = container;
    this.allOptions = options; // [{ id, label, group }]
    this.selected = new Set(config.selected || []);
    this.maxSelections = config.max || Infinity;
    this.placeholder = config.placeholder || 'Select items...';
    this.searchTerm = '';
    this.isOpen = false;
    this.focusedIndex = -1;
    this.filteredOptions = [...options];
    this.onChangeCallback = config.onChange || (() => {});

    this.render();
    this.setupClickOutside();
  }

  render() {
    this.container.innerHTML = '';
    this.container.className = 'multiselect-container';
    this.container.style.cssText = 'position:relative;width:100%;';

    this.renderTrigger();
    if (this.isOpen) this.renderDropdown();
  }

  renderTrigger() {
    const trigger = document.createElement('div');
    trigger.className = 'multiselect-trigger';
    trigger.setAttribute('role', 'combobox');
    trigger.setAttribute('aria-expanded', this.isOpen);
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.style.cssText = `
      min-height:40px;border:1px solid ${this.isOpen ? '#1a73e8' : '#ccc'};
      border-radius:8px;padding:4px 8px;display:flex;flex-wrap:wrap;
      gap:4px;align-items:center;cursor:text;background:#fff;
    `;

    // Tags for selected items
    if (this.selected.size > 0) {
      for (const id of this.selected) {
        const opt = this.allOptions.find(o => o.id === id);
        if (!opt) continue;
        const tag = this.createTag(opt);
        trigger.appendChild(tag);
      }
    }

    // Search input
    this.searchInput = document.createElement('input');
    this.searchInput.className = 'multiselect-search';
    this.searchInput.placeholder = this.selected.size === 0 ? this.placeholder : '';
    this.searchInput.setAttribute('aria-label', 'Search options');
    this.searchInput.style.cssText = 'border:none;outline:none;flex:1;min-width:60px;font-size:14px;';

    this.searchInput.addEventListener('focus', () => this.open());
    this.searchInput.addEventListener('input', (e) => {
      this.searchTerm = e.target.value;
      this.filterOptions();
      this.renderDropdownContent();
    });
    this.searchInput.addEventListener('keydown', (e) => this.handleKeydown(e));

    trigger.appendChild(this.searchInput);

    // Limit indicator
    if (this.maxSelections < Infinity) {
      const counter = document.createElement('span');
      counter.className = 'selection-count';
      counter.style.cssText = 'font-size:12px;color:#666;margin-left:auto;white-space:nowrap;';
      counter.textContent = `${this.selected.size}/${this.maxSelections}`;
      trigger.appendChild(counter);
    }

    trigger.addEventListener('click', () => {
      this.searchInput.focus();
    });

    this.container.appendChild(trigger);
  }

  createTag(option) {
    const tag = document.createElement('span');
    tag.className = 'multiselect-tag';
    tag.style.cssText = `
      display:inline-flex;align-items:center;gap:4px;
      background:#e8f0fe;color:#1a73e8;padding:2px 8px;
      border-radius:16px;font-size:13px;
    `;

    const label = document.createElement('span');
    label.textContent = option.label;
    tag.appendChild(label);

    const remove = document.createElement('button');
    remove.className = 'tag-remove';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Remove ${option.label}`);
    remove.style.cssText = 'border:none;background:none;cursor:pointer;font-size:16px;color:inherit;padding:0;line-height:1;';
    remove.addEventListener('click', (e) => {
      e.stopPropagation();
      this.deselect(option.id);
    });
    tag.appendChild(remove);

    return tag;
  }

  renderDropdown() {
    this.dropdown = document.createElement('div');
    this.dropdown.className = 'multiselect-dropdown';
    this.dropdown.setAttribute('role', 'listbox');
    this.dropdown.setAttribute('aria-multiselectable', 'true');
    this.dropdown.style.cssText = `
      position:absolute;top:100%;left:0;right:0;z-index:1000;
      max-height:300px;overflow-y:auto;background:#fff;
      border:1px solid #ccc;border-radius:8px;margin-top:4px;
      box-shadow:0 4px 12px rgba(0,0,0,0.15);
    `;

    this.renderDropdownContent();
    this.container.appendChild(this.dropdown);
  }

  renderDropdownContent() {
    if (!this.dropdown) return;
    this.dropdown.innerHTML = '';

    if (this.filteredOptions.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'multiselect-empty';
      empty.style.cssText = 'padding:12px;text-align:center;color:#999;';
      empty.textContent = this.searchTerm ? 'No matching options' : 'No options available';
      this.dropdown.appendChild(empty);
      return;
    }

    // Group options
    const groups = this.groupOptions(this.filteredOptions);
    let flatIndex = 0;

    for (const [group, options] of groups) {
      if (group) {
        this.dropdown.appendChild(this.createGroupHeader(group, options));
      }

      for (const opt of options) {
        const item = this.createOptionItem(opt, flatIndex);
        this.dropdown.appendChild(item);
        flatIndex++;
      }
    }
  }

  createGroupHeader(groupName, options) {
    const header = document.createElement('div');
    header.className = 'multiselect-group';
    header.style.cssText = 'display:flex;justify-content:space-between;padding:8px 12px;background:#f5f5f5;font-size:12px;font-weight:600;color:#666;text-transform:uppercase;';

    const label = document.createElement('span');
    label.textContent = groupName;
    header.appendChild(label);

    // Select all / deselect all for this group
    const allSelected = options.every(o => this.selected.has(o.id));
    const toggleBtn = document.createElement('button');
    toggleBtn.style.cssText = 'border:none;background:none;color:#1a73e8;cursor:pointer;font-size:12px;';
    toggleBtn.textContent = allSelected ? 'Deselect all' : 'Select all';
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (allSelected) {
        options.forEach(o => this.selected.delete(o.id));
      } else {
        options.forEach(o => {
          if (this.selected.size < this.maxSelections) this.selected.add(o.id);
        });
      }
      this.emitChange();
      this.render();
    });
    header.appendChild(toggleBtn);

    return header;
  }

  createOptionItem(option, index) {
    const item = document.createElement('div');
    const isSelected = this.selected.has(option.id);
    const isFocused = index === this.focusedIndex;
    const isDisabled = !isSelected && this.selected.size >= this.maxSelections;

    item.className = `multiselect-option ${isSelected ? 'selected' : ''} ${isFocused ? 'focused' : ''} ${isDisabled ? 'disabled' : ''}`;
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', isSelected);
    item.setAttribute('aria-disabled', isDisabled);
    item.style.cssText = `
      padding:10px 12px;cursor:${isDisabled ? 'not-allowed' : 'pointer'};
      display:flex;align-items:center;gap:8px;
      background:${isFocused ? '#f0f0f0' : isSelected ? '#e8f0fe' : '#fff'};
      opacity:${isDisabled ? '0.5' : '1'};
    `;

    // Checkbox indicator
    const check = document.createElement('span');
    check.style.cssText = `
      width:18px;height:18px;border:2px solid ${isSelected ? '#1a73e8' : '#ccc'};
      border-radius:4px;display:flex;align-items:center;justify-content:center;
      background:${isSelected ? '#1a73e8' : 'transparent'};color:#fff;font-size:12px;flex-shrink:0;
    `;
    check.textContent = isSelected ? '✓' : '';
    item.appendChild(check);

    // Label with search highlight
    const labelEl = document.createElement('span');
    labelEl.innerHTML = this.highlightMatch(option.label, this.searchTerm);
    item.appendChild(labelEl);

    if (!isDisabled) {
      item.addEventListener('click', () => this.toggleOption(option.id));
    }

    return item;
  }

  highlightMatch(text, query) {
    if (!query) return this.escapeHtml(text);
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    return this.escapeHtml(text).replace(regex, '<mark style="background:#fde68a;padding:0 1px;">$1</mark>');
  }

  // === Actions ===

  toggleOption(id) {
    if (this.selected.has(id)) {
      this.deselect(id);
    } else {
      this.select(id);
    }
  }

  select(id) {
    if (this.selected.size >= this.maxSelections) return;
    this.selected.add(id);
    this.emitChange();
    this.render();
    this.searchInput?.focus();
  }

  deselect(id) {
    this.selected.delete(id);
    this.emitChange();
    this.render();
    this.searchInput?.focus();
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.focusedIndex = -1;
    this.filterOptions();
    this.render();
  }

  close() {
    this.isOpen = false;
    this.searchTerm = '';
    this.focusedIndex = -1;
    this.filteredOptions = [...this.allOptions];
    this.render();
  }

  // === Keyboard ===

  handleKeydown(e) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.focusedIndex = Math.min(this.focusedIndex + 1, this.filteredOptions.length - 1);
        this.renderDropdownContent();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.focusedIndex = Math.max(this.focusedIndex - 1, 0);
        this.renderDropdownContent();
        break;
      case 'Enter':
        e.preventDefault();
        if (this.focusedIndex >= 0 && this.focusedIndex < this.filteredOptions.length) {
          this.toggleOption(this.filteredOptions[this.focusedIndex].id);
        }
        break;
      case 'Escape':
        this.close();
        break;
      case 'Backspace':
        if (!this.searchTerm && this.selected.size > 0) {
          const last = [...this.selected].pop();
          this.deselect(last);
        }
        break;
    }
  }

  // === Utilities ===

  filterOptions() {
    const term = this.searchTerm.toLowerCase();
    this.filteredOptions = term
      ? this.allOptions.filter(o => o.label.toLowerCase().includes(term))
      : [...this.allOptions];
    this.focusedIndex = -1;
  }

  groupOptions(options) {
    const groups = new Map();
    for (const opt of options) {
      const group = opt.group || '';
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(opt);
    }
    return groups;
  }

  setupClickOutside() {
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target) && this.isOpen) {
        this.close();
      }
    });
  }

  emitChange() {
    this.onChangeCallback([...this.selected]);
  }

  getSelected() {
    return [...this.selected];
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Usage:
// const options = [
//   { id: 'ts', label: 'TypeScript', group: 'Languages' },
//   { id: 'js', label: 'JavaScript', group: 'Languages' },
//   { id: 'react', label: 'React', group: 'Frameworks' },
//   { id: 'angular', label: 'Angular', group: 'Frameworks' },
//   { id: 'vue', label: 'Vue', group: 'Frameworks' },
// ];
// new MultiSelectDropdown(document.getElementById('app'), options, {
//   max: 3,
//   placeholder: 'Select skills...',
//   onChange: (selected) => console.log('Selected:', selected)
// });
```

## 🎯 Key Takeaways
- Flipkart FE consistently asks **compound UI components** — multi-select, autocomplete, filters
- Tag-based selected display with individual removal (Backspace removes last)
- Group headers with select-all/deselect-all toggle per group
- Search highlighting with regex + `<mark>` tag (escape query for safe regex)
- Max selection limit with visual disabled state
- `escapeHtml` before `highlightMatch` prevents XSS — important security detail

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| JS Deep Dive | Hard | Prototypes, Event Loop, Generators |
| Machine Coding | Medium-Hard | DOM, Keyboard Nav, State Management |
| FE System Design | Hard | Search Page Architecture |
| HM | Medium | Behavioral, Product Sense |
