// Local domain types for the sample checkout.
//
// In this baseline (pre-Spot) app they describe the partner's own cart and
// buyer. When the Spot widget is added later in the Quickstart, the booking
// becomes the widget's quote request (see defaultQuote.ts), and the Purchaser
// type moves to the backend client (bff.ts).

export type ProductType = "Trip" | "Pass" | "Registration";
export type ProductDuration = "Trip" | "Daily" | "Seasonal" | "Event";
export type CurrencyCode = "USD" | "CAD" | "GBP" | "EUR" | "AUD";

/** The booking the customer is checking out. */
export interface Booking {
  productPrice: number;
  productName: string;
  productId: string;
  productType: ProductType;
  productDuration: ProductDuration;
  cartId: string;
  cartName: string;
  eventType: string;
  currencyCode: CurrencyCode;
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
export function buildDefaultBooking(): Booking {
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
