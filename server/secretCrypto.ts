import crypto from "node:crypto";
import { ENV } from "./_core/env";

function encryptionKey() {
  if (!ENV.cookieSecret) throw new Error("Cookie secret is unavailable for server-side secret encryption");
  return crypto.createHash("sha256").update(ENV.cookieSecret).digest();
}

export function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptSecret(value: string) {
  const [ivValue, tagValue, encryptedValue] = value.split(".");
  if (!ivValue || !tagValue || !encryptedValue) throw new Error("Stored secret format is invalid");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64")), decipher.final()]).toString("utf8");
}

export function maskSecret(value: string) {
  const suffix = value.slice(-4);
  return `${"•".repeat(Math.max(8, Math.min(value.length - 4, 16)))}${suffix}`;
}
