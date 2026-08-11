# Frontend Incident Response

## Problem Statement

A release causes checkout failures and a rise in interaction latency. Explain how a senior frontend engineer responds, mitigates impact, and prevents recurrence.

## Solution

1. **Detect and scope:** confirm impact with error rate, conversion, Web Vitals, release/version, browser, and region data. Avoid conclusions from a single client report.
2. **Mitigate:** stop rollout or disable the feature flag; use a known safe path when available. Preserve logs, traces, and build metadata before they expire.
3. **Communicate:** give stakeholders a factual status, user impact, mitigation, and next update time. Do not speculate about root cause.
4. **Fix and validate:** reproduce with production-like conditions, add a regression test/monitor, canary the fix, and verify both technical and business metrics recover.
5. **Learn:** write a blameless post-incident review with timeline, contributing conditions, detection gap, owned follow-ups, and prevention mechanisms such as budgets, tests, guardrails, or rollout controls.
