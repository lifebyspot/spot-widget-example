/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SPOT_ENV?: "local" | "sandbox" | "production";
  readonly VITE_SPOT_PARTNER_ID?: string;
  readonly VITE_SPOT_CUSTOM_ENDPOINT?: string;
  readonly VITE_SPOT_USE_MOCK?: string;
  readonly VITE_BFF_URL?: string;
  // Overrides for the default booking, so matching a specific partner's offer
  // is a config change rather than a code edit.
  readonly VITE_SPOT_PRODUCT_ID?: string;
  readonly VITE_SPOT_PRODUCT_TYPE?: string;
  readonly VITE_SPOT_PRODUCT_DURATION?: string;
  readonly VITE_SPOT_EVENT_TYPE?: string;
  readonly VITE_SPOT_PRODUCT_PRICE?: string;
  readonly VITE_SPOT_START_OFFSET_DAYS?: string;
  readonly VITE_SPOT_COVERAGE_DAYS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
