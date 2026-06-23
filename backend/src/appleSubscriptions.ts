import https from "node:https";
import {
  Environment,
  NotificationTypeV2,
  SignedDataVerifier,
  type JWSTransactionDecodedPayload,
  type ResponseBodyV2DecodedPayload,
} from "@apple/app-store-server-library";
import type { PlanType } from "./types";

export type VerifiedAppleSubscription = {
  isActive: boolean;
  productId: string;
  originalTransactionId: string;
  expiresDate: string | null;
  appAccountToken: string | null;
};

const APPLE_ROOT_CERT_URLS = [
  "https://www.apple.com/appleca/AppleIncRootCertificate.cer",
  "https://www.apple.com/certificateauthority/AppleRootCA-G2.cer",
  "https://www.apple.com/certificateauthority/AppleRootCA-G3.cer",
];

let cachedRootCertificates: Buffer[] | null = null;
let cachedVerifier: SignedDataVerifier | null = null;

function getAppleEnvironment(): Environment {
  const value = process.env.APPLE_ENVIRONMENT?.trim().toLowerCase();
  return value === "production" ? Environment.PRODUCTION : Environment.SANDBOX;
}

function isAppleConfigured(): boolean {
  return Boolean(
    process.env.APPLE_BUNDLE_ID?.trim() &&
      process.env.APPLE_KEY_ID?.trim() &&
      process.env.APPLE_ISSUER_ID?.trim() &&
      process.env.APPLE_PRIVATE_KEY?.trim()
  );
}

function downloadCertificate(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download Apple root certificate: ${url}`));
          response.resume();
          return;
        }

        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => resolve(Buffer.concat(chunks)));
        response.on("error", reject);
      })
      .on("error", reject);
  });
}

async function loadAppleRootCertificates(): Promise<Buffer[]> {
  if (cachedRootCertificates) {
    return cachedRootCertificates;
  }

  cachedRootCertificates = await Promise.all(
    APPLE_ROOT_CERT_URLS.map((url) => downloadCertificate(url))
  );
  return cachedRootCertificates;
}

async function getVerifier(): Promise<SignedDataVerifier> {
  if (cachedVerifier) {
    return cachedVerifier;
  }

  const bundleId = process.env.APPLE_BUNDLE_ID?.trim();
  if (!bundleId) {
    throw new Error("APPLE_BUNDLE_ID is not configured");
  }

  const appAppleIdRaw = process.env.APPLE_APP_ID?.trim();
  const environment = getAppleEnvironment();
  const appAppleId =
    environment === Environment.PRODUCTION && appAppleIdRaw
      ? Number(appAppleIdRaw)
      : undefined;

  if (environment === Environment.PRODUCTION && !appAppleId) {
    throw new Error("APPLE_APP_ID is required in production");
  }

  const appleRootCAs = await loadAppleRootCertificates();
  cachedVerifier = new SignedDataVerifier(
    appleRootCAs,
    true,
    environment,
    bundleId,
    appAppleId
  );
  return cachedVerifier;
}

function isPremiumProductId(productId: string | undefined): boolean {
  if (!productId) {
    return false;
  }

  const configured = process.env.APPLE_PREMIUM_PRODUCT_IDS?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (configured && configured.length > 0) {
    return configured.includes(productId);
  }

  return productId.startsWith("com.bitkibakim.app.premium");
}

function subscriptionFromTransaction(
  transaction: JWSTransactionDecodedPayload
): VerifiedAppleSubscription {
  const now = Date.now();
  const expiresAt = transaction.expiresDate ?? null;
  const isRevoked = Boolean(transaction.revocationDate);
  const isExpired = expiresAt !== null && expiresAt <= now;
  const isPremiumProduct = isPremiumProductId(transaction.productId);

  return {
    isActive: isPremiumProduct && !isRevoked && !isExpired,
    productId: transaction.productId ?? "",
    originalTransactionId: transaction.originalTransactionId ?? transaction.transactionId ?? "",
    expiresDate: expiresAt ? new Date(expiresAt).toISOString() : null,
    appAccountToken: transaction.appAccountToken ?? null,
  };
}

export async function verifyAppleSignedTransaction(
  signedTransaction: string
): Promise<VerifiedAppleSubscription> {
  if (!isAppleConfigured()) {
    throw new Error("Apple subscription verification is not configured");
  }

  const verifier = await getVerifier();
  const transaction = await verifier.verifyAndDecodeTransaction(signedTransaction);
  return subscriptionFromTransaction(transaction);
}

export async function verifyAppleNotification(
  signedPayload: string
): Promise<ResponseBodyV2DecodedPayload> {
  const verifier = await getVerifier();
  return verifier.verifyAndDecodeNotification(signedPayload);
}

export function shouldDowngradeFromNotification(
  notification: ResponseBodyV2DecodedPayload
): boolean {
  const type = notification.notificationType;
  return (
    type === NotificationTypeV2.EXPIRED ||
    type === NotificationTypeV2.REVOKE ||
    type === NotificationTypeV2.REFUND ||
    type === NotificationTypeV2.GRACE_PERIOD_EXPIRED
  );
}

export function shouldUpgradeFromNotification(
  notification: ResponseBodyV2DecodedPayload
): boolean {
  const type = notification.notificationType;
  return (
    type === NotificationTypeV2.SUBSCRIBED ||
    type === NotificationTypeV2.DID_RENEW ||
    type === NotificationTypeV2.OFFER_REDEEMED ||
    type === NotificationTypeV2.REFUND_REVERSED
  );
}

export function planFromSubscriptionActive(isActive: boolean): PlanType {
  return isActive ? "premium" : "free";
}

export { isAppleConfigured, isPremiumProductId };
