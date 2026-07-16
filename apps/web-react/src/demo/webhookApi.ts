// SAMPLE-APP ONLY. A real partner receives webhooks on the backend and never
// surfaces them in the browser. These calls exist so the mini-app's Webhooks
// panel can poll, clear, and simulate deliveries for demonstration.
import { backendUrl } from "../config";

export interface WebhookEvent {
  receivedAt: string;
  verified: boolean;
  signature: string | null;
  payload: unknown;
}

/** Read the webhook events the backend receiver has seen, newest first. */
export async function getWebhookEvents(): Promise<WebhookEvent[]> {
  const response = await fetch(`${backendUrl}/webhooks/events`);
  if (!response.ok) {
    return [];
  }
  const data = (await response.json()) as { events: WebhookEvent[] };
  return data.events;
}

/** Trigger a local, correctly signed webhook delivery to the receiver. */
export async function simulateWebhook(): Promise<void> {
  await fetch(`${backendUrl}/dev/simulate-webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "ClaimReceived" }),
  });
}

/** Clear the backend's received-webhook buffer. */
export async function clearWebhookEvents(): Promise<void> {
  await fetch(`${backendUrl}/webhooks/events`, { method: "DELETE" });
}
