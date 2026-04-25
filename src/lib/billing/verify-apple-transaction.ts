import {
  APIError,
  APIException,
  AppStoreServerAPIClient,
  Environment,
  SignedDataVerifier,
  Type,
} from "@apple/app-store-server-library";
import fs from "fs";
import type { AppleIapEnvConfig } from "./apple-iap-config";

export type VerifiedAppleSubscription = {
  originalTransactionId: string;
  transactionId: string;
  productId: string;
  bundleId: string;
  purchaseDateMs: number;
  expiresDateMs: number | null;
  environment: string;
};

const RETRY_API_ERRORS = new Set<number>([
  APIError.TRANSACTION_ID_NOT_FOUND,
  APIError.ORIGINAL_TRANSACTION_ID_NOT_FOUND,
  APIError.ORIGINAL_TRANSACTION_ID_NOT_FOUND_RETRYABLE,
]);

/**
 * Apple: önce production API, 404 işlem yoksa sandbox (App Review satın almaları sandbox’tadır).
 */
async function fetchSignedTransactionInfo(
  cfg: AppleIapEnvConfig,
  txId: string,
): Promise<{ signed: string; storeEnvironment: Environment }> {
  let lastError: unknown;
  for (const storeEnvironment of [Environment.PRODUCTION, Environment.SANDBOX]) {
    const api = new AppStoreServerAPIClient(
      cfg.signingKeyPem,
      cfg.keyId,
      cfg.issuerId,
      cfg.bundleId,
      storeEnvironment,
    );
    try {
      const info = await api.getTransactionInfo(txId);
      const signed = info.signedTransactionInfo;
      if (signed) {
        return { signed, storeEnvironment };
      }
    } catch (e) {
      lastError = e;
      if (e instanceof APIException && e.apiError != null && RETRY_API_ERRORS.has(e.apiError)) {
        continue;
      }
      throw e;
    }
  }
  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new Error("Apple işlemi bulunamadı.");
}

export async function verifyAppleSubscriptionTransaction(
  cfg: AppleIapEnvConfig,
  transactionIdFromClient: string,
): Promise<VerifiedAppleSubscription> {
  const txId = transactionIdFromClient.trim();
  if (!/^\d+$/.test(txId)) {
    throw new Error("Geçersiz işlem numarası.");
  }

  const { signed, storeEnvironment } = await fetchSignedTransactionInfo(cfg, txId);

  if (storeEnvironment === Environment.PRODUCTION && cfg.appAppleId == null) {
    throw new Error(
      "Production ortamında satın alma doğrulanamadı: APPLE_APP_APPLE_ID eksik (App Store Connect → Uygulama → Genel Bilgi → Apple ID).",
    );
  }

  const rootDer = fs.readFileSync(cfg.rootCaPath);
  const verifier = new SignedDataVerifier(
    [rootDer],
    cfg.enableOnlineChecks,
    storeEnvironment,
    cfg.bundleId,
    cfg.appAppleId,
  );

  const decoded = await verifier.verifyAndDecodeTransaction(signed);

  if (decoded.revocationDate) {
    throw new Error("Bu işlem iptal edilmiş veya iade edilmiş.");
  }

  if (decoded.bundleId && decoded.bundleId !== cfg.bundleId) {
    throw new Error("Bundle kimliği uyuşmuyor.");
  }

  if (decoded.productId !== cfg.productId) {
    throw new Error("Ürün kimliği beklenen abonelik ile eşleşmiyor.");
  }

  const t = decoded.type;
  const looksLikeSubscription =
    decoded.expiresDate != null ||
    t === Type.AUTO_RENEWABLE_SUBSCRIPTION ||
    t === Type.NON_RENEWING_SUBSCRIPTION ||
    t === "Auto-Renewable Subscription" ||
    t === "Non-Renewing Subscription";
  if (!looksLikeSubscription) {
    throw new Error("Bu ürün türü abonelik değil.");
  }

  const originalTransactionId = decoded.originalTransactionId?.trim();
  const transactionId = decoded.transactionId?.trim();
  if (!originalTransactionId || !transactionId) {
    throw new Error("Apple yanıtında işlem kimlikleri eksik.");
  }

  return {
    originalTransactionId,
    transactionId,
    productId: decoded.productId!,
    bundleId: decoded.bundleId ?? cfg.bundleId,
    purchaseDateMs: decoded.purchaseDate ?? Date.now(),
    expiresDateMs: decoded.expiresDate ?? null,
    environment: String(decoded.environment ?? storeEnvironment),
  };
}
