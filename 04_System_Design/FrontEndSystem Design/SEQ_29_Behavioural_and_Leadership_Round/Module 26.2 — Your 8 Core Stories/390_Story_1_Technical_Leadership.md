# 390 – Story 1: Technical Leadership — SAP Performance Optimization

────────────────────────────────────────────────────────────

## STAR Story

**SITUATION:** At SAP, our Fiori-based enterprise dashboard served 500+ enterprise clients. The Lighthouse performance score was 60, page load was 4.2s, and we were receiving escalations from key accounts threatening churn.

**TASK:** As the frontend technical lead of a 4-person team, I owned the performance optimization initiative with a 6-week deadline before the quarterly business review with our largest client.

**ACTION:**
1. **Audited** the app with Lighthouse, Chrome DevTools Performance panel, and webpack-bundle-analyzer — identified 3 root causes: unoptimized images (2.5MB), render-blocking CSS (800KB), and excessive re-renders (Default CD on 40+ components)
2. **Implemented lazy loading** for 5 below-fold feature modules, reducing initial bundle from 800KB to 200KB
3. **Migrated 15 key components** to OnPush change detection with trackBy on all ngFor directives
4. **Converted images** to WebP with responsive srcset and implemented intersection-observer lazy loading
5. **Set up Lighthouse CI** in the GitHub Actions pipeline — PRs blocked if score dropped below 90
6. **Created a performance playbook** documenting patterns for the team

**RESULT:**
- Lighthouse score: 60 → 95 (+58%)
- Page load: 4.2s → 1.1s (-74%)
- Zero client escalations in subsequent 2 quarters
- Lighthouse CI approach adopted by 3 other SAP product teams
- Promoted to senior developer based on this initiative

---

### Maps To Questions
- "Tell me about a time you showed technical leadership"
- "Describe a project you're most proud of"
- "Tell me about improving something that wasn't asked of you"
- "How do you handle performance issues?"

### Follow-Up Prep
- **"What was the hardest part?"** → Getting buy-in to prioritize perf over features for 6 weeks
- **"Any pushback?"** → PM wanted new features instead; I presented client churn data
- **"What would you do differently?"** → Set up Lighthouse CI from day one, not after the crisis
