# Mini App: shared admin data

See [FULL_WORKFLOW_AUDIT.md](FULL_WORKFLOW_AUDIT.md) for the screen-by-screen
audit, persistence fixes, current content counts and remaining workflow limits
verified on 2026-10-18.

Scope: `minizalo/` on `develop`. Admin and shared backend code are not modified.
Existing database tables and business records are not changed. With the user's
explicit approval, a new `miniapp_search_history` table was added to the shared
database. Removing sample content means removing frontend fallbacks, not deleting
database records.

## Sources

| Customer area | Shared tables |
| --- | --- |
| Home, discovery, service details | services, service_categories, reviews |
| Branches and specialists | branches, technicians, reviews |
| Booking, rescheduling, cancellation | bookings, booking_items, technician_slots |
| Customer profile and interests | users |
| Notifications and settings | notifications, user_settings |
| Treatment packages and journal | treatment_packages, user_packages, treatment_journal |
| Care, surveys and support | home_care_guidelines, consultation_surveys, support_faqs, support_tickets |
| Courses, instructors and registration | courses, course_categories, instructors, course_batches, course_enrollments |
| Lessons, documents and progress | course_chapters, course_lessons, user_lesson_progress |
| Schedule and attendance | batch_schedules, branch_rooms, student_attendance |
| All quizzes and submissions | course_quizzes, quiz_questions, quiz_submissions |
| Results and issued certificates | student_academic_records, student_certificates |
| Vouchers | coupons, voucher_distribution_rules, user_vouchers |
| Invoices, rewards and referrals | invoices, invoice_items, point_transactions, membership_tier_rules, loyalty_point_settings, referrals |
| Academy tuition receipts | tuition_transactions, course_enrollments |
| Search history and popular catalog searches | miniapp_search_history, active catalog tables |

Missing content stays blank. Database or network failures still show an error.
No fallback customer, price, appointment slot, payment success or certificate is
created. Branding, onboarding illustrations, field labels and form choices are
interface content, not customer/catalog fixtures.

The schema has no direct service-to-branch/technician assignment or issued member
card/barcode source. These existing controls remain blank/disabled; no relation,
card identifier or QR payload is invented. Phone changes, biometric sign-in,
online payments, wallet integration and reward redemption are not simulated.

## Read-only Check On 2026-10-16

The configured shared database contained 3 services, 2 branches, 2 technicians,
2 courses and 1 instructor. Lessons, schedules, quiz questions, technician slots,
care guidelines and FAQs were empty. Admin must add actual records before these
areas can show content. In particular, booking requires available future slots.
Counts may change after this inspection.

The approved search-history migration was applied on 2026-10-16. RLS is enabled;
the table initially contains zero rows. No test queries or customers were inserted
into the shared database. `check-search-browser.mjs` uses isolated in-memory
PostgreSQL for all browser writes.

Search results preserve the original API records, including numeric prices.
Recent searches are loaded, saved and deleted through authenticated Mini App API
routes, owned by the signed-in shared UUID, with at most 20 distinct recent terms.
Guests can browse/search but cannot persist personal history. Terms are saved on
submit, selecting a recent/popular term, or selecting a result, not on every key.
Popular searches are ranked from real saved search counts, limited to exact names
in the active public catalog. Arbitrary private queries are never published.
No searches means blank suggestions, not hardcoded examples from the screenshot.

The content audit found no embedded customer, service, course, specialist, booking,
rating, voucher or search-history dataset in production `src/`. Static navigation
labels, form choices, branding and onboarding media remain UI content. Fixtures
in `test/` and isolated browser-check scripts are not included in the Mini App.

The Render health request timed out after 20 seconds during this check. Local
database access succeeded; this does not prove the deployed Render API is healthy.

## Verification

From `minizalo/backend`:

```powershell
npm.cmd test
node scripts/check-content.mjs
```

Tests use isolated in-memory PostgreSQL (PGlite), not production mutations.

Optional local read-only catalog preview:

```powershell
npm.cmd run build
node scripts/preview-readonly.mjs
```

In a second terminal, from `minizalo/zalo_mini_app/my-app`:

```powershell
$env:VITE_API_BASE_URL='http://127.0.0.1:5107/api'
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5177 --strictPort
```

Open `http://127.0.0.1:5177/`. This preview deliberately blocks writes and cannot
exercise real Zalo login. Do not deploy the preview server in place of `main.js`.
The browser check script uses the existing local Playwright installation and
Chrome; it captures mobile/desktop screenshots, checks actual catalog titles,
empty responses and visible connection errors. SDK login needs the Zalo runtime;
ordinary Chrome may report its unsupported login request.

Production API URLs and Zalo/relay settings are unchanged. No push or deployment
is performed automatically by these checks.

## Academy Screens

The academy includes a home screen, catalog, course detail, instructor detail,
registration review, tuition view, personal enrollments and class detail. Images,
names, prices, batches, receipts and progress come from the shared API. No example
names, fees, weeks, learning modes, lessons or completion percentages from the
reference images are embedded in the production UI.

Catalog durations use configured hours; a number of weeks or an online/offline
mode is not inferred when the schema does not supply it. The learning-mode filter
stays blank/disabled. Registration uses the signed-in customer's actual profile,
not an editable unverified phone or a fabricated student contact snapshot.

Choosing a batch is checked against the actual course, active branch, open status
and enrolled capacity. Registration persists as CONSULTING with no payment or
automatic access to protected materials. Tuition shows configured or recorded
amounts and actual receipts only; no online payment or gateway success is faked.
Archived catalog entries can still show an owner's tuition record.

Class schedules, notes, quizzes, documents and certificates retain their existing
shared-database workflows. Learning/progress/quiz requests identify the selected
enrollment, so two classes for the same course cannot silently share progress.
The progress response refreshes the enrollment without closing a lesson in use.

`node scripts/check-academy-browser.mjs` checks the academy on mobile and desktop
using isolated PGlite data only, including persisted registration, lesson completion
and quiz submissions. Its records and images are test fixtures, not production
fallbacks and never inserted into the shared database.
