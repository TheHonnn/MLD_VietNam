# Booking Availability Publication - 2026-10-23

## Cause

The shared database had four active services but no technician-service assignments and no bookable technician slots. Four staff shifts existed only on October 16-17, already in the past. Empty availability was therefore a data/configuration problem, not permission to generate arbitrary customer bookings.

## Explicitly Approved Publication

After the user confirmed the exact staff, services, dates and times, one additive transaction inserted:

- Four technician-service assignments.
- Forty-two staff shift windows.
- Two hundred seventeen candidate start-time slots.

No existing row was updated or deleted. No customer, booking, payment or enrollment was created. Existing data was preserved.

Dates: **October 24-30, 2026**, Vietnam time. Daily windows: **09:00-12:00 and 13:00-16:30**, with starts every 30 minutes, only when the full service duration fits before the window ends. Lunch is excluded.

| Branch | Specialist | Authorized Services |
| --- | --- | --- |
| Nam Ky Khoi Nghia | Tran Lan Anh | Hydro-Care; herbal head spa |
| Nam Ky Khoi Nghia | Vo Hoang Yen | Eastern therapeutic massage |
| Nguyen Thi Minh Khai | Le Hoai An | Herbal head spa |

These are newly authorized operating windows, not a claim that the old staff roster already contained them. Do not renew them indefinitely without confirming the next operating schedule. Long Bien and the unclear service `hh` were not assigned availability.

## Code Changes

- `publish-availability.ts` and its operator CLI validate explicit date ranges, active canonical IDs, service duration, opening hours, overlapping shifts, approved staff leave and existing disabled service assignments.
- Dry-run mode performs no writes. Apply mode inserts only, is transactional and repeatable, and preserves existing slots/holds/bookings/cancelled shifts. The private approved plan remains in ignored `.relay-local/availability-plan-2026-10-23.json`.
- Both availability reads and final reservation now consult the current staff calendar. Later approved leave, cancelled shifts, reduced shifts or a shift at another branch prevent stale published slots from being booked. Explicit standalone slots still work on dates without a staff roster.
- Empty availability responses distinguish `NO_SERVICE_ASSIGNMENT`, `NO_PUBLISHED_SLOTS` and `NO_MATCHING_TIMES`.
- The booking screen explains the corresponding situation and offers branch/specialist recovery. It does not keep offering later-range searches when no service assignment or published roster exists.

## Production Verification

Read-only GET calls to the deployed Render backend after publication returned:

| Service / Branch | Available Dates | Starts on October 24 | First / Last Start |
| --- | --- | --- | --- |
| Hydro-Care / Nam Ky | All seven dates | 9 | 09:00 / 15:00 |
| Head spa / Nam Ky | All seven dates | 11 | 09:00 / 15:30 |
| Head spa / Minh Khai | All seven dates | 11 | 09:00 / 15:30 |
| Eastern massage / Nam Ky | All seven dates | 9 | 09:00 / 15:00 |

All date and slot requests returned HTTP 200. Candidate starts overlap intentionally; they are options, not simultaneously available appointments. The reservation conflict checks prevent overlapping bookings for the same specialist.

Readiness counts changed from zero assigned services / zero qualified future slots to **three assigned services / 217 qualified future slots**. The fourth active service `hh` remains intentionally unconfigured.

## Tests And Deployment

- Backend suite: 178/178 passed.
- Frontend TypeScript and production build passed.
- Publication tests cover dry run, repeat apply, preservation, real booking persistence, overlap rejection, cancelled shifts, approved leave and disabled assignments.
- Booking empty-state/recovery checks passed on Chromium and WebKit.
- Booking/home regression passed across five viewport sizes.
- All test writes use isolated fixture databases. The production database received only the explicitly approved publication above.

The data is already live through the existing Render availability APIs. The new calendar guards, reason codes and UI changes are local source changes until backend/frontend deployment. No commit, push or deployment was performed in this task.
