# 281 – Privacy & GDPR in Frontend

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Frontend engineers are on the **front line of privacy** — they handle consent banners, cookie management, data collection through analytics, local storage of PII, and third-party script loading. GDPR (EU), CCPA (California), and other regulations require: **(1) Explicit consent** before data collection, **(2) Right to deletion**, **(3) Data minimization**, and **(4) Purpose limitation**. In interviews, mentioning privacy awareness shows production maturity and awareness of legal compliance requirements.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Frontend Privacy Responsibilities

```
1. CONSENT MANAGEMENT:
   - Cookie consent banner before loading analytics/tracking scripts
   - Granular consent: essential vs analytics vs marketing
   - Respect 'Do Not Track' browser signal
   - Store consent preferences, allow revocation

2. DATA COLLECTION:
   - Only collect what you need (data minimization)
   - Don't log PII in console.log / error reporting
   - Sanitize Sentry events to remove PII
   - Don't store sensitive data in localStorage (use httpOnly cookies)

3. THIRD-PARTY SCRIPTS:
   - Load only after consent (analytics, ads, social)
   - Essential scripts can load without consent (auth, core features)
   - Review third-party script data practices

4. RIGHT TO DELETION:
   - Clear localStorage, sessionStorage, IndexedDB
   - Delete cookies
   - API call to backend for server-side deletion
```

### GDPR vs CCPA Key Differences

| Aspect | GDPR (EU) | CCPA (California) |
|--------|-----------|-------------------|
| Consent | Opt-in required | Opt-out allowed |
| Scope | All EU residents | CA consumers + businesses > $25M |
| Fines | Up to 4% global revenue | $7,500 per violation |
| Right to delete | Yes | Yes |

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs
At SAP, our enterprise applications handled sensitive business data. I implemented: cookie consent management, PII scrubbing from Sentry error reports, and ensured localStorage never contained personally identifiable information. This was part of our SOC2 and GDPR compliance requirements.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"Frontend is the front line of privacy. I ensure: consent before loading analytics scripts (cookie consent banner), PII scrubbing from error reports (Sentry beforeSend), no sensitive data in localStorage (use httpOnly cookies instead), and data minimization in analytics events. At SAP, this was part of our GDPR and SOC2 compliance. I treat privacy as a non-functional requirement in every system design."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Privacy-aware Sentry configuration — scrub PII
Sentry.init({
  beforeSend(event) {
    // Remove PII from error events
    if (event.request?.cookies) delete event.request.cookies;
    if (event.request?.headers) delete event.request.headers['authorization'];
    if (event.user) {
      event.user = { id: event.user.id }; // keep ID, remove email/name
    }
    return event;
  },
});

// Consent-aware analytics loading
function loadAnalytics() {
  const consent = getConsentPreferences();
  if (consent.analytics) {
    // Only load after explicit consent
    const script = document.createElement('script');
    script.src = 'https://analytics.example.com/track.js';
    script.async = true;
    document.head.appendChild(script);
  }
}
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Privacy = Consent first + PII scrubbing + No PII in localStorage + Data minimization."** GDPR = opt-in, CCPA = opt-out. Load analytics only after consent. Scrub PII from Sentry. Use httpOnly cookies, not localStorage for sensitive data.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Privacy non-compliance = massive fines (4% global revenue under GDPR). Frontend engineers directly handle user data.
**How:** Cookie consent, PII scrubbing, secure storage, third-party script gating, data minimization.
**Companies:** All four must comply. **Salesforce** (Trust core value), **Microsoft** (compliance-heavy), **Adobe** (handles creative assets), **Cisco** (enterprise security).
