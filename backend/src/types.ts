export type PlanType = "free" | "premium";

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  plan: PlanType;
  createdAt: string;
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

export type DatabaseShape = {
  users: User[];
  plants: Plant[];
};

export type CalendarEventType = "watering" | "feeding" | "soil_change";

export type PlantCalendarEvent = {
  plantId: string;
  plantNickname: string;
  plantLatinName: string;
  date: string;
  eventType: CalendarEventType;
};
