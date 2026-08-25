# 6. How Microsoft / Adobe / Salesforce / Cisco Differ in Expectations ★

---

## 1. High-Level Explanation (Interview Opening Answer)

Each of the four target companies — Microsoft, Adobe, Salesforce, and Cisco — evaluates senior frontend engineers through a distinctly different lens shaped by their product portfolios, engineering culture, and business priorities. Understanding these differences allows you to calibrate interview answers, choose the right examples, and demonstrate alignment with what each company actually values in production. Microsoft emphasises growth mindset and systems thinking at scale; Adobe prizes craft, performance, and creative tooling depth; Salesforce tests platform extensibility and declarative enterprise patterns; Cisco focuses on real-time reliability, security, and network-aware UI engineering.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Microsoft — Growth Mindset + Scale + Accessibility

**Core values:** Growth Mindset · Clarity · Energy · Success of Others  
**Key products:** Teams, Azure Portal, VS Code, Office 365, Edge, Bing

**What they test:**
- **System Design at Scale** — What happens when 280 million Teams users all load simultaneously? CDN strategy, micro-frontend isolation, bundle chunking, and feature flags are all expected topics.
- **Accessibility as a first-class requirement** — Microsoft has a legal and moral commitment to WCAG 2.1. Senior engineers must know ARIA, keyboard navigation, screen reader testing, and the Accessibility Tree. Not a checkbox — a design constraint from day one.
- **TypeScript depth** — VS Code and Azure Portal are TypeScript-first. Expect questions on advanced types, generics, discriminated unions, and declaration files.
- **Incremental delivery** — Feature flags, A/B testing, canary releases. Microsoft ships features to 10M users before full rollout.
- **Behavioural round ("As Appropriate")** — Heavy STAR questions. They specifically look for Growth Mindset (admitting mistakes and learning) and Success of Others (mentoring, unblocking teams).

**Calibration for Hruday:**
> Reference the WCAG AA certification at SAP. Reference the Lighthouse 60→95 performance work. Reference the mentoring of 4 engineers story. Frame everything through "what did I learn" and "how did I help the team grow."

---

### Adobe — Craft + Performance + Creative Tools

**Core values:** Craft excellence · Innovation · Genuine care for customers  
**Key products:** Creative Cloud (Photoshop web, Illustrator, XD, Premiere Pro web), Acrobat online, Frame.io, Figma (acquired)

**What they test:**
- **Performance engineering depth** — Adobe builds real-time rendering and compositing in the browser. They probe deeply: CRP, layout thrashing, GPU layers, `will-change`, WASM integration. Lighthouse is a baseline — they care about sustained 60fps during complex operations.
- **Canvas, WebGL, WebAssembly** — Creative tools require low-level browser APIs. Expect questions about off-screen canvas, requestAnimationFrame, OffscreenCanvas, and pixel manipulation.
- **Testing philosophy** — Adobe expects senior engineers to own the testing pyramid. Jest, React Testing Library, Playwright, visual regression (Chromatic), and Lighthouse CI in pipelines.
- **React and TypeScript depth** — Post-Figma acquisition, React architecture questions are standard. React Server Components, concurrent features, and complex state management are fair game.
- **Accessibility** — WCAG AA is mandatory at Adobe. Creative tools have unique accessibility challenges (canvas content, custom controls).

**Calibration for Hruday:**
> Lead with the Lighthouse 60→95 story. Demonstrate testing knowledge. Show awareness of canvas performance optimisations. Frame the 80% security reduction as evidence of code quality ownership.

---

### Salesforce — Platform Thinking + Declarative Enterprise + Multi-Tenancy

**Core values:** Trust · Customer Success · Innovation · Equality  
**Key products:** Salesforce CRM, Lightning Experience, Slack, MuleSoft, Tableau, Marketing Cloud

**What they test:**
- **Web Components / LWC** — Salesforce Lightning Experience is built on Lightning Web Components, a standards-compliant Web Component framework. Senior engineers must know the Shadow DOM, `@api`/`@track`/`@wire` decorators, custom events, and Lightning Message Service.
- **Multi-tenant architecture** — Salesforce serves 150,000+ orgs. UI must isolate tenant code, prevent CSS bleeding, and support multiple active sessions. Shadow DOM and CSS scoping are architectural requirements, not optional.
- **Declarative patterns** — Salesforce uses metadata-driven UIs (field-level visibility, permission sets). Senior engineers must understand ABAC/RBAC at the UI layer and how to sync backend permission models to frontend rendering decisions.
- **Performance in constrained networks** — Many Salesforce enterprise customers are in regions with slow networks. Pagination, caching, and offline capability are tested.
- **Trust as infrastructure** — CSP, SRI, CORS, and XSS prevention are first-class design concerns. The Salesforce data model (sharing rules, field-level security) must be reflected in the frontend.

**Calibration for Hruday:**
> Emphasise the OData binding patterns from SAP UI5 (analogous to Salesforce's wire service). Reference the micro-frontend architecture for multi-tenant isolation. Highlight the 80% security reduction story.

---

### Cisco — Real-Time Reliability + Network-Aware UI + Angular Depth

**Core values:** Integrity · Trust · Collaboration · Innovation  
**Key products:** Webex (Teams/Meetings/Events), DNA Center, SecureX, AppDynamics, ThousandEyes

**What they test:**
- **Real-Time & WebSocket Engineering** — Webex and network monitoring UIs require real-time data streams. Expect questions on WebSocket vs SSE, reconnection with exponential backoff, message ordering, idempotency, and handling partial failures.
- **Angular depth** — Cisco's frontend stack is heavily Angular. Expect deep questions on change detection strategies (OnPush + Zone.js vs Zoneless), RxJS operators (`switchMap` vs `mergeMap` vs `concatMap`), NgRx effects/selectors, and Angular performance patterns.
- **Network monitoring visualisations** — D3.js, Canvas, SVG-based topology rendering. Performance during large-scale data updates (throttling, virtual DOM skipping, Web Workers for calculations).
- **Security and compliance** — Network management tools handle sensitive infrastructure data. CSP, secure headers, token handling, and audit logging are design requirements.
- **TypeScript and CI/CD** — Cisco engineering teams are mature DevOps organisations. Expect questions on pipeline design, Docker, GitHub Actions, and automated testing.

**Calibration for Hruday:**
> This is the closest match to your skills. Lead with the Bosch WebSocket dashboard (real-time data, Angular, reconnection logic). Reference your RxJS expertise deeply. Demonstrate that you know `takeUntil`, `switchMap` vs `mergeMap`, OnPush patterns — this is your home turf.

---

## 3. Real-World Examples

**Microsoft Teams frontend team:**
A new feature (Together Mode) was gated behind feature flags across 280M users. Senior engineers owned the flag evaluation logic at the edge, gradual rollout %, and A/B analytics instrumentation — not just the UI code.

**Adobe Photoshop web editor:**
The real-time brush rendering pipeline runs at 60fps using OffscreenCanvas + Web Workers to offload pixel manipulation, posting results to the main thread only for final compositing. Interviews probe whether you know where the main thread bottlenecks in this architecture.

**Salesforce Lightning Experience:**
A single org can have 500+ custom components from third-party AppExchange vendors running in the same page. Shadow DOM isolation prevents CSS and JS conflicts. Multi-tenant session isolation is enforced at the Web Component boundary — an architectural requirement, not a courtesy.

**Cisco Webex reconnection protocol:**
When a Webex call drops, the WebSocket reconnects with exponential backoff. Missed state updates are reconciled via a delta-sync mechanism rather than full state reload, keeping the UI consistent without visible flash. This is a direct interview scenario Cisco asks candidates to design.

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

*"The four companies I'm targeting have meaningfully different engineering priorities. Microsoft has a strong culture of growth mindset and ships accessibility-first software at massive scale — Teams has 280M DAUs. The behavioural round is as important as the technical round. Adobe is where craft and performance intersect — they build browser-native creative tools, so performance to the level of sustained 60fps, canvas APIs, and testing rigor are the signal.*

*Salesforce is unique because the platform model dominates everything. LWC, multi-tenant isolation, and declarative permission-driven UI are not optional knowledge — they're the core interview topic. And Cisco is the closest to my current stack: Angular, RxJS, real-time WebSocket engineering, and network-aware UI at enterprise scale. I've spent 7 years doing exactly the category of work Cisco interviews test, including a real-time Angular WebSocket dashboard at Bosch."*

### Likely Follow-up Questions

1. **"Why do you want to work at [specific company]?"** → Prepare a genuine answer that maps your values to theirs. For Microsoft: growth and impact at scale. For Adobe: craft and creative tools. For Salesforce: platform thinking. For Cisco: real-time and network engineering.

2. **"What is one thing you'd change about how [company] does frontend engineering?"** → Shows intellectual honesty. Have a thoughtful, non-negative answer ready (e.g., "I'd invest more in performance budgets in CI pipelines").

3. **"How does your experience at SAP translate here?"** → Have a clear translation map: OData → REST/GraphQL; UI5 MVC → React/Angular; Fiori → Design System; SAP BI performance work → web performance engineering.

4. **"What level are you targeting?"** → Know the levelling: Microsoft SDE2/SDE3, Adobe P4/P5, Salesforce MTS/SMTS, Cisco SE3/SEST. Level dictates the depth expected.

### Comparison: Technical Focus by Company

| Area | Microsoft | Adobe | Salesforce | Cisco |
|------|-----------|-------|-----------|-------|
| React depth | High | Very High | Medium | Medium |
| Angular/RxJS | Medium | Low | Low | Very High |
| TypeScript | Very High | High | Medium | High |
| Accessibility | Very High | High | Medium | Medium |
| Performance | High | Very High | Medium | High |
| Real-Time/WS | Medium | Low | Low | Very High |
| Web Components | Low | Low | Very High (LWC) | Low |
| Security/OWASP | High | High | Very High | High |
| System Design | Very High | High | High | High |
| Behavioural | Very High | High | High | Medium |

---

## 5. Code Example

```typescript
// Mental model: the same feature, tuned for each company

// MICROSOFT: Accessibility-first feature flag check
function FeatureGate({ feature, children }: { feature: string; children: React.ReactNode }) {
  const { isEnabled } = useFeatureFlags();
  
  // Microsoft: audit logging + accessibility announcement on flag change
  useEffect(() => {
    if (isEnabled(feature)) {
      // Announce to screen readers (Microsoft a11y requirement)
      announceToScreenReader(`${feature} is now available`);
    }
  }, [feature, isEnabled]);
  
  return isEnabled(feature) ? <>{children}</> : null;
}

// ADOBE: Performance-first canvas operation
function drawBrushStroke(ctx: OffscreenCanvasRenderingContext2D, points: Point[]) {
  // Adobe: offscreen canvas + batch draw to avoid layout thrashing
  ctx.beginPath();
  points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.stroke(); // Single paint — not one stroke per point
}

// SALESFORCE: LWC-style permission-driven rendering
@Component({ template: `<div *ngIf="canEdit">...</div>` })
class RecordViewComponent {
  @Input() permissions: PermissionSet;
  
  get canEdit(): boolean {
    // Salesforce: never trust frontend-only checks — backend enforces too
    return this.permissions.hasPermission('Record:Edit')
        && this.permissions.hasFieldPermission('Status', 'write');
  }
}

// CISCO: RxJS WebSocket reconnection (your core strength)
const ws$ = webSocket(WS_URL).pipe(
  retryWhen(errors$ => errors$.pipe(
    delayWhen((_, attempt) => timer(Math.min(1000 * 2 ** attempt, 30000))), // exp backoff
    take(10)
  )),
  takeUntil(this.destroy$)
);
```

---

## 6. Memory Aid (Quick Recall for Interview)

**MASC Framework:**
- **M**icrosoft — Mindset, Masscale, Meetings (Teams), Meaningful a11y
- **A**dobe — Art (craft), Animate (performance), Automated testing, Advanced Canvas
- **S**alesforce — Shadow DOM, Sharing rules, Secure multi-tenant, Salesforce Trust
- **C**isco — Concurrent websockets, Change detection (Angular), Cisco real-time, Compliance

**If you go blank:** *"Microsoft wants proof you make others better. Adobe wants proof you make things fast and beautiful. Salesforce wants proof you understand platform constraints. Cisco wants proof you've built real-time systems under pressure."*

---

## 7. Why & How Summary

**Why it matters:**
→ Generic interview preparation fails. Calibrating your answers, examples, and depth to each company's specific priorities is the difference between a "strong hire" and "doesn't fit our bar." Companies reject otherwise-qualified candidates because their examples don't resonate with the interviewer's product context.

**How to use this:**
→ For each application, identify the 3 core technical priorities from the table above. Map 2-3 stories from your experience directly to those priorities. Prepare 1 company-specific technical deep-dive (LWC for Salesforce, Canvas for Adobe, Angular for Cisco, TypeScript for Microsoft).

**Company relevance:**
→ This topic IS your specific preparation framework. Every other topic in this index should be mentally tagged with "Critical for X company" based on the table above.
