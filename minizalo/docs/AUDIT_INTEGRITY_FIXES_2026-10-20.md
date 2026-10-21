# Audit Integrity Fixes - 2026-10-20

## Scope

Only `minizalo/` on local `develop`. Existing admin, shared backend and mobile
source remain untouched. No payment integration or privacy-policy authoring.
No business demo records were inserted into the shared database.

## Confirmed Findings Addressed

1. Consultation surveys require an explicit pressure choice and explicit boolean
   skin/allergy answers. Empty forms cannot silently create clinical answers.
2. Profile drafts are not reset by delayed membership responses. Cancel restores
   canonical data; controls lock during save; avatar work is cancelled on close.
3. Inactive courses/categories consistently return 404 from private learning,
   progress, quiz start/draft/submit and video playback/heartbeat. Existing
   enrollments/submissions remain stored. Reactivation restores access.
4. Catalog previews never start private playback or write enrollment notes or
   progress, including when an unrelated enrolled course remains loaded.
5. Unread notification filtering happens before backend pagination. Global
   total/unread counts stay global. Filter generations and read revisions guard
   late responses, and pagination has an immediate click lock.
6. Support and survey retries use owner-scoped idempotency keys. Atomic replay
   returns the original record; changed content under a used key returns 409.
   Local storage retains only a hash and request UUID, not customer answers.
   Namespace uses the shared user UUID and survives a renewed JWT. Legacy callers
   without a key remain compatible; intentional new requests get a new key.
7. Support input must be actual strings with validated lengths, not coerced
   objects. Invalid PostgreSQL NUL/unpaired-surrogate text is rejected before SQL.
8. Parser failures return 400, oversized JSON 413, unsupported encodings 415;
   these are no longer misreported as database 500 errors.
9. Course format filtering uses explicit shared-DB delivery configuration, not
   inferred/demo values. Missing configuration remains unset.
10. Membership QR/share/copy uses the signed-in customer's actual issued card
    record. Missing, revoked or expired cards do not yield an invented code.

Additional checks hardened imported notification sequence values so malformed
admin metadata cannot break inbox SQL casts. Notification actions ignore results
after unmount/session changes. Images retry after connectivity returns, and QR
rendering cannot briefly show a previous code under a new value.

## Database

Applied `backend/migrations/007_audit_integrity.mjs` using
`node scripts/apply-audit-integrity.mjs --apply`.

Only three new tables and their access restrictions were added:
`miniapp_customer_requests`, `miniapp_course_delivery`, `miniapp_membership_cards`.
RLS is enabled and PUBLIC/anon/authenticated access is revoked. No business
records were seeded, deleted or backfilled. Configuration is operator-managed;
see `CUSTOMER_WORKFLOW_CONFIGURATION.md`. Deploy the matching backend and FE
together. Applying schema alone does not deploy this source to Render/Zalo.

The shared schema preflight/readiness check succeeded. Real content counts:
3 active services, 0 service assignments, 0 qualified future slots, 0 lessons,
0 quiz questions, 0 class schedules, 0 published care guides, 0 active FAQs.
Those gaps require real business input, not replacement fixture data.

## Verification And Boundaries

- Backend: 133 passing tests using isolated in-memory PostgreSQL fixtures.
- Frontend TypeScript and production build/artifact validation passed.
- New browser tests cover delayed membership, draft cancel/save locking, actual
  card QR, delivery filtering, preview isolation, image retry, unread history,
  filter races and lost-response support retry across session renewal.
- Existing browser coverage includes booking/rescheduling/cancellation, treatment
  steps/journals, notes/save failures, quiz answers/results, carousels and
  notification deep links, nested Back, collection preload and simulated insets.
- Viewports: 320x640, 390x844, 1366x900. Browser writes target disposable fixtures
  only. Synthetic browser sessions do not certify native Zalo authentication.
- No Git push, Render deployment or Zalo testing publication was performed.
- Native permissions, foreground/back handling, video and sharing still require
  physical iOS/Android Zalo acceptance. Passing automated tests is not a claim
  that every possible defect or review rejection has been eliminated.
- Existing Sass legacy-JS deprecation warnings remain non-blocking.
- After dependency updates, browser checks again passed workflow, submission
  geometry/Back, audit-integrity, carousel/deep-link, final regression and preload
  suites. Preload verifies public reads during consent, no private reads before
  consent, cached screen opening, fresh slots and cache clearing on logout.
- Local CLI boot/version check returns 4.0.5. No login, deploy or publication was
  performed by that version check.

## Dependency Audit

Kept Zalo SDK 2.53.2 and Zalo UI 1.11.14 pinned. A scoped override under Zalo UI
resolves `react-router-dom`/`react-router` to 7.18.4. The application still uses its
existing navigation/history, not React Router SSR, data loaders or RSC. This
dependency requires Node 20+ for installation/builds; verification used Node 24.
Official advisories: [external navigation](https://github.com/remix-run/react-router/security/advisories/GHSA-wrjc-x8rr-h8h6),
[SSR hydration](https://github.com/remix-run/react-router/security/advisories/GHSA-337j-9hxr-rhxg),
[RSC request validation](https://github.com/remix-run/react-router/security/advisories/GHSA-qwww-vcr4-c8h2).

`npm audit --omit=dev --json` reports zero findings for both frontend production
dependencies and backend production dependencies after the fix. This is not a
claim that the complete development toolchain is clean.

Also ran `npm audit fix --ignore-scripts --no-fund`, without `--force`. Compatible
changes updated Zalo CLI 4.0.3 to 4.0.5, CLI core 1.1.4 to 1.1.6, and several
PostCSS parser patches. Full frontend audit still reports 140 aggregate findings
(4 low, 93 moderate, 39 high, 4 critical), all outside the production dependency
set. Critical chains include CLI dependencies `simple-git`, `decompress` and
`tar`. They affect developer/CI tooling and are not dismissed as harmless merely
because they are not shipped to the Mini App.

The remaining audit suggestions include downgrading Zalo CLI to 1.0.0 and moving
Tailwind to 4.x. These are breaking toolchain changes, not validated patches for
this project's ZMA workflow, so they were not forced. A separate toolchain
migration/qualification remains open. Keep development servers loopback-only;
do not clone untrusted templates or extract untrusted archives with this CLI.
Do not label the entire project/development environment vulnerability-free.
