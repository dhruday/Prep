# 357 – @api, @track, @wire Decorators

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
LWC uses three decorators for reactivity: **@api** (public property, parent→child), **@track** (reactive private property — deprecated in favor of default reactivity), **@wire** (declarative data fetching from Salesforce). Since LWC v2, all fields are reactive by default, so @track is rarely needed.

## 2. 🔬 DEEP-DIVE EXPLANATION

```javascript
import { LightningElement, api, track, wire } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';

export default class AccountCard extends LightningElement {
  // ──── @api — Public Property (parent → child) ────
  @api recordId;           // Set by parent: <c-account-card record-id="001xx">
  @api
  get formattedName() {    // Public getter
    return this._name?.toUpperCase();
  }
  
  // ──── @track — Reactive Private (deep reactivity) ────
  // Before LWC v2: needed for object/array reactivity
  // After LWC v2: all fields reactive by default, @track only for DEEP tracking
  @track complexData = { nested: { value: 'hello' } };
  // this.complexData.nested.value = 'world'; ← triggers re-render with @track
  // Without @track: only reassignment triggers re-render

  // ──── @wire — Declarative Data Fetching ────
  @wire(getRecord, { recordId: '$recordId', fields: ['Account.Name', 'Account.Industry'] })
  account;
  // account.data and account.error are auto-populated
  // '$recordId' = reactive parameter (refetches on change)

  // ──── @wire with function (imperative handling) ────
  _contacts;
  @wire(getRelatedContacts, { accountId: '$recordId' })
  wiredContacts({ error, data }) {
    if (data) { this._contacts = data; }
    if (error) { console.error(error); }
  }

  // ──── Regular reactive fields (LWC v2+) ────
  count = 0;              // Reactive by default!
  items = [];             // Shallow reactive
  
  increment() {
    this.count++;         // ← triggers re-render automatically
    this.items = [...this.items, 'new']; // reassignment for arrays
  }
}
```

```html
<!-- accountCard.html -->
<template>
  <template if:true={account.data}>
    <p>{account.data.fields.Name.value}</p>
    <p>{account.data.fields.Industry.value}</p>
  </template>
  <template if:true={account.error}>
    <p>Error loading account</p>
  </template>
</template>
```

### Comparison
| Decorator | Visibility | Reactivity | Use Case |
|---|---|---|---|
| `@api` | Public | Shallow | Props from parent |
| `@track` | Private | Deep (nested objects) | Complex nested state |
| `@wire` | Private | Auto-fetched | Salesforce data |
| (none) | Private | Shallow (v2+) | Internal state |

### @api Rules
- Read-only from component internals (don't mutate)
- Kebab-case in HTML: `record-id` → camelCase in JS: `recordId`
- Can be used on methods too: `@api focus() { ... }`

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"@api exposes public properties (like React props). @wire declaratively fetches Salesforce data with reactive '$' parameters. @track provides deep reactivity for nested objects. Since LWC v2, all fields are reactive by default, so @track is only needed for deep nested changes."*

## 4. 🧠 MEMORY AID
**"@api = public prop. @wire = auto-fetch with $ reactive params. @track = deep nested reactivity. Default = shallow reactive."**

## 5. 🎯 KEY INSIGHT
The `$` prefix in @wire params (`'$recordId'`) makes the wire reactive — it refetches automatically when that property changes.
