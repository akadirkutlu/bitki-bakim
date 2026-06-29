import type { AuthProvider, PublicUser, User } from "./types";

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan,
    authProvider: user.authProvider,
  };
}

export function normalizeUser(user: User): User {
  return {
    ...user,
    authProvider: user.authProvider ?? "email",
  };
}

export function findUserByProviderId(
  users: User[],
  provider: Exclude<AuthProvider, "email">,
  providerId: string
): User | undefined {
  if (provider === "google") {
    return users.find((user) => user.googleId === providerId);
  }

  return users.find((user) => user.appleId === providerId);
}

export function findUserByEmail(users: User[], email: string): User | undefined {
  const normalized = email.trim().toLowerCase();
  return users.find((user) => user.email.trim().toLowerCase() === normalized);
}

type SocialLinkInput = {
  provider: Exclude<AuthProvider, "email">;
  providerId: string;
  email: string;
  name: string;
};

export function isPlaceholderDisplayName(name: string, email?: string): boolean {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length < 2) {
    return true;
  }

  if (trimmed === "Apple User" || trimmed === "Google User" || trimmed === "Guest") {
    return true;
  }

  if (!email) {
    return false;
  }

  const at = email.indexOf("@");
  if (at < 0) {
    return false;
  }

  const local = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase();
  if (
    (domain.endsWith("privaterelay.appleid.com") || domain === "privaterelay.local") &&
    trimmed.toLowerCase() === local.toLowerCase()
  ) {
    return true;
  }

  if (local.startsWith("apple-") && trimmed.toLowerCase() === local.toLowerCase()) {
    return true;
  }

  return false;
}

function shouldReplaceDisplayName(current: string, next: string, email?: string): boolean {
  const trimmedNext = next.trim();
  if (!trimmedNext) {
    return false;
  }

  const trimmedCurrent = current.trim();
  if (trimmedCurrent.length < 2) {
    return !isPlaceholderDisplayName(trimmedNext, email) || trimmedNext === "Apple User";
  }

  if (isPlaceholderDisplayName(trimmedCurrent, email)) {
    return !isPlaceholderDisplayName(trimmedNext, email) || trimmedNext === "Apple User";
  }

  return false;
}

export function upsertSocialUser(
  users: User[],
  input: SocialLinkInput,
  guestUser?: User
): User {
  const byProvider = findUserByProviderId(users, input.provider, input.providerId);
  if (byProvider) {
    if (shouldReplaceDisplayName(byProvider.name, input.name, byProvider.email)) {
      byProvider.name = input.name.trim();
    }
    return byProvider;
  }

  const byEmail = findUserByEmail(users, input.email);
  if (byEmail) {
    if (input.provider === "google") {
      byEmail.googleId = input.providerId;
    } else {
      byEmail.appleId = input.providerId;
    }

    if (shouldReplaceDisplayName(byEmail.name, input.name, byEmail.email)) {
      byEmail.name = input.name.trim();
    }

    return byEmail;
  }

  // Convert an existing guest session into a real account in place so the
  // user keeps the plants they created while browsing without an account.
  if (guestUser && guestUser.authProvider === "guest") {
    guestUser.email = input.email;
    guestUser.authProvider = input.provider;
    if (input.name && !isPlaceholderDisplayName(input.name, input.email)) {
      guestUser.name = input.name.trim();
    }
    if (input.provider === "google") {
      guestUser.googleId = input.providerId;
    } else {
      guestUser.appleId = input.providerId;
    }
    return guestUser;
  }

  const user: User = {
    id: crypto.randomUUID(),
    email: input.email,
    name: input.name,
    plan: "free",
    createdAt: new Date().toISOString(),
    authProvider: input.provider,
    ...(input.provider === "google"
      ? { googleId: input.providerId }
      : { appleId: input.providerId }),
  };

  users.push(user);
  return user;
}

export function socialProviderLabel(provider: AuthProvider): string {
  if (provider === "google") {
    return "Google";
  }

  if (provider === "apple") {
    return "Apple";
  }

  if (provider === "guest") {
    return "guest";
  }

  return "email and password";
}
