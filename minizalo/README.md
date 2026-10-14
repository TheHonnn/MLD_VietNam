# MLD Zalo Mini App

This directory contains the Zalo Mini App and its existing API backend.
Flutter Android/iOS applications live in the repository's `mobile/` directory.

## Structure

- `zalo_mini_app/my-app/`: React, ZaUI, ZMP SDK and Vite application.
- `backend/`: Express API, Prisma schema and migrations used by this Mini App.
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
npm run dev
```

Set database and authentication configuration before starting the API.
Database migrations and seeding are separate operations.

This API is separate from the NestJS API in the repository's root `backend/`.
Their endpoints and authentication contracts differ; changing the client URL
alone does not integrate them.

## Imported Legacy Files

The old Flutter project, web admin, nested Git metadata and embedded admin UI
were moved to `.local-archive/minizalo-legacy-20261014/` at the repository root.
That archive is local-only and ignored by Git.
