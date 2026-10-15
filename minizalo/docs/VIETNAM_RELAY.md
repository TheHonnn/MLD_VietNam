# Private Vietnam Zalo Relay

## Architecture

Zalo Mini App -> Render backend -> your private relay in Vietnam -> Zalo APIs.
Render remains responsible for the shared database, users, JWTs and business
logic. The relay has NO database access and cannot choose a customer UUID.
The frontend still uses the Render API URL, so no new Zalo upload is necessary.

This addresses a confirmed provider message that profile access is restricted
because the calling IP is outside Vietnam. A tunnel alone does NOT change a
server's outgoing IP. The process making the Zalo calls must run on a host whose
egress IP Zalo recognizes as Vietnamese. A Vietnamese domain is not enough.

Both profile and PHONE `/me/info` verification on Render have returned -501
with the provider message that the calling IP is outside Vietnam. The relay returns only a
verified phone and app ID; new users complete their own profile form on Render.

## Required Infrastructure

- A Vietnam VPS you administer, or your own always-on computer on a Vietnam
  connection for temporary testing. Disable any overseas outbound VPN/proxy.
- Node.js 20+ and the Mini App backend source.
- A private HTTPS origin for the relay. Terminate TLS at a reverse proxy or a
  tunnel forwarding to localhost. Do not use a random/public forwarding proxy.
- Parent Zalo App ID/Secret and a separate random relay HMAC secret >=32 chars.

No VPS account, paid resource, DNS record or firewall rule is needed for the
temporary local Windows setup below. Successful Zalo login still requires a
real device test; a healthy tunnel does not prove Zalo accepts the outgoing IP.

## Quick Start: Your Windows PC

1. In `minizalo/backend/.env.relay`, fill `ZALO_APP_SECRET` from the parent Zalo
   app. Keep the existing app ID and generated relay secret. Do not send keys in
   chat or commit this file. The relay does not read the backend's `.env`.
2. In PowerShell:

   ```powershell
   cd E:\Mobile\MLD_VIETNAM\minizalo\backend
   npm.cmd run relay:install
   npm.cmd run relay:local
   ```

   The installer downloads the official Windows x64 Cloudflare executable,
   verifies its SHA-256 against the official GitHub release metadata and keeps
   it under ignored `.relay-local/`. It does not install a Windows service.
3. Keep that terminal open. Copy the displayed `ZALO_RELAY_URL` into Render's
   Environment, and copy `ZALO_RELAY_SECRET` privately from `.env.relay` into
   the corresponding Render variable. Keep `ZALO_APP_ID` identical on both.
4. Save Render's environment and wait for Live. Check the public relay
   `/health` returns `{"status":"ok"}`. An unsigned POST to `/v2/zalo/verify`
   must return 401. Then try the existing Testing Mini App again.
5. Press Ctrl+C in the terminal to stop BOTH the tunnel and local relay.
   If running hidden in the background, run `npm.cmd run relay:stop` from
   `minizalo/backend` instead; the manager stops only its own child processes.

Keep the PC awake, connected to the Vietnam network, with overseas VPN off.
No router port forwarding is needed. The URL is also saved in
`backend/.relay-local/url.txt`; it changes on restart, so update Render again.
Only phone verification goes through the PC; Render keeps serving business APIs.
New Zalo logins fail closed while the PC/tunnel is offline.

[Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/)
are temporary testing tunnels without an uptime guarantee, not production hosting.

## 1. Prepare the Vietnam Host

In `minizalo/backend` on that host:

```sh
npm ci --include=dev
npm run db:generate
npm run build
```

Create a private `.env.relay` from `relay-env.example` (do not overwrite the Render
backend env or commit real credentials). Configure:

```dotenv
ZALO_APP_ID=YOUR_PARENT_APP_ID
ZALO_APP_SECRET=YOUR_PARENT_APP_SECRET
ZALO_RELAY_SECRET=YOUR_PRIVATE_RANDOM_RELAY_SECRET
RELAY_PORT=5100
```

Generate a relay key locally with Node crypto and enter it privately on both
hosts, without sending it in chat:

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
npm run start:relay
```

The relay listens ONLY on `127.0.0.1:5100`. Use a process manager/systemd with one
instance, a non-root account and no request-body/header logging. Do not expose
the raw port publicly. Keep the clock synchronized for request expiry checks.
No DATABASE_URL or JWT_SECRET is needed for this process.

## 2. Provide HTTPS

For a VPS, use a domain you control, a valid TLS certificate and a reverse proxy
to `127.0.0.1:5100`. For example, with Caddy installed and DNS pointing at the VPS:

```caddyfile
your-relay.example.vn {
    reverse_proxy 127.0.0.1:5100
}
```

Expose only HTTP/HTTPS required by your TLS/proxy setup and restricted admin
access. Never log request bodies or the `access_token`, `code` or secret headers.
`GET /health` only verifies the relay process, not Zalo account permissions or IP.

For temporary testing, an HTTPS tunnel to this relay on YOUR Vietnam computer
can be used. The computer and tunnel must remain running. Quick-tunnel hostnames
may change; update Render when they do. This is not a production uptime solution.
Do not enable browser/email login gates on the machine-to-machine relay route.

## 3. Configure Render

On `mld-miniapp-api` -> Environment:

```dotenv
ZALO_APP_ID=THE_SAME_PARENT_APP_ID
ZALO_RELAY_URL=https://your-relay.example.vn
ZALO_RELAY_SECRET=THE_SAME_PRIVATE_RANDOM_RELAY_SECRET
```

Use the HTTPS origin only, no path/query/password. Keep DATABASE_URL, JWT_SECRET
and ZALO_ALLOW_SIGNUP on Render as before. After successful relay verification,
Render no longer needs ZALO_APP_SECRET: that key lives only on the Vietnam host.
Do not remove it before enabling and testing the relay path. Never put the relay
secret or Zalo secret into VITE variables or the Mini App bundle.

Push all related Mini App backend files together and deploy Render's selected
branch. Uploading a Zalo frontend version does not update Render's backend.

## 4. Verify

1. Check `https://your-relay.example.vn/health` returns 200.
2. An unsigned POST to `/v2/zalo/verify` MUST return 401 without calling Zalo.
3. On the existing Testing version, tap Zalo login and grant phone consent.
4. The Vietnam relay verifies phone using the fixed official `/me/info` endpoint.
   Render verifies app ID and phone before resolving the shared UUID or issuing
   a short-lived new-customer registration challenge. It does not call `/me`.
5. Confirm existing customer UUID/tier/points/history stay unchanged.
6. Stop the relay temporarily: login fails closed, with no direct overseas
   fallback, no fake login and no duplicate user. Restore it and request a fresh
   phone permission code (codes are single-use).
7. If -501 persists, inspect the relay's redacted `[Zalo verification]` log; ask
   Zalo/hosting support to confirm the actual outgoing IP is recognized as VN.

## Security and Limits

Requests use HMAC-SHA256 over method, fixed route, timestamp, nonce and exact JSON
body. Signatures are compared in constant time. Old/tampered/replayed requests
are rejected before upstream access. Relay body size is limited to 24 KB.
The relay exposes no arbitrary target URL and never returns credentials or JWTs.

Protocol v2 additionally encrypts tokens in requests and phone/app ID in successful
responses using Node's AES-256-GCM. HKDF-SHA256 derives separate request/response
keys from the private random relay secret. Each message has a fresh random 96-bit
IV and a 128-bit authentication tag; authenticated context binds direction, route,
request timestamp and nonce. Responses from another request cannot be substituted.
Plaintext/old-v1 payloads are NOT accepted; deploy the matching Render client and
local relay together. There is no plaintext fallback.

Cloudflare terminates HTTPS, but with v2 the token/phone payload remains encrypted
until the Render or local relay process decrypts it. Cloudflare can still observe
metadata such as timing, URL, IP and ciphertext length. This is not anonymity or
a security audit. Keep both endpoints patched and the relay key private; a
compromised endpoint/key defeats payload encryption. Do not enable body logging.

Replay state is in memory: deploy ONE relay process/replica. For multiple workers,
add a shared atomic nonce store before scaling. Restarting clears replay state;
the timestamp window limits residual replay and Zalo phone codes remain single
use. Do not expose a health response as proof of end-to-end Zalo authentication.

The tests use local HTTP servers and mocked Zalo responses. They do not certify
your public TLS/DNS/firewall, Vietnamese egress IP or actual device login.
