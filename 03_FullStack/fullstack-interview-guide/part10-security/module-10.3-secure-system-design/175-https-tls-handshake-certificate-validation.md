# HTTPS — TLS Handshake, Certificate Validation
> Part 10 — Security (Full Stack)
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **TLS** (Transport Layer Security): the cryptographic protocol that makes HTTPS secure — authenticates the server (proves it's really `bank.com`, not an impostor), and encrypts all data in transit so eavesdroppers see only ciphertext
- **TLS 1.3 Handshake** (2018, current standard): Client sends `ClientHello` (supported ciphers, key share) → Server sends `ServerHello` (chosen cipher, its key share, certificate) → Both derive the same symmetric key via ECDHE → Server sends `Finished` (encrypted with the new key) → Client verifies → Encrypted channel established; **1-RTT** (one round trip) vs TLS 1.2's 2-RTT
- **Certificate validation**: browser receives the server's X.509 certificate → checks it was signed by a trusted CA (Certificate Authority) in the OS/browser trust store → checks the domain in the cert's Subject Alternative Name (SAN) matches → checks `notBefore` and `notAfter` (validity period) → checks OCSP/CRL revocation status; if any check fails → "Not Secure" warning
- **HSTS** (HTTP Strict Transport Security): `Strict-Transport-Security: max-age=31536000` — browser remembers never to use HTTP for this domain for 1 year; prevents downgrade attacks even if user types `http://`
- **Certificate pinning**: client hard-codes the expected certificate or public key hash; rejects connection if the cert doesn't match — protects against compromised CAs; used in mobile apps (not recommended for browsers due to operational complexity)
- ✅ At SAP: managed HTTPS configuration for Spring Boot services on AWS + configured HSTS on all responses; certificates via ACM (AWS Certificate Manager) auto-renewed; enforced TLS 1.2+ with strong cipher suites

---

## 1. One-Line Definition
HTTPS is HTTP secured with TLS — a protocol that authenticates the server's identity via a digitally signed certificate and establishes an encrypted channel using asymmetric key exchange before switching to faster symmetric encryption for the actual data transfer.

---

## 2. The Problem It Solves

HTTP transmits data as plaintext. Every router, ISP, coffee shop Wi-Fi, and any device on the network path can read the full request and response. An eavesdropper on a corporate network captures every login form, every session cookie, every credit card number entered on any HTTP site.

Worse: without authentication, a network attacker can perform a man-in-the-middle (MITM) attack. Your browser connects to `bank.com`, but an attacker in between intercepts the connection and proxies it, reading and potentially modifying all traffic. Your browser shows `bank.com` in the address bar but is actually talking to the attacker.

TLS solves both:
1. **Authentication**: the server presents a certificate signed by a Certificate Authority (CA) that your browser trusts. The browser verifies the certificate's signature using the CA's public key — mathematically proves the cert was issued by a trusted authority. The cert includes the server's domain name — browser confirms it matches the URL. An attacker can't forge this certificate without the CA's private key, which they don't have.

2. **Encryption**: after authentication, TLS establishes a symmetric encryption key (via ECDHE key exchange — nobody on the network can derive this key by watching the handshake). All subsequent data is encrypted. Even if an eavesdropper captures every packet, they see random ciphertext.

The result: users can be confident they're talking to the real site and that eavesdroppers can't read the conversation.

---

## 3. How It Works Internally

### TLS 1.3 Handshake (1-RTT)

```
CLIENT                                    SERVER

ClientHello:
├── TLS version: 1.3
├── Client random (32 bytes)
├── Supported cipher suites:
│     TLS_AES_256_GCM_SHA384
│     TLS_AES_128_GCM_SHA256
│     TLS_CHACHA20_POLY1305_SHA256
└── Key share (client's ECDHE public key)
─────────────────────────────────────────────────►

                                          ServerHello:
                                          ├── TLS version: 1.3
                                          ├── Server random (32 bytes)
                                          ├── Chosen cipher suite: TLS_AES_256_GCM_SHA384
                                          └── Key share (server's ECDHE public key)
                                          
                                          [Both sides now derive the same symmetric key
                                           from their key shares + randoms using ECDHE:
                                           client_key_share + server_key_share → shared secret
                                           → actual encryption keys derived via HKDF]
                                          
                                          Certificate: (server's X.509 certificate)
                                          CertificateVerify: (server signs with private key)
                                          Finished: (MAC over entire handshake, encrypted)
◄─────────────────────────────────────────────────

Client validates:
├── Certificate:
│   ├── Is the domain in SAN = the requested domain?
│   ├── Is the cert signed by a trusted CA?
│   ├── Is it within validity period (notBefore/notAfter)?
│   └── Has it been revoked? (OCSP / CRL check)
├── CertificateVerify:
│   └── Verify server's signature with server public key from cert
│       Proves server owns the private key corresponding to cert
└── Finished:
    └── Verify integrity of entire handshake

Finished: (client's MAC, encrypted)
─────────────────────────────────────────────────►

                                          Handshake complete ✅
                                          All subsequent data encrypted with symmetric key

HTTP request (encrypted):
GET /api/orders ...
─────────────────────────────────────────────────►
```

### Why ECDHE (Ephemeral Diffie-Hellman)?

The key insight: the server's private key is NOT used to encrypt the session key. It's only used to sign the certificate. The actual encryption key is derived from an ephemeral (temporary, per-session) ECDHE exchange.

**Why this matters — Perfect Forward Secrecy (PFS)**:
- If an attacker records all encrypted traffic today and later steals the server's private key, they still cannot decrypt the traffic
- The session keys are derived from ephemeral ECDHE parameters that are discarded after each connection
- There's no mathematical way to derive past session keys from the certificate private key
- TLS 1.2 without ECDHE (e.g. RSA key exchange) lacks PFS — a future private key compromise decrypts all historical traffic
- TLS 1.3 mandates ECDHE — PFS is guaranteed

### Certificate Chain of Trust

```
Root CA (e.g. DigiCert Root CA)
├── Pre-installed in OS/browser trust store
├── Root CA private key stored offline in HSM (Hardware Security Module)
└── Signs → Intermediate CA certificate

Intermediate CA (e.g. DigiCert TLS RSA SHA256 2020 CA1)
├── Issued by Root CA — trusted because Root CA is trusted
└── Signs → Your server certificate

Your server certificate (e.g. company.com)
├── Issued by Intermediate CA
├── Contains: domain (SAN), public key, validity period
└── Signed by Intermediate CA's private key

Verification path:
1. Browser receives your server cert + intermediate cert (in TLS handshake)
2. Verifies intermediate cert is signed by a trusted root (in trust store)
3. Verifies server cert is signed by the intermediate cert
4. Verifies server cert's SAN includes the requested domain
5. Verifies cert isn't expired and isn't revoked (OCSP)
6. Trust established — padlock shown
```

### OCSP Stapling

- Standard OCSP: browser asks the CA's OCSP server "is this certificate revoked?" — adds latency; your cert issuer's server must be responsive for your users to connect
- OCSP Stapling: your server asks the CA for the OCSP response (proof of validity) and includes it in the TLS handshake — browser gets the freshness proof directly from your server; no extra request to the CA's server; better privacy (CA doesn't see which domains each client visits); lower latency
- Configure in nginx: `ssl_stapling on; ssl_stapling_verify on;`
- Configure in Spring Boot (behind nginx/ALB): the load balancer handles TLS; OCSP stapling is configured on the load balancer or CDN

### TLS 1.2 vs TLS 1.3

| Feature | TLS 1.2 | TLS 1.3 |
|---------|---------|---------|
| Handshake | 2-RTT | 1-RTT (0-RTT optional for resumption) |
| Cipher suites | Many (including weak ones) | Only 5 (all strong) |
| RSA key exchange | Allowed (no PFS) | Removed |
| ECDHE | Optional | Mandatory (PFS guaranteed) |
| Vulnerable cipher suites removed | No — RC4, MD5, CBC still possible | Yes — all legacy removed |
| Performance | Slower handshake | Faster |
| Adoption | Legacy support | Standard since 2018 |

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```java
// Spring Boot — not enforcing HTTPS, no HSTS configuration
@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}

// application.yml — no TLS configuration at all
// Accepting HTTP connections on port 8080
// No redirect from HTTP to HTTPS
// No HSTS header
```

```yaml
# Worse: allowing weak cipher suites or TLS 1.0/1.1
server:
  ssl:
    enabled: true
    protocol: TLS
    # Missing: enabled-protocols restricts to TLS 1.2+ only
    # Without this, TLS 1.0 and TLS 1.1 are still accepted
    # These have known vulnerabilities (POODLE, BEAST)
    
    # Missing: cipher suites — server may accept weak ciphers
    # Missing: HSTS — browser might still try HTTP on the first visit
```

```java
// Java code that disables certificate validation — common in dev, catastrophic in production
// Never do this in production code — makes HTTPS completely useless
TrustManager[] trustAllCerts = new TrustManager[]{
    new X509TrustManager() {
        public void checkClientTrusted(X509Certificate[] certs, String authType) {}
        public void checkServerTrusted(X509Certificate[] certs, String authType) {}  // TRUSTS EVERYTHING
        public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
    }
};
SSLContext sc = SSLContext.getInstance("TLS");
sc.init(null, trustAllCerts, new SecureRandom());
HttpsURLConnection.setDefaultSSLSocketFactory(sc.getSocketFactory());
// This allows MITM attacks — the certificate is never validated
// Even a self-signed cert from an attacker is accepted
```

> **Why this fails in production:** `TLS 1.0 / 1.1` have exploitable vulnerabilities (POODLE, BEAST attacks). Weak cipher suites (RC4, MD5, 3DES) can be attacked to recover plaintext. No HSTS means first-visit users connecting over HTTP can be MITM-attacked before they're redirected to HTTPS. Disabling certificate validation is equivalent to using HTTP — you get the CPU cost of encryption with zero security.

### Right Way — Production Quality

**Spring Boot TLS hardening:**
```yaml
# application.yml — production TLS configuration
server:
  port: 8443
  ssl:
    enabled: true
    # Certificate from AWS ACM (for cloud) or Let's Encrypt
    key-store: classpath:keystore.p12
    key-store-password: ${SSL_KEYSTORE_PASSWORD}  # from environment/Vault
    key-store-type: PKCS12
    key-alias: company-app
    
    # TLS 1.2 minimum; TLS 1.3 preferred
    # Removing TLS 1.0 and 1.1 eliminates POODLE and BEAST vulnerabilities
    enabled-protocols:
      - TLSv1.2
      - TLSv1.3
    
    # Approved cipher suites only — strong, modern ciphers with PFS
    # ECDHE provides Perfect Forward Secrecy
    # AES-GCM and CHACHA20 are AEAD ciphers (authenticated encryption)
    # SHA384/SHA256 for integrity
    ciphers:
      - TLS_AES_256_GCM_SHA384           # TLS 1.3
      - TLS_AES_128_GCM_SHA256           # TLS 1.3
      - TLS_CHACHA20_POLY1305_SHA256     # TLS 1.3
      - TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384  # TLS 1.2
      - TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384    # TLS 1.2
      - TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256  # TLS 1.2
      - TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256    # TLS 1.2
```

**Redirect HTTP to HTTPS and add HSTS:**
```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // Redirect all HTTP requests to HTTPS
            .requiresChannel(channel -> channel
                .requestMatchers("/**").requiresSecure()
            )
            // HSTS: tell browsers to only use HTTPS for this domain for 1 year
            // includeSubDomains: apply to all subdomains
            // preload: register with browser preload list (browsers hard-code HSTS from day 1)
            .headers(headers -> headers
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(31536000)  // 1 year
                    .preload(true)              // apply for HSTS preload list registration
                )
            )
            .authorizeHttpRequests(auth -> auth
                .anyRequest().authenticated()
            );
        return http.build();
    }
}
```

**Spring Boot HTTP-to-HTTPS redirect (if running both on different ports):**
```java
// If the app serves both HTTP (8080) and HTTPS (8443) separately
// This redirects HTTP to HTTPS
@Configuration
public class HttpsRedirectConfig {

    @Bean
    public ServletWebServerFactory servletContainer() {
        TomcatServletWebServerFactory tomcat = new TomcatServletWebServerFactory() {
            @Override
            protected void postProcessContext(Context context) {
                SecurityConstraint securityConstraint = new SecurityConstraint();
                securityConstraint.setUserConstraint("CONFIDENTIAL");
                SecurityCollection collection = new SecurityCollection();
                collection.addPattern("/*");
                securityConstraint.addCollection(collection);
                context.addConstraint(securityConstraint);
            }
        };
        // HTTP connector on 8080 that redirects to HTTPS on 8443
        tomcat.addAdditionalTomcatConnectors(httpConnector());
        return tomcat;
    }

    private Connector httpConnector() {
        Connector connector = new Connector(TomcatServletWebServerFactory.DEFAULT_PROTOCOL);
        connector.setScheme("http");
        connector.setPort(8080);
        connector.setSecure(false);
        connector.setRedirectPort(8443);
        return connector;
    }
}
```

**WebClient with custom TLS for service-to-service (disabling only for local dev, never prod):**
```java
// CORRECT: Trusting only a specific self-signed certificate in dev
// NOT disabling all certificate validation
@Profile("local")
@Bean
public WebClient localWebClient() throws Exception {
    // Load specifically the dev certificate — not trusting all certs
    // This is acceptable for local dev with a known self-signed cert
    TrustManagerFactory tmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
    KeyStore trustStore = KeyStore.getInstance("JKS");
    try (InputStream is = getClass().getResourceAsStream("/dev-truststore.jks")) {
        trustStore.load(is, "devpassword".toCharArray());
    }
    tmf.init(trustStore);
    
    SSLContext sslContext = SSLContext.getInstance("TLS");
    sslContext.init(null, tmf.getTrustManagers(), null);
    
    SslContext nettySslContext = SslContextBuilder.forClient()
        .trustManager(tmf)
        .protocols("TLSv1.2", "TLSv1.3")
        .build();
    
    HttpClient httpClient = HttpClient.create()
        .secure(ssl -> ssl.sslContext(nettySslContext));
    
    return WebClient.builder()
        .clientConnector(new ReactorClientHttpConnector(httpClient))
        .build();
}

// PRODUCTION: Standard WebClient trusts system trust store (correct)
@Bean
@Profile("!local")
public WebClient webClient() {
    // Default WebClient uses the JVM's trust store — which includes all major CAs
    // Properly validates certificates — do not customise this for prod
    return WebClient.builder().build();
}
```

**AWS infrastructure — certificate management:**
```yaml
# AWS ALB (Application Load Balancer) terminates TLS 
# Spring Boot services behind ALB communicate over HTTP internally (inside VPC)
# ALB enforces TLS 1.2+ minimum and strong cipher suites via security policy

# CDK / CloudFormation:
# AWS::ElasticLoadBalancingV2::Listener:
#   Certificates:
#     - CertificateArn: arn:aws:acm:us-east-1:...:certificate/...  # ACM auto-renews
#   SslPolicy: ELBSecurityPolicy-TLS13-1-2-2021-06  # TLS 1.2+ with strong ciphers
#   DefaultActions:
#     - Type: forward
#       TargetGroupArn: !Ref AppTargetGroup
```

> **Key decisions here:**
> - In production AWS deployments, TLS terminates at the ALB or CloudFront CDN — the Spring Boot app itself doesn't need to handle TLS; the ALB manages certificate renewal (ACM) and TLS policy; the Spring Boot to ALB communication is over internal VPC HTTP
> - If Spring Boot does terminate TLS directly (on-premise, Kubernetes without an ingress controller), restrict to `TLSv1.2` and `TLSv1.3` and use only ECDHE cipher suites
> - HSTS must be served over HTTPS — serving it over HTTP is a violation of the spec and ignored by browsers; ensure it's in every HTTPS response
> - `preload: true` in HSTS should only be set if you're registering the domain in the HSTS preload list — once registered, removing HSTS is very difficult; don't add preload unless committed to HTTPS-only permanently

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Walk me through what happens during a TLS handshake when I visit `https://bank.com`."

**Hruday's answer:**
> When your browser connects to `bank.com` over HTTPS, it first establishes a TCP connection, then immediately initiates the TLS handshake.
>
> In TLS 1.3: your browser sends a `ClientHello` message containing the TLS version, a list of supported cipher suites, and importantly — the browser's ECDHE public key share. This is the key exchange mechanism.
>
> The bank's server responds with a `ServerHello` — its chosen cipher suite, the server's ECDHE public key share, and its certificate chain. At this point, both sides have what they need to independently compute the same shared secret using ECDHE — without any third party being able to derive it from watching the exchange. This derived key becomes the symmetric encryption key for the session.
>
> The server also sends a `CertificateVerify` — a signature over the handshake transcript, signed with the server's private key. Your browser verifies this signature using the public key in the server's certificate. This proves the server owns the private key that corresponds to the cert.
>
> Your browser also validates the certificate: is it signed by a CA in my trust store? Is the domain in the cert's Subject Alternative Name `bank.com`? Is it still within its validity period? Has it been revoked? If all checks pass, the handshake completes in one round trip — TLS 1.3 is 1-RTT — and all subsequent HTTP data travels encrypted with the derived symmetric key.

---

### Q2 — Deep Dive
**Interviewer asks:** "What is Perfect Forward Secrecy and why does it matter?"

**Hruday's answer:**
> Perfect Forward Secrecy means that the session keys used to encrypt past traffic cannot be derived from the server's long-term private key, even if that private key is stolen in the future.
>
> In older TLS handshakes without PFS — specifically RSA key exchange — the client would encrypt the session key with the server's public key. The server decrypts it with its private key. If an attacker records all the encrypted traffic today, and five years later steals the server's private key (or it leaks), they can decrypt all the historical traffic.
>
> With ECDHE — which TLS 1.3 mandates — the session key is derived from ephemeral key exchange. The server generates a temporary key pair for each connection, uses it for the ECDHE exchange, derives the session key, and then discards the temporary key. The session key is never stored anywhere and cannot be derived from the certificate's private key.
>
> So if an attacker records traffic now and later steals the private key: they can still verify the certificate was genuine, but they cannot derive the session keys — those were derived from ephemeral parameters that no longer exist. The recorded traffic remains encrypted. PFS protects against the "record now, compromise later" attack scenario, which is especially relevant for intelligence agencies and patient attackers.
>
> TLS 1.3 requires ECDHE, so if you enforce TLS 1.3 and block TLS 1.2 fallback, PFS is guaranteed. Restricting TLS 1.2 to only ECDHE cipher suites achieves the same for legacy clients.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "What is HSTS and what is the preload list? When would you NOT enable preload?"

**Hruday's answer:**
> HSTS — HTTP Strict Transport Security — is a response header that tells a browser: "For this domain, only use HTTPS, never HTTP, for the next N seconds." After the first HTTPS visit, the browser internally stores this policy. Even if the user later types `http://company.com` or clicks an HTTP link, the browser first upgrades to HTTPS before making any request. This prevents downgrade attacks where an attacker intercepts the initial HTTP request before the redirect.
>
> The preload list is a browser-bundled list of domains that always get HTTPS, even on the first visit — before they've ever sent the HSTS header. To be on the preload list, you submit to hstspreload.org. Browsers like Chrome, Firefox, and Edge include this list in their binary.
>
> When NOT to enable preload: it's very difficult to undo. If you register at hstspreload.org and later need to serve HTTP for any reason — legacy device support, technical debt, an edge case — you're stuck. The browsers that have baked in the preload entry will refuse HTTP for your domain indefinitely (the removal process takes 3-6 months per browser vendor). Don't add preload unless you are 100% committed to HTTPS-only forever on that domain and all its subdomains (because `includeSubDomains` is required for preload). For most applications, HSTS with `max-age=31536000` and `includeSubDomains` without `preload` is the right configuration.

---

### Q4 — Scenario
**Interviewer asks:** "Your team discovers a Spring Boot service that has `trustAllCerts` in production code from a developer who added it to fix a certificate issue in staging. What do you do?"

**Hruday's answer:**
> This is a critical security incident requiring immediate remediation.
>
> `trustAllCerts` disables certificate validation entirely — effectively turning HTTPS back into HTTP from a security perspective. Any attacker with network access between your service and the upstream system it calls can perform a man-in-the-middle attack: intercept the connection, present any certificate, and both read and modify all traffic without detection. Since the certificate is never validated, there's no detection mechanism.
>
> Immediate action: identify what this service calls and what data flows through those connections. If there are any sensitive credentials, user data, or internal service tokens in those requests, assume they may have been intercepted and rotate those credentials.
>
> Fix: the correct solution to a certificate issue is to fix the certificate, not to disable validation. If it was a self-signed certificate in staging: import the self-signed cert into a dedicated truststore used only in the staging environment, and use that truststore. In production, use a cert from a real CA (Let's Encrypt, ACM, DigiCert).
>
> Process improvement: add a SAST rule to flag `TrustManager` implementations that override `checkServerTrusted` with an empty body or that call `X509TrustManager` without any validation — this is a common mistake that should fail the CI/CD build. Also, add it to the code review security checklist.
>
> This scenario is an OWASP A02: Cryptographic Failure — disabling encryption-layer certificate validation eliminates the security that HTTPS provides.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "HTTPS means the site is safe" | "The padlock means the website is legitimate and safe" | The padlock only means: the connection between you and the server is encrypted and authenticated; it says nothing about whether the server itself is malicious; phishing sites can and do use HTTPS with valid certs |
| TLS = encryption only | "TLS encrypts the data in transit" | TLS does two things: authenticates the server identity AND encrypts the data; without the certificate verification, you have encryption with an unknown party — equivalent to speaking privately with someone you haven't verified is who they claim |
| "HSTS solves the first-visit problem" | "HSTS prevents downgrade attacks from day one" | HSTS requires the first visit over HTTPS to set the header; the very first visit over HTTP before the redirect can still be intercepted; the HSTS preload list is the only solution to the first-visit problem |
| TLS 1.2 is fine | "Supporting TLS 1.2 is fine, it's still secure" | TLS 1.2 CAN be secure if configured with ECDHE cipher suites only; but it requires careful configuration; TLS 1.3 is secure by default — all weak options removed from the spec |

---

## 7. Hruday's Real Experience Hook
> "At SAP, our Spring Boot microservices ran behind an AWS Application Load Balancer. TLS terminated at the ALB using ACM-managed certificates — meaning certificate rotation was automatic, no manual renewal, no risk of expired certs. I configured the ALB to use only the `ELBSecurityPolicy-TLS13-1-2-2021-06` security policy, which enforces TLS 1.2+ and only modern cipher suites. For the Spring Boot apps themselves, I ensured HSTS headers were set (`max-age=31536000; includeSubDomains`) on all responses via Spring Security, so once any user visited our portal over HTTPS, subsequent visits were always HTTPS. I also caught a trust-all-certs implementation in a legacy service during code review and replaced it with a proper truststore containing only the internal CA certificate — a security finding that went into our OWASP A02 remediation report."

---

## 8. Scale Evolution

**1,000 users/day →** Let's Encrypt with auto-renewal (certbot) is free and sufficient. Configure HSTS. Enforce TLS 1.2+ with ECDHE ciphers. This covers the full TLS hardening for a small service.

**100,000 users/day →** AWS ACM or similar cloud-native certificate management — auto-renews, no manual intervention, no risk of expired certs causing outages. TLS session resumption (TLS 1.3's 0-RTT for repeat connections) reduces handshake overhead. OCSP stapling reduces connection setup latency by eliminating the browser's OCSP request to the CA.

**10 million users/day →** TLS at CDN edge (Cloudflare, CloudFront) — TLS offloading happens globally, close to users, with edge nodes in every region; dramatically reduces handshake latency. Certificate Transparency monitoring — any certificate issued for your domain (even fraudulently by a rogue CA) appears in public CT logs within 24 hours; monitoring these logs detects certificate mis-issuance early. mTLS (mutual TLS) for internal service-to-service — both sides present certificates, not just the server; eliminates the assumption that anything inside the VPC is trusted.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | PCI-DSS mandates TLS 1.2+ for cardholder data environments; certificate management and cipher suite selection are compliance requirements, not optional | Know TLS cipher suite configuration, PFS via ECDHE, HSTS |
| Swiggy / Meesho | Mobile apps and web — all communication HTTPS; TLS pinning in mobile apps for additional security; certificate management at scale | Know the mobile TLS pinning trade-off vs standard certificate validation |
| Adobe / Microsoft | Enterprise SaaS — internal mTLS for service mesh; external HTTPS with certificate transparency monitoring | Know mTLS for service-to-service; know Certificate Transparency |
| SAP Labs | SAP products must comply with SAP security standards and enterprise customer security requirements (ISO 27001, SOC 2); TLS configuration is part of security certification | Know ALB/nginx TLS termination, ACM certificate management, HSTS |

---

## 10. Related Topics — What to Study Next

- **Topic 179 — Secure headers audit** — HSTS is one of several mandatory security response headers; this topic covers HSTS together with `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy`
- **Topic 177 — Encryption at rest and in transit** — TLS covers "in transit"; encryption at rest covers the storage side; together they form the complete data protection model (OWASP A02)
- **Topic 176 — Secrets management** — the TLS private key is one of the most sensitive secrets in your infrastructure; how to store, rotate, and protect it is part of secrets management
- **Topic 169 — OWASP Top 10** — TLS misconfiguration (weak ciphers, disabled cert validation) is OWASP A02: Cryptographic Failures; see all 10 categories together for the full picture
- **Topic 178 — CSP implementation** — CSP is another layer of transport security at the browser level; CSP `upgrade-insecure-requests` forces HTTPS for all sub-resources, complementing HSTS

---

*Part 10 · HTTPS — TLS Handshake, Certificate Validation · Full Stack Interview Guide · Hruday D · 2026*
