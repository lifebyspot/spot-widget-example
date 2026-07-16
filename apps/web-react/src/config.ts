import type { ApiConfig } from "@getspot/spot-widget";

/**
 * Central place to point the sample at an environment.
 *
 * The widget resolves `environment` to a base URL on its own:
 *   local      -> http://localhost:3999/api/v1/quote
 *   sandbox    -> https://api.sandbox.getspot.com/api/v1/quote
 *   production -> https://api.getspot.com/api/v1/quote
 *
 * `customEndpoint` overrides that entirely when set.
 *
 * Everything is overridable through Vite env vars (VITE_SPOT_*) so no code
 * change is needed to switch targets, but the defaults let the app run with
 */

type SpotEnvironment = ApiConfig["environment"];

const environment = (import.meta.env.VITE_SPOT_ENV ?? "local") as SpotEnvironment;

// same id the platform's own admin-ui widget preview uses against local.
const DEFAULT_LOCAL_PARTNER_ID = "your-sandbox-partner-id";

const partnerId = import.meta.env.VITE_SPOT_PARTNER_ID ?? DEFAULT_LOCAL_PARTNER_ID;

const customEndpoint = import.meta.env.VITE_SPOT_CUSTOM_ENDPOINT || undefined;

export const apiConfig: ApiConfig = {
  environment,
  partnerId,
  ...(customEndpoint ? { customEndpoint } : {}),
};

// When true, the widget renders from a fabricated quote instead of calling the
// API. Useful when a local environment has no seeded offer for this partner,
// which otherwise returns NO_MATCHING_QUOTE. Real integrations never set this.
export const useMockData = import.meta.env.VITE_SPOT_USE_MOCK === "true";

// Base URL of the sample backend that performs accept/decline. The browser
// never talks to the Spot accept/decline endpoints directly; it goes through
// this backend, which holds the OAuth credentials.
export const backendUrl =
  import.meta.env.VITE_BFF_URL ?? "http://localhost:8787";
