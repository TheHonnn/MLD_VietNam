# Session and Learning Audit Fixes - 2026-10-21

## Scope

- Started from local develop commit 73f37c4 with a clean worktree.
- Only minizalo application code, browser checks, and this report changed.
- No admin changes, shared-database writes, dependency upgrades, payment work, Git integration, or deployment.
- Browser business records are disposable, in-memory fixtures only.

## Confirmed Bugs Fixed

1. Private GET response guards depended on cache keys. Uncached profile, favorites, booking availability, and signal-based requests could return old owner data after logout or account change. Guard every non-public request independently of cache eligibility, before adapting data or dispatching mutation activity, and again after awaiting a cached result. Keep public catalogs reusable across session changes.
2. Bootstrap could consume a stale profile response or log out a newer session. Capture the session generation before profile verification and reject changed-generation results on both web and Zalo bootstrap paths.
3. Quiz draft failures remained visible after successful recovery, and older edits could update feedback for a newer edit. Use dedicated, quiz/attempt-scoped feedback plus an edit revision. A successful latest write clears only draft feedback, not unrelated action errors.
4. The next-lesson and header Back controls remained usable during quiz submission. A user could open a lesson and then have it closed by the late submission refresh. Disable relevant controls while learning mutations are pending and add synchronous ref guards in their handlers.
5. Some browser checks ignored PREVIEW_URL, hardcoded an API endpoint, or merely logged JavaScript errors. Honor explicit test origins and API URLs; fail smoke tests on unexpected page errors, including empty/offline screens. Suppress only the known desktop-only native Zalo login rejection.
6. The service browser test incorrectly required a photo even when the database record deliberately had none. Require configured images to render and unconfigured images to remain blank. Both cases are verified separately.

## Verification

- Backend: 164/164 tests passed.
- Frontend TypeScript, production build, and build-artifact checks passed.
- Existing browser suites rerun: academy, audit completion, audit integrity, browser smoke, carousel/notifications, edge cases, final regressions, preload, quiz switching, reliability, search, service, submission, and customer workflows.
- Added check-session-learning-browser.mjs, covering five stale private GET variants, public catalog preservation, a newer session surviving an old 401, no activity event from a stale mutation, draft save recovery, navigation locking during submission, and normal lesson access after submission.
- The new suite passes at 320x640, 390x844, and 1366x900. Existing multi-viewport suites also pass; the reliability suite uses its existing single-phone viewport.
- Service checks exercise both empty media and actual configured local images. No fake image is inserted into production data.

## Remaining Acceptance Work

- Physical-device Zalo permission prompts, native lifecycle, real relay/provider connectivity, and actual video delivery need device acceptance testing.
- Real staffing, availability, lessons, quizzes, and schedules must be supplied by the operator; this pass does not fabricate or populate them.
- Previously reported development-tool dependency findings are not changed or re-audited in this pass. Production dependency upgrades are not implied by these fixes.
- Existing Sass legacy-JS warnings remain non-blocking build warnings.
- Passing covered scenarios is not a guarantee of zero defects or platform approval. Payment and official legal-page completion remain deferred as requested.

## Care Mutation and Quiz Receipt Follow-up

- Care forms shared a mutation lock, but tab navigation and a different form's submit button remained active. A survey could silently fail to send while a support response was pending. All related care tabs, forms, and entry controls now respect the same pending state; handlers also check the synchronous lock. A conflicting programmatic submit receives an explicit wait message instead of silently returning.
- Quiz submission errors now trigger an uncached read of the existing owned learning payload. Recovery matches the exact attempt UUID and its submission UUID; no score or successful outcome is inferred from a network failure.
- Before sending, retain the exact attempt and answer snapshot under an account/course/enrollment/quiz-scoped pending key. An unresolved submission blocks opening a fresh attempt and provides an explicit check/resend action using the same attempt UUID, even after the visible timer expires.
- After a reload, pending submissions restore from device storage when available. Restricted storage still has an in-memory fallback for the current screen. A definite invalid/expired rejection can release the pending state; ambiguous failures cannot silently consume another attempt.
- Result acceptance checks score, question count, correct-answer count, quiz identity, and pass/fail types. Confirmed outcomes clear only the matching pending record and draft.
- No new endpoint, database table, migration, or shared-data write was needed. The implementation uses the existing ownership-checked learning endpoint and idempotent submit behavior.
- Added check-care-quiz-recovery-browser.mjs. It verifies support/survey locking and actual survey persistence, lost responses after commit, unavailable reconciliation, timer expiry, reload recovery, retries after server expiry, and requests lost before commit. All cases passed at 320x640, 390x844, and 1366x900 without extra attempts or page errors.
- Backend tests remain 164/164 passed. Frontend TypeScript and production build passed. Regression browser suites rerun: session/learning, customer workflows, academy, submission, quiz switching, and edge cases.
