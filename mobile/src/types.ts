export type User = {
  id: string;
  email: string;
  name: string;
  plan: "free" | "premium";
  authProvider?: "email" | "google" | "apple";
};

export type PlantType = {
  id: string;
  latinName: string;
  turkishNames: string[];
  englishNames: string[];
  defaultWateringDays: number;
  defaultFeedingDays: number;
  defaultSoilChangeDays: number;
};

export type Plant = {
  id: string;
  userId: string;
  nickname: string;
  plantTypeId: string;
  lastWateringDate: string;
  lastFeedingDate: string;
  lastSoilChangeDate: string;
  createdAt: string;
  imageHint?: string;
  photoUri?: string;
};

export type CareEventType = "watering" | "feeding" | "soil_change";

export type CalendarEvent = {
  plantId: string;
  plantNickname: string;
  plantLatinName: string;
  date: string;
  eventType: CareEventType;
};

export type UpdatePlantPayload = {
  nickname?: string;
  lastWateringDate?: string;
  lastFeedingDate?: string;
  lastSoilChangeDate?: string;
};
