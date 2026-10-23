# Booking, discovery and mobile frame fixes

## Confirmed production-data blocker

A read-only shared-database check on 2026-10-23 returned three active services, zero services assigned to an active technician, and zero future qualified technician slots. Four active FAQs exist. No shared business records were inserted, edited or deleted during this work.

The Mini App requires explicit assignments in `miniapp_technician_services` and real available time intervals in `technician_slots`. The existing `configure-workflows.mjs` script supports validated technician/service assignments. The current admin code exposes technician slots but does not reference `miniapp_technician_services`; entering a technician's specialty text alone does not create an assignment. An operator must supply the actual service assignments and working hours. Do not bypass these rules or generate placeholder availability.

## Changes

- Specialist booking keeps the profile open and reports missing service assignments. Successful booking preserves the selected technician and branch; service and branch choices in that flow stay within the initial specialist's scope. Guest booking actions retain the source profile/detail while authentication is shown.
- Authentication and new-customer onboarding render above service/specialist details. Login focuses its own controls and restores focus to the originating button when dismissed; the service regression verifies close-login followed by Escape returns correctly.
- `GET /api/slots/dates` returns real available dates in a maximum 31-day range. It reuses the single-day availability rules, including service assignment, duration, branch hours, account-owned holds and booking conflicts. It returns no customer identity or booking details.
- The booking calendar initially selects the nearest actual date in the range, provides a selector of available dates and can search the next range. Day/date requests are canceled on changes and old responses cannot overwrite newer choices. Empty and failed reads have distinct feedback, retry and branch contact actions. Confirmation still revalidates availability on the backend.
- Home retains its first screen and adds scrollable quick actions, upcoming booking, service/course previews, selected branch details and canonical FAQs. Dynamic counts and business content come from the API; loading failures do not create invented zero counts.
- Zalo status bar uses normal mode to reserve the native status area. The shared frame consumes CSS/Zalo safe-area insets and respects landscape touch devices. Discovery dialogs also reserve the top inset. Booking uses a compact landscape layout and a shorter date-page header so actual time choices remain reachable.
- The auth regression test now verifies that phone nullability is unchanged during signup, matching the current shared schema, while still asserting that the verified phone is stored. It no longer assumes the shared schema requires NOT NULL phone.

## Verification

- Backend: 166 tests passed, including real availability-date filtering and bounds.
- Frontend TypeScript and production build/artifact verification passed.
- Eighteen browser suites passed on their completed runs: booking/home, workflows, submission/safe-area, carousels/notifications, search, session/learning, membership recovery, care/quiz recovery, audit integrity, audit completion, academy, quiz switching, edge cases, final regressions, preloading, reliability, guest smoke and service details. The additional guest service regression exposed the login stacking/focus issue above; it passed all three viewports after that correction.
- Dedicated browser regression covers 320x640, 390x844, 430x932, 844x390 touch landscape and 1366x900 desktop: unassigned specialist feedback, assigned specialist booking, canonical date selection, persisted booking, empty/offline states, home navigation and simulated 59px top/34px bottom insets.
- Browser screenshots are stored under ignored `minizalo/backend/.relay-local/home-expanded-*.png` and `booking-available-*.png`. These contain disposable fixture records only.

## Deployment

Deploy the Mini App backend before uploading the new Zalo testing bundle because the date selector uses the new API route. No database migration is required for these code changes. Configure actual staff/service assignments and future slots separately to make real bookings available.

This work does not publish a Zalo version or modify admin source. Real Zalo device acceptance is still needed for the native status bar and camera cutouts; browser simulations do not prove behavior on every physical device.
