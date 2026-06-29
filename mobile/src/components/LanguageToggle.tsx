import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useI18n } from "../localization/I18nContext";
import { colors, radii, spacing, typography } from "../theme";

export function LanguageToggle() {
  const { language, setLanguage } = useI18n();

  return (
    <Pressable
      style={styles.button}
      onPress={() => setLanguage(language === "tr" ? "en" : "tr")}
      accessibilityRole="button"
      accessibilityLabel={language === "tr" ? "Switch to English" : "Türkçeye geç"}
    >
      <Text style={styles.buttonText}>{language.toUpperCase()}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 40,
  },
  buttonText: {
    fontWeight: "700",
    fontSize: typography.small,
    color: colors.textDark,
  },
});
