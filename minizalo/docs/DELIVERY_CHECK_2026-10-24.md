# Mini App Delivery Check - 2026-10-24

Latest attachment-by-attachment coverage and group/video fixes: [Specification Recheck](SPEC_RECHECK_2026-10-24.md). That report supersedes older group-identity/cancellation and simultaneous-video statements below; it does not claim all numbered requirements are complete.

Later authentication follow-up: [Account Switching And Login Sessions](ACCOUNT_SWITCHING_2026-10-24.md). Migration 014 adds private revocable login sessions; deployment now also requires account-sessions-v1.

## Scope

- Branch: develop. Only minizalo source changed; Website, existing Admin, root backend and root schema source untouched.
- Employees book for actual existing/new customers. Payment remains excluded.
- Existing uncommitted work is preserved. No Git push, Render deploy or Zalo testing publication was performed.

## Completed In This Follow-Up

### Shared Booking Resources

- After explicit user approval of the impact on every shared booking writer, migration 010 was applied. Final resource definition/version: `010_booking_resources_v3`.
- Both deferred constraint triggers are enabled. The startup schema check now rejects absent/disabled resource triggers or an old resource version.
- Existing business rows are not backfilled, reassigned or deleted.
- Mini App creates/reschedules both the canonical `assigned_room_id`/`assigned_bed_number` fields and its private bed links. Admin can read the ordinary shared fields without an Admin code change.
- Numeric beds already assigned by Admin, including zero-padded values, are honored by the allocator and checked for collisions in either writing direction.
- Ambiguous nonnumeric physical-bed labels close that room to numeric Mini App allocation instead of guessing their mapping. Mixed ambiguous/numeric assignments are rejected in protected rooms.
- Active specialist overlap is validated with a specialist/day advisory lock, including another branch. Branch/day resource locks and actual room capacity checks remain.
- Capacity is calculated as peak simultaneous occupancy. Consecutive short reservations on one bed do not falsely consume multiple beds throughout a longer reservation on another bed.
- Bed capacity validation activates for branches with Mini App bed links; specialist overlap validation applies to active writes in all branches. This is not a historical conflict-repair migration.

### Customer Dossier And Follow-Up

- Home opens employee customer lookup and a dossier with appointment history, actual treatment notes, before/after condition, specialist advice and treatment-package balances.
- Exact customer lookup does not grant clinical access: non-admin clinical/appointment reads require a customer relationship in the employee's current branch, then filter individual records by that branch.
- Package entitlement balances are customer-wide, consistent with packages having no branch ownership column. They do not reveal other branches' clinical notes.
- Each section uses stable keyset pagination, guarded load-more/retry, abort cleanup and stale-response protection.
- A package follow-up opens the correct real customer, service and package, then rechecks remaining sessions/expiry on the server. No employee package or payment transaction is substituted.
- Expired/unavailable packages cannot silently fall back to an ordinary charged booking.

### Documents And Community

- Five bottom tabs: Home, Services, Academy, Documents, Profile. Appointment history remains reachable from Home, the dossier and notification links.
- Documents includes real reading lessons/attachments from the employee's actual accessible enrollments. The most recent eligible enrollment is selected consistently with the learning endpoint.
- List responses contain metadata, not private lesson text/file links. Detail responses recheck current enrollment, suspension, expiry and active catalog/category.
- Shared documents and Community use `miniapp_shared_content` in the same shared database. Migration 013 creates only that private table/index/access restrictions, with no seed rows and no triggers on existing business tables.
- Staff only read published, due content. Drafts, scheduled future posts and archives remain hidden. Search, paging and fresh detail validation are implemented.
- Attachments/images must use HTTPS without embedded URL credentials. Content is rendered as text, not executable HTML.
- Only ADMIN/SUPER_ADMIN can publish/edit/archive through the Mini App backend. Client UUIDs, payload fingerprints and expected revisions provide retry safety and prevent stale overwrites. Changes have audit entries; archival does not delete content/history.
- Open details revalidate on focus, visibility and a visible-page interval; revoked or archived content/file links disappear. Existing externally fetched files are not cryptographically revoked by this UI.
- No example posts/documents were added to the real database. Existing Admin has no editor for this new table yet; its UI is explicitly outside the allowed edit scope.

### Employee Booking Notifications

- Customer booking events already recorded by canonical database triggers are mirrored to the actual employee creator of that appointment. Other customer notifications are not copied.
- The source event UUID deduplicates polling; actor locking serializes inbox synchronization. No artificial booking status is generated.
- Staff reminders use the employee's own preference and real upcoming customer appointments, even when the customer never opens the app.
- A current role/active branch check applies to listing, totals, read-all and individual read operations. Transfer, demotion or revocation prevents access to old-branch staff messages without deleting history.
- Notification links open the actual appointment and persist the read state. These are in-app notifications, not a completed Zalo OA/email delivery integration.

### Visual Update

- Main Mini App brand, text, border and surface colors migrated to medical white/blue. Geometry, logo/photos, existing status/warning colors and flow behavior retained.
- Main font stack and native input accent/color scheme unified. New screens follow the same restrained operational layout.
- Website/Admin colors have not changed and cross-product visual parity is not claimed.

## Backend Content APIs

All routes require a valid Mini App backend session. Publishing additionally requires an active shared administrator account.

- `GET /api/shared-content?kind=COMMUNITY|DOCUMENT&search=...&limit=20&cursor=...`
- `GET /api/shared-content/:uuid`
- `GET /api/shared-content/manage` (admin: includes drafts/archives and current revisions)
- `GET /api/shared-content/:uuid/edit` (admin: editable content/current revision)
- `PUT /api/shared-content/:uuid` (admin: create/update/publish/archive, never delete)

PUT fields: kind, status, title, summary, contentText, optional imageUrl/attachments/publishedAt, and expectedRevision. Use revision 0 with a fresh UUID to create; use the actual loaded revision to update. Status is DRAFT, PUBLISHED or ARCHIVED. Future publication dates must be explicit UTC ISO values. A publication needs actual text or media. Do not use fabricated material to fill an empty feed.

Other new reads: `/api/documents`, `/api/documents/:lessonUuid`, `/api/staff/customers/:customerUuid/records?section=appointments|treatments|packages`.

## Verification

- Final backend regression result: 246/246 passed, using isolated PGlite fixtures only.
- Frontend TypeScript, production build and build-asset manifest validation passed. Existing Sass legacy-API warnings remain.
- Chromium and WebKit: group/staff booking across 320x640, 390x844, 430x932, 844x390 and 1366x900; audience/certificate checks across three portrait/desktop sizes; session/academy regression at 390x844.
- Document/community/dossier browser checks cover three sizes per engine, transient page failure/retry, duplicate clicks, real fixture attachment links, archival/access revocation, correct customer/package follow-up persistence and notification deep links/read state.
- Screenshots were inspected. Browser media and business fixtures are test-only and never seeded into the shared database.
- The real database read-only schema check passes, including resource v3 and enabled triggers. No real booking/customer/journal test records were inserted.
- A final read-only check confirms: shared content rows = 0, Mini App bed links = 0, group links = 0, resource v3 marker present. No sample content or test allocations were published to the shared database.
- Actual Zalo authorization, native camera/safe-area behavior, OA/email delivery, real media decoding/streaming and production concurrency/load are not certified by desktop Chromium/WebKit.

## Deployment

Database additions are applied, but local source is not a running Render/Zalo release. Deploy the matching backend first; then run `node scripts/check-deployment.mjs`. Do not publish the frontend while preflight reports NOT READY. Health must include staff-booking-v1, staff-booking-resources-v1, learning-access-v1, academy-records-v1, shared-records-v1 and shared-content-v1.

Actual read-only Render preflight during this follow-up: public catalog routes responded successfully and anonymous private reads were rejected, but health lacks every employee/resource/academy/shared-content feature flag above. Result: NOT READY for this frontend. This is a deployed-backend version mismatch, not evidence that the local code is already live.

Local frontend preview: http://127.0.0.1:5180/. Its configured external API still follows the deployed backend, not automatically the local backend changes.

## Remaining Work, Not A Zero-Bug Guarantee

- Real OA/email delivery, approved provider templates, credentials, consent, external retry/delivery tracking and background push still need actual provider integration/configuration.
- Secure video streaming/DRM, burned-in watermark and account-sharing restrictions are not implemented. A DOM watermark/control restriction cannot prevent external capture or revoke an already-known raw video URL. Public YouTube embedding is not implemented for protected course media.
- Certificate PDF generation/issuance, historical DOB snapshots and public verification routing remain separate work. Only actual existing issued PDFs/QR values are displayed.
- The diagnostic service remains the explicitly deferred placeholder until real service configuration/duration exists. Clinical assessment/results are not fabricated.
- Group contact remains the actual customer; individual guest identities and group-wide cancel/move actions are not implemented. Service-specific room suitability/manual Admin scheduling are not a complete matching/configuration workflow.
- New shared-content Admin UI, Website parity and other Admin-only requirements remain outside the authorized source scope. The publishing backend is ready for that future editor, not evidence that an existing Admin form already edits it.
- Run actual-device Zalo iOS/Android acceptance and production-load/concurrency tests before submission. Passing the automated checks above is not proof that all 157 requirements are complete or that no bugs remain.
