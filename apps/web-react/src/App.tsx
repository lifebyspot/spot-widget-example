import { useRef, useState } from "react";
import type { ReactSpotWidgetRef } from "@getspot/spot-widget-react";
import type { QuoteItem, SelectionData } from "@getspot/spot-widget";
import { apiConfig } from "./config";
import { buildDefaultQuoteRequest } from "./defaultQuote";
import { QuoteForm } from "./components/QuoteForm";
import { WidgetPanel } from "./components/WidgetPanel";
import { PurchaserForm } from "./components/PurchaserForm";
import type { Purchaser } from "./types";

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
  const [checkoutIntent, setCheckoutIntent] = useState<SelectionData | null>(null);

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

  function handleCheckout(selection: SelectionData | null) {
    setCheckoutIntent(selection);
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
              onQuoteRetrieved={() => {}}
              onOptIn={() => {}}
              onOptOut={() => {}}
              onError={() => {}}
              onNoMatchingQuote={() => {}}
            />

            {checkoutIntent && (
              <section className="panel panel--seam">
                <div className="panel__header">
                  <h2>Selection captured</h2>
                </div>
                <p className="muted">
                  status <code>{checkoutIntent.status}</code>, quote{" "}
                  <code>{checkoutIntent.quoteId ?? "(none)"}</code>. Next we send
                  this to the backend.
                </p>
              </section>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
