import type { ApiResponse, QuoteItem } from "@getspot/spot-widget";

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

/**
 * Fallback quote used only when VITE_SPOT_USE_MOCK=true. Lets the UI render
 * end to end even if the local API has no seeded offer for this partner.
 */
export function buildMockQuoteResponse(quoteRequest: QuoteItem): ApiResponse {
  const spotPrice = Math.round(quoteRequest.productPrice * 0.07 * 100) / 100;
  return {
    status: "QUOTE_AVAILABLE",
    data: {
      id: "mock-quote-id",
      spotPrice,
      currencyCode: quoteRequest.currencyCode,
      communication: {
        name: "Booking Protection",
        description: "Protect your booking against covered cancellations.",
        bulletPoints: [
          "Get your money back for covered reasons",
          "Simple online claims",
        ],
        yesOptionText: `Yes, protect my booking for $${spotPrice}`,
        noOptionText: "No, do not protect my booking",
        legalDisclaimer:
          'By selecting "Protect my Booking" you agree to the terms and conditions.',
        termsAndConditionsUrl: "https://www.getspot.com/terms",
      },
      payoutSchedule: [
        { text: "Full refund", percent: 100, amount: quoteRequest.productPrice },
      ],
    },
  };
}
