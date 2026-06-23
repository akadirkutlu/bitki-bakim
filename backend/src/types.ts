export type PlanType = "free" | "premium";

export type AuthProvider = "email" | "google" | "apple";

export type User = {
  id: string;
  email: string;
  name: string;
  plan: PlanType;
  createdAt: string;
  authProvider: AuthProvider;
  passwordHash?: string;
  googleId?: string;
  appleId?: string;
  appleOriginalTransactionId?: string;
  subscriptionExpiresAt?: string;
  subscriptionProductId?: string;
};

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  plan: PlanType;
  authProvider: AuthProvider;
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
