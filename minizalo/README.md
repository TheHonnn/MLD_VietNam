# MLD Zalo Mini App

This directory contains the Zalo Mini App and its existing API backend.
Flutter Android/iOS applications live in the repository's `mobile/` directory.

## Structure

- `zalo_mini_app/my-app/`: React, ZaUI, ZMP SDK and Vite application.
- `backend/`: Express API and Prisma raw SQL client for the shared MLD database.
- `figma/`: Design references.
- `docs/`: Imported business rules and API documentation. Historical notes may
  still describe the previous multi-platform project.
- `render.yaml`: API deployment configuration, relative to the repository root.

## Mini App

From the repository root:

```powershell
cd minizalo/zalo_mini_app/my-app
npm ci
npm start
```

Configure `VITE_API_BASE_URL` in `.env` for local development. `.env.production`
contains the public production API URL and is included in Git. Never put secrets
in `VITE_` variables, since they are included in the client bundle.

```powershell
npm run build
npm run start:zalo
```

Zalo deployment uses `npm run deploy` or `npm run deploy:test` and requires access
to the configured Zalo app.

## Existing Mini App API

```powershell
cd minizalo/backend
npm ci
Copy-Item .env.example .env
npm run db:generate
npm run build
npm run db:check
npm run dev
```

Set `DATABASE_URL` to the existing shared MLD database and `JWT_SECRET` to a
private Mini App HS256 signing secret. JWT `sub` is the canonical `users.id` UUID.
Do not run migrations, `prisma db push`, or seeds from Mini Zalo; its minimal
Prisma schema is only for client generation. `db:check` and startup validate the
required shared schema with read-only queries. Historical database artifacts
are archived in `docs/legacy-database/` and must not be executed.

For Zalo login, set the parent application's `ZALO_APP_ID` and `ZALO_APP_SECRET`.
The Mini App backend directly verifies Zalo tokens and reads name/avatar from
Zalo, not client-provided profile fields. After an explicit user action it requests
phone-sharing permission, then verifies the one-time phone code server-to-server.
No manual phone input or OTP is used. Verified phone resolves the canonical
`users.id`, preserving native customer history. `ZALO_AUTH_URL` is no longer
used. Set `ZALO_ALLOW_SIGNUP=true` to allow new shared customers. No schema
extension or nullable-phone migration is needed. See [login setup](docs/ZALO_LOGIN_SETUP.md)
and the [database alignment guide](docs/DATABASE_ALIGNMENT.md).

This API is separate from the NestJS API in the repository's root `backend/`.
When configured with the team's database connection and verified phone identity,
it shares canonical records and UUIDs with that API, not signing secrets; Mini App
adapters handle its endpoint and response contract.

## Imported Legacy Files

The old Flutter project, web admin, nested Git metadata and embedded admin UI
were moved to `.local-archive/minizalo-legacy-20261014/` at the repository root.
That archive is local-only and ignored by Git.
