import axios from "axios";
import { API_BASE_URL } from "../config";
import type { CalendarEvent, Plant, PlantType, User } from "../types";

const client = axios.create({
  baseURL: API_BASE_URL,
});

export type AuthResponse = {
  token: string;
  user: User;
};

export async function register(payload: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const { data } = await client.post<AuthResponse>("/auth/register", payload);
  return data;
}

export async function login(payload: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const { data } = await client.post<AuthResponse>("/auth/login", payload);
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

export async function getCalendar(token: string): Promise<CalendarEvent[]> {
  const { data } = await client.get<{ events: CalendarEvent[] }>("/calendar", {
    headers: authHeaders(token),
  });
  return data.events;
}

export async function identifyByPhoto(
  token: string,
  imageHint: string
): Promise<PlantType[]> {
  const { data } = await client.post<{ candidates: PlantType[] }>(
    "/plants/identify",
    { imageHint },
    { headers: authHeaders(token) }
  );
  return data.candidates;
}

export function extractApiMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return (
      (error.response?.data as { message?: string } | undefined)?.message ??
      error.message
    );
  }
  return "Unexpected error";
}
