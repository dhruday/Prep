# 359 – LWC Events – Custom Events, Lightning Message Service

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
LWC communication: **Custom Events** (child→parent, bubbles up DOM), **Lightning Message Service (LMS)** (any→any, cross-DOM, even Aura↔LWC↔Visualforce). LMS uses message channels for publish/subscribe. Custom events follow DOM event model; LMS is a global event bus.

## 2. 🔬 DEEP-DIVE EXPLANATION

```javascript
// ──── CUSTOM EVENTS (child → parent) ────
// child.js
export default class TodoItem extends LightningElement {
  @api todoId;
  @api todoText;

  handleDelete() {
    this.dispatchEvent(new CustomEvent('delete', {
      detail: { id: this.todoId },
      // bubbles: false (default) — only direct parent hears it
      // composed: false (default) — doesn't cross shadow boundary
    }));
  }

  handleSelect() {
    this.dispatchEvent(new CustomEvent('select', {
      detail: { id: this.todoId, text: this.todoText },
      bubbles: true,    // bubbles up through DOM
      composed: true,   // crosses shadow DOM boundaries
    }));
  }
}
```

```html
<!-- parent.html — listening to child events -->
<template>
  <template for:each={todos} for:item="todo">
    <c-todo-item 
      key={todo.id}
      todo-id={todo.id}
      todo-text={todo.text}
      ondelete={handleDelete}
      onselect={handleSelect}>
    </c-todo-item>
  </template>
</template>
```

```javascript
// parent.js
handleDelete(event) {
  const todoId = event.detail.id;
  this.todos = this.todos.filter(t => t.id !== todoId);
}
```

```javascript
// ──── LIGHTNING MESSAGE SERVICE (any → any) ────
// messageChannel: RecordSelected.messageChannel-meta.xml
// <?xml version="1.0"?>
// <LightningMessageChannel xmlns="http://soap.sforce.com/2006/04/metadata">
//   <masterLabel>RecordSelected</masterLabel>
//   <isExposed>true</isExposed>
//   <messageFields>
//     <fieldName>recordId</fieldName>
//     <description>The selected record ID</description>
//   </messageFields>
// </LightningMessageChannel>

// Publisher
import { publish, MessageContext } from 'lightning/messageService';
import RECORD_SELECTED from '@salesforce/messageChannel/RecordSelected__c';

export default class RecordList extends LightningElement {
  @wire(MessageContext) messageContext;

  handleRecordClick(event) {
    publish(this.messageContext, RECORD_SELECTED, {
      recordId: event.target.dataset.id,
    });
  }
}

// Subscriber (completely separate component)
import { subscribe, unsubscribe, MessageContext } from 'lightning/messageService';
import RECORD_SELECTED from '@salesforce/messageChannel/RecordSelected__c';

export default class RecordDetail extends LightningElement {
  @wire(MessageContext) messageContext;
  subscription;
  selectedRecordId;

  connectedCallback() {
    this.subscription = subscribe(
      this.messageContext,
      RECORD_SELECTED,
      (message) => { this.selectedRecordId = message.recordId; }
    );
  }

  disconnectedCallback() {
    unsubscribe(this.subscription);
  }
}
```

### Communication Patterns
| Pattern | Mechanism | Scope |
|---|---|---|
| Parent → Child | @api properties | Direct parent-child |
| Child → Parent | Custom Events | DOM tree upward |
| Any → Any | Lightning Message Service | Entire page |
| Aura ↔ LWC | LMS or pubsub | Cross-framework |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Child→parent: CustomEvent with onEventName handler in parent template. Any→any: Lightning Message Service with publish/subscribe through message channels. LMS works across LWC, Aura, and Visualforce components on the same page. I always unsubscribe in disconnectedCallback to prevent leaks."*

## 4. 🧠 MEMORY AID
**"Custom Events: child→parent (onEventName). LMS: any→any (publish/subscribe via message channel). Always unsubscribe in disconnectedCallback."**

## 5. 🎯 KEY INSIGHT
In LWC, event names in templates use `on` prefix: `onmyevent` handles CustomEvent('myevent'). No camelCase — all lowercase.
