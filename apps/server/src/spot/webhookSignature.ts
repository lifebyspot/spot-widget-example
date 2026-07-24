import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "../config.js";

/**
 * Verify Spot's X-Spot-Signature exactly as the platform produces it:
 * hex HMAC-SHA256 over the RAW request body bytes, keyed by
 * `${partnerId}:${hmacSecret}`. The raw bytes matter: re-serializing the parsed
 * JSON could reorder keys or reformat dates and break the comparison.
 */
export function verifySignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
): boolean {
  if (!signatureHeader) {
    return false;
  }
  const key = `${config.partnerId}:${config.webhookHmacSecret}`;
  const expectedHex = createHmac("sha256", key).update(rawBody).digest("hex");

  const expected = Buffer.from(expectedHex, "hex");
  const provided = Buffer.from(signatureHeader, "hex");
  if (expected.length === 0 || expected.length !== provided.length) {
    return false;
  }
  return timingSafeEqual(expected, provided);
}
