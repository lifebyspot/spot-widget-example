import { createHmac, randomUUID } from "node:crypto";
import { config } from "../config.js";

// SAMPLE-APP ONLY. Builds a representative webhook payload and signs it the way
// Spot would, so the receiver's verify path can be exercised locally without a
// public tunnel or a real claim. Nothing here runs in a real integration.
export function buildSignedSimulation(status = "ClaimReceived"): {
  body: string;
  signature: string;
} {
  const nowIso = new Date().toISOString();
  const isClaim = status === "ClaimReceived";
  const payload: Record<string, unknown> = {
    timestamp: nowIso,
    enrollment: {
      id: randomUUID(),
      status,
      ...(isClaim
        ? { transactionItemId: randomUUID(), resolvedByPartner: false }
        : {}),
      startDate: nowIso,
      endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    offer: { sku: "EXAMPLE-CFAR-SKU" },
    ...(isClaim
      ? { claim: { amount: 350, percent: 0.7, currencyCode: "USD" } }
      : {}),
  };

  const body = JSON.stringify(payload);
  const key = `${config.partnerId}:${config.webhookHmacSecret}`;
  const signature = createHmac("sha256", key).update(body).digest("hex");
  return { body, signature };
}
