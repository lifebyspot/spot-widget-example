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

  // Read the selection at checkout. Still client-side; we send it to the
  // backend in the next step.
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
            onQuoteRetrieved={() => {}}
            onOptIn={() => {}}
            onOptOut={() => {}}
            onError={() => {}}
            onNoMatchingQuote={() => {}}
            onCheckout={handleCheckout}
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
      </main>
    </div>
  );
}
