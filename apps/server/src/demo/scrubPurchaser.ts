import { createHash } from "node:crypto";

export interface Purchaser {
  firstName: string;
  lastName: string;
  email: string;
}

/**
 * SAMPLE-APP ONLY, and only for the public hosted demo.
 *
 * That demo is open to anyone, and some visitors will type a real name and
 * email into the purchaser form. This replaces those values before the accept
 * call leaves for Spot, so nothing personal is stored. The browser keeps what
 * the visitor typed, so the flow still reads as real to them.
 *
 * A real integration must send the actual purchaser. Spot needs it to issue
 * coverage and to reach the customer about a claim. Enabled by
 * DEMO_SCRUB_PURCHASER, which is unset everywhere except the hosted demo.
 */
export function scrubbedPurchaser(transactionId: string): Purchaser {
  // Derived from transactionId so separate demo checkouts stay distinguishable
  // in Spot's records without carrying anything personal. example.com is
  // reserved by RFC 2606, so the address can never reach a real mailbox.
  const tag = createHash("sha256").update(transactionId).digest("hex").slice(0, 10);
  return {
    firstName: "Demo",
    lastName: "Visitor",
    email: `demo+${tag}@example.com`,
  };
}
