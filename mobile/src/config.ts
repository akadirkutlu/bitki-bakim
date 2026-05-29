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

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? `http://${getApiHost()}:${API_PORT}`;
