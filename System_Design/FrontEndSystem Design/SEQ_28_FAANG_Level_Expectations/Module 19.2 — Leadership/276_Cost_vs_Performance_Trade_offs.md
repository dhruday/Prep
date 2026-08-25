# 276 – Cost vs Performance Trade-offs at Scale

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

At scale, every frontend decision has a cost dimension — CDN bandwidth, server-side rendering compute, third-party library licenses, bundle size affecting user data costs, and engineering time. Senior engineers optimize for performance without considering cost. **Staff engineers optimize for the right balance** — sometimes a 2% performance improvement isn't worth 3x the infrastructure cost. In interviews, showing cost awareness signals business maturity and production ownership.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Cost Categories in Frontend

```
INFRASTRUCTURE:
├── CDN bandwidth (CloudFront, Akamai) — per GB transferred
├── SSR compute (Vercel, AWS Lambda) — per request/duration
├── Edge functions — per invocation
└── Build pipeline — CI/CD compute minutes

BUNDLE SIZE → USER COST:
├── Large JS = more data usage = cost to mobile users
├── Heavy images = CDN bandwidth + user data
└── Third-party scripts = hidden performance + data cost

ENGINEERING TIME:
├── Complex architecture = more maintenance hours
├── Custom solutions vs battle-tested libraries
└── Migration cost of switching technologies
```

### Trade-off Examples

**SSR Cost vs Performance:**
```
CSR: $0 server cost (static hosting) + slower FCP
SSR: $500-5000/mo server cost + faster FCP + SEO

Decision: Use SSR only for public pages (marketing, SEO-critical).
          Use CSR for authenticated dashboard (no SEO, save server cost).
```

**Image Optimization Cost:**
```
No optimization: Free, but 5MB page weight
Client-side compression: Free (runs in browser), CPU cost
CDN image service (Cloudinary): $99/mo, automatic optimization
Self-hosted sharp/libvips: DevOps setup cost, $50/mo compute

Decision: For <10K images, CDN service (Cloudinary).
          For >100K images, self-hosted with CDN caching.
```

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs
At SAP, I evaluated the cost of micro-frontend infrastructure (Module Federation + shared shell deployment) against the benefit (independent team deployments, faster builds). The infrastructure cost was justified when teams exceeded 4 — below that, a monolith was cheaper.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"I consider cost alongside performance at every scale decision. At SAP, I justified micro-frontend infrastructure cost when we exceeded 4 teams — below that, a monolith was cheaper. I categorize costs: infrastructure (CDN, SSR compute), user cost (bundle size → mobile data), and engineering cost (complexity → maintenance). The right answer is the cheapest solution that meets the performance requirements."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Cost-aware architecture decision
const renderingDecision = {
  publicPages: {
    strategy: 'SSG',
    cost: 'Near-zero (static CDN hosting)',
    performance: 'Fastest — pre-built HTML',
    tradeOff: 'Stale until rebuild; use ISR for freshness',
  },
  dashboard: {
    strategy: 'CSR',
    cost: 'Zero server cost (S3 + CloudFront)',
    performance: 'Slower FCP, but fine for authenticated users',
    tradeOff: 'No SEO, but dashboard doesn\'t need it',
  },
  ecommerce: {
    strategy: 'SSR with caching',
    cost: '$200-500/mo Lambda + CloudFront',
    performance: 'Fast FCP + SEO + personalization',
    tradeOff: 'Server cost, but ROI is clear (SEO → revenue)',
  },
};
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Cost-aware = Infrastructure cost + User cost + Engineering cost."** Don't always go for max performance — find the cheapest solution that meets requirements. SSG > CSR > SSR in cost terms. Show cost awareness in interviews to signal business maturity.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Cost awareness signals staff-level business maturity. Pure performance focus is mid-level thinking.
**How:** Evaluate three cost dimensions: infrastructure, user data, engineering time. Choose the cheapest option that meets performance NFRs.
**Companies:** All four value cost-conscious engineering. Adobe and Cisco especially track cloud costs.
