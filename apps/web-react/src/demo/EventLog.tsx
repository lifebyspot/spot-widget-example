// SAMPLE-APP ONLY. A debug panel that lists the widget's callbacks as they
// fire. Useful for understanding the widget's contract while integrating, but
// not something a production integration ships.

export interface LogEntry {
  id: number;
  time: string;
  label: string;
  detail?: unknown;
}

interface EventLogProps {
  entries: LogEntry[];
  onClear: () => void;
}

export function EventLog({ entries, onClear }: EventLogProps) {
  return (
    <section className="panel">
      <div className="panel__header">
        <h2>Widget events</h2>
        <button type="button" className="button button--ghost" onClick={onClear}>
          Clear
        </button>
      </div>
      {entries.length === 0 ? (
        <p className="muted">
          No events yet. Change a quote field or pick an option in the widget.
        </p>
      ) : (
        <ul className="log">
          {entries.map((entry) => (
            <li key={entry.id} className="log__item">
              <div className="log__meta">
                <span className="log__label">{entry.label}</span>
                <span className="log__time">{entry.time}</span>
              </div>
              {entry.detail !== undefined && (
                <pre className="log__detail">
                  {JSON.stringify(entry.detail, null, 2)}
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
