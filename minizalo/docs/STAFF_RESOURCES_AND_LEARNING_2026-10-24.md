# Staff Resources and Learning - 2026-10-24

Latest status: [Delivery Check](DELIVERY_CHECK_2026-10-24.md). The user explicitly approved shared-writer resource validation; migration 010 v3 and additive shared-content migration 013 are applied. The pending-approval statements below describe the earlier checkpoint, not the current database.

Follow-up: see [Academy Records](ACADEMY_RECORDS_2026-10-24.md) for the subsequently implemented two-audience filters and independent certificate access. Migration 010 remains pending approval.

## Confirmed Scope

The latest replies override the broader pasted specification:

- Only employees use the Mini App. Employees book on behalf of existing or new customers.
- Only `minizalo/` source is changed on `develop`. Website, Admin, root backend and root database files are not edited.
- Payment, VAT, POS and billing implementation are excluded, not scheduled for this release.
- No invented production users, course content, service prices, durations or expiry dates are added.

## Implemented in This Change

### Group and Resource Booking

- One real customer/contact may have 1-20 simultaneous guests. Each guest is a separate canonical `bookings` row with its own technician, room and bed number.
- `miniapp_booking_group_members` links the separate appointments; group size and member number are visible in ticket/details and the appointment list.
- No guest names are fabricated. Existing contact identity is the group's contact; per-guest identity forms are not implemented.
- Employees choose service, branch, date and time, not a technician. Branch permission is enforced on the server.
- Staff availability endpoints filter by the requested guest count, distinct qualified technicians and actual available treatment-room capacity. Classroom and practice-lab seats are not counted as treatment beds.
- Old bookings without an explicit bed link are conservatively counted as consuming capacity. Missing room configuration never invents beds.
- Bed allocation and all group appointments are transactional. A failed allocation rolls back the whole group and any newly created customer. Idempotency replays return the original group lead appointment.
- Additive deferred database triggers protect resource-managed branches against technician conflicts, duplicate mapped beds and excess branch/room capacity from other database writers as well. They use a fixed search path and execute without granting restricted Admin writers access to private Mini App tables.
- Resource protection activates for branches with a Mini App bed link. Historical bookings are not backfilled, deleted, relabeled or reassigned by migration.
- Availability uses actual configured service duration. Existing 30/45/75-minute services are not silently rewritten to 60 minutes. A new service needs its real duration configured.
- Scheduled non-overlapping intervals can follow one another; cancellation/completion no longer consumes resources for that appointment. No background job fabricates a completed treatment from the clock alone.
- Changing/cancelling an appointment affects that guest, not the entire group. Group-wide move/cancel and manual specialist/bed picking are not implemented.

### Staff Session and Treatment Packages

- Ordered staff transitions: confirmed -> checked in -> in service -> completed. Future treatment starts and skipped transitions are rejected.
- Completion requires actual care notes, writes a canonical treatment journal and records the employee's status change in `audit_logs`.
- Retrying completion does not duplicate the journal or consume the package twice.
- Staff can select the actual selected customer's active matching treatment package. Used, reserved and available sessions are read from the shared tables.
- The backend validates package owner, service, available sessions and expiry at appointment end. A group cannot consume one personal package for all guests.
- Individual package cancellation releases the reserved session. Actual journal creation consumes it. No invoice or payment transaction is created by this flow.

### Learning and Certificates

- `miniapp_course_access` stores explicit per-enrollment expiry/suspension policies. Missing policies leave previous access unchanged; no default expiry date is invented.
- All private learning, progress, quiz and playback requests recheck enrollment access on the server.
- Operator configuration supports audited-reason `courseAccess` entries through the existing `configure-workflows.mjs` script; no Admin UI changes were made. It can extend or suspend access without deleting progress/results.
- The player pauses/closes on a locally known expiry or a heartbeat access-denied result. Course lesson/quiz progress and history remain in the shared database.
- Certificate UI and new certificate notifications say "Giấy chứng nhận". Student birth date is read from the actual current user profile; issue date, name, course, verification code and PDF URL remain the issued database values.
- This does not alter an existing PDF, snapshot a historical birth date, generate a PDF or issue a certificate automatically.
- Course registration is a consultation request/status flow, not a payment screen. Existing financial histories are not deleted or rewritten.
- Video controls request no download, remote playback or native fullscreen button; picture-in-picture/context menu are restricted, with an animated account watermark over the inline player.
- The diagnostic placeholder now says "phù bạch huyết". Matching also recognizes an existing old "phù mạch huyết" title without changing catalog records. It remains disabled unless the real service exists.

## Additive Migrations and Deployment

### Execution Status

- Migration 011 has been applied to the shared database. No expiry policies or business records were inserted.
- Migration 010 has NOT been applied. The execution safety review rejected its persistent triggers because they affect other booking writers. Explicit approval for that shared operational impact is pending.
- Do not publish the new backend/frontend against a database missing migration 010. Its commands below describe the release order after that approval, not authorization to bypass the rejection.
- Current verification: 210/210 backend tests pass; frontend TypeScript and production build pass. Staff booking passed in both Chromium and WebKit across five viewport sizes, including group and package booking. Access and session/academy checks also passed in both engines.
- No Git push, server deployment or Zalo testing publication has been performed.

1. `009_staff_booking.mjs` was applied in the previous staff-booking change.
2. Build the Mini App backend, then apply `node scripts/apply-booking-resources.mjs --apply`.
3. Apply `node scripts/apply-learning-access.mjs --apply`.
4. Run `node scripts/check-database.mjs` against the intended shared database.
5. Deploy the matching backend before the Zalo frontend. Health must advertise `staff-booking-resources-v1` and `learning-access-v1`.
6. Run deployment preflight and verify on actual Zalo iOS/Android with a real active employee account.

The migrations only add tables, indexes, private access rules and resource-validation functions/triggers. They do not create fake appointments, resources or course access decisions. Application source changes are not a Git push or server/Zalo deployment.

### Course Access Configuration

Use a private JSON file with actual enrollment UUIDs and explicit decisions:

```json
{"courseAccess":[{"enrollmentId":"ACTUAL-ENROLLMENT-UUID","expiresAt":"ACTUAL-UTC-ISO-TIMESTAMP","isSuspended":false,"reason":"Actual approved reason"}]}
```

The placeholders above are deliberately invalid and must not be applied unchanged. `expiresAt: null` clears the optional time limit; suspension remains an independent access decision. The CLI validates a dry run before `--apply`. Existing learning results are retained.

## Test Coverage

- Backend regressions include group capacity, partial-allocation rollback, another writer's conflicts, permissions, package owner/balance, real session notes, repeat completion, access expiry/extension and actual certificate DOB.
- Staff booking browser checks cover Chromium/WebKit at 320x640, 390x844, 430x932, 844x390 and 1366x900, including two simultaneous guests at 390px.
- Access browser checks cover non-staff rejection, revoked-profile retry and an existing customer without a phone.
- Session/academy browser checks cover persisted care notes, certificate DOB, inline watermark/controls and consultation registration without payment.
- Tests use isolated PGlite databases. Browser test media is intentionally not real course content; actual video decoding/streaming, DRM, native capture behavior and real Zalo authorization are not verified by those tests.

## Explicit Remaining Work Against the 157-Item Document

This change is not a completion certificate for the entire pasted specification:

| Requirement IDs | Status / Remaining Detail |
| --- | --- |
| 1-13 | Staff group booking/resource checks implemented; individual guest identities and service-specific room suitability configuration remain. |
| 14-17 | Actual durations, consecutive interval availability and explicit staff completion implemented. No fake clock-driven completion. |
| 18-20 | Automatic group allocation implemented; Admin manual scheduling UI is outside the permitted source scope. |
| 21-23 | Staff customer-package booking and canonical reservation/journal counts implemented. Complete customer dossier management remains separate. |
| 24 | Payment excluded by latest reply. |
| 25-31 | Existing service catalog/detail/search/technician images retained; staff entry has no specialist or payment selection. |
| 32-34 | Implemented in the academy follow-up using canonical level-based audiences and optional explicit overrides; original categories are preserved. |
| 35-38 | Existing lessons use real chapter/video records. Admin uploading is out of scope; YouTube iframe integration is not added. |
| 39-41 | Existing canonical quiz grading, history and lesson links retained and covered by backend regressions. |
| 42-48 | Consultation registration and explicit expiry/extension support implemented; no Admin expiry editor is added. |
| 49-51 | Real email delivery/scheduler configuration is not implemented here. |
| 52-57 | Inline control restrictions/account watermark added, not cryptographic media protection. |
| 58-65 | Native capture blocking, burned-in watermark, secure signed streaming/DRM and account-sharing limits remain. A DOM overlay does not protect native fullscreen, fetched media or external recording; old raw media URLs are not revoked by an API permission check. |
| 66-75 | Labels/current-profile DOB/issue date and issued metadata display handled. Independent owner-only certificate access now works after learning expiry, including revoked status. Public verification routing, PDF generation and Admin issuance/templates remain. |
| 76-84 | Correctly named service placeholder only. Real assessment service configuration, pending/reject/result workflow and the distinction between clinical results and training certificates remain. |
| 85-98 | Payment, VAT, POS, invoices and revenue reconciliation excluded. Existing historical data retained. |
| 99-110 | In-app events/reminders retained. The delivery follow-up adds real customer-booking event delivery to the employee creator, current-branch access filtering and staff reminders. OA/email providers, consent and external retry/delivery integration still remain. |
| 111 | Cross-platform feature parity not claimed; shared canonical booking rows are used. |
| 112-117 | Five bottom tabs are implemented: Home, Services, Academy, Documents, Profile. Appointments remain accessible from Home and notifications. Two training audiences are implemented. |
| 118-121 | Community and shared-document pages now use private shared-database content, admin-only publishing APIs, revisions and archival. Course reading/attachments also have an ownership-checked library. Existing Admin UI has not been modified. |
| 122-127 | Customer-context appointment/care/package records and package follow-up booking are implemented alongside independent certificate access. |
| 128-135 | Mini App medical white/blue palette is implemented while preserving layout, real assets and semantic status colors. Website/Admin theme changes remain outside scope. |
| 136-150 | Admin source/UI changes explicitly out of scope. New canonical booking/journal rows are shared; new Mini App sidecar fields are not an Admin UI implementation. |
| 151-152 | Payment/POS excluded. |
| 153-157 | Admin management interfaces out of scope; actual OA/email/community/documents/home-content integrations not certified as complete. |

Other limits: resource queries conservatively reserve unknown legacy occupancy; they may hide a time that cannot be proven safe. Specialist shift room preferences/service room types are not yet a complete room-suitability matching engine. Production-scale concurrency/load tests and actual-device safe-area/capture/media tests remain necessary.
