# Mini App Notifications

Only `minizalo/` is changed. Apply the additive migration `004_mobile_reliability`
before deploying the matching backend. No existing rows are removed.

## In-App Inbox

Database triggers persist notifications in the same transaction as actual
business changes, including writes from the shared admin. An A-B-A transition
is retained even when the customer never opens the app between changes.
Historical transitions predating the migration are not invented. Rows carry an
owner-scoped target, channel and event sequence. Quiz answers are not copied.
Clinical notifications can contain the owner's actual specialist advice.

Covered sources:

- Booking status, date/time, branch, technician assignment and cancellation.
- Course registration, class assignment/schedule, tuition and completion.
- Lesson/chapter/quiz content changes for eligible enrolled students.
- Quiz scores and instructor feedback, academic results and attendance.
- Certificate issuance/revocation.
- Owned treatment packages, session counts and clinical journal changes.
- Support request status/replies and replies to customer reviews.
- Invoice status/refunds, tuition transactions, points and owned vouchers.
- Upcoming active booking reminders within 24 hours and 2 hours, respecting
  `user_settings.appointment_reminder`. These are generated on inbox refresh and
  by paginated background batches while the backend process is running.

Unchanged business rows do not emit events. Repeated refreshes do not duplicate
events or reset read state. Legacy snapshot observation remains only as a
compatibility fallback for installations without the new migration.

The active app refreshes every 30 seconds, on returning to the foreground,
opening the inbox and successful business mutations. Hidden pages do not poll.
Private responses are discarded if the session changes. Read state is monotonic
when a delayed poll overlaps a read mutation.

Typed targets open an owner-checked appointment detail, exact enrollment and
learning tab, treatment detail/journal/support reply or personal ledger. Existing
BOOKING notifications without a typed target still use their entity UUID.
Unavailable/deleted destinations show a retryable error, not another customer's
record or a made-up success screen.

## Limits And Deployment

This implements the **in-app inbox**, not native Zalo push, SMS or notifications
while the app is closed. Business events are persisted while the app is closed.
The API runs reminder batches every minute, but a sleeping/stopped host cannot
execute them; use an always-running process for dependable scheduling. External
delivery still requires an approved provider integration.

The inbox returns 50 rows, totalCount, unreadCount and an opaque nextCursor.
Passing ?cursor=... loads older rows. Ordering uses microsecond timestamps,
event sequence and UUID. Badge counts cover all visible unread events, not just
the loaded page. System/promotion/reminder visibility follows stored settings.

Deploy the Mini App backend to Render and the matching frontend to Zalo Testing.
Do not upload `.env`, Zalo secrets, relay credentials or test output. Build the
backend and run `node scripts/apply-mobile-reliability.mjs --apply` first. Without
--apply it is a dry run. Never run production seeds. No admin code is modified.

## Verification

- `cd minizalo/backend` then `npm.cmd test`: isolated in-memory PostgreSQL only.
- `node scripts/check-carousel-notifications-browser.mjs`: isolated API fixture
  plus Vite preview, verifies 3-second rotation, actual rendered assets, layout,
  persisted read state and exact notification destinations at three viewports.
- Real Zalo login and native push are not established by desktop Chrome tests.
