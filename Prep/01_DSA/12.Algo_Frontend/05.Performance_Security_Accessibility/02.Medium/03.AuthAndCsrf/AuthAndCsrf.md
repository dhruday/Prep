# Authentication and CSRF

## Problem Statement

Design safe session behavior for a browser application that makes authenticated state-changing requests.

## Solution

- Prefer secure, HTTP-only, `SameSite` session cookies when the architecture permits; JavaScript cannot read them, reducing token theft exposure through XSS.
- If cookies are sent cross-site or `SameSite` alone is insufficient, add a server-validated CSRF defense such as a synchronizer token or double-submit pattern, and validate `Origin`/`Referer` where appropriate.
- CORS controls whether a browser can read a response; it does not authenticate the caller or replace CSRF protection.
- Model expired sessions as a recoverable UI state: stop protected requests, preserve safe draft data, redirect/sign in deliberately, and prevent retry loops.
- Never store payment information or long-lived secrets in local storage. Enforce authorization on every server request regardless of frontend route visibility.
