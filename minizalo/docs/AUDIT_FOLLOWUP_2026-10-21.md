# Mini App Audit Follow-up - 2026-10-21

## Scope

- Changes are restricted to minizalo on the local develop branch.
- Preserve the existing application layout and real-data behavior.
- Payments and privacy-policy authoring remain outside this pass.
- Tests use disposable database fixtures, not production customer records.
- No production migration, business-data deletion, deployment, or Git push in this pass.

## Reproduced Issues Fixed

1. Video heartbeat responses overwrote the lesson UUID with the progress-row UUID. This could close the lesson unexpectedly and prevent finding the correct draft on reopen. Merge only watched time and completion status; retain lesson identity and notes.
2. Failed playback heartbeats or note writes could trap a customer in a lesson. Offer an explicit exit retaining a local draft; if storage fails, offer an explicit unsaved-note discard instead of silently discarding.
3. Permanent note validation failures retried automatically forever. Separate saved, retryable, and blocked outcomes. Retry transient failures only; cap notes at the server's 10,000-character boundary.
4. Saving a profile while a selected avatar was still decoding could submit the previous image. Block saving until decoding completes and keep cancellation/replacement generation-safe.
5. Support, survey, and review fields remained editable while their requests were pending. Lock the submitted form and its navigation until completion so later edits cannot be silently cleared by an earlier response.
6. Profile and registration accepted malformed avatar values and invalid date/email types. Share strict avatar/date validation, reject year zero and non-calendar date strings, and verify rejected profile updates do not mutate stored data.
7. Null-coalescing in profile updates/adapters prevented explicitly clearing an avatar; truthy coercion also hid invalid input types. Preserve supplied values through the adapter, distinguish omission from null, and reject invalid types on the server.
8. Profile settings lacked an immediate synchronous submission lock and guarded response handling after unmount. Add both without changing the settings layout.

## Verification

- Backend: 152 tests passed, including typed input boundaries and no-mutation checks.
- Frontend TypeScript and production build passed; artifact references verified.
- Edge-case browser suite covers 320x640, 390x844, and 1366x900:
  avatar decode/save locking, pending support form locking, expired playback recovery,
  note size, permanent-error retry suppression, native-history Back, stable lesson UUID,
  and retained notes after reopening.
- Workflow browser suite covers appointment changes/cancellation, treatment steps/journal,
  lesson notes, failed saves, quiz selections, and booking/package reservation persistence.
- Integrity and completion browser suites also passed on all three viewports during this pass.
- Git whitespace checks passed (existing Windows line-ending warnings remain).

## Limits / Remaining Release Gates

- Browser fixtures do not prove native Zalo permission prompts, safe areas, or lifecycle behavior on physical iOS/Android devices.
- Video fixtures exercise playback session/state failures, not real media decoding or delivery.
- Previously verified production dependency audits were clean; the full development toolchain still has 140 aggregate findings (4 low, 93 moderate, 39 high, 4 critical), including inherited Zalo CLI chains. No unsafe major upgrade or downgrade was applied here.
- Missing real catalog, staffing, learning, and scheduling records must be supplied by their owners; no placeholder business records were inserted.
- Local develop is ahead 1 and behind 76 relative to its existing remote tracking reference. Integration requires a deliberate review; no automatic pull/rebase was attempted.
- Passing these checks is evidence for the covered cases, not a guarantee of zero defects or Zalo approval.

## Second Follow-up Pass

- Reproduced a last-edit loss in note autosave: while an older write was pending, reverting to the previously saved text cancelled the new save. The old response then became canonical without triggering another write. Include canonical lesson notes in autosave reconciliation dependencies so the latest visible text is persisted. The browser regression holds a real persisted response, reverts the text, then checks the disposable database for the final empty string.
- Reproduced unusable quiz configuration consuming attempts: JSON null/scalar/empty/single/nested/blank choices, a missing correct option, blank question text, and passing thresholds outside 0-10 all previously opened attempts. Validate configuration before inserting a new attempt and return a localized unavailable message instead. Existing valid attempt snapshots remain resumable after live question edits; no attempt records are deleted or reset.
- Final backend suite: 164/164 tests passed. The additional configuration suite includes ten invalid configurations with zero attempt creation and a valid snapshot-resumption regression.
- Expanded edge-case browser suite and full customer workflow browser suite passed at 320x640, 390x844, and 1366x900. Production build and artifact checks passed again.
- Frontend type checking uses the existing backend TypeScript compiler (`node ../../backend/node_modules/typescript/bin/tsc --noEmit` from the frontend folder). `npm exec tsc` attempted a network lookup because the frontend has no local compiler; no package was installed.
- The release limitations above still apply. This pass made no shared-database writes, admin changes, payment changes, push, or deployment.

## Third Follow-up Pass

- Reproduced a misleading quiz error during submission: a queued draft reached the server after the submission committed, received 409, and displayed an expired/submitted warning while the successful submission response was still pending. Draft errors now stay silent during submission and after that attempt has been submitted; the submission request owns its own error state.
- Draft feedback was scoped only to course/enrollment, not quiz identity. Scope it to the selected quiz and request generation as well, preventing delayed feedback from another quiz or an unmounted screen from updating the current screen.
- Draft exception text no longer claims a local copy exists if writing device storage failed.
- Expanded the workflow browser regression to hold real draft and submission responses in opposite order and verify that the pending and successful submission show no contradictory draft error. It still checks the actual saved answers and booking/treatment workflows.
- Added check-quiz-switch-browser.mjs: hold a draft, expire its attempt in the disposable database, switch to a second quiz, release the old request, and verify the old 409 stays isolated while the new quiz answers persist correctly.
- Both browser suites passed at 320x640, 390x844, and 1366x900. Frontend TypeScript, production build, and artifact verification passed again. No UI redesign, dependency change, production data write, push, or deployment was performed.
