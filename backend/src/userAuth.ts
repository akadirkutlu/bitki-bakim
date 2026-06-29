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

export function upsertSocialUser(
  users: User[],
  input: SocialLinkInput,
  guestUser?: User
): User {
  const byProvider = findUserByProviderId(users, input.provider, input.providerId);
  if (byProvider) {
    if (input.name && byProvider.name.length < 2) {
      byProvider.name = input.name;
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

    if (input.name && byEmail.name.length < 2) {
      byEmail.name = input.name;
    }

    return byEmail;
  }

  // Convert an existing guest session into a real account in place so the
  // user keeps the plants they created while browsing without an account.
  if (guestUser && guestUser.authProvider === "guest") {
    guestUser.email = input.email;
    guestUser.authProvider = input.provider;
    if (input.name) {
      guestUser.name = input.name;
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
