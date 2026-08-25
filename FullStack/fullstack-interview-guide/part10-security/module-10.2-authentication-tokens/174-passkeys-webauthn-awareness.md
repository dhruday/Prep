# Passkeys and WebAuthn (Awareness)
> Part 10 — Security (Full Stack)
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Passkeys**: the modern passwordless authentication standard — users sign in with their device's biometric (fingerprint, Face ID) or PIN; no password is ever created, stored, or transmitted; immune to phishing, credential stuffing, and data breach exposure
- **WebAuthn** (Web Authentication API): the browser API that enables passkeys — `navigator.credentials.create()` registers a new key pair; `navigator.credentials.get()` signs a challenge during login; the browser/OS/hardware handles the private key, your server only needs the public key
- **FIDO2**: the umbrella standard = **WebAuthn** (browser API from W3C) + **CTAP** (Client to Authenticator Protocol — how the browser talks to hardware authenticators like YubiKey); passkeys are FIDO2 credentials synced to cloud (iCloud Keychain, Google Password Manager)
- **How it works**: your backend generates a random `challenge`; the browser asks the user for biometric; the device signs the challenge with the user's private key (never leaves the device); server verifies the signature with the public key (stored on registration); login complete — no password, no secret ever transmitted
- **Phishing-resistant by design**: the key pair is bound to the domain at registration; even if an attacker redirects the user to a lookalike site, the browser refuses to use the key for the wrong domain — signature would not match
- 🆕 **Gap topic for Hruday**: this is a gap-to-bridge; "I've integrated OIDC and JWT auth, I understand the WebAuthn protocol from studying the spec, I haven't shipped a production passkey integration yet — this is evolving fast and I'm following it"

---

## 1. One-Line Definition
Passkeys are device-bound cryptographic credentials that replace passwords — using a public-private key pair where the private key never leaves the user's device, authentication happens via biometric/PIN, and the browser's WebAuthn API (`navigator.credentials`) mediates the entire interaction with the server.

---

## 2. The Problem It Solves

Passwords are the dominant authentication mechanism and also the dominant attack surface:
- **Data breaches**: if the server stores passwords (even hashed), an attacker who breaches the database can crack weak passwords
- **Phishing**: users are tricked into entering passwords on fake sites — works because passwords are portable (they work anywhere)
- **Credential stuffing**: attackers try breached username/password combinations across thousands of sites — works because users reuse passwords
- **Password complexity vs usability**: complex passwords are forgotten; simple passwords are cracked

All three attack vectors are eliminated by passkeys:
- **No password stored**: the server only stores a public key; a server breach exposes nothing useful — public keys are designed to be public
- **Phishing-resistant by design**: the private key is cryptographically bound to your site's exact origin (`https://company.com`) at registration time; the browser refuses to use it on `https://company-login-portal.com` (phishing site) — the domain doesn't match the registration
- **No credential stuffing**: there's nothing to stuff; the private key never leaves the device; there's no secret string to steal from a user or replay elsewhere

For a senior engineer: knowing passkeys at the "awareness" level means being able to explain the mechanism, identify when it's applicable, and discuss the WebAuthn API surface — even without having shipped a full passkey integration in production.

---

## 3. How It Works Internally

### The Mental Model

With a password, your secret travels to the server on every login. The server checks it. This means the server must store something derived from your secret (a hash). A breach exposes hashes. More importantly, the same secret works at any site that accepts it — including phishing sites.

With passkeys, no secret travels anywhere. Your device holds a private key that it never exposes. The server holds your public key. Authentication is a cryptographic proof: the server says "sign this random challenge"; your device signs it with your private key; the server verifies the signature with the public key. The server can do this verification without ever knowing the private key. A phishing site doesn't have your public key registered, so even if it sends a challenge, the browser won't sign it — the signature would fail on the real server, and the browser knows not to proceed.

The private key + biometric combination means even if someone steals your device, they still need your fingerprint or PIN to use the key.

### Registration (Creating a Passkey)

```
Step 1: Server generates a challenge

Backend sends:
{
  challenge: "random-32-bytes-base64url",  // unique per registration attempt
  rp: {                                    // Relying Party
    id: "company.com",                     // YOUR domain — key is bound to this
    name: "Company App"
  },
  user: {
    id: base64url(userId),                 // stable user identifier
    name: "user@company.com",              // display name
    displayName: "Hruday D"
  },
  pubKeyCredParams: [                      // accepted key algorithms
    { alg: -7, type: "public-key" },       // ES256 (ECDSA with P-256) — preferred
    { alg: -257, type: "public-key" }      // RS256 (RSA PKCS#1)
  ],
  authenticatorSelection: {
    residentKey: "required",              // passkey must be stored on device
    userVerification: "required"          // biometric/PIN required
  }
}

Step 2: Browser calls navigator.credentials.create()

const credential = await navigator.credentials.create({
  publicKey: serverOptions          // options from Step 1
});

Step 3: Browser/OS prompts for biometric or PIN
User authenticates with fingerprint / Face ID / Windows Hello

Step 4: Device generates an asymmetric key pair
Private key: stored in secure enclave / TPM, never exported
Public key: returned to the browser

Step 5: Device signs the registration data with the private key
Returns:
{
  id: "credential-id-base64url",           // identifier for this passkey
  response: {
    clientDataJSON: <signed challenge + origin>,
    attestationObject: <authenticator data + public key + signature>
  }
}

Step 6: Browser sends credential to your server

Step 7: Server validates and stores:
- Verify challenge matches what was issued
- Verify origin matches your domain (rpId)
- Extract public key from attestationObject
- Store: { userId, credentialId, publicKey, counter: 0 }
- Passkey is registered ✅
```

### Authentication (Using a Passkey)

```
Step 1: Server generates a fresh challenge

Backend sends:
{
  challenge: "new-random-challenge-base64url",
  rpId: "company.com",
  allowCredentials: [
    { id: storedCredentialId, type: "public-key" }
  ],
  userVerification: "required"
}

Step 2: Browser calls navigator.credentials.get()

const assertion = await navigator.credentials.get({
  publicKey: serverOptions
});

Step 3: Device prompts for biometric/PIN

Step 4: Device signs the challenge with the private key

Returns:
{
  id: "credential-id",
  response: {
    clientDataJSON: <challenge + origin signed>,
    authenticatorData: <rpId hash + counter + flags>,
    signature: <signed with private key>
  }
}

Step 5: Server verifies:
- Retrieve stored public key for credentialId
- Verify signature using stored public key
- Verify challenge matches issued challenge
- Verify origin = your domain (phishing protection)
- Verify counter > stored counter (replay protection)
- Update stored counter
- Issue access token or session — user is authenticated ✅
```

### The FIDO2 / WebAuthn Ecosystem

```
FIDO2
├── WebAuthn (W3C spec) — the browser API
│   ├── navigator.credentials.create()  — registration
│   └── navigator.credentials.get()     — authentication
│
└── CTAP2 (Client to Authenticator Protocol)
    ├── How browser talks to external hardware keys (YubiKey, Google Titan)
    └── How browser talks to platform authenticators (Touch ID, Windows Hello, Face ID)

Authenticator types:
├── Platform authenticator (built-in)
│   ├── Touch ID / Face ID (Apple devices)
│   ├── Windows Hello (Windows 10+)
│   └── Android biometrics
│
└── Cross-platform authenticator (external)
    ├── YubiKey (hardware security key)
    └── USB/NFC/Bluetooth security keys

Passkeys vs WebAuthn credentials:
├── Traditional WebAuthn credential: device-bound (stays on one device)
└── Passkey: synced credential (synced via iCloud Keychain or Google Password Manager)
    ├── Available on all your Apple/Google devices automatically
    └── Can be restored if device is lost (sync to new device)
```

### Key Properties

| Property | What it means |
|----------|--------------|
| **Origin binding** | Key pair is bound to exact domain at registration; can only be used on that domain |
| **User verification** | Biometric or PIN required to use the key — "something you are / know" factor |
| **Counter** | Monotonically increasing value; server checks each auth increments the counter — detects cloned credentials |
| **Resident key (discoverable)** | Passkey is stored on device AND can be used for usernameless login — user doesn't need to type email first |
| **Attestation** | Cryptographic proof from the authenticator manufacturer that the key was generated in a genuine secure enclave — optional, important for enterprise |

---

## 4. The Code

### Awareness-Level Code (Registration + Authentication)
```typescript
// REGISTRATION — Frontend

async function registerPasskey(userEmail: string): Promise<void> {
  // Step 1: Get registration options from server
  const response = await fetch('/api/auth/passkey/register/options', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userEmail }),
    credentials: 'include'
  });
  const options = await response.json();

  // The server provides: challenge, rp, user, pubKeyCredParams, etc.
  // Challenge is base64url-encoded; decode it for the browser API
  options.challenge = base64urlToBuffer(options.challenge);
  options.user.id = base64urlToBuffer(options.user.id);

  // Step 2: Browser asks the operating system to create a passkey
  // OS shows "Create passkey for company.com?" dialog
  // User authenticates with biometric or PIN
  const credential = await navigator.credentials.create({
    publicKey: options
  }) as PublicKeyCredential;

  // Step 3: Send the new credential (public key + signed registration data) to server
  const registrationResponse = {
    id: credential.id,
    rawId: bufferToBase64url(credential.rawId),
    response: {
      clientDataJSON: bufferToBase64url(
        (credential.response as AuthenticatorAttestationResponse).clientDataJSON
      ),
      attestationObject: bufferToBase64url(
        (credential.response as AuthenticatorAttestationResponse).attestationObject
      ),
    },
    type: credential.type,
  };

  await fetch('/api/auth/passkey/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(registrationResponse),
    credentials: 'include'
  });
}
```

```typescript
// AUTHENTICATION — Frontend

async function authenticateWithPasskey(): Promise<void> {
  // Step 1: Get authentication challenge from server
  const optionsResponse = await fetch('/api/auth/passkey/authenticate/options', {
    method: 'POST',
    credentials: 'include'
  });
  const options = await optionsResponse.json();
  
  options.challenge = base64urlToBuffer(options.challenge);
  if (options.allowCredentials) {
    options.allowCredentials = options.allowCredentials.map((cred: any) => ({
      ...cred,
      id: base64urlToBuffer(cred.id)
    }));
  }

  // Step 2: Browser/OS prompts user for biometric or PIN
  // "Sign in to company.com with your passkey?"
  const assertion = await navigator.credentials.get({
    publicKey: options
  }) as PublicKeyCredential;

  // Step 3: Send signed assertion to server for verification
  const authResponse = {
    id: assertion.id,
    rawId: bufferToBase64url(assertion.rawId),
    response: {
      clientDataJSON: bufferToBase64url(
        (assertion.response as AuthenticatorAssertionResponse).clientDataJSON
      ),
      authenticatorData: bufferToBase64url(
        (assertion.response as AuthenticatorAssertionResponse).authenticatorData
      ),
      signature: bufferToBase64url(
        (assertion.response as AuthenticatorAssertionResponse).signature
      ),
    },
    type: assertion.type,
  };

  const loginResponse = await fetch('/api/auth/passkey/authenticate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(authResponse),
    credentials: 'include'
  });

  if (loginResponse.ok) {
    // Login successful — access token returned or session established
    const { accessToken } = await loginResponse.json();
    useAuthStore.getState().setAccessToken(accessToken);
  }
}
```

**Spring Boot — WebAuthn backend using `java-webauthn-server` (Yubico library):**
```java
// pom.xml dependency:
// <dependency>
//   <groupId>com.yubico</groupId>
//   <artifactId>webauthn-server-core</artifactId>
//   <version>2.5.0</version>
// </dependency>

@Service
@RequiredArgsConstructor
public class PasskeyService {

    private final RelyingParty relyingParty;
    private final CredentialRepository credentialRepository;
    private final ChallengeCache challengeCache;  // e.g. Redis with 5-min TTL

    public PublicKeyCredentialCreationOptions startRegistration(String userId, String email) {
        // The RelyingParty is configured with your domain
        StartRegistrationOptions options = StartRegistrationOptions.builder()
            .user(UserIdentity.builder()
                .name(email)
                .displayName(email)
                .id(ByteArray.fromBase64Url(Base64.getUrlEncoder().encodeToString(userId.getBytes())))
                .build())
            .authenticatorSelection(AuthenticatorSelectionCriteria.builder()
                .residentKey(ResidentKeyRequirement.REQUIRED)   // Store as discoverable credential
                .userVerification(UserVerificationRequirement.REQUIRED) // Require biometric/PIN
                .build())
            .build();

        PublicKeyCredentialCreationOptions creationOptions = relyingParty.startRegistration(options);
        
        // Cache the challenge — needed for verification (5-minute TTL)
        challengeCache.store(userId, creationOptions.getChallenge().getBase64Url());
        
        return creationOptions;
    }

    public void finishRegistration(String userId, PublicKeyCredential<AuthenticatorAttestationResponse, ClientRegistrationExtensionOutputs> credential) {
        String storedChallenge = challengeCache.get(userId);
        
        FinishRegistrationOptions options = FinishRegistrationOptions.builder()
            .request(/* retrieve from cache using userId */)
            .response(credential)
            .build();

        RegistrationResult result = relyingParty.finishRegistration(options);
        
        // Store the public key and credential ID — this is what we verify against at login
        credentialRepository.save(
            userId,
            result.getKeyId().getId().getBase64Url(),    // credential ID
            result.getPublicKeyCose().getBase64Url(),    // public key in COSE format
            result.getSignatureCount()
        );
    }

    public AssertionRequest startAuthentication() {
        StartAssertionOptions options = StartAssertionOptions.builder()
            .userVerification(UserVerificationRequirement.REQUIRED)
            .build();
        return relyingParty.startAssertion(options);
    }

    public String finishAuthentication(
        AssertionRequest request,
        PublicKeyCredential<AuthenticatorAssertionResponse, ClientAssertionExtensionOutputs> credential
    ) {
        AssertionResult result = relyingParty.finishAssertion(
            FinishAssertionOptions.builder()
                .request(request)
                .response(credential)
                .build()
        );

        if (result.isSuccess()) {
            // Update the signature counter — replay protection
            credentialRepository.updateSignatureCount(
                result.getCredential().getCredentialId().getBase64Url(),
                result.getSignatureCount()
            );
            return result.getUsername(); // authenticated user identifier
        }
        throw new AuthenticationException("WebAuthn assertion verification failed");
    }
}

// Configuration
@Configuration
public class WebAuthnConfig {

    @Bean
    public RelyingParty relyingParty(CredentialRepository credentialRepository) {
        return RelyingParty.builder()
            .identity(
                RelyingPartyIdentity.builder()
                    .id("company.com")                  // Your domain — MUST match browser origin
                    .name("Company App")
                    .build()
            )
            .credentialRepository(credentialRepository) // Your implementation to store/retrieve keys
            .allowOrigins(Set.of(
                "https://app.company.com",
                "https://admin.company.com"
            ))
            .build();
    }
}
```

> **Production readiness note**: Passkeys/WebAuthn integration is non-trivial. Use an established library — `java-webauthn-server` (Yubico) for Spring Boot, `@simplewebauthn/server` for Node.js. Do not implement the cryptographic verification yourself. The awareness-level knowledge for senior engineers is: understand the flow, know the security properties, know what libraries exist, and know the browser API surface. A detailed production integration is typically a sprint-length project, not a single interview question.

**Helper functions — base64url conversion:**
```typescript
// Utility functions for WebAuthn binary data conversion
function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What are passkeys and how are they different from passwords?"

**Hruday's answer:**
> Passkeys replace passwords with public-key cryptography. Instead of a shared secret — the password — that both you and the server know, a passkey generates a key pair: the private key stays on your device, locked behind your biometric or PIN, and never leaves; the server only stores the public key.
>
> To log in, the server sends a random challenge. Your device signs it with the private key after verifying your fingerprint or Face ID. The server verifies the signature with the stored public key. Authentication complete — nothing secret was transmitted.
>
> The security improvements over passwords: no server-side secret to steal — a breach of the server's credential database exposes only public keys, which are worthless to an attacker. Phishing-resistant — the key is cryptographically bound to your site's exact domain at registration; a fake site can't use it. No reuse across sites — each passkey is a separate key pair per site.
>
> The user experience is better too: no password to remember, create, or reset; sign in with the same biometric used to unlock the phone.

---

### Q2 — Deep Dive
**Interviewer asks:** "How does WebAuthn prevent phishing attacks?"

**Hruday's answer:**
> The origin binding is the mechanism. During passkey registration, the browser includes the exact origin — scheme, domain, port — as part of the signed data. The key pair is created associated with that specific relying party ID, which is your domain.
>
> When an attacker phishes a user to `company-security.evil.com` and tries to trigger a passkey authentication, the browser checks: is the current origin's domain `company.com` (the registered relying party ID)? No — it's `evil.com`. The browser refuses to present the passkey for this origin.
>
> Even if the attacker somehow got the user to go through the passkey gesture, the signed assertion would contain the phishing site's origin in the client data. The real server at `company.com` would receive the assertion, see the origin is `evil.com`, reject it. No authentication possible.
>
> This is fundamentally different from passwords: if I phish you to enter your password on `company-evil.com`, I've got your password and it works anywhere. With passkeys, I could trick you into using the gesture on my phishing site, but the signature would be useless to me — it's only valid for `evil.com`'s relying party, which has no credential stored for you.

---

### Q3 — Gap-to-Bridge Frame
**Interviewer asks:** "Have you shipped passkeys in production?"

**Hruday's answer:**
> Not in full production yet — this is a gap I'm actively bridging. The mainstream passkey rollout started accelerating in 2023-2024; most enterprise products I've worked on at SAP still use OIDC + JWT auth, which is what I've implemented in production at depth.
>
> That said, I've studied the WebAuthn spec and the browser API closely. I understand the registration and authentication flows — the challenge-response model, the relying party setup, the public key storage requirements. For a Spring Boot implementation, I've looked at the Yubico `java-webauthn-server` library which handles the cryptographic verification correctly; I'd use that rather than implementing ECDSA verification myself.
>
> The integration pattern I'd follow: passkeys as the authentication mechanism at the identity provider layer (where today we use username/password), with the resulting session still issuing OIDC ID tokens and JWT access tokens — which I have deep experience managing. The passkey fundamentally replaces the password in the first-factor auth step; the downstream token management remains the same.
>
> I expect this to become a must-have feature in the next 1-2 years and I'm positioning myself to be ready.

---

### Q4 — Scenario / Architecture
**Interviewer asks:** "How would you add passkey support to an existing app that uses email/password login?"

**Hruday's answer:**
> I'd add it as an additional authentication method alongside passwords, not as a replacement — for gradual adoption.
>
> Backend changes: add a `passkey_credentials` table storing `(userId, credentialId, publicKey, signatureCounter, createdAt)`. One user can have multiple passkeys — one per device. Add three endpoints: `POST /auth/passkey/register/options`, `POST /auth/passkey/register`, `POST /auth/passkey/authenticate/options`, `POST /auth/passkey/authenticate`. Use Yubico's `java-webauthn-server` for the crypto — it handles key validation, counter checks, and origin verification.
>
> Frontend changes: on the account settings page, add "Add a passkey" — this calls the registration flow. On the login page, add a "Sign in with passkey" button — this calls the authentication flow. The passkey button should be prominent and above the email/password fields to encourage adoption. Handle graceful degradation: `navigator.credentials` check — if the browser doesn't support WebAuthn, the button doesn't appear.
>
> Migration path: first sprint adds passkey support as opt-in. Second sprint adds a nudge after password login: "Add a passkey for faster sign-in next time?" Third sprint — if usage metrics warrant it — makes passkey the default login method with password as fallback. Eventually deprecate password login for accounts that have a passkey registered.
>
> Security consideration: adding a passkey is a sensitive action — it creates a new authentication credential. The user must be authenticated first (password or existing passkey) before registering a new passkey, and ideally must re-verify with biometric or re-enter password before registration. This prevents account takeover via CSRF or XSS that might try to silently add an attacker's passkey.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Passkeys are just 2FA" | "Passkeys are an additional security layer on top of passwords" | Passkeys REPLACE passwords; they're a standalone first-factor credential; the biometric IS the user verification factor |
| "The server stores the private key" | "Passkey private key needs to be stored securely on the server" | The private key NEVER leaves the device or secure enclave; the server stores ONLY the public key; if a server breach exposes the public key, it's cryptographically worthless to attackers |
| WebAuthn = hardware keys only | "WebAuthn is for enterprise users with YubiKeys" | Platform authenticators (Touch ID, Face ID, Windows Hello) work for any consumer device; passkeys synced via iCloud/Google extend this to all a user's devices seamlessly |
| Counter = replay protection only | "The counter is a minor security feature" | Counter is critical — if a credential is cloned (physical device copied), the counter will show the legitimate device's counter is behind the attacker's; server detects the anomaly and can flag or reject |

---

## 7. Hruday's Real Experience Hook
> "Passkeys are a gap I'm actively bridging. My production experience is in OIDC + JWT authentication at SAP, where I've implemented the full token lifecycle. I've studied the WebAuthn registration and authentication flows by reading the W3C spec and experimenting with the browser API locally. The Yubico `java-webauthn-server` library makes backend integration tractable by handling CBOR decoding, COSE key parsing, and signature verification. The aspect that impresses me most about passkeys is the domain binding — making phishing cryptographically impossible rather than just warning users about it. The architecture decision I'd make today for a new product: use passkeys for the initial authentication step, then issue OIDC-standard JWTs for the session — so the auth token management is identical to what I've already built in depth."

---

## 8. Scale Evolution

**1,000 users/day →** Add passkey support as an opt-in alternative to passwords. The WebAuthn library and credential storage are straightforward at this scale. Browser support is now 95%+ globally (2024).

**100,000 users/day →** Multiple passkeys per user (one per device) — the credential table grows with users × devices. Passkey management page: show all registered passkeys, allow renaming (e.g. "Work MacBook", "iPhone"), allow deletion. Deletion should require re-authentication.

**10 million users/day →** Passkey recovery flow becomes critical — what if a user loses all their devices? Options: recovery codes (printed at registration), account recovery via email + re-registration, enterprise: admin-assisted recovery. Attestation verification may be worth implementing — verifies the authenticator hardware is genuine (useful for enterprise security policies). WebAuthn cross-device authentication (CDAM) — using a nearby phone to authenticate on a desktop computer that doesn't have passkeys set up.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | High-value accounts (merchant portals, finance teams) — password-based auth is a major attack surface for account takeover fraud; passkeys eliminate credential stuffing on payment portals | Know the phishing-resistant property; explain why passkeys eliminate the primary attack vectors on payment account login |
| Swiggy / Meesho | Consumer-scale passwordless login — "Sign in with fingerprint" is a UX and security win for mobile-first consumer apps; reduces support burden for "forgot password" | Know platform authenticator (Touch ID / Android biometrics) use case; no hardware key users here |
| Adobe / Microsoft | Enterprise security mandates (ZeroTrust, phishing-resistance for privileged accounts); Microsoft has the largest passkey deployment via Windows Hello | Know attestation, enterprise-grade credential management, and how passkeys complement existing SAML/SSO infrastructure |
| SAP Labs | SAP products targeting enterprise security compliance; phishing-resistant auth is a regulatory requirement for some customer segments | Know how passkeys at the IAS/auth layer integrate with existing OIDC token issuance |

---

## 10. Related Topics — What to Study Next

- **Topic 172 — OIDC** — passkeys authenticate the user at the identity provider; OIDC is still the framework for issuing the ID token and access token after the passkey authentication succeeds; the token management layer is unchanged
- **Topic 170 — JWT deep dive** — the access token issued after passkey auth is still a JWT; all JWT expiry, refresh, and revocation patterns apply; passkeys change the initial auth step, not the token lifecycle
- **Topic 165 — XSS** — passkeys protect against credential theft (no password to steal via keylogger); XSS can still steal the access token from memory, which is why the full security stack (XSS prevention + JWT management) remains relevant
- **Topic 169 — OWASP Top 10** — passkeys directly address OWASP A07: Authentication Failures; credential stuffing and phishing-based account takeover are A07 findings that passkeys solve architecturally
- **Topic 173 — Silent refresh pattern** — even with passkeys for the initial auth, session management via refresh tokens and silent refresh remains the same; the initial login step changes, not the session continuation mechanism

---

*Part 10 · Passkeys and WebAuthn (Awareness) · Full Stack Interview Guide · Hruday D · 2026*
