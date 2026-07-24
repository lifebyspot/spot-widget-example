import { useState } from "react";
import { buildDefaultBooking, type Booking, type Purchaser } from "./types";
import { QuoteForm } from "./components/QuoteForm";
import { PurchaserForm } from "./components/PurchaserForm";

export function App() {
  const [booking, setBooking] = useState<Booking>(buildDefaultBooking);
  const [purchaser, setPurchaser] = useState<Purchaser>({
    firstName: "Test",
    lastName: "Purchaser",
    email: "test.purchaser@example.com",
  });
  const [placed, setPlaced] = useState(false);

  function handleCheckout() {
    // The starting app just completes the purchase locally. The Spot widget and
    // the accept/decline call are added step by step in the Quickstart guide.
    setPlaced(true);
  }

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1>Spot widget example</h1>
          <p className="muted">
            A sample partner checkout. This is the starting point, before the
            Spot widget is added.
          </p>
        </div>
      </header>

      <main className="app__grid">
        <div className="app__column">
          <QuoteForm value={booking} onChange={setBooking} />
          <PurchaserForm value={purchaser} onChange={setPurchaser} />
        </div>

        <div className="app__column">
          <section className="panel">
            <div className="panel__header">
              <h2>Checkout</h2>
            </div>
            <p className="muted">
              Review the booking and place the order. The Spot widget will slot
              in here in the next step of the guide.
            </p>
            <button className="button button--primary" onClick={handleCheckout}>
              Proceed to checkout
            </button>
            {placed && (
              <p className="notice notice--ok">
                Order placed for {purchaser.firstName} {purchaser.lastName}:{" "}
                {booking.productName} ({booking.currencyCode}{" "}
                {booking.productPrice}).
              </p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
