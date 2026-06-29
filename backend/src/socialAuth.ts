import { OAuth2Client } from "google-auth-library";
import verifyAppleToken from "verify-apple-id-token";

export type GoogleProfile = {
  googleId: string;
  email: string;
  name: string;
};

export type AppleProfile = {
  appleId: string;
  email: string;
  name: string;
};

function getGoogleClientIds(): string[] {
  const raw = process.env.GOOGLE_CLIENT_IDS ?? process.env.GOOGLE_CLIENT_ID ?? "";
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  const audiences = getGoogleClientIds();

  if (audiences.length === 0) {
    throw new Error("Google sign-in is not configured on the server");
  }

  const client = new OAuth2Client();
  const ticket = await client.verifyIdToken({
    idToken,
    audience: audiences,
  });
  const payload = ticket.getPayload();

  if (!payload?.sub || !payload.email) {
    throw new Error("Invalid Google token");
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name?.trim() || payload.email.split("@")[0] || "Google User",
  };
}

export function deriveAppleFallbackName(email: string): string {
  const at = email.indexOf("@");
  if (at < 0) {
    return "Apple User";
  }

  const local = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase();
  if (
    domain.endsWith("privaterelay.appleid.com") ||
    domain === "privaterelay.local" ||
    local.startsWith("apple-")
  ) {
    return "Apple User";
  }

  return local || "Apple User";
}

function getAppleClientIds(): string[] {
  const raw = process.env.APPLE_CLIENT_IDS ?? process.env.APPLE_CLIENT_ID ?? "";
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function verifyAppleIdentityToken(
  identityToken: string
): Promise<AppleProfile> {
  const clientIds = getAppleClientIds();

  if (clientIds.length === 0) {
    throw new Error("Apple sign-in is not configured on the server");
  }

  let lastError: unknown;

  for (const clientId of clientIds) {
    try {
      const payload = await verifyAppleToken({
        idToken: identityToken,
        clientId,
      });

      if (!payload.sub) {
        throw new Error("Invalid Apple token");
      }

      const email =
        typeof payload.email === "string" && payload.email.length > 0
          ? payload.email
          : `apple-${payload.sub}@privaterelay.local`;

      return {
        appleId: payload.sub,
        email,
        name: deriveAppleFallbackName(email),
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Invalid Apple token");
}
