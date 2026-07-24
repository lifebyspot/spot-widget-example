import { useRef, useState } from "react";
import type { ReactSpotWidgetRef } from "@getspot/spot-widget-react";
import type { Quote, QuoteItem, SelectionData } from "@getspot/spot-widget";
import { apiConfig } from "./config";
import { buildDefaultQuoteRequest } from "./defaultQuote";
import { QuoteForm } from "./components/QuoteForm";
import { WidgetPanel } from "./components/WidgetPanel";
import { PurchaserForm } from "./components/PurchaserForm";
import { acceptQuote, declineQuote, type CheckoutResult, type Purchaser } from "./bff";

/**
 * The API returns `expiresAt` and the widget passes the quote through untouched,
 * but the published `Quote` type omits it. ISO8601 string, not a Date.
 */
type QuoteWithExpiry = Quote & { expiresAt?: string };

/** True only when the quote is known to have expired; unknown means proceed. */
function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const at = new Date(expiresAt).getTime();
  return Number.isFinite(at) && at <= Date.now();
}

export function App() {
  const initialQuoteRef = useRef<QuoteItem>(buildDefaultQuoteRequest());
  const widgetRef = useRef<ReactSpotWidgetRef>(null);

  const [draft, setDraft] = useState<QuoteItem>(initialQuoteRef.current);
  const [applied, setApplied] = useState<QuoteItem>(initialQuoteRef.current);
  const [purchaser, setPurchaser] = useState<Purchaser>({
    firstName: "Test",
    lastName: "Purchaser",
    email: "test.purchaser@example.com",
  });
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null);

  // Only the submit handler reads this, so a ref rather than state.
  const quoteExpiryRef = useRef<string | null>(null);

  /**
   * Idempotency key. Spot dedupes repeat submissions of the same transactionId,
   * so it must stay stable across retries. Real integrations should send their
   * own order id.
   */
  const transactionIdRef = useRef<string>(crypto.randomUUID());

  const dirty = JSON.stringify(draft) !== JSON.stringify(applied);

  async function handleApply() {
    setApplied(draft);
    await widgetRef.current?.updateQuote(draft);
  }

  async function handleCheckout(selection: SelectionData | null) {
    setCheckoutResult(null);
    if (!selection?.quoteId) return;

    // The quote describes `applied`; unapplied edits in `draft` were never
    // quoted, so re-quote before submitting.
    if (dirty) {
      setCheckoutResult({
        ok: false,
        status: 0,
        body: {
          error:
            "The booking changed since it was quoted. Apply the changes to re-quote, then confirm.",
        },
      });
      return;
    }

    // Re-quote rather than submit an id Spot will reject. updateQuote() fires
    // onQuoteRetrieved again, refreshing the stored expiry.
    if (isExpired(quoteExpiryRef.current)) {
      const requoted = await widgetRef.current?.updateQuote(applied);
      setCheckoutResult({
        ok: false,
        status: 0,
        body: {
          error: requoted
            ? "That quote had expired, so it was refreshed. Review the new quote and confirm again."
            : "That quote had expired and could not be refreshed. Please try again.",
        },
      });
      return;
    }

    try {
      const result =
        selection.status === "QUOTE_ACCEPTED"
          ? await acceptQuote(
              selection.quoteId,
              applied.productPrice,
              purchaser,
              transactionIdRef.current,
            )
          : await declineQuote(selection.quoteId, transactionIdRef.current);
      setCheckoutResult(result);
    } catch (error) {
      setCheckoutResult({ ok: false, status: 0, body: { error: (error as Error).message } });
    }
  }

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1>Spot widget example</h1>
          <p className="muted">
            A sample partner integration consuming{" "}
            <code>@getspot/spot-widget-react</code>.
          </p>
        </div>
        <div className="badges">
          <span className="badge">env: {apiConfig.environment}</span>
        </div>
      </header>

      <main className="app__grid">
        <div className="app__column">
          <QuoteForm value={draft} onChange={setDraft} onApply={handleApply} dirty={dirty} />
          <PurchaserForm value={purchaser} onChange={setPurchaser} />
        </div>

        <div className="app__column">
          <WidgetPanel
            widgetRef={widgetRef}
            apiConfig={apiConfig}
            quoteRequestData={initialQuoteRef.current}
            onQuoteRetrieved={(quote) => {
              quoteExpiryRef.current = (quote as QuoteWithExpiry).expiresAt ?? null;
            }}
            onOptIn={() => {}}
            onOptOut={() => {}}
            onError={() => {}}
            onNoMatchingQuote={() => {}}
            onCheckout={handleCheckout}
          />

          {checkoutResult && (
            <section className="panel panel--seam">
              <div className="panel__header">
                <h2>Backend response</h2>
              </div>
              <p className={checkoutResult.ok ? "notice notice--ok" : "notice notice--error"}>
                {checkoutResult.status === 0
                  ? "Could not reach the backend. Is it running?"
                  : `HTTP ${checkoutResult.status}${checkoutResult.ok ? " (success)" : ""}`}
              </p>
              <pre className="log__detail">{JSON.stringify(checkoutResult.body, null, 2)}</pre>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
