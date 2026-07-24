import type { QuoteItem } from "../types";

interface QuoteFormProps {
  value: QuoteItem;
  onChange: (next: QuoteItem) => void;
}

const PRODUCT_TYPES: QuoteItem["productType"][] = ["Trip", "Pass", "Registration"];
const PRODUCT_DURATIONS: QuoteItem["productDuration"][] = [
  "Trip",
  "Daily",
  "Seasonal",
  "Event",
];
const CURRENCIES: QuoteItem["currencyCode"][] = ["USD", "CAD", "GBP", "EUR", "AUD"];

// A date input speaks "YYYY-MM-DD"; the form state stores ISO datetime strings.
function toDateInput(iso: string): string {
  return iso.slice(0, 10);
}
function fromDateInput(value: string): string {
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

/** Editable view of the fields a partner most commonly varies per booking. */
export function QuoteForm({ value, onChange }: QuoteFormProps) {
  function update<Key extends keyof QuoteItem>(key: Key, next: QuoteItem[Key]) {
    onChange({ ...value, [key]: next });
  }

  return (
    <section className="panel">
      <div className="panel__header">
        <h2>Booking details</h2>
      </div>

      <div className="field">
        <label htmlFor="productPrice">Product price</label>
        <input
          id="productPrice"
          type="number"
          min={0}
          value={value.productPrice}
          onChange={(event) => update("productPrice", Number(event.target.value))}
        />
      </div>

      <div className="field">
        <label htmlFor="productName">Product name</label>
        <input
          id="productName"
          type="text"
          value={value.productName}
          onChange={(event) => update("productName", event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="productId">
          Product id (selects which offer matches)
        </label>
        <input
          id="productId"
          type="text"
          value={value.productId}
          onChange={(event) => update("productId", event.target.value)}
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="productType">Product type</label>
          <select
            id="productType"
            value={value.productType}
            onChange={(event) =>
              update("productType", event.target.value as QuoteItem["productType"])
            }
          >
            {PRODUCT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="productDuration">Duration</label>
          <select
            id="productDuration"
            value={value.productDuration}
            onChange={(event) =>
              update(
                "productDuration",
                event.target.value as QuoteItem["productDuration"],
              )
            }
          >
            {PRODUCT_DURATIONS.map((duration) => (
              <option key={duration} value={duration}>
                {duration}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="eventType">Event type</label>
        <input
          id="eventType"
          type="text"
          value={value.eventType}
          onChange={(event) => update("eventType", event.target.value)}
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="startDate">Start date</label>
          <input
            id="startDate"
            type="date"
            value={toDateInput(value.startDate)}
            onChange={(event) =>
              update("startDate", fromDateInput(event.target.value))
            }
          />
        </div>

        <div className="field">
          <label htmlFor="endDate">End date</label>
          <input
            id="endDate"
            type="date"
            value={toDateInput(value.endDate)}
            onChange={(event) =>
              update("endDate", fromDateInput(event.target.value))
            }
          />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="currencyCode">Currency</label>
          <select
            id="currencyCode"
            value={value.currencyCode}
            onChange={(event) =>
              update(
                "currencyCode",
                event.target.value as QuoteItem["currencyCode"],
              )
            }
          >
            {CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="destinations">Destinations (comma separated)</label>
          <input
            id="destinations"
            type="text"
            value={(value.destinations ?? []).join(", ")}
            onChange={(event) =>
              update(
                "destinations",
                event.target.value
                  .split(",")
                  .map((code) => code.trim())
                  .filter(Boolean),
              )
            }
          />
        </div>
      </div>
    </section>
  );
}
