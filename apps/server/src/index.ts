import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { acceptQuote, declineQuote, type SpotCallResult } from "./spot/spotClient.js";
import { verifySignature } from "./spot/webhookSignature.js";

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
// The actual Spot integration. This is the code a partner writes.
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

  // Spot dedupes accept requests that reuse the same transactionItemId, so a
  // retry cannot double-charge. The key below is derived from transactionId,
  // so require a stable one rather than minting a fresh UUID per request.
  if (!transactionId) {
    res.status(400).json({
      error: "transactionId is required and must be stable across retries of the same order",
    });
    return;
  }
  const payload = {
    productPrice,
    purchaser,
    transactionId,
    // One key per cart line; this sample has a single item.
    transactionItemId: transactionItemId ?? `${transactionId}-1`,
  };

  await forward(res, () => acceptQuote(quoteId, payload));
});

/**
 * Decline a quote. Always report declines as well as accepts so Spot keeps a
 * complete, accurate record of every coverage decision.
 */
app.post("/decline", async (req, res) => {
  const { quoteId } = req.body ?? {};
  if (!quoteId) {
    res.status(400).json({ error: "quoteId is required" });
    return;
  }
  await forward(res, () => declineQuote(quoteId));
});

/**
 * Receive an outbound Spot webhook: verify the signature over the raw body and
 * respond (401 on a bad signature so a real sender retries).
 */
app.post("/webhooks", (req, res) => {
  const rawBody = (req as RawBodyRequest).rawBody ?? Buffer.alloc(0);
  const signature = req.header("X-Spot-Signature") ?? null;
  const verified = verifySignature(rawBody, signature ?? undefined);

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

app.listen(config.port, () => {
  console.log(
    `Spot example backend listening on http://localhost:${config.port} -> ${config.spotApiBase}`,
  );
});
