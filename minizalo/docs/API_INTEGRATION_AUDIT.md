# Mini App Shared-Database Integration Audit

## Data Ownership

The Mini App reads/writes the existing `database/schema.sql` contract through its
own authenticated backend. It does not use a second customer namespace, frontend
Supabase secrets, admin credentials, production test seeds, or schema mutations.
Admin edits are visible on the next API refresh; the app has a refresh command.
Local demo records, sample reviews, stock images for real entities, invented
benefits/rates/bank details, and simulated payment/registration success were removed.
Static labels, enum translations, validation limits and onboarding illustrations
are interface content, not fake database records.

Read-only inspection on 2026-10-16 found 3 services, 4 service categories, 2 branches,
2 technicians, 2 courses, 2 course categories, 1 instructor, 5 membership rules and
1 loyalty setting. There were no batches, published care articles or FAQs to show.
The deployed catalog UUID sets matched the configured shared database for services,
branches, technicians and courses. No customer data was printed or mutated.

## Screen And Action Coverage

| Surface | Canonical Source / API | Behavior |
| --- | --- | --- |
| Zalo connection and new-user onboarding | `/auth/zalo`, `/auth/zalo/register`, `users` | Verified phone; optional editable SDK name/avatar; one shared UUID |
| Home and service catalog/filter/search | `/services`, `/app-metadata`, service categories | Database names, prices, images, steps, benefits and actual reviews |
| Specialist catalog/details/filter | `/doctors`, `technicians`, `reviews` | Actual bio, branch, specialties and reviews |
| Branch directory/details/directions | `/branches` | Actual photos, address, phone, opening hours, amenities and coordinates |
| Course search/details and instructors | `/courses`, chapters, lessons, instructors, batches | Public previews only; protected media/attachments withheld |
| Booking wizard | `/slots`, `POST /bookings`, booking items | Real availability; transactional reservation; server price/discount |
| Appointments, cancel and reschedule | `/bookings`, `/bookings/:id/cancel`, `/bookings/:id/reschedule` | Owner-only mutations; returned persisted state; rebook by UUID |
| E-ticket | Actual `qr_code_hash` | Local QR generation, no external QR service |
| Treatment packages and journals | `/treatment-plans`, `/records`, user packages/journal | Actual sessions, dates, photos, staff, advice and booking context |
| Care library/articles | Published `/care-guidelines` | Actual content and steps; empty if admin has not published content |
| Pre-service survey | GET/POST `/consultation-surveys` | Owner-only saved history and submitted preferences |
| Reviews | GET `/reviews/mine`, POST `/reviews` | Own completed booking/service only; no default rating or fabricated review |
| Support and FAQ | `/support-faqs`, GET/POST `/support-tickets` | Actual questions, customer tickets and admin replies |
| Notifications | `/notifications`, read-one/read-all | Database-confirmed state; failures do not mark local entries read |
| Academy registration | `/course-enrollments` | Creates `CONSULTING` request, not a fake paid enrollment |
| Lessons, videos, notes and progress | `/courses/:id/learning`, lesson progress POST | Enrollment-gated; watched time/notes persist; no automatic graduation |
| Schedules, attendance, documents | batches, schedules, attendance, lesson attachments | Only actual records for the owned enrollment |
| Quizzes and results/history | quiz submissions and academic records | Backend grading, owner-only history; no answer keys in public payload |
| Certificates | Issued `student_certificates` | Actual code/PDF and locally rendered verification QR only |
| Personal/emergency-contact profile | GET `/auth/me`, PUT `/auth/profile`, `users` | Validated shared fields; editable unsupported fields removed/disabled |
| Membership tiers and point rules | `membership_tier_rules`, `loyalty_point_settings` | Admin-controlled rates, thresholds, benefits and real point history |
| Voucher wallet/claim/selection | `user_vouchers`, coupons, distribution rules | Eligible real vouchers; final service discount recalculated server-side |
| Invoices and payment history | `/transactions`, invoices/items and point transactions | Owned itemized invoices, actual branch and stored receipt PDF |
| Referral history/code | `referrals`, `users.referral_code` | Actual history; no invented rewards or enrollment attribution |
| Account settings | GET/PUT `/auth/settings`, `user_settings` | Database persistence, confirmed save/error handling |
| Logout | SDK session storage and root state | Clears session and customer-specific UI state |

## Deliberate Unsupported States

These are not implemented as fake successful operations:

- Online tuition/payment collection needs a configured merchant/gateway and the
  shared financial workflow. No card/bank details or paid status are fabricated.
  The incoming shared VietQR helper was inspected but not adopted: its fixed
  beneficiary defaults, missing ownership checks and booking-column mismatch are
  not an approved payment contract. It was not edited or executed by this task.
- Course voucher redemption and point redemption need the shared payment engine.
- Package-session booking/redemption needs an approved canonical linkage/workflow:
  `bookings` has no user-package reference. Do not charge an already purchased
  session as a new ordinary service or hide a package ID in free-text notes.
- Membership card/barcode issuance, expiry, wallet passes and a reward-product
  catalog have no canonical issuance/redemption contract in this Mini App.
- Referral invitation attribution/reward policy needs the shared group's rules;
  reading existing history does not implement awarding new rewards.
- Native biometric login/push dispatch are not implemented by merely saving a
  preference. Their UI must not claim active security or delivered push messages.
- Preferred branch, skin type, health notes and legal invoice issuer snapshots
  have no matching canonical fields here. No ad hoc schema or free-text storage.
  Invoice customer details use the current owned `users` relation, not a claimed
  immutable historical buyer snapshot.

Admin can populate existing categories, images, schedules, lessons, documents,
issued certificates, FAQs, care guides and configuration without a code seed.
Missing owner/configuration workflows above require coordination before enabling.

## Verification And Rollout

- Backend tests use isolated PGlite with the actual canonical SQL, not production
  writes. They cover admin edits, privacy/ownership, settings, protected content,
  learning persistence, booking transactions, signup and encrypted Zalo relay.
- Browser smoke checks use the anonymous public catalog without customer writes;
  authenticated flows are covered by isolated backend tests. Native Zalo permission
  and complete authenticated UI flows still need a real device check.
- On 2026-10-16, all 47 backend tests passed and frontend TypeScript/build passed.
  Render passed all 16 read-only API contract checks after deployment. Browser
  checks of home, service detail and academy at 320/390/1280px found no horizontal
  overflow. Browser-only SDK runtime events remain unverified on a real Zalo device.
  Missing/broken course images use an explicit empty-image state, not stock imagery.
- `node scripts/check-content.mjs --compare-deployed` is read-only and prints only
  aggregate counts and catalog-match booleans, never customer records/secrets.
- Deploy backend first. `/api/health` must report `contentContract: shared-admin-v1`.
  Then run `node scripts/check-deployment.mjs` before uploading the frontend.
- `DATABASE_URL`, `JWT_SECRET`, Zalo keys and the encrypted relay configuration
  remain private and unchanged. Keep the Vietnam relay/tunnel running for login.
- The existing build toolchain reports dependency audit issues; no broad automatic
  dependency upgrades or `npm audit fix --force` were applied in this task.
