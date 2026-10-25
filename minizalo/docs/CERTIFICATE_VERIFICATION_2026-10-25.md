# Certificate Verification - 2026-10-25

## Scope

Implements public QR verification for actual issued training certificates (requirement 72). Mini App and backend inside minizalo only. No database migration, fake issuance, data deletion, Admin/Website edit, payment, Git push or deployment was performed.

## Behavior

- The authenticated owner's certificate detail/list receives a computed verificationPath for an already-issued, due certificate. Draft, revoked, future-dated and empty-code records do not receive new QR links.
- The Mini App QR encodes the actual configured API origin plus a signed verification path. It no longer encodes a bare database code that has no lookup page.
- GET /verify/certificates/:signedReference is the mobile-friendly public HTML result. GET /api/certificate-verification/:signedReference returns the same minimal public fields as JSON.
- Public fields are certificate code, issued student name, program title, issue date and current issued/revoked status. No DOB, contact details, grades, PDF URL, enrollment/student IDs or internal revocation notes are returned. DOB and existing PDF access remain on the owner-only detail screen.
- Links use HMAC-SHA256 with a certificate-specific purpose and the record's actual QR code. A reference cannot be edited to verify another certificate. Raw certificate/QR codes are not accepted as lookup links.
- A previously shared valid link reports the current REVOKED state on the next request/reload. This does not claim to update an already-loaded offline page or an old screenshot.
- Changing the stored QR code invalidates the previous signature. Consistent enrollment/student/course ownership is rechecked. A certificate's validity is independent of later learning expiry, dropped enrollment or a retired course.
- Both public routes share a process-local 20-request/minute/IP limiter. Multi-instance deployments still need shared edge rate limiting. There is no public list/search endpoint.
- Responses use no-store, no-referrer and no-index headers. HTML escapes database text and has a restrictive CSP, no scripts, no external assets and no PDF link.

## Configuration And Release

- Optional backend-only CERTIFICATE_VERIFICATION_KEY provides a stable independent signing key. Use a private, cryptographically random value of at least 32 characters; never put it in VITE variables, Git or the client.
- Without that optional setting, the existing JWT_SECRET signs verification references. Rotating the effective signing key invalidates previously shared QR links. It does not revoke or delete the underlying certificate. Prefer a stable dedicated key before publishing long-lived paper/QR records.
- The Mini App builds the lookup URL from VITE_API_BASE_URL, not an untrusted Host header or a record-supplied external redirect. Production uses HTTPS; loopback HTTP is allowed only for local preview/tests.
- Backend must be deployed first. Deployment preflight now requires certificate-verification-v1. The backend origin must also route /verify/certificates/* to this Express application, not only /api/*.
- Existing PDFs and pre-existing printed raw QR contents are not rewritten. PDF generation, historical DOB snapshots, Admin issuance/templates and reprinting legacy QR documents remain separate tasks.

## Verification

- Final full backend run: 270 passed, 0 failed, 0 skipped. Frontend TypeScript and production build/artifact verification passed; existing Sass legacy-JS-API warnings remain.
- Backend coverage includes signed owner links, anonymous public verification, strict public-field whitelist, escaped HTML/security headers, tampering, wrong-record attempts, future/draft rejection, immediate status reads, QR rotation, historical persistence and rate limiting.
- Frontend unit checks reject external/credential-bearing/insecure API origins and malformed verification paths. Existing session-isolation tests use the real URL helper rather than a fake implementation.
- Chromium and WebKit cover 320x640, 390x844 and 1366x900: actual rendered QR, public page opened against the isolated backend, no public DOB/PDF, no horizontal overflow, course expiry, certificate pagination/retry, revoked-page reload and legacy notification navigation. Screenshots inspected.
- Test certificates exist only in isolated PGlite databases. Real camera QR scanning and Zalo iOS/Android external-link handling still need device acceptance after deployment.

This completes the signed public lookup behavior, not the entire 157-number specification. See [Specification Recheck](SPEC_RECHECK_2026-10-24.md) for remaining work.
