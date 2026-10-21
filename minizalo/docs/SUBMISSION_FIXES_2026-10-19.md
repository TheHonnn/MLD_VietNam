# Submission Hardening - 2026-10-19

Scope: local `develop`, only `minizalo/`. Preserve existing work, shared data,
admin and payment implementation. No commit, push or deployment performed.

## Implemented

- Auth: 20-second deadline covering SDK and HTTP, synchronous click locks,
  cancellation, session-generation checks and no late token writes after cancel.
  Guest browsing stays accessible. Registration cancels on unmount as well.
- Profile sharing: no automatic profile permission before phone verification.
  A separate optional action imports the name/avatar in profile completion.
- Layout: central safe-area ownership, shared bottom-nav height, no fake home
  indicator, light-theme status-bar contrast, 100vh fallback and zoom restriction
  removed. Supported build baseline is now Chrome/Edge 108, Safari/iOS 15.4,
  Firefox 109 rather than the previous unsupported legacy browser declarations.
- Navigation: bounded, owner-scoped in-memory view history with opaque browser
  history IDs, Back support for details and nested profile/academy views. Modal
  Back handlers choose the top registered layer. Web preview no longer becomes
  blank because ZMPRouter assumes a native `/zapps/...` base path.
- Quiz: immediate start lock, quiz-specific request scope, selectors/tabs disabled
  during start/submit, stale responses ignored. Countdown renders independently;
  server deadlines remain authoritative. Video pauses on native AppPaused and
  document visibility changes, and listeners are removed on unmount.
- Notes: local owner/enrollment/lesson drafts survive immediate navigation;
  automatic server saves retry while the lesson stays open. No fake progress.
- Search: navigation does not await history writes. A bounded session-aware queue
  serializes writes/deletes and deduplicates pending queries. Deferred search,
  memoized index and incremental result rendering reduce keystroke work.
- Networking: obsolete availability requests are aborted and limited to three
  workers. Image preloads stop on timeout/cancel, deduplicate active URLs and cap
  each warmup/cache at 128 images. Full private learning warmup caps at three
  active enrollments; other data remains available on demand, not hidden.
- Startup: publish catalogs independently; secondary content does not gate the
  critical catalog. Booking, academy, profile, records and treatment load as
  separate chunks. Pending chunk loads offer Back; error recovery can retry a
  fresh lazy component or reload the app. Unchanged inbox polls reuse UI state.
- Build output is explicitly the project's `www/` directory, matching the Zalo
  CLI artifact directory instead of silently writing a different `src/www/`.
- Profile: image read/decode cancellation and validation are shared with onboarding;
  newer selections cannot be overwritten by older decodes. Toast/copy timers are
  replaced and cleaned up; account menu actions use actual buttons.
- Dependencies: SDK updated to patched 2.53.2; UI/plugin remain pinned. Prisma
  CLI/client updated together to 6.19.3, with a scoped `@prisma/config` override to
  deepmerge-ts 8.0.0. Its changed Map behavior does not affect this project's
  plain schema/environment configuration. No Prisma 7 or forced router migration.
- API: process-local limits protect auth before the provider and authenticated
  writes by signed user. Rejections return 429 and Retry-After. IP handling does
  not trust arbitrary forwarded headers by default.
- Legal: at the user's request, local privacy/terms illustrations are explicitly
  labeled as drafts. Real HTTPS URLs replace these via build configuration.
  No invented retention period, legal contact or fake acceptance record.
- Operations: `npm run reminders:run` runs an idempotent reminder batch as an
  independent scheduled job instead of depending solely on an awake API process.

## Verification

- Backend: 115 tests passed, including eight new hardening cases. Tests use
  isolated in-memory PostgreSQL; no business test records entered the shared DB.
- Frontend TypeScript and production builds passed. Latest recorded main JS is
  approximately 434 KB / 129 KB gzip after dropping the unused ZMP router wrapper,
  versus the audit artifact's 608 KB / 172 KB. A final build summary is authoritative.
- Browser checks passed search/history/filters, full booking/treatment/learning
  workflows, idempotent retry, quiz drafts and device-clock skew at 320x640,
  390x844 and 1366x900.
- Additional checks passed nonblocking history writes, spam deduplication,
  browser Back, locked quiz selection, simulated 47px/34px safe insets, both legal
  draft screens and nested Back without accidentally closing account settings.
- Carousel and notification checks passed automatic rotation, loaded media,
  unread/read persistence and exact booking/enrollment destinations at all sizes.
- Preload checks passed public warmup during consent without private reads,
  private cache reuse, mutation invalidation, fresh slots and logout isolation.
- Production configuration validation intentionally still fails when official
  privacy/terms URLs are absent. A legal illustration is not official approval.

## Actual Shared Data Readiness

A new read-only query succeeded during this work:

| Item | Count |
| --- | ---: |
| Active services | 3 |
| Services assigned to an active qualified technician | 0 |
| Qualified future availability slots | 0 |
| Lessons | 0 |
| Quiz questions | 0 |
| Class schedules | 0 |
| Published care guides | 0 |
| Active FAQs | 0 |

These are operational content gaps, not an invitation to insert demo records.
Configure real content through the existing admin/shared data workflow.

## Deployment And Native Gates

1. Official legal pages still need MLD approval. Set `VITE_PRIVACY_POLICY_URL` and
   `VITE_TERMS_URL` when available; `release-config.example` documents public keys.
   Run `npm run release:check` from the Mini App directory.
2. Verify exact phone/profile/nativeStorage permissions and API/media domains in
   Mini App Center for the submitted version. No console approval is claimed.
3. Physical Zalo iOS/Android acceptance is still required: permission denial,
   revocation, reconnect, native Back/exit, account switching, keyboard/insets,
   profile photo input, background/resume and sharing. Browser simulations do not
   certify native behavior or the oldest declared WebView versions.
4. Set `TRUST_PROXY_HOPS` only to the verified reverse-proxy hop count. Without it,
   rate limiting safely uses the socket address, which can group customers behind
   a proxy. Multiple API replicas require a shared gateway/distributed limit.
5. Configure an external scheduler to run `npm run reminders:run` with the backend
   database environment. The job writes inbox notifications, not native push/SMS;
   neither scheduler deployment nor push delivery is claimed complete.
6. Do not overwrite other work: local develop was behind the fetched remote and
   dirty throughout the audit. Reconcile changes before pushing or deploying.

Payment remains deferred. Build warnings about the existing Sass legacy API are
not hidden as a clean dependency/toolchain result.

## Dependency Security Follow-up

`npm audit --omit=dev` was queried against the registry during implementation.
After the compatible patches, backend reports zero advisories; frontend has zero
high/critical but three aggregate moderate entries in the zmp-ui -> router chain.
These are not three confirmed application exploits. The two underlying router
advisories concern [untrusted navigation paths](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6)
and [SSR hydration](https://github.com/advisories/GHSA-337j-9hxr-rhxg).

This app no longer instantiates ZMPRouter/AnimationRoutes, does not use Link or
useNavigate with user-supplied destinations and has no SSR hydration flow. Existing
view state is managed by its owner-scoped navigation history. This reduces the
reachable attack surface; it does not make the installed transitive version
patched or justify reporting npm audit as clean. The available router patch is a
major upgrade outside zmp-ui's declared dependency contract; do not override it
blindly. Re-evaluate when Zalo publishes a compatible UI update.

The Prisma configuration override follows the maintainer's
[deepmerge-ts 8 security release](https://github.com/RebeccaStevens/deepmerge-ts/releases/tag/v8.0.0).
Generated client and Prisma schema validation must pass after dependency install,
then rerun the full isolated database suite. No production migration is involved.
