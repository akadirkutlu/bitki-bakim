import { Platform } from "react-native";
import {
  finishTransaction,
  getActiveSubscriptions,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  restorePurchases,
  fetchProducts,
  type ProductSubscription,
  type Purchase,
} from "expo-iap";
import { PREMIUM_PRODUCT_IDS } from "../config";
import { verifyAppleSubscription } from "./api";
import type { User } from "../types";

let connectionInitialized = false;

export async function initIapConnection(): Promise<boolean> {
  if (Platform.OS !== "ios") {
    return false;
  }

  if (connectionInitialized) {
    return true;
  }

  try {
    await initConnection();
    connectionInitialized = true;
    return true;
  } catch {
    return false;
  }
}

export async function fetchPremiumProducts(): Promise<ProductSubscription[]> {
  if (Platform.OS !== "ios") {
    return [];
  }

  await initIapConnection();
  const products = (await fetchProducts({
    skus: PREMIUM_PRODUCT_IDS,
    type: "subs",
  })) as ProductSubscription[] | null;

  return products ?? [];
}

function isPremiumPurchase(purchase: Purchase): boolean {
  return PREMIUM_PRODUCT_IDS.includes(purchase.productId);
}

async function verifySignedTransactionWithBackend(
  token: string,
  signedTransaction: string,
  purchase?: Purchase
): Promise<User> {
  const { user } = await verifyAppleSubscription(token, signedTransaction);
  if (purchase) {
    await finishTransaction({ purchase, isConsumable: false });
  }
  return user;
}

async function verifyPurchaseWithBackend(token: string, purchase: Purchase): Promise<User> {
  const signedTransaction = purchase.purchaseToken;
  if (!signedTransaction) {
    throw new Error("Missing Apple purchase token");
  }

  return verifySignedTransactionWithBackend(token, signedTransaction, purchase);
}

async function findPremiumSignedTransaction(): Promise<string | null> {
  const activeSubscriptions = await getActiveSubscriptions(PREMIUM_PRODUCT_IDS);
  const active = activeSubscriptions.find(
    (subscription) => subscription.isActive && PREMIUM_PRODUCT_IDS.includes(subscription.productId)
  );

  if (active?.purchaseToken) {
    return active.purchaseToken;
  }

  const purchases = await getAvailablePurchases({
    onlyIncludeActiveItemsIOS: true,
  });

  const purchase = purchases.find(
    (item) => isPremiumPurchase(item) && Boolean(item.purchaseToken)
  );

  return purchase?.purchaseToken ?? null;
}

export async function restorePremiumPurchases(token: string): Promise<User | null> {
  if (Platform.OS !== "ios") {
    return null;
  }

  await initIapConnection();
  await restorePurchases();
  const signedTransaction = await findPremiumSignedTransaction();

  if (!signedTransaction) {
    return null;
  }

  return verifySignedTransactionWithBackend(token, signedTransaction);
}

export async function syncExistingPremiumPurchase(token: string): Promise<User | null> {
  if (Platform.OS !== "ios") {
    return null;
  }

  await initIapConnection();
  const signedTransaction = await findPremiumSignedTransaction();

  if (!signedTransaction) {
    return null;
  }

  return verifySignedTransactionWithBackend(token, signedTransaction);
}

export async function purchasePremium(token: string, appAccountToken: string): Promise<User> {
  if (Platform.OS !== "ios") {
    throw new Error("In-app purchases are only available on iOS");
  }

  await initIapConnection();
  const productId = PREMIUM_PRODUCT_IDS[0];

  return new Promise((resolve, reject) => {
    const removeUpdated = purchaseUpdatedListener(async (purchase) => {
      if (!isPremiumPurchase(purchase)) {
        return;
      }

      removeUpdated.remove();
      removeError.remove();

      try {
        const user = await verifyPurchaseWithBackend(token, purchase);
        resolve(user);
      } catch (error) {
        reject(error);
      }
    });

    const removeError = purchaseErrorListener((error) => {
      removeUpdated.remove();
      removeError.remove();
      reject(new Error(error.message));
    });

    requestPurchase({
      type: "subs",
      request: {
        apple: {
          sku: productId,
          appAccountToken,
        },
      },
    }).catch((error) => {
      removeUpdated.remove();
      removeError.remove();
      reject(error);
    });
  });
}
