# Account Switching And Login Sessions - 2026-10-24

## Scope And User Flow

Only Mini App/backend files in minizalo on develop were changed. Existing Admin, Website, business rows and payment behavior are not modified.

The Zalo sharing screen and login modal now have:

- A collapsible account/device action section.
- Fresh Zalo sign-in using the actual verified phone and existing active employee permissions.
- Sign-in followed by the account/session manager.
- An action to sign out of MLD and request Mini App closure, so the user can change the host Zalo account externally.
- A cancel command for a pending connection, with attempt/session guards discarding a late permission/authentication result.

The account/session manager is also reachable from Profile -> Account Settings. Closing it returns to the previous settings view. It shows the actual employee name, masked phone, current-session badge, platform/app label, login time, last-seen time and expiry. Individual revocation and revoke-other-sessions require confirmation and guard duplicate clicks.

This manages MLD sessions, not all Zalo logins. Labels are derived from the request User-Agent, not a hardware fingerprint or proof that two sessions are different physical devices. No employee-name/phone picker can bypass verified Zalo sign-in. Host account switching is not simulated by a frontend account ID. Mini App closure uses the official SDK [closeApp API](https://docs.zaloplatforms.com/docs/MA/api/routing/closeApp).

## Backend Contract

- Migration 014 adds miniapp_account_sessions and miniapp_account_revocations, with RLS and no PUBLIC/anon/authenticated table privileges.
- Migration was applied to the shared database and read-only schema validation passed. It does not seed accounts/sessions, delete data, alter existing business tables or automatically revoke existing logins.
- New JWTs have unique jti values and an eight-hour lifetime. The server stores only a SHA-256 token fingerprint, never the raw bearer token.
- Every private request validates the token lifetime and checks the session's active/revoked state. Optional public availability authentication also ignores a revoked token's private hold context.
- Older legitimate tokens can register on first use, bounded by their signed lifetime and eight-hour maximum age. Revoke-others additionally blocks older unseen tokens, not just rows already visible in the list.
- Fresh server-verified Zalo login can establish a new session after a revocation cutoff, including within the same clock second. A stale signed token alone cannot do that.
- Session mutation ownership is checked in the backend. Owner locks and a current-session recheck prevent a queued revoked session from carrying out another session-management action.
- An inactive account may only use the verified logout route to revoke its own token; other private requests remain denied. Reactivating the account does not restore that revoked token.
- Last-seen writes are throttled to approximately five minutes. Lists show up to 100 active sessions, with a hasMore flag. Revoke-others acts on all other sessions, not only the first page.

Endpoints:

| Method | Route | Behavior |
| --- | --- | --- |
| GET | /api/auth/sessions | Owner-only active sessions; no token hashes/raw tokens returned |
| POST | /api/auth/logout | Revoke the current verified session |
| POST | /api/auth/sessions/:id/revoke | Revoke an owned session, idempotent for an already-revoked target |
| POST | /api/auth/sessions/revoke-others | Keep current session; revoke others and block older unseen tokens |

## Frontend Isolation And Failure Handling

- Explicit sign-out immediately clears the native/in-memory bearer, private read cache, selected voucher and root private views/state. The old token is captured only for the bounded remote logout request.
- A delayed old read/logout result cannot overwrite another user's state or clear their newly established session. SDK/HTTP timeouts, cancellation and duplicate click guards are retained.
- Owner-scoped unsynchronized lesson/quiz drafts and hash-only retry receipts are retained to avoid losing pending work. They are not rendered under another account. This is not an OS-level erase-all-local-files feature.
- If the device is offline or the remote logout cannot be confirmed, local sign-out still completes and the UI explicitly warns that remote revocation has not been confirmed. It asks the user to sign in and revoke other sessions after reconnecting, rather than claiming success.
- Remote revocation blocks subsequent authenticated server requests. It cannot remotely erase a screenshot or already-loaded content from an offline device. Existing inbox/session polling detects revocation when online.
- Active data/history remains in the shared database. New devices load the same actual account records after successful authentication; no data is copied between employee accounts.

## Verification

- Final regression run: 255 tests passed, zero failed. Frontend production build and artifact-manifest verification passed. Chromium and WebKit completed all three viewport scenarios below. The build still reports the existing Sass legacy-JS-API deprecation warning.
- Backend regressions include isolated owner boundaries, two-device sign-in, current/other revocation, unknown old token cutoff, expired/missing-iat rejection, inactive-account logout and retention of existing bookings/journals.
- Frontend unit checks cover permission denial, cancellation, offline logout and a late account-A read/logout completing after account-B authentication.
- Chromium/WebKit browser checks cover 320x640, 390x844 and 1366x900: consent actions, denial/retry/cancel, confirmed remote revocation, duplicate click prevention, current logout, switching to another real fixture account without old appointments, and Profile/session-manager navigation.
- Browser permission decisions are explicitly simulated; all account/session API operations use an isolated PGlite backend. No real staff token or production account was used as test data.
- Native Zalo permission prompts and real host account switching still require acceptance on actual Zalo iOS/Android after deployment.

## Deployment

No Git push, server deployment or Zalo publication was performed. The database addition alone does not update Render. Deploy the matching Mini App backend first, run the deployment preflight and require health feature account-sessions-v1 before publishing/testing this frontend. Do not deploy only the frontend against an older backend without these routes.

Local frontend preview: http://127.0.0.1:5180/ (the configured external API follows the deployed backend).
