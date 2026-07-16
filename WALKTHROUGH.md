# MATT BEGINS HERE

# Walkthrough

Follows a single quote from page load to coverage, and points at where each
step lives in the code. The React frontend plus the backend is the main path;
the vanilla frontend does the same thing and is mapped at the end.

The one idea to hold onto: the **quote** happens in the browser and needs only a
public partner id, but **accept/decline** need a secret and therefore go through
your own backend.

## At a glance

1. On initial render, the widget calls Spot directly to retrieve an initial quote based on your app's inputs. As the inputs change, updated quotes can be retrieved on demand directly from the frontend with additional API callse.
   - These quote request calls are safe to make from the frontend since they need only a valid partnerId for authentication.
2. When the customer completes your app's checkout flow, their decision to `accept` or `decline` Spot coverage is passed to your backend.
3. From the backend, we next call the Spot API's endpoints to either accept or decline the coverage. The authentication for these endpoints is stricter than those being called from the frontend, so you will need a valid OAuth token. This can be retrieved and cached from our API in exchange for a valid `clientId` and `clientSecret`.
   
   >  ❓**Why are backend changes necessary?** 
   > 
   > These endpoints require tighter security than the quote request calls we made from the widget on the frontend earlier, so we need extra safeguards. To that end, we require a valid OAuth token for the customer to accept or decline coverage. OAuth tokens are not safe to expose to the browser, so this work must be strictly implemented server-side.

4. Once our backend then calls one of these Spot endpoints to relay the customer's decision.
   - `/api/v1/quote/{id}/accept`
   - `/api/v1/quote/{id}/decline`

   > -----------
   > ⚠️ **Note:** It is crucial that both `accept` and `decline` outcomes be handled in this step: it is a common mistake to only build out the happy `accept` path but not the `decline` path, so please be sure to include both in your implementation!

   > ---
   > ⚠️ **Note:** The `accept` and `decline` endpoints should not be called until the customer fully completes their purchase. A common implementation mistake we've seen is to call Spot's API prematurely if users simply exit the checkout flow before completing it. Please be careful that you only report coverage decisions to Spot when checkout is complete!

5. If the customer accepts coverage and then later decides to file a claim, Spot will send you a POST request webhook with details about the claim.



# CLAUDE BEGINS HERE

## Setup: where configuration lives

- Frontend target and partner id: `apps/web-react/src/config.ts:30` (`apiConfig`)
  and `:44` (`backendUrl`), overridable via `apps/web-react/.env.local`. Only the
  partner id ever reaches the browser.
- Backend credentials: `apps/server/src/config.ts` reads the `SPOT_*` vars from
  `apps/server/.env` (client id/secret and the webhook secret). These stay on the server.
- The default booking to quote: `apps/web-react/src/defaultQuote.ts:19`
  (`buildDefaultQuoteRequest`); the offer-matching `productId` is at `:36`.

## The runtime flow

1. **App sets up state.** `apps/web-react/src/App.tsx:19` keeps the initial quote
   request stable in `initialQuoteRef`, and `:20` creates `widgetRef` (the handle
   for calling the widget's methods).

2. **The widget mounts and fetches a quote.** `App.tsx:130` renders
   `<WidgetPanel>`, passing `quoteRequestData` (`:133`), `apiConfig`, and the
   callbacks. The widget itself is `apps/web-react/src/components/WidgetPanel.tsx:160`
   (`<ReactSpotWidget>`). It calls Spot's quote endpoint from the browser using
   just the partner-id header; when the quote returns, its `onQuoteRetrieved`
   callback fires and is logged by the handler `App.tsx` passes in.

3. **Editing the booking re-quotes.** The form is `App.tsx:120` (`<QuoteForm>`),
   which edits `draft`. Applying runs `handleApply` (`App.tsx:61`), which calls
   `widgetRef.current.updateQuote(draft)` (`:66`), an imperative call through the
   ref, so the widget updates in place instead of remounting.

4. **The customer picks yes or no.** The widget fires `onOptIn` / `onOptOut`,
   logged by the handlers `App.tsx` passes to `WidgetPanel`. This is only a
   selection; nothing is bound yet.

5. **Checkout reads the selection (still client-side).** The "Proceed to
   checkout" button calls `WidgetPanel.tsx:99` (`handleCheckout`):
   `validateSelection()` (`:100`) makes the widget show its own error if nothing
   is picked, then `getSelection()` (`:104`) reads the choice, handed up via
   `onCheckout` (`:105`). `App.tsx:70` (`handleCheckout`) receives it.

6. **Frontend sends the selection to the backend.** `App.tsx:82` calls
   `acceptQuote(...)` or `:83` `declineQuote(...)` from the BFF client
   (`apps/web-react/src/bff.ts:40` and `:49`), both via `post()` (`bff.ts:24`),
   which POSTs to `backendUrl` + `/accept` or `/decline`.

7. **The backend makes the authenticated call to Spot.**
   `apps/server/src/index.ts:36` (`POST /accept`) validates the body, adds
   idempotency keys, and calls `acceptQuote` from
   `apps/server/src/spot/spotClient.ts:77`. That goes through `authedPost`
   (`spotClient.ts:55`), which gets a cached token via `getAccessToken`
   (`spotClient.ts:19`) and POSTs to Spot's `/api/v1/quote/:id/accept` with the
   bearer token plus the partner-id header. Decline mirrors this: `index.ts:63`
   to `spotClient.ts:81`.

8. **The result flows back to the UI.** The backend's `forward()` helper mirrors
   Spot's status and body; `bff.ts` returns a `CheckoutResult`; `App.tsx` stores
   it and the result panel renders (accept shows the enrollment id; a network
   failure shows the "is the backend running?" hint).

9. **Webhooks (after purchase).** Spot later POSTs to `apps/server/src/index.ts:76`
   (`POST /webhooks`), which verifies the signature over the raw body with
   `verifySignature` (`apps/server/src/spot/webhookSignature.ts:10`). The single
   sample-only line, `recordEvent` (`index.ts:84`), stores it for the demo panel.

## Integration vs demo

Steps 1 to 8 plus the `/webhooks` verification are the real integration:
`config.ts`, `WidgetPanel.tsx`, `bff.ts`, and the backend's `spot/` folder with
the `/accept`, `/decline`, and `/webhooks` routes.

The demo-only pieces are the observability panels
(`apps/web-react/src/demo/EventLog.tsx`, `demo/WebhookPanel.tsx`) and the
backend's `demo/` routes (`GET`/`DELETE /webhooks/events`,
`/dev/simulate-webhook`), mounted at `index.ts:111` via `registerDemoRoutes`.

## The vanilla version

Same flow, no framework or build step:

- Widget loaded from a CDN script tag: `apps/web-vanilla/public/index.html:15`;
  config inline at `:23` (`window.SPOT_CONFIG`).
- Widget mounted: `apps/web-vanilla/public/app.js:98`
  (`new SpotWidgetClass(...)`, using the `.default` the UMD build exposes).
- Re-quote at `:129` (`updateQuote`); checkout at `:140` to `:143`
  (`validateSelection` / `getSelection`); POST to `/accept` or `/decline` at
  `:156` / `:161`.
