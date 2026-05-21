import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

export type CheckoutPendingPayload = {
  companyName: string;
  email: string;
  password: string;
  /** `+905xxxxxxxxxx`; hoş geldin SMS için */
  ownerPhoneE164?: string;
};

const SALT = Buffer.from("liftkontrol-iyzico-pending-v1", "utf8");

function deriveKey(): Buffer {
  const secret = process.env.CHECKOUT_PENDING_SECRET?.trim();
  if (!secret || secret.length < 16) {
    throw new Error(
      "CHECKOUT_PENDING_SECRET eksik veya çok kısa (en az 16 karakter; önerilen: rasgele 32+).",
    );
  }
  return scryptSync(secret, SALT, 32);
}

/** AES-256-GCM; ciphertext bytes = enciphered plaintext || auth tag (16 bytes), stored base64 in Postgres. */
export function sealCheckoutPendingPayload(payload: CheckoutPendingPayload): {
  ciphertextB64: string;
  nonceB64: string;
} {
  const key = deriveKey();
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const plain = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  const ciphertext = Buffer.concat([encrypted, tag]);
  return {
    ciphertextB64: ciphertext.toString("base64"),
    nonceB64: nonce.toString("base64"),
  };
}

export function unsealCheckoutPendingPayload(ciphertextB64: string, nonceB64: string): CheckoutPendingPayload {
  const ciphertext = Buffer.from(ciphertextB64, "base64");
  const nonce = Buffer.from(nonceB64, "base64");
  const key = deriveKey();
  if (ciphertext.length < 17) {
    throw new Error("Geçersiz şifreli yük.");
  }
  const tagLength = 16;
  const enc = ciphertext.subarray(0, ciphertext.length - tagLength);
  const tag = ciphertext.subarray(ciphertext.length - tagLength);
  const decipher = createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(enc), decipher.final()]);
  const parsed = JSON.parse(plain.toString("utf8")) as Record<string, unknown>;
  if (
    typeof parsed.companyName !== "string" ||
    typeof parsed.email !== "string" ||
    typeof parsed.password !== "string"
  ) {
    throw new Error("Geçersiz ödeme oturumu.");
  }
  const ownerPhoneE164 =
    typeof parsed.ownerPhoneE164 === "string" && parsed.ownerPhoneE164.trim()
      ? parsed.ownerPhoneE164.trim()
      : undefined;
  return {
    companyName: parsed.companyName,
    email: parsed.email,
    password: parsed.password,
    ...(ownerPhoneE164 ? { ownerPhoneE164 } : {}),
  };
}

export function isCheckoutPendingCryptoConfigured(): boolean {
  const secret = process.env.CHECKOUT_PENDING_SECRET?.trim();
  return Boolean(secret && secret.length >= 16);
}
