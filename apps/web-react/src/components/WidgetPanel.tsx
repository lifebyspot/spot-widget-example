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
  onCheckout: (selection: SelectionData | null) => void;
}

/**
 * Hosts the widget and the partner's own checkout button. The widget only
 * captures a yes/no selection client-side; at checkout we validate it and read
 * it with getSelection(), then hand it up.
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
  onCheckout,
}: WidgetPanelProps) {
  function handleCheckout() {
    if (!widgetRef.current?.validateSelection()) return;
    onCheckout(widgetRef.current?.getSelection() ?? null);
  }

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
      <button className="button button--primary" onClick={handleCheckout}>
        Proceed to checkout
      </button>
    </section>
  );
}
