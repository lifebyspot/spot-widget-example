# Spot widget example

A sample partner integration for the Spot widget: a React frontend that renders
the widget and captures the customer's accept/decline choice, plus a small
Express backend that makes the authenticated accept/decline calls and receives
webhooks. Together they exercise the full quote → accept/decline → webhook flow.

- **Want to learn the integration?** Build it up one concept at a time by
  following the [Widget Quickstart](https://docs.getspot.com/docs/widget-quickstart), which walks through this repo
  commit by commit.
- **Just want to run the finished app?** Read on.

## What's here

- `apps/web-react` — React 18 + Vite frontend using `@getspot/spot-widget-react`.
- `apps/server` — Express backend that holds the OAuth credentials, calls Spot's
  accept/decline endpoints, and verifies incoming webhooks.
- `apps/web-vanilla` — the same flow with no framework, using the core
  `@getspot/spot-widget` UMD build.

## Prerequisites

- Node 20 (`nvm use 20`) and pnpm 9.
- **Spot Sandbox credentials** for your partner: a partner id, client id, and
  client secret. These are provisioned by Spot per environment — request them
  from your Spot contact (there is no self-serve signup yet). The partner id is
  public; the client id and secret are secret and stay on your backend.

## Run the finished app

1. Install dependencies:

   ```bash
   nvm use 20
   pnpm install
   ```

2. Configure the **backend** (this file holds the secret and is gitignored):

   ```bash
   cp apps/server/.env.example apps/server/.env
   # then set SPOT_PARTNER_ID, SPOT_CLIENT_ID, SPOT_CLIENT_SECRET
   ```

3. Configure the **frontend** to target Sandbox:

   ```bash
   cp apps/web-react/.env.example apps/web-react/.env.local
   # then set VITE_SPOT_ENV=sandbox and VITE_SPOT_PARTNER_ID=<your-sandbox-partner-id>.
   # Set the booking defaults in apps/web-react/src/defaultQuote.ts to match
   # one of your Sandbox offers.
   ```

4. Start both apps:

   ```bash
   pnpm dev:all     # backend on :8787, frontend on http://localhost:5180
   ```

5. Open http://localhost:5180, pick yes or no, and Proceed to checkout. Accept
   returns an enrollment id; decline returns a declined status.

**Frontend only** (renders the quote, but checkout has no backend to call):

```bash
pnpm dev
```

**No matching Sandbox offer handy?** Render from a fabricated quote instead:

```bash
VITE_SPOT_USE_MOCK=true pnpm dev
```

## How it works, briefly

The widget requests a quote directly from Spot in the browser using only your
public `partnerId`, and captures the customer's accept/decline choice. At
checkout your app sends that choice to your own backend, which holds the OAuth
secret and calls Spot's `POST /api/v1/quote/{id}/accept` or `/decline`. Spot
then delivers signed webhooks (e.g. claims) to your backend.

For the full step-by-step walkthrough see the [Widget Quickstart](https://docs.getspot.com/docs/widget-quickstart).
Each step there corresponds to one of the `quickstart-step-*` tags in this
repository.
