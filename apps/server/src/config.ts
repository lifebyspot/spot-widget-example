import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 8787),
  // Both sample frontends may call the backend: React (5180) and vanilla (5181).
  frontendOrigins: (
    process.env.FRONTEND_ORIGIN ?? "http://localhost:5180,http://localhost:5181"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};
