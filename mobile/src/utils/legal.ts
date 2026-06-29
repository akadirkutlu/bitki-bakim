import * as WebBrowser from "expo-web-browser";
import {
  MANAGE_SUBSCRIPTIONS_URL,
  PRIVACY_POLICY_URL,
  TERMS_OF_USE_URL,
} from "../config";

async function openUrl(url: string): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    // Opening the in-app browser is best-effort; ignore failures.
  }
}

export function openPrivacyPolicy(): Promise<void> {
  return openUrl(PRIVACY_POLICY_URL);
}

export function openTermsOfUse(): Promise<void> {
  return openUrl(TERMS_OF_USE_URL);
}

export function openManageSubscriptions(): Promise<void> {
  return openUrl(MANAGE_SUBSCRIPTIONS_URL);
}
