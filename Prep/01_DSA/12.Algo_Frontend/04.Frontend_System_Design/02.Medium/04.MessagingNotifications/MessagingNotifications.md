# Messaging and Notifications

## Problem Statement

Design a UI for real-time messages and notifications with unread counts, reconnection, and reliable user feedback.

## Solution

### Data model

- Every event needs a stable event ID, conversation ID, server sequence/timestamp, sender, payload version, and read state.
- Keep a dedupe set of recent IDs and ordered collections per conversation. Do not rely on client receive time for ordering.

### Transport lifecycle

- Use WebSocket/SSE when supported; reconnect with capped exponential backoff and jitter.
- On reconnect, request events after the last acknowledged cursor. A REST fallback can provide polling for unsupported or offline states.
- Queue optimistic outbound messages with local IDs, display pending/failed/sent states, and reconcile an acknowledged server message by local operation ID.

### UX and accessibility

- Do not announce every background message to a screen reader. Use a controlled live region and user settings for notification noise.
- Mark a conversation as read only after a deliberate viewed/acknowledged rule, not merely when a socket event arrives.
- Preserve scroll position when loading earlier history; do not yank a user away from a message they are reading.

### Observability

Track connection state, reconnect attempts, message delivery lag, duplicate drops, ordering corrections, queue age, and failed-send recovery.
