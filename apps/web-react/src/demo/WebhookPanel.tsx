// SAMPLE-APP ONLY. Displays webhooks the backend receiver has verified, and
// offers Simulate/Clear controls. Webhooks are a backend concern in a real
// integration; this browser panel exists only for demonstration.
import { useCallback, useEffect, useState } from "react";
import {
  clearWebhookEvents,
  getWebhookEvents,
  simulateWebhook,
  type WebhookEvent,
} from "./webhookApi";

export function WebhookPanel() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [simulating, setSimulating] = useState(false);

  const refresh = useCallback(() => {
    getWebhookEvents()
      .then(setEvents)
      .catch(() => {
        // backend not running yet; leave events as-is
      });
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, [refresh]);

  async function handleSimulate() {
    setSimulating(true);
    try {
      await simulateWebhook();
      refresh();
    } finally {
      setSimulating(false);
    }
  }

  async function handleClear() {
    await clearWebhookEvents();
    setEvents([]);
  }

  return (
    <section className="panel">
      <div className="panel__header">
        <h2>Webhooks</h2>
        <div className="panel__actions">
          <button
            className="button button--ghost"
            onClick={handleSimulate}
            disabled={simulating}
          >
            {simulating ? "Sending..." : "Simulate delivery"}
          </button>
          <button className="button button--ghost" onClick={handleClear}>
            Clear
          </button>
        </div>
      </div>
      {events.length === 0 ? (
        <p className="muted">
          No webhooks received. Use Simulate delivery to send a signed event to
          the backend receiver.
        </p>
      ) : (
        <ul className="log">
          {events.map((event, index) => {
            const enrollment = (event.payload as { enrollment?: { status?: string } })
              ?.enrollment;
            return (
              <li key={`${event.receivedAt}-${index}`} className="log__item">
                <div className="log__meta">
                  <span className="log__label">
                    {enrollment?.status ?? "webhook"}{" "}
                    <span
                      className={
                        event.verified ? "tag tag--ok" : "tag tag--bad"
                      }
                    >
                      {event.verified ? "signature valid" : "signature invalid"}
                    </span>
                  </span>
                  <span className="log__time">
                    {new Date(event.receivedAt).toLocaleTimeString()}
                  </span>
                </div>
                <pre className="log__detail">
                  {JSON.stringify(event.payload, null, 2)}
                </pre>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
