import type { PlantType } from "../types";

type Language = "tr" | "en";

export function getPlantCommonNames(plantType: PlantType, language: Language): string[] {
  return language === "tr" ? plantType.turkishNames : plantType.englishNames;
}

export function formatPlantCommonNames(plantType: PlantType, language: Language): string {
  return getPlantCommonNames(plantType, language).join(", ");
}
