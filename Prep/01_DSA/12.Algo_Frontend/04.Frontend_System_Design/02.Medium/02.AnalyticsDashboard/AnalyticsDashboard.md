# Analytics Dashboard

## Problem Statement

Design a dashboard with filters, large tables, charts, exports, and partially failing data sources. It must remain responsive for enterprise users with slow networks.

## Solution

### Requirements and state

- Store selected date range, filters, tab, and cursor in the URL; validate values when parsing it.
- Separate server state (queries, cache, pagination) from local UI state (panel expansion, temporary input, hover, focus).
- Define each panel as `loading | success | empty | error` so one failure does not blank the entire dashboard.

### Architecture

```
URL filters → query key builder → data client/cache → panel adapters
                                        ↓
                              table / chart / export controllers
```

- Use a typed data client with cancellation and request deduplication keyed by normalized filters.
- Request summary cards and independent panels separately when they have different freshness or failure domains.
- Cursor-paginate tables, virtualize measured large rows, and request chart aggregates rather than raw events.
- Run expensive client transformations in a worker only after profiling shows main-thread contention.

### Contracts and reliability

- Return panel-level `{ data, generatedAt, partialErrors }`; avoid an all-or-nothing dashboard payload.
- Export asynchronously for large data sets and show job status rather than freezing the UI.
- Display data freshness and timezone explicitly. Preserve the last successful data during refresh and identify it as refreshing.

### Validation

- Test keyboard table navigation, loading/empty/error states, URL round-tripping, cancellation on changing filters, and CSV export authorization.
- Measure render time, INP while filters change, query latency, chart errors, and export completion rate.
