export type User = {
  id: string;
  email: string;
  name: string;
  plan: "free" | "premium";
};

export type PlantType = {
  id: string;
  latinName: string;
  turkishNames: string[];
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
};

export type CalendarEvent = {
  plantId: string;
  plantNickname: string;
  plantLatinName: string;
  date: string;
  eventType: "watering" | "feeding" | "soil_change";
};
