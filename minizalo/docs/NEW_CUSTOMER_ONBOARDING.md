# New Customer Onboarding

## Flow

After explicit Zalo consent and server-side phone verification:

- Existing shared phone: sign in with the existing UUID, without onboarding.
- New shared phone: care introduction -> career introduction -> profile form ->
  interests -> first home tab. The introduction can be skipped.
- Name is required; avatar, email, birth date and gender are optional. The verified
  phone is read-only. Back navigation preserves the draft within the flow.
- The profile remains an in-memory draft until the final Explore action, which
  creates the account and persists its interest in a single transaction. Closing
  the flow earlier does not create an incomplete account or persist its proof.
- The five-minute phone proof is still required. An expired proof shows a retry
  verification action, never a fake session. Submission errors keep the draft.

## Zalo Profile Suggestions

On the explicit Continue with Zalo action, `getUserInfo` requests optional name
and avatar consent before obtaining the single-use phone permission code.
Declining profile permission does not prevent phone login or manual profile entry.
Name and avatar are editable suggestions, NOT verified identity attributes. The
server never trusts a client-supplied Zalo ID, shared UUID, phone, role or rewards.
Existing shared profile fields are not overwritten by Zalo suggestions.

This uses the device SDK, not the Social `/me` server endpoint. Phone verification
still uses the encrypted Vietnam relay. No relay protocol change is required.
Real device permission approval must be checked on the Testing version.

Reference: https://docs.zaloplatforms.com/docs/MA/api/user/user-information/getUserInfo

## Shared Data

No schema changes or seeds. New registration accepts validated `avatarUrl` and
`purpose`, using existing `users.avatar_url` and `users.purpose` columns.
Interests map to the canonical `BEAUTY_SPA`, `ACADEMY`, or `BOTH` enum.
Avatar uploads are cropped locally to 360px JPEG; only bounded HTTPS URLs or
PNG/JPEG/WebP data URLs are accepted. SVG and insecure URLs are rejected.
Concurrent/repeated registrations preserve existing UUID, profile and rewards.

## Illustrative Images

Local assets avoid runtime dependence on an external image host. These are
illustrative stock photos, not claims about a specific MLD venue or class:

- Care: https://images.unsplash.com/photo-1519823551278-64ac92734fb1
- Academy: https://images.unsplash.com/photo-1524178232363-1fb2b075b655

## Verification

- Backend tests cover proof validation, avatar/purpose validation and persistence,
  existing UUID/reward/profile preservation, and encrypted relay behavior.
- Browser checks use test-only API/SDK fixtures, never the shared production DB:
  320x640, 390x844, 1280x900; images, overflow, required fields, avatar upload,
  back navigation, interests, home completion, expired proof and existing account.
- Build/typecheck do not certify native Zalo permission or actual device login.
