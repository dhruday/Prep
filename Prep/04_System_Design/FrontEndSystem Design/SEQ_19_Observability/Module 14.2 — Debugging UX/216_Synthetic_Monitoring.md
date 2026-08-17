# 216 – Synthetic Monitoring — Uptime Checks, Canary Flows

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Synthetic monitoring uses **automated, scripted tests** that run on a schedule from multiple geographic locations to simulate real user interactions — page loads, login flows, checkout sequences, API calls — and measure availability, performance, and correctness **before real users are affected**. Unlike Real User Monitoring (RUM) which captures data from actual users passively, synthetic monitoring is **proactive**: it creates artificial traffic on a fixed schedule (every 1-5 minutes) regardless of whether real users are visiting. The two primary use cases are **uptime monitoring** (is the site reachable?) and **canary flows** (does the critical user journey still work end-to-end?). At FAANG scale, synthetic monitors form the foundation of SLO measurement and on-call alerting.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Architecture & Types of Synthetic Monitoring

**Three Tiers:**

| Tier | What It Tests | Tool Example | Frequency |
|------|--------------|--------------|-----------|
| **Uptime/Ping** | Is the URL reachable? HTTP 200? | Pingdom, UptimeRobot | Every 1 min |
| **API Monitor** | Does the endpoint return correct data? | Checkly, Datadog Synthetics | Every 5 min |
| **Browser Monitor** | Does the full user flow work? | Playwright + Checkly, Datadog Browser Tests | Every 15 min |

**Architecture:**

```
Synthetic Runner (multiple regions: US, EU, APAC)
        ↓
Executes script (Playwright / Puppeteer / HTTP request)
        ↓
Collects: response time, status code, screenshots, HAR, errors
        ↓
Compares against assertions (status = 200, LCP < 2.5s, form submission success)
        ↓
If failed → Alert (PagerDuty, Slack, Email)
        ↓
Results stored → Dashboard (Grafana, Datadog, Checkly)
```

### Browser Internals

**What Synthetic Browser Monitors Actually Do:**
- Launch a headless browser (Chromium via Playwright/Puppeteer) in a clean profile
- Navigate to the target URL with no cache, no cookies (cold start)
- Execute scripted interactions: click buttons, fill forms, wait for elements
- Capture Performance API metrics: TTFB, FCP, LCP, CLS
- Take screenshots at key steps (visual regression baseline)
- Record HAR (HTTP Archive) for network waterfall analysis
- Assert on conditions: element visible, text content matches, no console errors

**Critical difference from RUM:**
Synthetic monitors always test **cold cache** (no returning user cache). This means synthetic LCP will always be higher than RUM LCP for returning users. This doesn't mean the synthetic is wrong — it's testing the worst case.

### Data Flow & State Flow

```
Checkly / Synthetic Runner (cron: */5 * * * *)
    ↓
[Region: us-east-1] Launch Playwright
    ↓
Navigate to https://app.yourcompany.com/login
    ↓
Fill email → Fill password → Click "Sign In"
    ↓
Wait for dashboard element (#main-dashboard)
    ↓
Assert: element visible within 5s
Assert: LCP < 3000ms
Assert: no console.error
    ↓
PASS → record metrics (response_time: 2340ms)
FAIL → HTTP 500 → Alert: PagerDuty incident created
```

### Performance Implications

- Synthetic monitors **do not impact production performance** — they're just another HTTP client
- But: high-frequency synthetic checks can show up in analytics — exclude synthetic user agents
- Synthetic tests should use a dedicated `X-Synthetic: true` header so load balancers and analytics can filter them

### Scalability Considerations

- Run from 5+ geographic regions to detect regional outages
- Stagger check intervals to avoid all regions hitting the same endpoint simultaneously
- For SLO calculation: `uptime = successful_checks / total_checks * 100` — 99.9% SLO requires < 525 minutes downtime/year

### Trade-offs

| Synthetic Monitoring | Real User Monitoring (RUM) |
|----------------------|---------------------------|
| Proactive — detects issues before users | Reactive — only captures data when users visit |
| Consistent baseline (cold cache, controlled env) | Real-world diversity (devices, networks, geography) |
| Tests specific flows | Captures all user behaviors |
| Limited to scripted scenarios | Captures unexpected edge cases |
| Works 24/7 even with no traffic | No data when no users (off-hours, new apps) |
| Fixed cost (per check per region) | Cost scales with user volume |

**Best practice:** Use BOTH. Synthetic for 24/7 availability SLO, RUM for real user experience data.

### Anti-Patterns & Pitfalls

- ❌ **Only testing the homepage** — critical flows (login, checkout, data submission) break silently
- ❌ **Testing only from one region** — CDN misconfigurations and regional outages are invisible
- ❌ **No alerting on synthetic failures** — a synthetic monitor without alerts is just data collection
- ❌ **Ignoring flaky synthetic tests** — a test that fails intermittently indicates a real reliability issue (race condition, slow third-party)
- ❌ **Testing against staging, not production** — staging doesn't catch CDN, DNS, or edge cache issues
- ❌ **Not excluding synthetic traffic from analytics** — inflates page view counts and distorts RUM metrics

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### FAANG-Scale: Microsoft 365

Microsoft runs synthetic monitors for every Office 365 app (Teams, Outlook, OneDrive) from 25+ Azure regions worldwide. Every 60 seconds, a synthetic test logs into Teams, sends a message, and verifies delivery. If the test fails in 2+ regions, an incident is automatically created and the on-call engineer is paged. This is how Microsoft achieves their 99.9% SLA.

### FAANG-Scale: Google

Google uses internal synthetic monitoring (called "probers") that test every Google service every 30 seconds from every data center. Search, Gmail, YouTube — all have probers that verify end-to-end functionality. The prober results are the primary input to Google's SLO dashboards.

### Hruday @ SAP Labs — Fiori Launchpad Synthetic Checks

At SAP, we set up Checkly monitors for the Fiori Launchpad login flow and critical Fiori apps. The synthetic test navigated to the Launchpad, authenticated via SSO, opened a specific Fiori app (Invoice Management), and verified the data table loaded within 5 seconds. We ran this from 3 regions (EU, US-East, APAC) every 10 minutes. When an S/4HANA backend migration caused a 30-second response time regression, the synthetic alert fired at 3 AM — before any users in that time zone were affected.

### Hruday @ Bosch — Dashboard Uptime SLO

At Bosch, the real-time manufacturing dashboard had a 99.5% uptime SLO. We used a combination of HTTP ping checks (every 1 minute) and a Playwright canary flow that logged in + verified WebSocket connection. The WebSocket canary caught a certificate expiry issue 4 hours before it would have affected factory operators.

### Scaling:

- **Small app**: UptimeRobot free tier — 5-minute HTTP pings from 3 locations
- **Growing app**: Checkly with Playwright browser checks — 5 critical flows, 5 regions, every 10 minutes
- **Enterprise**: Datadog Synthetics or Grafana Synthetic Monitoring — 50+ checks, 15+ regions, API + browser, integrated with PagerDuty and SLO dashboards

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer (7+ years experience)

*"Synthetic monitoring is proactive observability — scripted tests run on a schedule from multiple regions to simulate real user interactions and detect issues before real users are affected. I use three tiers: HTTP ping checks every 1 minute for uptime SLO, API monitors every 5 minutes for data correctness, and Playwright browser tests every 10-15 minutes for critical user journeys.*

*The key difference from RUM: synthetic monitoring works 24/7 even with zero user traffic, uses a cold cache baseline, and tests from controlled environments. RUM captures real-world diversity but only when users visit. I use both — synthetic for SLO measurement and alerting, RUM for real user experience analysis.*

*At SAP, our Checkly Playwright monitor tested the Fiori Launchpad login → app open → data table load flow from 3 regions. When a backend migration caused a 30-second response regression at 3 AM, the synthetic alert fired immediately — no user was impacted because we rolled back before business hours."*

### Likely Follow-up Questions

1. **"How do you calculate SLO from synthetic data?"** — `availability = successful_checks / total_checks`. For 99.9% SLO with 1-minute intervals, you can have at most 525 failed checks per year.
2. **"How do you handle flaky synthetic tests?"** — Retry once before alerting. If flakiness persists, the test is revealing a real reliability issue (race condition, slow third-party script).
3. **"Synthetic vs RUM — which is more important?"** — Both. Synthetic for 24/7 proactive alerting, RUM for real user experience data. Synthetic is the SLO source of truth.
4. **"How do you avoid synthetic traffic polluting analytics?"** — Set `X-Synthetic: true` header and filter by user agent. Exclude from Google Analytics and RUM dashboards.
5. **"What flows should be synthetic-tested?"** — Login, core business flow (checkout, data submission), any flow with an SLA commitment, and any flow that broke in the past.

### Comparison With Alternatives

| Feature | Checkly | Datadog Synthetics | Grafana Synthetic | UptimeRobot |
|---------|---------|-------------------|-------------------|-------------|
| Browser tests | Playwright | Proprietary | k6 browser | No |
| API tests | Yes | Yes | Yes | HTTP only |
| Regions | 20+ | 30+ | 15+ | 10 |
| SLO integration | Prometheus | Built-in | Grafana native | No |
| Cost | $$ | $$$$ | $ (open source) | Free tier |
| Alerting | Slack, PagerDuty | Built-in | Grafana Alerting | Email, Slack |

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Checkly + Playwright — Synthetic Monitor for Login Flow
// This runs every 10 minutes from 5 regions

import { test, expect } from '@playwright/test';

// Canary flow: Login → Dashboard → Verify Data
test('Fiori Launchpad Login Flow', async ({ page }) => {
  // Step 1: Navigate (measures TTFB, FCP, LCP)
  const startTime = Date.now();
  await page.goto('https://launchpad.yourcompany.com', {
    waitUntil: 'domcontentloaded',
    timeout: 15000,
  });

  // Step 2: SSO Login
  await page.fill('#username', process.env.SYNTHETIC_USER!);
  await page.fill('#password', process.env.SYNTHETIC_PASS!);
  await page.click('#login-button');

  // Step 3: Wait for dashboard
  await expect(page.locator('#main-dashboard')).toBeVisible({
    timeout: 10000,
  });

  // Step 4: Open Invoice Management App
  await page.click('[data-app-id="invoice-management"]');
  await expect(page.locator('.invoice-table')).toBeVisible({
    timeout: 8000,
  });

  // Step 5: Verify data loaded (not empty state)
  const rowCount = await page.locator('.invoice-table tr').count();
  expect(rowCount).toBeGreaterThan(1);

  // Step 6: Performance assertion
  const loadTime = Date.now() - startTime;
  expect(loadTime).toBeLessThan(12000); // Full flow < 12s

  // Step 7: No console errors
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  expect(errors).toHaveLength(0);
});

// Checkly configuration (checkly.config.ts)
export default {
  checks: [{
    name: 'Fiori Launchpad Login',
    frequency: 10,           // Every 10 minutes
    locations: ['us-east-1', 'eu-west-1', 'ap-southeast-1', 'us-west-2', 'eu-central-1'],
    alertChannels: ['pagerduty-frontend-oncall', 'slack-frontend-alerts'],
    retries: 1,              // Retry once before alerting
    degradedResponseTime: 8000,  // Warning at 8s
    maxResponseTime: 15000,      // Critical at 15s
  }],
};

// SLO calculation from synthetic results
// availability = (total_checks - failed_checks) / total_checks * 100
// 10-min interval, 5 regions = 720 checks/day
// 99.9% SLO = max 0.72 failures/day = ~5 failures/week
```

**Why this structure:**
- Tests the full critical path (login → navigate → verify data) — not just uptime
- Runs from 5 regions to detect geo-specific issues
- Retries once before alerting to reduce noise from transient network issues
- Asserts on performance (< 12s), data correctness (rows > 1), and no console errors
- Uses environment variables for credentials — never hardcoded

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Synthetic = your app's heartbeat monitor."** It runs 24/7 whether users visit or not. Three tiers: **Ping** (is it up?), **API** (is data correct?), **Browser** (does the flow work?). The key interview phrases: "I use synthetic monitoring for **proactive** SLO measurement and alerting, complemented by RUM for real user experience data." Remember: always test from **multiple regions**, always **alert on failure**, and always **test critical flows, not just the homepage**.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why it matters:**
→ Without synthetic monitoring, outages are discovered by users — not by your engineering team. This is the difference between a 5-minute MTTR and a 45-minute MTTR. Synthetic monitors also provide the objective data for SLO/SLA compliance reporting.

**How it works:**
→ Automated scripts (Playwright, Puppeteer, or HTTP requests) execute on a fixed schedule (every 1-15 minutes) from multiple geographic regions. Each execution simulates a user interaction, captures performance metrics (TTFB, LCP, total load time), asserts on success criteria, and alerts on failure. Results feed into SLO dashboards.

**Company relevance:**
→ **Microsoft**: Azure Monitor Application Insights has built-in availability tests (URL ping + multi-step web tests). Microsoft expects senior engineers to set up synthetic monitoring for critical flows.
→ **Cisco**: Cisco ThousandEyes is literally a synthetic monitoring product — Cisco acquired ThousandEyes for $1B. Expect deep questions about synthetic monitoring architecture.
→ **Adobe**: Adobe Experience Platform uses synthetic canary tests for every major release — synthetic results gate production deployments.
→ **Salesforce**: Salesforce Trust (trust.salesforce.com) uses synthetic monitoring to publish real-time availability for every Salesforce cloud instance.
