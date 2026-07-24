import type { QuoteItem } from "@getspot/spot-widget";

function isoDaysFromNow(days: number): string {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return new Date(Date.now() + days * millisecondsPerDay).toISOString();
}

/**
 * A starting quote request so the widget renders a real quote out of the box.
 * Offer matching is driven mainly by productId together with productType and
 * productDuration, so replace these defaults with the values provisioned for
 * your partner account, or tweak them at runtime in the booking form. A real
 * integration builds this object from its own cart data.
 */
export function buildDefaultQuoteRequest(): QuoteItem {
  return {
    productPrice: 500,
    productType: "Pass",
    productDuration: "Seasonal",
    productId: "example-pass-001",
    productName: "Season Pass",
    cartId: "example-cart",
    cartName: "Sample Cart",
    eventType: "Travel Experience",
    currencyCode: "USD",
    // A short window keeps the request under offers that cap coverage duration.
    startDate: isoDaysFromNow(7),
    endDate: isoDaysFromNow(9),
    hostCountry: "US",
    hostCountryState: "TX",
    destinations: ["US"],
    isPartialPayment: false,
  };
}
