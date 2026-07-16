/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SPOT_ENV?: "local" | "sandbox" | "production";
  readonly VITE_SPOT_PARTNER_ID?: string;
  readonly VITE_SPOT_CUSTOM_ENDPOINT?: string;
  readonly VITE_SPOT_USE_MOCK?: string;
  readonly VITE_BFF_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
