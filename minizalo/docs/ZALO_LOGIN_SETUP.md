# Zalo Login Setup

## Status

Code and automated tests are local. No Git push, Render deployment, live schema
changes, or Zalo upload is implied by a passing test. Production still needs the
parent app credentials, owner-approved identity schema, and real device testing.

## 1. Parent Zalo Application Credentials

1. Open https://developers.zalo.me/ using an account with access to the app.
2. Select the parent developer application already linked to this Mini App.
3. In application information/configuration, find App ID and Secret Key.
4. On Render, set `ZALO_APP_ID` and `ZALO_APP_SECRET` in Environment.
5. Do not use the Mini App ID, OA token, Supabase key, or ZMP deploy token.
6. Enable API app-secret-proof protection for the parent app where available.
   The backend always sends the proof; verify wrong-app/invalid tokens are denied
   during real integration testing. Do not assume app binding from a client ID.

Only the backend stores Secret Key. Never place it in VITE variables, Git, chat,
logs, screenshots, or the frontend bundle. Rotate previously disclosed database
passwords and JWT secrets with their owners before production use.

## 2. Shared Database Approval

Send both SQL proposals to the shared database owner for review:

- `sql/001_zalo_identities.sql`: mapping table only, no customer changes.
- `sql/002_phone_free_signup.sql`: allow null phone without changing existing
  phone values or uniqueness. Native code/admin must handle null phone and the
  owner must update the canonical schema/types before enabling signup.

Do not run the full root schema, partial Prisma migration, or demo seeds.
Neither proposal is executed by backend deployment. Existing customers need
trusted operator linkage; no matching or merging based on name/avatar is safe.
The app never accepts a UUID from a browser as proof of account ownership.

After verified account ownership, an authorized database operator can insert a
mapping with the verified parent App ID, Zalo user ID, and existing `users.id`.
Do not insert a mapping based on an unverified support message. Existing rows
are deliberately not reassigned automatically on conflicts.

The backend database role needs canonical table permissions plus SELECT/INSERT
on `public.zalo_identities`. Public Supabase anon/authenticated clients receive
no access to identity mappings. There is no service-role key in the Mini App.

## 3. Render Configuration

| Key | Value |
| --- | --- |
| NODE_ENV | production |
| DATABASE_URL | Shared PostgreSQL connection URI, password URL-encoded |
| JWT_SECRET | Private random Mini App signing key, at least 32 characters |
| ZALO_APP_ID | Parent Zalo developer App ID |
| ZALO_APP_SECRET | Parent Zalo developer Secret Key |
| ZALO_ALLOW_SIGNUP | false until owner approves; true to enable new shared users |

Delete the obsolete `ZALO_AUTH_URL`. Do not define PORT unless necessary: Render
supplies it. Root Directory is `minizalo/backend`, Build Command is
`npm ci --include=dev && npm run db:generate && npm run build`, Start Command is
`npm start`, Health Check Path is `/api/health`.

Commit/push only Mini App changes to the branch selected in Render, then deploy.
Local `.env` and Render Environment are separate; they do not sync automatically.

## 4. Frontend and Real Device Tests

Frontend API is `https://mld-miniapp-api.onrender.com/api`. Build with `npm run
build` in `zalo_mini_app/my-app`. Upload a Development/Testing version only after
backend configuration and database approval. Use a tester account in the Mini
App's allowed testers/members. Complete Zalo domain/permission configuration if
required by the developer dashboard.

1. `/api/health` returns 200; catalogs show only actual admin-managed data.
2. On a real Zalo device, login asks only for name/avatar. No phone or OTP.
3. Cancel profile consent: no successful login or new user row.
4. Allow consent: first new signup creates one shared UUID with null phone,
   verified name/avatar, STANDARD tier and zero points. No fake business data.
5. Restart/re-login: same UUID and same data, no duplicate users.
6. For an existing linked customer, verify UUID, tier and points remain unchanged.
7. Invalid/expired Zalo token, wrong app token or inactive user: login fails.
8. JWT missing/expired/forged: private APIs return 401.
9. Book a real available slot: verify canonical booking/items/slot in admin;
   native clients must see the same booking and availability. Cancel and verify
   shared slot release. Do not fake payments or rewards to make tests pass.
10. Payment/reward integration requires the group's actual business workflow and
    separate end-to-end verification; these auth tests do not certify payments.

Automated tests use isolated PGlite, NOT the team's database. Zalo verification
uses mocked official responses in tests, so credentials/real Zalo behavior still
must be verified on device. A health response only confirms DB readiness, not
that Zalo credentials or identity extensions have been configured.

## Official References

- https://docs.zaloplatforms.com/docs/MA/api/user/user-information/getAccessToken
- https://docs.zaloplatforms.com/docs/MA/intro/intro/mini-app-account
- https://docs.zaloplatforms.com/docs/MA/intro/getting-started/convert-web-app-to-mini-app
- https://github.com/zaloplatform/zalo-php-sdk/blob/master/src/Zalo.php
- https://github.com/zaloplatform/zalo-php-sdk/blob/master/src/ZaloClient.php
