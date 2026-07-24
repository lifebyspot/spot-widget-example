import type { ApiConfig } from "@getspot/spot-widget";

// Point the widget at an environment and partner. Set these in .env.local; the
// widget resolves `environment` to the right Spot API base URL on its own.
// Setting VITE_SPOT_CUSTOM_ENDPOINT overrides that resolution entirely; leave it
// unset for Sandbox and production.
export const apiConfig: ApiConfig = {
  environment: (import.meta.env.VITE_SPOT_ENV ?? "sandbox") as ApiConfig["environment"],
  partnerId: import.meta.env.VITE_SPOT_PARTNER_ID ?? "",
  ...(import.meta.env.VITE_SPOT_CUSTOM_ENDPOINT
    ? { customEndpoint: import.meta.env.VITE_SPOT_CUSTOM_ENDPOINT }
    : {}),
};

// Base URL of the sample backend that performs accept/decline (it holds the
// OAuth secret the browser must never see).
export const backendUrl = import.meta.env.VITE_BFF_URL ?? "http://localhost:8787";
