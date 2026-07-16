# Spot widget example

A sample partner integration for the Spot widget. It exists to show how a real
integration is put together and to surface the friction points partners hit, so
we can make integration faster and easier.

It includes a React frontend and a plain vanilla JavaScript frontend that render
the widget and capture a selection, plus a small backend that accepts and
declines quotes against the Spot API and receives webhooks. Together they
exercise the full quote, accept, decline, and webhook flow end to end.

For a step-by-step of that flow with links into the code (and a diagram), see
[`WALKTHROUGH.md`](WALKTHROUGH.md).

## What is here now

- `apps/web-react` a React 18 + Vite + TypeScript app consuming the published
  `@getspot/spot-widget-react` package. Renders a quote, captures the selection,
  and posts it to the backend at checkout.
- `apps/server` a minimal Express + TypeScript backend that holds the partner
  credentials, exchanges them for an OAuth token (cached), calls the Spot accept
  and decline endpoints, and receives webhooks (verifying the HMAC signature).
- `apps/web-vanilla` the same flow with no framework and no bundler: plain HTML
  and JavaScript consuming the core `@getspot/spot-widget` UMD build from a CDN
  script tag. Reuses the same backend.

## Code layout: integration vs sample scaffolding

Each app separates the code a real integration needs from the boilerplate that
only exists to make this mini-app demoable, so the integration surface is easy
to identify:

- `apps/server/src/spot/` the real backend integration: the OAuth token exchange
  and accept/decline calls (`spotClient.ts`) and the webhook signature
  verification (`webhookSignature.ts`). `src/index.ts` wires the real routes
  (`/accept`, `/decline`, `/webhooks`).
- `apps/server/src/demo/` sample-only scaffolding: the in-memory webhook buffer,
  the `/health`, `/webhooks/events`, and `/dev/simulate-webhook` routes, and the
  webhook simulator. Mounted via `registerDemoRoutes()` behind a clear banner in
  `index.ts`. None of it is part of a real integration.
- `apps/web-react/src/demo/` sample-only frontend: the Widget-events and Webhooks
  panels and their API client. A real integration renders the widget and posts
  the selection to its backend (`bff.ts`, `components/WidgetPanel.tsx`); it does
  not display webhooks in the browser.

Files that are sample-only carry a `SAMPLE-APP ONLY` comment at the top.

## Prerequisites

- Node 20 (`nvm use 20`).
- pnpm 9.
- A Spot API environment to quote against. Set `VITE_SPOT_USE_MOCK=true`
  to render from mock data instead.

## Quick start

Front end only, against your local API:

1. `nvm use 20`
2. `pnpm install`
3. `pnpm dev`
4. Open http://localhost:5180

If the local API has no matching offer (or is not running), start in mock mode:
`VITE_SPOT_USE_MOCK=true pnpm dev`

Full flow (quote plus accept/decline) against sandbox:

1. `cp apps/server/.env.example apps/server/.env` and fill in the partner id,
   client id, and client secret. The secret stays in this file and is never
   sent to the browser.
2. `cp apps/web-react/.env.example apps/web-react/.env.local` and set
   `VITE_SPOT_ENV=sandbox`, the same `VITE_SPOT_PARTNER_ID`, and the product
   fields that match the partner's offer.
3. Start both at once with `pnpm dev:all` (backend on http://localhost:8787,
   frontend on http://localhost:5180). Or run them in separate terminals:
   `pnpm --filter server dev` and `pnpm --filter web-react dev`.
4. Open http://localhost:5180, pick yes or no, and Proceed to checkout. Accept
   returns an `enrollmentId`; decline returns a declined status.

Checkout calls the backend, so if only the frontend is running (`pnpm dev`), the
quote still renders but Proceed to checkout fails with a network error. Start the
backend too (or use `pnpm dev:all`).

The widget requests the quote directly from Spot in the browser; only the
authenticated accept/decline calls go through the backend.

Vanilla JS variant (same backend, no build step):

1. Start the backend as above (`pnpm --filter server dev`).
2. `pnpm --filter web-vanilla dev` (serves http://localhost:5181).
3. Open http://localhost:5181. Edit the inline `window.SPOT_CONFIG` in
   `apps/web-vanilla/public/index.html` to point at your partner and offer.

The vanilla page loads the widget from a CDN script tag and uses the class as
`SpotWidget.default` (the UMD attaches the class to `.default`, not to the
global itself).

## Webhooks

Spot posts enrollment lifecycle and claim events to a partner endpoint, signed
with an HMAC. The backend exposes `POST /webhooks`, verifies the
`X-Spot-Signature` (hex HMAC-SHA256 over the raw body, keyed by
`partnerId:hmacSecret`), and records events; the frontend Webhooks panel shows
them with a valid/invalid signature badge.

Try it locally without any Spot setup: click "Simulate delivery" in the Webhooks
panel. That posts a correctly signed event to the receiver using
`SPOT_WEBHOOK_HMAC_SECRET`, so you can see the verify-and-display path.

To receive real Spot webhooks (extra steps, by design):

1. Set `SPOT_WEBHOOK_HMAC_SECRET` to the partner's real `hmacSecret`. This is a
   separate secret from the OAuth client secret.
2. Expose the backend over public HTTPS (e.g. an ngrok or cloudflared tunnel to
   port 8787). Spot rejects `http`/localhost receiver URLs outside a locally-run
   API.
3. Register the public URL with Spot, either partner-wide via
   `POST /v1/enrollments/webhooks` (needs an OAuth bearer) or per enrollment via
   `webhookUrlOverride` on the accept call.
4. Note: for an accepted quote, Spot only ever delivers `ClaimReceived`. You will
   not see an enrolled/failed webhook, so you must trigger a claim to observe a
   real delivery.

## Configuration

All configuration is optional and lives in Vite env vars. Copy
`apps/web-react/.env.example` to `apps/web-react/.env.local` to change defaults.

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_SPOT_ENV` | `local` | Target environment (`local`, `sandbox`, `production`). |
| `VITE_SPOT_PARTNER_ID` | local seed id | Sent as the `X-Spot-Partner-Id` header. |
| `VITE_SPOT_CUSTOM_ENDPOINT` | unset | Overrides the environment base URL. |
| `VITE_SPOT_USE_MOCK` | `false` | Render from a fabricated quote instead of calling the API. |

## How the integration works

The widget only does the first half of an integration:

1. It requests a quote from the API using just the partner id header.
2. The customer picks yes or no. The widget reports that through its callbacks
   (`onOptIn`, `onOptOut`) and its `getSelection()` method. It does not contact
   the server to bind coverage.

The second half is the partner's responsibility and needs stronger auth:

3. At checkout the partner app sends the selection to its own backend.
4. The backend calls `POST /api/v1/quote/:id/accept` or `.../decline` with an
   OAuth bearer token to actually create or decline the enrollment.

The frontend handles steps 1 and 2; the backend (`apps/server`) handles steps 3
and 4.
