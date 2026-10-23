# Admin / Mini App Data Connection Audit

## Scope And Source

- Working branch: `develop`. Only files under `minizalo/` changed.
- Fetched `origin/feature/admin-web` for inspection, revision `d662008e93b182748dc4f0018573d82c01914358`.
- No checkout, merge, admin source modification, production data mutation, push or deployment.
- Inspected admin resource ownership and the admin Supabase/legacy data adapters.
- Production checks use the configured Mini App API and shared database. Output contains counts and mismatch names, not customer records or credentials.

## Confirmed Defects And Fixes

1. Deployed Render backend does not implement the local `/api/slots/dates` endpoint. Its catch-all authentication middleware responds with 401 for anonymous calls to that unknown route, rather than an availability response. The previous frontend cleared any current session for any 401. Public catalog/detail/availability failures now cannot expire a signed-in account. Private account 401 responses still clear the session.
2. Empty/unavailable native session storage was reread for every request because the in-memory token remained null. It is now resolved once, including the guest/denied-storage result. Explicit login/logout still updates the in-memory session and stored token.
3. Missing date discovery now explains the backend version mismatch and preserves manual calendar selection and the existing single-day slots API.
4. Deployment preflight previously omitted availability endpoints and incorrectly passed the deployed backend. It now checks both `/slots` and `/slots/dates` without parameters: these must reach their input validators and return 400, not 401/404. The current Render deployment correctly fails this preflight.

## Real Database / API Comparison

`node scripts/check-admin-data-links.mjs` inspects the fetched admin resource list with the TypeScript parser, checks shared schema compatibility, reads every listed admin table count inside a read-only transaction, and compares canonical identifiers and selected business fields with the public API.

| Public Collection | Database / API Rows | Compared Fields | Result |
| --- | --- | --- | --- |
| Services | 3 / 3 | ID, name, price, discount, duration, category ID | Match |
| Branches | 3 / 3 | ID, name, address | Match |
| Specialists | 7 / 7 | ID, full name, branch ID | Match |
| Courses | 2 / 2 | ID, title, tuition | Match |
| Published home care | 0 / 0 | ID, title, content | Match |
| Active FAQs | 4 / 4 | ID, question, answer | Match |

This verifies the configured database and API agree; it does not independently certify that business records have been approved by the operator, or that the deployed admin uses the same environment variables as the fetched source.

## Unresolved Operational Requirements

- Three active services have zero active technician-service assignments. The current admin resource whitelist does not expose `miniapp_technician_services`. Do not infer permissions from specialty text or assign all services to every specialist. An operator must provide actual assignments; the existing `configure-workflows.mjs` validates them before an optional explicit apply.
- `technician_shifts` contains four rows, but `technician_slots` contains zero rows. A staff shift is not a customer-bookable slot. Enter genuine availability through the admin's technician-slot resource. No fake slots were generated.
- No course chapters, lessons, quizzes, questions, batch schedules, attendance records or academic records exist in the checked database. Two courses and four enrollments alone do not provide learning content or results. Empty content remains empty.
- The current admin resource list also does not expose `miniapp_lesson_quizzes` or `miniapp_course_delivery`; explicit configuration is required when the corresponding real content is entered.
- Deploy the matching Mini App backend on Render before uploading the frontend that uses date discovery. Updating Zalo frontend alone does not update Render.

## Verification

- Frontend TypeScript and production build passed.
- Full backend suite passed: 171/171 tests, including native storage denial, request cancellation and the public/private 401 boundary.
- Booking/home browser checks passed at 320x640, 390x844, 430x932, 844x390 and 1366x900 on both Chromium and WebKit.
- The dedicated legacy API check passed on Chromium and WebKit: date discovery 401/404 preserves a real fixture session; manual date choice still loads genuine fixture slots.
- Private-data recovery, guest/slow/empty home loading, and notification navigation regression suites passed.
- Storage denial and aborted requests are explicitly exercised using DOMException fixtures. The generic `DOMException {}` shown in the phone screenshot was not reproduced as an unhandled page error in these browser flows. Windows WebKit is not the Zalo iOS native bridge, so native-device acceptance remains required.
- All browser writes use an isolated in-memory database; the shared database was only read.

## Repeatable Checks

From `minizalo/backend`:

```powershell
node scripts/check-admin-data-links.mjs
node scripts/check-release-readiness.mjs
node scripts/check-deployment.mjs
npm.cmd test
```

Local preview: `http://127.0.0.1:5178/`. The source changes are not pushed or deployed.
