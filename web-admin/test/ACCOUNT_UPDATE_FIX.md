# Account update fix, 26 October 2026

Account edits previously treated an empty Supabase PATCH result as success and
stored a browser-only replacement. The shared users table had RLS enabled with
only a SELECT policy, so Admin could display a changed role without persisting it.

The direct update path now requires a complete primary key and exactly one matching
returned row. Failed or missing-table updates cannot use local storage. Role edits
are read back without caching before success. The customer service also propagates
a failed account write instead of re-reading the old account as a successful edit.

Migration `database/migrations/007_admin_users_update.sql` adds an UPDATE policy for
authenticated, active ADMIN/SUPER_ADMIN accounts identified by their Supabase Auth
UUID. Its security-definer helper has a fixed search path and no PUBLIC execute
grant. It retains existing policies and data, adds no self-update policy, and is
repeatable. It does not grant staff access to a CUSTOMER or change NV102's role.

Validation:
- `npm.cmd test` in web-admin tests actual bundled API/service code with isolated
  network/storage fixtures: empty writes, missing tables, denied writes, invalid
  keys, multiple rows, uncached role verification and customer failure propagation.
- `node --test test/admin-users-policy.test.mjs` in minizalo/backend tests the real
  migration in an isolated PostgreSQL-compatible database, including attempts at
  self-promotion, inactive admins, repeat application and preservation of rows.
- Admin TypeScript and production build pass.
- Migration applied to the shared database. Read-only checks confirm an existing
  SUPER_ADMIN passes the policy helper and NV102's CUSTOMER account does not.

After publication, sign in as an actual administrator and save NV102's linked
account with role RECEPTIONIST. The role change is a separate business operation;
no real account role was changed during migration or validation.
