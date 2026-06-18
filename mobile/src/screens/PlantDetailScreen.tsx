import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { DateCalendarPicker } from "../components/DateCalendarPicker";
import { PlantImage, UserPhotoImage } from "../components/PlantImage";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../localization/I18nContext";
import { getPlantImage } from "../plantImages";
import { extractApiMessage, updatePlant } from "../services/api";
import { colors, radii, shadow, spacing, typography } from "../theme";
import type { CalendarEvent, CareEventType, Plant, PlantType, UpdatePlantPayload } from "../types";
import { showErrorAlert } from "../utils/alerts";
import { daysSince, formatDayLabel, toLocalIsoDay } from "../utils/dates";
import { formatPlantCommonNames } from "../utils/plantNames";

type Props = {
  plant: Plant;
  plantType?: PlantType;
  events: CalendarEvent[];
  visible: boolean;
  onClose: () => void;
  onDelete?: () => void;
  onCareLogged?: () => void;
  initialCareKey?: CareEventType | null;
  deleting?: boolean;
};

const CARE_CONFIG: Record<
  CareEventType,
  {
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    background: string;
    lastDateKey: keyof Pick<Plant, "lastWateringDate" | "lastFeedingDate" | "lastSoilChangeDate">;
    intervalKey: keyof Pick<
      PlantType,
      "defaultWateringDays" | "defaultFeedingDays" | "defaultSoilChangeDays"
    >;
    updateKey: keyof Pick<
      UpdatePlantPayload,
      "lastWateringDate" | "lastFeedingDate" | "lastSoilChangeDate"
    >;
    labelKey: string;
    lastLabelKey: string;
    intervalLabelKey: string;
    logActionKey: string;
    logPromptKey: string;
  }
> = {
  watering: {
    icon: "water",
    color: colors.water,
    background: colors.waterLight,
    lastDateKey: "lastWateringDate",
    intervalKey: "defaultWateringDays",
    updateKey: "lastWateringDate",
    labelKey: "eventWatering",
    lastLabelKey: "lastWateringDate",
    intervalLabelKey: "careIntervalWatering",
    logActionKey: "logWatering",
    logPromptKey: "logWateringPrompt",
  },
  feeding: {
    icon: "leaf",
    color: colors.leaf,
    background: colors.leafPale,
    lastDateKey: "lastFeedingDate",
    intervalKey: "defaultFeedingDays",
    updateKey: "lastFeedingDate",
    labelKey: "eventFeeding",
    lastLabelKey: "lastFeedingDate",
    intervalLabelKey: "careIntervalFeeding",
    logActionKey: "logFeeding",
    logPromptKey: "logFeedingPrompt",
  },
  soil_change: {
    icon: "flower",
    color: colors.soil,
    background: colors.soilLight,
    lastDateKey: "lastSoilChangeDate",
    intervalKey: "defaultSoilChangeDays",
    updateKey: "lastSoilChangeDate",
    labelKey: "eventSoilChange",
    lastLabelKey: "lastSoilChangeDate",
    intervalLabelKey: "careIntervalSoilChange",
    logActionKey: "logSoilChange",
    logPromptKey: "logSoilChangePrompt",
  },
};

const CARE_ORDER: CareEventType[] = ["watering", "feeding", "soil_change"];

export function PlantDetailScreen({
  plant,
  plantType,
  events,
  visible,
  onClose,
  onDelete,
  onCareLogged,
  initialCareKey = null,
  deleting = false,
}: Props) {
  const { t, language } = useI18n();
  const { token } = useAuth();
  const [careModalKey, setCareModalKey] = useState<CareEventType | null>(null);
  const [careDate, setCareDate] = useState(toLocalIsoDay());
  const [savingCare, setSavingCare] = useState(false);

  useEffect(() => {
    if (!visible || !initialCareKey) {
      return;
    }

    setCareModalKey(initialCareKey);
    setCareDate(toLocalIsoDay());
  }, [visible, initialCareKey, plant.id]);

  const upcomingEvents = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return events
      .filter((event) => event.plantId === plant.id && event.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 6);
  }, [events, plant.id]);

  function openCareModal(careKey: CareEventType) {
    setCareModalKey(careKey);
    setCareDate(toLocalIsoDay());
  }

  function closeCareModal() {
    if (savingCare) {
      return;
    }
    setCareModalKey(null);
  }

  async function onConfirmCare() {
    if (!token || !careModalKey) {
      return;
    }

    const config = CARE_CONFIG[careModalKey];
    setSavingCare(true);
    try {
      await updatePlant(token, plant.id, {
        [config.updateKey]: careDate,
      });
      setCareModalKey(null);
      onCareLogged?.();
    } catch (error) {
      showErrorAlert(t, extractApiMessage(error, t("unexpectedError")));
    } finally {
      setSavingCare(false);
    }
  }

  const activeCareConfig = careModalKey ? CARE_CONFIG[careModalKey] : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      allowSwipeDismissal
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.headerButton} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={colors.textDark} />
            <Text style={styles.headerButtonText}>{t("back")}</Text>
          </Pressable>
          {onDelete ? (
            <Pressable
              onPress={onDelete}
              disabled={deleting}
              style={[styles.headerButton, styles.deleteButton]}
              hitSlop={8}
            >
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            {plant.photoUri ? (
              <UserPhotoImage uri={plant.photoUri} style={styles.heroImage} />
            ) : (
              <PlantImage
                source={getPlantImage(plant.plantTypeId)}
                style={styles.heroImage}
                contentFit="cover"
              />
            )}
            <Text style={styles.nickname}>{plant.nickname}</Text>
            {plantType ? (
              <>
                <Text style={styles.commonName}>{formatPlantCommonNames(plantType, language)}</Text>
                <Text style={styles.latinName}>{plantType.latinName}</Text>
              </>
            ) : null}
          </View>

          <Text style={styles.sectionTitle}>{t("logCare")}</Text>
          <View style={styles.logList}>
            {CARE_ORDER.map((careKey) => {
              const config = CARE_CONFIG[careKey];
              return (
                <Pressable
                  key={careKey}
                  style={({ pressed }) => [
                    styles.logRow,
                    pressed ? styles.logRowPressed : null,
                  ]}
                  onPress={() => openCareModal(careKey)}
                >
                  <View style={[styles.logIcon, { backgroundColor: config.background }]}>
                    <Ionicons name={config.icon} size={18} color={config.color} />
                  </View>
                  <Text style={styles.logLabel}>{t(config.logActionKey)}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>{t("lastCare")}</Text>
          <View style={styles.careGrid}>
            {CARE_ORDER.map((careKey) => {
              const config = CARE_CONFIG[careKey];
              const lastDate = plant[config.lastDateKey];
              const daysAgo = daysSince(lastDate);

              return (
                <View key={careKey} style={styles.careCard}>
                  <View style={[styles.careIcon, { backgroundColor: config.background }]}>
                    <Ionicons name={config.icon} size={18} color={config.color} />
                  </View>
                  <Text style={styles.careLabel}>{t(config.lastLabelKey)}</Text>
                  <Text style={styles.careDate}>
                    {formatDayLabel(lastDate, language, t)}
                  </Text>
                  <Text style={styles.careAgo}>
                    {daysAgo === 0
                      ? t("today")
                      : t("daysAgo").replace("{count}", String(daysAgo))}
                  </Text>
                </View>
              );
            })}
          </View>

          {plantType ? (
            <>
              <Text style={styles.sectionTitle}>{t("careSchedule")}</Text>
              <View style={styles.scheduleCard}>
                {CARE_ORDER.map((careKey) => {
                  const config = CARE_CONFIG[careKey];
                  const days = plantType[config.intervalKey];
                  return (
                    <View key={careKey} style={styles.scheduleRow}>
                      <View style={[styles.scheduleDot, { backgroundColor: config.background }]}>
                        <Ionicons name={config.icon} size={14} color={config.color} />
                      </View>
                      <Text style={styles.scheduleText}>
                        {t(config.intervalLabelKey).replace("{days}", String(days))}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </>
          ) : null}

          <Text style={styles.sectionTitle}>{t("upcomingCare")}</Text>
          {upcomingEvents.length === 0 ? (
            <Text style={styles.emptyHint}>{t("noUpcomingForPlant")}</Text>
          ) : (
            <View style={styles.upcomingList}>
              {upcomingEvents.map((event, index) => {
                const config = CARE_CONFIG[event.eventType];
                return (
                  <Pressable
                    key={`${event.eventType}-${event.date}-${index}`}
                    style={({ pressed }) => [
                      styles.upcomingRow,
                      pressed ? styles.upcomingRowPressed : null,
                    ]}
                    onPress={() => openCareModal(event.eventType)}
                  >
                    <View style={[styles.upcomingIcon, { backgroundColor: config.background }]}>
                      <Ionicons name={config.icon} size={16} color={config.color} />
                    </View>
                    <View style={styles.upcomingInfo}>
                      <Text style={styles.upcomingLabel}>{t(config.labelKey)}</Text>
                      <Text style={styles.upcomingDate}>
                        {formatDayLabel(event.date, language, t)}
                      </Text>
                    </View>
                    <Ionicons name="checkmark-circle-outline" size={22} color={config.color} />
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>

      <Modal
        visible={careModalKey !== null}
        animationType="fade"
        transparent
        onRequestClose={closeCareModal}
      >
        <View style={styles.careModalBackdrop}>
          <View style={styles.careModalCard}>
            {activeCareConfig ? (
              <>
                <Text style={styles.careModalTitle}>
                  {t(activeCareConfig.logPromptKey).replace("{name}", plant.nickname)}
                </Text>
                <Pressable
                  style={[styles.todayButton, { borderColor: activeCareConfig.color }]}
                  onPress={() => setCareDate(toLocalIsoDay())}
                >
                  <Text style={[styles.todayButtonText, { color: activeCareConfig.color }]}>
                    {t("useToday")}
                  </Text>
                </Pressable>
                <DateCalendarPicker
                  value={careDate}
                  onChange={setCareDate}
                  accentColor={activeCareConfig.color}
                  label={t("careDoneDate")}
                />
                <View style={styles.careModalActions}>
                  <Pressable
                    style={styles.careModalCancel}
                    onPress={closeCareModal}
                    disabled={savingCare}
                  >
                    <Text style={styles.careModalCancelText}>{t("cancel")}</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.careModalConfirm,
                      { backgroundColor: activeCareConfig.color },
                      savingCare ? styles.careModalConfirmDisabled : null,
                    ]}
                    onPress={() => {
                      onConfirmCare().catch(() => undefined);
                    }}
                    disabled={savingCare}
                  >
                    {savingCare ? (
                      <ActivityIndicator color={colors.white} />
                    ) : (
                      <Text style={styles.careModalConfirmText}>{t("confirmCareDone")}</Text>
                    )}
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    padding: spacing.sm,
  },
  headerButtonText: {
    fontSize: typography.body,
    fontWeight: "600",
    color: colors.textDark,
  },
  deleteButton: {
    backgroundColor: colors.white,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  hero: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  heroImage: {
    width: 140,
    height: 140,
    borderRadius: radii.xl,
    backgroundColor: colors.white,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  nickname: {
    fontSize: typography.title,
    fontWeight: "800",
    color: colors.textDark,
  },
  commonName: {
    fontSize: typography.body,
    fontWeight: "600",
    color: colors.leafDark,
  },
  latinName: {
    fontSize: typography.small,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  sectionTitle: {
    fontSize: typography.small,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  logList: {
    gap: spacing.sm,
  },
  logRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.md,
    ...shadow.card,
  },
  logRowPressed: {
    opacity: 0.85,
  },
  logIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  logLabel: {
    flex: 1,
    fontSize: typography.body,
    fontWeight: "700",
    color: colors.textDark,
  },
  careGrid: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  careCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
    ...shadow.card,
  },
  careIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  careLabel: {
    fontSize: typography.tiny,
    fontWeight: "600",
    color: colors.textMuted,
    textAlign: "center",
  },
  careDate: {
    fontSize: typography.small,
    fontWeight: "700",
    color: colors.textDark,
    textAlign: "center",
  },
  careAgo: {
    fontSize: typography.tiny,
    color: colors.textMuted,
    textAlign: "center",
  },
  scheduleCard: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadow.card,
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  scheduleDot: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  scheduleText: {
    fontSize: typography.body,
    color: colors.textDark,
    flex: 1,
  },
  upcomingList: {
    gap: spacing.sm,
  },
  upcomingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.md,
    ...shadow.card,
  },
  upcomingRowPressed: {
    opacity: 0.85,
  },
  upcomingIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  upcomingInfo: {
    flex: 1,
  },
  upcomingLabel: {
    fontSize: typography.body,
    fontWeight: "700",
    color: colors.textDark,
  },
  upcomingDate: {
    fontSize: typography.small,
    color: colors.textMuted,
  },
  emptyHint: {
    fontSize: typography.body,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  careModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  careModalCard: {
    backgroundColor: colors.cream,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.card,
  },
  careModalTitle: {
    fontSize: typography.heading,
    fontWeight: "800",
    color: colors.textDark,
  },
  todayButton: {
    alignSelf: "flex-start",
    borderWidth: 1.5,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
  },
  todayButtonText: {
    fontSize: typography.small,
    fontWeight: "700",
  },
  careModalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  careModalCancel: {
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    minWidth: 96,
    alignItems: "center",
    justifyContent: "center",
  },
  careModalCancelText: {
    fontSize: typography.body,
    fontWeight: "700",
    color: colors.textDark,
  },
  careModalConfirm: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minWidth: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  careModalConfirmDisabled: {
    opacity: 0.7,
  },
  careModalConfirmText: {
    fontSize: typography.body,
    fontWeight: "700",
    color: colors.white,
  },
});
