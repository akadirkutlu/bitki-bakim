import * as Notifications from "expo-notifications";
import type { CareEventType, Plant, PlantType } from "../types";

// TODO(prod): Remove notification test plant — delete this constant, TEST_WATERING_INTERVAL_SECONDS,
// and the special-case trigger below; also remove backend plantTypes entry and plants.json test rows.
/** Matches backend plantTypes id; schedules repeating 1-minute watering reminders. */
export const TEST_NOTIFICATION_PLANT_TYPE_ID = "test-notification-plant";
const TEST_WATERING_INTERVAL_SECONDS = 60;

export type NotificationNavigation = {
  plantId: string;
  careType?: CareEventType;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function nextDateWithInterval(lastDate: string, intervalDays: number): Date {
  const now = new Date();
  const date = new Date(`${lastDate}T09:00:00`);

  do {
    date.setDate(date.getDate() + intervalDays);
  } while (date.getTime() <= now.getTime());

  return date;
}

function dateTrigger(date: Date): Notifications.DateTriggerInput {
  return {
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    date,
  };
}

function timeIntervalTrigger(
  seconds: number,
  repeats: boolean
): Notifications.TimeIntervalTriggerInput {
  return {
    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    seconds,
    repeats,
  };
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === "granted") {
    return true;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

type PlantReminderPayload = {
  plantId: string;
  plantNickname: string;
  plantType: PlantType;
  lastWateringDate: string;
  lastFeedingDate: string;
  lastSoilChangeDate: string;
};

async function schedulePlantRemindersInternal(
  payload: PlantReminderPayload
): Promise<void> {
  // TODO(prod): Remove test-notification-plant special case; use dateTrigger for all plants.
  const wateringTrigger: Notifications.NotificationTriggerInput =
    payload.plantType.id === TEST_NOTIFICATION_PLANT_TYPE_ID
      ? timeIntervalTrigger(TEST_WATERING_INTERVAL_SECONDS, true)
      : dateTrigger(
          nextDateWithInterval(
            payload.lastWateringDate,
            payload.plantType.defaultWateringDays
          )
        );

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${payload.plantNickname} sulama zamani`,
      body: `${payload.plantType.latinName} icin sulama hatirlaticisi.`,
      data: {
        plantId: payload.plantId,
        careType: "watering",
      },
    },
    trigger: wateringTrigger,
  });

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${payload.plantNickname} besleme zamani`,
      body: `${payload.plantType.latinName} icin besleme hatirlaticisi.`,
      data: {
        plantId: payload.plantId,
        careType: "feeding",
      },
    },
    trigger: dateTrigger(
      nextDateWithInterval(
        payload.lastFeedingDate,
        payload.plantType.defaultFeedingDays
      )
    ),
  });

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${payload.plantNickname} toprak degisimi`,
      body: `${payload.plantType.latinName} icin toprak kontrol zamani.`,
      data: {
        plantId: payload.plantId,
        careType: "soil_change",
      },
    },
    trigger: dateTrigger(
      nextDateWithInterval(
        payload.lastSoilChangeDate,
        payload.plantType.defaultSoilChangeDays
      )
    ),
  });
}

function toPlantTypeMap(
  plantTypes: PlantType[] | Map<string, PlantType>
): Map<string, PlantType> {
  return plantTypes instanceof Map
    ? plantTypes
    : new Map(plantTypes.map((item) => [item.id, item]));
}

/** Clears all pending reminders and reschedules from current plant data. */
export async function syncAllPlantReminders(
  plants: Plant[],
  plantTypes: PlantType[] | Map<string, PlantType>
): Promise<void> {
  const granted = await requestNotificationPermissions();
  if (!granted) {
    return;
  }

  await Notifications.cancelAllScheduledNotificationsAsync();

  const plantTypeMap = toPlantTypeMap(plantTypes);

  for (const plant of plants) {
    const plantType = plantTypeMap.get(plant.plantTypeId);
    if (!plantType) {
      continue;
    }

    try {
      await schedulePlantRemindersInternal({
        plantId: plant.id,
        plantNickname: plant.nickname,
        plantType,
        lastWateringDate: plant.lastWateringDate,
        lastFeedingDate: plant.lastFeedingDate,
        lastSoilChangeDate: plant.lastSoilChangeDate,
      });
    } catch {
      // Best-effort per plant (e.g. Expo Go limits).
    }
  }
}

function parseNotificationNavigation(
  data: Record<string, unknown> | undefined
): NotificationNavigation | null {
  const plantId = data?.plantId;
  if (typeof plantId !== "string" || plantId.length === 0) {
    return null;
  }

  const careType = data?.careType;
  if (
    careType === "watering" ||
    careType === "feeding" ||
    careType === "soil_change"
  ) {
    return { plantId, careType };
  }

  return { plantId };
}

export function getInitialNotificationNavigation(): NotificationNavigation | null {
  const response = Notifications.getLastNotificationResponse();
  if (!response) {
    return null;
  }

  return parseNotificationNavigation(
    response.notification.request.content.data as Record<string, unknown> | undefined
  );
}

export function addNotificationResponseListener(
  listener: (navigation: NotificationNavigation) => void
): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const navigation = parseNotificationNavigation(
      response.notification.request.content.data as Record<string, unknown> | undefined
    );
    if (navigation) {
      listener(navigation);
    }
  });

  return () => subscription.remove();
}
