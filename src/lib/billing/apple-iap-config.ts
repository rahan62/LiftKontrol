import { Environment } from "@apple/app-store-server-library";
import fs from "fs";
import path from "path";

export type AppleIapEnvConfig = {
  issuerId: string;
  keyId: string;
  signingKeyPem: string;
  bundleId: string;
  productId: string;
  environment: Environment;
  appAppleId?: number;
  rootCaPath: string;
  enableOnlineChecks: boolean;
};

function parseEnvironment(raw: string | undefined): Environment | null {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "sandbox" || v === "development") return Environment.SANDBOX;
  if (v === "production") return Environment.PRODUCTION;
  return null;
}

export function getAppleIapConfigFromEnv(): AppleIapEnvConfig | null {
  const issuerId = process.env.APPLE_ISSUER_ID?.trim();
  const keyId = process.env.APPLE_KEY_ID?.trim();
  const bundleId = process.env.APPLE_IAP_BUNDLE_ID?.trim();
  const productId = process.env.APPLE_IAP_PRODUCT_ID?.trim();
  // İsteğe bağlı; işlem çekme sırası verify-apple-transaction içinde Production → Sandbox.
  const env = parseEnvironment(process.env.APPLE_IAP_ENVIRONMENT) ?? Environment.PRODUCTION;
  if (!issuerId || !keyId || !bundleId || !productId) return null;

  let signingKeyPem = process.env.APPLE_APP_STORE_PRIVATE_KEY?.trim() ?? "";
  if (!signingKeyPem) {
    const p = process.env.APPLE_APP_STORE_PRIVATE_KEY_PATH?.trim();
    if (p) {
      try {
        signingKeyPem = fs.readFileSync(p, "utf8");
      } catch {
        return null;
      }
    }
  }
  if (!signingKeyPem.includes("BEGIN PRIVATE KEY")) return null;

  const rootCaPath =
    process.env.APPLE_ROOT_CA_PATH?.trim() ||
    path.join(process.cwd(), "certs", "AppleRootCA-G3.cer");

  let appAppleId: number | undefined;
  const appIdRaw = process.env.APPLE_APP_APPLE_ID?.trim();
  if (appIdRaw && /^\d+$/.test(appIdRaw)) {
    appAppleId = Number(appIdRaw);
  }

  const enableOnlineChecks =
    process.env.APPLE_IAP_ENABLE_ONLINE_CHECKS?.trim() === "1" ||
    process.env.APPLE_IAP_ENABLE_ONLINE_CHECKS?.trim().toLowerCase() === "true";

  return {
    issuerId,
    keyId,
    signingKeyPem,
    bundleId,
    productId,
    environment: env,
    appAppleId,
    rootCaPath,
    enableOnlineChecks,
  };
}
