# Live state and pending-write audit

This follow-up changes only Mini App frontend behavior and browser regressions. Existing shared backend contracts, admin source, production business records, payment integration and legal policy content are unchanged.

## Corrections

- Booking, cancellation and rescheduling now reload canonical bookings, membership, treatment plans, journals and notifications together. Package reserved-session counters refresh immediately, and externally canceled bookings no longer remain as confirmed rows after a later package booking.
- Private refreshes use a revision guard. Initial or older reads cannot overwrite a newer refresh triggered by a completed mutation. Saving a profile starts a fresh member read, preventing an old initial membership response from reverting the displayed customer name.
- Successful enrollment, voucher claims and reviews refresh the shared member state even when the originating component has unmounted. A voucher claim completed after leaving the wallet is visible when the wallet is reopened.
- Opening notification content checks the session and navigation request after every asynchronous lookup. Closing the inbox or navigating back cancels the pending navigation. Marking the notification read still persists.
- Shared bottom navigation is disabled during appointment mutations, care-form submissions, registration, quiz submission/start and explicit progress saves. Busy-state cleanup unlocks it when the operation completes or its component unmounts. Existing page-level controls and native-back guards remain in place.
- Leaving a lesson with a draft waits for an existing progress save. It keeps the latest edited notes, verifies that the lesson/session has not changed, and does not demand device storage when those exact notes are already saved on the server.

## Regression Coverage

Fourteen browser suites completed successfully during this follow-up: workflow, session/learning, edge cases, private-data recovery, carousel/notifications, audit completion, navigation controls, notification navigation, live member refresh, care/quiz recovery, audit integrity, academy, booking/home and preload.

The enhanced workflows verify one reserved package session after booking and zero after cancellation, without consuming a treatment session. Pending support/quiz requests verify shared navigation locking. The lesson edge-case test explicitly holds an autosave while native Back requests a recoverable exit, then verifies saved notes after reopening.

Two additional browser scripts cover delayed notification navigation and live member refresh. They hold real responses from disposable PostgreSQL fixtures, exercise close/save/navigation actions, and verify the resulting UI and persisted records. The member test also completes a voucher claim after its source profile has unmounted.

Standard regressions cover 320x640, 390x844 and 1366x900. Booking/home also covers 430x932 and 844x390 touch landscape. Frontend TypeScript, production build and generated-asset checks passed. No production data was written by these checks.

## Release Status

These fixes are local. A new backend deployment and Mini App testing upload are still needed for the accumulated changes. Real Zalo device testing remains required for native permissions, platform navigation and camera insets. Missing business assignments, availability and learning content must be supplied from actual operations; the application does not invent them.
