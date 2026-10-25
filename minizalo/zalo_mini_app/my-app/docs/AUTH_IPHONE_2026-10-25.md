# Zalo Authentication And iPhone Follow-Up

## Scope

Only Mini App files were changed. Earlier dirty backend/database/Admin work was not reverted or edited. This follow-up did not connect to the real database, change roles, bypass authorization, push Git or publish a Zalo version.

## Evidence And Boundaries

The screenshot shows a staff-access denial and separate DOMException console entries. The installed SDK uses synchronous native storage when available and otherwise wraps local storage. Either path can throw. The screenshot's empty exception stack/Eruda frames do not prove that all console errors originate in Mini App storage; native iPhone acceptance is still required.

Staff-access denial cannot be fixed by pretending to sign in on the frontend. A real administrator must review the verified account's role and, where applicable, active staff profile/branch. No customer account is promoted by this change.

## Mini App Changes

- After a native session-storage operation fails, the page uses its existing in-memory session and stops retrying native reads/writes/removals. Clearing an already-empty session no longer calls native removal repeatedly.
- A token restored from storage is not evidence of the current host-Zalo account. A fresh Zalo page requests explicit account verification before private access. In-page data refreshes can reuse a session established by that explicit verification.
- Failed permission, cancellation, legacy customer/signup results and role revocation do not become staff sessions. A detected role change clears local authorization and notifies the existing root session-reset handler.
- Both consent and login modal distinguish STAFF_ACCESS_REQUIRED from STAFF_PROFILE_INACTIVE. An unrelated provider rejection is not relabeled as a staff-role problem. The support label contains no phone, bearer token, SDK token or private response payload.
- Existing native exceptions are not globally hidden. The frontend's own retry paths are bounded; residual Zalo/Eruda bridge errors must be retested on actual iOS after publication.

## Verification

- npm run test:auth: 9 tests passed (8 scenarios plus the parent suite).
- Existing frontend cache, adapter and session regression tests: 20 passed. They were executed read-only from their current location; no backend source or real database was changed.
- Chromium/WebKit: 320x640, 390x844, 1366x900. Checks include denied storage, staff/profile denial, consent rejection, duplicate click prevention, late SDK cancellation and no horizontal overflow. The native SDK bridge and HTTP responses are explicitly simulated; this is not a real iPhone/Zalo test.
- Frontend TypeScript and production build/asset verification pass. Existing Sass legacy-JS-API warnings remain.
- Browser check: node scripts/check-zalo-auth-browser.mjs; set BROWSER_ENGINE=webkit and the existing Playwright browser path for WebKit. Screenshots are generated under node_modules/.cache/mld-auth-tests, not seeded into application content.

Preview: http://127.0.0.1:5182/. Local source changes do not update an already-published Testing build or grant the real account access.
