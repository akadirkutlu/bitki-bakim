import { Alert } from "react-native";

type TFunction = (key: string) => string;

function alertButtons(t: TFunction) {
  return [{ text: t("ok") }];
}

/** Single-line notice (validation, permissions) — message only, no harsh title. */
export function showMessageAlert(t: TFunction, message: string) {
  Alert.alert(message, undefined, alertButtons(t));
}

/** Unexpected or server errors with a friendly title. */
export function showErrorAlert(t: TFunction, message: string) {
  Alert.alert(t("alertErrorTitle"), message, alertButtons(t));
}

/** Plan / subscription limit notices. */
export function showPlanAlert(t: TFunction, message: string) {
  Alert.alert(t("alertPlanTitle"), message, alertButtons(t));
}

export function showConfirmAlert(
  t: TFunction,
  options: {
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  }
) {
  Alert.alert(options.title, options.message, [
    { text: t("cancel"), style: "cancel" },
    {
      text: options.confirmLabel,
      style: "destructive",
      onPress: options.onConfirm,
    },
  ]);
}
