# Mini Zalo Database Alignment

Mini Zalo connects to the same PostgreSQL database and public schema as the
main MLD backend. The read-only canonical contracts are
`../../database/schema.sql` and `../../database/shared_types.ts` relative to
`minizalo/docs`. Database changes belong to the shared database owner.

## Prisma Is a Client, Not a Migrator

`backend/prisma/schema.prisma` intentionally contains only `User.id`, mapped to
`public.users.id` as UUID. It generates the Prisma v6 client and its parameterized
raw SQL APIs; it does not describe the complete database. Application queries
use the canonical snake_case tables and columns and shared enum values. Adapters
translate those rows to the shared TypeScript contracts and Mini Zalo views.

Never run `prisma migrate`, `prisma db push`, or a seed against this database from
Mini Zalo. Applying the partial Prisma model could destroy canonical structures.
There is no automatic migration or seeding during installation, build, startup,
or Render deployment. Migration, deployment, seed, and Studio npm commands have
been removed. Only the shared database owner provisions or updates the schema.

## Shared Connection and Identity

Set `DATABASE_URL` to the existing shared database using the application's
database account. The URL must select the canonical `public` schema. An old
Mini Zalo database with PascalCase tables and text IDs is incompatible; point
the application at the shared database instead of deploying archived migrations.
No separate `DIRECT_URL` is required because this application does not migrate.

Set `JWT_SECRET` to a private random secret for the Mini App backend. Native
backends do not need to share this key: shared data does not require shared
tokens. JWT `sub` is always the canonical `users.id` UUID, with an eight-hour
expiry. This backend accepts its own HS256 tokens and reloads the active shared
user on every private request.

The frontend requests name/avatar and phone-sharing permission only after the
user taps the Zalo login action. It sends `{ accessToken, phoneToken }` to
`/api/auth/zalo`. No manual phone entry or OTP is used. The backend exchanges
the single-use phone code with `https://graph.zalo.me/v2.0/me/info`, using the
same access token and its private app secret. Only that verified phone selects
the shared account; client-supplied phone values and UUIDs are ignored. Session
tokens use ZMP native storage with an in-memory fallback. Initial page load does
not trigger a phone consent prompt; public catalogs remain available to guests.

Set `ZALO_APP_ID` and `ZALO_APP_SECRET` to the parent Zalo developer application,
NOT the Mini App ID or an OA access token. The backend calls the fixed official
`https://graph.zalo.me/v2.0/me?fields=id,name,picture` endpoint using the token
and HMAC-SHA256 `appsecret_proof` header as in the official Zalo PHP SDK. Enable
the app's API app-secret-proof protection where available. Invalid provider
responses, missing profile permission, redirects, and provider outages fail
closed; no client-provided UUID, name, avatar, phone, or app ID selects an account.
`ZALO_AUTH_URL` is no longer used and must not be configured.

The existing canonical `users.phone UNIQUE NOT NULL` schema is used unchanged.
No Zalo mapping table or phone-nullability SQL is required. Earlier phone-free
SQL proposals were removed; do not apply old copies. If the team already applied
any proposal, coordinate with its owner before reverting anything; this app
never automatically drops tables or restores NOT NULL on existing records.

The verified phone is normalized to local 0-prefix form and matched against
existing local, 84-prefix and +84-prefix values. One existing active CUSTOMER or
STUDENT account reuses its shared UUID, tier, points and profile without changes.
Duplicate aliases require administrator review; inactive and staff accounts are
rejected. Phone changes/reassignment require the group's account recovery policy;
do not automatically move history based on Zalo display names.

With `ZALO_ALLOW_SIGNUP=true`, a phone with no shared account creates one user
transactionally, with verified name/avatar/phone, STANDARD tier and zero points.
If signup is disabled it returns 409. Unique and serialization conflicts retry
without creating separate customer identities. No fake phones or demo users.

See `docs/ZALO_LOGIN_SETUP.md` for operator setup and device test steps.

`backend/src/lib/prisma.ts` loads dotenv before constructing the client. Keep
credentials in the actual deployment environment or private local `.env`;
examples contain placeholders only. Never commit or print connection strings
or signing secrets.

## Commands

Run these from `minizalo/backend`:

```sh
npm ci --include=dev
npm run db:generate
npm run build
npm run db:check
npm test
```

`db:generate` generates the Prisma client without connecting to PostgreSQL.
`build` compiles TypeScript. `db:check` builds, then invokes
`validateSharedSchema(createStore(prisma))` from the shared application store.
This live preflight reads `information_schema.columns` to check required tables,
columns, and UUID primary identifiers; it performs no data or schema writes and
always disconnects Prisma. It exits nonzero on connection or contract failure.
Its success confirms the required application contract, not every constraint,
trigger, enum, or column in the full canonical schema. Startup uses the same
read-only preflight to reject an incompatible legacy database.

`dev` runs `src/main.ts`; `start` runs `dist/main.js`. The executable entry
validates the shared schema before listening. `server.ts` exports `createApp`
for application construction and integration tests.

`npm test` builds and runs the parent's integration tests in `test/*.test.mjs`.
PGlite is a development-only dependency for an isolated PostgreSQL test engine.
Those tests load canonical SQL with unsupported extension and trigram-index
statements skipped; they must not connect to or seed the deployed shared database.

Render runs `npm ci --include=dev && npm run db:generate && npm run build`, then
`npm start`. Configure its shared `DATABASE_URL`, `JWT_SECRET`, and frontend
origin explicitly. Render never runs migrations or seeds.
Set Render's parent `ZALO_APP_ID` and `ZALO_APP_SECRET`. Keep
`ZALO_ALLOW_SIGNUP=true` to enable verified new customer registration. The `db:check`
command and startup schema preflight remain read-only.

## Verification Status

The backend integration tests run against an isolated PostgreSQL engine loaded
from the repository's canonical SQL. They verify shared UUIDs, ownership,
booking/slot/voucher transactions, academy data, Zalo-only identity resolution,
and visibility of changes written by another client.

No live schema, migrations, seed data, or connection secrets were changed.
Set the real shared connection, private Mini App JWT secret, and parent Zalo
credentials, then run `npm run db:check` before starting the API.
Passing offline tests does not mean the deployed clients are already connected
to the same database.

## Historical Files

`docs/legacy-database/` preserves the original Prisma schema, seed, migration
lock, and six historical migrations. These files describe the retired independent
database and are retained only for reference. They are outside the active Prisma
directory and are not wired to npm commands or deployment. Do not execute them
against the shared database or copy them back into `backend/prisma`.
