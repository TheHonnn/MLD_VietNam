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

Set `JWT_SECRET` to the same HS256 signing secret used by the shared backend.
The JWT `sub` is the canonical `users.id` UUID. Zalo login must resolve to that
shared identity; Zalo IDs, legacy CUIDs, and demonstration IDs are not user UUIDs.
Do not provision an independent Mini Zalo user table or seed demo identities.

Zalo login supports native canonical linking or an optional shared identity relay.
For native linking, leave `ZALO_AUTH_URL` empty and configure the server-only
`ZALO_APP_SECRET`. The Mini App obtains a phone permission token using
`getPhoneNumber` and sends it with the Zalo access token to the backend. The
backend calls `GET https://graph.zalo.me/v2.0/me/info` with `access_token`, `code`,
and `secret_key` headers to retrieve the verified `data.number`, and verifies
the profile through `graph.zalo.me/v2.0/me`. See the official
[Zalo getPhoneNumber documentation](https://docs.zaloplatforms.com/docs/MA/api/user/user-information/getPhoneNumber).

The verified number is matched against shared `users.phone` in local `0`, `84`,
and `+84` formats. An existing account retains its canonical UUID. If no account
exists, native login inserts into the shared `users` table with verified `phone`,
profile `full_name`, and a generated `referral_code`; canonical defaults supply
the UUID and `STANDARD` membership tier. Duplicate phone identities require
resolution by the shared identity owner, and inactive accounts cannot log in.
This authenticated account creation is an application write, not migration or
seeding. No separate `zaloId` column or Mini Zalo identity table is needed.

Alternatively, set `ZALO_AUTH_URL` to a trusted shared identity API that returns
`accessToken` or `token` containing the shared HS256 JWT. When configured, this
relay takes precedence over native linking. Both paths use the shared
`JWT_SECRET` and canonical UUID as JWT `sub`; a client-supplied UUID is not
authentication. Configure either the relay or the native app secret for Zalo
login. Existing valid shared JWTs use the same identity contract.

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
For native linking, set Render's server-only `ZALO_APP_SECRET` and leave
`ZALO_AUTH_URL` empty. For relay linking, set `ZALO_AUTH_URL` instead. The
`db:check` command and startup schema preflight remain read-only in both modes.

## Verification Status

The backend integration tests run against an isolated PostgreSQL engine loaded
from the repository's canonical SQL. They verify shared UUIDs, ownership,
booking/slot/voucher transactions, academy data, verified Zalo phone linking,
and visibility of changes written by another client.

The local `DATABASE_URL` checked during this alignment did not contain the
canonical tables. No live schema, migrations, seed data, or connection secrets
were changed. Set the real shared connection, shared JWT secret, and Zalo app
secret (or identity relay), then run `npm run db:check` before starting the API.
Passing offline tests does not mean the deployed clients are already connected
to the same database.

## Historical Files

`docs/legacy-database/` preserves the original Prisma schema, seed, migration
lock, and six historical migrations. These files describe the retired independent
database and are retained only for reference. They are outside the active Prisma
directory and are not wired to npm commands or deployment. Do not execute them
against the shared database or copy them back into `backend/prisma`.
