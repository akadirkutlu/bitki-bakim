import { PLANT_TYPES } from "./plantTypes";
import type { PlantType } from "./types";

const KEYWORDS: Record<string, string[]> = {
  monstera: ["monstera", "devetabani"],
  ficus: ["ficus", "kaucuk", "rubber"],
  spathiphyllum: ["baris", "peace", "spathiphyllum"],
  pothos: ["pothos", "sarmasik", "epipremnum"],
  sansevieria: ["sansevieria", "pasa", "snake"],
  aloe: ["aloe"],
  crassula: ["crassula", "para", "jade"],
};

function scorePlantType(plantType: PlantType, hint: string): number {
  const normalizedHint = hint.toLowerCase();
  let score = 0;

  if (normalizedHint.includes(plantType.latinName.toLowerCase())) {
    score += 4;
  }

  for (const name of plantType.turkishNames) {
    if (normalizedHint.includes(name.toLowerCase())) {
      score += 3;
    }
  }

  for (const keywordGroup of Object.values(KEYWORDS)) {
    for (const keyword of keywordGroup) {
      if (normalizedHint.includes(keyword)) {
        if (
          plantType.latinName.toLowerCase().includes(keyword) ||
          plantType.turkishNames.some((name) =>
            name.toLowerCase().includes(keyword)
          )
        ) {
          score += 2;
        }
      }
    }
  }

  return score;
}

export function identifyPlantCandidates(hint: string): PlantType[] {
  const ranked = [...PLANT_TYPES]
    .map((plantType) => ({ plantType, score: scorePlantType(plantType, hint) }))
    .sort((a, b) => b.score - a.score);

  if (ranked[0]?.score <= 0) {
    return PLANT_TYPES.slice(0, 3);
  }

  const topScore = ranked[0].score;
  return ranked
    .filter((item) => item.score >= Math.max(1, topScore - 2))
    .slice(0, 4)
    .map((item) => item.plantType);
}
