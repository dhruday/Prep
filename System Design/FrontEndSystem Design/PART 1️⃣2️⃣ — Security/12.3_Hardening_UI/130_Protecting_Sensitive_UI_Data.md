# 130. Protecting Sensitive UI Data

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**Protecting Sensitive UI Data** refers to implementing frontend security measures to prevent unauthorized access, exposure, or theft of sensitive information displayed or processed in the user interface. This includes personally identifiable information (PII), financial data, authentication credentials, health records, and business-critical information.

### **What It Is:**
A comprehensive security strategy that combines:
- **Data Masking & Redaction**: Hiding sensitive data in the UI
- **Access Control**: Role-based rendering
- **Browser Security**: Preventing DevTools, screenshots, screen recording
- **Memory Protection**: Clearing sensitive data from JavaScript memory
- **Network Security**: Encrypting data in transit
- **Logging Protection**: Avoiding sensitive data in logs/analytics

### **Why It Exists:**
1. **Compliance**: GDPR, HIPAA, PCI-DSS, SOC2 mandates
2. **User Trust**: Data breaches destroy reputation
3. **Legal Liability**: Fines up to 4% of revenue (GDPR)
4. **Business Risk**: Exposed trade secrets, financial data
5. **Attack Surface**: Frontend is publicly accessible, easily inspected

### **When and Where Used:**
- Banking apps (account numbers, balances, SSN)
- Healthcare portals (medical records, diagnoses)
- E-commerce (credit card details, addresses)
- Enterprise apps (salary data, contracts)
- Government portals (tax info, legal documents)

### **Role in Large-Scale Applications:**
At FAANG scale, a single data leak can expose millions of users. Frontend protection is the **last line of defense**—backend security is critical, but frontend must treat all data as potentially sensitive and implement defense-in-depth.

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### **A. Data Classification & Threat Model**

#### **Sensitivity Levels:**
```
Level 1 - Public: Company name, product descriptions
Level 2 - Internal: User preferences, non-sensitive settings
Level 3 - Confidential: Email, phone, address
Level 4 - Restricted: SSN, credit cards, health records
Level 5 - Critical: Authentication credentials, encryption keys
```

#### **Threat Vectors:**
1. **Browser DevTools**: Inspect elements, console logs, network tab
2. **Screen Recording**: OBS, browser extensions, malware
3. **Screenshots**: Print Screen, Snipping Tool, screenshot APIs
4. **Memory Dumps**: Browser extensions accessing page memory
5. **Copy-Paste**: Clipboard access
6. **XSS Attacks**: Stealing data via injected scripts
7. **Social Engineering**: Shoulder surfing, screen sharing
8. **Browser Extensions**: Malicious extensions reading DOM
9. **Third-Party Scripts**: Analytics, ads accessing data
10. **Logging & Monitoring**: Sensitive data in error logs, Sentry, analytics

---

### **B. Data Masking & Redaction**

#### **1. Visual Masking**
```javascript
// Credit card masking
function maskCreditCard(cardNumber) {
  return cardNumber.replace(/(\d{4})(\d{4})(\d{4})(\d{4})/, '**** **** **** $4');
}

// SSN masking
function maskSSN(ssn) {
  return ssn.replace(/(\d{3})(\d{2})(\d{4})/, '***-**-$3');
}

// Email masking
function maskEmail(email) {
  const [name, domain] = email.split('@');
  const maskedName = name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
  return `${maskedName}@${domain}`;
}

// Phone masking
function maskPhone(phone) {
  return phone.replace(/(\d{3})(\d{3})(\d{4})/, '(***) ***-$3');
}
```

#### **2. Progressive Disclosure**
```javascript
// Show masked by default, reveal on interaction
function SensitiveField({ value, type }) {
  const [revealed, setRevealed] = useState(false);
  const maskedValue = maskData(value, type);
  
  return (
    <div className="sensitive-field">
      <span>{revealed ? value : maskedValue}</span>
      <button 
        onClick={() => setRevealed(!revealed)}
        onBlur={() => setRevealed(false)} // Auto-hide on blur
      >
        {revealed ? '👁️ Hide' : '👁️ Show'}
      </button>
    </div>
  );
}
```

#### **3. Time-Based Reveal**
```javascript
// Auto-hide after timeout
function TemporarySensitiveDisplay({ data }) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef(null);
  
  const reveal = () => {
    setVisible(true);
    
    // Auto-hide after 5 seconds
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setVisible(false);
    }, 5000);
  };
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);
  
  return (
    <div>
      {visible ? (
        <span className="sensitive-data">{data}</span>
      ) : (
        <button onClick={reveal}>Reveal Account Number</button>
      )}
    </div>
  );
}
```

---

### **C. DOM Protection**

#### **1. Prevent Copy-Paste**
```javascript
// Disable copy on sensitive fields
function ProtectedInput({ value, onChange }) {
  const handleCopy = (e) => {
    e.preventDefault();
    // Optional: Show warning
    toast.error('Copying is disabled for security');
  };
  
  return (
    <input
      type="text"
      value={value}
      onChange={onChange}
      onCopy={handleCopy}
      onCut={handleCopy}
      // Disable right-click
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
```

#### **2. Prevent Screenshots (Limited Effectiveness)**
```css
/* CSS-based screenshot protection (varies by browser/OS) */
.sensitive-content {
  /* Prevents screenshots in some mobile browsers */
  -webkit-user-select: none;
  -moz-user-select: none;
  user-select: none;
  
  /* Watermark technique */
  position: relative;
}

.sensitive-content::before {
  content: attr(data-user-id);
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 3rem;
  opacity: 0.05;
  pointer-events: none;
  z-index: 9999;
}
```

**Note:** True screenshot prevention is impossible in web browsers. Best approach: watermarking + detection.

#### **3. Screenshot Detection (Heuristic)**
```javascript
// Detect potential screenshot via visibility changes
function useScreenshotDetection() {
  useEffect(() => {
    let hiddenTime = null;
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenTime = Date.now();
      } else {
        if (hiddenTime && Date.now() - hiddenTime < 200) {
          // Quick visibility toggle - possible screenshot
          logSecurityEvent('potential_screenshot', {
            timestamp: new Date().toISOString(),
            page: window.location.pathname
          });
        }
        hiddenTime = null;
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}
```

---

### **D. Memory Protection**

#### **1. Clear Sensitive Data**
```javascript
class SecureDataHandler {
  constructor() {
    this.sensitiveData = null;
  }
  
  setSensitiveData(data) {
    this.sensitiveData = data;
    
    // Auto-clear after timeout
    setTimeout(() => {
      this.clearSensitiveData();
    }, 5 * 60 * 1000); // 5 minutes
  }
  
  getSensitiveData() {
    return this.sensitiveData;
  }
  
  clearSensitiveData() {
    if (this.sensitiveData) {
      // Overwrite memory (not guaranteed in JS, but best effort)
      if (typeof this.sensitiveData === 'string') {
        this.sensitiveData = '*'.repeat(this.sensitiveData.length);
      } else if (typeof this.sensitiveData === 'object') {
        Object.keys(this.sensitiveData).forEach(key => {
          this.sensitiveData[key] = null;
        });
      }
      this.sensitiveData = null;
    }
  }
}

// Usage
const handler = new SecureDataHandler();
handler.setSensitiveData('4532-1234-5678-9010');

// When done
handler.clearSensitiveData();
```

#### **2. Avoid String Concatenation for Secrets**
```javascript
// BAD - String immutability creates copies in memory
let password = 'my' + 'secret' + 'password'; // Multiple copies in memory

// BETTER - But still not perfect in JavaScript
const password = new String('mysecretpassword');

// BEST - Don't store sensitive data client-side if possible
// Fetch from secure HttpOnly cookie when needed
```

#### **3. Clear on Page Unload**
```javascript
// Clear sensitive data on navigation
window.addEventListener('beforeunload', () => {
  // Clear all sensitive state
  sessionStorage.removeItem('temp_sensitive_data');
  
  // Clear in-memory data
  globalSecureDataHandler.clearAll();
});

// Clear on visibility change (user switches tabs)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // User switched away - consider clearing sensitive data
    clearSensitiveUIElements();
  }
});
```

---

### **E. Role-Based Rendering**

#### **1. Conditional Display**
```javascript
function SensitiveDataDisplay({ user, data }) {
  const canViewSSN = user.permissions.includes('view_ssn');
  const canViewFullAccount = user.role === 'admin' || user.role === 'accountant';
  
  return (
    <div>
      <div>
        <label>Name:</label>
        <span>{data.name}</span>
      </div>
      
      {canViewSSN && (
        <div>
          <label>SSN:</label>
          <span>{data.ssn}</span>
        </div>
      )}
      
      <div>
        <label>Account Number:</label>
        <span>
          {canViewFullAccount 
            ? data.accountNumber 
            : maskAccountNumber(data.accountNumber)
          }
        </span>
      </div>
    </div>
  );
}
```

#### **2. Server-Side Data Filtering**
```javascript
// WRONG - Send all data, filter in frontend
// Attacker can bypass frontend and see API response

// RIGHT - Server filters based on permissions
async function fetchUserProfile(userId) {
  const response = await fetch(`/api/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Requested-Fields': 'name,email,phone' // Request only needed fields
    }
  });
  
  // Server returns ONLY fields user has permission to see
  return response.json();
}
```

---

### **F. Logging Protection**

#### **1. Sanitize Before Logging**
```javascript
const SENSITIVE_FIELDS = ['password', 'ssn', 'creditCard', 'token', 'secret', 'apiKey'];

function sanitizeForLogging(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const sanitized = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    const lowerKey = key.toLowerCase();
    
    // Check if field is sensitive
    const isSensitive = SENSITIVE_FIELDS.some(field => 
      lowerKey.includes(field.toLowerCase())
    );
    
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof obj[key] === 'object') {
      sanitized[key] = sanitizeForLogging(obj[key]);
    } else {
      sanitized[key] = obj[key];
    }
  }
  
  return sanitized;
}

// Usage
console.log('User data:', sanitizeForLogging(userData));

// Sentry integration
Sentry.captureException(error, {
  extra: sanitizeForLogging(contextData)
});
```

#### **2. Avoid Console Logs in Production**
```javascript
// Disable console in production
if (process.env.NODE_ENV === 'production') {
  console.log = () => {};
  console.debug = () => {};
  console.info = () => {};
  // Keep console.error for critical issues
}

// Or use a logging library with sanitization
import logger from './secureLogger';

logger.info('User logged in', sanitizeForLogging({ userId: user.id }));
```

---

### **G. Third-Party Script Protection**

#### **1. Isolate Third-Party Scripts**
```javascript
// Load analytics in iframe for isolation
function loadAnalyticsIsolated() {
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.sandbox = 'allow-scripts allow-same-origin';
  document.body.appendChild(iframe);
  
  const script = iframe.contentDocument.createElement('script');
  script.src = 'https://analytics.example.com/tracker.js';
  iframe.contentDocument.body.appendChild(script);
}

// Or use Subresource Integrity
<script 
  src="https://analytics.example.com/tracker.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/ux..."
  crossorigin="anonymous"
></script>
```

#### **2. Block Third-Party Access to Sensitive Elements**
```javascript
// Add data attributes to mark sensitive fields
<input 
  type="text" 
  className="sensitive-field"
  data-sensitive="true"
  data-privacy="pii"
/>

// Analytics script respects these markers
if (element.dataset.sensitive === 'true') {
  // Don't track this field
  return;
}
```

---

### **H. Browser DevTools Protection**

#### **1. Detect DevTools (Limited Effectiveness)**
```javascript
// Heuristic detection (can be bypassed)
const devtools = {
  isOpen: false,
  orientation: null
};

const threshold = 160;

const detectDevTools = () => {
  const widthThreshold = window.outerWidth - window.innerWidth > threshold;
  const heightThreshold = window.outerHeight - window.innerHeight > threshold;
  
  if (widthThreshold || heightThreshold) {
    if (!devtools.isOpen) {
      devtools.isOpen = true;
      handleDevToolsOpened();
    }
  } else {
    devtools.isOpen = false;
  }
};

function handleDevToolsOpened() {
  // Log security event
  logSecurityEvent('devtools_opened');
  
  // Optional: Blur sensitive data
  document.querySelectorAll('.sensitive-field').forEach(el => {
    el.style.filter = 'blur(5px)';
  });
  
  // Optional: Show warning
  showWarning('Developer tools detected. Sensitive data has been hidden.');
}

// Run detection
setInterval(detectDevTools, 1000);
```

**Note:** DevTools detection is a cat-and-mouse game. Focus on server-side security instead.

---

### **I. Clipboard Protection**

#### **1. Clear Clipboard After Paste**
```javascript
function SecurePasswordField() {
  const [value, setValue] = useState('');
  
  const handlePaste = async (e) => {
    e.preventDefault();
    
    // Get clipboard data
    const pastedData = e.clipboardData.getData('text');
    setValue(pastedData);
    
    // Clear clipboard after short delay
    setTimeout(async () => {
      try {
        await navigator.clipboard.writeText('');
      } catch (err) {
        // Clipboard API might be blocked
      }
    }, 1000);
  };
  
  return (
    <input
      type="password"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onPaste={handlePaste}
      onCopy={(e) => e.preventDefault()}
    />
  );
}
```

---

### **J. Audit Trail**

#### **1. Log Sensitive Data Access**
```javascript
function useAuditedSensitiveData(dataType, dataId) {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    // Log access
    logAuditEvent('sensitive_data_access', {
      dataType,
      dataId,
      userId: currentUser.id,
      timestamp: new Date().toISOString(),
      ipAddress: 'logged-by-backend',
      userAgent: navigator.userAgent
    });
    
    // Fetch data
    fetchSensitiveData(dataType, dataId).then(setData);
  }, [dataType, dataId]);
  
  return data;
}

// Backend receives audit log
// Can detect unusual patterns (accessing 1000 records in 1 minute)
```

---

### **K. Performance Trade-offs**

#### **Masking Performance:**
```javascript
// BAD - Masking on every render
function SlowMasking({ data }) {
  return (
    <div>
      {data.map(item => (
        <div key={item.id}>
          {maskCreditCard(item.cardNumber)} {/* Called on every render */}
        </div>
      ))}
    </div>
  );
}

// GOOD - Memoized masking
function FastMasking({ data }) {
  const maskedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      cardNumber: maskCreditCard(item.cardNumber)
    }));
  }, [data]);
  
  return (
    <div>
      {maskedData.map(item => (
        <div key={item.id}>{item.cardNumber}</div>
      ))}
    </div>
  );
}
```

---

### **L. Common Pitfalls**

#### **❌ Storing Sensitive Data in LocalStorage**
```javascript
// NEVER DO THIS
localStorage.setItem('ssn', user.ssn);
localStorage.setItem('creditCard', user.creditCard);

// Any script can read this
const stolen = localStorage.getItem('ssn');
```

#### **❌ Logging Sensitive Data**
```javascript
// DANGEROUS
console.log('User object:', user); // Contains SSN, credit card, etc.

// SAFE
console.log('User ID:', user.id);
```

#### **❌ Exposing Sensitive Data in URLs**
```javascript
// NEVER
window.location.href = `/profile?ssn=${user.ssn}`;

// URLs are logged everywhere: browser history, server logs, analytics, referer headers
```

#### **❌ Trusting Frontend Validation**
```javascript
// WRONG - Frontend validation only
if (user.role === 'admin') {
  showSensitiveData();
}

// Attacker can modify user.role in DevTools

// RIGHT - Backend validates and filters
const data = await fetchWithPermissionCheck('/api/sensitive-data');
```

────────────────────────────────────
## 3. Clear Real-World Examples
────────────────────────────────────

### **Example 1: Banking App (Account Numbers)**

```javascript
function BankAccountDisplay({ account }) {
  const [revealed, setRevealed] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  
  const requestReveal = async () => {
    // Step-up authentication
    const mfaConfirmed = await requestMFA();
    
    if (mfaConfirmed) {
      setAuthorized(true);
      setRevealed(true);
      
      // Log access
      auditLog('account_number_revealed', {
        accountId: account.id,
        timestamp: new Date().toISOString()
      });
      
      // Auto-hide after 10 seconds
      setTimeout(() => {
        setRevealed(false);
      }, 10000);
    }
  };
  
  return (
    <div className="account-card">
      <h3>{account.name}</h3>
      <div className="account-number">
        {revealed 
          ? account.number 
          : `****-****-****-${account.number.slice(-4)}`
        }
      </div>
      {!revealed && (
        <button onClick={requestReveal}>
          🔒 Reveal Full Number
        </button>
      )}
      {revealed && (
        <div className="warning">
          ⚠️ Full number visible. Will hide in 10 seconds.
        </div>
      )}
    </div>
  );
}
```

---

### **Example 2: Healthcare Portal (Medical Records)**

```javascript
function MedicalRecordView({ patientId, recordId }) {
  const { user } = useAuth();
  const [record, setRecord] = useState(null);
  const [watermark] = useState(`${user.name} - ${new Date().toISOString()}`);
  
  useEffect(() => {
    // Backend checks if user has permission to view this record
    async function loadRecord() {
      try {
        const response = await fetch(`/api/patients/${patientId}/records/${recordId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Access-Reason': 'patient_care', // Required for audit
          }
        });
        
        if (response.status === 403) {
          throw new Error('Insufficient permissions');
        }
        
        const data = await response.json();
        setRecord(data);
        
        // Log access
        auditLog('medical_record_accessed', {
          patientId,
          recordId,
          accessedBy: user.id,
          reason: 'patient_care',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Access denied:', error);
      }
    }
    
    loadRecord();
  }, [patientId, recordId]);
  
  useScreenshotDetection();
  
  return (
    <div className="medical-record" data-sensitive="true">
      {/* Watermark overlay */}
      <div className="watermark">{watermark}</div>
      
      {record && (
        <div>
          <h2>Medical Record</h2>
          <div className="field">
            <label>Patient Name:</label>
            <span>{record.patientName}</span>
          </div>
          <div className="field">
            <label>Diagnosis:</label>
            <span>{record.diagnosis}</span>
          </div>
          {/* More sensitive fields */}
        </div>
      )}
    </div>
  );
}
```

---

### **Example 3: E-Commerce (Payment Information)**

```javascript
function PaymentMethodCard({ paymentMethod }) {
  const [showFull, setShowFull] = useState(false);
  
  return (
    <div className="payment-card">
      <div className="card-brand">
        <img src={`/icons/${paymentMethod.brand}.svg`} alt={paymentMethod.brand} />
      </div>
      
      <div className="card-number" data-sensitive="true">
        {showFull 
          ? paymentMethod.cardNumber
          : `•••• •••• •••• ${paymentMethod.last4}`
        }
      </div>
      
      <div className="card-details">
        <span>Expires: {maskExpiry(paymentMethod.expiry)}</span>
      </div>
      
      {/* Never show CVV - it should never be stored anyway */}
      
      <button 
        onClick={() => setShowFull(!showFull)}
        onBlur={() => setShowFull(false)}
      >
        {showFull ? 'Hide' : 'Show'} Full Number
      </button>
    </div>
  );
}

function maskExpiry(expiry) {
  // Show month, hide year partially
  const [month, year] = expiry.split('/');
  return `${month}/**`;
}
```

---

### **Example 4: HR Portal (Salary Information)**

```javascript
function SalaryDashboard() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  
  // Check permissions
  const canViewSalaries = user.role === 'hr_manager' || user.role === 'executive';
  
  useEffect(() => {
    if (!canViewSalaries) {
      // Redirect if not authorized
      navigate('/unauthorized');
      return;
    }
    
    // Fetch employee data (backend filters based on permissions)
    fetchEmployees().then(setEmployees);
  }, [canViewSalaries]);
  
  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Department</th>
            <th>Salary</th>
          </tr>
        </thead>
        <tbody>
          {employees.map(emp => (
            <tr key={emp.id}>
              <td>{emp.name}</td>
              <td>{emp.department}</td>
              <td data-sensitive="true">
                {user.role === 'executive' 
                  ? formatCurrency(emp.salary)
                  : formatCurrency(emp.salaryRange) // Range, not exact
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────

### **Sample Interview Answer (7+ Years Level)**

> *"Protecting sensitive UI data requires a multi-layered approach because the frontend is inherently untrusted—it runs in the user's browser where they have full control."*
>
> *"First, I'd classify data by sensitivity level and apply appropriate controls. For highly sensitive data like SSNs or credit cards, I'd use visual masking by default, only revealing full values on explicit user action with step-up authentication if needed. The reveal would be temporary—auto-hiding after a timeout."*
>
> *"For memory protection, I'd clear sensitive data from JavaScript variables when no longer needed, especially on page unload or visibility changes. While JavaScript doesn't give us true memory control like C, we can overwrite variables and set them to null as best effort."*
>
> *"Role-based rendering is critical—if a user doesn't have permission to view data, the backend shouldn't send it at all. I'd never rely on frontend filtering because an attacker can inspect network responses. The server must validate permissions and filter data accordingly."*
>
> *"For logging and monitoring, I'd implement automatic sanitization to strip sensitive fields before sending to Sentry or analytics. I'd use a whitelist or blacklist of field names like 'password', 'ssn', 'creditCard', etc."*
>
> *"Against DevTools and browser extensions, defense is limited since users control their environment. I'd focus on audit logging—tracking who accessed what data and when—so we can detect anomalies like a user accessing thousands of records in minutes."*
>
> *"For third-party scripts, I'd use Subresource Integrity, Content Security Policy, and mark sensitive elements with data attributes that scripts should respect. I'd also consider iframe isolation for analytics."*
>
> *"Performance-wise, masking operations should be memoized to avoid re-computing on every render. For large lists, I'd mask data during the initial fetch rather than in the render loop."*
>
> *"At scale, the challenge is balancing security with UX. Banking apps can afford step-up auth for viewing account numbers, but e-commerce can't make checkout too cumbersome. I'd use progressive disclosure—mask by default, reveal on hover or click for low-friction access."*

---

### **Likely Follow-Up Questions**

#### **Q1: "Can you really prevent screenshots in a web browser?"**
**A:** *"No, not reliably. The browser and OS control screenshot functionality, and web pages can't block it. Some mobile browsers respect certain CSS properties like user-select: none for screenshots, but it's not standardized and easily bypassed."*

*"The best we can do is detection and deterrence. For detection, I'd watch for rapid visibility changes—when a user takes a screenshot, the browser briefly loses focus. This is heuristic and not foolproof."*

*"For deterrence, I'd add visible watermarks with the user's ID and timestamp. If a screenshot leaks, we can trace it back. Financial institutions also use 'forensic watermarks'—invisible patterns in the UI that survive screenshots and can identify the source."*

*"The real answer is: don't rely on frontend screenshot protection. Treat it as an audit tool, not a security control. Sensitive data should be time-limited, session-locked, and accessed with proper authentication."*

---

#### **Q2: "How do you handle sensitive data in error logging and monitoring tools like Sentry?"**
**A:** *"I'd implement automatic sanitization at the logging layer. Before sending any data to Sentry, I'd pass it through a sanitizer that redacts sensitive fields."*

```javascript
const SENSITIVE_PATTERNS = [
  /password/i,
  /ssn/i,
  /credit[_-]?card/i,
  /\b\d{3}-\d{2}-\d{4}\b/, // SSN pattern
  /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/ // Credit card pattern
];

function sanitize(obj) {
  // Recursively redact sensitive fields and patterns
}

Sentry.init({
  beforeSend(event) {
    return sanitize(event);
  }
});
```

*"For PII like emails or names, I'd hash them so we can correlate errors for the same user without storing the actual value. I'd also configure Sentry's data scrubbing rules to catch common patterns."*

*"In production, I'd audit what data Sentry is actually receiving by sampling logs. Sometimes sensitive data leaks through unexpected paths—error messages, URLs, or custom context."*

---

#### **Q3: "What's your approach to protecting data from malicious browser extensions?"**
**A:** *"Browser extensions have significant privileges—they can read and modify the DOM, intercept network requests, and access storage. There's no way to fully prevent a malicious extension from accessing page data."*

*"My approach is defense-in-depth:"*
- *"Store sensitive tokens in HttpOnly cookies, not localStorage, so extensions can't read them."*
- *"Use Shadow DOM for sensitive UI components to make them harder to access programmatically."*
- *"Implement MutationObserver to detect unexpected DOM changes."*
- *"Monitor for suspicious patterns—like an extension rapidly accessing storage or making unusual API calls."*
- *"Educate users to only install trusted extensions and review permissions."*

*"At the enterprise level, I'd recommend browser policies that whitelist approved extensions and block others. Consumer apps can't do this, so we focus on limiting exposure—don't store sensitive data client-side if avoidable."*

---

#### **Q4: "How would you implement step-up authentication for accessing highly sensitive data?"**
**A:** *"Step-up auth requires users to re-authenticate before accessing particularly sensitive operations, even if they're already logged in."*

```javascript
async function accessSensitiveData(resourceId) {
  // Check if recent step-up auth exists
  const lastStepUp = sessionStorage.getItem('last_step_up');
  const stepUpWindow = 5 * 60 * 1000; // 5 minutes
  
  if (!lastStepUp || Date.now() - parseInt(lastStepUp) > stepUpWindow) {
    // Require fresh authentication
    const reauthed = await promptMFA();
    
    if (!reauthed) {
      throw new Error('Step-up authentication required');
    }
    
    sessionStorage.setItem('last_step_up', Date.now().toString());
  }
  
  // Proceed with access
  return fetchSensitiveResource(resourceId);
}
```

*"For banking apps, I'd require step-up for transferring money, viewing full account numbers, or changing security settings. The step-up window is typically 5-15 minutes depending on risk."*

*"The backend must validate the step-up token—never trust the frontend's timestamp. The backend issues a short-lived 'high-assurance' token after MFA, and sensitive endpoints require that token."*

---

#### **Q5: "How do you balance security with accessibility for screen readers?"**
**A:** *"This is a critical but often overlooked conflict. Screen readers need to read content, but that same content might be sensitive."*

*"For masked data, I'd use aria-label to provide screen reader users with context without exposing the actual value:"*

```html
<span aria-label="Credit card ending in 5678">
  •••• •••• •••• 5678
</span>
```

*"For reveal buttons, I'd ensure they're keyboard-accessible and announced properly:"*

```html
<button 
  onClick={reveal}
  aria-label="Show full account number"
  aria-pressed={revealed}
>
  {revealed ? 'Hide' : 'Show'} Number
</button>
```

*"For highly sensitive data in shared environments (like a hospital), I'd implement 'privacy mode' that users can toggle, which reduces screen reader verbosity or requires headphones."*

*"The key is: accessibility shouldn't compromise security, and security shouldn't exclude users with disabilities. Both are non-negotiable requirements."*

────────────────────────────────────
## 5. Code Examples
────────────────────────────────────

### **Complete Sensitive Data Component System**

```javascript
// ========================================
// SensitiveDataContext.js
// ========================================

import React, { createContext, useContext, useCallback, useRef } from 'react';

const SensitiveDataContext = createContext();

export function SensitiveDataProvider({ children }) {
  const sensitiveDataRegistry = useRef(new Map());
  
  const registerSensitiveData = useCallback((id, clearFn) => {
    sensitiveDataRegistry.current.set(id, clearFn);
    
    return () => {
      sensitiveDataRegistry.current.delete(id);
    };
  }, []);
  
  const clearAllSensitiveData = useCallback(() => {
    sensitiveDataRegistry.current.forEach(clearFn => clearFn());
    sensitiveDataRegistry.current.clear();
  }, []);
  
  // Clear on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearAllSensitiveData();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', clearAllSensitiveData);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', clearAllSensitiveData);
    };
  }, [clearAllSensitiveData]);
  
  return (
    <SensitiveDataContext.Provider value={{ registerSensitiveData, clearAllSensitiveData }}>
      {children}
    </SensitiveDataContext.Provider>
  );
}

export function useSensitiveData() {
  return useContext(SensitiveDataContext);
}

// ========================================
// MaskedField.js - Reusable Masked Field
// ========================================

import React, { useState, useEffect, useId } from 'react';
import { useSensitiveData } from './SensitiveDataContext';

const MASK_TYPES = {
  creditCard: (value) => value.replace(/(\d{4})(\d{4})(\d{4})(\d{4})/, '**** **** **** $4'),
  ssn: (value) => value.replace(/(\d{3})(\d{2})(\d{4})/, '***-**-$3'),
  email: (value) => {
    const [name, domain] = value.split('@');
    return `${name[0]}${'*'.repeat(name.length - 2)}${name[name.length - 1]}@${domain}`;
  },
  phone: (value) => value.replace(/(\d{3})(\d{3})(\d{4})/, '(***) ***-$3'),
  accountNumber: (value) => `****${value.slice(-4)}`,
};

export function MaskedField({ 
  value, 
  type = 'text', 
  maskType,
  revealable = true,
  autoHideTimeout = 10000,
  requireAuth = false,
  onReveal,
  className = ''
}) {
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef(null);
  const { registerSensitiveData } = useSensitiveData();
  const id = useId();
  
  // Register with sensitive data system
  useEffect(() => {
    const cleanup = registerSensitiveData(id, () => setRevealed(false));
    return cleanup;
  }, [id, registerSensitiveData]);
  
  // Auto-hide timeout
  useEffect(() => {
    if (revealed && autoHideTimeout) {
      timeoutRef.current = setTimeout(() => {
        setRevealed(false);
      }, autoHideTimeout);
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [revealed, autoHideTimeout]);
  
  const handleReveal = async () => {
    if (requireAuth) {
      setLoading(true);
      try {
        const authenticated = await onReveal?.();
        if (authenticated !== false) {
          setRevealed(true);
        }
      } finally {
        setLoading(false);
      }
    } else {
      setRevealed(true);
    }
  };
  
  const maskedValue = maskType && MASK_TYPES[maskType] 
    ? MASK_TYPES[maskType](value)
    : value;
  
  return (
    <div className={`masked-field ${className}`}>
      <span 
        className="masked-field-value"
        data-sensitive="true"
        aria-live="polite"
      >
        {revealed ? value : maskedValue}
      </span>
      
      {revealable && (
        <button
          onClick={() => revealed ? setRevealed(false) : handleReveal()}
          onBlur={() => setRevealed(false)}
          disabled={loading}
          className="reveal-button"
          aria-label={revealed ? 'Hide sensitive data' : 'Reveal sensitive data'}
          aria-pressed={revealed}
        >
          {loading ? '⏳' : revealed ? '🙈 Hide' : '👁️ Show'}
        </button>
      )}
      
      {revealed && autoHideTimeout && (
        <span className="auto-hide-warning" role="status">
          Will hide in {autoHideTimeout / 1000}s
        </span>
      )}
    </div>
  );
}

// ========================================
// SecureDataDisplay.js - Audit Logging
// ========================================

export function SecureDataDisplay({ 
  dataType, 
  dataId, 
  children,
  requirePermission 
}) {
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function checkPermission() {
      // Backend validates permission
      const response = await fetch(`/api/permissions/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          resource: dataType,
          resourceId: dataId,
          permission: requirePermission
        })
      });
      
      const { allowed } = await response.json();
      setHasPermission(allowed);
      
      if (allowed) {
        // Log access
        logAuditEvent('sensitive_data_access', {
          dataType,
          dataId,
          userId: user.id,
          permission: requirePermission,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        });
      }
      
      setLoading(false);
    }
    
    checkPermission();
  }, [dataType, dataId, user.id, requirePermission]);
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!hasPermission) {
    return (
      <div className="permission-denied">
        ⛔ You don't have permission to view this data.
      </div>
    );
  }
  
  return <>{children}</>;
}

// ========================================
// Usage Example
// ========================================

function UserProfilePage() {
  const { user } = useAuth();
  
  return (
    <SensitiveDataProvider>
      <div className="user-profile">
        <h1>User Profile</h1>
        
        <div className="field">
          <label>Email:</label>
          <MaskedField 
            value={user.email}
            maskType="email"
            revealable={true}
          />
        </div>
        
        <SecureDataDisplay
          dataType="user_ssn"
          dataId={user.id}
          requirePermission="view_ssn"
        >
          <div className="field">
            <label>SSN:</label>
            <MaskedField 
              value={user.ssn}
              maskType="ssn"
              revealable={true}
              requireAuth={true}
              autoHideTimeout={5000}
              onReveal={async () => {
                const confirmed = await requestMFA();
                return confirmed;
              }}
            />
          </div>
        </SecureDataDisplay>
        
        <div className="field">
          <label>Credit Card:</label>
          <MaskedField 
            value={user.creditCard}
            maskType="creditCard"
            revealable={false} // Never reveal full credit card
          />
        </div>
      </div>
    </SensitiveDataProvider>
  );
}
```

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

### **Why It Matters**

1. **Legal Compliance**: GDPR fines up to €20M or 4% of revenue, HIPAA fines up to $1.5M per violation
2. **User Trust**: 87% of users abandon brands after a data breach (PwC)
3. **Business Impact**: Average data breach costs $4.45M (IBM 2023)
4. **Reputation**: Irreversible damage to brand (Equifax, Target, Capital One)
5. **Competitive Advantage**: Security as a feature, especially in B2B

### **How It Works (Technical Summary)**

```
┌─────────────────────────────────────────────────────────────┐
│ SENSITIVE DATA PROTECTION LAYERS                            │
└─────────────────────────────────────────────────────────────┘

LAYER 1: DATA CLASSIFICATION
- Identify sensitivity levels (Public, Internal, Confidential, Restricted)
- Tag fields with metadata: data-sensitive="true"

LAYER 2: SERVER-SIDE FILTERING
- Backend validates permissions before sending data
- API returns ONLY fields user has access to
- Never rely on frontend to filter sensitive data

LAYER 3: VISUAL MASKING
- Default: Show masked version (****)
- On demand: Reveal full value with authentication
- Time-limited: Auto-hide after timeout (5-30 seconds)

LAYER 4: ROLE-BASED RENDERING
- Conditional display based on user permissions
- Different data granularity per role (exact vs range)

LAYER 5: MEMORY PROTECTION
- Clear sensitive data from variables when done
- Clear on page unload, visibility change, session end
- Avoid string immutability issues (limited in JS)

LAYER 6: DOM PROTECTION
- Disable copy-paste on sensitive fields
- Detect DevTools (heuristic, limited effectiveness)
- Watermarking for traceability

LAYER 7: LOGGING SANITIZATION
- Redact sensitive fields before logging
- Whitelist/blacklist field names
- Pattern matching for SSN, credit cards, etc.

LAYER 8: THIRD-PARTY ISOLATION
- CSP to restrict script sources
- Subresource Integrity for CDN scripts
- Mark sensitive elements for script respect

LAYER 9: AUDIT TRAIL
- Log who accessed what data when
- Detect anomalies (bulk access, unusual patterns)
- Forensic investigation capability

LAYER 10: INCIDENT RESPONSE
- Breach detection and alerting
- Automated data clearance
- User notification procedures
```

**Defense-in-Depth Principle:**  
No single layer is sufficient. Combine multiple controls to reduce risk. If one fails, others provide backup protection.

────────────────────────────────────

This comprehensive guide covers protecting sensitive UI data at FAANG interview depth. Would you like me to continue with the remaining topics (131-136)?