import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required env var ${name}. Copy apps/server/.env.example to apps/server/.env and fill it in.`,
    );
  }
  return value;
}

export const config = {
  spotApiBase: process.env.SPOT_API_BASE ?? "https://api.sandbox.getspot.com",
  partnerId: required("SPOT_PARTNER_ID"),
  clientId: required("SPOT_CLIENT_ID"),
  clientSecret: required("SPOT_CLIENT_SECRET"),
  // Per-partner secret used to sign outbound webhooks. This is distinct from the
  // OAuth client secret and is not issued alongside it. To verify REAL Spot
  // webhooks you must set the partner's actual hmacSecret here; the placeholder
  // only lets the local self-signed simulation round-trip.
  webhookHmacSecret: process.env.SPOT_WEBHOOK_HMAC_SECRET ?? "local-dev-hmac-secret",
  port: Number(process.env.PORT ?? 8787),
  // When set, this backend also serves the built frontend from this directory,
  // so the whole demo runs as one container on one origin. Local dev leaves it
  // unset and lets Vite serve the frontend on its own port.
  publicDir: process.env.PUBLIC_DIR,
  // SAMPLE-APP ONLY: replace purchaser details before they reach Spot. Set only
  // on the public hosted demo, where strangers type into the form. A real
  // integration must send the real purchaser. See demo/scrubPurchaser.ts.
  scrubPurchaser: process.env.DEMO_SCRUB_PURCHASER === "true",
  // Both sample frontends may call the backend: React (5180) and vanilla (5181).
  frontendOrigins: (
    process.env.FRONTEND_ORIGIN ?? "http://localhost:5180,http://localhost:5181"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};
