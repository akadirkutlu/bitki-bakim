export const FREE_PLANT_LIMIT = 5;

export function getPlantLimitForPlan(plan: "free" | "premium"): number | null {
  return plan === "premium" ? null : FREE_PLANT_LIMIT;
}

export function isAtOrOverFreeLimit(plan: "free" | "premium", plantCount: number): boolean {
  if (plan === "premium") {
    return false;
  }
  return plantCount >= FREE_PLANT_LIMIT;
}
