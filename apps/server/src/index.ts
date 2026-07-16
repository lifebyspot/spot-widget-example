import { randomUUID } from "node:crypto";
import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { acceptQuote, declineQuote, type SpotCallResult } from "./spot/spotClient.js";
import { verifySignature } from "./spot/webhookSignature.js";
import { registerDemoRoutes } from "./demo/routes.js";
import { recordEvent } from "./demo/webhookStore.js";

interface RawBodyRequest extends express.Request {
  rawBody?: Buffer;
}

const app = express();
app.use(cors({ origin: config.frontendOrigins }));
// Keep the raw body alongside the parsed JSON so the webhook route can verify
// the HMAC over exactly the bytes that were received.
app.use(
  express.json({
    verify: (req, _res, buffer) => {
      (req as RawBodyRequest).rawBody = buffer;
    },
  }),
);

// ===========================================================================
// The actual Spot integration. This is the code a partner writes: exchange
// credentials for a token and accept/decline quotes (spot/spotClient), and
// receive webhooks verifying the signature (spot/webhookSignature).
// ===========================================================================

/**
 * Accept a quote. This is what actually creates coverage, and it is why a
 * backend exists: it attaches the OAuth bearer token the browser cannot hold.
 */
app.post("/accept", async (req, res) => {
  const { quoteId, productPrice, purchaser, transactionId, transactionItemId } =
    req.body ?? {};

  if (!quoteId || typeof productPrice !== "number" || !purchaser) {
    res.status(400).json({
      error: "quoteId, productPrice (number), and purchaser are required",
    });
    return;
  }

  // Idempotency keys. Generating them server-side means a retried request with
  // the same keys is rejected as a duplicate rather than double-charging.
  const payload = {
    productPrice,
    purchaser,
    transactionId: transactionId ?? randomUUID(),
    transactionItemId: transactionItemId ?? randomUUID(),
  };

  await forward(res, () => acceptQuote(quoteId, payload));
});

/**
 * Decline a quote, for conversion tracking. Optional in practice (abandoned
 * quotes expire) but a real integration reports it.
 */
app.post("/decline", async (req, res) => {
  const { quoteId, transactionId } = req.body ?? {};
  if (!quoteId) {
    res.status(400).json({ error: "quoteId is required" });
    return;
  }
  await forward(res, () => declineQuote(quoteId, { transactionId: transactionId ?? randomUUID() }));
});

/**
 * Receive an outbound Spot webhook: verify the signature over the raw body and
 * respond (401 on a bad signature so a real sender retries).
 */
app.post("/webhooks", (req, res) => {
  const rawBody = (req as RawBodyRequest).rawBody ?? Buffer.alloc(0);
  const signature = req.header("X-Spot-Signature") ?? null;
  const verified = verifySignature(rawBody, signature ?? undefined);

  // SAMPLE-APP ONLY: record the event (valid or not) so the demo's Webhooks
  // panel can display it. A real integration would instead reject invalid
  // events and run its business logic on valid ones.
  recordEvent({ receivedAt: new Date().toISOString(), verified, signature, payload: req.body });

  if (!verified) {
    res.status(401).json({ error: "invalid or missing X-Spot-Signature" });
    return;
  }
  res.status(200).json({ received: true });
});

/** Run a Spot call and mirror its status and body back to the caller. */
async function forward(
  res: express.Response,
  call: () => Promise<SpotCallResult>,
): Promise<void> {
  try {
    const result = await call();
    res.status(result.status).json(result.body);
  } catch (error) {
    // Network or token-exchange failure, not a Spot API rejection.
    res.status(502).json({ error: (error as Error).message });
  }
}

// ===========================================================================
// Sample-app scaffolding. Everything below only exists to make the mini-app
// demoable and is NOT part of a real integration. See demo/routes.ts.
// ===========================================================================
registerDemoRoutes(app);

app.listen(config.port, () => {
  console.log(
    `Spot example backend listening on http://localhost:${config.port} -> ${config.spotApiBase}`,
  );
});
