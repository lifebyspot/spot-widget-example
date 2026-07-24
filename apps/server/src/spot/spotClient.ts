import { config } from "../config.js";

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

// Refresh a bit before the real expiry so an in-flight request never uses a
// token that expires mid-call. The token lives 24h, so this margin is generous.
const EXPIRY_MARGIN_MS = 60_000;

/**
 * Client-credentials token, cached in memory. This is the whole reason a
 * partner needs a backend: the client secret is required to obtain this token
 * and must never reach the browser.
 */
async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - EXPIRY_MARGIN_MS > now) {
    return cachedToken.accessToken;
  }

  const response = await fetch(`${config.spotApiBase}/api/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Token request failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };
  return cachedToken.accessToken;
}

export interface SpotCallResult {
  status: number;
  body: unknown;
}

async function authedPost(path: string, payload: unknown): Promise<SpotCallResult> {
  const token = await getAccessToken();
  const response = await fetch(`${config.spotApiBase}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Spot-Partner-Id": config.partnerId,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // leave body as raw text if it is not JSON
  }
  return { status: response.status, body };
}

export function acceptQuote(quoteId: string, payload: unknown): Promise<SpotCallResult> {
  return authedPost(`/api/v1/quote/${encodeURIComponent(quoteId)}/accept`, payload);
}

export function declineQuote(quoteId: string, payload: unknown): Promise<SpotCallResult> {
  return authedPost(`/api/v1/quote/${encodeURIComponent(quoteId)}/decline`, payload);
}
