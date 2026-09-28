import { config } from "../config.js";

/**
 * SAMPLE-APP ONLY. Nothing here is part of a real Spot integration.
 *
 * Asks Spot for a quote using the same shape the frontend sends, and reports
 * whether the answer is one the widget could actually render. It exists so an
 * uptime monitor can tell "the demo is up" apart from "the demo still works":
 * a container can be perfectly healthy while an offer edit, an expired
 * credential or a rate limit makes every quote unusable.
 *
 * Dates are relative, so this never ages out. That is the same reason the
 * frontend builds its request with isoDaysFromNow().
 */

// Everything the widget dereferences while rendering. A quote missing any of
// these is returned happily by the API and then throws in the browser, which
// is a failure mode worth catching from outside.
const REQUIRED_COMMUNICATION_FIELDS = [
  "name",
  "description",
  "bulletPoints",
  "yesOptionText",
  "noOptionText",
  "legalDisclaimer",
  "termsAndConditionsUrl",
] as const;

export interface QuoteCheckResult {
  ok: boolean;
  status: string;
  detail?: string;
  spotPrice?: number;
  currencyCode?: string;
  missingFields?: string[];
}

function isoDaysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export async function runQuoteCheck(): Promise<QuoteCheckResult> {
  const body = {
    productPrice: 500,
    productType: "Pass",
    productDuration: "Seasonal",
    productId: "example-pass-001",
    productName: "Season Pass",
    cartId: "demo-quote-check",
    cartName: "Demo Quote Check",
    eventType: "Travel Experience",
    currencyCode: "USD",
    startDate: isoDaysFromNow(7),
    endDate: isoDaysFromNow(9),
    isPartialPayment: false,
  };

  let response: Response;
  try {
    response = await fetch(`${config.spotApiBase}/api/v1/quote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Spot-Partner-Id": config.partnerId,
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    return { ok: false, status: "UNREACHABLE", detail: (error as Error).message };
  }

  if (!response.ok) {
    return { ok: false, status: "HTTP_ERROR", detail: `Spot returned ${response.status}` };
  }

  const payload = (await response.json().catch(() => null)) as
    | { status?: string; data?: Record<string, any> }
    | null;

  if (!payload) {
    return { ok: false, status: "UNPARSEABLE", detail: "Spot's response was not JSON" };
  }

  // NO_MATCHING_QUOTE is also an HTTP success, so the status code proves nothing.
  if (payload.status !== "QUOTE_AVAILABLE") {
    return { ok: false, status: payload.status ?? "UNKNOWN" };
  }

  const communication = payload.data?.communication ?? {};
  const missingFields = REQUIRED_COMMUNICATION_FIELDS.filter(
    (field) => communication[field] === undefined,
  );

  return {
    ok: missingFields.length === 0,
    status: missingFields.length === 0 ? "QUOTE_AVAILABLE" : "INCOMPLETE_COMMUNICATION",
    spotPrice: payload.data?.spotPrice,
    currencyCode: payload.data?.currencyCode,
    ...(missingFields.length > 0 ? { missingFields } : {}),
  };
}
