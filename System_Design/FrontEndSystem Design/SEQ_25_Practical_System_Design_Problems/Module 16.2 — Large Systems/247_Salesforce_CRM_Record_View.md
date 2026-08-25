# 247 – Salesforce-Style CRM Record View

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

A CRM Record View is the detailed page for a single entity (Account, Contact, Opportunity, Case) in a customer relationship management system. It features **compact layout headers**, **related lists** (child records), **inline editing**, **activity timeline**, **field-level security**, **record type variations**, and **customizable page layouts**. This is the quintessential Salesforce interview question because it directly maps to the Lightning Experience Record Page. The design challenge is building a flexible, metadata-driven UI that adapts to different record types and user permissions.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Architecture

```
┌───────────────────────────────────────────────────────────┐
│  Record Page — Account: Acme Corp                          │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Record Header (Compact Layout)                        │ │
│  │  [Logo] Acme Corp    Industry: Tech    Rev: $2.5M     │ │
│  │  Owner: John     Stage: Active      Rating: Hot       │ │
│  │  [Edit] [Delete] [Clone] [▼ More Actions]             │ │
│  └──────────────────────────────────────────────────────┘ │
│  ┌────────────────────────┐ ┌──────────────────────────┐ │
│  │  Details Tab            │ │  Activity Tab             │ │
│  │  ┌──────────────────┐  │ │  ┌────────────────────┐  │ │
│  │  │ Account Info      │  │ │  │ Tasks              │  │ │
│  │  │ Name: [Acme Corp] │  │ │  │ - Follow up call   │  │ │
│  │  │ Phone: [555-1234] │  │ │  │ - Send proposal    │  │ │
│  │  │ Website: [acme.co]│  │ │  ├────────────────────┤  │ │
│  │  └──────────────────┘  │ │  │ Events             │  │ │
│  │  ┌──────────────────┐  │ │  │ - Meeting 10am     │  │ │
│  │  │ Related: Contacts │  │ │  ├────────────────────┤  │ │
│  │  │ John Doe  | CTO   │  │ │  │ Email Timeline    │  │ │
│  │  │ Jane Doe  | VP    │  │ │  │ - Sent proposal   │  │ │
│  │  │ [View All]        │  │ │  └────────────────────┘  │ │
│  │  └──────────────────┘  │ │                           │ │
│  └────────────────────────┘ └──────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

### Metadata-Driven Rendering

The key architectural insight: CRM record pages are **not hardcoded**. They're driven by metadata:

```typescript
interface PageLayout {
  objectType: 'Account' | 'Contact' | 'Opportunity';
  recordTypeId: string;
  sections: LayoutSection[];
  relatedLists: RelatedList[];
  actions: Action[];
}

interface LayoutSection {
  label: string;
  columns: 1 | 2;
  fields: LayoutField[];
}

interface LayoutField {
  apiName: string;          // 'Account.Name'
  label: string;
  type: 'text' | 'number' | 'currency' | 'date' | 'picklist' | 'lookup' | 'rich_text';
  required: boolean;
  editable: boolean;       // based on field-level security
  visible: boolean;        // based on field-level security
}
```

```typescript
// Dynamic field renderer
function FieldRenderer({ field, value, mode }: { field: LayoutField; value: any; mode: 'view' | 'edit' }) {
  if (!field.visible) return null;

  if (mode === 'view') {
    switch (field.type) {
      case 'currency': return <span>{formatCurrency(value)}</span>;
      case 'date': return <span>{formatDate(value)}</span>;
      case 'lookup': return <a href={`/record/${value.id}`}>{value.name}</a>;
      default: return <span>{value}</span>;
    }
  }

  // Edit mode
  switch (field.type) {
    case 'picklist': return <Select options={field.picklistValues} value={value} />;
    case 'lookup': return <LookupField objectType={field.lookupType} value={value} />;
    default: return <Input type={field.type} value={value} required={field.required} />;
  }
}
```

### Inline Editing

```typescript
function InlineEditField({ field, value, recordId }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const save = async () => {
    try {
      await api.patch(`/records/${recordId}`, { [field.apiName]: editValue });
      setIsEditing(false);
      // Optimistic: value already updated locally
    } catch {
      setEditValue(value); // revert
      showToast('Save failed', 'error');
    }
  };

  if (!field.editable) return <span>{formatValue(value, field.type)}</span>;

  return isEditing ? (
    <div className="inline-edit">
      <FieldRenderer field={field} value={editValue} mode="edit" onChange={setEditValue} />
      <button onClick={save} aria-label="Save">✓</button>
      <button onClick={() => { setEditValue(value); setIsEditing(false); }} aria-label="Cancel">✕</button>
    </div>
  ) : (
    <button className="inline-edit-trigger" onClick={() => setIsEditing(true)}
            aria-label={`Edit ${field.label}`}>
      {formatValue(value, field.type)} ✏️
    </button>
  );
}
```

### Related Lists (Child Records)

Related lists show child records (Contacts for an Account, Line Items for an Opportunity):

```typescript
interface RelatedList {
  objectType: string;           // 'Contact'
  relationshipName: string;     // 'Contacts'
  columns: string[];            // ['Name', 'Title', 'Email']
  sort: string;                 // 'Name ASC'
  limit: number;                // show first 5, "View All" for full list
  actions: ('new' | 'edit' | 'delete')[];
}
```

### Anti-Patterns

- ❌ Hardcoding field layouts — must be metadata-driven for different record types
- ❌ Loading all related records upfront — lazy load related lists on tab switch
- ❌ No field-level security — must respect user permissions for visibility and editability
- ❌ Full page reload on inline edit — patch single field, update local state
- ❌ No optimistic updates for inline edits — feels sluggish

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Salesforce Lightning Record Page
Salesforce's record page is entirely metadata-driven. Page layouts define which fields appear, in what order, with what permissions. Lightning components render fields dynamically based on field type. Related lists lazy-load on scroll.

### Hruday @ SAP Labs
At SAP, the Object Page pattern in Fiori is the direct equivalent of Salesforce's record page. It has a header (KPIs), sections (field groups), and tabs (related entities). Building Fiori Object Pages with dynamic field rendering is the exact same architecture.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer

*"I'd build a metadata-driven record page. The server provides a page layout descriptor (sections, fields, related lists, actions) based on the record type and user permissions. The frontend renders dynamically — a FieldRenderer component switches on field type (text, currency, date, picklist, lookup) for both view and edit modes.*

*Inline editing: clicking a field enters edit mode for that field only. On save, I PATCH the single field to the API, optimistic update locally, revert on failure. Field-level security controls visibility and editability — if `field.editable` is false, no edit icon appears.*

*Related lists: shown as tables with 5 records and a 'View All' link. Lazy-loaded when the tab becomes visible. Each related list has its own columns and sort defined by the layout metadata.*

*Layout: two-column grid for field sections, tabbed navigation for Details/Activity/Related. Compact header shows key fields at the top (name, stage, amount, owner).*

*At SAP, I built Object Pages with dynamic field rendering following the exact same metadata-driven pattern — the architecture translates directly."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Metadata-Driven Record Page
function RecordPage({ recordId, objectType }: { recordId: string; objectType: string }) {
  const { layout, record, isLoading } = useRecordPage(recordId, objectType);

  if (isLoading) return <RecordPageSkeleton />;

  return (
    <article aria-label={`${objectType} record: ${record.Name}`}>
      <RecordHeader record={record} layout={layout} />
      <Tabs>
        <Tab label="Details">
          {layout.sections.map(section => (
            <FieldSection key={section.label} section={section} record={record} recordId={recordId} />
          ))}
        </Tab>
        <Tab label="Related">
          {layout.relatedLists.map(rl => (
            <RelatedList key={rl.relationshipName} config={rl} parentId={recordId} />
          ))}
        </Tab>
        <Tab label="Activity">
          <ActivityTimeline recordId={recordId} />
        </Tab>
      </Tabs>
    </article>
  );
}

function FieldSection({ section, record, recordId }: { section: LayoutSection; record: any; recordId: string }) {
  return (
    <section aria-label={section.label}>
      <h3>{section.label}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: section.columns === 2 ? '1fr 1fr' : '1fr' }}>
        {section.fields.filter(f => f.visible).map(field => (
          <div key={field.apiName} className="field-row">
            <label>{field.label}</label>
            <InlineEditField field={field} value={record[field.apiName]} recordId={recordId} />
          </div>
        ))}
      </div>
    </section>
  );
}
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"CRM Record = Metadata Layout + Dynamic Field Renderer + Inline Edit + Related Lists."** Page layout from server (sections, fields, permissions). FieldRenderer switches on type (text, currency, picklist, lookup). Inline edit: click → edit mode → PATCH single field → optimistic update. Related lists: lazy-loaded tables with "View All". Field-level security: `visible` and `editable` booleans per field. Think: SAP Object Page = Salesforce Record Page.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** This IS the Salesforce interview question. It tests metadata-driven UI, dynamic rendering, field-level security, inline editing, and enterprise UI patterns — all core to Salesforce Lightning.
**How:** Server provides layout metadata. Frontend renders fields dynamically by type. Inline editing with single-field PATCH. Related lists lazy-loaded. Field-level security controls visibility/editability. Tabbed sections for organization.
**Companies:** **Salesforce (core product — must nail this)**, Microsoft (Dynamics 365 — same pattern), Adobe (less relevant), Cisco (less relevant).
