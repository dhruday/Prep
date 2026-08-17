# 488 — Config-Driven UI: JSON Schema → Dynamic Form Renderer Architecture

────────────────────────────────────────────────────────────────────────

## 1. High-Level Explanation

Config-Driven UI (also called Schema-Driven UI or Metadata-Driven UI) is an architecture where
**the UI structure, validation rules, and behavior are defined in a declarative JSON/YAML
configuration** rather than being hard-coded in component trees. A generic renderer reads this
config at runtime and produces the appropriate form fields, layouts, and validation logic.

```
Traditional (Imperative)              Config-Driven (Declarative)
─────────────────────────             ──────────────────────────
<form>                                {
  <TextInput name="email"/>             "fields": [
  <Select name="role"/>                   { "type": "email", "name": "email" },
  <DatePicker name="dob"/>                { "type": "select", "name": "role" },
  {showAddress && <Address/>}             { "type": "date", "name": "dob" },
</form>                                   { "type": "group", "name": "address",
                                            "visible": { "when": "needsAddress", "eq": true }}
                                        ]
                                      }
```

**Why does this matter at scale?**

| Concern | Hard-Coded Forms | Config-Driven |
|---|---|---|
| Adding a new field | Code change + deploy | Config update (CMS / API) |
| A/B testing form variants | Feature flags in code | Swap JSON payload |
| Multi-tenant customization | Fork components | Tenant-specific configs |
| Non-dev form authoring | Not possible | Visual form builder → JSON |
| Consistency across platforms | Rewrite per platform | Share schema, render per platform |
| Validation drift (FE ↔ BE) | Often diverges | Single source of truth |

**Who uses this?**

- **Salesforce Dynamic Forms** — metadata-driven Lightning pages
- **SAP Fiori Smart Forms / Smart Fields** — OData annotations → auto-generated forms
- **Retool / Appsmith** — low-code builders backed by JSON schemas
- **AWS Amplify Forms** — GraphQL schema → form generation

— Hruday @ SAP Labs: "At SAP, we render hundreds of forms across Fiori apps from OData
metadata annotations. The Smart Field + Smart Form pattern is the backbone of our enterprise
UI — no developer hand-codes a customer form."

────────────────────────────────────────────────────────────────────────

## 2. Deep-Dive Explanation (Senior / Staff Level)

### A. Architecture Overview — End-to-End Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      CONFIG-DRIVEN UI ARCHITECTURE                      │
└─────────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐      ┌──────────────┐      ┌──────────────────────┐
  │ Form Builder │      │   Backend    │      │   Config Store       │
  │ (Visual UI)  │─────→│   API /CMS   │─────→│ (DB / S3 / Redis)    │
  └──────────────┘      └──────┬───────┘      └──────────────────────┘
                               │
                    GET /api/forms/:id
                               │
                               ▼
  ┌──────────────────────────────────────────────────────────────────┐
  │                        FRONTEND                                   │
  │                                                                   │
  │  ┌──────────────┐    ┌──────────────┐    ┌───────────────────┐   │
  │  │ Schema Fetch  │───→│ Schema Parser│───→│  Validation Gen   │   │
  │  │ (React Query) │    │ + Normalizer │    │  (Zod from schema)│   │
  │  └──────────────┘    └──────┬───────┘    └────────┬──────────┘   │
  │                             │                      │              │
  │                             ▼                      ▼              │
  │                   ┌──────────────────────────────────┐            │
  │                   │       FormRenderer Component      │            │
  │                   │  ┌────────────────────────────┐  │            │
  │                   │  │     Field Registry          │  │            │
  │                   │  │  "text"    → TextInput      │  │            │
  │                   │  │  "select"  → SelectField    │  │            │
  │                   │  │  "date"    → DatePicker     │  │            │
  │                   │  │  "group"   → FieldGroup     │  │            │
  │                   │  │  "custom"  → lazy(() =>...) │  │            │
  │                   │  └────────────────────────────┘  │            │
  │                   │                                   │            │
  │                   │  ┌────────────────────────────┐  │            │
  │                   │  │   Conditional Visibility    │  │            │
  │                   │  │   Engine (rule evaluator)   │  │            │
  │                   │  └────────────────────────────┘  │            │
  │                   │                                   │            │
  │                   │  ┌────────────────────────────┐  │            │
  │                   │  │    Layout Engine            │  │            │
  │                   │  │  (grid / flex / sections)   │  │            │
  │                   │  └────────────────────────────┘  │            │
  │                   └──────────────────────────────────┘            │
  │                                                                   │
  │  ┌──────────────┐    ┌──────────────┐    ┌───────────────────┐   │
  │  │ Form State   │    │  Submit      │    │  Analytics /      │   │
  │  │ (react-hook- │    │  Handler     │    │  Telemetry        │   │
  │  │  form / Zustand)  │  (API call)  │    │  (field interact) │   │
  │  └──────────────┘    └──────────────┘    └───────────────────┘   │
  └──────────────────────────────────────────────────────────────────┘
```

### B. JSON Schema — The Contract

The schema is the single source of truth. Every field, rule, and layout instruction
must be expressible in this contract.

```json
{
  "id": "employee-onboarding",
  "version": "2.3.0",
  "title": "Employee Onboarding Form",
  "layout": {
    "type": "sections",
    "columns": 2
  },
  "fields": [
    {
      "name": "firstName",
      "type": "text",
      "label": "First Name",
      "placeholder": "Enter first name",
      "validation": {
        "required": true,
        "minLength": 2,
        "maxLength": 50
      },
      "section": "personal"
    },
    {
      "name": "email",
      "type": "email",
      "label": "Work Email",
      "validation": {
        "required": true,
        "pattern": "^[\\w.+-]+@company\\.com$",
        "patternMessage": "Must be a @company.com email"
      },
      "section": "personal"
    },
    {
      "name": "role",
      "type": "select",
      "label": "Role",
      "options": [
        { "label": "Engineer", "value": "eng" },
        { "label": "Designer", "value": "design" },
        { "label": "Manager", "value": "mgr" }
      ],
      "validation": { "required": true },
      "section": "work"
    },
    {
      "name": "teamSize",
      "type": "number",
      "label": "Team Size",
      "validation": { "min": 1, "max": 200 },
      "section": "work",
      "visible": {
        "when": "role",
        "eq": "mgr"
      }
    },
    {
      "name": "startDate",
      "type": "date",
      "label": "Start Date",
      "defaultValue": "today",
      "validation": {
        "required": true,
        "minDate": "today"
      },
      "section": "work"
    },
    {
      "name": "bio",
      "type": "textarea",
      "label": "Short Bio",
      "validation": { "maxLength": 500 },
      "section": "personal"
    }
  ],
  "sections": [
    { "id": "personal", "title": "Personal Information", "column": 1 },
    { "id": "work", "title": "Work Details", "column": 2 }
  ],
  "submitConfig": {
    "method": "POST",
    "url": "/api/employees",
    "successMessage": "Employee onboarded successfully!",
    "redirectTo": "/dashboard"
  }
}
```

### C. TypeScript Schema Types

```typescript
// ───── Core Field Types ─────

type FieldType =
  | 'text' | 'email' | 'password' | 'number' | 'textarea'
  | 'select' | 'multi-select' | 'radio' | 'checkbox'
  | 'date' | 'date-range' | 'file'
  | 'group' | 'array'
  | 'custom';

interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

// ───── Validation Rules ─────

interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
  minDate?: string | 'today';
  maxDate?: string | 'today';
  custom?: string;           // name of a registered custom validator
}

// ───── Conditional Visibility ─────

interface VisibilityRule {
  when: string;              // field name to watch
  eq?: unknown;              // equals
  neq?: unknown;             // not equals
  in?: unknown[];            // value in array
  gt?: number;               // greater than
  lt?: number;               // less than
  isEmpty?: boolean;         // field is empty
  and?: VisibilityRule[];    // all must match
  or?: VisibilityRule[];     // any must match
}

// ───── Field Definition ─────

interface FieldConfig {
  name: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  defaultValue?: unknown;
  helpText?: string;
  disabled?: boolean;
  readOnly?: boolean;
  options?: SelectOption[];         // for select, radio, checkbox
  validation?: ValidationRule;
  visible?: VisibilityRule;
  section?: string;
  fields?: FieldConfig[];           // for 'group' and 'array' types
  customComponent?: string;         // for 'custom' type
  props?: Record<string, unknown>;  // pass-through props for custom fields
}

// ───── Layout ─────

interface SectionConfig {
  id: string;
  title: string;
  description?: string;
  column?: number;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

interface LayoutConfig {
  type: 'single' | 'sections' | 'tabs' | 'wizard';
  columns?: number;
}

// ───── Form Schema ─────

interface FormSchema {
  id: string;
  version: string;
  title: string;
  description?: string;
  layout: LayoutConfig;
  fields: FieldConfig[];
  sections?: SectionConfig[];
  submitConfig: {
    method: 'POST' | 'PUT' | 'PATCH';
    url: string;
    headers?: Record<string, string>;
    successMessage?: string;
    redirectTo?: string;
  };
}
```

### D. Field Registry Pattern

The registry decouples schema types from React component implementations, enabling
lazy-loading, plugin extensibility, and per-tenant overrides.

```
FIELD REGISTRY — LOOKUP FLOW
─────────────────────────────

FormRenderer processes field config:
  { "type": "select", "name": "role", ... }
        │
        ▼
  registry.get("select")
        │
        ▼
  ┌────────────────────────────────┐
  │         Field Registry          │
  │                                 │
  │  "text"       → TextInput       │
  │  "email"      → TextInput       │  (reuse with type="email")
  │  "password"   → PasswordInput   │
  │  "number"     → NumberInput     │
  │  "textarea"   → TextAreaInput   │
  │  "select"     → SelectField    ◄── matched!
  │  "multi-select"→ MultiSelect    │
  │  "radio"      → RadioGroup     │
  │  "checkbox"   → CheckboxField  │
  │  "date"       → DatePicker     │
  │  "date-range" → DateRangePicker│
  │  "file"       → FileUpload     │
  │  "group"      → FieldGroup     │  (recursive rendering)
  │  "array"      → ArrayField     │  (add/remove rows)
  │  "custom"     → lazy(() => ...) │  (code-split custom fields)
  └────────────────────────────────┘
        │
        ▼
  <SelectField
    name="role"
    label="Role"
    options={[...]}
    validation={...}
  />
```

### E. Zod Validation Generation from Schema

Instead of hand-writing Zod schemas, we generate them at runtime from the JSON config:

```
JSON Validation Config                     Generated Zod Schema
───────────────────                        ────────────────────
{                                          z.object({
  "required": true,          ───→            email: z.string()
  "pattern": "^[\\w]+@co\\.com$"               .min(1, "Required")
}                                                .regex(/^[\w]+@co\.com$/)
                                           })
```

### F. Conditional Visibility — Rule Engine

```
RULE EVALUATION FLOW
────────────────────

Form Values:  { role: "mgr", teamSize: 5 }

Field "teamSize" config:
  visible: { when: "role", eq: "mgr" }

Step 1:  Watch field "role" value  → "mgr"
Step 2:  Evaluate: "mgr" === "mgr" → true
Step 3:  Render teamSize field     → VISIBLE

Field "managerTraining" config:
  visible: {
    and: [
      { when: "role", eq: "mgr" },
      { when: "teamSize", gt: 10 }
    ]
  }

Step 1:  "role" === "mgr"    → true
Step 2:  "teamSize" > 10     → false (5 > 10 = false)
Step 3:  AND(true, false)    → false
Step 4:  managerTraining     → HIDDEN (also excluded from submission)
```

### G. Hard-Coded vs Config-Driven — Full Comparison

```
DIMENSION COMPARISON
────────────────────

                    Hard-Coded              Config-Driven
                    ──────────              ─────────────
Flexibility         Low — every change      High — update JSON,
                    requires a code          no redeploy
                    change + deploy

Performance         Optimal — tree-shaken,  Slight overhead from
                    statically compiled      runtime parsing +
                                            registry lookup

Type Safety         Full compile-time        Runtime validation
                    checking                 (mitigated with Zod)

Developer UX        Familiar JSX             Learning curve for
                                            schema authoring

Testing             Unit test components     Test renderer + schema
                    directly                 fixtures separately

Bundle Size         Only what's imported     May load all field
                    (tree-shaking)           components (mitigated
                                            with lazy loading)

Non-Dev Authoring   Not possible             Form builder UI →
                                            drag-and-drop → JSON

Multi-Tenant        Fork or feature flags    Tenant config per
                                            environment

Accessibility       Per-component control    Centralized a11y in
                                            registry components

WHEN TO USE WHICH:
  ✓ Config-Driven:  Admin panels, CRM forms, multi-tenant SaaS,
                    forms that change frequently, low-code platforms
  ✓ Hard-Coded:     Marketing landing pages, highly custom UX,
                    one-off interactions, performance-critical views
```

────────────────────────────────────────────────────────────────────────

## 3. Real-World Examples

### Salesforce Dynamic Forms

Salesforce Lightning uses metadata-driven pages where admins drag fields from the
"Field" panel onto record pages. Under the hood, each field is defined by its
object metadata (field type, picklist values, validation rules, page layout assignments).
The Lightning runtime reads this metadata and renders the correct `lightning-input-field`
variant — no developer writes JSX for individual fields.

```
Salesforce Architecture:
  Object Metadata (Apex describe) → Lightning Data Service → Dynamic Form Component
  Admin changes field visibility → Metadata API update → Page re-renders dynamically
```

### SAP Fiori Smart Forms / Smart Fields

At SAP, Fiori elements and Smart Controls consume OData V4 annotations to auto-render forms:

```
SAP Fiori Flow:
  OData $metadata + Annotations → SmartForm/SmartField → SAPUI5 controls
  Annotation example:
    <Annotation Term="UI.FieldGroup" Qualifier="General">
      <Record>
        <PropertyValue Property="Data">
          <Collection>
            <Record Type="UI.DataField">
              <PropertyValue Property="Value" Path="EmployeeName"/>
            </Record>
          </Collection>
        </PropertyValue>
      </Record>
    </Annotation>
```

— Hruday @ SAP Labs: "The annotation-driven approach in Fiori means backend teams can
influence UI rendering by enriching OData annotations. Frontend doesn't need to redeploy
when a new field is added to the entity — SmartForm picks it up from metadata automatically."

### Google Forms / Typeform Internal Architecture

Both use a JSON schema per form (questions array + settings). The renderer walks the schema,
produces the correct input widget, chains validations, and handles conditional sections
(e.g., "Go to section X if answer is Y").

────────────────────────────────────────────────────────────────────────

## 4. Interview Answer (2 min)

"Config-Driven UI is an architecture where the form structure — fields, types, validations,
layout, and conditional logic — is declared in a JSON schema rather than hard-coded in JSX.
A generic `FormRenderer` component reads this schema at runtime, looks up field components
from a registry, generates Zod validation dynamically, and evaluates visibility rules.

The key pieces are:
1. **Schema contract** — a typed JSON structure defining every field's type, label,
   validation, and visibility conditions.
2. **Field Registry** — a map from field type strings to React components, supporting
   lazy loading and per-tenant overrides.
3. **Validation generation** — converting the schema's validation rules into a Zod schema
   at runtime, so we get the same type-safe parsing as hand-written validators.
4. **Conditional visibility engine** — a rule evaluator that watches form values and
   shows/hides fields based on `when/eq/gt/in/and/or` predicates.

This is how Salesforce Dynamic Forms and SAP Fiori Smart Forms work at scale — admins
or backend teams define field metadata, and the frontend auto-renders without redeploy.
The trade-off vs hard-coded forms is a slight runtime overhead and reduced compile-time
type safety, but the gains in flexibility, multi-tenancy, and non-developer authoring
are enormous for enterprise applications."

────────────────────────────────────────────────────────────────────────

## 5. Code — Full TypeScript / React Implementation

### 5A. Field Registry

```typescript
import { ComponentType, lazy } from 'react';

// Props every field component receives
interface FieldComponentProps {
  name: string;
  label: string;
  placeholder?: string;
  helpText?: string;
  disabled?: boolean;
  readOnly?: boolean;
  options?: SelectOption[];
  validation?: ValidationRule;
  props?: Record<string, unknown>;
}

type FieldComponent = ComponentType<FieldComponentProps>;

class FieldRegistry {
  private registry = new Map<string, FieldComponent>();
  private static instance: FieldRegistry;

  static getInstance(): FieldRegistry {
    if (!FieldRegistry.instance) {
      FieldRegistry.instance = new FieldRegistry();
    }
    return FieldRegistry.instance;
  }

  register(type: string, component: FieldComponent): void {
    this.registry.set(type, component);
  }

  get(type: string): FieldComponent {
    const component = this.registry.get(type);
    if (!component) {
      throw new Error(`No component registered for field type: "${type}"`);
    }
    return component;
  }

  has(type: string): boolean {
    return this.registry.has(type);
  }
}

// ── Register built-in field types ──

const registry = FieldRegistry.getInstance();

// Eager-loaded core fields
import { TextInput } from './fields/TextInput';
import { SelectField } from './fields/SelectField';
import { CheckboxField } from './fields/CheckboxField';
import { RadioGroup } from './fields/RadioGroup';
import { NumberInput } from './fields/NumberInput';
import { TextAreaInput } from './fields/TextAreaInput';

registry.register('text', TextInput);
registry.register('email', TextInput);      // reuse with type prop
registry.register('password', TextInput);
registry.register('number', NumberInput);
registry.register('textarea', TextAreaInput);
registry.register('select', SelectField);
registry.register('radio', RadioGroup);
registry.register('checkbox', CheckboxField);

// Lazy-loaded heavy fields (code-split)
registry.register('date', lazy(() => import('./fields/DatePicker')));
registry.register('date-range', lazy(() => import('./fields/DateRangePicker')));
registry.register('file', lazy(() => import('./fields/FileUpload')));
registry.register('multi-select', lazy(() => import('./fields/MultiSelect')));

export { FieldRegistry, registry };
```

### 5B. Zod Schema Generation from Config

```typescript
import { z, ZodTypeAny } from 'zod';

function buildFieldZod(field: FieldConfig): ZodTypeAny {
  const v = field.validation ?? {};
  let schema: ZodTypeAny;

  switch (field.type) {
    case 'number': {
      let s = z.number({ invalid_type_error: `${field.label} must be a number` });
      if (v.min !== undefined) s = s.min(v.min);
      if (v.max !== undefined) s = s.max(v.max);
      schema = v.required ? s : s.optional();
      break;
    }

    case 'checkbox': {
      schema = v.required
        ? z.boolean().refine((val) => val === true, { message: `${field.label} is required` })
        : z.boolean().optional();
      break;
    }

    case 'date':
    case 'date-range': {
      let s = z.string();
      // Date validation handled at component level for min/max date
      schema = v.required ? s.min(1, `${field.label} is required`) : s.optional();
      break;
    }

    case 'multi-select': {
      let s = z.array(z.string());
      if (v.required) s = s.min(1, `Select at least one ${field.label}`);
      schema = s;
      break;
    }

    case 'group': {
      // Recursive: build sub-schema for nested fields
      if (field.fields) {
        schema = buildFormZodSchema(field.fields);
      } else {
        schema = z.object({});
      }
      break;
    }

    case 'array': {
      if (field.fields) {
        const itemSchema = buildFormZodSchema(field.fields);
        let s = z.array(itemSchema);
        if (v.min !== undefined) s = s.min(v.min);
        if (v.max !== undefined) s = s.max(v.max);
        schema = s;
      } else {
        schema = z.array(z.unknown());
      }
      break;
    }

    default: {
      // text, email, password, textarea, select, radio
      let s = z.string();
      if (v.required) s = s.min(1, `${field.label} is required`);
      if (v.minLength) s = s.min(v.minLength, `Min ${v.minLength} characters`);
      if (v.maxLength) s = s.max(v.maxLength, `Max ${v.maxLength} characters`);
      if (v.pattern) {
        s = s.regex(new RegExp(v.pattern), v.patternMessage ?? 'Invalid format');
      }
      schema = v.required ? s : s.optional();
      break;
    }
  }

  return schema;
}

function buildFormZodSchema(fields: FieldConfig[]): z.ZodObject<Record<string, ZodTypeAny>> {
  const shape: Record<string, ZodTypeAny> = {};

  for (const field of fields) {
    shape[field.name] = buildFieldZod(field);
  }

  return z.object(shape);
}

export { buildFormZodSchema, buildFieldZod };
```

### 5C. Conditional Visibility Engine

```typescript
function evaluateVisibility(
  rule: VisibilityRule | undefined,
  formValues: Record<string, unknown>
): boolean {
  if (!rule) return true; // no rule = always visible

  const value = formValues[rule.when];

  // Primitive comparisons
  if (rule.eq !== undefined && value !== rule.eq) return false;
  if (rule.neq !== undefined && value === rule.neq) return false;
  if (rule.in !== undefined && !rule.in.includes(value)) return false;
  if (rule.gt !== undefined && (typeof value !== 'number' || value <= rule.gt)) return false;
  if (rule.lt !== undefined && (typeof value !== 'number' || value >= rule.lt)) return false;
  if (rule.isEmpty === true && value !== undefined && value !== '' && value !== null) return false;
  if (rule.isEmpty === false && (value === undefined || value === '' || value === null)) return false;

  // Composite rules
  if (rule.and) {
    return rule.and.every((sub) => evaluateVisibility(sub, formValues));
  }
  if (rule.or) {
    return rule.or.some((sub) => evaluateVisibility(sub, formValues));
  }

  return true;
}

// Collect only visible fields (exclude hidden from submission)
function getVisibleFields(
  fields: FieldConfig[],
  formValues: Record<string, unknown>
): FieldConfig[] {
  return fields.filter((f) => evaluateVisibility(f.visible, formValues));
}

export { evaluateVisibility, getVisibleFields };
```

### 5D. FormRenderer Component

```tsx
import React, { Suspense, useMemo } from 'react';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registry } from './FieldRegistry';
import { buildFormZodSchema } from './zodSchemaGenerator';
import { evaluateVisibility, getVisibleFields } from './visibilityEngine';

interface FormRendererProps {
  schema: FormSchema;
  initialValues?: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void | Promise<void>;
  onError?: (errors: Record<string, unknown>) => void;
}

export const FormRenderer: React.FC<FormRendererProps> = ({
  schema,
  initialValues,
  onSubmit,
  onError,
}) => {
  const methods = useForm({
    defaultValues: initialValues ?? buildDefaults(schema.fields),
    resolver: zodResolver(buildFormZodSchema(schema.fields)),
    mode: 'onBlur',
  });

  const watchedValues = methods.watch();

  const visibleFields = useMemo(
    () => getVisibleFields(schema.fields, watchedValues),
    [schema.fields, watchedValues]
  );

  // Group fields by section
  const sections = useMemo(() => {
    if (!schema.sections) return [{ id: '__default', title: '', fields: visibleFields }];
    return schema.sections.map((sec) => ({
      ...sec,
      fields: visibleFields.filter((f) => f.section === sec.id),
    }));
  }, [schema.sections, visibleFields]);

  const handleSubmit = methods.handleSubmit(async (data) => {
    // Strip hidden field values before submission
    const visibleNames = new Set(visibleFields.map((f) => f.name));
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([key]) => visibleNames.has(key))
    );
    await onSubmit(cleanData);
  }, onError);

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit} noValidate>
        <h2>{schema.title}</h2>
        {schema.description && <p>{schema.description}</p>}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${schema.layout.columns ?? 1}, 1fr)`,
            gap: '1.5rem',
          }}
        >
          {sections.map((section) => (
            <fieldset key={section.id} style={{ gridColumn: section.column ?? 'auto' }}>
              {section.title && <legend>{section.title}</legend>}
              {section.fields.map((fieldConfig) => (
                <Suspense key={fieldConfig.name} fallback={<FieldSkeleton />}>
                  <FieldRenderer config={fieldConfig} />
                </Suspense>
              ))}
            </fieldset>
          ))}
        </div>

        <button type="submit" disabled={methods.formState.isSubmitting}>
          {methods.formState.isSubmitting ? 'Submitting...' : 'Submit'}
        </button>
      </form>
    </FormProvider>
  );
};

// ── Individual Field Renderer ──

const FieldRenderer: React.FC<{ config: FieldConfig }> = ({ config }) => {
  const Component = registry.get(config.type);
  const { control, formState: { errors } } = useFormContext();

  return (
    <div className="field-wrapper">
      <Controller
        name={config.name}
        control={control}
        render={({ field }) => (
          <>
            <Component
              {...field}
              label={config.label}
              placeholder={config.placeholder}
              helpText={config.helpText}
              disabled={config.disabled}
              readOnly={config.readOnly}
              options={config.options}
              validation={config.validation}
              props={config.props}
            />
            {errors[config.name] && (
              <span className="error" role="alert">
                {(errors[config.name] as { message?: string })?.message}
              </span>
            )}
          </>
        )}
      />
    </div>
  );
};

// ── Helpers ──

function buildDefaults(fields: FieldConfig[]): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.defaultValue !== undefined) {
      defaults[field.name] =
        field.defaultValue === 'today' ? new Date().toISOString().split('T')[0] : field.defaultValue;
    } else if (field.type === 'checkbox') {
      defaults[field.name] = false;
    } else if (field.type === 'multi-select') {
      defaults[field.name] = [];
    } else {
      defaults[field.name] = '';
    }
  }
  return defaults;
}

const FieldSkeleton: React.FC = () => (
  <div className="field-skeleton" style={{ height: 56, background: '#f0f0f0', borderRadius: 4 }} />
);
```

### 5E. Usage — Putting It All Together

```tsx
import React, { useEffect, useState } from 'react';
import { FormRenderer } from './FormRenderer';
import type { FormSchema } from './types';

// Custom field registration (before app renders)
import { registry } from './FieldRegistry';
import { RichTextEditor } from './fields/RichTextEditor';
registry.register('rich-text', RichTextEditor);

export const DynamicFormPage: React.FC<{ formId: string }> = ({ formId }) => {
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/forms/${encodeURIComponent(formId)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load form schema');
        return res.json();
      })
      .then((data: FormSchema) => setSchema(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [formId]);

  if (loading) return <div>Loading form...</div>;
  if (!schema) return <div>Form not found</div>;

  return (
    <FormRenderer
      schema={schema}
      onSubmit={async (data) => {
        const res = await fetch(schema.submitConfig.url, {
          method: schema.submitConfig.method,
          headers: {
            'Content-Type': 'application/json',
            ...schema.submitConfig.headers,
          },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Submission failed');
        if (schema.submitConfig.redirectTo) {
          window.location.href = schema.submitConfig.redirectTo;
        }
      }}
      onError={(errors) => console.warn('Validation errors:', errors)}
    />
  );
};
```

### 5F. Testing a Config-Driven Form

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormRenderer } from './FormRenderer';

const testSchema: FormSchema = {
  id: 'test-form',
  version: '1.0.0',
  title: 'Test Form',
  layout: { type: 'single' },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Full Name',
      validation: { required: true, minLength: 2 },
    },
    {
      name: 'role',
      type: 'select',
      label: 'Role',
      options: [
        { label: 'Engineer', value: 'eng' },
        { label: 'Manager', value: 'mgr' },
      ],
      validation: { required: true },
    },
    {
      name: 'teamSize',
      type: 'number',
      label: 'Team Size',
      visible: { when: 'role', eq: 'mgr' },
    },
  ],
  submitConfig: { method: 'POST', url: '/api/test' },
};

describe('FormRenderer', () => {
  it('renders fields from schema', () => {
    render(<FormRenderer schema={testSchema} onSubmit={vi.fn()} />);
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Role')).toBeInTheDocument();
  });

  it('shows conditional field when condition is met', async () => {
    render(<FormRenderer schema={testSchema} onSubmit={vi.fn()} />);

    // teamSize hidden initially
    expect(screen.queryByLabelText('Team Size')).not.toBeInTheDocument();

    // Select Manager role
    await userEvent.selectOptions(screen.getByLabelText('Role'), 'mgr');

    // teamSize now visible
    await waitFor(() => {
      expect(screen.getByLabelText('Team Size')).toBeInTheDocument();
    });
  });

  it('validates required fields on submit', async () => {
    const onSubmit = vi.fn();
    render(<FormRenderer schema={testSchema} onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText('Full Name is required')).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits clean data excluding hidden fields', async () => {
    const onSubmit = vi.fn();
    render(<FormRenderer schema={testSchema} onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Full Name'), 'Hruday');
    await userEvent.selectOptions(screen.getByLabelText('Role'), 'eng');
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Hruday',
        role: 'eng',
        // teamSize NOT included because it was hidden
      });
    });
  });
});
```

────────────────────────────────────────────────────────────────────────

## 6. Why & How Summary

### WHY Config-Driven UI?

```
Problem                              Solution
───────                              ────────
100+ forms across microservices      Single FormRenderer + schema per form
  → duplicated form logic              → write once, render from config

Non-technical users can't modify     Form Builder UI → JSON schema
  forms                                → admins customize without deploys

Multi-tenant SaaS needs per-client   Tenant-specific schemas stored in DB
  field customization                  → same renderer, different config

FE/BE validation diverges over time  Schema = single source of truth
                                       → Zod on FE, JSON Schema on BE

A/B testing form layouts             Serve different schemas per variant
  requires code changes                → no code change needed
```

### HOW — Key Design Decisions

```
Decision                     Approach                        Why
────────                     ────────                        ───
Schema format                JSON (not XML/YAML)             Universal, parseable everywhere
Schema versioning            SemVer in schema.version        Backward-compat, migration path
Field component lookup       Registry pattern (Map)          Decouples schema from components
Heavy components             Lazy-loaded via React.lazy      Bundle size control
Validation framework         Zod generated at runtime        Type-safe, composable, fast
Form state management        react-hook-form                 Minimal re-renders, uncontrolled
Conditional visibility       Rule engine on watched values   Declarative, testable
Hidden field submissions     Stripped before POST             Prevents stale data leaks
Layout                       CSS Grid driven by schema       Flexible sections/columns/tabs
Custom fields                registry.register('custom',…)   Plugin extensibility
Accessibility                Each registry component owns    Centralized a11y per field type
                             its own ARIA attributes
Testing strategy             Schema fixtures + renderer      Decouple schema correctness
                             unit tests                      from rendering correctness
```

### Production Checklist

```
□ Schema validation on load (validate schema itself with a meta-Zod schema)
□ Graceful fallback for unknown field types (render warning, not crash)
□ Schema versioning + migration functions
□ CSRF token in submitConfig headers
□ Rate-limit form submissions
□ Sanitize all user input before rendering (XSS prevention)
□ Lazy-load heavy fields (date pickers, rich text, file upload)
□ i18n: labels/placeholders resolved from translation keys
□ Analytics: track field interaction, drop-off, error rates
□ Debounce visibility re-evaluation (avoid thrashing on rapid input)
□ Server-side rendering support (SSR-safe schema fetch)
□ Offline support: cache schemas in IndexedDB for PWA use cases
```

────────────────────────────────────────────────────────────────────────

*Config-Driven UI — Hruday @ SAP Labs. Prep reference 488.*
