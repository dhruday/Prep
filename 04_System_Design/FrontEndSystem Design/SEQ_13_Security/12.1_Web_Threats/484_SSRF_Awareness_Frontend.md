# 484 — SSRF Awareness for Frontend Engineers

────────────────────────────────────────────────────────────────

## 1. High-Level Explanation

────────────────────────────────────────────────────────────────

**Server-Side Request Forgery (SSRF)** is a vulnerability where an attacker tricks a server into making HTTP requests to unintended destinations—internal services, cloud metadata endpoints, or private networks—by manipulating user-supplied URLs that the server fetches on behalf of the client.

**Why should frontend engineers care?** Because frontends are the *origin* of the URL data. Every feature where a user supplies a URL—image previews, link unfurling, OG card generation, PDF rendering, webhook configuration—creates an SSRF attack surface. If the frontend passes raw, unvalidated URLs to a backend proxy or BFF (Backend For Frontend), the backend blindly fetches whatever the attacker specifies.

**Core mental model:**

```
User → Frontend (URL input) → Backend (fetch URL) → ATTACKER-CONTROLLED DESTINATION
                                                      ↳ Internal services
                                                      ↳ Cloud metadata (169.254.169.254)
                                                      ↳ Admin panels
                                                      ↳ Databases on private network
```

The frontend is **not the vulnerable layer** (the server does the fetch), but the frontend is the **attack vector** that supplies the malicious payload. A defense-in-depth approach requires validation at *both* frontend and backend.

────────────────────────────────────────────────────────────────

## 2. Deep-Dive Explanation (Senior / Staff Level)

────────────────────────────────────────────────────────────────

### A. SSRF Attack Mechanics

SSRF exploits arise when a server-side component accepts a URL from user input and fetches it without proper validation. The attacker substitutes a benign URL with one targeting internal infrastructure.

**Attack flow:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        SSRF ATTACK FLOW                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────┐    POST /api/preview          ┌──────────────┐            │
│  │ Attacker │ ─────────────────────────────► │  App Server  │            │
│  │ Browser  │  { url: "http://169.254.       │  (Node.js)   │            │
│  │          │   169.254/latest/meta-data" }  │              │            │
│  └──────────┘                                └──────┬───────┘            │
│                                                      │                   │
│                                           fetch(url) │                   │
│                                                      ▼                   │
│                                              ┌──────────────┐            │
│                                              │  AWS IMDS    │            │
│                                              │  169.254.    │            │
│                                              │  169.254     │            │
│                                              └──────┬───────┘            │
│                                                      │                   │
│                                     IAM credentials  │                   │
│                                     access keys      │                   │
│                                     session tokens   │                   │
│                                                      ▼                   │
│  ┌──────────┐    Response with              ┌──────────────┐            │
│  │ Attacker │ ◄──────────────────────────── │  App Server  │            │
│  │ Browser  │    leaked credentials          │              │            │
│  └──────────┘                                └──────────────┘            │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Two SSRF variants:**

| Variant | Description | Danger Level |
|---------|-------------|--------------|
| **Basic (In-band)** | Response from the internal resource is returned directly to the attacker | Critical — full data exfiltration |
| **Blind** | No response returned but the request is still made; attacker infers via timing/side-channels | High — port scanning, triggering internal actions |

### B. Frontend Features That Introduce SSRF Vectors

Every feature below sends a user-controlled URL to a backend that fetches it:

```
┌───────────────────────────────────────────────────────────────────────┐
│                    FRONTEND SSRF ATTACK SURFACE                       │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  1. IMAGE PREVIEW / AVATAR UPLOAD                                     │
│     User enters image URL → backend fetches to resize/proxy           │
│     Attack: url = "http://169.254.169.254/latest/meta-data/"          │
│                                                                       │
│  2. LINK PREVIEW / OG CARD                                            │
│     User pastes a link → backend fetches page, extracts og:tags       │
│     Attack: url = "http://internal-admin.corp:8080/users"             │
│                                                                       │
│  3. PDF / SCREENSHOT GENERATION                                       │
│     User provides URL → Puppeteer/wkhtmltopdf renders it              │
│     Attack: url = "file:///etc/passwd" or internal URLs               │
│                                                                       │
│  4. WEBHOOK CONFIGURATION                                             │
│     User sets callback URL → server POSTs events to it                │
│     Attack: url = "http://10.0.0.5:6379/" (hits internal Redis)       │
│                                                                       │
│  5. RSS / FEED IMPORT                                                 │
│     User provides feed URL → backend fetches XML                      │
│     Attack: url = "http://localhost:3000/admin/delete-all"            │
│                                                                       │
│  6. IMPORT FROM URL (CSV, JSON)                                       │
│     User enters data source URL → backend downloads file              │
│     Attack: url = "http://metadata.google.internal/..."               │
│                                                                       │
│  7. PROXY / CORS BYPASS ENDPOINTS                                     │
│     /api/proxy?url=... → backend fetches any URL                      │
│     Attack: ANY internal resource                                     │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

### C. SSRF in Cloud Environments — The Metadata Goldmine

Cloud providers expose instance metadata services (IMDS) at well-known internal IPs. SSRF targeting these endpoints is catastrophic:

| Cloud Provider | Metadata Endpoint | Data Exposed |
|---------------|-------------------|--------------|
| **AWS** | `http://169.254.169.254/latest/meta-data/` | IAM role credentials, instance identity, user-data scripts |
| **GCP** | `http://metadata.google.internal/computeMetadata/v1/` | Service account tokens, project metadata |
| **Azure** | `http://169.254.169.254/metadata/instance?api-version=2021-02-01` | Managed identity tokens, subscription info |
| **DigitalOcean** | `http://169.254.169.254/metadata/v1/` | Droplet metadata, auth tokens |

**AWS IMDSv1 vs IMDSv2:**

```
IMDSv1 (Vulnerable to SSRF):
  GET http://169.254.169.254/latest/meta-data/iam/security-credentials/role-name
  → Returns: AccessKeyId, SecretAccessKey, Token  ← GAME OVER

IMDSv2 (Requires PUT with hop limit):
  Step 1: PUT http://169.254.169.254/latest/api/token
          Header: X-aws-ec2-metadata-token-ttl-seconds: 21600
          → Returns: session token

  Step 2: GET http://169.254.169.254/latest/meta-data/iam/security-credentials/role-name  
          Header: X-aws-ec2-metadata-token: <token-from-step-1>
          → Returns credentials

  IMDSv2 PUT token request uses HTTP hop limit = 1,
  so requests forwarded through SSRF (extra hop) are BLOCKED.
```

### D. Capital One 2019 Breach — SSRF in the Wild

**The incident:** In July 2019, an attacker exploited an SSRF vulnerability in Capital One's WAF (Web Application Firewall) to access AWS metadata. This exposed data of **106 million** credit card applicants.

```
┌─────────────────────────────────────────────────────────────────────┐
│               CAPITAL ONE BREACH — SSRF ATTACK CHAIN                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Attacker found misconfigured WAF (ModSecurity on EC2)           │
│                                                                     │
│  2. Sent crafted request that made WAF fetch:                       │
│     http://169.254.169.254/latest/meta-data/iam/                    │
│           security-credentials/ISRM-WAF-Role                        │
│                                                                     │
│  3. WAF returned IAM temporary credentials:                         │
│     {                                                               │
│       "AccessKeyId": "ASIA...",                                     │
│       "SecretAccessKey": "wJal...",                                 │
│       "Token": "IQoJb3..."                                         │
│     }                                                               │
│                                                                     │
│  4. Attacker used credentials to:                                   │
│     aws s3 ls  →  listed 700+ S3 buckets                            │
│     aws s3 sync → downloaded customer data                          │
│                                                                     │
│  5. Impact:                                                         │
│     • 106 million customer records exposed                          │
│     • 140,000 Social Security numbers                               │
│     • 80,000 bank account numbers                                   │
│     • $80 million fine from OCC                                     │
│     • $190 million class-action settlement                          │
│                                                                     │
│  ROOT CAUSE: Over-permissioned IAM role + SSRF + IMDSv1             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Lessons for frontend engineers:**
- Any URL that reaches a server fetch is a potential SSRF vector
- Cloud metadata access via SSRF turns a "medium" bug into a "critical" breach
- Defense must be layered: frontend validation + backend validation + network segmentation + IMDSv2

### E. URL Bypass Techniques Attackers Use

Attackers craft URLs to evade naive validation. Frontend and backend validation must handle all of these:

```
┌───────────────────────────────────────────────────────────────────────┐
│                    SSRF BYPASS TECHNIQUES                              │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  1. IP ADDRESS ENCODING                                               │
│     • Decimal:    http://2852039166  (169.254.169.254 as integer)     │
│     • Octal:      http://0251.0376.0251.0376                         │
│     • Hex:        http://0xa9fea9fe                                   │
│     • Mixed:      http://169.254.0xa9.254                            │
│     • IPv6:       http://[::ffff:169.254.169.254]                    │
│     • IPv6 short: http://[::ffff:a9fe:a9fe]                          │
│                                                                       │
│  2. DNS REBINDING                                                     │
│     • Register evil.com → resolves to 169.254.169.254                │
│     • First DNS lookup returns 1.2.3.4 (passes allowlist)            │
│     • Second lookup (actual fetch) returns 169.254.169.254           │
│     • TTL = 0 forces re-resolution                                   │
│                                                                       │
│  3. OPEN REDIRECTS                                                    │
│     • http://allowed-domain.com/redirect?to=http://169.254.169.254   │
│     • Passes domain allowlist, follows redirect to internal IP       │
│                                                                       │
│  4. URL PARSING INCONSISTENCIES                                       │
│     • http://evil.com@169.254.169.254  (userinfo confusion)          │
│     • http://169.254.169.254\t\r\n (whitespace injection)            │
│     • http://169.254.169.254%00.allowed.com (null byte)              │
│     • http://169.254.169.254#@allowed.com (fragment confusion)       │
│                                                                       │
│  5. PROTOCOL SMUGGLING                                                │
│     • gopher://internal:6379/_*1%0d%0a... (Redis commands)           │
│     • file:///etc/passwd                                              │
│     • dict://internal:11211/stats (Memcached)                        │
│                                                                       │
│  6. UNICODE / PUNYCODE                                                │
│     • http://ⅰ69.254.169.254  (Unicode digit ⅰ)                     │
│     • IDN homograph attacks for domain allowlists                    │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

### F. Comprehensive Prevention Strategy

```
┌─────────────────────────────────────────────────────────────────────┐
│                  SSRF DEFENSE LAYERS                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Layer 1: FRONTEND VALIDATION (First line, easily bypassed)         │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │  • Validate URL format before submission                │        │
│  │  • Enforce https:// only                                │        │
│  │  • Block obvious internal IPs in UI                     │        │
│  │  • Show user what URL will be fetched                   │        │
│  │  • Domain allowlist for known integrations              │        │
│  └─────────────────────────────────────────────────────────┘        │
│                          ↓                                          │
│  Layer 2: BACKEND URL VALIDATION (Critical)                         │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │  • Parse URL → resolve DNS → check resolved IP          │        │
│  │  • Block private/reserved IP ranges                     │        │
│  │  • Allowlist permitted domains if possible              │        │
│  │  • Enforce https:// only                                │        │
│  │  • Disable HTTP redirects OR re-validate after redirect │        │
│  │  • Set request timeout and response size limit          │        │
│  └─────────────────────────────────────────────────────────┘        │
│                          ↓                                          │
│  Layer 3: NETWORK SEGMENTATION (Infrastructure)                     │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │  • Outbound proxy for all external requests             │        │
│  │  • Firewall rules blocking metadata IPs (169.254.x.x)  │        │
│  │  • Dedicated "fetcher" service in isolated VPC subnet   │        │
│  │  • No IAM role attached to fetcher instances            │        │
│  │  • AWS: Enforce IMDSv2 on all EC2 instances             │        │
│  └─────────────────────────────────────────────────────────┘        │
│                          ↓                                          │
│  Layer 4: MONITORING & RESPONSE                                     │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │  • Log all outbound requests from server                │        │
│  │  • Alert on requests to internal IP ranges              │        │
│  │  • Alert on metadata endpoint access                    │        │
│  │  • Rate-limit URL fetch endpoints                       │        │
│  └─────────────────────────────────────────────────────────┘        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### G. Private / Reserved IP Ranges to Block

```
┌────────────────────────────────────────────────────────────┐
│              PRIVATE / RESERVED IP RANGES                   │
├──────────────────────┬─────────────────────────────────────┤
│  Range               │  Purpose                            │
├──────────────────────┼─────────────────────────────────────┤
│  10.0.0.0/8          │  Private (Class A)                  │
│  172.16.0.0/12       │  Private (Class B)                  │
│  192.168.0.0/16      │  Private (Class C)                  │
│  127.0.0.0/8         │  Loopback                           │
│  169.254.0.0/16      │  Link-local (Cloud Metadata!)       │
│  0.0.0.0/8           │  "This" network                     │
│  100.64.0.0/10       │  Carrier-grade NAT                  │
│  192.0.0.0/24        │  IETF Protocol Assignments          │
│  192.0.2.0/24        │  Documentation (TEST-NET-1)         │
│  198.18.0.0/15       │  Benchmarking                       │
│  198.51.100.0/24     │  Documentation (TEST-NET-2)         │
│  203.0.113.0/24      │  Documentation (TEST-NET-3)         │
│  224.0.0.0/4         │  Multicast                          │
│  240.0.0.0/4         │  Reserved                           │
│  ::1/128             │  IPv6 loopback                      │
│  fc00::/7            │  IPv6 unique local                  │
│  fe80::/10           │  IPv6 link-local                    │
│  ::ffff:0:0/96       │  IPv4-mapped IPv6                   │
└──────────────────────┴─────────────────────────────────────┘
```

### H. Anti-Patterns — What NOT To Do

```
┌───────────────────────────────────────────────────────────────────────┐
│                          ANTI-PATTERNS                                │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ❌ ANTI-PATTERN 1: Passing raw user URL to backend                  │
│  ┌──────────────────────────────────────────────────────────┐        │
│  │  // Frontend — DANGEROUS                                 │        │
│  │  const handlePreview = async (url: string) => {          │        │
│  │    const res = await fetch('/api/preview', {              │        │
│  │      method: 'POST',                                     │        │
│  │      body: JSON.stringify({ url })   // Raw user input!  │        │
│  │    });                                                    │        │
│  │  };                                                       │        │
│  │                                                           │        │
│  │  // Backend — DANGEROUS                                   │        │
│  │  app.post('/api/preview', async (req, res) => {           │        │
│  │    const data = await fetch(req.body.url); // SSRF!       │        │
│  │    res.json(await data.json());                           │        │
│  │  });                                                      │        │
│  └──────────────────────────────────────────────────────────┘        │
│                                                                       │
│  ❌ ANTI-PATTERN 2: Regex-only URL validation                        │
│  ┌──────────────────────────────────────────────────────────┐        │
│  │  // Easily bypassed by IP encoding tricks                 │        │
│  │  const isValid = /^https?:\/\/[\w.-]+/.test(url);        │        │
│  │  // Passes: http://evil.com@169.254.169.254              │        │
│  │  // Passes: http://0xa9fea9fe                            │        │
│  └──────────────────────────────────────────────────────────┘        │
│                                                                       │
│  ❌ ANTI-PATTERN 3: Blocklist instead of allowlist                   │
│  ┌──────────────────────────────────────────────────────────┐        │
│  │  // Attacker will always find a bypass                    │        │
│  │  const blocked = ['169.254.169.254', 'localhost'];        │        │
│  │  if (!blocked.includes(hostname)) { fetch(url); }        │        │
│  │  // Bypassed with: 0x7f000001, [::1], 127.0.0.1, etc.   │        │
│  └──────────────────────────────────────────────────────────┘        │
│                                                                       │
│  ❌ ANTI-PATTERN 4: Trusting HTTP redirects                          │
│  ┌──────────────────────────────────────────────────────────┐        │
│  │  // URL passes allowlist but redirects to internal IP     │        │
│  │  // evil.com/redirect → 302 → http://169.254.169.254    │        │
│  │  const resp = await fetch(url, { redirect: 'follow' });  │        │
│  │  // Node fetch follows redirects by default!             │        │
│  └──────────────────────────────────────────────────────────┘        │
│                                                                       │
│  ❌ ANTI-PATTERN 5: Open proxy endpoint                              │
│  ┌──────────────────────────────────────────────────────────┐        │
│  │  // "CORS proxy" — SSRF as a feature                      │        │
│  │  app.get('/api/proxy', async (req, res) => {              │        │
│  │    const resp = await fetch(req.query.url as string);     │        │
│  │    const body = await resp.text();                        │        │
│  │    res.send(body);                                        │        │
│  │  });                                                      │        │
│  └──────────────────────────────────────────────────────────┘        │
│                                                                       │
│  ❌ ANTI-PATTERN 6: Allowing non-HTTP protocols                      │
│  ┌──────────────────────────────────────────────────────────┐        │
│  │  // gopher://, file://, dict:// can reach internal svcs   │        │
│  │  // Not checking protocol at all                          │        │
│  │  const data = await fetch(userUrl);                       │        │
│  └──────────────────────────────────────────────────────────┘        │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

────────────────────────────────────────────────────────────────

## 3. Clear Real-World Examples

────────────────────────────────────────────────────────────────

### Example 1: Link Preview in a Chat Application

A Slack-like app auto-generates link previews when a user pastes a URL:

```
Normal use:
  User pastes: https://github.com/facebook/react
  Backend fetches page → extracts <meta property="og:title"> etc.
  Frontend renders preview card.

Attack:
  User pastes: http://169.254.169.254/latest/user-data
  Backend fetches AWS instance user-data (often contains secrets)
  Preview card renders the leaked data as "page content"
```

### Example 2: Avatar Upload by URL in a SaaS Dashboard

```
Normal use:
  User enters: https://avatars.githubusercontent.com/u/12345
  Backend downloads image, resizes it, stores in S3.

Attack:
  User enters: http://10.0.3.45:8500/v1/kv/database/credentials
  Backend fetches Consul KV store, returning DB credentials
  Error message or image processing error leaks partial response
```

### Example 3: PDF Report Generation

```
Normal use:
  User clicks "Export as PDF" → backend uses Puppeteer to render
  the dashboard at an internal URL like http://app:3000/dashboard/123

Attack:
  Attacker modifies request to render: file:///etc/shadow
  Puppeteer loads the file and generates a PDF containing system passwords
  
  Or: http://internal-jenkins.corp:8080/script → Jenkins script console
```

### Example 4: Webhook URL in CI/CD Configuration

```
Normal use:
  User configures webhook: https://hooks.slack.com/services/T.../B.../xxx
  Server POSTs build events to webhook URL.

Attack:
  User configures: http://localhost:6379/
  Body: \r\nSET pwned "attacker_data"\r\n
  Server sends POST with build payload to internal Redis
  Redis interprets the HTTP request body as commands (CRLF injection + SSRF)
```

────────────────────────────────────────────────────────────────

## 4. Interview-Oriented Explanation

────────────────────────────────────────────────────────────────

> **"Can you explain SSRF and how frontend code contributes to it?"**
>
> "Server-Side Request Forgery is a vulnerability where an attacker manipulates user-supplied input to make a server issue requests to unintended internal destinations. While the exploit executes server-side, the frontend is the attack surface—every feature where users submit URLs, like image previews, link unfurling, webhook configs, or PDF generation, is a potential SSRF vector.
>
> At SAP Labs, we identified that several of our BFF endpoints accepted user-provided URLs for OG card generation and document import without proper validation. This contributed to our security audit findings. As part of the initiative where we achieved an 80% reduction in security vulnerabilities, I led the implementation of a multi-layer URL validation strategy.
>
> On the frontend, we built a URL sanitization module that enforced HTTPS-only, validated against a domain allowlist, and resolved hostnames to check for private IP ranges before even sending the URL to the backend. On the server side, we implemented Express middleware that performed DNS resolution on the submitted URL and matched the resolved IP against all RFC 1918 private ranges, link-local addresses including the cloud metadata IP 169.254.169.254, and loopback addresses. We also disabled HTTP redirect following in our fetch calls and re-validated any redirect targets.
>
> The Capital One breach in 2019 is the canonical example—an SSRF in a WAF allowed an attacker to reach the AWS metadata endpoint at 169.254.169.254, obtain IAM credentials, and exfiltrate data from S3 buckets affecting 106 million customers. That incident is why AWS introduced IMDSv2 with a PUT-based token and hop limit.
>
> The key architectural insight is that validation must happen at multiple layers. Frontend validation improves UX and catches casual mistakes, but it's trivially bypassed. Backend validation is the real gate. And infrastructure-level controls—network segmentation, outbound proxies, IMDSv2 enforcement—are the final safety net. It's defense in depth."

> **"How would you design a safe URL preview feature?"**
>
> "I'd implement it with three layers. First, the React component validates the URL client-side—HTTPS only, parsed via the URL constructor to extract the hostname, checked against a domain allowlist if the feature supports known integrations, and basic private IP detection.
>
> Second, the backend receives the URL and runs a strict validation pipeline: parse the URL, resolve the hostname to an IP address, check the resolved IP against all private and reserved CIDR ranges, enforce HTTPS, set a timeout and max response size, and disable redirect following. If we must follow redirects, each redirect target goes through the same validation pipeline.
>
> Third, at the infrastructure level, the URL-fetching service runs in an isolated subnet with no access to internal services. It has no IAM role attached, all EC2 instances enforce IMDSv2, and an outbound proxy firewall blocks requests to any RFC 1918 or link-local address.
>
> I'd also log every outbound request and set up alerts for any attempts to reach private IPs or metadata endpoints—these are high-confidence indicators of attack attempts."

────────────────────────────────────────────────────────────────

## 5. Code Examples

────────────────────────────────────────────────────────────────

### 5A. TypeScript URL Validation Utility

```typescript
// url-validator.ts — Comprehensive SSRF-safe URL validation
import { URL } from 'url';
import dns from 'dns/promises';
import { isIP } from 'net';

// ── Private / Reserved CIDR Ranges ──────────────────────────────
interface CIDRRange {
  network: bigint;
  mask: bigint;
  label: string;
}

function ipv4ToBigInt(ip: string): bigint {
  const parts = ip.split('.').map(Number);
  return (
    (BigInt(parts[0]) << 24n) |
    (BigInt(parts[1]) << 16n) |
    (BigInt(parts[2]) << 8n) |
    BigInt(parts[3])
  );
}

function cidrToRange(cidr: string, label: string): CIDRRange {
  const [ip, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr, 10);
  const mask = prefix === 0 ? 0n : ~((1n << BigInt(32 - prefix)) - 1n) & 0xFFFFFFFFn;
  const network = ipv4ToBigInt(ip) & mask;
  return { network, mask, label };
}

const BLOCKED_RANGES: CIDRRange[] = [
  cidrToRange('0.0.0.0/8', 'this-network'),
  cidrToRange('10.0.0.0/8', 'private-A'),
  cidrToRange('100.64.0.0/10', 'carrier-grade-nat'),
  cidrToRange('127.0.0.0/8', 'loopback'),
  cidrToRange('169.254.0.0/16', 'link-local'),        // Cloud metadata!
  cidrToRange('172.16.0.0/12', 'private-B'),
  cidrToRange('192.0.0.0/24', 'ietf-protocol'),
  cidrToRange('192.0.2.0/24', 'test-net-1'),
  cidrToRange('192.168.0.0/16', 'private-C'),
  cidrToRange('198.18.0.0/15', 'benchmarking'),
  cidrToRange('198.51.100.0/24', 'test-net-2'),
  cidrToRange('203.0.113.0/24', 'test-net-3'),
  cidrToRange('224.0.0.0/4', 'multicast'),
  cidrToRange('240.0.0.0/4', 'reserved'),
];

function isPrivateIPv4(ip: string): boolean {
  const ipNum = ipv4ToBigInt(ip);
  return BLOCKED_RANGES.some(
    (range) => (ipNum & range.mask) === range.network
  );
}

// ── Validation Result ───────────────────────────────────────────
interface ValidationResult {
  valid: boolean;
  error?: string;
  resolvedIP?: string;
  normalizedURL?: string;
}

// ── Configuration ───────────────────────────────────────────────
interface ValidatorConfig {
  allowedProtocols?: string[];        // Default: ['https:']
  allowedDomains?: string[];          // Allowlist (empty = any public domain)
  maxRedirects?: number;              // Default: 0
  resolveTimeout?: number;            // DNS resolution timeout (ms)
  blockPrivateIPs?: boolean;          // Default: true
}

const DEFAULT_CONFIG: Required<ValidatorConfig> = {
  allowedProtocols: ['https:'],
  allowedDomains: [],
  maxRedirects: 0,
  resolveTimeout: 3000,
  blockPrivateIPs: true,
};

// ── Main Validator ──────────────────────────────────────────────
export async function validateURL(
  rawURL: string,
  config: ValidatorConfig = {}
): Promise<ValidationResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Step 1: Parse URL (catches malformed URLs, weird encodings)
  let parsed: URL;
  try {
    parsed = new URL(rawURL);
  } catch {
    return { valid: false, error: 'Malformed URL' };
  }

  // Step 2: Protocol check
  if (!cfg.allowedProtocols.includes(parsed.protocol)) {
    return {
      valid: false,
      error: `Protocol "${parsed.protocol}" not allowed. Use: ${cfg.allowedProtocols.join(', ')}`,
    };
  }

  // Step 3: No credentials in URL (http://user:pass@host)
  if (parsed.username || parsed.password) {
    return { valid: false, error: 'URLs with credentials are not allowed' };
  }

  // Step 4: Domain allowlist (if configured)
  const hostname = parsed.hostname.toLowerCase();
  if (cfg.allowedDomains.length > 0) {
    const allowed = cfg.allowedDomains.some(
      (domain) =>
        hostname === domain.toLowerCase() ||
        hostname.endsWith('.' + domain.toLowerCase())
    );
    if (!allowed) {
      return {
        valid: false,
        error: `Domain "${hostname}" is not in the allowlist`,
      };
    }
  }

  // Step 5: Resolve hostname to IP and check for private ranges
  if (cfg.blockPrivateIPs) {
    // If hostname is already an IP literal, check directly
    if (isIP(hostname)) {
      if (isIP(hostname) === 4 && isPrivateIPv4(hostname)) {
        return { valid: false, error: 'URL resolves to a private IP address' };
      }
      // IPv6 private range check
      if (isIP(hostname) === 6) {
        const lower = hostname.toLowerCase();
        if (
          lower === '::1' ||
          lower.startsWith('fc') ||
          lower.startsWith('fd') ||
          lower.startsWith('fe80') ||
          lower.includes('::ffff:')
        ) {
          return { valid: false, error: 'URL resolves to a private IPv6 address' };
        }
      }
      return {
        valid: true,
        resolvedIP: hostname,
        normalizedURL: parsed.href,
      };
    }

    // DNS resolution with timeout
    let addresses: string[];
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), cfg.resolveTimeout);
      addresses = await dns.resolve4(hostname);
      clearTimeout(timeout);
    } catch {
      return { valid: false, error: `DNS resolution failed for "${hostname}"` };
    }

    // Check ALL resolved IPs (not just the first)
    for (const ip of addresses) {
      if (isPrivateIPv4(ip)) {
        return {
          valid: false,
          error: `Domain "${hostname}" resolves to private IP ${ip}`,
        };
      }
    }

    return {
      valid: true,
      resolvedIP: addresses[0],
      normalizedURL: parsed.href,
    };
  }

  return { valid: true, normalizedURL: parsed.href };
}
```

### 5B. Express Middleware — SSRF Protection

```typescript
// ssrf-middleware.ts — Express middleware blocking SSRF attempts
import { Request, Response, NextFunction } from 'express';
import { validateURL, ValidatorConfig } from './url-validator';

interface SSRFMiddlewareOptions extends ValidatorConfig {
  urlField?: string;       // Request body field containing the URL
  queryParam?: string;     // Query parameter containing the URL
  logAttempts?: boolean;   // Log blocked requests
}

export function ssrfGuard(options: SSRFMiddlewareOptions = {}) {
  const { urlField = 'url', queryParam, logAttempts = true, ...validatorConfig } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Extract URL from request
    const rawURL: string | undefined =
      queryParam
        ? (req.query[queryParam] as string)
        : req.body?.[urlField];

    if (!rawURL || typeof rawURL !== 'string') {
      res.status(400).json({ error: 'Missing or invalid URL parameter' });
      return;
    }

    // Validate
    const result = await validateURL(rawURL, validatorConfig);

    if (!result.valid) {
      if (logAttempts) {
        console.warn('[SSRF-GUARD] Blocked request', {
          ip: req.ip,
          url: rawURL,
          error: result.error,
          path: req.path,
          timestamp: new Date().toISOString(),
        });
      }
      res.status(400).json({ error: 'URL validation failed', detail: result.error });
      return;
    }

    // Attach validated URL and resolved IP to request for downstream use
    (req as any).validatedURL = result.normalizedURL;
    (req as any).resolvedIP = result.resolvedIP;

    next();
  };
}

// ── Usage ───────────────────────────────────────────────────────
//
// import express from 'express';
// import { ssrfGuard } from './ssrf-middleware';
//
// const app = express();
// app.use(express.json());
//
// // Link preview endpoint with SSRF protection
// app.post(
//   '/api/link-preview',
//   ssrfGuard({
//     urlField: 'url',
//     allowedProtocols: ['https:'],
//     blockPrivateIPs: true,
//     logAttempts: true,
//   }),
//   async (req, res) => {
//     const safeURL = (req as any).validatedURL;
//     // Now safe to fetch — URL has been validated and DNS-resolved
//     const response = await fetch(safeURL, {
//       redirect: 'error',           // Block redirects
//       signal: AbortSignal.timeout(5000),  // 5s timeout
//     });
//     const html = await response.text();
//     // Extract OG tags from html...
//     res.json({ title: '...', description: '...' });
//   }
// );
//
// // Webhook registration with domain allowlist
// app.post(
//   '/api/webhooks',
//   ssrfGuard({
//     urlField: 'callbackUrl',
//     allowedProtocols: ['https:'],
//     allowedDomains: ['hooks.slack.com', 'discord.com', 'webhook.site'],
//     blockPrivateIPs: true,
//   }),
//   async (req, res) => {
//     // Save webhook config...
//     res.json({ status: 'registered' });
//   }
// );
```

### 5C. React Component — Safe URL Input with Validation

```tsx
// SafeURLInput.tsx — React component with client-side SSRF protection
import React, { useState, useCallback, useRef } from 'react';

// ── Client-side URL Validation ──────────────────────────────────

interface ClientValidationResult {
  valid: boolean;
  error?: string;
}

const PRIVATE_IP_PATTERNS = [
  /^127\./,                                   // Loopback
  /^10\./,                                    // Private Class A
  /^172\.(1[6-9]|2\d|3[01])\./,              // Private Class B
  /^192\.168\./,                              // Private Class C
  /^169\.254\./,                              // Link-local / Cloud metadata
  /^0\./,                                     // "This" network
  /^100\.(6[4-9]|[7-9]\d|1[0-2][0-7])\./,    // Carrier-grade NAT
  /^localhost$/i,
  /^\[::1\]$/,                                // IPv6 loopback
  /^\[fc/i,                                   // IPv6 ULA
  /^\[fd/i,
  /^\[fe80/i,                                 // IPv6 link-local
];

function validateURLClient(rawURL: string): ClientValidationResult {
  // Empty check
  if (!rawURL.trim()) {
    return { valid: false, error: 'URL is required' };
  }

  // Parse
  let parsed: URL;
  try {
    parsed = new URL(rawURL);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Protocol
  if (parsed.protocol !== 'https:') {
    return { valid: false, error: 'Only HTTPS URLs are allowed' };
  }

  // Credentials in URL
  if (parsed.username || parsed.password) {
    return { valid: false, error: 'URLs with credentials are not allowed' };
  }

  // Hostname present
  if (!parsed.hostname) {
    return { valid: false, error: 'URL must have a hostname' };
  }

  // Private IP check (client-side — basic, backend does the real check)
  const hostname = parsed.hostname.toLowerCase();
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return { valid: false, error: 'Internal/private URLs are not allowed' };
    }
  }

  // Numeric IP detection (decimal encoding like http://2852039166)
  if (/^\d+$/.test(hostname)) {
    return { valid: false, error: 'Numeric IP addresses are not allowed' };
  }

  // Hex IP detection
  if (/^0x[0-9a-f]+$/i.test(hostname)) {
    return { valid: false, error: 'Hex-encoded IP addresses are not allowed' };
  }

  return { valid: true };
}

// ── Component ───────────────────────────────────────────────────

interface SafeURLInputProps {
  label: string;
  placeholder?: string;
  onValidURL: (url: string) => void;
  allowedDomains?: string[];   // Optional domain allowlist shown as hint
}

export const SafeURLInput: React.FC<SafeURLInputProps> = ({
  label,
  placeholder = 'https://example.com',
  onValidURL,
  allowedDomains,
}) => {
  const [url, setURL] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setURL(value);
      setError(null);

      // Debounced client-side validation
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (!value.trim()) {
          setError(null);
          return;
        }
        const result = validateURLClient(value);
        if (!result.valid) {
          setError(result.error ?? 'Invalid URL');
        }
      }, 300);
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    // Client-side validation
    const clientResult = validateURLClient(url);
    if (!clientResult.valid) {
      setError(clientResult.error ?? 'Invalid URL');
      return;
    }

    // Server-side validation (the real protection)
    setIsValidating(true);
    try {
      const response = await fetch('/api/validate-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.detail || 'URL validation failed');
        return;
      }

      setError(null);
      onValidURL(url);
    } catch {
      setError('Failed to validate URL. Please try again.');
    } finally {
      setIsValidating(false);
    }
  }, [url, onValidURL]);

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label htmlFor="safe-url-input" style={{ display: 'block', fontWeight: 600 }}>
        {label}
      </label>

      {allowedDomains && (
        <p style={{ fontSize: '0.85rem', color: '#666', margin: '4px 0' }}>
          Allowed domains: {allowedDomains.join(', ')}
        </p>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          id="safe-url-input"
          type="url"
          value={url}
          onChange={handleChange}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? 'url-error' : undefined}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: `1px solid ${error ? '#dc3545' : '#ced4da'}`,
            borderRadius: '4px',
            fontSize: '14px',
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={isValidating || !url.trim()}
          style={{
            padding: '8px 16px',
            backgroundColor: '#0d6efd',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isValidating ? 'wait' : 'pointer',
            opacity: isValidating ? 0.7 : 1,
          }}
        >
          {isValidating ? 'Validating...' : 'Submit'}
        </button>
      </div>

      {error && (
        <p
          id="url-error"
          role="alert"
          style={{ color: '#dc3545', fontSize: '0.85rem', marginTop: '4px' }}
        >
          {error}
        </p>
      )}
    </div>
  );
};
```

### 5D. Safe Fetch Wrapper — Backend

```typescript
// safe-fetch.ts — Fetch wrapper that prevents SSRF via redirect validation
import { validateURL, ValidatorConfig } from './url-validator';

interface SafeFetchOptions extends ValidatorConfig {
  maxResponseSize?: number;    // bytes, default 5MB
  timeoutMs?: number;          // default 10s
  maxRedirects?: number;       // default 0
}

export async function safeFetch(
  rawURL: string,
  fetchOptions: RequestInit = {},
  ssrfOptions: SafeFetchOptions = {}
): Promise<Response> {
  const {
    maxResponseSize = 5 * 1024 * 1024,   // 5MB
    timeoutMs = 10_000,
    maxRedirects = 0,
    ...validatorConfig
  } = ssrfOptions;

  // Validate initial URL
  const validation = await validateURL(rawURL, validatorConfig);
  if (!validation.valid) {
    throw new Error(`SSRF protection: ${validation.error}`);
  }

  let currentURL = validation.normalizedURL!;
  let redirectCount = 0;

  while (true) {
    const response = await fetch(currentURL, {
      ...fetchOptions,
      redirect: 'manual',                    // Never auto-follow redirects
      signal: AbortSignal.timeout(timeoutMs),
    });

    // Handle redirects manually with re-validation
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (redirectCount >= maxRedirects) {
        throw new Error(
          `SSRF protection: redirect limit (${maxRedirects}) exceeded`
        );
      }

      const location = response.headers.get('location');
      if (!location) {
        throw new Error('SSRF protection: redirect without Location header');
      }

      // Resolve relative redirects
      const redirectURL = new URL(location, currentURL).href;

      // RE-VALIDATE the redirect target
      const redirectValidation = await validateURL(redirectURL, validatorConfig);
      if (!redirectValidation.valid) {
        throw new Error(
          `SSRF protection: redirect target blocked — ${redirectValidation.error}`
        );
      }

      currentURL = redirectValidation.normalizedURL!;
      redirectCount++;
      continue;
    }

    // Check Content-Length before consuming body
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > maxResponseSize) {
      throw new Error(
        `SSRF protection: response size ${contentLength} exceeds limit ${maxResponseSize}`
      );
    }

    return response;
  }
}

// ── Usage ───────────────────────────────────────────────────────
//
// try {
//   const resp = await safeFetch('https://example.com/api/data', {
//     headers: { 'Accept': 'application/json' },
//   }, {
//     allowedProtocols: ['https:'],
//     blockPrivateIPs: true,
//     maxRedirects: 2,
//     timeoutMs: 5000,
//   });
//   const data = await resp.json();
// } catch (err) {
//   // 'SSRF protection: Domain "evil.local" resolves to private IP 10.0.0.5'
//   console.error(err.message);
// }
```

### 5E. Integration Test — Verifying SSRF Protection

```typescript
// __tests__/ssrf-protection.test.ts
import { validateURL } from '../url-validator';

describe('SSRF URL Validator', () => {
  // ── Should BLOCK ──────────────────────────────────────────────
  const blockedURLs = [
    ['http://169.254.169.254/latest/meta-data/', 'AWS metadata (HTTP)'],
    ['https://169.254.169.254/', 'AWS metadata (HTTPS)'],
    ['http://127.0.0.1:3000', 'loopback'],
    ['http://localhost', 'localhost'],
    ['http://10.0.0.1:8080', 'private class A'],
    ['http://172.16.0.1', 'private class B'],
    ['http://192.168.1.1', 'private class C'],
    ['ftp://example.com/file', 'non-HTTP protocol'],
    ['gopher://internal:6379/', 'gopher protocol'],
    ['file:///etc/passwd', 'file protocol'],
    ['http://user:pass@example.com', 'URL with credentials'],
    ['http://[::1]/', 'IPv6 loopback'],
    ['http://[fc00::1]/', 'IPv6 unique local'],
    ['not-a-url', 'malformed URL'],
    ['', 'empty string'],
  ];

  test.each(blockedURLs)('blocks %s (%s)', async (url) => {
    const result = await validateURL(url);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  // ── Should ALLOW ──────────────────────────────────────────────
  const allowedURLs = [
    ['https://example.com', 'standard HTTPS'],
    ['https://api.github.com/repos', 'HTTPS API'],
    ['https://cdn.example.com/image.png', 'HTTPS CDN'],
  ];

  test.each(allowedURLs)('allows %s (%s)', async (url) => {
    const result = await validateURL(url, {
      allowedProtocols: ['https:'],
      blockPrivateIPs: true,
    });
    // Note: In CI, DNS resolution may fail for example.com
    // These tests should mock dns.resolve4 in a real test suite
    expect(result.error).not.toContain('Protocol');
    expect(result.error).not.toContain('private IP');
  });

  // ── Domain allowlist ──────────────────────────────────────────
  it('rejects URLs outside domain allowlist', async () => {
    const result = await validateURL('https://evil.com/payload', {
      allowedDomains: ['github.com', 'slack.com'],
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not in the allowlist');
  });

  it('accepts subdomains of allowed domains', async () => {
    const result = await validateURL('https://api.github.com/repos', {
      allowedDomains: ['github.com'],
      blockPrivateIPs: false,    // Skip DNS for unit test
    });
    expect(result.valid).toBe(true);
  });
});
```

────────────────────────────────────────────────────────────────

## 6. Why & How Summary

────────────────────────────────────────────────────────────────

| Dimension | Detail |
|-----------|--------|
| **What** | SSRF — server makes requests to attacker-controlled destinations via user-supplied URLs |
| **Why it matters** | Capital One 2019: 106M records leaked via SSRF → AWS metadata → IAM credentials → S3 exfiltration. $80M fine. |
| **Frontend's role** | Every user-URL feature (preview, webhook, import, PDF, proxy) is an SSRF entry point |
| **Cloud danger** | `169.254.169.254` metadata endpoint returns IAM credentials, turning SSRF into full cloud compromise |
| **Bypass techniques** | IP encoding (decimal, hex, octal, IPv6-mapped), DNS rebinding, open redirects, protocol smuggling, URL parsing inconsistencies |
| **Frontend defense** | HTTPS-only, URL constructor parsing, private IP regex, domain allowlist, numeric IP blocking — improves UX, not security |
| **Backend defense** | Parse URL → DNS resolve → check resolved IP against all RFC 1918 + reserved ranges → disable redirects or re-validate each hop → timeout + size limits |
| **Infrastructure defense** | Isolated fetcher service, no IAM roles on fetcher, IMDSv2 enforcement, outbound proxy, firewall blocking metadata IPs |
| **Key principle** | Never trust user-supplied URLs. Validate after DNS resolution (not before). Re-validate redirect targets. Defense in depth across all layers. |
| **Testing** | Unit test URL validator against bypass catalog. Integration test with mock DNS. Penetration test with SSRF payload lists. |

```
SSRF DEFENSE DECISION TREE
───────────────────────────

Does user supply a URL?
  │
  ├── YES → Does server fetch it?
  │           │
  │           ├── YES → SSRF RISK
  │           │         │
  │           │         ├─ Parse with URL constructor
  │           │         ├─ Enforce https:// only
  │           │         ├─ Strip credentials from URL
  │           │         ├─ DNS resolve hostname
  │           │         ├─ Check resolved IP against ALL private ranges
  │           │         ├─ Disable redirects (or re-validate each)
  │           │         ├─ Set timeout + max response size
  │           │         ├─ Log outbound requests
  │           │         └─ Run fetcher in isolated network segment
  │           │
  │           └── NO → Lower risk (but still validate for XSS)
  │
  └── NO → Not an SSRF vector
```

────────────────────────────────────────────────────────────────

**Key Takeaway:** SSRF is a server-side vulnerability with a frontend origin. Senior frontend engineers must understand how their URL-accepting features create SSRF attack surfaces, implement client-side validation as the first layer, and collaborate with backend teams to ensure DNS-level IP validation, redirect handling, and network segmentation are in place.

────────────────────────────────────────────────────────────────

*References: OWASP SSRF Prevention Cheat Sheet, Capital One Breach Analysis (Krebs on Security), AWS IMDSv2 Documentation, CWE-918*
