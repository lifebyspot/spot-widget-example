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
  port: Number(process.env.PORT ?? 8787),
  // Both sample frontends may call the backend: React (5180) and vanilla (5181).
  frontendOrigins: (
    process.env.FRONTEND_ORIGIN ?? "http://localhost:5180,http://localhost:5181"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};
