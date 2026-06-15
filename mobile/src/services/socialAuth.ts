import Constants from "expo-constants";
import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

let googleConfigured = false;

export function isGoogleSignInConfigured(): boolean {
  return Boolean(webClientId);
}

export function isGoogleSignInNativeAvailable(): boolean {
  return Constants.appOwnership !== "expo";
}

function ensureGoogleConfigured(): void {
  if (googleConfigured || !webClientId) {
    return;
  }

  const { GoogleSignin } =
    require("@react-native-google-signin/google-signin") as typeof import("@react-native-google-signin/google-signin");

  GoogleSignin.configure({
    webClientId,
    iosClientId: iosClientId || undefined,
  });
  googleConfigured = true;
}

export async function signInWithGoogle(): Promise<string | null> {
  if (!isGoogleSignInNativeAvailable()) {
    throw new Error("GOOGLE_REQUIRES_DEV_BUILD");
  }

  if (!webClientId) {
    throw new Error("Google sign-in is not configured");
  }

  const { GoogleSignin } =
    require("@react-native-google-signin/google-signin") as typeof import("@react-native-google-signin/google-signin");

  ensureGoogleConfigured();

  if (Platform.OS === "android") {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }

  const response = await GoogleSignin.signIn();
  if (response.type !== "success") {
    return null;
  }

  const { idToken } = await GoogleSignin.getTokens();
  return idToken ?? null;
}

export type AppleSignInResult = {
  identityToken: string;
  fullName?: {
    givenName?: string;
    familyName?: string;
  };
};

export function isAppleSignInAvailable(): boolean {
  return Platform.OS === "ios";
}

export async function signInWithApple(): Promise<AppleSignInResult | null> {
  if (Platform.OS !== "ios") {
    throw new Error("Apple sign-in is only available on iOS");
  }

  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) {
    throw new Error("Apple sign-in is not available on this device");
  }

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    return null;
  }

  return {
    identityToken: credential.identityToken,
    fullName: credential.fullName
      ? {
          givenName: credential.fullName.givenName ?? undefined,
          familyName: credential.fullName.familyName ?? undefined,
        }
      : undefined,
  };
}
