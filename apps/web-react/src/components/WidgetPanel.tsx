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
