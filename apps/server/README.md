# Sample backend (BFF)

This is the sample's **BFF**, short for "backend for frontend": a small backend
that exists to serve the example frontends. The browser cannot call Spot's
accept/decline endpoints directly, because those need an OAuth token minted from
a `client_secret` that must never ship to the browser. So the frontend calls
this backend, which holds the secret, obtains and caches the token, and forwards
to the Spot API. It also receives Spot's webhooks and verifies their signature.

## What a real integration would copy (`src/spot/`)

- `spotClient.ts` — exchanges the client credentials for an OAuth token (cached
  for its 24h lifetime), then calls `POST /api/v1/quote/:id/accept` and
  `.../decline` with the bearer token and the `X-Spot-Partner-Id` header.
- `webhookSignature.ts` — verifies the `X-Spot-Signature` HMAC over the raw
  request body.

`src/index.ts` wires the real routes a partner backend exposes:

- `POST /accept` — accept (bind) a quote; creates coverage. Returns the enrollment.
- `POST /decline` — decline a quote (conversion tracking).
- `POST /webhooks` — receive a Spot webhook and verify its signature.

## Sample-only scaffolding (`src/demo/`)

Not part of a real integration; it only makes the mini-app demoable. Mounted via
`registerDemoRoutes()`: `GET /health`, `GET`/`DELETE /webhooks/events` (feeds and
clears the frontend's Webhooks panel), and `POST /dev/simulate-webhook`
(self-signs a webhook so the receiver can be exercised without a public tunnel).

## Running it

1. `cp .env.example .env` and fill in the partner id, client id, client secret,
   and (for real webhook verification) the partner's webhook HMAC secret. The
   secret stays in `.env` and is never sent to the browser.
2. From the repo root: `pnpm --filter server dev` (listens on
   http://localhost:8787), or `pnpm dev:all` to run this and a frontend together.
