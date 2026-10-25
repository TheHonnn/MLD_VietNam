# Mini App Follow-Up And Cleanup - 2026-10-25

Later follow-up: [signed certificate lookup](CERTIFICATE_VERIFICATION_2026-10-25.md) implements public verification with privacy boundaries. The later full regression run passes 270 tests; the remaining-work snapshot below predates that feature.

The newest attachment repeats the same numbered specification. The requirement-by-requirement status remains in [Specification Recheck](SPEC_RECHECK_2026-10-24.md); this follow-up does not mark its remaining work complete.

## Scope

- Develop; Mini App/backend inside minizalo only. No Admin/Website source or real database rows were changed.
- Existing commits and user changes were preserved. No Git pull/reset, commit/push, server deployment or Zalo publication was performed by this follow-up.
- Payment remains excluded. Existing financial history was not deleted.

## Fixed And Removed

- Private course video sources are not attached until the playback API confirms the current authorized lease. A failed/pending lease cannot silently leave a playable video behind.
- The play handler also checks that the current lease belongs to the current lesson. Public preview behavior is retained.
- Browser regression now delays the lease response deliberately, verifies the absent media source, then verifies that another playback replaces the first and closes its lesson on the next heartbeat.
- The browser script waits for the intentional 600ms heartbeat throttle rather than treating a deliberately skipped rapid heartbeat as a product failure.
- Removed GroupCBooking.tsx, an unreferenced legacy seven-step customer flow containing specialist selection and payment steps. The active employee StaffBooking flow, its shared styles, actual appointment history and booking backend remain intact.
- Moved cross-student playback fixture setup to its own isolated database test. Its legitimate enrollment notification no longer contaminates the separate test that expects no notifications for that other owner. No business validation was weakened to make the tests pass.

## Verification

- Full backend suite: 262 passed, 0 failed, 0 skipped.
- Frontend TypeScript and production build/asset-manifest verification passed. Existing Sass legacy-JS-API deprecation warnings remain.
- Chromium and WebKit session/academy coverage includes pending playback authorization, replacement detection, stored care notes, actual fixture DOB, watermark/control attributes and consultation registration without payment.
- The fixture video URL is deliberately invalid; browser checks do not certify real media decoding, DRM, screenshot prevention or native Zalo behavior.
- No fake business content or testing accounts were added to the shared database.

## Still Not Completed

Refer to the numbered coverage table for the complete list. Outstanding items include real OA/email delivery configuration, protected streaming/DRM and native capture behavior, YouTube embedding, generated certificate PDFs/public verification, the deferred diagnostic workflow and out-of-scope Admin/Website changes. These are not claimed to be implemented by cleanup.

Preview: http://127.0.0.1:5180/. The preview's configured external backend does not automatically acquire local source changes. Backend/frontend release compatibility and actual Zalo iOS/Android acceptance still need verification before publication.
