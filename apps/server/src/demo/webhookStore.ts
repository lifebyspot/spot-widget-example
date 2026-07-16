// SAMPLE-APP ONLY. This in-memory buffer exists so the mini-app's Webhooks
// panel has something to display. A real integration processes each webhook
// (persist it, update an order, etc.) rather than keeping a viewer buffer.

export interface StoredWebhookEvent {
  receivedAt: string;
  verified: boolean;
  signature: string | null;
  payload: unknown;
}

const events: StoredWebhookEvent[] = [];
const MAX_EVENTS = 50;

export function recordEvent(event: StoredWebhookEvent): void {
  events.unshift(event);
  if (events.length > MAX_EVENTS) {
    events.length = MAX_EVENTS;
  }
}

export function listEvents(): StoredWebhookEvent[] {
  return events;
}

export function clearEvents(): void {
  events.length = 0;
}
