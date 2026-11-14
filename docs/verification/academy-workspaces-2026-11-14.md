# Academy workspaces acceptance — 2026-11-14

## Current changes (not deployed)

- Enrollment defaults to the student roster, with a secondary class view. Creation links go to the admissions workstation. Row links select the corresponding enrollment.
- Tuition uses a dedicated transaction ledger. Actual remaining balance is shown on enrollment records; transactions are not summed into invented cohort KPIs.
- Cashier tuition collection no longer substitutes 9,000,000 VND for missing tuition. Missing/invalid amounts and settled balances prevent collection.
- Learning changes use the existing academy resolution endpoint, with a review note and duplicate-click lock. Successful server acknowledgment refreshes the list. A failed response requires status reconciliation before retry.
- Refund request approval is explicitly separate from cashier payout confirmation.
- Branch-scoped reading of enrollment changes and enrollment history now follows enrollment → class → branch. Unassigned/unrelated records fail closed. Mutation authorization remains enforced by the existing database command.

## Verification

- Frontend: 63 tests passed, TypeScript and production build passed in the preceding implementation step.
- Backend targeted acceptance: 11 tests passed across academy scheduling, lifecycle and the new branch isolation tests. Tests use isolated PGlite databases, not production fixtures.
- Full bounded serial backend suite: 113 tests passed across 18 files. Backend production build passed.
- New SQL isolation checks verify both change requests and history exclude other branches and return no rows for an empty authorized branch list.
- No production schema change or financial transaction was performed in this step.
- Isolated Chromium acceptance passed: student roster, class filter, enrollment URL identity, page reload, tuition ledger and keyboard focus/Escape in review dialogs. Screenshots inspected at 1440×1000 and 1024×768. No browser page errors.
- Authenticated HTTP acceptance now includes a BRANCH_MANAGER JWT with explicit branch grants: both academy request and history lists return only the authorized branch. Other branch records are present in the fixture and excluded.
- Review dialogs now use native modal dialogs for focus containment and Escape, and cannot be dismissed while a decision is in flight.
- Extended isolated browser/JWT acceptance passed: actual controller/service/RPC hold approval, a double click generating one POST, network failure leaving a request pending without replay, resume, and two distinct administrator JWTs racing to approve one refund request (one HTTP 201, one HTTP 400). Refund approval leaves amount_paid unchanged and creates no REFUND transaction.
- Found and fixed a false-success boundary: resolveEnrollmentChangeRequest returned success:false on an RPC refusal, but the shared response interceptor wrapped it as success:true. It now throws HTTP 400; a regression test and the concurrent HTTP check verify this.
- Targeted final backend service/scheduling/cashier workflow suite: 17 passed, including the new error acknowledgment regression. Frontend final suite remains 63 passed; final frontend/backend builds passed.
- Test command: `ADMIN_ACADEMY_ACCEPTANCE=1 node backend/test/admin-browser.cjs` (PowerShell: set `$env:ADMIN_ACADEMY_ACCEPTANCE='1'` first). Entire database is in-memory; all external calls are intercepted or blocked. The browser identity is a test sign-in fixture, not a production account.

## Remaining acceptance

- Browser tests cover hold submission and keyboard/network/duplicate-click behavior; resume and simultaneous decisions use actual local HTTP/JWT requests. Full consultation/payment/class assignment is covered at database/service level, not as one continuous browser journey.
- Still verify the complete deployed workstation-to-workstation flow in an isolated staging account, including the consultation form and tuition payment UI.
- Actual production refund payout, student transfer and hold/resume remain unperformed for this revision.
- Changes are local. Frontend and backend deployments must both include this revision before production acceptance.
