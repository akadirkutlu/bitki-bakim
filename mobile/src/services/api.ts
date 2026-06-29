import axios from "axios";
import { API_BASE_URL } from "../config";
import type { CalendarEvent, Plant, PlantType, UpdatePlantPayload, User } from "../types";

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 25000,
});

export type AuthResponse = {
  token: string;
  user: User;
};

function upgradeConfig(upgradeToken?: string) {
  return upgradeToken ? { headers: authHeaders(upgradeToken) } : undefined;
}

export async function register(
  payload: {
    name: string;
    email: string;
    password: string;
  },
  upgradeToken?: string
): Promise<AuthResponse> {
  const { data } = await client.post<AuthResponse>(
    "/auth/register",
    payload,
    upgradeConfig(upgradeToken)
  );
  return data;
}

export async function loginAsGuest(): Promise<AuthResponse> {
  const { data } = await client.post<AuthResponse>("/auth/guest", {});
  return data;
}

export async function deleteAccount(token: string): Promise<void> {
  await client.delete("/account", { headers: authHeaders(token) });
}

export async function login(payload: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const { data } = await client.post<AuthResponse>("/auth/login", payload);
  return data;
}

export async function loginWithGoogle(
  idToken: string,
  upgradeToken?: string
): Promise<AuthResponse> {
  const { data } = await client.post<AuthResponse>(
    "/auth/google",
    { idToken },
    upgradeConfig(upgradeToken)
  );
  return data;
}

export async function loginWithApple(
  payload: {
    identityToken: string;
    fullName?: {
      givenName?: string;
      familyName?: string;
    };
  },
  upgradeToken?: string
): Promise<AuthResponse> {
  const { data } = await client.post<AuthResponse>(
    "/auth/apple",
    payload,
    upgradeConfig(upgradeToken)
  );
  return data;
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export async function getPlantTypes(token: string): Promise<PlantType[]> {
  const { data } = await client.get<{ plantTypes: PlantType[] }>("/plant-types", {
    headers: authHeaders(token),
  });
  return data.plantTypes;
}

export async function getPlants(token: string): Promise<Plant[]> {
  const { data } = await client.get<{ plants: Plant[] }>("/plants", {
    headers: authHeaders(token),
  });
  return data.plants;
}

export async function createPlant(
  token: string,
  payload: Omit<Plant, "id" | "userId" | "createdAt">
): Promise<Plant> {
  const { data } = await client.post<{ plant: Plant }>("/plants", payload, {
    headers: authHeaders(token),
  });
  return data.plant;
}

export async function updatePlant(
  token: string,
  plantId: string,
  payload: UpdatePlantPayload
): Promise<Plant> {
  const { data } = await client.patch<{ plant: Plant }>(`/plants/${plantId}`, payload, {
    headers: authHeaders(token),
  });
  return data.plant;
}

export async function deletePlant(token: string, plantId: string): Promise<void> {
  await client.delete(`/plants/${plantId}`, {
    headers: authHeaders(token),
  });
}

export async function getCalendar(token: string): Promise<CalendarEvent[]> {
  const { data } = await client.get<{ events: CalendarEvent[] }>("/calendar", {
    headers: authHeaders(token),
  });
  return data.events;
}

export async function getMe(token: string): Promise<User> {
  const { data } = await client.get<{ user: User }>("/auth/me", {
    headers: authHeaders(token),
  });
  return data.user;
}

export async function verifyAppleSubscription(
  token: string,
  signedTransaction: string
): Promise<{ user: User }> {
  const { data } = await client.post<{ user: User }>(
    "/subscription/apple/verify",
    { signedTransaction },
    { headers: authHeaders(token) }
  );
  return data;
}

export async function identifyByPhoto(
  token: string,
  payload: { imageBase64?: string; imageHint?: string },
  signal?: AbortSignal
): Promise<PlantType[]> {
  const { data } = await client.post<{ candidates: PlantType[] }>(
    "/plants/identify",
    payload,
    { headers: authHeaders(token), signal, timeout: 45000 }
  );
  return data.candidates;
}

export function isCanceledError(error: unknown): boolean {
  return axios.isCancel(error);
}

export function extractApiCode(error: unknown): string | undefined {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { code?: string } | undefined)?.code;
  }
  return undefined;
}

export function extractApiMessage(
  error: unknown,
  fallback = "Unexpected error"
): string {
  if (axios.isAxiosError(error)) {
    return (
      (error.response?.data as { message?: string } | undefined)?.message ??
      error.message ??
      fallback
    );
  }
  return fallback;
}
