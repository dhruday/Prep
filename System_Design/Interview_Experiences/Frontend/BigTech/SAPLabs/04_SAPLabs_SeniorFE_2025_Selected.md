# SAPLabs — Senior Frontend Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | SAP Labs |
| **Role** | Senior UI Developer |
| **Level** | SDE-2 |
| **YOE** | 5 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/sap-labs-interview-experience/) |
| **Author** | Anonymous |
| **Team** | SAP Fiori |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + Technical + HM)

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Challenge: Build an Enterprise Form Builder with Drag-and-Drop
- Palette of field types (text, number, date, dropdown, checkbox, file upload)
- Drag fields to form canvas to build form
- Reorder fields via drag
- Field configuration panel (label, required, validation rules, placeholder)
- Form preview mode
- Export form schema as JSON
- Import JSON to restore form

```javascript
/**
 * Enterprise Form Builder:
 * - Drag field types from palette to canvas
 * - Configure each field (label, validators, options)
 * - Preview mode with validation
 * - JSON import/export for form schema
 */
class FormBuilder {
  constructor(container) {
    this.container = container;
    this.fields = [];       // [{ id, type, label, required, placeholder, options, validators }]
    this.nextId = 1;
    this.selectedFieldId = null;
    this.previewMode = false;
    this.formValues = {};   // Field values in preview mode
    this.formErrors = {};
    
    this.fieldTypes = [
      { type: 'text', label: 'Text Input', icon: '📝' },
      { type: 'number', label: 'Number Input', icon: '🔢' },
      { type: 'email', label: 'Email Input', icon: '📧' },
      { type: 'date', label: 'Date Picker', icon: '📅' },
      { type: 'select', label: 'Dropdown', icon: '📋' },
      { type: 'checkbox', label: 'Checkbox', icon: '☑️' },
      { type: 'textarea', label: 'Text Area', icon: '📄' },
      { type: 'file', label: 'File Upload', icon: '📎' }
    ];
    
    this.render();
  }
  
  addField(type, index = -1) {
    const fieldType = this.fieldTypes.find(f => f.type === type);
    const field = {
      id: this.nextId++,
      type,
      label: fieldType?.label || type,
      required: false,
      placeholder: '',
      helpText: '',
      options: type === 'select' ? ['Option 1', 'Option 2'] : [],
      validators: [],
      minLength: null,
      maxLength: null,
      min: null,
      max: null,
      accept: type === 'file' ? '.pdf,.doc,.jpg,.png' : null,
      maxFileSize: type === 'file' ? 5 : null // MB
    };
    
    if (index >= 0 && index < this.fields.length) {
      this.fields.splice(index, 0, field);
    } else {
      this.fields.push(field);
    }
    
    this.selectedFieldId = field.id;
    this.render();
  }
  
  removeField(id) {
    this.fields = this.fields.filter(f => f.id !== id);
    if (this.selectedFieldId === id) this.selectedFieldId = null;
    this.render();
  }
  
  moveField(fromIndex, toIndex) {
    const [field] = this.fields.splice(fromIndex, 1);
    this.fields.splice(toIndex, 0, field);
    this.render();
  }
  
  render() {
    this.container.innerHTML = `
      <div class="form-builder" style="display:flex; height:100%">
        <!-- Palette -->
        <aside class="palette" style="width:200px; border-right:1px solid #e5e7eb; padding:12px">
          <h3>Fields</h3>
          ${this.fieldTypes.map(ft => `
            <div class="palette-field" data-type="${ft.type}" draggable="true"
                 aria-label="Drag to add ${ft.label}">
              ${ft.icon} ${ft.label}
            </div>
          `).join('')}
          <hr>
          <button id="toggle-preview">${this.previewMode ? '✏️ Edit' : '👁️ Preview'}</button>
          <button id="export-json">📤 Export</button>
          <button id="import-json">📥 Import</button>
        </aside>
        
        <!-- Canvas -->
        <main class="form-canvas" style="flex:1; padding:20px; overflow:auto"
              aria-label="${this.previewMode ? 'Form preview' : 'Form builder canvas'}">
          ${this.previewMode ? this.renderPreview() : this.renderEditor()}
        </main>
        
        <!-- Config Panel -->
        ${!this.previewMode && this.selectedFieldId ? this.renderConfigPanel() : ''}
      </div>
    `;
    
    this.attachListeners();
  }
  
  renderEditor() {
    if (this.fields.length === 0) {
      return '<div class="empty-state">Drag fields from the palette to build your form</div>';
    }
    
    return `
      <form class="builder-form" onsubmit="return false">
        ${this.fields.map((field, index) => `
          <div class="builder-field ${field.id === this.selectedFieldId ? 'selected' : ''}"
               data-id="${field.id}" data-index="${index}" draggable="true"
               role="listitem">
            <div class="field-handle" title="Drag to reorder">⋮⋮</div>
            <div class="field-preview">
              <label>${this.sanitize(field.label)} ${field.required ? '<span class="required">*</span>' : ''}</label>
              ${this.renderFieldPreview(field)}
            </div>
            <div class="field-actions">
              <button class="btn-select" data-id="${field.id}">⚙️</button>
              <button class="btn-delete" data-id="${field.id}">🗑️</button>
            </div>
          </div>
        `).join('')}
      </form>
    `;
  }
  
  renderFieldPreview(field) {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
        return `<input type="${field.type}" placeholder="${this.sanitize(field.placeholder)}" disabled>`;
      case 'date':
        return `<input type="date" disabled>`;
      case 'textarea':
        return `<textarea placeholder="${this.sanitize(field.placeholder)}" disabled rows="3"></textarea>`;
      case 'select':
        return `<select disabled>
          <option>Select...</option>
          ${field.options.map(o => `<option>${this.sanitize(o)}</option>`).join('')}
        </select>`;
      case 'checkbox':
        return `<label><input type="checkbox" disabled> ${this.sanitize(field.label)}</label>`;
      case 'file':
        return `<input type="file" accept="${this.sanitize(field.accept || '')}" disabled>`;
      default:
        return `<input type="text" disabled>`;
    }
  }
  
  renderPreview() {
    return `
      <form class="preview-form" novalidate>
        <h2>Form Preview</h2>
        ${this.fields.map(field => `
          <div class="form-group ${this.formErrors[field.id] ? 'has-error' : ''}">
            <label for="field-${field.id}">${this.sanitize(field.label)}
              ${field.required ? '<span class="required">*</span>' : ''}
            </label>
            ${field.helpText ? `<p class="help-text">${this.sanitize(field.helpText)}</p>` : ''}
            ${this.renderPreviewField(field)}
            ${this.formErrors[field.id] 
              ? `<span class="error-msg" role="alert">${this.sanitize(this.formErrors[field.id])}</span>` 
              : ''}
          </div>
        `).join('')}
        <button type="submit" class="btn-submit">Submit</button>
      </form>
    `;
  }
  
  renderPreviewField(field) {
    const value = this.formValues[field.id] || '';
    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
        return `<input type="${field.type}" id="field-${field.id}" name="field-${field.id}"
                  value="${this.sanitize(String(value))}"
                  placeholder="${this.sanitize(field.placeholder)}"
                  ${field.required ? 'required' : ''}
                  ${field.minLength ? `minlength="${field.minLength}"` : ''}
                  ${field.maxLength ? `maxlength="${field.maxLength}"` : ''}>`;
      case 'date':
        return `<input type="date" id="field-${field.id}" name="field-${field.id}"
                  value="${this.sanitize(String(value))}" ${field.required ? 'required' : ''}>`;
      case 'textarea':
        return `<textarea id="field-${field.id}" name="field-${field.id}"
                  placeholder="${this.sanitize(field.placeholder)}" rows="4"
                  ${field.required ? 'required' : ''}>${this.sanitize(String(value))}</textarea>`;
      case 'select':
        return `<select id="field-${field.id}" name="field-${field.id}" ${field.required ? 'required' : ''}>
          <option value="">Select...</option>
          ${field.options.map(o => 
            `<option ${value === o ? 'selected' : ''}>${this.sanitize(o)}</option>`
          ).join('')}
        </select>`;
      case 'checkbox':
        return `<input type="checkbox" id="field-${field.id}" name="field-${field.id}"
                  ${value ? 'checked' : ''}>`;
      case 'file':
        return `<input type="file" id="field-${field.id}" name="field-${field.id}"
                  accept="${this.sanitize(field.accept || '')}" ${field.required ? 'required' : ''}>`;
      default:
        return `<input type="text" id="field-${field.id}">`;
    }
  }
  
  renderConfigPanel() {
    const field = this.fields.find(f => f.id === this.selectedFieldId);
    if (!field) return '';
    
    return `
      <aside class="config-panel" style="width:280px; border-left:1px solid #e5e7eb; padding:12px; overflow:auto">
        <h3>Field Configuration</h3>
        
        <div class="config-group">
          <label>Label</label>
          <input type="text" id="cfg-label" value="${this.sanitize(field.label)}">
        </div>
        
        <div class="config-group">
          <label>Placeholder</label>
          <input type="text" id="cfg-placeholder" value="${this.sanitize(field.placeholder)}">
        </div>
        
        <div class="config-group">
          <label>Help Text</label>
          <input type="text" id="cfg-help" value="${this.sanitize(field.helpText)}">
        </div>
        
        <div class="config-group">
          <label><input type="checkbox" id="cfg-required" ${field.required ? 'checked' : ''}> Required</label>
        </div>
        
        ${field.type === 'select' ? `
          <div class="config-group">
            <label>Options (one per line)</label>
            <textarea id="cfg-options" rows="4">${field.options.join('\n')}</textarea>
          </div>
        ` : ''}
        
        ${['text', 'textarea', 'email'].includes(field.type) ? `
          <div class="config-group">
            <label>Min Length</label>
            <input type="number" id="cfg-minlen" value="${field.minLength || ''}">
          </div>
          <div class="config-group">
            <label>Max Length</label>
            <input type="number" id="cfg-maxlen" value="${field.maxLength || ''}">
          </div>
        ` : ''}
      </aside>
    `;
  }
  
  validatePreview() {
    this.formErrors = {};
    let valid = true;
    
    for (const field of this.fields) {
      const value = this.formValues[field.id];
      
      if (field.required && (!value || value === '')) {
        this.formErrors[field.id] = `${field.label} is required`;
        valid = false;
        continue;
      }
      
      if (value && field.minLength && String(value).length < field.minLength) {
        this.formErrors[field.id] = `Minimum ${field.minLength} characters`;
        valid = false;
      }
      
      if (value && field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        this.formErrors[field.id] = 'Invalid email format';
        valid = false;
      }
    }
    
    return valid;
  }
  
  // Export/Import
  exportSchema() {
    return JSON.stringify(this.fields.map(f => {
      const { id, ...rest } = f;
      return rest;
    }), null, 2);
  }
  
  importSchema(json) {
    try {
      const schema = JSON.parse(json);
      if (!Array.isArray(schema)) throw new Error('Invalid schema');
      this.fields = schema.map(f => ({ ...f, id: this.nextId++ }));
      this.selectedFieldId = null;
      this.render();
    } catch (e) {
      alert('Invalid form schema JSON');
    }
  }
  
  attachListeners() {
    // Palette drag
    this.container.querySelectorAll('.palette-field').forEach(el => {
      el.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('field-type', el.dataset.type);
      });
    });
    
    // Canvas drop
    const canvas = this.container.querySelector('.form-canvas');
    canvas.addEventListener('dragover', (e) => e.preventDefault());
    canvas.addEventListener('drop', (e) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('field-type');
      if (type) this.addField(type);
    });
    
    // Field selection
    this.container.querySelectorAll('.btn-select').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedFieldId = Number(btn.dataset.id);
        this.render();
      });
    });
    
    // Field deletion
    this.container.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => this.removeField(Number(btn.dataset.id)));
    });
    
    // Preview toggle
    this.container.querySelector('#toggle-preview')?.addEventListener('click', () => {
      this.previewMode = !this.previewMode;
      this.formValues = {};
      this.formErrors = {};
      this.render();
    });
    
    // Export
    this.container.querySelector('#export-json')?.addEventListener('click', () => {
      const json = this.exportSchema();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'form-schema.json';
      a.click();
      URL.revokeObjectURL(url);
    });
    
    // Import
    this.container.querySelector('#import-json')?.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.addEventListener('change', () => {
        const reader = new FileReader();
        reader.onload = () => this.importSchema(reader.result);
        if (input.files[0]) reader.readAsText(input.files[0]);
      });
      input.click();
    });
    
    // Config panel live updates
    this.attachConfigListeners();
    
    // Preview form submission
    this.container.querySelector('.preview-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.collectPreviewValues();
      if (this.validatePreview()) {
        alert('Form submitted successfully!\n' + JSON.stringify(this.formValues, null, 2));
      } else {
        this.render();
      }
    });
    
    // Preview field change tracking
    this.container.querySelectorAll('.preview-form input, .preview-form select, .preview-form textarea')
      .forEach(el => {
        el.addEventListener('change', () => this.collectPreviewValues());
        el.addEventListener('input', () => this.collectPreviewValues());
      });
  }
  
  collectPreviewValues() {
    for (const field of this.fields) {
      const el = this.container.querySelector(`#field-${field.id}`);
      if (!el) continue;
      if (field.type === 'checkbox') {
        this.formValues[field.id] = el.checked;
      } else {
        this.formValues[field.id] = el.value;
      }
    }
  }
  
  attachConfigListeners() {
    const field = this.fields.find(f => f.id === this.selectedFieldId);
    if (!field) return;
    
    const bind = (id, prop, transform = (v) => v) => {
      const el = this.container.querySelector(id);
      if (!el) return;
      el.addEventListener('input', () => {
        field[prop] = transform(el.type === 'checkbox' ? el.checked : el.value);
        this.render();
      });
    };
    
    bind('#cfg-label', 'label');
    bind('#cfg-placeholder', 'placeholder');
    bind('#cfg-help', 'helpText');
    bind('#cfg-required', 'required');
    bind('#cfg-minlen', 'minLength', v => v ? parseInt(v) : null);
    bind('#cfg-maxlen', 'maxLength', v => v ? parseInt(v) : null);
    
    const optionsEl = this.container.querySelector('#cfg-options');
    if (optionsEl) {
      optionsEl.addEventListener('input', () => {
        field.options = optionsEl.value.split('\n').filter(o => o.trim());
        this.render();
      });
    }
  }
  
  sanitize(str) {
    const div = document.createElement('div');
    div.textContent = String(str ?? '');
    return div.innerHTML;
  }
}
```

---

## 🎯 Key Takeaways
- SAP Labs FE = **Enterprise form builder with drag-drop, config, preview, import/export**
- **Three-panel layout**: palette (drag source) + canvas (drop target) + config (selected field settings)
- **Field schema**: `{ id, type, label, required, placeholder, options, validators, minLength, maxLength }`
- **Preview mode**: toggle between builder and live form — collect values, validate, show errors
- **JSON export**: `Blob` + `URL.createObjectURL` + `<a download>` — clean file download without server
- **JSON import**: `<input type="file">` + `FileReader.readAsText` — load schema from file
- **Config panel binding**: live updates from config inputs to field schema — immediate re-render
- SAP FE = **enterprise UI patterns** — form builders, data grids, configuration panels

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding | Hard | Form Builder, Drag-Drop, Import/Export |
| Technical | Medium-Hard | React, JS Concepts |
| HM | Medium | Culture Fit |
