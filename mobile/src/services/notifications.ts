import * as Notifications from "expo-notifications";
import type { PlantType } from "../types";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function nextDateWithInterval(lastDate: string, intervalDays: number): Date {
  const date = new Date(lastDate);
  date.setDate(date.getDate() + intervalDays);
  return date;
}

function dateTrigger(date: Date): Notifications.DateTriggerInput {
  return {
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    date,
  };
}

export async function requestNotificationPermissions(): Promise<void> {
  await Notifications.requestPermissionsAsync();
}

export async function schedulePlantReminders(payload: {
  plantNickname: string;
  plantType: PlantType;
  lastWateringDate: string;
  lastFeedingDate: string;
  lastSoilChangeDate: string;
}): Promise<void> {
  await requestNotificationPermissions();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${payload.plantNickname} sulama zamani`,
      body: `${payload.plantType.latinName} icin sulama hatirlaticisi.`,
    },
    trigger: dateTrigger(
      nextDateWithInterval(
        payload.lastWateringDate,
        payload.plantType.defaultWateringDays
      )
    ),
  });

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${payload.plantNickname} besleme zamani`,
      body: `${payload.plantType.latinName} icin besleme hatirlaticisi.`,
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
    },
    trigger: dateTrigger(
      nextDateWithInterval(
        payload.lastSoilChangeDate,
        payload.plantType.defaultSoilChangeDays
      )
    ),
  });
}
