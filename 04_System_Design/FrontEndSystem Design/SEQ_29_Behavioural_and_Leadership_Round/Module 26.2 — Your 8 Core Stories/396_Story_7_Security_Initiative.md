# 396 – Story 7: Security Initiative — Reducing Vulnerabilities

────────────────────────────────────────────────────────────

## STAR Story

**SITUATION:** At SAP, a security audit revealed multiple frontend vulnerabilities in our Fiori dashboard: XSS risks in user-generated content rendering, exposed API keys in client-side code, insufficient CSP headers, and no input sanitization on forms.

**TASK:** As frontend lead, I was responsible for remediating all critical and major security findings within the sprint and establishing ongoing security practices.

**ACTION:**
1. **Triaged findings** — categorized 25 issues by severity: 5 critical (XSS), 10 major (auth tokens), 10 minor (CSP gaps)
2. **XSS remediation** — replaced all `innerHTML`/`bypassSecurityTrustHtml` usage with Angular's built-in sanitizer, implemented DOMPurify for user-generated content that needed rich HTML
3. **Secret management** — moved all API keys to server-side proxy, implemented environment-based config injection at build time (not runtime exposure)
4. **CSP headers** — implemented strict Content Security Policy headers blocking inline scripts, restricting font/image sources
5. **Input validation** — added server-side validation mirror on frontend using Zod schemas shared between frontend and BFF
6. **Automated security checks** — integrated `npm audit` and Snyk into CI pipeline, blocking merges with high/critical vulnerabilities
7. **Security training** — led a team workshop on OWASP Top 10 for frontend developers

**RESULT:**
- Security vulnerabilities: reduced 80% (25 → 5 minor remaining)
- Zero critical/major findings in next 3 security audits
- CSP header template adopted org-wide
- Snyk integration prevented 12 vulnerable dependency upgrades in the next quarter
- Recognized by security team as frontend security champion

---

### Maps To Questions
- "Tell me about improving security"
- "How do you handle security vulnerabilities?"
- "Describe a time you improved code quality"
- "Tell me about proactive risk mitigation"

### Follow-Up Prep
- **"How did you prioritize security vs. features?"** → Framed security as a feature — client trust is a product requirement
- **"What about ongoing maintenance?"** → Automated checks in CI + quarterly audit rhythm
