# 358 – Wire Service & Apex Method Integration

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
LWC's **Wire Service** connects components to Salesforce data via adapters (uiRecordApi, uiObjectInfoApi) or custom **Apex methods**. Wire is declarative and cacheable. For mutations or uncacheable operations, call Apex **imperatively**. Wire is reactive: changes to `$param` trigger automatic refetch.

## 2. 🔬 DEEP-DIVE EXPLANATION

```javascript
// ──── WIRE WITH UI API ────
import { LightningElement, wire, api } from 'lwc';
import { getRecord, updateRecord } from 'lightning/uiRecordApi';
import NAME_FIELD from '@salesforce/schema/Account.Name';
import INDUSTRY_FIELD from '@salesforce/schema/Account.Industry';

export default class AccountDetail extends LightningElement {
  @api recordId;

  @wire(getRecord, { 
    recordId: '$recordId', 
    fields: [NAME_FIELD, INDUSTRY_FIELD] 
  })
  account;

  get accountName() {
    return this.account?.data?.fields?.Name?.value;
  }
}

// ──── WIRE WITH APEX ────
// AccountController.cls (Apex server-side)
// @AuraEnabled(cacheable=true)
// public static List<Contact> getContacts(String accountId) {
//   return [SELECT Id, Name, Email FROM Contact WHERE AccountId = :accountId];
// }

import getContacts from '@salesforce/apex/AccountController.getContacts';

export default class ContactList extends LightningElement {
  @api accountId;
  
  // Declarative wire (cacheable Apex only)
  @wire(getContacts, { accountId: '$accountId' })
  contacts;

  // Wire to function for custom handling
  @wire(getContacts, { accountId: '$accountId' })
  wiredContacts({ error, data }) {
    if (data) this.contactList = data;
    if (error) this.error = error.body.message;
  }
}

// ──── IMPERATIVE APEX (for mutations / uncacheable) ────
import createContact from '@salesforce/apex/AccountController.createContact';
import { refreshApex } from '@salesforce/apex';

export default class ContactForm extends LightningElement {
  wiredContactsResult; // store wire result for refresh

  @wire(getContacts, { accountId: '$accountId' })
  wiredContactsHandler(result) {
    this.wiredContactsResult = result;
    if (result.data) this.contacts = result.data;
  }

  async handleSubmit() {
    try {
      await createContact({ 
        accountId: this.accountId, 
        name: this.newContactName 
      });
      // Refresh wire adapter cache
      await refreshApex(this.wiredContactsResult);
      this.showToast('Success', 'Contact created', 'success');
    } catch (error) {
      this.showToast('Error', error.body.message, 'error');
    }
  }
}
```

### Wire vs Imperative
| Aspect | Wire (Declarative) | Imperative |
|---|---|---|
| **Syntax** | @wire decorator | await method() |
| **Caching** | Yes (cacheable=true) | No |
| **Reactivity** | Auto-refetch on $ params | Manual call |
| **Use for** | Read operations | Create, Update, Delete |
| **Error handling** | In wire function | try/catch |
| **Refresh** | refreshApex() | Call again |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Wire service provides declarative, cacheable data fetching — I wire to UI API adapters or @AuraEnabled(cacheable=true) Apex methods. For mutations (create/update/delete), I call Apex imperatively with async/await and refreshApex() to update the wire cache. The reactive '$' params make wires refetch automatically."*

## 4. 🧠 MEMORY AID
**"Wire = declarative reads (cacheable). Imperative = mutations (async/await). refreshApex() = invalidate wire cache. $ prefix = reactive param."**

## 5. 🎯 KEY INSIGHT
Only `@AuraEnabled(cacheable=true)` methods work with @wire. DML operations (insert/update/delete) must be called imperatively.
