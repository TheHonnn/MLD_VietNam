# Attached Specification Recheck - 2026-10-24

Latest cleanup and final 262-test verification: [Follow-Up 2026-10-25](FOLLOWUP_CLEANUP_2026-10-25.md).

Later requirement-72 implementation: [Signed Certificate Verification](CERTIFICATE_VERIFICATION_2026-10-25.md). This supersedes the old public-verification gap, not the remaining PDF/issuance work.

Later video/default-duration implementation: [Video And Duration](VIDEO_AND_DURATION_2026-10-25.md). The user reconfirmed that Admin/Website source remains excluded.

This supersedes older requirement-status notes where explicitly stated below. Both attached files contain the same numbered specification. Number 28 is absent from the source; no requirement was invented for it.

## Scope

- Develop, Mini App and backend inside minizalo only. Existing dirty changes are preserved; no pull/checkout/reset was performed.
- Employees book for customers. The attachment's customer-self-service wording does not override the confirmed employee-only flow.
- Payment, VAT, POS, invoices and revenue reconciliation remain excluded. Admin/Website source remains outside the authorized scope.
- This follow-up does not migrate, seed, delete or update the live database. It uses existing canonical booked_for_name/phone fields and existing group/playback tables. Browser/test data exists only in isolated PGlite fixtures.
- No push, server deployment or Zalo publication was performed.

## Changes In This Follow-Up

- Staff may optionally enter the actual name and optional phone for every group member. The server validates the entire list before writing, keeps the actual customer/contact identity and writes separate canonical appointments. It does not create invented guest accounts or overwrite the contact's profile. Blank guest phones use the appointment contact, not an invented number.
- Dossiers identify the recorded treatment recipient/group representative so notes are not presented as if every guest were the primary contact. Separate medical identities/history per guest remain future work; names alone are not verified identity records.
- A staff-only group endpoint loads all members independently of the current appointment-list page. Current branch access is checked for every member.
- Confirmed group cancellation is transactional and idempotent: a paid/started/past member prevents a partial cancellation; previously cancelled members remain unchanged. Resource reservations release, canonical notifications synchronize and each changed appointment receives an audit entry. It does not cancel other groups or delete history.
- Single-appointment cancellation explicitly resets whole-group intent, including the navigation-back path.
- Services use a compact list with real prices, details and booking commands; the extra specialist-selection section and large catalog photos were removed from this page. Real media remains on Home/details and the specialist directory remains reachable elsewhere.
- Both service search locations use real descriptions, benefits and configured steps for treatment-need searches, with accent-insensitive matching. IDs/unknown JSON metadata are not search terms.
- One account may hold one active server-side video playback lease across its enrollments. Starting a validated new player expires older leases while retaining watched ranges/progress. Another student's playback is independent. An invalid new lesson cannot terminate the valid current lease.
- A replaced/expired playback returns VIDEO_SESSION_EXPIRED. The old Mini App closes its lesson player when the next heartbeat detects it. Failed heartbeat persistence pauses video; stale heartbeat replies cannot affect another current lesson. This is not cryptographic media revocation or DRM.
- Deployment preflight now requires booking-group-actions-v1 and single-learning-player-v1, in addition to existing feature flags.

New APIs, using the existing bearer session:

| Method | Route | Result |
| --- | --- | --- |
| GET | /api/staff/bookings/:appointmentUuid/group | All members in the accessible group |
| PATCH | /api/staff/bookings/:appointmentUuid/group/cancel | Cancel all eligible members atomically; optional reason |

POST /api/staff/bookings additionally accepts optional guests: an array with exactly people entries, each containing a nonempty actual name and optional actual phone. Existing clients omitting guests retain the primary-contact workflow.

## Requirement Coverage And Remaining Work

"Implemented" refers to local code and automated regression coverage, not a deployed production acceptance certificate.

| Original IDs | Current State |
| --- | --- |
| 1-6 | Employee booking for 1-20 people, existing/new actual contact, optional named guests, service/branch/date/time; no specialist picker. |
| 7-13 | Existing automatic distinct technician/bed allocation, count-aware availability, transactional reservation and shared-writer conflict triggers. Service/room suitability beyond configured treatment-room type remains incomplete. |
| 14 | Migration 016 adds the requested default of 60 minutes only for new services that omit duration. Existing rows and explicit 30/45/75-minute durations remain unchanged. Applied and tested. |
| 15-17 | Consecutive non-overlapping capacity and explicit staff completion with real care notes. No timer fabricates completed care or a treatment journal merely because scheduled time elapsed. |
| 18-20 | Automatic Mini App allocation and existing shared canonical scheduling are retained. New Admin manual scheduling/group-category UI is not implemented. Group-wide cancellation is now added; group-wide rescheduling remains absent. |
| 21-23 | Actual customer package balance/reservations/journals and follow-up booking, with ownership/expiry validation and no duplicate session consumption. |
| 24 | Excluded payment. |
| 25-27, 29-31 | Real service/technician media in appropriate details/directories, compact service/price listing, direct booking and searches by real name/need text. |
| 32-34 | Two canonical audiences and filters; unclassified courses are not arbitrarily relabeled. |
| 35, 48 | Admin editing/upload/extension UI untouched. Existing backend enrollment-access configuration can extend/suspend actual enrollment access. |
| 36-37 | Existing real chapter/lesson structure and authenticated inline video learning. Actual production media decoding still needs device acceptance. |
| 38 | Official YouTube IFrame integration is implemented with lazy loading, source-bound public-embedding approval, existing enrollment/lease/progress checks and lifecycle cleanup. Actual provider playback/native Zalo acceptance is still required; it is not DRM. |
| 39-41 | Existing server-graded quizzes, attempt limits/deadlines, drafts, results and verified course progress. |
| 42-45 | Consultation registration without an invented bank-transfer/payment completion. |
| 46-47 | Explicit access expiry/suspension, server checks and active-player closure on detected denial; progress/results retained. |
| 49-51 | Real external email delivery, scheduler/provider credentials and delivery acceptance remain incomplete. |
| 52-57 | Download-button restrictions and moving account watermark exist in the inline player. They are UI restrictions, not extraction-proof or burned-in watermark. |
| 58-60 | Guaranteed screenshot/recording prevention and permanent watermark in extracted/native content are not implemented. Actual Zalo/device support must be verified before making such a promise. |
| 61-63 | Revocable login sessions, single active learning playback, server ownership/access checks and expiry policy. Already-known external video URLs are not revoked by these API checks. |
| 64-65 | DRM, signed protected streaming and protected YouTube hosting policy/infrastructure remain incomplete. |
| 66-71, 74 | Actual issued record labels/name/course/code/issue date and actual current profile DOB, with owner-only certificate access independent of learning expiry. Historical DOB snapshot remains absent. |
| 72 | Signed public certificate lookup and working QR URLs are implemented in the 2026-10-25 follow-up; minimal public fields only, with live status checks, tamper protection and rate limiting. Printed legacy QR contents are not rewritten. |
| 73, 75 | Existing issued PDF metadata is displayed when present. PDF generation/approved templates and new Admin issuance UI remain incomplete. |
| 76-84 | Correctly named diagnostic entry remains the previously deferred placeholder until actual service duration/receiving schedule and clinical workflow are configured. Pending approval, rejection and clinical results are not fabricated. Clinical results are not training certificates. |
| 85-98 | Payment/VAT/POS/billing/reconciliation excluded; existing historical records preserved. |
| 99-110 | Existing in-app event/reminder history and deduplication are retained. End-to-end OA/email delivery, external consent/templates/provider retries are not certified or newly implemented. |
| 111 | Shared canonical database integration exists; complete Website feature parity is not claimed. |
| 112-120, 122-127 | Existing five main tabs, Home content/real catalog/search, two audiences, community/documents, appointment/package history, enrollments and issued certificates. Missing business content stays empty. |
| 121 | Shared document publishing backend exists; Admin management UI is outside scope. |
| 128 | Existing medical white/blue Mini App theme retained. |
| 129-135 | Mini App responsive checks pass; Website/Admin font/theme parity remains outside scope. Native Zalo safe-area acceptance is still required. |
| 136-150 | Existing Admin is not rewritten. Canonical data interoperability is not evidence that every Admin screen/function in this list is implemented. |
| 151-152 | Payment/POS excluded. |
| 153-157 | Existing role checks, private session revocation, publishing APIs and in-app records retained. Full Admin provider/content/security editors and external delivery remain outside this change. |

## Verification

- Full backend regression: 261 tests passed with isolated databases; no production customer/appointment was used as a fixture.
- Focused tests cover every named guest, malformed lists, owner/branch boundaries, complete group reads, no partial cancellation, repeat cancellation without duplicate audit events and resource release.
- Learning regressions cover replacement leases, retained watched progress, invalid replacement rollback and independent student access.
- Frontend TypeScript and production build/artifact checks pass; existing Sass legacy-JS-API deprecation warnings remain.
- Chromium/WebKit employee booking: 320x640, 390x844, 430x932, 844x390, 1366x900. Includes named two-person group, confirmation/cancellation, customer lookup/new customer, package booking, duplicate clicks and changed-price recovery. Screenshots inspected.
- Session/academy checks cover real fixture care-note persistence, certificate DOB, watermark/control attributes, consultation without payment. Media source is deliberately invalid test content; these are not real-video decoding/DRM tests.
- Actual Zalo iOS/Android permission, host navigation/safe area, production database concurrency/load and real media/provider delivery require acceptance after deployment.

Local preview: http://127.0.0.1:5180/. Its configured external API is not automatically updated by local source changes. Deploy matching backend first, run deployment preflight, then publish the frontend. Database additions from earlier work alone do not deploy this code.
