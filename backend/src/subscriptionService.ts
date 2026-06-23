import type { User } from "./types";
import type { VerifiedAppleSubscription } from "./appleSubscriptions";

export function applySubscriptionToUser(
  user: User,
  subscription: VerifiedAppleSubscription
): void {
  user.appleOriginalTransactionId = subscription.originalTransactionId;
  user.subscriptionProductId = subscription.productId;
  user.subscriptionExpiresAt = subscription.expiresDate ?? undefined;
  user.plan = subscription.isActive ? "premium" : "free";
}

export function downgradeUserSubscription(user: User): void {
  user.plan = "free";
  user.subscriptionExpiresAt = new Date().toISOString();
}

export function findUserByOriginalTransactionId(
  users: User[],
  originalTransactionId: string
): User | undefined {
  return users.find((user) => user.appleOriginalTransactionId === originalTransactionId);
}

export function findConflictingSubscriptionOwner(
  users: User[],
  originalTransactionId: string,
  currentUserId: string
): User | undefined {
  return users.find(
    (user) =>
      user.id !== currentUserId &&
      user.appleOriginalTransactionId === originalTransactionId &&
      user.plan === "premium"
  );
}
