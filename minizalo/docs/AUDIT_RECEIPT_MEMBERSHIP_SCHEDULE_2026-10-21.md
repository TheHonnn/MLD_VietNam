# Receipt, membership and schedule regressions

Scope: minizalo only. No admin changes, payment integration or shared-database writes.

## Changes

- Keep pending quiz receipts in account/course/enrollment/quiz-scoped module memory across component unmounts. Persist to both local and session storage independently. Clear matching receipts after canonical confirmation; retries reuse the original attempt ID.
- Represent unknown membership counters as null, not zero. Show an error and retry action after failed membership reads. Render zero only when returned by the API. Do not display an invented voucher count when membership is unavailable.
- Add migration 008 with a transactional schedule-deletion notification trigger. It targets only eligible enrollments in the affected class, links to the surviving class schedule rather than the deleted session, and grants no public function execution.

## Verification

- Backend suite: 165 tests passed, including repeatable migration installation, recipient isolation, transaction rollback, correct deep link, no duplicate notification during polling and no public execution privilege.
- Extended care/quiz browser suite: all three viewports pass local-storage-quota + reload recovery and both-stores-unavailable + tab-switch recovery without an extra quiz attempt.
- Membership browser suite checks 503 errors, blank unknown counters, retry recovery and canonical database counts at three viewports.
- Frontend TypeScript and production build/artifact verification pass. Seventeen browser suites passed on their completed runs: care/quiz recovery, membership recovery, session learning, carousels/notifications, academy, workflows, submission, quiz switching, edge cases, audit integrity, audit completion, final regressions, preloading, reliability, search, guest smoke and service details. The first carousel run hit a timing assertion while frontend edits were still in progress; the full rerun after edits completed passed all three viewports without changing carousel code or assertions.

## Deployment boundaries

The migration was tested only against disposable in-memory PostgreSQL. It has NOT been applied to the shared database. After review, the database operator can run from minizalo/backend:

```powershell
npm.cmd run build
node scripts/apply-schedule-deletion-notifications.mjs
node scripts/apply-schedule-deletion-notifications.mjs --apply
```

The first migration command is a dry run. Existing business records are not deleted or rewritten. Historical deleted sessions cannot be reconstructed or notified by this migration.

If both storage systems are unavailable and the entire WebView process is terminated, in-memory pending receipts cannot survive. Confirmed quiz results remain in the backend; device-only recovery across process termination is not guaranteed. Native Zalo acceptance and shared-database connectivity remain separate checks.
