# Customer Workflow Configuration

The 005 migration is additive. It creates no business content, performs no seed,
and does not infer professional qualifications from names or specialty text.
Admin code remains unchanged. Apply through the existing migration runner after
building `minizalo/backend`; the runner applies 004 and 005 transactionally.

## Actual Assignments And Quiz Overrides

Prepare a private JSON document containing only UUIDs from the actual database:

```json
{
  "technicianServices": [],
  "lessonQuizzes": [],
  "quizLimits": [],
  "courseDelivery": [],
  "membershipCards": []
}
```

Accepted entry fields:

- `technicianServices`: `technicianId`, `serviceId`, optional `isActive` boolean.
  Add only assignments confirmed by the business. Deactivate with `false`;
  existing rows are retained. Slots and booking creation both enforce assignments.
- `lessonQuizzes`: `lessonId`, `quizId`. The lesson must be QUIZ and belong to the
  same course as the quiz. Reconfiguration does not remove submissions.
- `quizLimits`: `enrollmentId`, `quizId`, `maxAttempts` (1-50), `reason`.
  The limit is a total allowance, not a count to add. Attempts are never erased.
- `courseDelivery`: `courseId`, `deliveryFormat` (`ONLINE`, `ONSITE`, `HYBRID`).
  Requires migration 007. Add only the actual delivery mode confirmed by the
  academy. Existing courses remain unset; video availability does not infer it.
- `membershipCards`: `userId`, actual issued `cardCode` (1-100 characters), optional
  `expiresAt` (UTC ISO timestamp with milliseconds or null), optional `isActive`.
  Requires migration 007. Cards are not issued automatically. Expired/revoked
  cards are not returned to the customer. Revoke with `isActive: false`; existing
  rows remain. A QR is an identifier, not proof of authentication or payment.

Build first, then apply the additive schema before deploying this backend:

```powershell
node scripts/apply-audit-integrity.mjs
node scripts/apply-audit-integrity.mjs --apply
```

This operator bridge does not change the separate admin application. Card and
delivery entries remain empty until an operator supplies actual records. Never
commit private configuration files or customer identifiers to Git.

Run from `minizalo/backend` with private database credentials in the environment:

```powershell
npm.cmd run build
node scripts/configure-workflows.mjs --file path-to-private-config.json
node scripts/configure-workflows.mjs --file path-to-private-config.json --apply
node scripts/check-release-readiness.mjs
```

The first configuration command validates in a read-only transaction. `--apply`
uses one transaction so invalid entries cannot leave a partial configuration.
No unauthenticated administration endpoint is exposed. The tool is an operator
bridge, not a replacement for the separate admin UI integration.

## Verified Fixes

- Automatic assignment excludes overlapping appointments before selecting a slot.
- Requests with an Idempotency-Key return the original owner-scoped booking on
  retry; changed input under the same key is rejected. The frontend retains only
  a payload hash and UUID locally, not contact information.
- Actual admin regrades and course-content changes reconcile quiz lesson flags
  and enrollment progress in the database transaction.
- Resuming a quiz displays the grading threshold captured by that attempt.
  The frontend countdown uses server time plus a monotonic device timer.
- Answer changes are queued immediately and retain an unsynced device draft.
  Synced drafts are removed so they cannot overwrite a newer server draft later.
- Favorite state persists per customer; unsupported biometric and referral-share
  controls are removed. Clearing fetched-data cache does not erase auth or drafts.
- Booking allows removal of an expired/invalid voucher without restarting.
- Backend batches generate idempotent reminders while the API process is running.
  Sleeping/stopped hosts cannot run timers. Native Zalo push/SMS is not configured
  by this code and must not be described as delivered outside the app.

## Release Gates

An empty database section remains empty; readiness checks do not invent content.
Real technician assignments/availability, course lessons/quizzes/schedules, and
published care/FAQ content must be entered by the business before acceptance.
Native login, permissions, media, sharing and back/foreground behavior still need
real Zalo device acceptance. Online payments remain intentionally deferred.

Run backend tests, TypeScript, build and the browser checks before deploying the
matching Render/Zalo versions. Browser mutations are routed only to isolated
PostgreSQL fixtures. No commit, push or deployment is implied by local tests.
