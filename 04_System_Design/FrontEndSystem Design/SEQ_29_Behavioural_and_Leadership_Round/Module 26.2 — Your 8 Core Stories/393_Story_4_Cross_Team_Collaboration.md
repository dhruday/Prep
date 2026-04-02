# 393 – Story 4: Cross-Team Collaboration — Accessibility Initiative

────────────────────────────────────────────────────────────

## STAR Story

**SITUATION:** At SAP, we received a mandate from the VP of Engineering: all customer-facing products must achieve WCAG AA compliance within 3 months. No team had accessibility expertise, and the existing codebase had zero accessibility testing.

**TASK:** I volunteered to lead the cross-team accessibility initiative, coordinating across 3 frontend teams (12 developers total) while continuing my regular feature work.

**ACTION:**
1. **Assessed the gap** — ran axe-core audits across all 3 products, found 200+ violations prioritized by severity (30 critical, 80 major, 90+ minor)
2. **Upskilled the team** — organized 3 lunch-and-learn sessions on WCAG AA, screen reader testing (NVDA/VoiceOver), and semantic HTML
3. **Created an accessibility component library** — reusable accessible components (modals, dropdowns, forms) that teams could drop in
4. **Distributed ownership** — assigned violation categories to each team (forms to Team A, navigation to Team B, media to Team C)
5. **Set up automated checks** — integrated axe-core into the CI pipeline, blocking PRs with new critical violations
6. **Facilitated weekly syncs** — 30-minute cross-team standup to unblock issues and share patterns

**RESULT:**
- WCAG AA compliance: 0% → 100% across all 3 products (2 weeks ahead of deadline)
- Accessible component library reused in 5+ future projects
- Zero accessibility-related client complaints post-launch
- Recognized in the engineering all-hands for cross-team impact
- Built lasting relationships with engineers across teams

---

### Maps To Questions
- "Tell me about cross-team collaboration"
- "Describe a time you led without formal authority"
- "How do you handle competing priorities?"
- "Tell me about an initiative you started"

### Follow-Up Prep
- **"How did you manage your regular workload?"** → Negotiated with PM to defer 1 low-priority feature; worked ~10% extra for those 3 months
- **"What if a team wasn't cooperating?"** → Focused on making it easy — pre-built components, pair programming sessions
