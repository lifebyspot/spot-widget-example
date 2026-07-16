/* global SpotWidget */
// Plain-JS integration of the core Spot widget. Mirrors the React sample's
// behavior without a framework or build step.

const config = window.SPOT_CONFIG;

// The UMD build exposes the class as SpotWidget.default, not SpotWidget itself.
const SpotWidgetClass = SpotWidget.default;

function getElement(id) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element #${id}`);
  }
  return element;
}

function isoDaysFromNow(days) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return new Date(Date.now() + days * millisecondsPerDay).toISOString();
}

function buildQuoteRequest(productPrice) {
  const product = config.product;
  return {
    productPrice,
    productType: product.productType,
    productDuration: product.productDuration,
    productId: product.productId,
    productName: "Sample Booking",
    cartId: "example-cart",
    cartName: "Sample Cart",
    eventType: product.eventType,
    currencyCode: "USD",
    startDate: isoDaysFromNow(product.startOffsetDays),
    endDate: isoDaysFromNow(product.startOffsetDays + product.coverageDays),
    hostCountry: "US",
    hostCountryState: "TX",
    destinations: ["US"],
    isPartialPayment: false,
  };
}

// --- small view helpers -----------------------------------------------------

function addEventLogEntry(label, detail) {
  const list = getElement("event-log");
  const item = document.createElement("li");
  item.className = "log__item";
  const meta = document.createElement("div");
  meta.className = "log__meta";
  meta.innerHTML = `<span class="log__label"></span><span class="log__time"></span>`;
  meta.querySelector(".log__label").textContent = label;
  meta.querySelector(".log__time").textContent = new Date().toLocaleTimeString();
  item.appendChild(meta);
  if (detail !== undefined) {
    const pre = document.createElement("pre");
    pre.className = "log__detail";
    pre.textContent = JSON.stringify(detail, null, 2);
    item.appendChild(pre);
  }
  list.prepend(item);
}

function showWidgetNotice(message) {
  const notice = getElement("widget-notice");
  notice.textContent = message;
  notice.hidden = false;
}

function clearWidgetNotice() {
  getElement("widget-notice").hidden = true;
}

async function postJson(path, body) {
  const response = await fetch(`${config.backendUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let parsed = null;
  try {
    parsed = await response.json();
  } catch {
    // leave null when the response is not JSON
  }
  return { ok: response.ok, status: response.status, body: parsed };
}

// --- widget lifecycle -------------------------------------------------------

let currentProductPrice = config.product.productPrice;

getElement("env-badge").textContent = `env: ${config.environment}`;
getElement("partner-badge").textContent = `partner: ${config.partnerId.slice(0, 8)}...`;
getElement("productPrice").value = String(currentProductPrice);

const widget = new SpotWidgetClass({
  location: "#spot-widget",
  showTable: false,
  apiConfig: {
    environment: config.environment,
    partnerId: config.partnerId,
  },
  quoteRequestData: buildQuoteRequest(currentProductPrice),
  callbacks: {
    onQuoteRetrieved: (quote) => {
      clearWidgetNotice();
      addEventLogEntry("onQuoteRetrieved", quote);
    },
    onOptIn: (data) => addEventLogEntry("onOptIn (accepted)", data),
    onOptOut: (data) => addEventLogEntry("onOptOut (declined)", data),
    onError: (error) => {
      addEventLogEntry("onError", error);
    },
    noMatchingQuote: (data) => {
      showWidgetNotice(
        "The API returned NO_MATCHING_QUOTE. Adjust the product config so the booking matches an offer.",
      );
      addEventLogEntry("noMatchingQuote", data);
    },
  },
});

getElement("update-quote").addEventListener("click", async () => {
  currentProductPrice = Number(getElement("productPrice").value);
  clearWidgetNotice();
  addEventLogEntry("updateQuote() called", { productPrice: currentProductPrice });
  const success = await widget.updateQuote(buildQuoteRequest(currentProductPrice));
  addEventLogEntry("updateQuote() resolved", { success });
});

getElement("clear-events").addEventListener("click", () => {
  getElement("event-log").innerHTML = "";
});

// --- checkout: send the selection to the backend ----------------------------

getElement("checkout").addEventListener("click", async () => {
  if (!widget.validateSelection()) {
    return; // widget renders its own inline error
  }
  const selection = widget.getSelection();
  if (!selection || !selection.quoteId) {
    return;
  }
  addEventLogEntry("Checkout: selection read via getSelection()", selection);

  const accepting = selection.status === "QUOTE_ACCEPTED";
  const purchaser = {
    firstName: getElement("firstName").value,
    lastName: getElement("lastName").value,
    email: getElement("email").value,
  };
  const result = accepting
    ? await postJson("/accept", {
        quoteId: selection.quoteId,
        productPrice: currentProductPrice,
        purchaser,
      })
    : await postJson("/decline", { quoteId: selection.quoteId });

  const panel = getElement("result-panel");
  panel.hidden = false;
  getElement("result-title").textContent = accepting
    ? "Accept via backend"
    : "Decline via backend";
  const status = getElement("result-status");
  status.textContent = `Backend responded HTTP ${result.status}${result.ok ? " (success)" : ""}`;
  status.className = result.ok ? "notice notice--ok" : "notice notice--error";
  getElement("result-body").textContent = JSON.stringify(result.body, null, 2);
  addEventLogEntry(accepting ? "Backend /accept response" : "Backend /decline response", result);
});

// --- webhooks (SAMPLE-APP ONLY) ---------------------------------------------
// A real integration receives webhooks on the backend and never surfaces them
// in the browser. This block only feeds the demo's Webhooks panel.

async function refreshWebhooks() {
  try {
    const response = await fetch(`${config.backendUrl}/webhooks/events`);
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    const list = getElement("webhook-log");
    list.innerHTML = "";
    for (const event of data.events) {
      const enrollment = event.payload && event.payload.enrollment;
      const item = document.createElement("li");
      item.className = "log__item";
      const meta = document.createElement("div");
      meta.className = "log__meta";
      const tagClass = event.verified ? "tag tag--ok" : "tag tag--bad";
      const tagText = event.verified ? "signature valid" : "signature invalid";
      meta.innerHTML =
        `<span class="log__label">${(enrollment && enrollment.status) || "webhook"} ` +
        `<span class="${tagClass}">${tagText}</span></span>` +
        `<span class="log__time">${new Date(event.receivedAt).toLocaleTimeString()}</span>`;
      item.appendChild(meta);
      const pre = document.createElement("pre");
      pre.className = "log__detail";
      pre.textContent = JSON.stringify(event.payload, null, 2);
      item.appendChild(pre);
      list.appendChild(item);
    }
  } catch {
    // backend not running yet
  }
}

getElement("simulate-webhook").addEventListener("click", async () => {
  await postJson("/dev/simulate-webhook", { status: "ClaimReceived" });
  refreshWebhooks();
});

refreshWebhooks();
setInterval(refreshWebhooks, 3000);
