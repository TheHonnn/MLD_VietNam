# Mini App / Mobile Alignment - 2026-10-26

## Scope

Reference: the Flutter sources under `mobile/lib`. Changes are limited to the
Mini App and its backend under `minizalo`. No production database migration,
business data mutation, Admin edit, Website edit, or Flutter edit was performed.
Payment/VAT/POS remain excluded by the owner's previous instruction.

## Implemented

- Zalo has one common login, with no customer/employee selector. The backend
  resolves the active account and its actual role by verified phone. Missing or
  inactive staff profiles/branches do not block common login or personal booking.
  Disabled user accounts and duplicate phone identities still fail closed.
- Operational capabilities are computed by the backend (`staffAccess` and
  `staffBranchId`), never chosen by the client. Without staff access, the UI shows
  the common personal experience and no clinical session-completion buttons.
  Staff-only APIs still require actual active profile/branch permissions.
- Customer booking uses the existing owner-bound API with self/other recipient,
  real services, branches, available dates/times, notes and owned packages. It
  does not search other customers or create identities for booking recipients.
- Authorized staff tools remain branch-scoped inside the shared app. Clinical
  records and staff directories are not exposed to other accounts. Losing staff
  access hides work notifications/content but preserves personal ownership.
- Customer slot lookup, booking and rescheduling now check treatment beds as
  well as specialists. Physical bed assignments use the existing shared tables.
  Conflicts and unavailable resources fail transactionally, not as fake success.
- Academy opens its actual catalog directly. Audience/need filters read actual
  Admin metadata from learning outcomes. Missing metadata is not invented.
- Documents default to published home-care guidelines, with category/search,
  authors and actual instructions. Enrolled-course documents remain protected.
- Banners read the same `miniapp_shared_content` source referenced by the mobile
  constant `portalContent` (this is not a separate `portal_content` table).
  Only public approved/published, non-future banners are returned.
- Banner routes are explicitly mapped. Unknown/unsafe links are not guessed;
  banner text remains readable. External destinations must use credential-free
  HTTPS links.
- Public portal posts/documents now have dedicated read APIs. Actual membership
  cards govern member-only content; active staff may read internal publications.
  Legacy content with no explicit audience stays staff-only. Draft/future posts
  stay hidden. Admin author text and direct PDF URLs are retained safely even if
  the author UUID is absent.
- The shared primary/tint colors now match the mobile palette: #2860EB/#EFF4FE.
  Existing safe-area ownership remains in the Mini App shell.

## Evidence

- Backend: complete isolated regression run, 293 tests passed, zero failures.
- Frontend Zalo authentication includes unified login, role/capability changes,
  permission denial, storage failures and cached work-read invalidation.
- Catalog rendering/metadata: 3 tests passed.
- TypeScript and production build/manifest guard passed.
- Chromium and WebKit checks cover customer booking at 320x640, 390x844 and
  1366x900. Customer requests never call staff endpoints. Portal detail and
  customer/community routing are also exercised.
- Chromium staff regression checks cover profile, scoped customers, packages,
  journals, return navigation and clinical completion at the same sizes.
- Browser data and the native SDK are simulated; these tests never write to the
  shared production database and do not replace an actual Zalo/iPhone test.

## Not Claimed Complete

- Pixel-for-pixel parity with every Flutter screen has not been established.
- Full English UI parity remains outstanding; the Mini App does not expose a
  language toggle that pretends to translate screens it cannot translate.
- Flutter offers an appearance choice but `main.dart` currently binds only
  `AppTheme.lightTheme`; copying the choice alone is not a working dark mode.
- The owner selected ordinary booking using existing real services for the lymph
  examination entry. Services/Community now open an explicit real-service picker,
  then the normal owner/staff booking flow. The request is stored in booking
  notes, not as an invented medical examination/result or certificate. No service
  UUID, duration or price is guessed. A separate results workflow is not requested.
- Flutter quiz/community/local lesson completion examples are not production
  data and are deliberately not copied into the Mini App database.
- Universal recording prevention/DRM and native push/download behavior require
  actual platform/media infrastructure and device verification.

## Deployment

This work is local and has not been pushed or deployed. Deploy the updated
`minizalo/backend` together with the Mini App. The new portal read APIs are not
available on an older backend. Do not expose a Supabase service-role key to the
Mini App to work around an outdated server.

The latest direct read of the local database connection failed with a tenant
configuration error. No production service identity or live appointment has been
verified by that attempt. The picker resolves current service IDs through the
configured API; the test suite uses isolated data and is not a production check.
