# Portal schema repair (039)

The Contacts tab failed because `portal_contacts` was absent from production.
Read-only inspection also found `portal_taxonomies` and `legal_policies` absent.

Use `038_portal_schema_repair.sql`, not the historical Portal 035 migration:
035 seeds unverified contact/legal content, overwrites existing rows on replay,
and grants unrestricted write policies. 039 creates missing tables without seeds,
preserves existing rows, replaces the four Portal tables' policies with public
published/active reads and active ADMIN/SUPER_ADMIN writes via `admin_is_super()`.
It notifies PostgREST to reload the schema. Existing FAQ content is retained.

Backend prestart includes 039 so new deployments receive the same schema.
Legal CMS supports creating a blank unpublished draft without seeded policies.

Validation on 2026-11-14:
- Local PGlite test reproduces missing table, applies migration twice, checks
  data preservation, hidden drafts, denied anonymous/customer writes, admin writes.
- Applied 039 to production; all three previously missing relations now exist.
- Supabase REST SELECT returns HTTP 200 for contacts, taxonomies, FAQs and policies.
- No production contact, policy or FAQ content was inserted or updated.

Run regression: `node --test scripts/portal-schema-repair.test.cjs`.
Authenticated production editing was not exercised; the REST check is read-only.
