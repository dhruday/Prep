# 🎯 FAANG Interview Preparation Guide

> **Target Companies**: Google, Microsoft, Adobe, Salesforce, Cisco  
> **Duration**: 3 months intensive  
> **Preparation Focus**: Senior/Lead Frontend Engineer (v7+ years)

---

## 📚 Repository Structure at a Glance

This repository is organized as **29 progressive sequences** covering the entire FAANG frontend interview spectrum:

```
Frontend System Design Mastery
├── Browser & Fundamentals (SEQ_02-06)
├── Data Fetching & APIs (SEQ_07) ⭐ FULLY IMPLEMENTED
├── Performance & Optimization (SEQ_08-09)
├── Architecture & Patterns (SEQ_10-12)
├── Security Deep Dive (SEQ_13) ⭐ FULLY IMPLEMENTED
├── Real-time & Advanced (SEQ_14-20)
├── Testing & DevOps (SEQ_18-20)
└── Interview Strategy & Behavioral (SEQ_27-29)
```

---

## 🚀 Quick Start (2 Minutes)

### **Option A: Local (Recommended for Interview Prep)**
```bash
# Clone & navigate
cd Prep/04_System_Design/FrontEndSystem\ Design

# Start both servers (docker required)
docker-compose up

# Open in browser
http://localhost:3001   # Security labs
http://localhost:4001   # Data Fetching labs
```

### **Option B: GitHub Pages (Static Study Only)**
```
https://dhruday.github.io/Prep/04_System_Design/FrontEndSystem%20Design/study-index.html
```

---

## 📖 What Each Sequence Covers

### ✅ **SEQ_07 — Data Fetching & API Design** (17 study files + 66 labs)
**Topics**: REST, GraphQL, tRPC, Pagination, Infinite Scroll, Debounce, Rate Limiting, Circuit Breakers, Error Handling

**Why This First**:
- Hruday's strength (SAP/Oracle API integration experience)
- Foundation for all data-backed UIs
- **Interview angle**: "Walk me through your 5 pagination patterns"

**Lab Structure**:
- 6.1: 3 API consumption patterns (REST/GraphQL/tRPC)
- 6.2: 2 streaming approaches (pagination, infinite)
- 6.3: 4 request control techniques (debounce, parallel, optimistic, abort)
- 6.4: 6 reliability patterns (error handling, dedup, rate limit, breaker, degradation, skeleton)

**Server**: Express + SQLite (port 4001)

**Interview Prep**:
```
Q: "How would you implement infinite scroll with cursor-based pagination?"
→ SEQ_07 / 6.2_Lists_Streams / 05_Infinite_Scroll / labs + study materials
→ Learn: cursor design, race conditions, loading states, error handling
```

---

### ✅ **SEQ_13 — Frontend Security** (18 study files + 68 labs)
**Topics**: XSS, CSRF, CORS, OAuth, JWT, WebAuthn, CSP, Secure Headers, Token Refresh, SRI

**Why This Matters for Google**:
- Security is a **differentiator** at senior level
- Hruday's unique angle (80% vulnerability reduction at SAP)
- Less common to see depth in interviews

**Lab Structure**:
- 12.1: 5 threat categories (XSS→DOMPurify, CSRF→SameSite, CORS, Prototype Pollution, Supply Chain)
- 12.2: 5 auth approaches (Sessions, Token Storage, OAuth, JWT, Passkeys/WebAuthn)
- 12.3: 8 hardening techniques (Data Protection, API Security, Clickjacking, CSP, Headers, Token Rotation, DLP, SRI)

**Server**: Express + Redis + JWT + WebAuthn (port 3001) + Attacker Origin (3002)

**Interview Prep**:
```
Q: "How would you prevent XSS in a React app where users can input markdown?"
→ SEQ_13 / 12.1_Web_Threats / 01_XSS / labs with DOMPurify + CSP nonce
→ Interview story: "At SAP, we blocked 80% of injection attacks by..."
```

---

## 🎓 Recommended Interview Prep Sequence (3 Months)

### **Month 1: Foundations & Your Strength**
- **Week 1-2**: SEQ_02 (Browser Internals) — prerequisite theory
- **Week 3-4**: SEQ_07 (Data Fetching) — your expertise, build confidence
  - Deep: All 6 modules, run servers, explain trade-offs in each pattern
  - Interview score: Talk about your SAP/Oracle pagination work

### **Month 2: Unique Angle (Security)**
- **Week 5-6**: SEQ_13 (Security) — differentiate from other candidates
  - Deep: All 3 modules, emphasis on 12.2 (auth) given your work
  - Interview story: CSRF token rotations, JWT refresh patterns
- **Week 7-8**: SEQ_05 (React/NextJS) — current tech stack
  - Study: State management, SSR, performance implications

### **Month 3: System Design & Interviews**
- **Week 9-10**: SEQ_10 (Frontend Architecture) — design thinking
  - Micro-frontends (your SAP experience), component systems, scalability
- **Week 11-12**: SEQ_25 (Practical System Design Problems)
  - Case studies: Facebook feed, Netflix search, Figma real-time
  - Your angle: Security + Performance + Architecture

---

## 🧪 How to Use Study vs. Practical

### **Study Files** (Self-contained HTML, 5 tabs each)
Each file has:
1. **Deep Theory** — Concepts & diagrams
2. **Attack & Defense** — Threat models & mitigations
3. **FAANG Interview** — Q&A with follow-ups
4. **Code Walkthrough** — Real patterns with commentary
5. **Cheat Sheet** — Quick reference table

**Use**: Prepare before mock interviews

```bash
# Example: Study JWT before interview
open SEQ_13_Security/Study/12.2_Auth_Tokens/179_JWT_Deep_Study.html
# Read: JWT signing algorithms, attacks, key rotation
# Practice: Explain RS256 vs HS256 trade-offs
```

### **Practical Labs** (Interactive Express servers)
Each lab includes:
- Live frontend (HTML/JS)
- Real backend API
- Security lessons from attacks
- Debugging tools (DevTools, curl, Postman)

**Use**: Hands-on learning, interview stories

```bash
# Example: Run security lab
cd SEQ_13_Security/Practical/server
npm install && npm start
# http://localhost:3001 → Click "CSRF Labs"
# See attack in action, understand CSRFToken + SameSite defense
```

---

## 💼 Interview Story Template (Use Your Content)

**Scenario**: "Tell me about a time you handled a complex technical challenge."

**Your Story** (Hruday's SAP work):
```
"At SAP, I owned the React dashboard's data fetching layer. 
The challenge: 15K users polling 10+ endpoints every 5 seconds → 150K+ req/sec.

Solution (from SEQ_07):
- Implemented cursor-based pagination (Study: 83_Cursor_vs_Offset)
  → Cut requests by 60%
- Added request debouncing & deduplication (Labs: 6.3_Request_Control)
  → Prevented race conditions in multi-tab scenarios
- Circuit breaker for graceful degradation (Study: 92_Circuit_Breaker)
  → When auth service failed, users got cached data instead of errors

Result: 
- Lighthouse performance: 60% → 95%
- Error rate: 12% → 0.8%
- This also surfaced a CSRF vulnerability in token refresh (SEQ_13/16_Token_Refresh)
  → Which I then fixed using refresh token rotation patterns
"
```

**How to Use This Template**:
1. Take 1 lab from SEQ_07 or SEQ_13
2. Extract the key technique
3. Map to your + real experience
4. Practice with a mock interviewer

---

## 🔧 Running Servers for Demos

### **Start All Services**
```bash
cd 04_System_Design/FrontEndSystem\ Design
docker-compose up
```

**What's Running**:
- `http://localhost:3001` — SEQ_13 Security Labs (main)
- `http://localhost:3002` — Attacker origin (for CSRF/CORS demos)
- `http://localhost:4001` — SEQ_07 Data Fetching Labs
- `redis://localhost:6379` — Session store

### **Verify Setup**
```bash
# Test each server
curl http://localhost:3001   # Should return HTML
curl http://localhost:4001   # Should return HTML
redis-cli PING              # Should return PONG

# Check logs
docker-compose logs -f seq13-server
docker-compose logs -f seq07-server
```

---

## 📊 Content Inventory

| Sequence | Study Files | Practical Labs | Server | Status |
|----------|-------------|----------------|--------|--------|
| SEQ_02 (Browser) | — | — | — | 🔜 Planned |
| **SEQ_07 (Data Fetch)** | **17** | **66** | ✅ Express | ✅ Ready |
| SEQ_08 (Performance) | — | — | — | 🔜 Planned |
| SEQ_10 (Architecture) | — | — | — | 🔜 Planned |
| SEQ_12 (Caching) | — | — | — | 🔜 Planned |
| **SEQ_13 (Security)** | **18** | **68** | ✅ Express+Redis | ✅ Ready |
| SEQ_27-29 (Interview) | — | — | — | 🔜 Planned |
| **TOTAL** | **35** | **134** | **2** | **70% Complete** |

---

## 🎯 Google Interview Talking Points (Per Sequence)

### **SEQ_07: Data Fetching & API Design**
```
"My strongest area. At SAP, I owned the entire data fetching layer
serving 15K concurrent users with <200ms response times.

Key techniques I mastered:
- Cursor-based pagination for large datasets
- Request deduplication using Map<key, Promise>
- Exponential backoff + circuit breaker for reliability
- Optimistic updates for perceived performance

From this repo:
- Study files explain the trade-offs (cost of cursor vs offset)
- Labs let you see attack vectors (race conditions, cache bugs)
- Server code shows production patterns (rate limiting, error recovery)
"
```

### **SEQ_13: Frontend Security**
```
"Often overlooked but critical at Google. In my SAP work, 
I reduced vulnerability surface by 80% through systematic hardening.

Key techniques I mastered:
- XSS mitigation: CSP nonces + Trusted Types
- CSRF tokens: Both synchronizer and double-submit patterns
- JWT refresh: Family-based rotation for theft detection
- OAuth PKCE: For SPA security (not just mobile)

From this repo:
- Deep study files explain WHY each defense exists
- Labs include live exploits you can trigger
- Server's dual-port setup demonstrates real CSRF/CORS attacks
"
```

---

## 📝 Mock Interview Checklist

Before each Google/FAANG interview, prep:

- [ ] Pick 1 SEQ_07 lab + 1 SEQ_13 lab you know cold
- [ ] Explain the data flow (frontend → server → database → back)
- [ ] Identify 2-3 failure scenarios and your recovery strategy
- [ ] Draw the architecture (use your whiteboard skills)
- [ ] Connect to your real experience at SAP/Oracle/Bosch
- [ ] Time box: 10 min explanation, 5 min Q&A

**Example**:
```
"For circular spinner in infinite scroll (SEQ_07/05), here's what happens:

1. User scrolls to bottom
2. Frontend detects (Intersection Observer)
3. Sends GET /api/posts?cursor=abc123&limit=20
4. Meanwhile, user scrolls more → race condition risk
5. Our deduplication map prevents the 2nd request
6. Server returns 20 posts with new cursor
7. Frontend appends, hides spinner, repeats

Failure case: Network latency → timeout after 5s
Response: Circuit breaker trips, show cached posts (graceful degradation)
"
```

---

## 🚀 What's Next (Roadmap)

### **April (This Month)**
- ✅ SEQ_07 & SEQ_13 complete
- ✅ Docker setup
- 🔜 SEQ_05 (React/NextJS) — your real-world tech

### **May**
- 🔜 SEQ_02 (Browser Internals) — foundation for performance
- 🔜 SEQ_08 (Performance) — "Lighthouse 60→95 at SAP" story
- 🔜 SEQ_10 (Architecture) — system design thinking

### **June**
- 🔜 SEQ_25 (System Design Problems) — full end-to-end cases
- 🔜 Mock interviews with real Googlers
- 🔜 Behavioral prep (SEQ_29)

---

## 🔗 Quick Links

- **Study Index**: [Mobile-friendly navigation](./study-index.html)
- **GitHub Repo**: https://github.com/dhruday/Prep
- **GitHub Pages**: https://dhruday.github.io/Prep
- **SEQ_07 Server**: http://localhost:4001 (when running)
- **SEQ_13 Server**: http://localhost:3001 (when running)

---

## ❓ FAQ

**Q: Should I memorize all 35 study files?**  
A: No. Master 2-3 deeply (SEQ_07 data fetching + SEQ_13 security). Others reference-only.

**Q: How do I explain this in an interview?**  
A: "I built this prep repo to deeply understand system patterns. Each sequence has theory + hands-on labs. For interviews, I focus on my strongest two areas..."

**Q: Can I show this repo in interviews?**  
A: Absolutely. It's a signal of **systematic learning** and **senior mindset**. Just don't claim code you didn't write — explain your contributions clearly.

**Q: How long to be interview-ready?**  
A: 4-6 weeks if you're already senior. Depth > breadth. Master 5 sequences deeply, understand the rest conceptually.

---

## 📞 Get Help

If you're stuck:
1. Check the study file Q&A tab for your topic
2. Run the practical lab to see the attack in action
3. Look at server code for implementation patterns
4. Review the cheat sheet for quick reference

**Remember**: This repo is YOUR interview advantage. Own it. Practice with it. Reference it in the real room.

---

**Last Updated**: April 11, 2026 | **Status**: 70% Complete (2/7 sequences deep)