import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LanguageToggle } from "./components/LanguageToggle";
import { TabBar, type TabKey } from "./components/TabBar";
import { useAuth } from "./context/AuthContext";
import { useI18n } from "./localization/I18nContext";
import { preloadPlantImages } from "./plantImages";
import { AddPlantScreen } from "./screens/AddPlantScreen";
import { CalendarScreen } from "./screens/CalendarScreen";
import { HomeScreen } from "./screens/HomeScreen";
import {
  extractApiMessage,
  getCalendar,
  getPlants,
  getPlantTypes,
} from "./services/api";
import {
  addNotificationResponseListener,
  getInitialNotificationNavigation,
  syncAllPlantReminders,
} from "./services/notifications";
import { colors, radii, spacing, typography } from "./theme";
import type { CalendarEvent, CareEventType, Plant, PlantType } from "./types";
import { showErrorAlert } from "./utils/alerts";

function hiddenTabStyle(active: boolean) {
  return active ? styles.tabVisible : styles.tabHidden;
}

export function MainApp() {
  const { t } = useI18n();
  const { token, logout } = useAuth();
  const [tab, setTab] = useState<TabKey>("home");
  const [loading, setLoading] = useState(true);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [openPlantRequest, setOpenPlantRequest] = useState<{
    plantId: string;
    careKey?: CareEventType;
  } | null>(null);

  const plantTypeMap = useMemo(
    () => new Map(plantTypes.map((item) => [item.id, item])),
    [plantTypes]
  );

  function handleNotificationNavigation(navigation: {
    plantId: string;
    careType?: CareEventType;
  }) {
    setTab("home");
    setOpenPlantRequest({
      plantId: navigation.plantId,
      careKey: navigation.careType,
    });
  }

  async function loadAll(options?: { silent?: boolean }) {
    if (!token) {
      return;
    }
    if (!options?.silent) {
      setLoading(true);
    }
    try {
      const [types, userPlants, calendarEvents] = await Promise.all([
        getPlantTypes(token),
        getPlants(token),
        getCalendar(token),
        preloadPlantImages(),
      ]);
      setPlantTypes(types);
      setPlants(userPlants);
      setEvents(calendarEvents);
      try {
        await syncAllPlantReminders(userPlants, types);
      } catch {
        // Reminders are best-effort; app data still loads.
      }
    } catch (error) {
      showErrorAlert(t, extractApiMessage(error, t("unexpectedError")));
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    loadAll().catch(() => undefined);
  }, [token]);

  useEffect(() => {
    const initialNavigation = getInitialNotificationNavigation();
    if (initialNavigation) {
      handleNotificationNavigation(initialNavigation);
    }

    return addNotificationResponseListener(handleNotificationNavigation);
  }, [token]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active" || !token) {
        return;
      }

      syncAllPlantReminders(plants, plantTypeMap).catch(() => undefined);
    });

    return () => subscription.remove();
  }, [token, plants, plantTypeMap]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color={colors.leaf} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Ionicons name="leaf" size={22} color={colors.leaf} />
          <Text style={styles.title}>{t("appTitle")}</Text>
        </View>
        <View style={styles.headerActions}>
          <LanguageToggle />
          <Pressable style={styles.headerButton} onPress={logout}>
            <Ionicons name="log-out-outline" size={18} color={colors.textDark} />
          </Pressable>
        </View>
      </View>

      <View style={styles.content}>
        <View style={hiddenTabStyle(tab === "home")}>
          <HomeScreen
            plants={plants}
            plantTypeMap={plantTypeMap}
            events={events}
            onPlantDeleted={() => loadAll().catch(() => undefined)}
            onPlantUpdated={() => loadAll({ silent: true }).catch(() => undefined)}
            openPlantRequest={openPlantRequest}
            onOpenPlantRequestHandled={() => setOpenPlantRequest(null)}
          />
        </View>
        <View style={hiddenTabStyle(tab === "add")}>
          <AddPlantScreen
            plantTypes={plantTypes}
            plants={plants}
            onCreated={() => {
              setTab("home");
              loadAll().catch(() => undefined);
            }}
          />
        </View>
        <View style={hiddenTabStyle(tab === "calendar")}>
          <CalendarScreen events={events} />
        </View>
      </View>

      <TabBar active={tab} onChange={setTab} />
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.heading,
    fontWeight: "800",
    color: colors.leafDark,
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  headerButton: {
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 40,
  },
  content: {
    flex: 1,
  },
  tabVisible: {
    flex: 1,
  },
  tabHidden: {
    display: "none",
  },
});
