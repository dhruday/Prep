# 132. Clickjacking

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**Clickjacking** (also called UI redressing) is a malicious technique where an attacker tricks users into clicking on something different from what they perceive, potentially causing them to perform unintended actions like transferring money, changing settings, or granting permissions.

### **What It Is:**
An attack where:
- Attacker embeds your website in a transparent `<iframe>`
- Overlays it on a decoy website (fake game, clickbait)
- User thinks they're clicking the decoy, but actually clicks your app
- Could trigger: "Delete Account," "Transfer $1000," "Grant Admin Access"

### **Why It Exists:**
- **Browser Feature**: iframes are legitimate (embedded videos, widgets)
- **Visual Deception**: Human perception can be tricked
- **Cross-Origin**: Attacker's site embedding your site
- **One-Click Exploits**: Many actions require single click

### **When and Where Used:**
**Attack Scenarios:**
- Banking: Trigger money transfers
- Social Media: Force likes, shares, follows
- Admin Panels: Grant permissions, delete data
- E-Commerce: Complete unauthorized purchases
- OAuth: Force permission grants

### **Role in Large-Scale Applications:**
At FAANG scale, millions of users are potential targets. A clickjacking vulnerability can lead to:
- Mass unauthorized actions
- Reputation damage
- Regulatory fines (GDPR, PCI-DSS)
- User trust erosion

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### **A. How Clickjacking Works**

```html
<!-- Attacker's malicious page -->
<!DOCTYPE html>
<html>
<head>
  <style>
    #target-website {
      position: absolute;
      width: 100%;
      height: 100%;
      opacity: 0.00001; /* Nearly invisible */
      z-index: 9999; /* On top of everything */
    }
    
    #decoy {
      position: absolute;
      width: 100%;
      height: 100%;
      z-index: 1;
    }
  </style>
</head>
<body>
  <!-- Decoy content (what user sees) -->
  <div id="decoy">
    <h1>Click here to win $1000!</h1>
    <button style="position: absolute; top: 200px; left: 300px;">
      Click Me!
    </button>
  </div>
  
  <!-- Your legitimate website (invisible) -->
  <iframe 
    id="target-website"
    src="https://bank.com/transfer?to=attacker&amount=1000&confirm=true">
  </iframe>
</body>
</html>
```

**Attack Flow:**
1. User visits attacker's site (via phishing, malicious ad)
2. Attacker's page loads victim's site in invisible iframe
3. Iframe positioned so "Delete Account" button aligns with "Click to Win"
4. User clicks, thinks they're playing game
5. Actually clicks "Delete Account" on hidden iframe
6. Action executed in victim's logged-in session

---

### **B. Defense Mechanisms**

#### **1. X-Frame-Options Header (Legacy, Still Effective)**

```javascript
// Server-side (Express.js)
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY'); // Never allow framing
  // OR
  res.setHeader('X-Frame-Options', 'SAMEORIGIN'); // Allow same-origin framing
  next();
});
```

**Values:**
- `DENY`: Page cannot be framed by any site (strictest)
- `SAMEORIGIN`: Only allow framing by same origin
- `ALLOW-FROM https://trusted.com`: Allow specific origin (deprecated, not widely supported)

**Frontend Detection (Not a Security Control):**
```javascript
// Detect if your page is framed
if (window.top !== window.self) {
  // Page is in an iframe
  console.warn('Page is framed!');
  
  // Optional: Break out of frame (framebusting)
  window.top.location = window.self.location;
}
```

**Problem with Framebusting:**
```javascript
// Attacker can bypass with sandbox attribute
<iframe sandbox="allow-forms allow-scripts" src="https://victim.com"></iframe>
// Sandbox prevents top-level navigation, so framebusting fails
```

---

#### **2. Content-Security-Policy (Modern, Recommended)**

```javascript
// Server-side
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "frame-ancestors 'none'" // Equivalent to X-Frame-Options: DENY
  );
  // OR
  res.setHeader(
    'Content-Security-Policy',
    "frame-ancestors 'self'" // Same-origin only
  );
  // OR
  res.setHeader(
    'Content-Security-Policy',
    "frame-ancestors 'self' https://trusted-partner.com" // Whitelist
  );
  next();
});
```

**Advantages over X-Frame-Options:**
- More granular control
- Can specify multiple trusted origins
- Part of broader CSP security strategy
- Better browser support for modern features

**Meta Tag (Less Preferred):**
```html
<meta http-equiv="Content-Security-Policy" content="frame-ancestors 'none'">
```

---

#### **3. SameSite Cookies**

```javascript
// Prevent CSRF via clickjacking
res.cookie('sessionId', sessionId, {
  httpOnly: true,
  secure: true,
  sameSite: 'Strict' // Cookie not sent in cross-site iframe context
});
```

**How it helps:**
- Even if user clicks in malicious iframe, session cookie not sent
- Action requires authentication, which fails
- Complements frame-ancestors directive

---

### **C. Context-Aware Protections**

#### **1. Require User Interaction**

```javascript
// For critical actions, require explicit confirmation
function DeleteAccountButton() {
  const [confirmText, setConfirmText] = useState('');
  const [step, setStep] = useState(1);
  
  const handleDelete = async () => {
    if (step === 1) {
      // Step 1: Show warning
      setStep(2);
    } else if (step === 2 && confirmText === 'DELETE') {
      // Step 2: Require typing confirmation
      await apiClient.delete('/account');
    }
  };
  
  return (
    <div>
      {step === 1 && (
        <button onClick={handleDelete} className="danger">
          Delete Account
        </button>
      )}
      
      {step === 2 && (
        <div>
          <p>⚠️ This action cannot be undone!</p>
          <p>Type DELETE to confirm:</p>
          <input 
            type="text" 
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoComplete="off"
          />
          <button 
            onClick={handleDelete}
            disabled={confirmText !== 'DELETE'}
          >
            Confirm Deletion
          </button>
        </div>
      )}
    </div>
  );
}
```

**Why this helps:**
- Requires multiple interactions (harder to clickjack multi-step)
- Typing confirmation prevents single-click exploits
- Delay gives user time to realize something's wrong

---

#### **2. Visual Context Verification**

```javascript
// Detect if page is visually obscured
function useVisibilityProtection() {
  useEffect(() => {
    const checkVisibility = () => {
      // Check if page is actually visible to user
      const isVisible = document.visibilityState === 'visible';
      const isFocused = document.hasFocus();
      const opacity = window.getComputedStyle(document.body).opacity;
      
      if (!isVisible || !isFocused || parseFloat(opacity) < 0.9) {
        console.warn('Potential clickjacking detected');
        // Lock sensitive actions
        setSensitiveActionsLocked(true);
      }
    };
    
    document.addEventListener('visibilitychange', checkVisibility);
    window.addEventListener('focus', checkVisibility);
    window.addEventListener('blur', checkVisibility);
    
    return () => {
      document.removeEventListener('visibilitychange', checkVisibility);
      window.removeEventListener('focus', checkVisibility);
      window.removeEventListener('blur', checkVisibility);
    };
  }, []);
}
```

---

### **D. Advanced Attack Variants**

#### **1. Double Clickjacking**
```html
<!-- Two overlapping iframes -->
<iframe id="frame1" src="https://victim.com/page1"></iframe>
<iframe id="frame2" src="https://victim.com/page2"></iframe>

<!-- Attacker rapidly swaps which iframe is visible -->
<!-- User's two clicks trigger two different actions -->
```

**Defense:** Rate limiting on sensitive actions

#### **2. Drag-and-Drop Clickjacking**
```html
<!-- Trick user into dragging sensitive data -->
<div id="decoy" draggable="true">
  Drag this image to save it!
</div>

<iframe src="https://victim.com/admin-panel">
  <!-- Contains file upload drop zone -->
</iframe>

<!-- User drags "image" (actually sensitive file) into hidden upload zone -->
```

**Defense:** Disable drag-and-drop on sensitive forms

#### **3. Timing-Based Clickjacking**
```javascript
// Attacker shows real page, then quickly injects iframe
setTimeout(() => {
  const iframe = document.createElement('iframe');
  iframe.src = 'https://victim.com/transfer';
  iframe.style.position = 'absolute';
  iframe.style.opacity = '0.001';
  document.body.appendChild(iframe);
}, 1000); // Right when user is about to click
```

**Defense:** CSP frame-ancestors (prevents framing entirely)

---

### **E. Testing for Clickjacking**

```javascript
// Test if your site can be framed
async function testClickjackingProtection() {
  try {
    const response = await fetch('https://yoursite.com', {
      method: 'HEAD'
    });
    
    const xFrameOptions = response.headers.get('X-Frame-Options');
    const csp = response.headers.get('Content-Security-Policy');
    
    console.log('X-Frame-Options:', xFrameOptions);
    console.log('CSP frame-ancestors:', csp);
    
    if (!xFrameOptions && !csp?.includes('frame-ancestors')) {
      console.error('⚠️ No clickjacking protection detected!');
    } else {
      console.log('✅ Clickjacking protection enabled');
    }
  } catch (error) {
    console.error('Error testing headers:', error);
  }
}
```

**Manual Test:**
```html
<!-- Create test page -->
<!DOCTYPE html>
<html>
<body>
  <h1>Clickjacking Test</h1>
  <iframe src="https://yoursite.com" width="800" height="600"></iframe>
</body>
</html>
```

If your site loads in the iframe, you're vulnerable.

---

### **F. Common Pitfalls**

#### **❌ Relying on JavaScript Framebusting Alone**
```javascript
// WEAK PROTECTION
if (window.top !== window.self) {
  window.top.location = window.self.location;
}

// Attacker bypasses with:
<iframe sandbox="allow-forms allow-scripts" src="victim.com"></iframe>
```

#### **❌ Incomplete CSP**
```javascript
// WRONG - Only protects against scripts, not framing
Content-Security-Policy: script-src 'self'

// RIGHT - Include frame-ancestors
Content-Security-Policy: frame-ancestors 'none'; script-src 'self'
```

#### **❌ Not Protecting All Sensitive Endpoints**
```javascript
// Login page protected
res.setHeader('X-Frame-Options', 'DENY');

// But forgot to protect transfer page!
// /transfer endpoint has no X-Frame-Options
```

────────────────────────────────────
## 3. Clear Real-World Examples
────────────────────────────────────

### **Example 1: Facebook Like Button Clickjacking (2010)**
- Attackers embedded Facebook Like button in invisible iframe
- Overlaid "Click to win" button
- Users unknowingly liked malicious pages
- **Fix:** CSP frame-ancestors, require explicit opt-in for third-party framing

### **Example 2: Bank Transfer Clickjacking**
```html
<!-- Attacker's page -->
<div style="text-align: center;">
  <h1>You won $1000!</h1>
  <button>Claim Now</button>
</div>

<iframe 
  src="https://bank.com/transfer?to=attacker&amount=1000"
  style="position: absolute; opacity: 0; top: 100px; left: 300px;"
></iframe>
```

**Prevention:**
- Bank implements X-Frame-Options: DENY
- Requires 2FA for transfers
- Multi-step confirmation

### **Example 3: OAuth Permission Grant Clickjacking**
```html
<!-- Attacker embeds OAuth consent screen -->
<iframe src="https://provider.com/oauth/authorize?..."></iframe>

<!-- User tricked into clicking "Grant Access" -->
```

**Prevention:**
- OAuth providers use frame-ancestors
- Require user interaction (can't auto-submit)
- Show clear domain in consent screen

────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────

### **Sample Answer**

> *"Clickjacking is a UI redressing attack where an attacker embeds your site in a transparent iframe and tricks users into clicking elements they can't see. The defense is straightforward—use the Content-Security-Policy frame-ancestors directive to control where your site can be framed."*
>
> *"I'd set frame-ancestors 'none' for most pages to completely prevent framing. For pages that legitimately need to be embedded, like OAuth consent screens or payment widgets, I'd whitelist specific trusted domains."*
>
> *"Beyond headers, I'd implement defense-in-depth for sensitive actions—require multi-step confirmation, add delays, or require typing confirmation. This makes single-click exploits ineffective even if framing protection fails."*
>
> *"For monitoring, I'd track suspicious patterns like rapid clicks on critical buttons from users who haven't completed normal flow, which might indicate automated clickjacking attempts."*

### **Follow-Up Questions**

**Q: "Can't users just disable CSP or X-Frame-Options?"**  
**A:** *"No, these are HTTP headers sent by the server. Users can't disable them any more than they can disable HTTPS. The browser enforces them automatically. Attackers also can't bypass them—if headers are present, the browser simply refuses to load the page in an unauthorized iframe."*

**Q: "What about legitimate iframe use cases like embedded dashboards?"**  
**A:** *"Use frame-ancestors with whitelisted domains. For example, if our analytics dashboard is embedded in partner sites, we'd set frame-ancestors 'self' https://partner1.com https://partner2.com. This allows specific partners while blocking malicious framers."*

────────────────────────────────────
## 5. Code Examples
────────────────────────────────────

See Deep-Dive section for comprehensive examples.

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

### **Why It Matters**
- **One-Click Exploits**: Single click can transfer money, delete accounts
- **Mass Scale**: Affects millions if widely exploited
- **User Trust**: Destroys confidence in platform
- **Compliance**: Required by security standards

### **How It Works**
1. **Prevention**: CSP frame-ancestors 'none'
2. **Backup**: X-Frame-Options: DENY
3. **Defense-in-Depth**: Multi-step confirmations
4. **Monitoring**: Detect suspicious click patterns
5. **Testing**: Verify headers on all sensitive pages
