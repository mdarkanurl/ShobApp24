import crypto from "crypto";
import { verifyGitHubWebhook } from "./verify-webhook-request";

describe("verifyGitHubWebhook", () => {
  const secret = "super-secret";
  const payload = JSON.stringify({
    action: "opened",
    repository: {
      id: 1,
    },
  });

  const buildSignature = (body: string | Buffer) =>
    `sha256=${crypto.createHmac("sha256", secret).update(body).digest("hex")}`;

  it("returns true when the signature matches the payload", () => {
    const signature = buildSignature(payload);

    expect(verifyGitHubWebhook(payload, signature, secret)).toBe(true);
  });

  it("returns true for buffer payloads with a valid signature", () => {
    const bufferPayload = Buffer.from(payload, "utf-8");
    const signature = buildSignature(bufferPayload);

    expect(verifyGitHubWebhook(bufferPayload, signature, secret)).toBe(true);
  });

  it("returns false when the header is missing", () => {
    expect(verifyGitHubWebhook(payload, undefined, secret)).toBe(false);
  });

  it("returns false when the secret is missing", () => {
    expect(verifyGitHubWebhook(payload, buildSignature(payload), "")).toBe(false);
  });

  it("returns false when the payload is not a string or buffer", () => {
    expect(
      verifyGitHubWebhook({ payload } as any, buildSignature(payload), secret)
    ).toBe(false);
  });

  it("returns false when the signature prefix is invalid", () => {
    expect(
      verifyGitHubWebhook(
        payload,
        buildSignature(payload).replace("sha256=", "sha1="),
        secret
      )
    ).toBe(false);
  });

  it("returns false when the signature is not valid hex", () => {
    expect(verifyGitHubWebhook(payload, "sha256=xyz", secret)).toBe(false);
  });

  it("returns false when the signature length does not match the digest", () => {
    expect(verifyGitHubWebhook(payload, "sha256=abcd", secret)).toBe(false);
  });

  it("returns false when the signature does not match", () => {
    const invalidSignature = `sha256=${"0".repeat(64)}`;

    expect(verifyGitHubWebhook(payload, invalidSignature, secret)).toBe(false);
  });
});
