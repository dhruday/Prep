# 📚 Frontend System Design Interview Handbook
### For Senior Engineers (7+ Years) targeting FAANG / Staff-Level Roles

---

## 🗺️ How to Navigate This Handbook

| File | Topic | Time to Read | Priority |
|------|-------|-------------|----------|
| [00_QUICK_START.md](./00_QUICK_START.md) | Framework, Mental Models, Interview Formula | 20 min | ⭐⭐⭐ FIRST |
| [01_GMAIL.md](./01_GMAIL.md) | Design Gmail | 45 min | ⭐⭐⭐ |
| [02_GOOGLE_DOCS.md](./02_GOOGLE_DOCS.md) | Design Google Docs | 45 min | ⭐⭐⭐ |
| [03_TRELLO.md](./03_TRELLO.md) | Design Trello | 40 min | ⭐⭐⭐ |
| [04_WHATSAPP_WEB.md](./04_WHATSAPP_WEB.md) | Design WhatsApp Web | 40 min | ⭐⭐⭐ |
| [05_ANALYTICS_DASHBOARD.md](./05_ANALYTICS_DASHBOARD.md) | Design Analytics Dashboard | 35 min | ⭐⭐ |
| [06_DESIGN_SYSTEM.md](./06_DESIGN_SYSTEM.md) | Design a Design System | 40 min | ⭐⭐⭐ |
| [07_MICRO_FRONTEND.md](./07_MICRO_FRONTEND.md) | Micro Frontend Platform | 40 min | ⭐⭐⭐ |
| [08_ENTERPRISE_PORTAL.md](./08_ENTERPRISE_PORTAL.md) | Enterprise Portal | 35 min | ⭐⭐ |
| [09_BI_LAUNCHPAD.md](./09_BI_LAUNCHPAD.md) | BI Launchpad | 35 min | ⭐⭐ |
| [10_SAP_UI5.md](./10_SAP_UI5.md) | SAP UI5 Enterprise App | 35 min | ⭐⭐ |
| [11_TOP_100_QUESTIONS.md](./11_TOP_100_QUESTIONS.md) | Top 100 Interview Questions | 60 min | ⭐⭐⭐ |
| [12_CHEAT_SHEET.md](./12_CHEAT_SHEET.md) | Quick Reference Cheat Sheet | 10 min | ⭐⭐⭐ |

---

## 📋 Every Design Topic Covers 16 Parts

```
PART 1  → Problem Statement        (Business + Functional + Non-Functional Requirements)
PART 2  → Interviewer Expectations (What earns you the role)
PART 3  → Requirement Questions    (What to ask BEFORE designing)
PART 4  → High-Level Architecture  (ASCII diagram + component breakdown)
PART 5  → Frontend Architecture    (Folder structure, state, caching, error handling)
PART 6  → Performance Engineering  (Bundle, lazy load, virtualization, rendering)
PART 7  → Scalability              (10K → 100M users journey)
PART 8  → Accessibility            (WCAG, ARIA, keyboard, screen readers)
PART 9  → Security                 (Auth, XSS, CSRF, data handling)
PART 10 → Offline Support          (Service Workers, IndexedDB, sync strategy)
PART 11 → Monitoring               (Logs, metrics, error tracking, RUM)
PART 12 → Trade-Off Analysis       (Every decision: Why, Alternatives, Pros/Cons)
PART 13 → 50+ Follow-Up Questions  (With detailed answers)
PART 14 → Staff Engineer Deep Dive (Architectural evolution, platform strategy)
PART 15 → Production Reality       (What companies actually do, anti-patterns)
PART 16 → Interview Summaries      (5-min / 15-min / 30-min answers ready to go)
```

---

## 🎯 Company-Specific Cheat Sheet

| Company | Most Asked Topics | Style |
|---------|-------------------|-------|
| **Google** | Google Docs, Gmail, Search | Deep on performance + scale |
| **Meta** | WhatsApp, News Feed, Notifications | Real-time, mobile-first |
| **Amazon** | Design Systems, Enterprise Portal | Operational excellence |
| **Microsoft** | Teams-like, Design Systems, Accessibility | Accessibility-heavy |
| **Uber** | Real-time maps, Analytics Dashboard | Live data + mobile |
| **Airbnb** | Design Systems, Search | Component architecture |
| **Atlassian** | Trello/Jira clone | Collaboration + offline |
| **Salesforce** | Enterprise Portal, BI Launchpad | Multi-tenant, accessibility |
| **SAP** | SAP UI5, BI Tools | OData, enterprise patterns |

---

## ⏱️ Interview Time Strategy

```
30-min Interview:
  0-5  min  → Clarify requirements (ask 5-7 smart questions)
  5-10 min  → High-level architecture (draw it, explain components)
  10-20 min → Deep dive (1-2 parts they focus on)
  20-25 min → Trade-offs and alternatives
  25-30 min → Follow-up questions

45-min Interview:
  0-5  min  → Requirements
  5-12 min  → Architecture + data flow
  12-25 min → Frontend deep dive (performance, state, UX)
  25-35 min → Scalability + edge cases
  35-42 min → Security + accessibility
  42-45 min → Their questions

60-min Interview (Staff Level):
  0-8  min  → Requirements (push back, challenge assumptions)
  8-18 min  → Architecture (multiple options, defend choices)
  18-35 min → Deep technical dive
  35-45 min → Scalability + evolution over 3 years
  45-55 min → Team + org implications
  55-60 min → Questions about their challenges
```

---

## 🔑 The 5 Things Interviewers Always Evaluate

1. **Structured Thinking** — Do you approach problems systematically?
2. **Trade-Off Awareness** — Do you know WHY you chose X over Y?
3. **Scale Intuition** — Can you identify bottlenecks before they're obvious?
4. **Real-World Experience** — Have you built or seen this pattern before?
5. **Communication** — Can you explain complex ideas simply?

---

## 🧠 Universal Patterns (Memorize These)

### Performance Formula
```
Fast App = Less JS + Smart Caching + Virtualization + Optimal Rendering
```

### State Management Decision Tree
```
Is state shared across pages? → Yes → Global Store (Redux/Zustand)
Is state server data?         → Yes → React Query / SWR
Is state UI-only?             → Yes → useState / useReducer
Is state URL-driven?          → Yes → URL params
```

### Scalability Ladder
```
10K users   → Monolith + CDN is fine
100K users  → Add caching layer + optimize bundles
1M users    → Micro frontends + edge caching
100M users  → Full micro frontend + server-side personalization + global CDN
```

---

## 📌 Start Here

> **Day 1:** Read `00_QUICK_START.md` + `12_CHEAT_SHEET.md`
> **Day 2-3:** Read `01_GMAIL.md` + `02_GOOGLE_DOCS.md` (most asked)
> **Day 4:** Read `06_DESIGN_SYSTEM.md` + `07_MICRO_FRONTEND.md` (staff-level favorites)
> **Day 5:** Read `03_TRELLO.md` + `04_WHATSAPP_WEB.md` (real-time patterns)
> **Day 6:** Skim remaining topics + `11_TOP_100_QUESTIONS.md`
> **Day 7:** Practice with `12_CHEAT_SHEET.md` only — test yourself

---

*Built for Senior Engineers aiming for Staff+ roles at top tech companies.*
