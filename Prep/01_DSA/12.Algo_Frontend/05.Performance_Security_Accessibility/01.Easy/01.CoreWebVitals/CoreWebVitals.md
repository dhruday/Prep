# Core Web Vitals Investigation

## Problem Statement

Explain how you would diagnose a poor page experience using LCP, INP, and CLS, then validate that a fix improves real users rather than only local tests.

## Solution

- **LCP:** identify the largest visible content element and its phases: TTFB, resource discovery, download, and render delay. Typical fixes include server/rendering work, resource priority, image sizing/format, and removing render-blocking work.
- **INP:** find the slow interaction in field data, then profile input delay, event-handler work, layout/paint, and long tasks. Reduce main-thread work; do not add memoization without evidence.
- **CLS:** locate unexpected layout shifts. Reserve space with dimensions/aspect ratio, avoid inserting content above existing content, and stabilize fonts/ads.
- Combine RUM percentiles by device/network with lab profiling. Protect a fix with a performance budget and a staged rollout; a local Lighthouse score alone is insufficient validation.
