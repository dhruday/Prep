# Why the Lighthouse Score Was 60 — What Was Broken
> Part 23 — SAP BI Launchpad Project Deep Dive · Module 23.2: The Performance Story
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **The score was 60 because of four problems, each compounding the others**: (1) all micro-frontend modules loaded upfront even if the user would never visit them; (2) no code splitting in the shell — one giant bundle; (3) images in wrong format (PNG/JPEG instead of WebP/AVIF) and no lazy loading below the fold; (4) render-blocking JavaScript — scripts loaded synchronously in `<head>` before the browser could paint anything
- **LCP (Largest Contentful Paint) was 6.2 seconds** — users stared at a blank white screen for over 6 seconds before anything meaningful appeared; this is the primary signal interviewers care about
- **TTI (Time to Interactive) was 8.1 seconds** — even after the page showed content, buttons and dropdowns didn't respond for another 2 seconds while the JavaScript parsed and executed
- **Bundle size was 2.1 MB (minified)** on the initial load — four module bundles all loaded at once; on a 4G connection, that alone takes 2–3 seconds to transfer before any parsing
- **The root cause summary**: the architecture had four micro-frontends but was loading all four upfront — defeating the independence benefit of micro-frontends; it was a micro-frontend in structure but a monolith in loading behaviour
- **What made this fixable**: Module Federation's `React.lazy` + `Suspense` pattern makes lazy loading each module a one-line change per route; no rewrite needed

---

## 1. One-Line Definition
The Lighthouse score was 60 because the micro-frontend architecture loaded all four module bundles on startup — behaving like a monolith in loading despite being distributed in structure — combined with unoptimised images and render-blocking scripts.

---

## 2. What Was Actually Broken — Be Specific

Lighthouse gives a score between 0 and 100. It measures five metrics: FCP (First Contentful Paint), LCP (Largest Contentful Paint), TTI (Time to Interactive), TBT (Total Blocking Time), and CLS (Cumulative Layout Shift). A score of 60 means most users had a poor experience by measurable standards.

Here is what was wrong specifically:

### Problem 1: All Modules Loaded Upfront (Biggest Impact)

```
BEFORE — All four module bundles fetched on app load

Browser loads shell → fetches:
  shell.bundle.js          → 380 KB
  reportModule.bundle.js   → 520 KB  ← User is on /dashboard, won't visit reports
  dashboardModule.bundle.js → 440 KB
  analyticsModule.bundle.js → 510 KB ← User may never visit analytics
  adminModule.bundle.js    → 250 KB

Total: 2.1 MB on every page load, regardless of which route the user visits

LCP impact: user on /dashboard still downloads 1.28 MB of code they don't need
Bundle parse time: 2.1 MB of JavaScript = ~1.8s of CPU time just to parse it
```

### Problem 2: No Code Splitting in the Shell

```
Shell code structure (before code splitting):
  DispatcherServlet, Routes, Nav, Auth, Formatters, Utilities, Validators,
  i18n strings for all 12 languages... all in one bundle

One file: shell.bundle.js 380 KB
  → All of it must download and parse before the first paint
  → Language files for Japanese, Arabic, Hebrew loaded even for English users
```

### Problem 3: Unoptimised Images

```
Dashboard header image:
  Before: hero-image.png — 1.2 MB, 2400×1200px
  No compression. No responsive sizes. Loaded immediately (in viewport).
  LCP candidate: the largest visible image is the LCP element
  → This image alone delayed LCP by ~1.5 seconds on average connections

Report thumbnails (below fold):
  12 PNG thumbnails loaded eagerly
  → Networks request fired immediately on page load for images user hasn't scrolled to yet
  → Competing with above-fold content for bandwidth
```

### Problem 4: Render-Blocking Scripts

```html
<!-- ❌ Before: scripts in <head> without defer/async -->
<head>
  <script src="/shell.bundle.js"></script>        <!-- blocks HTML parsing -->
  <script src="/reportModule.bundle.js"></script> <!-- blocks HTML parsing -->
  <!-- Browser cannot paint ANYTHING until these scripts download and execute -->
</head>
```

---

## 3. The Numbers — Before State

```
BEFORE — Lighthouse Audit Results

Performance Score: 60 / 100

FCP  (First Contentful Paint):    3.8 seconds   (target: < 1.8s)
LCP  (Largest Contentful Paint):  6.2 seconds   (target: < 2.5s)
TTI  (Time to Interactive):       8.1 seconds   (target: < 3.8s)
TBT  (Total Blocking Time):       2,300 ms      (target: < 200ms)
CLS  (Cumulative Layout Shift):   0.12          (target: < 0.1)

Network — Initial Load:
  Total JS transferred: 2.1 MB
  Total JS parsed by browser CPU: 2.1 MB
  Number of requests on initial load: 47
  Time to download bundles (4G): 2.7 seconds
  Time to parse (mid-range phone): 1.8 seconds

User Impact:
  6.2 second LCP → ~35% of users would bounce before content appeared (Google data)
  8.1 second TTI → users click buttons, nothing happens, think site is broken
```

---

## 4. Wrong Way vs Right Way — Diagnosis

```javascript
// ❌ The original shell routing — all modules loaded upfront (static import)
import { ReportModule } from 'reportModule/ReportModule';       // loaded immediately
import { DashboardModule } from 'dashboardModule/DashboardModule'; // loaded immediately
import { AnalyticsModule } from 'analyticsModule/AnalyticsModule'; // loaded immediately
import { AdminModule } from 'adminModule/AdminModule';             // loaded immediately

function App() {
  return (
    <Routes>
      <Route path="/reports/*"    element={<ReportModule />} />
      <Route path="/dashboards/*" element={<DashboardModule />} />
      <Route path="/analytics/*"  element={<AnalyticsModule />} />
      <Route path="/admin/*"      element={<AdminModule />} />
    </Routes>
  );
}
```

> **Why this fails in production:** Every user downloads all four module bundles on every page load, even if they only ever use one module. 4 teams' worth of JavaScript = 4× the transfer time, parse time, and execution time.

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Why was the Lighthouse score at 60? What was the root cause?"

**Hruday's answer:**
> "The root cause was that we had a micro-frontend architecture that was behaving like a monolith at loading time. We had four separate module bundles built by four teams — excellent for development independence — but the shell was loading all four bundles upfront on every page request, regardless of which route the user was visiting. A user on the dashboard page was downloading the Reports module, the Analytics module, and the Admin module — 1.28 MB of JavaScript they would never use in that session. Combined with render-blocking script tags in the head, unoptimised images above the fold, and no code splitting in the shell itself, we were delivering 2.1 MB of JavaScript before users could interact. The LCP was 6.2 seconds. At that number, Google's own research says roughly 35% of users abandon the page. For an enterprise product used by business analysts who need to generate reports quickly, that was a real productivity problem."

---

### Q2 — Deep Dive
**Interviewer asks:** "What is LCP and why does it matter more than total page load time?"

**Hruday's answer:**
> "LCP is Largest Contentful Paint — the moment when the largest visible element in the viewport has finished rendering. In our case that was the hero dashboard header image. LCP is Google's proxy for 'when does the user perceive the page is useful?' Total page load time includes all background resources, scripts, and analytics — a lot of which the user doesn't see. LCP focuses on what the user actually sees first. A page can have a 12-second total load time but a 1.2-second LCP, and the user will feel it as fast because the main content appeared quickly. Inversely — our case — total load time looked reasonable but LCP was 6.2 seconds because the LCP element (the hero image) was a 1.2 MB uncompressed PNG that loaded synchronously. LCP is also one of Google's Core Web Vitals, which means it directly affects search ranking. For an enterprise B2B product, SEO is less critical — but Google also uses these metrics in their user experience score for ads and partner products. LCP below 2.5 seconds is the target."

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Score was low" | "Lighthouse score was 60" with no detail | Name the specific metric: "LCP was 6.2 seconds; TTI was 8.1 seconds" — numbers signal you actually ran the audit |
| Vague root cause | "The app was slow" | "All four module bundles loaded upfront — 2.1 MB of JavaScript on every page load regardless of which route the user visited" |
| Miss the user impact | Only cite the score | "At 6.2 seconds LCP, roughly a third of users would abandon before content appeared — that's a real business metric, not just a developer vanity score" |
| Skip the render-blocking detail | Don't mention `<head>` scripts | "Scripts in `<head>` without `defer` block HTML parsing — browser can't paint anything until they download and execute" |

---

## 7. Hruday's Real Experience Hook

> "Running Lighthouse and seeing 60 was the start of the work. The interesting part was tracing the low LCP to the bundle loading strategy — not to slow server responses, not to database queries, but to a architecture decision in the shell that we hadn't questioned. The fix required changing how the shell loaded modules and changing how asset management was configured. Neither was a one-line change but both were in clear categories once we understood the root cause."

---

## 8. Scale Evolution

**1,000 users →** A 60 score means ~350 users had a poor first experience every day. Manageable only because it's an internal enterprise product — external users would leave immediately.

**100,000 users →** At that scale, a 6.2s LCP means the equivalent of thousands of person-hours lost per week to waiting. CDN and lazy loading are not optional at this scale.

**10 million users →** At this scale, Google Core Web Vitals affect your ad quality score and partnership eligibility. Anything above 2.5s LCP is a revenue problem, not just a UX problem.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment dashboard performance is a key differentiator; slow dashboard means merchants switch | LCP + TTI numbers; bundle analysis; micro-frontend lazy loading |
| Swiggy / Meesho | Mobile-first consumers; 3G in tier-2 cities; 2.1 MB JS is catastrophic on low bandwidth | Bundlephobia analysis; code splitting; WebP images; network-aware loading |
| Adobe / Microsoft | Enterprise SaaS — users pay for the product; sub-standard performance is a support ticket and churn risk | Lighthouse CI in pipeline; regressions caught before prod |
| SAP Labs | You fixed this — you own the before/after numbers, the root cause analysis, and the fix | Credible, specific, defensible: "LCP 6.2s → 3.4s, TTI 8.1s → 4.4s, bundle 2.1MB → 780KB" |

---

## 10. Related Topics — What to Study Next

- **Exact fixes** — [393] all the code changes that moved the score from 60 to 95
- **The numbers with business impact** — [394] how to explain the 45% improvement to both technical and non-technical interviewers
- **Core Web Vitals** — topic 234; the theoretical foundation for LCP, CLS, INP
- **Code splitting and lazy loading** — topic 235; the general pattern that the micro-frontend fix applied
- **Bundle optimisation** — topic 236; tree shaking and webpack-bundle-analyzer usage

---

*Part 23 · Why the Lighthouse Score Was 60 — What Was Broken · Full Stack Interview Guide · Hruday D · 2026*
