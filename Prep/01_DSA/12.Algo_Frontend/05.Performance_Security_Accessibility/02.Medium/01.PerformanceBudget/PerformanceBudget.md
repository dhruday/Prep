# Performance Budget

## Problem Statement

Define a performance budget and delivery process for a customer-facing frontend so performance regressions are detected before and after release.

## Solution

### Set measurable budgets

- Field: p75 LCP, INP, and CLS by route, device class, and country/network where useful.
- Build: initial JavaScript/CSS, route chunks, image bytes, third-party bytes, and duplicate dependency size.
- Runtime: long-task duration/count, API latency/error rate, and client-render time for key flows.

### Enforce and operate

1. Run bundle-diff, automated accessibility, and representative performance tests in CI.
2. Fail or require an approved exception when a budget regresses.
3. Send real-user metrics with release/version and experiment tags.
4. Alert on sustained field regressions; compare against a baseline and rollback with a feature flag when user impact is material.

### Trade-off

Budgets should protect real user outcomes, not reward the smallest bundle in isolation. A larger feature can be justified when it improves completion rate and remains within interaction and loading targets.
