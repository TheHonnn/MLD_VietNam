# Academy admission review

Scope: admin enrollment UI, AcademyService, lifecycle SQL migration 029 and safeguards 035. No production records were changed.

## Confirmed locally
- Consultation must be finalized before reconciliation or approval.
- Verified deposit is sufficient for admission; outstanding tuition remains tracked.
- Admission approval now uses persisted reconciled amount, never the amount supplied by the browser.
- Assignment checks actor role, course identity, receiving class status and capacity in SQL.
- Class assignment starts STUDYING only for a started class; otherwise ENROLLED.
- Repeating the same assignment does not change capacity, extend validity or duplicate notifications.
- Suspended, expired, withdrawn and graduated records cannot be assigned.
- Graduation checks configurable academic requirements and payment policy, with certificate issuance in the same database workflow.
- Change requests record reviewer/history; REFUND approval alone does not move money (cashier workflow required).

## Validation
Web admin: 50 tests passed. Academy workflow and PostgreSQL contract: 8 tests passed, including forged payment amount, unauthorized assignment, repeated assignment, suspended/expired access and graduation safeguards.

## Deployment
Apply database/migrations/035_academy_admission_safeguards.sql to the same database used by the backend before accepting this change as deployed. This review did not apply production migrations.

## Remaining acceptance limits
- Class schedule is free text; reliable automatic overlap checking needs structured meeting times.
- Existing transfer SQL retains enrollment-linked academic records, but per-session attendance carryover and cross-branch authorization need dedicated acceptance scenarios.
- UI still contains graduation controls; moving these into the academic workstation is a separate follow-up.
- No live-account browser or production refund/hold/resume test was performed. Do not treat unit/database tests as full end-to-end acceptance.
