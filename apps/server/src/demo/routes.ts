import type { Express } from "express";
import { config } from "../config.js";
import { buildSignedSimulation } from "./simulation.js";
import { clearEvents, listEvents } from "./webhookStore.js";
import { runQuoteCheck } from "./quoteCheck.js";

/**
 * SAMPLE-APP ONLY. These routes exist purely to make the mini-app work; none of
 * them is part of a real Spot integration:
 *   GET    /health               liveness for the demo
 *   GET    /demo/quote-check      asks Spot for a quote and reports whether it
 *                                 is one the widget could render, so a monitor
 *                                 can tell "up" apart from "still works"
 *   GET    /webhooks/events       feeds the frontend Webhooks panel
 *   DELETE /webhooks/events       the panel's Clear button
 *   POST   /dev/simulate-webhook  self-signs a webhook and delivers it to the
 *                                 real /webhooks route, so the receiver can be
 *                                 exercised without a public tunnel or a claim
 */
export function registerDemoRoutes(app: Express): void {
  app.get("/health", (_req, res) => {
    res.json({ ok: true, spotApiBase: config.spotApiBase, partnerId: config.partnerId });
  });

  // 200 when the demo could still sell something, 503 when it could not, so an
  // uptime monitor needs no body parsing to alert. The body says why.
  app.get("/demo/quote-check", async (_req, res) => {
    const result = await runQuoteCheck();
    res.status(result.ok ? 200 : 503).json(result);
  });

  app.get("/webhooks/events", (_req, res) => {
    res.json({ events: listEvents() });
  });

  app.delete("/webhooks/events", (_req, res) => {
    clearEvents();
    res.json({ cleared: true });
  });

  app.post("/dev/simulate-webhook", async (req, res) => {
    const status = typeof req.body?.status === "string" ? req.body.status : "ClaimReceived";
    const { body, signature } = buildSignedSimulation(status);
    const response = await fetch(`http://localhost:${config.port}/webhooks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Spot-Partner-Id": config.partnerId,
        "X-Spot-Signature": signature,
      },
      body,
    });
    res.status(response.status).json({ simulatedStatus: status, delivered: response.ok });
  });
}
