// BFF = "backend for frontend": a small backend that exists to serve this
// frontend. The browser cannot call Spot's accept/decline endpoints directly
// (they need an OAuth secret that must not ship to the browser), so it calls
// our own backend, which holds the secret and forwards to Spot. This module is
// the browser's client for that backend.

import { backendUrl } from "./config";

/** Buyer details collected at checkout and sent to the backend for the accept call. */
export interface Purchaser {
  firstName: string;
  lastName: string;
  email: string;
}

/** Normalized result of a backend call: whether it succeeded, the HTTP status
 *  (0 means the request never reached the backend), and the parsed body. */
export interface CheckoutResult {
  ok: boolean;
  status: number;
  body: unknown;
}

async function post(path: string, payload: unknown): Promise<CheckoutResult> {
  const response = await fetch(`${backendUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // no-op: leave body null if the response was not JSON
  }
  return { ok: response.ok, status: response.status, body };
}

/**
 * Ask the backend to accept (bind) the quote. Creates coverage.
 * transactionId must stay stable across retries; the server derives the
 * idempotency key (transactionItemId) from it.
 */
export function acceptQuote(
  quoteId: string,
  productPrice: number,
  purchaser: Purchaser,
  transactionId: string,
): Promise<CheckoutResult> {
  return post("/accept", { quoteId, productPrice, purchaser, transactionId });
}

/** Ask the backend to decline the quote (conversion tracking). */
export function declineQuote(quoteId: string): Promise<CheckoutResult> {
  return post("/decline", { quoteId });
}
