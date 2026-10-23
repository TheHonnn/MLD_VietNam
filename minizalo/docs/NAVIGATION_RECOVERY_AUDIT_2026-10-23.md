# Navigation and failure recovery follow-up

Scope: Mini App frontend and its existing backend contracts on develop. Payment integration and legal policy content are deferred. No admin source or shared production business records were changed.

## Confirmed defects corrected

- Re-entering Academy through the bottom bar or a generic home shortcut could reopen the previous course or preserve an old global search. Generic Academy navigation now explicitly resets those entry parameters and starts at Academy home; explicit course/search/notification links keep their destinations.
- Booking from Directions closed Directions before login or booking eligibility was checked. The source remains visible until booking successfully opens. Dismissing guest login returns to Directions.
- The home notification bell opened an empty private inbox for guests. It now opens login consistently with Academy.
- Failed initial bookings, journals and treatment-plan reads were silently treated as empty arrays. Their individual error/loading states now reach the consuming screens. Retry invalidates the affected private caches and updates the data without resetting the account or closing the current treatment screen. A public care-guide failure no longer labels a successful appointment list as failed.
- A background appointment refresh error was only shown in detail, not in the list. It is now visible with retry in the list. Guest appointments offer login and do not poll protected booking endpoints.
- Failed care-guide, FAQ, support-ticket and account-settings reads lacked a usable local retry. These controls now reload the failed resource. Journal retries support both externally supplied and locally fetched records.
- Repeated voucher-claim taps could send concurrent writes and race wallet updates. A ref lock plus disabled input/button prevents duplicate submission. Successful responses are checked against the active session and component lifecycle, and the displayed wallet deduplicates the returned ID.
- A temporary web session-verification error called logout, clearing a still-valid credential. Transient errors now retain the credential and show retry. Existing API handling still expires a session on a confirmed authenticated 401.
- Map directions accepted blank coordinate strings as zero even though the embedded map rejected them. Both now use the same coordinate validation and fall back to the actual address.
- Failed booking entry from service, branch, directions and treatment details now reports the error at the source instead of silently closing or showing an error behind the overlay.

## Verification

- Backend full suite: 166 passed, zero failures.
- Frontend TypeScript, production build and generated-artifact checks passed. Sass legacy-API deprecation warnings remain; the build succeeds.
- Twenty browser suites passed on completed runs: booking/home, navigation controls, private-data recovery, workflows, academy, membership recovery, care/quiz recovery, session/learning, search, audit completion, audit integrity, edge cases, submission, carousel/notifications, final regressions, reliability, preload, quiz switch, guest smoke and service details.
- The new navigation suite covers guest/authenticated navigation at 320x640, 390x844 and 1366x900. It reproduces stale Academy entry and verifies source-screen preservation when closing login.
- The new recovery suite forces failures independently for bookings, packages, journals, care guides and settings. Retry loads persisted fixture records, a held voucher response proves one request and one wallet row, and temporary session-verification failure preserves the same credential on retry.
- Existing booking/home regression also covers 430x932 and 844x390 touch landscape, persisted specialist booking, available-date selection, fixed navigation and simulated device insets.
- All browser write scenarios use disposable in-memory PostgreSQL fixtures. Guest smoke/service checks run against a temporary fixture-backed preview, which is closed afterward.

These checks cover the named workflows and failure scenarios. They do not establish that every possible input or every physical Zalo device is defect-free.

## Confirmed shared-data blockers

A read-only production readiness query on 2026-10-23 returned:

| Data | Count |
| --- | ---: |
| Active services | 3 |
| Services assigned to active technicians | 0 |
| Future qualified technician slots | 0 |
| Lessons | 0 |
| Quiz questions | 0 |
| Class schedules | 0 |
| Published care guides | 0 |
| Active FAQs | 4 |

Actual technician/service assignments, future working slots and training content must be entered by an operator. The Mini App does not generate those business records. Real-device acceptance is still required for Zalo permissions, native navigation and camera insets. The current changes are local and have not been pushed or deployed by this audit.
