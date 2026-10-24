# Staff Booking - 2026-10-23

## Scope

- Mini app booking now serves staff booking for customers, not customer self-service.
- Staff select an existing customer or enter a new customer's actual name and phone.
- Service, assigned facility, date and available time remain selectable. There is no specialist selection or payment screen in this flow.
- The diagnostic service entry remains visible on Services. Without a real catalog service, duration, price and availability, it is disabled; no placeholder business record is inserted.

## Identity and Access

- Zalo login requests the staff audience. Existing active staff identity is required; login never promotes a customer or creates a staff role.
- Non-administrative staff require an active staff profile, no resignation date and an active assigned branch. Administrators may access all facilities.
- Customer lookup returns only identity, name and phone. Exact phone or full-name matching supports returning customers without visit history. Partial-name results are branch-scoped.
- For a selected customer with no account phone, the entered contact is stored on the booking only. The customer profile is not overwritten.
- Booking ownership remains the real customer; the employee creator is stored separately. Staff cannot explicitly assign a specialist or bypass branch access.
- Legacy customer APIs remain ownership-isolated for compatibility. Staff checks are server-side, including rescheduling and cancellation.

## Database

- Additive migration: `backend/migrations/009_staff_booking.mjs`.
- Adds only `miniapp_staff_bookings` with booking, staff, branch references and creation time. RLS is enabled, with no direct grants for public client roles.
- This migration has been applied to the shared database. It creates no users, roles, services or appointments and deletes nothing.
- New customer creation and booking are transactional. Failed bookings leave no orphan customer. Stable idempotency keys prevent duplicate submissions.
- Existing server-side specialist availability and overlap checks determine actual available times. This change does not add room/bed capacity constraints.

## Verification

- `npm.cmd test` in `minizalo/backend` builds and runs the backend regression suite, including `test/staff-booking.test.mjs`.
- Frontend TypeScript check: `node ../../backend/node_modules/typescript/bin/tsc --noEmit` from `minizalo/zalo_mini_app/my-app`.
- Production frontend build: `npm.cmd run build` from that same directory.
- Browser checks: `node scripts/check-staff-booking-browser.mjs` and `node scripts/check-staff-access-browser.mjs` from `minizalo/backend`, with the preview on port 5180.
- Main browser checks use five viewport sizes and both Chromium and WebKit. Fixtures are isolated PGlite databases, not shared production records.
- WebKit options: set `BROWSER_ENGINE=webkit` and `PLAYWRIGHT_BROWSERS_PATH` to the local `.relay-local/pw-browsers` directory.

## Release Order and Limits

1. Apply the additive migration where it is not already present.
2. Deploy the backend; health must expose `staff-booking-v1` before publishing this frontend.
3. Confirm actual employee phone/role/profile and branch mappings in the shared database.
4. Run deployment preflight and publish the Zalo testing version. Validate actual Zalo authorization on-device.

No Git push or server/Zalo deployment is performed by these local changes. Browser WebKit is not a substitute for a real Zalo iPhone test. Multi-person bookings, bed capacity enforcement, course video controls and certificates are outside this staff-booking change. Payment remains deferred.
