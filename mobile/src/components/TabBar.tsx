import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useI18n } from "../localization/I18nContext";
import { colors, radii, spacing, typography } from "../theme";

export type TabKey = "home" | "add" | "calendar";

const TABS: { key: TabKey; icon: keyof typeof Ionicons.glyphMap; labelKey: string }[] = [
  { key: "home", icon: "home", labelKey: "home" },
  { key: "add", icon: "add-circle", labelKey: "addPlant" },
  { key: "calendar", icon: "calendar", labelKey: "calendar" },
];

type Props = {
  active: TabKey;
  onChange: (tab: TabKey) => void;
};

export function TabBar({ active, onChange }: Props) {
  const { t } = useI18n();

  return (
    <View style={styles.bar}>
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onChange(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={22}
              color={isActive ? colors.leafDark : colors.textMuted}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {t(tab.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    gap: 2,
  },
  tabActive: {
    backgroundColor: colors.leafPale,
  },
  label: {
    fontSize: typography.tiny,
    color: colors.textMuted,
    fontWeight: "600",
  },
  labelActive: {
    color: colors.leafDark,
  },
});
