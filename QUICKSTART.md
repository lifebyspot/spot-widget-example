# Getting Started

This Quickstart builds a Spot widget integration from scratch. It starts with a
plain partner checkout app that knows nothing about Spot, then adds the widget
one concept at a time until the full flow (retrieve quote, accept/decline, and 
webhook) works end to end.

## At a glance

At a high level, the Spot widget flow follows three main steps, each of which is
loosely sketched out here for the sake of building familiarity and context for
the more detailed example walkthrough that follows.

### 1. Retrieving Quotes from Spot

To start, calls to the Spot API will retrieve a ***quote*** to present to customers 
as part of your checkout flow. At its most basic level, a quote represents the 
calculated price of coverage the customer can expect to pay and what coverage they
will receive upon accepting the quote. Quote details are displayed in the widget, 
where customers then choose whether to accept or decline coverage.

API calls to retrieve a quote only require your `partnerId` (no secret values) for 
authentication, and so can be handled entirely on the frontend as part of adding the 
widget to your app's UI. 

We'll dive more into these calls and how to handle them in Step 1 of the walkthrough 
below.

### 2. Sending the Customer's Accept or Decline Selection to Spot

Once customers have selected whether they wish to accept or decline Spot coverage
and complete your checkout flow, your app makes a call to one of two Spot API 
endpoints, depending on the customer's final submitted selection:
- `POST /api/v1/quote/{id}/accept`
- `POST /api/v1/quote/{id}/decline`

> 📝 **Terminology**: When the `/accept` endpoint is called, Spot creates what we call an 
> ***enrollment*** for the customer from the quote. Post-checkout actions for accepted 
> quotes will be taken on this enrollment entity.

The accept and decline endpoints both require your app to fetch a valid OAuth token 
from Spot for authorization, and so will need to go through your backend rather than 
be executed directly from the frontend (since OAuth tokens are unsafe to expose to the 
frontend). 

We'll dive more into how to fetch the token and make the API calls in Steps 2 and 
3 of the walkthrough below.

### 3. Listening for Status Updates via Webhook

If the customer accepts coverage and then later decides to file a claim, Spot
will emit a POST request webhook indicating such. 

We'll go through an example of this in Step 4 of the walkthrough below.

## How this guide works

Each step below corresponds to a single commit on the `main`
branch, tagged so you can check out the repo at any point in the guide:

| Tag | Step |
| --- | --- |
| `quickstart-step-0` | The starting checkout app (no Spot) |
| `quickstart-step-1` | Render the widget and retrieve a quote |
| `quickstart-step-2` | Read the customer's selection at checkout |
| `quickstart-step-3` | Accept / decline through your backend |
| `quickstart-step-4` | Receive and verify webhooks |
| `quickstart-step-5` | Optional demo / observability tooling |

To follow along at a given step: `git checkout quickstart-step-<n>`.

## Building the integration step-by-step

With the flow in mind, the rest of the guide adds the widget to the starting app
one concept at a time. Each step is a single commit (tagged as listed above), and 
each builds on top of the previous step.

### Step 0: The Starting App

**Tag:** `quickstart-step-0`

Before adding anything Spot-specific, we start from a small but complete partner
checkout. There is nothing here you don't already have in your own app; it just
gives us a realistic place to add the widget.

The app (`apps/web-react`) is a React 18 + Vite + TypeScript project with:

- **`src/types.ts`**: the partner's own domain types: a `Booking` (what the
  customer is buying) and a `Purchaser` (who is buying), plus
  `buildDefaultBooking()` for a sensible starting booking.
- **`src/components/QuoteForm.tsx`**: an editable view of the booking details.
- **`src/components/PurchaserForm.tsx`**: the buyer's name and email.
- **`src/App.tsx`**: lays out the two forms and a "Proceed to checkout" button
  that, for now, simply marks the order as placed.

There is also a minimal backend (`apps/server`): an Express server with CORS and
JSON body parsing and no routes yet. We'll add its endpoints starting in Step 3.

Run it:

```bash
nvm use 20
pnpm install
pnpm dev          # frontend on http://localhost:5180
```

You should see the booking and purchaser forms and be able to "place an order."
That's the canvas starting app, with no Spot functionality implemented. Our first
addition to this app will be to display the Spot widget and retrieve a quote.

### Step 1: Render the Widget and Retrieve a Quote

**Tag:** `quickstart-step-1`

Now we add the Spot widget. This covers the first part of the flow: a quote is
requested directly from Spot in the browser, using only the public `partnerId`.
No secrets and no backend are involved yet.

**Install the packages** (`apps/web-react/package.json`):

```bash
pnpm --filter web-react add @getspot/spot-widget @getspot/spot-widget-react
```

**Point the widget at Sandbox**: `src/config.ts` builds an `apiConfig` from
`VITE_SPOT_*` env vars, defaulting to the Sandbox environment. Create
`apps/web-react/.env.local` and set your partner id:

```bash
VITE_SPOT_ENV=sandbox
VITE_SPOT_PARTNER_ID=<your-sandbox-partner-id>
```

<details>
<summary><code>apps/web-react/src/config.ts</code> (new)</summary>

```ts
import type { ApiConfig } from "@getspot/spot-widget";

// Point the widget at an environment and partner. Set these in .env.local; the
// widget resolves `environment` to the right Spot API base URL on its own.
export const apiConfig: ApiConfig = {
  environment: (import.meta.env.VITE_SPOT_ENV ?? "sandbox") as ApiConfig["environment"],
  partnerId: import.meta.env.VITE_SPOT_PARTNER_ID ?? "",
};
```

</details>

Retrieving a quote needs only your `partnerId`, a public value that's safe to
use in the browser. (The OAuth client id and secret aren't needed until Step 3.)

> 📝 **Getting Sandbox credentials.** Spot provisions your partner id (and, in
> Step 3, your client id and secret) per environment; there is no self-serve
> signup, so request Sandbox credentials from your Spot contact.
>
> *Follow-up: confirm the exact process partners use to obtain Sandbox credentials.*

**Describe the booking to quote**: `src/defaultQuote.ts` exports
`buildDefaultQuoteRequest()`, which returns a `QuoteItem`. This is the same data
your booking form already edits; the local `Booking` type from Step 0 is
replaced by the widget's `QuoteItem` type, and `QuoteForm` now edits that
directly.

<details>
<summary><code>apps/web-react/src/defaultQuote.ts</code> (new)</summary>

```ts
import type { QuoteItem } from "@getspot/spot-widget";

function isoDaysFromNow(days: number): string {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return new Date(Date.now() + days * millisecondsPerDay).toISOString();
}

/**
 * A sensible starting quote request, chosen so the widget renders a real quote
 * out of the box.
 *
 * Which offer Spot returns is driven mainly by productId, together with
 * productType and productDuration. Ask your Spot contact which productId
 * values are configured for your partner account.
 */
export function buildDefaultQuoteRequest(): QuoteItem {
  const env = import.meta.env;
  // Coverage window kept short by default so it stays under offers that cap
  // coverage duration. Both offsets are overridable per environment.
  const startOffsetDays = env.VITE_SPOT_START_OFFSET_DAYS
    ? Number(env.VITE_SPOT_START_OFFSET_DAYS)
    : 7;
  const coverageDays = env.VITE_SPOT_COVERAGE_DAYS
    ? Number(env.VITE_SPOT_COVERAGE_DAYS)
    : 2;
  return {
    productPrice: env.VITE_SPOT_PRODUCT_PRICE
      ? Number(env.VITE_SPOT_PRODUCT_PRICE)
      : 500,
    productType: (env.VITE_SPOT_PRODUCT_TYPE as QuoteItem["productType"]) ?? "Pass",
    productDuration:
      (env.VITE_SPOT_PRODUCT_DURATION as QuoteItem["productDuration"]) ?? "Seasonal",
    productId: env.VITE_SPOT_PRODUCT_ID ?? "example-pass-001",
    productName: "Season Pass",
    cartId: "example-cart",
    cartName: "Sample Cart",
    eventType: env.VITE_SPOT_EVENT_TYPE ?? "Travel Experience",
    currencyCode: "USD",
    startDate: isoDaysFromNow(startOffsetDays),
    endDate: isoDaysFromNow(startOffsetDays + coverageDays),
    hostCountry: "US",
    hostCountryState: "TX",
    destinations: ["US"],
    isPartialPayment: false,
  };
}
```

</details>

**Render it**: `src/components/WidgetPanel.tsx` wraps `<ReactSpotWidget>`,
passing `apiConfig`, `quoteRequestData`, and the widget's callbacks:

<details>
<summary><code>apps/web-react/src/components/WidgetPanel.tsx</code> (new)</summary>

```tsx
import type { RefObject } from "react";
import ReactSpotWidget, {
  type ReactSpotWidgetRef,
} from "@getspot/spot-widget-react";
import type { ApiConfig, Quote, QuoteItem, SelectionData } from "@getspot/spot-widget";

interface WidgetPanelProps {
  widgetRef: RefObject<ReactSpotWidgetRef>;
  apiConfig: ApiConfig;
  quoteRequestData: QuoteItem;
  onQuoteRetrieved: (quote: Quote) => void;
  onOptIn: (data: SelectionData) => void;
  onOptOut: (data: SelectionData) => void;
  onError: (error: { message: string; status?: number }) => void;
  onNoMatchingQuote: (data: { status: string; data: unknown }) => void;
}

/**
 * Hosts the Spot widget. Its only job here is to request and render a quote;
 * capturing the customer's selection at checkout comes in the next step.
 */
export function WidgetPanel({
  widgetRef,
  apiConfig,
  quoteRequestData,
  onQuoteRetrieved,
  onOptIn,
  onOptOut,
  onError,
  onNoMatchingQuote,
}: WidgetPanelProps) {
  return (
    <section className="panel">
      <div className="panel__header">
        <h2>Widget</h2>
      </div>
      <div className="widget-host">
        <ReactSpotWidget
          ref={widgetRef}
          apiConfig={apiConfig}
          quoteRequestData={quoteRequestData}
          showTable={false}
          onQuoteRetrieved={onQuoteRetrieved}
          onOptIn={onOptIn}
          onOptOut={onOptOut}
          onError={onError}
          onNoMatchingQuote={onNoMatchingQuote}
        />
      </div>
    </section>
  );
}
```

</details>

- `onQuoteRetrieved`: a quote came back and rendered.
- `onOptIn` / `onOptOut`: the customer picked yes / no. This is just a
  selection held in the widget; nothing is bound yet.
- `onError` / `onNoMatchingQuote`: fire on a failed quote request, or when no
  offer matches the booking (`NO_MATCHING_QUOTE`).

**Wire it up**: `src/App.tsx` holds the initial quote request stable in a ref
(so editing the form never remounts the widget and loses the selection) and
keeps a `widgetRef` for imperative calls. Applying booking changes calls
`widgetRef.current.updateQuote(draft)` to re-quote in place.

<details>
<summary><code>apps/web-react/src/App.tsx</code> (changed)</summary>

```diff
@@ -1,21 +1,32 @@
-import { useState } from "react";
-import { buildDefaultBooking, type Booking, type Purchaser } from "./types";
+import { useRef, useState } from "react";
+import type { ReactSpotWidgetRef } from "@getspot/spot-widget-react";
+import type { QuoteItem } from "@getspot/spot-widget";
+import { apiConfig } from "./config";
+import { buildDefaultQuoteRequest } from "./defaultQuote";
 import { QuoteForm } from "./components/QuoteForm";
+import { WidgetPanel } from "./components/WidgetPanel";
 import { PurchaserForm } from "./components/PurchaserForm";
+import type { Purchaser } from "./types";
 
 export function App() {
-  const [booking, setBooking] = useState<Booking>(buildDefaultBooking);
+  // Hold the initial quote request stable so editing the form never remounts
+  // the widget (which would lose the selection); re-quote via updateQuote().
+  const initialQuoteRef = useRef<QuoteItem>(buildDefaultQuoteRequest());
+  const widgetRef = useRef<ReactSpotWidgetRef>(null);
+
+  const [draft, setDraft] = useState<QuoteItem>(initialQuoteRef.current);
+  const [applied, setApplied] = useState<QuoteItem>(initialQuoteRef.current);
   const [purchaser, setPurchaser] = useState<Purchaser>({
     firstName: "Test",
     lastName: "Purchaser",
     email: "test.purchaser@example.com",
   });
-  const [placed, setPlaced] = useState(false);
 
-  function handleCheckout() {
-    // The starting app just completes the purchase locally. The Spot widget and
-    // the accept/decline call are added step by step in the Quickstart guide.
-    setPlaced(true);
+  const dirty = JSON.stringify(draft) !== JSON.stringify(applied);
+
+  async function handleApply() {
+    setApplied(draft);
+    await widgetRef.current?.updateQuote(draft);
   }
 
   return (
@@ -24,38 +35,32 @@ export function App() {
         <div>
           <h1>Spot widget example</h1>
           <p className="muted">
-            A sample partner checkout. This is the starting point, before the
-            Spot widget is added.
+            A sample partner integration consuming{" "}
+            <code>@getspot/spot-widget-react</code>.
           </p>
         </div>
+        <div className="badges">
+          <span className="badge">env: {apiConfig.environment}</span>
+        </div>
       </header>
 
       <main className="app__grid">
         <div className="app__column">
-          <QuoteForm value={booking} onChange={setBooking} />
+          <QuoteForm value={draft} onChange={setDraft} onApply={handleApply} dirty={dirty} />
           <PurchaserForm value={purchaser} onChange={setPurchaser} />
         </div>
 
         <div className="app__column">
-          <section className="panel">
-            <div className="panel__header">
-              <h2>Checkout</h2>
-            </div>
-            <p className="muted">
-              Review the booking and place the order. The Spot widget will slot
-              in here in the next step of the guide.
-            </p>
-            <button className="button button--primary" onClick={handleCheckout}>
-              Proceed to checkout
-            </button>
-            {placed && (
-              <p className="notice notice--ok">
-                Order placed for {purchaser.firstName} {purchaser.lastName}:{" "}
-                {booking.productName} ({booking.currencyCode}{" "}
-                {booking.productPrice}).
-              </p>
-            )}
-          </section>
+          <WidgetPanel
+            widgetRef={widgetRef}
+            apiConfig={apiConfig}
+            quoteRequestData={initialQuoteRef.current}
+            onQuoteRetrieved={() => {}}
+            onOptIn={() => {}}
+            onOptOut={() => {}}
+            onError={() => {}}
+            onNoMatchingQuote={() => {}}
+          />
         </div>
       </main>
     </div>
```

</details>

**Re-quote when the booking changes**: `QuoteForm` owns the trigger. `App.tsx`
tracks whether the edited `draft` differs from the last `applied` booking
(`dirty`) and passes that, plus `handleApply`, to the form. The form renders an
Apply button that calls `handleApply`, so a fresh quote is fetched only when the
customer commits their edits, not on every keystroke.

<details>
<summary><code>apps/web-react/src/components/QuoteForm.tsx</code> (changed)</summary>

```diff
@@ -1,20 +1,22 @@
-import type { Booking } from "../types";
+import type { QuoteItem } from "@getspot/spot-widget";
 
 interface QuoteFormProps {
-  value: Booking;
-  onChange: (next: Booking) => void;
+  value: QuoteItem;
+  onChange: (next: QuoteItem) => void;
+  onApply: () => void;
+  dirty: boolean;
 }
 
-const PRODUCT_TYPES: Booking["productType"][] = ["Trip", "Pass", "Registration"];
-const PRODUCT_DURATIONS: Booking["productDuration"][] = [
+const PRODUCT_TYPES: QuoteItem["productType"][] = ["Trip", "Pass", "Registration"];
+const PRODUCT_DURATIONS: QuoteItem["productDuration"][] = [
   "Trip",
   "Daily",
   "Seasonal",
   "Event",
 ];
-const CURRENCIES: Booking["currencyCode"][] = ["USD", "CAD", "GBP", "EUR", "AUD"];
+const CURRENCIES: QuoteItem["currencyCode"][] = ["USD", "CAD", "GBP", "EUR", "AUD"];
 
-// A date input speaks "YYYY-MM-DD"; the booking stores ISO datetime strings.
+// The widget wants ISO datetime strings; a date input speaks "YYYY-MM-DD".
 function toDateInput(iso: string): string {
   return iso.slice(0, 10);
 }
@@ -23,12 +25,12 @@ function fromDateInput(value: string): string {
 }
 
 /**
- * Editable view of the booking a partner most commonly varies. In this baseline
- * app the edits just update local state; once the Spot widget is added, applying
- * changes will re-quote through the widget's updateQuote().
+ * Editable view of the fields a partner most commonly varies per booking.
+ * Applying changes calls the widget's updateQuote(), which triggers a fresh
+ * quote request against the API.
  */
-export function QuoteForm({ value, onChange }: QuoteFormProps) {
-  function update<Key extends keyof Booking>(key: Key, next: Booking[Key]) {
+export function QuoteForm({ value, onChange, onApply, dirty }: QuoteFormProps) {
+  function update<Key extends keyof QuoteItem>(key: Key, next: QuoteItem[Key]) {
     onChange({ ...value, [key]: next });
   }
 
@@ -78,7 +80,7 @@ export function QuoteForm({ value, onChange }: QuoteFormProps) {
             id="productType"
             value={value.productType}
             onChange={(event) =>
-              update("productType", event.target.value as Booking["productType"])
+              update("productType", event.target.value as QuoteItem["productType"])
             }
           >
             {PRODUCT_TYPES.map((type) => (
@@ -97,7 +99,7 @@ export function QuoteForm({ value, onChange }: QuoteFormProps) {
             onChange={(event) =>
               update(
                 "productDuration",
-                event.target.value as Booking["productDuration"],
+                event.target.value as QuoteItem["productDuration"],
               )
             }
           >
@@ -153,7 +155,10 @@ export function QuoteForm({ value, onChange }: QuoteFormProps) {
             id="currencyCode"
             value={value.currencyCode}
             onChange={(event) =>
-              update("currencyCode", event.target.value as Booking["currencyCode"])
+              update(
+                "currencyCode",
+                event.target.value as QuoteItem["currencyCode"],
+              )
             }
           >
             {CURRENCIES.map((currency) => (
@@ -182,6 +187,14 @@ export function QuoteForm({ value, onChange }: QuoteFormProps) {
           />
         </div>
       </div>
+
+      <button
+        className="button button--primary"
+        onClick={onApply}
+        disabled={!dirty}
+      >
+        {dirty ? "Apply changes and re-quote" : "Quote is up to date"}
+      </button>
     </section>
   );
 }
```

</details>

Run `pnpm dev`. The widget requests a quote from Sandbox and renders the offer.
For a quote to come back, the booking has to match one of your partner's Sandbox
offers, so set `VITE_SPOT_PRODUCT_ID` (and, as needed, `VITE_SPOT_PRODUCT_TYPE`,
`VITE_SPOT_PRODUCT_DURATION`, and `VITE_SPOT_EVENT_TYPE`) in `.env.local` to
match one. The built-in `example-pass-001` default is a placeholder, so on Sandbox
it returns `NO_MATCHING_QUOTE` until you set a real productId. Picking yes or no does nothing yet; we
read that selection at checkout in the next step.

*Full change for this step: `git diff quickstart-step-0 quickstart-step-1`.*

### Step 2: Read the Customer's Selection at Checkout

**Tag:** `quickstart-step-2`

The widget captures a yes/no selection, but it never contacts your server to
create an enrollment; that is deliberately your app's job. This step wires your 
own "Proceed to checkout" button to read the selection. It's still entirely
client-side; no backend yet.

In `src/components/WidgetPanel.tsx`, the checkout handler does two things
through the widget ref:

```ts
function handleCheckout() {
  // Widget shows its own inline error if nothing is picked.
  if (!widgetRef.current?.validateSelection()) return;
  // getSelection() returns { status, quoteId, ... }.
  onCheckout(widgetRef.current?.getSelection() ?? null);
}
```

`src/App.tsx` receives that selection in its own `handleCheckout` and, for now,
just displays it. The key field is `selection.status` (`QUOTE_ACCEPTED` vs `QUOTE_DECLINED`) 
together with `selection.quoteId`; those are exactly what the backend needs 
in the next step.

<details>
<summary><code>apps/web-react/src/App.tsx</code> (changed)</summary>

```diff
@@ -1,6 +1,6 @@
 import { useRef, useState } from "react";
 import type { ReactSpotWidgetRef } from "@getspot/spot-widget-react";
-import type { QuoteItem } from "@getspot/spot-widget";
+import type { QuoteItem, SelectionData } from "@getspot/spot-widget";
 import { apiConfig } from "./config";
 import { buildDefaultQuoteRequest } from "./defaultQuote";
 import { QuoteForm } from "./components/QuoteForm";
@@ -9,8 +9,6 @@ import { PurchaserForm } from "./components/PurchaserForm";
 import type { Purchaser } from "./types";
 
 export function App() {
-  // Hold the initial quote request stable so editing the form never remounts
-  // the widget (which would lose the selection); re-quote via updateQuote().
   const initialQuoteRef = useRef<QuoteItem>(buildDefaultQuoteRequest());
   const widgetRef = useRef<ReactSpotWidgetRef>(null);
 
@@ -21,6 +19,7 @@ export function App() {
     lastName: "Purchaser",
     email: "test.purchaser@example.com",
   });
+  const [checkoutIntent, setCheckoutIntent] = useState<SelectionData | null>(null);
 
   const dirty = JSON.stringify(draft) !== JSON.stringify(applied);
 
@@ -29,6 +28,12 @@ export function App() {
     await widgetRef.current?.updateQuote(draft);
   }
 
+  // Read the selection at checkout. Still client-side; we send it to the
+  // backend in the next step.
+  function handleCheckout(selection: SelectionData | null) {
+    setCheckoutIntent(selection);
+  }
+
   return (
     <div className="app">
       <header className="app__header">
@@ -60,7 +65,21 @@ export function App() {
             onOptOut={() => {}}
             onError={() => {}}
             onNoMatchingQuote={() => {}}
+            onCheckout={handleCheckout}
           />
+
+          {checkoutIntent && (
+            <section className="panel panel--seam">
+              <div className="panel__header">
+                <h2>Selection captured</h2>
+              </div>
+              <p className="muted">
+                status <code>{checkoutIntent.status}</code>, quote{" "}
+                <code>{checkoutIntent.quoteId ?? "(none)"}</code>. Next we send
+                this to the backend.
+              </p>
+            </section>
+          )}
         </div>
       </main>
     </div>
```

</details>

Run `pnpm dev`, pick an option, and click Proceed to checkout: the captured
selection appears. Next we send it to a backend.

### Storing and validating the `quoteId` in a real checkout flow

This example keeps things simple: the widget stays mounted, so at checkout it
reads the `quoteId` straight from `getSelection()`. Real checkouts often submit
the order on a different screen, step, or request, where the widget may no
longer be mounted. There, capture the `quoteId` when the quote is retrieved and
carry it through to the point where you call your backend.

The id arrives in `onQuoteRetrieved` as `quote.id`:

```tsx
// pattern (not in the sample): capture the id as soon as the quote is retrieved
onQuoteRetrieved={(quote) => {
  saveQuoteId(quote.id); // persist wherever checkout can read it later
}}
```

> ⚠️ **Quotes expire; check before you submit.** Every quote carries an
> expiration timestamp (`expiresAt` on the quote response). Before completing
> checkout and calling the accept/decline endpoints, confirm the stored quote
> has not expired. **Spot will not accept an expired quote.** If it has
> expired, re-quote the customer (via `updateQuote()` or a fresh quote request)
> and submit the new, non-expired `quoteId` instead. This matters most in
> multi-step and form-based flows, where meaningful time can pass between
> quoting and submitting.

A related caveat: **re-quoting replaces the id.** Every `updateQuote()` (a
booking edit, or a fresh quote after expiry) produces a new quote with a new
`quote.id`. Always overwrite the stored id with the latest, and never submit a
`quoteId` from a booking the customer has since changed.

**Batch quotes.** Quoting a cart of several items at once (a `BatchQuoteRequest`)
changes the shape, not the principle. The response comes back as `quotes[]`
(status `QUOTES_AVAILABLE`), and the selection carries `batchQuoteDetails`: one
`{ quoteId, cartItemId, productPrice }` per item. Store and expiry-check each id
(keyed by `cartItemId`) the same way, and at checkout accept/decline each
`quoteId` separately, producing one enrollment per accepted item, rather than a
single call.

**Single-page apps.** The widget and your checkout share one long-lived page.
Hold the latest `quote.id` (and the choice from `onOptIn` / `onOptOut`) in app
state (React state, context, or a store like Redux/Zustand). At submit, either
read `getSelection()` as the sample does, or use the value you stashed; the
stash helps when the submit handler is far from the widget component.

**Multi-step / wizard flows.** The widget lives on an early step and the order
is submitted several steps later, after navigation that may unmount it. Persist
the `quoteId` and selection somewhere that survives those transitions: a store
that outlives the route, URL/query state, `sessionStorage`, or your own
server-side cart/session for the checkout. Refresh the stored id whenever the
customer goes back and edits the booking (each edit re-quotes).

**Traditional form-based checkout.** A server-rendered form POST has no
persistent JS state across the submit. Write the `quoteId` and selection into
hidden inputs, kept in sync from the widget callbacks, so they post with the
rest of the form to your backend:

```html
<!-- pattern (not in the sample) -->
<input type="hidden" name="spotQuoteId" value="" />
<input type="hidden" name="spotSelection" value="" />
```

```js
onQuoteRetrieved = (quote) => { form.spotQuoteId.value = quote.id; };
onOptIn  = () => { form.spotSelection.value = "accept";  };
onOptOut = () => { form.spotSelection.value = "decline"; };
```

However you carry it, the destination is the same as Step 3: your backend
receives the `quoteId` and the accept/decline choice, then makes the
authenticated call to Spot.

*Full change for this step: `git diff quickstart-step-1 quickstart-step-2`.*

### Step 3: Accept / Decline Through Your Backend

**Tag:** `quickstart-step-3`

> ❓ **Why are backend changes necessary for these API calls?**
>
> These endpoints require tighter security than the quote request calls we made
> from the widget on the frontend earlier, so we need extra safeguards. To that
> end, we require a valid OAuth token for the customer to accept or decline
> coverage. OAuth tokens are not safe to expose to the browser, so this work
> must be strictly implemented server-side.

This step accepts (enrolls) or declines the coverage. The backend holds the 
OAuth client secret, exchanges it for a token, and calls one of these Spot API 
endpoints:

- `POST /api/v1/quote/{id}/accept`
- `POST /api/v1/quote/{id}/decline`

> ⚠️ **Note:** Implementations must handle *both* the `accept` and `decline` 
> cases. Even though the `decline` path seems like a no-op at first blush,
> Spot needs to accurately track when quotes are declined.

**Backend** (`apps/server`)

`src/spot/spotClient.ts` fetches a client-credentials token (cached in memory,
refreshed before expiry) and exposes `acceptQuote()` / `declineQuote()`. The
client secret never leaves the server:

<details>
<summary><code>apps/server/src/spot/spotClient.ts</code> (new)</summary>

```ts
import { config } from "../config.js";

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

// Refresh a bit before the real expiry so an in-flight request never uses a
// token that expires mid-call. The token lives 24h, so this margin is generous.
const EXPIRY_MARGIN_MS = 60_000;

/**
 * Client-credentials token, cached in memory. This is the whole reason a
 * partner needs a backend: the client secret is required to obtain this token
 * and must never reach the browser.
 */
async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - EXPIRY_MARGIN_MS > now) {
    return cachedToken.accessToken;
  }

  const response = await fetch(`${config.spotApiBase}/api/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Token request failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };
  return cachedToken.accessToken;
}

export interface SpotCallResult {
  status: number;
  body: unknown;
}

async function authedPost(path: string, payload: unknown): Promise<SpotCallResult> {
  const token = await getAccessToken();
  const response = await fetch(`${config.spotApiBase}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Spot-Partner-Id": config.partnerId,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // leave body as raw text if it is not JSON
  }
  return { status: response.status, body };
}

export function acceptQuote(quoteId: string, payload: unknown): Promise<SpotCallResult> {
  return authedPost(`/api/v1/quote/${encodeURIComponent(quoteId)}/accept`, payload);
}

export function declineQuote(quoteId: string, payload: unknown): Promise<SpotCallResult> {
  return authedPost(`/api/v1/quote/${encodeURIComponent(quoteId)}/decline`, payload);
}
```

</details>

`src/config.ts` reads the required credentials from `apps/server/.env` (see
`.env.example`); the secret stays here and never reaches the browser:

<details>
<summary><code>apps/server/src/config.ts</code> (changed)</summary>

```diff
@@ -1,6 +1,20 @@
 import "dotenv/config";
 
+function required(name: string): string {
+  const value = process.env[name];
+  if (!value) {
+    throw new Error(
+      `Missing required env var ${name}. Copy apps/server/.env.example to apps/server/.env and fill it in.`,
+    );
+  }
+  return value;
+}
+
 export const config = {
+  spotApiBase: process.env.SPOT_API_BASE ?? "https://api.sandbox.getspot.com",
+  partnerId: required("SPOT_PARTNER_ID"),
+  clientId: required("SPOT_CLIENT_ID"),
+  clientSecret: required("SPOT_CLIENT_SECRET"),
   port: Number(process.env.PORT ?? 8787),
   // Both sample frontends may call the backend: React (5180) and vanilla (5181).
   frontendOrigins: (
```

</details>

`src/index.ts` adds `POST /accept` and `POST /decline`. `/accept` validates the
body and generates server-side idempotency keys so a retried request can't
double-charge; a `forward()` helper mirrors Spot's status and body back:

<details>
<summary><code>apps/server/src/index.ts</code> (changed)</summary>

```diff
@@ -1,14 +1,74 @@
+import { randomUUID } from "node:crypto";
 import cors from "cors";
 import express from "express";
 import { config } from "./config.js";
+import { acceptQuote, declineQuote, type SpotCallResult } from "./spot/spotClient.js";
 
 const app = express();
 app.use(cors({ origin: config.frontendOrigins }));
 app.use(express.json());
 
-// The Spot integration routes (/accept, /decline, /webhooks) are added step by
-// step in the Quickstart guide. The baseline backend is just an empty shell.
+// ===========================================================================
+// The actual Spot integration. This is the code a partner writes: exchange
+// credentials for a token and accept/decline quotes (spot/spotClient).
+// ===========================================================================
+
+/**
+ * Accept a quote. This is what actually creates coverage, and it is why a
+ * backend exists: it attaches the OAuth bearer token the browser cannot hold.
+ */
+app.post("/accept", async (req, res) => {
+  const { quoteId, productPrice, purchaser, transactionId, transactionItemId } =
+    req.body ?? {};
+
+  if (!quoteId || typeof productPrice !== "number" || !purchaser) {
+    res.status(400).json({
+      error: "quoteId, productPrice (number), and purchaser are required",
+    });
+    return;
+  }
+
+  // Idempotency keys. Generating them server-side means a retried request with
+  // the same keys is rejected as a duplicate rather than double-charging.
+  const payload = {
+    productPrice,
+    purchaser,
+    transactionId: transactionId ?? randomUUID(),
+    transactionItemId: transactionItemId ?? randomUUID(),
+  };
+
+  await forward(res, () => acceptQuote(quoteId, payload));
+});
+
+/**
+ * Decline a quote. Always report declines as well as accepts so Spot keeps a
+ * complete, accurate record of every coverage decision.
+ */
+app.post("/decline", async (req, res) => {
+  const { quoteId, transactionId } = req.body ?? {};
+  if (!quoteId) {
+    res.status(400).json({ error: "quoteId is required" });
+    return;
+  }
+  await forward(res, () => declineQuote(quoteId, { transactionId: transactionId ?? randomUUID() }));
+});
+
+/** Run a Spot call and mirror its status and body back to the caller. */
+async function forward(
+  res: express.Response,
+  call: () => Promise<SpotCallResult>,
+): Promise<void> {
+  try {
+    const result = await call();
+    res.status(result.status).json(result.body);
+  } catch (error) {
+    // Network or token-exchange failure, not a Spot API rejection.
+    res.status(502).json({ error: (error as Error).message });
+  }
+}
 
 app.listen(config.port, () => {
-  console.log(`Spot example backend listening on http://localhost:${config.port}`);
+  console.log(
+    `Spot example backend listening on http://localhost:${config.port} -> ${config.spotApiBase}`,
+  );
 });
```

</details>

**Frontend** (`apps/web-react`)

`src/bff.ts` is the browser's client for *your* backend (BFF = backend for
frontend). The `Purchaser` type moves here (it's sent with the accept call), so
`src/types.ts` goes away:

<details>
<summary><code>apps/web-react/src/bff.ts</code> (new)</summary>

```ts
// BFF = "backend for frontend": a small backend that exists to serve this
// frontend. The browser cannot call Spot's accept/decline endpoints directly
// (they need an OAuth secret that must not ship to the browser), so it calls
// our own backend, which holds the secret and forwards to Spot. This module is
// the browser's client for that backend.

import { backendUrl } from "./config";

/** Buyer details collected at checkout and sent to the backend for the accept call. */
export interface Purchaser {
  firstName: string;
  lastName: string;
  email: string;
}

/** Normalized result of a backend call: whether it succeeded, the HTTP status
 *  (0 means the request never reached the backend), and the parsed body. */
export interface CheckoutResult {
  ok: boolean;
  status: number;
  body: unknown;
}

async function post(path: string, payload: unknown): Promise<CheckoutResult> {
  const response = await fetch(`${backendUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // no-op: leave body null if the response was not JSON
  }
  return { ok: response.ok, status: response.status, body };
}

/** Ask the backend to accept (bind) the quote. Creates coverage. */
export function acceptQuote(
  quoteId: string,
  productPrice: number,
  purchaser: Purchaser,
): Promise<CheckoutResult> {
  return post("/accept", { quoteId, productPrice, purchaser });
}

/** Ask the backend to decline the quote (conversion tracking). */
export function declineQuote(quoteId: string): Promise<CheckoutResult> {
  return post("/decline", { quoteId });
}
```

</details>

`src/config.ts` adds `backendUrl` (`import.meta.env.VITE_BFF_URL ?? "http://localhost:8787"`).

`src/App.tsx` now has `handleCheckout` call the BFF and render the response
(enrollment id on accept; a "is the backend running?" hint if the request never
lands):

<details>
<summary><code>apps/web-react/src/App.tsx</code> (changed)</summary>

```diff
@@ -6,7 +6,7 @@ import { buildDefaultQuoteRequest } from "./defaultQuote";
 import { QuoteForm } from "./components/QuoteForm";
 import { WidgetPanel } from "./components/WidgetPanel";
 import { PurchaserForm } from "./components/PurchaserForm";
-import type { Purchaser } from "./types";
+import { acceptQuote, declineQuote, type CheckoutResult, type Purchaser } from "./bff";
 
 export function App() {
   const initialQuoteRef = useRef<QuoteItem>(buildDefaultQuoteRequest());
@@ -19,7 +19,7 @@ export function App() {
     lastName: "Purchaser",
     email: "test.purchaser@example.com",
   });
-  const [checkoutIntent, setCheckoutIntent] = useState<SelectionData | null>(null);
+  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null);
 
   const dirty = JSON.stringify(draft) !== JSON.stringify(applied);
 
@@ -28,10 +28,18 @@ export function App() {
     await widgetRef.current?.updateQuote(draft);
   }
 
-  // Read the selection at checkout. Still client-side; we send it to the
-  // backend in the next step.
-  function handleCheckout(selection: SelectionData | null) {
-    setCheckoutIntent(selection);
+  async function handleCheckout(selection: SelectionData | null) {
+    setCheckoutResult(null);
+    if (!selection?.quoteId) return;
+    try {
+      const result =
+        selection.status === "QUOTE_ACCEPTED"
+          ? await acceptQuote(selection.quoteId, applied.productPrice, purchaser)
+          : await declineQuote(selection.quoteId);
+      setCheckoutResult(result);
+    } catch (error) {
+      setCheckoutResult({ ok: false, status: 0, body: { error: (error as Error).message } });
+    }
   }
 
   return (
@@ -68,16 +76,17 @@ export function App() {
             onCheckout={handleCheckout}
           />
 
-          {checkoutIntent && (
+          {checkoutResult && (
             <section className="panel panel--seam">
               <div className="panel__header">
-                <h2>Selection captured</h2>
+                <h2>Backend response</h2>
               </div>
-              <p className="muted">
-                status <code>{checkoutIntent.status}</code>, quote{" "}
-                <code>{checkoutIntent.quoteId ?? "(none)"}</code>. Next we send
-                this to the backend.
+              <p className={checkoutResult.ok ? "notice notice--ok" : "notice notice--error"}>
+                {checkoutResult.status === 0
+                  ? "Could not reach the backend. Is it running?"
+                  : `HTTP ${checkoutResult.status}${checkoutResult.ok ? " (success)" : ""}`}
               </p>
+              <pre className="log__detail">{JSON.stringify(checkoutResult.body, null, 2)}</pre>
             </section>
           )}
         </div>
```

</details>

> ⚠️ **Note:** It is important that these
> endpoints not be called until the customer *fully completes and submits* your
> checkout flow. A common mistake in first-pass implementations is to call Spot's 
> API as soon as the widget fires `onOptIn`/`onOptOut` callbacks; however, if the 
> customer then abandons checkout, you will have created an enrollment for coverage 
> they never bought.

Configure `apps/server/.env` (copy from `.env.example`), then run both:

```bash
pnpm dev:all     # backend on :8787, frontend on :5180
```

Pick yes or no and "Proceed to checkout": accept returns an `enrollmentId`,
decline returns a declined status.

*Full change for this step: `git diff quickstart-step-2 quickstart-step-3`.*

### Step 4: Receive and Verify Webhooks

**Tag:** `quickstart-step-4`

After a customer accepts coverage, Spot posts lifecycle and claim events to a
partner endpoint, signed with an HMAC. This step adds the receiver.

**Backend** (`apps/server`)

`src/spot/webhookSignature.ts` recomputes the signature as Spot produces it: a
hex HMAC-SHA256 over the **raw** request body, keyed by `partnerId:hmacSecret`.
Verifying over the raw bytes matters, since re-serializing the parsed JSON could
reorder keys and break the comparison:

<details>
<summary><code>apps/server/src/spot/webhookSignature.ts</code> (new)</summary>

```ts
import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "../config.js";

/**
 * Verify Spot's X-Spot-Signature exactly as the platform produces it:
 * hex HMAC-SHA256 over the RAW request body bytes, keyed by
 * `${partnerId}:${hmacSecret}`. The raw bytes matter: re-serializing the parsed
 * JSON could reorder keys or reformat dates and break the comparison.
 */
export function verifySignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
): boolean {
  if (!signatureHeader) {
    return false;
  }
  const key = `${config.partnerId}:${config.webhookHmacSecret}`;
  const expectedHex = createHmac("sha256", key).update(rawBody).digest("hex");

  const expected = Buffer.from(expectedHex, "hex");
  const provided = Buffer.from(signatureHeader, "hex");
  if (expected.length === 0 || expected.length !== provided.length) {
    return false;
  }
  return timingSafeEqual(expected, provided);
}
```

</details>

`src/config.ts` adds `webhookHmacSecret`, a *separate* secret from the OAuth
client secret.

`src/index.ts` has the `express.json` parser stash the raw body, and a new
`POST /webhooks` route verifies the `X-Spot-Signature` header, returning `200`
on success and `401` on a bad or missing signature (so a real sender retries):

<details>
<summary><code>apps/server/src/index.ts</code> (changed)</summary>

```diff
@@ -3,14 +3,28 @@ import cors from "cors";
 import express from "express";
 import { config } from "./config.js";
 import { acceptQuote, declineQuote, type SpotCallResult } from "./spot/spotClient.js";
+import { verifySignature } from "./spot/webhookSignature.js";
+
+interface RawBodyRequest extends express.Request {
+  rawBody?: Buffer;
+}
 
 const app = express();
 app.use(cors({ origin: config.frontendOrigins }));
-app.use(express.json());
+// Keep the raw body alongside the parsed JSON so the webhook route can verify
+// the HMAC over exactly the bytes that were received.
+app.use(
+  express.json({
+    verify: (req, _res, buffer) => {
+      (req as RawBodyRequest).rawBody = buffer;
+    },
+  }),
+);
 
 // ===========================================================================
 // The actual Spot integration. This is the code a partner writes: exchange
-// credentials for a token and accept/decline quotes (spot/spotClient).
+// credentials for a token and accept/decline quotes (spot/spotClient), and
+// receive webhooks verifying the signature (spot/webhookSignature).
 // ===========================================================================
 
 /**
@@ -53,6 +67,22 @@ app.post("/decline", async (req, res) => {
   await forward(res, () => declineQuote(quoteId, { transactionId: transactionId ?? randomUUID() }));
 });
 
+/**
+ * Receive an outbound Spot webhook: verify the signature over the raw body and
+ * respond (401 on a bad signature so a real sender retries).
+ */
+app.post("/webhooks", (req, res) => {
+  const rawBody = (req as RawBodyRequest).rawBody ?? Buffer.alloc(0);
+  const signature = req.header("X-Spot-Signature") ?? null;
+  const verified = verifySignature(rawBody, signature ?? undefined);
+
+  if (!verified) {
+    res.status(401).json({ error: "invalid or missing X-Spot-Signature" });
+    return;
+  }
+  res.status(200).json({ received: true });
+});
+
 /** Run a Spot call and mirror its status and body back to the caller. */
 async function forward(
   res: express.Response,
```

</details>

To receive *real* Spot webhooks (extra steps, by design):

1. Set `SPOT_WEBHOOK_HMAC_SECRET` to the partner's real `hmacSecret`.
2. Expose the backend over public HTTPS (e.g. an ngrok/cloudflared tunnel to
   `:8787`). Spot rejects `http`/localhost receiver URLs.
3. Register the public URL with Spot (partner-wide via
   `POST /v1/enrollments/webhooks`, or per enrollment via `webhookUrlOverride`).
4. For an accepted quote Spot only delivers `ClaimReceived`, so you must trigger
   a claim to observe a real delivery.

Setting up a public tunnel just to see the verify path work is a lot of
ceremony; the next (optional) step adds a local simulator so you don't have to.

*Full change for this step: `git diff quickstart-step-3 quickstart-step-4`.*

### Step 5: Optional Demo / Observability Tooling

**Tag:** `quickstart-step-5`

Everything up to here is a complete integration. This final step adds tooling
that is **not** part of a real integration but makes the sample easy to explore
and demo locally. Each file below carries a `SAMPLE-APP ONLY` comment.

**Backend** (`apps/server`):

- `src/demo/webhookStore.ts`: an in-memory buffer of received webhooks.
- `src/demo/simulation.ts`: builds a representative webhook payload and signs it
  the way Spot would.
- `src/demo/routes.ts`: `registerDemoRoutes()` mounts `GET /health`,
  `GET`/`DELETE /webhooks/events`, and `POST /dev/simulate-webhook` (which
  self-signs an event and delivers it to the real `/webhooks` route).
- `src/index.ts`: records each received webhook into the buffer and calls
  `registerDemoRoutes(app)` behind a clear banner.

**Frontend** (`apps/web-react`):

- `src/demo/EventLog.tsx`: lists the widget callbacks as they fire.
- `src/demo/WebhookPanel.tsx` + `src/demo/webhookApi.ts`: polls the backend's
  webhook buffer and offers Simulate / Clear controls.
- `src/config.ts` + `src/defaultQuote.ts`: add **mock mode**: with
  `VITE_SPOT_USE_MOCK=true`, `buildMockQuoteResponse()` renders a complete quote
  without calling the API (handy when a local env has no matching offer).
- `src/App.tsx` + `WidgetPanel.tsx`: wire the two panels and the mock props in.

Try the whole thing without any Spot setup:

```bash
VITE_SPOT_USE_MOCK=true pnpm dev:all
```

Open http://localhost:5180, watch the Widget events panel as you interact, and
click **Simulate delivery** in the Webhooks panel to send a correctly signed
event through the verify-and-display path.

That's the finished app, the same code documented in
[`README.md`](README.md) and [`WALKTHROUGH.md`](WALKTHROUGH.md).
