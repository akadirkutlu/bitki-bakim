import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { SectionList, StyleSheet, Text, View } from "react-native";
import { IllustrationImage } from "../components/PlantImage";
import { useI18n } from "../localization/I18nContext";
import { emptyStateImage } from "../plantImages";
import { colors, radii, shadow, spacing, typography } from "../theme";
import type { CalendarEvent } from "../types";
import { formatDayLabel } from "../utils/dates";

type Props = {
  events: CalendarEvent[];
};

type EventStyle = {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  background: string;
  labelKey: string;
};

const EVENT_STYLES: Record<CalendarEvent["eventType"], EventStyle> = {
  watering: {
    icon: "water",
    color: colors.water,
    background: colors.waterLight,
    labelKey: "eventWatering",
  },
  feeding: {
    icon: "leaf",
    color: colors.leaf,
    background: colors.leafPale,
    labelKey: "eventFeeding",
  },
  soil_change: {
    icon: "flower",
    color: colors.soil,
    background: colors.soilLight,
    labelKey: "eventSoilChange",
  },
};

export function CalendarScreen({ events }: Props) {
  const { t, language } = useI18n();

  const sections = useMemo(() => {
    const byDate = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const list = byDate.get(event.date) ?? [];
      list.push(event);
      byDate.set(event.date, list);
    }
    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ title: date, data }));
  }, [events]);

  if (sections.length === 0) {
    return (
      <View style={styles.empty}>
        <IllustrationImage source={emptyStateImage} style={styles.emptyImage} />
        <Text style={styles.emptyText}>{t("noEvents")}</Text>
      </View>
    );
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item, index) => `${item.plantId}-${item.eventType}-${index}`}
      contentContainerStyle={styles.list}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => (
        <View style={styles.dateHeader}>
          <Ionicons name="calendar-clear" size={14} color={colors.leafDark} />
          <Text style={styles.dateHeaderText}>
            {formatDayLabel(section.title, language, t)}
          </Text>
        </View>
      )}
      renderItem={({ item }) => {
        const config = EVENT_STYLES[item.eventType];
        return (
          <View style={styles.eventCard}>
            <View style={[styles.iconCircle, { backgroundColor: config.background }]}>
              <Ionicons name={config.icon} size={20} color={config.color} />
            </View>
            <View style={styles.eventInfo}>
              <Text style={styles.eventLabel}>{t(config.labelKey)}</Text>
              <Text style={styles.eventPlant}>
                {item.plantNickname}
                <Text style={styles.eventLatin}> · {item.plantLatinName}</Text>
              </Text>
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  dateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    alignSelf: "flex-start",
    backgroundColor: colors.leafPale,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  dateHeaderText: {
    fontSize: typography.small,
    fontWeight: "700",
    color: colors.leafDark,
  },
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  eventInfo: {
    flex: 1,
  },
  eventLabel: {
    fontSize: typography.body,
    fontWeight: "700",
    color: colors.textDark,
  },
  eventPlant: {
    fontSize: typography.small,
    color: colors.textMuted,
  },
  eventLatin: {
    fontStyle: "italic",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  emptyImage: {
    width: 180,
    height: 130,
  },
  emptyText: {
    fontSize: typography.body,
    color: colors.textMuted,
  },
});
