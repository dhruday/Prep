# Apple — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Apple |
| **Role** | Senior Frontend Engineer |
| **Level** | ICT4 |
| **YOE** | 6 years |
| **Date** | May 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone + 3 Technical + Hiring Manager)
- **Timeline:** 4 weeks
- **Format:** Virtual

## Round 3: Frontend Machine Coding — Accessibility-First Settings Panel

### Problem
Build an iOS-style settings panel:
1. Nested navigation: Settings → Category → Subcategory (push/pop animation)
2. Toggle switches with ARIA labels and keyboard support
3. Slider control for font size with live preview
4. Search bar with real-time filtering across all nested settings
5. Breadcrumb navigation showing current path
6. Haptic-like micro-animation feedback on toggle and interactions
7. High contrast mode toggle that demonstrates a11y compliance

Build with **vanilla JavaScript** only.

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Settings Panel</title>
<style>
:root { --font-size: 14px; --bg: #f2f2f7; --card: #fff; --text: #1c1c1e; --sub: #8e8e93; --accent: #007aff; --border: #c6c6c8; --sep: #e5e5ea; }
[data-contrast="high"] { --bg: #000; --card: #1c1c1e; --text: #fff; --sub: #fff; --accent: #ffcc00; --border: #fff; --sep: #444; }

* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: var(--bg); color: var(--text); font-size: var(--font-size); transition: all 0.3s; max-width: 420px; margin: 0 auto; min-height: 100vh; overflow: hidden; }

/* Header */
.header { padding: 12px 16px; background: var(--bg); position: sticky; top: 0; z-index: 50; }
.breadcrumb { display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--sub); margin-bottom: 8px; }
.breadcrumb a { color: var(--accent); text-decoration: none; cursor: pointer; }
.search-bar { width: 100%; padding: 8px 12px; border: none; background: var(--card); border-radius: 10px; font-size: 14px; color: var(--text); outline: none; }
h1 { font-size: 28px; font-weight: 700; margin: 8px 0; }

/* Navigation */
.nav-container { position: relative; overflow: hidden; }
.nav-page { position: absolute; width: 100%; transition: transform 0.35s cubic-bezier(.25,.1,.25,1), opacity 0.35s; padding: 0 16px 100px; }
.nav-page.active { position: relative; transform: translateX(0); opacity: 1; }
.nav-page.left { transform: translateX(-100%); opacity: 0; }
.nav-page.right { transform: translateX(100%); opacity: 0; }

/* Menu Group */
.menu-group { background: var(--card); border-radius: 10px; margin-bottom: 16px; overflow: hidden; }
.menu-group-title { font-size: 12px; color: var(--sub); text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 16px 4px; background: var(--bg); }
.menu-item { display: flex; align-items: center; gap: 10px; padding: 11px 16px; border-bottom: 1px solid var(--sep); cursor: pointer; transition: background 0.15s; }
.menu-item:last-child { border-bottom: none; }
.menu-item:hover { background: rgba(0,0,0,.03); }
.menu-item:active { background: rgba(0,0,0,.08); }
.menu-icon { width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
.menu-label { flex: 1; font-size: var(--font-size); }
.menu-value { font-size: 13px; color: var(--sub); }
.menu-chevron { color: var(--sub); font-size: 12px; }

/* Toggle */
.toggle { position: relative; width: 50px; height: 30px; flex-shrink: 0; }
.toggle input { display: none; }
.toggle .track { position: absolute; inset: 0; background: #e9e9eb; border-radius: 15px; transition: 0.3s; cursor: pointer; }
.toggle input:checked + .track { background: #34c759; }
[data-contrast="high"] .toggle input:checked + .track { background: var(--accent); }
.toggle .thumb { position: absolute; width: 26px; height: 26px; background: #fff; border-radius: 50%; top: 2px; left: 2px; transition: 0.3s; box-shadow: 0 1px 4px rgba(0,0,0,.2); }
.toggle input:checked ~ .thumb { left: 22px; }
.toggle input:focus-visible + .track { outline: 3px solid var(--accent); outline-offset: 2px; }

/* Slider */
.slider-row { display: flex; align-items: center; gap: 10px; padding: 12px 16px; }
.slider-label { font-size: 11px; color: var(--sub); }
.slider-control { flex: 1; accent-color: var(--accent); }
.slider-value { font-size: 12px; font-weight: 600; min-width: 30px; text-align: center; }

/* Micro animation */
@keyframes tapScale { 0% { transform: scale(1); } 50% { transform: scale(0.96); } 100% { transform: scale(1); } }
.tap-anim { animation: tapScale 0.2s ease; }

/* Search Results */
.search-results { padding: 0 16px; }
.search-item { padding: 10px 14px; background: var(--card); border-radius: 8px; margin-bottom: 4px; cursor: pointer; }
.search-path { font-size: 10px; color: var(--sub); }

/* Hidden for a11y */
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
</style>
</head>
<body>

<div class="header">
  <div class="breadcrumb" id="breadcrumb"></div>
  <h1 id="pageTitle">Settings</h1>
  <input class="search-bar" id="searchBar" placeholder="Search settings..." aria-label="Search settings">
</div>

<div id="searchResults" class="search-results" style="display:none;"></div>
<div class="nav-container" id="navContainer"></div>

<script>
// ============================================================
// SETTINGS DATA TREE
// ============================================================
const settingsTree = {
  id: 'root', label: 'Settings', children: [
    { id: 'display', label: 'Display & Brightness', icon: '☀️', iconBg: '#007aff', children: [
      { id: 'brightness', label: 'Brightness', type: 'slider', min: 0, max: 100, value: 70 },
      { id: 'dark_mode', label: 'Dark Mode', type: 'toggle', value: false },
      { id: 'auto_brightness', label: 'Auto-Brightness', type: 'toggle', value: true },
      { id: 'text_size', label: 'Text Size', type: 'slider', min: 10, max: 24, value: 14, unit: 'px', preview: true }
    ]},
    { id: 'accessibility', label: 'Accessibility', icon: '♿', iconBg: '#007aff', children: [
      { id: 'high_contrast', label: 'High Contrast', type: 'toggle', value: false },
      { id: 'reduce_motion', label: 'Reduce Motion', type: 'toggle', value: false },
      { id: 'bold_text', label: 'Bold Text', type: 'toggle', value: false },
      { id: 'voiceover', label: 'VoiceOver', icon: '🗣', iconBg: '#34c759', children: [
        { id: 'vo_enabled', label: 'VoiceOver', type: 'toggle', value: false },
        { id: 'vo_rate', label: 'Speaking Rate', type: 'slider', min: 1, max: 10, value: 5 }
      ]}
    ]},
    { id: 'sounds', label: 'Sounds & Haptics', icon: '🔊', iconBg: '#ff453a', children: [
      { id: 'volume', label: 'Ringer Volume', type: 'slider', min: 0, max: 100, value: 60 },
      { id: 'keyboard_sounds', label: 'Keyboard Clicks', type: 'toggle', value: true },
      { id: 'lock_sound', label: 'Lock Sound', type: 'toggle', value: true }
    ]},
    { id: 'notifications', label: 'Notifications', icon: '🔔', iconBg: '#ff453a', children: [
      { id: 'show_previews', label: 'Show Previews', type: 'toggle', value: true },
      { id: 'badges', label: 'Badge Notifications', type: 'toggle', value: true }
    ]},
    { id: 'privacy', label: 'Privacy & Security', icon: '🔒', iconBg: '#34c759', children: [
      { id: 'analytics', label: 'Share Analytics', type: 'toggle', value: false },
      { id: 'tracking', label: 'Allow Tracking', type: 'toggle', value: false }
    ]},
    { id: 'general', label: 'General', icon: '⚙️', iconBg: '#8e8e93', children: [
      { id: 'about', label: 'About', type: 'info', value: 'iPhone 16 Pro' },
      { id: 'storage', label: 'Storage', type: 'info', value: '128 GB' }
    ]}
  ]
};

// ============================================================
// STATE
// ============================================================
let navStack = [settingsTree];
let settingValues = {};

// Populate initial values
function initValues(node) {
  if (node.value !== undefined) settingValues[node.id] = node.value;
  if (node.children) node.children.forEach(initValues);
}
initValues(settingsTree);

// ============================================================
// RENDER
// ============================================================
function renderPage() {
  const current = navStack[navStack.length - 1];

  // Breadcrumb
  document.getElementById('breadcrumb').innerHTML = navStack.map((n, i) => {
    if (i === navStack.length - 1) return `<span>${n.label}</span>`;
    return `<a onclick="navigateBack(${i})">${n.label}</a><span>›</span>`;
  }).join('');

  document.getElementById('pageTitle').textContent = current.label;

  const container = document.getElementById('navContainer');

  // Build items
  let html = '<div class="nav-page active"><div class="menu-group">';

  (current.children || []).forEach(item => {
    if (item.children) {
      // Navigation item
      html += `
        <div class="menu-item" onclick="navigateTo('${item.id}')" role="button" tabindex="0" aria-label="Open ${item.label}">
          <div class="menu-icon" style="background:${item.iconBg || '#8e8e93'}">${item.icon || '📁'}</div>
          <div class="menu-label">${item.label}</div>
          <span class="menu-chevron">›</span>
        </div>
      `;
    } else if (item.type === 'toggle') {
      const checked = settingValues[item.id] ? 'checked' : '';
      html += `
        <div class="menu-item">
          <div class="menu-label">${item.label}</div>
          <label class="toggle" aria-label="${item.label}">
            <input type="checkbox" ${checked} data-setting="${item.id}" aria-label="${item.label}">
            <div class="track" role="switch" aria-checked="${!!settingValues[item.id]}"></div>
            <div class="thumb"></div>
          </label>
        </div>
      `;
    } else if (item.type === 'slider') {
      html += `
        <div class="slider-row">
          <span class="slider-label">${item.label}</span>
          <input type="range" class="slider-control" min="${item.min}" max="${item.max}" value="${settingValues[item.id]}" data-setting="${item.id}" data-preview="${!!item.preview}" aria-label="${item.label}">
          <span class="slider-value">${settingValues[item.id]}${item.unit || ''}</span>
        </div>
      `;
    } else if (item.type === 'info') {
      html += `
        <div class="menu-item">
          <div class="menu-label">${item.label}</div>
          <span class="menu-value">${item.value}</span>
        </div>
      `;
    }
  });

  html += '</div></div>';
  container.innerHTML = html;

  // Events
  container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', e => {
      const id = e.target.dataset.setting;
      settingValues[id] = e.target.checked;

      // Micro-animation
      const item = e.target.closest('.menu-item');
      item.classList.add('tap-anim');
      setTimeout(() => item.classList.remove('tap-anim'), 200);

      // Special handlers
      if (id === 'high_contrast') {
        document.documentElement.toggleAttribute('data-contrast', e.target.checked);
      }
    });

    // Keyboard
    cb.addEventListener('keydown', e => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); cb.checked = !cb.checked; cb.dispatchEvent(new Event('change')); }
    });
  });

  container.querySelectorAll('input[type="range"]').forEach(slider => {
    slider.addEventListener('input', e => {
      const val = parseInt(e.target.value, 10);
      const id = e.target.dataset.setting;
      settingValues[id] = val;
      e.target.nextElementSibling.textContent = val + (findSetting(id)?.unit || '');

      // Live preview for text size
      if (e.target.dataset.preview === 'true') {
        document.documentElement.style.setProperty('--font-size', val + 'px');
      }
    });
  });
}

function findSetting(id, node = settingsTree) {
  if (node.id === id) return node;
  for (const child of (node.children || [])) {
    const found = findSetting(id, child);
    if (found) return found;
  }
  return null;
}

function findNode(id, node = settingsTree) {
  if (node.id === id) return node;
  for (const child of (node.children || [])) {
    const found = findNode(id, child);
    if (found) return found;
  }
  return null;
}

// ============================================================
// NAVIGATION
// ============================================================
window.navigateTo = function(id) {
  const node = findNode(id);
  if (!node) return;
  navStack.push(node);
  renderPage();
};

window.navigateBack = function(index) {
  navStack = navStack.slice(0, index + 1);
  renderPage();
};

// ============================================================
// SEARCH
// ============================================================
function flattenSettings(node, path = []) {
  const results = [];
  if (node.type && node.type !== 'info') {
    results.push({ ...node, path: [...path, node.label] });
  }
  (node.children || []).forEach(c => {
    results.push(...flattenSettings(c, [...path, node.label]));
  });
  return results;
}

const allSettings = flattenSettings(settingsTree);

document.getElementById('searchBar').addEventListener('input', e => {
  const q = e.target.value.toLowerCase().trim();
  const resultsEl = document.getElementById('searchResults');
  const navEl = document.getElementById('navContainer');

  if (!q) {
    resultsEl.style.display = 'none';
    navEl.style.display = 'block';
    return;
  }

  const matches = allSettings.filter(s => s.label.toLowerCase().includes(q) || s.path.join(' ').toLowerCase().includes(q));

  resultsEl.style.display = 'block';
  navEl.style.display = 'none';

  resultsEl.innerHTML = matches.length
    ? matches.map(m => `
      <div class="search-item">
        <div>${m.label}</div>
        <div class="search-path">${m.path.join(' › ')}</div>
      </div>
    `).join('')
    : '<div style="padding:20px;text-align:center;color:var(--sub);">No results</div>';
});

// ============================================================
// INIT
// ============================================================
renderPage();
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- **Push/pop navigation**: navStack array, breadcrumb renders clicable links to each level
- **ARIA accessibility**: `role="switch"`, `aria-checked`, `aria-label` on toggles, keyboard support (Space/Enter)
- **Font size live preview**: `document.documentElement.style.setProperty('--font-size', val + 'px')`
- **High contrast mode**: `[data-contrast="high"]` CSS override — inverts colors, yellow accent
- **Micro-animation**: `tapScale` keyframes on toggle change — 0.2s scale bounce feedback
- **Search**: flatten settings tree into array, filter by label+path, show/hide results vs nav container
- **Settings tree**: recursive data structure with type-based rendering (toggle, slider, info, nav)

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | JS, DOM Fundamentals |
| Technical 1 | Medium | CSS Variables, A11y |
| Technical 2 | Hard | Navigation Stack, Tree Search, ARIA |
| Technical 3 | Hard | System Design |
| Hiring Manager | Medium | Apple Design Principles |
