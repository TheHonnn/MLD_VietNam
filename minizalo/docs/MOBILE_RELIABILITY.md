# Mobile Reliability Changes

Scope: `minizalo/` on `develop`. Shared admin/root backend sources are unchanged.
No production seeds or synthetic customer bookings are used for verification.
Online payment processing remains deferred; existing real ledgers are read only.

## Additive Database Migration

Run from `minizalo/backend` after a backend build:

```powershell
node scripts/apply-mobile-reliability.mjs
node scripts/apply-mobile-reliability.mjs --apply
node scripts/check-database.mjs
```

The first command is a dry run. The apply command runs a repeatable transaction
adding private tables, indexes, functions and triggers without deleting rows.
Do not use seeds, reset, schema push or destructive migration commands.

Added tables: `miniapp_lesson_quizzes`, `miniapp_quiz_attempts`,
`miniapp_lesson_playbacks`, `miniapp_booking_packages`,
`miniapp_package_baselines`, `miniapp_schema_versions`.
Private tables have RLS enabled without public policies. Trigger functions use a
fixed search path and execute as their owner so existing restricted admin writers
do not need access to private tables. Direct public execution is revoked.

## Booking And Treatment Packages

- Booking creation requires `expectedFinalPrice`; stale prices return 409 with
  `code: PRICE_CHANGED` and canonical pricing, before reserving a slot.
- Availability and reservation both enforce branch opening/closing times.
- Past bookings cannot be changed/cancelled by the customer.
- Owned packages use `userPackageId`, not a catalog package ID. Ownership,
  service, expiry at appointment time and remaining capacity are server-checked.
- Reservations have zero additional charge and state RESERVED. They do not
  fabricate payment or a clinical journal. Cancellation releases the reservation.
- A real admin journal consumes the session once. Existing completed-session
  counts are preserved when admin recounts journals, including legacy sessions.
- Package details derive EXPIRED from actual expiry without rewriting stored rows.

## Learning

- Reading/practice acknowledgement and notes persist per exact enrollment.
- A VIDEO lesson cannot be completed by posting client-controlled watchedSeconds.
  Playback sessions credit elapsed, continuous, non-duplicate segments; a seek
  jump does not count. Canonical admin media/duration must be configured.
  This is progress validation, not DRM or proof of human attention.
- A QUIZ lesson completes only from an actual passed submission. Explicit lesson
  links are supported. Legacy automatic matching is limited to exactly one quiz
  and one QUIZ lesson per course; ambiguous mappings are never guessed.
- Starting a quiz creates/resumes a timed attempt using a private question-bank
  snapshot. Draft answers survive reconnecting; grading is server-side and
  submissions are idempotent. Maximum three attempts per quiz/enrollment.
- Correct answers stay private. Submission history keeps the actual question
  snapshot and selected answers, even after admin changes the question bank.
- Passing the linked quiz counts toward course progress. It does not fabricate
  graduation, payment or certification; those remain actual admin records.

## App Behavior

- Public startup data no longer waits for every private class-learning request.
  Eligible private data continues preloading after authentication.
- Authenticated 401 responses clear the private session and close private views.
- Service sharing sends a real service deep link. Launch resolves only actual
  active catalog records, not a hardcoded service.
- Unsupported English selection is removed; the interface is Vietnamese.
  Stored notification settings affect actual inbox visibility.
- Notifications use persisted database events and cursor pagination; see
  `NOTIFICATIONS.md`. Background reminder batches now run with the API process;
  a sleeping/stopped host cannot run them. Native push/SMS remains separate
  provider work, not claimed as delivered by desktop tests.

## Verification

```powershell
npm.cmd test
node scripts/check-workflow-browser.mjs
node scripts/check-preload-browser.mjs
node scripts/check-carousel-notifications-browser.mjs
node scripts/check-reliability-browser.mjs
node scripts/check-final-regressions-browser.mjs
```

Browser scripts require the local Vite preview and the ignored Playwright
installation. They route all business requests to isolated in-memory PostgreSQL
fixtures; they must never write test records to the shared production database.
The read-only catalog preview rejects all business mutations and uses read-only
SQL transactions. Screenshots remain in ignored `.relay-local/`.

Backend schema validation, frontend TypeScript and production builds must pass
before deploying matching Render and Zalo versions. A local fix is not a Zalo
Testing deployment. Native Zalo login/share require physical-device verification.

See `CUSTOMER_WORKFLOW_CONFIGURATION.md` for migration 005, actual technician
assignments, quiz-link configuration, audited attempt overrides, idempotent
booking retries, regrade reconciliation and remaining release gates.
