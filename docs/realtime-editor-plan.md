# Realtime Editor Plan (Codebattle)

## Summary
1. Move to `full-text up / diff down`: clients send full text, server computes and broadcasts diffs.
2. Server is authoritative for sync state (`text + version` per editor document).
3. Protocol reliability: `base_version + msg_id + ack`, dedup, and snapshot resync on mismatch.
4. On reconnect, client receives latest server snapshot and realigns quickly.
5. Roll out behind feature flags with backward compatibility for legacy `editor:data`.
6. Add Protobuf as optional transport (dual-stack with JSON) to reduce payload size and serialization overhead, improving realtime channel performance.

## Resume Prompt
Use this in a future chat:

`Continue implementation from docs/realtime-editor-plan.md`
