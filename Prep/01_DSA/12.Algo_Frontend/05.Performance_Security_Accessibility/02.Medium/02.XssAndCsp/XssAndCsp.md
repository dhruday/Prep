# XSS and Content Security Policy

## Problem Statement

Review a frontend that displays user-provided content and uses third-party scripts. Prevent cross-site scripting without relying on a single client-side check.

## Solution

- Render untrusted content as text by default. Avoid unsafe HTML insertion APIs; sanitize HTML only when rich content is a product requirement, using a maintained allowlist-based sanitizer.
- Treat URLs, CSS, template interpolation, and HTML as different contexts with different escaping rules. Validate allowed protocols before rendering links.
- Enforce a server-delivered CSP with nonces/hashes where practical; avoid `unsafe-inline` and log violations in report-only mode before enforcement.
- Keep secrets out of browser bundles, review third-party scripts, use Subresource Integrity where applicable, and pin/monitor dependencies.
- Validate and authorize on the server as well. Client-side sanitization improves display safety but is not an authorization boundary.
