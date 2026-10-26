# Login deployment mismatch

The configured production API is `https://mld-miniapp-api.onrender.com/api`.
On 2026-10-27 its health response was successful but did not advertise the new
unified-login, personal-resource-booking or portal-content contracts. The phone
screenshot also reported the legacy staff-only login response. A successful
health check alone does not establish compatibility with this frontend.

## Required release order

1. Commit and push the reviewed `minizalo` changes to `develop`.
2. In the existing Render Mini App API service, deploy that commit with root
   directory `minizalo/backend`, build command
   `npm ci --include=dev && npm run db:generate && npm run build`, start command
   `npm start`, and health path `/api/health`. Do not change the separate Admin API.
   The blueprint `minizalo/render.yaml` now explicitly selects `develop`;
   an existing manually configured service must also select the correct branch.
3. From `minizalo/zalo_mini_app/my-app`, run `npm.cmd run backend:check`.
   It must pass against the actual production URL before deploying testing.
4. Run `npm.cmd run deploy:test`, reopen the testing version in Zalo and sign in.

The deployment check is automatically run by `npm run deploy` and
`npm run deploy:test`. It only reads health; it never changes records or grants
roles. It checks the effective Vite production environment, not an assumed URL.

## Device verification still required

The screenshot's empty DOMException and Eruda WebSocket error do not establish
the exception source. Local auth tests cover restricted native storage, denied
permissions, cancellation, repeated taps and account changes. The production
artifact check rejects the Vite development socket/client. These checks do not
prove that all native iPhone bridge/debugger errors have disappeared. After the
matching backend and frontend are deployed, verify login inside Zalo and inspect
any remaining native exception separately; do not suppress all console errors.

This change has not deployed Render or Zalo, changed database data, or modified
Admin/mobile source.
