import crypto from "crypto";

const SIGNATURE_PREFIX = "sha256=";

export function verifyGitHubWebhook(
  payload: string | Buffer,
  signatureHeader: string | undefined,
  secret: string
): boolean {
  if (!signatureHeader || !secret) {
    return false;
  }

  if (!Buffer.isBuffer(payload) && typeof payload !== "string") {
    return false;
  }

  if (!signatureHeader.startsWith(SIGNATURE_PREFIX)) {
    return false;
  }

  const signature = signatureHeader.slice(SIGNATURE_PREFIX.length);
  if (!/^[0-9a-fA-F]+$/.test(signature) || signature.length % 2 !== 0) {
    return false;
  }

  const hmac = crypto.createHmac("sha256", secret);
  const digest = hmac.update(payload).digest("hex");

  const sigBuffer = Buffer.from(signature, "hex");
  const digestBuffer = Buffer.from(digest, "hex");

  if (sigBuffer.length !== digestBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuffer, digestBuffer);
}
