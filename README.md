# Spot widget example

A sample partner integration for the Spot widget: a React frontend that renders
the widget and captures the customer's accept/decline choice, plus a small
Express backend that makes the authenticated accept/decline calls and receives
webhooks. Together they exercise the full quote → accept/decline → webhook flow.

- **Just want to see it work?** A deployed copy of this app runs at
  [widget-demo.sandbox.getspot.com](https://widget-demo.sandbox.getspot.com),
  against Spot Sandbox with credentials we provide. No clone, no credentials of
  your own, nothing to set up.
- **Want to learn the integration?** Build it up one concept at a time by
  following the [Widget Quickstart](https://docs.getspot.com/docs/widget-quickstart), which walks through this repo
  commit by commit.
- **Want to run the finished app yourself?** Read on.

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

Waiting on credentials? The [hosted demo](https://widget-demo.sandbox.getspot.com)
runs this same code against Sandbox using ours, so you can try the whole flow
first. Nothing there creates real coverage, and purchaser details are replaced
with placeholders before they reach Spot.

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

## Run it as a single container

The two-process setup above is what the Quickstart teaches, and it is what you
want while developing. For a deployed demo it is simpler to run the whole thing
as one container: the Express backend also serves the built React bundle, so
there is one origin, one port, and no CORS to configure.

```bash
docker build --platform linux/amd64 --provenance=false --sbom=false \
  --build-arg VITE_SPOT_PARTNER_ID=<your-sandbox-partner-id> \
  -t spot-widget-example .

docker run -p 8787:8787 \
  -e SPOT_PARTNER_ID=<your-sandbox-partner-id> \
  -e SPOT_CLIENT_ID=<your-client-id> \
  -e SPOT_CLIENT_SECRET=<your-client-secret> \
  -e SPOT_WEBHOOK_HMAC_SECRET=<your-hmac-secret> \
  spot-widget-example
```

Then open http://localhost:8787.

Those two build flags matter when the image is destined for a container host
rather than your own machine, and neither failure is obvious from the error:

- `--platform linux/amd64` builds for the architecture most hosts run. Building
  on an Apple Silicon Mac otherwise produces an arm64 image that the host
  rejects after a successful push.
- `--provenance=false --sbom=false` keep buildx from wrapping the image in an
  OCI index alongside an attestation manifest. Some hosts, AWS Lambda among
  them, refuse an image in that shape. Drop both flags if you are only running
  the container locally.

Two things to note about the split between build time and run time:

- The **partner id and environment are baked into the bundle at build time**,
  because the widget reads them in the browser. Both are public values. Pointing
  the image at a different partner or environment means rebuilding it.
- The **secrets are runtime environment variables** and never enter the image.
  The `.dockerignore` excludes `.env` files so a local one cannot be copied in
  by accident.

The container sets `PUBLIC_DIR`, which is what tells the backend to serve the
frontend. Leave it unset and the backend behaves exactly as it does in local
development.

To receive real webhooks the container has to be reachable from the internet,
and you register that URL once with `POST /api/v1/enrollments/webhooks`.

## How it works, briefly

The widget requests a quote directly from Spot in the browser using only your
public `partnerId`, and captures the customer's accept/decline choice. At
checkout your app sends that choice to your own backend, which holds the OAuth
secret and calls Spot's `POST /api/v1/quote/{id}/accept` or `/decline`. Spot
then delivers signed webhooks (e.g. claims) to your backend.

For the full step-by-step walkthrough see the [Widget Quickstart](https://docs.getspot.com/docs/widget-quickstart).
Each step there corresponds to one of the `quickstart-step-*` tags in this
repository.
