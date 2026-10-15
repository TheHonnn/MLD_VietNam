# Zalo Login Setup

The confirmed overseas-IP restriction (-501) was on the Social `/me` profile API.
Current login does NOT call it. Test the phone `/me/info` API on Render first;
only if this also fails consider the [private Vietnam relay](VIETNAM_RELAY.md).

## Current Flow

Login is through Zalo, not phone input or OTP. The user taps Continue with Zalo,
allows only phone-sharing permission, and the frontend sends only
`accessToken` and the single-use `phoneToken` to its own backend. The backend
exchanges the phone code directly with the official Zalo `/me/info`
APIs using the parent application's secret.

The verified phone resolves the existing canonical `users.id`. Existing profiles,
points, tiers and history are preserved. New phones get a five-minute registration
proof and a form for full name plus optional gender/date of birth/email. Only
after valid submission is a real shared user created, with a UUID, verified phone,
null avatar, STANDARD tier and zero points. No abandoned-form placeholder users.
The registration token cannot access private APIs or choose another phone.
Ambiguous phone aliases, inactive accounts and
staff accounts are rejected. No client-supplied phone/UUID is trusted.

The earlier SQL proposals `001_zalo_identities.sql` and
`002_phone_free_signup.sql` are withdrawn and removed. No shared schema changes
are necessary. Do not execute old copies, rerun the root schema, or seed demo
users. If the team already applied a proposal, ask its owner to assess it; do
not drop objects or impose NOT NULL blindly on existing data.

## Render Environment

| Key | Value |
| --- | --- |
| NODE_ENV | production |
| DATABASE_URL | Shared PostgreSQL URI, password URL-encoded |
| JWT_SECRET | Private Mini App signing key |
| ZALO_APP_ID | Parent developer App ID, NOT Mini App ID |
| ZALO_APP_SECRET | Parent developer Secret Key |
| ZALO_ALLOW_SIGNUP | true to register new customers; false for existing only |

Find the parent application at https://developers.zalo.me/ under your apps.
Configure phone permission for this Mini App. No name/avatar permission is needed.
Phone API uses the same parent app secret.
Never expose the secret in frontend variables, Git, logs or chat.

Delete obsolete `ZALO_AUTH_URL`. Root Directory: `minizalo/backend`.
Build: `npm ci --include=dev && npm run db:generate && npm run build`.
Start: `npm start`. Health Check Path: `/api/health`.
Push updated backend code to Render's selected branch before redeploying.
Uploading the frontend to Zalo does NOT deploy this backend or its environment.
Local `.env` and Render Environment are independent.

## Device Verification

1. Open the latest Testing version with its own QR on a real Zalo phone.
2. Browsing public catalogs must not immediately request phone consent.
3. Tap Continue with Zalo: consent explains profile linkage and booking contact.
4. Deny permission: no login or user creation; retry remains available.
5. Allow permission: no manual phone input, OTP screen, or SMS.
6. Existing mobile customer with the verified phone must keep the same UUID,
   tier, points and bookings. Alias duplicates must fail for administrator review.
7. New phone: profile form, no user row before submit. Enter name and optional
   details, then confirm one shared user with verified phone and zero points.
8. Re-login: same UUID, no duplicate records. Expired/used phone code fails.
9. Tampered client phone/UUID, invalid Zalo token and disabled account fail.
10. Verify bookings and slot changes appear in native clients/admin. These
    auth checks do not certify payment or reward integrations.
11. Wait five minutes on the form: expired proof must require phone verification
    again. Invalid dates/email and forged registration tokens must fail.

Check `/api/health`: `data.authFlow` must equal `zalo-phone-registration` before
testing this frontend. If missing, Render is still serving an older backend.
Leave `ZALO_RELAY_URL` unset/empty for this direct Render experiment. If a relay
has been configured previously, do not accidentally test that path instead.

Automated tests use isolated PGlite and mocked Zalo responses, never the shared
live database. Passing health or offline tests does not prove real Zalo setup.
Rotate secrets previously disclosed in chat with the database/backend owners.

## Official References

- https://docs.zaloplatforms.com/docs/MA/api/user/user-information/getPhoneNumber
- https://docs.zaloplatforms.com/docs/MA/api/user/user-information/getAccessToken
- https://github.com/zaloplatform/zalo-php-sdk/blob/master/src/Zalo.php
