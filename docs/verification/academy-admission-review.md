# Academy admission acceptance — 2026-11-14

Scope: admin enrollment, class assignment/transfers, structured schedules, hold/resume and refund authorization. Mobile application code is outside the change.

## Production database deployment
Migrations 035, 036 and 037 were applied and verified against the configured Supabase pooler. No existing student enrollments or paid amounts were edited for acceptance.

The rollback production probe uses an existing active SUPER_ADMIN as SQL actor with temporary fixture records inside one transaction. Transfer, reason requirement, preserved validity, preserved attendance, HOLD, RESUME and refund authorization passed. All fixture writes were rolled back; enrollment count was unchanged and the temporary student no longer existed. This is database acceptance, not a browser/JWT end-to-end financial transaction.

Production uncovered a legacy validity trigger from migration 011 which reset SUSPENDED to ACTIVE. Migration 037 preserves explicit holds and is included in the local schema harness.

## Behavior delivered
- Approval uses persisted reconciled payments. POS tuition collection no longer approves admission automatically.
- Upcoming class assignment remains ENROLLED; started classes become STUDYING.
- Transferring requires a reason of at least 5 characters; cross-branch changes require ADMIN/SUPER_ADMIN, not a branch manager outside their branch.
- Transfers retain existing attendance and expiry, update the selected branch and audit the reason.
- Assignment and schedule editing reject overlapping structured meeting times; same-class, room and primary instructor overlaps are guarded as well.
- No free-text schedule parsing or automatic fabricated meeting times. A target class needs at least one upcoming dated meeting before assignment.
- HOLD/RESUME checks access, terminal states, actor scope and schedule on resume.
- Refund authorization alone never changes paid amount or creates a refund receipt. Actual refund remains a cashier operation.
- Enrollment screen removes invented class/date/instructor defaults and distinguishes admission approval from class assignment.

## Validation
- Web admin test suite: 50 passed.
- Targeted backend academy + cashier workflow suite: 23 passed.
- TypeScript and backend build passed; frontend production build passed after integration.
- Final bounded serial backend suite after integrating remote CI fixes: 111/111 passed across 17 files. Frontend: 50/50 passed.
- Full backend run before integrating remote CI fixes: 107 passed, 3 failed (existing loyalty/staff fixture validation and local CORS connection permission). Parallel attempt exhausted memory; bounded serial execution was used afterward.
- Live Edge session observed the deployed enrollment screen under the existing administrator account; no live student transfer or financial submission was made in the browser.

## Operational requirements and limits
- Production readiness query found 5 receiving classes, 3 with upcoming structured schedules. The other 2 require real meeting dates/times entered by staff; no schedule data was invented.
- Past attendance remains tied to original sessions; records are retained rather than copied to the new class.
- Actual money payout and full browser submission for transfer/hold/refund were not performed against live customer records. Do not label these as completed financial end-to-end acceptance.
- Backend Render reads TheHonnn/MLD_VietNam; frontend Vercel reads XuanTruong205/mld-vietnam. Final code is pushed to both develop branches; runtime rollout must be verified separately.

Repeat production probe: provide ADMIN_DATABASE_URL securely to node scripts/verify_academy_acceptance.cjs. It always rolls back fixture writes.
