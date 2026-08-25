# 180 – Passkeys & WebAuthn

> **Part 12 — Security · Module 12.2: Auth & Tokens**

## What is WebAuthn?

Web Authentication API (WebAuthn, part of FIDO2) allows websites to register and authenticate users using **public-key cryptography** instead of passwords. The private key never leaves the device — the server only stores the public key.

### Passkeys

Passkeys are a **user-friendly implementation of WebAuthn** that can sync across devices via iCloud Keychain, Google Password Manager, or 1Password. Zero passwords to remember, phishing-resistant by design.

---

## How it works

### Registration flow

```
User Device                     Browser                  Your Server
     │                             │                           │
     │                             │──── POST /register/begin ►│
     │                             │◄── challenge + userId ────│
     │                             │                           │
     │◄── prompt: "Create passkey"─│                           │
     │── biometric/PIN verification│                           │
     │── generate key pair ────────│                           │
     │   privateKey → securely stored on device               │
     │   publicKey + signature ────►                           │
     │                             │──── POST /register/verify►│
     │                             │     { credential }        │
     │                             │◄── 200 OK store pubKey ───│
```

### Authentication flow

```
User Device                     Browser                  Your Server
     │                             │                           │
     │                             │──── POST /auth/begin ─────►│
     │                             │◄── challenge ─────────────│
     │                             │                           │
     │◄── prompt: "Use passkey?"───│                           │
     │── biometric/PIN verification│                           │
     │── sign challenge with privKey►                          │
     │   (clientDataJSON + signature)                          │
     │                             │──── POST /auth/verify ────►│
     │                             │     { assertion }          │
     │                             │ verifies: pubKey.verify(   │
     │                             │   signature, challenge)    │
     │                             │◄── 200 OK set session ────│
```

---

## WebAuthn Browser API

```typescript
// REGISTRATION
async function registerPasskey(userId: string, username: string) {
  // Step 1: Get challenge from server
  const opts = await fetch('/api/auth/register/begin', {
    method: 'POST',
    body: JSON.stringify({ userId, username })
  }).then(r => r.json());

  // opts.challenge is a random server-created buffer (prevents replay)
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: base64urlDecode(opts.challenge),     // from server
      rp: { name: 'My App', id: window.location.hostname },
      user: {
        id: base64urlDecode(opts.userId),
        name: username,
        displayName: username,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },   // ES256 (ECDSA P-256)
        { type: 'public-key', alg: -257 },  // RS256 (RSA)
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',  // use device biometric
        residentKey: 'required',              // passkey (discoverable)
        userVerification: 'required',         // require biometric/PIN
      },
      timeout: 60000,
    }
  });

  // Step 2: Send credential (public key) to server
  await fetch('/api/auth/register/verify', {
    method: 'POST',
    body: JSON.stringify({
      id: credential.id,
      rawId: base64urlEncode(credential.rawId),
      type: credential.type,
      response: {
        attestationObject: base64urlEncode(credential.response.attestationObject),
        clientDataJSON: base64urlEncode(credential.response.clientDataJSON),
      }
    })
  });
}

// AUTHENTICATION
async function authenticateWithPasskey() {
  // Step 1: Get challenge from server
  const opts = await fetch('/api/auth/begin', { method: 'POST' }).then(r => r.json());

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: base64urlDecode(opts.challenge),
      userVerification: 'required',
      timeout: 60000,
      // Empty allowCredentials = conditional UI (passkey picker)
    }
  });

  // Step 2: Send signed assertion to server for verification
  const result = await fetch('/api/auth/verify', {
    method: 'POST',
    body: JSON.stringify({
      id: assertion.id,
      response: {
        authenticatorData: base64urlEncode(assertion.response.authenticatorData),
        clientDataJSON: base64urlEncode(assertion.response.clientDataJSON),
        signature: base64urlEncode(assertion.response.signature),
        userHandle: base64urlEncode(assertion.response.userHandle),
      }
    })
  }).then(r => r.json());

  if (result.verified) {
    // Server sets HttpOnly session cookie
  }
}
```

---

## Passkeys vs Passwords vs TOTP

| Property | Password | TOTP / SMS | Passkey |
|---|---|---|---|
| **Phishing resistance** | None | Low | High (origin-bound) |
| **Credential stuffing** | Vulnerable | Partially | Immune |
| **Server breach impact** | Critical (hash cracking) | License reset | None (only public key) |
| **User experience** | Type complex password | Copy code from app | Tap biometric |
| **Device dependency** | None | Phone required | Device required (sync fixes this) |
| **Account recovery** | Reset email | Backup codes | Fallback passkey or magic link |

---

## Security Properties

1. **Origin bound**: Private key bound to exact origin (`example.com`). Phishing on `examp1e.com` cannot trigger the key.
2. **Challenge-response**: Server sends random nonce per login. Replay attacks impossible.
3. **Private key never leaves device**: Server only stores public key. Breach = no credential leak.
4. **Resident key / discoverable credential**: No username needed at UI — authenticator looks up the key.

---

## Libraries

| Library | Use Case |
|---|---|
| `@simplewebauthn/browser` | Frontend WebAuthn API wrapper |
| `@simplewebauthn/server` | Node.js server-side verification |
| `webauthn4j` | Java Spring Boot server-side |
| `passkey-debugger` | Browser DevTools extension |

---

## Interview Talking Points

- **"What's the difference between WebAuthn and Passkeys?"** → WebAuthn is the browser API spec; Passkeys are a UI/UX implementation of WebAuthn with cross-device sync
- **"How does it prevent phishing?"** → Credential is cryptographically bound to the exact origin (RP ID). If the URL is wrong, the assertion fails
- **"What's stored on the server?"** → Only the public key and credential ID. Even a full DB breach leaks no usable credentials
- **"What about account recovery?"** → Multiple passkeys per account (phone + hardware key), fallback magic link, or account recovery phrase
- **"Can you implement this in Angular/React?"** → Yes — `navigator.credentials.create()` returns a credential object; wrap in a service/hook and send to SimpleWebAuthn server
