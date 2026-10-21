# Mini App Review - 2026-10-19

Scope: Mini App and its backend inside `minizalo/` on local `develop`. No admin,
Flutter or root-backend sources changed. Existing unrelated work is preserved.

## Resolved And Regression Tested

- Automatic assignment skips an overlapping first technician instead of failing
  while a qualified second technician remains available.
- Real technician-service UUID assignments are required by slot discovery and
  reservation, including multi-service rescheduling. No specialty is inferred.
- Idempotent booking requests recover the original result after a lost response,
  reject changed input under the same key and remain scoped to the signed user.
- Admin quiz regrades reconcile the lesson flag and enrollment percentage in the
  database transaction. Actual lesson/quiz mapping changes also reconcile progress.
- Resumed quizzes retain their original grading threshold. Device clock skew
  does not control the displayed deadline; server expiry remains authoritative.
- Answers are queued immediately and retain a device draft only while unsynced.
- Video close waits for an in-flight progress request and keeps the lesson open
  on synchronization failure. Heartbeat throttling uses a monotonic device timer.
- Operators can configure quiz links and audited additional attempts without
  deleting any previous submission or attempt.
- Favorites persist per user. Invalid vouchers can be removed during booking.
- Cache clearing works without erasing authentication or pending answer drafts.
  Unsupported biometric and referral-share controls are not presented as working.
- Background reminders run in batches with the API; actual native push is not
  simulated. API errors shown to customers use Vietnamese messages.

## Verification

- Backend suite: 107 tests passed in the latest complete run.
- Frontend TypeScript and production build passed. Existing Sass deprecation and
  JS chunk-size warnings remain, not hidden as a successful optimization.
- Isolated browser checks cover booking/rescheduling/cancellation, zero-charge
  package reservations, learning notes/quiz, favorites, immediate draft navigation,
  wrong device clock, voucher removal and lost-response retry at 320x640,
  390x844 and 1366x900.
- Additional browser checks cover academy registration/views, preloading, carousel
  images, inbox paging/read state, exact destinations and session expiry.
- Search history/ownership, branch filters/navigation and service detail/link
  sharing checks passed at all three sizes. The service check required network
  access for real external images; the primary selected service image rendered,
  but some other external image requests were blocked by browser ORB. The UI
  leaves failed image areas blank instead of substituting fake catalog images.
- Shared-schema readiness check succeeded with aggregate counts only. No fake
  production customer, appointment, invoice, course or quiz content was inserted.

## Release Gates, Not Claimed Complete

The latest actual readiness check found 3 active services but 0 configured
technician-service assignments, 0 qualified future slots, 0 lessons, 0 quiz
questions and 0 class schedules. Care guides and FAQs are also empty.
The business must supply actual content and qualifications. The configuration
tool validates UUIDs and supports a read-only dry run; see
`CUSTOMER_WORKFLOW_CONFIGURATION.md`. It is not an admin UI implementation.

Native Zalo login, provider permissions, media playback and sharing still require
physical-device acceptance. A sleeping Render process cannot guarantee timed
reminders, and native push/SMS needs provider configuration. Online payments remain
deferred by request. These are explicit release gates, not fixed by adding mocks.

Source remains uncommitted locally; no push, Render deploy or Zalo Testing upload
was performed for this review. Local `develop` is behind the fetched remote ref;
integrate carefully without overwriting these changes or the admin team's work.
