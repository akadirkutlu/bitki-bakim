import { PLANT_TYPES } from "./plantTypes";
import type { Plant, PlantCalendarEvent } from "./types";

const LOOKAHEAD_DAYS = 45;

function addDays(isoDate: string, days: number): string {
  const date = new Date(isoDate);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function isBeforeOrEqual(a: string, b: string): boolean {
  return new Date(a).getTime() <= new Date(b).getTime();
}

export function buildCalendarEvents(plants: Plant[]): PlantCalendarEvent[] {
  const today = new Date().toISOString().slice(0, 10);
  const horizon = addDays(today, LOOKAHEAD_DAYS);
  const events: PlantCalendarEvent[] = [];

  for (const plant of plants) {
    const plantType = PLANT_TYPES.find((item) => item.id === plant.plantTypeId);

    if (!plantType) {
      continue;
    }

    let nextWatering = addDays(
      plant.lastWateringDate,
      plantType.defaultWateringDays
    );
    let nextFeeding = addDays(
      plant.lastFeedingDate,
      plantType.defaultFeedingDays
    );
    let nextSoilChange = addDays(
      plant.lastSoilChangeDate,
      plantType.defaultSoilChangeDays
    );

    while (isBeforeOrEqual(nextWatering, horizon)) {
      events.push({
        plantId: plant.id,
        plantNickname: plant.nickname,
        plantLatinName: plantType.latinName,
        date: nextWatering,
        eventType: "watering",
      });
      nextWatering = addDays(nextWatering, plantType.defaultWateringDays);
    }

    while (isBeforeOrEqual(nextFeeding, horizon)) {
      events.push({
        plantId: plant.id,
        plantNickname: plant.nickname,
        plantLatinName: plantType.latinName,
        date: nextFeeding,
        eventType: "feeding",
      });
      nextFeeding = addDays(nextFeeding, plantType.defaultFeedingDays);
    }

    while (isBeforeOrEqual(nextSoilChange, horizon)) {
      events.push({
        plantId: plant.id,
        plantNickname: plant.nickname,
        plantLatinName: plantType.latinName,
        date: nextSoilChange,
        eventType: "soil_change",
      });
      nextSoilChange = addDays(nextSoilChange, plantType.defaultSoilChangeDays);
    }
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}
