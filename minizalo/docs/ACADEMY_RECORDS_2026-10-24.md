# Academy Records Follow-Up - 2026-10-24

Later update: [Delivery Check](DELIVERY_CHECK_2026-10-24.md) supersedes the pending-migration and remaining-library/theme notes below. The user subsequently approved migration 010; version v3 and migration 013 are now applied. The results below describe the earlier academy-only checkpoint.

## Scope

Only Mini App and backend source inside `minizalo/` is changed. The app remains employee-facing. Payment is excluded. This follow-up does not execute the rejected booking-resource migration 010 or change shared booking triggers.

## Two Training Audiences

- `BEGINNER` levels map to "Mới bắt đầu".
- `INTERMEDIATE`, `ADVANCED` and `MASTER` levels map to "Đang làm nghề".
- A level that cannot be recognized remains unclassified and is still visible under All. Classification never guesses from the course title.
- Both currently active shared courses were read-only checked: their stored level is `BEGINNER`. No practitioner course is invented to fill the second group.
- Read-time classification means a real Admin level change is reflected when the canonical catalog refreshes. Course names, original categories and level values are not overwritten.
- Optional explicit overrides use `miniapp_course_audiences` with an operator reason. Migration 012 only adds this private table; it adds no trigger, does not classify rows on migration and has been applied to the shared database.
- Existing operator configuration supports `courseAudiences` entries. The existing configuration CLI still requires the complete shared schema; it is not a workaround for the pending migration-010 approval.
- `GET /api/courses?audience=BEGINNER` and `?audience=PRACTITIONER` apply the actual classification server-side. Invalid values are rejected, not silently ignored.
- The catalog combines audience, actual category, level, hours, fee, delivery format, branch and text filters. Levels have Vietnamese display labels while retaining their canonical values.
- For an older catalog response without `trainingAudience`, the frontend adapter uses its actual `level`. An explicit server override or null is preserved. Missing/unknown levels are not defaulted to beginner.

## Independent Certificate Access

- Private owner-only endpoints: `GET /api/certificates` with stable pagination and `GET /api/certificates/:id`.
- Ownership is checked against both the certificate student and its linked enrollment/course. Inconsistent legacy links are not exposed or automatically repaired.
- Drafts are excluded. Issued and revoked records remain readable even after lesson access expires, an enrollment drops or a course is retired.
- Response fields are whitelisted. Lesson video URLs, course documents, answer keys and other students' records are not included.
- Revoked records return their actual status/reason, but no PDF URL or verification QR value.
- The employee can open certificates from the Academy home or My Courses. Expired/suspended enrollments no longer show a Continue Learning command.
- Details fetch a fresh owner-checked record before showing PDF/QR. Focus/visibility changes and a visible-page interval revalidate an open record. List retry/load-more guards avoid lost pages and duplicate clicks.
- Only HTTPS PDF links without URL credentials are rendered. No fake PDF, issue date, student birth date or verification URL is generated.
- Old certificate notification targets/titles are normalized on API reads without rewriting stored notifications or database event triggers. The frontend also handles legacy certificate targets.
- The regular learning-results view links to the fresh independent certificate view for PDF/QR rather than reusing stale protected-document links.

## Verification

Final results: 222/222 backend tests pass; frontend TypeScript, production build and artifact validation pass. All six academy-record browser cases passed (three viewports in each of Chromium and WebKit), including actual QR image load and the legacy catalog fallback. The existing Chromium staff-session/academy regression also passed.

- Backend regression suite includes audience level mapping/overrides, invalid filters, certificate ownership, drafts/inconsistent links, expiry independence, revocation, pagination and legacy API adaptation.
- Chromium and WebKit checks cover 320x640, 390x844 and 1366x900. They exercise combined filters, expired-learning UI, 22-record pagination, a transient load-more failure, duplicate clicks, actual QR image rendering, certificate revocation refresh and an old notification target.
- The desktop browser cases deliberately omit the new audience field to exercise the real-level fallback for older API responses.
- Existing staff-session/academy browser regression still passes. Browser fixtures are isolated PGlite databases and never populate the shared production database.
- Production frontend build, artifact checks and TypeScript are verified separately. Sass emits the existing legacy-API deprecation warnings.

## Deployment State and Remaining Limits

- Migration 012 is present; its optional override table remains empty. Existing business data is unchanged.
- Migration 010 remains unapplied, awaiting explicit approval for its shared booking-trigger impact. Shared-schema verification still reports only the missing booking-resource tables. The current full backend/frontend release must not be published against that incomplete schema.
- No Git push, server deploy or Zalo testing publication was performed. Local frontend preview is on `http://127.0.0.1:5180/`; actual backend/Zalo behavior changes only after the matching release is deployed.
- Existing PDF files are not regenerated or relabeled. The current user-profile DOB is displayed, not a historical issuance snapshot.
- QR displays the stored verification value; a public verification website/route and PDF generation/issuance are still separate work. Certificate URLs already issued by external storage are not revoked by hiding a frontend link.
- The follow-up does not complete DRM/native capture blocking, OA/email delivery, community/document libraries, medical-theme redesign or the entire 157-item specification.
