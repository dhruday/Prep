# Collaborative Document Editor

## Problem Statement

Design a collaborative rich-text editor where users can edit concurrently, see presence, recover after disconnection, and retain permission boundaries.

## Solution

### Define the model before the UI

- Use a structured document model (blocks, inline marks, stable IDs), not raw HTML as the source of truth.
- The editor needs document version, operation ID, author ID, operation payload, selection/presence metadata, and schema version.

### Synchronization

- Apply local operations optimistically and send them with unique IDs.
- Use an established conflict strategy such as OT or CRDT; the choice depends on backend capability, offline requirements, and operation semantics. Explain the choice rather than attempting ad-hoc last-write-wins text merging.
- On reconnect, exchange a checkpoint/version and unsent operations, dedupe acknowledgements, and surface an explicit conflict/recovery path when guarantees cannot be met.

### Frontend concerns

- Separate document operations from rendering; batch remote updates to avoid per-character re-rendering.
- Treat remote cursors as ephemeral presence, throttle their publication, and provide accessible non-visual collaboration indicators.
- Sanitize pasted content through a schema-aware pipeline. Enforce document permissions server-side for every read/write operation.

### Validation

Test concurrent inserts/deletes, offline edits, reconnect/replay, duplicate events, schema mismatch, permission revocation during editing, undo/redo boundaries, and long-document performance.
