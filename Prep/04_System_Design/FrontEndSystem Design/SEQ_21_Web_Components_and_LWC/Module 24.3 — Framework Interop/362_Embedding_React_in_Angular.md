# 362 – Embedding React Components in Angular & Vice Versa

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Cross-framework embedding: **React in Angular** (use ReactDOM.render inside an Angular directive/component), **Angular in React** (use Angular Elements as Custom Elements). Both patterns are common during migrations and in micro-frontend architectures.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// ──── REACT IN ANGULAR ────
// 1. Install: npm install react react-dom @types/react @types/react-dom
// 2. Create a React component
// react-widget.tsx
import React, { useState } from 'react';

interface Props { initialCount: number; onCountChange?: (count: number) => void; }

export function ReactCounter({ initialCount, onCountChange }: Props) {
  const [count, setCount] = useState(initialCount);
  const increment = () => {
    const newCount = count + 1;
    setCount(newCount);
    onCountChange?.(newCount);
  };
  return <button onClick={increment}>React Count: {count}</button>;
}

// 3. Angular wrapper directive
// react-wrapper.component.ts
import { Component, ElementRef, Input, OnChanges, OnDestroy, Output, EventEmitter } from '@angular/core';
import { createRoot, Root } from 'react-dom/client';
import React from 'react';
import { ReactCounter } from './react-widget';

@Component({
  selector: 'app-react-counter',
  template: '<div #container></div>',
})
export class ReactCounterWrapperComponent implements OnChanges, OnDestroy {
  @Input() initialCount = 0;
  @Output() countChanged = new EventEmitter<number>();
  private root: Root | null = null;

  constructor(private el: ElementRef) {}

  ngOnChanges() { this.renderReact(); }

  ngOnDestroy() { this.root?.unmount(); }

  private renderReact() {
    const container = this.el.nativeElement.querySelector('div');
    if (!this.root) this.root = createRoot(container);
    this.root.render(
      React.createElement(ReactCounter, {
        initialCount: this.initialCount,
        onCountChange: (count: number) => this.countChanged.emit(count),
      })
    );
  }
}
```

```typescript
// ──── ANGULAR IN REACT ────
// 1. Build Angular component as Custom Element (Angular Elements)
// 2. Load the Angular bundle in React app

// react-app.tsx
import React, { useRef, useEffect } from 'react';

// Declare custom element for TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'ng-datepicker': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & { value?: string; format?: string },
        HTMLElement
      >;
    }
  }
}

function App() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.addEventListener('dateSelected', ((e: CustomEvent) => {
        console.log('Date from Angular:', e.detail);
      }) as EventListener);
    }
  }, []);

  return (
    <div>
      <h1>React App with Angular Widget</h1>
      <ng-datepicker ref={ref} value="2024-01-15" format="yyyy-MM-dd" />
    </div>
  );
}
```

### Pattern Comparison
| Approach | Complexity | Bundle Impact | Use Case |
|---|---|---|---|
| React in Angular (wrapper) | Medium | +~40KB React | Migration to React |
| Angular in React (Elements) | Medium | +~100KB Angular | Reuse Angular components |
| Both via Web Components | Low | Per-component | Micro-frontends |
| Module Federation | High | Shared runtimes | Large apps |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"React in Angular: create a wrapper component that uses ReactDOM.createRoot to render the React component, bridging inputs/outputs. Angular in React: export as Angular Element (Custom Element), use it as a JSX tag. I've done this for gradual migrations — at SAP we embedded React charts in our Angular dashboard."*

## 4. 🧠 MEMORY AID
**"React-in-Angular: wrapper component + createRoot. Angular-in-React: Angular Elements as Custom Element + ref for events."**

## 5. 🎯 KEY INSIGHT
The key challenge is **event bridging**: Angular @Output → React callback, and React callback → Angular EventEmitter. Custom Elements solve this with CustomEvent as the universal bridge.
