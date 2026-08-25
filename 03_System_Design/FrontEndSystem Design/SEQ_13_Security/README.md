# PART 1️⃣2️⃣ — Security

## 📖 Overview

Security is **non-negotiable** in modern web applications. This section covers web threats (XSS, CSRF, CORS), authentication flows, token management, and UI hardening techniques. Understanding these topics is critical for senior+ frontend interviews at FAANG companies.

## 🎯 Why This Matters

**Business Impact**:
- **Equifax (2017)**: 147M user records compromised, $700M settlement
- **Capital One (2019)**: 100M users affected, $80M fine
- **Auth0**: Security-first approach enabled $6.5B acquisition

**Interview Reality**:
- "How do you prevent XSS attacks?"
- "Explain JWT vs session-based auth."
- "Where do you store authentication tokens?"
- "How does CORS work?"
- "Design a secure login flow."

---

## 📚 Module Breakdown

### 🔐 Module 12.1: Web Threats
**Focus**: XSS, CSRF, CORS - the fundamental web security threats

**Files**:
- `124_XSS.md` - Cross-Site Scripting attacks and prevention
- `125_CSRF.md` - Cross-Site Request Forgery protection
- `126_CORS.md` - Cross-Origin Resource Sharing policies
- `174_Prototype_Pollution.md` - Prototype chain manipulation attacks
- `175_Supply_Chain_Attacks.md` - npm/dependency security threats

**Key Concepts**:
- XSS: Stored, Reflected, DOM-based
- CSRF: Token-based protection, SameSite cookies
- CORS: Preflight requests, credential handling
- Prototype Pollution: __proto__ manipulation, safe merge patterns
- Supply Chain: npm audit, lockfile integrity, CI/CD pipeline security

**Interview Relevance**: 🔥🔥🔥🔥🔥
These are the most commonly asked security questions.

---

### 🔑 Module 12.2: Auth & Tokens
**Focus**: Authentication flows, token storage, OAuth implementation

**Files**:
- `127_Authentication_Flows.md` - Session vs JWT, OAuth, SSO
- `128_Token_Storage.md` - Memory, localStorage, HttpOnly cookies
- `129_OAuth.md` - OAuth 2.0, OpenID Connect, social login
- `179_JWT_Deep_Dive.md` - JWT structure, signing algorithms, attacks
- `180_Passkeys_WebAuthn.md` - WebAuthn registration, passkey authentication

**Key Concepts**:
- Session-based vs token-based authentication
- Access tokens vs refresh tokens
- Secure token storage patterns
- OAuth Authorization Code flow
- SSO implementation
- JWT signing (HMAC vs RSA), revocation, JWKS rotation
- Passkeys/WebAuthn: passwordless authentication

**Interview Relevance**: 🔥🔥🔥🔥🔥
Essential for any application with user authentication.

---

### 🛡️ Module 12.3: Hardening UI
**Focus**: Production security practices for frontend applications

**Files**:
- `130_Protecting_Sensitive_UI_Data.md` - Hiding secrets, PII protection
- `131_Secure_API_Consumption.md` - Safe API integration patterns
- `132_Clickjacking.md` - Frame busting, X-Frame-Options
- `133_CSP.md` - Content Security Policy implementation
- `134_Secure_Headers.md` - Security headers configuration
- `135_Token_Refresh.md` - Automatic token refresh patterns
- `136_Preventing_Data_Leaks.md` - Logging, caching, debugging
- `188_Subresource_Integrity_SRI.md` - SRI for scripts, stylesheets, CDN integrity

**Key Concepts**:
- Content Security Policy (CSP)
- Security headers (HSTS, X-Frame-Options, etc.)
- Token refresh flows
- PII redaction
- Secure error handling

**Interview Relevance**: 🔥🔥🔥🔥
Production-readiness questions for senior roles.

---

## 🎓 Study Plan

### Week 1: Web Threats
- **Day 1-2**: XSS (types, attack vectors, prevention)
- **Day 3-4**: CSRF (attack flow, token protection, SameSite)
- **Day 5-6**: CORS (preflight, credentials, policies)
- **Day 7**: Practice implementing defenses

### Week 2: Auth & Tokens
- **Day 1-2**: Authentication flows (session vs JWT)
- **Day 3-4**: Token storage (memory, cookies, localStorage)
- **Day 5-6**: OAuth 2.0 (authorization code flow, PKCE)
- **Day 7**: Build complete auth system

### Week 3: Hardening UI
- **Day 1-2**: CSP and security headers
- **Day 3**: Clickjacking prevention
- **Day 4**: Token refresh patterns
- **Day 5**: Protecting sensitive data
- **Day 6**: Preventing data leaks
- **Day 7**: Security audit and testing

---

## 📊 Assessment Checklist

### Module 12.1: Web Threats
- [ ] Can explain XSS types and prevention
- [ ] Can implement CSRF protection
- [ ] Can configure CORS correctly
- [ ] Can identify security vulnerabilities in code

### Module 12.2: Auth & Tokens
- [ ] Can design authentication flows
- [ ] Can choose appropriate token storage
- [ ] Can implement OAuth 2.0
- [ ] Can build secure login systems

### Module 12.3: Hardening UI
- [ ] Can configure CSP headers
- [ ] Can implement security headers
- [ ] Can build token refresh logic
- [ ] Can protect sensitive data in UI

---

## 🎯 Common Interview Questions (Part 12)

### XSS & CSRF
1. "What's the difference between XSS and CSRF?"
2. "How do you prevent XSS attacks?"
3. "Explain CSRF token validation."
4. "What is SameSite cookie attribute?"

### CORS
1. "How does CORS work?"
2. "What's a preflight request?"
3. "Why can't CORS prevent CSRF?"
4. "Explain Access-Control-Allow-Origin."

### Authentication
1. "Compare session-based vs token-based auth."
2. "Where should you store JWT tokens?"
3. "How does OAuth 2.0 work?"
4. "Explain refresh token rotation."

### Security Headers
1. "What is Content Security Policy?"
2. "Explain X-Frame-Options."
3. "What security headers should every app have?"
4. "How do you prevent clickjacking?"

### Real-World Scenarios
1. "Design a secure login system."
2. "Implement automatic token refresh."
3. "How do you secure a SPA?"
4. "Design SSO for enterprise apps."

---

## 💡 Key Takeaways

### Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│              DEFENSE IN DEPTH                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 1: INPUT VALIDATION                                  │
│    • Sanitize user input                                    │
│    • Validate on client AND server                          │
│                                                              │
│  Layer 2: OUTPUT ENCODING                                   │
│    • Context-aware escaping                                 │
│    • Framework protections (React auto-escape)              │
│                                                              │
│  Layer 3: CSP & SECURITY HEADERS                            │
│    • Content Security Policy                                │
│    • X-Frame-Options, HSTS, etc.                            │
│                                                              │
│  Layer 4: AUTHENTICATION & AUTHORIZATION                    │
│    • Secure token storage                                   │
│    • Short-lived access tokens                              │
│    • HttpOnly refresh tokens                                │
│                                                              │
│  Layer 5: NETWORK SECURITY                                  │
│    • HTTPS everywhere                                       │
│    • CORS policies                                          │
│    • CSRF tokens                                            │
│                                                              │
│  Layer 6: MONITORING & RESPONSE                             │
│    • Security logging                                       │
│    • Anomaly detection                                      │
│    • Incident response plan                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Security Checklist for Production

```
BEFORE DEPLOYMENT:
☐ All inputs sanitized (DOMPurify for HTML)
☐ CSP headers configured
☐ HTTPS enforced (HSTS enabled)
☐ Tokens stored securely (HttpOnly cookies for refresh)
☐ CSRF protection implemented (SameSite cookies + tokens)
☐ CORS configured (whitelist, not *)
☐ Security headers set (X-Frame-Options, X-Content-Type-Options)
☐ Sensitive data not logged
☐ Error messages don't leak info
☐ Rate limiting on auth endpoints
☐ 2FA for sensitive operations
☐ Security audit completed
☐ Pen testing done
☐ Monitoring and alerts set up
```

---

## 📚 Recommended Resources

### Documentation
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [JWT.io](https://jwt.io/)
- [OAuth 2.0](https://oauth.net/2/)

### Tools
- **DOMPurify**: XSS sanitization
- **Helmet.js**: Security headers for Express
- **csurf**: CSRF protection middleware
- **OWASP ZAP**: Security testing

### Best Practices
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Auth0 Security Best Practices](https://auth0.com/docs/security)
- [Google Web Security Guidelines](https://developers.google.com/web/fundamentals/security)

---

## 🎬 Next Steps

After completing Part 12, you should:

1. ✅ Understand all major web security threats
2. ✅ Can implement secure authentication
3. ✅ Can configure security headers correctly
4. ✅ Can pass security-focused interview questions

**Congratulations on completing the Security module!** 🎉

---

**Part 12 Status**: Security Mastery ✅
**Estimated Study Time**: 3 weeks
**Interview Readiness**: Senior+ Frontend Engineer

## 🏆 Security is Everyone's Responsibility

Remember: **A single security vulnerability can compromise millions of users.** Take security seriously, implement defense-in-depth, and stay updated on emerging threats.

**You're now equipped to build secure, production-ready frontend applications!** 🔒🚀
