import { useMemo, useRef, useState } from "react";
import type { ReactSpotWidgetRef } from "@getspot/spot-widget-react";
import type { Quote, QuoteItem, SelectionData } from "@getspot/spot-widget";
import { apiConfig, useMockData } from "./config";
import { buildDefaultQuoteRequest, buildMockQuoteResponse } from "./defaultQuote";
import { QuoteForm } from "./components/QuoteForm";
import { WidgetPanel } from "./components/WidgetPanel";
import { PurchaserForm } from "./components/PurchaserForm";
import { acceptQuote, declineQuote, type CheckoutResult, type Purchaser } from "./bff";
// Demo-only observability panels (not part of a real integration).
import { EventLog, type LogEntry } from "./demo/EventLog";
import { WebhookPanel } from "./demo/WebhookPanel";

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
  // Hold the initial quote request stable so editing the form never remounts
  // the widget (which would lose the selection); re-quote via updateQuote().
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
  const [entries, setEntries] = useState<LogEntry[]>([]);

  const mockData = useMemo(() => buildMockQuoteResponse(initialQuoteRef.current), []);
  const logIdRef = useRef(0);

  function addLog(label: string, detail?: unknown) {
    logIdRef.current += 1;
    const id = logIdRef.current;
    setEntries((current) =>
      [{ id, time: new Date().toLocaleTimeString(), label, detail }, ...current].slice(0, 40),
    );
  }

  // Only the submit handler reads this, so a ref rather than state.
  const quoteExpiryRef = useRef<string | null>(null);

  /**
   * Identifies this order. The server derives the real idempotency key
   * (transactionItemId) from it, so it must stay stable across retries. Real
   * integrations should send their own order id.
   */
  const transactionIdRef = useRef<string>(crypto.randomUUID());

  const dirty = JSON.stringify(draft) !== JSON.stringify(applied);

  async function handleApply() {
    setApplied(draft);
    await widgetRef.current?.updateQuote(draft);
  }

  /**
   * Real checkouts are forms, so the widget is mounted inside one and the
   * checkout button is a submit control. Enter in any field submits too,
   * which is why every other button sets type="button".
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!widgetRef.current?.validateSelection()) return;
    await handleCheckout(widgetRef.current?.getSelection() ?? null);
  }

  async function handleCheckout(selection: SelectionData | null) {
    setCheckoutResult(null);
    addLog("checkout: selection read", selection);
    if (!selection?.quoteId) return;

    // The quote describes `applied`; unapplied edits in `draft` were never
    // quoted, so re-quote before submitting.
    if (dirty) {
      addLog("checkout: blocked, booking has unapplied edits");
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
      addLog("checkout: quote expired, re-quoting", { expiresAt: quoteExpiryRef.current });
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
          : await declineQuote(selection.quoteId);
      setCheckoutResult(result);
      addLog("backend response", result);
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
          {useMockData && <span className="badge badge--warn">mock data</span>}
        </div>
      </header>

      <main>
        <form className="app__grid" onSubmit={handleSubmit}>
          <div className="app__column">
            <QuoteForm value={draft} onChange={setDraft} onApply={handleApply} dirty={dirty} />
            <PurchaserForm value={purchaser} onChange={setPurchaser} />
          </div>

          <div className="app__column">
            <WidgetPanel
              widgetRef={widgetRef}
              apiConfig={apiConfig}
              quoteRequestData={initialQuoteRef.current}
              useMockData={useMockData}
              mockData={mockData}
              onQuoteRetrieved={(quote) => {
                quoteExpiryRef.current = (quote as QuoteWithExpiry).expiresAt ?? null;
                addLog("onQuoteRetrieved", quote);
              }}
              onOptIn={(data) => addLog("onOptIn (accepted)", data)}
              onOptOut={(data) => addLog("onOptOut (declined)", data)}
              onError={(error) => addLog("onError", error)}
              onNoMatchingQuote={(data) => addLog("onNoMatchingQuote", data)}
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

          <div className="app__column">
            <EventLog entries={entries} onClear={() => setEntries([])} />
            <WebhookPanel />
          </div>
        </form>
      </main>
    </div>
  );
}
