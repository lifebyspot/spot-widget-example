import { useMemo, useRef, useState } from "react";
import type { ReactSpotWidgetRef } from "@getspot/spot-widget-react";
import type { QuoteItem, SelectionData } from "@getspot/spot-widget";
import { apiConfig, backendUrl, useMockData } from "./config";
import { buildDefaultQuoteRequest, buildMockQuoteResponse } from "./defaultQuote";
import { QuoteForm } from "./components/QuoteForm";
import { WidgetPanel, type QuoteStatus } from "./components/WidgetPanel";
import { PurchaserForm } from "./components/PurchaserForm";
import { acceptQuote, declineQuote, type CheckoutResult, type Purchaser } from "./bff";
// Demo-only observability panels (not part of a real integration).
import { EventLog, type LogEntry } from "./demo/EventLog";
import { WebhookPanel } from "./demo/WebhookPanel";

export function App() {
  // The widget reads quoteRequestData once at init and is updated afterwards
  // through its updateQuote() method, so we hold the initial request stable and
  // never change that prop's identity. This avoids re-creating the widget (and
  // losing the user's selection) on every edit.
  // Hold the initial quote request stable so editing the form never remounts
  // the widget (which would lose the selection); re-quote via updateQuote().
  const initialQuoteRef = useRef<QuoteItem>(buildDefaultQuoteRequest());
  const widgetRef = useRef<ReactSpotWidgetRef>(null);

  const [draft, setDraft] = useState<QuoteItem>(initialQuoteRef.current);
  const [applied, setApplied] = useState<QuoteItem>(initialQuoteRef.current);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [checkoutIntent, setCheckoutIntent] = useState<SelectionData | null>(
    null,
  );
  const [quoteStatus, setQuoteStatus] = useState<QuoteStatus>("pending");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [purchaser, setPurchaser] = useState<Purchaser>({
    firstName: "Test",
    lastName: "Purchaser",
    email: "test.purchaser@example.com",
  });
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null);
  const [checkoutPending, setCheckoutPending] = useState(false);

  const logIdRef = useRef(0);
  const mockData = useMemo(
    () => buildMockQuoteResponse(initialQuoteRef.current),
    [],
  );

  function addLog(label: string, detail?: unknown) {
    logIdRef.current += 1;
    setEntries((current) =>
      [
        {
          id: logIdRef.current,
          time: new Date().toLocaleTimeString(),
          label,
          detail,
        },
        ...current,
      ].slice(0, 40),
    );
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(applied);

  async function handleApply() {
    setApplied(draft);
    setQuoteStatus("pending");
    setErrorMessage(null);
    addLog("updateQuote() called", draft);
    const updated = await widgetRef.current?.updateQuote(draft);
    addLog("updateQuote() resolved", { success: updated ?? false });
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
    setCheckoutIntent(selection);
    setCheckoutResult(null);
    addLog("Checkout: selection read via getSelection()", selection);
    if (!selection?.quoteId) {
      return;
    }

    const accepting = selection.status === "QUOTE_ACCEPTED";
    setCheckoutPending(true);
    try {
      const result = accepting
        ? await acceptQuote(selection.quoteId, applied.productPrice, purchaser)
        : await declineQuote(selection.quoteId);
      setCheckoutResult(result);
      addLog(accepting ? "Backend /accept response" : "Backend /decline response", result);
    } catch (error) {
      const failure: CheckoutResult = {
        ok: false,
        status: 0,
        body: { error: (error as Error).message },
      };
      setCheckoutResult(failure);
      addLog("Backend call failed", failure);
    } finally {
      setCheckoutPending(false);
    }
  }

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1>Spot widget example</h1>
          <p className="muted">
            A sample partner integration. React frontend consuming{" "}
            <code>@getspot/spot-widget-react</code>.
          </p>
        </div>
        <div className="badges">
          <span className="badge">env: {apiConfig.environment}</span>
          <span className="badge">
            partner: {apiConfig.partnerId.slice(0, 8)}…
          </span>
          {useMockData && <span className="badge badge--warn">mock data</span>}
        </div>
      </header>

      <main>
        <form className="app__grid" onSubmit={handleSubmit}>
          <div className="app__column">
            <QuoteForm
              value={draft}
              onChange={setDraft}
              onApply={handleApply}
              dirty={dirty}
            />
            <PurchaserForm value={purchaser} onChange={setPurchaser} />
          </div>

          <div className="app__column">
            <WidgetPanel
              widgetRef={widgetRef}
              apiConfig={apiConfig}
              quoteRequestData={initialQuoteRef.current}
              quoteStatus={quoteStatus}
              errorMessage={errorMessage}
              useMockData={useMockData}
              mockData={mockData}
              onQuoteRetrieved={(quote) => {
                setQuoteStatus("available");
                addLog("onQuoteRetrieved", quote);
              }}
              onOptIn={(data) => addLog("onOptIn (accepted)", data)}
              onOptOut={(data) => addLog("onOptOut (declined)", data)}
              onError={(error, didRender) => {
                setErrorMessage(error.message);
                // If the widget put its own DOM on screen before throwing, the
                // quote is usable even though onQuoteRetrieved never fired. Only a
                // true failure (nothing rendered) is a hard error.
                setQuoteStatus((previous) =>
                  previous === "available"
                    ? previous
                    : didRender
                      ? "rendered_with_error"
                      : "error",
                );
                addLog("onError", { ...error, didRender });
              }}
              onNoMatchingQuote={(data) => {
                setQuoteStatus("none");
                addLog("onNoMatchingQuote", data);
              }}
            />

            {checkoutIntent && (
              <section className="panel panel--seam">
                <div className="panel__header">
                  <h2>
                    {checkoutIntent.status === "QUOTE_ACCEPTED"
                      ? "Accept"
                      : "Decline"}{" "}
                    via backend
                  </h2>
                </div>
                <p className="muted">
                  The selection was sent to the sample backend, which called the
                  Spot API's{" "}
                  <code>
                    /quote/{checkoutIntent.quoteId ?? ":id"}/
                    {checkoutIntent.status === "QUOTE_ACCEPTED"
                      ? "accept"
                      : "decline"}
                  </code>{" "}
                  with an OAuth token the browser never sees.
                </p>
                {checkoutPending && <p className="muted">Calling backend...</p>}
                {checkoutResult && (
                  <>
                    {checkoutResult.status === 0 ? (
                      <p className="notice notice--error">
                        Could not reach the backend at <code>{backendUrl}</code>.
                        Is it running? Start it with{" "}
                        <code>pnpm --filter server dev</code>.
                      </p>
                    ) : (
                      <p
                        className={
                          checkoutResult.ok
                            ? "notice notice--ok"
                            : "notice notice--error"
                        }
                      >
                        Backend responded HTTP {checkoutResult.status}
                        {checkoutResult.ok ? " (success)" : ""}
                      </p>
                    )}
                    <pre className="log__detail">
                      {JSON.stringify(checkoutResult.body, null, 2)}
                    </pre>
                  </>
                )}
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
