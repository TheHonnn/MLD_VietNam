# Mini App Audit Fixes - 2026-10-20

## Scope

Local `develop`, changes confined to `minizalo/`. Keep the current layout and
shared admin contract. Payment integration and legal-policy authoring are out of
scope. Empty business datasets stay empty; no demonstration records are inserted
into the shared database. Existing unrelated changes are preserved.

## Correctness Fixes

1. Booking Back now returns through the current step before closing the flow.
2. Appointment Back dismisses cancellation, rescheduling and details in order.
3. Treatment Back dismisses its form, article or selected package first.
4. Back handlers have explicit layer priorities so a hidden underlying screen
   cannot consume a foreground dialog's action. Expired history IDs recover to
   an account-scoped anchor rather than leaving browser and view state apart.
5. Appointment details derive from the current booking ID, not a stale copied
   object. Removed/cancelled records clear obsolete editing states. Focus,
   visibility and a cleaned-up 30-second timer refresh owned appointments.
   Concurrent focus requests coalesce; responses started before a mutation
   cannot overwrite its result. Time-based filters and actions refresh too.
6. Profile writes validate emergency contact names/numbers, health fields,
   preferred branch, address and request shape before SQL. Empty email becomes
   NULL instead of a shared conflicting empty string. Partial updates preserve
   fields the caller did not supply, including concurrent profile changes.
7. Birth dates use the Vietnam calendar in both onboarding and backend checks,
   including local midnight through 07:00. Future dates remain rejected.
8. Preferred branch, skin characteristics and customer health notes now persist
   per shared user UUID. The existing profile controls are connected and labeled;
   the unsupported-health warning is removed. These notes do not fabricate or
   replace clinical treatment journals.
9. Profile saving has an immediate click lock and ignores responses after
   unmount. The incorrect OTP-verification badge now reflects Zalo verification.
10. The member-card preview is a real keyboard-accessible button. A supplied
    real card code can render a QR and be shared/copied explicitly; no code is
    generated when the shared data has none. Removed the nonfunctional barcode
    switch and false QR-authentication wording. Wallet integration is deferred.
11. Profile, member-card, points, voucher, referral and settings overlays now
    portal into the phone shell instead of inheriting the height and scroll
    position of the long profile page. Toasts portal above these overlays and
    do not intercept taps. Overlay geometry and reachable save controls are
    checked at all three viewports. Payment screens remain out of scope.

## Loading And Query Work

- Course hydration uses five queries independent of catalog size instead of
  four sequential queries for each course. Protected lesson media remains gated.
- Treatment journals are fetched and grouped in one query per package page,
  rather than one query for every package.
- Bookings, support requests, consultation surveys and treatment plans have
  keyset pagination, capped at 100 rows per API page. Cursors retain PostgreSQL
  microsecond precision and validate types, UUIDs and actual calendar dates.
- The frontend drains these metadata pages into the existing preload/read cache,
  preserving the requested preload behavior. Page errors are not converted into
  partial successful data, and work stops after a session change. Appointment
  cards render in batches of 50. This deliberately still warms metadata; it is
  not a promise to load every video or keep arbitrary dataset sizes in memory.
- Notification cursors received the same malformed-input hardening.

## Shared Database Change

Applied `backend/migrations/006_customer_profile.mjs` through
`backend/scripts/apply-customer-profile.mjs --apply`.

Only the new `miniapp_customer_profiles` table and its access restrictions were
added. RLS is enabled. PUBLIC, anon and authenticated roles cannot access it
directly; the backend enforces signed-user ownership. No existing business table
or record was deleted, and no business fixture was inserted.

The final read-only schema/readiness check succeeded. Existing content remains:
3 active services, 0 technician-service assignments, 0 qualified future slots,
0 lessons, 0 quiz questions, 0 class schedules, 0 published care guides and
0 active FAQs. These empty datasets are not treated as failed code tests.

## Verification

- Backend: 123 tests passed, including new invalid-input, nullable-email,
  timezone, profile ownership/persistence, keyset pagination, fixed-query-count
  and RLS/repeatable-migration tests. Fixtures use isolated in-memory PostgreSQL.
- Frontend TypeScript and production build/artifact checks passed.
- Browser suites passed at 320x640, 390x844 and 1366x900: complete booking,
  rescheduling/cancellation, treatment steps and journals, learning notes and
  save failures, quiz drafts/results, lost-response booking retries, search and
  real-slot filters, carousels, notification persistence/deep links, nested Back,
  private-data isolation and simulated safe areas.
- Preload checks additionally passed consent-time public loading, private data
  after authentication, cached page opening, mutation invalidation and logout.
- New audit browser coverage checks nested Back, updated appointment details,
  time-boundary actions, profile persistence, paged metadata preload, missing
  card data and expired-history recovery. Screenshots are local ignored files.

## Release Boundaries

No Git push, Render deploy or Zalo testing upload is performed by this work.
Deploy the updated backend before uploading a frontend that exposes the new
profile fields. The local branch is dirty and behind the fetched remote; do not
overwrite it or push forcefully.

Automated browser checks do not certify native Zalo permission dialogs,
hardware Back, keyboards, sharing or oldest-device WebViews. Those still need
physical-device acceptance. Inbox updates are not a claim of native push
delivery. No new dependency security audit is claimed; the prior zmp-ui
transitive-router advisory follow-up and existing Sass deprecation warnings
remain recorded in SUBMISSION_FIXES_2026-10-19.md.

Result: the reproduced correctness defects above are fixed and covered by
regression checks. This is not an assertion that every possible production
defect has been mathematically excluded.
