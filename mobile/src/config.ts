import Constants from "expo-constants";
import { Platform } from "react-native";

const API_PORT = 4000;

function parseHostFromConnection(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  if (!value.includes("://")) {
    return value.split(":")[0] || null;
  }

  try {
    return new URL(value).hostname || null;
  } catch {
    return null;
  }
}

function getDevMachineHost(): string | null {
  const candidates = [
    Constants.expoConfig?.hostUri,
    Constants.expoGoConfig?.debuggerHost,
    Constants.linkingUri,
    Constants.experienceUrl,
    Constants.manifest?.debuggerHost,
  ];

  for (const candidate of candidates) {
    const host = parseHostFromConnection(candidate);
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return host;
    }
  }

  return null;
}

function getApiHost(): string {
  const devHost = getDevMachineHost();
  if (devHost) {
    return devHost;
  }

  if (Platform.OS === "android") {
    return "10.0.2.2";
  }

  return "localhost";
}

const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

export const API_BASE_URL =
  configuredUrl && configuredUrl.length > 0
    ? configuredUrl
    : `http://${getApiHost()}:${API_PORT}`;

export const PREMIUM_PRODUCT_IDS = [
  process.env.EXPO_PUBLIC_PREMIUM_PRODUCT_ID?.trim() || "com.bitkibakim.app.premium.monthly",
];

const LEGAL_BASE_URL =
  process.env.EXPO_PUBLIC_LEGAL_BASE_URL?.trim() ||
  "https://akadirkutlu.github.io/bitki-bakim";

export const PRIVACY_POLICY_URL =
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL?.trim() || `${LEGAL_BASE_URL}/privacy.html`;

export const TERMS_OF_USE_URL =
  process.env.EXPO_PUBLIC_TERMS_OF_USE_URL?.trim() || `${LEGAL_BASE_URL}/terms.html`;

export const MANAGE_SUBSCRIPTIONS_URL = "https://apps.apple.com/account/subscriptions";
