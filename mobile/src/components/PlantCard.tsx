import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { IllustrationImage, PlantImage, UserPhotoImage } from "./PlantImage";
import { useI18n } from "../localization/I18nContext";
import { getPlantImage } from "../plantImages";
import { colors, radii, shadow, spacing, typography } from "../theme";
import type { Plant, PlantType } from "../types";
import { formatDayLabel } from "../utils/dates";
import { formatPlantCommonNames } from "../utils/plantNames";

type Props = {
  plant: Plant;
  plantType?: PlantType;
  nextWateringDate?: string;
  onPress?: () => void;
  onDelete?: () => void;
  deleting?: boolean;
};

export function PlantCard({
  plant,
  plantType,
  nextWateringDate,
  onPress,
  onDelete,
  deleting = false,
}: Props) {
  const { t, language } = useI18n();

  const content = (
    <>
      {plant.photoUri ? (
        <UserPhotoImage uri={plant.photoUri} style={styles.image} />
      ) : (
        <PlantImage
          source={getPlantImage(plant.plantTypeId)}
          style={styles.image}
          contentFit="cover"
        />
      )}
      <View style={styles.info}>
        <Text style={styles.nickname}>{plant.nickname}</Text>
        {plantType ? (
          <>
            <Text style={styles.commonName}>
              {formatPlantCommonNames(plantType, language)}
            </Text>
            <Text style={styles.latinName}>{plantType.latinName}</Text>
          </>
        ) : null}
        {nextWateringDate ? (
          <View style={styles.chip}>
            <Ionicons name="water" size={13} color={colors.water} />
            <Text style={styles.chipText}>
              {t("nextWatering")}: {formatDayLabel(nextWateringDate, language, t)}
            </Text>
          </View>
        ) : null}
      </View>
      {onPress ? (
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      ) : null}
    </>
  );

  return (
    <View style={styles.card}>
      {onPress ? (
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [styles.tappable, pressed && styles.tappablePressed]}
        >
          {content}
        </Pressable>
      ) : (
        <View style={styles.tappable}>{content}</View>
      )}
      {onDelete ? (
        <Pressable
          onPress={onDelete}
          disabled={deleting}
          style={styles.deleteButton}
          hitSlop={8}
        >
          {deleting ? (
            <ActivityIndicator size="small" color={colors.danger} />
          ) : (
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
    alignItems: "center",
    ...shadow.card,
  },
  tappable: {
    flex: 1,
    flexDirection: "row",
    padding: spacing.md,
    gap: spacing.md,
    alignItems: "center",
  },
  tappablePressed: {
    opacity: 0.85,
  },
  image: {
    width: 84,
    height: 84,
    borderRadius: radii.md,
    backgroundColor: colors.cream,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  nickname: {
    fontSize: typography.heading,
    fontWeight: "700",
    color: colors.textDark,
  },
  commonName: {
    fontSize: typography.body,
    color: colors.leafDark,
    fontWeight: "600",
  },
  latinName: {
    fontSize: typography.small,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    backgroundColor: colors.waterLight,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginTop: spacing.xs,
  },
  chipText: {
    fontSize: typography.tiny,
    color: colors.textDark,
    fontWeight: "600",
  },
  deleteButton: {
    alignSelf: "center",
    padding: spacing.sm,
  },
});
