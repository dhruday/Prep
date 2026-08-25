# 517. LLD Approach Guide — Machine Coding Interview Strategy

────────────────────────────────────
## 1. What is an LLD / Machine Coding Round?
────────────────────────────────────

An LLD (Low-Level Design) or Machine Coding round asks you to build a functional UI component or small application within 45-90 minutes. You're evaluated on: component design, accessibility (ARIA + keyboard), state management, code quality (TypeScript, clean patterns), edge case handling, and how you communicate your approach.

**Common LLD Questions:**

| Category | Examples |
|----------|---------|
| Widgets | Accordion, Tabs, Modal, Tooltip, Date Picker, Autocomplete |
| Interactive | Drag & Drop List, Image Slider, Kanban Board, Infinite Scroll |
| Forms | Multi-step Wizard, Dynamic Form Builder, Validation Engine |
| Data Display | Data Table with Sort/Filter/Paginate, Virtual List, Tree View |
| Real-time | Live Chat, Notification Feed, Collaborative Cursor |
| Games | Tic-Tac-Toe, Minesweeper, Memory Card Game |

────────────────────────────────────
## 2. The 7-Step Approach
────────────────────────────────────

```
┌───────────────────────────────────────────────────────────┐
│             MACHINE CODING — 7 STEPS                       │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  1. CLARIFY (3 min)                                       │
│     → What features are in scope?                         │
│     → Single select or multi-select accordion?            │
│     → Need animations? Keyboard nav? Screen reader?       │
│                                                           │
│  2. REQUIREMENTS TABLE (2 min)                            │
│     → Write Functional + Non-Functional requirements      │
│     → Prioritize: Must-have vs Nice-to-have               │
│                                                           │
│  3. COMPONENT API (5 min)                                 │
│     → Define props interface (TypeScript)                 │
│     → Think: what would a consumer of this component need?│
│     → Controlled vs uncontrolled                          │
│                                                           │
│  4. ARIA + KEYBOARD TABLE (5 min)                         │
│     → WAI-ARIA pattern (roles, states, properties)        │
│     → Keyboard shortcuts table                            │
│     → This is what FAANG evaluates most                   │
│                                                           │
│  5. STATE MACHINE (3 min)                                 │
│     → Draw states and transitions                         │
│     → idle → loading → success/error                      │
│     → collapsed → expanding → expanded → collapsing       │
│                                                           │
│  6. IMPLEMENT (20-30 min)                                 │
│     → Start with structure (JSX/HTML skeleton)            │
│     → Add ARIA attributes                                 │
│     → Add keyboard navigation                             │
│     → Add state logic                                     │
│     → Add styling last                                    │
│                                                           │
│  7. EDGE CASES + TESTING (5 min)                          │
│     → Empty state, overflow, RTL, SSR                     │
│     → List 3-5 test cases (don't need to write all)       │
│     → Mention: axe-core, keyboard walkthrough, screen reader│
│                                                           │
│  Total: 45-50 minutes                                     │
└───────────────────────────────────────────────────────────┘
```

────────────────────────────────────
## 3. What Interviewers Score
────────────────────────────────────

| Criteria | Weight | What They Look For |
|----------|--------|-------------------|
| **Accessibility** | 30% | Correct ARIA roles, keyboard nav, focus management |
| **Component API design** | 20% | Clean props, sensible defaults, controlled/uncontrolled |
| **Code quality** | 20% | TypeScript, separation of concerns, named properly |
| **State management** | 15% | Edge cases handled, state transitions clear |
| **Communication** | 15% | Talked through approach, explained trade-offs |

**Senior-level signals:**
- Starts with ARIA pattern before writing JSX
- Uses `role`, `aria-expanded`, `aria-controls` correctly
- Implements keyboard navigation per WAI-ARIA spec
- Mentions `prefers-reduced-motion` for animations
- Discusses error boundaries and loading states
- Types everything (no `any`)

**Junior-level anti-signals:**
- Jumps straight to implementation
- No ARIA attributes
- No keyboard navigation
- Uses `div` with `onClick` instead of `button`
- Hardcoded values, no props interface

────────────────────────────────────
## 4. Quick Reference — ARIA Patterns for Common Components
────────────────────────────────────

| Component | Container Role | Item Role | Key ARIA | Key Keyboard |
|-----------|--------------|-----------|----------|-------------|
| Accordion | none | `role="region"` | `aria-expanded`, `aria-controls` | Enter, Space, Arrow keys |
| Tabs | `tablist` | `tab` + `tabpanel` | `aria-selected`, `aria-controls` | Arrow keys, Home, End |
| Modal | `dialog` | — | `aria-modal`, `aria-labelledby` | Escape, Tab trap |
| Combobox | `combobox` | `option` in `listbox` | `aria-expanded`, `aria-activedescendant` | Arrow, Enter, Escape |
| Menu | `menu` | `menuitem` | `aria-haspopup`, `aria-expanded` | Arrow keys, Enter, Escape |
| Tooltip | `tooltip` | — | `aria-describedby` | Focus/hover, Escape |
| Tree View | `tree` | `treeitem` | `aria-expanded`, `aria-level` | Arrow keys, Enter, Home, End |

────────────────────────────────────
## 5. Time Boxing for Different Interview Lengths
────────────────────────────────────

| Phase | 45 min | 60 min | 90 min |
|-------|--------|--------|--------|
| Clarify + Requirements | 5 | 5 | 8 |
| Component API | 3 | 5 | 8 |
| ARIA + Keyboard | 5 | 7 | 10 |
| State Machine | 2 | 3 | 5 |
| Implementation | 20 | 30 | 45 |
| Edge Cases + Tests | 5 | 5 | 9 |
| Discussion | 5 | 5 | 5 |

────────────────────────────────────
## 6. Memory Aid
────────────────────────────────────

**The LLD mantra: "CARKS-IT"**
- **C**larify scope
- **A**RIA pattern
- **R**equirements (func + non-func)
- **K**eyboard table
- **S**tate machine
- **I**mplement (structure → ARIA → keyboard → state → style)
- **T**est (edge cases + a11y)

**If you go blank:** "I'll start by clarifying requirements, then define the ARIA pattern and keyboard interactions from the WAI-ARIA spec, design the component API with TypeScript, sketch the state machine, implement with accessibility first, and end with edge cases."
