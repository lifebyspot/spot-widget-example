import type { Purchaser } from "../types";

interface PurchaserFormProps {
  value: Purchaser;
  onChange: (next: Purchaser) => void;
}

/**
 * The purchaser details a partner collects at their own checkout and passes to
 * the accept call. Kept minimal here; a real checkout would gather whatever the
 * offer requires.
 */
export function PurchaserForm({ value, onChange }: PurchaserFormProps) {
  function update(key: keyof Purchaser, next: string) {
    onChange({ ...value, [key]: next });
  }

  return (
    <section className="panel">
      <div className="panel__header">
        <h2>Purchaser</h2>
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="firstName">First name</label>
          <input
            id="firstName"
            type="text"
            value={value.firstName}
            onChange={(event) => update("firstName", event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="lastName">Last name</label>
          <input
            id="lastName"
            type="text"
            value={value.lastName}
            onChange={(event) => update("lastName", event.target.value)}
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={value.email}
          onChange={(event) => update("email", event.target.value)}
        />
      </div>
    </section>
  );
}
