import { useRef, type RefObject } from "react";
import ReactSpotWidget, {
  type ReactSpotWidgetRef,
} from "@getspot/spot-widget-react";
import type {
  ApiConfig,
  ApiResponse,
  Quote,
  QuoteItem,
  SelectionData,
} from "@getspot/spot-widget";

export type QuoteStatus =
  | "pending"
  | "available"
  | "rendered_with_error"
  | "none"
  | "error";

/**
 * Props for this sample's WidgetPanel. Most pass straight through to the widget
 * (they are part of `ReactSpotWidgetProps`); a few, marked "sample-only", are
 * plumbing this demo adds and are not something the widget itself needs.
 */
interface WidgetPanelProps {
  /** Sample-only. Ref for calling the widget's imperative methods
   * (updateQuote, getSelection, validateSelection) from the parent. */
  widgetRef: RefObject<ReactSpotWidgetRef>;

  /** Widget prop (required). Target environment plus the partner id, which the
   * widget sends as the `X-Spot-Partner-Id` header on the quote request. */
  apiConfig: ApiConfig;

  /** Widget prop (required). The booking to quote: price, product type and
   * duration, dates, destinations, and so on. */
  quoteRequestData: QuoteItem;

  /** Sample-only. Drives the status banners below; derived from the callbacks. */
  quoteStatus: QuoteStatus;

  /** Sample-only. The last error message, shown alongside a rendered quote. */
  errorMessage: string | null;

  /** Widget prop. When true, the widget renders from `mockData` instead of
   * calling the API. A local dev aid; real integrations omit it. */
  useMockData: boolean;

  /** Widget prop. The fabricated quote used when `useMockData` is true. */
  mockData: ApiResponse;

  /** Widget callback. Fires when a quote is retrieved, with the full quote. */
  onQuoteRetrieved: (quote: Quote) => void;

  /** Widget callback. Fires when the customer selects "yes" (opts in). */
  onOptIn: (data: SelectionData) => void;

  /** Widget callback. Fires when the customer selects "no" (opts out). */
  onOptOut: (data: SelectionData) => void;

  /** Widget callback. Fires on a quote or render error. `didRender` is added by
   * this panel (not the widget) to tell a partial render from a true failure. */
  onError: (error: { message: string; status?: number }, didRender: boolean) => void;

  /** Widget callback. Fires when no offer matches the request (NO_MATCHING_QUOTE). */
  onNoMatchingQuote: (data: { status: string; data: unknown }) => void;

  /** Sample-only. Called by the checkout button with the current selection so
   * the parent can send it to the backend to accept or decline. */
  onCheckout: (selection: SelectionData | null) => void;
}

/**
 * Hosts the widget and the partner's own checkout button.
 *
 * The important integration lesson lives in handleCheckout: the widget only
 * captures a yes/no selection client-side. It is the partner app that decides
 * what to do at checkout. Here we validate the selection (the widget renders
 * its own inline error if nothing is picked) and hand the selection data up.
 * That selection is what gets sent to the backend to accept or decline the
 * quote against the Spot API.
 */
export function WidgetPanel({
  widgetRef,
  apiConfig,
  quoteRequestData,
  quoteStatus,
  errorMessage,
  useMockData,
  mockData,
  onQuoteRetrieved,
  onOptIn,
  onOptOut,
  onError,
  onNoMatchingQuote,
  onCheckout,
}: WidgetPanelProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  function handleCheckout() {
    const isValid = widgetRef.current?.validateSelection() ?? false;
    if (!isValid) {
      return;
    }
    const selection = widgetRef.current?.getSelection() ?? null;
    onCheckout(selection);
  }

  // The widget builds its DOM incrementally and can throw partway through
  // rendering (for example on a quote missing legalDisclaimer), firing onError
  // even though the quote is on screen. onQuoteRetrieved does not fire in that
  // case, so we tell "rendered but errored" apart from "truly failed" by
  // checking whether the widget put any of its own elements into the host.
  function handleWidgetError(error: { message: string; status?: number }) {
    const didRender = Boolean(hostRef.current?.querySelector('[class*="spot-"]'));
    onError(error, didRender);
  }

  return (
    <section className="panel">
      <div className="panel__header">
        <h2>Widget</h2>
      </div>

      {quoteStatus === "none" && (
        <p className="notice notice--warn">
          The API returned <code>NO_MATCHING_QUOTE</code>, so the widget renders
          nothing. This partner has no seeded offer matching the current
          booking. Adjust the booking details to match a seeded offer, or set{" "}
          <code>VITE_SPOT_USE_MOCK=true</code>.
        </p>
      )}
      {quoteStatus === "error" && (
        <p className="notice notice--error">
          The quote request failed. Check the event log and that the local API
          is running and migrated.
        </p>
      )}
      {quoteStatus === "rendered_with_error" && (
        <p className="notice notice--warn">
          The quote rendered, but the widget reported an error
          {errorMessage ? (
            <>
              {" "}
              (<code>{errorMessage}</code>)
            </>
          ) : null}{" "}
          and <code>onQuoteRetrieved</code> did not fire. With the local seed
          data this is the missing <code>legalDisclaimer</code> field. Accept and
        </p>
      )}
      {quoteStatus === "available" && errorMessage && (
        <p className="notice notice--warn">
          The quote rendered, but the widget reported an error:{" "}
          <code>{errorMessage}</code>. See the event log.
        </p>
      )}

      <div className="widget-host" ref={hostRef}>
        <ReactSpotWidget
          ref={widgetRef}
          apiConfig={apiConfig}
          quoteRequestData={quoteRequestData}
          showTable={false}
          useMockData={useMockData}
          mockData={mockData}
          onQuoteRetrieved={(quote) => onQuoteRetrieved(quote)}
          onOptIn={onOptIn}
          onOptOut={onOptOut}
          onError={handleWidgetError}
          onNoMatchingQuote={onNoMatchingQuote}
        />
      </div>

      <button className="button button--primary" onClick={handleCheckout}>
        Proceed to checkout
      </button>
      <p className="muted">
        Checkout validates the selection and reads it via getSelection(), then
        posts it to the partner backend to accept or decline the quote.
      </p>
    </section>
  );
}
