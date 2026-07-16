import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root container #root not found");
}

// Note: no React.StrictMode. In dev it intentionally mounts, unmounts, and
// remounts, which would make the widget initialize and re-quote twice and risk
// two live instances. We keep a single, stable widget instance instead.
createRoot(container).render(<App />);
