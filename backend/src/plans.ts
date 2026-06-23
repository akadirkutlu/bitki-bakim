import type { PlanType } from "./types";

export const PLAN_PLANT_LIMITS: Record<PlanType, number | null> = {
  free: 5,
  premium: null,
};

export function getPlantLimit(plan: PlanType): number | null {
  return PLAN_PLANT_LIMITS[plan];
}

export function isPlantLimitReached(plan: PlanType, plantCount: number): boolean {
  const limit = getPlantLimit(plan);
  if (limit === null) {
    return false;
  }
  return plantCount >= limit;
}
