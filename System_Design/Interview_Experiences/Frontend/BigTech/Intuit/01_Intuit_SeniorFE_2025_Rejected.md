# Intuit — Senior Frontend Engineer Interview Experience (2025) — #1

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Intuit |
| **Role** | Senior Frontend Engineer |
| **Level** | Staff IC |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/intuit-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Craft Demo + 2 Technical + System Design + HM)
- **Rejection Reason:** System Design — didn't cover undo/redo for form builder

---

## Round 1: Craft Demo
**Duration:** 60 minutes

### Questions Asked
1. **Present a past project with significant frontend complexity**
2. **Deep dive into architecture decisions, trade-offs, performance**

### 💡 What to Prepare
- Component architecture (feature-sliced or atomic design)
- State management strategy (why Redux vs Zustand vs Context)
- Performance: bundle size, lazy loading, memo patterns
- Testing pyramid: unit → integration → E2E
- Accessibility: automated testing (axe-core) + manual audits
- CI/CD: build times, deploy strategy, feature flags
- **Metrics**: LCP, FID, CLS improvements with numbers

---

## Round 2: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Dynamic Form Builder (like TurboTax form)**
   - Drag fields from a palette (text, number, dropdown, checkbox, date)
   - Configure validation rules per field
   - Conditional visibility (show field B if field A = "yes")
   - Live preview of the form

### 💡 Interview-Ready Answer

```jsx
// Form builder with conditional logic
const FIELD_TYPES = {
  TEXT: 'text', NUMBER: 'number', DROPDOWN: 'dropdown',
  CHECKBOX: 'checkbox', DATE: 'date', EMAIL: 'email',
};

function useFormBuilder() {
  const [fields, setFields] = useState([]);
  
  const addField = (type) => {
    const newField = {
      id: crypto.randomUUID(),
      type,
      label: `New ${type} field`,
      placeholder: '',
      required: false,
      validation: {}, // { minLength, maxLength, pattern, min, max }
      options: type === 'dropdown' ? ['Option 1', 'Option 2'] : undefined,
      conditionalOn: null, // { fieldId, operator, value }
    };
    setFields(prev => [...prev, newField]);
  };
  
  const updateField = (fieldId, updates) => {
    setFields(prev => prev.map(f => f.id === fieldId ? { ...f, ...updates } : f));
  };
  
  const removeField = (fieldId) => {
    setFields(prev => prev.filter(f => f.id !== fieldId));
  };
  
  // Reorder via drag-and-drop
  const reorderFields = (fromIndex, toIndex) => {
    setFields(prev => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  };
  
  return { fields, addField, updateField, removeField, reorderFields };
}

function FormBuilder() {
  const { fields, addField, updateField, removeField, reorderFields } = useFormBuilder();
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  
  return (
    <div className="form-builder">
      {/* Field Palette */}
      <aside className="palette" role="toolbar" aria-label="Form fields">
        {Object.entries(FIELD_TYPES).map(([key, type]) => (
          <button
            key={key}
            onClick={() => addField(type)}
            className="palette-item"
            aria-label={`Add ${type} field`}
            draggable
          >
            {type}
          </button>
        ))}
      </aside>
      
      {/* Canvas */}
      <main className="canvas" aria-label="Form canvas">
        <div className="toolbar">
          <button onClick={() => setPreviewMode(!previewMode)}>
            {previewMode ? 'Edit' : 'Preview'}
          </button>
        </div>
        
        {previewMode ? (
          <FormPreview fields={fields} />
        ) : (
          <div className="field-list" role="list">
            {fields.map((field, index) => (
              <FieldEditor
                key={field.id}
                field={field}
                isSelected={field.id === selectedFieldId}
                onSelect={() => setSelectedFieldId(field.id)}
                onUpdate={(updates) => updateField(field.id, updates)}
                onRemove={() => removeField(field.id)}
                onDragStart={(e) => e.dataTransfer.setData('text/plain', index)}
                onDrop={(e) => {
                  const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                  reorderFields(fromIndex, index);
                }}
              />
            ))}
          </div>
        )}
      </main>
      
      {/* Properties Panel */}
      {selectedFieldId && (
        <aside className="properties" aria-label="Field properties">
          <FieldProperties
            field={fields.find(f => f.id === selectedFieldId)}
            allFields={fields}
            onUpdate={(updates) => updateField(selectedFieldId, updates)}
          />
        </aside>
      )}
    </div>
  );
}

function FormPreview({ fields }) {
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  
  // Evaluate conditional visibility
  const isFieldVisible = (field) => {
    if (!field.conditionalOn) return true;
    
    const { fieldId, operator, value } = field.conditionalOn;
    const fieldValue = values[fieldId];
    
    switch (operator) {
      case 'equals': return fieldValue === value;
      case 'notEquals': return fieldValue !== value;
      case 'contains': return String(fieldValue).includes(value);
      case 'greaterThan': return Number(fieldValue) > Number(value);
      case 'isEmpty': return !fieldValue;
      default: return true;
    }
  };
  
  const validate = (field, value) => {
    const errs = [];
    const { validation } = field;
    
    if (field.required && !value) errs.push('Required');
    if (validation.minLength && value.length < validation.minLength) {
      errs.push(`Min ${validation.minLength} characters`);
    }
    if (validation.maxLength && value.length > validation.maxLength) {
      errs.push(`Max ${validation.maxLength} characters`);
    }
    if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
      errs.push('Invalid format');
    }
    if (field.type === 'number') {
      const num = Number(value);
      if (validation.min !== undefined && num < validation.min) errs.push(`Min value ${validation.min}`);
      if (validation.max !== undefined && num > validation.max) errs.push(`Max value ${validation.max}`);
    }
    if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errs.push('Invalid email');
    }
    
    return errs;
  };
  
  const handleChange = (fieldId, value) => {
    setValues(prev => ({ ...prev, [fieldId]: value }));
    const field = fields.find(f => f.id === fieldId);
    const errs = validate(field, value);
    setErrors(prev => ({ ...prev, [fieldId]: errs }));
  };
  
  return (
    <form className="form-preview" onSubmit={e => e.preventDefault()} noValidate>
      {fields.filter(isFieldVisible).map(field => (
        <div key={field.id} className="form-field">
          <label htmlFor={field.id}>
            {field.label}
            {field.required && <span className="required" aria-hidden="true">*</span>}
          </label>
          
          <FormInput
            field={field}
            value={values[field.id] || ''}
            onChange={(val) => handleChange(field.id, val)}
            error={errors[field.id]}
          />
          
          {errors[field.id]?.length > 0 && (
            <div className="error" role="alert" id={`${field.id}-error`}>
              {errors[field.id].join(', ')}
            </div>
          )}
        </div>
      ))}
      
      <button type="submit">Submit</button>
    </form>
  );
}
```

---

## 🎯 Key Takeaways
- Intuit FE = **Craft Demo is unique** — prepare a polished project presentation
- **Dynamic Form Builder**: drag-and-drop, conditional visibility, validation rules
- **Conditional logic**: if field A = "yes" → show field B (operator-based evaluation)
- **Field validation**: required, minLength, maxLength, pattern, min/max for numbers
- Intuit rejected because **undo/redo for form builder** wasn't covered — should have used Command pattern or state snapshots
- Intuit values: **Customer obsessed**, design for delight, data-driven decisions
- Know **TurboTax flow**: multi-step form wizard with branching logic based on tax situation

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Craft Demo | Medium | Project Presentation, Architecture |
| Machine Coding | Hard | Form Builder, Drag & Drop, Conditional Logic |
| JavaScript | Medium | Closures, Promises, Event Loop |
| System Design | Hard | Form Wizard at Scale, Undo/Redo |
| HM | Medium | Behavioral, Values |
