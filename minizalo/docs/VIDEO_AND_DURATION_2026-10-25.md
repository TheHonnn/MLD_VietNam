# Video Lessons And Duration Default - 2026-10-25

## Scope And Execution

- The user reconfirmed Mini App/backend inside minizalo only. Admin/Website were not edited. Payment remains excluded.
- Migrations 015 and 016 were applied to the shared database. No lesson, service price, existing duration, customer, appointment or learning result was inserted/updated/deleted as test data.
- Migration 015 creates a private RLS-protected media-policy table only; no public-embedding decisions are seeded. Read-only shared-schema validation passed.
- Migration 016 sets an absent services.duration_minutes default to 60 for future inserts. Explicit durations and existing rows remain unchanged. A different existing default causes rollback rather than being overwritten. Existing 30/45/75-minute care is not relabeled as 60 minutes.
- Source remains local/unpublished by this work. No Git push, Render deploy or Zalo publication was performed.

## YouTube Learning

- Uses the official [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference), not a YouTube webpage inside an HTML video tag or an unofficial download service. The SDK loads only after the user chooses to open YouTube; there is no SDK/CDN fetch during cold start.
- Supports valid HTTPS watch, short-link, embed, shorts and live video URLs on exact YouTube hosts. Video IDs and credentials/protocols are validated. User-supplied arbitrary iframe HTML is never rendered.
- A non-preview YouTube lesson is denied unless its actual source has an explicit allowPublicEmbed decision and reason. Genuine free previews may use public embedding unless explicitly denied. This does not turn public YouTube into protected streaming.
- Each explicit decision is bound to the exact media URL. Changing the video invalidates the old approval, including for a previously approved preview. Private policy URLs/reasons are not returned to app users.
- Existing enrollment ownership, expiry/suspension, one-player-per-account leases, server elapsed-time progress ledger and verified completion still apply. A replacement session or revoked media policy closes the active lesson on its next backend check.
- Playback is compared to the lesson's actual YouTube video ID before local watch tracking/heartbeats. Choosing a different/related video does not grant progress for the original lesson. Official controls/ads are not blocked to enforce this distinction.
- SDK errors have retry states. Leaving/backgrounding pauses the player; unmount destroys it and clears component polling/timers. Native MP4 behavior is retained through the same small playback-handle contract.
- Official player controls are not covered with the application's watermark. The moving DOM watermark remains on the native player only. Public embedding is not approved for strict-protection material by default; this change does not claim DRM, burned-in watermark or recording prevention.
- Player sizing follows the official minimum viewport; the origin parameter and referrer policy are set for the actual page. Real Zalo WebView referrer/media restrictions still need device acceptance.
- Links to YouTube terms and Google privacy are present. A real published MLD privacy/terms flow is still a release prerequisite under [YouTube developer policies](https://developers.google.com/youtube/terms/developer-policies). The previously deferred legal work is not silently considered finished by adding these links.

## Operator Configuration

Use the existing private configure-workflows.mjs CLI with actual lesson UUIDs and an actual content-owner decision:

```json
{"lessonMedia":[{"lessonId":"ACTUAL-LESSON-UUID","allowPublicEmbed":true,"reason":"Actual approved public-embedding decision"}]}
```

The UUID above is intentionally not usable. Do not apply it unchanged. Run node scripts/configure-workflows.mjs --file YOUR_PRIVATE_JSON first; add --apply only after checking the dry run. Use false to revoke. No existing lesson is automatically approved or assigned a demo video.

Release order: apply 015, deploy matching backend, require health feature youtube-lessons-v1 in deployment preflight, then publish the matching frontend. Migration 016 is independent and already applied. A database migration alone does not update Render or Zalo.

## Verification

- Full backend suite: 279 passed, zero failed/skipped. Frontend TypeScript and production build/asset checks pass; existing Sass legacy-JS-API warnings remain.
- Backend tests cover source validation, unapproved media hiding, dry-run nonmutation, real owner boundaries, elapsed-time progress, policy revocation, source changes, RLS and repeatable migrations.
- Default-duration tests prove existing rows/explicit durations are retained, omitted new durations become 60, and a different custom default is not overwritten.
- Chromium/WebKit checks at 320x640, 390x844 and 1366x900 cover opt-in SDK loading, network-error retry, persisted progress, player dimensions, cleanup and revocation. The deterministic SDK transport is explicitly simulated against an isolated real backend/DB; it is not a real YouTube media-decoding or Zalo acceptance test.
- End-of-scroll checks ensure the last lesson action can scroll above bottom navigation. The lesson dialog contains overscroll and retains bottom scroll padding.
- Native-player/session/academy regression is retained. Test-only videos/permissions are never written to the shared production database.

Preview: http://127.0.0.1:5181/. Its external API follows the actually deployed backend, not automatically these local changes.

## Still Pending

Not all numbered requirements are complete. Real OA/email delivery is waiting for the actual service/provider and approved OA templates; secrets must be configured privately on the server, never pasted into chat. PDF issuance/templates, protected streaming/DRM/native capture behavior, the deferred diagnostic workflow and separately excluded Admin/Website work are not claimed complete here.

Read-only content check on the shared database: zero VIDEO lessons, zero media-policy decisions, one active certificate template with a configured background URL but no signature/seal image URLs. This verifies field presence, not asset validity or human approval. The reported template is not automatically approved or used to fabricate an official PDF. Run node scripts/check-learning-content-readiness.mjs to repeat this metadata-only check; it does not output customer records or private asset URLs.
