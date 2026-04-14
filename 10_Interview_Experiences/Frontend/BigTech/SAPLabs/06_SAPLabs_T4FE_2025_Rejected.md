# SAPLabs — Senior Developer Frontend Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | SAP Labs |
| **Role** | Senior Frontend Developer |
| **Level** | T4 (Senior) |
| **YOE** | 5 years |
| **Date** | February 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Technical + Design + Managerial)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 2: Frontend Coding — Enterprise Form Builder

### Problem
Build a dynamic form builder where users can:
1. Add fields: text, number, dropdown, checkbox, date, textarea
2. Configure field properties (label, placeholder, required, validation rules)
3. Drag to reorder fields
4. Live preview (rendered form) beside the builder
5. Export form schema as JSON
6. Import JSON schema to rebuild the form

Build with **vanilla JavaScript** only.

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Form Builder</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', -apple-system, sans-serif; background: #f5f6fa; }

.app { display: flex; height: 100vh; }

/* Sidebar */
.sidebar { width: 220px; background: #2c3e50; padding: 16px; flex-shrink: 0; }
.sidebar h3 { color: #ecf0f1; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
.field-type-btn { display: block; width: 100%; padding: 10px 12px; margin-bottom: 6px; background: #34495e; color: #ecf0f1; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; text-align: left; }
.field-type-btn:hover { background: #3498db; }
.sidebar-actions { margin-top: 20px; border-top: 1px solid #34495e; padding-top: 16px; }
.action-btn { display: block; width: 100%; padding: 8px; margin-bottom: 6px; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 500; }
.btn-export { background: #27ae60; color: #fff; }
.btn-import { background: #2980b9; color: #fff; }

/* Builder panel */
.builder-panel { flex: 1; padding: 20px; overflow-y: auto; }
.builder-panel h2 { font-size: 18px; margin-bottom: 16px; color: #2c3e50; }
.field-list { min-height: 200px; }
.field-card { background: #fff; border: 2px solid #e0e0e0; border-radius: 8px; padding: 12px 16px; margin-bottom: 10px; cursor: grab; transition: box-shadow 0.15s; }
.field-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.field-card.dragging { opacity: 0.5; border-style: dashed; }
.field-card.drag-over { border-color: #3498db; background: #ebf5fb; }
.field-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.field-card-header .field-label { font-weight: 600; font-size: 14px; color: #2c3e50; }
.field-card-header .field-type-badge { font-size: 11px; background: #eee; padding: 2px 8px; border-radius: 10px; color: #666; }
.field-props { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.field-props label { font-size: 12px; color: #777; display: flex; flex-direction: column; gap: 2px; }
.field-props input, .field-props select { padding: 4px 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; }
.field-actions { display: flex; gap: 6px; margin-top: 8px; }
.field-actions button { padding: 4px 10px; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; }
.btn-delete { background: #e74c3c; color: #fff; }
.btn-duplicate { background: #95a5a6; color: #fff; }

/* Preview panel */
.preview-panel { width: 380px; background: #fff; border-left: 1px solid #e0e0e0; padding: 20px; overflow-y: auto; flex-shrink: 0; }
.preview-panel h2 { font-size: 18px; margin-bottom: 16px; color: #2c3e50; }
.preview-field { margin-bottom: 16px; }
.preview-field label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px; color: #333; }
.preview-field .required-mark { color: #e74c3c; margin-left: 2px; }
.preview-field input, .preview-field select, .preview-field textarea { width: 100%; padding: 8px 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; }
.preview-field textarea { min-height: 80px; resize: vertical; }
.preview-submit { display: block; width: 100%; padding: 10px; background: #3498db; color: #fff; border: none; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; margin-top: 12px; }

.empty-state { color: #999; text-align: center; padding: 40px; font-size: 14px; }

/* JSON modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: none; align-items: center; justify-content: center; z-index: 100; }
.modal-overlay.open { display: flex; }
.modal { background: #fff; border-radius: 10px; padding: 20px; width: 500px; max-height: 80vh; overflow-y: auto; }
.modal h3 { margin-bottom: 12px; }
.modal textarea { width: 100%; height: 200px; font-family: monospace; font-size: 12px; padding: 10px; border: 1px solid #ddd; border-radius: 6px; }
.modal-actions { display: flex; gap: 8px; margin-top: 12px; justify-content: flex-end; }
.modal-actions button { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; }
</style>
</head>
<body>
<div class="app">
  <div class="sidebar">
    <h3>Add Fields</h3>
    <div id="fieldTypes"></div>
    <div class="sidebar-actions">
      <button class="action-btn btn-export" id="exportBtn">📤 Export JSON</button>
      <button class="action-btn btn-import" id="importBtn">📥 Import JSON</button>
    </div>
  </div>
  <div class="builder-panel">
    <h2>Form Builder</h2>
    <div class="field-list" id="fieldList"></div>
  </div>
  <div class="preview-panel">
    <h2>Live Preview</h2>
    <div id="preview"></div>
  </div>
</div>

<div class="modal-overlay" id="modal">
  <div class="modal">
    <h3 id="modalTitle">JSON</h3>
    <textarea id="modalJson"></textarea>
    <div class="modal-actions">
      <button id="modalCancel" style="background:#eee;">Cancel</button>
      <button id="modalConfirm" style="background:#3498db;color:#fff;">Confirm</button>
    </div>
  </div>
</div>

<script>
// ============================================================
// FIELD TYPE DEFINITIONS
// ============================================================
const FIELD_TYPES = [
  { type: 'text', label: '📝 Text Input', icon: '📝' },
  { type: 'number', label: '🔢 Number', icon: '🔢' },
  { type: 'email', label: '📧 Email', icon: '📧' },
  { type: 'dropdown', label: '📋 Dropdown', icon: '📋' },
  { type: 'checkbox', label: '☑️ Checkbox', icon: '☑️' },
  { type: 'date', label: '📅 Date', icon: '📅' },
  { type: 'textarea', label: '📄 Text Area', icon: '📄' }
];

// ============================================================
// STATE
// ============================================================
let fields = [
  { id: 'f1', type: 'text', label: 'Full Name', placeholder: 'Enter your name', required: true, options: '' },
  { id: 'f2', type: 'email', label: 'Email', placeholder: 'you@example.com', required: true, options: '' },
  { id: 'f3', type: 'dropdown', label: 'Country', placeholder: '', required: false, options: 'USA,UK,India,Germany,Japan' }
];
let nextId = 4;
let dragIdx = null;

// ============================================================
// RENDER SIDEBAR
// ============================================================
const fieldTypesEl = document.getElementById('fieldTypes');
FIELD_TYPES.forEach(ft => {
  const btn = document.createElement('button');
  btn.className = 'field-type-btn';
  btn.textContent = ft.label;
  btn.addEventListener('click', () => addField(ft.type));
  fieldTypesEl.appendChild(btn);
});

// ============================================================
// ADD FIELD
// ============================================================
function addField(type) {
  const ft = FIELD_TYPES.find(f => f.type === type);
  fields.push({
    id: 'f' + (nextId++),
    type,
    label: ft.label.replace(/^[^\s]+\s/, ''),
    placeholder: '',
    required: false,
    options: type === 'dropdown' ? 'Option 1,Option 2,Option 3' : ''
  });
  render();
}

// ============================================================
// RENDER BUILDER
// ============================================================
const fieldList = document.getElementById('fieldList');

function render() {
  renderBuilder();
  renderPreview();
}

function renderBuilder() {
  fieldList.innerHTML = '';
  if (fields.length === 0) {
    fieldList.innerHTML = '<div class="empty-state">Click a field type to add it here</div>';
    return;
  }

  fields.forEach((field, idx) => {
    const card = document.createElement('div');
    card.className = 'field-card';
    card.draggable = true;
    card.setAttribute('data-idx', idx);

    card.innerHTML = `
      <div class="field-card-header">
        <span class="field-label">${escHtml(field.label)}</span>
        <span class="field-type-badge">${field.type}</span>
      </div>
      <div class="field-props">
        <label>Label<input type="text" data-prop="label" value="${escAttr(field.label)}"></label>
        <label>Placeholder<input type="text" data-prop="placeholder" value="${escAttr(field.placeholder)}"></label>
        <label>Required<select data-prop="required">
          <option value="true" ${field.required ? 'selected' : ''}>Yes</option>
          <option value="false" ${!field.required ? 'selected' : ''}>No</option>
        </select></label>
        ${field.type === 'dropdown' ? `<label>Options (comma-sep)<input type="text" data-prop="options" value="${escAttr(field.options)}"></label>` : ''}
      </div>
      <div class="field-actions">
        <button class="btn-duplicate">Duplicate</button>
        <button class="btn-delete">Delete</button>
      </div>
    `;

    // Property change handlers
    card.querySelectorAll('[data-prop]').forEach(input => {
      input.addEventListener('input', () => {
        const prop = input.getAttribute('data-prop');
        field[prop] = prop === 'required' ? input.value === 'true' : input.value;
        renderPreview();
        // Update header label
        const headerLabel = card.querySelector('.field-label');
        if (prop === 'label' && headerLabel) headerLabel.textContent = field.label;
      });
    });

    // Duplicate
    card.querySelector('.btn-duplicate').addEventListener('click', () => {
      fields.splice(idx + 1, 0, { ...field, id: 'f' + (nextId++) });
      render();
    });

    // Delete
    card.querySelector('.btn-delete').addEventListener('click', () => {
      fields.splice(idx, 1);
      render();
    });

    // Drag events
    card.addEventListener('dragstart', () => { dragIdx = idx; card.classList.add('dragging'); });
    card.addEventListener('dragend', () => { card.classList.remove('dragging'); dragIdx = null; });
    card.addEventListener('dragover', (e) => { e.preventDefault(); card.classList.add('drag-over'); });
    card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drag-over');
      if (dragIdx === null || dragIdx === idx) return;
      const [moved] = fields.splice(dragIdx, 1);
      fields.splice(idx, 0, moved);
      render();
    });

    fieldList.appendChild(card);
  });
}

// ============================================================
// RENDER PREVIEW
// ============================================================
const preview = document.getElementById('preview');

function renderPreview() {
  preview.innerHTML = '';
  if (fields.length === 0) {
    preview.innerHTML = '<div class="empty-state">No fields added yet</div>';
    return;
  }

  const form = document.createElement('form');
  form.addEventListener('submit', (e) => { e.preventDefault(); alert('Form submitted!'); });

  fields.forEach(field => {
    const wrapper = document.createElement('div');
    wrapper.className = 'preview-field';

    const label = document.createElement('label');
    label.textContent = field.label;
    if (field.required) {
      const req = document.createElement('span');
      req.className = 'required-mark';
      req.textContent = '*';
      label.appendChild(req);
    }
    wrapper.appendChild(label);

    let input;
    switch (field.type) {
      case 'text': case 'email': case 'number': case 'date':
        input = document.createElement('input');
        input.type = field.type;
        input.placeholder = field.placeholder;
        input.required = field.required;
        break;
      case 'textarea':
        input = document.createElement('textarea');
        input.placeholder = field.placeholder;
        input.required = field.required;
        break;
      case 'dropdown':
        input = document.createElement('select');
        const defOpt = document.createElement('option');
        defOpt.value = '';
        defOpt.textContent = field.placeholder || 'Select...';
        input.appendChild(defOpt);
        field.options.split(',').filter(Boolean).forEach(opt => {
          const o = document.createElement('option');
          o.value = opt.trim();
          o.textContent = opt.trim();
          input.appendChild(o);
        });
        break;
      case 'checkbox':
        const checkWrap = document.createElement('label');
        checkWrap.style.cssText = 'display:flex;align-items:center;gap:8px;font-weight:normal;';
        input = document.createElement('input');
        input.type = 'checkbox';
        input.style.width = 'auto';
        checkWrap.appendChild(input);
        checkWrap.appendChild(document.createTextNode(field.placeholder || field.label));
        wrapper.appendChild(checkWrap);
        form.appendChild(wrapper);
        return;
    }

    wrapper.appendChild(input);
    form.appendChild(wrapper);
  });

  const submit = document.createElement('button');
  submit.className = 'preview-submit';
  submit.textContent = 'Submit';
  form.appendChild(submit);
  preview.appendChild(form);
}

// ============================================================
// EXPORT / IMPORT
// ============================================================
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalJson = document.getElementById('modalJson');
const modalConfirm = document.getElementById('modalConfirm');
const modalCancel = document.getElementById('modalCancel');
let modalMode = 'export';

document.getElementById('exportBtn').addEventListener('click', () => {
  modalMode = 'export';
  modalTitle.textContent = 'Export Form Schema';
  modalJson.value = JSON.stringify(fields, null, 2);
  modalJson.readOnly = true;
  modalConfirm.textContent = 'Copy to Clipboard';
  modal.classList.add('open');
});

document.getElementById('importBtn').addEventListener('click', () => {
  modalMode = 'import';
  modalTitle.textContent = 'Import Form Schema';
  modalJson.value = '';
  modalJson.readOnly = false;
  modalConfirm.textContent = 'Import';
  modal.classList.add('open');
  modalJson.focus();
});

modalConfirm.addEventListener('click', () => {
  if (modalMode === 'export') {
    navigator.clipboard.writeText(modalJson.value).then(() => alert('Copied!'));
  } else {
    try {
      const imported = JSON.parse(modalJson.value);
      if (!Array.isArray(imported)) throw new Error('Must be an array');
      fields = imported.map((f, i) => ({
        id: f.id || 'f' + (nextId++),
        type: f.type || 'text',
        label: f.label || 'Field ' + (i+1),
        placeholder: f.placeholder || '',
        required: !!f.required,
        options: f.options || ''
      }));
      render();
    } catch (e) {
      alert('Invalid JSON: ' + e.message);
      return;
    }
  }
  modal.classList.remove('open');
});

modalCancel.addEventListener('click', () => modal.classList.remove('open'));
modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });

// ============================================================
// HELPERS
// ============================================================
function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function escAttr(s) { return s.replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

// Initial render
render();
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- SAP Labs FE interviews test **enterprise UI tooling** — form builders are common
- Two-panel layout: builder (left) + live preview (right) — immediate visual feedback
- **Drag-and-drop reorder** using HTML5 DnD: `dragstart`, `dragover`, `drop`
- Property editing in-place with live preview sync — not a modal per field
- JSON schema export/import enables programmatic form generation
- escHtml/escAttr helpers prevent **XSS** in user-provided labels
- Field duplication: `{ ...field, id: newId }` spread clone with new identifier
- Checkbox rendering path differs from other inputs (inline label)

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Arrays, Strings |
| Technical | Hard | Form Builder, Drag & Drop, Schema Design |
| Design | Medium-Hard | Design System, Component Library |
| Managerial | Medium | Leadership, SAPUI5 Knowledge |
