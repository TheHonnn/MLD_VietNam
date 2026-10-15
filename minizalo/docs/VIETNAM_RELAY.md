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

Current login first tests the PHONE `/me/info` endpoint directly on Render,
without Social `/me` or profile permission. Do not provision a VN relay unless
phone verification also fails there. The optional relay now returns only a
verified phone and app ID; new users complete their own profile form on Render.

## Required Infrastructure

- A Vietnam VPS you administer, or your own always-on computer on a Vietnam
  connection for temporary testing. Disable any overseas outbound VPN/proxy.
- Node.js 20+ and the Mini App backend source.
- A private HTTPS origin for the relay. Terminate TLS at a reverse proxy or a
  tunnel forwarding to localhost. Do not use a random/public forwarding proxy.
- Parent Zalo App ID/Secret and a separate random relay HMAC secret >=32 chars.

The implementation is complete locally, not provisioned or deployed remotely.
You still need to provide your Vietnam host and HTTPS origin. No VPS account,
paid resource, DNS record, firewall change or credential was created for you.

## 1. Prepare the Vietnam Host

In `minizalo/backend` on that host:

```sh
npm ci --include=dev
npm run db:generate
npm run build
```

Create a private `.env` from `relay-env.example` (do not overwrite the Render
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
2. An unsigned POST to `/v1/zalo/verify` MUST return 401 without calling Zalo.
3. On the existing Testing version, tap Zalo login and grant profile/phone consent.
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

Replay state is in memory: deploy ONE relay process/replica. For multiple workers,
add a shared atomic nonce store before scaling. Restarting clears replay state;
the timestamp window limits residual replay and Zalo phone codes remain single
use. Do not expose a health response as proof of end-to-end Zalo authentication.

The tests use local HTTP servers and mocked Zalo responses. They do not certify
your public TLS/DNS/firewall, Vietnamese egress IP or actual device login.
