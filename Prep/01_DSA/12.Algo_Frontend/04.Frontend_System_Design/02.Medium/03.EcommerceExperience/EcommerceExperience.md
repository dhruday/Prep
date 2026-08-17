# E-Commerce Product Experience

## Problem Statement

Design a fast product-detail and cart experience for a high-traffic store. Product price and inventory can change, and checkout must be correct.

## Solution

### Rendering strategy

- Server-render the product shell, title, primary image dimensions, and SEO metadata. Stream/defer non-critical recommendations and reviews.
- Serve responsive, compressed images from an image CDN and reserve dimensions to prevent layout shift.
- Keep cart state in a client store synchronized with a server cart; the server remains authoritative for price, promotions, inventory, and checkout.

### Core flows

1. Select a variant; validate availability from product data.
2. Add to cart optimistically with a client-generated operation ID.
3. Reconcile the server response; show price/inventory changes and roll back a rejected add.
4. Fetch cart using an authenticated, cache-private endpoint. Never trust client totals at checkout.

### Reliability and security

- Ensure add/update operations are idempotent and retry only when the server supports it.
- Expire or revalidate inventory quickly; communicate availability changes without silently changing the selected variant.
- Use secure, HTTP-only session cookies where the platform supports them, protect state-changing endpoints from CSRF, and avoid storing payment data in browser storage.

### Metrics and rollout

- Measure LCP for product images, add-to-cart latency/success, checkout errors, client/server cart mismatches, and conversion by experiment cohort.
- Feature-flag new cart behavior and retain a server-controlled fallback.
