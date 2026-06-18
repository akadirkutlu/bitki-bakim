import React, { useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { IllustrationImage } from "../components/PlantImage";
import { PlantCard } from "../components/PlantCard";
import { PlantDetailScreen } from "./PlantDetailScreen";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../localization/I18nContext";
import { emptyStateImage } from "../plantImages";
import { deletePlant, extractApiMessage } from "../services/api";
import { colors, radii, spacing, typography } from "../theme";
import type { CalendarEvent, CareEventType, Plant, PlantType } from "../types";
import { showConfirmAlert, showErrorAlert } from "../utils/alerts";

const MAX_FREE_PLANTS = 5;

type Props = {
  plants: Plant[];
  plantTypeMap: Map<string, PlantType>;
  events: CalendarEvent[];
  onPlantDeleted: () => void;
  onPlantUpdated: () => void;
  openPlantRequest?: {
    plantId: string;
    careKey?: CareEventType;
  } | null;
  onOpenPlantRequestHandled?: () => void;
};

export function HomeScreen({
  plants,
  plantTypeMap,
  events,
  onPlantDeleted,
  onPlantUpdated,
  openPlantRequest = null,
  onOpenPlantRequestHandled,
}: Props) {
  const { t } = useI18n();
  const { user, token } = useAuth();
  const [deletingPlantId, setDeletingPlantId] = useState<string | null>(null);
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [initialCareKey, setInitialCareKey] = useState<CareEventType | null>(null);

  const selectedPlant = useMemo(
    () => plants.find((item) => item.id === selectedPlantId) ?? null,
    [plants, selectedPlantId]
  );

  useEffect(() => {
    if (!openPlantRequest) {
      return;
    }

    setSelectedPlantId(openPlantRequest.plantId);
    setInitialCareKey(openPlantRequest.careKey ?? null);
    onOpenPlantRequestHandled?.();
  }, [openPlantRequest, onOpenPlantRequestHandled]);

  const nextWateringByPlant = useMemo(() => {
    const map = new Map<string, string>();
    for (const event of events) {
      if (event.eventType === "watering" && !map.has(event.plantId)) {
        map.set(event.plantId, event.date);
      }
    }
    return map;
  }, [events]);

  const isPremium = user?.plan === "premium";

  function onDeletePlant(plant: Plant) {
    showConfirmAlert(t, {
      title: t("deletePlant"),
      message: `"${plant.nickname}" ${t("deletePlantConfirm")}`,
      confirmLabel: t("delete"),
      onConfirm: () => {
        if (!token) {
          return;
        }
        setDeletingPlantId(plant.id);
        deletePlant(token, plant.id)
          .then(() => {
            setSelectedPlantId(null);
            onPlantDeleted();
          })
          .catch((error) => {
            showErrorAlert(t, extractApiMessage(error, t("unexpectedError")));
          })
          .finally(() => setDeletingPlantId(null));
      },
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>
            {t("greeting")}, {user?.name ?? ""} 🌱
          </Text>
          <Text style={styles.planLabel}>
            {isPremium ? t("premiumPlan") : t("freePlan")}
          </Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {plants.length}
            {isPremium ? "" : `/${MAX_FREE_PLANTS}`}
          </Text>
        </View>
      </View>

      <FlatList
        data={plants}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <IllustrationImage source={emptyStateImage} style={styles.emptyImage} />
            <Text style={styles.emptyTitle}>{t("noPlants")}</Text>
            <Text style={styles.emptyHint}>{t("noPlantsHint")}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <PlantCard
            plant={item}
            plantType={plantTypeMap.get(item.plantTypeId)}
            nextWateringDate={nextWateringByPlant.get(item.id)}
            onPress={() => setSelectedPlantId(item.id)}
            onDelete={() => onDeletePlant(item)}
            deleting={deletingPlantId === item.id}
          />
        )}
      />

      {selectedPlant ? (
        <PlantDetailScreen
          plant={selectedPlant}
          plantType={plantTypeMap.get(selectedPlant.plantTypeId)}
          events={events}
          visible
          onClose={() => {
            setSelectedPlantId(null);
            setInitialCareKey(null);
          }}
          onDelete={() => onDeletePlant(selectedPlant)}
          onCareLogged={() => {
            setInitialCareKey(null);
            onPlantUpdated();
          }}
          initialCareKey={initialCareKey}
          deleting={deletingPlantId === selectedPlant.id}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  greeting: {
    fontSize: typography.heading + 2,
    fontWeight: "800",
    color: colors.textDark,
  },
  planLabel: {
    fontSize: typography.small,
    color: colors.textMuted,
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: colors.sunYellowLight,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.sunYellow,
  },
  countText: {
    fontWeight: "800",
    color: colors.textDark,
    fontSize: typography.body,
  },
  list: {
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  emptyImage: {
    width: 200,
    height: 150,
  },
  emptyTitle: {
    fontSize: typography.heading,
    fontWeight: "700",
    color: colors.textDark,
  },
  emptyHint: {
    fontSize: typography.body,
    color: colors.textMuted,
    textAlign: "center",
  },
});
