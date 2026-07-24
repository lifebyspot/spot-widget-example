// Local domain types for the sample checkout.

/** A single bookable item in the customer's cart (one booking). */
export interface QuoteItem {
  productPrice: number;
  productName: string;
  productId: string;
  productType: "Trip" | "Pass" | "Registration";
  productDuration: "Trip" | "Daily" | "Seasonal" | "Event";
  cartId: string;
  cartName: string;
  eventType: string;
  currencyCode: "USD" | "CAD" | "GBP" | "EUR" | "AUD";
  startDate: string;
  endDate: string;
  hostCountry: string;
  hostCountryState: string;
  destinations: string[];
  isPartialPayment: boolean;
}

/** Buyer details collected at checkout. */
export interface Purchaser {
  firstName: string;
  lastName: string;
  email: string;
}

function isoDaysFromNow(days: number): string {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return new Date(Date.now() + days * millisecondsPerDay).toISOString();
}

/** A sensible starting booking so the app renders something out of the box. */
export function buildDefaultQuoteRequest(): QuoteItem {
  return {
    productPrice: 500,
    productName: "Season Pass",
    productId: "example-pass-001",
    productType: "Pass",
    productDuration: "Seasonal",
    cartId: "example-cart",
    cartName: "Sample Cart",
    eventType: "Travel Experience",
    currencyCode: "USD",
    startDate: isoDaysFromNow(7),
    endDate: isoDaysFromNow(9),
    hostCountry: "US",
    hostCountryState: "TX",
    destinations: ["US"],
    isPartialPayment: false,
  };
}
