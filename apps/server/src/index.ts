import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { acceptQuote, declineQuote, type SpotCallResult } from "./spot/spotClient.js";

const app = express();
app.use(cors({ origin: config.frontendOrigins }));
app.use(express.json());

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
